import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaPlus, FaTrash, FaTimes, FaEdit } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase';
import { ref, onValue, push, remove, update } from 'firebase/database';
import '../App.css';

function Addresses() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [addresses, setAddresses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddressKey, setEditingAddressKey] = useState(null); 
  const [newAddress, setNewAddress] = useState({
    name: '', phone: '', address: '', city: '', state: '', pincode: '', isDefault: false
  });

  // Real-time address synchronization from Firebase
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        const addrRef = ref(db, `users/${currentUser.uid}/addresses`);
        onValue(addrRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const addrArray = Object.keys(data).map(key => ({ dbKey: key, ...data[key] }));
            setAddresses(addrArray);
          } else {
            setAddresses([]);
          }
        });
      } else {
        setAddresses([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Add or edit address in Firebase with single default address management
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Please login first to save an address!");
      navigate('/login');
      return;
    }

    if (!newAddress.name || !newAddress.phone || !newAddress.address || !newAddress.pincode) {
      alert("Please fill all required fields!");
      return;
    }

    try {
      const userAddrRef = ref(db, `users/${currentUser.uid}/addresses`);

      // If a new address is set as default, remove default status from all other addresses
      if (newAddress.isDefault) {
        const updates = {};
        addresses.forEach(addr => {
          if (addr.dbKey !== editingAddressKey) {
            updates[`${addr.dbKey}/isDefault`] = false;
          }
        });
        if (Object.keys(updates).length > 0) {
          await update(userAddrRef, updates);
        }
      }

      if (editingAddressKey) {
        // Update existing address
        await update(ref(db, `users/${currentUser.uid}/addresses/${editingAddressKey}`), {
          name: newAddress.name,
          phone: newAddress.phone,
          address: newAddress.address,
          city: newAddress.city,
          state: newAddress.state,
          pincode: newAddress.pincode,
          isDefault: newAddress.isDefault
        });
        alert("Address updated successfully!");
      } else {
        // Add new address (Automatically set as default if it's the first address)
        const shouldBeDefault = addresses.length === 0 ? true : newAddress.isDefault;
        const item = {
          id: Date.now(),
          name: newAddress.name,
          phone: newAddress.phone,
          address: newAddress.address,
          city: newAddress.city,
          state: newAddress.state,
          pincode: newAddress.pincode,
          isDefault: shouldBeDefault
        };
        await push(userAddrRef, item);
        alert("New address added successfully!");
      }

      setNewAddress({ name: '', phone: '', address: '', city: '', state: '', pincode: '', isDefault: false });
      setEditingAddressKey(null);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error saving address:", error);
      alert("Failed to save address.");
    }
  };

  // Open edit modal and populate fields
  const handleOpenEdit = (addr) => {
    setEditingAddressKey(addr.dbKey);
    setNewAddress({
      name: addr.name || '',
      phone: addr.phone || '',
      address: addr.address || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      isDefault: addr.isDefault || false
    });
    setShowAddModal(true);
  };

  // Delete address from Firebase
  const handleDelete = async (dbKey) => {
    const currentUser = auth.currentUser;
    if (currentUser && dbKey) {
      try {
        await remove(ref(db, `users/${currentUser.uid}/addresses/${dbKey}`));
        alert("Address removed successfully!");
      } catch (error) {
        console.error("Error deleting address:", error);
      }
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '20px', color: isDarkMode ? '#fff' : '#000' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>
        ← Back
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaMapMarkerAlt color="#00a8e8" /> Your Saved Addresses ({addresses.length})
        </h2>
        <button 
          onClick={() => {
            if (!auth.currentUser) {
              alert("Please login first to add an address!");
              navigate('/login');
            } else {
              setEditingAddressKey(null);
              setNewAddress({ name: '', phone: '', address: '', city: '', state: '', pincode: '', isDefault: addresses.length === 0 });
              setShowAddModal(true);
            }
          }}
          style={{ backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FaPlus /> Add New Address
        </button>
      </div>

      {/* Address List */}
      {addresses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: isDarkMode ? '#aaa' : '#666' }}>
          <p>No saved addresses found for this account. Add a new address to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
          {addresses.map((addr) => (
            <div key={addr.dbKey || addr.id} style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f9f9f9', padding: '20px', borderRadius: '8px', border: isDarkMode ? '1px solid #444' : '1px solid #ddd', position: 'relative' }}>
              {addr.isDefault && (
                <span style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: '#e3f2fd', color: '#0d47a1', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                  Default
                </span>
              )}
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>{addr.name}</h4>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: isDarkMode ? '#ccc' : '#555' }}>{addr.address}, {addr.city}, {addr.state} - <strong>{addr.pincode}</strong></p>
              <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: isDarkMode ? '#aaa' : '#666' }}>Phone: {addr.phone}</p>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => handleOpenEdit(addr)} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                  <FaEdit /> Edit
                </button>
                <button onClick={() => handleDelete(addr.dbKey)} style={{ background: 'none', border: 'none', color: '#cc0c39', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                  <FaTrash /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: isDarkMode ? '#222' : '#fff', color: isDarkMode ? '#fff' : '#000', width: '450px', padding: '25px', borderRadius: '8px', position: 'relative' }}>
            <FaTimes size={18} style={{ position: 'absolute', top: '15px', right: '15px', cursor: 'pointer' }} onClick={() => setShowAddModal(false)} />
            <h3 style={{ margin: '0 0 15px 0' }}>{editingAddressKey ? 'Edit Delivery Address' : 'Add New Delivery Address'}</h3>

            <form onSubmit={handleSaveAddress}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Full Name:</label>
              <input type="text" placeholder="Enter Full Name" value={newAddress.name} onChange={(e) => setNewAddress({...newAddress, name: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000' }} required />

              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Mobile Number:</label>
              <input type="tel" placeholder="10-Digit Mobile Number" value={newAddress.phone} onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000' }} required />

              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Street Address / Area:</label>
              <input type="text" placeholder="House No., Street, Landmark" value={newAddress.address} onChange={(e) => setNewAddress({...newAddress, address: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000' }} required />

              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input type="text" placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress({...newAddress, city: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000' }} required />
                <input type="text" placeholder="State" value={newAddress.state} onChange={(e) => setNewAddress({...newAddress, state: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000' }} required />
              </div>

              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Pincode:</label>
              <input type="text" placeholder="6-digit Pincode" value={newAddress.pincode} onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000' }} required />

              {/* Make Default Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <input 
                  type="checkbox" 
                  id="defaultAddrCheck"
                  checked={newAddress.isDefault} 
                  onChange={(e) => setNewAddress({...newAddress, isDefault: e.target.checked})} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="defaultAddrCheck" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                  Make this my default address
                </label>
              </div>

              <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#ffd814', color: '#111', border: 'none', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
                {editingAddressKey ? 'Update Address' : 'Save Address'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Addresses;