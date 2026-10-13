// Calculate API Base URL dynamically
const API_BASE = (window.location.origin && window.location.origin.startsWith("http") && window.location.port === "5000")
    ? window.location.origin 
    : "http://127.0.0.1:5000";

// State Management
let currentLanguage = localStorage.getItem("krushi_lang") || "Gujarati";
let chatHistory = JSON.parse(localStorage.getItem("krushi_chat_history")) || [];
let isRecognizing = false;
let speechRecognition = null;
let selectedImageBase64 = null;
let selectedImageName = "";

// DOM Elements
const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const typingStatusText = document.getElementById("typingStatusText");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const micBtn = document.getElementById("micBtn");
const micIcon = document.getElementById("micIcon");
const imageFileInput = document.getElementById("imageFileInput");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imagePreviewThumb = document.getElementById("imagePreviewThumb");
const imageSizeBadge = document.getElementById("imageSizeBadge");
const previewTitle = document.getElementById("previewTitle");
const previewSubtext = document.getElementById("previewSubtext");
const imageLightboxModal = document.getElementById("imageLightboxModal");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    setLanguage(currentLanguage);
    checkHealth();
    renderChatHistory();
    renderSidebarHistoryList();
    initSpeechRecognition();

    // Support pasting image from clipboard (Ctrl+V)
    window.addEventListener("paste", (e) => {
        if (e.clipboardData && e.clipboardData.items) {
            for (let item of e.clipboardData.items) {
                if (item.type && item.type.startsWith("image/")) {
                    const blob = item.getAsFile();
                    if (blob) {
                        handleImageSelected({ target: { files: [blob] } });
                    }
                    break;
                }
            }
        }
    });

    // Close lightbox, calculator & tool modals on Escape key
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeImageModal();
            closeFertilizerCalculator();
            closeAllToolModals(true);
        }
    });

    // Initialize Calculator state & tools default data
    updateCalculatorLabels(currentLanguage);
    recalculateProportions();
    fetchLiveWeatherData("Rajkot");
    fetchLiveMandiRatesData();
});

// Health check ping
async function checkHealth() {
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        if (data.status === "ok") {
            statusDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm animate-pulse";
            const visionPill = data.vision_enabled ? " • Vision Ready" : "";
            statusText.innerText = `Online (${data.model}${visionPill})`;
        } else {
            statusDot.className = "w-2.5 h-2.5 rounded-full bg-amber-400";
            statusText.innerText = "Service Degraded";
        }
    } catch (err) {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-red-400";
        statusText.innerText = "Server Offline";
    }
}

// Toggle Mobile Sidebar
function toggleSidebar() {
    const isHidden = sidebar.classList.contains("-translate-x-full");
    if (isHidden) {
        sidebar.classList.remove("-translate-x-full");
        sidebarOverlay.classList.remove("hidden");
    } else {
        sidebar.classList.add("-translate-x-full");
        sidebarOverlay.classList.add("hidden");
    }
}

// Localization Dictionary (Gujarati & English)
const UI_TRANSLATIONS = {
    Gujarati: {
        appTitle: "KrushiMitra",
        appTag: "AI 3.0",
        sidebarSubtitle: "પ્રાકૃતિક ખેતી આસિસ્ટન્ટ",
        newChat: "નવી વાતચીત",
        sidebarCalc: "ખાતર કેલ્ક્યુલેટર",
        quickTopicsHeading: "ઝડપી વિષયો",
        topicJeevamrut: "Jeevamrut (જીવામૃત)",
        topicPest: "Pest Control (કીટ નિયંત્રણ)",
        topicSoil: "Soil Health (જમીનની સુધારણા)",
        topicBeejamrut: "Beejamrut (બીજામૃત)",
        recentChatsHeading: "તાજેતરની ચેટ",
        noRecentChats: "કોઈ અગાઉની ચેટ નથી",
        checkingServer: "સર્વર તપાસી રહ્યું છે...",
        onlineServer: "ઓનલાઇન",
        serviceDegraded: "સેવા મર્યાદિત છે",
        serverOffline: "સર્વર ઑફલાઇન છે",
        headerSubtitle: "Natural Farming Expert • પ્રાકૃતિક ખેતી આસિસ્ટન્ટ",
        headerCalc: "ખાતર કેલ્ક્યુલેટર",
        headerCalcMobile: "કેલ્ક્યુલેટર",
        clearChat: "ચેટ સાફ કરો",
        confirmClearChat: "શું તમે ચેટ હિસ્ટ્રી સાફ કરવા માંગો છો? (Clear chat history?)",
        typingAnalyzing: "KrushiMitra જવાબ તૈયાર કરી રહ્યું છે...",
        inputPlaceholder: "અહીં તમારો ખેતીને લગતો પ્રશ્ન લખો (જેમ કે: જીવામૃત કેમ બનાવવું?)...",
        photoBtnTitle: "પાકનો ફોટો અપલોડ કરો (રોગ નિદાન)",
        micBtnTitle: "બોલીને પૂછો (માઈક્રોફોન)",
        sendBtnText: "મોકલો",
        previewTitle: "પાકનો ફોટો જોડ્યો છે",
        previewBadge: "ફોટો",
        previewSubtext: "નિદાન માટે તૈયાર! 'મોકલો' દબાવો અથવા પ્રશ્ન પૂછો.",
        previewRemoveTitle: "ફોટો હટાવો",
        // Welcome Hero
        welcomeGreeting: "નમસ્તે! KrushiMitra માં આપનું સ્વાગત છે.",
        welcomeDesc: "હું તમારો પ્રાકૃતિક ખેતી આસિસ્ટન્ટ છું. જીવામૃત, કીટ નિયંત્રણ, આચ્છાદન અને ફોટો દ્વારા રોગ નિદાન માટે કોઈ પણ પ્રશ્ન પૂછો.",
        cardPhotoTitle: "AI Crop Disease Diagnosis (ફોટો દ્વારા પાક રોગ નિદાન)",
        cardPhotoBadge: "Scan Plant Photo",
        cardPhotoDesc: "તમારા રોગિષ્ટ પાક, પાંદડા કે જીવાતનો ફોટો અપલોડ કરો. આર્ટિફિશિયલ ઇન્ટેલિજન્સ રોગ પારખીને દેશી/પ્રાકૃતિક ઉપાય (નિમાસ્ત્ર, ખાટી છાશ, જીવામૃત) જણાવશે.",
        cardCalcTitle: "Jeevamrut Calculator (ખાતર કેલ્ક્યુલેટર)",
        cardCalcBadge: "Calculator",
        cardCalcDesc: "તમારી જમીન (વીઘા/એકર) અને પાક પસંદ કરી દેશી છાણ, ગૌમૂત્ર અને ગોળનું ચોક્કસ માપ મેળવો.",
        cardPestTitle: "કુદરતી કીટ નિયંત્રણ (Natural Pest Control)",
        cardPestDesc: "નિમાસ્ત્ર, અગ્નિઅસ્ત્ર, દશપર્ણી અર્ક અને ખાટી છાશનો છંટકાવ.",
        cardSoilTitle: "જમીન અને આચ્છાદન (Soil & Mulching)",
        cardSoilDesc: "જમીનની સુધારણા, અળસિયાની સક્રિયતા, અને કાષ્ઠ આચ્છાદન.",
        cardSeedTitle: "બીજામૃત માવજત (Beejamrut Care)",
        cardSeedDesc: "બીજ સંસ્કાર અને પાકને ફૂગ અને રોગ સામે રક્ષણ.",
        // Modal
        calcModalTitle: "જીવામૃત અને પ્રાકૃતિક ખાતર કેલ્ક્યુલેટર",
        calcModalSubtitle: "તમારી જમીન અને પાક અનુસાર દેશી છાણ, ગૌમૂત્ર, ગોળ, બેસન અને પાણીનું સચોટ માપ",
        prepTypeLabel: "૧. પ્રાકૃતિક બનાવટ પસંદ કરો (Select Preparation Type):",
        landSizeLabel: "જમીનનું માપ (Land Size):",
        quickPresetLabel: "ઝડપી:",
        unitLabel: "એકમ (Unit):",
        unitHelperText: "૧ એકર = ૨.૫ વીઘા (ગુજરાત પ્રમાણ)",
        cropLabel: "પાક (Crop Type):",
        cropHelperText: "ખાસ પાક મુજબ પિયત સમય પત્રક",
        resultHeaderTitle: "📊 જરૂરી સામગ્રીનું ચોક્કસ માપ (Exact Proportions):",
        methodGuideTitle: "બનાવવાની અને આથો લાવવાની સાચી રીત (Preparation Method):",
        cropScheduleTitle: "પાક માટે ક્યારે અને કઈ રીતે આપવું? (Application Schedule):",
        footerTip: "Subhash Palekar Natural Farming (SPNF) સ્ટાન્ડર્ડ રેશિયો આધારિત",
        calcCopyBtnText: "Copy Recipe",
        calcAskAiBtnText: "KrushiMitra ને પૂછો",
        copiedToast: "કોપી થઈ ગયું! ✓",
        // PWA
        pwaInstallBtnTextDesktop: "Install App",
        pwaInstallBtnTextMobile: "ઇન્સ્ટોલ",
        sidebarPwaText: "કૃષિમિત્ર એપ ઇન્સ્ટોલ કરો",
        mobilePwaTitle: "KrushiMitra AI એપ ઇન્સ્ટોલ કરો",
        mobilePwaDesc: "હોમસ્ક્રીન પર 1-ક્લિકમાં ખુલે, પ્લેસ્ટોર વગર!",
        mobilePwaInstallBtnText: "ઇન્સ્ટોલ",
        // Weather Modal
        weatherModalTitle: "લાઈવ હવામાન & સ્પ્રે સલાહકાર",
        weatherModalSub: "Open-Meteo • લાઈવ ભેજ, વરસાદ અને સ્પ્રે ચેતવણી",
        weatherDistrictLabel: "જિલ્લો પસંદ કરો (Select District):",
        weatherTempLabel: "તાપમાન",
        weatherHumLabel: "હવામાં ભેજ",
        weatherRainLabel: "વરસાદ શક્યતા",
        weatherWindLabel: "પવનની ગતિ",
        weatherForecastTitle: "આગામી ૩ દિવસની સ્પ્રે આગાહી (3-Day Spray Forecast):",
        weatherTipsTitle: "કુદરતી ખેતી હવામાન ટીપ્સ (Natural Farming Advisory):",
        weatherTip1: "જ્યારે ભેજ ૮૦% થી વધુ હોય ત્યારે ખાટી છાશ + હિંગનો સ્પ્રે કરવો જેથી ફૂગ ન આવે.",
        weatherTip2: "તેજ તડકો (બપોરે ૧૨ થી ૩) હોય ત્યારે ક્યારેય કોઈ પણ અર્ક કે જીવામૃત ન છાંટવું.",
        weatherAskAiBtnText: "KrushiMitra ને પૂછો",
        weatherCloseBtnText: "બંધ કરો",
        // Mandi Modal
        mandiModalTitle: "APMC માર્કેટ યાર્ડ લાઈવ બજાર ભાવ",
        mandiDateBadge: "લાઈવ અપડેટ",
        mandiModalSub: "ગોંડલ • રાજકોટ • ઊંઝા • બોટાદ • અમરેલી • જૂનાગઢ (ભાવ ₹/૨૦ કિલો દીઠ)",
        gondalVsRajkotTitle: "ગોંડલ vs રાજકોટ યાર્ડ સરખામણી (Gondal vs Rajkot Comparison):",
        gondalVsRajkotBadge: "ક્યાં વેચવું ફાયદાકારક?",
        mandiYardLabel: "🏛️ યાર્ડ:",
        optAllYards: "બધા માર્કેટ યાર્ડ (All Yards)",
        mandiSearchPlaceholder: "પાક કે યાર્ડ શોધો...",
        cropFilterAll: "બધા પાક",
        cropFilterCotton: "⚪ કપાસ",
        cropFilterGroundnut: "🥜 મગફળી",
        cropFilterCumin: "🌿 જીરું",
        cropFilterWheat: "🌾 ઘઉં",
        cropFilterChana: "🌰 ચણા",
        cropFilterSesame: "🌱 તલ",
        cropFilterCoriander: "🌿 ધાણા",
        cropFilterMustard: "🟡 રાયડો",
        thCropName: "પાકનું નામ (Crop)",
        thMandiYard: "યાર્ડ (Mandi)",
        thMinPrice: "નીચો ભાવ",
        thMaxPrice: "ઊંચો ભાવ",
        thAvgPrice: "સરેરાશ ભાવ",
        thArrivals: "આવક",
        thTrend: "ટ્રેન્ડ",
        thAction: "ક્રિયા",
        mandiFootnote: "* નોંધ: તમામ ભાવો પ્રતિ ૨૦ કિલોગ્રામ (૧ મણ) દીઠ છે. દરરોજ સાંજે ૬:૦૦ કલાકે નવા ભાવો અપડેટ થાય છે.",
        mandiAskAiBtnText: "KrushiMitra ને પૂછો",
        mandiCloseBtnText: "બંધ કરો",
        // Crop Calendar Modal
        calendarModalTitle: "૯૦ દિવસ પ્રાકૃતિક પાક કેલેન્ડર",
        calendarModalSub: "સુભાષ પાલેકર પદ્ધતિ • વાવણીની તારીખ મુજબ સ્ટેપ-બાય-સ્ટેપ શિડ્યુલ",
        calendarCropSelectLabel: "૧. પાક પસંદ કરો (Select Crop):",
        calendarSowingDateLabel: "૨. વાવણી તારીખ (Sowing Date):",
        copyScheduleBtnText: "વોટ્સએપ શિડ્યુલ કોપી કરો",
        calendarAskAiBtnText: "KrushiMitra ને પૂછો",
        calendarCloseBtnText: "બંધ કરો",
        optCropGroundnut: "🥜 મગફળી (Groundnut - ૯૦ થી ૧૦૫ દિવસ)",
        optCropCotton: "⚪ કપાસ (Cotton - ૯૦ દિવસ માવજત)",
        optCropWheat: "🌾 ઘઉં (Wheat - ૯૦ થી ૧૦૦ દિવસ)",
        optCropCumin: "🌿 જીરું (Cumin - ૯૦ દિવસ)",
        optCropChana: "🌰 ચણા (Chickpea - ૮૫ થી ૯૫ દિવસ)",
        optCropVegetables: "🥬 શાકભાજી (રીંગણ, મરચી, ટામેટાં)",
        // Medicine Modal
        medicineModalTitle: "દેશી દવા લાઈબ્રેરી & સરકારી સહાય",
        medicineModalSub: "નીમાસ્ત્ર, અગ્નિઅસ્ત્ર, દશપર્ણી અર્ક & i-Khedut યોજનાઓ",
        medTabRecipes: "🌿 દેશી અર્ક બનાવવાની રીતો (Recipes)",
        medTabSubsidy: "🏛️ પ્રાકૃતિક ખેતી સરકારી સહાય (Subsidy)",
        medicineAskAiBtnText: "KrushiMitra ને પૂછો",
        medicineCloseBtnText: "બંધ કરો",
        // Tools Hub Modal
        toolsHubTitle: "🧪 કિસાન સ્માર્ટ ટૂલ્સ (Farm Tools)",
        toolsHubCalcTitle: "ખાતર કેલ્ક્યુલેટર (Fertilizer Calculator)",
        toolsHubCalcSub: "વીઘા દીઠ જીવામૃત, ઘનજીવામૃતનું સચોટ માપ",
        toolsHubMedTitle: "દેશી દવા લાઈબ્રેરી (Organic Medicine)",
        toolsHubMedSub: "નીમાસ્ત્ર, અગ્નિઅસ્ત્ર, દશપર્ણી અર્ક બનાવવાની રીત",
        toolsHubSubTitle: "સરકારી સહાય યોજનાઓ (Govt Subsidy)",
        toolsHubSubSub: "દેશી ગાય ₹૯૦૦/માસ સહાય અને કીટ સબસિડી"
    },
    English: {
        appTitle: "KrushiMitra",
        appTag: "AI 3.0",
        sidebarSubtitle: "Natural Farming AI Assistant",
        newChat: "New Conversation",
        sidebarCalc: "Fertilizer Calculator",
        quickTopicsHeading: "Quick Topics",
        topicJeevamrut: "Jeevamrut Preparation",
        topicPest: "Natural Pest Control",
        topicSoil: "Soil Health & Mulching",
        topicBeejamrut: "Beejamrut Seed Care",
        recentChatsHeading: "Recent Chats",
        noRecentChats: "No previous chats",
        checkingServer: "Checking Server...",
        onlineServer: "Online",
        serviceDegraded: "Service Degraded",
        serverOffline: "Server Offline",
        headerSubtitle: "Natural Farming Expert • AI Agriculture Assistant",
        headerCalc: "Fertilizer Calculator",
        headerCalcMobile: "Calculator",
        clearChat: "Clear Chat",
        confirmClearChat: "Are you sure you want to clear the conversation history?",
        typingAnalyzing: "KrushiMitra is analyzing and generating answer...",
        inputPlaceholder: "Ask a natural farming question here (e.g., How to prepare Jeevamrut?)...",
        photoBtnTitle: "Upload/Capture Plant Photo for Disease Diagnosis",
        micBtnTitle: "Voice Dictation (Microphone)",
        sendBtnText: "Send",
        previewTitle: "Crop Photo Attached",
        previewBadge: "Photo",
        previewSubtext: "Ready to diagnose! Click Send or ask a specific question.",
        previewRemoveTitle: "Remove Attached Photo",
        // Welcome Hero
        welcomeGreeting: "Welcome to KrushiMitra AI!",
        welcomeDesc: "I am your Natural Farming Assistant. Ask anything about Jeevamrut, pest control, mulching, or upload photos for AI crop disease diagnosis.",
        cardPhotoTitle: "AI Crop Disease Diagnosis (Scan Plant Photo)",
        cardPhotoBadge: "Scan Plant Photo",
        cardPhotoDesc: "Upload photos of diseased crops, leaves, or pests. AI will diagnose the infection and prescribe natural organic remedies (Nimastra, buttermilk spray, Jeevamrut).",
        cardCalcTitle: "Jeevamrut & Fertilizer Calculator",
        cardCalcBadge: "Calculator",
        cardCalcDesc: "Select your land size (Vigha/Acre) and crop type to get exact required proportions of cow dung, gomutra, jaggery, and water.",
        cardPestTitle: "Natural Pest Control",
        cardPestDesc: "How to prepare and spray Nimastra, Agniastra, Dashparni Ark, and sour buttermilk spray.",
        cardSoilTitle: "Soil Health & Mulching",
        cardSoilDesc: "Soil organic carbon enrichment, earthworm activity, and maintaining Whapasa moisture conditions.",
        cardSeedTitle: "Beejamrut Seed Care",
        cardSeedDesc: "Natural cow-dung seed treatment to protect seeds and seedlings from root rot and fungal wilt.",
        // Modal
        calcModalTitle: "Jeevamrut & Organic Fertilizer Calculator",
        calcModalSubtitle: "Exact proportions in kg & liters based on your land and crop",
        prepTypeLabel: "1. Select Natural Preparation Type:",
        landSizeLabel: "Land Size:",
        quickPresetLabel: "Quick:",
        unitLabel: "Unit:",
        unitHelperText: "1 Acre = 2.5 Vigha (Gujarat standard)",
        cropLabel: "Crop Type:",
        cropHelperText: "Crop-specific application and irrigation schedule",
        resultHeaderTitle: "📊 Exact Required Proportions:",
        methodGuideTitle: "Preparation & Fermentation Guide:",
        cropScheduleTitle: "Application & Irrigation Schedule:",
        footerTip: "Based on Subhash Palekar Natural Farming (SPNF) standard ratios",
        calcCopyBtnText: "Copy Recipe",
        calcAskAiBtnText: "Ask KrushiMitra AI",
        copiedToast: "Copied! ✓",
        // PWA
        pwaInstallBtnTextDesktop: "Install App",
        pwaInstallBtnTextMobile: "Install",
        sidebarPwaText: "Install Mobile App (PWA)",
        mobilePwaTitle: "Install KrushiMitra AI App",
        mobilePwaDesc: "1-Click Home Screen access, no App Store needed!",
        mobilePwaInstallBtnText: "Install",
        // Weather Modal
        weatherModalTitle: "Live Farm Weather & Spray Advisory",
        weatherModalSub: "Open-Meteo • Live humidity, rain forecast & organic spray alert",
        weatherDistrictLabel: "Select District:",
        weatherTempLabel: "Temperature",
        weatherHumLabel: "Air Humidity",
        weatherRainLabel: "Rain Probability",
        weatherWindLabel: "Wind Speed",
        weatherForecastTitle: "3-Day Spray Outlook (Farm Forecast):",
        weatherTipsTitle: "Natural Farming Weather Guidelines:",
        weatherTip1: "When humidity exceeds 80%, spray sour buttermilk + hing to prevent fungal blight and wilt.",
        weatherTip2: "Never spray botanical extracts or Jeevamrut during harsh noon heat (12 PM to 3 PM).",
        weatherAskAiBtnText: "Ask KrushiMitra AI",
        weatherCloseBtnText: "Close",
        // Mandi Modal
        mandiModalTitle: "Live APMC Mandi Market Rates",
        mandiDateBadge: "Live Sync",
        mandiModalSub: "Gondal • Rajkot • Unjha • Botad • Amreli • Junagadh (Rates per 20kg / 1 Man)",
        gondalVsRajkotTitle: "Gondal vs Rajkot Yard Price Comparison:",
        gondalVsRajkotBadge: "Where is it more profitable?",
        mandiYardLabel: "🏛️ Yard:",
        optAllYards: "All Market Yards",
        mandiSearchPlaceholder: "Search crop or yard (e.g. Gondal, Cotton)...",
        cropFilterAll: "All Crops",
        cropFilterCotton: "⚪ Cotton",
        cropFilterGroundnut: "🥜 Groundnut",
        cropFilterCumin: "🌿 Cumin",
        cropFilterWheat: "🌾 Wheat",
        cropFilterChana: "🌰 Chickpea",
        cropFilterSesame: "🌱 Sesame",
        cropFilterCoriander: "🌿 Coriander",
        cropFilterMustard: "🟡 Mustard",
        thCropName: "Crop Name",
        thMandiYard: "Mandi Yard",
        thMinPrice: "Min Rate",
        thMaxPrice: "Max Rate",
        thAvgPrice: "Modal Rate",
        thArrivals: "Arrivals",
        thTrend: "Trend",
        thAction: "Action",
        mandiFootnote: "* Note: All commodity rates are per 20 kg (1 Man). Updated daily at 6:00 PM.",
        mandiAskAiBtnText: "Ask KrushiMitra AI",
        mandiCloseBtnText: "Close",
        // Crop Calendar Modal
        calendarModalTitle: "90-Day Natural Farming Crop Calendar",
        calendarModalSub: "Subhash Palekar Method • Step-by-Step schedule from sowing date",
        calendarCropSelectLabel: "1. Select Crop:",
        calendarSowingDateLabel: "2. Sowing Date:",
        copyScheduleBtnText: "Copy WhatsApp Timetable",
        calendarAskAiBtnText: "Ask KrushiMitra AI",
        calendarCloseBtnText: "Close",
        optCropGroundnut: "🥜 Groundnut (90 to 105 days)",
        optCropCotton: "⚪ Cotton (90 days organic care)",
        optCropWheat: "🌾 Wheat (90 to 100 days)",
        optCropCumin: "🌿 Cumin (90 days)",
        optCropChana: "🌰 Chickpea (85 to 95 days)",
        optCropVegetables: "🥬 Vegetables (Eggplant, Chilli, Tomato)",
        // Medicine Modal
        medicineModalTitle: "Organic Medicine Library & Govt Subsidies",
        medicineModalSub: "Nimastra, Agniastra, Dashparni Ark & i-Khedut Schemes",
        medTabRecipes: "🌿 Organic Formulations & Recipes",
        medTabSubsidy: "🏛️ Natural Farming Govt Subsidies",
        medicineAskAiBtnText: "Ask KrushiMitra AI",
        medicineCloseBtnText: "Close",
        // Tools Hub Modal
        toolsHubTitle: "🧪 Smart Farm Tools",
        toolsHubCalcTitle: "Fertilizer Calculator",
        toolsHubCalcSub: "Proportions per Vigha & Acre for Jeevamrut",
        toolsHubMedTitle: "Organic Medicine Library",
        toolsHubMedSub: "Recipes for Nimastra, Agniastra, Dashparni Ark",
        toolsHubSubTitle: "Govt Subsidy Schemes",
        toolsHubSubSub: "Desi cow ₹900/month & natural farming kits"
    }
};

