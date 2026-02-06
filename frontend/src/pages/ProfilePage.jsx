import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../styles/ProfilePage.css'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchProfile()
  }, [navigate])

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/users/profile')
      setProfile(response.data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <Link to="/dashboard" className="back-btn">← Dashboard</Link>
        <h1>👤 My Profile</h1>
      </header>

      <main className="profile-content">
        <div className="profile-card">
          <section className="profile-info">
            <h2>{profile?.name || user?.name || 'User'}</h2>
            <p className="email">{profile?.email || user?.email || 'N/A'}</p>
            <p className="joined">Member since {new Date().toLocaleDateString()}</p>

            {!editing && (
              <button 
                className="edit-btn"
                onClick={() => setEditing(true)}
              >
                ✏️ Edit Profile
              </button>
            )}
          </section>

          <section className="stats-section">
            <h3>📊 Your Statistics</h3>
            <div className="stats-grid">
              <div className="stat">
                <div className="stat-value">0</div>
                <div className="stat-label">Lessons Completed</div>
              </div>
              <div className="stat">
                <div className="stat-value">0</div>
                <div className="stat-label">Streak Days</div>
              </div>
              <div className="stat">
                <div className="stat-value">0%</div>
                <div className="stat-label">Overall Progress</div>
              </div>
            </div>
          </section>

          <section className="preferences-section">
            <h3>⚙️ Preferences</h3>
            <div className="preference">
              <label>
                <input type="checkbox" defaultChecked />
                Enable email notifications
              </label>
            </div>
            <div className="preference">
              <label>
                <input type="checkbox" defaultChecked />
                Enable voice feedback
              </label>
            </div>
            <div className="preference">
              <label>
                <input type="checkbox" />
                Dark mode
              </label>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
