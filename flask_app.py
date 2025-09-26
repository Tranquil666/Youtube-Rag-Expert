from flask import Flask, request, jsonify, render_template_string, send_from_directory
from flask_cors import CORS
import os
import uuid
from supporting_functions import (
    extract_video_id,
    get_transcript,
    translate_transcript,
    generate_notes,
    get_important_topics,
    create_chunks,
    create_vector_store,
    rag_answer
)

app = Flask(__name__)
CORS(app)

# Store vector stores in memory (in production, use a proper database)
vector_stores = {}

def cleanup_old_vector_stores():
    """Clean up old vector stores to prevent memory issues"""
    if len(vector_stores) > 5:  # Keep only last 5 vector stores
        oldest_keys = list(vector_stores.keys())[:-5]
        for key in oldest_keys:
            del vector_stores[key]
        print(f"Cleaned up {len(oldest_keys)} old vector stores")

@app.route('/')
def index():
    """Serve the main HTML page"""
    with open('index.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/style.css')
def serve_css():
    """Serve CSS file"""
    return send_from_directory('.', 'style.css', mimetype='text/css')

@app.route('/script.js')
def serve_js():
    """Serve JavaScript file"""
    return send_from_directory('.', 'script.js', mimetype='application/javascript')

@app.route('/api/transcript', methods=['POST'])
def api_transcript():
    """Get transcript from YouTube video"""
    try:
        data = request.get_json()
        video_id = data.get('video_id')
        language = data.get('language', 'en')
        
        if not video_id:
            return jsonify({'error': 'Video ID is required'}), 400
        
        transcript = get_transcript(video_id, language)
        
        if not transcript:
            return jsonify({'error': 'Failed to fetch transcript'}), 500
        
        return jsonify({
            'transcript': transcript,
            'video_id': video_id,
            'language': language
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/translate', methods=['POST'])
def api_translate():
    """Translate transcript to English"""
    try:
        data = request.get_json()
        transcript = data.get('transcript')
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400
        
        translated = translate_transcript(transcript)
        
        return jsonify({
            'translated_transcript': translated
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/topics', methods=['POST'])
def api_topics():
    """Get important topics from transcript"""
    try:
        data = request.get_json()
        transcript = data.get('transcript')
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400
        
        topics = get_important_topics(transcript)
        
        return jsonify({
            'topics': topics
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes', methods=['POST'])
def api_notes():
    """Generate notes from transcript"""
    try:
        data = request.get_json()
        transcript = data.get('transcript')
        
        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400
        
        notes = generate_notes(transcript)
        
        return jsonify({
            'notes': notes
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chunks', methods=['POST'])
def api_chunks():
    """Create chunks from transcript"""
    try:
        data = request.get_json()
        transcript = data.get('transcript')

        if not transcript:
            return jsonify({'error': 'Transcript is required'}), 400

        chunks = create_chunks(transcript)

        # Convert chunks to serializable format
        chunk_data = []
        for chunk in chunks:
            chunk_data.append({
                'page_content': chunk.page_content,
                'metadata': chunk.metadata
            })

        return jsonify({
            'chunks': chunk_data,
            'message': f'Successfully created {len(chunk_data)} chunks'
        })

    except Exception as e:
        print(f"Error in chunks API: {str(e)}")
        return jsonify({'error': f'Failed to create chunks: {str(e)}'}), 500

@app.route('/api/vectorstore', methods=['POST'])
def api_vectorstore():
    """Create vector store from chunks"""
    try:
        print("Vectorstore API called")
        data = request.get_json()
        chunks_data = data.get('chunks')

        if not chunks_data:
            print("No chunks data provided")
            return jsonify({'error': 'Chunks are required'}), 400

        print(f"Received {len(chunks_data)} chunks")

        # Recreate Document objects from chunk data
        from langchain.schema import Document
        chunks = []
        for i, chunk_data in enumerate(chunks_data):
            print(f"Processing chunk {i+1}")
            chunks.append(Document(
                page_content=chunk_data['page_content'],
                metadata=chunk_data.get('metadata', {})
            ))

        print(f"Created {len(chunks)} Document objects")

        # Create vector store and get its ID for retrieval
        print("Creating vector store...")
        vectorstore = create_vector_store(chunks)
        print("Vector store created successfully")

        # Clean up old vector stores first
        cleanup_old_vector_stores()
        
        # Generate unique ID for this vector store
        store_id = str(uuid.uuid4())
        vector_stores[store_id] = vectorstore
        print(f"Stored vector store with ID: {store_id}")
        print(f"Total vector stores in memory: {len(vector_stores)}")

        return jsonify({
            'vector_store_id': store_id,
            'message': 'Vector store created successfully'
        })

    except Exception as e:
        print(f"Error in vectorstore API: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to create vector store: {str(e)}'}), 500

@app.route('/api/chat', methods=['POST'])
def api_chat():
    """Get RAG answer for a question"""
    try:
        data = request.get_json()
        question = data.get('question')
        vector_store_id = data.get('vector_store_id')
        
        if not question:
            return jsonify({'error': 'Question is required'}), 400
        
        if not vector_store_id or vector_store_id not in vector_stores:
            return jsonify({'error': 'Invalid vector store ID'}), 400
        
        vectorstore = vector_stores[vector_store_id]
        answer = rag_answer(question, vectorstore)
        
        return jsonify({
            'answer': answer,
            'question': question
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'VidSynth AI Flask backend is running'
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Ensure the .env file is loaded
    from dotenv import load_dotenv
    load_dotenv()
    
    # Check if Google API key is set
    if not os.getenv('GOOGLE_API_KEY'):
        print("Warning: GOOGLE_API_KEY not found in environment variables")
        print("Please make sure your .env file contains: GOOGLE_API_KEY=your_api_key_here")
    
    print("Starting VidSynth AI Flask Backend...")
    print("Access the application at: http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