const QUICK_TOPIC_QUERIES = {
    jeevamrut: {
        Gujarati: "જીવામૃત બનાવવાની સાચી રીત અને તેના ખેતીમાં ફાયદા જણાવો.",
        English: "What is the correct method to prepare Jeevamrut and its benefits for crops?"
    },
    pest: {
        Gujarati: "પ્રાકૃતિક ખેતીમાં પાક સંરક્ષણ માટે નિમાસ્ત્ર અને અગ્નિઅસ્ત્ર કેમ બનાવવું?",
        English: "How to prepare Nimastra and Agniastra for natural pest control?"
    },
    soil: {
        Gujarati: "જમીનની કાળજી માટે આચ્છાદન (Mulching) અને વાપસા સ્થિતિનું મહત્વ સમજાવો.",
        English: "Explain the importance of mulching and maintaining Whapasa condition for soil health."
    },
    beejamrut: {
        Gujarati: "બીજામૃતથી પટ આપવાની રીત અને તેનાથી પાકને થતા ફાયદા જણાવો.",
        English: "How to treat seeds with Beejamrut and what are its benefits?"
    }
};

function getWelcomeCardHtml(lang) {
    const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS["Gujarati"];
    return `
        <div id="welcomeCard" class="max-w-2xl mx-auto my-6 space-y-6 text-center animate-fade-in">
            <div class="w-20 h-20 mx-auto rounded-3xl bg-emerald-700 text-white flex items-center justify-center text-4xl shadow-xl border-2 border-emerald-400">
                🧑‍🌾
            </div>
            <div class="space-y-2">
                <h2 class="text-2xl sm:text-3xl font-extrabold text-[#093829] tracking-tight" id="welcomeGreeting">
                    ${t.welcomeGreeting}
                </h2>
                <p class="text-sm text-[#334e43] font-medium leading-relaxed max-w-lg mx-auto" id="welcomeDesc">
                    ${t.welcomeDesc}
                </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div onclick="triggerPhotoUpload()" class="krushi-card p-5 rounded-2xl krushi-card-hover cursor-pointer space-y-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-emerald-100/60 shadow-md sm:col-span-2">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2.5 text-[#059669] font-bold text-base">
                            <span class="text-2xl">📸</span>
                            <span id="cardPhotoTitle">${t.cardPhotoTitle}</span>
                        </div>
                        <span class="text-xs bg-emerald-600 text-white font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5" id="cardPhotoBadge">
                            <i class="fa-solid fa-camera"></i>
                            <span>${t.cardPhotoBadge}</span>
                        </span>
                    </div>
                    <p class="text-xs text-[#334e43] font-medium leading-relaxed" id="cardPhotoDesc">
                        ${t.cardPhotoDesc}
                    </p>
                </div>

                <div onclick="openFertilizerCalculator()" class="krushi-card p-5 rounded-2xl krushi-card-hover cursor-pointer space-y-2 border-emerald-300 bg-gradient-to-br from-emerald-50/70 to-white">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2.5 text-[#059669] font-bold text-base">
                            <span class="text-xl">🧪</span>
                            <span id="cardCalcTitle">${t.cardCalcTitle}</span>
                        </div>
                        <span class="text-[10px] bg-emerald-700 text-white font-extrabold px-2 py-0.5 rounded-full shadow-xs" id="cardCalcBadge">${t.cardCalcBadge}</span>
                    </div>
                    <p class="text-xs text-[#475569] font-medium leading-relaxed" id="cardCalcDesc">${t.cardCalcDesc}</p>
                </div>

                <div onclick="sendQuickTopic('pest')" class="krushi-card p-5 rounded-2xl krushi-card-hover cursor-pointer space-y-2">
                    <div class="flex items-center gap-2.5 text-[#059669] font-bold text-base">
                        <span class="text-xl">🌿</span>
                        <span id="cardPestTitle">${t.cardPestTitle}</span>
                    </div>
                    <p class="text-xs text-[#475569] font-medium leading-relaxed" id="cardPestDesc">${t.cardPestDesc}</p>
                </div>

                <div onclick="sendQuickTopic('soil')" class="krushi-card p-5 rounded-2xl krushi-card-hover cursor-pointer space-y-2">
                    <div class="flex items-center gap-2.5 text-[#059669] font-bold text-base">
                        <span class="text-xl">🌾</span>
                        <span id="cardSoilTitle">${t.cardSoilTitle}</span>
                    </div>
                    <p class="text-xs text-[#475569] font-medium leading-relaxed" id="cardSoilDesc">${t.cardSoilDesc}</p>
                </div>

                <div onclick="sendQuickTopic('beejamrut')" class="krushi-card p-5 rounded-2xl krushi-card-hover cursor-pointer space-y-2">
                    <div class="flex items-center gap-2.5 text-[#059669] font-bold text-base">
                        <span class="text-xl">🐄</span>
                        <span id="cardSeedTitle">${t.cardSeedTitle}</span>
                    </div>
                    <p class="text-xs text-[#475569] font-medium leading-relaxed" id="cardSeedDesc">${t.cardSeedDesc}</p>
                </div>
            </div>
        </div>
    `;
}

function applyTranslations(lang) {
    const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS["Gujarati"];

    // Sidebar
    const sidebarSubtitle = document.getElementById("sidebarSubtitle");
    if (sidebarSubtitle) sidebarSubtitle.innerText = t.sidebarSubtitle;

    const sidebarNewChatText = document.getElementById("sidebarNewChatText");
    if (sidebarNewChatText) sidebarNewChatText.innerText = t.newChat;

    const sidebarCalcBtnText = document.getElementById("sidebarCalcBtnText");
    if (sidebarCalcBtnText) sidebarCalcBtnText.innerText = t.sidebarCalc;

    const quickTopicsHeading = document.getElementById("quickTopicsHeading");
    if (quickTopicsHeading) quickTopicsHeading.innerText = t.quickTopicsHeading;

    const topicJeeva = document.getElementById("topic-jeevamrut-text");
    if (topicJeeva) topicJeeva.innerText = t.topicJeevamrut;

    const topicPest = document.getElementById("topic-pest-text");
    if (topicPest) topicPest.innerText = t.topicPest;

    const topicSoil = document.getElementById("topic-soil-text");
    if (topicSoil) topicSoil.innerText = t.topicSoil;

    const topicBeeja = document.getElementById("topic-beejamrut-text");
    if (topicBeeja) topicBeeja.innerText = t.topicBeejamrut;

    const recentChatsHeading = document.getElementById("recentChatsHeading");
    if (recentChatsHeading) recentChatsHeading.innerText = t.recentChatsHeading;

    // Header
    const headerSubtitle = document.getElementById("headerSubtitle");
    if (headerSubtitle) headerSubtitle.innerText = t.headerSubtitle;

    const headerCalcBtnText = document.getElementById("headerCalcBtnText");
    if (headerCalcBtnText) headerCalcBtnText.innerText = t.headerCalc;

    const headerCalcBtnTextMobile = document.getElementById("headerCalcBtnTextMobile");
    if (headerCalcBtnTextMobile) headerCalcBtnTextMobile.innerText = t.headerCalcMobile;

    const clearChatBtnText = document.getElementById("clearChatBtnText");
    if (clearChatBtnText) clearChatBtnText.innerText = t.clearChat;

    // Input Dock
    if (userInput) userInput.placeholder = t.inputPlaceholder;

    const photoBtn = document.getElementById("photoBtn");
    if (photoBtn) photoBtn.title = t.photoBtnTitle;

    const micBtn = document.getElementById("micBtn");
    if (micBtn) micBtn.title = t.micBtnTitle;

    const sendBtnText = document.getElementById("sendBtnText");
    if (sendBtnText) sendBtnText.innerText = t.sendBtnText;

    // Image Preview Bar
    const previewTitle = document.getElementById("previewTitle");
    if (previewTitle) previewTitle.innerText = t.previewTitle;

    const imageSizeBadge = document.getElementById("imageSizeBadge");
    if (imageSizeBadge) imageSizeBadge.innerText = t.previewBadge;

    const previewSubtext = document.getElementById("previewSubtext");
    if (previewSubtext) previewSubtext.innerText = t.previewSubtext;

    // Mobile WhatsApp-Style Bottom Navigation Tabs Translation
    const isEn = lang === "English";
    const navChat = document.getElementById("mobileNavChatText");
    if (navChat) navChat.innerText = isEn ? "Chat" : "ચેટ";

    const navMandi = document.getElementById("mobileNavMandiText");
    if (navMandi) navMandi.innerText = isEn ? "Mandi" : "યાર્ડ ભાવ";

    const navWeather = document.getElementById("mobileNavWeatherText");
    if (navWeather) navWeather.innerText = isEn ? "Weather" : "હવામાન";

    const navCal = document.getElementById("mobileNavCalendarText");
    if (navCal) navCal.innerText = isEn ? "Calendar" : "કેલેન્ડર";

    const navTools = document.getElementById("mobileNavToolsText");
    if (navTools) navTools.innerText = isEn ? "Tools" : "ટૂલ્સ";

    // Sidebar Tools Titles Translation
    const toolsHeading = document.getElementById("toolsHeading");
    if (toolsHeading) toolsHeading.innerHTML = `<i class="fa-solid fa-bolt text-amber-400"></i> <span>${isEn ? "Smart Farm Tools" : "મુખ્ય સુવિધાઓ (Smart Tools)"}</span>`;

    const toolWeatherTitle = document.getElementById("toolWeatherTitle");
    if (toolWeatherTitle) toolWeatherTitle.innerText = isEn ? "Live Weather & Spray" : "લાઈવ હવામાન & સ્પ્રે";
    const toolWeatherSub = document.getElementById("toolWeatherSub");
    if (toolWeatherSub) toolWeatherSub.innerText = isEn ? "Rain, humidity & alert" : "વરસાદ, ભેજ અને સલાહ";

    const toolMandiTitle = document.getElementById("toolMandiTitle");
    if (toolMandiTitle) toolMandiTitle.innerText = isEn ? "APMC Mandi Rates" : "APMC યાર્ડ ભાવ";
    const toolMandiSub = document.getElementById("toolMandiSub");
    if (toolMandiSub) toolMandiSub.innerText = isEn ? "Live Gujarat rates (₹/20kg)" : "ગોંડલ-રાજકોટ તાજા ભાવ";

    const toolCalendarTitle = document.getElementById("toolCalendarTitle");
    if (toolCalendarTitle) toolCalendarTitle.innerText = isEn ? "90-Day Crop Calendar" : "૯૦ દિવસ પાક કેલેન્ડર";
    const toolCalendarSub = document.getElementById("toolCalendarSub");
    if (toolCalendarSub) toolCalendarSub.innerText = isEn ? "Sowing to harvest guide" : "વાવણીથી કાપણી શિડ્યુલ";

    const toolCalcTitle = document.getElementById("toolCalcTitle");
    if (toolCalcTitle) toolCalcTitle.innerText = isEn ? "Fertilizer Calculator" : "ખાતર કેલ્ક્યુલેટર";
    const toolCalcSub = document.getElementById("toolCalcSub");
    if (toolCalcSub) toolCalcSub.innerText = isEn ? "Proportions per Vigha" : "વીઘા દીઠ જીવામૃત માપ";

    const toolMedicineTitle = document.getElementById("toolMedicineTitle");
    if (toolMedicineTitle) toolMedicineTitle.innerText = isEn ? "Organic Medicine & Schemes" : "દેશી દવા લાઈબ્રેરી";
    const toolMedicineSub = document.getElementById("toolMedicineSub");
    if (toolMedicineSub) toolMedicineSub.innerText = isEn ? "Nimastra & Govt Subsidy" : "નીમાસ્ત્ર, અગ્નિઅસ્ત્ર & સહાય";

    // PWA Controls Translation
    const sidebarPwaText = document.getElementById("sidebarPwaText");
    if (sidebarPwaText) sidebarPwaText.innerText = t.sidebarPwaText;

    const pwaBtnDesk = document.getElementById("pwaInstallBtnTextDesktop");
    if (pwaBtnDesk) pwaBtnDesk.innerText = t.pwaInstallBtnTextDesktop;

    const pwaBtnMob = document.getElementById("pwaInstallBtnTextMobile");
    if (pwaBtnMob) pwaBtnMob.innerText = t.pwaInstallBtnTextMobile;

    const mobPwaTitle = document.getElementById("mobilePwaTitle");
    if (mobPwaTitle) mobPwaTitle.innerText = t.mobilePwaTitle;

    const mobPwaDesc = document.getElementById("mobilePwaDesc");
    if (mobPwaDesc) mobPwaDesc.innerText = t.mobilePwaDesc;

    const mobPwaBtn = document.getElementById("mobilePwaInstallBtnText");
    if (mobPwaBtn) mobPwaBtn.innerText = t.mobilePwaInstallBtnText;

    // Weather Modal Translation
    const wTitle = document.getElementById("weatherModalTitle");
    if (wTitle) wTitle.innerText = t.weatherModalTitle;
    const wSub = document.getElementById("weatherModalSub");
    if (wSub) wSub.innerText = t.weatherModalSub;
    const wDistLabel = document.getElementById("weatherDistrictLabel");
    if (wDistLabel) wDistLabel.innerText = t.weatherDistrictLabel;
    const wTempLabel = document.getElementById("weatherTempLabel");
    if (wTempLabel) wTempLabel.innerText = t.weatherTempLabel;
    const wHumLabel = document.getElementById("weatherHumLabel");
    if (wHumLabel) wHumLabel.innerText = t.weatherHumLabel;
    const wRainLabel = document.getElementById("weatherRainLabel");
    if (wRainLabel) wRainLabel.innerText = t.weatherRainLabel;
    const wWindLabel = document.getElementById("weatherWindLabel");
    if (wWindLabel) wWindLabel.innerText = t.weatherWindLabel;
    const wForecastTitle = document.getElementById("weatherForecastTitle");
    if (wForecastTitle) wForecastTitle.innerText = t.weatherForecastTitle;
    const wTipsTitle = document.getElementById("weatherTipsTitle");
    if (wTipsTitle) wTipsTitle.innerText = t.weatherTipsTitle;
    const wTip1 = document.getElementById("weatherTip1");
    if (wTip1) wTip1.innerText = t.weatherTip1;
    const wTip2 = document.getElementById("weatherTip2");
    if (wTip2) wTip2.innerText = t.weatherTip2;
    const wAskAi = document.getElementById("weatherAskAiBtnText");
    if (wAskAi) wAskAi.innerText = t.weatherAskAiBtnText;
    const wClose = document.getElementById("weatherCloseBtnText");
    if (wClose) wClose.innerText = t.weatherCloseBtnText;

    // Weather metric sub-labels
    const wMaxTempSub = document.getElementById("weatherMaxTempSub");
    if (wMaxTempSub && !latestWeatherData) wMaxTempSub.innerText = isEn ? "Max Day Temp" : "મહત્તમ તાપમાન";
    const wHumSub = document.getElementById("weatherHumSub");
    if (wHumSub && !latestWeatherData) wHumSub.innerText = isEn ? "Relative Humidity" : "સાપેક્ષ ભેજ";
    const wRainSub = document.getElementById("weatherRainSub");
    if (wRainSub && !latestWeatherData) wRainSub.innerText = isEn ? "Rain Probability" : "વરસાદ સંભાવના";
    const wWindSub = document.getElementById("weatherWindSub");
    if (wWindSub && !latestWeatherData) wWindSub.innerText = isEn ? "Wind Speed" : "પવન ઝડપ";

    // Weather District Select Dropdown Options
    const distSelect = document.getElementById("weatherDistrictSelect");
    if (distSelect) {
        const distLabels = isEn ? {
            Rajkot: "Rajkot",
            Gondal: "Gondal",
            Junagadh: "Junagadh",
            Amreli: "Amreli",
            Botad: "Botad",
            Jamnagar: "Jamnagar",
            Bhavnagar: "Bhavnagar",
            Surendranagar: "Surendranagar",
            Mehsana: "Mehsana",
            Surat: "Surat"
        } : {
            Rajkot: "રાજકોટ (Rajkot)",
            Gondal: "ગોંડલ (Gondal)",
            Junagadh: "જૂનાગઢ (Junagadh)",
            Amreli: "અમરેલી (Amreli)",
            Botad: "બોટાદ (Botad)",
            Jamnagar: "જામનગર (Jamnagar)",
            Bhavnagar: "ભાવનગર (Bhavnagar)",
            Surendranagar: "સુરેન્દ્રનગર (Surendranagar)",
            Mehsana: "મહેસાણા (Mehsana)",
            Surat: "સુરત (Surat)"
        };
        for (let opt of distSelect.options) {
            if (distLabels[opt.value]) opt.text = distLabels[opt.value];
        }
    }

    // Mandi Modal Translation
    const mTitle = document.getElementById("mandiModalTitle");
    if (mTitle) mTitle.innerText = t.mandiModalTitle;
    const mDateBadge = document.getElementById("mandiDateBadge");
    if (mDateBadge) mDateBadge.innerText = t.mandiDateBadge;
    const mSub = document.getElementById("mandiModalSub");
    if (mSub) mSub.innerText = t.mandiModalSub;
    const gVsRTitle = document.getElementById("gondalVsRajkotTitle");
    if (gVsRTitle) gVsRTitle.innerText = t.gondalVsRajkotTitle;
    const gVsRBadge = document.getElementById("gondalVsRajkotBadge");
    if (gVsRBadge) gVsRBadge.innerText = t.gondalVsRajkotBadge;
    const mYardLabel = document.getElementById("mandiYardLabel");
    if (mYardLabel) mYardLabel.innerText = t.mandiYardLabel;
    const optAllYards = document.getElementById("optAllYards");
    if (optAllYards) optAllYards.innerText = t.optAllYards;
    const mSearchInput = document.getElementById("mandiSearchInput");
    if (mSearchInput) mSearchInput.placeholder = t.mandiSearchPlaceholder;

    // Mandi Yard Filter Dropdown Options
    const yardSelect = document.getElementById("mandiYardFilter");
    if (yardSelect) {
        const yardLabels = isEn ? {
            all: "All Market Yards",
            gondal: "Gondal Mandi",
            rajkot: "Rajkot Mandi",
            unjha: "Unjha Mandi",
            botad: "Botad Mandi",
            amreli: "Amreli Mandi",
            junagadh: "Junagadh Mandi"
        } : {
            all: "બધા માર્કેટ યાર્ડ (All Yards)",
            gondal: "ગોંડલ (Gondal)",
            rajkot: "રાજકોટ (Rajkot)",
            unjha: "ઊંઝા (Unjha)",
            botad: "બોટાદ (Botad)",
            amreli: "અમરેલી (Amreli)",
            junagadh: "જૂનાગઢ (Junagadh)"
        };
        for (let opt of yardSelect.options) {
            if (yardLabels[opt.value]) opt.text = yardLabels[opt.value];
        }
    }

    const cfAll = document.getElementById("cropFilterAll");
    if (cfAll) cfAll.innerText = t.cropFilterAll;
    const cfCotton = document.getElementById("cropFilterCotton");
    if (cfCotton) cfCotton.innerText = t.cropFilterCotton;
    const cfGroundnut = document.getElementById("cropFilterGroundnut");
    if (cfGroundnut) cfGroundnut.innerText = t.cropFilterGroundnut;
    const cfCumin = document.getElementById("cropFilterCumin");
    if (cfCumin) cfCumin.innerText = t.cropFilterCumin;
    const cfWheat = document.getElementById("cropFilterWheat");
    if (cfWheat) cfWheat.innerText = t.cropFilterWheat;
    const cfChana = document.getElementById("cropFilterChana");
    if (cfChana) cfChana.innerText = t.cropFilterChana;
    const cfSesame = document.getElementById("cropFilterSesame");
    if (cfSesame) cfSesame.innerText = t.cropFilterSesame;
    const cfCoriander = document.getElementById("cropFilterCoriander");
    if (cfCoriander) cfCoriander.innerText = t.cropFilterCoriander;
    const cfMustard = document.getElementById("cropFilterMustard");
    if (cfMustard) cfMustard.innerText = t.cropFilterMustard;

    const thCrop = document.getElementById("thCropName");
    if (thCrop) thCrop.innerText = t.thCropName;
    const thYard = document.getElementById("thMandiYard");
    if (thYard) thYard.innerText = t.thMandiYard;
    const thMin = document.getElementById("thMinPrice");
    if (thMin) thMin.innerText = t.thMinPrice;
    const thMax = document.getElementById("thMaxPrice");
    if (thMax) thMax.innerText = t.thMaxPrice;
    const thAvg = document.getElementById("thAvgPrice");
    if (thAvg) thAvg.innerText = t.thAvgPrice;
    const thArr = document.getElementById("thArrivals");
    if (thArr) thArr.innerText = t.thArrivals;
    const thTrend = document.getElementById("thTrend");
    if (thTrend) thTrend.innerText = t.thTrend;
    const thAct = document.getElementById("thAction");
    if (thAct) thAct.innerText = t.thAction;

    const mFootnote = document.getElementById("mandiFootnote");
    if (mFootnote) mFootnote.innerText = t.mandiFootnote;
    const mAskAi = document.getElementById("mandiAskAiBtnText");
    if (mAskAi) mAskAi.innerText = t.mandiAskAiBtnText;
    const mClose = document.getElementById("mandiCloseBtnText");
    if (mClose) mClose.innerText = t.mandiCloseBtnText;

    // Crop Calendar Modal Translation
    const calTitle = document.getElementById("calendarModalTitle");
    if (calTitle) calTitle.innerText = t.calendarModalTitle;
    const calSub = document.getElementById("calendarModalSub");
    if (calSub) calSub.innerText = t.calendarModalSub;
    const calCropLabel = document.getElementById("calendarCropSelectLabel");
    if (calCropLabel) calCropLabel.innerText = t.calendarCropSelectLabel;
    const calSowingLabel = document.getElementById("calendarSowingDateLabel");
    if (calSowingLabel) calSowingLabel.innerText = t.calendarSowingDateLabel;
    const copySchedBtn = document.getElementById("copyScheduleBtnText");
    if (copySchedBtn) copySchedBtn.innerText = t.copyScheduleBtnText;
    const calAskAi = document.getElementById("calendarAskAiBtnText");
    if (calAskAi) calAskAi.innerText = t.calendarAskAiBtnText;
    const calClose = document.getElementById("calendarCloseBtnText");
    if (calClose) calClose.innerText = t.calendarCloseBtnText;

    // Crop Calendar Dropdown Options
    const calCropSelect = document.getElementById("calendarCropSelect");
    if (calCropSelect) {
        const calCropLabels = isEn ? {
            groundnut: "🥜 Groundnut (90 to 105 days)",
            cotton: "⚪ Cotton (90 days organic care)",
            wheat: "🌾 Wheat (90 to 100 days)",
            cumin: "🌿 Cumin (90 days)",
            chana: "🌰 Chickpea (85 to 95 days)",
            vegetables: "🥬 Vegetables (Eggplant, Chilli, Tomato)"
        } : {
            groundnut: "🥜 મગફળી (Groundnut - ૯૦ થી ૧૦૫ દિવસ)",
            cotton: "⚪ કપાસ (Cotton - ૯૦ દિવસ માવજત)",
            wheat: "🌾 ઘઉં (Wheat - ૯૦ થી ૧૦૦ દિવસ)",
            cumin: "🌿 જીરું (Cumin - ૯૦ દિવસ)",
            chana: "🌰 ચણા (Chickpea - ૮૫ થી ૯૫ દિવસ)",
            vegetables: "🥬 શાકભાજી (રીંગણ, મરચી, ટામેટાં)"
        };
        for (let opt of calCropSelect.options) {
            if (calCropLabels[opt.value]) opt.text = calCropLabels[opt.value];
        }
    }

    const optGroundnut = document.getElementById("optCropGroundnut");
    if (optGroundnut) optGroundnut.innerText = t.optCropGroundnut;
    const optCotton = document.getElementById("optCropCotton");
    if (optCotton) optCotton.innerText = t.optCropCotton;
    const optWheat = document.getElementById("optCropWheat");
    if (optWheat) optWheat.innerText = t.optCropWheat;
    const optCumin = document.getElementById("optCropCumin");
    if (optCumin) optCumin.innerText = t.optCropCumin;
    const optChana = document.getElementById("optCropChana");
    if (optChana) optChana.innerText = t.optCropChana;
    const optVeg = document.getElementById("optCropVegetables");
    if (optVeg) optVeg.innerText = t.optCropVegetables;

    // Medicine Modal Translation
    const medTitle = document.getElementById("medicineModalTitle");
    if (medTitle) medTitle.innerText = t.medicineModalTitle;
    const medSub = document.getElementById("medicineModalSub");
    if (medSub) medSub.innerText = t.medicineModalSub;
    const medTabRec = document.getElementById("medTabRecipes");
    if (medTabRec) medTabRec.innerText = t.medTabRecipes;
    const medTabSub = document.getElementById("medTabSubsidy");
    if (medTabSub) medTabSub.innerText = t.medTabSubsidy;
    const medAskAi = document.getElementById("medicineAskAiBtnText");
    if (medAskAi) medAskAi.innerText = t.medicineAskAiBtnText;
    const medClose = document.getElementById("medicineCloseBtnText");
    if (medClose) medClose.innerText = t.medicineCloseBtnText;

    // Tools Hub Modal Translation
    const toolsHubTitle = document.getElementById("toolsHubTitle");
    if (toolsHubTitle) toolsHubTitle.innerHTML = `<span>${t.toolsHubTitle}</span>`;
    const toolsHubCalcT = document.getElementById("toolsHubCalcTitle");
    if (toolsHubCalcT) toolsHubCalcT.innerText = t.toolsHubCalcTitle;
    const toolsHubCalcS = document.getElementById("toolsHubCalcSub");
    if (toolsHubCalcS) toolsHubCalcS.innerText = t.toolsHubCalcSub;
    const toolsHubMedT = document.getElementById("toolsHubMedTitle");
    if (toolsHubMedT) toolsHubMedT.innerText = t.toolsHubMedTitle;
    const toolsHubMedS = document.getElementById("toolsHubMedSub");
    if (toolsHubMedS) toolsHubMedS.innerText = t.toolsHubMedSub;
    const toolsHubSubT = document.getElementById("toolsHubSubTitle");
    if (toolsHubSubT) toolsHubSubT.innerText = t.toolsHubSubTitle;
    const toolsHubSubS = document.getElementById("toolsHubSubSub");
    if (toolsHubSubS) toolsHubSubS.innerText = t.toolsHubSubSub;

    // Typing status default
    if (typingStatusText) {
        typingStatusText.innerText = t.typingAnalyzing;
    }
}

