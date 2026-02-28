import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, User, Sparkles } from 'lucide-react';
import { BotMessageSquareIcon } from './BotMessageSquareIcon';
import { supabase } from '../../data/supabase';
import { useAuth } from '../../context/AuthContext';
import './AIChatAssistant.css';

const AIChatAssistant = () => {
    const { hasRole } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // Only show for Admin and Finance for now
    if (!hasRole(['Super Admin', 'Finance'])) return null;

    const [messages, setMessages] = useState([
        { role: 'ai', content: "Hello! I'm your SSD Construction Assistant. How can I help you today with project details, attendance, or material requisitions?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchContext = async () => {
        try {
            const [projects, workers, payments] = await Promise.all([
                supabase.from('projects').select('name, status, location').eq('status', 'Ongoing'),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'Worker'),
                supabase.from('payments').select('amount, direction')
            ]);

            const totalIn = (payments.data || [])
                .filter(p => p.direction === 'In')
                .reduce((sum, p) => sum + (p.amount || 0), 0);
            const totalOut = (payments.data || [])
                .filter(p => p.direction === 'Out')
                .reduce((sum, p) => sum + (p.amount || 0), 0);

            return `
Current System State:
- Ongoing Projects: ${(projects.data || []).map(p => p.name).join(', ') || 'None'}
- Total Workers: ${workers.data?.[0]?.count || workers.count || 0}
- Financials: Total Revenue LKR ${totalIn.toLocaleString()}, Total Expenses LKR ${totalOut.toLocaleString()}, Net Flow LKR ${(totalIn - totalOut).toLocaleString()}
- Today's Date: ${new Date().toLocaleDateString()}
`;
        } catch (e) {
            console.error('Error fetching context:', e);
            return '';
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const context = await fetchContext();
            const groqKey = import.meta.env.VITE_GROQ_API_KEY;

            if (!groqKey) {
                console.error('Groq API Key is missing');
                throw new Error('API Key missing in .env.local');
            }

            const payload = {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are an AI assistant for SSD Construction Management System. ${context}
                        You help users with project management, attendance tracking, and material requests. 
                        Only answer questions related to the system and construction project management. 
                        If asked about unrelated topics, politely decline.
                        Use the provided context to answer accurately about financials and projects.`
                    },
                    ...newMessages.map(m => ({
                        role: m.role === 'ai' ? 'assistant' : m.role,
                        content: m.content
                    }))
                ],
                temperature: 0.7,
                max_tokens: 1000
            };

            console.log('Sending to Groq:', payload);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error('Groq error detail:', errData);
                throw new Error(`Groq API error: ${response.status} - ${errData.error?.message || 'Unknown'}`);
            }

            const data = await response.json();
            const reply = data.choices[0].message.content;

            setMessages(prev => [...prev, { role: 'ai', content: reply }]);
        } catch (err) {
            console.error('AI Chat Error:', err);
            setMessages(prev => [...prev, { role: 'ai', content: `🔧 Connection Error: ${err.message}. Please RESTART your terminal (npm run dev) and ensure your .env.local has the key. NEVER commit keys to git!` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ai-chat-assistant">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="ai-chat-window"
                    >
                        <div className="ai-chat-header">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <BotMessageSquareIcon size={24} />
                            </div>
                            <div className="flex-1">
                                <h3>SSD System AI</h3>
                                <p>Online | System Expert</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="ai-chat-messages">
                            {messages.map((msg, i) => (
                                <div key={i} className={`message ${msg.role}`}>
                                    {msg.content}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="message ai">
                                    <div className="typing-indicator">
                                        <div className="typing-dot" />
                                        <div className="typing-dot" />
                                        <div className="typing-dot" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="ai-chat-input">
                            <input
                                type="text"
                                placeholder="Ask about the system..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <button onClick={handleSend} disabled={!input.trim() || isLoading}>
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                className={`ai-chat-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={28} /> : <BotMessageSquareIcon size={28} />}
            </button>
        </div>
    );
};

export default AIChatAssistant;
