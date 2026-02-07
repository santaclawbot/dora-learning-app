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

      <div className="login-card">
        {/* Quick Login Profiles */}
        <div className="user-picker">
          <p className="picker-label">⚡ Quick Login</p>
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

        <div className="divider">
          <span>or type your info</span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="username">👤 Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Type your name..."
              className="login-input"
              required
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">🔐 Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your secret code..."
              className="login-input"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-bubble">{error}</div>}

          <button 
            type="submit" 
            disabled={loading || !username || !password} 
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
      </div>

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

        .login-card {
          background: white;
          border-radius: 30px;
          padding: 30px;
          width: 100%;
          max-width: 380px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        .user-picker {
          margin-bottom: 20px;
        }

        .picker-label {
          text-align: center;
          color: #6B4875;
          font-size: 1.1rem;
          font-weight: bold;
          margin-bottom: 15px;
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
          padding: 15px 25px;
          border: 3px solid #eee;
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
          transform: scale(1.08);
        }

        .user-btn .avatar {
          font-size: 40px;
          margin-bottom: 8px;
        }

        .user-btn .name {
          font-size: 1rem;
          font-weight: bold;
          color: #6B4875;
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 20px 0;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 2px;
          background: linear-gradient(to right, transparent, #ddd, transparent);
        }

        .divider span {
          padding: 0 15px;
          color: #888;
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          color: #6B4875;
          font-weight: bold;
          font-size: 1rem;
          margin-left: 5px;
        }

        .login-input {
          width: 100%;
          padding: 15px 20px;
          font-size: 1.1rem;
          font-family: inherit;
          border: 3px solid #ddd;
          border-radius: 15px;
          background: #f9f9f9;
          color: #333;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .login-input:focus {
          outline: none;
          border-color: #88CAAF;
          background: white;
          box-shadow: 0 0 0 4px rgba(136, 202, 175, 0.2);
        }

        .login-input::placeholder {
          color: #aaa;
        }

        .error-bubble {
          background: #FF8B66;
          color: white;
          padding: 12px 20px;
          border-radius: 15px;
          font-weight: bold;
          text-align: center;
          animation: shake 0.5s;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .start-btn {
          width: 100%;
          padding: 18px 40px;
          font-size: 1.4rem;
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
          gap: 10px;
          box-shadow: 0 8px 20px rgba(255, 139, 102, 0.4);
          transition: all 0.3s ease;
          margin-top: 10px;
        }

        .start-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(255, 139, 102, 0.5);
        }

        .start-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-emoji {
          font-size: 1.6rem;
        }

        .loading-dots {
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .login-footer {
          margin-top: 30px;
          text-align: center;
        }

        .login-footer p {
          color: white;
          font-size: 1.1rem;
          opacity: 0.9;
        }

        /* Mobile adjustments */
        @media (max-width: 400px) {
          .login-card {
            padding: 25px 20px;
          }
          
          .user-btn {
            padding: 12px 18px;
          }
          
          .user-btn .avatar {
            font-size: 32px;
          }
        }
      `}</style>
    </div>
  )
}