// Set Active Language (Gujarati or English)
function setLanguage(lang) {
    currentLanguage = (lang === "English") ? "English" : "Gujarati";
    localStorage.setItem("krushi_lang", currentLanguage);

    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.className = "lang-btn flex-1 py-1.5 rounded-lg font-bold transition text-center text-emerald-300 hover:text-white";
    });

    const activeBtn = document.getElementById(`lang-${currentLanguage}`);
    if (activeBtn) {
        activeBtn.className = "lang-btn flex-1 py-1.5 rounded-lg font-bold transition text-center text-white bg-emerald-600 shadow";
    }

    applyTranslations(currentLanguage);

    // If chat is empty and welcome card is showing, re-render it in new language
    const welcomeCard = document.getElementById("welcomeCard");
    if (welcomeCard && chatHistory.length === 0) {
        chatBox.innerHTML = getWelcomeCardHtml(currentLanguage);
    }

    // Refresh history empty state if empty
    renderSidebarHistoryList();

    // Update speech recognition locale
    if (speechRecognition) {
        speechRecognition.lang = (currentLanguage === "English") ? "en-IN" : "gu-IN";
    }

    updateCalculatorLabels(currentLanguage);
    recalculateProportions();

    // Dynamic UI Re-renders for Modals
    if (latestWeatherData) {
        updateWeatherUIWithData(latestWeatherData);
    }
    renderMandiTable();
    updateMandiLeadersAndComparison(currentLanguage);
    renderCropCalendarSchedule();
    renderMedicineRecipes();
    renderSubsidyGuide();
}

// Quick Topic Handler
function sendQuickTopic(topicKeyOrText) {
    let query = topicKeyOrText;
    if (QUICK_TOPIC_QUERIES[topicKeyOrText]) {
        query = QUICK_TOPIC_QUERIES[topicKeyOrText][currentLanguage] || QUICK_TOPIC_QUERIES[topicKeyOrText]["Gujarati"];
    }
    userInput.value = query;
    if (window.innerWidth < 1024) toggleSidebar();
    document.getElementById("chatForm").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
}

// Image Upload & Vision Handlers
function triggerPhotoUpload() {
    if (imageFileInput) {
        imageFileInput.click();
    }
}

function handleImageSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert(currentLanguage === "English" ? "Please select an image file only (JPG, PNG, WEBP)." : "કૃપા કરીને માત્ર ફોટો (Image) ફાઇલ પસંદ કરો.");
        return;
    }

    if (file.size > 15 * 1024 * 1024) {
        alert(currentLanguage === "English" ? "Photo file is too large (must be under 15MB)." : "ફોટોનું કદ ખૂબ મોટું છે (15MB થી ઓછું હોવું જોઈએ).");
        return;
    }

    selectedImageName = file.name;
    const reader = new FileReader();
    reader.onload = function(evt) {
        const rawDataUri = evt.target.result;
        // Optimize client-side to max 1280px to guarantee rapid upload & respect API limits
        compressAndResizeImage(rawDataUri, 1280, 0.85, (compressedDataUri, approxKb) => {
            selectedImageBase64 = compressedDataUri;
            showImagePreview(compressedDataUri, approxKb);
        });
    };
    reader.readAsDataURL(file);
}

function compressAndResizeImage(dataUri, maxDim, quality, callback) {
    const img = new Image();
    img.onload = function() {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
            if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
            } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
            }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedUri = canvas.toDataURL("image/jpeg", quality);
        const approxKb = Math.round((compressedUri.length * 3 / 4) / 1024);
        callback(compressedUri, approxKb);
    };
    img.src = dataUri;
}

function showImagePreview(uri, sizeKb) {
    if (!imagePreviewContainer) return;
    if (imagePreviewThumb) imagePreviewThumb.src = uri;
    if (imageSizeBadge) imageSizeBadge.innerText = `${sizeKb} KB`;
    imagePreviewContainer.classList.remove("hidden");

    if (currentLanguage === "Gujarati") {
        userInput.placeholder = "આ પાક વિશે કોઈ ચોક્કસ પ્રશ્ન લખો અથવા સીધું Send કરો...";
    } else if (currentLanguage === "Hindi") {
        userInput.placeholder = "इस पौधे के बारे में सवाल लिखें या सीधे Send करें...";
    } else {
        userInput.placeholder = "Ask a question about this plant or click Send...";
    }
}

function clearSelectedImage() {
    selectedImageBase64 = null;
    selectedImageName = "";
    if (imageFileInput) imageFileInput.value = "";
    if (imagePreviewContainer) imagePreviewContainer.classList.add("hidden");
    if (imagePreviewThumb) imagePreviewThumb.src = "";
    setLanguage(currentLanguage);
}

function openLightboxFromPreview() {
    if (selectedImageBase64) {
        openImageModal(selectedImageBase64, selectedImageName || "Attached Crop Photo");
    }
}

function openImageModal(imgSrc, caption = "") {
    if (!imageLightboxModal) return;
    lightboxImage.src = imgSrc;
    if (lightboxCaption) lightboxCaption.innerText = caption || "Crop / Plant Photo";
    imageLightboxModal.classList.remove("hidden");
}

function closeImageModal() {
    if (!imageLightboxModal) return;
    imageLightboxModal.classList.add("hidden");
    lightboxImage.src = "";
}

// Start New Chat
function startNewChat() {
    chatHistory = [];
    localStorage.removeItem("krushi_chat_history");
    clearSelectedImage();
    renderChatHistory();
    renderSidebarHistoryList();
    if (window.innerWidth < 1024) toggleSidebar();
}

// Clear Chat History
function clearHistory() {
    const confirmMsg = (UI_TRANSLATIONS[currentLanguage] || UI_TRANSLATIONS["Gujarati"]).confirmClearChat;
    if (confirm(confirmMsg)) {
        startNewChat();
    }
}

// Render saved messages
function renderChatHistory() {
    chatBox.innerHTML = "";

    if (chatHistory.length === 0) {
        chatBox.innerHTML = getWelcomeCardHtml(currentLanguage);
        return;
    }

    chatHistory.forEach((msg, index) => {
        appendMessageUI(msg.role, msg.content, msg.sources, false, index, msg.image, msg.isDiagnosis);
    });
    scrollToBottom();
}

// Render Sidebar Recent History Items
function renderSidebarHistoryList() {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;

    const userQueries = chatHistory.filter(m => m.role === "user");

    if (userQueries.length === 0) {
        const noText = (UI_TRANSLATIONS[currentLanguage] || UI_TRANSLATIONS["Gujarati"]).noRecentChats;
        historyList.innerHTML = `<p class="text-emerald-300/50 text-xs px-2 py-1 italic">${noText}</p>`;
        return;
    }

    let html = "";
    userQueries.slice(-8).reverse().forEach(q => {
        const hasImg = !!q.image;
        html += `
            <div onclick="sendQuickTopic('${escapeHtml(q.content)}')" class="p-2.5 rounded-xl hover:bg-emerald-900/80 text-emerald-100 hover:text-white cursor-pointer truncate flex items-center gap-2 border border-transparent hover:border-emerald-700 transition">
                <i class="${hasImg ? 'fa-solid fa-camera text-emerald-300' : 'fa-regular fa-comment-dots text-emerald-400'} text-xs shrink-0"></i>
                <span class="truncate text-xs font-medium">${escapeHtml(q.content)}</span>
            </div>
        `;
    });
    historyList.innerHTML = html;
}

// Append message element to UI (Supports attached image & Diagnosis Badge)
function appendMessageUI(role, text, sources = [], animate = true, msgId = Date.now(), image = null, isDiagnosis = false) {
    const isUser = role === "user";

    const wrapper = document.createElement("div");
    wrapper.className = `flex ${isUser ? "justify-end" : "justify-start"} ${animate ? "animate-fade-in" : ""}`;

    const bubble = document.createElement("div");
    bubble.className = `max-w-[90%] sm:max-w-[80%] p-4 sm:p-5 rounded-3xl ${
        isUser 
            ? "bg-[#059669] text-white rounded-tr-none shadow-md border border-emerald-500 font-medium" 
            : "bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-md"
    }`;

    // If User attached an image
    if (image) {
        const imgEl = document.createElement("img");
        imgEl.src = image;
        imgEl.alt = "Attached Plant Photo";
        imgEl.className = "chat-image-attachment mb-3";
        imgEl.title = "Click to enlarge";
        imgEl.onclick = () => openImageModal(image, "Attached Crop Photo");
        bubble.appendChild(imgEl);
    }

    // If AI Diagnosis response
    if (!isUser && isDiagnosis) {
        const diagHeader = document.createElement("div");
        diagHeader.className = "diagnosis-header-card flex items-center justify-between";
        diagHeader.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-xl">🌿</span>
                <div>
                    <h4 class="font-bold text-sm tracking-wide text-white">AI Crop Disease Diagnosis</h4>
                    <p class="text-[11px] text-emerald-200">કૃષિ રોગ નિદાન અને પ્રાકૃતિક ઉપચાર</p>
                </div>
            </div>
            <span class="diagnosis-badge">
                <i class="fa-solid fa-circle-check"></i> Analysis
            </span>
        `;
        bubble.appendChild(diagHeader);
    }

    // Parsed Content
    const contentDiv = document.createElement("div");
    contentDiv.className = isUser ? "text-sm sm:text-base leading-relaxed" : "markdown-body text-sm sm:text-base";
    contentDiv.innerHTML = isUser ? escapeHtml(text) : marked.parse(text);
    bubble.appendChild(contentDiv);

    // Sources rendering
    if (!isUser && sources && sources.length > 0) {
        const sourceBox = document.createElement("div");
        sourceBox.className = "mt-4 pt-3 border-t border-slate-200 text-xs";
        
        let sourceHTML = `<span class="text-[#065f46] font-bold mb-1.5 block flex items-center gap-1.5"><i class="fa-regular fa-file-pdf"></i> સ્ત્રોત (Sources):</span><div class="flex flex-wrap gap-1.5">`;
        
        sources.forEach(src => {
            sourceHTML += `
                <span class="bg-emerald-50 text-[#065f46] border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1">
                    📄 ${escapeHtml(src.document)} (Pg ${src.page})
                </span>
            `;
        });
        sourceHTML += `</div>`;
        sourceBox.innerHTML = sourceHTML;
        bubble.appendChild(sourceBox);
    }

    // Action Toolbar for Assistant Messages (Copy & Text-to-Speech)
    if (!isUser) {
        const toolBar = document.createElement("div");
        toolBar.className = "mt-3 pt-2 border-t border-slate-100 flex items-center justify-end gap-3 text-xs text-slate-500 font-semibold";
        toolBar.innerHTML = `
            <button onclick="copyToClipboard(\`${escapeHtml(text)}\`, this)" title="Copy text" class="p-1 rounded hover:text-emerald-700 hover:bg-slate-100 transition flex items-center gap-1">
                <i class="fa-regular fa-copy"></i>
                <span class="text-[11px]">Copy</span>
            </button>
            <button onclick="speakText(\`${escapeHtml(text)}\`, this)" title="Listen Audio" class="p-1 rounded hover:text-emerald-700 hover:bg-slate-100 transition flex items-center gap-1">
                <i class="fa-solid fa-volume-high"></i>
                <span class="text-[11px]">Listen</span>
            </button>
        `;
        bubble.appendChild(toolBar);
    }

    wrapper.appendChild(bubble);
    chatBox.appendChild(wrapper);
    scrollToBottom();
}

// Submit Message (Supports Text & Photo Vision)
async function handleSend(e) {
    if (e) e.preventDefault();
    const rawMessageText = userInput.value.trim();
    const imageToSend = selectedImageBase64;

    // Must have at least a text query OR an attached image
    if (!rawMessageText && !imageToSend) return;

    // Remove welcome card if present
    const welcomeCard = document.getElementById("welcomeCard");
    if (welcomeCard) welcomeCard.remove();

    // Default question text if only image was provided
    let messageText = rawMessageText;
    if (!messageText && imageToSend) {
        if (currentLanguage === "English") {
            messageText = "What disease or pest is affecting this crop? Please provide natural organic remedies.";
        } else {
            messageText = "આ પાક/છોડના પાંદડામાં કયો રોગ અથવા જીવાત છે? કૃપા કરીને પ્રાકૃતિક ઉપચાર જણાવો.";
        }
    }

    // Render User Message in UI with image thumbnail
    appendMessageUI("user", messageText, [], true, Date.now(), imageToSend);

    // Capture prior history (without bulky base64 images in history to preserve bandwidth)
    const formattedHistory = chatHistory.map(m => ({
        role: m.role,
        content: m.content
    }));

    // Update history
    chatHistory.push({ 
        role: "user", 
        content: messageText,
        image: imageToSend 
    });
    saveHistory();
    renderSidebarHistoryList();

    // Reset inputs immediately
    userInput.value = "";
    clearSelectedImage();
    sendBtn.disabled = true;

    if (imageToSend) {
        showTyping(true, "KrushiMitra AI is diagnosing plant photo & identifying remedies...");
    } else {
        showTyping(true, "KrushiMitra is thinking and generating answer...");
    }

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: messageText,
                image: imageToSend,
                history: formattedHistory,
                language: currentLanguage
            })
        });

        const data = await response.json();

        if (response.ok && data.status === "success" && data.answer) {
            appendMessageUI("assistant", data.answer, data.sources, true, Date.now(), null, data.is_diagnosis);
            chatHistory.push({
                role: "assistant",
                content: data.answer,
                sources: data.sources,
                isDiagnosis: data.is_diagnosis
            });
            saveHistory();
        } else {
            const errText = data.error || "Failed to get response from assistant.";
            appendMessageUI("assistant", `⚠️ ${errText}`);
        }
    } catch (err) {
        appendMessageUI("assistant", "⚠️ **Connection Error:** Could not reach backend server on http://127.0.0.1:5000.");
    } finally {
        showTyping(false);
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// Voice Dictation (Speech-to-Text)
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        if (micBtn) micBtn.style.display = "none";
        return;
    }

    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;

    speechRecognition.onstart = () => {
        isRecognizing = true;
        micBtn.classList.add("bg-red-500", "text-white", "animate-pulse");
        micIcon.className = "fa-solid fa-microphone-slash";
    };

    speechRecognition.onend = () => {
        isRecognizing = false;
        micBtn.classList.remove("bg-red-500", "text-white", "animate-pulse");
        micIcon.className = "fa-solid fa-microphone";
    };

    speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
    };
}

function toggleVoiceInput() {
    if (!speechRecognition) {
        alert("Voice recognition is not supported in this browser. Please type your message.");
        return;
    }

    if (isRecognizing) {
        speechRecognition.stop();
    } else {
        speechRecognition.lang = (currentLanguage === "English") ? "en-IN" : "gu-IN";
        speechRecognition.start();
    }
}

// Text to Speech (Voice Playback)
function speakText(text, btnElement) {
    if (!('speechSynthesis' in window)) {
        alert("Text-to-speech is not supported in your browser.");
        return;
    }

    window.speechSynthesis.cancel(); // Stop ongoing audio

    // Clean markdown symbols for clean audio reading
    const cleanText = text.replace(/[*#_`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.lang = (currentLanguage === "English") ? "en-IN" : "gu-IN";

    utterance.rate = 0.95;

    utterance.onstart = () => {
        if (btnElement) btnElement.classList.add("text-emerald-700", "font-bold");
    };

    utterance.onend = () => {
        if (btnElement) btnElement.classList.remove("text-[#059669]", "font-bold");
    };

    window.speechSynthesis.speak(utterance);
}

// Copy to Clipboard
function copyToClipboard(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        if (btnElement) {
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = `<i class="fa-solid fa-check text-emerald-600"></i> <span class="text-emerald-600">Copied!</span>`;
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
            }, 2000);
        }
    });
}

// Helpers
function saveHistory() {
    localStorage.setItem("krushi_chat_history", JSON.stringify(chatHistory));
}

