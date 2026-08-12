import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaTrash, FaShoppingBag, FaKey, FaArrowRight, FaShieldAlt, FaCheckCircle, FaMapMarkerAlt, FaCreditCard, FaComments, FaTimes, FaCalendarAlt, FaPlus, FaMinus, FaRobot, FaUser, FaLightbulb, FaLock, FaWallet } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { ref, push, onValue, update, get } from 'firebase/database';
import '../App.css';

// Import central products catalog
import { products } from '../data/products';

function generateOrderId() {
  return "ORD-" + Date.now() + Math.floor(Math.random() * 1000);
}

function Cart({ cartItems, removeFromCart, clearCart, updateCartItemPrice }) {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [activeCartTab, setActiveCartTab] = useState('buy'); // 'buy' or 'rent'
  
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [checkoutType, setCheckoutType] = useState('buy'); // 'buy' or 'rent'

  const [showBargainModal, setShowBargainModal] = useState(false);
  const [bargainIndex, setBargainIndex] = useState(null);
  const [userOffer, setUserOffer] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [dealAccepted, setDealAccepted] = useState(false);
  const chatEndRef = useRef(null);

  const [rentalDaysMap, setRentalDaysMap] = useState({});
  const [quantities, setQuantities] = useState({});

  const [kycForm, setKycForm] = useState({
    fullName: '',
    phone: '',
    idType: 'Government ID (National ID)',
    idNumber: '',
    idPhoto: null,
    agreedToTerms: false
  });

  // Replaced hardcoded address with empty state to fetch dynamically from Firebase
  const [checkoutAddresses, setCheckoutAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', address: '', city: '', state: '', pincode: '' });

  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const walletRef = ref(db, `users/${currentUser.uid}/walletBalance`);
      onValue(walletRef, (snapshot) => {
        setWalletBalance(snapshot.exists() ? snapshot.val() : 0);
      });

      // Fetch user's saved addresses dynamically from Firebase
      const addressesRef = ref(db, `users/${currentUser.uid}/addresses`);
      get(addressesRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const loadedAddresses = Object.keys(data).map((key) => ({
            id: key,
            ...data[key]
          }));
          setCheckoutAddresses(loadedAddresses);
          if (loadedAddresses.length > 0) {
            setSelectedAddressId(loadedAddresses[0].id);
          }
        } else {
          setCheckoutAddresses([]);
          setIsAddingAddress(true); // Automatically open add address form if no address exists
        }
      }).catch((error) => {
        console.error("Error fetching addresses:", error);
      });
    }
  }, []);

  // Group similar products together and manage their quantities
  const rawCartItems = Array.isArray(cartItems) ? cartItems.map(cartItem => {
    const matchedProduct = products.find(p => p.id === cartItem.id);
    return matchedProduct ? { ...cartItem, image: matchedProduct.image, title: matchedProduct.title } : cartItem;
  }) : [];

  // Group items by ID to avoid duplicates and handle quantity
  const groupedCartItems = rawCartItems.reduce((acc, item) => {
    const existing = acc.find(i => i.id === item.id);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      acc.push({ ...item, quantity: item.quantity || 1 });
    }
    return acc;
  }, []);

  const buyItems = groupedCartItems.filter(item => item.type === 'buy');
  const rentItems = groupedCartItems.filter(item => item.type === 'rent');

  const handleQuantityChange = (index, delta, type) => {
    const targetList = type === 'buy' ? buyItems : rentItems;
    const item = targetList[index];
    const currentQty = quantities[item.id] || item.quantity || 1;
    const newQty = Math.max(1, currentQty + delta);
    setQuantities({
      ...quantities,
      [item.id]: newQty
    });
  };

  const buyTotal = buyItems.reduce((acc, item) => {
    const qty = quantities[item.id] || item.quantity || 1;
    const price = item.finalPrice || item.price || 0;
    return acc + (price * qty);
  }, 0);
  
  const rentTotal = rentItems.reduce((acc, item, idx) => {
    const days = parseInt(rentalDaysMap[idx]) || 1;
    const qty = quantities[item.id] || item.quantity || 1;
    const itemPrice = item.price || item.finalPrice || 0;
    return acc + (itemPrice * days * qty);
  }, 0);

  const totalSecurityDeposit = rentItems.reduce((acc, item) => {
    const qty = quantities[item.id] || item.quantity || 1;
    return acc + ((item.securityDeposit || 0) * qty);
  }, 0);

  const totalRentPayable = rentTotal + totalSecurityDeposit;

  const totalAmount = checkoutType === 'buy' ? buyTotal : totalRentPayable;
  const finalPayable = useWallet ? Math.max(0, totalAmount - walletBalance) : totalAmount;

  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatMessages, showBargainModal]);

  const handleDaysChange = (index, daysVal) => {
    setRentalDaysMap({
      ...rentalDaysMap,
      [index]: daysVal
    });
  };

  const handleOpenBargainModal = (index) => {
    setBargainIndex(index);
    const targetItem = buyItems[index];
    const currentPrice = targetItem.finalPrice || targetItem.price || 0;
    
    setChatMessages([
      { sender: 'ai', text: `Hello! I'm your AI bargaining assistant. Current price is ₹${currentPrice.toLocaleString()}. What's your offer?` }
    ]);
    setDealAccepted(false);
    setUserOffer('');
    setShowBargainModal(true);
  };

  const processCartOffer = (offerValue) => {
    if (dealAccepted) return;
    const offerNum = parseFloat(offerValue);
    if (!offerNum) return;

    setChatMessages(prev => [...prev, { sender: 'user', text: `₹${offerNum.toLocaleString()}` }]);
    setUserOffer('');

    setTimeout(() => {
      const targetItem = buyItems[bargainIndex];
      const targetPrice = targetItem.price || targetItem.finalPrice || 0;
      const strictMinPrice = targetPrice === 74999 ? 60999 : Math.floor(targetPrice * 0.85);

      if (offerNum >= targetPrice) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: `I happily accept your offer of ₹${offerNum.toLocaleString()}. Deal!` }]);
        setDealAccepted(true);
        updateCartItemPrice(bargainIndex, targetPrice);
      } else if (offerNum >= strictMinPrice) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: `I can accept ₹${offerNum.toLocaleString()}! Deal?` }]);
        setDealAccepted(true);
        updateCartItemPrice(bargainIndex, offerNum);
      } else {
        setChatMessages(prev => [...prev, { sender: 'ai', text: `Too low. Best I can do for this item is ₹${strictMinPrice.toLocaleString()}.` }]);
      }
    }, 800);
  };

  const handleCartBargainSubmit = (e) => {
    e.preventDefault();
    processCartOffer(userOffer);
  };

  const handleRentCheckoutClick = () => {
    setCheckoutType('rent');
    setCheckoutStep('kyc'); 
  };

  const handleKycSubmit = (e) => {
    e.preventDefault();
    if (!kycForm.fullName || !kycForm.phone || !kycForm.idNumber) {
      alert("Please fill in all KYC details!");
      return;
    }
    for (let i = 0; i < rentItems.length; i++) {
      const d = parseInt(rentalDaysMap[i]);
      if (!rentalDaysMap[i] || isNaN(d) || d <= 0) {
        alert(`Please enter number of days for item #${i + 1}!`);
        return;
      }
    }
    if (!kycForm.agreedToTerms) {
      alert("You must agree to the Anti-Theft Terms & Legal Conditions to rent this item!");
      return;
    }
    setCheckoutStep('address');
  };

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    if(!newAddr.name || !newAddr.phone || !newAddr.address || !newAddr.pincode) {
      alert("Please fill all details!");
      return;
    }
    const currentUser = auth.currentUser;
    if (currentUser) {
      const newAddressData = { 
        name: newAddr.name, 
        phone: newAddr.phone, 
        address: newAddr.address, 
        city: newAddr.city, 
        state: newAddr.state || 'Uttar Pradesh', 
        pincode: newAddr.pincode 
      };
      
      try {
        const newAddrRef = push(ref(db, `users/${currentUser.uid}/addresses`), newAddressData);
        const createdAddr = { id: newAddrRef.key, ...newAddressData };
        setCheckoutAddresses([...checkoutAddresses, createdAddr]);
        setSelectedAddressId(newAddrRef.key);
        setIsAddingAddress(false);
        setNewAddr({ name: '', phone: '', address: '', city: '', state: '', pincode: '' });
      } catch (error) {
        console.error("Error saving address:", error);
        alert("Failed to save address.");
      }
    }
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    if (!selectedAddressId || checkoutAddresses.length === 0) {
      alert("Please select or add a delivery address!");
      return;
    }
    setCheckoutStep('payment');
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
    const isFullyPaidByWallet = useWallet && walletBalance >= totalAmount;

    if (!isFullyPaidByWallet) {
      if (paymentMethod === 'upi' && !upiId) {
        alert("Please enter a valid UPI ID!");
        return;
      }
      if (paymentMethod === 'card') {
        if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
          alert("Please fill in all Card details!");
          return;
        }
      }
    }

    const currentUser = auth.currentUser;
    const itemsToOrder = checkoutType === 'buy' ? buyItems : rentItems;

    try {
      if (currentUser) {
        if (useWallet) {
          if (walletBalance >= totalAmount) {
            const newWalletBalance = walletBalance - totalAmount;
            await update(ref(db, `users/${currentUser.uid}`), { walletBalance: newWalletBalance });
          } else {
            await update(ref(db, `users/${currentUser.uid}`), { walletBalance: 0 });
          }
        }

        for (const item of itemsToOrder) {
          const qty = quantities[item.id] || item.quantity || 1;
          const orderData = {
            orderId: generateOrderId(), 
            productTitle: `${item.title || "Product"} (Qty: ${qty})`,
            productImage: item.image || (item.images ? item.images[0] : ''), 
            amount: checkoutType === 'buy' ? ((item.finalPrice || item.price || 0) * qty) : ((item.price * (parseInt(rentalDaysMap[0]) || 1)) * qty),
            status: "Order Placed",
            date: new Date().toLocaleDateString(),
            type: checkoutType,
            address: `${activeAddress.address}, ${activeAddress.city} - ${activeAddress.pincode}`,
            paymentMode: useWallet && walletBalance >= totalAmount ? 'BARGAINCART WALLET' : paymentMethod.toUpperCase()
          };

          await push(ref(db, `users/${currentUser.uid}/orders`), orderData);
          await push(ref(db, `orders`), orderData);
        }
      }

      setCheckoutStep('success');
      clearCart(checkoutType);
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order in database.");
    }
  };

  const activeAddress = checkoutAddresses.find(a => a.id === selectedAddressId) || checkoutAddresses[0];
  const currentBargainItem = bargainIndex !== null ? buyItems[bargainIndex] : null;
  const currentBargainPrice = currentBargainItem ? (currentBargainItem.finalPrice || currentBargainItem.price || 0) : 0;
  
  const getOriginalPrice = (item) => {
    if (!item) return 5999;
    if (item.originalPrice) return item.originalPrice;
    const price = item.price || item.finalPrice || 0;
    if (price === 19990) return 29990;
    if (price === 74999) return 99999;
    if (price === 2499) return 4999;
    if (price === 3499) return 5999;
    return Math.round(price * 1.4);
  };
  const currentBargainOriginalPrice = getOriginalPrice(currentBargainItem);

  return (
    <div style={{ 
      maxWidth: '1100px', 
      margin: '30px auto', 
      padding: '20px', 
      backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', 
      color: isDarkMode ? '#fff' : '#000',
      borderRadius: '8px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease'
    }}>
      
      {checkoutStep === 'success' ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <FaCheckCircle size={70} color="#007600" style={{ marginBottom: '15px' }} />
          <h1 style={{ color: '#007600', marginBottom: '10px' }}>Congratulations! Order Placed Successfully!</h1>
          <p style={{ fontSize: '15px', color: isDarkMode ? '#ccc' : '#555', marginBottom: '20px' }}>
            Thank you for shopping with <strong>BargainCart</strong>. Your order has been placed and will be delivered soon to <strong>{activeAddress?.city || 'your city'}</strong>.
          </p>
          <div style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa', padding: '15px', borderRadius: '6px', maxWidth: '400px', margin: '0 auto 25px auto', textAlign: 'left', fontSize: '13px', color: isDarkMode ? '#fff' : '#333', border: isDarkMode ? '1px solid #444' : 'none' }}>
            <p style={{ margin: '0 0 5px 0' }}><strong>Delivery Address:</strong> {activeAddress ? `${activeAddress.address}, ${activeAddress.city} - ${activeAddress.pincode}` : 'N/A'}</p>
            <p style={{ margin: '0 0 5px 0' }}><strong>Contact:</strong> {activeAddress?.phone || 'N/A'}</p>
            <p style={{ margin: '0 0 5px 0' }}><strong>Payment Mode:</strong> {useWallet && walletBalance >= totalAmount ? 'BargainCart Wallet / Gift Card' : paymentMethod.toUpperCase()}</p>
          </div>
          <button 
            onClick={() => { setCheckoutStep('cart'); navigate('/'); }} 
            className="amazon-btn" 
            style={{ padding: '12px 30px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
            Continue Shopping
          </button>
        </div>
      ) : checkoutStep === 'kyc' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #ddd', paddingBottom: '15px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', color: isDarkMode ? '#fff' : '#131921', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaShieldAlt color="#00a8e8" /> Step 1: Secure Rental KYC Verification
            </h2>
            <button onClick={() => setCheckoutStep('cart')} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', fontWeight: 'bold' }}>
              ← Back to Cart
            </button>
          </div>

          <form onSubmit={handleKycSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Full Legal Name:</label>
            <input 
              type="text" 
              placeholder="Enter your name as per Govt ID"
              value={kycForm.fullName}
              onChange={(e) => setKycForm({...kycForm, fullName: e.target.value})}
              style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '14px' }}
              required
            />

            <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Mobile Number:</label>
            <input 
              type="tel" 
              placeholder="10-digit mobile number"
              value={kycForm.phone}
              onChange={(e) => setKycForm({...kycForm, phone: e.target.value})}
              style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '14px' }}
              required
            />

            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Govt ID Type:</label>
                <select 
                  value={kycForm.idType}
                  onChange={(e) => setKycForm({...kycForm, idType: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '14px' }}>
                  <option value="Government ID">Government ID (National ID)</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Voter ID">Voter ID / Driving License</option>
                </select>
              </div>
              <div style={{ flex: 1.2 }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ID Number / Reference:</label>
                <input 
                  type="text" 
                  placeholder="Enter ID Reference Number"
                  value={kycForm.idNumber}
                  onChange={(e) => setKycForm({...kycForm, idNumber: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '14px' }}
                  required
                />
              </div>
            </div>

            <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Upload Govt ID Photo (Front / Back):</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setKycForm({...kycForm, idPhoto: e.target.files[0]})}
              style={{ width: '100%', padding: '8px', marginBottom: '20px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '13px' }}
              required
            />

            <div style={{ backgroundColor: isDarkMode ? '#3b2f0c' : '#fff3cd', border: isDarkMode ? '1px solid #665200' : '1px solid #ffeeba', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '11px', color: isDarkMode ? '#ffda6a' : '#856404', lineHeight: '1.4' }}>
              <strong>Strict Legal Warning & Anti-Theft Policy:</strong><br />
              Failure to return rented equipment on time or willful damage will attract strict legal action.
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '20px' }}>
              <input 
                type="checkbox" 
                id="cartTerms"
                checked={kycForm.agreedToTerms}
                onChange={(e) => setKycForm({...kycForm, agreedToTerms: e.target.checked})}
                style={{ marginTop: '3px' }}
                required
              />
              <label htmlFor="cartTerms" style={{ fontSize: '12px', color: isDarkMode ? '#ccc' : '#333', cursor: 'pointer' }}>
                I declare that my KYC details are authentic and agree to abide by rental and security deposit policies.
              </label>
            </div>

            <button type="submit" className="amazon-btn" style={{ width: '100%', padding: '12px', backgroundColor: '#00a8e8', color: '#fff', border: 'none', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>
              Verify KYC & Proceed to Address <FaArrowRight />
            </button>
          </form>
        </div>
      ) : checkoutStep === 'address' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #ddd', paddingBottom: '15px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', color: isDarkMode ? '#fff' : '#131921', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaMapMarkerAlt color="#B12704" /> Select Delivery Address
            </h2>
            <button onClick={() => setCheckoutStep(checkoutType === 'rent' ? 'kyc' : 'cart')} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', fontWeight: 'bold' }}>
              ← Back
            </button>
          </div>

          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '15px', color: isDarkMode ? '#ddd' : '#333' }}>Choose from Saved Addresses:</h3>
            
            {checkoutAddresses.length > 0 ? (
              checkoutAddresses.map(addr => (
                <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)} style={{ padding: '15px', border: selectedAddressId === addr.id ? '2px solid #e47911' : (isDarkMode ? '1px solid #444' : '1px solid #ddd'), borderRadius: '8px', marginBottom: '10px', backgroundColor: selectedAddressId === addr.id ? (isDarkMode ? '#3b2f15' : '#fdf8f4') : (isDarkMode ? '#2c2c2c' : '#fff'), cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                  <input type="radio" checked={selectedAddressId === addr.id} readOnly style={{ marginTop: '4px', accentColor: '#e47911' }} />
                  <div>
                    <strong style={{ fontSize: '15px', display: 'block', marginBottom: '5px' }}>{addr.name}</strong>
                    <div style={{ fontSize: '13px', color: isDarkMode ? '#ccc' : '#555', lineHeight: '1.5' }}>
                      {addr.address}, {addr.city}, {addr.state} {addr.pincode} <br/>
                      Phone: {addr.phone}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: isDarkMode ? '#aaa' : '#666', fontStyle: 'italic', marginBottom: '15px' }}>No saved addresses found. Please add a new delivery address below.</p>
            )}

            {!isAddingAddress ? (
              <button onClick={() => setIsAddingAddress(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#007185', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', fontSize: '14px', marginBottom: '25px' }}>
                <FaPlus /> Add a new address
              </button>
            ) : (
              <form onSubmit={handleAddNewAddress} style={{ marginTop: '15px', padding: '20px', backgroundColor: isDarkMode ? '#252525' : '#f9f9f9', borderRadius: '8px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', marginBottom: '25px' }}>
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
                  {checkoutAddresses.length > 0 && (
                    <button type="button" onClick={() => setIsAddingAddress(false)} style={{ flex: 1, padding: '10px', background: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                  )}
                </div>
              </form>
            )}

            {!isAddingAddress && checkoutAddresses.length > 0 && (
              <button onClick={handleAddressSubmit} className="amazon-btn" style={{ width: '100%', padding: '12px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>
                Deliver to this address & Proceed to Payment <FaArrowRight />
              </button>
            )}
          </div>
        </div>
      ) : checkoutStep === 'payment' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #ddd', paddingBottom: '15px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', color: isDarkMode ? '#fff' : '#131921', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaCreditCard color="#0f4c81" /> Choose Payment Method
            </h2>
            <button onClick={() => setCheckoutStep('address')} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', fontWeight: 'bold' }}>
              ← Back to Address
            </button>
          </div>

          <form onSubmit={handlePaymentSubmit} style={{ maxWidth: '600px', margin: '0 auto' }} autoComplete="off">
            <div style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa', padding: '15px', borderRadius: '6px', marginBottom: '20px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd' }}>
              <h4 style={{ margin: '0 0 10px 0', color: isDarkMode ? '#fff' : '#333' }}>Order Summary ({checkoutType === 'buy' ? 'Buy Order' : 'Rental Order'})</h4>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Deliver to: <strong>{activeAddress?.name} ({activeAddress?.city} - {activeAddress?.pincode})</strong></p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#B12704' }}>
                Total Payable Amount: ₹{totalAmount.toLocaleString()}
                {useWallet && <span style={{ fontSize: '13px', color: '#10b981', display: 'block' }}>(Paying via Wallet Balance: ₹{Math.min(walletBalance, totalAmount).toLocaleString()})</span>}
              </p>
            </div>

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
              {useWallet && walletBalance < totalAmount && (
                <p style={{ fontSize: '12px', color: '#d97706', margin: '8px 0 0 28px' }}>
                  Wallet balance is less than total amount. Remaining ₹{finalPayable.toLocaleString()} will be covered or you can uncheck to pay fully via other methods.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
              <div style={{ border: isDarkMode ? '1px solid #444' : '1px solid #ccc', borderRadius: '6px', padding: '12px', backgroundColor: paymentMethod === 'upi' ? (isDarkMode ? '#222' : '#f0f8ff') : (isDarkMode ? '#1e1e1e' : '#fff') }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input type="radio" name="payment" value="upi" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} />
                  UPI (Google Pay / PhonePe / Paytm)
                </label>
                
                {paymentMethod === 'upi' && (
                  <div style={{ marginTop: '12px', paddingLeft: '24px' }}>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#aaa' : '#555' }}>Enter UPI ID:</label>
                    <input 
                      type="text" 
                      name="clean-upi-input"
                      autoComplete="off"
                      placeholder="e.g. username@oksbi / mobile@paytm"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '13px' }}
                      required={paymentMethod === 'upi' && (!useWallet || walletBalance < totalAmount)}
                    />
                  </div>
                )}
              </div>

              <div style={{ border: isDarkMode ? '1px solid #444' : '1px solid #ccc', borderRadius: '6px', padding: '12px', backgroundColor: paymentMethod === 'card' ? (isDarkMode ? '#222' : '#f0f8ff') : (isDarkMode ? '#1e1e1e' : '#fff') }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
                  Credit / Debit Card
                </label>

                {paymentMethod === 'card' && (
                  <div style={{ marginTop: '12px', paddingLeft: '24px' }}>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#aaa' : '#555' }}>Card Number:</label>
                    <input 
                      type="text" 
                      name="clean-card-number"
                      autoComplete="off"
                      placeholder="4444 4444 4444 4444"
                      maxLength="19"
                      value={cardDetails.number}
                      onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                      style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '13px' }}
                      required={paymentMethod === 'card' && (!useWallet || walletBalance < totalAmount)}
                    />

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#aaa' : '#555' }}>Expiry (MM/YY):</label>
                        <input 
                          type="text" 
                          name="clean-card-expiry"
                          autoComplete="off"
                          placeholder="MM/YY"
                          maxLength="5"
                          value={cardDetails.expiry}
                          onChange={handleExpiryChange}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '13px' }}
                          required={paymentMethod === 'card' && (!useWallet || walletBalance < totalAmount)}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#aaa' : '#555' }}>CVV:</label>
                        <input 
                          type="password" 
                          name="clean-card-cvv"
                          autoComplete="off"
                          placeholder="123"
                          maxLength="4"
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '13px' }}
                          required={paymentMethod === 'card' && (!useWallet || walletBalance < totalAmount)}
                        />
                      </div>
                    </div>

                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#aaa' : '#555' }}>Name on Card:</label>
                    <input 
                      type="text" 
                      name="clean-card-name"
                      autoComplete="off"
                      placeholder="Cardholder Name"
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '13px' }}
                      required={paymentMethod === 'card' && (!useWallet || walletBalance < totalAmount)}
                    />
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="amazon-btn" style={{ width: '100%', padding: '12px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>
              Place Order & Pay ₹{totalAmount.toLocaleString()} <FaArrowRight />
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #ddd', paddingBottom: '15px', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', color: isDarkMode ? '#fff' : '#131921', margin: 0 }}>Your Shopping & Rental Cart</h1>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', fontWeight: 'bold' }}>
              ← Continue Shopping
            </button>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
            <button 
              onClick={() => setActiveCartTab('buy')}
              style={{
                flex: 1, padding: '12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                backgroundColor: activeCartTab === 'buy' ? '#ffd814' : (isDarkMode ? '#333' : '#f0f2f2'), 
                color: activeCartTab === 'buy' ? '#111' : (isDarkMode ? '#fff' : '#111'),
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '15px',
                boxShadow: activeCartTab === 'buy' ? '0 2px 5px rgba(0,0,0,0.15)' : 'none'
              }}>
              <FaShoppingBag /> Buy Cart ({buyItems.reduce((acc, item) => acc + (quantities[item.id] || item.quantity || 1), 0)})
            </button>

            <button 
              onClick={() => setActiveCartTab('rent')}
              style={{
                flex: 1, padding: '12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                backgroundColor: activeCartTab === 'rent' ? '#00a8e8' : (isDarkMode ? '#333' : '#f0f2f2'), 
                color: activeCartTab === 'rent' ? '#fff' : (isDarkMode ? '#fff' : '#111'),
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '15px',
                boxShadow: activeCartTab === 'rent' ? '0 2px 5px rgba(0,0,0,0.15)' : 'none'
              }}>
              <FaKey /> Rent Cart ({rentItems.reduce((acc, item) => acc + (quantities[item.id] || item.quantity || 1), 0)})
            </button>
          </div>

          {activeCartTab === 'buy' && (
            <div>
              <h2 style={{ fontSize: '18px', color: '#B12704', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaShoppingBag /> Items to Purchase
              </h2>

              {buyItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: isDarkMode ? '#aaa' : '#666' }}>
                  <p>Your Buy Cart is empty.</p>
                  <Link to="/" style={{ color: '#007185', fontWeight: 'bold', textDecoration: 'none' }}>Explore Buy Store →</Link>
                </div>
              ) : (
                <div>
                  {buyItems.map((item, index) => {
                    const itemImage = item.image || "";
                    const itemTitle = item.title || "Product";
                    const itemPrice = item.finalPrice || item.price || 0;
                    const currentQty = quantities[item.id] || item.quantity || 1;
                    const itemTotal = itemPrice * currentQty;

                    return (
                      <div key={index} style={{ display: 'flex', gap: '20px', padding: '15px 0', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee', alignItems: 'center' }}>
                        <img src={itemImage} alt={itemTitle} style={{ width: '80px', height: '80px', objectFit: 'contain', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '4px', padding: '5px', backgroundColor: '#fff' }} />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', color: isDarkMode ? '#fff' : '#111' }}>{itemTitle}</h4>
                          <p style={{ fontSize: '12px', color: '#007600', margin: '0 0 5px 0', fontWeight: 'bold' }}>In Stock</p>
                          
                          {/* Quantity Controller */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: isDarkMode ? '#ccc' : '#333' }}>Qty:</span>
                            <button 
                              onClick={() => handleQuantityChange(index, -1, 'buy')} 
                              style={{ width: '28px', height: '28px', backgroundColor: isDarkMode ? '#333' : '#e3e6e6', color: isDarkMode ? '#fff' : '#111', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <FaMinus size={10} />
                            </button>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{currentQty}</span>
                            <button 
                              onClick={() => handleQuantityChange(index, 1, 'buy')} 
                              style={{ width: '28px', height: '28px', backgroundColor: isDarkMode ? '#333' : '#e3e6e6', color: isDarkMode ? '#fff' : '#111', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <FaPlus size={10} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <button onClick={() => removeFromCart(index)} style={{ background: 'none', border: 'none', color: '#cc0c39', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}>
                              <FaTrash size={12} /> Remove
                            </button>
                            
                            <button 
                              onClick={() => handleOpenBargainModal(index)}
                              style={{ background: 'none', border: 'none', color: '#e47911', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}>
                              <FaComments /> Bargain Price
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#B12704', textAlign: 'right' }}>
                          ₹{itemTotal.toLocaleString()}
                          {currentQty > 1 && <div style={{ fontSize: '11px', color: isDarkMode ? '#aaa' : '#666' }}>(₹{itemPrice.toLocaleString()} each)</div>}
                          {item.finalPrice && item.finalPrice !== item.price && <div style={{ fontSize: '11px', color: '#007600' }}>✔ Bargained</div>}
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ marginTop: '20px', textAlign: 'right', padding: '15px', backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa', borderRadius: '6px', border: isDarkMode ? '1px solid #444' : 'none' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', marginRight: '20px' }}>Subtotal ({buyItems.reduce((acc, item) => acc + (quantities[item.id] || item.quantity || 1), 0)} items): ₹{buyTotal.toLocaleString()}</span>
                    <button 
                      onClick={() => { setCheckoutType('buy'); setCheckoutStep('address'); }} 
                      className="amazon-btn" 
                      style={{ padding: '10px 25px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
                      Proceed to Buy <FaArrowRight />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeCartTab === 'rent' && (
            <div>
              <h2 style={{ fontSize: '18px', color: '#0077b6', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaKey /> Items on Rent (Caution Deposit Included)
              </h2>

              {rentItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: isDarkMode ? '#aaa' : '#666' }}>
                  <p>Your Rent Cart is empty.</p>
                  <Link to="/" style={{ color: '#007185', fontWeight: 'bold', textDecoration: 'none' }}>Explore Rent Store →</Link>
                </div>
              ) : (
                <div>
                  {rentItems.map((item, index) => {
                    const days = parseInt(rentalDaysMap[index]) || 1;
                    const currentQty = quantities[item.id] || item.quantity || 1;
                    const itemRate = item.price || item.finalPrice || 0;
                    const itemRentTotal = itemRate * days * currentQty;
                    const itemImage = item.image || "";
                    const itemTitle = item.title || "Rental Product";
                    const securityDeposit = (item.securityDeposit || 0) * currentQty;

                    return (
                      <div key={index} style={{ display: 'flex', gap: '20px', padding: '15px 0', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee', alignItems: 'center' }}>
                        <img src={itemImage} alt={itemTitle} style={{ width: '80px', height: '80px', objectFit: 'contain', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '4px', padding: '5px', backgroundColor: '#fff' }} />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', color: isDarkMode ? '#fff' : '#111' }}>{itemTitle}</h4>
                          <p style={{ fontSize: '12px', color: isDarkMode ? '#ccc' : '#555', margin: '0 0 5px 0' }}>
                            Rate: <strong>₹{itemRate.toLocaleString()} / day</strong>
                          </p>

                          {/* Quantity Controller for Rent */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: isDarkMode ? '#ccc' : '#333' }}>Qty:</span>
                            <button 
                              onClick={() => handleQuantityChange(index, -1, 'rent')} 
                              style={{ width: '24px', height: '24px', backgroundColor: isDarkMode ? '#333' : '#e3e6e6', color: isDarkMode ? '#fff' : '#111', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <FaMinus size={9} />
                            </button>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{currentQty}</span>
                            <button 
                              onClick={() => handleQuantityChange(index, 1, 'rent')} 
                              style={{ width: '24px', height: '24px', backgroundColor: isDarkMode ? '#333' : '#e3e6e6', color: isDarkMode ? '#fff' : '#111', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <FaPlus size={9} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}>
                            <FaCalendarAlt size={12} color="#0077b6" />
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: isDarkMode ? '#ddd' : '#333' }}>Rental Duration (Days):</label>
                            <input 
                              type="number"
                              min="1"
                              max="365"
                              value={rentalDaysMap[index] !== undefined ? rentalDaysMap[index] : '2'}
                              onChange={(e) => handleDaysChange(index, e.target.value)}
                              style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '12px' }}
                            />
                          </div>

                          <p style={{ fontSize: '12px', color: '#4da6ff', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FaShieldAlt size={12} /> Refundable Security Deposit: <strong>₹{securityDeposit.toLocaleString()}</strong>
                          </p>
                          <button onClick={() => removeFromCart(index)} style={{ background: 'none', border: 'none', color: '#cc0c39', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}>
                            <FaTrash size={12} /> Remove
                          </button>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00a8e8' }}>₹{itemRentTotal.toLocaleString()} ({days} days, {currentQty} qty)</div>
                          <div style={{ fontSize: '12px', color: isDarkMode ? '#aaa' : '#666' }}>+ ₹{securityDeposit.toLocaleString()} deposit</div>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ marginTop: '20px', textAlign: 'right', padding: '15px', backgroundColor: isDarkMode ? '#1a365d' : '#e3f2fd', borderRadius: '6px', border: isDarkMode ? '1px solid #2b6cb0' : 'none' }}>
                    <div style={{ fontSize: '16px', marginBottom: '8px', color: isDarkMode ? '#fff' : '#333' }}>
                      Total Rental Rate: <strong>₹{rentTotal.toLocaleString()}</strong> | Security Deposit: <strong>₹{totalSecurityDeposit.toLocaleString()}</strong> (Refundable)
                    </div>
                    <button 
                      onClick={handleRentCheckoutClick} 
                      className="amazon-btn" 
                      style={{ padding: '10px 25px', backgroundColor: '#00a8e8', color: '#fff', border: 'none', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
                      Proceed to Secure Rent Checkout <FaArrowRight />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showBargainModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#f8f9fa', width: '100%', maxWidth: '950px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ padding: '20px', backgroundColor: isDarkMode ? '#252525' : '#fff', borderBottom: isDarkMode ? '1px solid #333' : '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', color: isDarkMode ? '#fff' : '#111', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '22px' }}>
                  <FaRobot color={isDarkMode ? '#00a8e8' : '#333'}/> AI Bargaining Assistant
                </h2>
                <p style={{ margin: 0, color: isDarkMode ? '#aaa' : '#555', fontSize: '14px' }}>Let our AI help you negotiate better prices. Start a conversation and get the best deal!</p>
              </div>
              <button onClick={() => setShowBargainModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <FaTimes size={24} color={isDarkMode ? '#888' : '#555'} />
              </button>
            </div>

            <div style={{ display: 'flex', height: '480px' }}>
              <div style={{ flex: 1, padding: '30px', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderRight: isDarkMode ? '1px solid #333' : '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '16px', color: isDarkMode ? '#ddd' : '#333', fontWeight: 'normal', marginBottom: '20px' }}>Bargaining for: <br/><strong style={{ color: isDarkMode ? '#fff' : '#111' }}>{currentBargainItem?.title?.substring(0, 30)}...</strong></h3>
                
                <div style={{ width: '180px', height: '180px', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '12px', margin: '0 auto 30px auto', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
                  <img src={currentBargainItem?.image} alt="Product" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ color: isDarkMode ? '#aaa' : '#555', fontSize: '14px' }}>Original Price:</div>
                  <div style={{ color: isDarkMode ? '#bbb' : '#111', fontSize: '18px', textDecoration: 'line-through' }}>₹{currentBargainOriginalPrice.toLocaleString()}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'auto' }}>
                  <div style={{ color: isDarkMode ? '#aaa' : '#555', fontSize: '14px' }}>Current Offer:</div>
                  <div style={{ color: '#00a8e8', fontSize: '28px', fontWeight: 'bold' }}>₹{currentBargainPrice.toLocaleString()}</div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                  {dealAccepted ? (
                    <button onClick={() => setShowBargainModal(false)} style={{ flex: 2, padding: '12px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <FaCheckCircle /> DEAL APPLIED TO CART
                    </button>
                  ) : (
                    <div style={{ flex: 2, padding: '12px', backgroundColor: isDarkMode ? '#2c2c2c' : '#f1f1f1', color: isDarkMode ? '#666' : '#aaa', border: isDarkMode ? '1px dashed #444' : '1px dashed #ccc', borderRadius: '6px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '13px' }}>
                      <FaLock size={12} style={{ marginRight: '6px' }} /> Negotiate to Unlock Deal
                    </div>
                  )}
                  <button onClick={() => setShowBargainModal(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '6px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <FaTimes /> CLOSE
                  </button>
                </div>
              </div>

              <div style={{ flex: 1.2, backgroundColor: isDarkMode ? '#121212' : '#f0f2f5', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '15px 20px', backgroundColor: isDarkMode ? '#1a1a1a' : '#fff', borderBottom: isDarkMode ? '1px solid #333' : '1px solid #ddd', fontSize: '16px', color: isDarkMode ? '#fff' : '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaRobot color="#00a8e8" /> Bargaining Chat
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
                    <FaLightbulb color="#febd69" size= {18} />
                    <span style={{ fontSize: '12px', color: isDarkMode ? '#aaa' : '#666', fontWeight: 'bold' }}>Smart Offers:</span>
                    <button onClick={() => processCartOffer(currentBargainPrice * 0.90)} style={{ padding: '6px 12px', backgroundColor: isDarkMode ? '#333' : '#e3f2fd', color: isDarkMode ? '#90caf9' : '#0d47a1', border: isDarkMode ? '1px solid #555' : '1px solid #90caf9', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Offer ₹{Math.floor(currentBargainPrice * 0.90).toLocaleString()} (10% Off)
                    </button>
                    <button onClick={() => processCartOffer(currentBargainPrice * 0.85)} style={{ padding: '6px 12px', backgroundColor: isDarkMode ? '#333' : '#e3f2fd', color: isDarkMode ? '#90caf9' : '#0d47a1', border: isDarkMode ? '1px solid #555' : '1px solid #90caf9', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Offer ₹{Math.floor(currentBargainPrice * 0.85).toLocaleString()} (15% Off)
                    </button>
                  </div>
                )}

                <form onSubmit={handleCartBargainSubmit} style={{ display: 'flex', gap: '10px', padding: '15px 20px', backgroundColor: isDarkMode ? '#252525' : '#fff', borderTop: isDarkMode ? '1px solid #333' : '1px solid #ddd' }}>
                  <input type="number" placeholder="Type your custom offer (₹)" value={userOffer} onChange={(e) => setUserOffer(e.target.value)} disabled={dealAccepted} style={{ flex: 1, padding: '12px 15px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#121212' : '#fff', color: isDarkMode ? '#fff' : '#000', fontSize: '14px', outline: 'none' }} />
                  <button type="submit" disabled={dealAccepted} style={{ padding: '0 25px', backgroundColor: dealAccepted ? (isDarkMode ? '#444' : '#ccc') : '#00a8e8', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: dealAccepted ? 'not-allowed' : 'pointer' }}>Send</button>
                </form>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Cart;