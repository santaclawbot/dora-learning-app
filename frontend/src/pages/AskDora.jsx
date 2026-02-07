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
  
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [playingAudioId, setPlayingAudioId] = useState(null)
  const [profile, setProfile] = useState(null)

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
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: response.data.greeting,
        audioUrl: response.data.audioUrl
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
      
      const doraMessage = {
        id: `dora-${Date.now()}`,
        role: 'assistant',
        content: response.data.response,
        audioUrl: response.data.audioUrl
      }
      
      setMessages(prev => [...prev, doraMessage])
      
      // Auto-play Dora's response
      if (response.data.audioUrl) {
        playAudio(doraMessage.id, response.data.audioUrl)
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
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Dora anything..."
            disabled={isLoading}
            className="chat-input"
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || isLoading}
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