function showTyping(visible, customText = "") {
    if (visible) {
        if (typingStatusText) {
            typingStatusText.innerText = customText || "KrushiMitra is analyzing and generating answer...";
        }
        typingIndicator.classList.remove("hidden");
    } else {
        typingIndicator.classList.add("hidden");
    }
    scrollToBottom();
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

// ==============================================================
// 🧪 Interactive Jeevamrut & Organic Fertilizer Calculator Engine
// ==============================================================

let currentPrepType = "jeevamrut";
let lastCalculationSummary = "";

function openFertilizerCalculator() {
    const modal = document.getElementById("fertilizerCalculatorModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    if (window.innerWidth < 1024 && !sidebar.classList.contains("-translate-x-full")) {
        toggleSidebar();
    }
    recalculateProportions();
}

function closeFertilizerCalculator() {
    const modal = document.getElementById("fertilizerCalculatorModal");
    if (modal) modal.classList.add("hidden");
}

function selectPrepType(type) {
    currentPrepType = type;
    document.querySelectorAll(".prep-tab-btn").forEach(btn => {
        btn.classList.remove("active-prep-tab");
    });
    const activeBtn = document.getElementById(`prep-${type}`);
    if (activeBtn) activeBtn.classList.add("active-prep-tab");
    recalculateProportions();
}

function adjustLandSize(delta) {
    const input = document.getElementById("calcLandSize");
    if (!input) return;
    let val = parseFloat(input.value) || 1;
    val = Math.max(0.25, Math.min(500, val + delta));
    input.value = val;
    recalculateProportions();
}

function setLandSize(val) {
    const input = document.getElementById("calcLandSize");
    if (!input) return;
    input.value = val;
    recalculateProportions();
}

function recalculateProportions() {
    const landInput = document.getElementById("calcLandSize");
    const unitSelect = document.getElementById("calcUnit");
    const cropSelect = document.getElementById("calcCrop");
    const grid = document.getElementById("ingredientsGrid");
    const pill = document.getElementById("landSummaryPill");
    const stepsList = document.getElementById("methodStepsList");
    const scheduleBox = document.getElementById("cropScheduleContent");

    if (!landInput || !unitSelect || !cropSelect || !grid) return;

    const rawSize = parseFloat(landInput.value) || 1;
    const unit = unitSelect.value;
    const crop = cropSelect.value;

    // Standard conversions: 1 Acre = 2.5 Vigha (Gujarat standard)
    let vigha = 0;
    let acres = 0;
    let unitLabelName = "";

    if (unit === "vigha") {
        vigha = rawSize;
        acres = rawSize * 0.4;
        unitLabelName = currentLanguage === "English" ? "Vigha" : "વીઘા";
    } else if (unit === "acre") {
        acres = rawSize;
        vigha = rawSize * 2.5;
        unitLabelName = currentLanguage === "English" ? "Acre" : "એકર";
    } else if (unit === "guntha") {
        acres = rawSize / 40;
        vigha = rawSize / 16;
        unitLabelName = currentLanguage === "English" ? "Guntha" : "ગુંઠા";
    } else if (unit === "hectare") {
        acres = rawSize * 2.471;
        vigha = rawSize * 6.1775;
        unitLabelName = currentLanguage === "English" ? "Hectare" : "હેક્ટર";
    }

    const fmt = (num, dec = 1) => {
        const rounded = parseFloat(num.toFixed(dec));
        return (rounded % 1 === 0) ? parseInt(rounded) : rounded;
    };

    const cropNames = {
        groundnut: { gu: "મગફળી", en: "Groundnut" },
        cotton: { gu: "કપાસ", en: "Cotton" },
        wheat: { gu: "ઘઉં", en: "Wheat" },
        cumin: { gu: "જીરું/વરિયાળી", en: "Cumin/Fennel" },
        vegetables: { gu: "શાકભાજી/મરચી", en: "Vegetables/Chili" },
        castor: { gu: "દિવેલા", en: "Castor" },
        soybean: { gu: "સોયાબીન", en: "Soybean" },
        pulses: { gu: "કઠોળ/ચણા/તુવેર", en: "Pulses/Gram" },
        orchard: { gu: "બાગાયત/ફળઝાડ", en: "Fruit Orchard" },
        general: { gu: "સામાન્ય પાક", en: "General Crop" }
    };

    const currentCropName = (cropNames[crop] && cropNames[crop][currentLanguage === "English" ? "en" : "gu"]) || crop;

    // Update land summary badge
    if (pill) {
        if (currentLanguage === "English") {
            pill.innerText = `For ${rawSize} ${unitLabelName} ${currentCropName} (${fmt(acres, 2)} Acre)`;
        } else {
            pill.innerText = `${rawSize} ${unitLabelName} ${currentCropName} (${fmt(acres, 2)} એકર) માટે`;
        }
    }

    let ingredients = [];
    let methodSteps = [];
    let prepTitle = "";

    if (currentPrepType === "jeevamrut") {
        prepTitle = currentLanguage === "English" ? "Liquid Jeevamrut" : "પ્રવાહી જીવામૃત";
        
        // Accurate proportions: For 5 Vigha = 25 kg dung, 25 L urine, 5 kg jaggery, 5 kg pulse flour, 500 L water
        const cowDungKg = fmt(5 * vigha);
        const gomutraL = fmt(5 * vigha);
        const jaggeryKg = fmt(1 * vigha);
        const besanKg = fmt(1 * vigha);
        const waterL = fmt(100 * vigha);
        const soilHandfuls = fmt(Math.max(1, 0.5 * vigha));

        ingredients = [
            { icon: "🐄", name: currentLanguage === "English" ? "Desi Cow Dung" : "દેશી ગાયનું છાણ", value: cowDungKg, unit: "kg" },
            { icon: "🪣", name: currentLanguage === "English" ? "Desi Gomutra" : "દેશી ગૌમૂત્ર", value: gomutraL, unit: "Liters" },
            { icon: "🍯", name: currentLanguage === "English" ? "Desi Jaggery" : "દેશી ગોળ", value: jaggeryKg, unit: "kg" },
            { icon: "🥣", name: currentLanguage === "English" ? "Pulse / Besan Flour" : "કઠોળ/ચણાનો લોટ", value: besanKg, unit: "kg" },
            { icon: "💧", name: currentLanguage === "English" ? "Clean Water" : "ચોખ્ખું પાણી", value: waterL, unit: "Liters" },
            { icon: "🌳", name: currentLanguage === "English" ? "Living Soil (Banyan)" : "શેઢા/વડ નીચેની જીવંત માટી", value: soilHandfuls, unit: currentLanguage === "English" ? "handfuls" : "મુઠ્ઠી" }
        ];

        if (currentLanguage === "English") {
            methodSteps = [
                "Take a clean 200–500 L drum and fill with the exact measured water.",
                "Mix Desi cow dung and Gomutra with a wooden pole until uniform.",
                "Separately dissolve Jaggery and Pulse flour with water; add into the drum along with living soil.",
                "Stir clockwise for 2 minutes twice a day (morning and evening).",
                "Cover drum with a moist jute gunny bag under cool shade. Ferment for 48–72 hours."
            ];
        } else {
            methodSteps = [
                "પ્લાસ્ટિકના ડ્રમમાં ઉપર ગણતરી મુજબ ચોખ્ખું પાણી ભરો.",
                "તેમાં દેશી ગાયનું તાજું છાણ અને ગૌમૂત્ર નાખી લાકડાના ડંડાથી બરાબર મિક્સ કરો.",
                "અલગ વાસણમાં ગોળ અને કઠોળના લોટનું પ્રવાહી દ્રાવણ બનાવી ડ્રમમાં ઉમેરો અને જીવંત માટી નાખો.",
                "આ મિશ્રણને ઘડિયાળના કાંટાની દિશામાં (Clockwise) સવાર-સાંજ ૨-૨ મિનિટ હલાવો.",
                "ડ્રમને છાંયડામાં રાખી શણના કોથળાથી ઢાંકીને રાખો. ૪૮ થી ૭૨ કલાકમાં જીવામૃત ઉપયોગ માટે તૈયાર."
            ];
        }

    } else if (currentPrepType === "ghanjeevamrut") {
        prepTitle = currentLanguage === "English" ? "Ghanjeevamrut (Solid Manure)" : (currentLanguage === "Hindi" ? "घनजीवामृत" : "ઘનજીવામૃત (પાયાનું ખાતર)");
        
        const dungKg = fmt(40 * vigha);
        const gomutraL = fmt(4 * vigha);
        const jaggeryKg = fmt(0.8 * vigha);
        const besanKg = fmt(0.8 * vigha);
        const soilHandfuls = fmt(Math.max(1, 1 * vigha));

        ingredients = [
            { icon: "🐄", name: currentLanguage === "English" ? "Dry Desi Cow Dung" : (currentLanguage === "Hindi" ? "सूखा देशी गोबर" : "દેશી ગાયનું સૂકું છાણ"), value: dungKg, unit: "kg" },
            { icon: "🪣", name: currentLanguage === "English" ? "Desi Gomutra" : (currentLanguage === "Hindi" ? "देशी गोमूत्र" : "દેશી ગૌમૂત્ર"), value: gomutraL, unit: "Liters" },
            { icon: "🍯", name: currentLanguage === "English" ? "Desi Jaggery" : (currentLanguage === "Hindi" ? "देशी गुड़" : "દેશી ગોળ"), value: jaggeryKg, unit: "kg" },
            { icon: "🥣", name: currentLanguage === "English" ? "Besan / Pulse Flour" : (currentLanguage === "Hindi" ? "बेसन" : "ચણાનો લોટ"), value: besanKg, unit: "kg" },
            { icon: "🌳", name: currentLanguage === "English" ? "Living Soil" : (currentLanguage === "Hindi" ? "सजीव मिट्टी" : "જીવંત માટી"), value: soilHandfuls, unit: currentLanguage === "English" ? "handfuls" : "મુઠ્ઠી" },
            { icon: "💧", name: currentLanguage === "English" ? "Moisture" : (currentLanguage === "Hindi" ? "नमी" : "ભીનાશ"), value: currentLanguage === "English" ? "Light" : "હળવો", unit: currentLanguage === "English" ? "Sprinkle" : "છંટકાવ" }
        ];

        methodSteps = currentLanguage === "English" ? [
            "Spread powdered dry cow dung on ground in shade.",
            "Mix Gomutra, dissolved Jaggery, Besan, and fertile soil into a liquid slurry.",
            "Sprinkle liquid over cow dung and mix evenly with a shovel.",
            "Make a heap and cover with wet gunny bags for 48 hours to multiply beneficial microbes.",
            "Dry under shade and pack in bags — usable for up to 6 months as basal fertilizer."
        ] : [
            "સૂકા દેશી છાણના ભૂકાને છાંયડાવાળી જગ્યાએ જમીન પર પાથરો.",
            "ગૌમૂત્ર, ઓગાળેલો ગોળ, ચણાનો લોટ અને જીવંત માટીનું પ્રવાહી મિશ્રણ બનાવો.",
            "આ મિશ્રણને છાણ પર છાંટી પાવડા વડે સિમેન્ટના માલની જેમ સારી રીતે મિક્સ કરો.",
            "તેનો ઢગલો કરી ૪૮ કલાક શણના કોથળાથી ઢાંકી રાખો જેથી જીવાણુઓ સક્રિય બને.",
            "ત્યારબાદ છાંયડામાં સૂકવીને કોથળામાં ભરી લો — ૬ મહિના સુધી વાપરી શકાય."
        ];

    } else if (currentPrepType === "beejamrut") {
        prepTitle = currentLanguage === "English" ? "Beejamrut (Seed Care)" : (currentLanguage === "Hindi" ? "बीजामृत" : "બીજામૃત (બીજ સંસ્કાર)");
        
        let seedKg = 0;
        if (crop === "groundnut") seedKg = fmt(25 * vigha);
        else if (crop === "cotton") seedKg = fmt(1.5 * vigha);
        else if (crop === "wheat") seedKg = fmt(20 * vigha);
        else if (crop === "cumin") seedKg = fmt(3.5 * vigha);
        else if (crop === "vegetables") seedKg = fmt(0.25 * vigha);
        else seedKg = fmt(15 * vigha);

        const dungKg = fmt(Math.max(1, seedKg * 0.05));
        const gomutraL = fmt(Math.max(1, seedKg * 0.05));
        const limeGrams = fmt(Math.max(50, seedKg * 0.5));
        const waterL = fmt(Math.max(5, seedKg * 0.2));

        ingredients = [
            { icon: "🌱", name: currentLanguage === "English" ? `Calculated ${currentCropName} Seed` : `${currentCropName} બિયારણ`, value: seedKg, unit: "kg" },
            { icon: "🐄", name: currentLanguage === "English" ? "Desi Cow Dung" : "દેશી ગાયનું છાણ", value: dungKg, unit: "kg" },
            { icon: "🪣", name: currentLanguage === "English" ? "Desi Gomutra" : "દેશી ગૌમૂત્ર", value: gomutraL, unit: "Liters" },
            { icon: "⚪", name: currentLanguage === "English" ? "Slaked Lime (Chuna)" : "ખાવાનો ચૂનો", value: limeGrams, unit: "Grams" },
            { icon: "🌳", name: currentLanguage === "English" ? "Living Soil" : "જીવંત માટી", value: 1, unit: "મુઠ્ઠી" },
            { icon: "💧", name: currentLanguage === "English" ? "Clean Water" : "પાણી", value: waterL, unit: "Liters" }
        ];

        methodSteps = currentLanguage === "English" ? [
            "Tie cow dung in a cloth bag and soak in water for 12 hours.",
            "Dissolve slaked lime in a small container with water.",
            "Squeeze dung bag into water; add Gomutra, lime water, and fertile soil.",
            "Gently coat seeds with Beejamrut solution by hand without damaging seed coat.",
            "Dry under shade for 2 hours before sowing. Protects from fungal wilt and root rot."
        ] : [
            "દેશી ગાયના છાણને કપડાની પોટલીમાં બાંધી ૧૨ કલાક પાણીમાં ડુબાડી રાખો.",
            "અલગ વાસણમાં ચૂનાને પાણીમાં ઓગાળી રાખો.",
            "છાણની પોટલી નીચોવી પાણીમાં ગૌમૂત્ર, ચૂનાનું નીતરેલું પાણી અને જીવંત માટી ઉમેરી હલાવો.",
            "વાવણી પહેલાં બિયારણને બીજામૃતનો હળવો પટ આપી હાથથી હળવેથી ભેળવો જેથી છોતરાં ન ઉખડે.",
            "પટ આપેલા બીજને છાંયડામાં ૨ કલાક સૂકવીને વાવણી કરો. આનાથી ઉગાવો સારો થશે અને મૂળની ફૂગ સામે રક્ષણ મળશે."
        ];

    } else if (currentPrepType === "nimastra") {
        prepTitle = currentLanguage === "English" ? "Nimastra (Natural Bio-Pesticide)" : (currentLanguage === "Hindi" ? "निमास्त्र" : "નિમાસ્ત્ર (કીટ નિયંત્રણ)");
        
        const neemKg = fmt(2 * vigha);
        const gomutraL = fmt(2 * vigha);
        const dungKg = fmt(1 * vigha);
        const waterL = fmt(40 * vigha);

        ingredients = [
            { icon: "🌿", name: currentLanguage === "English" ? "Neem Leaves / Paste" : "લીમડાના પાન/ચટણી", value: neemKg, unit: "kg" },
            { icon: "🪣", name: currentLanguage === "English" ? "Desi Gomutra" : "દેશી ગૌમૂત્ર", value: gomutraL, unit: "Liters" },
            { icon: "🐄", name: currentLanguage === "English" ? "Desi Cow Dung" : "દેશી ગાયનું છાણ", value: dungKg, unit: "kg" },
            { icon: "💧", name: currentLanguage === "English" ? "Water" : "પાણી", value: waterL, unit: "Liters" }
        ];

        methodSteps = currentLanguage === "English" ? [
            "Crush neem leaves or neem fruits into a paste.",
            "Add water, Gomutra, cow dung, and neem paste into a drum.",
            "Stir clockwise and ferment for 48 hours under shade.",
            "Filter through fine cotton cloth and spray directly on crops without further dilution.",
            "Highly effective against aphids, jassids, whiteflies, and small leaf-eating caterpillars."
        ] : [
            "લીમડાના પાન અથવા લીંબોળીને ખાંડીને ચટણી બનાવો.",
            "ડ્રમમાં પાણી, ગૌમૂત્ર, ગાયનું છાણ અને લીમડાની ચટણી ઉમેરી બરાબર હલાવો.",
            "૪૮ કલાક છાંયડામાં રાખી સવાર-સાંજ હલાવો.",
            "પાતળા સુતરાઉ કપડાથી ગાળીને સીધો જ પાક પર છંટકાવ કરો (વધારાનું પાણી ઉમેરવાની જરૂર નથી).",
            "ચુસિયા પ્રકારની જીવાતો (મોલો, મસી, થ્રિપ્સ, સફેદ માખી) અને નાની ઈયળો માટે રામબાણ ઈલાજ."
        ];

    } else if (currentPrepType === "buttermilk") {
        prepTitle = currentLanguage === "English" ? "Sour Buttermilk Spray (Fungicide)" : (currentLanguage === "Hindi" ? "खट्टी छाछ" : "ખાટી છાશનો છંટકાવ (ફૂગનાશક)");
        
        const milkL = fmt(2 * vigha);
        const waterL = fmt(40 * vigha);

        ingredients = [
            { icon: "🥛", name: currentLanguage === "English" ? "Sour Desi Buttermilk" : "૫-૭ દિવસ જૂની ખાટી છાશ", value: milkL, unit: "Liters" },
            { icon: "🥉", name: currentLanguage === "English" ? "Copper Piece / Wire" : "તાંબાનો ટુકડો/તાર", value: 1, unit: "નંગ" },
            { icon: "💧", name: currentLanguage === "English" ? "Clean Water" : "પાણી", value: waterL, unit: "Liters" }
        ];

        methodSteps = currentLanguage === "English" ? [
            "Place a copper piece or copper wire inside sour Desi cow buttermilk and keep covered for 5–7 days.",
            "The reaction generates natural copper sulfate fungicide turning buttermilk slightly greenish.",
            "Dilute with the calculated amount of water in spray tanks.",
            "Spray in morning or late afternoon for Tikka, powdery mildew, rust, and fungal spots."
        ] : [
            "દેશી ગાયના દૂધની ખાટી છાશમાં તાંબાનો વાયર અથવા તાંબાનો ટુકડો મૂકી ૫ થી ૭ દિવસ ઢાંકીને રાખો.",
            "તાંબાના પ્રતિક્રિયાથી છાશ આછા લીલાશ પડતા રંગની થશે (જે કુદરતી કોપર ફંગીસાઈડ બને છે).",
            "આ ખાટી છાશને ઉપર ગણતરી મુજબ પાણી સાથે મિક્સ કરી પંપમાં ભરો.",
            "સવારે અથવા મોડી સાંજે પાંદડા ભીંજાય તે રીતે છંટકાવ કરો.",
            "મગફળીનો ટિક્કા રોગ, છારો (પાવડરી મિલ્ડ્યુ), પાનના કાળા-પીળા ડાઘ અને ફૂગજન્ય રોગો સામે ૧૦૦% રક્ષણ."
        ];
    }

    // Render Ingredients Cards
    let gridHtml = "";
    ingredients.forEach(item => {
        gridHtml += `
            <div class="ingredient-card flex flex-col justify-between">
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-2xl">${item.icon}</span>
                    <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">Exact</span>
                </div>
                <div>
                    <div class="flex items-baseline">
                        <span class="ingredient-value">${item.value}</span>
                        <span class="ingredient-unit">${item.unit}</span>
                    </div>
                    <p class="text-xs font-bold text-slate-700 mt-0.5 leading-snug">${item.name}</p>
                </div>
            </div>
        `;
    });
    grid.innerHTML = gridHtml;

    // Render Steps
    if (stepsList) {
        stepsList.innerHTML = methodSteps.map(step => `<p class="flex items-start gap-2"><span class="text-emerald-600 font-bold shrink-0">✔</span><span>${step}</span></p>`).join("");
    }

    // Crop Schedules Dictionary
    const schedules = {
        groundnut: {
            gu: "🥜 <strong>મગફળી પાક માટે પિયત સમય પત્રક:</strong><br>• <strong>૧ લો ડોઝ:</strong> વાવણીના ૨૦-૨૫ દિવસે પ્રથમ પિયત સાથે જીવામૃત આપો.<br>• <strong>૨ જો ડોઝ:</strong> ફૂલ અને સૂયા બેસતી વખતે (૪૫-૫૦ દિવસે) જીવામૃત પિયતમાં આપો + ખાટી છાશનો સ્પ્રે કરો.<br>• <strong>૩ જો ડોઝ:</strong> ડોડવા ભરાતી વખતે (૬૫-૭૫ દિવસે) ત્રીજો ડોઝ જીવામૃત આપો.",
            hi: "🥜 <strong>मूंगफली के लिए सिंचाई शेड्यूल:</strong><br>• <strong>पहला डोज:</strong> बुवाई के 20-25 दिन बाद पहली सिंचाई के साथ।<br>• <strong>दूसरा डोज:</strong> फूल और सुइयां (Pegging) बनते समय (45-50 दिन) + खट्टी छाछ का छिड़काव।<br>• <strong>तीसरा डोज:</strong> दाना भरते समय (65-75 दिन)।",
            en: "🥜 <strong>Groundnut Application Schedule:</strong><br>• <strong>1st Dose:</strong> 20–25 days after sowing with first irrigation.<br>• <strong>2nd Dose:</strong> Flowering & Pegging stage (45–50 days) with irrigation + Sour Buttermilk spray.<br>• <strong>3rd Dose:</strong> Pod filling stage (65–75 days)."
        },
        cotton: {
            gu: "⚪ <strong>કપાસ પાક માટે પિયત સમય પત્રક:</strong><br>• <strong>૧ લો ડોઝ:</strong> વાવણીના ૩૦ દિવસે જીવામૃત પિયતમાં + નિમાસ્ત્ર છંટકાવ (થ્રિપ્સ અને એફિડ સામે).<br>• <strong>૨ જો ડોઝ:</strong> ચાપવા અને ફૂલ વખતે (૫૫-૬૫ દિવસે) જીવામૃત પિયતમાં + ખાટી છાશ.<br>• <strong>૩ જો ડોઝ:</strong> જીંડવા ભરાતી વખતે (૮૦-૯૦ દિવસે) જીવામૃત + દશપર્ણી અર્ક (ઈયળ નિયંત્રણ).",
            hi: "⚪ <strong>कपास के लिए शेड्यूल:</strong><br>• <strong>पहला डोज:</strong> 30 दिन पर सिंचाई में + निमास्त्र छिड़काव।<br>• <strong>दूसरा डोज:</strong> फूल और बतिया बनते समय (55-65 दिन)।<br>• <strong>तीसरा डोज:</strong> टिंडे (Boll) बनते समय (80-90 दिन)।",
            en: "⚪ <strong>Cotton Application Schedule:</strong><br>• <strong>1st Dose:</strong> 30 days stage via irrigation + Nimastra spray.<br>• <strong>2nd Dose:</strong> Square formation & flowering (55–65 days).<br>• <strong>3rd Dose:</strong> Boll formation (80–90 days) with irrigation."
        },
        wheat: {
            gu: "🌾 <strong>ઘઉં પાક માટે પિયત સમય પત્રક:</strong><br>• <strong>૧ લો ડોઝ:</strong> મુકુટ મૂળ (CRI) વખતે (૨૧ દિવસે) પ્રથમ પિયત સાથે જીવામૃત.<br>• <strong>૨ જો ડોઝ:</strong> ગાભ અવસ્થા અને કંકી નીકળતી વખતે (૪૫-૫૦ દિવસે).<br>• <strong>૩ જો ડોઝ:</strong> દૂધિયા દાણાની અવસ્થા વખતે (૬૫-૭૫ દિવસે).",
            hi: "🌾 <strong>गेहूं के लिए शेड्यूल:</strong><br>• <strong>पहला डोज:</strong> पहली सिंचाई (CRI स्टेज, 21 दिन) पर जीवामृत।<br>• <strong>दूसरा डोज:</strong> कल्ले फूटने व गभोट अवस्था (45-50 दिन) पर।<br>• <strong>तीसरा डोज:</strong> दुधिया अवस्था (65-75 दिन) पर।",
            en: "🌾 <strong>Wheat Application Schedule:</strong><br>• <strong>1st Dose:</strong> Crown root stage (21 days) with first irrigation.<br>• <strong>2nd Dose:</strong> Jointing & booting stage (45–50 days).<br>• <strong>3rd Dose:</strong> Grain filling stage (65–75 days)."
        },
        cumin: {
            gu: "🌿 <strong>જીરું પાક માટે સમય પત્રક:</strong><br>• જીરુંમાં પાણી ઓછું આપવું. દર ૧૫-૨૦ દિવસે હળવા પિયત સાથે જીવામૃત આપવું અને છારો/ચરમી સામે ૧૫ દિવસે ખાટી છાશનો સ્પ્રે કરવો.",
            hi: "🌿 <strong>जीरा के लिए शेड्यूल:</strong><br>• हर 15-20 दिन में हल्की सिंचाई के साथ जीवामृत दें और छाछ का छिड़काव करें।",
            en: "🌿 <strong>Cumin Schedule:</strong><br>• Apply with light irrigation every 15–20 days; spray sour buttermilk for blight prevention."
        },
        vegetables: {
            gu: "🌶️ <strong>શાકભાજી માટે સમય પત્રક:</strong><br>• દર ૧૦ થી ૧૨ દિવસે ડ્રિપ દ્વારા અથવા મૂળ પાસે જીવામૃત આપવું અને ૧૫ દિવસે ૧૦% ગાળેલું જીવામૃત ફોલિયર સ્પ્રે કરવું.",
            hi: "🌶️ <strong>सब्जियों के लिए शेड्यूल:</strong><br>• हर 10-12 दिन में ड्रिप द्वारा या जड़ के पास जीवामृत दें।",
            en: "🌶️ <strong>Vegetables Schedule:</strong><br>• Apply every 10–12 days via drip irrigation or root drenching."
        },
        general: {
            gu: "🌱 <strong>સામાન્ય પાક માટે પિયત સમય પત્રક:</strong><br>• પાકની અવસ્થા મુજબ દર ૨૦ થી ૨૫ દિવસે પિયતના પાણી સાથે ૨૦૦ લીટર પ્રતિ એકર જીવામૃત આપવું અથવા ડ્રિપ દ્વારા ફિલ્ટર કરી આપવું.",
            hi: "🌱 <strong>सामान्य फसल शेड्यूल:</strong><br>• हर 20-25 दिन में सिंचाई के साथ 200 लीटर प्रति एकड़ जीवामृत दें।",
            en: "🌱 <strong>General Application Schedule:</strong><br>• Apply with irrigation every 20–25 days (200 L/acre) or via drip filter."
        }
    };

    const currentSched = (schedules[crop] || schedules.general)[currentLanguage === "English" ? "en" : "gu"];
    if (scheduleBox) scheduleBox.innerHTML = currentSched;

    // Build lastCalculationSummary text
    let summaryText = `🧪 ${prepTitle} (${rawSize} ${unitLabelName} ${currentCropName}):\n`;
    ingredients.forEach(item => {
        summaryText += `• ${item.name}: ${item.value} ${item.unit}\n`;
    });
    lastCalculationSummary = summaryText;
}

function copyCalculatorRecipe() {
    if (!lastCalculationSummary) return;
    navigator.clipboard.writeText(lastCalculationSummary).then(() => {
        const btnText = document.getElementById("calcCopyBtnText");
        if (btnText) {
            const original = btnText.innerText;
            btnText.innerText = currentLanguage === "English" ? "Copied! ✓" : "કોપી થઈ ગયું! ✓";
            setTimeout(() => { btnText.innerText = original; }, 2000);
        }
    });
}

function askAiAboutCalculation() {
    closeFertilizerCalculator();
    if (!lastCalculationSummary) return;

    let queryText = "";
    if (currentLanguage === "English") {
        queryText = `I calculated the following natural proportions:\n${lastCalculationSummary}\nPlease explain the best application method, irrigation timing, and precautions for my crop.`;
    } else {
        queryText = `મેં પ્રાકૃતિક ખાતર કેલ્ક્યુલેટરમાં આ માપ ગણ્યું છે:\n${lastCalculationSummary}\nમને આ ખેતરમાં આપવાની સાચી પદ્ધતિ, પિયતનો સમય અને સાવચેતી વિગતવાર સમજાવો.`;
    }

    userInput.value = queryText;
    document.getElementById("chatForm").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
}

function updateCalculatorLabels(lang) {
    const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS["Gujarati"];
    const isEn = (lang === "English");

    const modalTitle = document.getElementById("calcModalTitle");
    const modalSubtitle = document.getElementById("calcModalSubtitle");
    const prepLabel = document.getElementById("prepTypeLabel");
    const landLabel = document.getElementById("landSizeLabel");
    const quickPresetLabel = document.getElementById("quickPresetLabel");
    const unitLabel = document.getElementById("unitLabel");
    const cropLabel = document.getElementById("cropLabel");
    const unitHelper = document.getElementById("unitHelperText");
    const cropHelper = document.getElementById("cropHelperText");
    const resTitle = document.getElementById("resultHeaderTitle");
    const methodTitle = document.getElementById("methodGuideTitle");
    const scheduleTitle = document.getElementById("cropScheduleTitle");
    const footerTip = document.getElementById("footerTip");
    const copyBtnText = document.getElementById("calcCopyBtnText");
    const askAiBtnText = document.getElementById("calcAskAiBtnText");
    const headerCalcText = document.getElementById("headerCalcBtnText");
    const headerCalcMobile = document.getElementById("headerCalcBtnTextMobile");
    const sidebarCalcText = document.getElementById("sidebarCalcBtnText");

    if (modalTitle) modalTitle.innerText = t.calcModalTitle;
    if (modalSubtitle) modalSubtitle.innerText = t.calcModalSubtitle;
    if (prepLabel) prepLabel.innerText = t.prepTypeLabel;
    if (landLabel) landLabel.innerText = t.landSizeLabel;
    if (quickPresetLabel) quickPresetLabel.innerText = t.quickPresetLabel;
    if (unitLabel) unitLabel.innerText = t.unitLabel;
    if (cropLabel) cropLabel.innerText = t.cropLabel;
    if (unitHelper) unitHelper.innerText = t.unitHelperText;
    if (cropHelper) cropHelper.innerText = t.cropHelperText;
    if (resTitle) resTitle.innerHTML = `<span>${t.resultHeaderTitle}</span>`;
    if (methodTitle) methodTitle.innerText = t.methodGuideTitle;
    if (scheduleTitle) scheduleTitle.innerText = t.cropScheduleTitle;
    if (footerTip) footerTip.innerText = t.footerTip;
    if (copyBtnText) copyBtnText.innerText = t.calcCopyBtnText;
    if (askAiBtnText) askAiBtnText.innerText = t.calcAskAiBtnText;
    if (headerCalcText) headerCalcText.innerText = t.headerCalc;
    if (headerCalcMobile) headerCalcMobile.innerText = t.headerCalcMobile;
    if (sidebarCalcText) sidebarCalcText.innerText = t.sidebarCalc;

    // Translate preparation tabs
    const tabData = {
        jeevamrut: isEn ? { text: "Jeevamrut", sub: "(Liquid)" } : { text: "જીવામૃત", sub: "(પ્રવાહી)" },
        ghanjeevamrut: isEn ? { text: "Ghanjeevamrut", sub: "(Solid Manure)" } : { text: "ઘનજીવામૃત", sub: "(ઘન ખાતર)" },
        beejamrut: isEn ? { text: "Beejamrut", sub: "(Seed Care)" } : { text: "બીજામૃત", sub: "(બીજ સંસ્કાર)" },
        nimastra: isEn ? { text: "Nimastra", sub: "(Pest Spray)" } : { text: "નિમાસ્ત્ર", sub: "(કીટ સ્પ્રે)" },
        buttermilk: isEn ? { text: "Sour Buttermilk", sub: "(Fungus Spray)" } : { text: "ખાટી છાશ", sub: "(ફૂગ સ્પ્રે)" }
    };

    Object.keys(tabData).forEach(key => {
        const textEl = document.getElementById(`tabText-${key}`);
        const subEl = document.getElementById(`tabSub-${key}`);
        if (textEl) textEl.innerText = tabData[key].text;
        if (subEl) subEl.innerText = tabData[key].sub;
    });

    // Translate Unit Options
    const unitSelect = document.getElementById("calcUnit");
    if (unitSelect) {
        const unitLabels = isEn ? {
            vigha: "Vigha (0.4 Acre)",
            acre: "Acre (2.5 Vigha)",
            guntha: "Guntha",
            hectare: "Hectare (6.25 Vigha)"
        } : {
            vigha: "વીઘા (Vigha - 0.4 Acre)",
            acre: "એકર (Acre - 2.5 Vigha)",
            guntha: "ગુંઠા (Guntha)",
            hectare: "હેક્ટર (Hectare - 6.25 Vigha)"
        };
        for (let opt of unitSelect.options) {
            if (unitLabels[opt.value]) opt.text = unitLabels[opt.value];
        }
    }

    // Translate Crop Options
    const cropSelect = document.getElementById("calcCrop");
    if (cropSelect) {
        const cropLabels = isEn ? {
            groundnut: "🥜 Groundnut (Peanut)",
            cotton: "⚪ Cotton",
            wheat: "🌾 Wheat",
            cumin: "🌿 Cumin / Fennel",
            vegetables: "🌶️ Vegetables / Chilli",
            castor: "🌰 Castor",
            soybean: "🟡 Soybean",
            pulses: "🫘 Pulses / Gram",
            orchard: "🥭 Fruit Orchard",
            general: "🌱 General / Other Crops"
        } : {
            groundnut: "🥜 મગફળી (Groundnut)",
            cotton: "⚪ કપાસ (Cotton)",
            wheat: "🌾 ઘઉં (Wheat)",
            cumin: "🌿 જીરું / વરિયાળી (Cumin)",
            vegetables: "🌶️ શાકભાજી / મરચી (Vegetables)",
            castor: "🌰 દિવેલા (Castor)",
            soybean: "🟡 સોયાબીન (Soybean)",
            pulses: "🫘 કઠોળ / ચણા / તુવેર (Pulses)",
            orchard: "🥭 બાગાયત / ફળઝાડ (Fruit Trees)",
            general: "🌱 સામાન્ય / અન્ય પાક (General)"
        };
        for (let opt of cropSelect.options) {
            if (cropLabels[opt.value]) opt.text = cropLabels[opt.value];
        }
    }
}

/* ==========================================================================
   PHASE 1: DESKTOP & MOBILE NAVIGATION, TABS & FEATURE MODAL ENGINES
   ========================================================================== */

let currentMobileTab = "chat";

function switchMobileTab(tabName) {
    currentMobileTab = tabName;
    
    // Update all tab buttons UI
    const tabs = ["chat", "mandi", "weather", "calendar", "tools"];
    tabs.forEach(t => {
        const btn = document.getElementById(`mobile-tab-${t}`);
        if (btn) {
            const indicator = btn.querySelector(".active-indicator");
            if (t === tabName) {
                btn.classList.add("active");
                if (indicator) indicator.classList.remove("hidden");
            } else {
                btn.classList.remove("active");
                if (indicator) indicator.classList.add("hidden");
            }
        }
    });

    // Close open modals without resetting tab
    closeAllToolModals(false);

    if (tabName === "chat") {
        scrollToBottom();
    } else if (tabName === "mandi") {
        openMandiModal();
    } else if (tabName === "weather") {
        openWeatherModal();
    } else if (tabName === "calendar") {
        openCropCalendarModal();
    } else if (tabName === "tools") {
        openToolsHubModal();
    }
}

function closeAllToolModals(resetTab = true) {
    const modals = [
        "weatherAdvisoryModal",
        "mandiRatesModal",
        "cropCalendarModal",
        "medicineLibraryModal",
        "toolsHubModal",
        "fertilizerCalculatorModal"
    ];
    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });

    if (resetTab) {
        const tabs = ["chat", "mandi", "weather", "calendar", "tools"];
        tabs.forEach(t => {
            const btn = document.getElementById(`mobile-tab-${t}`);
            if (btn) {
                const ind = btn.querySelector(".active-indicator");
                if (t === "chat") {
                    btn.classList.add("active");
                    if (ind) ind.classList.remove("hidden");
                } else {
                    btn.classList.remove("active");
                    if (ind) ind.classList.add("hidden");
                }
            }
        });
        currentMobileTab = "chat";
    }
}

