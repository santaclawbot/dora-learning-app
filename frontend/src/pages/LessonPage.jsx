import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function LessonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const audioRef = useRef(null)
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [useFallbackTTS, setUseFallbackTTS] = useState(false)
  const synthRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    fetchLesson()
    
    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis
    
    return () => {
      // Cleanup speech synthesis on unmount
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [id, navigate])

  const fetchLesson = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/lessons/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLesson(response.data)
    } catch (error) {
      console.error('Error fetching lesson:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAudio = async () => {
    if (audioUrl) return audioUrl
    if (useFallbackTTS) return null
    
    setAudioLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_URL}/api/lessons/${id}/audio`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const fullUrl = `${API_URL}${response.data.audioUrl}`
      setAudioUrl(fullUrl)
      return fullUrl
    } catch (error) {
      console.error('ElevenLabs TTS unavailable, using browser TTS fallback')
      setUseFallbackTTS(true)
      return null
    } finally {
      setAudioLoading(false)
    }
  }

  const playFallbackTTS = () => {
    if (!synthRef.current || !lesson?.content) return
    
    // Cancel any ongoing speech
    synthRef.current.cancel()
    
    const utterance = new SpeechSynthesisUtterance(lesson.content)
    
    // Try to find a nice female voice (like Dora!)
    const voices = synthRef.current.getVoices()
    const preferredVoice = voices.find(v => 
      v.name.includes('Samantha') || 
      v.name.includes('Karen') ||
      v.name.includes('Victoria') ||
      (v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
    ) || voices.find(v => v.lang.startsWith('en'))
    
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }
    
    utterance.rate = 0.9 // Slightly slower for kids
    utterance.pitch = 1.1 // Slightly higher pitch
    
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)
    
    synthRef.current.speak(utterance)
    setIsPlaying(true)
  }

  const stopFallbackTTS = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsPlaying(false)
    }
  }

  const handlePlayAudio = async () => {
    if (isPlaying) {
      if (useFallbackTTS) {
        stopFallbackTTS()
      } else {
        audioRef.current?.pause()
        setIsPlaying(false)
      }
      return
    }

    // Try ElevenLabs first
    let url = await loadAudio()
    
    if (url && audioRef.current) {
      audioRef.current.src = url
      audioRef.current.play()
      setIsPlaying(true)
    } else {
      // Use browser TTS as fallback
      playFallbackTTS()
    }
  }

  const handleAudioEnd = () => {
    setIsPlaying(false)
  }

  const handleComplete = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${API_URL}/api/lessons/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCompleted(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (error) {
      console.error('Error completing lesson:', error)
      // Still show completion even if API fails
      setCompleted(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    }
  }

  if (loading) {
    return (
      <div className="lesson-loading">
        <span className="loading-emoji">📖</span>
        <p>Loading your lesson...</p>
        <style>{loadingStyles}</style>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="lesson-error">
        <span className="error-emoji">😅</span>
        <p>Oops! Lesson not found</p>
        <Link to="/dashboard" className="back-link">Go Back Home</Link>
        <style>{loadingStyles}</style>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="lesson-complete">
        <span className="complete-emoji">🎉</span>
        <h1>Amazing Job!</h1>
        <p>You completed the lesson!</p>
        <div className="stars">⭐⭐⭐</div>
        <style>{completeStyles}</style>
      </div>
    )
  }

  return (
    <div className="lesson-page">
      <audio ref={audioRef} onEnded={handleAudioEnd} />
      
      <header className="lesson-header">
        <Link to="/dashboard" className="back-btn">
          ← Back
        </Link>
        <span className="lesson-badge">{lesson.difficulty || 'Easy'}</span>
      </header>

      <main className="lesson-main">
        <div className="lesson-hero">
          <h1>{lesson.title}</h1>
        </div>

        <div className="audio-player">
          <button 
            className={`play-btn ${isPlaying ? 'playing' : ''} ${audioLoading ? 'loading' : ''}`}
            onClick={handlePlayAudio}
            disabled={audioLoading}
          >
            {audioLoading ? (
              <>🎙️ Getting Dora's voice...</>
            ) : isPlaying ? (
              <>⏸️ Pause</>
            ) : (
              <>▶️ Hear Dora Read</>
            )}
          </button>
          {isPlaying && (
            <div className="audio-wave">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          )}
          {useFallbackTTS && !audioLoading && (
            <p className="tts-note">🔊 Using your device's voice</p>
          )}
        </div>

        <div className="lesson-content">
          {lesson.content?.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <div className="lesson-actions">
          <button className="complete-btn" onClick={handleComplete}>
            ✅ I'm Done!
          </button>
        </div>
      </main>

      <style>{pageStyles}</style>
    </div>
  )
}

const loadingStyles = `
  .lesson-loading, .lesson-error {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6B4875 0%, #88CAAF 100%);
    color: white;
    font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
  }
  .loading-emoji, .error-emoji {
    font-size: 80px;
    margin-bottom: 20px;
    animation: bounce 1s infinite;
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
  }
  p { font-size: 1.4rem; }
  .back-link {
    margin-top: 20px;
    color: #FFD93D;
    font-size: 1.2rem;
  }
`

const completeStyles = `
  .lesson-complete {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #FFD93D 0%, #FF8B66 100%);
    color: white;
    font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
    text-align: center;
    padding: 20px;
  }
  .complete-emoji {
    font-size: 100px;
    animation: pop 0.5s ease-out;
  }
  @keyframes pop {
    0% { transform: scale(0); }
    80% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  h1 {
    font-size: 2.5rem;
    margin: 20px 0 10px;
    text-shadow: 3px 3px 0 rgba(0,0,0,0.2);
  }
  p { font-size: 1.4rem; opacity: 0.9; }
  .stars {
    font-size: 50px;
    margin-top: 20px;
    animation: pulse 1s infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`

const pageStyles = `
  .lesson-page {
    min-height: 100vh;
    min-height: 100dvh;
    background: #FFF9F0;
    font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
  }

  .lesson-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background: #6B4875;
  }

  .back-btn {
    color: white;
    text-decoration: none;
    font-size: 1.1rem;
    font-weight: bold;
    padding: 8px 15px;
    background: rgba(255,255,255,0.2);
    border-radius: 20px;
    transition: background 0.2s;
  }

  .back-btn:hover {
    background: rgba(255,255,255,0.3);
  }

  .lesson-badge {
    background: #FFD93D;
    color: #6B4875;
    padding: 6px 15px;
    border-radius: 20px;
    font-weight: bold;
    font-size: 0.9rem;
  }

  .lesson-main {
    padding: 20px;
    max-width: 600px;
    margin: 0 auto;
  }

  .lesson-hero h1 {
    color: #6B4875;
    font-size: 1.8rem;
    text-align: center;
    margin-bottom: 25px;
  }

  .audio-player {
    background: linear-gradient(135deg, #88CAAF 0%, #6B4875 100%);
    border-radius: 25px;
    padding: 20px;
    margin-bottom: 25px;
    text-align: center;
  }

  .play-btn {
    background: white;
    border: none;
    padding: 18px 35px;
    font-size: 1.2rem;
    font-weight: bold;
    color: #6B4875;
    border-radius: 50px;
    cursor: pointer;
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
    font-family: inherit;
  }

  .play-btn:hover:not(:disabled) {
    transform: scale(1.05);
  }

  .play-btn.playing {
    background: #FFD93D;
  }

  .play-btn.loading {
    opacity: 0.8;
  }

  .play-btn:disabled {
    cursor: wait;
  }

  .audio-wave {
    display: flex;
    justify-content: center;
    gap: 5px;
    margin-top: 15px;
  }

  .audio-wave span {
    width: 8px;
    height: 30px;
    background: white;
    border-radius: 4px;
    animation: wave 0.5s infinite alternate;
  }

  .audio-wave span:nth-child(2) { animation-delay: 0.1s; }
  .audio-wave span:nth-child(3) { animation-delay: 0.2s; }
  .audio-wave span:nth-child(4) { animation-delay: 0.3s; }
  .audio-wave span:nth-child(5) { animation-delay: 0.4s; }

  @keyframes wave {
    from { height: 10px; }
    to { height: 35px; }
  }

  .tts-note {
    color: white;
    font-size: 0.85rem;
    margin-top: 12px;
    opacity: 0.9;
  }

  .lesson-content {
    background: white;
    border-radius: 25px;
    padding: 25px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
    margin-bottom: 25px;
  }

  .lesson-content p {
    color: #444;
    font-size: 1.15rem;
    line-height: 1.8;
    margin-bottom: 15px;
  }

  .lesson-content p:last-child {
    margin-bottom: 0;
  }

  .lesson-actions {
    text-align: center;
    padding-bottom: 30px;
  }

  .complete-btn {
    background: linear-gradient(135deg, #FFD93D 0%, #FF8B66 100%);
    border: none;
    padding: 20px 50px;
    font-size: 1.4rem;
    font-weight: bold;
    color: white;
    border-radius: 50px;
    cursor: pointer;
    box-shadow: 0 8px 25px rgba(255,139,102,0.4);
    transition: all 0.3s ease;
    font-family: inherit;
  }

  .complete-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(255,139,102,0.5);
  }
`
