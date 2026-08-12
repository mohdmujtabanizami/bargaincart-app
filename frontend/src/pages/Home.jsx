import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaStar, FaFilter, FaTimes, FaLock, FaMapMarkerAlt, FaPlus, FaCreditCard, FaCheckCircle, FaArrowRight, FaCrown, FaRobot, FaUser, FaLightbulb, FaComments, FaWallet } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { ref, push, onValue, update } from 'firebase/database';
import '../App.css';

// Import central products catalog
import { products } from '../data/products';

function generateOrderId() {
  return "ORD-" + Date.now() + Math.floor(Math.random() * 1000);
}

function Home({ activeTab, searchQuery = '', isPremium }) {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [sortBy, setSortBy] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minRating, setMinRating] = useState('0');
  const [maxPrice, setMaxPrice] = useState(150000);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('address'); 
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkoutAddresses, setCheckoutAddresses] = useState([{ id: 1, name: 'Mohd Mujtaba Nizami', phone: '7566952724', address: 'Main Street', city: 'Mau', state: 'Uttar Pradesh', pincode: '275403' }]);
  const [selectedAddressId, setSelectedAddressId] = useState(1);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', address: '', city: '', state: '', pincode: '' });
  
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiProvider, setUpiProvider] = useState('GPay');
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const walletRef = ref(db, `users/${currentUser.uid}/walletBalance`);
      onValue(walletRef, (snapshot) => {
        setWalletBalance(snapshot.exists() ? snapshot.val() : 0);
      });
    }
  }, []);

  const [showBargainModal, setShowBargainModal] = useState(false);
  const [userOffer, setUserOffer] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [dealAccepted, setDealAccepted] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, showBargainModal]);

  const handleClearFilters = () => {
    setSortBy('newest'); setSelectedCategory('All'); setMinRating('0'); setMaxPrice(150000);
  };

  const filteredProducts = products.filter(p => {
    const matchesTab = activeTab === 'buy' ? p.type === 'buy' : p.type === 'rent';
    const matchesSearch = searchQuery.trim() === '' || p.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch && (selectedCategory === 'All' || p.category === selectedCategory) && p.rating >= parseFloat(minRating) && p.price <= maxPrice;
  }).sort((a, b) => {
    if (sortBy === 'newest') return b.id.localeCompare(a.id);
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  const handleBargainClick = (e, product) => {
    e.stopPropagation();
    if (product.stock === 0 || product.comingSoon) return;
    
    const basePrice = isPremium ? Math.floor(product.price * 0.9) : product.price;
    
    setCheckoutItem(product);
    setNegotiatedPrice(basePrice); 
    setChatMessages([{ sender: 'ai', text: `Hello! I'm your AI bargaining assistant. Current price for ${product.title} is ₹${basePrice.toLocaleString()}. What's your offer?` }]);
    setDealAccepted(false);
    setUserOffer('');
    setShowBargainModal(true);
  };

  const processOffer = (offerValue) => {
    if (dealAccepted || !checkoutItem) return;
    const offerNum = parseFloat(offerValue);
    if (!offerNum) return;

    const basePrice = isPremium ? Math.floor(checkoutItem.price * 0.9) : checkoutItem.price;

    setChatMessages(prev => [...prev, { sender: 'user', text: `₹${offerNum.toLocaleString()}` }]);
    setUserOffer('');

    setTimeout(() => {
      const strictMinPrice = Math.floor(basePrice * 0.85);
      if (offerNum >= basePrice) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: `I happily accept your offer of ₹${offerNum.toLocaleString()}. Deal!` }]);
        setDealAccepted(true);
        setNegotiatedPrice(offerNum);
      } else if (offerNum >= strictMinPrice) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: `I can accept ₹${offerNum.toLocaleString()}! Deal?` }]);
        setDealAccepted(true);
        setNegotiatedPrice(offerNum);
      } else {
        setChatMessages(prev => [...prev, { sender: 'ai', text: `Too low. Best I can do is ₹${strictMinPrice.toLocaleString()}.` }]);
      }
    }, 800);
  };

  const handleBargainSubmit = (e) => {
    e.preventDefault();
    processOffer(userOffer);
  };

  const handleProceedToCheckout = () => {
    setShowBargainModal(false);
    setCheckoutStep('address');
    setIsAddingAddress(false);
    setShowCheckoutModal(true);
  };

  const handleAddNewAddress = (e) => {
    e.preventDefault();
    if(!newAddr.name || !newAddr.phone || !newAddr.address || !newAddr.pincode) return alert("Please fill all details!");
    const newId = Date.now();
    setCheckoutAddresses([...checkoutAddresses, { id: newId, ...newAddr }]);
    setSelectedAddressId(newId);
    setIsAddingAddress(false);
    setNewAddr({ name: '', phone: '', address: '', city: '', state: '', pincode: '' });
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setCardDetails({...cardDetails, expiry: value});
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    const isFullyPaidByWallet = useWallet && walletBalance >= checkoutTotal;

    if (!isFullyPaidByWallet) {
      if (paymentMethod === 'upi' && !upiId) return alert("Please enter a valid UPI ID!");
      if (paymentMethod === 'card' && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name)) return alert("Please fill in all Card details!");
    }

    const currentUser = auth.currentUser;
    const activeAddress = checkoutAddresses.find(a => a.id === selectedAddressId) || checkoutAddresses[0];

    try {
      if (currentUser && checkoutItem) {
        if (useWallet) {
          if (walletBalance >= checkoutTotal) {
            const newWalletBalance = walletBalance - checkoutTotal;
            await update(ref(db, `users/${currentUser.uid}`), { walletBalance: newWalletBalance });
          } else {
            await update(ref(db, `users/${currentUser.uid}`), { walletBalance: 0 });
          }
        }

        const orderData = {
          orderId: generateOrderId(),
          productTitle: checkoutItem.title || "Product",
          productImage: checkoutItem.image || '',
          amount: checkoutTotal,
          status: "Order Placed",
          date: new Date().toLocaleDateString(),
          type: checkoutItem.type,
          address: `${activeAddress.address}, ${activeAddress.city} - ${activeAddress.pincode}`,
          paymentMode: useWallet && walletBalance >= checkoutTotal ? 'BARGAINCART WALLET' : paymentMethod.toUpperCase()
        };

        await push(ref(db, `users/${currentUser.uid}/orders`), orderData);
        await push(ref(db, `orders`), orderData);
      }

      setCheckoutStep('success');
    } catch (error) {
      console.error("Error saving quick order:", error);
      alert("Failed to place order in database.");
    }
  };

  const checkoutTotal = checkoutItem ? negotiatedPrice : 0;

  const renderProductCard = (product) => {
    const isComingSoon = product.comingSoon || false;
    const isOutOfStock = product.stock === 0 && !isComingSoon;
    const isLowStock = product.stock <= 2 && product.stock > 0 && !isComingSoon;
    
    const stockTextColor = isComingSoon ? "#00a8e8" : (isOutOfStock || isLowStock ? "#d32f2f" : (isDarkMode ? "#aaa" : "#555"));
    const stockText = isComingSoon ? "Coming Soon" : (isOutOfStock ? "Out of Stock" : (isLowStock ? `Only ${product.stock} left!` : `${product.stock} left in stock`));

    const finalPrice = isPremium ? Math.floor(product.price * 0.9) : product.price;

    return (
      <div key={product.id} onClick={() => navigate(`/product/${product.id}`)} style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', color: isDarkMode ? '#fff' : '#000', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', padding: '15px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.2s ease', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <div>
          <div style={{ height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '12px', backgroundColor: '#fff', borderRadius: '4px', padding: '5px', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: product.type === 'buy' ? '#131921' : '#00a8e8', color: '#fff', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
              {product.type === 'buy' ? 'For Buy' : 'For Rent'}
            </span>
            <img src={product.image} alt={product.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '6px' }}>{product.title}</h3>
          
          {!isComingSoon && (
            <p style={{ fontSize: '12px', color: '#007185', fontWeight: 'bold' }}>{product.boughtCount.toLocaleString()}+ bought recently</p>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
              {[...Array(5)].map((_, i) => <FaStar key={i} color={i < Math.floor(product.rating) ? '#ffa41c' : '#ccc'} size={12} />)}
              <span style={{ fontSize: '12px', marginLeft: '5px' }}>({product.reviewsCount})</span>
          </div>

          <div style={{ fontSize: '12px', fontWeight: 'bold', color: stockTextColor, marginBottom: '10px' }}>
            {stockText}
          </div>
        </div>
        
        <div>
          {isPremium && !isComingSoon && (
            <div style={{ color: '#d32f2f', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FaCrown color="#ffd814" size={14} /> Prime Member: Extra 10% Off
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ backgroundColor: '#cc0c39', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '12px', fontWeight: 'bold' }}>{product.discountPercent}</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>₹{finalPrice.toLocaleString()} {product.type === 'rent' && <span style={{ fontSize: '11px', color: '#888' }}>/ day</span>}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#565959', marginBottom: '10px' }}>
            M.R.P.: <span style={{ textDecoration: 'line-through' }}>₹{product.originalPrice.toLocaleString()}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }} style={{ flex: 1, padding: '8px', backgroundColor: isDarkMode ? '#333' : '#e3e6e6', color: isDarkMode ? '#fff' : '#111', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>View Details</button>
            
            {product.type === 'buy' ? (
              <button disabled={isOutOfStock || isComingSoon} onClick={(e) => handleBargainClick(e, product)} style={{ flex: 1, padding: '8px', backgroundColor: (isOutOfStock || isComingSoon) ? '#ccc' : '#ffd814', color: '#111', border: (isOutOfStock || isComingSoon) ? 'none' : '1px solid #fcd200', borderRadius: '6px', fontWeight: 'bold', cursor: (isOutOfStock || isComingSoon) ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                {isOutOfStock ? 'Out of Stock' : (isComingSoon ? 'Coming Soon' : <><FaComments /> Bargain & Buy</>)}
              </button>
            ) : (
              <button disabled={isOutOfStock || isComingSoon} onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }} style={{ flex: 1, padding: '8px', backgroundColor: (isOutOfStock || isComingSoon) ? '#ccc' : '#00a8e8', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: (isOutOfStock || isComingSoon) ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                {isOutOfStock ? 'Out of Stock' : (isComingSoon ? 'Coming Soon' : 'Rent Now')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 20px' }}>
        
        {/* Filters Panel Section */}
        <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', color: isDarkMode ? '#fff' : '#000', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', padding: '20px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 'bold' }}><FaFilter /> Filters</div>
            <button onClick={handleClearFilters} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}><FaTimes /> Clear All Filters</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              <div><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Sort By</label><select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000' }}><option value="newest">Newest First</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="rating">Highest Rated</option></select></div>
              <div><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Category</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000' }}>
                  <option value="All">All Categories</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Smart Watch">Smart Watch</option>
                  <option value="Headphones">Headphones</option>
                  <option value="Keyboard">Keyboard</option>
                  <option value="Mouse">Mouse</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Camera">Camera</option>
                  <option value="Speaker">Speaker</option>
                  <option value="Console">Console</option>
                  <option value="Projector">Projector</option>
                  <option value="Drone">Drone</option>
                  <option value="Clothing">Clothing</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>Price Range: ₹0 - ₹{maxPrice.toLocaleString()}</div>
              <input type="range" min="300" max="150000" step="500" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: '#00a8e8' }} />
            </div>
          </div>
        </div>

        {/* Featured Products */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: isDarkMode ? '#fff' : '#111' }}>Featured Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {filteredProducts.filter(p => ['Laptop', 'Console', 'Mobile', 'Camera'].includes(p.category)).map(renderProductCard)}
          </div>
        </div>

        {/* New Arrivals */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: isDarkMode ? '#fff' : '#111' }}>New Arrivals</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {filteredProducts.filter(p => ['Smart Watch', 'Headphones', 'Monitor', 'Projector', 'Drone'].includes(p.category)).map(renderProductCard)}
          </div>
        </div>

        {/* Best Sellers */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px', display: 'flex', alignItems: '10px', gap: '10px', color: isDarkMode ? '#fff' : '#111' }}>Best Sellers</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {filteredProducts.filter(p => ['Keyboard', 'Mouse', 'Speaker', 'Clothing'].includes(p.category)).map(renderProductCard)}
          </div>
        </div>

        {/* AI Bargaining Modal */}
        {showBargainModal && checkoutItem && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#f8f9fa', width: '100%', maxWidth: '950px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
              
              <div style={{ padding: '20px', backgroundColor: isDarkMode ? '#252525' : '#fff', borderBottom: isDarkMode ? '1px solid #333' : '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: '0 0 5px 0', color: isDarkMode ? '#fff' : '#111', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '22px' }}>
                    <FaRobot color={isDarkMode ? '#00a8e8' : '#333'}/> AI Bargaining Assistant
                  </h2>
                  <p style={{ margin: 0, color: isDarkMode ? '#aaa' : '#555', fontSize: '14px' }}>Please negotiate your best price to proceed with the order!</p>
                </div>
                <button onClick={() => setShowBargainModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <FaTimes size={24} color={isDarkMode ? '#888' : '#555'} />
                </button>
              </div>

              <div style={{ display: 'flex', height: '480px' }}>
                
                <div style={{ flex: 1, padding: '30px', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderRight: isDarkMode ? '1px solid #333' : '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '16px', color: isDarkMode ? '#ddd' : '#333', fontWeight: 'normal', marginBottom: '20px' }}>Bargaining for: <br/><strong style={{ color: isDarkMode ? '#fff' : '#111' }}>{checkoutItem.title}</strong></h3>
                  
                  <div style={{ width: '180px', height: '180px', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '12px', margin: '0 auto 30px auto', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
                    <img src={checkoutItem.image} alt={checkoutItem.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ color: isDarkMode ? '#aaa' : '#555', fontSize: '14px' }}>Original Price:</div>
                    <div style={{ color: isDarkMode ? '#bbb' : '#111', fontSize: '18px', textDecoration: 'line-through' }}>₹{checkoutItem.originalPrice.toLocaleString()}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'auto' }}>
                    <div style={{ color: isDarkMode ? '#aaa' : '#555', fontSize: '14px' }}>Current Offer:</div>
                    <div style={{ color: '#00a8e8', fontSize: '28px', fontWeight: 'bold' }}>₹{negotiatedPrice.toLocaleString()}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                    {dealAccepted ? (
                      <button onClick={handleProceedToCheckout} style={{ flex: 2, padding: '12px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <FaCheckCircle /> PROCEED TO ADDRESS
                      </button>
                    ) : (
                      <div style={{ flex: 2, padding: '12px', backgroundColor: isDarkMode ? '#2c2c2c' : '#f1f1f1', color: isDarkMode ? '#666' : '#aaa', border: isDarkMode ? '1px dashed #444' : '1px dashed #ccc', borderRadius: '6px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '13px' }}>
                        <FaLock size={12} style={{ marginRight: '6px' }} /> Negotiate to Unlock Checkout
                      </div>
                    )}
                    <button onClick={() => setShowBargainModal(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '6px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <FaTimes /> CANCEL
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1.2, backgroundColor: isDarkMode ? '#121212' : '#f0f2f5', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '15px 20px', backgroundColor: isDarkMode ? '#1a1a1a' : '#fff', borderBottom: isDarkMode ? '1px solid #333' : '1px solid #ddd', fontSize: '16px', color: isDarkMode ? '#fff' : '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaRobot color="#00a8e8" /> Chat with AI
                  </div>

                  <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                        {msg.sender === 'ai' && (
                          <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#00a8e8', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                            <FaRobot size={18} />
                          </div>
                        )}
                        
                        <div style={{ 
                          backgroundColor: msg.sender === 'user' ? '#00a8e8' : (isDarkMode ? '#2c2c2c' : '#fff'), 
                          color: msg.sender === 'user' ? '#fff' : (isDarkMode ? '#ddd' : '#333'), 
                          border: msg.sender === 'user' ? 'none' : (isDarkMode ? '1px solid #444' : '1px solid #ddd'), 
                          padding: '15px', borderRadius: '8px', maxWidth: '85%', fontSize: '14px', lineHeight: '1.5', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' 
                        }}>
                          {msg.text}
                        </div>

                        {msg.sender === 'user' && (
                          <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#e53e3e', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                            <FaUser size={16} />
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {!dealAccepted && (
                    <div style={{ padding: '10px 20px', borderTop: isDarkMode ? '1px solid #333' : '1px solid #ddd', backgroundColor: isDarkMode ? '#1a1a1a' : '#f9f9f9', display: 'flex', gap: '10px', alignItems: 'center', overflowX: 'auto' }}>
                      <FaLightbulb color="#febd69" size={18} />
                      <span style={{ fontSize: '12px', color: isDarkMode ? '#aaa' : '#666', fontWeight: 'bold' }}>Smart Offers:</span>
                      <button onClick={() => processOffer(negotiatedPrice * 0.90)} style={{ padding: '6px 12px', backgroundColor: isDarkMode ? '#333' : '#e3f2fd', color: isDarkMode ? '#90caf9' : '#0d47a1', border: isDarkMode ? '1px solid #555' : '1px solid #90caf9', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Offer ₹{Math.floor(negotiatedPrice * 0.90).toLocaleString()} (10% Off)
                      </button>
                      <button onClick={() => processOffer(negotiatedPrice * 0.85)} style={{ padding: '6px 12px', backgroundColor: isDarkMode ? '#333' : '#e3f2fd', color: isDarkMode ? '#90caf9' : '#0d47a1', border: isDarkMode ? '1px solid #555' : '1px solid #90caf9', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Offer ₹{Math.floor(negotiatedPrice * 0.85).toLocaleString()} (15% Off)
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleBargainSubmit} style={{ display: 'flex', gap: '10px', padding: '15px 20px', backgroundColor: isDarkMode ? '#252525' : '#fff', borderTop: isDarkMode ? '1px solid #333' : '1px solid #ddd' }}>
                    <input type="number" placeholder="Type your custom offer (₹)" value={userOffer} onChange={(e) => setUserOffer(e.target.value)} disabled={dealAccepted} style={{ flex: 1, padding: '12px 15px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#121212' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '14px', outline: 'none' }} />
                    <button type="submit" disabled={dealAccepted} style={{ padding: '0 25px', backgroundColor: dealAccepted ? (isDarkMode ? '#444' : '#ccc') : '#00a8e8', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: dealAccepted ? 'not-allowed' : 'pointer' }}>Send</button>
                  </form>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* Checkout Modal (Address & Payment) */}
        {showCheckoutModal && checkoutItem && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', color: isDarkMode ? '#fff' : '#111', width: '100%', maxWidth: '650px', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ padding: '20px', borderBottom: isDarkMode ? '1px solid #333' : '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaLock color="#00a8e8" /> Secure Checkout</h2>
                <button onClick={() => setShowCheckoutModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FaTimes size={20} color={isDarkMode ? '#888' : '#555'} /></button>
              </div>

              <div style={{ padding: '30px', maxHeight: '75vh', overflowY: 'auto' }}>
                
                {/* Address Step */}
                {checkoutStep === 'address' && (
                  <>
                    <h3 style={{ fontSize: '18px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaMapMarkerAlt color="#007185"/> Select Delivery Address</h3>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', padding: '10px', backgroundColor: isDarkMode ? '#2c2c2c' : '#f9f9f9', borderRadius: '8px' }}>
                      <img src={checkoutItem.image} alt="item" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
                      <div>
                        <strong style={{ fontSize: '14px', display: 'block' }}>{checkoutItem.title}</strong>
                        <span style={{ color: '#B12704', fontWeight: 'bold' }}>₹{checkoutTotal.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {checkoutAddresses.map(addr => (
                      <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)} style={{ padding: '15px', border: selectedAddressId === addr.id ? '2px solid #e47911' : '1px solid #ccc', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', display: 'flex', gap: '15px' }}>
                        <input type="radio" checked={selectedAddressId === addr.id} readOnly style={{ accentColor: '#e47911' }} />
                        <div><strong>{addr.name}</strong><div style={{ fontSize: '13px' }}>{addr.address}, {addr.city}</div></div>
                      </div>
                    ))}

                    {!isAddingAddress ? (
                      <button onClick={() => setIsAddingAddress(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#007185', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', fontSize: '14px' }}>
                        <FaPlus /> Add a new address
                      </button>
                    ) : (
                      <form onSubmit={handleAddNewAddress} style={{ marginTop: '20px', padding: '20px', backgroundColor: isDarkMode ? '#252525' : '#f9f9f9', borderRadius: '8px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd' }}>
                        <h4 style={{ margin: '0 0 15px 0' }}>Add New Address</h4>
                        <input type="text" placeholder="Full Name" value={newAddr.name} onChange={e=>setNewAddr({...newAddr, name: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', background: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required/>
                        <input type="text" placeholder="Mobile Number" value={newAddr.phone} onChange={e=>setNewAddr({...newAddr, phone: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', background: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required/>
                        <input type="text" placeholder="Full Address / Area" value={newAddr.address} onChange={e=>setNewAddr({...newAddr, address: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', background: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required/>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <input type="text" placeholder="City" value={newAddr.city} onChange={e=>setNewAddr({...newAddr, city: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required/>
                          <input type="text" placeholder="Pincode" value={newAddr.pincode} onChange={e=>setNewAddr({...newAddr, pincode: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required/>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                          <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Save & Use Address</button>
                          <button type="button" onClick={() => setIsAddingAddress(false)} style={{ flex: 1, padding: '10px', background: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </form>
                    )}

                    {!isAddingAddress && (
                      <button onClick={() => setCheckoutStep('payment')} style={{ width: '100%', padding: '12px', backgroundColor: '#ffd814', color: '#111', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', marginTop: '20px', cursor: 'pointer' }}>Deliver to this address</button>
                    )}
                  </>
                )}

                {/* Payment Step with Wallet & Gift Card */}
                {checkoutStep === 'payment' && (
                  <form onSubmit={handlePaymentSubmit}>
                    <h3 style={{ fontSize: '18px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaCreditCard color="#007185"/> Choose Payment Method</h3>
                    
                    <div style={{ padding: '15px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #ddd', backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa' }}>
                      <h4 style={{ margin: '0 0 10px 0' }}>Order Summary</h4>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#B12704' }}>
                        Total Payable Amount: ₹{checkoutTotal.toLocaleString()}
                        {useWallet && <span style={{ fontSize: '13px', color: '#10b981', display: 'block' }}>(Paying via Wallet Balance: ₹{Math.min(walletBalance, checkoutTotal).toLocaleString()})</span>}
                      </p>
                    </div>

                    {/* BargainCart Cash & Gift Card Wallet Option */}
                    <div style={{ border: '2px solid #9b51e0', borderRadius: '8px', padding: '15px', marginBottom: '20px', backgroundColor: isDarkMode ? '#221a2d' : '#fcf5ff' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#9b51e0' }}>
                        <input 
                          type="checkbox" 
                          checked={useWallet} 
                          onChange={() => setUseWallet(!useWallet)} 
                          style={{ width: '18px', height: '18px', accentColor: '#9b51e0' }}
                        />
                        <FaWallet /> Pay with BargainCart Cash & Gift Card (Available: ₹{walletBalance.toLocaleString()})
                      </label>
                      {useWallet && walletBalance < checkoutTotal && (
                        <p style={{ fontSize: '12px', color: '#d97706', margin: '8px 0 0 28px' }}>
                          Wallet balance is less than total amount. Remaining ₹{Math.max(0, checkoutTotal - walletBalance).toLocaleString()} will be covered or you can uncheck to pay fully via other methods.
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      
                      <div style={{ border: isDarkMode ? '1px solid #444' : '1px solid #ccc', borderRadius: '8px', padding: '12px', backgroundColor: paymentMethod === 'upi' ? (isDarkMode ? '#222' : '#f0f8ff') : 'transparent' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', marginBottom: paymentMethod === 'upi' ? '15px' : '0' }}>
                          <input type="radio" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} style={{ accentColor: '#00a8e8' }} /> UPI (Google Pay / Paytm)
                        </label>
                        
                        {paymentMethod === 'upi' && (
                          <div style={{ paddingLeft: '25px', marginTop: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                              {['GPay', 'PhonePe', 'Paytm'].map(provider => (
                                <button type="button" key={provider} onClick={() => setUpiProvider(provider)} style={{ padding: '6px 12px', borderRadius: '4px', border: upiProvider === provider ? '2px solid #00a8e8' : (isDarkMode ? '1px solid #555' : '1px solid #ccc'), backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000', cursor: 'pointer', fontSize: '13px', fontWeight: upiProvider === provider ? 'bold' : 'normal' }}>
                                  {provider}
                                </button>
                              ))}
                            </div>
                            <div style={{ fontSize: '12px', marginBottom: '5px', color: isDarkMode ? '#aaa' : '#666' }}>Enter UPI ID:</div>
                            <input type="text" placeholder="e.g. username@oksbi / mobile@paytm" value={upiId} onChange={e=>setUpiId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={paymentMethod === 'upi' && (!useWallet || walletBalance < checkoutTotal)} />
                          </div>
                        )}
                      </div>

                      <div style={{ border: isDarkMode ? '1px solid #444' : '1px solid #ccc', borderRadius: '8px', padding: '12px', backgroundColor: paymentMethod === 'card' ? (isDarkMode ? '#222' : '#f0f8ff') : 'transparent' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', marginBottom: paymentMethod === 'card' ? '15px' : '0' }}>
                          <input type="radio" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} style={{ accentColor: '#00a8e8' }} /> Credit / Debit Card
                        </label>

                        {paymentMethod === 'card' && (
                          <div style={{ paddingLeft: '25px', marginTop: '10px' }}>
                            <div style={{ fontSize: '12px', marginBottom: '5px', color: isDarkMode ? '#aaa' : '#666' }}>Card Number:</div>
                            <input type="text" name="clean-home-card-num" autoComplete="off" placeholder="4444 4444 4444 4444" value={cardDetails.number} onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})} maxLength={16} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={paymentMethod === 'card' && (!useWallet || walletBalance < checkoutTotal)} />
                            
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', marginBottom: '5px', color: isDarkMode ? '#aaa' : '#666' }}>Expiry (MM/YY):</div>
                                <input type="text" name="clean-home-card-exp" autoComplete="off" placeholder="MM/YY" value={cardDetails.expiry} onChange={handleExpiryChange} maxLength={5} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={paymentMethod === 'card' && (!useWallet || walletBalance < checkoutTotal)} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', marginBottom: '5px', color: isDarkMode ? '#aaa' : '#666' }}>CVV:</div>
                                <input type="password" name="clean-home-card-cvv" autoComplete="off" placeholder="***" value={cardDetails.cvv} onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})} maxLength={4} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={paymentMethod === 'card' && (!useWallet || walletBalance < checkoutTotal)} />
                              </div>
                            </div>

                            <div style={{ fontSize: '12px', marginBottom: '5px', color: isDarkMode ? '#aaa' : '#666' }}>Name on Card:</div>
                            <input type="text" name="clean-home-card-name" autoComplete="off" placeholder="Cardholder Name" value={cardDetails.name} onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={paymentMethod === 'card' && (!useWallet || walletBalance < checkoutTotal)} />
                          </div>
                        )}
                      </div>

                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                      <button type="button" onClick={() => setCheckoutStep('address')} style={{ flex: 1, padding: '12px', border: isDarkMode ? '1px solid #666' : '1px solid #ccc', background: 'transparent', color: isDarkMode ? '#ccc' : '#555', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Back</button>
                      <button type="submit" style={{ flex: 2, padding: '12px', backgroundColor: '#ffd814', color: '#111', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                        Place Order & Pay ₹{checkoutTotal.toLocaleString()} <FaArrowRight />
                      </button>
                    </div>
                  </form>
                )}

                {checkoutStep === 'success' && (
                  <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                    <FaCheckCircle color="#007600" size={60} style={{ marginBottom: '15px' }} />
                    <h2 style={{ color: '#007600', marginBottom: '10px' }}>Order Placed Successfully!</h2>
                    <p style={{ fontSize: '14px', color: isDarkMode ? '#aaa' : '#666', marginBottom: '30px' }}>Your order for <strong>{checkoutItem.title}</strong> has been placed successfully.</p>
                    <button onClick={() => setShowCheckoutModal(false)} style={{ padding: '12px 30px', backgroundColor: '#ffd814', color: '#111', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

    </div>
  );
}

export default Home;