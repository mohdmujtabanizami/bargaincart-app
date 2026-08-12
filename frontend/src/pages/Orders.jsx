import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaArrowLeft, FaTimes, FaTruck, FaUndo, FaStar, FaFileInvoice, FaKey } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';

// Import central products catalog for real synced images and titles
import { products as CENTRAL_PRODUCTS } from '../data/products';

function Orders() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'buy' | 'rent' | 'notShipped' | 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [modalType, setModalType] = useState(null); // 'invoice' | 'track' | 'return' | 'review' | 'extend' | null
  const [selectedItem, setSelectedItem] = useState(null);

  // Form States inside Modals
  const [returnReason, setReturnReason] = useState('Defective / Not working properly');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [extendDays, setExtendDays] = useState('3');

  // Real-time orders state synced with Firebase
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch real-time orders from Firebase with accurate product ID mapping
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        const ordersRef = ref(db, `users/${currentUser.uid}/orders`);
        onValue(ordersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const orderArray = Object.keys(data).map(key => {
              const orderData = data[key];
              const title = orderData.productTitle || 'Product';

              // Smart ID Mapping: Ensure exact product mapping by title if productId is missing or generic
              let mappedId = orderData.productId;
              if (!mappedId || mappedId === 'b1') {
                const lowerTitle = title.toLowerCase();
                if (lowerTitle.includes('canon') || lowerTitle.includes('camera')) mappedId = 'r1';
                else if (lowerTitle.includes('sherwani')) mappedId = 'r5';
                else if (lowerTitle.includes('lehenga')) mappedId = 'r6';
                else if (lowerTitle.includes('tuxedo') || lowerTitle.includes('suit')) mappedId = 'r7';
                else if (lowerTitle.includes('playstation') || lowerTitle.includes('ps5')) {
                  mappedId = orderData.type === 'rent' ? 'r3' : 'b9';
                }
                else if (lowerTitle.includes('projector')) mappedId = 'r4';
                else if (lowerTitle.includes('speaker')) mappedId = 'r2';
                else if (lowerTitle.includes('watch')) mappedId = 'b2';
                else if (lowerTitle.includes('keyboard')) mappedId = 'b3';
                else if (lowerTitle.includes('headphone')) mappedId = 'b4';
                else if (lowerTitle.includes('iphone')) mappedId = 'b5';
                else if (lowerTitle.includes('samsung') || lowerTitle.includes('galaxy')) mappedId = 'b6';
                else if (lowerTitle.includes('monitor')) mappedId = 'b7';
                else if (lowerTitle.includes('mouse')) mappedId = 'b8';
                else if (lowerTitle.includes('laptop') || lowerTitle.includes('asus')) mappedId = 'b1';
                else if (lowerTitle.includes('kolkata') || lowerTitle.includes('jearsy') || lowerTitle.includes('jersey')) mappedId = 'b11';
                else mappedId = 'b1';
              }

              // Find matching real product from central list to get exact synced image & title
              const matchedProduct = CENTRAL_PRODUCTS.find(p => p.id === mappedId || p.title.toLowerCase() === title.toLowerCase());

              return {
                dbKey: key,
                id: key,
                orderId: orderData.orderId || 'ORD-' + key,
                date: orderData.date || '11 August 2026',
                total: `₹${(orderData.amount || 0).toLocaleString()}`,
                deliverTo: currentUser.displayName || currentUser.email || 'Mohd Mujtaba Nizami',
                status: orderData.status || 'Order Placed',
                tabCategory: orderData.status === 'Cancelled' ? 'cancelled' : 'delivered',
                isRental: orderData.type === 'rent',
                items: [
                  {
                    id: matchedProduct ? matchedProduct.id : mappedId,
                    title: matchedProduct ? matchedProduct.title : title,
                    price: orderData.amount || 0,
                    image: matchedProduct ? matchedProduct.image : (orderData.productImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600')
                  }
                ]
              };
            });
            setOrders(orderArray.reverse()); // Latest orders at the top
          } else {
            setOrders([]);
          }
          setLoading(false);
        });
      } else {
        setOrders([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Filter and sort orders by search & tabs
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (activeTab === 'all') return true; 
    if (activeTab === 'buy') return !order.isRental;
    if (activeTab === 'rent') return order.isRental;
    if (activeTab === 'notShipped') return order.status === 'Order Placed';
    if (activeTab === 'cancelled') return order.status === 'Cancelled';
    return true;
  });

  const handleOpenModal = (type, item, order) => {
    setSelectedItem({ ...item, ...order });
    setModalType(type);
  };

  // Cancel order in Firebase
  const handleCancelOrder = async (dbKey) => {
    const currentUser = auth.currentUser;
    if (currentUser && dbKey) {
      try {
        await update(ref(db, `users/${currentUser.uid}/orders/${dbKey}`), { status: 'Cancelled' });
        alert("Order Cancelled Successfully!");
      } catch (error) {
        console.error("Error cancelling order:", error);
      }
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px', color: isDarkMode ? '#fff' : '#000' }}>Loading your orders...</div>;
  }

  return (
    <div style={{ 
      maxWidth: '1000px', 
      margin: '20px auto', 
      padding: '0 20px', 
      fontFamily: 'Arial, sans-serif',
      color: isDarkMode ? '#ffffff' : '#000000',
      transition: 'color 0.3s ease'
    }}>
      
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <FaArrowLeft /> Back
      </button>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: isDarkMode ? '#ffffff' : '#111', fontSize: '24px', margin: 0 }}>Your Orders & Rentals</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <FaSearch style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
            <input 
              type="text" 
              placeholder="Search all orders" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                padding: '8px 10px 8px 32px', 
                borderRadius: '4px', 
                border: isDarkMode ? '1px solid #444' : '1px solid #ccc', 
                backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
                color: isDarkMode ? '#fff' : '#000',
                width: '250px' 
              }}
            />
          </div>
          <button style={{ padding: '8px 15px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Search
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #ddd', marginBottom: '20px', paddingBottom: '10px', fontSize: '15px', overflowX: 'auto' }}>
        <span 
          onClick={() => setActiveTab('all')} 
          style={{ fontWeight: activeTab === 'all' ? 'bold' : 'normal', color: activeTab === 'all' ? '#B12704' : (isDarkMode ? '#aaa' : '#007185'), borderBottom: activeTab === 'all' ? '2px solid #B12704' : 'none', paddingBottom: '10px', cursor: 'pointer' }}>
          All Orders
        </span>
        <span 
          onClick={() => setActiveTab('buy')} 
          style={{ fontWeight: activeTab === 'buy' ? 'bold' : 'normal', color: activeTab === 'buy' ? '#B12704' : (isDarkMode ? '#aaa' : '#007185'), borderBottom: activeTab === 'buy' ? '2px solid #B12704' : 'none', paddingBottom: '10px', cursor: 'pointer' }}>
          🛒 Buy Orders
        </span>
        <span 
          onClick={() => setActiveTab('rent')} 
          style={{ fontWeight: activeTab === 'rent' ? 'bold' : 'normal', color: activeTab === 'rent' ? '#00a8e8' : (isDarkMode ? '#aaa' : '#007185'), borderBottom: activeTab === 'rent' ? '2px solid #00a8e8' : 'none', paddingBottom: '10px', cursor: 'pointer' }}>
          🏠 Rental Orders
        </span>
        <span 
          onClick={() => setActiveTab('notShipped')} 
          style={{ fontWeight: activeTab === 'notShipped' ? 'bold' : 'normal', color: activeTab === 'notShipped' ? '#B12704' : (isDarkMode ? '#aaa' : '#007185'), borderBottom: activeTab === 'notShipped' ? '2px solid #B12704' : 'none', paddingBottom: '10px', cursor: 'pointer' }}>
          Not Yet Shipped
        </span>
        <span 
          onClick={() => setActiveTab('cancelled')} 
          style={{ fontWeight: activeTab === 'cancelled' ? 'bold' : 'normal', color: activeTab === 'cancelled' ? '#B12704' : (isDarkMode ? '#aaa' : '#007185'), borderBottom: activeTab === 'cancelled' ? '2px solid #B12704' : 'none', paddingBottom: '10px', cursor: 'pointer' }}>
          Cancelled
        </span>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', border: isDarkMode ? '1px solid #333' : '1px solid #ddd', borderRadius: '8px' }}>
          <h3 style={{ color: isDarkMode ? '#fff' : '#333' }}>No orders found in this section.</h3>
          <p style={{ color: isDarkMode ? '#aaa' : '#666', marginBottom: '20px' }}>Explore our store and place your order!</p>
          <button 
            onClick={() => navigate('/')} 
            style={{ padding: '10px 20px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Start Shopping Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredOrders.map((order, index) => (
            <div key={index} style={{ border: isDarkMode ? '1px solid #444' : '1px solid #d5d9d9', borderRadius: '8px', backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', overflow: 'hidden' }}>
              
              {/* Order Box Header */}
              <div style={{ backgroundColor: order.isRental ? (isDarkMode ? '#1a365d' : '#e3f2fd') : (isDarkMode ? '#2c2c2c' : '#f0f2f2'), padding: '14px 18px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: isDarkMode ? '1px solid #444' : '1px solid #d5d9d9', fontSize: '14px', color: isDarkMode ? '#aaa' : '#565959' }}>
                <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ textTransform: 'uppercase', fontSize: '12px' }}>{order.isRental ? 'Rental Date' : 'Order Placed'}</div>
                    <div style={{ color: isDarkMode ? '#fff' : '#111' }}>{order.date}</div>
                  </div>
                  <div>
                    <div style={{ textTransform: 'uppercase', fontSize: '12px' }}>Total</div>
                    <div style={{ color: isDarkMode ? '#fff' : '#111' }}>{order.total}</div>
                  </div>
                  <div>
                    <div style={{ textTransform: 'uppercase', fontSize: '12px' }}>Dispatch To</div>
                    <div style={{ color: '#007185', cursor: 'pointer' }} onClick={() => alert(`Dispatch Address: ${order.deliverTo}`)}>{order.deliverTo}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ textTransform: 'uppercase', fontSize: '12px' }}>{order.isRental ? 'Rental ID #' : 'Order #'} {order.orderId}</div>
                  <div 
                    onClick={() => handleOpenModal('invoice', order.items[0], order)} 
                    style={{ color: '#007185', cursor: 'pointer', fontWeight: 'bold' }}>
                    View details | Invoice
                  </div>
                </div>
              </div>

              {/* Order Box Body */}
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                  {order.isRental && <span style={{ backgroundColor: '#00a8e8', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>RENTAL ORDER</span>}
                  <h3 style={{ margin: 0, fontSize: '18px', color: order.status === 'Cancelled' ? '#cc0c39' : (isDarkMode ? '#fff' : '#111') }}>
                    {order.status}
                  </h3>
                </div>
                
                {order.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ width: '90px', height: '90px', backgroundColor: '#fff', borderRadius: '4px', padding: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #ddd' }}>
                      <img src={item.image} alt="Product" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div 
                        onClick={() => navigate(`/product/${item.id}`)}
                        style={{ color: '#007185', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '5px' }}>
                        {item.title}
                      </div>
                      <div style={{ color: order.isRental ? '#00a8e8' : '#B12704', fontWeight: 'bold', marginBottom: '5px' }}>
                        ₹{item.price.toLocaleString()} {order.isRental ? '/ day' : ''}
                      </div>

                      {!order.isRental ? (
                        <button 
                          onClick={() => { navigate('/'); alert(`"${item.title}" added back to cart!`); }}
                          style={{ padding: '6px 12px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', marginRight: '10px', fontWeight: 'bold' }}>
                          Buy it again
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleOpenModal('extend', item, order)}
                          style={{ padding: '6px 12px', backgroundColor: '#00a8e8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', marginRight: '10px' }}>
                          Extend Rental
                        </button>
                      )}
                      
                      <button 
                        onClick={() => navigate(`/product/${item.id}`)}
                        style={{ padding: '6px 12px', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#0f1111', border: isDarkMode ? '1px solid #555' : '1px solid #d5d9d9', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                        View item
                      </button>
                    </div>
                    
                    {/* Action Buttons on Right Side */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '200px' }}>
                      {order.status === 'Cancelled' ? (
                        <button 
                          onClick={() => { navigate('/'); alert(`Reordering cancelled item...`); }}
                          style={{ padding: '6px 0', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                          Reorder
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleCancelOrder(order.dbKey)}
                            style={{ padding: '6px 0', backgroundColor: '#ffe6e6', color: '#cc0c39', border: '1px solid #ffcccc', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                            Cancel Order
                          </button>
                          <button 
                            onClick={() => handleOpenModal('track', item, order)}
                            style={{ padding: '6px 0', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#0f1111', border: isDarkMode ? '1px solid #555' : '1px solid #d5d9d9', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                            Track package
                          </button>
                          <button 
                            onClick={() => handleOpenModal('return', item, order)}
                            style={{ padding: '6px 0', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#0f1111', border: isDarkMode ? '1px solid #555' : '1px solid #d5d9d9', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                            Return or replace
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modalType && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', width: '480px', maxWidth: '100%', padding: '25px', borderRadius: '8px', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: isDarkMode ? '1px solid #444' : 'none' }}>
            <FaTimes size={18} style={{ position: 'absolute', top: '15px', right: '15px', cursor: 'pointer' }} onClick={() => setModalType(null)} />

            {/* 1. Invoice Modal */}
            {modalType === 'invoice' && selectedItem && (
              <div>
                <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#007185' }}>
                  <FaFileInvoice /> {selectedItem.isRental ? 'Rental Agreement & Receipt' : 'Tax Invoice & Order Summary'}
                </h3>
                <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '15px' }}>
                  <p><strong>{selectedItem.isRental ? 'Rental ID' : 'Order ID'}:</strong> {selectedItem.orderId}</p>
                  <p><strong>Date:</strong> {selectedItem.date}</p>
                  <p><strong>Item:</strong> {selectedItem.title}</p>
                  <p><strong>Total Amount:</strong> <strong style={{ color: '#B12704' }}>{selectedItem.total}</strong></p>
                  <p><strong>Status:</strong> <span style={{ color: selectedItem.status === 'Cancelled' ? '#cc0c39' : '#007600', fontWeight: 'bold' }}>{selectedItem.status}</span></p>
                </div>
                <button 
                  onClick={() => { alert("Document downloaded successfully!"); setModalType(null); }}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
                  Download Receipt (PDF)
                </button>
              </div>
            )}

            {/* 2. Track Package Modal */}
            {modalType === 'track' && selectedItem && (
              <div>
                <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#00a8e8' }}>
                  <FaTruck /> Live Package Tracking
                </h3>
                <p style={{ fontSize: '13px', marginBottom: '20px' }}><strong>Tracking ID:</strong> TRK-9874563210</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid #00a8e8', marginBottom: '20px' }}>
                  <div><div style={{ fontWeight: 'bold', fontSize: '13px' }}>Order Placed</div></div>
                  <div><div style={{ fontWeight: 'bold', fontSize: '13px' }}>Out for Delivery</div></div>
                  <div><div style={{ fontWeight: 'bold', fontSize: '13px', color: '#007600' }}>On the way</div></div>
                </div>
                <button onClick={() => setModalType(null)} style={{ width: '100%', padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>Close Tracker</button>
              </div>
            )}

            {/* 3. Return Modal */}
            {modalType === 'return' && selectedItem && (
              <div>
                <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#B12704' }}>
                  <FaUndo /> Request Return or Replacement
                </h3>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Return Reason:</label>
                <select 
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginBottom: '20px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000' }}>
                  <option value="Defective / Not working properly">Defective / Not working properly</option>
                  <option value="Received wrong item">Received wrong item</option>
                  <option value="Product description doesn't match">Product description doesn't match</option>
                </select>
                <button 
                  onClick={() => { alert(`Return request submitted!`); setModalType(null); }}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
                  Submit Return Request
                </button>
              </div>
            )}

            {/* 4. Extend Rental Modal */}
            {modalType === 'extend' && selectedItem && (
              <div>
                <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#00a8e8' }}>
                  <FaKey /> Extend Rental Duration
                </h3>
                <p style={{ fontSize: '13px', marginBottom: '15px' }}>Extend your rental for: <strong>{selectedItem.title}</strong></p>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Extend By:</label>
                <select 
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginBottom: '20px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000' }}>
                  <option value="3">3 Days</option>
                  <option value="7">1 Week</option>
                  <option value="15">15 Days</option>
                  <option value="30">1 Month</option>
                </select>
                <button 
                  onClick={() => { alert(`Rental extended successfully by ${extendDays} days!`); setModalType(null); }}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#00a8e8', color: '#fff', border: 'none', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
                  Confirm & Pay Extension Fee
                </button>
              </div>
            )}

            {/* 5. Review Modal */}
            {modalType === 'review' && selectedItem && (
              <div>
                <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffa41c' }}>
                  <FaStar /> Write a Product Review
                </h3>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Rating (1 to 5 Stars):</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button 
                      key={num}
                      onClick={() => setReviewRating(num)}
                      style={{ padding: '6px 12px', backgroundColor: reviewRating >= num ? '#ffa41c' : (isDarkMode ? '#333' : '#eee'), color: reviewRating >= num ? '#fff' : '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {num} ★
                    </button>
                  ))}
                </div>
                <textarea 
                  rows="3"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginBottom: '20px', borderRadius: '4px', border: isDarkMode ? '1px solid #444' : '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000' }}
                />
                <button 
                  onClick={() => { alert(`Thank you for your review!`); setModalType(null); }}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
                  Submit Review
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;