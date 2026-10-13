import os
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from fastapi.middleware.cors import CORSMiddleware

# Load settings from .env file
load_dotenv()

app = FastAPI(title="Natural Farming AI Assistant (Local LM Studio)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Configuration for LM Studio
lm_studio_base_url = os.getenv("LM_STUDIO_BASE_URL", "http://localhost:1234/v1")
lm_studio_api_key = os.getenv("LM_STUDIO_API_KEY", "lm-studio")
llm_model = os.getenv("LLM_MODEL", "qwen2.5-7b-instruct-1m")

print(f"Connecting to Local LM Studio at: {lm_studio_base_url} using model: {llm_model}")

# Initialize LLM pointing to your local LM Studio server
llm = ChatOpenAI(
    base_url=lm_studio_base_url,
    api_key=lm_studio_api_key,
    model=llm_model,
    temperature=0.3
)

# Initialize local embeddings and load existing Vector DB
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma(persist_directory="rag_data/chroma_db", embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# System prompt forcing Gujarati output based on context
system_prompt = (
    "તમે પ્રાકૃતિક ખેતીના એક નિષ્ણાત અને મદદરૂપ આસિસ્ટન્ટ છો. "
    "માત્ર નીચે આપેલી માહિતીનો ઉપયોગ કરીને જ ખેડૂતના પ્રશ્નનો સચોટ જવાબ આપો. "
    "જો માહિતીમાં જવાબ ન હોય, તો પ્રામાણિકતાથી કહી દો કે તમને આ વિશે ખબર નથી, પોતાના મનથી જવાબ ન આપો. "
    "તમારો જવાબ હંમેશા સ્પષ્ટ અને સરળ 'ગુજરાતી' ભાષામાં જ હોવો જોઈએ.\n\n"
    "માહિતી:\n{context}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
])

# Build the RAG pipeline using modern LCEL (LangChain Expression Language)
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "input": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

class ChatRequest(BaseModel):
    message: str  # Matches frontend 'userText'

from fastapi.responses import FileResponse

@app.get("/")
async def serve_frontend():
    # This will show the chat interface when you open http://127.0.0.1:8000/
    return FileResponse("frontend/index.html")

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # Step 1: Retrieve relevant documents
        docs = retriever.invoke(request.message)
        context = format_docs(docs)
        
        # Step 2: Extract sources (metadata)
        sources = []
        for d in docs:
            source_file = d.metadata.get("source", "Unknown Document")
            page_num = d.metadata.get("page", 0)
            file_name = os.path.basename(source_file)
            sources.append({"document": file_name, "page": page_num})
            
        # Step 3: Get Answer from LLM
        prompt_value = prompt.invoke({"context": context, "input": request.message})
        answer = llm.invoke(prompt_value)
        
        # Return exact format expected by frontend
        return {"answer": answer.content, "sources": sources}
    except Exception as e:
        return {"error": f"Error communicating with LM Studio: {str(e)}"}
