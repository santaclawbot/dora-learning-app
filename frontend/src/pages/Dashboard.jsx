import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import ProfileSwitcher from '../components/ProfileSwitcher'
import '../styles/Dashboard.css'

export default function Dashboard() {
  const [lessons, setLessons] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchLessons()
  }, [navigate])

  const fetchLessons = async () => {
    try {
      const response = await axios.get('/api/lessons')
      setLessons(response.data.lessons || [])
    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🎓 Dora Learning</h1>
        </div>
        <div className="header-right">
          <ProfileSwitcher user={user} />
          <Link to="/profile" className="profile-link">Profile</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="welcome-section">
          <h2>Welcome back, {user?.name}! 👋</h2>
          <p>Continue your learning journey and master new skills.</p>
        </section>

        <section className="lessons-section">
          <h3>📚 Available Lessons</h3>
          {loading ? (
            <p>Loading lessons...</p>
          ) : lessons.length === 0 ? (
            <p>No lessons available yet. Check back soon!</p>
          ) : (
            <div className="lessons-grid">
              {lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  to={`/lesson/${lesson.id}`}
                  className="lesson-card"
                >
                  <div className="lesson-header">
                    <h4>{lesson.title}</h4>
                    <span className="difficulty">{lesson.difficulty}</span>
                  </div>
                  <p>{lesson.description}</p>
                  <div className="lesson-footer">
                    {lesson.duration_minutes && (
                      <span className="duration">⏱️ {lesson.duration_minutes} min</span>
                    )}
                    <span className="cta">Start →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
