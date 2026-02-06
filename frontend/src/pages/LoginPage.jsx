import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password,
      })
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Oops! Something went wrong. Try again!')
    } finally {
      setLoading(false)
    }
  }

  const selectUser = (user, pass) => {
    setUsername(user)
    setPassword(pass)
  }

  return (
    <div className="login-page">
      <div className="login-header">
        <span className="logo-emoji">🌟</span>
        <h1>Dora Learning</h1>
        <p>Your Adventure Awaits!</p>
      </div>

      <div className="user-picker">
        <p className="picker-label">Who's learning today?</p>
        <div className="user-buttons">
          <button 
            type="button"
            className={`user-btn ${username === 'aiden' ? 'selected' : ''}`}
            onClick={() => selectUser('aiden', 'aiden123')}
          >
            <span className="avatar">🦁</span>
            <span className="name">Aiden</span>
          </button>
          <button 
            type="button"
            className={`user-btn ${username === 'marcus' ? 'selected' : ''}`}
            onClick={() => selectUser('marcus', 'marcus123')}
          >
            <span className="avatar">🐻</span>
            <span className="name">Marcus</span>
          </button>
        </div>
      </div>

      {error && <div className="error-bubble">{error}</div>}

      <form onSubmit={handleLogin} className="login-form">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Type your name..."
          className="hidden-input"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Secret code..."
          className="hidden-input"
          required
        />

        <button 
          type="submit" 
          disabled={loading || !username} 
          className="start-btn"
        >
          {loading ? (
            <span className="loading-dots">Loading...</span>
          ) : (
            <>
              <span>Let's Go!</span>
              <span className="btn-emoji">🚀</span>
            </>
          )}
        </button>
      </form>

      <div className="login-footer">
        <p>✨ Learn • Play • Grow ✨</p>
      </div>

      <style>{`
        .login-page {
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

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-emoji {
          font-size: 80px;
          display: block;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        .login-header h1 {
          color: white;
          font-size: 2.5rem;
          margin: 10px 0;
          text-shadow: 3px 3px 0 rgba(0,0,0,0.2);
        }

        .login-header p {
          color: #FFD93D;
          font-size: 1.3rem;
          font-weight: bold;
        }

        .user-picker {
          background: white;
          border-radius: 30px;
          padding: 25px;
          width: 100%;
          max-width: 350px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        .picker-label {
          text-align: center;
          color: #6B4875;
          font-size: 1.3rem;
          font-weight: bold;
          margin-bottom: 20px;
        }

        .user-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
        }

        .user-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 30px;
          border: 4px solid #eee;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .user-btn:hover {
          transform: scale(1.05);
          border-color: #88CAAF;
        }

        .user-btn.selected {
          border-color: #FFD93D;
          background: #FFFDF0;
          transform: scale(1.1);
        }

        .user-btn .avatar {
          font-size: 50px;
          margin-bottom: 10px;
        }

        .user-btn .name {
          font-size: 1.2rem;
          font-weight: bold;
          color: #6B4875;
        }

        .error-bubble {
          background: #FF8B66;
          color: white;
          padding: 15px 25px;
          border-radius: 20px;
          margin: 20px 0;
          font-weight: bold;
          animation: shake 0.5s;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .login-form {
          width: 100%;
          max-width: 350px;
          margin-top: 20px;
        }

        .hidden-input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .start-btn {
          width: 100%;
          padding: 20px 40px;
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          background: linear-gradient(135deg, #FFD93D 0%, #FF8B66 100%);
          border: none;
          border-radius: 50px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 8px 20px rgba(255, 139, 102, 0.4);
          transition: all 0.3s ease;
        }

        .start-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(255, 139, 102, 0.5);
        }

        .start-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-emoji {
          font-size: 1.8rem;
        }

        .loading-dots {
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .login-footer {
          margin-top: 40px;
          text-align: center;
        }

        .login-footer p {
          color: white;
          font-size: 1.1rem;
          opacity: 0.9;
        }
      `}</style>
    </div>
  )
}
