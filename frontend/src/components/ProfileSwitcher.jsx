import { useState } from 'react'
import '../styles/ProfileSwitcher.css'

export default function ProfileSwitcher({ user }) {
  const [isOpen, setIsOpen] = useState(false)
  const [profiles] = useState([
    { id: 1, name: 'Alex', emoji: '👦' },
    { id: 2, name: 'Jordan', emoji: '👧' },
    { id: 3, name: 'Casey', emoji: '🧒' },
  ])
  const [selectedProfile, setSelectedProfile] = useState(profiles[0])

  const handleSelectProfile = (profile) => {
    setSelectedProfile(profile)
    setIsOpen(false)
    // TODO: Update backend with selected profile
  }

  return (
    <div className="profile-switcher">
      <button
        className="switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch student profile"
      >
        {selectedProfile.emoji} {selectedProfile.name}
      </button>

      {isOpen && (
        <div className="switcher-dropdown">
          <div className="dropdown-header">Select Profile</div>
          {profiles.map((profile) => (
            <button
              key={profile.id}
              className={`profile-option ${
                selectedProfile.id === profile.id ? 'active' : ''
              }`}
              onClick={() => handleSelectProfile(profile)}
            >
              {profile.emoji} {profile.name}
            </button>
          ))}
          <div className="dropdown-divider"></div>
          <button className="add-profile-btn">+ Add New Profile</button>
        </div>
      )}
    </div>
  )
}
