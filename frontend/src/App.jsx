import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { 
  Send, 
  Trash2, 
  Menu, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  MessageCircle, 
  Award, 
  Zap, 
  Search, 
  FileText, 
  ShieldCheck, 
  Building, 
  Rocket, 
  Maximize, 
  Languages
} from 'lucide-react';

const BASE_URL = 'https://dealangler-chatbot-ai-assistant-hwf.vercel.app';

const API_URL = `${BASE_URL}/api/chat`;
const LEAD_API_URL = `${BASE_URL}/api/lead`;
const ANALYTICS_API_URL = `${BASE_URL}/api/analytics`;

function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leadData, setLeadData] = useState({});
  const [hasStarted, setHasStarted] = useState(false);
  const [langBadge, setLangBadge] = useState('🌐 Multilingual');
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (overrideText) => {
    const text = overrideText || inputText.trim();
    if (!text || isLoading) return;

    if (!hasStarted) setHasStarted(true);
    if (!overrideText) setInputText('');

    const newMessages = [...messages, { role: 'user', content: text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
    setMessages(newMessages);
    setIsLoading(true);

    trackEvent('message_sent', { length: text.length });

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages
            .filter(m => m.role === 'user' || m.role === 'bot')
            .map(m => ({ 
              role: m.role === 'bot' ? 'assistant' : m.role, 
              content: m.content 
            })),
          leadData: leadData
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const reply = data.reply || "I'm here to help! Please try again.";

      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: reply, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);

      detectLanguage(reply);
      checkLeadCapture(text, reply);

    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: "⚠️ I'm having trouble connecting right now. Please try again in a moment, or reach us at **info@dealangler.net** or **(123) 345-6789**.", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setHasStarted(false);
    setLeadData({});
    setInputText('');
  };

  const detectLanguage = (text) => {
    const arabicPattern = /[\u0600-\u06FF]/;
    const chinesePattern = /[\u4E00-\u9FFF]/;
    const japanesePattern = /[\u3040-\u30FF]/;
    const frenchPattern = /\b(bonjour|merci|je|vous|est|les|des|pour)\b/i;
    const spanishPattern = /\b(hola|gracias|es|los|del|para|como)\b/i;
    const germanPattern = /\b(hallo|danke|ich|sie|ist|die|der|das)\b/i;

    let lang = '🌐 Multilingual';
    if (arabicPattern.test(text)) lang = '🇸🇦 Arabic';
    else if (chinesePattern.test(text)) lang = '🇨🇳 Chinese';
    else if (japanesePattern.test(text)) lang = '🇯🇵 Japanese';
    else if (frenchPattern.test(text)) lang = '🇫🇷 French';
    else if (spanishPattern.test(text)) lang = '🇪🇸 Spanish';
    else if (germanPattern.test(text)) lang = '🇩🇪 German';

    setLangBadge(lang);
  };

  const checkLeadCapture = (userMsg, botReply) => {
    const adKeywords = /advertis|sponsor|business|package featured|package standard|local business|promote my business/i;
    const supportKeywords = /help|issue|problem|contact|support|error|not working/i;
    const alreadyCaptured = leadData.email;

    if (!alreadyCaptured && adKeywords.test(userMsg + botReply)) {
      setTimeout(() => appendLeadForm('advertiser'), 800);
    } else if (!alreadyCaptured && supportKeywords.test(userMsg) && messages.length > 3) {
      setTimeout(() => appendLeadForm('support'), 800);
    }
  };

  const appendLeadForm = (type) => {
    setMessages(prev => [...prev, { role: 'lead_form', type, id: Date.now() }]);
  };

  const submitLead = async (id, type, formData) => {
    const { name, email, city } = formData;
    if (!name || !email) {
      alert('Please enter your name and email.');
      return;
    }

    const newLead = { name, email, city, type, timestamp: new Date().toISOString() };
    setLeadData(newLead);

    try {
      await fetch(LEAD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
    } catch (e) { /* fail silently */ }

    // Update the message in history to show success
    setMessages(prev => prev.map(m => m.id === id ? { ...m, submitted: true, name, email } : m));
    
    handleSendMessage(`I just submitted my contact info: ${name} from ${city || 'unspecified'}. Can you continue helping me?`);
  };

  const trackEvent = async (event, data) => {
    try {
      await fetch(ANALYTICS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() })
      });
    } catch (e) { /* fail silently */ }
  };

  const formatMarkdown = (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/^### (.*$)/gm, '<strong>$1</strong>')
      .replace(/^## (.*$)/gm, '<strong>$1</strong>')
      .replace(/^# (.*$)/gm, '<strong>$1</strong>')
      .replace(/^- (.*$)/gm, '• $1')
      .replace(/^\d+\. (.*$)/gm, '&nbsp;&nbsp;$1')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="app">
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      ></div>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
          <X size={18} />
        </button>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">🎣</div>
            <div>
              <div className="brand-name">DealAngler</div>
              <div className="brand-tagline">Hyperlocal Marketplace</div>
            </div>
          </div>
          <div className="status-pill">
            <div className="status-dot"></div>
            AI Assistant Online
          </div>
        </div>

        <div className="info-card">
          <div className="info-card-title">🏆 Platform Stats</div>
          <div className="stat-row">
            <div className="stat-item">
              <div className="stat-value">120K+</div>
              <div className="stat-label">Listings</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">2.7M</div>
              <div className="stat-label">Daily Searches</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">20K+</div>
              <div className="stat-label">Users</div>
            </div>
          </div>
          <div className="divider"></div>
          <div className="contact-row"><Phone size={13} className="contact-icon" /> (123) 345-6789</div>
          <div className="contact-row"><Mail size={13} className="contact-icon" /> info@dealangler.net</div>
          <div className="contact-row"><MapPin size={13} className="contact-icon" /> 518-520 5th Ave, New York</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Quick Topics</div>
          {[
            { label: 'How It Works', icon: <FileText size={14} />, text: 'How do I post an ad on DealAngler?' },
            { label: 'Pricing & Upgrades', icon: <Zap size={14} />, text: 'What are the upgrade pricing plans?' },
            { label: 'Browse Categories', icon: <Search size={14} />, text: 'What categories can I list on DealAngler?' },
            { label: 'Safety & Trust', icon: <ShieldCheck size={14} />, text: 'How do I stay safe when buying or selling locally?' },
            { label: 'Business Advertising', icon: <Building size={14} />, text: 'How can my local business advertise on DealAngler?' },
            { label: 'Boost My Listing', icon: <Rocket size={14} />, text: 'How do I get more views on my listing?' },
            { label: 'Browse Cities', icon: <Maximize size={14} />, text: 'What US cities does DealAngler cover?' },
            { label: 'Messaging Sellers', icon: <MessageCircle size={14} />, text: 'How do I contact a seller on DealAngler?' },
          ].map((topic, i) => (
            <button key={i} className="topic-btn" onClick={() => handleSendMessage(topic.text)}>
              <span className="topic-icon">{topic.icon}</span>
              {topic.label}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-text">
            Powered by DealAngler AI · Multilingual<br />
            <a href="https://dealangler.net" target="_blank" rel="noreferrer">dealangler.net</a> · 50+ Quality Awards
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="chat-header">
          <div className="chat-header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
            <div className="chat-avatar">🎣</div>
            <div>
              <div className="chat-header-title">DealAngler AI Assistant</div>
              <div className="chat-header-sub">Powered by Advanced AI · Responds in your language · dealangler.net</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div className="header-chips">
              <button className="header-chip" onClick={() => handleSendMessage('How do I sell something?')}>🏷️ Sell</button>
              <button className="header-chip" onClick={() => handleSendMessage('How do I find local deals near me?')}>🔍 Buy</button>
              <button className="header-chip" onClick={() => handleSendMessage('What upgrade plans are available?')}>⚡ Upgrades</button>
              <button className="header-chip" onClick={() => handleSendMessage('I need safety tips for local meetups')}>🛡️ Safety</button>
              <button className="header-chip" onClick={() => handleSendMessage('Tell me about DealAngler')}>ℹ️ About</button>
            </div>
            <button className="clear-btn" onClick={clearChat}><Trash2 size={12} style={{marginRight: '4px'}} /> Clear</button>
          </div>
        </header>

        <div className="messages-area">
          {!hasStarted && (
            <div className="welcome-state">
              <div className="welcome-icon">🎣</div>
              <h2 className="welcome-title">Welcome to DealAngler</h2>
              <p className="welcome-sub">
                Your AI-powered local marketplace assistant. Ask me anything about buying, selling, promotions, safety, or advertising — in any language.
              </p>
              <div className="quick-actions">
                {[
                  { icon: '📝', label: 'Post an Ad', desc: 'Learn how to list in minutes', text: 'How do I post my first listing on DealAngler?' },
                  { icon: '🔍', label: 'Browse Deals', desc: 'Find listings in your city', text: 'How do I browse local listings near me?' },
                  { icon: '⚡', label: 'Promotions', desc: 'Get seen faster', text: 'What upgrade and promotion options are available and how do they work?' },
                  { icon: '📢', label: 'Advertise', desc: 'Grow your local business', text: 'How can my local business advertise on DealAngler?' },
                ].map((act, i) => (
                  <button key={i} className="quick-action-btn" onClick={() => handleSendMessage(act.text)}>
                    <div className="qa-icon">{act.icon}</div>
                    <div className="qa-label">{act.label}</div>
                    <div className="qa-desc">{act.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === 'lead_form') {
              return (
                <div key={i} className="msg-group">
                  <div className="msg-avatar bot">🎣</div>
                  <div className="msg-content" style={{ maxWidth: '420px', width: '100%' }}>
                    <div className="lead-inline">
                      {msg.submitted ? (
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                          <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '14px' }}>Thanks, {msg.name}!</div>
                          <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: '4px' }}>We'll follow up at {msg.email} shortly.</div>
                        </div>
                      ) : (
                        <LeadForm type={msg.type} id={msg.id} onSubmit={submitLead} />
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className={`msg-group ${msg.role === 'user' ? 'user' : ''}`}>
                <div className={`msg-avatar ${msg.role === 'bot' ? 'bot' : 'user'}`}>
                  {msg.role === 'bot' ? '🎣' : '👤'}
                </div>
                <div className="msg-content">
                  <div 
                    className={`msg-bubble ${msg.role === 'bot' ? 'bot' : 'user'}`}
                    dangerouslySetInnerHTML={{ __html: msg.role === 'bot' ? formatMarkdown(msg.content) : msg.content }}
                  ></div>
                  <div className="msg-time">{msg.time}</div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="typing-indicator">
              <div className="msg-avatar bot">🎣</div>
              <div className="typing-bubble">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about listings, pricing, safety, how to sell, advertise your business..."
              rows={1}
              style={{ height: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <button 
              className="send-btn" 
              onClick={() => handleSendMessage()} 
              disabled={isLoading || !inputText.trim()}
              title="Send message"
            >
              <Send size={16} className="send-icon" style={{color: 'var(--dark)'}} />
            </button>
          </div>
          <div className="input-footer">
            <span className="input-hint">Enter to send · Shift+Enter for new line · Ask in any language</span>
            <span className="lang-badge">{langBadge}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function LeadForm({ type, id, onSubmit }) {
  const [formData, setFormData] = useState({ name: '', email: '', city: '' });

  const title = type === 'advertiser'
    ? '📢 Want us to contact you about advertising?'
    : '📋 Need personalized support?';

  return (
    <>
      <div className="lead-inline-title">{title}</div>
      <div className="lead-inline-row">
        <input 
          className="lead-inline-input" 
          placeholder="Your name" 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          type="text"
        />
        <input 
          className="lead-inline-input" 
          placeholder="Email address" 
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          type="email"
        />
      </div>
      <div className="lead-inline-row">
        <input 
          className="lead-inline-input" 
          placeholder="Your city" 
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          type="text"
        />
        <button className="lead-inline-btn" onClick={() => onSubmit(id, type, formData)}>Submit →</button>
      </div>
    </>
  );
}

export default App;