function openWeatherModal() {
    closeAllToolModals(false);
    const m = document.getElementById("weatherAdvisoryModal");
    if (m) m.classList.remove("hidden");
    fetchLiveWeatherData(document.getElementById("weatherDistrictSelect")?.value || "Rajkot");
}
function closeWeatherModal() {
    const m = document.getElementById("weatherAdvisoryModal");
    if (m) m.classList.add("hidden");
    closeAllToolModals(true);
}

function openMandiModal() {
    closeAllToolModals(false);
    const m = document.getElementById("mandiRatesModal");
    if (m) m.classList.remove("hidden");
    fetchLiveMandiRatesData();
}
function closeMandiModal() {
    const m = document.getElementById("mandiRatesModal");
    if (m) m.classList.add("hidden");
    closeAllToolModals(true);
}

function openCropCalendarModal() {
    closeAllToolModals(false);
    const m = document.getElementById("cropCalendarModal");
    if (m) m.classList.remove("hidden");
    const dateInput = document.getElementById("calendarSowingDate");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }
    renderCropCalendarSchedule();
}
function closeCropCalendarModal() {
    const m = document.getElementById("cropCalendarModal");
    if (m) m.classList.add("hidden");
    closeAllToolModals(true);
}

function openMedicineLibraryModal() {
    closeAllToolModals(false);
    const m = document.getElementById("medicineLibraryModal");
    if (m) m.classList.remove("hidden");
    renderMedicineRecipes();
    renderSubsidyGuide();
}
function closeMedicineLibraryModal() {
    const m = document.getElementById("medicineLibraryModal");
    if (m) m.classList.add("hidden");
    closeAllToolModals(true);
}

function openToolsHubModal() {
    closeAllToolModals(false);
    const m = document.getElementById("toolsHubModal");
    if (m) m.classList.remove("hidden");
}
function closeToolsHubModal() {
    const m = document.getElementById("toolsHubModal");
    if (m) m.classList.add("hidden");
    closeAllToolModals(true);
}

/* --- Live Weather Engine --- */
const GUJARAT_DISTRICTS = {
    Rajkot: { lat: 22.30, lon: 70.80, nameGuj: "રાજકોટ" },
    Gondal: { lat: 21.96, lon: 70.79, nameGuj: "ગોંડલ" },
    Junagadh: { lat: 21.52, lon: 70.45, nameGuj: "જૂનાગઢ" },
    Amreli: { lat: 21.60, lon: 71.22, nameGuj: "અમરેલી" },
    Botad: { lat: 22.17, lon: 71.66, nameGuj: "બોટાદ" },
    Jamnagar: { lat: 22.47, lon: 70.06, nameGuj: "જામનગર" },
    Bhavnagar: { lat: 21.76, lon: 72.15, nameGuj: "ભાવનગર" },
    Surendranagar: { lat: 22.72, lon: 71.63, nameGuj: "સુરેન્દ્રનગર" },
    Mehsana: { lat: 23.60, lon: 72.39, nameGuj: "મહેસાણા" },
    Surat: { lat: 21.17, lon: 72.83, nameGuj: "સુરત" }
};

let latestWeatherData = null;

