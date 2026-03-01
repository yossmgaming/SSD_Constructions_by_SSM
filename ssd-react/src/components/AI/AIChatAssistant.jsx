import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Sparkles, AlertTriangle, Activity, ArrowLeft } from 'lucide-react';
import { BotMessageSquareIcon } from './BotMessageSquareIcon';
import { supabase } from '../../data/supabase';
import { useAuth } from '../../context/AuthContext';
import { intentClassifier } from '../../ai-core/IntentClassifier';
import { preFlightDataEngine } from '../../ai-core/PreFlightDataEngine';
import { riskEngine } from '../../ai-core/RiskEngine';
import './AIChatAssistant.css';

const AIChatAssistant = () => {
    const { identity, hasRole } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showOverview, setShowOverview] = useState(true);
    const [commandOverview, setCommandOverview] = useState(null);
    const [criticalAlert, setCriticalAlert] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [simulationMode, setSimulationMode] = useState(false);

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
            admin: "Hello! I'm your Admin AI for SSD Construction. I can help with projects, workers, and company data available in the system. Ask me anything!",
            finance: "Hello! I'm your Finance AI. Ask me about cash flow, expenses, or financial data.",
            pm: "Hello! I'm your Project Manager AI. Ask me about your projects, resources, or team performance.",
            supervisor: "Hello! I'm your Supervisor AI. Ask me about site attendance, daily reports, or worker allocation.",
            client: "Hello! I'm your Project Assistant. Ask me about your project progress and milestones.",
            worker: "Hello! I'm your Personal Assistant. Ask me about your attendance, shifts, or leave balance."
        };
        return messages[agentType] || messages.admin;
    };

    const getSystemPrompt = (agentType) => {
        const prompts = {
            admin: `You are the Admin AI for SSD Construction.
You have access to ALL company data provided below. Use it to answer questions.
- If data shows workers, projects, materials, suppliers - use them
- Calculate profit as: total_income - total_expenses
- For worker rates (dailyRate, hourlyRate), use the values from workers list
- Current date: ${new Date().toLocaleDateString()}`,

            finance: `You are the Finance AI for SSD Construction.
Use the financial data provided below to answer questions.
- Calculate profit = total_income - total_expenses
- Current date: ${new Date().toLocaleDateString()}`,

            pm: `You are the Project Manager AI for SSD Construction.
Use the project data provided below to answer questions.
- Current date: ${new Date().toLocaleDateString()}`,

            supervisor: `You are the Supervisor AI for SSD Construction.
Use the attendance and worker data provided below to answer questions.
- Current date: ${new Date().toLocaleDateString()}`,

            client: `You are the Client AI for SSD Construction - Professional project liaison.
IMPORTANT: When user speaks Sinhala or Singlish, reply in natural Sinhala ONLY using අක්ෂර මාලාව. When user speaks English, reply in English.
- Provide clean, professional project updates
- Current date: ${new Date().toLocaleDateString()}`,

            worker: `You are the Worker AI for SSD Construction - Personal assistant.
IMPORTANT: When user speaks Sinhala or Singlish, reply in natural Sinhala ONLY using අක්ෂර මාලාව. When user speaks English, reply in English.
- Help with attendance queries and shift information
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

    useEffect(() => {
        if (isOpen) {
            loadCommandOverview();
            checkCriticalAlerts();
        }
    }, [isOpen]);

    const loadCommandOverview = async () => {
        try {
            // Fetch directly from tables
            const [systemSnap, projectsData, workersData, recentLogs] = await Promise.all([
                supabase.from('system_snapshot_daily').select('*').order('snapshot_date', { ascending: false }).limit(1).single(),
                supabase.from('projects').select('*').order('createdAt', { ascending: false }).limit(10),
                supabase.from('workers').select('id').order('createdAt', { ascending: false }),
                supabase.from('ai_interaction_logs').select('*').order('created_at', { ascending: false }).limit(5)
            ]);

            const system = systemSnap.data;
            const projects = projectsData.data || [];
            const workers = workersData.data || [];
            const logs = recentLogs.data || [];

            // Calculate stats
            const activeProjects = system?.active_projects || projects.filter(p => p.status === 'Ongoing').length;
            const criticalAlerts = system?.critical_alerts || 0;
            
            // Get risks from projects (simple calculation)
            const projectRisks = projects.map(p => {
                const progress = p.progress || 0;
                const deadline = p.deadline ? new Date(p.deadline) : null;
                const isOverdue = deadline && deadline < new Date();
                const budgetUsed = p.totalSpent && p.estimatedCost ? (p.totalSpent / p.estimatedCost) : 0;
                
                let level = 'low';
                let score = 0.1;
                if (isOverdue || budgetUsed > 1) {
                    level = 'critical';
                    score = 0.9;
                } else if (budgetUsed > 0.8 || progress < 50) {
                    level = 'high';
                    score = 0.6;
                } else if (budgetUsed > 0.6) {
                    level = 'medium';
                    score = 0.4;
                }
                
                return {
                    projectId: p.id,
                    projectName: p.name,
                    level,
                    totalScore: score,
                    factors: []
                };
            }).sort((a, b) => b.totalScore - a.totalScore);

            const overview = {
                overview: {
                    activeRisks: projectRisks.filter(r => r.level !== 'low').length,
                    criticalAlerts: criticalAlerts,
                    aiInteractionsToday: logs.length,
                    avgConfidence: 0.75
                },
                topRisks: projectRisks.slice(0, 5),
                recentActivity: logs
            };

            setCommandOverview(overview);
        } catch (e) {
            console.error('Failed to load overview:', e);
            // Set fallback
            setCommandOverview({
                overview: { activeRisks: 0, criticalAlerts: 0, aiInteractionsToday: 0, avgConfidence: 0.5 },
                topRisks: [],
                recentActivity: []
            });
        }
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    const handleRiskClick = (risk) => {
        setInput(`What's the status of ${risk.projectName}?`);
        setShowOverview(false);
    };

    const handleSimSuggestion = (suggestion) => {
        setInput(suggestion);
        setShowOverview(false);
    };

    const checkCriticalAlerts = async () => {
        try {
            const risks = await riskEngine.getProjectRisks();
            const critical = risks.find(r => r.level === 'critical');
            if (critical) {
                setCriticalAlert({
                    projectName: critical.projectName,
                    level: critical.level,
                    score: critical.totalScore
                });
            } else {
                setCriticalAlert(null);
            }
        } catch (e) {
            console.error('Failed to check alerts:', e);
        }
    };

    // Show for all authenticated roles with role-scoped AI
    if (!hasRole(['Super Admin', 'Finance', 'Project Manager', 'Site Supervisor', 'Client', 'Worker'])) return null;

    // Keep fetchContext for potential future use
    const _fetchContext = async () => {
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

    // ===== SIMPLE CONTEXT BUILDER - Let LLM Decide =====
    const buildStructuredContext = (liveData, userQuery) => {
        const formatCurrency = (num) => {
            if (!num) return '0';
            return parseFloat(num).toLocaleString();
        };

        let context = `📊 SSD CONSTRUCTION - LIVE DATA\n`;
        context += `Current Date: ${new Date().toLocaleDateString()}\n\n`;

        // Workers with rates
        context += `👷 WORKERS (${liveData.workers?.length || 0} total):\n`;
        if (liveData.workers && liveData.workers.length > 0) {
            context += liveData.workers.map(w => 
                `- ${w.fullName} | Role: ${w.role || 'N/A'} | Daily: LKR ${formatCurrency(w.dailyRate)} | Hourly: LKR ${formatCurrency(w.hourlyRate)} | OT Rate: LKR ${formatCurrency(w.otRate)}`
            ).join('\n');
        } else {
            context += `No workers recorded.\n`;
        }

        // Attendance summary
        context += `\n\n📅 ATTENDANCE (Last 7 Days):\n`;
        const attSummary = liveData.attendanceByDate || {};
        if (attSummary.latestDate) {
            context += `Latest: ${attSummary.latestDate} - Present: ${attSummary.present}, Absent: ${attSummary.absent}\n`;
            Object.entries(attSummary.byDate || {}).forEach(([date, data]) => {
                context += `- ${date}: Present ${data.present}, Absent ${data.absent}\n`;
            });
        } else {
            context += `No attendance records.\n`;
        }

        // Projects
        context += `\n\n🏗️ PROJECTS (${liveData.projects?.length || 0}):\n`;
        if (liveData.projects && liveData.projects.length > 0) {
            context += liveData.projects.map(p => 
                `- ${p.name} | Status: ${p.status} | Progress: ${p.progress || 0}%`
            ).join('\n');
        } else {
            context += `No projects recorded.\n`;
        }

        // Materials/Inventory
        context += `\n\n📦 MATERIALS/INVENTORY:\n`;
        if (liveData.materials && liveData.materials.length > 0) {
            context += liveData.materials.map(m => 
                `- ${m.name} | Qty: ${m.quantity} ${m.unit || ''} | Cost: LKR ${formatCurrency(m.cost)}`
            ).join('\n');
        } else {
            context += `No materials in inventory.\n`;
        }

        // Suppliers
        context += `\n\n🏪 SUPPLIERS (${liveData.suppliers?.length || 0}):\n`;
        if (liveData.suppliers && liveData.suppliers.length > 0) {
            context += liveData.suppliers.map(s => 
                `- ${s.name || s.supplier_name || s.company_name || 'N/A'} | Email: ${s.email || 'N/A'} | Phone: ${s.phone || 'N/A'}`
            ).join('\n');
        } else {
            context += `No suppliers recorded.\n`;
        }

        // Clients
        context += `\n\n🤝 CLIENTS (${liveData.clients?.length || 0}):\n`;
        if (liveData.clients && liveData.clients.length > 0) {
            context += liveData.clients.map(c => 
                `- ${c.fullName || c.client_name || c.company_name || 'N/A'} | Email: ${c.email || 'N/A'} | Phone: ${c.phone || 'N/A'}`
            ).join('\n');
        } else {
            context += `No clients recorded.\n`;
        }

        // Finance - ALWAYS include computed values
        const fin = liveData.finance || {};
        context += `\n\n💰 FINANCE:\n`;
        context += `- Cash Balance: LKR ${formatCurrency(fin.cash_balance)}\n`;
        context += `- Total Income: LKR ${formatCurrency(fin.total_income)}\n`;
        context += `- Total Expenses: LKR ${formatCurrency(fin.total_expenses)}\n`;
        context += `- Net Flow: LKR ${formatCurrency(fin.net_flow)}\n`;
        context += `- Profit: LKR ${formatCurrency(fin.profit)}\n`;
        context += `- Pending Payments: LKR ${formatCurrency(fin.pending_payments)}\n`;

        // Leave Requests
        context += `\n\n📅 LEAVE REQUESTS (${liveData.leaveRequests?.length || 0}):\n`;
        if (liveData.leaveRequests && liveData.leaveRequests.length > 0) {
            context += liveData.leaveRequests.slice(0, 5).map(l => 
                `- ${l.worker_name} | ${l.leave_type} | ${l.status} | ${l.start_date} to ${l.end_date}`
            ).join('\n');
        }

        // Holidays
        context += `\n\n🎉 HOLIDAYS (${liveData.holidays?.length || 0}):\n`;
        if (liveData.holidays && liveData.holidays.length > 0) {
            context += liveData.holidays.slice(0, 10).map(h => 
                `- ${h.name || h.holiday_name} | ${h.date || h.holiday_date}`
            ).join('\n');
        }

        context += `\n\n📋 DATA SUMMARY:\n`;
        context += JSON.stringify(liveData.metadata?.stats || {}, null, 2);

        context += `\n\nIMPORTANT INSTRUCTIONS:
1. Use the data ABOVE to answer the user's question.
2. If data shows "0" or "No X recorded", THEN say "not yet recorded".
3. Do NOT say "not available" if data exists in the JSON above.
4. Do NOT make up numbers - use ONLY what's in the data.
5. Calculate profit as: total_income - total_expenses
6. For worker rates, use the values from the workers list (dailyRate, hourlyRate, otRate).
`;

        return context;
    };

    // ===== CEO-LEVEL ENHANCED CONTEXT BUILDER =====
    const buildEnhancedContext = (liveData, userQuery) => {
        const formatCurrency = (num) => {
            if (!num) return '0';
            return parseFloat(num).toLocaleString();
        };

        let context = `🏢 SSD CONSTRUCTION - CEO-LEVEL ANALYSIS\n`;
        context += `Current Date: ${new Date().toLocaleDateString()}\n`;
        context += `Analysis Generated: ${liveData.generated_at ? new Date(liveData.generated_at).toLocaleString() : 'Just now'}\n\n`;

        // Key Metrics Dashboard
        const km = liveData.key_metrics || {};
        context += `📊 KEY METRICS DASHBOARD:\n`;
        
        if (km.workers) {
            context += `👷 WORKFORCE: ${km.workers.total} total | Present: ${km.workers.present} | Absent: ${km.workers.absent} | Attendance: ${km.workers.attendanceRate}%\n`;
        }
        
        if (km.projects) {
            context += `🏗️ PROJECTS: ${km.projects.total} total | On Track: ${km.projects.onTrack} | Delayed: ${km.projects.delayed} | Critical: ${km.projects.critical}\n`;
        }
        
        if (km.finance) {
            context += `💰 FINANCE: Cash LKR ${formatCurrency(km.finance.cashBalance)} | Income LKR ${formatCurrency(km.finance.income)} | Expenses LKR ${formatCurrency(km.finance.expenses)} | Profit LKR ${formatCurrency(km.finance.profit)} | Margin ${km.finance.profitMargin}%\n`;
        }

        // AI Insights
        if (liveData.insights && liveData.insights.length > 0) {
            context += `\n💡 AI INSIGHTS:\n`;
            liveData.insights.forEach((insight, i) => {
                context += `${i + 1}. ${insight}\n`;
            });
        }

        // Predictions
        if (liveData.predictions && liveData.predictions.length > 0) {
            context += `\n🔮 AI PREDICTIONS:\n`;
            liveData.predictions.forEach((pred, i) => {
                context += `${i + 1}. [${pred.severity?.toUpperCase()}] ${pred.message}\n`;
            });
        }

        // Action Items
        if (liveData.action_items && liveData.action_items.length > 0) {
            context += `\n✅ PRIORITY ACTION ITEMS:\n`;
            liveData.action_items.slice(0, 5).forEach((item, i) => {
                context += `${i + 1}. [${item.priority?.toUpperCase()}] ${item.task}\n`;
            });
        }

        // Critical Alerts
        if (liveData.alerts && liveData.alerts.length > 0) {
            context += `\n🚨 CRITICAL ALERTS:\n`;
            liveData.alerts.forEach((alert, i) => {
                context += `${i + 1}. [${alert.severity?.toUpperCase()}] ${alert.title}: ${alert.message}\n`;
            });
        }

        // Trends
        if (liveData.trends) {
            context += `\n📈 TRENDS:\n`;
            if (liveData.trends.attendance) context += `- Attendance: ${liveData.trends.attendance}\n`;
            if (liveData.trends.finance) context += `- Finance: ${liveData.trends.finance}\n`;
            if (liveData.trends.projects) context += `- Projects: ${liveData.trends.projects}\n`;
        }

        // Detailed Data
        context += `\n\n📋 DETAILED DATA:\n`;

        // Workers
        context += `👷 WORKERS (${liveData.workers?.length || 0} total):\n`;
        if (liveData.workers && liveData.workers.length > 0) {
            context += liveData.workers.map(w => 
                `- ${w.fullName} | Role: ${w.role || 'N/A'} | Daily: LKR ${formatCurrency(w.dailyRate)}`
            ).join('\n');
        } else {
            context += `No workers recorded.\n`;
        }

        // Attendance summary
        context += `\n\n📅 ATTENDANCE (Last 7 Days):\n`;
        const attSummary = liveData.attendanceByDate || {};
        if (attSummary.latestDate) {
            context += `Latest: ${attSummary.latestDate} - Present: ${attSummary.present}, Absent: ${attSummary.absent}\n`;
            Object.entries(attSummary.byDate || {}).forEach(([date, data]) => {
                context += `- ${date}: Present ${data.present}, Absent ${data.absent}\n`;
            });
        } else {
            context += `No attendance records.\n`;
        }

        // Projects
        context += `\n🏗️ PROJECTS (${liveData.projects?.length || 0}):\n`;
        if (liveData.projects && liveData.projects.length > 0) {
            context += liveData.projects.map(p => 
                `- ${p.name} | Status: ${p.status} | Progress: ${p.progress || 0}%`
            ).join('\n');
        } else {
            context += `No projects recorded.\n`;
        }

        // Finance - ALWAYS include computed values
        const fin = liveData.finance || {};
        context += `\n💰 FINANCE:\n`;
        context += `- Cash Balance: LKR ${formatCurrency(fin.cash_balance)}\n`;
        context += `- Total Income: LKR ${formatCurrency(fin.total_income)}\n`;
        context += `- Total Expenses: LKR ${formatCurrency(fin.total_expenses)}\n`;
        context += `- Profit: LKR ${formatCurrency(fin.profit)}\n`;
        context += `- Pending Payments: LKR ${formatCurrency(fin.pending_payments)}\n`;

        // Leave Requests
        context += `\n📅 LEAVE REQUESTS (${liveData.leaveRequests?.length || 0}):\n`;
        if (liveData.leaveRequests && liveData.leaveRequests.length > 0) {
            context += liveData.leaveRequests.slice(0, 5).map(l => 
                `- ${l.worker_name} | ${l.leave_type} | ${l.status}`
            ).join('\n');
        }

        context += `\n\n🎯 CEO INSTRUCTIONS:
1. You are the CEO of this construction company - think strategically
2. Use the AI INSIGHTS, PREDICTIONS, and ACTION ITEMS above to provide executive-level answers
3. If user asks about company health, lead with KEY METRICS
4. If user asks about problems/issues, reference ALERTS and ACTION ITEMS
5. Calculate profit = total_income - total_expenses
6. Use worker rates from the workers list (dailyRate, hourlyRate, otRate)
7. Never make up numbers - only use what's in the data

`;

        return context;
    };

    // ===== GUARDRAIL: Simple check (data is always fetched now) =====
    const validateDataRequest = (userQuery, liveData) => {
        // Since we fetch all data now, just return null to let LLM handle it
        return null;
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userInput = input.trim();
        
        // Step 1: Classify intent BEFORE routing
        const intentResult = await intentClassifier.classify(userInput);
        const { intent } = intentResult;
        console.log('[AI Chat] Intent:', intent);

        // Add user message
        const userMessage = { role: 'user', content: userInput };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            // ===== ROUTING LOGIC =====
            
            // Route: Greeting / Casual Chat -> Conversational AI
            if (intentClassifier.isConversational(intent)) {
                const openrouterKey = import.meta.env.VITE_OPENROUTER_FREE_API_KEY;
                if (!openrouterKey) throw new Error('API Key missing');

                const conversationalResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openrouterKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://ssdconstructions.com',
                        'X-Title': 'SSD Constructions'
                    },
                    body: JSON.stringify({
                        model: 'google/gemini-2.0-flash-001',
                        messages: [
                            {
                                role: 'system',
                                content: `You are a friendly, helpful AI assistant for SSD Construction.
IMPORTANT: When user speaks Sinhala or Singlish (words like "kohomada", "mata", "oya", "hba", "ne", "puluwnda", "hodge", "innwda", "nadda"), you MUST reply in natural conversational Sinhala ONLY. Use අක්ෂර මාලාව (Sinhala script). NEVER add English translations in (). NEVER write English after Sinhala. Just reply in pure Sinhala.
When user speaks English, reply in English.
Be warm and conversational.
Current context: Construction company in Sri Lanka.`
                            },
                            ...newMessages.map(m => ({
                                role: m.role === 'ai' ? 'assistant' : m.role,
                                content: m.content
                            }))
                        ],
                        temperature: 0.7,
                        max_tokens: 500
                    })
                });

                const data = await conversationalResponse.json();
                let reply = data.choices[0].message.content;

                setMessages(prev => [...prev, { role: 'ai', content: reply }]);
                setIsLoading(false);
                return;
            }

            // ===== Route: Business Query -> Full Pipeline =====
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            const isSimulation = intent === 'simulation' ||
                                userInput.toLowerCase().includes('if we') || 
                                userInput.toLowerCase().includes('what if') ||
                                userInput.toLowerCase().includes('assume') ||
                                userInput.toLowerCase().includes('suppose');

            // ===== NEW: CEO-Level Analysis Architecture =====
            
            // Step 1: Get CEO analysis (uses cache, generates if stale > 1 hour)
            const liveData = await preFlightDataEngine.getCEOAnalysis(false);
            
            const isCached = liveData.isCached;
            delete liveData.isCached;
            
            console.log('[AI] CEO Analysis:', {
                workers: liveData.workers?.length,
                projects: liveData.projects?.length,
                materials: liveData.materials?.length,
                suppliers: liveData.suppliers?.length,
                finance: liveData.finance,
                insights: liveData.insights?.length,
                predictions: liveData.predictions?.length,
                actionItems: liveData.action_items?.length,
                alerts: liveData.alerts?.length,
                isCached
            });

            // Step 2: Build enhanced context with CEO insights
            let contextData = buildEnhancedContext(liveData, userInput);

            // ===== GUARDRAIL: Simple check =====
            const guardrailResponse = validateDataRequest(userInput, liveData);
            if (guardrailResponse) {
                setMessages(prev => [...prev, { role: 'ai', content: guardrailResponse }]);
                setIsLoading(false);
                return;
            }

            // If simulation, add calculation
            if (isSimulation) {
                const inputLower = userInput.toLowerCase();
                let calculation = '';
                
                if (inputLower.includes('hire') && inputLower.includes('worker')) {
                    const countMatch = userInput.match(/(\d+)/);
                    const count = countMatch ? parseInt(countMatch[1]) : 1;
                    const avgRate = 3500;
                    const monthly = avgRate * 26 * count;
                    const annual = monthly * 12;
                    calculation += `\n📈 SIMULATION RESULTS:\n`;
                    calculation += `Hiring ${count} workers:\n`;
                    calculation += `- Monthly Cost: LKR ${monthly.toLocaleString()}\n`;
                    calculation += `- Annual Cost: LKR ${annual.toLocaleString()}\n`;
                    const cashBalance = liveData.system?.cash_balance || liveData.finance?.cash_balance || 0;
                    if (cashBalance > 0) {
                        const runway = cashBalance / monthly;
                        calculation += `- Cash Runway: ${runway.toFixed(1)} months\n`;
                    }
                }
                
                contextData += calculation;
                contextData += `\n⚠️ NOTE: This is a simulation - actual costs may vary\n`;
            }

            const systemPrompt = getSystemPrompt(getAgentType());
            const openrouterKey = import.meta.env.VITE_OPENROUTER_FREE_API_KEY;
            if (!openrouterKey) throw new Error('API Key missing');

            const payload = {
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    {
                        role: 'system',
                        content: `${systemPrompt}

LANGUAGE RULE:
- Sinhala/Singlish query → Reply in අක්ෂර මාලාව (Sinhala script)
- English query → Reply in English

DATA RULES:
1. Use the data provided below - it's YOUR actual database
2. If data shows numbers, USE THEM - don't say "not available"
3. Calculate profit = total_income - total_expenses
4. For worker rates: use dailyRate, hourlyRate, otRate from workers list
5. Never make up numbers - only use what's in the data

${contextData}`
                    },
                    ...newMessages.map(m => ({
                        role: m.role === 'ai' ? 'assistant' : m.role,
                        content: m.content
                    }))
                ],
                temperature: 0.3,
                max_tokens: 1500
            };

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openrouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://ssdconstructions.com',
                    'X-Title': 'SSD Constructions'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            let reply = data.choices[0].message.content;

            // Add simulation warning if applicable
            if (isSimulation) {
                reply += `\n\n⚠️ *Simulation mode - results are estimates based on current data*`;
            }

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
                                {!showOverview && (
                                    <button
                                        onClick={() => setShowOverview(true)}
                                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                )}
                                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                                    <BotMessageSquareIcon size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3>SSD AI Assistant</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-emerald-600 font-medium">
                                            {getAgentType().toUpperCase()} Mode
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {criticalAlert && (
                            <div className="critical-banner">
                                <AlertTriangle size={16} />
                                <span>
                                    <strong>CRITICAL:</strong> {criticalAlert.projectName} requires immediate attention
                                </span>
                                <button onClick={() => setShowOverview(true)}>View Details</button>
                            </div>
                        )}

                        {showOverview && commandOverview && (
                            <div className="command-overview">
                                <div className="overview-header">
                                    <Activity size={20} />
                                    <h4>AI Command Center</h4>
                                </div>
                                
                                <div className="overview-tabs">
                                    <button 
                                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('overview')}
                                    >
                                        Overview
                                    </button>
                                    <button 
                                        className={`tab-btn ${activeTab === 'risks' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('risks')}
                                    >
                                        Risks
                                    </button>
                                    <button 
                                        className={`tab-btn ${activeTab === 'simulation' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('simulation')}
                                    >
                                        Simulate
                                    </button>
                                </div>

                                {activeTab === 'overview' && (
                                    <>
                                        <div className="overview-stats">
                                            <div className="stat-card">
                                                <span className="stat-value">{commandOverview.overview.activeRisks}</span>
                                                <span className="stat-label">Active Risks</span>
                                            </div>
                                            <div className="stat-card critical">
                                                <span className="stat-value">{commandOverview.overview.criticalAlerts}</span>
                                                <span className="stat-label">Critical</span>
                                            </div>
                                            <div className="stat-card">
                                                <span className="stat-value">{commandOverview.overview.aiInteractionsToday}</span>
                                                <span className="stat-label">Today's Queries</span>
                                            </div>
                                            <div className="stat-card">
                                                <span className="stat-value">{Math.round((commandOverview.overview.avgConfidence || 0) * 100)}%</span>
                                                <span className="stat-label">Avg Confidence</span>
                                            </div>
                                        </div>

                                        {commandOverview.topRisks?.length > 0 && (
                                            <div className="overview-risks">
                                                <h5>Top Risks</h5>
                                                {commandOverview.topRisks.slice(0, 3).map((r, i) => (
                                                    <div key={i} className={`risk-item ${r.level}`} onClick={() => handleRiskClick(r)}>
                                                        <span className="risk-name">{r.projectName}</span>
                                                        <span className="risk-level">{r.level.toUpperCase()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="overview-hot-alerts">
                                            <h5>🔥 Recent Activity</h5>
                                            {commandOverview.recentActivity?.slice(0, 3).map((log, i) => (
                                                <div key={i} className="hot-alert-item">
                                                    <span className="alert-action">{log.intent_type || 'query'}</span>
                                                    <span className="alert-time">{formatTimeAgo(log.created_at)}</span>
                                                </div>
                                            ))}
                                            {(!commandOverview.recentActivity || commandOverview.recentActivity.length === 0) && (
                                                <p className="no-activity">No recent activity</p>
                                            )}
                                        </div>
                                    </>
                                )}

                                {activeTab === 'risks' && (
                                    <div className="overview-risks-full">
                                        <h5>⚠️ All Project Risks</h5>
                                        {commandOverview.topRisks?.map((r, i) => (
                                            <div key={i} className={`risk-item-full ${r.level}`} onClick={() => handleRiskClick(r)}>
                                                <div className="risk-header">
                                                    <span className="risk-name">{r.projectName}</span>
                                                    <span className="risk-score">{Math.round((r.totalScore || 0) * 100)}%</span>
                                                </div>
                                                <div className="risk-bar">
                                                    <div className="risk-bar-fill" style={{ width: `${(r.totalScore || 0) * 100}%` }} />
                                                </div>
                                                <div className="risk-factors">
                                                    {r.factors?.map((f, j) => (
                                                        <span key={j} className="risk-factor">{f.label}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'simulation' && (
                                    <div className="overview-simulation">
                                        <h5>⚡ Quick Simulation</h5>
                                        <p className="sim-hint">Try asking:</p>
                                        <div className="sim-suggestions">
                                            <button onClick={() => handleSimSuggestion("What if we hire 3 more workers?")}>
                                                👷 Hire Workers
                                            </button>
                                            <button onClick={() => handleSimSuggestion("If we start a new project, what's the cash impact?")}>
                                                🏗️ New Project
                                            </button>
                                            <button onClick={() => handleSimSuggestion("What if we have a cash shortage?")}>
                                                💰 Cash Flow
                                            </button>
                                        </div>
                                        <div className="simulation-mode-toggle">
                                            <label>
                                                <input 
                                                    type="checkbox" 
                                                    checked={simulationMode}
                                                    onChange={(e) => setSimulationMode(e.target.checked)}
                                                />
                                                <span>Simulation Mode</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    className="overview-start-btn"
                                    onClick={() => setShowOverview(false)}
                                >
                                    <Sparkles size={16} />
                                    Start AI Session
                                </button>
                            </div>
                        )}

                            {!showOverview && (
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
                            )}

                            {!showOverview && (
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
                            )}
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
