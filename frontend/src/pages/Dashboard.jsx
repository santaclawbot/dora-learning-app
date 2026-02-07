import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function Dashboard() {
  const [lessons, setLessons] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const selectedProfile = localStorage.getItem('selectedProfile')
    
    if (!storedUser) {
      navigate('/login')
      return
    }
    
    // Check if a profile is selected
    if (!selectedProfile) {
      navigate('/profile-select')
      return
    }
    
    setUser(JSON.parse(storedUser))
    fetchLessons()
  }, [navigate])

  const fetchLessons = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/lessons`)
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
    localStorage.removeItem('selectedProfile')
    navigate('/login')
  }

  const handleSwitchProfile = () => {
    localStorage.removeItem('selectedProfile')
    navigate('/profile-select')
  }

  const getLessonEmoji = (index) => {
    const emojis = ['🌟', '🌈', '🔢', '🎨', '🎵', '📚']
    return emojis[index % emojis.length]
  }

  const getLessonColor = (index) => {
    const colors = ['#FFD93D', '#88CAAF', '#FF8B66', '#6B4875', '#87CEEB', '#DDA0DD']
    return colors[index % colors.length]
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="user-info">
          <span className="user-avatar">{user?.avatar || '🌟'}</span>
          <span className="user-greeting">Hi, {user?.name}!</span>
        </div>
        <div className="header-actions">
          <button onClick={handleSwitchProfile} className="switch-btn" title="Switch Profile">
            🔄
          </button>
          <button onClick={handleLogout} className="logout-btn" title="Sign Out">
            👋
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="welcome-section">
          <h1>What do you want to learn today? 🎓</h1>
        </section>

        <section className="lessons-section">
          {loading ? (
            <div className="loading-state">
              <span className="loading-emoji">📚</span>
              <p>Loading lessons...</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="empty-state">
              <span className="empty-emoji">🔜</span>
              <p>New lessons coming soon!</p>
            </div>
          ) : (
            <div className="lessons-grid">
              {lessons.map((lesson, index) => (
                <Link
                  key={lesson.id}
                  to={`/lesson/${lesson.id}`}
                  className="lesson-card"
                  style={{ backgroundColor: getLessonColor(index) }}
                >
                  <span className="lesson-emoji">{getLessonEmoji(index)}</span>
                  <h3 className="lesson-title">{lesson.title}</h3>
                  <p className="lesson-desc">{lesson.description}</p>
                  <div className="lesson-meta">
                    <span className="duration">⏱️ {lesson.duration_minutes || 10} min</span>
                    <span className="play-icon">▶️</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <nav className="bottom-nav">
        <Link to="/dashboard" className="nav-item active">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </Link>
        <Link to="/progress" className="nav-item">
          <span className="nav-icon">⭐</span>
          <span className="nav-label">Progress</span>
        </Link>
        <Link to="/profile" className="nav-item">
          <span className="nav-icon">👤</span>
          <span className="nav-label">Me</span>
        </Link>
      </nav>

      <style>{`
        .dashboard {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(180deg, #6B4875 0%, #88CAAF 100%);
          font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
          padding-bottom: 80px;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: rgba(255,255,255,0.1);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          font-size: 40px;
          background: white;
          border-radius: 50%;
          width: 55px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .user-greeting {
          font-size: 1.4rem;
          font-weight: bold;
          color: white;
          text-shadow: 2px 2px 0 rgba(0,0,0,0.2);
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .switch-btn, .logout-btn {
          font-size: 26px;
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .switch-btn:hover, .logout-btn:hover {
          transform: scale(1.1);
          background: rgba(255,255,255,0.3);
        }

        .dashboard-main {
          padding: 20px;
        }

        .welcome-section h1 {
          color: white;
          font-size: 1.6rem;
          text-align: center;
          margin-bottom: 25px;
          text-shadow: 2px 2px 0 rgba(0,0,0,0.2);
        }

        .lessons-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        @media (min-width: 500px) {
          .lessons-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .lesson-card {
          display: flex;
          flex-direction: column;
          padding: 25px;
          border-radius: 25px;
          color: white;
          text-decoration: none;
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
          transition: all 0.3s ease;
          min-height: 180px;
        }

        .lesson-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 15px 35px rgba(0,0,0,0.3);
        }

        .lesson-emoji {
          font-size: 45px;
          margin-bottom: 10px;
        }

        .lesson-title {
          font-size: 1.3rem;
          margin-bottom: 8px;
          text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
        }

        .lesson-desc {
          font-size: 0.95rem;
          opacity: 0.95;
          flex-grow: 1;
          text-shadow: 1px 1px 0 rgba(0,0,0,0.1);
        }

        .lesson-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 15px;
          font-size: 0.9rem;
        }

        .duration {
          background: rgba(255,255,255,0.2);
          padding: 5px 12px;
          border-radius: 15px;
        }

        .play-icon {
          font-size: 1.5rem;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: white;
        }

        .loading-emoji, .empty-emoji {
          font-size: 60px;
          display: block;
          margin-bottom: 15px;
          animation: bounce 1s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          display: flex;
          justify-content: space-around;
          padding: 12px 0 20px;
          box-shadow: 0 -5px 20px rgba(0,0,0,0.1);
          border-radius: 20px 20px 0 0;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          color: #888;
          font-size: 0.85rem;
          transition: color 0.2s;
        }

        .nav-item.active {
          color: #6B4875;
        }

        .nav-icon {
          font-size: 28px;
          margin-bottom: 4px;
        }

        .nav-label {
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}