function updateWeatherUIWithData(data) {
    if (!data) return;
    const isEn = (currentLanguage === "English");
    const temp = data.temperature;
    const humidity = data.humidity;
    const rainProb = data.rain_prob;
    const wind = data.wind_speed;
    const districtKey = data.district || "Rajkot";
    const distGuj = data.district_guj || districtKey;
    const displayName = isEn ? districtKey : distGuj;

    // Update Metric Cards
    const tempEl = document.getElementById("weatherTemp");
    const humEl = document.getElementById("weatherHumidity");
    const rainEl = document.getElementById("weatherRain");
    const windEl = document.getElementById("weatherWind");

    if (tempEl) tempEl.innerText = `${temp}°C`;
    if (humEl) humEl.innerText = `${humidity}%`;
    if (rainEl) rainEl.innerText = `${rainProb}%`;
    if (windEl) windEl.innerText = `${wind} km/h`;

    // Update Metric Cards Sub-labels
    const maxTempSub = document.getElementById("weatherMaxTempSub");
    const humSub = document.getElementById("weatherHumSub");
    const rainSub = document.getElementById("weatherRainSub");
    const windSub = document.getElementById("weatherWindSub");

    if (maxTempSub) maxTempSub.innerText = isEn ? `Max ${data.temp_max || temp + 4}°C` : `મહત્તમ ${data.temp_max || temp + 4}°C`;
    if (humSub) {
        if (humidity > 75) humSub.innerText = isEn ? "High Humidity" : "વધુ ભેજ";
        else if (humidity < 40) humSub.innerText = isEn ? "Low Humidity" : "ઓછો ભેજ";
        else humSub.innerText = isEn ? "Normal Humidity" : "સામાન્ય ભેજ";
    }
    if (rainSub) {
        if (rainProb > 40) rainSub.innerText = isEn ? "High Chance" : "વરસાદ સંભાવના";
        else rainSub.innerText = isEn ? "Low Chance" : "ઓછી શક્યતા";
    }
    if (windSub) {
        if (wind > 20) windSub.innerText = isEn ? "Strong Wind" : "તેજ પવન";
        else windSub.innerText = isEn ? "Calm Breeze" : "શાંત પવન";
    }

    // Update Top Header Live Ticker Pill
    const headerTemp = document.getElementById("headerWeatherTemp");
    const headerHum = document.getElementById("headerWeatherHum");
    const headerBadge = document.getElementById("headerSprayBadge");

    if (headerTemp) headerTemp.innerText = `${displayName}: ${temp}°C`;
    if (headerHum) headerHum.innerText = isEn ? `• Hum ${humidity}%` : `• ભેજ ${humidity}%`;
    if (headerBadge) {
        if (data.spray_status === "danger") {
            headerBadge.className = "text-[10px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded shadow-xs";
            headerBadge.innerText = isEn ? "Avoid Spray ❌" : "સ્પ્રે ટાળો ❌";
        } else if (data.spray_status === "warning") {
            headerBadge.className = "text-[10px] bg-amber-600 text-white font-extrabold px-1.5 py-0.5 rounded shadow-xs";
            headerBadge.innerText = isEn ? "High Humidity ⚠️" : "ભેજ વધુ ⚠️";
        } else {
            headerBadge.className = "text-[10px] bg-emerald-700 text-white font-extrabold px-1.5 py-0.5 rounded shadow-xs";
            headerBadge.innerText = isEn ? "Spray OK ✓" : "સ્પ્રે યોગ્ય ✓";
        }
    }

    // Update Spray Suitability Alert Banner in Modal
    const sprayAlert = document.getElementById("weatherSprayAlert");
    const sprayTitle = document.getElementById("sprayStatusTitle");
    const sprayDesc = document.getElementById("sprayStatusDesc");

    if (sprayAlert && sprayTitle && sprayDesc) {
        sprayTitle.innerText = isEn ? (data.spray_title_en || data.spray_title) : data.spray_title;
        const timingLabel = isEn ? "⏰ Optimal Timing:" : "⏰ શ્રેષ્ઠ સમય:";
        const timingVal = isEn ? (data.spray_timing_en || data.spray_timing) : data.spray_timing;
        const descVal = isEn ? (data.spray_desc_en || data.spray_desc) : data.spray_desc;
        sprayDesc.innerHTML = `${descVal} <br><strong class="text-emerald-950 mt-1 inline-block">${timingLabel}</strong> ${timingVal}`;
        
        const alertIcon = sprayAlert.querySelector("span");
        if (data.spray_status === "danger") {
            sprayAlert.className = "p-4 rounded-2xl bg-red-50 border border-red-300 flex items-start gap-3 shadow-xs";
            if (alertIcon) alertIcon.innerText = "❌";
        } else if (data.spray_status === "warning") {
            sprayAlert.className = "p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 shadow-xs";
            if (alertIcon) alertIcon.innerText = "🌾";
        } else {
            sprayAlert.className = "p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-start gap-3 shadow-xs";
            if (alertIcon) alertIcon.innerText = "✅";
        }
    }

    // Render 3-Day Forecast Cards
    const forecastContainer = document.getElementById("weather3DayForecast");
    if (forecastContainer && data.forecast_days) {
        let fHtml = "";
        data.forecast_days.forEach(d => {
            const isSafe = d.spray_status.includes("અનુકૂળ") || (d.spray_status_en && d.spray_status_en.includes("Safe"));
            const isWarn = d.spray_status.includes("ભેજ") || (d.spray_status_en && d.spray_status_en.includes("Humid"));
            const bgClass = isSafe ? "bg-emerald-50 border-emerald-200" : (isWarn ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200");
            const badgeClass = isSafe ? "bg-emerald-600 text-white" : (isWarn ? "bg-amber-600 text-white" : "bg-red-600 text-white");

            const dayLabel = isEn ? (d.day_label_en || d.day_label) : d.day_label.split(" ")[0];
            const sprayStatusText = isEn ? (d.spray_status_en || d.spray_status) : d.spray_status;
            const rainText = isEn ? `Rain: ${d.rain_prob}%` : `વરસાદ: ${d.rain_prob}%`;

            fHtml += `
                <div class="p-2 rounded-xl border ${bgClass} shadow-2xs space-y-1">
                    <p class="font-extrabold text-[11px] text-slate-800">${dayLabel}</p>
                    <p class="text-sm font-extrabold text-emerald-950">${d.temp_max}°C</p>
                    <p class="text-[10px] text-slate-500">${rainText}</p>
                    <span class="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeClass}">${sprayStatusText}</span>
                </div>
            `;
        });
        forecastContainer.innerHTML = fHtml;
    }
}

async function fetchLiveWeatherData(districtKey = "Rajkot") {
    try {
        const res = await fetch(`${API_BASE}/api/weather?district=${encodeURIComponent(districtKey)}`);
        if (res.ok) {
            const data = await res.json();
            latestWeatherData = data;
            updateWeatherUIWithData(data);
        }
    } catch (err) {
        console.log("Weather API Fetch Error:", err);
    }
}

/* --- APMC Mandi Data Engine --- */
let liveMandiData = null;
let currentMandiCropFilter = "all";
let currentMandiYardFilter = "all";
let currentMandiSearch = "";

const CROP_TRANSLATIONS = {
    "કપાસ": { gu: "કપાસ (Cotton - શંકર)", en: "Cotton (Shankar Hybrid)" },
    "મગફળી": { gu: "મગફળી (Groundnut - જાડી)", en: "Groundnut (Bold / JG-37)" },
    "જીરું": { gu: "જીરું (Cumin - બેસ્ટ)", en: "Cumin (Best Quality)" },
    "ઘઉં": { gu: "ઘઉં (Wheat - ટુકડા)", en: "Wheat (Tukda / Lokwan)" },
    "ચણા": { gu: "ચણા (Gram/Chana)", en: "Chickpea (Desi Chana)" },
    "તલ": { gu: "તલ (Sesame - સફેદ)", en: "Sesame (White)" },
    "ધાણા": { gu: "ધાણા (Coriander)", en: "Coriander Seeds" },
    "રાયડો": { gu: "રાયડો (Mustard)", en: "Mustard Seeds" }
};

const YARD_TRANSLATIONS = {
    gondal: { gu: "ગોંડલ (Gondal)", en: "Gondal Mandi" },
    rajkot: { gu: "રાજકોટ (Rajkot)", en: "Rajkot Mandi" },
    unjha: { gu: "ઊંઝા (Unjha)", en: "Unjha Mandi" },
    botad: { gu: "બોટાદ (Botad)", en: "Botad Mandi" },
    amreli: { gu: "અમરેલી (Amreli)", en: "Amreli Mandi" },
    junagadh: { gu: "જૂનાગઢ (Junagadh)", en: "Junagadh Mandi" }
};

function formatMandiArrivals(arrivalsStr, isEn) {
    if (!arrivalsStr) return "";
    if (!isEn) return arrivalsStr;
    return arrivalsStr
        .replace(/મણ/g, "Man")
        .replace(/બોરી/g, "Bags")
        .replace(/ગુણી/g, "Bags");
}

function updateMandiLeadersAndComparison(lang) {
    const isEn = (lang === "English");

    // Update Top Highlights Grid: 4 Leader Cards
    const leadersGrid = document.getElementById("mandiLeadersGrid");
    if (leadersGrid) {
        if (isEn) {
            leadersGrid.innerHTML = `
                <div class="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-400 transition">
                    <div class="flex items-center justify-between text-xs text-slate-500 font-bold">
                        <span>⚪ Cotton Leader</span>
                        <span class="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded">Gondal</span>
                    </div>
                    <p class="text-base sm:text-lg font-black text-emerald-900 mt-1">₹1,725 <span class="text-xs font-normal text-slate-400">/Man</span></p>
                    <p class="text-[10px] text-emerald-700 font-bold mt-0.5">📈 Bullish (+₹25)</p>
                </div>

                <div class="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-400 transition">
                    <div class="flex items-center justify-between text-xs text-slate-500 font-bold">
                        <span>🥜 Groundnut Leader</span>
                        <span class="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded">Rajkot</span>
                    </div>
                    <p class="text-base sm:text-lg font-black text-emerald-900 mt-1">₹1,510 <span class="text-xs font-normal text-slate-400">/Man</span></p>
                    <p class="text-[10px] text-emerald-700 font-bold mt-0.5">📈 Bullish (+₹30)</p>
                </div>

                <div class="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-400 transition">
                    <div class="flex items-center justify-between text-xs text-slate-500 font-bold">
                        <span>🌿 Cumin Leader</span>
                        <span class="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded">Unjha</span>
                    </div>
                    <p class="text-base sm:text-lg font-black text-emerald-900 mt-1">₹5,520 <span class="text-xs font-normal text-slate-400">/Man</span></p>
                    <p class="text-[10px] text-emerald-700 font-bold mt-0.5">📈 Bullish (+₹75)</p>
                </div>

                <div class="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-400 transition">
                    <div class="flex items-center justify-between text-xs text-slate-500 font-bold">
                        <span>🌾 Wheat (Tukda)</span>
                        <span class="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded">Rajkot</span>
                    </div>
                    <p class="text-base sm:text-lg font-black text-emerald-900 mt-1">₹585 <span class="text-xs font-normal text-slate-400">/Man</span></p>
                    <p class="text-[10px] text-emerald-700 font-bold mt-0.5">📈 Bullish (+₹10)</p>
                </div>
            `;
        } else {
            leadersGrid.innerHTML = `
                <div class="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-400 transition">
                    <div class="flex items-center justify-between text-xs text-slate-500 font-bold">
                        <span>⚪ કપાસ લીડર</span>
                        <span class="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded">ગોંડલ</span>
                    </div>
                    <p class="text-base sm:text-lg font-black text-emerald-900 mt-1">₹1,725 <span class="text-xs font-normal text-slate-400">/મણ</span></p>
                    <p class="text-[10px] text-emerald-700 font-bold mt-0.5">📈 તેજી (+₹25)</p>
                </div>

                <div class="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-400 transition">
                    <div class="flex items-center justify-between text-xs text-slate-500 font-bold">
                        <span>🥜 મગફળી લીડર</span>
                        <span class="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded">રાજકોટ</span>
                    </div>
                    <p class="text-base sm:text-lg font-black text-emerald-900 mt-1">₹1,510 <span class="text-xs font-normal text-slate-400">/મણ</span></p>
                    <p class="text-[10px] text-emerald-700 font-bold mt-0.5">📈 તેજી (+₹30)</p>
                </div>

                <div class="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-400 transition">
                    <div class="flex items-center justify-between text-xs text-slate-500 font-bold">
                        <span>🌿 જીરું લીડર</span>
                        <span class="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded">ઊંઝા</span>
                    </div>
                    <p class="text-base sm:text-lg font-black text-emerald-900 mt-1">₹5,520 <span class="text-xs font-normal text-slate-400">/મણ</span></p>
                    <p class="text-[10px] text-emerald-700 font-bold mt-0.5">📈 તેજી (+₹75)</p>
                </div>

                <div class="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-400 transition">
                    <div class="flex items-center justify-between text-xs text-slate-500 font-bold">
                        <span>🌾 ઘઉં (ટુકડા)</span>
                        <span class="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded">રાજકોટ</span>
                    </div>
                    <p class="text-base sm:text-lg font-black text-emerald-900 mt-1">₹585 <span class="text-xs font-normal text-slate-400">/મણ</span></p>
                    <p class="text-[10px] text-emerald-700 font-bold mt-0.5">📈 તેજી (+₹10)</p>
                </div>
            `;
        }
    }

    if (!liveMandiData) return;

    // Update Date Badge
    const dateBadge = document.getElementById("mandiDateBadge");
    if (dateBadge) {
        if (isEn) {
            dateBadge.innerText = liveMandiData.last_updated_at ? `${liveMandiData.last_updated_at} Live` : `${liveMandiData.date || "Today"} Live (6:00 PM Sync)`;
        } else {
            dateBadge.innerText = liveMandiData.last_updated_at ? `${liveMandiData.last_updated_at} લાઈવ` : `${liveMandiData.date} લાઈવ (સાંજે ૬:૦૦)`;
        }
    }

    // Update Gondal vs Rajkot Strip
    const compContainer = document.getElementById("gondalVsRajkotContainer");
    if (compContainer && liveMandiData.gondal_vs_rajkot) {
        let compHtml = "";
        liveMandiData.gondal_vs_rajkot.forEach(c => {
            const cropName = isEn ? (c.crop_en || c.crop.split(" ")[0]) : c.crop.split(" ")[0];
            const compTitle = isEn 
                ? `Gondal ₹${c.gondal_max} vs Rajkot ₹${c.rajkot_max}`
                : `ગોંડલ ₹${c.gondal_max} vs રાજકોટ ₹${c.rajkot_max}`;
            const diffText = isEn ? (c.diff_text_en || c.diff_text) : c.diff_text;
            compHtml += `
                <div class="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <div class="flex justify-between items-center font-bold text-slate-800">
                        <span>${cropName}:</span>
                        <span class="text-emerald-700 font-extrabold">${compTitle}</span>
                    </div>
                    <p class="text-[11px] text-emerald-800 font-bold mt-0.5">👉 ${diffText} 🏆</p>
                </div>
            `;
        });
        compContainer.innerHTML = compHtml;
    }
}

// Fallback rates if backend fetch fails
const FALLBACK_MANDI_RATES = [
    { id: "m1", crop: "કપાસ (Cotton - શંકર)", crop_key: "કપાસ", yard: "ગોંડલ (Gondal)", yard_key: "gondal", min_price: 1550, max_price: 1725, modal_price: 1640, arrivals: "34,500 મણ", trend: "up", trend_diff: "+25", is_highest: true },
    { id: "m2", crop: "કપાસ (Cotton - શંકર)", crop_key: "કપાસ", yard: "રાજકોટ (Rajkot)", yard_key: "rajkot", min_price: 1520, max_price: 1705, modal_price: 1610, arrivals: "28,200 મણ", trend: "up", trend_diff: "+15", is_highest: false },
    { id: "m3", crop: "કપાસ (Cotton)", crop_key: "કપાસ", yard: "બોટાદ (Botad)", yard_key: "botad", min_price: 1510, max_price: 1690, modal_price: 1600, arrivals: "19,400 મણ", trend: "neutral", trend_diff: "0", is_highest: false },
    { id: "m4", crop: "કપાસ (Cotton)", crop_key: "કપાસ", yard: "અમરેલી (Amreli)", yard_key: "amreli", min_price: 1490, max_price: 1660, modal_price: 1575, arrivals: "16,000 મણ", trend: "neutral", trend_diff: "0", is_highest: false },
    { id: "m5", crop: "મગફળી (Groundnut - જાડી ૬૬/૩૭)", crop_key: "મગફળી", yard: "રાજકોટ (Rajkot)", yard_key: "rajkot", min_price: 1280, max_price: 1510, modal_price: 1410, arrivals: "31,000 બોરી", trend: "up", trend_diff: "+30", is_highest: true },
    { id: "m6", crop: "મગફળી (Groundnut - જાડી/જીણી)", crop_key: "મગફળી", yard: "ગોંડલ (Gondal)", yard_key: "gondal", min_price: 1260, max_price: 1485, modal_price: 1380, arrivals: "38,500 બોરી", trend: "up", trend_diff: "+20", is_highest: false },
    { id: "m7", crop: "મગફળી (Groundnut)", crop_key: "મગફળી", yard: "જૂનાગઢ (Junagadh)", yard_key: "junagadh", min_price: 1250, max_price: 1475, modal_price: 1365, arrivals: "14,200 બોરી", trend: "neutral", trend_diff: "0", is_highest: false },
    { id: "m8", crop: "મગફળી (Groundnut)", crop_key: "મગફળી", yard: "અમરેલી (Amreli)", yard_key: "amreli", min_price: 1220, max_price: 1440, modal_price: 1330, arrivals: "12,800 બોરી", trend: "neutral", trend_diff: "0", is_highest: false },
    { id: "m9", crop: "જીરું (Cumin - બેસ્ટ ક્વોલિટી)", crop_key: "જીરું", yard: "ઊંઝા (Unjha)", yard_key: "unjha", min_price: 4850, max_price: 5520, modal_price: 5185, arrivals: "18,500 બોરી", trend: "up", trend_diff: "+75", is_highest: true },
    { id: "m10", crop: "જીરું (Cumin)", crop_key: "જીરું", yard: "ગોંડલ (Gondal)", yard_key: "gondal", min_price: 4700, max_price: 5350, modal_price: 5025, arrivals: "8,200 બોરી", trend: "up", trend_diff: "+50", is_highest: false },
    { id: "m11", crop: "જીરું (Cumin)", crop_key: "જીરું", yard: "રાજકોટ (Rajkot)", yard_key: "rajkot", min_price: 4650, max_price: 5280, modal_price: 4965, arrivals: "4,100 બોરી", trend: "neutral", trend_diff: "0", is_highest: false },
    { id: "m12", crop: "ઘઉં (Wheat - ટુકડા)", crop_key: "ઘઉં", yard: "રાજકોટ (Rajkot)", yard_key: "rajkot", min_price: 500, max_price: 585, modal_price: 540, arrivals: "7,500 ગુણી", trend: "up", trend_diff: "+10", is_highest: true },
    { id: "m13", crop: "ઘઉં (Wheat - લોકવન)", crop_key: "ઘઉં", yard: "ગોંડલ (Gondal)", yard_key: "gondal", min_price: 470, max_price: 555, modal_price: 515, arrivals: "9,800 ગુણી", trend: "neutral", trend_diff: "0", is_highest: false },
    { id: "m14", crop: "ચણા (Gram/Chana)", crop_key: "ચણા", yard: "રાજકોટ (Rajkot)", yard_key: "rajkot", min_price: 1140, max_price: 1290, modal_price: 1215, arrivals: "5,400 ગુણી", trend: "up", trend_diff: "+15", is_highest: true },
    { id: "m15", crop: "ચણા (Gram/Chana)", crop_key: "ચણા", yard: "ગોંડલ (Gondal)", yard_key: "gondal", min_price: 1120, max_price: 1280, modal_price: 1200, arrivals: "6,100 ગુણી", trend: "neutral", trend_diff: "0", is_highest: false },
    { id: "m16", crop: "તલ (Sesame - સફેદ)", crop_key: "તલ", yard: "ગોંડલ (Gondal)", yard_key: "gondal", min_price: 2650, max_price: 3180, modal_price: 2915, arrivals: "3,200 ગુણી", trend: "up", trend_diff: "+40", is_highest: true },
    { id: "m17", crop: "ધાણા (Coriander)", crop_key: "ધાણા", yard: "ગોંડલ (Gondal)", yard_key: "gondal", min_price: 1350, max_price: 1680, modal_price: 1515, arrivals: "11,000 બોરી", trend: "up", trend_diff: "+25", is_highest: true },
    { id: "m18", crop: "રાયડો (Mustard)", crop_key: "રાયડો", yard: "ઊંઝા (Unjha)", yard_key: "unjha", min_price: 980, max_price: 1140, modal_price: 1060, arrivals: "4,800 ગુણી", trend: "neutral", trend_diff: "0", is_highest: true }
];

async function fetchLiveMandiRatesData() {
    try {
        const res = await fetch(`${API_BASE}/api/mandi`);
        if (res.ok) {
            const data = await res.json();
            liveMandiData = data;
            updateMandiLeadersAndComparison(currentLanguage);
        }
    } catch (err) {
        console.log("Mandi API fetch error, using local dataset:", err);
    }
    renderMandiTable();
}

function filterMandiByCrop(cropKey) {
    currentMandiCropFilter = cropKey;
    document.querySelectorAll(".mandi-crop-btn").forEach(btn => {
        btn.className = "mandi-crop-btn px-3 py-1.5 rounded-xl bg-slate-50 text-emerald-950 border border-emerald-200 hover:bg-emerald-50";
    });
    if (window.event && window.event.target) {
        const target = window.event.target.closest("button") || window.event.target;
        target.classList.remove("bg-slate-50", "text-emerald-950");
        target.classList.add("active-filter", "bg-emerald-600", "text-white", "border-emerald-500", "shadow-xs");
    }
    renderMandiTable();
}

function applyMandiFilters() {
    currentMandiYardFilter = document.getElementById("mandiYardFilter")?.value || "all";
    currentMandiSearch = document.getElementById("mandiSearchInput")?.value.toLowerCase().trim() || "";
    renderMandiTable();
}

function renderMandiTable() {
    const tbody = document.getElementById("mandiTableBody");
    if (!tbody) return;

    const isEn = (currentLanguage === "English");
    const dataset = (liveMandiData && liveMandiData.rates) ? liveMandiData.rates : FALLBACK_MANDI_RATES;

    let filtered = dataset.filter(item => {
        const matchesYard = (currentMandiYardFilter === "all" || item.yard_key === currentMandiYardFilter);
        const matchesCrop = (currentMandiCropFilter === "all" || item.crop_key === currentMandiCropFilter);
        const matchesSearch = (!currentMandiSearch || 
            item.crop.toLowerCase().includes(currentMandiSearch) || 
            item.yard.toLowerCase().includes(currentMandiSearch) ||
            item.crop_key.toLowerCase().includes(currentMandiSearch) ||
            (CROP_TRANSLATIONS[item.crop_key] && CROP_TRANSLATIONS[item.crop_key].en.toLowerCase().includes(currentMandiSearch)) ||
            (YARD_TRANSLATIONS[item.yard_key] && YARD_TRANSLATIONS[item.yard_key].en.toLowerCase().includes(currentMandiSearch))
        );
        return matchesYard && matchesCrop && matchesSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400 italic font-semibold">${isEn ? "No matching rates found for current filters." : "કોઈ પરિણામ મળ્યું નથી (No matching rates found for current filters)."}</td></tr>`;
        return;
    }

    let html = "";
    filtered.forEach(row => {
        const isUp = row.trend === "up";
        const trendBadge = isUp 
            ? `<span class="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">📈 ${row.trend_diff}</span>`
            : `<span class="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">${isEn ? "➖ Stable" : "➖ સ્થિર"}</span>`;
        
        const highestBadge = row.is_highest
            ? `<span class="ml-1 text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-1.5 py-0.5 rounded shrink-0">${isEn ? "Highest ⭐" : "સૌથી ઊંચો ⭐"}</span>`
            : "";

        const cropDisplayName = isEn 
            ? (CROP_TRANSLATIONS[row.crop_key]?.en || row.crop) 
            : (CROP_TRANSLATIONS[row.crop_key]?.gu || row.crop);

        const yardDisplayName = isEn 
            ? (YARD_TRANSLATIONS[row.yard_key]?.en || row.yard) 
            : (YARD_TRANSLATIONS[row.yard_key]?.gu || row.yard);

        const arrivalsDisplay = formatMandiArrivals(row.arrivals, isEn);
        const askAiBtnLabel = isEn ? "Ask AI" : "AI પૂછો";

        html += `
            <tr class="hover:bg-emerald-50/70 transition">
                <td class="p-3 font-bold text-emerald-950">
                    <div class="flex items-center flex-wrap gap-1">
                        <span>${cropDisplayName}</span>
                        ${highestBadge}
                    </div>
                </td>
                <td class="p-3 font-semibold text-slate-700">
                    <span class="inline-flex items-center gap-1">
                        <i class="fa-solid fa-location-dot text-amber-600 text-[10px]"></i>
                        ${yardDisplayName}
                    </span>
                </td>
                <td class="p-3 text-center font-bold text-slate-600">₹${row.min_price}</td>
                <td class="p-3 text-center font-black text-[#065f46] text-sm">₹${row.max_price}</td>
                <td class="p-3 text-center font-bold text-slate-800">₹${row.modal_price}</td>
                <td class="p-3 text-center text-[11px] text-slate-500 font-semibold">${arrivalsDisplay}</td>
                <td class="p-3 text-center">${trendBadge}</td>
                <td class="p-3 text-center">
                    <button type="button" onclick="askAiAboutSpecificMandiCrop('${row.crop_key}', '${row.yard_key || row.yard}')" class="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-600 text-emerald-900 hover:text-white font-bold text-[11px] transition shadow-2xs">
                        ${askAiBtnLabel}
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function askAiAboutSpecificMandiCrop(cropKey, yardKeyOrName) {
    closeMandiModal();
    const isEn = (currentLanguage === "English");
    const cropName = isEn ? (CROP_TRANSLATIONS[cropKey]?.en || cropKey) : (CROP_TRANSLATIONS[cropKey]?.gu || cropKey);
    const yardName = isEn ? (YARD_TRANSLATIONS[yardKeyOrName]?.en || yardKeyOrName) : (YARD_TRANSLATIONS[yardKeyOrName]?.gu || yardKeyOrName);

    if (isEn) {
        userInput.value = `What is the latest APMC mandi rate for ${cropName} in ${yardName} today, and what is the price forecast?`;
    } else {
        userInput.value = `આજે ${yardName} માં ${cropName} નો શું ભાવ બોલાયો છે અને આગામી દિવસોમાં તેજી આવશે કે મંદી?`;
    }
    handleSend();
}

/* --- 90-Day Crop Calendar Engine --- */
const CROP_CALENDARS = {
    groundnut: [
        { day: 0, title: "વાવણી વખતે (Day 0): બીજામૃત સંસ્કાર & આચ્છાદન", category: "બીજ સંસ્કાર", icon: "🌱", desc: "વાવણી પૂર્વે ૧૦૦ કિલો દેશી બિયારણને બીજામૃતનો પટ આપવો. છાંયડે સુકવીને વાવવું જેથી ૧૦૦% ઉગાવો થાય અને ફૂગ-રોગ ન આવે.", recipe: "બીજામૃત: ૫ કિલો છાણ + ૫ લીટર ગૌમૂત્ર + ૫૦ ગ્રામ ચૂનો + ૧૦૦ લીટર પાણી.", timing: "વાવણીના ૧ દિવસ પહેલાં અથવા સવારે છાંયડે પટ આપવો." },
        { day: 15, title: "૧૫મો દિવસ: પ્રથમ પિયત સાથે પ્રવાહી જીવામૃત", category: "પોષણ (જીવામૃત)", icon: "🧪", desc: "પાકના મૂળનો ઝડપી વિકાસ કરવા અને જમીનના દેશી અળસિયા-જીવાણુઓને જગાડવા પિયતના પાણી સાથે જીવામૃત આપવું.", recipe: "પ્રતિ એકર ૨૦૦ લીટર તાજું પ્રવાહી જીવામૃત પિયતના પાણી સાથે આપવું.", timing: "સાંજના સમયે અથવા વહેલી સવારે પિયત આપવું." },
        { day: 30, title: "૩૦મો દિવસ: નાની ચૂસિયા જીવાત માટે ૧૦% નીમાસ્ત્ર સ્પ્રે", category: "કીટક નિયંત્રણ", icon: "🌿", desc: "થ્રિપ્સ, મોલો-મસી અને પાન ખાનારી નાની ઈયળોના ઉપદ્રવ અટકાવવા માટે ૧૦% નીમાસ્ત્રનો સચોટ છંટકાવ કરવો.", recipe: "૧૦૦ લીટર પાણી + ૧૦ લીટર ગાળેલું નીમાસ્ત્ર પ્રતિ એકર.", timing: "સવારે ૭:૦૦ થી ૯:૩૦ અથવા સાંજે ૪:૩૦ પછી છાંટવું (બપોરે નહીં)." },
        { day: 45, title: "૪૫મો દિવસ: ખાટી છાશ + હિંગ સ્પ્રે (ટિક્કા & ફૂગ નિયંત્રણ)", category: "ફૂગ નિયંત્રણ", icon: "🥛", desc: "મગફળીમાં પાનના કાળા ટપકાં (ટિક્કા રોગ), ગેરુ અને સુકારો અટકાવવા માટે તાંબાના ટુકડા વાળી ખાટી છાશનો આગોતરો સ્પ્રે.", recipe: "૫ લીટર ખાટી છાશ + ૫૦ ગ્રામ હિંગ + ૧૦૦ લીટર પાણી પ્રતિ એકર.", timing: "સવારે ઝાકળ ઉડી ગયા પછી ૮:૩૦ થી ૧૦:૩૦ દરમ્યાન છાંટવું." },
        { day: 60, title: "૬૦મો દિવસ: સુયા બેસવાની અવસ્થા - ઘનજીવામૃત & આચ્છાદન", category: "જમીન પોષણ", icon: "🌾", desc: "જમીનમાં સુયા (ડોડવા) સહેલાઈથી ઉતરે તે માટે છોડના મૂળિયાં પાસે ઘનજીવામૃત આપી સૂકા કચરા/કાષ્ઠનું આચ્છાદન (Mulching) કરવું.", recipe: "પ્રતિ વીઘા ૧૦૦ કિલો ઘનજીવામૃત હળવા હાથે છોડના મૂળ પાસે આપવું.", timing: "જમીનમાં પૂરતો ભેજ (વાપસા) હોય ત્યારે જ આપવું." },
        { day: 75, title: "૭૫મો દિવસ: સપ્તધાન્યાંકુર અર્ક (દાણાના ભરાવ & તેલ ટકાવારી)", category: "ફાલ/ઉત્પાદન", icon: "🌸", desc: "મગફળીના દાણા વજનદાર, તેલથી ભરપૂર અને ચમકદાર બનાવવા માટે ૭ અનાજના અંકુરિત અર્કનો પર્ણ છંટકાવ કરવો.", recipe: "૧૦૦ લીટર પાણીમાં ૨ લીટર સપ્તધાન્યાંકુર અર્ક ઉમેરી છાંટવો.", timing: "સાંજના શાંત વાતાવરણમાં છાંટવું." },
        { day: 90, title: "૯૦-૧૦૫મો દિવસ: પાક પરિપક્વતા & દેશી બીજ સંગ્રહ", category: "કાપણી તૈયારી", icon: "✂️", desc: "પાંદડા પીળાશ પડતા થાય અને ફોતરાની અંદર કાળાશ આવે ત્યારે ઉપાડવી. આવતા વર્ષ માટે તંદુરસ્ત છોડમાંથી દેશી બીજ અલગ સાચવવું.", recipe: "કાપણી પછી ૨-૩ દિવસ તડકે સુકવીને જ સંગ્રહ કરવો.", timing: "જમીન સાધારણ વરાપ થાય ત્યારે જ મગફળી ઉપાડવી." }
    ],
    cotton: [
        { day: 0, title: "વાવણી વખતે: બીજામૃત પટ & વાવણી", category: "બીજ સંસ્કાર", icon: "🌱", desc: "કપાસના બીજને બીજામૃતનો પટ આપી છાંયડે સુકવીને વાવવું જેથી ઉગાવો સારો થાય અને મૂળમાં ફૂગ ન આવે.", recipe: "૫ કિલો છાણ + ૫ લીટર ગૌમૂત્ર + ૫૦ ગ્રામ ચૂનાનું બીજામૃત.", timing: "વાવણી પહેલાં છાંયડે સુકવીને વાવવું." },
        { day: 20, title: "૨૦મો દિવસ: પ્રથમ પિયત + પ્રવાહી જીવામૃત", category: "પોષણ", icon: "🧪", desc: "છોડના વાનસ્પતિક વિકાસ અને મૂળના ફેલાવા માટે પિયત સાથે ૨૦૦ લીટર જીવામૃત આપવું.", recipe: "પ્રતિ એકર ૨૦૦ લીટર જીવામૃત ડ્રિપ કે ધોરિયા પિયત સાથે.", timing: "સાંજે ૪:૦૦ પછી પિયત આપવું." },
        { day: 35, title: "૩૫મો દિવસ: નીમાસ્ત્ર સ્પ્રે (થ્રિપ્સ & ચૂસિયા નિયંત્રણ)", category: "કીટક નિયંત્રણ", icon: "🌿", desc: "કપાસના પાનમાં થ્રિપ્સ, તડતડિયા કે લીલી પોપટી અટકાવવા નીમાસ્ત્રનો છંટકાવ કરવો.", recipe: "૧૦૦ લીટર પાણી + ૧૦ લીટર નીમાસ્ત્ર.", timing: "સવારે ૭:૦૦ થી ૯:૩૦ દરમ્યાન છંટકાવ." },
        { day: 50, title: "૫૦મો દિવસ: અગ્નિઅસ્ત્ર અથવા બ્રહ્માસ્ત્ર (બોલવોર્મ & ઈયળ રક્ષણ)", category: "તીવ્ર કીટક", icon: "🔥", desc: "ઝીંડવામાં લીલી કે ગુલાબી ઈયળ ન પડે તે માટે અગ્નિઅસ્ત્ર અથવા બ્રહ્માસ્ત્રનો કડક સ્પ્રે કરવો.", recipe: "૧૫ લીટર પંપમાં ૨૫૦ મિલી અગ્નિઅસ્ત્ર અથવા ૩૦૦ મિલી બ્રહ્માસ્ત્ર.", timing: "બપોરનો તડકો ટાળવો, સાંજે છાંટવું." },
        { day: 70, title: "૭૦મો દિવસ: ખાટી છાશ + ગોળ સ્પ્રે (ઝીંડવા & ફૂલ રક્ષણ)", category: "ફાલ રક્ષણ", icon: "🥛", desc: "કપાસમાં ચાપવા કે ઝીંડવા ખરતા અટકાવવા અને ફૂગ સામે રક્ષણ આપવા ખાટી છાશ + ગોળનું મિશ્રણ છાંટવું.", recipe: "૫ લીટર ખાટી છાશ + ૨૫૦ ગ્રામ દેશી ગોળ + ૧૦૦ લીટર પાણી.", timing: "સવારે ૮:૦૦ થી ૧૦:૦૦ વાગ્યા સુધી." },
        { day: 90, title: "૯૦મો દિવસ: દશપર્ણી અર્ક & જીવામૃત સ્પ્રે", category: "સર્વગ્રાહી રક્ષણ", icon: "🌿", desc: "છેલ્લા તબક્કામાં સફેદ માખી, થ્રિપ્સ અને વાયરસ સામે કપાસના ઝીંડવા સુરક્ષિત રાખવા દશપર્ણી અર્ક આપવો.", recipe: "૧૫ લીટરના પંપમાં ૫૦૦ મિલી દશપર્ણી અર્ક.", timing: "સાંજના સમયે છાંટવું." }
    ],
    wheat: [
        { day: 0, title: "વાવણી વખતે: બીજામૃત સંસ્કાર", category: "બીજ સંસ્કાર", icon: "🌱", desc: "ઘઉંના બીજને બીજામૃતનો પટ આપવો જેથી મૂળ મજબૂત થાય અને ઉગાવો ૧૦૦% મળે.", recipe: "બીજામૃતથી પટ આપી ૧ કલાક છાંયડે સુકવી વાવણી.", timing: "વાવણી પહેલાં છાંયડે પટ આપવો." },
        { day: 21, title: "૨૧મો દિવસ: ક્રાંતિક મૂળ અવસ્થા (CRI Stage) - જીવામૃત પિયત", category: "મુખ્ય પોષણ", icon: "🧪", desc: "ઘઉંમાં મૂળિયાં ફૂટવાનો સૌથી સંવેદનશીલ તબક્કો છે. પિયત સાથે પ્રતિ એકર ૨૦૦ લીટર જીવામૃત અવશ્ય આપવું.", recipe: "૨૦૦ લીટર પ્રવાહી જીવામૃત પિયત સાથે.", timing: "વાવણી પછી બરાબર ૨૧મા દિવસે પ્રથમ પિયત." },
        { day: 45, title: "૪૫મો દિવસ: ખાટી છાશ સ્પ્રે (ગેરુ & ફૂગ નિયંત્રણ)", category: "રોગ નિયંત્રણ", icon: "🥛", desc: "ઘઉંમાં પીળો ગેરુ કે કાળો ગેરુ અટકાવવા માટે ૫ લીટર ખાટી છાશ + તાંબાના ટુકડાનું દ્રાવણ છાંટવું.", recipe: "૫ લીટર ખાટી છાશ + ૧૦૦ લીટર પાણી.", timing: "સવારે ઝાકળ સુકાયા પછી છાંટવું." },
        { day: 65, title: "૬૫મો દિવસ: ઘનજીવામૃત & સપ્તધાન્યાંકુર અર્ક (ઉંબીઓ માટે)", category: "ઉત્પાદન", icon: "🌸", desc: "ઉંબીઓ લાંબી થાય અને દાણા ભરેલા રહે તે માટે સપ્તધાન્યાંકુર અર્કનો છંટકાવ કરવો.", recipe: "૨ લીટર સપ્તધાન્યાંકુર અર્ક + ૧૦૦ લીટર પાણી.", timing: "સાંજના સમયે સ્પ્રે કરવો." },
        { day: 85, title: "૮૫-૧૦૦મો દિવસ: દાણા પરિપક્વતા & કાપણી", category: "લણણી", icon: "✂️", desc: "દાણા સુકાઈને કડક થાય ત્યારે કાપણી કરવી. આવતા વર્ષના બિયારણ માટે ઉત્તમ કણસલાં અલગ રાખવાં.", recipe: "૧૨% થી ઓછો ભેજ હોય ત્યારે સંગ્રહ કરવો.", timing: "સૂકા હવામાનમાં કાપણી કરવી." }
    ],
    cumin: [
        { day: 0, title: "વાવણી વખતે: બીજામૃત સંસ્કાર", category: "બીજ સંસ્કાર", icon: "🌱", desc: "જીરુંના બીજને બીજામૃતનો પટ આપી છાંયડે સુકવીને વાવવું.", recipe: "બીજામૃતથી હળવો પટ.", timing: "વાવણી પહેલાં છાંયડે સુકવવું." },
        { day: 15, title: "૧૫મો દિવસ: હળવું પિયત + જીવામૃત", category: "પોષણ", icon: "🧪", desc: "જીરુંના નાજુક છોડને સૂક્ષ્મ જીવાણુ પૂરા પાડવા હળવા પિયત સાથે ૧૦૦ લીટર જીવામૃત આપવું.", recipe: "૧૦૦ લીટર જીવામૃત પિયત સાથે.", timing: "હળવું પાણી આપવું." },
        { day: 30, title: "૩૦મો દિવસ: ખાટી છાશ + હિંગનો આગોતરો સ્પ્રે (ચરમી રક્ષણ)", category: "ચરમી નિયંત્રણ", icon: "🥛", desc: "જીરુંમાં કાળિયો/ચરમી અને સુકારો અટકાવવા માટે ૪-૫ દિવસ જૂની ખાટી છાશ + હિંગનો આગોતરો છંટકાવ.", recipe: "૫ લીટર ખાટી છાશ + ૫૦ ગ્રામ હિંગ + ૧૦૦ લીટર પાણી.", timing: "વાદળછાયા વાતાવરણ પહેલાં અચૂક છાંટવું." },
        { day: 50, title: "૫૦મો દિવસ: દશપર્ણી અર્ક (ચૂસિયા & માખી નિયંત્રણ)", category: "કીટક નિયંત્રણ", icon: "🌿", desc: "જીરુંમાં મોલો-મસી અને ચૂસિયા જીવાત સામે રક્ષણ માટે દશપર્ણી અર્કનો સ્પ્રે.", recipe: "૧૫ લીટર પંપમાં ૪૦૦ મિલી દશપર્ણી અર્ક.", timing: "સવારે ૮:૦૦ થી ૧૦:૦૦ વાગ્યા દરમ્યાન." },
        { day: 75, title: "૭૫-૯૦મો દિવસ: પરિપક્વતા & લણણી", category: "લણણી", icon: "✂️", desc: "જીરુંના દાણા ભૂખરા-ભૂરા થાય ત્યારે વહેલી સવારે ઝાકળ હોય ત્યારે લણણી કરવી જેથી દાણા ખરી ન પડે.", recipe: "છાંયડે સૂકવીને તાળપત્રી પર ખંખેરવું.", timing: "વહેલી સવારે લણણી કરવી." }
    ],
    chana: [
        { day: 0, title: "વાવણી વખતે: બીજામૃત સંસ્કાર", category: "બીજ સંસ્કાર", icon: "🌱", desc: "દેશી ચણાના બીજને બીજામૃતથી પટ આપવો જેથી ઉગાવો ઉત્તમ થાય.", recipe: "બીજામૃત પટ.", timing: "વાવણી પૂર્વે ૧ કલાક." },
        { day: 20, title: "૨૦મો દિવસ: શાખાઓ ફૂટવાની અવસ્થા - જીવામૃત પિયત", category: "પોષણ", icon: "🧪", desc: "છોડમાં વધુ શાખાઓ ફૂટે તે માટે જીવામૃત આપવું અને ટોચ ચૂંટવી (Nipping).", recipe: "૨૦૦ લીટર જીવામૃત પિયત સાથે.", timing: "વાવણી પછી ૨૦મા દિવસે." },
        { day: 40, title: "૪૦મો દિવસ: નીમાસ્ત્ર સ્પ્રે (પોપટાની ઈયળ અટકાવવા)", category: "કીટક નિયંત્રણ", icon: "🌿", desc: "ચણામાં પોપટા ખાનારી લીલી ઈયળ અટકાવવા નીમાસ્ત્રનો છંટકાવ કરવો.", recipe: "૧૦૦ લીટર પાણી + ૧૦ લીટર નીમાસ્ત્ર.", timing: "સાંજે ૪:૩૦ પછી છાંટવું." },
        { day: 60, title: "૬૦મો દિવસ: ખાટી છાશ + ગોળ સ્પ્રે", category: "ફાલ રક્ષણ", icon: "🥛", desc: "ફૂલ-પોપટાનો સારો વિકાસ થાય તે માટે ખાટી છાશ અને ગોળનું દ્રાવણ છાંટવું.", recipe: "૫ લીટર ખાટી છાશ + ૨૫૦ ગ્રામ ગોળ + ૧૦૦ લીટર પાણી.", timing: "સવારે ૮:૦૦ થી ૧૦:૦૦ વાગ્યા સુધી." },
        { day: 80, title: "૮૦-૯૦મો દિવસ: લણણી & સંગ્રહ", category: "લણણી", icon: "✂️", desc: "પોપટા સૂકા થાય ત્યારે લણણી કરવી.", recipe: "સૂકવીને સુરક્ષિત સંગ્રહ.", timing: "સૂકા હવામાનમાં લણણી." }
    ],
    vegetables: [
        { day: 0, title: "રોપણી વખતે: બીજામૃતમાં ધરુના મૂળ બોળવા", category: "ધરુ સંસ્કાર", icon: "🌱", desc: "રીંગણ, મરચી, ટામેટાંના ધરુના મૂળ બીજામૃતમાં ૧૫ મિનિટ બોળીને રોપવા.", recipe: "બીજામૃત સોલ્યુશન.", timing: "સાંજના સમયે રોપણી કરવી." },
        { day: 15, title: "૧૫મો દિવસ: જીવામૃત પિયત", category: "પોષણ", icon: "🧪", desc: "ઝડપી વાનસ્પતિક વૃદ્ધિ માટે જીવામૃત પિયત સાથે આપવું.", recipe: "૧૫૦ લીટર જીવામૃત પ્રતિ એકર.", timing: "પિયતના પાણી સાથે." },
        { day: 30, title: "૩૦મો દિવસ: નીમાસ્ત્ર સ્પ્રે (સફેદ માખી & થ્રિપ્સ)", category: "કીટક નિયંત્રણ", icon: "🌿", desc: "વાયરસ ફેલાવતી સફેદ માખી અને કુકડ અટકાવવા નીમાસ્ત્રનો છંટકાવ.", recipe: "૧૫ લીટર પંપમાં ૧.૫ લીટર નીમાસ્ત્ર.", timing: "સવારે ૮:૦૦ થી ૧૦:૦૦." },
        { day: 45, title: "૪૫મો દિવસ: ખાટી છાશ + તાંબુ સ્પ્રે (ફૂગ & સુકારો)", category: "ફૂગ નિયંત્રણ", icon: "🥛", desc: "શાકભાજીમાં સુકારો, પાનના ડાઘ અટકાવવા તાંબાવાળી ખાટી છાશ છાંટવી.", recipe: "૫ લીટર ખાટી છાશ + ૧૦૦ લીટર પાણી.", timing: "સવારે છાંટવું." },
        { day: 60, title: "૬૦મો દિવસ: સપ્તધાન્યાંકુર અર્ક & દશપર્ણી અર્ક", category: "સતત ઉત્પાદન", icon: "🌸", desc: "મોટા કદના ફળ, તેજસ્વી રંગ અને સળંગ ફાલ માટે અર્ક છાંટવો.", recipe: "૨ લીટર અર્ક પ્રતિ એકર.", timing: "સાંજે ૪:૩૦ પછી." }
    ]
};

const CROP_CALENDARS_EN = {
    groundnut: [
        { day: 0, title: "Sowing Day (Day 0): Beejamrut Seed Treatment & Mulching", category: "Seed Treatment", icon: "🌱", desc: "Treat 100 kg indigenous seeds with Beejamrut before sowing. Dry in shade before planting for 100% germination and fungal wilt prevention.", recipe: "Beejamrut: 5 kg cow dung + 5 L gomutra + 50 g slaked lime + 100 L water.", timing: "1 day before sowing or in the morning under shade." },
        { day: 15, title: "Day 15: First Irrigation with Liquid Jeevamrut", category: "Nutrition (Jeevamrut)", icon: "🧪", desc: "To stimulate root development and activate beneficial native earthworms and microbes, apply Jeevamrut with irrigation water.", recipe: "Apply 200 Liters fresh liquid Jeevamrut per acre with flood or drip irrigation.", timing: "Evening or early morning irrigation." },
        { day: 30, title: "Day 30: 10% Nimastra Spray for Sucking Pests", category: "Pest Management", icon: "🌿", desc: "Spray 10% filtered Nimastra to effectively protect young plants from thrips, aphids, and leaf-eating caterpillars.", recipe: "100 L water + 10 L filtered Nimastra per acre.", timing: "7:00 AM to 9:30 AM or after 4:30 PM (avoid afternoon sun)." },
        { day: 45, title: "Day 45: Sour Buttermilk + Hing Spray (Tikka & Blight Control)", category: "Fungus Control", icon: "🥛", desc: "Preventive spray of copper-treated sour buttermilk to prevent leaf spot (Tikka), rust, and fungal collar rot.", recipe: "5 L sour buttermilk + 50 g Hing (asafoetida) + 100 L water per acre.", timing: "Morning between 8:30 AM and 10:30 AM after dew dries." },
        { day: 60, title: "Day 60: Pegging Stage - Ghanjeevamrut & Mulching", category: "Soil Nutrition", icon: "🌾", desc: "To facilitate smooth penetration of gynophores (pegs) into soil, apply Ghanjeevamrut near plant root zones and maintain dry biomass mulch.", recipe: "Apply 100 kg Ghanjeevamrut per Vigha gently near root zones.", timing: "Apply only when soil has optimum Whapasa moisture." },
        { day: 75, title: "Day 75: Saptadhanyankur Ark (Pod Filling & Oil Content)", category: "Yield Booster", icon: "🌸", desc: "Foliar spray of 7-grain germinated sprout extract to ensure bold, heavy pods with higher oil percentage and luster.", recipe: "Mix 2 Liters Saptadhanyankur Ark in 100 Liters water per acre.", timing: "Spray in calm evening weather." },
        { day: 90, title: "Day 90–105: Crop Maturity & Desi Seed Harvesting", category: "Harvest Prep", icon: "✂️", desc: "Harvest when leaves turn yellow and inner pod shells develop dark webbing. Select and preserve best plants for next season's seeds.", recipe: "Sun-dry for 2–3 days post-harvest before storage.", timing: "Uproot groundnut when soil has light moisture." }
    ],
    cotton: [
        { day: 0, title: "Sowing Day: Beejamrut Seed Treatment & Sowing", category: "Seed Treatment", icon: "🌱", desc: "Treat cotton seeds with Beejamrut and dry under shade to ensure vigorous germination and prevent seed-borne wilt.", recipe: "Beejamrut: 5 kg dung + 5 L gomutra + 50 g lime.", timing: "Coat gently and dry under shade before sowing." },
        { day: 20, title: "Day 20: First Irrigation + Liquid Jeevamrut", category: "Nutrition", icon: "🧪", desc: "Supply 200 Liters Jeevamrut with irrigation to accelerate vegetative growth and deep root anchoring.", recipe: "200 Liters Jeevamrut per acre via drip or furrow irrigation.", timing: "Apply after 4:00 PM." },
        { day: 35, title: "Day 35: Nimastra Spray (Thrips & Jassids Control)", category: "Pest Management", icon: "🌿", desc: "Spray Nimastra to keep leaves clean from sucking pests, thrips, and leafhoppers.", recipe: "100 Liters water + 10 Liters Nimastra.", timing: "Morning 7:00 AM to 9:30 AM." },
        { day: 50, title: "Day 50: Agniastra or Brahmastra (Bollworm Protection)", category: "Intense Pest Care", icon: "🔥", desc: "Foliar spray of Agniastra or Brahmastra to protect squares and young bolls from American and pink bollworms.", recipe: "250 ml Agniastra or 300 ml Brahmastra per 15 L spray pump.", timing: "Late afternoon spray (avoid noon heat)." },
        { day: 70, title: "Day 70: Sour Buttermilk + Jaggery Spray (Boll Retention)", category: "Flowering & Boll", icon: "🥛", desc: "Spray sour buttermilk + jaggery to prevent square and boll drop and protect against fungal diseases.", recipe: "5 Liters sour buttermilk + 250 g Desi jaggery + 100 L water.", timing: "Morning 8:00 AM to 10:00 AM." },
        { day: 90, title: "Day 90: Dashparni Ark & Jeevamrut Foliar Spray", category: "Holistic Protection", icon: "🌿", desc: "Apply Dashparni Ark in late stage to shield developing bolls against whiteflies, secondary pests, and virus vectors.", recipe: "500 ml Dashparni Ark per 15 L spray pump.", timing: "Spray in calm evening weather." }
    ],
    wheat: [
        { day: 0, title: "Sowing Day: Beejamrut Seed Coating", category: "Seed Treatment", icon: "🌱", desc: "Treat wheat seeds with Beejamrut to strengthen crown root initiation and ensure 100% germination.", recipe: "Coat with Beejamrut and dry in shade for 1 hour.", timing: "Before sowing under shade." },
        { day: 21, title: "Day 21: Crown Root Initiation (CRI) - Jeevamrut Drench", category: "Primary Nutrition", icon: "🧪", desc: "Most critical growth stage for tillering. Apply 200 Liters Jeevamrut per acre with the very first irrigation.", recipe: "200 L liquid Jeevamrut with irrigation water.", timing: "Exactly on 21st day post-sowing." },
        { day: 45, title: "Day 45: Sour Buttermilk Spray (Rust & Blight Defense)", category: "Disease Control", icon: "🥛", desc: "Spray 5 L copper-infused sour buttermilk solution to proactively prevent yellow/brown rust and leaf blight.", recipe: "5 L sour buttermilk + 100 L water.", timing: "Morning after dew evaporates." },
        { day: 65, title: "Day 65: Ghanjeevamrut & Saptadhanyankur Ark (Earhead Stage)", category: "Grain Formation", icon: "🌸", desc: "Spray Saptadhanyankur Ark to produce long earheads, bold grains, and high test weight.", recipe: "2 L Saptadhanyankur Ark + 100 L water.", timing: "Spray in the evening." },
        { day: 85, title: "Day 85–100: Grain Ripening & Harvest", category: "Harvesting", icon: "✂️", desc: "Harvest when grains turn golden and hard. Select the best earheads for next year's indigenous Desi seeds.", recipe: "Store at moisture level below 12%.", timing: "Harvest in dry clear weather." }
    ],
    cumin: [
        { day: 0, title: "Sowing Day: Beejamrut Seed Inoculation", category: "Seed Treatment", icon: "🌱", desc: "Inoculate cumin seeds with Beejamrut and shade-dry before sowing to prevent early damping-off.", recipe: "Light coating with Beejamrut.", timing: "1 hour before sowing." },
        { day: 15, title: "Day 15: Light Irrigation + Jeevamrut", category: "Nutrition", icon: "🧪", desc: "Provide light irrigation with 100 L Jeevamrut to supply beneficial soil microbes to delicate seedlings.", recipe: "100 L Jeevamrut with light irrigation.", timing: "Apply in calm weather." },
        { day: 30, title: "Day 30: Preventive Sour Buttermilk + Hing Spray (Blight/Charmi)", category: "Blight Control", icon: "🥛", desc: "Proactively spray 4–5 day old sour buttermilk + hing before overcast weather to prevent powdery mildew and blight.", recipe: "5 L sour buttermilk + 50 g Hing + 100 L water.", timing: "Essential to spray prior to cloudy weather." },
        { day: 50, title: "Day 50: Dashparni Ark (Aphids & Sucking Pest Care)", category: "Pest Management", icon: "🌿", desc: "Spray Dashparni Ark to safeguard flowering cumin umbels from aphids and thrips.", recipe: "400 ml Dashparni Ark per 15 L pump.", timing: "Morning 8:00 AM to 10:00 AM." },
        { day: 75, title: "Day 75–90: Grain Maturity & Early Morning Harvesting", category: "Harvesting", icon: "✂️", desc: "Harvest early morning when dew is present to avoid grain shattering when umbels turn grayish-brown.", recipe: "Dry under shade on clean canvas sheets.", timing: "Harvest in early morning hours." }
    ],
    chana: [
        { day: 0, title: "Sowing Day: Beejamrut Seed Treatment", category: "Seed Treatment", icon: "🌱", desc: "Coat Desi chickpea seeds with Beejamrut for vigorous germination and root wilt resistance.", recipe: "Beejamrut coating.", timing: "1 hour before sowing." },
        { day: 20, title: "Day 20: Branching Stage - Jeevamrut & Nipping", category: "Branching", icon: "🧪", desc: "Apply Jeevamrut with irrigation and pinch terminal tips (Nipping) to induce heavy branching.", recipe: "200 L Jeevamrut with irrigation.", timing: "20th day post-sowing." },
        { day: 40, title: "Day 40: Nimastra Spray (Pod Borer Prevention)", category: "Pest Management", icon: "🌿", desc: "Spray Nimastra to ward off Helicoverpa pod borer moths before egg laying starts.", recipe: "100 L water + 10 L Nimastra.", timing: "After 4:30 PM." },
        { day: 60, title: "Day 60: Sour Buttermilk + Jaggery Spray", category: "Pod Setting", icon: "🥛", desc: "Spray sour buttermilk + jaggery for maximum flower setting and bold pod formation.", recipe: "5 L buttermilk + 250 g jaggery + 100 L water.", timing: "Morning 8:00 AM to 10:00 AM." },
        { day: 80, title: "Day 80–90: Pod Maturity & Harvesting", category: "Harvesting", icon: "✂️", desc: "Harvest once pods dry out and seeds rattle inside.", recipe: "Sun-dry and store safely.", timing: "Harvest in dry weather." }
    ],
    vegetables: [
        { day: 0, title: "Transplanting: Seedling Root Dip in Beejamrut", category: "Root Dip", icon: "🌱", desc: "Dip roots of brinjal, chilli, and tomato seedlings in Beejamrut for 15 minutes before transplanting.", recipe: "Beejamrut root dip solution.", timing: "Transplant in the evening." },
        { day: 15, title: "Day 15: Jeevamrut Root Drench / Irrigation", category: "Nutrition", icon: "🧪", desc: "Apply 150 L Jeevamrut per acre for rapid root anchoring and vegetative branching.", recipe: "150 L Jeevamrut per acre.", timing: "With irrigation water." },
        { day: 30, title: "Day 30: Nimastra Spray (Whiteflies & Thrips)", category: "Pest Management", icon: "🌿", desc: "Spray Nimastra to prevent leaf curl virus spread by whiteflies and thrips.", recipe: "1.5 L Nimastra per 15 L spray pump.", timing: "Morning 8:00 AM to 10:00 AM." },
        { day: 45, title: "Day 45: Sour Buttermilk + Copper Spray (Blight & Spot Control)", category: "Fungus Defense", icon: "🥛", desc: "Spray copper-treated sour buttermilk to prevent wilt, fruit rot, and leaf blight.", recipe: "5 L buttermilk + 100 L water.", timing: "Morning spray." },
        { day: 60, title: "Day 60: Saptadhanyankur & Dashparni Ark", category: "Continuous Fruiting", icon: "🌸", desc: "Spray extracts for continuous fruiting, large fruit size, natural shine, and insect resistance.", recipe: "2 L extract per acre.", timing: "After 4:30 PM." }
    ]
};

function renderCropCalendarSchedule() {
    const isEn = (currentLanguage === "English");
    const cropKey = document.getElementById("calendarCropSelect")?.value || "groundnut";
    const dateInput = document.getElementById("calendarSowingDate");
    
    // Set default date to today if empty
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }
    
    const baseDate = (dateInput && dateInput.value) ? new Date(dateInput.value) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate days elapsed since sowing
    const diffTime = today - baseDate;
    const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Progress bar calculation (capped 0 to 100%)
    const pct = Math.min(100, Math.max(0, Math.round((daysElapsed / 90) * 100)));
    const progressBar = document.getElementById("calendarProgressBar");
    const progressBadge = document.getElementById("calendarProgressBadge");
    const cropTitle = document.getElementById("calendarCurrentCropTitle");
    const stageDesc = document.getElementById("calendarCurrentStageDesc");

    const cropNamesGuj = {
        groundnut: "મગફળી (Groundnut)",
        cotton: "કપાસ (Cotton)",
        wheat: "ઘઉં (Wheat)",
        cumin: "જીરું (Cumin)",
        chana: "ચણા (Chickpea)",
        vegetables: "શાકભાજી (Vegetables)"
    };
    const cropNamesEn = {
        groundnut: "Groundnut (Peanut)",
        cotton: "Cotton",
        wheat: "Wheat",
        cumin: "Cumin",
        chana: "Chickpea / Gram",
        vegetables: "Vegetables"
    };

    if (cropTitle) {
        cropTitle.innerText = isEn 
            ? `${cropNamesEn[cropKey] || "Crop"} - 90-Day Natural Farming Schedule`
            : `${cropNamesGuj[cropKey] || "પાક"} - ૯૦ દિવસ પ્રાકૃતિક કેલેન્ડર`;
    }

    if (progressBar) {
        progressBar.style.width = `${pct}%`;
    }

    if (progressBadge) {
        if (daysElapsed < 0) {
            progressBadge.innerText = isEn 
                ? `Upcoming Sowing (${Math.abs(daysElapsed)} days remaining)`
                : `આગામી વાવણી (${Math.abs(daysElapsed)} દિવસ બાકી)`;
            progressBadge.className = "text-xs bg-amber-100 text-amber-900 font-extrabold px-3 py-1 rounded-full border border-amber-300";
        } else {
            progressBadge.innerText = isEn 
                ? `Day ${Math.min(90, daysElapsed)} / 90 (${pct}%)`
                : `દિવસ ${Math.min(90, daysElapsed)} / ૯૦ (${pct}%)`;
            progressBadge.className = "text-xs bg-emerald-200 text-emerald-900 font-extrabold px-3 py-1 rounded-full border border-emerald-300";
        }
    }

    const steps = (isEn ? CROP_CALENDARS_EN : CROP_CALENDARS)[cropKey] || (isEn ? CROP_CALENDARS_EN.groundnut : CROP_CALENDARS.groundnut);

    // Find active step
    let activeStepIdx = 0;
    if (daysElapsed >= 0) {
        steps.forEach((s, i) => {
            if (daysElapsed >= s.day) {
                activeStepIdx = i;
            }
        });
    }

    if (stageDesc) {
        if (daysElapsed < 0) {
            stageDesc.innerHTML = isEn 
                ? `Sowing date is in the future • <strong>Preparation:</strong> Keep Beejamrut and indigenous seeds ready.`
                : `વાવણીની તારીખ ભવિષ્યની છે • <strong>તૈયારી:</strong> વાવણી માટે બીજામૃત અને દેશી બિયારણ તૈયાર રાખો.`;
        } else {
            const curStep = steps[activeStepIdx];
            stageDesc.innerHTML = isEn 
                ? `Sown <strong>${daysElapsed} days ago</strong> • <strong>Current Active Stage:</strong> ${curStep.title}`
                : `વાવણીને <strong>${daysElapsed} દિવસ</strong> થયા છે • <strong>હાલનો સક્રિય તબક્કો:</strong> ${curStep.title}`;
        }
    }

    const container = document.getElementById("calendarTimelineCards");
    if (!container) return;

    let html = "";
    steps.forEach((step, idx) => {
        const stepDate = new Date(baseDate);
        stepDate.setDate(stepDate.getDate() + step.day);
        const formattedDate = stepDate.toLocaleDateString(isEn ? "en-US" : "gu-IN", { day: "numeric", month: "long", year: "numeric" });

        const isCompleted = daysElapsed > (step.day + 7);
        const isActive = (idx === activeStepIdx && daysElapsed >= 0);

        let borderClass = "border-emerald-200 hover:border-emerald-400";
        let statusBadge = `<span class="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full border border-slate-200">${isEn ? "⏳ Upcoming" : "⏳ આગામી"}</span>`;
        let cardBg = "bg-white";

        if (isActive) {
            borderClass = "border-emerald-600 ring-2 ring-emerald-500/30 shadow-md";
            cardBg = "bg-gradient-to-r from-emerald-50/70 to-white";
            statusBadge = `<span class="text-[10px] bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">${isEn ? "🎯 Current Active Stage" : "🎯 વર્તમાન સક્રિય તબક્કો"}</span>`;
        } else if (isCompleted) {
            borderClass = "border-emerald-200 opacity-90";
            statusBadge = `<span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">${isEn ? "✓ Completed" : "✓ પૂર્ણ થયેલ"}</span>`;
        }

        const dayTag = step.day === 0 
            ? (isEn ? "Sowing Day" : "વાવણીનો દિવસ") 
            : (isEn ? `Day ${step.day}` : `${step.day}મો દિવસ`);
        const datePrefix = isEn ? "Date:" : "તારીખ:";
        const recipeTitle = isEn ? "🥣 Recipe & Proportions:" : "🥣 બનાવટ & માપ:";
        const timingTitle = isEn ? "⏰ Spray / Irrigation Timing:" : "⏰ છંટકાવ / પિયત સમય:";
        const calcBtnTitle = isEn ? "Calculate proportions in Fertilizer Tool" : "ખાતર કેલ્ક્યુલેટરમાં માપ ગણો";

        html += `
            <div class="${cardBg} p-4 rounded-2xl border ${borderClass} shadow-xs space-y-2.5 transition">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl ${isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-900'} font-extrabold flex items-center justify-center shrink-0 border border-emerald-400 text-sm shadow-xs">
                            ${step.icon || '🌱'}
                        </div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <h4 class="font-extrabold text-xs sm:text-sm text-emerald-950">${step.title}</h4>
                                <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">${step.category}</span>
                            </div>
                            <p class="text-[11px] text-amber-800 font-bold mt-0.5 flex items-center gap-1.5">
                                <i class="fa-regular fa-calendar-check text-amber-600"></i> ${datePrefix} ${formattedDate}
                                <span class="text-slate-400 font-normal">(${dayTag})</span>
                            </p>
                        </div>
                    </div>
                    <div class="shrink-0">
                        ${statusBadge}
                    </div>
                </div>

                <p class="text-xs text-slate-700 leading-relaxed font-medium bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">
                    ${step.desc}
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div class="bg-white p-2 rounded-xl border border-emerald-100 text-emerald-950">
                        <strong class="text-emerald-900 block text-[11px]">${recipeTitle}</strong>
                        <span>${step.recipe}</span>
                    </div>
                    <div class="bg-white p-2 rounded-xl border border-emerald-100 text-emerald-950">
                        <strong class="text-amber-800 block text-[11px]">${timingTitle}</strong>
                        <span>${step.timing}</span>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-2 pt-1 border-t border-emerald-50">
                    <button type="button" onclick="openFertilizerCalculator()" class="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition flex items-center gap-1">
                        <i class="fa-solid fa-calculator"></i>
                        <span>${calcBtnTitle}</span>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function copyScheduleToClipboard() {
    const isEn = (currentLanguage === "English");
    const cropKey = document.getElementById("calendarCropSelect")?.value || "groundnut";
    const dateInput = document.getElementById("calendarSowingDate");
    const baseDate = (dateInput && dateInput.value) ? new Date(dateInput.value) : new Date();
    const formattedBaseDate = baseDate.toLocaleDateString(isEn ? "en-US" : "gu-IN", { day: "numeric", month: "long", year: "numeric" });

    const cropNamesGuj = {
        groundnut: "મગફળી (Groundnut)",
        cotton: "કપાસ (Cotton)",
        wheat: "ઘઉં (Wheat)",
        cumin: "જીરું (Cumin)",
        chana: "ચણા (Chickpea)",
        vegetables: "શાકભાજી (Vegetables)"
    };
    const cropNamesEn = {
        groundnut: "Groundnut (Peanut)",
        cotton: "Cotton",
        wheat: "Wheat",
        cumin: "Cumin",
        chana: "Chickpea",
        vegetables: "Vegetables"
    };

    const steps = (isEn ? CROP_CALENDARS_EN : CROP_CALENDARS)[cropKey] || (isEn ? CROP_CALENDARS_EN.groundnut : CROP_CALENDARS.groundnut);
    
    let text = "";
    if (isEn) {
        text = `🌱 *KrushiMitra AI - 90-Day Natural Farming Crop Calendar*\n`;
        text += `🌾 Crop: ${cropNamesEn[cropKey] || cropKey}\n`;
        text += `📅 Sowing Date: ${formattedBaseDate}\n`;
        text += `----------------------------------------\n\n`;

        steps.forEach((step, idx) => {
            const stepDate = new Date(baseDate);
            stepDate.setDate(stepDate.getDate() + step.day);
            const fDate = stepDate.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

            text += `*#${idx + 1} ${step.title}*\n`;
            text += `🗓️ Date: ${fDate} (${step.day === 0 ? 'Sowing Day' : 'Day ' + step.day})\n`;
            text += `🌿 Details: ${step.desc}\n`;
            text += `🥣 Recipe & Proportions: ${step.recipe}\n\n`;
        });

        text += `----------------------------------------\n`;
        text += `Subhash Palekar Natural Farming (SPNF) Method • 100% Chemical Free\n`;
        text += `Generated by KrushiMitra AI Assistant`;
    } else {
        text = `🌱 *કૃષિમિત્ર AI - ૯૦ દિવસ પ્રાકૃતિક પાક કેલેન્ડર*\n`;
        text += `🌾 પાક: ${cropNamesGuj[cropKey] || cropKey}\n`;
        text += `📅 વાવણી તારીખ: ${formattedBaseDate}\n`;
        text += `----------------------------------------\n\n`;

        steps.forEach((step, idx) => {
            const stepDate = new Date(baseDate);
            stepDate.setDate(stepDate.getDate() + step.day);
            const fDate = stepDate.toLocaleDateString("gu-IN", { day: "numeric", month: "long", year: "numeric" });

            text += `*#${idx + 1} ${step.title}*\n`;
            text += `🗓️ તારીખ: ${fDate} (${step.day === 0 ? 'વાવણીનો દિવસ' : step.day + 'મો દિવસ'})\n`;
            text += `🌿 વિગત: ${step.desc}\n`;
            text += `🥣 પ્રમાણ: ${step.recipe}\n\n`;
        });

        text += `----------------------------------------\n`;
        text += `સુભાષ પાલેકર પ્રાકૃતિક ખેતી (SPNF) પદ્ધતિ • ૧૦૦% ઝેરી રસાયણ મુક્ત\n`;
        text += `Generate by KrushiMitra AI Assistant`;
    }

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById("copyScheduleBtn");
            if (btn) {
                const oldHtml = btn.innerHTML;
                const copiedMsg = isEn ? "✓ Schedule Copied!" : "✓ શિડ્યુલ કોપી થઈ ગયું!";
                btn.innerHTML = `<i class="fa-solid fa-check text-emerald-300"></i> <span>${copiedMsg}</span>`;
                btn.classList.add("bg-emerald-900");
                setTimeout(() => {
                    btn.innerHTML = oldHtml;
                    btn.classList.remove("bg-emerald-900");
                }, 2500);
            }
        });
    } else {
        alert(isEn ? "Please allow clipboard permissions in your browser." : "શિડ્યુલ કોપી કરવા માટે તમારા બ્રાઉઝર પરવાનગી આપો.");
    }
}

