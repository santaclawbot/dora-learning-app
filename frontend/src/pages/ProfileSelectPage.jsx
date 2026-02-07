import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ProfileSelectPage() {
  const [profiles, setProfiles] = useState([])
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user')
    if (!user) {
      navigate('/login')
      return
    }

    // Get profiles from user data
    const userData = JSON.parse(user)
    if (userData.profiles && userData.profiles.length > 0) {
      setProfiles(userData.profiles)
    } else {
      // Fallback profiles if none stored
      setProfiles([
        { id: 'aiden', name: 'Aiden', avatar: '🦁' },
        { id: 'marcus', name: 'Marcus', avatar: '🐻' }
      ])
    }
  }, [navigate])

  const handleSelectProfile = (profile) => {
    setSelectedProfile(profile)
  }

  const handleContinue = () => {
    if (!selectedProfile) return
    
    setLoading(true)
    
    // Store selected profile
    localStorage.setItem('selectedProfile', JSON.stringify(selectedProfile))
    
    // Update user data with selected profile for display
    const userData = JSON.parse(localStorage.getItem('user'))
    userData.currentProfile = selectedProfile
    userData.name = selectedProfile.name
    userData.avatar = selectedProfile.avatar
    localStorage.setItem('user', JSON.stringify(userData))
    
    // Navigate to dashboard
    navigate('/dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('selectedProfile')
    navigate('/login')
  }

  return (
    <div className="profile-select-page">
      <div className="header">
        <h1>Who's Learning Today? 🎓</h1>
        <p>Pick your profile to start!</p>
      </div>

      <div className="profiles-container">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            className={`profile-card ${selectedProfile?.id === profile.id ? 'selected' : ''}`}
            onClick={() => handleSelectProfile(profile)}
          >
            <span className="profile-avatar">{profile.avatar}</span>
            <span className="profile-name">{profile.name}</span>
            {selectedProfile?.id === profile.id && (
              <span className="check-mark">✓</span>
            )}
          </button>
        ))}
      </div>

      <button 
        className="continue-btn"
        disabled={!selectedProfile || loading}
        onClick={handleContinue}
      >
        {loading ? (
          <span>Loading...</span>
        ) : (
          <>
            <span>Let's Go!</span>
            <span className="btn-emoji">🚀</span>
          </>
        )}
      </button>

      <button className="back-btn" onClick={handleLogout}>
        ← Back to Login
      </button>

      <style>{`
        .profile-select-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(135deg, #6B4875 0%, #88CAAF 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
        }

        .header h1 {
          color: white;
          font-size: 2rem;
          margin: 0 0 10px 0;
          text-shadow: 3px 3px 0 rgba(0,0,0,0.2);
        }

        .header p {
          color: #FFD93D;
          font-size: 1.2rem;
          font-weight: bold;
          margin: 0;
        }

        .profiles-container {
          display: flex;
          flex-wrap: wrap;
          gap: 25px;
          justify-content: center;
          margin-bottom: 40px;
        }

        .profile-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px 40px;
          background: white;
          border: 5px solid transparent;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          position: relative;
          min-width: 150px;
        }

        .profile-card:hover {
          transform: translateY(-8px) scale(1.03);
          box-shadow: 0 15px 40px rgba(0,0,0,0.25);
        }

        .profile-card.selected {
          border-color: #FFD93D;
          background: linear-gradient(135deg, #FFFDF0 0%, #FFF9E6 100%);
          transform: translateY(-8px) scale(1.05);
        }

        .profile-avatar {
          font-size: 80px;
          margin-bottom: 15px;
          filter: drop-shadow(3px 3px 0 rgba(0,0,0,0.1));
        }

        .profile-name {
          font-size: 1.5rem;
          font-weight: bold;
          color: #6B4875;
        }

        .check-mark {
          position: absolute;
          top: -10px;
          right: -10px;
          background: #FFD93D;
          color: #6B4875;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          animation: pop 0.3s ease;
        }

        @keyframes pop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .continue-btn {
          padding: 20px 60px;
          font-size: 1.5rem;
          font-weight: bold;
          font-family: inherit;
          color: white;
          background: linear-gradient(135deg, #FFD93D 0%, #FF8B66 100%);
          border: none;
          border-radius: 50px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(255, 139, 102, 0.4);
          transition: all 0.3s ease;
        }

        .continue-btn:hover:not(:disabled) {
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(255, 139, 102, 0.5);
        }

        .continue-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-emoji {
          font-size: 1.8rem;
        }

        .back-btn {
          margin-top: 25px;
          padding: 12px 24px;
          font-size: 1rem;
          font-family: inherit;
          color: white;
          background: transparent;
          border: 2px solid rgba(255,255,255,0.5);
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .back-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: white;
        }

        /* Mobile adjustments */
        @media (max-width: 400px) {
          .profile-card {
            padding: 25px 30px;
            min-width: 130px;
          }
          
          .profile-avatar {
            font-size: 60px;
          }
          
          .profile-name {
            font-size: 1.2rem;
          }

          .continue-btn {
            padding: 18px 50px;
            font-size: 1.3rem;
          }
        }
      `}</style>
    </div>
  )
}
