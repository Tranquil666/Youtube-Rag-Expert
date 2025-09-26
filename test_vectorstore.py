#!/usr/bin/env python3
"""
Test script to debug vector store creation issues
"""

import os
from dotenv import load_dotenv
from supporting_functions import create_chunks, create_vector_store

# Load environment variables
load_dotenv()

def test_vector_store():
    print("Testing vector store creation...")
    
    # Check if API key is loaded
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("ERROR: GOOGLE_API_KEY not found in environment variables")
        return False
    else:
        print(f"API Key found: {api_key[:10]}...")
    
    # Test with sample transcript
    sample_transcript = """
    This is a sample transcript for testing purposes. 
    It contains multiple sentences to test the chunking functionality.
    We want to make sure that the vector store creation works properly.
    This should be enough text to create meaningful chunks for testing.
    """
    
    try:
        print("Creating chunks...")
        chunks = create_chunks(sample_transcript)
        print(f"Created {len(chunks)} chunks")
        
        print("Creating vector store...")
        vector_store = create_vector_store(chunks)
        print("Vector store created successfully!")
        
        # Test similarity search
        print("Testing similarity search...")
        results = vector_store.similarity_search("testing", k=2)
        print(f"Found {len(results)} similar documents")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        print(f"ERROR TYPE: {type(e)}")
        import traceback
        print("FULL TRACEBACK:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_vector_store()
    if success:
        print("✅ Vector store test passed!")
    else:
        print("❌ Vector store test failed!")