/* --- Medicine Recipes & Subsidy Engine --- */
const MEDICINE_RECIPES = [
    {
        name: "નીમાસ્ત્ર (Nimastra)",
        tag: "ચૂસિયા જીવાત & ઈયળ",
        ingredients: "૫ કિલો લીમડાનાં પાન, ૫ લીટર દેશી ગાયનું ગૌમૂત્ર, ૨ કિલો ગાયનું તાજું છાણ, ૧૦૦ લીટર પાણી.",
        method: "લીમડાના પાનને વાટીને ગૌમૂત્ર અને છાણ સાથે ૧૦૦ લીટર પાણીમાં ભેળવો. ૪૮ કલાક છાંયડે રાખી દિવસમાં બે વાર હલાવો. કપડાથી ગાળીને સીધો છંટકાવ કરવો.",
        dosage: "૧ એકર માટે ૧૦૦ લીટર દ્રાવણ પુરતું છે."
    },
    {
        name: "બ્રહ્માસ્ત્ર (Brahmastra)",
        tag: "મોટી ઈયળ & બોલવોર્મ",
        ingredients: "૨૦ લીટર ગૌમૂત્ર, ૨ કિલો લીમડા પાન, ૨ કિલો સીતાફળ પાન, ૨ કિલો કરંજ પાન, ૨ કિલો આકડા પાન, ૨ કિલો જામફળ/ધતૂરા પાન.",
        method: "તમામ પાંદડા વાટીને ૨૦ લીટર ગૌમૂત્રમાં ધીમા તાપે ઉકાળો. ૧/૨ ઉકળી જાય પછી ૪૮ કલાક ઠંડુ થવા દો. કપડાથી ગાળીને બોટલમાં ભરી લો (૬ મહિના સુધી સાચવી શકાય).",
        dosage: "૧૫ લીટરના પંપમાં ૩૦૦ મિલી દ્રાવણ નાખી છાંટવું."
    },
    {
        name: "અગ્નિઅસ્ત્ર (Agniastra)",
        tag: "તીવ્ર કીટકો & વાયરસ",
        ingredients: "૨૦ લીટર ગૌમૂત્ર, ૫ કિલો લીમડા પાન, ૨ કિલો તીખા લીલા મરચાની પેસ્ટ, ૫૦૦ ગ્રામ દેશી લસણની પેસ્ટ, ૫૦૦ ગ્રામ દેશી તમાકુ પાવડર.",
        method: "માટીના વાસણમાં તમામ સામગ્રી ગૌમૂત્ર સાથે મિક્સ કરી ધીમા તાપે ૪૫ મિનિટ ઉકાળો. ૪૮ કલાક ઠંડુ થવા દો. ગાળીને સંગ્રહ કરવો.",
        dosage: "૧૫ લીટરના પંપમાં ૨૫૦ મિલી દ્રાવણ ૧૦૦ લીટર પાણી સાથે."
    },
    {
        name: "ખાટી છાશ + તાંબુ સ્પ્રે (Sour Buttermilk)",
        tag: "ફૂગ, ટિક્કા, સુકારો & ચરમી",
        ingredients: "૫ લીટર ૪-૫ દિવસ જૂની ખાટી દેશી ગાયની છાશ, ૧ તાંબાનો ટુકડો, ૧૦૦ લીટર પાણી.",
        method: "ખાટી છાશમાં તાંબાનો ટુકડો નાખી ૪ દિવસ રાખો જેથી છાશ લીલાશ પડતી થાય. ગાળીને ૧૦૦ લીટર પાણીમાં ભેળવી છાંટવી.",
        dosage: "પ્રતિ પંપ ૫૦૦ થી ૭૫૦ મિલી છાશનું દ્રાવણ."
    }
];

