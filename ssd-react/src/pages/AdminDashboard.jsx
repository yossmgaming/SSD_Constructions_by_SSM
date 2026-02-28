import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, FolderKanban, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import Card from '../components/Card';
import CountUp from '../components/CountUp';
import { useAuth } from '../context/AuthContext';


const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#94a3b8'];

export default function AdminDashboard({
    metrics,
    monthlyFlow,
    expensePie,
    projectProgress,
    activities,
    projects,
    t,
    fmt,
    fmtShort,
    ChartTooltip,
    PieTooltip
}) {
    const { hasRole } = useAuth();

    return (
        <div className="admin-dashboard">
            {/* ─── Stat Cards ─────────────────────────── */}
            <div className="dashboard-stats">
                <Card className="stat-card indigo">
                    <div className="stat-icon indigo"><FolderKanban size={22} /></div>
                    <div className="card-label">{t('dashboard.active_projects')}</div>
                    <div className="card-value"><CountUp to={metrics.activeProjects} /></div>
                    <div className="stat-sub">{projects.length} {t('dashboard.total')}</div>
                </Card>
                <Card className="stat-card emerald">
                    <div className="stat-icon emerald"><Users size={22} /></div>
                    <div className="card-label">{t('dashboard.total_workers')}</div>
                    <div className="card-value"><CountUp to={metrics.activeWorkers} /></div>
                    <div className="stat-sub">{metrics.activeWorkers} {t('dashboard.total')}</div>
                </Card>
                <Card className="stat-card emerald">
                    <div className="stat-icon emerald"><ArrowUpRight size={22} /></div>
                    <div className="card-label">{t('dashboard.money_in')}</div>
                    <div className="card-value"><span className="currency-prefix">LKR</span> <CountUp to={metrics.totalIn} separator="," /></div>
                    <div className="stat-sub">{t('dashboard.total_received')}</div>
                </Card>
                <Card className="stat-card rose">
                    <div className="stat-icon rose"><ArrowDownRight size={22} /></div>
                    <div className="card-label">{t('dashboard.money_out')}</div>
                    <div className="card-value"><span className="currency-prefix">LKR</span> <CountUp to={metrics.totalOut} separator="," /></div>
                    <div className="stat-sub">{t('dashboard.total_spent')}</div>
                </Card>
            </div>

            {/* ─── Net Cash Flow banner ────────────────── */}
            {hasRole(['Super Admin', 'Finance']) && (
                <div className={`cash-flow-banner ${metrics.net >= 0 ? 'positive' : 'negative'}`}>
                    <TrendingUp size={18} />
                    <span>{t('dashboard.net_cash_flow')}: <strong>LKR <CountUp to={metrics.net} separator="," /></strong></span>
                </div>
            )}

            {/* ─── Charts Row 1 ────────────────────────── */}
            {hasRole(['Super Admin', 'Finance']) && (
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
                                    <Pie data={expensePie} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                                        {expensePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div className="chart-empty-sm">{t('dashboard.no_expenses')}</div>}
                    </Card>
                </div>
            )}

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
