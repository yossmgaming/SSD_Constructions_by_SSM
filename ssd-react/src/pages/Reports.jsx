import { useState, useEffect, useMemo } from 'react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { Download, ChevronDown, FileSpreadsheet } from 'lucide-react';
import ExportDropdown from '../components/ExportDropdown';
import CountUp from '../components/CountUp';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import { getAll, queryEq, queryAdvanced, KEYS } from '../data/db';
import { exportToPDF, exportToExcel, exportToWord, exportToCSV } from '../utils/exportUtils';
import './Reports.css';
import BounceButton from '../components/BounceButton';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const CAT_COLORS = {
    'Client Payment': '#10b981', 'Worker Pay': '#6366f1', 'Material Purchase': '#f59e0b',
    'Project Expense': '#ef4444', 'Advance': '#8b5cf6', 'Other': '#94a3b8',
};

export default function Reports() {
    const [reportType, setReportType] = useState('Overview');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [projects, setProjects] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [allAttendance, setAllAttendance] = useState([]);
    const [allAdvances, setAllAdvances] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            // Default to last 12 months to avoid "forever" load if no dates specified
            let payFilter = {};
            let advFilter = {};

            if (dateFrom || dateTo) {
                payFilter = { range: { column: 'date', from: dateFrom, to: dateTo } };
                advFilter = { range: { column: 'date', from: dateFrom, to: dateTo } };
            } else {
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                const defaultFrom = oneYearAgo.toISOString().split('T')[0];
                payFilter = { range: { column: 'date', from: defaultFrom } };
                advFilter = { range: { column: 'date', from: defaultFrom } };
            }

            const [projs, wrks, mats, sups, pays, atts, advs] = await Promise.all([
                getAll(KEYS.projects),
                getAll(KEYS.workers),
                getAll(KEYS.materials),
                getAll(KEYS.suppliers),
                queryAdvanced(KEYS.payments, { filters: payFilter }),
                getAll(KEYS.attendances), // Attendance might still be large, but usually needs processing
                queryAdvanced(KEYS.advances, { filters: advFilter })
            ]);
            setProjects(projs);
            setWorkers(wrks);
            setMaterials(mats);
            setSuppliers(sups);
            setAllPayments(pays);
            setAllAttendance(atts);
            setAllAdvances(advs || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    // Helper formatters
    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const fmtShort = (v) => {
        if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
        if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
        return v;
    };

    const PieTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="dash-tooltip">
                <p><strong>{payload[0].name}:</strong> {fmt(payload[0].value)}</p>
            </div>
        );
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="dash-tooltip">
                <p style={{ marginBottom: 4 }}><strong>{label}</strong></p>
                {payload.map((entry, i) => (
                    <p key={i} style={{ color: entry.color }}>{entry.name}: {fmt(entry.value)}</p>
                ))}
            </div>
        );
    };

    // Date filters
    const payments = useMemo(() => {
        return allPayments.filter((p) => {
            if (dateFrom && p.date < dateFrom) return false;
            if (dateTo && p.date > dateTo) return false;
            return true;
        });
    }, [allPayments, dateFrom, dateTo]);

    const advances = useMemo(() => {
        return allAdvances.filter((a) => {
            if (dateFrom && a.date < dateFrom) return false;
            if (dateTo && a.date > dateTo) return false;
            return true;
        });
    }, [allAdvances, dateFrom, dateTo]);

    // ─── Metrics ──────────────────────────────────────────────
    const metrics = useMemo(() => {
        const totalIn = payments.filter((p) => p.direction === 'In').reduce((s, p) => s + (p.amount || 0), 0);
        const paymentsOut = payments.filter((p) => p.direction === 'Out').reduce((s, p) => s + (p.amount || 0), 0);
        const advancesOut = advances.reduce((s, a) => s + (a.amount || 0), 0);
        const totalOut = paymentsOut + advancesOut;
        const activeProjects = projects.filter((p) => p.status === 'Ongoing').length;
        const activeWorkers = workers.filter((w) => w.status === 'Active').length;
        const totalBudget = projects.reduce((s, p) => s + (p.contractValue || p.budget || 0), 0);
        return { totalIn, totalOut, net: totalIn - totalOut, activeProjects, activeWorkers, totalBudget, txCount: payments.length + advances.length };
    }, [payments, advances, projects, workers]);

    // ─── Pie: Expense breakdown by category ───────────────────
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

    // ─── Pie: Income by project ───────────────────────────────
    const incomePie = useMemo(() => {
        const projs = {};
        payments.filter((p) => p.direction === 'In').forEach((p) => {
            const name = projects.find((pr) => pr.id === p.projectId)?.name || 'Unknown';
            projs[name] = (projs[name] || 0) + (p.amount || 0);
        });
        return Object.entries(projs).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [payments, projects]);

    // ─── Bar: Per-project income vs expense ───────────────────
    const projectBars = useMemo(() => {
        return projects.map((p) => {
            const projPay = payments.filter((pay) => pay.projectId === p.id);
            const projAdv = advances.filter((adv) => adv.projectId === p.id);
            const income = projPay.filter((pay) => pay.direction === 'In').reduce((s, pay) => s + (pay.amount || 0), 0);
            const paySpent = projPay.filter((pay) => pay.direction === 'Out').reduce((s, pay) => s + (pay.amount || 0), 0);
            const advSpent = projAdv.reduce((s, adv) => s + (adv.amount || 0), 0);
            const expense = paySpent + advSpent;
            return { name: p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name, Income: income, Expense: expense, Profit: income - expense };
        }).filter((p) => p.Income > 0 || p.Expense > 0);
    }, [payments, advances, projects]);

    // ─── Area: Monthly cash flow timeline ─────────────────────
    const monthlyFlow = useMemo(() => {
        const months = {};
        payments.forEach((p) => {
            const m = p.date ? p.date.slice(0, 7) : 'Unknown';
            if (!months[m]) months[m] = { month: m, In: 0, Out: 0 };
            if (p.direction === 'In') months[m].In += (p.amount || 0);
            else months[m].Out += (p.amount || 0);
        });
        advances.forEach((a) => {
            const m = a.date ? a.date.slice(0, 7) : 'Unknown';
            if (!months[m]) months[m] = { month: m, In: 0, Out: 0 };
            months[m].Out += (a.amount || 0);
        });
        return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).map((m) => {
            let label = m.month;
            try { label = new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); } catch (e) { }
            return { ...m, label };
        });
    }, [payments, advances]);

    // ─── Worker report data ───────────────────────────────────
    const workerReport = useMemo(() => {
        return workers.map((w) => {
            const workerPay = payments.filter((p) => p.category === 'Worker Pay' && p.workerId === w.id);
            const totalPaid = workerPay.reduce((s, p) => s + (p.amount || 0), 0);
            const workerAdv = advances.filter((a) => a.workerId === w.id);
            const totalAdv = workerAdv.reduce((s, a) => s + (a.amount || 0), 0);
            const attendance = allAttendance.filter((a) => a.workerId === w.id);
            let daysWorked = 0;
            attendance.forEach((a) => {
                if (a.isPresent !== undefined) {
                    if (!a.isPresent) return;
                    if (a.hoursWorked) daysWorked += parseFloat(a.hoursWorked) / 8;
                    else if (a.isHalfDay) daysWorked += 0.5;
                    else daysWorked += 1;
                } else {
                    if (a.hours) daysWorked += parseFloat(a.hours) / 8;
                    else if (a.status === 'Present' || a.status === 'Full') daysWorked += 1;
                    else if (a.status === 'Half' || a.status === 'Half Day') daysWorked += 0.5;
                }
            });
            const totalEarned = daysWorked * (w.dailyRate || 0);
            return { id: w.id, name: w.fullName, role: w.role, dailyRate: w.dailyRate, daysWorked: Math.round(daysWorked * 10) / 10, totalEarned, totalPaid, totalAdv, outstanding: totalEarned - totalPaid - totalAdv, status: w.status };
        });
    }, [workers, payments, advances, allAttendance]);

    // ─── Worker bar chart ─────────────────────────────────────
    const workerBars = useMemo(() => {
        return workerReport.filter((w) => w.totalEarned > 0 || w.totalPaid > 0 || w.totalAdv > 0).map((w) => ({
            name: w.name.split(' ')[0], Earned: w.totalEarned, Paid: w.totalPaid, Advances: w.totalAdv
        }));
    }, [workerReport]);

    // ─── Performance metrics ───
    const perfData = useMemo(() => {
        const totalWorkingDays = Math.max(1, new Set(allAttendance.map(a => a.date || 'unknown')).size);
        return workers.filter(w => w.status === 'Active').map(w => {
            const attendance = allAttendance.filter(a => a.workerId === w.id);
            let effectiveDays = 0;
            attendance.forEach(a => {
                if (a.isPresent !== undefined) {
                    if (!a.isPresent) return;
                    if (a.hoursWorked) effectiveDays += parseFloat(a.hoursWorked) / 8;
                    else if (a.isHalfDay) effectiveDays += 0.5;
                    else effectiveDays += 1;
                } else {
                    if (a.hours) effectiveDays += parseFloat(a.hours) / 8;
                    else if (a.status === 'Present') effectiveDays += 1;
                    else if (a.status === 'Half') effectiveDays += 0.5;
                }
            });
            const attendanceRate = Math.min(100, Math.round((effectiveDays / totalWorkingDays) * 100));
            const workerPay = payments.filter(p => p.workerId === w.id && p.direction === 'Out');
            const paid = workerPay.filter(p => p.category === 'Worker Pay').reduce((s, p) => s + (p.amount || 0), 0);
            const adv = advances.filter(a => a.workerId === w.id).reduce((s, a) => s + (a.amount || 0), 0);
            const earned = effectiveDays * (w.dailyRate || 0);
            const paySettlement = earned > 0 ? Math.min(100, Math.round((paid / earned) * 100)) : 0;
            const advanceScore = earned > 0 ? Math.max(0, 100 - (adv / earned) * 100) : 100;
            const overall = Math.round(attendanceRate * 0.5 + paySettlement * 0.3 + advanceScore * 0.2);
            return {
                id: w.id, name: w.fullName, role: w.role, dailyRate: w.dailyRate,
                effectiveDays: Math.round(effectiveDays * 10) / 10, attendanceRate,
                totalEarned: earned, totalPaid: paid, totalAdvances: adv,
                paySettlement, advanceScore, overall,
                projectCount: new Set(attendance.map(a => a.projectId)).size,
                grade: overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : 'D'
            };
        }).sort((a, b) => b.overall - a.overall);
    }, [workers, allAttendance, payments, advances]);

    const attendanceBars = useMemo(() => perfData.map(w => ({ name: w.name.split(' ')[0], Rate: w.attendanceRate })), [perfData]);
    const costEffBars = useMemo(() => perfData.filter(w => w.totalEarned > 0).map(w => ({
        name: w.name.split(' ')[0], Earned: w.totalEarned, Paid: w.totalPaid, Advances: w.totalAdvances
    })), [perfData]);

    const projectReport = useMemo(() => projects.map(p => {
        const projPay = payments.filter(pay => pay.projectId === p.id);
        const projAdv = advances.filter(adv => adv.projectId === p.id);
        const received = projPay.filter(pay => pay.direction === 'In').reduce((s, pay) => s + (pay.amount || 0), 0);
        const spent = projPay.filter(pay => pay.direction === 'Out').reduce((s, pay) => s + (pay.amount || 0), 0) + projAdv.reduce((s, a) => s + (a.amount || 0), 0);
        const budget = p.contractValue || p.budget || 0;
        return { id: p.id, name: p.name, client: p.client, budget, received, spent, profit: received - spent, remaining: budget - received, status: p.status };
    }), [projects, payments, advances]);

    // Tooltips
    const handleExport = async (format) => {
        let exportData = [];
        let exportColumns = [];
        let fileName = '';
        let title = '';

        if (reportType === 'Overview' || reportType === 'Projects') {
            exportData = projectReport.map(p => ({
                Project: p.name,
                Client: p.client,
                Status: p.status,
                Budget: p.budget,
                Received: p.received,
                Spent: p.spent,
                Profit: p.profit,
                Remaining: p.remaining
            }));
            exportColumns = [
                { header: 'Project', key: 'Project' },
                { header: 'Client', key: 'Client' },
                { header: 'Status', key: 'Status' },
                { header: 'Budget (LKR)', key: 'Budget' },
                { header: 'Received (LKR)', key: 'Received' },
                { header: 'Spent (LKR)', key: 'Spent' },
                { header: 'Profit/Loss (LKR)', key: 'Profit' },
                { header: 'Balance (LKR)', key: 'Remaining' }
            ];
            fileName = 'Project_Summary_Report';
            title = 'Project Financial Summary Report';
        } else if (reportType === 'Workers') {
            exportData = workerReport.map(w => ({
                Worker: w.name,
                Role: w.role,
                Days: w.daysWorked,
                Earned: w.totalEarned,
                Paid: w.totalPaid,
                Adv: w.totalAdv,
                Due: w.outstanding
            }));
            exportColumns = [
                { header: 'Worker', key: 'Worker' },
                { header: 'Role', key: 'Role' },
                { header: 'Days Worked', key: 'Days' },
                { header: 'Total Earned', key: 'Earned' },
                { header: 'Total Paid', key: 'Paid' },
                { header: 'Advances', key: 'Adv' },
                { header: 'Outstanding', key: 'Due' }
            ];
            fileName = 'Worker_Payroll_Report';
            title = 'Worker Payroll & Performance Report';
        } else if (reportType === 'Performance') {
            exportData = perfData.map(w => ({
                Worker: w.name,
                Role: w.role,
                Attendance: `${w.attendanceRate}%`,
                Score: `${w.overall}%`,
                Grade: w.grade
            }));
            exportColumns = [
                { header: 'Worker', key: 'Worker' },
                { header: 'Role', key: 'Role' },
                { header: 'Attendance %', key: 'Attendance' },
                { header: 'Overall Score', key: 'Score' },
                { header: 'Grade', key: 'Grade' }
            ];
            fileName = 'Worker_Performance_Report';
            title = 'Worker Performance Rankings';
        }

        setIsLoading(true);
        setIsLoading(true);
        try {
            if (format === 'pdf') await exportToPDF({ title, data: exportData, columns: exportColumns, fileName });
            else if (format === 'excel') exportToExcel({ title, data: exportData, columns: exportColumns, fileName });
            else if (format === 'word') await exportToWord({ title, data: exportData, columns: exportColumns, fileName });
            else if (format === 'csv') exportToCSV(exportData, fileName);
        } catch (e) {
            console.error("Export failed:", e);
        } finally {
            setIsLoading(false);
        }
    };


    // Column definitions for tables
    const projectColumns = [
        { key: 'name', label: 'Project' },
        { key: 'client', label: 'Client' },
        { key: 'budget', label: 'Budget', render: (v) => fmt(v) },
        { key: 'received', label: 'Received', render: (v) => <span className="amount-in">{fmt(v)}</span> },
        { key: 'spent', label: 'Spent', render: (v) => <span className="amount-out">{fmt(v)}</span> },
        { key: 'profit', label: 'Profit', render: (v) => <span className={v >= 0 ? 'amount-in' : 'amount-out'}>{fmt(v)}</span> },
        { key: 'status', label: 'Status', render: (v) => <span className={`badge ${v === 'Ongoing' ? 'badge-info' : v === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{v}</span> },
    ];

    const workerColumns = [
        { key: 'name', label: 'Worker' },
        { key: 'role', label: 'Role' },
        { key: 'dailyRate', label: 'Rate/Day', render: (v) => fmt(v) },
        { key: 'daysWorked', label: 'Days' },
        { key: 'totalEarned', label: 'Earned', render: (v) => fmt(v) },
        { key: 'totalPaid', label: 'Paid', render: (v) => fmt(v) },
        { key: 'outstanding', label: 'Outstanding', render: (v) => <span className={v > 0 ? 'amount-out' : ''}>{fmt(v)}</span> },
        { key: 'status', label: 'Status', render: (v) => <span className={`badge ${v === 'Active' ? 'badge-success' : 'badge-default'}`}>{v}</span> },
    ];

    return (
        <div className="reports-page">
            <div className="page-header">
                <h1>Reports & Analytics</h1>
                <ExportDropdown onExport={handleExport} isLoading={isLoading} />
            </div>

            {/* Filters */}
            <div className="reports-filters">
                <div className="filter-group">
                    <label>Report View</label>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                        <option>Overview</option><option>Projects</option><option>Workers</option><option>Performance</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>From</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="filter-group">
                    <label>To</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                {(dateFrom || dateTo) && (
                    <BounceButton className="btn btn-secondary btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</BounceButton>
                )}
            </div>

            {/* ========================================= */}
            {/* OVERVIEW TAB                              */}
            {/* ========================================= */}
            {reportType === 'Overview' && (
                <>
                    {/* KPI Cards */}
                    <div className="report-summary-cards">
                        <Card className="report-summary-card kpi-in">
                            <div className="card-label">Money In</div>
                            <div className="card-value" style={{ color: '#10b981' }}><span className="currency-prefix">LKR</span> <CountUp to={metrics.totalIn} separator="," /></div>
                        </Card>
                        <Card className="report-summary-card kpi-out">
                            <div className="card-label">Money Out</div>
                            <div className="card-value" style={{ color: '#ef4444' }}><span className="currency-prefix">LKR</span> <CountUp to={metrics.totalOut} separator="," /></div>
                        </Card>
                        <Card className="report-summary-card kpi-net">
                            <div className="card-label">Net Cash Flow</div>
                            <div className="card-value" style={{ color: metrics.net >= 0 ? '#10b981' : '#ef4444' }}><span className="currency-prefix">LKR</span> <CountUp to={metrics.net} separator="," /></div>
                        </Card>
                        <Card className="report-summary-card">
                            <div className="card-label">Total Budget</div>
                            <div className="card-value" style={{ color: '#6366f1' }}><span className="currency-prefix">LKR</span> <CountUp to={metrics.totalBudget} separator="," /></div>
                        </Card>
                    </div>

                    <div className="stat-pills">
                        <span className="pill"><strong><CountUp to={metrics.activeProjects} /></strong> Active Projects</span>
                        <span className="pill"><strong><CountUp to={metrics.activeWorkers} /></strong> Active Workers</span>
                        <span className="pill"><strong><CountUp to={materials.length} /></strong> Materials</span>
                        <span className="pill"><strong><CountUp to={suppliers.length} /></strong> Suppliers</span>
                        <span className="pill"><strong><CountUp to={metrics.txCount} /></strong> Transactions</span>
                    </div>

                    {/* Charts row 1: Pies */}
                    <div className="chart-row">
                        <Card title="Expense Breakdown" className="chart-card">
                            {expensePie.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie data={expensePie} cx="50%" cy="50%" innerRadius={55} outerRadius={100}
                                            paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {expensePie.map((entry, i) => (
                                                <Cell key={i} fill={CAT_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<PieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <div className="chart-empty">No expense data</div>}
                        </Card>

                        <Card title="Income by Project" className="chart-card">
                            {incomePie.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie data={incomePie} cx="50%" cy="50%" innerRadius={55} outerRadius={100}
                                            paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name.slice(0, 12)} ${(percent * 100).toFixed(0)}%`}>
                                            {incomePie.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<PieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <div className="chart-empty">No income data</div>}
                        </Card>
                    </div>

                    {/* Chart row 2: Monthly cash flow */}
                    <Card title="Monthly Cash Flow" className="chart-card-full">
                        {monthlyFlow.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={monthlyFlow} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="label" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                    <YAxis tickFormatter={fmtShort} fontSize={12} tick={{ fill: '#94a3b8' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Area type="monotone" dataKey="In" stroke="#10b981" fill="url(#gradIn)" strokeWidth={2} name="Money In" />
                                    <Area type="monotone" dataKey="Out" stroke="#ef4444" fill="url(#gradOut)" strokeWidth={2} name="Money Out" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <div className="chart-empty">No transaction data</div>}
                    </Card>

                    {/* Chart row 3: Project comparison */}
                    <Card title="Project: Income vs Expense" className="chart-card-full">
                        {projectBars.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={projectBars} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                    <YAxis tickFormatter={fmtShort} fontSize={12} tick={{ fill: '#94a3b8' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="chart-empty">No project data</div>}
                    </Card>
                </>
            )}

            {/* ========================================= */}
            {/* PROJECTS TAB                              */}
            {/* ========================================= */}
            {reportType === 'Projects' && (
                <>
                    <Card title="Project Financial Summary">
                        <DataTable columns={projectColumns} data={projectReport} emptyMessage="No projects" />
                    </Card>

                    <Card title="Budget vs Received vs Spent" className="chart-card-full" style={{ marginTop: 20 }}>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={projectReport.map((p) => ({ name: p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name, Budget: p.budget, Received: p.received, Spent: p.spent }))}
                                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                <YAxis tickFormatter={fmtShort} fontSize={12} tick={{ fill: '#94a3b8' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="Budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </>
            )}

            {/* ========================================= */}
            {/* WORKERS TAB                               */}
            {/* ========================================= */}
            {reportType === 'Workers' && (
                <>
                    <Card title="Worker Payroll Summary">
                        <DataTable columns={workerColumns} data={workerReport} emptyMessage="No workers" />
                    </Card>

                    {workerBars.length > 0 && (
                        <Card title="Earned vs Paid by Worker" className="chart-card-full" style={{ marginTop: 20 }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={workerBars} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                    <YAxis tickFormatter={fmtShort} fontSize={12} tick={{ fill: '#94a3b8' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="Earned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    )}
                </>
            )}

            {/* ========================================= */}
            {/* PERFORMANCE TAB                           */}
            {/* ========================================= */}
            {reportType === 'Performance' && (
                <>
                    {/* Top KPI row */}
                    <div className="report-summary-cards">
                        <Card className="report-summary-card" style={{ borderLeft: '3px solid #6366f1' }}>
                            <div className="card-label">Avg Attendance</div>
                            <div className="card-value" style={{ color: '#6366f1' }}>
                                <CountUp to={perfData.length > 0 ? Math.round(perfData.reduce((s, w) => s + w.attendanceRate, 0) / perfData.length) : 0} />%
                            </div>
                        </Card>
                        <Card className="report-summary-card" style={{ borderLeft: '3px solid #10b981' }}>
                            <div className="card-label">Avg Performance</div>
                            <div className="card-value" style={{ color: '#10b981' }}>
                                <CountUp to={perfData.length > 0 ? Math.round(perfData.reduce((s, w) => s + w.overall, 0) / perfData.length) : 0} />%
                            </div>
                        </Card>
                        <Card className="report-summary-card" style={{ borderLeft: '3px solid #f59e0b' }}>
                            <div className="card-label">Active Workers</div>
                            <div className="card-value" style={{ color: '#f59e0b' }}><CountUp to={perfData.length} /></div>
                        </Card>
                        <Card className="report-summary-card" style={{ borderLeft: '3px solid #8b5cf6' }}>
                            <div className="card-label">Top Performer</div>
                            <div className="card-value" style={{ color: '#8b5cf6', fontSize: '1rem' }}>
                                {perfData.length > 0 ? perfData[0].name : '—'}
                            </div>
                        </Card>
                    </div>

                    {/* Performance Score Cards */}
                    <div className="perf-cards-grid">
                        {perfData.map((w) => (
                            <Card key={w.id} className="perf-card">
                                <div className="perf-card-header">
                                    <div>
                                        <div className="perf-name">{w.name}</div>
                                        <div className="perf-role">{w.role} · {fmt(w.dailyRate)}/day</div>
                                    </div>
                                    <div className={`perf-grade grade-${w.grade.replace('+', 'plus')}`}>{w.grade}</div>
                                </div>
                                <div className="perf-score-ring">
                                    <svg viewBox="0 0 100 100" className="ring-svg">
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                                        <circle cx="50" cy="50" r="42" fill="none"
                                            stroke={w.overall >= 80 ? '#10b981' : w.overall >= 60 ? '#f59e0b' : '#ef4444'}
                                            strokeWidth="8" strokeLinecap="round"
                                            strokeDasharray={`${w.overall * 2.64} 264`}
                                            transform="rotate(-90 50 50)" />
                                    </svg>
                                    <div className="ring-label"><CountUp to={w.overall} />%</div>
                                </div>
                                <div className="perf-metrics">
                                    <div className="perf-metric">
                                        <span>Attendance</span>
                                        <div className="perf-bar-track"><div className="perf-bar-fill" style={{ width: `${w.attendanceRate}%`, background: '#6366f1' }} /></div>
                                        <span className="perf-val"><CountUp to={w.attendanceRate} />%</span>
                                    </div>
                                    <div className="perf-metric">
                                        <span>Pay Settled</span>
                                        <div className="perf-bar-track"><div className="perf-bar-fill" style={{ width: `${w.paySettlement}%`, background: '#10b981' }} /></div>
                                        <span className="perf-val"><CountUp to={w.paySettlement} />%</span>
                                    </div>
                                    <div className="perf-metric">
                                        <span>Adv. Discipline</span>
                                        <div className="perf-bar-track"><div className="perf-bar-fill" style={{ width: `${w.advanceScore}%`, background: '#f59e0b' }} /></div>
                                        <span className="perf-val"><CountUp to={w.advanceScore} />%</span>
                                    </div>
                                </div>
                                <div className="perf-stats">
                                    <span><CountUp to={w.effectiveDays} /> days</span>
                                    <span>{w.projectCount} project{w.projectCount !== 1 ? 's' : ''}</span>
                                    <span>LKR <CountUp to={w.totalEarned} separator="," /></span>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Charts row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                        <Card title="Attendance Rate Comparison" className="chart-card">
                            {attendanceBars.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={attendanceBars} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} tick={{ fill: '#94a3b8' }} />
                                        <YAxis type="category" dataKey="name" fontSize={12} tick={{ fill: '#94a3b8' }} width={60} />
                                        <Tooltip formatter={(v) => `${v}%`} />
                                        <Bar dataKey="Rate" radius={[0, 4, 4, 0]}>
                                            {attendanceBars.map((entry, i) => (
                                                <Cell key={i} fill={entry.Rate >= 80 ? '#10b981' : entry.Rate >= 60 ? '#f59e0b' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="chart-empty">No attendance data</div>}
                        </Card>

                        <Card title="Cost Efficiency: Earned vs Paid vs Advances" className="chart-card">
                            {costEffBars.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={costEffBars} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="name" fontSize={12} tick={{ fill: '#94a3b8' }} />
                                        <YAxis tickFormatter={fmtShort} fontSize={12} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar dataKey="Earned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Advances" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="chart-empty">No cost data</div>}
                        </Card>
                    </div>

                    {/* Ranking table */}
                    <Card title="Worker Performance Ranking" style={{ marginTop: 20 }}>
                        <DataTable
                            columns={[
                                { key: 'rank', label: '#', render: (_, __, i) => <strong>{i + 1}</strong> },
                                { key: 'name', label: 'Worker' },
                                { key: 'role', label: 'Role' },
                                { key: 'attendanceRate', label: 'Attendance', render: (v) => <span className={v >= 80 ? 'amount-in' : v >= 60 ? '' : 'amount-out'}>{v}%</span> },
                                { key: 'effectiveDays', label: 'Days' },
                                { key: 'paySettlement', label: 'Pay Settled', render: (v) => `${v}%` },
                                { key: 'advanceRatio', label: 'Adv. Ratio', render: (v) => <span className={v > 20 ? 'amount-out' : ''}>{v}%</span> },
                                { key: 'overall', label: 'Score', render: (v) => <strong style={{ color: v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444' }}>{v}%</strong> },
                                { key: 'grade', label: 'Grade', render: (v) => <span className={`perf-badge grade-${v.replace('+', 'plus')}`}>{v}</span> },
                            ]}
                            data={perfData}
                            emptyMessage="No active workers to evaluate"
                        />
                    </Card>
                </>
            )}
        </div>
    );
}