const MEDICINE_RECIPES_EN = [
    {
        name: "Nimastra (Natural Bio-Pesticide)",
        tag: "Sucking Pests & Small Caterpillars",
        ingredients: "5 kg crushed Neem leaves, 5 L Desi cow gomutra, 2 kg fresh cow dung, 100 L water.",
        method: "Crush neem leaves and mix with gomutra, cow dung, and 100 L water in a drum. Keep in shade for 48 hours, stirring twice daily. Filter through cotton cloth and spray directly without dilution.",
        dosage: "100 Liters of solution is sufficient for 1 Acre."
    },
    {
        name: "Brahmastra (Potent Botanical Extract)",
        tag: "Large Caterpillars & Bollworms",
        ingredients: "20 L gomutra, 2 kg neem leaves, 2 kg custard apple leaves, 2 kg pongamia (karanj) leaves, 2 kg calotropis (aakado) leaves, 2 kg guava/datura leaves.",
        method: "Crush all leaves into a paste and simmer gently in 20 L gomutra until reduced to half. Let cool for 48 hours. Filter and store in closed bottles (shelf life up to 6 months).",
        dosage: "Dilute 300 ml in a 15 L spray pump."
    },
    {
        name: "Agniastra (Fiery Bio-Extract)",
        tag: "Severe Insect Infestation & Borers",
        ingredients: "20 L gomutra, 5 kg neem leaves, 2 kg spicy green chilli paste, 500 g desi garlic paste, 500 g native tobacco powder.",
        method: "Mix all ingredients in an earthen or steel pot with gomutra and boil on low flame for 45 minutes. Allow to cool for 48 hours. Filter and bottle.",
        dosage: "Dilute 250 ml in a 15 L pump (or with 100 L water per acre)."
    },
    {
        name: "Sour Buttermilk + Copper Spray",
        tag: "Fungus, Tikka, Wilt & Blight Control",
        ingredients: "5 L 4–5 days old sour Desi cow buttermilk, 1 clean copper piece or wire, 100 L water.",
        method: "Place a copper piece inside sour buttermilk for 4–5 days until it turns slightly greenish (creating natural organic copper sulfate). Filter and mix into 100 L water.",
        dosage: "Use 500 to 750 ml buttermilk solution per 15 L spray pump."
    }
];

const SUBSIDY_SCHEMES = [
    {
        title: "૧. દેશી ગાય આધારિત પ્રાકૃતિક ખેતી સહાય યોજના",
        amount: "₹900 પ્રતિ માસ (વાર્ષિક ₹10,800 સહાય)",
        eligibility: "ગુજરાતના ખેડૂત કે જેઓ પ્રાકૃતિક ખેતી કરે છે અને ૧ દેશી ગાય ધરાવે છે.",
        documents: "૭/૧૨, ૮-અ જમીન નકલ, આધાર કાર્ડ, બેંક પાસબુક નકલ, ગાયના કાનના ટેગ નંબર.",
        portal: "i-Khedut પોર્ટલ પર ઓનલાઇન અરજી (મે-જૂન માસમાં ફોર્મ ખુલે છે)."
    },
    {
        title: "૨. પ્રાકૃતિક ખેતી કીટ સહાય યોજના",
        amount: "૭૫% સબસિડી (ડ્રમ, ટબ, કેન ખરીદવા માટે)",
        eligibility: "જીવામૃત, ઘનજીવામૃત બનાવવા માટે ૨૦૦ લીટરના પ્લાસ્ટિક ડ્રમ, ટબ અને ગાળણી માટે સહાય.",
        documents: "ખેડૂત આધાર કાર્ડ, ૭/૧૨, ખરીદીનું પાકું જીએસટી બિલ.",
        portal: "i-Khedut પોર્ટલ પર બાગાયત / કૃષિ વિભાગ યોજના."
    },
    {
        title: "૩. જીવામૃત પ્લાન્ટ સહાય",
        amount: "રૂપિયા ૨,૦૦૦ ની એક વખતની સહાય",
        eligibility: "પ્રાકૃતિક ખેતી કરતા તમામ નોંધાયેલા ખેડૂત મિત્રો માટે.",
        documents: "તાલીમ પ્રમાણપત્ર અને ખેડૂત પુરાવા.",
        portal: "આત્મા પ્રોજેક્ટ (ATMA) અંતર્ગત જિલ્લા પંચાયત કચેરી."
    }
];

const SUBSIDY_SCHEMES_EN = [
    {
        title: "1. Desi Cow Natural Farming Maintenance Scheme",
        amount: "₹900 per month (₹10,800 annually)",
        eligibility: "Farmers in Gujarat practicing natural farming and rearing at least 1 Desi indigenous cow.",
        documents: "7/12 & 8-A land records, Aadhaar Card, Bank passbook copy, Cow ear-tag number.",
        portal: "Apply online on i-Khedut portal (applications usually open around May–June)."
    },
    {
        title: "2. Natural Farming Tool Kit Scheme",
        amount: "75% Govt Subsidy (Drums, Tubs & Cans)",
        eligibility: "Assistance to purchase 200 L plastic drums, containers, and filtration sieves for preparing Jeevamrut.",
        documents: "Farmer Aadhaar card, 7/12 record, GST purchase bill.",
        portal: "Horticulture / Agriculture dept scheme on i-Khedut portal."
    },
    {
        title: "3. Jeevamrut Preparation Assistance",
        amount: "₹2,000 One-Time Support",
        eligibility: "Registered farmers practicing certified natural farming.",
        documents: "Natural farming training certificate and farmer identity proofs.",
        portal: "District ATMA Project office / District Panchayat."
    }
];

function switchMedicineTab(tab) {
    const secRec = document.getElementById("medicineRecipesSection");
    const secSub = document.getElementById("medicineSubsidySection");
    const btnRec = document.getElementById("medTabRecipes");
    const btnSub = document.getElementById("medTabSubsidy");

    if (tab === "recipes") {
        secRec?.classList.remove("hidden");
        secSub?.classList.add("hidden");
        btnRec?.classList.add("bg-emerald-700", "text-white", "shadow-xs");
        btnRec?.classList.remove("text-emerald-950");
        btnSub?.classList.remove("bg-emerald-700", "text-white", "shadow-xs");
        btnSub?.classList.add("text-emerald-950");
    } else {
        secRec?.classList.add("hidden");
        secSub?.classList.remove("hidden");
        btnSub?.classList.add("bg-emerald-700", "text-white", "shadow-xs");
        btnSub?.classList.remove("text-emerald-950");
        btnRec?.classList.remove("bg-emerald-700", "text-white", "shadow-xs");
        btnRec?.classList.add("text-emerald-950");
    }
}

function renderMedicineRecipes() {
    const container = document.getElementById("medicineRecipesSection");
    if (!container) return;

    const isEn = (currentLanguage === "English");
    const dataset = isEn ? MEDICINE_RECIPES_EN : MEDICINE_RECIPES;

    const ingLabel = isEn ? "🌿 Ingredients:" : "🌿 સામગ્રી:";
    const methLabel = isEn ? "🥣 Preparation Method:" : "🥣 બનાવવાની રીત:";
    const dosLabel = isEn ? "💧 Spray Dosage:" : "💧 છંટકાવ પ્રમાણ:";

    let html = "";
    dataset.forEach(r => {
        html += `
            <div class="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-2 hover:border-emerald-500 transition">
                <div class="flex items-center justify-between gap-2">
                    <h4 class="font-extrabold text-sm text-emerald-950">${r.name}</h4>
                    <span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">${r.tag}</span>
                </div>
                <div class="text-xs text-slate-700 space-y-1">
                    <p><strong class="text-emerald-900">${ingLabel}</strong> ${r.ingredients}</p>
                    <p><strong class="text-emerald-900">${methLabel}</strong> ${r.method}</p>
                    <p><strong class="text-emerald-900">${dosLabel}</strong> ${r.dosage}</p>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderSubsidyGuide() {
    const container = document.getElementById("medicineSubsidySection");
    if (!container) return;

    const isEn = (currentLanguage === "English");
    const dataset = isEn ? SUBSIDY_SCHEMES_EN : SUBSIDY_SCHEMES;

    const badgeText = isEn ? "Govt Subsidy" : "સહાય";
    const amtLabel = isEn ? "💰 Subsidy Amount:" : "💰 સહાયની રકમ:";
    const eligLabel = isEn ? "📋 Eligibility:" : "📋 પાત્રતા:";
    const docLabel = isEn ? "📑 Required Documents:" : "📑 જરૂરી પુરાવા:";
    const portLabel = isEn ? "🌐 Application Portal:" : "🌐 અરજી પ્રક્રિયા:";

    let html = "";
    dataset.forEach(s => {
        html += `
            <div class="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs space-y-2 hover:border-amber-400 transition">
                <div class="flex items-center justify-between gap-2">
                    <h4 class="font-extrabold text-sm text-amber-950">${s.title}</h4>
                    <span class="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300">${badgeText}</span>
                </div>
                <div class="text-xs text-slate-700 space-y-1">
                    <p><strong class="text-amber-900">${amtLabel}</strong> <span class="font-bold text-emerald-700">${s.amount}</span></p>
                    <p><strong class="text-amber-900">${eligLabel}</strong> ${s.eligibility}</p>
                    <p><strong class="text-amber-900">${docLabel}</strong> ${s.documents}</p>
                    <p><strong class="text-amber-900">${portLabel}</strong> ${s.portal}</p>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

/* --- Ask AI Shortcut Actions --- */
function askAiAboutWeather() {
    closeWeatherModal();
    const isEn = (currentLanguage === "English");
    const district = document.getElementById("weatherDistrictSelect")?.value || "Rajkot";
    if (isEn) {
        userInput.value = `What is the live weather advisory for ${district} today, and is it suitable to spray organic bio-pesticides or Jeevamrut?`;
    } else {
        userInput.value = `આજે ${district} વિસ્તારમાં લાઈવ હવામાન કેવું છે અને મારે જીવામૃત કે દેશી દવાનો છંટકાવ કરવો જોઈએ?`;
    }
    handleSend();
}

function askAiAboutMandi() {
    closeMandiModal();
    const isEn = (currentLanguage === "English");
    if (isEn) {
        userInput.value = "What are the latest mandi prices of Cotton and Groundnut in Gondal and Rajkot today? Where is it more profitable to sell?";
    } else {
        userInput.value = "આજે ગોંડલ અને રાજકોટ યાર્ડમાં કપાસ અને મગફળીના ભાવ શું બોલાયા છે? ક્યાં વધારે ભાવ છે?";
    }
    handleSend();
}

function askAiAboutCalendar() {
    closeCropCalendarModal();
    const isEn = (currentLanguage === "English");
    const cropSelect = document.getElementById("calendarCropSelect");
    const cropKey = cropSelect?.value || "groundnut";
    const cropNamesEn = {
        groundnut: "Groundnut",
        cotton: "Cotton",
        wheat: "Wheat",
        cumin: "Cumin",
        chana: "Chickpea",
        vegetables: "Vegetables"
    };
    const cropNamesGuj = {
        groundnut: "મગફળી",
        cotton: "કપાસ",
        wheat: "ઘઉં",
        cumin: "જીરું",
        chana: "ચણા",
        vegetables: "શાકભાજી"
    };
    if (isEn) {
        const cropName = cropNamesEn[cropKey] || "crop";
        userInput.value = `Please provide the complete 90-day natural farming crop schedule for my ${cropName} crop with organic recipes and irrigation timings.`;
    } else {
        const cropName = cropNamesGuj[cropKey] || "પાક";
        userInput.value = `મારા ${cropName} પાક માટે પ્રાકૃતિક ખેતીનું ૯૦ દિવસનું સંપૂર્ણ ટાઈમટેબલ સમજાવો.`;
    }
    handleSend();
}

function askAiAboutMedicine() {
    closeMedicineLibraryModal();
    const isEn = (currentLanguage === "English");
    if (isEn) {
        userInput.value = "How to prepare Nimastra and Agniastra for natural pest control, and which pests and insects do they protect against?";
    } else {
        userInput.value = "નીમાસ્ત્ર અને અગ્નિઅસ્ત્ર બનાવવાની પાકી રીત અને કયા રોગમાં છાંટવું તે જણાવો.";
    }
    handleSend();
}

/* --- Progressive Web App (PWA) Engine --- */
let deferredPwaPrompt = null;

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then(reg => {
                console.log('KrushiMitra Service Worker registered successfully:', reg.scope);
            })
            .catch(err => {
                console.warn('Service Worker registration failed:', err);
            });
    });
}

// Listen for PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;

    // Show Install Buttons in Header & Sidebar
    const headerBtn = document.getElementById('pwaInstallBtn');
    if (headerBtn) {
        headerBtn.classList.remove('hidden');
        headerBtn.classList.add('flex');
    }

    const sidebarContainer = document.getElementById('sidebarPwaInstallContainer');
    if (sidebarContainer) {
        sidebarContainer.classList.remove('hidden');
    }

    // Show Mobile Floating Prompt if not dismissed in session
    const isMobile = window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isDismissed = sessionStorage.getItem('krushimitra_pwa_dismissed');
    const mobileBanner = document.getElementById('mobilePwaBanner');
    if (isMobile && !isDismissed && mobileBanner) {
        mobileBanner.classList.remove('hidden');
    }
});

// App Installed event handler
window.addEventListener('appinstalled', () => {
    console.log('KrushiMitra PWA was successfully installed.');
    deferredPwaPrompt = null;
    hidePwaControls();
});

function hidePwaControls() {
    const headerBtn = document.getElementById('pwaInstallBtn');
    if (headerBtn) {
        headerBtn.classList.add('hidden');
        headerBtn.classList.remove('flex');
    }
    const sidebarContainer = document.getElementById('sidebarPwaInstallContainer');
    if (sidebarContainer) sidebarContainer.classList.add('hidden');
    const mobileBanner = document.getElementById('mobilePwaBanner');
    if (mobileBanner) mobileBanner.classList.add('hidden');
}

function dismissPwaBanner() {
    const mobileBanner = document.getElementById('mobilePwaBanner');
    if (mobileBanner) mobileBanner.classList.add('hidden');
    sessionStorage.setItem('krushimitra_pwa_dismissed', '1');
}

async function installKrushiMitraPWA() {
    if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted KrushiMitra PWA installation');
            hidePwaControls();
        } else {
            console.log('User dismissed KrushiMitra PWA installation');
        }
        deferredPwaPrompt = null;
    } else {
        // Fallback guidance for manual install
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIos) {
            alert(currentLanguage === "English"
                ? "To install on iOS Safari: tap the 'Share' button below and select 'Add to Home Screen'."
                : "iOS Safari માં ઇન્સ્ટોલ કરવા માટે: નીચે 'Share' બટન પર ક્લિક કરી 'Add to Home Screen' પસંદ કરો.");
        } else {
            alert(currentLanguage === "English"
                ? "Tap your mobile browser menu (3 dots ⋮) and select 'Add to Home screen' or 'Install App'."
                : "તમારા મોબાઇલ બ્રાઉઝર મેનુ (૩ ટપકાં ⋮) પર ક્લિક કરો અને 'Add to Home screen' અથવા 'Install App' પસંદ કરો.");
        }
    }
}


