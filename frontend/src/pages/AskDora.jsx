import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const SUGGESTED_QUESTIONS = [
  "Why is the sky blue? 🌈",
  "How do butterflies fly? 🦋",
  "Why do dogs bark? 🐕",
  "Where does the sun go at night? 🌙"
]

export default function AskDora() {
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const audioRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [playingAudioId, setPlayingAudioId] = useState(null)
  const [profile, setProfile] = useState(null)
  
  // Camera/Photo state
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedProfile = localStorage.getItem('selectedProfile')
    
    if (!token) {
      navigate('/login')
      return
    }
    
    if (!storedProfile) {
      navigate('/profile-select')
      return
    }
    
    setProfile(JSON.parse(storedProfile))
    initConversation()
  }, [navigate])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initConversation = async () => {
    try {
      const token = localStorage.getItem('token')
      const storedProfile = localStorage.getItem('selectedProfile')
      const profileData = JSON.parse(storedProfile)
      
      const response = await axios.post(
        `${API_URL}/api/ask-dora/new`,
        { profileId: profileData.id },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setConversationId(response.data.conversationId)
      
      // Add Dora's greeting as first message
      // API returns greeting as { text: string, audioUrl: string|null }
      const greeting = response.data.greeting
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: typeof greeting === 'string' ? greeting : greeting.text,
        audioUrl: typeof greeting === 'string' ? response.data.audioUrl : greeting.audioUrl
      }])
    } catch (error) {
      console.error('Error initializing conversation:', error)
      // Still show a fallback greeting
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: "Hi there, little explorer! 🌟 I'm Dora, your learning buddy! What would you like to know today?",
        audioUrl: null
      }])
    } finally {
      setIsInitializing(false)
    }
  }

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return
    
    // Clean up the question text (remove emoji at end if from suggested)
    const cleanText = text.replace(/\s*[🌈🦋🐕🌙]\s*$/, '').trim()
    
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: cleanText
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    
    // Focus back on input after sending
    setTimeout(() => inputRef.current?.focus(), 100)
    
    try {
      const token = localStorage.getItem('token')
      const storedProfile = localStorage.getItem('selectedProfile')
      const profileData = JSON.parse(storedProfile)
      
      const response = await axios.post(
        `${API_URL}/api/ask-dora/message`,
        {
          conversationId,
          profileId: profileData.id,
          message: cleanText
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // API returns response as { id, text, audioUrl, timestamp } or string (legacy)
      const responseData = response.data.response
      const doraMessage = {
        id: `dora-${Date.now()}`,
        role: 'assistant',
        content: typeof responseData === 'string' ? responseData : responseData.text,
        audioUrl: typeof responseData === 'string' ? response.data.audioUrl : responseData.audioUrl
      }
      
      setMessages(prev => [...prev, doraMessage])
      
      // Auto-play Dora's response
      if (doraMessage.audioUrl) {
        playAudio(doraMessage.id, doraMessage.audioUrl)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Oops! My thinking cap fell off! 🎩 Can you ask me again?",
        audioUrl: null
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  const handleSuggestedQuestion = (question) => {
    sendMessage(question)
  }

  const playAudio = (messageId, audioUrl) => {
    if (!audioRef.current) return
    
    // Stop current audio if playing
    if (playingAudioId) {
      audioRef.current.pause()
      if (playingAudioId === messageId) {
        setPlayingAudioId(null)
        return
      }
    }
    
    const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${API_URL}${audioUrl}`
    audioRef.current.src = fullUrl
    audioRef.current.play()
    setPlayingAudioId(messageId)
  }

  const handleAudioEnd = () => {
    setPlayingAudioId(null)
  }

  const handleAudioError = () => {
    setPlayingAudioId(null)
    console.error('Audio playback error')
  }

  // ========== CAMERA/PHOTO FUNCTIONS ==========
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      setCameraStream(stream)
      setShowCamera(true)
      
      // Wait for ref to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch (err) {
      console.error('Camera error:', err)
      // Fall back to file upload
      fileInputRef.current?.click()
    }
  }
  
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }
  
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        setCapturedImage({ blob, url })
        stopCamera()
      }
    }, 'image/jpeg', 0.9)
  }
  
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image! 📷')
      return
    }
    
    const url = URL.createObjectURL(file)
    setCapturedImage({ blob: file, url })
  }
  
  const cancelPhoto = () => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url)
    }
    setCapturedImage(null)
    stopCamera()
  }
  
  const analyzePhoto = async () => {
    if (!capturedImage || isAnalyzingImage) return
    
    setIsAnalyzingImage(true)
    
    // Add user message with photo
    const userMessage = {
      id: `user-photo-${Date.now()}`,
      role: 'user',
      content: '📷 Look at this!',
      imageUrl: capturedImage.url
    }
    setMessages(prev => [...prev, userMessage])
    
    try {
      const token = localStorage.getItem('token')
      const storedProfile = localStorage.getItem('selectedProfile')
      const profileData = JSON.parse(storedProfile)
      
      const formData = new FormData()
      formData.append('image', capturedImage.blob, 'photo.jpg')
      formData.append('profileId', profileData.id)
      formData.append('profileName', profileData.name)
      formData.append('profileAge', profileData.age || 5)
      
      const response = await axios.post(
        `${API_URL}/api/vision/analyze`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      
      const doraMessage = {
        id: `dora-vision-${Date.now()}`,
        role: 'assistant',
        content: response.data.description,
        audioUrl: response.data.audioUrl
      }
      setMessages(prev => [...prev, doraMessage])
      
      // Auto-play response
      if (response.data.audioUrl) {
        playAudio(doraMessage.id, response.data.audioUrl)
      }
      
    } catch (error) {
      console.error('Vision analysis error:', error)
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error.response?.data?.error || "Oops! I couldn't see that picture clearly. Try again! 📸",
        audioUrl: null
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsAnalyzingImage(false)
      cancelPhoto()
    }
  }

  if (isInitializing) {
    return (
      <div className="ask-dora-loading">
        <div className="dora-avatar-large">🦊</div>
        <p>Dora is getting ready...</p>
        <div className="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <style>{loadingStyles}</style>
      </div>
    )
  }

  const showSuggestions = messages.length <= 1

  return (
    <div className="ask-dora-page">
      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnd}
        onError={handleAudioError}
      />
      
      {/* Hidden elements */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      
      {/* Camera Modal */}
      {showCamera && (
        <div className="camera-modal">
          <div className="camera-container">
            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
            <div className="camera-controls">
              <button onClick={stopCamera} className="camera-btn cancel">✕</button>
              <button onClick={capturePhoto} className="camera-btn capture">📸</button>
              <button onClick={() => { stopCamera(); fileInputRef.current?.click() }} className="camera-btn upload">📁</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Image Preview Modal */}
      {capturedImage && !showCamera && (
        <div className="camera-modal">
          <div className="preview-container">
            <img src={capturedImage.url} alt="Captured" className="preview-image" />
            <p className="preview-text">Send this photo to Dora? 🌟</p>
            <div className="preview-controls">
              <button onClick={cancelPhoto} className="preview-btn cancel" disabled={isAnalyzingImage}>
                🔄 Retake
              </button>
              <button onClick={analyzePhoto} className="preview-btn send" disabled={isAnalyzingImage}>
                {isAnalyzingImage ? '👀 Looking...' : '✨ Send to Dora!'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="chat-header">
        <Link to="/dashboard" className="back-btn">
          ← Back
        </Link>
        <div className="header-title">
          <span className="dora-icon">🦊</span>
          <span>Ask Dora</span>
        </div>
        <div className="header-spacer"></div>
      </header>

      {/* Messages Area */}
      <main className="chat-main">
        <div className="messages-container">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`message ${msg.role === 'user' ? 'user-message' : 'dora-message'}`}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? (profile?.avatar || '👧') : '🦊'}
              </div>
              <div className="message-bubble">
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Photo" className="message-image" />
                )}
                <p className="message-text">{msg.content}</p>
                {msg.role === 'assistant' && msg.audioUrl && (
                  <button 
                    className={`audio-btn ${playingAudioId === msg.id ? 'playing' : ''}`}
                    onClick={() => playAudio(msg.id, msg.audioUrl)}
                  >
                    {playingAudioId === msg.id ? '⏸️ Pause' : '🔊 Listen'}
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="message dora-message">
              <div className="message-avatar">🦊</div>
              <div className="message-bubble thinking">
                <p className="thinking-text">
                  Dora is thinking
                  <span className="thinking-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {showSuggestions && !isLoading && (
          <div className="suggestions-container">
            <p className="suggestions-label">Try asking:</p>
            <div className="suggestions-grid">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  className="suggestion-btn"
                  onClick={() => handleSuggestedQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="chat-footer">
        <form onSubmit={handleSubmit} className="input-form">
          <button 
            type="button"
            onClick={startCamera}
            disabled={isLoading || isAnalyzingImage}
            className="camera-input-btn"
            title="Take a photo"
          >
            📷
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Dora anything..."
            disabled={isLoading || isAnalyzingImage}
            className="chat-input"
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || isLoading || isAnalyzingImage}
            className="send-btn"
          >
            🚀
          </button>
        </form>
      </footer>

      <style>{pageStyles}</style>
    </div>
  )
}

const loadingStyles = `
  .ask-dora-loading {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #FF9A56 0%, #FFCD67 100%);
    font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
    color: white;
    text-align: center;
  }
  
  .dora-avatar-large {
    font-size: 100px;
    margin-bottom: 20px;
    animation: bounce 1s infinite;
  }
  
  .ask-dora-loading p {
    font-size: 1.5rem;
    margin-bottom: 15px;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.1);
  }
  
  .loading-dots {
    display: flex;
    gap: 8px;
  }
  
  .loading-dots span {
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    animation: dotPulse 1.4s infinite ease-in-out both;
  }
  
  .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
  .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
  }
  
  @keyframes dotPulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }
`

const pageStyles = `
  .ask-dora-page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #FFF5EB 0%, #FFE8D6 100%);
    font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
  }

  /* Header */
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background: linear-gradient(135deg, #FF9A56 0%, #FFCD67 100%);
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }

  .back-btn {
    color: white;
    text-decoration: none;
    font-size: 1.1rem;
    font-weight: bold;
    padding: 10px 16px;
    background: rgba(255,255,255,0.25);
    border-radius: 20px;
    transition: background 0.2s;
  }

  .back-btn:hover {
    background: rgba(255,255,255,0.35);
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.4rem;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.1);
  }

  .dora-icon {
    font-size: 1.8rem;
  }

  .header-spacer {
    width: 80px;
  }

  /* Messages Area */
  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    padding-bottom: 10px;
  }

  .message {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    animation: messageIn 0.3s ease-out;
  }

  @keyframes messageIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .user-message {
    flex-direction: row-reverse;
  }

  .message-avatar {
    width: 50px;
    height: 50px;
    font-size: 30px;
    background: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
    flex-shrink: 0;
  }

  .message-bubble {
    max-width: 75%;
    padding: 16px 20px;
    border-radius: 25px;
    box-shadow: 0 3px 15px rgba(0,0,0,0.08);
  }

  .dora-message .message-bubble {
    background: white;
    border-bottom-left-radius: 8px;
  }

  .user-message .message-bubble {
    background: linear-gradient(135deg, #6B4875 0%, #8B5A9E 100%);
    color: white;
    border-bottom-right-radius: 8px;
  }

  .message-text {
    font-size: 1.1rem;
    line-height: 1.6;
    margin: 0;
  }

  .audio-btn {
    margin-top: 12px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #FF9A56 0%, #FFCD67 100%);
    border: none;
    border-radius: 20px;
    font-size: 1rem;
    font-weight: bold;
    color: white;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 3px 10px rgba(255,154,86,0.3);
  }

  .audio-btn:hover {
    transform: scale(1.05);
  }

  .audio-btn.playing {
    background: linear-gradient(135deg, #88CAAF 0%, #6B9E8A 100%);
    box-shadow: 0 3px 10px rgba(136,202,175,0.4);
  }

  /* Thinking Animation */
  .message-bubble.thinking {
    background: #f0f0f0;
  }

  .thinking-text {
    font-size: 1.1rem;
    color: #888;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .thinking-dots span {
    animation: thinkingDot 1.4s infinite;
    font-weight: bold;
  }

  .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
  .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes thinkingDot {
    0%, 60%, 100% { opacity: 0.3; }
    30% { opacity: 1; }
  }

  /* Suggested Questions */
  .suggestions-container {
    padding: 15px 20px;
    background: rgba(255,255,255,0.5);
    border-top: 1px solid rgba(0,0,0,0.05);
  }

  .suggestions-label {
    font-size: 1rem;
    color: #888;
    margin-bottom: 12px;
    text-align: center;
  }

  .suggestions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  @media (max-width: 400px) {
    .suggestions-grid {
      grid-template-columns: 1fr;
    }
  }

  .suggestion-btn {
    padding: 14px 16px;
    background: white;
    border: 2px solid #FF9A56;
    border-radius: 20px;
    font-size: 0.95rem;
    color: #FF9A56;
    cursor: pointer;
    font-family: inherit;
    font-weight: bold;
    transition: all 0.2s;
    text-align: left;
  }

  .suggestion-btn:hover {
    background: #FF9A56;
    color: white;
    transform: scale(1.02);
  }

  .suggestion-btn:active {
    transform: scale(0.98);
  }

  /* Input Area */
  .chat-footer {
    padding: 15px 20px;
    padding-bottom: max(15px, env(safe-area-inset-bottom));
    background: white;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
  }

  .input-form {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .chat-input {
    flex: 1;
    padding: 16px 22px;
    font-size: 1.1rem;
    border: 3px solid #FFD93D;
    border-radius: 30px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .chat-input:focus {
    border-color: #FF9A56;
    box-shadow: 0 0 0 4px rgba(255,154,86,0.2);
  }

  .chat-input:disabled {
    background: #f5f5f5;
    color: #999;
  }

  .chat-input::placeholder {
    color: #bbb;
  }

  .send-btn {
    width: 60px;
    height: 60px;
    font-size: 1.8rem;
    background: linear-gradient(135deg, #FF9A56 0%, #FFCD67 100%);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 15px rgba(255,154,86,0.4);
  }

  .send-btn:hover:not(:disabled) {
    transform: scale(1.1);
  }

  .send-btn:active:not(:disabled) {
    transform: scale(0.95);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Camera button in input */
  .camera-input-btn {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
    background: linear-gradient(135deg, #88CAAF 0%, #6B9E8A 100%);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 3px 10px rgba(136, 202, 175, 0.3);
    flex-shrink: 0;
  }

  .camera-input-btn:hover:not(:disabled) {
    transform: scale(1.1);
  }

  .camera-input-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Message images */
  .message-image {
    max-width: 100%;
    max-height: 200px;
    border-radius: 15px;
    margin-bottom: 10px;
    object-fit: cover;
  }

  /* Camera Modal */
  .camera-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .camera-container {
    width: 100%;
    max-width: 500px;
    position: relative;
  }

  .camera-video {
    width: 100%;
    border-radius: 20px;
    background: #000;
  }

  .camera-controls {
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 20px;
  }

  .camera-btn {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: none;
    font-size: 1.8rem;
    cursor: pointer;
    transition: transform 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .camera-btn.capture {
    width: 80px;
    height: 80px;
    background: white;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }

  .camera-btn.cancel {
    background: rgba(255,255,255,0.2);
    color: white;
  }

  .camera-btn.upload {
    background: rgba(255,255,255,0.2);
    color: white;
  }

  .camera-btn:hover {
    transform: scale(1.1);
  }

  /* Preview Modal */
  .preview-container {
    width: 100%;
    max-width: 400px;
    text-align: center;
  }

  .preview-image {
    width: 100%;
    max-height: 50vh;
    object-fit: contain;
    border-radius: 20px;
    margin-bottom: 20px;
  }

  .preview-text {
    color: white;
    font-size: 1.3rem;
    margin-bottom: 20px;
    font-family: inherit;
  }

  .preview-controls {
    display: flex;
    gap: 15px;
    justify-content: center;
  }

  .preview-btn {
    padding: 15px 30px;
    border-radius: 30px;
    border: none;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.2s, opacity 0.2s;
  }

  .preview-btn.cancel {
    background: rgba(255,255,255,0.2);
    color: white;
  }

  .preview-btn.send {
    background: linear-gradient(135deg, #FFD93D 0%, #FF8B66 100%);
    color: white;
  }

  .preview-btn:hover:not(:disabled) {
    transform: scale(1.05);
  }

  .preview-btn:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  /* Tablet optimizations */
  @media (min-width: 768px) {
    .messages-container {
      max-width: 700px;
      margin: 0 auto;
      width: 100%;
    }

    .suggestions-container {
      max-width: 700px;
      margin: 0 auto;
    }

    .chat-footer {
      max-width: 700px;
      margin: 0 auto;
      border-radius: 30px 30px 0 0;
    }

    .message-bubble {
      max-width: 60%;
    }

    .header-title {
      font-size: 1.6rem;
    }

    .dora-icon {
      font-size: 2rem;
    }
  }
`
