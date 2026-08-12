import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeadset, FaPaperPlane, FaRobot, FaUser } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase'; // Firebase auth and database import
import { ref, onValue, push } from 'firebase/database'; // Firebase Realtime Database methods
import '../App.css';

function Support() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your BargainCart AI Assistant. How can I help you with your orders, refunds, or rentals today?' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const chatEndRef = useRef(null);

  // Real-time chat history synchronization from Firebase
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        const chatRef = ref(db, `users/${currentUser.uid}/supportChat`);
        onValue(chatRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const chatArray = Object.keys(data).map(key => data[key]);
            setMessages([
              { sender: 'ai', text: 'Hello! I am your BargainCart AI Assistant. How can I help you with your orders, refunds, or rentals today?' },
              ...chatArray
            ]);
          } else {
            setMessages([
              { sender: 'ai', text: 'Hello! I am your BargainCart AI Assistant. How can I help you with your orders, refunds, or rentals today?' }
            ]);
          }
        });
      } else {
        setMessages([
          { sender: 'ai', text: 'Hello! I am your BargainCart AI Assistant. How can I help you with your orders, refunds, or rentals today?' }
        ]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message and persist to Firebase Realtime Database
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    setInputMsg('');

    const currentUser = auth.currentUser;
    
    // User message object
    const userMsgObj = { sender: 'user', text: userText };

    try {
      if (currentUser) {
        // Push user message to Firebase
        await push(ref(db, `users/${currentUser.uid}/supportChat`), userMsgObj);
      } else {
        setMessages(prev => [...prev, userMsgObj]);
      }

      // Automated AI assistant response logic
      setTimeout(async () => {
        let aiReply = "I understand your query. For order tracking, refunds, or security deposit status, please check your 'Your Orders' or 'Your Refunds' section in the menu!";
        
        const lower = userText.toLowerCase();
        if (lower.includes('refund') || lower.includes('return')) {
          aiReply = "Refunds are processed back to your original payment method within 3-5 working days after product inspection.";
        } else if (lower.includes('rent') || lower.includes('deposit')) {
          aiReply = "Rental security deposits are 100% refundable and are credited back instantly upon safe return of the equipment.";
        } else if (lower.includes('hello') || lower.includes('hi')) {
          aiReply = "Hi there! Welcome to BargainCart support. What can I assist you with?";
        } else if (lower.includes('order') || lower.includes('shipping')) {
          aiReply = "Your order is currently being processed and will be delivered by our express delivery partners within 2-3 days.";
        }

        const aiMsgObj = { sender: 'ai', text: aiReply };

        if (currentUser) {
          // Push AI response to Firebase
          await push(ref(db, `users/${currentUser.uid}/supportChat`), aiMsgObj);
        } else {
          setMessages(prev => [...prev, aiMsgObj]);
        }
      }, 600);

    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', padding: '20px', color: isDarkMode ? '#fff' : '#000' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#007185', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>
        ← Back
      </button>

      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <FaHeadset color="#00a8e8" /> Help & Support AI Chatbot
      </h2>

      {/* Chat Box Container */}
      <div style={{ 
        backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', 
        border: isDarkMode ? '1px solid #444' : '1px solid #ddd', 
        borderRadius: '8px', 
        height: '450px', 
        display: 'flex', 
        flexDirection: 'column', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        
        {/* Chat Messages Area */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ 
              display: 'flex', 
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: '8px'
            }}>
              {msg.sender === 'ai' && <FaRobot size={22} color="#00a8e8" />}
              <div style={{ 
                maxWidth: '70%', 
                padding: '10px 15px', 
                borderRadius: '12px', 
                backgroundColor: msg.sender === 'user' ? '#00a8e8' : (isDarkMode ? '#2c2c2c' : '#f1f1f1'), 
                color: msg.sender === 'user' ? '#fff' : (isDarkMode ? '#fff' : '#111'), 
                fontSize: '14px',
                lineHeight: '1.4'
              }}>
                {msg.text}
              </div>
              {msg.sender === 'user' && <FaUser size={20} color="#ffd814" />}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', borderTop: isDarkMode ? '1px solid #444' : '1px solid #ddd', padding: '12px', backgroundColor: isDarkMode ? '#252525' : '#fcfcfc' }}>
          <input 
            type="text" 
            placeholder="Type your question here (e.g. Where is my refund?)..." 
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: isDarkMode ? '1px solid #555' : '1px solid #ccc', backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : '#000', outline: 'none', fontSize: '14px' }}
          />
          <button type="submit" style={{ marginLeft: '10px', backgroundColor: '#ffd814', color: '#111', border: '1px solid #fcd200', padding: '0 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaPaperPlane /> Send
          </button>
        </form>

      </div>
    </div>
  );
}

export default Support;