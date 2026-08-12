import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaStar, FaShieldAlt, FaTruck, FaUndo, FaTimes, FaLock, FaHeart, FaUserCircle, FaBoxOpen, FaMapMarkerAlt, FaPlus, FaCreditCard, FaChevronDown, FaChevronUp, FaCalendarAlt, FaCrown, FaArrowRight, FaWallet, FaCheckCircle, FaRobot, FaUser, FaLightbulb } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { ref, push, onValue, update, get } from 'firebase/database';
import '../App.css';

// Import central products catalog
import { products as allProducts } from '../data/products';

function generateOrderId() {
  return "ORD-" + Date.now() + Math.floor(Math.random() * 1000);
}

function ProductDetail({ addToCart, addToWishlist, isPremium }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const rawProduct = allProducts.find(p => p.id === id) || allProducts[0];
  let product = { ...rawProduct };

  if (!product.styles || product.styles.length === 0) {
    product.styles = [
      {
        name: product.category === 'Clothing' ? "Standard Fit" : "Default Edition",
        title: product.title,
        basePrice: product.price,
        originalPrice: product.originalPrice,
        discountPercent: product.discountPercent,
        image: product.image,
        specs: {
          "Brand / Category": product.category,
          "Condition": product.type === 'rent' ? "Pristine / Inspected" : "Brand New (Sealed)",
          "Warranty": product.type === 'buy' ? "1 Year Manufacturer Warranty" : "Rental Coverage Included",
          "Availability": product.stock > 0 ? "In Stock" : (product.comingSoon ? "Coming Soon" : "Out of Stock")
        }
      }
    ];
  }

  if (product.category === 'Clothing' && !product.sizeOptions) {
    product.sizeOptions = ["S", "M", "L", "XL", "XXL"];
  }

  if (!product.replacement) product.replacement = "7 Days Replacement Policy";
  if (!product.delivery) product.delivery = product.comingSoon ? "Coming Soon" : "Free Delivery by Standard Courier";

  if (!product.aboutItem) {
    product.aboutItem = [
      `Official ${product.title} with premium build quality and high performance.`,
      "Designed for maximum durability, style, and user satisfaction.",
      "Backed by BargainCart verified quality assurance and secure checkout."
    ];
  }

  if (!product.infoSections) {
    product.infoSections = {
      "Build & Quality": "Tested and verified for top-tier performance and reliability.",
      "In the Box": `1 x ${product.title}, User Manual & Accessories`,
      "Support": "24/7 Customer Support available via BargainCart"
    };
  }

  if (!product.reviews || product.reviews.length === 0) {
    product.reviews = [
      { user: "Mohd Mujtaba Nizami", rating: 5, date: "2 days ago", comment: `Extremely satisfied with ${product.title}. Works like a charm!`, reviewImg: product.image },
      { user: "Aleeza Fatma", rating: 4, date: "1 week ago", comment: "Genuine product quality and very fast delivery by BargainCart.", reviewImg: "" }
    ];
  }

  // Limit similar products to a maximum of 3 items
  const similarProducts = allProducts.filter(p => p.type === product.type && p.id !== product.id).slice(0, 3);

  const [currentId, setCurrentId] = useState(id);
  const [selectedStyle, setSelectedStyle] = useState(product.styles ? product.styles[0].name : null);
  const [selectedRam, setSelectedRam] = useState(product.ramOptions ? product.ramOptions[0] : null);
  const [selectedStorage, setSelectedStorage] = useState(product.storageOptions ? product.storageOptions[0] : null);
  const [selectedSize, setSelectedSize] = useState(product.sizeOptions ? product.sizeOptions[0] : null);

  if (id !== currentId) {
    setCurrentId(id);
    setSelectedStyle(product.styles ? product.styles[0].name : null);
    setSelectedRam(product.ramOptions ? product.ramOptions[0] : null);
    setSelectedStorage(product.storageOptions ? product.storageOptions[0] : null);
    setSelectedSize(product.sizeOptions ? product.sizeOptions[0] : null);
  }

  const activeStyle = product.styles ? product.styles.find(s => s.name === selectedStyle) || product.styles[0] : { title: product.title, basePrice: product.price, originalPrice: product.originalPrice, image: product.image || product.images?.[0], specs: product.specs };
  
  const ramExtra = selectedRam ? selectedRam.extraPrice : 0;
  const storageExtra = selectedStorage ? selectedStorage.extraPrice : 0;
  
  const baseCalculatedPrice = activeStyle.basePrice + ramExtra + storageExtra;
  const finalPrice = isPremium ? Math.floor(baseCalculatedPrice * 0.9) : baseCalculatedPrice;

  const isComingSoon = product.comingSoon || false;
  const isOutOfStock = product.stock === 0 && !isComingSoon;
  const isLowStock = product.stock <= 2 && product.stock > 0 && !isComingSoon;
  
  const stockTextColor = isComingSoon ? "#00a8e8" : (isOutOfStock || isLowStock ? "#d32f2f" : (isDarkMode ? "#aaa" : "#555"));
  const stockText = isComingSoon ? "Coming Soon" : (isOutOfStock ? "Out of Stock" : (isLowStock ? `Only ${product.stock} left!` : `${product.stock} left in stock`));

  const handleStyleChange = (styleObj) => {
    setSelectedStyle(styleObj.name);
  };

  const [openAccordions, setOpenAccordions] = useState({});
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const toggleAccordion = (key) => setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));

  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [rentUseWallet, setRentUseWallet] = useState(false);

  const [checkoutAddresses, setCheckoutAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedRentAddrId, setSelectedRentAddrId] = useState(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const walletRef = ref(db, `users/${currentUser.uid}/walletBalance`);
      onValue(walletRef, (snapshot) => {
        setWalletBalance(snapshot.exists() ? snapshot.val() : 0);
      });

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
            setSelectedRentAddrId(loadedAddresses[0].id);
          }
        } else {
          setCheckoutAddresses([]);
          setIsAddingAddress(true);
        }
      }).catch((error) => {
        console.error("Error fetching addresses:", error);
      });
    }
  }, []);

  const [showBargainModal, setShowBargainModal] = useState(false);
  const [userOffer, setUserOffer] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [dealAccepted, setDealAccepted] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState(finalPrice);
  const chatEndRef = useRef(null);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('address'); 
  const [selectedPayment, setSelectedPayment] = useState('UPI');
  const [upiProvider, setUpiProvider] = useState('GPay');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', address: '', city: '', state: '', pincode: '' });

  const [showRentModal, setShowRentModal] = useState(false);
  const [rentStep, setRentStep] = useState('kyc'); 
  const [rentalDays, setRentalDays] = useState('2'); 
  const [kycForm, setKycForm] = useState({ fullName: '', phone: '', idType: 'Government ID', idNumber: '', idPhoto: null, agreedToTerms: false });
  const [rentAddressMode, setRentAddressMode] = useState('saved'); 
  const [rentNewAddress, setRentNewAddress] = useState({ fullName: '', phone: '', street: '', city: '', pincode: '' });
  const [rentPayment, setRentPayment] = useState('upi');
  const [rentUpiId, setRentUpiId] = useState('');
  const [rentCard, setRentCard] = useState({ number: '', expiry: '', cvv: '', name: '' });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, showBargainModal]);

  const handleBuyNowClick = () => {
    if (isOutOfStock || isComingSoon) return;
    const currentPriceToUse = dealAccepted ? negotiatedPrice : finalPrice;
    setNegotiatedPrice(currentPriceToUse);
    setChatMessages([{ sender: 'ai', text: `Hello! I'm your AI bargaining assistant. Current price is ₹${currentPriceToUse.toLocaleString()}. What's your offer?` }]);
    setShowBargainModal(true);
  };

  const processOffer = (offerValue) => {
    if (dealAccepted) return;
    const offerNum = parseFloat(offerValue);
    if (!offerNum) return;

    setChatMessages(prev => [...prev, { sender: 'user', text: `₹${offerNum.toLocaleString()}` }]);
    setUserOffer('');

    setTimeout(() => {
      const strictMinPrice = Math.floor(finalPrice * 0.85); 
      if (offerNum >= finalPrice) {
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

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    if(!newAddr.name || !newAddr.phone || !newAddr.address || !newAddr.pincode) return alert("Please fill all details!");
    
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

  const handleRentExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setRentCard({...rentCard, expiry: value});
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAddressId || checkoutAddresses.length === 0) {
      alert("Please select or add a delivery address!");
      return;
    }

    const activeTotal = dealAccepted ? negotiatedPrice : finalPrice;
    const isFullyPaidByWallet = useWallet && walletBalance >= activeTotal;

    if (!isFullyPaidByWallet) {
      if (selectedPayment === 'UPI' && !upiId) return alert("Please enter a valid UPI ID!");
      if (selectedPayment === 'Card' && (!cardNumber || !cardExpiry || !cardCvv || !cardName)) return alert("Please fill in all Card details!");
    }

    const currentUser = auth.currentUser;
    const activeAddress = checkoutAddresses.find(a => a.id === selectedAddressId) || checkoutAddresses[0];

    try {
      if (currentUser) {
        if (useWallet) {
          if (walletBalance >= activeTotal) {
            const newWalletBalance = walletBalance - activeTotal;
            await update(ref(db, `users/${currentUser.uid}`), { walletBalance: newWalletBalance });
          } else {
            await update(ref(db, `users/${currentUser.uid}`), { walletBalance: 0 });
          }
        }

        const orderData = {
          orderId: generateOrderId(),
          productTitle: activeStyle.title || product.title,
          productImage: activeStyle.image || '',
          amount: activeTotal,
          status: "Order Placed",
          date: new Date().toLocaleDateString(),
          type: product.type,
          address: `${activeAddress.address}, ${activeAddress.city} - ${activeAddress.pincode}`,
          paymentMode: useWallet && walletBalance >= activeTotal ? 'BARGAINCART WALLET' : selectedPayment.toUpperCase()
        };

        await push(ref(db, `users/${currentUser.uid}/orders`), orderData);
        await push(ref(db, `orders`), orderData);
      }

      setCheckoutStep('success');
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order in database.");
    }
  };

  const handleRentNowClick = () => {
    if (isOutOfStock || isComingSoon) return;
    setRentStep('kyc');
    setShowRentModal(true);
  };

  const handleKycSubmit = (e) => {
    e.preventDefault();
    if (!kycForm.fullName || !kycForm.phone || !kycForm.idNumber) return alert("Please fill in all KYC details!");
    const parsedDays = parseInt(rentalDays);
    if (!rentalDays || isNaN(parsedDays) || parsedDays <= 0) return alert("Please enter number of days!");
    if (!kycForm.agreedToTerms) return alert("Please agree to the Anti-Theft Terms!");
    setRentStep('address');
  };

  const handleRentAddressSubmit = (e) => {
    e.preventDefault();
    if (rentAddressMode === 'saved' && (!selectedRentAddrId || checkoutAddresses.length === 0)) {
      alert("Please select or add a delivery address!");
      return;
    }
    if (rentAddressMode === 'new' && (!rentNewAddress.fullName || !rentNewAddress.phone || !rentNewAddress.street || !rentNewAddress.city || !rentNewAddress.pincode)) {
      return alert("Please fill in all new address details!");
    }
    setRentStep('payment');
  };

  const handleRentPaymentSubmit = async (e) => {
    e.preventDefault();

    const numericDays = parseInt(rentalDays) || 1;
    const totalRentPayable = (finalPrice * numericDays) + (product.securityDeposit || 0);
    const isFullyPaidByWallet = rentUseWallet && walletBalance >= totalRentPayable;

    if (!isFullyPaidByWallet) {
      if (rentPayment === 'upi' && !rentUpiId) return alert("Please enter a valid UPI ID!");
      if (rentPayment === 'card' && (!rentCard.number || !rentCard.expiry || !rentCard.cvv || !rentCard.name)) return alert("Please fill in all Card details!");
    }

    const currentUser = auth.currentUser;
    const activeAddress = rentAddressMode === 'saved' 
      ? checkoutAddresses.find(a => a.id === selectedRentAddrId) || checkoutAddresses[0]
      : { address: rentNewAddress.street, city: rentNewAddress.city, pincode: rentNewAddress.pincode };

    try {
      if (currentUser) {
        if (rentUseWallet) {
          if (walletBalance >= totalRentPayable) {
            const newWalletBalance = walletBalance - totalRentPayable;
            await update(ref(db, `users/${currentUser.uid}`), { walletBalance: newWalletBalance });
          } else {
            await update(ref(db, `users/${currentUser.uid}`), { walletBalance: 0 });
          }
        }

        const orderData = {
          orderId: generateOrderId(),
          productTitle: activeStyle.title || product.title,
          productImage: activeStyle.image || '',
          amount: totalRentPayable,
          status: "Order Placed",
          date: new Date().toLocaleDateString(),
          type: 'rent',
          address: `${activeAddress.address}, ${activeAddress.city} - ${activeAddress.pincode}`,
          paymentMode: rentUseWallet && walletBalance >= totalRentPayable ? 'BARGAINCART WALLET' : rentPayment.toUpperCase()
        };

        await push(ref(db, `users/${currentUser.uid}/orders`), orderData);
        await push(ref(db, `orders`), orderData);
      }

      setRentStep('success');
    } catch (error) {
      console.error("Error saving rental order:", error);
      alert("Failed to place rental order.");
    }
  };

  const renderSmallCard = (p) => {
    const previewPrice = p.styles ? p.styles[0].basePrice : p.price;
    return (
      <div key={p.id} onClick={() => { navigate(`/product/${p.id}`); window.scrollTo(0,0); }} style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', border: isDarkMode ? '1px solid #444' : '1px solid #eee', borderRadius: '8px', padding: '15px', cursor: 'pointer', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
        <div style={{ height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px', backgroundColor: '#fff', borderRadius: '4px', padding: '5px' }}>
          <img src={p.styles ? p.styles[0].image : p.image} alt={p.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
        </div>
        <h4 style={{ fontSize: '13px', margin: '0 0 5px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isDarkMode ? '#fff' : '#111' }}>{p.title}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
          <span style={{ backgroundColor: '#cc0c39', color: '#fff', padding: '2px 4px', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold' }}>{p.discountPercent || "20% off"}</span>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#111' }}>₹{previewPrice.toLocaleString()}</span>
        </div>
        <button style={{ width: '100%', padding: '6px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>View Details</button>
      </div>
    );
  };

  const numericDays = parseInt(rentalDays) || 1;
  const totalRentPayable = (finalPrice * numericDays) + (product.securityDeposit || 0);

  return (
    <div key={id} style={{ backgroundColor: isDarkMode ? '#121212' : '#f4f4f4', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* MAIN CONTENT */}
      <div style={{ flex: 1, maxWidth: '1200px', margin: '20px auto', padding: '20px', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', color: isDarkMode ? '#fff' : '#000', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', width: '95%', boxSizing: 'border-box' }}>
        
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>← Back to Store</button>

        {/* Responsive Grid Container */}
        <div className="product-detail-grid" style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1.2fr 1fr', gap: '30px' }}>
          
          {/* DYNAMIC IMAGE GALLERY */}
          <div>
            <div style={{ border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', minHeight: '300px', height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', padding: '10px', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' }}>
              <img src={activeStyle.image} alt={activeStyle.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
          </div>

          {/* DYNAMIC TITLE, STYLES, RAM, STORAGE, SIZES & SPECS */}
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '500', color: isDarkMode ? '#fff' : '#111', marginBottom: '8px' }}>{activeStyle.title}</h1>
            
            {!isComingSoon && (
              <p style={{ fontSize: '14px', color: '#007185', fontWeight: 'bold', marginBottom: '6px' }}>{product.boughtCount.toLocaleString()}+ people bought this recently</p>
            )}
            
            {!isComingSoon && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ color: '#ffa41c', fontWeight: 'bold' }}>{product.rating} <FaStar color="#ffa41c" /></span>
                <span style={{ color: '#007185', fontSize: '14px' }}>{product.reviewsCount} ratings</span>
              </div>
            )}

            {/* Stock Alert */}
            <div style={{ fontSize: '14px', fontWeight: isLowStock ? 'bold' : '500', color: stockTextColor, marginBottom: '15px' }}>
              {stockText}
            </div>

            <hr style={{ border: '0', borderTop: isDarkMode ? '1px solid #444' : '1px solid #eee', margin: '15px 0' }} />
            
            {/* Prime Member Big Benefit Badge */}
            {isPremium && !isComingSoon && (
              <div style={{ backgroundColor: isDarkMode ? '#3b2f0c' : '#fff3cd', border: isDarkMode ? '1px solid #665200' : '1px solid #ffeeba', color: isDarkMode ? '#ffda6a' : '#856404', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaCrown color="#ffd814" size={18} /> Prime Member Benefit: Extra 10% Discount Applied!
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <span style={{ backgroundColor: '#cc0c39', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold' }}>
                {isPremium ? 'Extra 10% Off' : (activeStyle.discountPercent || product.discountPercent)}
              </span>
              <span style={{ fontSize: '28px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#111' }}>
                ₹{dealAccepted ? negotiatedPrice.toLocaleString() : finalPrice.toLocaleString()} {product.type === 'rent' && <span style={{ fontSize: '14px', color: '#888' }}>/ day</span>}
              </span>
              {dealAccepted && <span style={{ fontSize: '12px', backgroundColor: '#2e7d32', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Bargained Deal</span>}
            </div>

            {product.type === 'rent' && product.securityDeposit && (
              <div style={{ backgroundColor: isDarkMode ? '#223843' : '#e6f4f8', border: '1px solid #00a8e8', padding: '10px 14px', borderRadius: '6px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaShieldAlt color="#00a8e8" size={16} />
                <div style={{ fontSize: '13px', color: isDarkMode ? '#e2e8f0' : '#0c5460' }}>
                  Refundable Security Deposit: <strong>₹{product.securityDeposit.toLocaleString()}</strong> (Paid at checkout, fully refunded on return)
                </div>
              </div>
            )}

            <div style={{ fontSize: '14px', color: '#565959', marginBottom: '20px' }}>
              M.R.P.: <span style={{ textDecoration: 'line-through' }}>₹{activeStyle.originalPrice.toLocaleString()}</span>
            </div>

            {/* Style / Variant Selector */}
            {product.styles && (
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', color: isDarkMode ? '#ccc' : '#555' }}>Style Name: <strong>{selectedStyle}</strong></span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                  {product.styles.map(sty => (
                    <button key={sty.name} onClick={() => handleStyleChange(sty)} style={{ padding: '8px 15px', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#111', border: selectedStyle === sty.name ? '2px solid #00a8e8' : (isDarkMode ? '1px solid #555' : '1px solid #ccc'), borderRadius: '6px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {sty.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clothing Size Selector */}
            {product.sizeOptions && (
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', color: isDarkMode ? '#ccc' : '#555' }}>Select Size: <strong>{selectedSize}</strong></span>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {product.sizeOptions.map(sz => (
                    <button key={sz} onClick={() => setSelectedSize(sz)} style={{ padding: '8px 14px', backgroundColor: selectedSize === sz ? '#00a8e8' : (isDarkMode ? '#222' : '#fff'), color: selectedSize === sz ? '#fff' : (isDarkMode ? '#fff' : '#111'), border: selectedSize === sz ? '2px solid #00a8e8' : '1px solid #ccc', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* RAM Selector */}
            {product.ramOptions && (
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', color: isDarkMode ? '#ccc' : '#555' }}>RAM: <strong>{selectedRam?.name}</strong></span>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {product.ramOptions.map(ram => (
                    <button key={ram.name} onClick={() => setSelectedRam(ram)} style={{ padding: '8px 12px', backgroundColor: selectedRam?.name === ram.name ? (isDarkMode ? '#1a365d' : '#e3f2fd') : (isDarkMode ? '#222' : '#fff'), color: isDarkMode ? '#fff' : '#111', border: selectedRam?.name === ram.name ? '2px solid #00a8e8' : '1px solid #ccc', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      {ram.name} {ram.extraPrice > 0 ? `(+₹{ram.extraPrice.toLocaleString()})` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Storage Selector */}
            {product.storageOptions && (
              <div style={{ marginBottom: '25px' }}>
                <span style={{ fontSize: '14px', color: isDarkMode ? '#ccc' : '#555' }}>Storage / Hard Disk: <strong>{selectedStorage?.name}</strong></span>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {product.storageOptions.map(store => (
                    <button key={store.name} onClick={() => setSelectedStorage(store)} style={{ padding: '8px 12px', backgroundColor: selectedStorage?.name === store.name ? (isDarkMode ? '#1a365d' : '#e3f2fd') : (isDarkMode ? '#222' : '#fff'), color: isDarkMode ? '#fff' : '#111', border: selectedStorage?.name === store.name ? '2px solid #00a8e8' : '1px solid #ccc', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      {store.name} {store.extraPrice > 0 ? `(+₹{store.extraPrice.toLocaleString()})` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Specs Table */}
            {activeStyle.specs && (
              <div style={{ marginBottom: '25px' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.entries(activeStyle.specs).map(([key, val], index) => (
                      <tr key={key} style={{ borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee', backgroundColor: index % 2 === 0 ? (isDarkMode ? '#252525' : '#fafafa') : 'transparent' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold', width: '35%', color: isDarkMode ? '#ccc' : '#333' }}>{key}</td>
                        <td style={{ padding: '8px 10px', color: isDarkMode ? '#fff' : '#111' }}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* About This Item */}
            {product.aboutItem && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '10px', color: isDarkMode ? '#fff' : '#111' }}>About this item</h3>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: isDarkMode ? '#ccc' : '#333', lineHeight: '1.6' }}>
                  {(isAboutExpanded ? product.aboutItem : product.aboutItem.slice(0, 3)).map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>{item}</li>
                  ))}
                </ul>
                <div onClick={() => setIsAboutExpanded(!isAboutExpanded)} style={{ marginTop: '8px', fontSize: '13px', color: '#007185', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {isAboutExpanded ? <><FaChevronUp size={10}/> See less</> : "› See more product details"}
                </div>
              </div>
            )}

          </div>

          <div style={{ border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: isDarkMode ? '#252525' : '#fcfcfc', height: 'fit-content' }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: product.type === 'buy' ? '#B12704' : '#4da6ff', marginBottom: '15px' }}>
              ₹{dealAccepted ? negotiatedPrice.toLocaleString() : finalPrice.toLocaleString()} {product.type === 'rent' && <span style={{ fontSize: '12px' }}>/ day</span>}
            </div>

            {product.type === 'buy' ? (
              <>
                <button disabled={isOutOfStock || isComingSoon} onClick={() => addToCart({ ...product, title: activeStyle.title, finalPrice: dealAccepted ? negotiatedPrice : finalPrice, selectedStyle, selectedRam: selectedRam?.name, selectedStorage: selectedStorage?.name })} className="amazon-btn" style={{ width: '100%', backgroundColor: (isOutOfStock || isComingSoon) ? '#ccc' : '#ffd814', color: '#111', border: (isOutOfStock || isComingSoon) ? 'none' : '1px solid #fcd200', padding: '10px', fontWeight: 'bold', borderRadius: '8px', cursor: (isOutOfStock || isComingSoon) ? 'not-allowed' : 'pointer', marginBottom: '10px' }}>
                  {isOutOfStock ? 'Out of Stock' : (isComingSoon ? 'Coming Soon' : 'Add to Cart')}
                </button>
                <button disabled={isOutOfStock || isComingSoon} onClick={handleBuyNowClick} className="amazon-btn" style={{ width: '100%', backgroundColor: (isOutOfStock || isComingSoon) ? '#aaa' : '#ffa41c', color: '#111', border: (isOutOfStock || isComingSoon) ? 'none' : '1px solid #ff8f00', padding: '10px', fontWeight: 'bold', borderRadius: '8px', cursor: (isOutOfStock || isComingSoon) ? 'not-allowed' : 'pointer', marginBottom: '10px' }}>
                  Buy Now
                </button>
                
                <button onClick={() => addToWishlist(product)} style={{ width: '100%', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#111', border: isDarkMode ? '1px solid #555' : '1px solid #888', padding: '10px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <FaHeart color="#cc0c39" /> Add to Wishlist
                </button>
              </>
            ) : (
              <>
                <button disabled={isOutOfStock || isComingSoon} onClick={() => addToCart({ ...product, title: activeStyle.title, finalPrice, selectedStyle, selectedSize })} className="amazon-btn" style={{ width: '100%', backgroundColor: (isOutOfStock || isComingSoon) ? '#ccc' : '#ade8f4', color: (isOutOfStock || isComingSoon) ? '#666' : '#03045e', border: (isOutOfStock || isComingSoon) ? 'none' : '1px solid #90e0ef', padding: '10px', fontWeight: 'bold', borderRadius: '8px', cursor: (isOutOfStock || isComingSoon) ? 'not-allowed' : 'pointer', marginBottom: '10px' }}>
                  {isOutOfStock ? 'Out of Stock' : (isComingSoon ? 'Coming Soon' : 'Add to Rent Cart')}
                </button>
                <button disabled={isOutOfStock || isComingSoon} onClick={handleRentNowClick} className="amazon-btn" style={{ width: '100%', backgroundColor: (isOutOfStock || isComingSoon) ? '#aaa' : '#00a8e8', color: '#fff', border: 'none', padding: '12px', fontWeight: 'bold', borderRadius: '8px', cursor: (isOutOfStock || isComingSoon) ? 'not-allowed' : 'pointer', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <FaLock /> Rent Now
                </button>
                
                <button onClick={() => addToWishlist(product)} style={{ width: '100%', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#111', border: isDarkMode ? '1px solid #555' : '1px solid #888', padding: '10px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <FaHeart color="#cc0c39" /> Add to Wishlist
                </button>
              </>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', fontSize: '12px', color: isDarkMode ? '#ccc' : '#555' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FaUndo color="#007185" size={16}/> {product.replacement}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FaTruck color="#007185" size={16}/> Fast Delivery</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FaShieldAlt color="#007185" size={16}/> Secure Transaction</div>
            </div>

          </div>
        </div>

        {/* Product Information Accordions */}
        {product.infoSections && (
          <div style={{ marginTop: '40px', borderTop: isDarkMode ? '1px solid #444' : '1px solid #eee', paddingTop: '30px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: isDarkMode ? '#fff' : '#111' }}>Product information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.keys(product.infoSections).slice(0, Math.ceil(Object.keys(product.infoSections).length / 2)).map(key => (
                  <div key={key} style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f9f9f9', border: isDarkMode ? '1px solid #444' : '1px solid #eee', borderRadius: '4px' }}>
                    <div onClick={() => toggleAccordion(key)} style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', color: isDarkMode ? '#fff' : '#111' }}>
                      {key}
                      {openAccordions[key] ? <FaChevronUp size={12} color="#555"/> : <FaChevronDown size={12} color="#555"/>}
                    </div>
                    {openAccordions[key] && (
                      <div style={{ padding: '0 15px 15px 15px', fontSize: '13px', color: isDarkMode ? '#ccc' : '#555', lineHeight: '1.5' }}>
                        {product.infoSections[key]}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.keys(product.infoSections).slice(Math.ceil(Object.keys(product.infoSections).length / 2)).map(key => (
                  <div key={key} style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f9f9f9', border: isDarkMode ? '1px solid #444' : '1px solid #eee', borderRadius: '4px' }}>
                    <div onClick={() => toggleAccordion(key)} style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', color: isDarkMode ? '#fff' : '#111' }}>
                      {key}
                      {openAccordions[key] ? <FaChevronUp size={12} color="#555"/> : <FaChevronDown size={12} color="#555"/>}
                    </div>
                    {openAccordions[key] && (
                      <div style={{ padding: '0 15px 15px 15px', fontSize: '13px', color: isDarkMode ? '#ccc' : '#555', lineHeight: '1.5' }}>
                        {product.infoSections[key]}
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* Customer Reviews & Ratings - Hide if Coming Soon */}
        {!isComingSoon && product.reviews && product.reviews.length > 0 && (
          <div style={{ marginTop: '40px', borderTop: isDarkMode ? '1px solid #444' : '1px solid #eee', paddingTop: '30px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: isDarkMode ? '#fff' : '#111' }}>Customer Reviews & Ratings</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {product.reviews.map((rev, idx) => (
                <div key={idx} style={{ padding: '15px', backgroundColor: isDarkMode ? '#2c2c2c' : '#f9f9f9', borderRadius: '6px', border: isDarkMode ? '1px solid #444' : '1px solid #eee', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}><FaUserCircle color="#007185" /> {rev.user}</div>
                    <div style={{ fontSize: '11px', color: isDarkMode ? '#aaa' : '#777', marginBottom: '6px' }}>Verified Purchase | {rev.date}</div>
                    <div style={{ color: '#ffa41c', fontSize: '12px', marginBottom: '8px' }}>{[...Array(5)].map((_, i) => <span key={i} style={{ color: i < rev.rating ? '#ffa41c' : '#ccc' }}>★</span>)}</div>
                    <p style={{ fontSize: '13px', fontStyle: 'italic', marginBottom: '12px' }}>"{rev.comment}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar Products */}
        <div style={{ marginTop: '50px', paddingTop: '30px', borderTop: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: isDarkMode ? '#fff' : '#111' }}>
            <FaBoxOpen color="#00a8e8" /> Similar Products
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '40px' }}>
            {similarProducts.length > 0 ? (
              similarProducts.map(renderSmallCard)
            ) : (
              <p style={{ color: isDarkMode ? '#aaa' : '#666', fontSize: '14px' }}>No similar products found at the moment.</p>
            )}
          </div>
        </div>

      </div>

      {/* Checkout Modal (Buy) with Wallet / Gift Card Support */}
      {showCheckoutModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', color: isDarkMode ? '#fff' : '#111', width: '100%', maxWidth: '650px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ padding: '20px', borderBottom: isDarkMode ? '1px solid #333' : '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDarkMode ? '#252525' : '#f8f9fa' }}>
              <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaLock color="#00a8e8" /> Secure Checkout
              </h2>
              <button onClick={() => setShowCheckoutModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <FaTimes size={20} color={isDarkMode ? '#888' : '#555'} />
              </button>
            </div>

            <div style={{ padding: '30px', maxHeight: '75vh', overflowY: 'auto' }}>
              {checkoutStep === 'address' && (
                <>
                  <h3 style={{ fontSize: '18px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaMapMarkerAlt color="#007185"/> Select Delivery Address</h3>
                  
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
                        {checkoutAddresses.length > 0 && (
                          <button type="button" onClick={() => setIsAddingAddress(false)} style={{ flex: 1, padding: '10px', background: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                        )}
                      </div>
                    </form>
                  )}

                  {!isAddingAddress && checkoutAddresses.length > 0 && (
                    <button onClick={() => setCheckoutStep('payment')} style={{ width: '100%', padding: '12px', backgroundColor: '#ffd814', color: '#111', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', marginTop: '20px', cursor: 'pointer' }}>Deliver to this address</button>
                  )}
                </>
              )}

              {checkoutStep === 'payment' && (
                <form onSubmit={handlePaymentSubmit} autoComplete="off">
                  <h3 style={{ fontSize: '18px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaCreditCard color="#007185"/> Choose Payment Method</h3>
                  
                  <div style={{ padding: '15px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #ddd', backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Order Summary</h4>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#B12704' }}>
                      Total Payable Amount: ₹{(dealAccepted ? negotiatedPrice : finalPrice).toLocaleString()}
                      {useWallet && <span style={{ fontSize: '13px', color: '#10b981', display: 'block' }}>(Paying via Wallet Balance: ₹{Math.min(walletBalance, dealAccepted ? negotiatedPrice : finalPrice).toLocaleString()})</span>}
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
                    {useWallet && walletBalance < (dealAccepted ? negotiatedPrice : finalPrice) && (
                      <p style={{ fontSize: '12px', color: '#d97706', margin: '8px 0 0 28px' }}>
                        Wallet balance is less than total amount. Remaining ₹{Math.max(0, (dealAccepted ? negotiatedPrice : finalPrice) - walletBalance).toLocaleString()} will be covered or you can uncheck to pay fully via other methods.
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    
                    <div style={{ border: isDarkMode ? '1px solid #444' : '1px solid #ccc', borderRadius: '8px', padding: '12px', backgroundColor: selectedPayment === 'UPI' ? (isDarkMode ? '#1a1a1a' : '#f9f9f9') : 'transparent' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', marginBottom: selectedPayment === 'UPI' ? '15px' : '0' }}>
                        <input type="radio" checked={selectedPayment === 'UPI'} onChange={() => setSelectedPayment('UPI')} style={{ accentColor: '#00a8e8' }} />
                        UPI (Google Pay / PhonePe / Paytm)
                      </label>
                      
                      {selectedPayment === 'UPI' && (
                        <div style={{ paddingLeft: '25px', marginTop: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            {['GPay', 'PhonePe', 'Paytm'].map(provider => (
                              <button type="button" key={provider} onClick={() => setUpiProvider(provider)} style={{ padding: '6px 12px', borderRadius: '4px', border: upiProvider === provider ? '2px solid #00a8e8' : (isDarkMode ? '1px solid #555' : '1px solid #ccc'), backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000', cursor: 'pointer', fontSize: '13px', fontWeight: upiProvider === provider ? 'bold' : 'normal' }}>
                                {provider}
                              </button>
                            ))}
                          </div>
                          <div style={{ fontSize: '12px', marginBottom: '5px', color: isDarkMode ? '#aaa' : '#666' }}>Enter UPI ID:</div>
                          <input type="text" name="clean-pd-upi" autoComplete="off" placeholder="e.g. username@oksbi / mobile@paytm" value={upiId} onChange={e=>setUpiId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={selectedPayment === 'UPI' && (!useWallet || walletBalance < (dealAccepted ? negotiatedPrice : finalPrice))} />
                        </div>
                      )}
                    </div>

                    <div style={{ border: isDarkMode ? '1px solid #444' : '1px solid #ccc', borderRadius: '8px', padding: '12px', backgroundColor: selectedPayment === 'Card' ? (isDarkMode ? '#1a1a1a' : '#f9f9f9') : 'transparent' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', marginBottom: selectedPayment === 'Card' ? '15px' : '0' }}>
                        <input type="radio" checked={selectedPayment === 'Card'} onChange={() => setSelectedPayment('Card')} style={{ accentColor: '#00a8e8' }} />
                        Credit / Debit Card
                      </label>

                      {selectedPayment === 'Card' && (
                        <div style={{ paddingLeft: '25px', marginTop: '10px' }}>
                          <div style={{ fontSize: '12px', marginBottom: '5px', color: isDarkMode ? '#aaa' : '#666' }}>Card Number:</div>
                          <input type="text" name="clean-pd-cardnum" autoComplete="off" placeholder="4444 4444 4444 4444" value={cardNumber} onChange={e=>setCardNumber(e.target.value)} maxLength={16} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none', marginBottom: '15px' }} required={selectedPayment === 'Card' && (!useWallet || walletBalance < (dealAccepted ? negotiatedPrice : finalPrice))} />
                          
                          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', marginBottom: '5px', color: isDarkMode ? '#aaa' : '#666' }}>Expiry (MM/YY):</div>
                              <input type="text" name="clean-pd-cardexp" autoComplete="off" placeholder="MM/YY" value={cardExpiry} onChange={(e) => {
                                let v = e.target.value.replace(/\D/g, '');
                                if (v.length > 4) v = v.slice(0, 4);
                                if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                                setCardExpiry(v);
                              }} maxLength={5} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={selectedPayment === 'Card' && (!useWallet || walletBalance < (dealAccepted ? negotiatedPrice : finalPrice))} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', marginBottom: '5px', color: isDarkMode ? '#aaa' : '#666' }}>CVV:</div>
                              <input type="password" name="clean-pd-cardcvv" autoComplete="off" placeholder="***" value={cardCvv} onChange={e=>setCardCvv(e.target.value)} maxLength={4} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={selectedPayment === 'Card' && (!useWallet || walletBalance < (dealAccepted ? negotiatedPrice : finalPrice))} />
                            </div>
                          </div>

                          <div style={{ fontSize: '12px', marginBottom: '5px', color: isDarkMode ? '#aaa' : '#666' }}>Name on Card:</div>
                          <input type="text" name="clean-pd-cardname" autoComplete="off" placeholder="Cardholder Name" value={cardName} onChange={e=>setCardName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none' }} required={selectedPayment === 'Card' && (!useWallet || walletBalance < (dealAccepted ? negotiatedPrice : finalPrice))} />
                        </div>
                      )}
                    </div>

                  </div>

                  <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                    <button type="button" onClick={() => setCheckoutStep('address')} style={{ flex: 1, padding: '12px', background: 'transparent', color: isDarkMode ? '#ccc' : '#555', border: isDarkMode ? '1px solid #666' : '1px solid #ccc', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                      Back
                    </button>
                    <button type="submit" style={{ flex: 2, padding: '12px', backgroundColor: '#ffd814', color: '#111', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                      Place Order & Pay ₹{(dealAccepted ? negotiatedPrice : finalPrice).toLocaleString()} <FaArrowRight />
                    </button>
                  </div>
                </form>
              )}

              {checkoutStep === 'success' && (
                <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                  <FaCheckCircle color="#007600" size={60} style={{ marginBottom: '15px' }} />
                  <h2 style={{ color: '#007600', marginBottom: '10px' }}>Order Placed Successfully!</h2>
                  <p style={{ fontSize: '14px', color: isDarkMode ? '#aaa' : '#666', marginBottom: '30px', lineHeight: '1.6' }}>
                    Thank you for shopping at BargainCart.<br/>Your order for <strong>{activeStyle.title.substring(0, 30)}...</strong> has been placed successfully.
                  </p>
                  <button onClick={() => { setShowCheckoutModal(false); navigate('/'); }} style={{ padding: '12px 30px', backgroundColor: '#ffd814', color: '#111', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                    Continue Shopping
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* AI Bargaining Modal */}
      {showBargainModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#f8f9fa', width: '100%', maxWidth: '950px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
            
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
                <h3 style={{ fontSize: '16px', color: isDarkMode ? '#ddd' : '#333', fontWeight: 'normal', marginBottom: '20px' }}>Bargaining for: <br/><strong style={{ color: isDarkMode ? '#fff' : '#111' }}>{activeStyle.title.substring(0, 30)}...</strong></h3>
                
                <div style={{ width: '180px', height: '180px', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', borderRadius: '12px', margin: '0 auto 30px auto', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
                  <img src={activeStyle.image} alt={activeStyle.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ color: isDarkMode ? '#aaa' : '#555', fontSize: '14px' }}>Original Price:</div>
                  <div style={{ color: isDarkMode ? '#bbb' : '#111', fontSize: '18px', textDecoration: 'line-through' }}>₹{activeStyle.originalPrice.toLocaleString()}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'auto' }}>
                  <div style={{ color: isDarkMode ? '#aaa' : '#555', fontSize: '14px' }}>Current Offer:</div>
                  <div style={{ color: '#00a8e8', fontSize: '28px', fontWeight: 'bold' }}>₹{negotiatedPrice.toLocaleString()}</div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                  {dealAccepted ? (
                    <button onClick={() => { setShowBargainModal(false); setCheckoutStep('address'); setIsAddingAddress(false); setShowCheckoutModal(true); }} style={{ flex: 2, padding: '12px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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
                    <FaLightbulb color="#febd69" size= {18} />
                    <span style={{ fontSize: '12px', color: isDarkMode ? '#aaa' : '#666', fontWeight: 'bold' }}>Smart Offers:</span>
                    <button onClick={() => processOffer(finalPrice * 0.90)} style={{ padding: '6px 12px', backgroundColor: isDarkMode ? '#333' : '#e3f2fd', color: isDarkMode ? '#90caf9' : '#0d47a1', border: isDarkMode ? '1px solid #555' : '1px solid #90caf9', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Offer ₹{Math.floor(finalPrice * 0.90).toLocaleString()} (10% Off)
                    </button>
                    <button onClick={() => processOffer(finalPrice * 0.85)} style={{ padding: '6px 12px', backgroundColor: isDarkMode ? '#333' : '#e3f2fd', color: isDarkMode ? '#90caf9' : '#0d47a1', border: isDarkMode ? '1px solid #555' : '1px solid #90caf9', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Offer ₹{Math.floor(finalPrice * 0.85).toLocaleString()} (15% Off)
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

      {/* Direct Rental Multi-Step Checkout Modal with Wallet / Gift Card Support */}
      {showRentModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', color: isDarkMode ? '#fff' : '#111', width: '100%', maxWidth: '650px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ padding: '20px', borderBottom: isDarkMode ? '1px solid #333' : '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDarkMode ? '#252525' : '#f8f9fa' }}>
              <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaShieldAlt color="#00a8e8" /> Direct Rental Checkout ({rentStep.toUpperCase()})
              </h2>
              <button onClick={() => setShowRentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <FaTimes size={20} color={isDarkMode ? '#888' : '#555'} />
              </button>
            </div>

            <div style={{ padding: '30px', maxHeight: '75vh', overflowY: 'auto' }}>
              
              {rentStep === 'kyc' && (
                <form onSubmit={handleKycSubmit}>
                  <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Step 1: KYC & Rental Duration</h3>
                  
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Full Legal Name:</label>
                  <input type="text" placeholder="Enter full name" value={kycForm.fullName} onChange={e => setKycForm({...kycForm, fullName: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required />

                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Phone Number:</label>
                  <input type="tel" placeholder="10-digit mobile number" value={kycForm.phone} onChange={e => setKycForm({...kycForm, phone: e.target.value})} style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required />

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Govt ID Type:</label>
                      <select value={kycForm.idType} onChange={e => setKycForm({...kycForm, idType: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }}>
                        <option value="Government ID">Government ID (National ID)</option>
                        <option value="PAN Card">PAN Card</option>
                        <option value="Driving License">Driving License / Voter ID</option>
                      </select>
                    </div>
                    <div style={{ flex: 1.2 }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>ID Number / Reference:</label>
                      <input type="text" placeholder="Enter ID Reference Number" value={kycForm.idNumber} onChange={e => setKycForm({...kycForm, idNumber: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required />
                    </div>
                  </div>

                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Upload Govt ID Photo (Front / Back):</label>
                  <input type="file" accept="image/*" onChange={e => setKycForm({...kycForm, idPhoto: e.target.files[0]})} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required />

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                      <FaCalendarAlt /> Rental Duration (Enter number of days):
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      max="365"
                      value={rentalDays} 
                      onChange={e => setRentalDays(e.target.value)} 
                      placeholder="Enter days (e.g. 3)" 
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000', fontSize: '14px', fontWeight: 'bold' }} 
                    />
                    <small style={{ color: isDarkMode ? '#aaa' : '#666', marginTop: '4px', display: 'block' }}>
                      Total Rent: ₹{(finalPrice * numericDays).toLocaleString()} (₹{finalPrice.toLocaleString()} × {numericDays} days) + Refundable Deposit: ₹{(product.securityDeposit || 0).toLocaleString()}
                    </small>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '20px' }}>
                    <input type="checkbox" id="rentTerms" checked={kycForm.agreedToTerms} onChange={e => setKycForm({...kycForm, agreedToTerms: e.target.checked})} style={{ marginTop: '3px' }} required />
                    <label htmlFor="rentTerms" style={{ fontSize: '12px', color: isDarkMode ? '#ccc' : '#555', cursor: 'pointer' }}>
                      I agree to the rental terms, security deposit policies, and timely return agreements.
                    </label>
                  </div>

                  <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#00a8e8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Proceed to Address →
                  </button>
                </form>
              )}

              {rentStep === 'address' && (
                <form onSubmit={handleRentAddressSubmit}>
                  <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Step 2: Delivery Address</h3>
                  
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      <input type="radio" name="addrMode" checked={rentAddressMode === 'saved'} onChange={() => setRentAddressMode('saved')} />
                      Use Default Saved Address
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      <input type="radio" name="addrMode" checked={rentAddressMode === 'new'} onChange={() => setRentAddressMode('new')} />
                      Add New Address
                    </label>
                  </div>

                  {rentAddressMode === 'saved' ? (
                    <div>
                      {checkoutAddresses.length > 0 ? (
                        checkoutAddresses.map(addr => (
                          <div key={addr.id} onClick={() => setSelectedRentAddrId(addr.id)} style={{ padding: '15px', border: selectedRentAddrId === addr.id ? '2px solid #00a8e8' : (isDarkMode ? '1px solid #444' : '1px solid #ddd'), borderRadius: '8px', marginBottom: '10px', backgroundColor: selectedRentAddrId === addr.id ? (isDarkMode ? '#3b2f15' : '#fdf8f4') : (isDarkMode ? '#2c2c2c' : '#fff'), cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                            <input type="radio" checked={selectedRentAddrId === addr.id} readOnly style={{ marginTop: '4px', accentColor: '#00a8e8' }} />
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
                        <p style={{ color: isDarkMode ? '#aaa' : '#666', fontStyle: 'italic', marginBottom: '15px' }}>No saved addresses found. Please switch to "Add New Address" above.</p>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      <input type="text" placeholder="Full Name" value={rentNewAddress.fullName} onChange={e => setRentNewAddress({...rentNewAddress, fullName: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required />
                      <input type="tel" placeholder="Mobile Number" value={rentNewAddress.phone} onChange={e => setRentNewAddress({...rentNewAddress, phone: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required />
                      <input type="text" placeholder="Street Address / Area" value={rentNewAddress.street} onChange={e => setRentNewAddress({...rentNewAddress, street: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" placeholder="City" value={rentNewAddress.city} onChange={e => setRentNewAddress({...rentNewAddress, city: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required />
                        <input type="text" placeholder="Pincode" value={rentNewAddress.pincode} onChange={e => setRentNewAddress({...rentNewAddress, pincode: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setRentStep('kyc')} style={{ flex: 1, padding: '12px', background: 'transparent', color: isDarkMode ? '#ccc' : '#555', border: '1px solid #888', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Back</button>
                    <button type="submit" style={{ flex: 2, padding: '12px', backgroundColor: '#00a8e8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Proceed to Payment →</button>
                  </div>
                </form>
              )}

              {rentStep === 'payment' && (
                <form onSubmit={handleRentPaymentSubmit} autoComplete="off">
                  <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>Step 3: Payment (UPI / Card / Gift Card)</h3>
                  
                  <div style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 5px 0' }}>Rental Duration: <strong>{numericDays} Day(s)</strong></p>
                    <p style={{ margin: '0 0 5px 0' }}>Rent Amount: <strong>₹{(finalPrice * numericDays).toLocaleString()}</strong></p>
                    <p style={{ margin: '0 0 5px 0' }}>Refundable Security Deposit: <strong>₹{(product.securityDeposit || 0).toLocaleString()}</strong></p>
                    <hr style={{ border: '0', borderTop: '1px solid #ddd', margin: '10px 0' }} />
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#00a8e8' }}>
                      Total Payable Now: ₹{totalRentPayable.toLocaleString()}
                      {rentUseWallet && <span style={{ fontSize: '13px', color: '#10b981', display: 'block' }}>(Paying via Wallet Balance: ₹{Math.min(walletBalance, totalRentPayable).toLocaleString()})</span>}
                    </p>
                  </div>

                  <div style={{ border: '2px solid #9b51e0', borderRadius: '8px', padding: '15px', marginBottom: '20px', backgroundColor: isDarkMode ? '#221a2d' : '#fcf5ff' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#9b51e0' }}>
                      <input 
                        type="checkbox" 
                        checked={rentUseWallet} 
                        onChange={() => setRentUseWallet(!rentUseWallet)} 
                        style={{ width: '18px', height: '18px', accentColor: '#9b51e0' }}
                      />
                      <FaWallet /> Pay with BargainCart Cash & Gift Card (Available: ₹{walletBalance.toLocaleString()})
                    </label>
                    {rentUseWallet && walletBalance < totalRentPayable && (
                      <p style={{ fontSize: '12px', color: '#d97706', margin: '8px 0 0 28px' }}>
                        Wallet balance is less than total amount. Remaining ₹{Math.max(0, totalRentPayable - walletBalance).toLocaleString()} will be covered or you can uncheck to pay fully via other methods.
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                      <input type="radio" name="rentPay" checked={rentPayment === 'upi'} onChange={() => setRentPayment('upi')} />
                      UPI (GPay / PhonePe / Paytm)
                    </label>
                    {rentPayment === 'upi' && (
                      <input type="text" name="clean-pd-rent-upi" autoComplete="off" placeholder="Enter UPI ID (e.g. username@oksbi)" value={rentUpiId} onChange={e => setRentUpiId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required={rentPayment === 'upi' && (!rentUseWallet || walletBalance < totalRentPayable)} />
                    )}

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                      <input type="radio" name="rentPay" checked={rentPayment === 'card'} onChange={() => setRentPayment('card')} />
                      Credit / Debit Card
                    </label>
                    {rentPayment === 'card' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input type="text" name="clean-pd-rent-num" autoComplete="off" placeholder="Card Number" maxLength="16" value={rentCard.number} onChange={e => setRentCard({...rentCard, number: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required={rentPayment === 'card' && (!rentUseWallet || walletBalance < totalRentPayable)} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input type="text" name="clean-pd-rent-exp" autoComplete="off" placeholder="MM/YY" maxLength="5" value={rentCard.expiry} onChange={handleRentExpiryChange} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required={rentPayment === 'card' && (!rentUseWallet || walletBalance < totalRentPayable)} />
                          <input type="password" name="clean-pd-rent-cvv" autoComplete="off" placeholder="CVV" maxLength="4" value={rentCard.cvv} onChange={e => setRentCard({...rentCard, cvv: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required={rentPayment === 'card' && (!rentUseWallet || walletBalance < totalRentPayable)} />
                        </div>
                        <input type="text" name="clean-pd-rent-name" autoComplete="off" placeholder="Cardholder Name" value={rentCard.name} onChange={e => setRentCard({...rentCard, name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: isDarkMode?'#333':'#fff', color: isDarkMode?'#fff':'#000' }} required={rentPayment === 'card' && (!rentUseWallet || walletBalance < totalRentPayable)} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setRentStep('address')} style={{ flex: 1, padding: '12px', background: 'transparent', color: isDarkMode ? '#ccc' : '#555', border: '1px solid #888', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Back</button>
                    <button type="submit" style={{ flex: 2, padding: '12px', backgroundColor: '#00a8e8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Pay ₹{totalRentPayable.toLocaleString()} & Place Rental Order</button>
                  </div>
                </form>
              )}

              {rentStep === 'success' && (
                <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                  <FaCheckCircle color="#007600" size={60} style={{ marginBottom: '15px' }} />
                  <h2 style={{ color: '#007600', marginBottom: '10px' }}>Order Placed Successfully!</h2>
                  <p style={{ fontSize: '15px', color: isDarkMode ? '#aaa' : '#666', marginBottom: '30px', lineHeight: '1.6' }}>
                    Your rental order for <strong>{activeStyle.title}</strong> ({numericDays} day(s)) has been placed successfully!<br/>
                    KYC verified and payment received. Your item will be dispatched shortly.
                  </p>
                  <button onClick={() => { setShowRentModal(false); navigate('/'); }} style={{ padding: '12px 30px', backgroundColor: '#ffd814', color: '#111', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                    Continue Shopping
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ProductDetail;