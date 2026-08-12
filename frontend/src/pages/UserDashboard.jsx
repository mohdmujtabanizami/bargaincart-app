import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShoppingBag, FaHeart, FaWallet, FaCrown, FaHeadset, FaMapMarkerAlt, FaUndoAlt, FaShieldAlt } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { ref, onValue } from 'firebase/database';

function UserDashboard({ user, isPremium, wishlistItems = [] }) {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [totalOrders, setTotalOrders] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  // Real-time live stats synchronization from Firebase database
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        // 1. Live Orders Count
        const ordersRef = ref(db, `users/${currentUser.uid}/orders`);
        onValue(ordersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setTotalOrders(Object.keys(data).length);
          } else {
            setTotalOrders(0);
          }
        });

        // 2. Live Wallet / E-Card Balance
        const walletRef = ref(db, `users/${currentUser.uid}/walletBalance`);
        onValue(walletRef, (snapshot) => {
          if (snapshot.exists()) {
            setWalletBalance(snapshot.val());
          } else {
            setWalletBalance(0);
          }
        });

      } else {
        setTotalOrders(0);
        setWalletBalance(0);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Accurate wishlist count matching the top navigation bar
  const currentWishlistCount = Array.isArray(wishlistItems) ? wishlistItems.length : 0;

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
      
      {/* Welcome Banner */}
      <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', padding: '30px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '25px', border: isDarkMode ? '1px solid #333' : '1px solid #eee' }}>
        <div>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '24px', color: isDarkMode ? '#fff' : '#111' }}>
            Hello, {user ? user.displayName || user.email || 'Mohd Mujtaba Nizami' : 'Guest'} 👋
          </h1>
          <p style={{ margin: 0, color: isDarkMode ? '#aaa' : '#666', fontSize: '14px' }}>Welcome to your live BargainCart dashboard.</p>
        </div>
        
        {isPremium ? (
          <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeeba', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', color: '#856404', fontWeight: 'bold' }}>
            <FaCrown size={24} color="#ffd814" /> Prime Member
          </div>
        ) : (
          <button onClick={() => navigate('/premium')} style={{ backgroundColor: '#232f3e', color: '#ffd814', border: '1px solid #ffd814', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaCrown /> Join Prime
          </button>
        )}
      </div>

      {/* Quick Live Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* Total Orders Card */}
        <div onClick={() => navigate('/orders')} style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f0f8ff', padding: '20px', borderRadius: '10px', border: isDarkMode ? '1px solid #444' : '1px solid #cce5ff', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
          <div style={{ backgroundColor: '#00a8e8', padding: '15px', borderRadius: '50%', color: '#fff' }}><FaShoppingBag size={24} /></div>
          <div><h3 style={{ margin: 0, fontSize: '22px', color: isDarkMode ? '#fff' : '#111' }}>{totalOrders}</h3><p style={{ margin: 0, fontSize: '13px', color: isDarkMode ? '#aaa' : '#555' }}>Total Live Orders</p></div>
        </div>
        
        {/* Wishlist Items Card */}
        <div onClick={() => navigate('/wishlist')} style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff0f3', padding: '20px', borderRadius: '10px', border: isDarkMode ? '1px solid #444' : '1px solid #ffcce0', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
          <div style={{ backgroundColor: '#cc0c39', padding: '15px', borderRadius: '50%', color: '#fff' }}><FaHeart size={24} /></div>
          <div><h3 style={{ margin: 0, fontSize: '22px', color: isDarkMode ? '#fff' : '#111' }}>{currentWishlistCount}</h3><p style={{ margin: 0, fontSize: '13px', color: isDarkMode ? '#aaa' : '#555' }}>Wishlist Items</p></div>
        </div>

        {/* Wallet Balance Card */}
        <div onClick={() => navigate('/giftcards')} style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f3f0ff', padding: '20px', borderRadius: '10px', border: isDarkMode ? '1px solid #444' : '1px solid #e0cffc', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
          <div style={{ backgroundColor: '#9b51e0', padding: '15px', borderRadius: '50%', color: '#fff' }}><FaWallet size={24} /></div>
          <div><h3 style={{ margin: 0, fontSize: '22px', color: isDarkMode ? '#fff' : '#111' }}>₹{walletBalance.toLocaleString()}</h3><p style={{ margin: 0, fontSize: '13px', color: isDarkMode ? '#aaa' : '#555' }}>Wallet Balance</p></div>
        </div>

      </div>

      {/* Action Links */}
      <h2 style={{ fontSize: '20px', marginBottom: '15px', color: isDarkMode ? '#fff' : '#111' }}>Account Settings & Management</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {[
          { icon: <FaShoppingBag color="#00a8e8" size={24}/>, title: 'Your Orders', desc: 'Track live orders, return, or cancel', path: '/orders' },
          { icon: <FaShieldAlt color="#2e7d32" size={24}/>, title: 'Login & Security', desc: 'Edit profile name, email, and mobile', path: '/profile' },
          { icon: <FaMapMarkerAlt color="#d32f2f" size={24}/>, title: 'Saved Addresses', desc: '', path: '/addresses' },
          { icon: <FaUndoAlt color="#f57c00" size={24}/>, title: 'Refunds & Returns', desc: 'Check live status of your refunds', path: '/refunds' },
          { icon: <FaWallet color="#9b51e0" size={24}/>, title: 'BargainCart Pay', desc: 'Add balance and manage E-Gift cards', path: '/giftcards' },
          { icon: <FaHeadset color="#007185" size={24}/>, title: 'Contact Us', desc: 'Get instant help with AI support', path: '/support' },
        ].map((item, idx) => (
          <div key={idx} onClick={() => navigate(item.path)} style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', padding: '20px', borderRadius: '10px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '15px', backgroundColor: isDarkMode ? '#2c2c2c' : '#f9f9f9', borderRadius: '8px' }}>{item.icon}</div>
            <div>
              <h4 style={{ margin: item.desc ? '0 0 5px 0' : 0, fontSize: '16px', color: isDarkMode ? '#fff' : '#111' }}>{item.title}</h4>
              {item.desc && <p style={{ margin: 0, fontSize: '12px', color: isDarkMode ? '#aaa' : '#666' }}>{item.desc}</p>}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default UserDashboard;