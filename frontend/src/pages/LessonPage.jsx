import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import '../styles/LessonPage.css'

export default function LessonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    fetchLesson()
  }, [id])

  const fetchLesson = async () => {
    try {
      const response = await axios.get(`/api/lessons/${id}`)
      setLesson(response.data)
    } catch (error) {
      console.error('Error fetching lesson:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayAudio = () => {
    setIsPlaying(!isPlaying)
    // TODO: Integrate ElevenLabs for voice synthesis
  }

  const handleCompleteLesson = async () => {
    try {
      // TODO: Send completion to backend
      setProgress(100)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    } catch (error) {
      console.error('Error completing lesson:', error)
    }
  }

  if (loading) {
    return (
      <div className="lesson-loading">
        <p>Loading lesson...</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="lesson-error">
        <p>Lesson not found</p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    )
  }

  return (
    <div className="lesson-page">
      <header className="lesson-header">
        <Link to="/dashboard" className="back-btn">← Dashboard</Link>
        <h1>{lesson.title}</h1>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </header>

      <main className="lesson-content">
        <article className="lesson-main">
          <h2>📖 Lesson Content</h2>
          <div className="lesson-text">
            {lesson.content || 'No content available yet. Check back soon!'}
          </div>

          <section className="audio-section">
            <h3>🎧 Listen to This Lesson</h3>
            <button 
              className="audio-btn"
              onClick={handlePlayAudio}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play Audio'}
            </button>
            <p className="audio-note">Voice synthesis powered by ElevenLabs</p>
          </section>

          {lesson.exercises && lesson.exercises.length > 0 && (
            <section className="exercises-section">
              <h3>💪 Practice Exercises</h3>
              {lesson.exercises.map((exercise, idx) => (
                <div key={idx} className="exercise">
                  <p>{exercise.question}</p>
                  {/* TODO: Implement exercise interaction */}
                </div>
              ))}
            </section>
          )}

          <div className="lesson-actions">
            <button 
              className="complete-btn"
              onClick={handleCompleteLesson}
            >
              ✅ Mark as Complete
            </button>
          </div>
        </article>

        <aside className="lesson-sidebar">
          <div className="lesson-info">
            <h4>Lesson Info</h4>
            <dl>
              <dt>Duration:</dt>
              <dd>{lesson.duration_minutes || '—'} minutes</dd>
              <dt>Level:</dt>
              <dd>{lesson.difficulty || 'Unrated'}</dd>
              <dt>Progress:</dt>
              <dd>{progress}%</dd>
            </dl>
          </div>
        </aside>
      </main>
    </div>
  )
}
