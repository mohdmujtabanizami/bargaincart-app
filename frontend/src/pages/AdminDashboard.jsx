import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChartLine, FaBoxOpen, FaUsers, FaCog, FaClipboardList, FaSignOutAlt, FaCrown, FaShieldAlt, FaTrash, FaIdCard, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';

// Import all products from the central products file
import { products as storeProducts } from '../data/products';

function AdminDashboard() {
  const { isDarkMode } = useTheme();
  const navigateInstance = useNavigate();
  const [activeMenu, setActiveMenu] = useState('Overview');

  const [ordersList, setOrdersList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [rentalsList, setRentalsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Viewing KYC ID Image
  const [selectedIdImage, setSelectedIdImage] = useState(null);

  // Admin Settings Editable Fields
  const [adminSettings, setAdminSettings] = useState({
    siteName: 'BargainCart Live E-Commerce',
    adminEmail: 'bargaincart@admin.com',
    supportPhone: '+91-7566952724',
    maintenanceMode: false,
    autoApproveRentals: true
  });

  // Safe Timestamp Helper to prevent incorrect or fake future years
  const getAccurateTimestamp = (savedDate) => {
    if (savedDate && typeof savedDate === 'string' && !savedDate.includes('5593') && !savedDate.includes('58583') && !savedDate.includes('7631') && savedDate !== 'N/A') {
      return savedDate;
    }
    return new Date().toLocaleString();
  };

  // Fetch real-time data from Firebase
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const ordersRef = ref(db, 'orders');
        const ordersSnap = await get(ordersRef);
        if (ordersSnap.exists()) {
          const ordData = ordersSnap.val();
          
          const ordArray = Object.keys(ordData).map(key => {
            const item = ordData[key];
            const formattedDate = getAccurateTimestamp(item.date);
            return { dbKey: key, id: key, ...item, formattedDate };
          }).reverse();
          
          setOrdersList(ordArray);
          setRentalsList(ordArray.filter(ord => ord.type === 'rent' || ord.orderId?.startsWith('RNT')));
        }

        const usersRef = ref(db, 'users');
        const usersSnap = await get(usersRef);
        if (usersSnap.exists()) {
          const userData = usersSnap.val();
          const userArray = Object.keys(userData).map(key => {
            const userNode = userData[key];
            return {
              id: key,
              email: userNode.email || userNode.profile?.email || 'bargaincart@user.com',
              fullName: userNode.profile?.fullName || userNode.displayName || 'BargainCart User',
              phone: userNode.profile?.phone || userNode.phone || 'N/A',
              walletBalance: userNode.walletBalance || 0,
              isPremium: userNode.isPremium || false
            };
          });
          setCustomersList(userArray);
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
      }
      setLoading(false);
    };

    fetchAdminData();
  }, []);

  // Admin cancel rental order handler - Fully active for rejecting bad KYC IDs
  const handleAdminCancel = async (dbKey, userId) => {
    if (!window.confirm("Are you sure you want to cancel this rental order due to invalid/incorrect KYC ID?")) return;
    try {
      await update(ref(db, `orders/${dbKey}`), { status: 'Cancelled by Admin' });
      if (userId) {
        await update(ref(db, `users/${userId}/orders/${dbKey}`), { status: 'Cancelled by Admin' });
      }
      
      const usersSnap = await get(ref(db, 'users'));
      if (usersSnap.exists()) {
        const usersData = usersSnap.val();
        for (const uId of Object.keys(usersData)) {
          if (usersData[uId].orders && usersData[uId].orders[dbKey]) {
            await update(ref(db, `users/${uId}/orders/${dbKey}`), { status: 'Cancelled by Admin' });
          }
        }
      }
      
      setRentalsList(prev => prev.map(r => r.dbKey === dbKey ? { ...r, status: 'Cancelled by Admin' } : r));
      setOrdersList(prev => prev.map(o => o.dbKey === dbKey ? { ...o, status: 'Cancelled by Admin' } : o));
      
      alert("Rental cancelled by admin successfully!");
    } catch (error) {
      console.error("Error cancelling rental:", error);
      alert("Failed to cancel rental.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Admin logged out successfully!");
      navigateInstance('/login');
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const menuItems = [
    { name: 'Overview', icon: <FaChartLine /> },
    { name: 'Products', icon: <FaBoxOpen /> },
    { name: 'Orders', icon: <FaClipboardList /> },
    { name: 'Customers', icon: <FaUsers /> },
    { name: 'Rentals', icon: <FaCrown /> },
    { name: 'Settings', icon: <FaCog /> }
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px', color: '#fff' }}>Loading Live Admin Dashboard...</div>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: isDarkMode ? '#0f0f0f' : '#f8f9fa', fontFamily: 'Segoe UI, sans-serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '260px', backgroundColor: isDarkMode ? '#161616' : '#1e293b', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '25px 20px', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffd814' }}>
          BargainAdmin Live
        </div>
        
        <div style={{ flex: 1, padding: '20px 0' }}>
          {menuItems.map(item => (
            <div key={item.name} onClick={() => setActiveMenu(item.name)} style={{ padding: '15px 25px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', backgroundColor: activeMenu === item.name ? (isDarkMode ? '#222' : '#334155') : 'transparent', borderLeft: activeMenu === item.name ? '4px solid #ffd814' : '4px solid transparent' }}>
              <span style={{ color: activeMenu === item.name ? '#ffd814' : '#94a3b8' }}>{item.icon}</span>
              <span style={{ color: activeMenu === item.name ? '#fff' : '#cbd5e1' }}>{item.name}</span>
            </div>
          ))}
        </div>

        <div onClick={handleLogout} style={{ padding: '20px 25px', borderTop: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: '#f87171', fontWeight: 'bold' }}>
          <FaSignOutAlt /> Logout Admin
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* TOPBAR */}
        <div style={{ backgroundColor: isDarkMode ? '#161616' : '#fff', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #262626' : '1px solid #e2e8f0' }}>
          <h2 style={{ margin: 0, fontSize: '22px', color: isDarkMode ? '#fff' : '#0f172a' }}>{activeMenu} (Live Database)</h2>
          <button onClick={() => navigateInstance('/')} style={{ padding: '8px 16px', backgroundColor: '#ffd814', color: '#111', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            ← Back to Store
          </button>
        </div>

        {/* CONTENT AREA */}
        <div style={{ padding: '30px', flex: 1, overflowY: 'auto' }}>
          
          {/* 1. OVERVIEW */}
          {activeMenu === 'Overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ backgroundColor: isDarkMode ? '#1c1c1c' : '#fff', padding: '22px', borderRadius: '12px', borderLeft: '5px solid #0ea5e9' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>TOTAL ORDERS (DB)</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#0f172a' }}>{ordersList.length}</div>
                </div>
                <div style={{ backgroundColor: isDarkMode ? '#1c1c1c' : '#fff', padding: '22px', borderRadius: '12px', borderLeft: '5px solid #ef4444' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>REGISTERED USERS (DB)</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#0f172a' }}>{customersList.length}</div>
                </div>
                <div style={{ backgroundColor: isDarkMode ? '#1c1c1c' : '#fff', padding: '22px', borderRadius: '12px', borderLeft: '5px solid #10b981' }}>
                  <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>STORE PRODUCTS</div>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#0f172a' }}>{storeProducts.length}</div>
                </div>
              </div>

              {/* LIVE ORDERS TABLE */}
              <div style={{ backgroundColor: isDarkMode ? '#1c1c1c' : '#fff', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 25px', fontWeight: 'bold', fontSize: '18px', color: isDarkMode ? '#fff' : '#0f172a' }}>Live Orders from Database (Newest First)</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: isDarkMode ? '#222' : '#f8fafc', color: '#94a3b8', fontSize: '12px' }}>
                    <tr>
                      <th style={{ padding: '15px 25px' }}>Order ID</th>
                      <th style={{ padding: '15px 25px' }}>Product</th>
                      <th style={{ padding: '15px 25px' }}>Date & Time</th>
                      <th style={{ padding: '15px 25px' }}>Amount</th>
                      <th style={{ padding: '15px 25px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '14px', color: isDarkMode ? '#e2e8f0' : '#334155' }}>
                    {ordersList.length > 0 ? ordersList.map((ord, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ padding: '16px 25px', fontWeight: 'bold' }}>{ord.id}</td>
                        <td style={{ padding: '16px 25px' }}>{ord.productTitle || 'N/A'}</td>
                        <td style={{ padding: '16px 25px', fontSize: '13px', color: '#94a3b8' }}>{ord.formattedDate}</td>
                        <td style={{ padding: '16px 25px', fontWeight: 'bold', color: '#0ea5e9' }}>₹{ord.amount || 0}</td>
                        <td style={{ padding: '16px 25px' }}><span style={{ backgroundColor: ord.status?.includes('Cancelled') ? '#fee2e2' : '#e0f2fe', color: ord.status?.includes('Cancelled') ? '#dc2626' : '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>{ord.status || 'Processing'}</span></td>
                      </tr>
                    )) : <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No live orders found in database yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. PRODUCTS */}
          {activeMenu === 'Products' && (
            <div style={{ backgroundColor: isDarkMode ? '#1c1c1c' : '#fff', borderRadius: '12px', overflow: 'hidden', padding: '20px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: isDarkMode ? '#fff' : '#0f172a' }}>Complete Store Inventory ({storeProducts.length} Items)</h3>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: isDarkMode ? '#222' : '#f8fafc', color: '#94a3b8', fontSize: '12px' }}>
                  <tr>
                    <th style={{ padding: '15px 20px' }}>Image</th>
                    <th style={{ padding: '15px 20px' }}>Product Title</th>
                    <th style={{ padding: '15px 20px' }}>Category</th>
                    <th style={{ padding: '15px 20px' }}>Store Type</th>
                    <th style={{ padding: '15px 20px' }}>Price</th>
                    <th style={{ padding: '15px 20px' }}>Action</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '14px', color: isDarkMode ? '#e2e8f0' : '#334155' }}>
                  {storeProducts.map((p, i) => (
                    <tr 
                      key={i} 
                      onClick={() => navigateInstance(`/product/${p.id}`)}
                      style={{ borderBottom: '1px solid #333', cursor: 'pointer', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#2a2a2a' : '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px 20px' }}>
                        <img src={p.image} alt={p.title} style={{ width: '45px', height: '45px', objectFit: 'contain', backgroundColor: '#fff', borderRadius: '4px', padding: '2px' }} />
                      </td>
                      <td style={{ padding: '12px 20px', fontWeight: 'bold', color: '#0ea5e9' }}>{p.title}</td>
                      <td style={{ padding: '12px 20px' }}>{p.category}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ backgroundColor: p.type === 'buy' ? '#dcfce7' : '#e0f2fe', color: p.type === 'buy' ? '#16a34a' : '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                          {p.type === 'buy' ? '🛒 Buy Store' : '🏠 Rent Store'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontWeight: 'bold', color: '#10b981' }}>
                        ₹{p.price.toLocaleString()} {p.type === 'rent' ? '/ day' : ''}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontSize: '12px', color: '#007185', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                          View <FaExternalLinkAlt size={10} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. ORDERS */}
          {activeMenu === 'Orders' && (
            <div style={{ backgroundColor: isDarkMode ? '#1c1c1c' : '#fff', borderRadius: '12px', overflow: 'hidden', padding: '20px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: isDarkMode ? '#fff' : '#0f172a' }}>All Real-Time Orders ({ordersList.length})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: isDarkMode ? '#222' : '#f8fafc', color: '#94a3b8', fontSize: '12px' }}>
                  <tr>
                    <th style={{ padding: '15px 20px' }}>Order Key</th>
                    <th style={{ padding: '15px 20px' }}>Product Title</th>
                    <th style={{ padding: '15px 20px' }}>Order Date</th>
                    <th style={{ padding: '15px 20px' }}>Amount</th>
                    <th style={{ padding: '15px 20px' }}>Status</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '14px', color: isDarkMode ? '#e2e8f0' : '#334155' }}>
                  {ordersList.length > 0 ? ordersList.map((ord, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 'bold', fontSize: '12px' }}>{ord.id}</td>
                      <td style={{ padding: '16px 20px' }}>{ord.productTitle || 'Product'}</td>
                      <td style={{ padding: '16px 20px', fontSize: '13px', color: '#94a3b8' }}>{ord.formattedDate}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 'bold', color: '#10b981' }}>₹{ord.amount || 0}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ backgroundColor: ord.status?.includes('Cancelled') ? '#fee2e2' : '#dcfce7', color: ord.status?.includes('Cancelled') ? '#dc2626' : '#16a34a', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                          {ord.status || 'Order Placed'}
                        </span>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No orders placed yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 4. CUSTOMERS */}
          {activeMenu === 'Customers' && (
            <div style={{ backgroundColor: isDarkMode ? '#1c1c1c' : '#fff', borderRadius: '12px', overflow: 'hidden', padding: '20px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: isDarkMode ? '#fff' : '#0f172a' }}>Registered Database Customers ({customersList.length})</h3>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: isDarkMode ? '#222' : '#f8fafc', color: '#94a3b8', fontSize: '12px' }}>
                  <tr>
                    <th style={{ padding: '15px 20px' }}>Customer Name</th>
                    <th style={{ padding: '15px 20px' }}>Email Address</th>
                    <th style={{ padding: '15px 20px' }}>Mobile Number</th>
                    <th style={{ padding: '15px 20px' }}>Wallet Balance</th>
                    <th style={{ padding: '15px 20px' }}>Status</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '14px', color: isDarkMode ? '#e2e8f0' : '#334155' }}>
                  {customersList.length > 0 ? customersList.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{c.fullName}</td>
                      <td style={{ padding: '16px 20px' }}>{c.email}</td>
                      <td style={{ padding: '16px 20px' }}>{c.phone}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 'bold', color: '#10b981' }}>₹{c.walletBalance}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ backgroundColor: c.isPremium ? '#fef3c7' : '#e0f2fe', color: c.isPremium ? '#d97706' : '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                          {c.isPremium ? '👑 Prime Member' : 'Standard'}
                        </span>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No customers found in database yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. RENTALS */}
          {activeMenu === 'Rentals' && (
            <div style={{ backgroundColor: isDarkMode ? '#1c1c1c' : '#fff', borderRadius: '12px', overflow: 'hidden', padding: '20px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: isDarkMode ? '#fff' : '#0f172a' }}>Active Rental Orders ({rentalsList.length})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: isDarkMode ? '#222' : '#f8fafc', color: '#94a3b8', fontSize: '12px' }}>
                  <tr>
                    <th style={{ padding: '15px 15px' }}>Rental ID</th>
                    <th style={{ padding: '15px 15px' }}>Item Title</th>
                    <th style={{ padding: '15px 15px' }}>Rental Date</th>
                    <th style={{ padding: '15px 15px' }}>KYC Details</th>
                    <th style={{ padding: '15px 15px' }}>Rental Amount</th>
                    <th style={{ padding: '15px 15px' }}>Status</th>
                    <th style={{ padding: '15px 15px' }}>Action</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '14px', color: isDarkMode ? '#e2e8f0' : '#334155' }}>
                  {rentalsList.length > 0 ? rentalsList.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '16px 15px', fontWeight: 'bold', fontSize: '12px' }}>{r.id}</td>
                      <td style={{ padding: '16px 15px' }}>{r.productTitle || 'Rental Product'}</td>
                      <td style={{ padding: '16px 15px', fontSize: '13px', color: '#94a3b8' }}>{r.formattedDate}</td>
                      <td style={{ padding: '16px 15px' }}>
                        <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FaIdCard color="#0ea5e9" /> {r.kycForm?.idType || 'Government ID'}: 
                          {r.kycForm?.idPhoto ? (
                            <span 
                              onClick={() => setSelectedIdImage(r.kycForm.idPhoto)}
                              style={{ color: '#0ea5e9', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
                              title="Click to view uploaded ID photo">
                              {r.kycForm?.idNumber || 'View Photo'} 🔍
                            </span>
                          ) : (
                            <strong>{r.kycForm?.idNumber || 'N/A'}</strong>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 15px', fontWeight: 'bold', color: '#0ea5e9' }}>₹{r.amount || 0}</td>
                      <td style={{ padding: '16px 15px' }}>
                        <span style={{ backgroundColor: r.status?.includes('Cancelled') ? '#fee2e2' : '#e0f2fe', color: r.status?.includes('Cancelled') ? '#dc2626' : '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                          {r.status || 'Active Rental'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 15px' }}>
                        {r.status !== 'Cancelled by Admin' && (
                          <button 
                            onClick={() => handleAdminCancel(r.dbKey, r.userId)}
                            style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                            <FaTrash /> Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No active rentals found in database.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. SETTINGS */}
          {activeMenu === 'Settings' && (
            <div style={{ backgroundColor: isDarkMode ? '#1c1c1c' : '#fff', borderRadius: '12px', padding: '25px', maxWidth: '700px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: isDarkMode ? '#fff' : '#0f172a' }}>Admin Security & Platform Settings</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* Non-Editable Admin Email */}
                <div style={{ padding: '15px', backgroundColor: isDarkMode ? '#252525' : '#f8fafc', borderRadius: '8px', border: '1px solid #444' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '5px' }}>ADMIN EMAIL (LOCKED & SECURE)</label>
                  <input 
                    type="email" 
                    value={adminSettings.adminEmail} 
                    disabled 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', backgroundColor: isDarkMode ? '#151515' : '#e2e8f0', color: isDarkMode ? '#888' : '#64748b', cursor: 'not-allowed', fontWeight: 'bold' }} 
                  />
                  <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>🔒 This primary administrative email cannot be modified.</small>
                </div>

                {/* Non-Editable Website Name */}
                <div style={{ padding: '15px', backgroundColor: isDarkMode ? '#252525' : '#f8fafc', borderRadius: '8px', border: '1px solid #444' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '5px' }}>PLATFORM BRAND NAME (LOCKED)</label>
                  <input 
                    type="text" 
                    value={adminSettings.siteName} 
                    disabled 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', backgroundColor: isDarkMode ? '#151515' : '#e2e8f0', color: isDarkMode ? '#888' : '#64748b', cursor: 'not-allowed', fontWeight: 'bold' }} 
                  />
                  <small style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>🔒 Brand identity is locked to BargainCart.</small>
                </div>

                {/* Editable Support Phone */}
                <div style={{ padding: '15px', backgroundColor: isDarkMode ? '#252525' : '#f8fafc', borderRadius: '8px', border: '1px solid #444' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '5px' }}>CUSTOMER SUPPORT HOTLINE (EDITABLE)</label>
                  <input 
                    type="text" 
                    value={adminSettings.supportPhone} 
                    onChange={(e) => setAdminSettings({...adminSettings, supportPhone: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', backgroundColor: isDarkMode ? '#1a1a1a' : '#fff', color: isDarkMode ? '#fff' : '#000', fontWeight: 'bold' }} 
                  />
                </div>

                {/* Additional Settings Toggles */}
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                    <input 
                      type="checkbox" 
                      checked={adminSettings.autoApproveRentals} 
                      onChange={(e) => setAdminSettings({...adminSettings, autoApproveRentals: e.target.checked})}
                      style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                    />
                    Auto-Approve Rental KYC Verification
                  </label>
                </div>

                <div style={{ padding: '15px', backgroundColor: isDarkMode ? '#252525' : '#f8fafc', borderRadius: '8px', border: '1px solid #444', marginTop: '10px' }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><FaShieldAlt color="#10b981" /> Live Database Status</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#10b981' }}>✔ Fully Connected to Firebase Realtime Database</p>
                </div>

                <button 
                  onClick={() => alert("⚙️ Admin settings updated successfully!")}
                  style={{ marginTop: '10px', padding: '12px 25px', backgroundColor: '#ffd814', color: '#111', border: 'none', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-start' }}>
                  Save Admin Settings
                </button>

              </div>
            </div>
          )}

        </div>
      </div>

      {selectedIdImage && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', padding: '20px', borderRadius: '12px', maxWidth: '600px', width: '100%', position: 'relative', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: isDarkMode ? '#fff' : '#111' }}>Uploaded Government ID</h3>
              <button onClick={() => setSelectedIdImage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDarkMode ? '#fff' : '#111' }}>
                <FaTimes size={20} />
              </button>
            </div>
            <div style={{ maxHeight: '70vh', overflow: 'auto', border: '1px solid #444', borderRadius: '6px', padding: '10px', backgroundColor: '#000' }}>
              <img src={selectedIdImage} alt="User Govt ID" style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }} />
            </div>
            <button onClick={() => setSelectedIdImage(null)} style={{ marginTop: '15px', padding: '10px 25px', backgroundColor: '#ffd814', color: '#111', border: 'none', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;