import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { FaSearch, FaShoppingCart, FaBars, FaTimes, FaGift, FaStore, FaKey, FaHeart, FaChevronRight, FaShoppingBag, FaHeadset, FaWallet, FaUndoAlt, FaMapMarkerAlt, FaRegUser, FaSun, FaMoon, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaEnvelope, FaPhoneAlt, FaCog } from 'react-icons/fa';
import { auth, db } from './firebase'; // db imported from firebase.js
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, update } from 'firebase/database'; // Firebase Realtime Database functions imported
import './App.css';

import { ThemeProvider, useTheme } from './context/ThemeContext';

import Login from './pages/Login';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Orders from './pages/Orders';
import Refunds from './pages/Refunds';
import GiftCards from './pages/GiftCards';
import Support from './pages/Support';
import Addresses from './pages/Addresses';
import Profile from './pages/Profile';
import Premium from './pages/Premium';

function MainApp() {
  const [user, setUser] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Secure admin email
  const ADMIN_EMAIL = "bargaincart@admin.com"; 

  // Birthday states
  const [bDay, setBDay] = useState('');
  const [bMonth, setBMonth] = useState('');
  const [bYear, setBYear] = useState('');
  const [birthdaySaved, setBirthdaySaved] = useState(false);
  
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0); // Live wallet balance state added
  const [activeTab, setActiveTab] = useState('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPremium, setIsPremium] = useState(false);

  const { isDarkMode, toggleTheme } = useTheme();

  const navigate = useNavigate();
  const location = useLocation();

  // Real-time auto-load birthday, cart, wishlist & wallet when user logs in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Load birthday from LocalStorage
        const savedBday = localStorage.getItem(`birthday_${currentUser.uid}`);
        if (savedBday) {
          const parsedBday = JSON.parse(savedBday);
          setBDay(parsedBday.bDay);
          setBMonth(parsedBday.bMonth);
          setBYear(parsedBday.bYear);
          setBirthdaySaved(true);
        } else {
          setBDay('');
          setBMonth('');
          setBYear('');
          setBirthdaySaved(false);
        }

        // Real-time cart sync from Firebase
        const cartRef = ref(db, `users/${currentUser.uid}/cart`);
        onValue(cartRef, (snapshot) => {
          const data = snapshot.val();
          setCartItems(data ? Object.values(data) : []);
        });

        // Real-time wishlist sync from Firebase
        const wishRef = ref(db, `users/${currentUser.uid}/wishlist`);
        onValue(wishRef, (snapshot) => {
          const data = snapshot.val();
          setWishlistItems(data ? Object.values(data) : []);
        });

        // Real-time wallet balance sync from Firebase
        const walletRef = ref(db, `users/${currentUser.uid}/walletBalance`);
        onValue(walletRef, (snapshot) => {
          if (snapshot.exists()) {
            setWalletBalance(snapshot.val());
          } else {
            setWalletBalance(0);
          }
        });

      } else {
        setBDay('');
        setBMonth('');
        setBYear('');
        setBirthdaySaved(false);
        setCartItems([]);
        setWishlistItems([]);
        setWalletBalance(0);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Logged out successfully!");
      setIsDrawerOpen(false);
      setIsPremium(false);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  // Smart birthday save logic
  const handleSaveBirthday = (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login first to join the Birthday Club!");
      navigate('/login');
      setIsDrawerOpen(false);
      return;
    }
    if (!bDay || !bMonth || !bYear) {
      alert("Please select your complete Date of Birth (Day, Month, and Year)!");
      return;
    }
    
    localStorage.setItem(`birthday_${user.uid}`, JSON.stringify({ bDay, bMonth, bYear }));
    setBirthdaySaved(true);
    alert(`🎂 Birthday saved successfully (${bDay} ${bMonth} ${bYear})! You'll get a special discount code on your birthday!`);
  };

  const handleStoreSwitch = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    navigate('/');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate('/');
  };

  // Real-time add to cart (saved to Firebase)
  const addToCart = (product) => {
    const updatedCart = [...cartItems, product];
    setCartItems(updatedCart);
    if (user) {
      update(ref(db, `users/${user.uid}`), { cart: updatedCart });
    }
    alert(`🛒 "${product.title}" added to your ${product.type === 'rent' ? 'Rent' : 'Buy'} Cart successfully!`);
  };

  // Real-time remove from cart
  const removeFromCart = (indexToRemove) => {
    const updatedCart = cartItems.filter((_, idx) => idx !== indexToRemove);
    setCartItems(updatedCart);
    if (user) {
      update(ref(db, `users/${user.uid}`), { cart: updatedCart });
    }
  };

  const clearCart = (type) => {
    const updatedCart = type === 'buy'
      ? cartItems.filter(item => item.type !== 'buy')
      : cartItems.filter(item => item.type !== 'rent');
    setCartItems(updatedCart);
    if (user) {
      update(ref(db, `users/${user.uid}`), { cart: updatedCart });
    }
  };

  const updateCartItemPrice = (indexToUpdate, newPrice) => {
    const updatedCart = cartItems.map((item, idx) => {
      if (idx === indexToUpdate) {
        return { ...item, finalPrice: newPrice };
      }
      return item;
    });
    setCartItems(updatedCart);
    if (user) {
      update(ref(db, `users/${user.uid}`), { cart: updatedCart });
    }
  };

  // Real-time add to wishlist (saved to Firebase)
  const addToWishlist = (product) => {
    if (!wishlistItems.some(item => item.id === product.id)) {
      const updatedWishlist = [...wishlistItems, product];
      setWishlistItems(updatedWishlist);
      if (user) {
        update(ref(db, `users/${user.uid}`), { wishlist: updatedWishlist });
      }
      alert(`❤️ "${product.title}" has been added to your Wishlist! We will notify you when price drops.`);
    } else {
      alert(`⚠️ This item is already in your Wishlist.`);
    }
  };

  // Real-time remove from wishlist
  const removeFromWishlist = (indexToRemove) => {
    const updatedWishlist = wishlistItems.filter((_, idx) => idx !== indexToRemove);
    setWishlistItems(updatedWishlist);
    if (user) {
      update(ref(db, `users/${user.uid}`), { wishlist: updatedWishlist });
    }
  };

  // Generate Year Array (2026 down to 1900)
  const years = Array.from({length: 2026 - 1900 + 1}, (_, i) => 2026 - i);
  const days = Array.from({length: 31}, (_, i) => i + 1);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div style={{ 
      backgroundColor: isDarkMode ? '#121212' : (activeTab === 'buy' ? '#eaeded' : '#f0f4f8'), 
      color: isDarkMode ? '#ffffff' : '#000000',
      minHeight: '100vh', 
      display: 'flex',
      flexDirection: 'column',
      transition: 'background-color 0.4s ease, color 0.4s ease' 
    }}>
      
      {/* Navbar */}
      <nav className="navbar" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0 20px',
        backgroundColor: isDarkMode ? '#1f1f1f' : (activeTab === 'buy' ? '#131921' : '#0f4c81'),
        transition: 'background-color 0.4s ease'
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <FaBars 
            size={22} 
            color="white" 
            style={{ cursor: 'pointer' }} 
            onClick={() => setIsDrawerOpen(true)} 
            title="Open Menu"
          />
          <Link to="/" style={{ textDecoration: 'none' }} onClick={() => setSearchQuery('')}>
            <div className="nav-logo">Bargain<span>Cart</span></div>
          </Link>
        </div>
        
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: '550px', margin: '0 20px' }}>
          <input 
            type="text" 
            placeholder={activeTab === 'buy' ? "Search products to buy..." : "Search items available on rent..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '9px 14px',
              border: 'none',
              borderRadius: '6px 0 0 6px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#fff',
              color: '#111',
              height: '38px'
            }}
          />
          <button 
            type="submit"
            style={{
              backgroundColor: '#febd69',
              border: 'none',
              padding: '0 18px',
              borderRadius: '0 6px 6px 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '38px'
            }}
          >
            <FaSearch size={16} color="#111" />
          </button>
        </form>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          <div 
            onClick={toggleTheme} 
            style={{ 
              cursor: 'pointer', 
              backgroundColor: isDarkMode ? '#333' : 'rgba(255,255,255,0.2)', 
              padding: '6px 12px', 
              borderRadius: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
            title="Toggle Dark/Light Mode"
          >
            {isDarkMode ? <><FaSun color="#ffd814" /> Light</> : <><FaMoon color="#ffd814" /> Dark</>}
          </div>

          <Link to="/wishlist" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'white', cursor: 'pointer', position: 'relative' }}>
              <FaHeart size={22} color="#ff6b6b" />
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Wishlist</span>
              {wishlistItems.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-8px', left: '12px', backgroundColor: '#cc0c39', color: '#fff',
                  borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold'
                }}>
                  {wishlistItems.length}
                </span>
              )}
            </div>
          </Link>

          <Link to="/cart" style={{ textDecoration: 'none' }}>
            <div className="nav-cart" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'white', cursor: 'pointer', position: 'relative' }}>
              <FaShoppingCart size={24} />
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Cart</span>
              {cartItems.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-8px', left: '12px', backgroundColor: '#febd69', color: '#111',
                  borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold'
                }}>
                  {cartItems.length}
                </span>
              )}
            </div>
          </Link>
        </div>

      </nav>

      {/* Tabs */}
      <div style={{
        backgroundColor: isDarkMode ? '#181818' : (activeTab === 'buy' ? '#232f3e' : '#0d3b66'),
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        transition: 'background-color 0.4s ease'
      }}>
        <button 
          onClick={() => handleStoreSwitch('buy')}
          style={{
            padding: '9px 28px',
            borderRadius: '25px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: activeTab === 'buy' ? '#febd69' : 'rgba(255,255,255,0.15)',
            color: activeTab === 'buy' ? '#111' : '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}>
          <FaStore /> 🛒 Buy Store
        </button>
        
        <button 
          onClick={() => handleStoreSwitch('rent')}
          style={{
            padding: '9px 28px',
            borderRadius: '25px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: activeTab === 'rent' ? '#00a8e8' : 'rgba(255,255,255,0.15)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}>
          <FaKey /> 🏠 Rent Store
        </button>
      </div>

      {/* Sidebar Drawer */}
      {isDrawerOpen && (
        <div className="drawer-overlay">
          <div className="drawer-content" style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', color: isDarkMode ? '#fff' : '#000' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', color: isDarkMode ? '#fff' : '#111', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
              <FaTimes size={20} style={{ cursor: 'pointer', color: isDarkMode ? '#fff' : '#111' }} onClick={() => setIsDrawerOpen(false)} />
              <h2 style={{ margin: 0, fontSize: '18px', color: isDarkMode ? '#fff' : '#111' }}>Menu</h2>
            </div>

            <div className="profile-click-area" onClick={() => { 
                if(!user) { navigate('/login'); } else { navigate('/profile'); }
                setIsDrawerOpen(false); 
              }}
              style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa', border: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
              <div className="profile-circle">
                <FaRegUser size={24} />
              </div>
              <div className="profile-info">
                <h3 style={{ color: isDarkMode ? '#fff' : '#111' }}>{user ? (user.displayName || user.email || 'Guest User') : 'Guest User'}</h3>
                <p style={{ color: isDarkMode ? '#aaa' : '#666' }}>{user ? 'View Profile' : 'Sign in to access features'}</p>
              </div>
              <FaChevronRight color="#ccc" style={{ marginLeft: 'auto' }} />
            </div>

            {/* BargainCart Prime / Premium banner in menu */}
            <div 
              onClick={() => { navigate('/premium'); setIsDrawerOpen(false); }} 
              style={{ 
                margin: '15px 20px 0 20px',
                backgroundColor: '#232f3e', 
                color: '#fff', 
                padding: '12px 15px', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                border: '1px solid #ffd814',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>👑</span>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', color: '#ffd814' }}>BargainCart Prime</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: '#ccc' }}>Fast Delivery & Extra 10% Off</p>
                </div>
              </div>
              <FaChevronRight color="#ffd814" size={14} />
            </div>

            <div className="quick-links-container" style={{ display: 'flex', gap: '10px', padding: '15px', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }}>
              <div className="quick-link-box" onClick={() => { navigate('/orders'); setIsDrawerOpen(false); }}
                style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#333', border: isDarkMode ? '1px solid #444' : '1px solid #ddd' }}>
                <FaShoppingBag size={24} color={isDarkMode ? "#4da6ff" : "#333"} />
                Your Orders
              </div>
              <div className="quick-link-box" onClick={() => { navigate('/wishlist'); setIsDrawerOpen(false); }}
                style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#333', border: isDarkMode ? '1px solid #444' : '1px solid #ddd' }}>
                <FaHeart size={24} color={isDarkMode ? "#ff6b6b" : "#cc0c39"} />
                Wishlist
              </div>
              <div className="quick-link-box" onClick={() => { navigate('/giftcards'); setIsDrawerOpen(false); }}
                style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#333', border: isDarkMode ? '1px solid #444' : '1px solid #ddd' }}>
                <FaGift size={24} color={isDarkMode ? "#9b51e0" : "#9b51e0"} />
                E-Gift Cards
              </div>
            </div>

            <div className="gift-card-banner" onClick={() => { navigate('/giftcards'); setIsDrawerOpen(false); }}
              style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', border: isDarkMode ? '1px solid #444' : '1px solid #ddd' }}>
              <div className="gift-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDarkMode ? '#fff' : '#111' }}>
                  <FaWallet color="#9b51e0" size={18} />
                  BargainCart Cash & Gift Card
                  <span className="new-badge">NEW</span>
                </div>
                <FaChevronRight color="#888" size={14} />
              </div>
              <div className="gift-card-bottom">
                <div style={{ color: isDarkMode ? '#aaa' : '#666', fontSize: '13px' }}>Available Balance <strong style={{ color: isDarkMode ? '#fff' : '#111', fontSize: '16px', marginLeft: '5px' }}>₹{walletBalance.toLocaleString()}</strong></div>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate('/giftcards'); setIsDrawerOpen(false); }}
                  style={{
                    backgroundColor: '#ffd814',
                    color: '#111',
                    border: '1px solid #fcd200',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Add Balance
                </button>
              </div>
            </div>

            <div className="section-title" style={{ color: isDarkMode ? '#bbb' : '#111' }}>Your Information</div>
            <div className="list-container">
              <div className="list-item" onClick={() => { navigate('/user-dashboard'); setIsDrawerOpen(false); }}
                style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#333', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
                <div className="list-item-left"><FaRegUser size={18} color={isDarkMode ? "#4da6ff" : "#333"} /> User Dashboard</div>
                <FaChevronRight color="#ccc" />
              </div>
              <div className="list-item" onClick={() => { navigate('/orders'); setIsDrawerOpen(false); }}
                style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#333', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
                <div className="list-item-left"><FaShoppingBag size={18} color={isDarkMode ? "#4da6ff" : "#333"} /> Your Orders</div>
                <FaChevronRight color="#ccc" />
              </div>
              <div className="list-item" onClick={() => { navigate('/refunds'); setIsDrawerOpen(false); }}
                style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#333', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
                <div className="list-item-left"><FaUndoAlt size={18} color={isDarkMode ? "#4da6ff" : "#333"} /> Your Refunds</div>
                <FaChevronRight color="#ccc" />
              </div>
              <div className="list-item" onClick={() => { navigate('/support'); setIsDrawerOpen(false); }}
                style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#333', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
                <div className="list-item-left"><FaHeadset size={18} color={isDarkMode ? "#4da6ff" : "#333"} /> Help & Support</div>
                <FaChevronRight color="#ccc" />
              </div>
              
              <div className="list-item" onClick={() => { navigate('/addresses'); setIsDrawerOpen(false); }}
                style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#333', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
                <div className="list-item-left">
                  <FaMapMarkerAlt size={18} color={isDarkMode ? "#4da6ff" : "#333"} /> 
                  Saved Addresses
                </div>
                <FaChevronRight color="#ccc" />
              </div>

              <div className="list-item" onClick={() => { navigate('/profile'); setIsDrawerOpen(false); }}
                style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#333', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
                <div className="list-item-left"><FaRegUser size={18} color={isDarkMode ? "#4da6ff" : "#333"} /> Profile</div>
                <FaChevronRight color="#ccc" />
              </div>
              
              {/* Secure admin link (Only visible for bargaincart@admin.com) */}
              {user && user.email === ADMIN_EMAIL && (
                <div className="list-item" onClick={() => { navigate('/admin-dashboard'); setIsDrawerOpen(false); }}
                  style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: '#d32f2f', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
                  <div className="list-item-left"><FaCog size={18} color="#d32f2f" /> Admin Dashboard</div>
                  <FaChevronRight color="#ccc" />
                </div>
              )}

            </div>

            {/* Upgraded Birthday Club Section */}
            <div style={{ margin: '20px', backgroundColor: isDarkMode ? '#2c221e' : '#fef8f2', padding: '15px', borderRadius: '8px', border: '1px solid #febd69' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#b12704', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaGift /> Birthday Club 🎂
              </h4>
              <p style={{ fontSize: '12px', color: isDarkMode ? '#bbb' : '#555', marginBottom: '12px' }}>
                Add your birth date to get special birthday discounts!
              </p>
              
              {!birthdaySaved ? (
                <form onSubmit={handleSaveBirthday}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <select value={bDay} onChange={(e) => setBDay(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none', cursor: 'pointer' }}>
                      <option value="" disabled>Day</option>
                      {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    
                    <select value={bMonth} onChange={(e) => setBMonth(e.target.value)} style={{ flex: 1.2, padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none', cursor: 'pointer' }}>
                      <option value="" disabled>Month</option>
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <select value={bYear} onChange={(e) => setBYear(e.target.value)} style={{ flex: 1.5, padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none', cursor: 'pointer' }}>
                      <option value="" disabled>Year</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  <button type="submit" className="amazon-btn" style={{ width: '100%', padding: '10px', fontSize: '13px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Save Birthday & Claim Perk
                  </button>
                </form>
              ) : (
                <div style={{ backgroundColor: isDarkMode ? '#1e3a1e' : '#e6f4ea', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #2e7d32' : '1px solid #c3e6cb' }}>
                  <div style={{ color: isDarkMode ? '#81c784' : '#007600', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    ✔ Saved: {bDay} {bMonth} {bYear}
                  </div>
                  <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: isDarkMode ? '#aaa' : '#555' }}>Your special discount will be emailed to you on your special day! 🎉</p>
                </div>
              )}
            </div>

            <div className="logout-btn-container">
              {user ? (
                <button className="logout-btn-zepto" onClick={handleLogout}>Log Out</button>
              ) : (
                <button className="logout-btn-zepto" onClick={() => { setIsDrawerOpen(false); navigate('/login'); }}>Sign In / Register</button>
              )}
            </div>

            <div className="app-version" style={{ color: isDarkMode ? '#777' : '#999' }}>App version 26.7.6</div>

          </div>
          <div style={{ flex: 1 }} onClick={() => setIsDrawerOpen(false)}></div>
        </div>
      )}

      {/* Routes */}
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/user-dashboard" element={user ? <UserDashboard user={user} isPremium={isPremium} wishlistItems={wishlistItems} cartItems={cartItems} /> : <Navigate to="/login" />} />
          
          {/* Secure admin route (Only opens for bargaincart@admin.com) */}
          <Route path="/admin-dashboard" element={
            user && user.email === ADMIN_EMAIL ? <AdminDashboard /> : <div style={{padding: '50px', textAlign: 'center', color: isDarkMode ? '#fff' : '#000'}}><h1>Access Denied!</h1><p>You do not have admin privileges.</p></div>
          } />

          <Route path="/" element={<Home activeTab={activeTab} searchQuery={searchQuery} isPremium={isPremium} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/product/:id" element={<ProductDetail key={location.pathname} addToCart={addToCart} addToWishlist={addToWishlist} isPremium={isPremium} />} />
          <Route path="/cart" element={<Cart cartItems={cartItems} removeFromCart={removeFromCart} clearCart={clearCart} updateCartItemPrice={updateCartItemPrice} />} />
          <Route path="/wishlist" element={<Wishlist wishlistItems={wishlistItems} removeFromWishlist={removeFromWishlist} addToCart={addToCart} />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/giftcards" element={<GiftCards />} />
          <Route path="/support" element={<Support />} />
          <Route path="/addresses" element={<Addresses />} />
          <Route path="/profile" element={<Profile user={user} />} />
          <Route path="/premium" element={<Premium user={user} isPremium={isPremium} setIsPremium={setIsPremium} />} />
        </Routes>
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#232f3e', color: '#ddd', padding: '40px 20px 20px 20px', marginTop: 'auto', borderTop: isDarkMode ? '1px solid #333' : 'none' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px', marginBottom: '30px' }}>
          
          <div>
            <h3 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <FaShoppingBag color="#febd69" /> BargainCart
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '15px', color: '#bbb' }}>
              Your trusted e-commerce platform for quality products with AI-powered bargaining.
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <FaFacebook size={20} style={{ cursor: 'pointer' }} />
              <FaTwitter size={20} style={{ cursor: 'pointer' }} />
              <FaInstagram size={20} style={{ cursor: 'pointer' }} />
              <FaLinkedin size={20} style={{ cursor: 'pointer' }} />
            </div>
          </div>

          <div>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>Quick Links</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', lineHeight: '2' }}>
              <li style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Home</li>
              <li style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Products</li>
              <li style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Categories</li>
              <li style={{ cursor: 'pointer' }} onClick={() => navigate('/support')}>AI Bargaining</li>
              <li style={{ cursor: 'pointer' }} onClick={() => navigate('/premium')}>BargainCart Prime</li>
            </ul>
          </div>

          <div>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>Customer Service</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', lineHeight: '2' }}>
              <li style={{ cursor: 'pointer' }}>About Us</li>
              <li style={{ cursor: 'pointer' }} onClick={() => navigate('/support')}>Contact Us</li>
              <li style={{ cursor: 'pointer' }} onClick={() => navigate('/support')}>FAQ</li>
              <li style={{ cursor: 'pointer' }}>Privacy Policy</li>
              <li style={{ cursor: 'pointer' }}>Terms & Conditions</li>
            </ul>
          </div>

          <div>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>Contact Info</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', lineHeight: '2' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <FaEnvelope /> support@bargaincart.com
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <FaPhoneAlt /> +91-7566952724
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <FaMapMarkerAlt style={{ marginTop: '4px' }} /> 123 Main Street, Mau, Uttar Pradesh 275403, India
              </li>
            </ul>
          </div>

        </div>

        <div style={{ borderTop: '1px solid #444', paddingTop: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', fontSize: '13px', color: '#aaa', maxWidth: '1200px', margin: '0 auto' }}>
          <div>© 2026 BargainCart. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
            <span style={{ cursor: 'pointer' }}>Terms & Conditions</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </Router>
  );
}

export default App;