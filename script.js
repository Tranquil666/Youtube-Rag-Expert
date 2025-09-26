// VidSynth AI - Frontend JavaScript

class VidSynthApp {
    constructor() {
        this.chatMessages = [];
        this.vectorStore = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Submit button event listener
        document.getElementById('submitBtn').addEventListener('click', () => {
            this.handleSubmit();
        });

        // Chat input event listeners
        document.getElementById('sendChatBtn').addEventListener('click', () => {
            this.sendChatMessage();
        });

        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
    }

    async handleSubmit() {
        const youtubeUrl = document.getElementById('youtubeUrl').value.trim();
        const language = document.getElementById('language').value.trim() || 'en';
        const taskOption = document.querySelector('input[name="taskOption"]:checked').value;

        if (!youtubeUrl) {
            this.showError('Please enter a YouTube URL');
            return;
        }

        if (!this.isValidYouTubeUrl(youtubeUrl)) {
            this.showError('Please enter a valid YouTube URL');
            return;
        }

        try {
            // Clear previous data for new video
            this.clearPreviousData();
            
            this.showLoading('Step 1/3: Fetching Transcript.....');
            this.hideResults();

            // Extract video ID and get transcript
            const videoId = this.extractVideoId(youtubeUrl);
            if (!videoId) {
                throw new Error('Invalid YouTube URL');
            }

            const transcriptData = await this.fetchTranscript(videoId, language);

            if (language !== 'en') {
                this.showLoading('Step 1.5/3: Translating Transcript into English, This may take few moments......');
                transcriptData.transcript = await this.translateTranscript(transcriptData.transcript);
            }

            if (taskOption === 'Notes For You') {
                await this.handleNotesGeneration(transcriptData.transcript);
            } else if (taskOption === 'Chat with Video') {
                await this.handleChatSetup(transcriptData.transcript);
            }

        } catch (error) {
            this.hideLoading();
            this.showError(`Error: ${error.message}`);
        }
    }

