import { useState, useEffect } from 'react';
import { FaWallet, FaGift } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../firebase';
import { ref, get, set, update } from 'firebase/database';

function GiftCards() {
  const { isDarkMode } = useTheme();
  const [balance, setBalance] = useState(0);
  const [addAmount, setAddAmount] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch wallet balance from Firebase on component mount
  useEffect(() => {
    const fetchWalletBalance = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userRef = ref(db, `users/${currentUser.uid}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            setBalance(snapshot.val().walletBalance || 0);
          } else {
            await set(userRef, { walletBalance: 0, email: currentUser.email });
            setBalance(0);
          }
        } catch (error) {
          console.error("Error fetching balance:", error);
        }
      }
      setLoading(false);
    };

    fetchWalletBalance();
  }, []);

  // Handle adding balance to the user's wallet
  const handleAddBalance = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(addAmount);
    if (!amountNum || amountNum <= 0) {
      alert("Please enter a valid amount!");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Please login first to add balance!");
      return;
    }

    try {
      const newBalance = balance + amountNum;
      const userRef = ref(db, `users/${currentUser.uid}`);
      
      await update(userRef, { walletBalance: newBalance });
      
      setBalance(newBalance);
      setAddAmount('');
      alert(`🎉 Successfully added ₹${amountNum.toLocaleString()} to your BargainCart Wallet!`);
    } catch (error) {
      console.error("Error updating balance:", error);
      alert("Failed to update wallet balance.");
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px', color: isDarkMode ? '#fff' : '#000' }}>Loading wallet...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px', color: isDarkMode ? '#fff' : '#111' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FaWallet color="#9b51e0" /> BargainCart Wallet & Gift Cards
      </h2>

      {/* Balance Card */}
      <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', padding: '30px', borderRadius: '12px', border: isDarkMode ? '1px solid #333' : '1px solid #ddd', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: isDarkMode ? '#aaa' : '#666' }}>Available Wallet Balance</p>
          <h1 style={{ margin: 0, fontSize: '36px', color: '#00a8e8' }}>₹{balance.toLocaleString()}</h1>
        </div>
        <div style={{ backgroundColor: isDarkMode ? '#2c2c2c' : '#f8f9fa', padding: '15px 20px', borderRadius: '8px', border: isDarkMode ? '1px solid #444' : '1px solid #eee' }}>
          <FaGift size={32} color="#9b51e0" />
        </div>
      </div>

      {/* Add Balance Form */}
      <div style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', padding: '30px', borderRadius: '12px', border: isDarkMode ? '1px solid #333' : '1px solid #ddd' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Add Money to Wallet</h3>
        <form onSubmit={handleAddBalance} style={{ display: 'flex', gap: '15px' }}>
          <input 
            type="number" 
            placeholder="Enter amount (e.g. 1000)" 
            value={addAmount} 
            onChange={(e) => setAddAmount(e.target.value)} 
            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#2c2c2c' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none', fontSize: '15px' }} 
            required 
          />
          <button type="submit" style={{ padding: '0 30px', backgroundColor: '#ffd814', color: '#111', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
            Add Balance
          </button>
        </form>
      </div>
    </div>
  );
}

export default GiftCards;