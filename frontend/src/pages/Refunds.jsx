import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUndoAlt, FaCheckCircle, FaClock, FaBox } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import '../App.css';

// Import central products catalog to keep images and titles synced with refunds
import { products as CENTRAL_PRODUCTS } from '../data/products';

function Refunds() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [refundsData, setRefundsData] = useState({
    processed: [],
    upcoming: []
  });
  const [loading, setLoading] = useState(true);

  // Real-time refunds sync from Firebase with product mapping
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        const refundsRef = ref(db, `users/${currentUser.uid}/refunds`);
        onValue(refundsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const refundArray = Object.keys(data).map(key => {
              const item = data[key];
              const title = item.title || item.productTitle || 'Product';
              
              // Match with central products to extract the correct image and title
              const matchedProduct = CENTRAL_PRODUCTS.find(p => p.id === item.id || p.title?.toLowerCase() === title.toLowerCase());

              return {
                dbKey: key,
                ...item,
                title: matchedProduct ? matchedProduct.title : title,
                image: matchedProduct ? matchedProduct.image : (item.image || item.productImage || '')
              };
            });
            
            // Split strictly based on database status
            const processedList = refundArray.filter(item => item.isProcessed || item.status?.includes('Credited') || item.status?.includes('Processed'));
            const upcomingList = refundArray.filter(item => !item.isProcessed && !item.status?.includes('Credited') && !item.status?.includes('Processed'));

            setRefundsData({
              processed: processedList,
              upcoming: upcomingList
            });
          } else {
            // Completely empty if no database record exists
            setRefundsData({
              processed: [],
              upcoming: []
            });
          }
          setLoading(false);
        });
      } else {
        setRefundsData({ processed: [], upcoming: [] });
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px', color: isDarkMode ? '#fff' : '#000' }}>Loading your refunds...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '20px', color: isDarkMode ? '#fff' : '#000' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>
        ← Back
      </button>

      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
        <FaUndoAlt color="#00a8e8" /> Your Refunds & Return Status
      </h2>

      {/* Upcoming / Pending Refunds */}
      <div style={{ marginBottom: '35px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b12704' }}>
          <FaClock /> Coming Soon / Expected Refunds ({refundsData.upcoming.length})
        </h3>

        {refundsData.upcoming.length === 0 ? (
          <div style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f9f9f9', padding: '20px', borderRadius: '8px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', color: isDarkMode ? '#aaa' : '#666', fontSize: '14px' }}>
            No pending or expected refunds found in your account.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {refundsData.upcoming.map((item) => (
              <div key={item.id || item.dbKey} style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#fef8f2', border: '1px solid #febd69', padding: '20px', borderRadius: '8px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                {item.image && (
                  <div style={{ width: '70px', height: '70px', backgroundColor: '#fff', borderRadius: '6px', padding: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #ddd', flexShrink: 0 }}>
                    <img src={item.image} alt={item.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaBox size={14} color="#b12704" /> {item.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: isDarkMode ? '#aaa' : '#666' }}>Refund ID: {item.id || item.dbKey}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#b12704' }}>₹{(item.amount || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <hr style={{ border: '0', borderTop: isDarkMode ? '1px solid #444' : '1px solid #f3d0a2', margin: '12px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: isDarkMode ? '#ffda6a' : '#856404', fontWeight: 'bold' }}>Status: {item.status || 'Processing return'}</span>
                    <span style={{ color: isDarkMode ? '#ccc' : '#555', fontWeight: '500' }}>Expected by: <strong>{item.expectedDate || 'As per policy'}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed Refunds */}
      <div>
        <h3 style={{ fontSize: '18px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#007600' }}>
          <FaCheckCircle /> Processed Refunds ({refundsData.processed.length})
        </h3>

        {refundsData.processed.length === 0 ? (
          <div style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f9f9f9', padding: '20px', borderRadius: '8px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', color: isDarkMode ? '#aaa' : '#666', fontSize: '14px' }}>
            No processed refunds found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {refundsData.processed.map((item) => (
              <div key={item.id || item.dbKey} style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f9f9f9', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', padding: '20px', borderRadius: '8px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                {item.image && (
                  <div style={{ width: '70px', height: '70px', backgroundColor: '#fff', borderRadius: '6px', padding: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #ddd', flexShrink: 0 }}>
                    <img src={item.image} alt={item.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaBox size={14} color="#007185" /> {item.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: isDarkMode ? '#aaa' : '#666' }}>Refund ID: {item.id || item.dbKey}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#007600' }}>₹{(item.amount || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <hr style={{ border: '0', borderTop: isDarkMode ? '1px solid #444' : '1px solid #eee', margin: '12px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: '#007600', fontWeight: 'bold' }}>✔ {item.status || 'Refund Credited'}</span>
                    <span style={{ color: isDarkMode ? '#aaa' : '#666' }}>Credited on: {item.date || 'Recently'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default Refunds;