    clearPreviousData() {
        // Clear vector store
        this.vectorStore = null;
        
        // Clear chat messages
        this.chatMessages = [];
        
        // Reset chat interface
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="welcome-message text-center p-4">
                    <i class="fas fa-robot fa-3x text-primary mb-3"></i>
                    <h5>Hi! I'm your AI assistant</h5>
                    <p class="text-muted">Ask me anything about the video content. I'm here to help!</p>
                </div>
            `;
        }
        
        console.log('Previous data cleared for new video');
    }

    async handleNotesGeneration(transcript) {
        try {
            this.showLoading('Step 2/3: Extracting important Topics...');
            const topics = await this.getImportantTopics(transcript);
            
            this.showLoading('Step 3/3: Generating Notes for you.');
            const notes = await this.generateNotes(transcript);
            
            this.hideLoading();
            this.showNotesResults(topics, notes);
        } catch (error) {
            this.hideLoading();
            this.showError(`Error generating notes: ${error.message}`);
        }
    }

    async handleChatSetup(transcript) {
        try {
            this.showLoading('Step 2/3: Creating chunks and vector store....');

            console.log('Creating chunks...');
            const chunksResponse = await this.createChunks(transcript);
            console.log('Chunks created:', chunksResponse);

            console.log('Creating vector store...');
            const vectorStoreResponse = await this.createVectorStore(chunksResponse.chunks);
            console.log('Vector store created:', vectorStoreResponse);

            this.hideLoading();
            this.showChatReady();
            this.chatMessages = [];
            this.displayChatSection();
        } catch (error) {
            console.error('Error in handleChatSetup:', error);
            this.hideLoading();
            this.showError(`Error setting up chat: ${error.message}`);
        }
    }
    async sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (!message || !this.vectorStore) return;

        // Add user message to chat
        this.addChatMessage('user', message);
        chatInput.value = '';

        try {
            // Show typing indicator
            this.showTypingIndicator();
            
            // Get AI response
            const response = await this.getRagAnswer(message);
            
            // Hide typing indicator and show response
            this.hideTypingIndicator();
            this.addChatMessage('assistant', response);
        } catch (error) {
            this.hideTypingIndicator();
            this.addChatMessage('assistant', 'Sorry, I encountered an error processing your question. Please try again.');
        }
    }

    // API calls to Flask backend
    async fetchTranscript(videoId, language) {
        const response = await fetch('/api/transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: videoId, language: language })
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch transcript');
        }
        
        return await response.json();
    }

    async translateTranscript(transcript) {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: transcript })
        });
        
        if (!response.ok) {
            throw new Error('Failed to translate transcript');
        }
        
        const data = await response.json();
        return data.translated_transcript;
    }

    async getImportantTopics(transcript) {
        const response = await fetch('/api/topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: transcript })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get important topics');
        }
        
        const data = await response.json();
        return data.topics;
    }

    async generateNotes(transcript) {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: transcript })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate notes');
        }
        
        const data = await response.json();
        return data.notes;
    }

    async createChunks(transcript) {
        const response = await fetch('/api/chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: transcript })
        });

        if (!response.ok) {
            throw new Error('Failed to create chunks');
        }

        const data = await response.json();
        return data;
    }

    async createVectorStore(chunks) {
        const response = await fetch('/api/vectorstore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chunks: chunks })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create vector store');
        }
        
        const data = await response.json();
        this.vectorStore = data.vector_store_id;
        return data;
    }

    async getRagAnswer(question) {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question: question, 
                vector_store_id: this.vectorStore 
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get answer');
        }
        
        const data = await response.json();
        return data.answer;
    }

    // Utility functions
    extractVideoId(url) {
        const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
        return match ? match[1] : null;
    }

    isValidYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        return youtubeRegex.test(url);
    }

    // UI functions
    showLoading(text) {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingSpinner').classList.remove('d-none');
    }

    hideLoading() {
        document.getElementById('loadingSpinner').classList.add('d-none');
    }

    hideResults() {
        document.getElementById('resultsSection').classList.add('d-none');
        document.getElementById('chatSection').classList.add('d-none');
        document.getElementById('topicsSection').classList.add('d-none');
        document.getElementById('notesSection').classList.add('d-none');
        document.getElementById('successMessage').classList.add('d-none');
        document.getElementById('chatReadyMessage').classList.add('d-none');
    }

    showNotesResults(topics, notes) {
        document.getElementById('topicsContent').innerHTML = this.formatContent(topics);
        document.getElementById('notesContent').innerHTML = this.formatContent(notes);
        
        document.getElementById('resultsSection').classList.remove('d-none');
        document.getElementById('topicsSection').classList.remove('d-none');
        document.getElementById('notesSection').classList.remove('d-none');
        document.getElementById('successMessage').classList.remove('d-none');
        
        // Add fade-in animation
        document.getElementById('resultsSection').classList.add('fade-in');
    }

    showChatReady() {
        document.getElementById('resultsSection').classList.remove('d-none');
        document.getElementById('chatReadyMessage').classList.remove('d-none');
    }

    displayChatSection() {
        document.getElementById('chatSection').classList.remove('d-none');
        // Keep the welcome message, don't clear it
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
        }
    }

    addChatMessage(role, content) {
        const chatMessages = document.getElementById('chatMessages');
        
        // Hide welcome message when first message is added
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage && this.chatMessages.length === 0) {
            welcomeMessage.style.display = 'none';
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        messageDiv.innerHTML = this.formatContent(content);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Store message
        this.chatMessages.push({ role, content });
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <span>VidSynth AI is typing</span>
            <div class="typing-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    formatContent(content) {
        // Convert markdown-like formatting to HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/(\d+\.\s)/g, '<br><strong>$1</strong>');
    }

    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const mainContent = document.querySelector('.main-content .container-fluid');
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new VidSynthApp();
    
    // Add mobile menu toggle functionality
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }
    
    // Add clear chat functionality
    const clearChatBtn = document.getElementById('clearChatBtn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = `
                <div class="welcome-message text-center p-4">
                    <i class="fas fa-robot fa-3x text-primary mb-3"></i>
                    <h5>Hi! I'm your AI assistant</h5>
                    <p class="text-muted">Ask me anything about the video content. I'm here to help!</p>
                </div>
            `;
            app.chatMessages = [];
        });
    }
    
    // Add back to top functionality
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopBtn.style.display = 'block';
            } else {
                backToTopBtn.style.display = 'none';
            }
        });
        
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Add form validation
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    if (youtubeUrlInput) {
        youtubeUrlInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            const isValid = app.isValidYouTubeUrl(url) || url === '';
            
            if (isValid) {
                e.target.classList.remove('is-invalid');
                e.target.classList.add('is-valid');
            } else {
                e.target.classList.remove('is-valid');
                e.target.classList.add('is-invalid');
            }
        });
    }
    
    // Add Enter key support for chat input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                app.sendChatMessage();
            }
        });
    }
    
    // Add progress bar animation during processing
    const originalShowLoading = app.showLoading;
    app.showLoading = function(text) {
        originalShowLoading.call(this, text);
        
        // Animate progress bar
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 90) progress = 90;
                progressBar.style.width = progress + '%';
                
                if (!document.getElementById('loadingSpinner').classList.contains('d-none')) {
                    clearInterval(interval);
                    progressBar.style.width = '100%';
                }
            }, 200);
        }
    };
});
