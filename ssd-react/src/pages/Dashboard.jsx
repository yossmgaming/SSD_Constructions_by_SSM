import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderKanban, Users, Package, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import CountUp from '../components/CountUp';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';
import Card from '../components/Card';
import { getAll, queryEq, queryAdvanced, KEYS } from '../data/db';
import './Dashboard.css';
import BounceButton from '../components/BounceButton';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#94a3b8'];

export default function Dashboard() {
    const { t } = useTranslation();
    const [projects, setProjects] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [payments, setPayments] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    function timeAgo(dateStr) {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('dashboard.just_now');
        if (mins < 60) return `${mins}${t('dashboard.m_ago')}`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}${t('dashboard.h_ago')}`;
        const days = Math.floor(hrs / 24);
        return `${days}${t('dashboard.d_ago')}`;
    }

    async function loadData() {
        setIsLoading(true);
        try {
            // Calculate 6 months ago for financial charts
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const dateFrom = sixMonthsAgo.toISOString().split('T')[0];

            const [p, w, m, pay, adv, recentProjs, recentWorkers, recentMats, recentPays, recentAdvs] = await Promise.all([
                queryEq(KEYS.projects, 'status', 'Ongoing'),
                queryEq(KEYS.workers, 'status', 'Active'),
                getAll(KEYS.materials), // Usually doesn't grow indefinitely, but could be optimized later
                queryAdvanced(KEYS.payments, { filters: { range: { column: 'date', from: dateFrom } } }),
                queryAdvanced(KEYS.advances, { filters: { range: { column: 'date', from: dateFrom } } }),

                // For activity feed: get last 10 of each
                queryAdvanced(KEYS.projects, { orderBy: { column: 'createdAt', ascending: false }, limit: 10 }),
                queryAdvanced(KEYS.workers, { orderBy: { column: 'createdAt', ascending: false }, limit: 10 }),
                queryAdvanced(KEYS.materials, { orderBy: { column: 'createdAt', ascending: false }, limit: 10 }),
                queryAdvanced(KEYS.payments, { orderBy: { column: 'createdAt', ascending: false }, limit: 10 }),
                queryAdvanced(KEYS.advances, { orderBy: { column: 'createdAt', ascending: false }, limit: 10 })
            ]);

            setProjects(p);
            setWorkers(w);
            setMaterials(m);
            setPayments(pay);
            setAdvances(adv || []);

            // Activity feed - compiled from recent records
            const feed = [];
            recentProjs.forEach((r) => feed.push({ text: `Project "${r.name}" created`, time: r.createdAt, color: 'blue' }));
            recentWorkers.forEach((r) => feed.push({ text: `Worker ${r.fullName} added (${r.role})`, time: r.createdAt, color: 'green' }));
            recentMats.forEach((r) => feed.push({ text: `Material "${r.name}" registered`, time: r.createdAt, color: 'orange' }));
            recentPays.forEach((r) => {
                const proj = p.find((x) => x.id === r.projectId);
                const dir = r.direction === 'In' ? '↗' : '↙';
                feed.push({ text: `${dir} ${r.category || 'Payment'} — LKR ${(r.amount || 0).toLocaleString()} ${proj ? `(${proj.name})` : ''}`, time: r.createdAt || r.date, color: r.direction === 'In' ? 'green' : 'rose' });
            });
            recentAdvs?.forEach((r) => {
                const proj = p.find((x) => x.id === r.projectId);
                const wrk = w.find((x) => x.id === r.workerId);
                feed.push({ text: `↙ Advance — LKR ${(r.amount || 0).toLocaleString()} ${wrk ? `to ${wrk.fullName}` : ''} ${proj ? `(${proj.name})` : ''}`, time: r.createdAt || r.date, color: 'rose' });
            });

            feed.sort((a, b) => new Date(b.time) - new Date(a.time));
            setActivities(feed.slice(0, 8).map((a) => ({ ...a, time: timeAgo(a.time) })));

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    // Formatters
    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
    const fmtShort = (v) => {
        if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
        if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
        return v;
    };

    // ─── KPI metrics ─────────────────────────────────────────
    const metrics = useMemo(() => {
        const totalIn = payments.filter((p) => p.direction === 'In').reduce((s, p) => s + (p.amount || 0), 0);
        const paymentsOut = payments.filter((p) => p.direction === 'Out').reduce((s, p) => s + (p.amount || 0), 0);
        const advancesOut = advances.reduce((s, a) => s + (a.amount || 0), 0);
        const totalOut = paymentsOut + advancesOut;
        const activeProjects = projects.filter((p) => p.status === 'Ongoing').length;
        const activeWorkers = workers.filter((w) => w.status === 'Active').length;
        return { totalIn, totalOut, net: totalIn - totalOut, activeProjects, activeWorkers };
    }, [payments, advances, projects, workers]);

    // ─── Monthly cash flow (last 6 months) ───────────────────
    const monthlyFlow = useMemo(() => {
        const months = {};
        payments.forEach((p) => {
            const m = p.date ? p.date.slice(0, 7) : null;
            if (!m) return;
            if (!months[m]) months[m] = { month: m, In: 0, Out: 0 };
            if (p.direction === 'In') months[m].In += (p.amount || 0);
            else months[m].Out += (p.amount || 0);
        });
        advances.forEach((a) => {
            const m = a.date ? a.date.slice(0, 7) : null;
            if (!m) return;
            if (!months[m]) months[m] = { month: m, In: 0, Out: 0 };
            months[m].Out += (a.amount || 0);
        });

        return Object.values(months)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-6)
            .map((m) => ({
                ...m,
                label: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
            }));
    }, [payments, advances]);

    // ─── Expense breakdown pie ───────────────────────────────
    const expensePie = useMemo(() => {
        const cats = {};
        payments.filter((p) => p.direction === 'Out').forEach((p) => {
            const cat = p.category || 'Other';
            cats[cat] = (cats[cat] || 0) + (p.amount || 0);
        });
        const totalAdvances = advances.reduce((s, a) => s + (a.amount || 0), 0);
        if (totalAdvances > 0) {
            cats['Advance'] = (cats['Advance'] || 0) + totalAdvances;
        }
        return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [payments, advances]);

    // ─── Project budget progress ─────────────────────────────
    const projectProgress = useMemo(() => {
        return projects.slice(0, 5).map((p) => {
            const budget = p.contractValue || p.budget || 0;
            const received = payments.filter((pay) => pay.direction === 'In' && pay.projectId === p.id).reduce((s, pay) => s + (pay.amount || 0), 0);
            const paySpent = payments.filter((pay) => pay.direction === 'Out' && pay.projectId === p.id).reduce((s, pay) => s + (pay.amount || 0), 0);
            const advSpent = advances.filter((adv) => adv.projectId === p.id).reduce((s, adv) => s + (adv.amount || 0), 0);
            const spent = paySpent + advSpent;
            const pct = budget > 0 ? Math.round((received / budget) * 100) : 0;
            return { name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name, Budget: budget, Received: received, Spent: spent, pct, status: p.status };
        });
    }, [projects, payments, advances]);

    // Tooltips
    const ChartTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="dash-tooltip">
                <p className="dash-tooltip-label">{label || payload[0]?.name}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color || p.fill }}><strong>{p.name}:</strong> {fmt(p.value)}</p>
                ))}
            </div>
        );
    };

    const PieTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="dash-tooltip">
                <p><strong>{payload[0].name}:</strong> {fmt(payload[0].value)}</p>
            </div>
        );
    };

    const statCards = [
        { label: t('dashboard.active_projects'), value: <CountUp to={metrics.activeProjects} />, icon: FolderKanban, color: 'indigo', sub: `${projects.length} ${t('dashboard.total')}` },
        { label: t('dashboard.total_workers'), value: <CountUp to={metrics.activeWorkers} />, icon: Users, color: 'emerald', sub: `${workers.length} ${t('dashboard.total')}` },
        { label: t('dashboard.money_in'), value: <><span className="currency-prefix">LKR</span> <CountUp to={metrics.totalIn} separator="," /></>, icon: ArrowUpRight, color: 'emerald', sub: t('dashboard.total_received') },
        { label: t('dashboard.money_out'), value: <><span className="currency-prefix">LKR</span> <CountUp to={metrics.totalOut} separator="," /></>, icon: ArrowDownRight, color: 'rose', sub: t('dashboard.total_spent') },
    ];

    return (
        <div className="dashboard">
            <div className="page-header">
                <h1>{t('dashboard.title')}</h1>
                <BounceButton disabled={isLoading} className="btn btn-primary" onClick={loadData}>{t('dashboard.refresh')}</BounceButton>
            </div>

            {/* ─── Stat Cards ─────────────────────────── */}
            <div className="dashboard-stats">
                {statCards.map((s) => (
                    <Card key={s.label} className={`stat-card ${s.color}`}>
                        <div className={`stat-icon ${s.color}`}>
                            <s.icon size={22} />
                        </div>
                        <div className="card-label">{s.label}</div>
                        <div className="card-value">{s.value}</div>
                        <div className="stat-sub">{s.sub}</div>
                    </Card>
                ))}
            </div>

            {/* ─── Net Cash Flow banner ────────────────── */}
            <div className={`cash-flow-banner ${metrics.net >= 0 ? 'positive' : 'negative'}`}>
                <TrendingUp size={18} />
                <span>{t('dashboard.net_cash_flow')}: <strong>LKR <CountUp to={metrics.net} separator="," /></strong></span>
                <span className="cash-flow-note">{materials.length} {t('nav.materials').toLowerCase()} · {payments.length} {t('nav.payments').toLowerCase()}</span>
            </div>

            {/* ─── Charts Row 1 ────────────────────────── */}
            <div className="dashboard-charts-row">
                <Card title={t('dashboard.cash_flow_trend')} className="dash-chart-card">
                    {monthlyFlow.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={monthlyFlow} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="dashGradIn" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="dashGradOut" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="label" fontSize={11} tick={{ fill: '#94a3b8' }} />
                                <YAxis tickFormatter={fmtShort} fontSize={11} tick={{ fill: '#94a3b8' }} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="In" stroke="#10b981" fill="url(#dashGradIn)" strokeWidth={2} name={t('dashboard.money_in')} />
                                <Area type="monotone" dataKey="Out" stroke="#ef4444" fill="url(#dashGradOut)" strokeWidth={2} name={t('dashboard.money_out')} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <div className="chart-empty-sm">{t('dashboard.no_transactions')}</div>}
                </Card>

                <Card title={t('dashboard.expense_breakdown')} className="dash-chart-card">
                    {expensePie.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={expensePie} cx="50%" cy="50%" innerRadius={45} outerRadius={80}
                                    paddingAngle={3} dataKey="value"
                                    label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                                    {expensePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<PieTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="chart-empty-sm">{t('dashboard.no_expenses')}</div>}
                </Card>
            </div>

            {/* ─── Project Budget Progress ─────────────── */}
            <Card title={t('dashboard.project_budget_progress')} className="dash-bar-card">
                {projectProgress.length > 0 ? (
                    <>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={projectProgress} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={11} tick={{ fill: '#94a3b8' }} />
                                <YAxis tickFormatter={fmtShort} fontSize={11} tick={{ fill: '#94a3b8' }} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="Budget" fill="#e2e8f0" radius={[4, 4, 0, 0]} name={t('dashboard.budget')} />
                                <Bar dataKey="Received" fill="#10b981" radius={[4, 4, 0, 0]} name={t('dashboard.received')} />
                                <Bar dataKey="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} name={t('dashboard.spent')} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="progress-pills">
                            {projectProgress.map((p) => (
                                <div key={p.name} className="progress-pill">
                                    <span className="progress-pill-name">{p.name}</span>
                                    <div className="progress-mini-bar">
                                        <div className="progress-mini-fill" style={{ width: `${Math.min(p.pct, 100)}%` }} />
                                    </div>
                                    <span className={`progress-pill-pct ${p.pct >= 100 ? 'complete' : ''}`}>{p.pct}%</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : <div className="chart-empty-sm">{t('dashboard.no_projects')}</div>}
            </Card>

            {/* ─── Activity + Projects ─────────────────── */}
            <div className="dashboard-grid">
                <Card title={t('dashboard.recent_activity')}>
                    {activities.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>{t('dashboard.no_activity')}</div>
                    ) : activities.map((a, i) => (
                        <div className="activity-item" key={i}>
                            <div className={`activity-dot ${a.color}`} />
                            <div>
                                <div className="activity-text">{a.text}</div>
                                <div className="activity-time">{a.time}</div>
                            </div>
                        </div>
                    ))}
                </Card>

                <Card title={t('dashboard.active_projects')}>
                    {projects.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>{t('dashboard.no_projects')}</div>
                    ) : (
                        projects.slice(0, 5).map((p) => (
                            <div className="project-mini" key={p.id}>
                                <div>
                                    <div className="project-mini-name">{p.name}</div>
                                    <div className="project-mini-client">{p.client}</div>
                                </div>
                                <span className={`badge ${p.status === 'Ongoing' ? 'badge-info' : p.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                                    {p.status}
                                </span>
                            </div>
                        ))
                    )}
                </Card>
            </div>
        </div>
    );
}
