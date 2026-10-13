import os
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

def create_vector_db():
    print("Loading PDFs from rag_data/pdfs...")
    loader = PyPDFDirectoryLoader("rag_data/pdfs")
    documents = loader.load()
    
    if not documents:
        print("No PDFs found in rag_data/pdfs. Please add some.")
        return

    print(f"Loaded {len(documents)} pages. Splitting text...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(documents)
    
    print(f"Created {len(chunks)} chunks. Building Vector Database locally...")
    
    # We use local sentence-transformers for fast embeddings without depending on LM Studio API for it
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # Save to local chroma_db folder
    db_path = "rag_data/chroma_db"
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=db_path
    )
    print(f"Vector Database created successfully in '{db_path}'!")

if __name__ == "__main__":
    create_vector_db()
