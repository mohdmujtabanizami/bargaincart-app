import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCrown, FaShippingFast, FaPercent, FaRobot, FaShieldAlt, FaCheckCircle, FaArrowRight, FaCreditCard, FaWallet } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { ref, get, set, onValue, update } from 'firebase/database';
import '../App.css';

// Receive isPremium & setIsPremium props
function Premium({ user, isPremium, setIsPremium }) {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiProvider, setUpiProvider] = useState('GPay');
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });

  // Wallet / Gift Card balance states
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  // Real-time wallet balance fetch
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const walletRef = ref(db, `users/${currentUser.uid}/walletBalance`);
      onValue(walletRef, (snapshot) => {
        setWalletBalance(snapshot.exists() ? snapshot.val() : 0);
      });
    }
  }, []);

  // Real-time premium status sync from Firebase
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const primeRef = ref(db, `users/${currentUser.uid}/isPremium`);
        const snapshot = await get(primeRef);
        if (snapshot.exists() && snapshot.val() === true) {
          setIsPremium(true);
        } else {
          setIsPremium(false);
        }
      } else {
        setIsPremium(false);
      }
    });

    return () => unsubscribeAuth();
  }, [setIsPremium]);

  const handleProceedToPayment = () => {
    if (!user) {
      alert("Please login or sign up first to join BargainCart Prime!");
      navigate('/login');
      return;
    }
    setShowPayment(true);
  };

  // Auto-slash formatter for expiry (MM/YY)
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

    const primePrice = 499;
    const isFullyPaidByWallet = useWallet && walletBalance >= primePrice;

    if (!isFullyPaidByWallet) {
      if (paymentMethod === 'upi' && !upiId) {
        alert("Please enter a valid UPI ID!");
        return;
      }
      if (paymentMethod === 'card' && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name)) {
        alert("Please fill in all Card details!");
        return;
      }
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        // Handle wallet deduction if used
        if (useWallet) {
          if (walletBalance >= primePrice) {
            const newWalletBalance = walletBalance - primePrice;
            await update(ref(db, `users/${currentUser.uid}`), { walletBalance: newWalletBalance });
          } else {
            await update(ref(db, `users/${currentUser.uid}`), { walletBalance: 0 });
          }
        }

        // Save premium status in Realtime Database under current user's UID
        await set(ref(db, `users/${currentUser.uid}/isPremium`), true);
        setIsPremium(true); // Activate premium status globally
      } catch (error) {
        console.error("Error saving premium status:", error);
        alert("Payment successful, but failed to update status in database.");
      }
    }

    setShowPayment(false);
  };

  const primePrice = 499;
  const finalPayable = useWallet ? Math.max(0, primePrice - walletBalance) : primePrice;

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '30px', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', color: isDarkMode ? '#fff' : '#111', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      
      {!isPremium && !showPayment && (
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' }}>← Back to Store</button>
      )}

      {/* Hero Banner */}
      <div style={{ background: 'linear-gradient(135deg, #232f3e 0%, #37475a 100%)', color: '#fff', padding: '40px', borderRadius: '10px', textAlign: 'center', marginBottom: '30px' }}>
        <FaCrown color="#ffd814" size={50} style={{ marginBottom: '15px' }} />
        <h1 style={{ fontSize: '28px', margin: '0 0 10px 0', color: '#fff' }}>BargainCart Prime 🌟</h1>
        <p style={{ fontSize: '15px', color: '#ddd', maxWidth: '600px', margin: '0 auto' }}>
          Unlock lightning-fast deliveries, heavy exclusive discounts, and unlimited AI bargaining power!
        </p>
      </div>

      {isPremium ? (
        /* Success Screen */
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <FaCheckCircle size={70} color="#007600" style={{ marginBottom: '15px' }} />
          <h2 style={{ color: '#007600', marginBottom: '10px' }}>You are a VIP Prime Member! 👑</h2>
          <p style={{ fontSize: '15px', color: isDarkMode ? '#ccc' : '#555', marginBottom: '30px' }}>
            Enjoy your exclusive express deliveries, extra discounts, and unlimited AI bargaining privileges.
          </p>
          <button onClick={() => navigate('/')} style={{ padding: '12px 30px', backgroundColor: '#ffd814', color: '#111', border: 'none', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', fontSize: '15px' }}>
            Start Shopping with Prime
          </button>
        </div>
      ) : showPayment ? (
        /* Payment Screen with Wallet / Gift Card */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #ddd', paddingBottom: '15px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: isDarkMode ? '#fff' : '#111' }}>
              <FaCreditCard color="#0f4c81" /> Choose Payment Method
            </h2>
            <button onClick={() => setShowPayment(false)} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', fontWeight: 'bold' }}>
              ← Back to Prime Benefits
            </button>
          </div>

          <form onSubmit={handlePaymentSubmit} style={{ maxWidth: '600px', margin: '0 auto' }} autoComplete="off">
            <div style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa', padding: '15px', borderRadius: '6px', marginBottom: '20px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd' }}>
              <h4 style={{ margin: '0 0 10px 0', color: isDarkMode ? '#fff' : '#333' }}>Order Summary</h4>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: isDarkMode ? '#ccc' : '#555' }}>Plan: <strong style={{ color: isDarkMode ? '#fff' : '#111' }}>BargainCart Prime Membership (1 Year)</strong></p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#B12704' }}>
                Total Payable Amount: ₹499
                {useWallet && <span style={{ fontSize: '13px', color: '#10b981', display: 'block' }}>(Paying via Wallet Balance: ₹{Math.min(walletBalance, 499).toLocaleString()})</span>}
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
              {useWallet && walletBalance < 499 && (
                <p style={{ fontSize: '12px', color: '#d97706', margin: '8px 0 0 28px' }}>
                  ⚠️ Wallet balance is less than total amount. Remaining ₹{finalPayable.toLocaleString()} will be covered or you can uncheck to pay fully via other methods.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
              {/* UPI Option */}
              <div style={{ border: isDarkMode ? '1px solid #444' : '1px solid #ccc', borderRadius: '6px', padding: '12px', backgroundColor: paymentMethod === 'upi' ? (isDarkMode ? '#222' : '#f0f8ff') : 'transparent' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', marginBottom: paymentMethod === 'upi' ? '15px' : '0', color: isDarkMode ? '#fff' : '#111' }}>
                  <input type="radio" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} style={{ accentColor: '#00a8e8' }} /> UPI (Google Pay / PhonePe / Paytm)
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
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#aaa' : '#555' }}>Enter UPI ID:</label>
                    <input type="text" name="clean-prime-upi" autoComplete="off" placeholder="e.g. username@oksbi / mobile@paytm" value={upiId} onChange={(e) => setUpiId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={paymentMethod === 'upi' && (!useWallet || walletBalance < 499)} />
                  </div>
                )}
              </div>

              {/* Card Option (No hardcode, auto-slash) */}
              <div style={{ border: isDarkMode ? '1px solid #444' : '1px solid #ccc', borderRadius: '6px', padding: '12px', backgroundColor: paymentMethod === 'card' ? (isDarkMode ? '#222' : '#f0f8ff') : 'transparent' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', marginBottom: paymentMethod === 'card' ? '15px' : '0', color: isDarkMode ? '#fff' : '#111' }}>
                  <input type="radio" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} style={{ accentColor: '#00a8e8' }} /> Credit / Debit Card
                </label>
                {paymentMethod === 'card' && (
                  <div style={{ paddingLeft: '25px', marginTop: '10px' }}>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#aaa' : '#555' }}>Card Number:</label>
                    <input type="text" name="clean-prime-cardnum" autoComplete="off" placeholder="4444 4444 4444 4444" maxLength="16" value={cardDetails.number} onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={paymentMethod === 'card' && (!useWallet || walletBalance < 499)} />
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#aaa' : '#555' }}>Expiry (MM/YY):</label>
                        <input type="text" name="clean-prime-cardexp" autoComplete="off" placeholder="MM/YY" maxLength="5" value={cardDetails.expiry} onChange={handleExpiryChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={paymentMethod === 'card' && (!useWallet || walletBalance < 499)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#aaa' : '#555' }}>CVV:</label>
                        <input type="password" name="clean-prime-cardcvv" autoComplete="off" placeholder="***" maxLength="4" value={cardDetails.cvv} onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={paymentMethod === 'card' && (!useWallet || walletBalance < 499)} />
                      </div>
                    </div>
                    <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: isDarkMode ? '#aaa' : '#555' }}>Name on Card:</label>
                    <input type="text" name="clean-prime-cardname" autoComplete="off" placeholder="Cardholder Name" value={cardDetails.name} onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={paymentMethod === 'card' && (!useWallet || walletBalance < 499)} />
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="amazon-btn" style={{ width: '100%', padding: '14px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>
              Pay ₹499 & Join Prime <FaArrowRight style={{ marginLeft: '5px' }} />
            </button>
          </form>
        </div>
      ) : (
        /* Benefits Screen */
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', textAlign: 'center', color: isDarkMode ? '#fff' : '#111' }}>Exclusive Prime Benefits</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '35px' }}>
            
            <div style={{ padding: '20px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa' }}>
              <FaShippingFast color="#00a8e8" size={24} style={{ marginBottom: '10px' }} />
              <h3 style={{ fontSize: '16px', margin: '0 0 8px 0', color: isDarkMode ? '#fff' : '#111' }}>Priority Fast Delivery</h3>
              <p style={{ fontSize: '13px', color: isDarkMode ? '#ccc' : '#666', margin: 0 }}>Skip the queue! Get your orders delivered twice as fast with express priority shipping.</p>
            </div>

            <div style={{ padding: '20px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa' }}>
              <FaPercent color="#cc0c39" size={24} style={{ marginBottom: '10px' }} />
              <h3 style={{ fontSize: '16px', margin: '0 0 8px 0', color: isDarkMode ? '#fff' : '#111' }}>Extra 10% Off</h3>
              <p style={{ fontSize: '13px', color: isDarkMode ? '#ccc' : '#666', margin: 0 }}>Enjoy stackable extra discounts on all Buy and Rent store items automatically.</p>
            </div>

            <div style={{ padding: '20px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa' }}>
              <FaRobot color="#ffd814" size={24} style={{ marginBottom: '10px' }} />
              <h3 style={{ fontSize: '16px', margin: '0 0 8px 0', color: isDarkMode ? '#fff' : '#111' }}>Unlimited AI Bargaining</h3>
              <p style={{ fontSize: '13px', color: isDarkMode ? '#ccc' : '#666', margin: 0 }}>Our AI negotiation assistant will unlock rock-bottom wholesale prices just for you.</p>
            </div>

            <div style={{ padding: '20px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa' }}>
              <FaShieldAlt color="#2e7d32" size={24} style={{ marginBottom: '10px' }} />
              <h3 style={{ fontSize: '16px', margin: '0 0 8px 0', color: isDarkMode ? '#fff' : '#111' }}>Zero Deposit Hassle</h3>
              <p style={{ fontSize: '13px', color: isDarkMode ? '#ccc' : '#666', margin: 0 }}>Rent high-end cameras, consoles, and outfits with streamlined instant KYC approval.</p>
            </div>

          </div>

          {/* Pricing & Join Box */}
          <div style={{ textAlign: 'center', padding: '30px', backgroundColor: isDarkMode ? '#252525' : '#fdf8f4', border: '2px solid #ffd814', borderRadius: '10px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '22px', color: isDarkMode ? '#fff' : '#111' }}>Join Prime Today</h3>
            <p style={{ fontSize: '16px', color: '#B12704', fontWeight: 'bold', marginBottom: '20px' }}>Only ₹499 / Year <span style={{ fontSize: '12px', color: isDarkMode ? '#aaa' : '#777', fontWeight: 'normal' }}>(Cancel anytime)</span></p>
            
            <button 
              onClick={handleProceedToPayment} 
              style={{ padding: '14px 40px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: 'bold', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              Get BargainCart Prime Now <FaArrowRight style={{ marginLeft: '5px' }} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Premium;