import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaRegUser, FaEdit, FaSave, FaVenusMars, FaCalendarAlt, FaInfoCircle, FaCrown } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { ref, set, onValue } from 'firebase/database';
import '../App.css';

function Profile({ user, isPremium }) {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    gender: 'Not Specified',
    dob: '',
    bio: ''
  });

  // Real-time profile synchronization with Firebase (logout and login safe)
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        // If the user is logged in, fetch their profile from the database
        const profileRef = ref(db, `users/${currentUser.uid}/profile`);
        onValue(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfileData(snapshot.val());
          } else {
            // If not found in the database, set default name from Google or email auth
            setProfileData({
              fullName: currentUser.displayName || 'Mohd Mujtaba Nizami',
              phone: currentUser.phoneNumber || '',
              gender: 'Male',
              dob: '',
              bio: 'Computer Science Engineering Student 🚀'
            });
          }
        });
      } else {
        // Clear profile data immediately upon logout so it does not persist across users
        setProfileData({
          fullName: '',
          phone: '',
          gender: 'Not Specified',
          dob: '',
          bio: ''
        });
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Save profile details to Firebase
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await set(ref(db, `users/${currentUser.uid}/profile`), profileData);
        setIsEditing(false);
        alert("✨ Profile updated and saved successfully!");
      } catch (error) {
        console.error("Error saving profile:", error);
        alert("Failed to update profile.");
      }
    }
  };

  return (
    <div style={{ 
      maxWidth: '850px', 
      margin: '30px auto', 
      padding: '30px', 
      backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', 
      color: isDarkMode ? '#fff' : '#000',
      borderRadius: '12px', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease'
    }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <FaArrowLeft /> Back
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #ddd', paddingBottom: '15px', marginBottom: '25px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: isDarkMode ? '#fff' : '#111', margin: 0, fontSize: '24px' }}>
          <FaRegUser color="#00a8e8" /> User Profile Dashboard
        </h2>
        {user && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            style={{ backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaEdit /> Edit Profile
          </button>
        )}
      </div>
      
      {user ? (
        <div>
          {/* Profile Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa', padding: '20px', borderRadius: '10px', border: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#00a8e8', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', fontWeight: 'bold' }}>
              {profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : 'M'}
            </div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', color: isDarkMode ? '#fff' : '#111' }}>{profileData.fullName || 'User'}</h3>
              <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: isDarkMode ? '#aaa' : '#666' }}>{user.email}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: isPremium ? '#ffd814' : '#e3f2fd', color: isPremium ? '#111' : '#0d47a1', fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                {isPremium ? <><FaCrown /> VIP Prime Member</> : 'Standard Member'}
              </span>
            </div>
          </div>

          {!isEditing ? (
            /* View Profile Details */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              
              <div style={{ padding: '20px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', backgroundColor: isDarkMode ? '#252525' : '#fff' }}>
                <p style={{ fontSize: '13px', color: isDarkMode ? '#aaa' : '#777', margin: '0 0 5px 0' }}>Full Name</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{profileData.fullName || 'Not provided'}</p>
              </div>

              <div style={{ padding: '20px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', backgroundColor: isDarkMode ? '#252525' : '#fff' }}>
                <p style={{ fontSize: '13px', color: isDarkMode ? '#aaa' : '#777', margin: '0 0 5px 0' }}>Contact Number</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{profileData.phone || 'Not provided'}</p>
              </div>

              <div style={{ padding: '20px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', backgroundColor: isDarkMode ? '#252525' : '#fff' }}>
                <p style={{ fontSize: '13px', color: isDarkMode ? '#aaa' : '#777', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '5px' }}><FaVenusMars /> Gender</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{profileData.gender}</p>
              </div>

              <div style={{ padding: '20px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', backgroundColor: isDarkMode ? '#252525' : '#fff' }}>
                <p style={{ fontSize: '13px', color: isDarkMode ? '#aaa' : '#777', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '5px' }}><FaCalendarAlt /> Date of Birth</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{profileData.dob || 'Not provided'}</p>
              </div>

              <div style={{ gridColumn: '1 / -1', padding: '20px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', backgroundColor: isDarkMode ? '#252525' : '#fff' }}>
                <p style={{ fontSize: '13px', color: isDarkMode ? '#aaa' : '#777', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '5px' }}><FaInfoCircle /> Bio / About Me</p>
                <p style={{ fontSize: '15px', margin: 0, color: isDarkMode ? '#ddd' : '#444' }}>{profileData.bio || 'No bio added yet.'}</p>
              </div>

            </div>
          ) : (
            /* Edit Profile Form */
            <form onSubmit={handleSaveProfile} style={{ backgroundColor: isDarkMode ? '#252525' : '#f9f9f9', padding: '25px', borderRadius: '8px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Update Personal Information</h3>

              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Full Name:</label>
              <input 
                type="text" 
                value={profileData.fullName} 
                onChange={(e) => setProfileData({...profileData, fullName: e.target.value})} 
                style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#1a1a1a' : '#fff', color: isDarkMode ? '#fff' : '#000' }} 
                required 
              />

              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Phone Number:</label>
              <input 
                type="tel" 
                value={profileData.phone} 
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})} 
                style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#1a1a1a' : '#fff', color: isDarkMode ? '#fff' : '#000' }} 
                required 
              />

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Gender:</label>
                  <select 
                    value={profileData.gender} 
                    onChange={(e) => setProfileData({...profileData, gender: e.target.value})} 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#1a1a1a' : '#fff', color: isDarkMode ? '#fff' : '#000' }}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Date of Birth:</label>
                  <input 
                    type="date" 
                    value={profileData.dob} 
                    onChange={(e) => setProfileData({...profileData, dob: e.target.value})} 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#1a1a1a' : '#fff', color: isDarkMode ? '#fff' : '#000' }} 
                  />
                </div>
              </div>

              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Bio / About Me:</label>
              <textarea 
                rows="3"
                value={profileData.bio} 
                onChange={(e) => setProfileData({...profileData, bio: e.target.value})} 
                style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#1a1a1a' : '#fff', color: isDarkMode ? '#fff' : '#000' }} 
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#ffd814', color: '#111', border: 'none', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                  <FaSave /> Save Changes
                </button>
                <button type="button" onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}

        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: isDarkMode ? '#aaa' : '#666', marginBottom: '20px', fontSize: '16px' }}>
            Welcome to your profile settings! Please log in to view and manage your details.
          </p>
          <button onClick={() => navigate('/login')} style={{ padding: '10px 25px', backgroundColor: '#ffd814', color: '#111', border: 'none', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
            Go to Login
          </button>
        </div>
      )}
      
    </div>
  );
}

export default Profile;