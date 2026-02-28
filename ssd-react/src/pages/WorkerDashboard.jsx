import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import { getWorkerNotifications, getWorkerLeaveCountThisMonth } from '../data/db-extensions';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import Modal from '../components/Modal';
import { Clock, ClipboardList, Calendar, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, CheckCircle, XCircle, CreditCard, AlertCircle, Briefcase, CalendarPlus, HandCoins } from 'lucide-react';
import CountUp from '../components/CountUp';
import './Dashboard.css';
import AttendanceHeatmap from '../components/role-components/AttendanceHeatmap';
import LeaveRequestForm from '../components/role-components/LeaveRequestForm';

export default function WorkerDashboard() {
    const { t } = useTranslation();
    const { profile, identity } = useAuth();

    const [projects, setProjects] = useState([]);
    const [activities, setActivities] = useState([]);
    const [attendanceDays, setAttendanceDays] = useState(null);
    const [payments, setPayments] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [leaveCount, setLeaveCount] = useState(0);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [monthlyEarnings, setMonthlyEarnings] = useState(0);
    const [totals, setTotals] = useState({ received: 0, advances: 0, pendingAdvances: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [loadingAtt, setLoadingAtt] = useState(false);
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [advanceForm, setAdvanceForm] = useState({ amount: '', reason: '' });
    const [submittingAdvance, setSubmittingAdvance] = useState(false);

    useEffect(() => {
        console.log('[WorkerDashboard] identity:', identity);
        loadData();
    }, [identity?.id]);

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        // Handle date-only strings (YYYY-MM-DD) by appending time to avoid UTC issues
        const dateValue = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
        const diff = Date.now() - new Date(dateValue).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('dashboard.just_now');
        if (mins < 60) return `${mins}${t('dashboard.m_ago')}`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}${t('dashboard.h_ago')}`;
        const days = Math.floor(hrs / 24);
        return `${days}${t('dashboard.d_ago')}`;
    };

    const fmt = (val) => new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        maximumFractionDigits: 0
    }).format(val || 0);

    async function loadData() {
        if (!identity?.id) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // 1. Fetch assigned projects with more details
            const { data: assignments } = await supabase
                .from('projectWorkers')
                .select('projectId, role, assignedFrom')
                .eq('workerId', identity.id);

            const allowedIds = (assignments || []).map(a => a.projectId);

            if (allowedIds.length > 0) {
                const { data: p } = await supabase
                    .from('projects')
                    .select('id, name, client, status, createdAt, location, progress, supervisor:profiles!supervisor_id(full_name)')
                    .in('id', allowedIds);
                setProjects(p || []);
            }

            // 2. Fetch worker-specific notifications
            await fetchWorkerNotifications();

            // 3. Fetch attendance and today's status
            await fetchAttendance();

            // 4. Fetch worker payments - consolidated
            const [paymentsRes, advancesRes, leaveRes, leaveCountRes] = await Promise.all([
                supabase
                    .from('payments')
                    .select('id, amount, direction, category, date, projectId, createdAt')
                    .eq('workerId', identity.id)
                    .order('date', { ascending: false })
                    .limit(20),
                supabase
                    .from('advances')
                    .select('id, amount, date, projectId, status, createdAt')
                    .eq('workerId', identity.id)
                    .order('createdAt', { ascending: false })
                    .limit(20),
                supabase
                    .from('leave_requests')
                    .select('id, start_date, end_date, reason, status, is_half_day, created_at')
                    .eq('worker_id', identity.id)
                    .order('created_at', { ascending: false })
                    .limit(10),
                getWorkerLeaveCountThisMonth(identity.id)
            ]);

            const workerPayments = paymentsRes.data || [];
            const workerAdvancesData = advancesRes.data || [];
            const workerLeaveRequests = leaveRes.data || [];

            setPayments(workerPayments);
            setAdvances(workerAdvancesData);
            setLeaveRequests(workerLeaveRequests);
            setLeaveCount(leaveCountRes || 0);

            // 5. Calculate monthly earnings (this month)
            const now = new Date();
            const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const monthlyTotal = workerPayments
                .filter(p => p.direction === 'Out' && p.date >= monthStart)
                .reduce((sum, p) => sum + (p.amount || 0), 0);
            setMonthlyEarnings(monthlyTotal);

            // 6. Calculate totals
            const received = workerPayments
                .filter(p => p.direction === 'Out')
                .reduce((sum, p) => sum + (p.amount || 0), 0);

            const totalAdvances = workerAdvancesData
                .filter(a => a.status === 'Approved' || a.status === 'Paid')
                .reduce((sum, a) => sum + (a.amount || 0), 0);

            const pendingAdvances = workerAdvancesData
                .filter(a => a.status === 'Pending')
                .reduce((sum, a) => sum + (a.amount || 0), 0);

            setTotals({
                received,
                advances: totalAdvances,
                pendingAdvances
            });

        } catch (e) {
            console.error('[WorkerDashboard] Load error:', e);
        } finally {
            setIsLoading(false);
        }
    }

    async function fetchAttendance() {
        if (!identity?.id) return;
        setLoadingAtt(true);
        try {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

            // Fetch this month's attendance
            const { data: att } = await supabase
                .from('attendances')
                .select('id, isPresent, isHalfDay, hoursWorked, date')
                .eq('workerId', identity.id)
                .eq('isPresent', true)
                .gte('date', monthStart);

            const days = (att || []).reduce((sum, a) => {
                const h = a.hoursWorked || (a.isHalfDay ? 4 : 8);
                return sum + (h / 8);
            }, 0);
            setAttendanceDays(Math.round(days * 10) / 10);

            // Fetch today's attendance
            const { data: todayAtt } = await supabase
                .from('attendances')
                .select('id, isPresent, isHalfDay, hoursWorked')
                .eq('workerId', identity.id)
                .eq('date', todayStr)
                .single();

            if (todayAtt) {
                setTodayAttendance(todayAtt.isPresent ? (todayAtt.isHalfDay ? 'half' : 'present') : 'absent');
            } else {
                setTodayAttendance('not_marked');
            }
        } catch (e) {
            console.warn('[WorkerDashboard] Attendance fetch failed:', e.message);
        } finally {
            setLoadingAtt(false);
        }
    }

    async function fetchWorkerNotifications() {
        if (!identity?.id) return;

        try {
            // 1. Fetch notifications from notifications table
            const notifications = await getWorkerNotifications(identity.id);

            // 2. Fetch recent worker-specific activities from various tables
            const [paymentsData, advancesData, leaveData, assignmentsData] = await Promise.all([
                // Recent payments to this worker
                supabase
                    .from('payments')
                    .select('id, amount, category, date, createdAt')
                    .eq('workerId', identity.id)
                    .order('createdAt', { ascending: false })
                    .limit(5),
                // Recent advances for this worker
                supabase
                    .from('advances')
                    .select('id, amount, status, createdAt')
                    .eq('workerId', identity.id)
                    .order('createdAt', { ascending: false })
                    .limit(5),
                // Recent leave requests for this worker
                supabase
                    .from('leave_requests')
                    .select('id, status, start_date, end_date, created_at')
                    .eq('worker_id', identity.id)
                    .order('created_at', { ascending: false })
                    .limit(5),
                // Recent project assignments
                supabase
                    .from('projectWorkers')
                    .select('id, assignedFrom, projectId')
                    .eq('workerId', identity.id)
                    .order('assignedFrom', { ascending: false })
                    .limit(5)
            ]);

            const feed = [];

            // Add notifications from notifications table
            (notifications || []).forEach(n => {
                feed.push({
                    text: n.message || n.title,
                    time: n.created_at,
                    color: n.is_read ? 'slate' : 'blue'
                });
            });

            // Add payment notifications
            (paymentsData.data || []).forEach(p => {
                feed.push({
                    text: `Payment of ${fmt(p.amount)} ${p.category ? `(${p.category})` : ''} made to you`,
                    time: p.createdAt || p.date,
                    color: 'emerald'
                });
            });

            // Add advance notifications
            (advancesData.data || []).forEach(a => {
                if (a.status === 'Approved' || a.status === 'Paid') {
                    feed.push({
                        text: `Your advance request of ${fmt(a.amount)} has been approved`,
                        time: a.createdAt,
                        color: 'emerald'
                    });
                } else if (a.status === 'Rejected') {
                    feed.push({
                        text: `Your advance request of ${fmt(a.amount)} has been rejected`,
                        time: a.createdAt,
                        color: 'rose'
                    });
                }
            });

            // Add leave request notifications
            (leaveData.data || []).forEach(l => {
                if (l.status === 'Approved') {
                    feed.push({
                        text: `Your leave request has been approved`,
                        time: l.created_at,
                        color: 'emerald'
                    });
                } else if (l.status === 'Rejected') {
                    feed.push({
                        text: `Your leave request has been rejected`,
                        time: l.created_at,
                        color: 'rose'
                    });
                }
            });

            // Add project assignment notifications
            if (assignmentsData.data) {
                const projectIds = [...new Set((assignmentsData.data || []).map(a => a.projectId))];
                if (projectIds.length > 0) {
                    const { data: projects } = await supabase
                        .from('projects')
                        .select('id, name')
                        .in('id', projectIds);

                    (assignmentsData.data || []).forEach(a => {
                        const proj = (projects || []).find(p => p.id === a.projectId);
                        if (proj) {
                            feed.push({
                                text: `You have been assigned to project "${proj.name}"`,
                                time: a.assignedFrom,
                                color: 'blue'
                            });
                        }
                    });
                }
            }

            // Sort by time and take latest 10
            feed.sort((a, b) => new Date(b.time) - new Date(a.time));
            setActivities(feed.slice(0, 10).map(a => ({ ...a, time: timeAgo(a.time) })));

        } catch (e) {
            console.error('[WorkerDashboard] Error fetching notifications:', e);
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleSubmitAdvance = async () => {
        if (!advanceForm.amount || !identity?.id) return;
        setSubmittingAdvance(true);
        try {
            const { error } = await supabase
                .from('advances')
                .insert({
                    worker_id: identity.id,
                    amount: parseFloat(advanceForm.amount),
                    description: advanceForm.reason,
                    status: 'Pending',
                    date: new Date().toISOString().split('T')[0]
                });
            if (error) throw error;
            setShowAdvanceModal(false);
            setAdvanceForm({ amount: '', reason: '' });
            loadData();
        } catch (e) {
            console.error('Error submitting advance:', e);
            alert('Failed to submit advance request: ' + e.message);
        } finally {
            setSubmittingAdvance(false);
        }
    };

    const getPaymentCategoryColor = (category) => {
        switch (category) {
            case 'Worker Pay': return 'bg-emerald-100 text-emerald-700';
            case 'Advance': return 'bg-amber-100 text-amber-700';
            case 'Bonus': return 'bg-purple-100 text-purple-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getAdvanceStatusBadge = (status) => {
        switch (status) {
            case 'Approved': return 'badge-success';
            case 'Paid': return 'badge-success';
            case 'Pending': return 'badge-warning';
            case 'Rejected': return 'badge-error';
            default: return 'badge-info';
        }
    };

    const getTodayAttendanceDisplay = () => {
        if (todayAttendance === 'present') return { text: 'Present', color: 'text-emerald-600', bg: 'bg-emerald-100' };
        if (todayAttendance === 'half') return { text: 'Half Day', color: 'text-amber-600', bg: 'bg-amber-100' };
        if (todayAttendance === 'absent') return { text: 'Absent', color: 'text-rose-600', bg: 'bg-rose-100' };
        return { text: 'Not Marked', color: 'text-slate-500', bg: 'bg-slate-100' };
    };

    const todayStatus = getTodayAttendanceDisplay();

    // Calculate this week's attendance
    const getThisWeekDays = () => {
        if (!attendanceDays) return 0;
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysPassed = dayOfWeek === 0 ? 1 : dayOfWeek;
        return Math.min(attendanceDays, daysPassed);
    };

    return (
        <div className="worker-dashboard">
            {/* Welcome Section with Quick Actions */}
            <div className="worker-welcome">
                <div className="welcome-text">
                    <h2>{t('dashboard.welcome_back')}, {profile?.full_name || 'Worker'}</h2>
                    <p>{t('dashboard.worker_subtitle', 'Stay updated with your assigned projects and attendance.')}</p>
                </div>
                <div className="flex gap-2">
                    <BounceButton
                        className="btn btn-primary flex items-center gap-2"
                        onClick={() => document.getElementById('leave-request-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        <CalendarPlus size={16} />
                        Request Leave
                    </BounceButton>
                    <BounceButton
                        className="btn flex items-center gap-2"
                        style={{ background: '#f59e0b', color: 'white', border: 'none' }}
                        onClick={() => setShowAdvanceModal(true)}
                    >
                        <HandCoins size={16} />
                        Request Advance
                    </BounceButton>
                </div>
            </div>

            {/* Stats Row */}
            <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                <Card className="stat-card indigo">
                    <div className="stat-icon indigo">
                        <ClipboardList size={22} />
                    </div>
                    <div className="card-label">Assigned Projects</div>
                    <div className="card-value"><CountUp to={projects.length} /></div>
                    <div className="stat-sub">Active now</div>
                </Card>

                <Card className="stat-card emerald">
                    <div className="stat-icon emerald">
                        <Clock size={22} />
                    </div>
                    <div className="card-label">This Month</div>
                    <div className="card-value">
                        {loadingAtt ? (
                            <span style={{ fontSize: '1rem', color: '#94a3b8' }}>—</span>
                        ) : !identity ? (
                            <span style={{ fontSize: '0.8rem', color: '#f87171' }}>ID Link Missing</span>
                        ) : (
                            <CountUp to={attendanceDays ?? 0} />
                        )}
                    </div>
                    <div className="stat-sub">Days present</div>
                </Card>

                <Card className="stat-card amber">
                    <div className="stat-icon amber">
                        <Calendar size={22} />
                    </div>
                    <div className="card-label">This Week</div>
                    <div className="card-value">
                        <CountUp to={getThisWeekDays()} />
                    </div>
                    <div className="stat-sub">Days worked</div>
                </Card>

                <Card className={`stat-card ${todayAttendance === 'absent' ? 'rose' : todayAttendance === 'present' ? 'emerald' : 'purple'}`}>
                    <div className={`stat-icon ${todayAttendance === 'absent' ? 'rose' : todayAttendance === 'present' ? 'emerald' : 'purple'}`}>
                        {todayAttendance === 'present' || todayAttendance === 'half' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
                    </div>
                    <div className="card-label">Today</div>
                    <div className="card-value" style={{ fontSize: '1rem' }}>
                        <span className={todayStatus.color}>{todayStatus.text}</span>
                    </div>
                    <div className="stat-sub">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                </Card>

                <Card className="stat-card purple">
                    <div className="stat-icon purple">
                        <DollarSign size={22} />
                    </div>
                    <div className="card-label">This Month</div>
                    <div className="card-value">{fmt(monthlyEarnings)}</div>
                    <div className="stat-sub">Earnings</div>
                </Card>

                <Card className="stat-card rose">
                    <div className="stat-icon rose">
                        <Wallet size={22} />
                    </div>
                    <div className="card-label">Leave Balance</div>
                    <div className="card-value">
                        <span className={leaveCount >= 5 ? 'text-rose-600' : 'text-emerald-600'}>
                            {leaveCount}/5
                        </span>
                    </div>
                    <div className="stat-sub">Leaves used this month</div>
                </Card>

                <Card className="stat-card purple">
                    <div className="stat-icon purple">
                        <ArrowUpRight size={22} />
                    </div>
                    <div className="card-label">Advances</div>
                    <div className="card-value">{fmt(totals.advances)}</div>
                    <div className="stat-sub">{totals.pendingAdvances > 0 ? `${fmt(totals.pendingAdvances)} pending` : 'All cleared'}</div>
                </Card>
            </div>

            {/* Role Components - Calendar & Leave */}
            <div className="dashboard-grid-full mb-6">
                <Card title="Attendance Calendar" className="calendar-card">
                    <AttendanceHeatmap workerId={identity?.id} />
                </Card>
            </div>

            {/* Leave Request Section - Full Width */}
            <div className="dashboard-grid-full mb-6" id="leave-request-section">
                <Card title="Leave / Time-off Requests">
                    <LeaveRequestForm workerId={identity?.id} onSuccess={loadData} />
                </Card>
            </div>

            {/* Leave Request History */}
            <div className="dashboard-grid-full mb-6">
                <Card title="My Leave History">
                    {leaveRequests.length === 0 ? (
                        <div className="empty-state">No leave requests yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-slate-200">
                                    <tr>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Period</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Days</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Reason</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Status</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Requested</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaveRequests.map((l) => {
                                        const fullDays = Math.ceil((new Date(l.end_date?.split(' ')[0]) - new Date(l.start_date?.split(' ')[0])) / (1000 * 60 * 60 * 24)) + 1;
                                        const days = l.is_half_day ? fullDays / 2 : fullDays;
                                        return (
                                            <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="px-3 py-2 text-sm text-slate-600">
                                                    {l.start_date?.split(' ')[0]} → {l.end_date?.split(' ')[0]}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-sm font-semibold text-indigo-600">{days}</span>
                                                    {l.is_half_day && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Half</span>}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-slate-500 max-w-[200px] truncate">{l.reason}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`badge ${l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-error' : 'badge-warning'}`}>
                                                        {l.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-sm text-slate-400">{l.created_at?.split(' ')[0]}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            {/* Payment & Advances History */}
            <div className="dashboard-grid">
                <Card title="Payment History">
                    {payments.length === 0 ? (
                        <div className="empty-state">No payment records found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-slate-200">
                                    <tr>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Date</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Amount</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Category</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.slice(0, 10).map((p) => (
                                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-3 py-2 text-sm text-slate-600">{formatDate(p.date)}</td>
                                            <td className="px-3 py-2 text-sm font-semibold text-emerald-600">{fmt(p.amount)}</td>
                                            <td className="px-3 py-2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${getPaymentCategoryColor(p.category)}`}>
                                                    {p.category || 'Payment'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <Card title="Advances History">
                    {advances.length === 0 ? (
                        <div className="empty-state">No advance records found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-slate-200">
                                    <tr>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Date</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Amount</th>
                                        <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {advances.slice(0, 10).map((a) => (
                                        <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-3 py-2 text-sm text-slate-600">{formatDate(a.date)}</td>
                                            <td className="px-3 py-2 text-sm font-semibold text-amber-600">{fmt(a.amount)}</td>
                                            <td className="px-3 py-2">
                                                <span className={`badge ${getAdvanceStatusBadge(a.status)}`}>
                                                    {a.status || 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            {/* Projects & Activity */}
            <div className="dashboard-grid">
                <Card title={t('dashboard.my_active_projects', 'My Active Projects')}>
                    {projects.length === 0 ? (
                        <div className="empty-state">{t('dashboard.no_projects_assigned', 'No projects currently assigned.')}</div>
                    ) : (
                        projects.map((p) => (
                            <div className="project-mini" key={p.id}>
                                <div className="flex-1">
                                    <div className="project-mini-name">{p.name}</div>
                                    <div className="project-mini-client">{p.client}</div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                        {p.location && <span>📍 {p.location}</span>}
                                        {p.supervisor?.full_name && <span>👤 {p.supervisor.full_name}</span>}
                                    </div>
                                    {p.progress !== null && (
                                        <div className="progress-bar-mini mt-2">
                                            <div className="progress-fill-mini" style={{ width: `${p.progress}%` }} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`badge ${p.status === 'Ongoing' ? 'badge-info' : 'badge-warning'}`}>
                                        {p.status}
                                    </span>
                                    {p.progress !== null && (
                                        <span className="text-xs font-medium text-slate-500">{p.progress}%</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </Card>

                <Card title={t('dashboard.latest_notifications', 'Your Notifications')}>
                    {activities.length === 0 ? (
                        <div className="empty-state">{t('dashboard.no_recent_notifications', 'No new notifications.')}</div>
                    ) : (
                        activities.map((a, i) => (
                            <div className="activity-item" key={i}>
                                <div className={`activity-dot ${a.color === 'emerald' ? 'green' : a.color === 'rose' ? 'orange' : a.color === 'blue' ? 'blue' : 'slate-300'}`} />
                                <div>
                                    <div className="activity-text">{a.text}</div>
                                    <div className="activity-time">{a.time}</div>
                                </div>
                            </div>
                        ))
                    )}
                </Card>
            </div>

            {/* Advance Request Modal */}
            <Modal isOpen={showAdvanceModal} onClose={() => setShowAdvanceModal(false)} title="Request Advance">
                <div className="space-y-4">
                    <div className="p-4 rounded-lg border bg-slate-50 border-slate-200">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your Current Advances</div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-slate-800">{fmt(totals.advances)}</div>
                                <div className="text-sm text-slate-500">Approved advances</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-amber-600">{fmt(totals.pendingAdvances)}</div>
                                <div className="text-sm text-slate-500">Pending</div>
                            </div>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Amount (LKR) *</label>
                        <input
                            type="number"
                            className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all"
                            placeholder="Enter amount"
                            value={advanceForm.amount}
                            onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Reason</label>
                        <textarea
                            className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all resize-y min-h-[80px]"
                            placeholder="Reason for advance request..."
                            value={advanceForm.reason}
                            onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                        />
                    </div>
                    <div className="pt-4 flex justify-end gap-3 mt-6 border-t border-slate-100">
                        <button className="btn btn-ghost" onClick={() => setShowAdvanceModal(false)}>Cancel</button>
                        <BounceButton
                            className="btn btn-primary bg-indigo-600 hover:bg-indigo-700"
                            onClick={handleSubmitAdvance}
                            disabled={submittingAdvance || !advanceForm.amount}
                        >
                            {submittingAdvance ? 'Submitting...' : 'Submit Request'}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
