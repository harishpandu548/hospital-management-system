'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiSend, FiLoader, FiMic, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('patient_token') : null;

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Web Speech API
  const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => prev + (prev ? ' ' : '') + transcript);
    };
  }

  const toggleListen = () => {
    if (!recognition) return alert("Your browser does not support voice input.");
    if (isListening) recognition.stop();
    else recognition.start();
  };

  const speakText = (text: string) => {
    if (isMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // basic filtering to remove markdown symbols for speech
    utterance.text = text.replace(/[*#]/g, ''); 
    window.speechSynthesis.speak(utterance);
  };
  
  // Load chat history on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        setMessages([{ id: '1', role: 'model', text: 'Hi there! I am your AI Medical Assistant. I can help you book an appointment with our doctors. How can I help you today?' }]);
      }
    } else {
      setMessages([{ id: '1', role: 'model', text: 'Hi there! I am your AI Medical Assistant. I can help you book an appointment with our doctors. How can I help you today?' }]);
    }
  }, []);

  // Save chat history on update
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  const clearChat = () => {
    const initial = [{ id: '1', role: 'model', text: 'Hi there! I am your AI Medical Assistant. I can help you book an appointment with our doctors. How can I help you today?' }];
    setMessages(initial);
    localStorage.setItem('ai_chat_history', JSON.stringify(initial));
  };
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const newMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue.trim() };
    const currentMessages = [...messages, newMsg];
    
    setMessages(currentMessages);
    setInputValue('');
    setLoading(true);

    try {
      const token = getToken();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ messages: currentMessages })
      });
      const data = await res.json();
      
      if (res.ok) {
        const responseText = data.response || "Sorry, I couldn't understand that.";
        setMessages([...currentMessages, { 
          id: (Date.now() + 1).toString(), 
          role: 'model', 
          text: responseText 
        }]);
        speakText(responseText);

        if (data.isBookingSuccess) {
          socket.emit('ai-booking-success', {
            message: `New AI Appointment Booked: Dr. ${data.bookedDetails?.doctorName} on ${data.bookedDetails?.date}`
          });
          socket.emit('appointment-update'); // Refresh standard lists too
        }

      } else {
        const errorText = data.error || data.response || "An error occurred.";
        setMessages([...currentMessages, { 
          id: (Date.now() + 1).toString(), 
          role: 'model', 
          text: errorText 
        }]);
        speakText(errorText);
      }
    } catch (err) {
      setMessages([...currentMessages, { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: "Network error. Please try again later." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: 30,
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 99999
        }}
      >
        {isOpen ? <FiX size={26} /> : <FiMessageSquare size={26} />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              bottom: 96,
              right: 24,
              width: 360,
              height: 520,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(16px)',
              borderRadius: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 99999,
              border: '1px solid rgba(255,255,255,0.4)'
            }}
          >
            {/* Header */}
            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiMessageSquare size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>AI Assistant</h3>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>Gemini Powered</p>
              </div>
              <button
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setIsMuted(!isMuted);
                }}
                title={isMuted ? "Unmute AI Voice" : "Mute AI Voice"}
                style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                {isMuted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
              </button>
              <button
                onClick={clearChat}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
              >
                Clear Chat
              </button>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, background: '#f8fafc' }}>
              {messages.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      maxWidth: '85%',
                      padding: '12px 16px',
                      borderRadius: 16,
                      borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                      borderBottomLeftRadius: m.role === 'model' ? 4 : 16,
                      background: m.role === 'user' ? 'linear-gradient(135deg, #a855f7, #6366f1)' : '#fff',
                      color: m.role === 'user' ? '#fff' : '#1e293b',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      fontSize: 14,
                      lineHeight: 1.5
                    }}
                  >
                    {m.text}
                  </motion.div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 16, borderBottomLeftRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      style={{ display: 'flex', gap: 4 }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: '#a855f7' }} />
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: '#a855f7', animationDelay: '0.2s' }} />
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: '#a855f7', animationDelay: '0.4s' }} />
                    </motion.div>
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '16px', background: '#fff', borderTop: '1px solid #e2e8f0' }}>
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={toggleListen}
                  title="Speak"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    border: 'none',
                    background: isListening ? '#ef4444' : '#f8fafc',
                    color: isListening ? '#fff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none'
                  }}
                >
                  <FiMic size={18} />
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 24,
                    border: '1px solid #e2e8f0',
                    outline: 'none',
                    fontSize: 14,
                    background: '#f8fafc',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || loading}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    border: 'none',
                    background: inputValue.trim() && !loading ? 'linear-gradient(135deg, #a855f7, #6366f1)' : '#e2e8f0',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: inputValue.trim() && !loading ? 'pointer' : 'default',
                    transition: 'all 0.2s'
                  }}
                >
                  {loading ? <FiLoader className="spin" /> : <FiSend />}
                </button>
              </form>
            </div>
            <style>{`
              .spin { animation: spin 1s linear infinite; }
              @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
