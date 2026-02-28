import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, User, Sparkles } from 'lucide-react';
import { BotMessageSquareIcon } from './BotMessageSquareIcon';
import { supabase } from '../../data/supabase';
import { useAuth } from '../../context/AuthContext';
import './AIChatAssistant.css';

const AIChatAssistant = () => {
    const { profile, identity, hasRole } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // Role-based agent selection
    const getAgentType = () => {
        if (hasRole(['Super Admin'])) return 'admin';
        if (hasRole(['Finance'])) return 'finance';
        if (hasRole(['Project Manager'])) return 'pm';
        if (hasRole(['Site Supervisor'])) return 'supervisor';
        if (hasRole(['Client'])) return 'client';
        if (hasRole(['Worker'])) return 'worker';
        return 'admin'; // default
    };

    const getWelcomeMessage = () => {
        const agentType = getAgentType();
        const messages = {
            admin: "Hello! I'm your Admin AI - Full system awareness. Ask me anything about projects, workers, finances, or get company-wide insights.",
            finance: "Hello! I'm your Finance AI. Ask me about cash flow, expenses, income, or financial recommendations.",
            pm: "Hello! I'm your Project Manager AI. Ask me about your projects, resources, or team performance.",
            supervisor: "Hello! I'm your Supervisor AI. Ask me about site attendance, daily reports, or worker allocation.",
            client: "Hello! I'm your Project Assistant. Ask me about your project progress and milestones.",
            worker: "Hello! I'm your Personal Assistant. Ask me about your attendance, shifts, or leave balance."
        };
        return messages[agentType] || messages.admin;
    };

    const getSystemPrompt = (agentType) => {
        const prompts = {
            admin: `You are the Admin AI for SSD Construction - Company leadership assistant.
- You have full system awareness
- Analyze company-wide data and detect patterns
- Provide strategic insights and recommendations
- NEVER show raw data - always summarize
- Focus on actionable insights
- Current date: ${new Date().toLocaleDateString()}`,

            finance: `You are the Finance AI for SSD Construction - Financial advisor.
- Focus on cash flow, expenses, income analysis
- Detect financial anomalies
- Provide financial recommendations
- NEVER show raw payment data - summarize only
- Focus on financial health
- Current date: ${new Date().toLocaleDateString()}`,

            pm: `You are the Project Manager AI for SSD Construction - Project oversight assistant.
- Focus on project progress, resources, timelines
- Detect project risks and delays
- Provide project recommendations
- NEVER show unrelated project data
- Focus on assigned projects only
- Current date: ${new Date().toLocaleDateString()}`,

            supervisor: `You are the Supervisor AI for SSD Construction - Site management assistant.
- Focus on daily operations, attendance, worker allocation
- Detect attendance issues and delays
- Provide site management recommendations
- NEVER show data from other sites
- Focus on assigned site only
- Current date: ${new Date().toLocaleDateString()}`,

            client: `You are the Client AI for SSD Construction - Professional project liaison.
- Provide clean, professional project updates
- Focus on progress and milestones
- NEVER show internal details or financial data
- Be concise and professional
- Current date: ${new Date().toLocaleDateString()}`,

            worker: `You are the Worker AI for SSD Construction - Personal assistant.
- Help with attendance queries and shift information
- Provide leave balance and attendance rate
- NEVER show other workers' data
- Be friendly and helpful
- Current date: ${new Date().toLocaleDateString()}`
        };
        return prompts[agentType] || prompts.admin;
    };

    const [messages, setMessages] = useState([
        { role: 'ai', content: getWelcomeMessage() }
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

    // Only show for Admin and Finance for now - we'll expand this later
    if (!hasRole(['Super Admin', 'Finance'])) return null;

    // Enhanced context fetching using new snapshot tables
    const fetchContext = async () => {
        try {
            const agentType = getAgentType();
            const today = new Date().toISOString().split('T')[0];

            // Build context based on agent type
            let contextData = {
                agentType,
                date: today
            };

            // Fetch system-wide snapshots (Admin & Finance)
            if (['admin', 'finance'].includes(agentType)) {
                const { data: systemSnap } = await supabase
                    .from('system_snapshot_daily')
                    .select('*')
                    .order('snapshot_date', { ascending: false })
                    .limit(1)
                    .single();

                contextData.system = systemSnap;
            }

            // Fetch project snapshots (PM, Supervisor)
            if (['pm', 'supervisor'].includes(agentType) && identity?.id) {
                const { data: assignments } = await supabase
                    .from('projectWorkers')
                    .select('projectId')
                    .eq('workerId', identity.id);

                const projectIds = assignments?.map(a => a.projectId) || [];

                if (projectIds.length > 0) {
                    const { data: projectSnaps } = await supabase
                        .from('project_snapshot_daily')
                        .select('*')
                        .in('project_id', projectIds)
                        .eq('snapshot_date', today);

                    contextData.projects = projectSnaps;
                }
            }

            // [NEW] Fetch detailed project personnel list for Admins/PMs
            if (['admin', 'pm'].includes(agentType)) {
                try {
                    const { data: ongoingProjects } = await supabase
                        .from('projects')
                        .select('id, name, status, location')
                        .eq('status', 'Ongoing');

                    if (ongoingProjects?.length > 0) {
                        const { data: personnel } = await supabase
                            .from('projectWorkers')
                            .select('projectId, role, worker:workerId(fullName)')
                            .in('projectId', ongoingProjects.map(p => p.id))
                            .in('role', ['Site Supervisor', 'Supervisor', 'Project Manager']);

                        contextData.projectDirectory = ongoingProjects.map(p => ({
                            ...p,
                            personnel: personnel?.filter(pw => pw.projectId === p.id) || []
                        }));
                    }
                } catch (e) {
                    console.warn('Project directory fetch failed:', e);
                }
            }

            // Fetch finance snapshot (Finance)
            if (agentType === 'finance') {
                const { data: financeSnap } = await supabase
                    .from('finance_snapshot_daily')
                    .select('*')
                    .order('snapshot_date', { ascending: false })
                    .limit(1)
                    .single();

                contextData.finance = financeSnap;
            }

            // Fetch worker snapshot (Worker)
            if (agentType === 'worker' && identity?.id) {
                const { data: workerSnap } = await supabase
                    .from('worker_snapshot_daily')
                    .select('*')
                    .eq('worker_id', identity.id)
                    .eq('snapshot_date', today)
                    .single();

                contextData.worker = workerSnap;
            }

            // Fetch recent alerts (Admin, Finance)
            if (['admin', 'finance'].includes(agentType)) {
                const { data: alerts } = await supabase
                    .from('ai_alerts')
                    .select('severity, category, title, message, created_at')
                    .eq('resolved', false)
                    .order('created_at', { ascending: false })
                    .limit(5);

                contextData.alerts = alerts;
            }

            return formatContextForAI(contextData);
        } catch (e) {
            console.error('Error fetching context:', e);
            return `Current date: ${new Date().toLocaleDateString()}`;
        }
    };

    const formatContextForAI = (data) => {
        let context = `📊 SSD Construction - ${data.agentType?.toUpperCase() || 'SYSTEM'} AI Context\n`;
        context += `📅 Date: ${data.date}\n\n`;

        if (data.system) {
            context += `🏢 COMPANY STATUS:\n`;
            context += `- Active Projects: ${data.system.active_projects || 0}\n`;
            context += `- Total Workers: ${data.system.total_workers || 0}\n`;
            context += `- Present Today: ${data.system.present_today || 0}\n`;
            context += `- Absent Today: ${data.system.absent_today || 0}\n`;
            context += `- Cash Balance: LKR ${(data.system.cash_balance || 0).toLocaleString()}\n`;
            context += `- Active Alerts: ${data.system.active_alerts || 0}\n`;
            context += `- Pending Worker Requests: ${data.system.pending_worker_requests || 0}\n`;
            context += `- Pending Material Requests: ${data.system.pending_material_requests || 0}\n\n`;
        }

        if (data.projects && data.projects.length > 0) {
            context += `📋 YOUR ASSIGNED PROJECTS (Stats Only):\n`;
            data.projects.forEach(p => {
                context += `- ${p.project_name}: ${p.assigned_workers} workers, ${p.attendance_rate}% attendance\n`;
            });
            context += `\n`;
        }

        if (data.projectDirectory && data.projectDirectory.length > 0) {
            context += `🏗️ PROJECT DIRECTORY (Personnel & Status):\n`;
            data.projectDirectory.forEach(p => {
                const personnelNames = p.personnel.map(pw => `${pw.worker?.fullName} (${pw.role})`).join(', ') || 'No key personnel assigned';
                context += `- [${p.name}] Location: ${p.location || 'N/A'}, Personnel: ${personnelNames}\n`;
            });
            context += `\n`;
        }

        if (data.finance) {
            context += `💰 FINANCIAL SUMMARY:\n`;
            context += `- Total Income: LKR ${(data.finance.total_income || 0).toLocaleString()}\n`;
            context += `- Total Expenses: LKR ${(data.finance.total_expenses || 0).toLocaleString()}\n`;
            context += `- Net Flow: LKR ${(data.finance.net_flow || 0).toLocaleString()}\n`;
            context += `- Pending Payments: LKR ${(data.finance.pending_payments_value || 0).toLocaleString()}\n\n`;
        }

        if (data.worker) {
            context += `👷 YOUR STATUS:\n`;
            context += `- Attendance Rate: ${data.worker.attendance_rate || 0}%\n`;
            context += `- Present Today: ${data.worker.is_present_today ? 'Yes' : 'No'}\n\n`;
        }

        if (data.alerts && data.alerts.length > 0) {
            context += `⚠️ ACTIVE ALERTS:\n`;
            data.alerts.forEach(a => {
                context += `- [${a.severity?.toUpperCase()}] ${a.title}: ${a.message}\n`;
            });
        }

        return context;
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
            const systemPrompt = getSystemPrompt(getAgentType());
            const groqKey = import.meta.env.VITE_GROQ_API_KEY;

            if (!groqKey) {
                throw new Error('API Key missing');
            }

            const payload = {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `${systemPrompt}\n\nUse the following context data to answer questions accurately:\n\n${context}\n\nRules:\n- Always summarize data, never show raw rows\n- Be concise and actionable\n- If you need more details, ask the user what specifically they want to know\n- Provide recommendations when relevant`
                    },
                    ...newMessages.map(m => ({
                        role: m.role === 'ai' ? 'assistant' : m.role,
                        content: m.content
                    }))
                ],
                temperature: 0.5,
                max_tokens: 800
            };

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
                throw new Error(errData.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            const reply = data.choices[0].message.content;

            setMessages(prev => [...prev, { role: 'ai', content: reply }]);
        } catch (err) {
            console.error('AI Chat Error:', err);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `⚠️ Error: ${err.message}. Please check your API key in .env.local`
            }]);
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
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                                    <BotMessageSquareIcon size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3>SSD AI Assistant</h3>
                                    <p className="text-xs text-emerald-600 font-medium">
                                        {getAgentType().toUpperCase()} Mode Active
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
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
                                placeholder="Ask about your projects, finances, attendance..."
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
