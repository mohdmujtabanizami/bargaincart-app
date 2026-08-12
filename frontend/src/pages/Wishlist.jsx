import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaTrash, FaShoppingCart, FaHeart, FaBell, FaCheck } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { ref, onValue, remove, push, get } from 'firebase/database';
import '../App.css';

// Import central products catalog
import { products as CENTRAL_PRODUCTS } from '../data/products';

function Wishlist({ wishlistItems, removeFromWishlist, addToCart }) {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [alertSentMap, setAlertSentMap] = useState({});

  // Real-time wishlist state synced with Firebase
  const [dbWishlist, setDbWishlist] = useState([]);

  // Fetch real-time wishlist from Firebase
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        const wishlistRef = ref(db, `users/${currentUser.uid}/wishlist`);
        onValue(wishlistRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const wishlistArray = Object.keys(data).map(key => {
              const item = data[key];
              const matchedProduct = CENTRAL_PRODUCTS.find(p => p.id === item.id || p.title?.toLowerCase() === item.title?.toLowerCase());
              return {
                dbKey: key,
                ...item,
                image: matchedProduct ? matchedProduct.image : (item.image || item.images?.[0] || ''),
                title: matchedProduct ? matchedProduct.title : (item.title || 'Product'),
                stock: matchedProduct ? matchedProduct.stock : (item.stock !== undefined ? item.stock : 1)
              };
            });
            setDbWishlist(wishlistArray);
          } else {
            setDbWishlist([]);
          }
        });
      } else {
        setDbWishlist([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const safeWishlistItems = dbWishlist.length > 0 ? dbWishlist : (Array.isArray(wishlistItems) ? wishlistItems.map(item => {
    const matchedProduct = CENTRAL_PRODUCTS.find(p => p.id === item.id || p.title?.toLowerCase() === item.title?.toLowerCase());
    return {
      ...item,
      image: matchedProduct ? matchedProduct.image : (item.image || item.images?.[0] || ''),
      title: matchedProduct ? matchedProduct.title : (item.title || 'Product'),
      stock: matchedProduct ? matchedProduct.stock : (item.stock !== undefined ? item.stock : 1)
    };
  }) : []);

  // Remove item from Firebase wishlist
  const handleRemove = async (item) => {
    const currentUser = auth.currentUser;
    if (currentUser && item.dbKey) {
      try {
        await remove(ref(db, `users/${currentUser.uid}/wishlist/${item.dbKey}`));
      } catch (error) {
        console.error("Error removing from wishlist:", error);
      }
    } else {
      const index = safeWishlistItems.findIndex(w => w.id === item.id);
      if (index !== -1) removeFromWishlist(index);
    }
  };

  // Move item to cart with already-in-cart check and instant wishlist removal
  const handleMoveToCart = async (item) => {
    const matchedProduct = CENTRAL_PRODUCTS.find(p => p.id === item.id || p.title?.toLowerCase() === item.title?.toLowerCase());
    const currentStock = matchedProduct ? matchedProduct.stock : (item.stock !== undefined ? item.stock : 1);
    const isComingSoon = matchedProduct?.comingSoon || item.comingSoon || false;

    if (currentStock === 0 && !isComingSoon) {
      alert(`⚠️ Sorry! "${item.title || 'This product'}" is currently Out of Stock and cannot be moved to cart.`);
      return;
    }

    if (isComingSoon) {
      alert(`🚀 "${item.title || 'This product'}" is Coming Soon and cannot be added to cart yet.`);
      return;
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      // Check if item already exists in user's cart in Firebase
      const cartRef = ref(db, `users/${currentUser.uid}/cart`);
      const snapshot = await get(cartRef);
      let alreadyExists = false;

      if (snapshot.exists()) {
        const cartData = snapshot.val();
        Object.values(cartData).forEach(cartItem => {
          if (cartItem.id === item.id || cartItem.title?.toLowerCase() === item.title?.toLowerCase()) {
            alreadyExists = true;
          }
        });
      }

      if (alreadyExists) {
        alert("⚠️ This product is already in your cart!");
        // Remove from wishlist as well to avoid user confusion
        await handleRemove(item);
        return;
      }

      // Add to Firebase Cart
      try {
        await push(ref(db, `users/${currentUser.uid}/cart`), {
          id: item.id || matchedProduct?.id || 'b1',
          title: item.title || matchedProduct?.title || 'Product',
          price: item.price || matchedProduct?.price || 0,
          image: item.image || matchedProduct?.image || '',
          type: item.type || matchedProduct?.type || 'buy'
        });
      } catch (err) {
        console.error("Error syncing cart to firebase:", err);
      }
    }

    // Call parent cart handler
    addToCart(item);

    // Remove from wishlist immediately
    await handleRemove(item);
    alert(`🛒 "${item.title || 'Product'}" has been successfully moved to your Cart!`);
  };

  // Simulate price drop & send SMS alert notification
  const handleTriggerPriceDropAlert = (item, index) => {
    const itemPrice = item.price || item.finalPrice || 0;
    const droppedPrice = Math.floor(itemPrice * 0.85); // 15% price drop

    const smsMessage = `📱 SMS Alert Sent to Registered Mobile:\n\n"BargainCart Price Drop Alert: Great news! The item '${item.title || "Product"}' in your wishlist has dropped in price to ₹${droppedPrice.toLocaleString()}. Grab it now before stock ends!"`;
    
    alert(smsMessage);

    setAlertSentMap({
      ...alertSentMap,
      [index]: true
    });
  };

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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #ddd', paddingBottom: '15px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', color: isDarkMode ? '#fff' : '#131921', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaHeart color="#cc0c39" /> My Saved Wishlist ({safeWishlistItems.length})
        </h1>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', fontWeight: 'bold' }}>
          ← Continue Shopping
        </button>
      </div>

      {safeWishlistItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: isDarkMode ? '#aaa' : '#666' }}>
          <FaHeart size={40} color="#ccc" style={{ marginBottom: '10px' }} />
          <p style={{ fontSize: '16px' }}>Your wishlist is currently empty.</p>
          <Link to="/" style={{ color: '#007185', fontWeight: 'bold', textDecoration: 'none' }}>Explore Products & Add to Wishlist →</Link>
        </div>
      ) : (
        <div>
          {safeWishlistItems.map((item, index) => {
            const itemImage = item.image || item.images?.[0] || "";
            const itemTitle = item.title || "Product";
            const itemPrice = item.price || item.finalPrice || 0;
            const itemId = item.id || "1";

            const matchedProduct = CENTRAL_PRODUCTS.find(p => p.id === item.id || p.title?.toLowerCase() === item.title?.toLowerCase());
            const currentStock = matchedProduct ? matchedProduct.stock : (item.stock !== undefined ? item.stock : 1);
            const isComingSoon = matchedProduct?.comingSoon || item.comingSoon || false;
            const isOutOfStock = currentStock === 0 && !isComingSoon;

            return (
              <div key={index} style={{ display: 'flex', gap: '20px', padding: '20px 0', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #eee', alignItems: 'center' }}>
                
                {/* Clickable Image */}
                <Link to={`/product/${itemId}`} style={{ textDecoration: 'none' }}>
                  <img src={itemImage} alt={itemTitle} style={{ width: '90px', height: '90px', objectFit: 'contain', border: isDarkMode ? '1px solid #555' : '1px solid #ddd', borderRadius: '6px', padding: '5px', cursor: 'pointer', backgroundColor: '#fff' }} />
                </Link>
                
                <div style={{ flex: 1 }}>
                  {/* Clickable Title */}
                  <Link to={`/product/${itemId}`} style={{ textDecoration: 'none', color: isDarkMode ? '#fff' : '#111' }}>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', cursor: 'pointer' }}>{itemTitle}</h4>
                  </Link>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#B12704', margin: '0 0 5px 0' }}>
                    ₹{itemPrice.toLocaleString()}
                  </p>

                  {/* Stock status badge */}
                  {isOutOfStock ? (
                    <p style={{ fontSize: '12px', color: '#d32f2f', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                      ⚠️ Currently Out of Stock
                    </p>
                  ) : isComingSoon ? (
                    <p style={{ fontSize: '12px', color: '#00a8e8', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                      🚀 Coming Soon
                    </p>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#007600', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                      ✔ In Stock
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <button 
                      onClick={() => handleRemove(item)} 
                      style={{ background: 'none', border: 'none', color: '#cc0c39', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}>
                      <FaTrash size={12} /> Remove
                    </button>

                    {/* Simulate Price Drop Notification Button */}
                    <button 
                      onClick={() => handleTriggerPriceDropAlert(item, index)}
                      style={{ 
                        backgroundColor: alertSentMap[index] ? (isDarkMode ? '#0d3b1e' : '#d4edda') : (isDarkMode ? '#222' : '#e3f2fd'), 
                        color: alertSentMap[index] ? (isDarkMode ? '#75b798' : '#155724') : (isDarkMode ? '#90cdf4' : '#0d47a1'), 
                        border: '1px solid', borderColor: alertSentMap[index] ? (isDarkMode ? '#198754' : '#c3e6cb') : (isDarkMode ? '#444' : '#90caf9'), 
                        padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                        display: 'flex', alignItems: 'center', gap: '6px' 
                      }}>
                      {alertSentMap[index] ? <><FaCheck /> Price Drop SMS Sent</> : <><FaBell /> Simulate Price Drop Alert</>}
                    </button>
                  </div>
                </div>

                <div>
                  <button 
                    onClick={() => handleMoveToCart(item)}
                    className="amazon-btn"
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: isOutOfStock ? '#ccc' : '#ffd814', 
                      color: isOutOfStock ? '#666' : '#111', 
                      border: isOutOfStock ? 'none' : '1px solid #fcd200', 
                      fontWeight: 'bold', 
                      borderRadius: '8px', 
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      fontSize: '13px' 
                    }}>
                    <FaShoppingCart /> Move to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default Wishlist;