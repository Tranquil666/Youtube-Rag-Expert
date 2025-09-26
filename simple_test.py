#!/usr/bin/env python3
"""
Simple test to create vector store with HuggingFace embeddings only
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain.schema import Document

def simple_test():
    print("Testing simple vector store creation...")
    
    # Test with sample transcript
    sample_transcript = """
    This is a sample transcript for testing purposes. 
    It contains multiple sentences to test the chunking functionality.
    We want to make sure that the vector store creation works properly.
    This should be enough text to create meaningful chunks for testing.
    """
    
    try:
        print("Creating chunks...")
        text_splitters = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        docs = text_splitters.create_documents([sample_transcript])
        print(f"Created {len(docs)} chunks")
        
        print("Creating HuggingFace embeddings...")
        from langchain_community.embeddings import HuggingFaceEmbeddings
        embedding = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        print("HuggingFace embeddings created successfully")
        
        print("Creating vector store...")
        vector_store = Chroma.from_documents(
            docs,
            embedding
        )
        print("Vector store created successfully!")
        
        # Test similarity search
        print("Testing similarity search...")
        results = vector_store.similarity_search("testing", k=2)
        print(f"Found {len(results)} similar documents")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = simple_test()
    if success:
        print("✅ Simple vector store test passed!")
    else:
        print("❌ Simple vector store test failed!")
