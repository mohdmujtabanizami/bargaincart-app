import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import '../App.css';

function Login() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [isSignup, setIsSignup] = useState(false); // false = Sign In, true = Register

  // Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');

  // 1. Google Sign-In with Popup (Best and smooth for mobile & desktop)
  const handleGoogleSignIn = async () => {
    try {
      setAuthError('');
      const res = await signInWithPopup(auth, googleProvider);
      alert(`Welcome, ${res.user.displayName || 'User'}! 🎉`);
      navigate('/');
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthError("Sign-in popup was closed before completion.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError("This domain is not authorized in Firebase Console.");
      } else {
        setAuthError("Google Login failed: " + error.message);
      }
    }
  };

  // 2. Email & Password Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!firstName || !lastName || !email || !password || !mobile) {
      setAuthError("Please fill in all required fields.");
      return;
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`;
      
      await updateProfile(res.user, {
        displayName: fullName
      });

      alert(`Account created successfully! Welcome, ${fullName} 🎉`);
      navigate('/');
    } catch (error) {
      console.error("Registration Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError("This email is already registered. Please sign in.");
      } else if (error.code === 'auth/weak-password') {
        setAuthError("Password should be at least 6 characters.");
      } else {
        setAuthError(error.message || "Registration failed.");
      }
    }
  };

  // 3. Direct Sign In
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!identifier || !password) {
      setAuthError("Please enter both email/phone and password.");
      return;
    }

    try {
      const loginEmail = identifier.includes('@') ? identifier : `${identifier}@bargaincart.com`;
      const res = await signInWithEmailAndPassword(auth, loginEmail, password);
      alert(`Welcome back, ${res.user.displayName || identifier}! 🚀`);
      navigate('/');
    } catch (error) {
      console.error("Login Error:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError("Invalid password or credentials. Please check your input.");
      } else if (error.code === 'auth/user-not-found') {
        setAuthError("No account found with this email/phone. Please register first.");
      } else {
        setAuthError("Invalid password or login failed.");
      }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', marginBottom: '50px', transition: 'all 0.3s ease' }}>
      <div style={{ 
        width: '420px', 
        padding: '25px', 
        border: isDarkMode ? '1px solid #444' : '1px solid #ddd', 
        borderRadius: '8px', 
        backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', 
        color: isDarkMode ? '#fff' : '#000',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
      }}>
        
        {/* Top Tabs */}
        <div style={{ display: 'flex', marginBottom: '20px', borderBottom: isDarkMode ? '2px solid #444' : '2px solid #eee' }}>
          <button 
            type="button"
            onClick={() => { setIsSignup(false); setAuthError(''); }}
            style={{ 
              flex: 1, padding: '10px', background: 'none', border: 'none', 
              borderBottom: !isSignup ? '3px solid #febd69' : 'none', 
              fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', 
              color: !isSignup ? (isDarkMode ? '#fff' : '#111') : (isDarkMode ? '#888' : '#777') 
            }}>
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => { setIsSignup(true); setAuthError(''); }}
            style={{ 
              flex: 1, padding: '10px', background: 'none', border: 'none', 
              borderBottom: isSignup ? '3px solid #febd69' : 'none', 
              fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', 
              color: isSignup ? (isDarkMode ? '#fff' : '#111') : (isDarkMode ? '#888' : '#777') 
            }}>
            Register
          </button>
        </div>

        {/* Error Message Box */}
        {authError && (
          <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#ffe6e6', color: '#cc0c39', border: '1px solid #ffcccc', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>
            ⚠️ {authError}
          </div>
        )}

        {!isSignup ? (
          <form onSubmit={handleLogin}>
            <h2 style={{ fontWeight: '500', marginBottom: '15px', fontSize: '24px', color: isDarkMode ? '#fff' : '#111' }}>Sign in</h2>
            
            <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', display: 'block', color: isDarkMode ? '#ccc' : '#000' }}>
              Email address / Phone number
            </label>
            <input 
              type="text" 
              className="input-box" 
              placeholder="Enter email or phone" 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={{ width: '100%', padding: '9px', marginBottom: '15px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000' }}
              required
            />

            <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', display: 'block', color: isDarkMode ? '#ccc' : '#000' }}>
              Password
            </label>
            <input 
              type="password" 
              className="input-box" 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '9px', marginBottom: '20px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000' }}
              required
            />
            
            <button type="submit" className="amazon-btn" style={{ width: '100%', padding: '10px', marginBottom: '15px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>
              Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <h2 style={{ fontWeight: '500', marginBottom: '15px', fontSize: '24px', color: isDarkMode ? '#fff' : '#111' }}>Create Account</h2>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: isDarkMode ? '#ccc' : '#000' }}>First Name *</label>
                <input 
                  type="text" 
                  placeholder="First name" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000' }}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: isDarkMode ? '#ccc' : '#000' }}>Middle Name</label>
                <input 
                  type="text" 
                  placeholder="Middle name" 
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: isDarkMode ? '#ccc' : '#000' }}>Last Name *</label>
              <input 
                type="text" 
                placeholder="Last name" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000' }}
                required
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: isDarkMode ? '#ccc' : '#000' }}>Mobile Number *</label>
              <input 
                type="tel" 
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Mobile number" 
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000' }}
                required
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: isDarkMode ? '#ccc' : '#000' }}>Email address *</label>
              <input 
                type="email" 
                placeholder="Email address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000' }}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '3px', color: isDarkMode ? '#ccc' : '#000' }}>Password *</label>
              <input 
                type="password" 
                placeholder="At least 6 characters" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000' }}
                required
              />
            </div>

            <button type="submit" className="amazon-btn" style={{ width: '100%', padding: '10px', marginBottom: '15px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>
              Register Account
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', margin: '15px 0', color: isDarkMode ? '#aaa' : '#767676', fontSize: '13px' }}>OR</div>

        {/* Google Sign In Button */}
        <button 
          type="button"
          className="amazon-btn-blue" 
          style={{ width: '100%', padding: '9px', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: isDarkMode ? '#333' : '#f8f9fa', color: isDarkMode ? '#fff' : '#111', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
          onClick={handleGoogleSignIn}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px' }} />
          Sign in with Google
        </button>

      </div>
    </div>
  );
}

export default Login;