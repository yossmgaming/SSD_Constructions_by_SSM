import { useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { Download, ChevronDown, FileText, User, Box, ClipboardList, Banknote, Archive, Clock } from 'lucide-react';
import ExportDropdown from '../components/ExportDropdown';
import CountUp from '../components/CountUp';
import Card from '../components/Card';
import { getAll, queryEq, KEYS } from '../data/db';
import { exportToPDF, exportToExcel, exportToWord, exportToCSV, exportBOQ, exportBOQData } from '../utils/exportUtils';
import BounceButton from '../components/BounceButton';
import { useAuth } from '../context/AuthContext';
import './Finance.css';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const CAT_COLORS = {
    'Worker Pay': '#6366f1', 'Material Purchase': '#f59e0b',
    'Project Expense': '#ef4444', 'Advance': '#8b5cf6', 'Other': '#94a3b8',
};

export default function ProjectFinancialOverview() {
    const { hasRole } = useAuth();
    const [projects, setProjects] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [overview, setOverview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadProjects();
    }, []);

    async function loadProjects() {
        setIsLoading(true);
        try {
            setProjects(await getAll(KEYS.projects));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadOverview();
    }, [selectedId, projects]);

    async function loadOverview() {
        if (!selectedId) {
            setOverview(null);
            return;
        }
        const project = projects.find((p) => p.id === parseInt(selectedId));
        if (!project) {
            setOverview(null);
            return;
        }

        setIsLoading(true);
        try {
            const [allPayments, allAdvances, allAttendance, workers] = await Promise.all([
                queryEq(KEYS.payments, 'projectId', parseInt(selectedId)),
                queryEq(KEYS.advances, 'projectId', parseInt(selectedId)),
                queryEq(KEYS.attendances, 'projectId', parseInt(selectedId)),
                getAll(KEYS.workers)
            ]);

            // Money In
            const totalIn = allPayments.filter((p) => p.direction === 'In').reduce((s, p) => s + (p.amount || 0), 0);

            // Money Out by category
            const workerCost = allPayments.filter((p) => p.direction === 'Out' && p.category === 'Worker Pay').reduce((s, p) => s + (p.amount || 0), 0);
            const materialCost = allPayments.filter((p) => p.direction === 'Out' && p.category === 'Material Purchase').reduce((s, p) => s + (p.amount || 0), 0);
            const expenseCost = allPayments.filter((p) => p.direction === 'Out' && p.category === 'Project Expense').reduce((s, p) => s + (p.amount || 0), 0);
            const advanceCost = allPayments.filter((p) => p.direction === 'Out' && p.category === 'Advance').reduce((s, p) => s + (p.amount || 0), 0);
            const otherCost = allPayments.filter((p) => p.direction === 'Out' && p.category === 'Other').reduce((s, p) => s + (p.amount || 0), 0);

            const totalAdvances = allAdvances.reduce((s, a) => s + (a.amount || 0), 0);
            const totalOut = workerCost + materialCost + expenseCost + advanceCost + otherCost + totalAdvances;
            const contractValue = project.contractValue || project.budget || 0;
            const profit = totalIn - totalOut;

            // Cost breakdown pie data
            const costPie = [
                { name: 'Worker Pay', value: workerCost },
                { name: 'Material Purchase', value: materialCost },
                { name: 'Project Expense', value: expenseCost },
                { name: 'Advance', value: advanceCost + totalAdvances },
                { name: 'Other', value: otherCost },
            ].filter((d) => d.value > 0);

            // Monthly spending bar chart
            const months = {};
            allPayments.filter((p) => p.direction === 'Out').forEach((p) => {
                const m = p.date ? p.date.slice(0, 7) : 'Unknown';
                if (!months[m]) months[m] = { month: m, amount: 0 };
                months[m].amount += (p.amount || 0);
            });
            allAdvances.forEach((a) => {
                const m = a.date ? a.date.slice(0, 7) : 'Unknown';
                if (!months[m]) months[m] = { month: m, amount: 0 };
                months[m].amount += (a.amount || 0);
            });
            const monthlySpend = Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({
                ...m, label: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            }));

            // Worker cost bar chart
            const workerCosts = {};
            allPayments.filter((p) => p.direction === 'Out' && p.category === 'Worker Pay' && p.workerId).forEach((p) => {
                const w = workers.find((wr) => wr.id === p.workerId);
                const name = w ? w.fullName.split(' ')[0] : `Worker ${p.workerId}`;
                workerCosts[name] = (workerCosts[name] || 0) + (p.amount || 0);
            });
            const workerBars = Object.entries(workerCosts).map(([name, Paid]) => ({ name, Paid }));

            // Worker attendance summary
            const workerAttendance = {};
            allAttendance.forEach((a) => {
                const w = workers.find((wk) => wk.id === a.workerId);
                const name = w ? w.fullName : `Worker ${a.workerId}`;
                if (!workerAttendance[name]) workerAttendance[name] = { days: 0, cost: 0, rate: w?.dailyRate || 0, otRate: w?.overtimeRate || 0 };

                let hours = 0;
                // 1. Check for new UI fields
                if (a.isPresent !== undefined) {
                    if (!a.isPresent) return;
                    if (a.hoursWorked) hours = parseFloat(a.hoursWorked);
                    else if (a.isHalfDay) hours = 4;
                    else hours = 8;
                }
                // 2. Fallback to legacy
                else {
                    if (a.hours) hours = parseFloat(a.hours);
                    else if (a.status === 'Present' || a.status === 'Full') hours = 8;
                    else if (a.status === 'Half' || a.status === 'Half Day') hours = 4;
                }

                workerAttendance[name].days += hours / 8;
                if (hours > 8) {
                    workerAttendance[name].cost += (w?.dailyRate || 0) + (hours - 8) * (w?.overtimeRate || 0);
                } else {
                    workerAttendance[name].cost += (hours / 8) * (w?.dailyRate || 0);
                }
            });

            setOverview({
                project, contractValue, totalIn, totalOut,
                workerCost, materialCost, expenseCost, advanceCost, otherCost,
                totalAdvances, profit,
                remainingAdvances: allAdvances.filter(a => a.status === 'Active').reduce((s, a) => s + (a.amount || 0), 0),
                costPie, monthlySpend, workerBars, workerAttendance,
            });

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleExport(format) {
        if (!overview) return;
        const project = overview.project;
        const title = `Project Financial Summary: ${project.name}`;
        const fileName = `Financial_Summary_${project.name.replace(/\s+/g, '_')}`;

        const exportData = [
            { Metric: 'Contract Value', Amount: overview.contractValue },
            { Metric: 'Total Received', Amount: overview.totalIn },
            { Metric: 'Total Spent', Amount: overview.totalOut },
            { Metric: 'Worker Pay', Amount: overview.workerCost },
            { Metric: 'Material Cost', Amount: overview.materialCost },
            { Metric: 'Expenses', Amount: overview.expenseCost },
            { Metric: 'Advances Paid', Amount: overview.advanceCost + overview.totalAdvances },
            { Metric: 'Net Profit/Loss', Amount: overview.profit }
        ];

        const columns = [
            { header: 'Metric', key: 'Metric' },
            { header: 'Amount (LKR)', key: 'Amount' }
        ];

        setIsLoading(true);
        try {
            if (format === 'pdf') await exportToPDF({ title, data: exportData, columns, fileName });
            else if (format === 'excel') exportToExcel({ title, data: exportData, columns, fileName });
            else if (format === 'word') await exportToWord({ title, data: exportData, columns, fileName });
            else if (format === 'csv') exportToCSV(exportData, fileName);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleBOQExport(format) {
        if (!overview || !selectedId) return;
        setIsLoading(true);
        try {
            const boqItems = await queryEq(KEYS.boqItems, 'projectId', parseInt(selectedId));
            if (boqItems.length === 0) {
                alert("No BOQ items found for this project.");
                return;
            }

            await exportBOQData({
                format,
                project: overview.project,
                items: boqItems.map(i => ({
                    description: i.description,
                    qty: i.quantity || i.qty || 0,
                    unit: i.unit,
                    rate: i.unitPrice || i.rate || 0,
                    amount: (i.quantity || i.qty || 0) * (i.unitPrice || i.rate || 0)
                })),
                fileName: `BOQ_${overview.project.name.replace(/\s+/g, '_')}`
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const fmtShort = (v) => {
        if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
        if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
        return v;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="chart-tooltip">
                <p className="chart-tooltip-label">{label || payload[0]?.name}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color || p.fill }}><strong>{p.name}:</strong> {fmt(p.value)}</p>
                ))}
            </div>
        );
    };

    const PieTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="chart-tooltip">
                <p><strong>{payload[0].name}:</strong> {fmt(payload[0].value)}</p>
            </div>
        );
    };

    if (!hasRole(['Super Admin', 'Finance'])) {
        return (
            <div className="finance-page flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <Card>
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                        <Shield size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
                        <h2 style={{ color: 'var(--text-color)', marginBottom: 8 }}>Access Denied</h2>
                        <p>This module contains sensitive financial data restricted to Finance and Super Admin roles.</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <GlobalLoadingOverlay loading={isLoading} message="Analyzing Financial Integrity...">
            <div className="finance-page">
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <h1>Project Financial Overview</h1>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <ExportDropdown
                            onExport={handleExport}
                            isLoading={isLoading}
                            disabled={!selectedId}
                            label="Export Summary"
                        />
                    </div>
                </div>

                <div className="form-group" style={{ maxWidth: 400, marginBottom: 20 }}>
                    <label>Select Project</label>
                    <select value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)} disabled={isLoading}>
                        <option value="">Choose a project...</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                {isLoading && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading data...</div>}

                {!overview && !isLoading ? (
                    <Card><div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Select a project to view its financial overview</div></Card>
                ) : overview ? (
                    <>
                        {/* KPI Cards */}
                        <div className="finance-cards">
                            <Card className="report-summary-card" style={{ borderLeft: '3px solid #6366f1' }}>
                                <div className="card-label">Contract Value</div>
                                <div className="card-value" style={{ color: '#6366f1' }}><span className="currency-prefix">LKR</span> <CountUp to={overview.contractValue} separator="," /></div>
                            </Card>
                            <Card className="report-summary-card" style={{ borderLeft: '3px solid #10b981' }}>
                                <div className="card-label">Total Received</div>
                                <div className="card-value" style={{ color: '#10b981' }}><span className="currency-prefix">LKR</span> <CountUp to={overview.totalIn} separator="," /></div>
                            </Card>
                            <Card className="report-summary-card" style={{ borderLeft: '3px solid #ef4444' }}>
                                <div className="card-label">Total Spent</div>
                                <div className="card-value" style={{ color: '#ef4444' }}><span className="currency-prefix">LKR</span> <CountUp to={overview.totalOut} separator="," /></div>
                            </Card>
                            <Card className="report-summary-card" style={{ borderLeft: `3px solid ${overview.profit >= 0 ? '#10b981' : '#ef4444'}` }}>
                                <div className="card-label">Profit / Loss</div>
                                <div className="card-value" style={{ color: overview.profit >= 0 ? '#10b981' : '#ef4444' }}><span className="currency-prefix">LKR</span> <CountUp to={overview.profit} separator="," /></div>
                            </Card>
                        </div>

                        {/* Charts Row: Cost Pie + Monthly Bar */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                            <Card title="Cost Breakdown">
                                {overview.costPie.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <PieChart>
                                            <Pie data={overview.costPie} cx="50%" cy="50%" innerRadius={50} outerRadius={95}
                                                paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                                                {overview.costPie.map((entry, i) => (
                                                    <Cell key={i} fill={CAT_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<PieTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No costs recorded</div>}
                            </Card>

                            <Card title="Monthly Spending">
                                {overview.monthlySpend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={overview.monthlySpend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="label" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                            <YAxis tickFormatter={fmtShort} fontSize={12} tick={{ fill: '#94a3b8' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} name="Spent" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No spending data</div>}
                            </Card>
                        </div>

                        {/* Worker costs + attendance */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                            <Card title="Worker Payments">
                                {overview.workerBars.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={overview.workerBars} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="name" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                            <YAxis tickFormatter={fmtShort} fontSize={12} tick={{ fill: '#94a3b8' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="Paid" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No worker payments</div>}
                            </Card>

                            <Card title="Worker Attendance Summary">
                                <div className="summary-list">
                                    {Object.entries(overview.workerAttendance).length > 0 ? (
                                        Object.entries(overview.workerAttendance).map(([name, data]) => (
                                            <div key={name} className="summary-bar">
                                                <span><strong>{name}</strong></span>
                                                <span>{Math.round(data.days * 10) / 10} days | Cost: <strong>{fmt(data.cost)}</strong></span>
                                            </div>
                                        ))
                                    ) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No attendance data</div>}
                                </div>
                            </Card>
                        </div>

                        {/* Detailed cost breakdown */}
                        <Card title="Detailed Cost Breakdown" style={{ marginTop: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="summary-bar"><span><User size={16} style={{ marginRight: 6, opacity: 0.7 }} /> Worker Pay</span><strong>LKR <CountUp to={overview.workerCost} separator="," /></strong></div>
                                <div className="summary-bar"><span><Box size={16} style={{ marginRight: 6, opacity: 0.7 }} /> Material Purchase</span><strong>LKR <CountUp to={overview.materialCost} separator="," /></strong></div>
                                <div className="summary-bar"><span><ClipboardList size={16} style={{ marginRight: 6, opacity: 0.7 }} /> Project Expenses</span><strong>LKR <CountUp to={overview.expenseCost} separator="," /></strong></div>
                                <div className="summary-bar"><span><Banknote size={16} style={{ marginRight: 6, opacity: 0.7 }} /> Advances Paid</span><strong>LKR <CountUp to={overview.advanceCost + overview.totalAdvances} separator="," /></strong></div>
                                <div className="summary-bar"><span><Archive size={16} style={{ marginRight: 6, opacity: 0.7 }} /> Other</span><strong>LKR <CountUp to={overview.otherCost} separator="," /></strong></div>
                                <div className="summary-bar"><span><Clock size={16} style={{ marginRight: 6, opacity: 0.7 }} /> Remaining Advances</span><strong>LKR <CountUp to={overview.remainingAdvances} separator="," /></strong></div>
                            </div>
                            <div className="summary-bar" style={{ marginTop: 12, background: overview.profit >= 0 ? '#f0fdf4' : '#fef2f2', borderLeft: `3px solid ${overview.profit >= 0 ? '#10b981' : '#ef4444'}` }}>
                                <span><strong>Remaining to Collect:</strong></span>
                                <strong>LKR <CountUp to={Math.max(0, overview.contractValue - overview.totalIn)} separator="," /></strong>
                            </div>
                        </Card>
                    </>
                ) : null}
            </div>
        </GlobalLoadingOverlay>
    );
}
