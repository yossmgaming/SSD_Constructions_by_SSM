import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BounceButton from '../components/BounceButton';
import { useAuth } from '../context/AuthContext';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';
import { useAsyncData } from '../hooks/useAsyncData';
import { getAll, queryEq, queryAdvanced, KEYS } from '../data/db';
import { supabase } from '../data/supabase';

// Sub-dashboards
import AdminDashboard from './AdminDashboard';
import WorkerDashboard from './WorkerDashboard';
import ClientDashboard from './ClientDashboard';
import SupplierDashboard from './SupplierDashboard';
import SubContractorDashboard from './SubContractorDashboard';
import ProjectManagerDashboard from './ProjectManagerDashboard';
import SupervisorDashboard from './SupervisorDashboard';
import AIChatAssistant from '../components/AI/AIChatAssistant';
import './Dashboard.css';

export default function Dashboard() {
    const { t } = useTranslation();
    const { profile, identity, hasRole } = useAuth();

    // Debug: Log role for troubleshooting
    useEffect(() => {
        console.log('[Dashboard] User role:', profile?.role);
        console.log('[Dashboard] User profile:', profile);
    }, [profile]);

    // Admin-Specific State
    const [projects, setProjects] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [payments, setPayments] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const isClient = profile?.role === 'Client';
    const isWorker = profile?.role === 'Worker';
    const isPM = profile?.role === 'Project Manager';
    const isSupervisor = profile?.role === 'Site Supervisor';
    const isSupplier = profile?.role === 'Supplier';
    const isSubContractor = profile?.role === 'Sub Contractor';
    const isAdminView = hasRole(['Super Admin', 'Finance']);

    useEffect(() => {
        if (isAdminView) loadAdminData();
    }, [profile?.id, isAdminView]);

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

    async function loadAdminData() {
        setIsLoading(true);
        try {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const dateFrom = sixMonthsAgo.toISOString().split('T')[0];

            // Load master lists and financial data for Admin/Finance ONLY
            const [p, w, m, pay, adv] = await Promise.all([
                supabase.from('projects').select('*').eq('status', 'Ongoing'),
                queryEq(KEYS.workers, 'status', 'Active', 'id, fullName, role, status'),
                getAll(KEYS.materials, 'id'),
                queryAdvanced(KEYS.payments, {
                    filters: { range: { column: 'date', from: dateFrom } },
                    select: 'id, amount, direction, category, projectId, workerId, date, createdAt'
                }),
                queryAdvanced(KEYS.advances, {
                    filters: { range: { column: 'date', from: dateFrom } },
                    select: 'id, amount, projectId, workerId, date, createdAt'
                })
            ]);

            setProjects(p.data || []);
            setWorkers(w || []);
            setMaterials(m || []);
            setPayments(pay || []);
            setAdvances(adv || []);

            // Build global activity feed
            const feed = [];
            (p.data || []).slice(0, 5).forEach(r =>
                feed.push({ text: `Project "${r.name}" created`, time: r.createdAt, color: 'blue' })
            );
            (w || []).slice(0, 5).forEach(r =>
                feed.push({ text: `Worker ${r.fullName} added`, time: r.createdAt, color: 'green' })
            );
            (pay || []).slice(0, 8).forEach(r => {
                feed.push({
                    text: `${r.direction === 'In' ? '↗' : '↙'} ${r.category}: LKR ${(r.amount || 0).toLocaleString()}`,
                    time: r.createdAt || r.date, color: r.direction === 'In' ? 'green' : 'rose'
                });
            });

            feed.sort((a, b) => new Date(b.time) - new Date(a.time));
            setActivities(feed.slice(0, 10).map(a => ({ ...a, time: timeAgo(a.time) })));

        } catch (error) {
            console.error('[Dashboard] Admin load error:', error);
        } finally {
            setIsLoading(false);
        }
    }

    // Formatters for Admin view
    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
    const fmtShort = (v) => {
        if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
        if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
        return v;
    };

    const metrics = useMemo(() => {
        const totalIn = payments.filter(p => p.direction === 'In').reduce((s, p) => s + (p.amount || 0), 0);
        const paymentsOut = payments.filter(p => p.direction === 'Out').reduce((s, p) => s + (p.amount || 0), 0);
        const advancesOut = advances.reduce((s, a) => s + (a.amount || 0), 0);
        const totalOut = paymentsOut + advancesOut;
        return { totalIn, totalOut, net: totalIn - totalOut, activeProjects: projects.length, activeWorkers: workers.length };
    }, [payments, advances, projects, workers]);

    const { data: monthlyFlow, isComputing: isComputingMF } = useAsyncData(async () => {
        const months = {};
        payments.forEach(p => {
            const m = p.date ? p.date.slice(0, 7) : null;
            if (!m) return;
            if (!months[m]) months[m] = { month: m, In: 0, Out: 0 };
            if (p.direction === 'In') months[m].In += (p.amount || 0);
            else months[m].Out += (p.amount || 0);
        });
        return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
            .map(m => ({ ...m, label: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }) }));
    }, [payments], []);

    const { data: expensePie, isComputing: isComputingEP } = useAsyncData(async () => {
        const cats = {};
        payments.filter(p => p.direction === 'Out').forEach(p => {
            cats[p.category || 'Other'] = (cats[p.category || 'Other'] || 0) + (p.amount || 0);
        });
        return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [payments], []);

    const { data: projectProgress, isComputing: isComputingPP } = useAsyncData(async () => {
        return projects.slice(0, 5).map(p => {
            const budget = p.contractValue || p.budget || 0;
            const received = payments.filter(pay => pay.projectId === p.id && pay.direction === 'In').reduce((s, pay) => s + (pay.amount || 0), 0);
            const spent = payments.filter(pay => pay.projectId === p.id && pay.direction === 'Out').reduce((s, pay) => s + (pay.amount || 0), 0);
            return {
                name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
                Budget: budget, Received: received, Spent: spent,
                pct: budget > 0 ? Math.round((received / budget) * 100) : 0
            };
        });
    }, [projects, payments], []);

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
        return <div className="dash-tooltip"><p><strong>{payload[0].name}:</strong> {fmt(payload[0].value)}</p></div>;
    };

    const isGlobalLoading = isAdminView && (isLoading || isComputingMF || isComputingEP || isComputingPP);

    // ─── Routing Core ───────────────────────────────────────────
    const renderSpecializedDashboard = () => {
        if (isWorker) return <WorkerDashboard />;
        if (isClient) return <ClientDashboard />;
        if (isPM) return <ProjectManagerDashboard />;
        if (isSupervisor) return <SupervisorDashboard />;
        if (isSupplier) return <SupplierDashboard />;
        if (isSubContractor) return <SubContractorDashboard />;
        return null;
    };

    const specializedDashboard = renderSpecializedDashboard();

    return (
        <GlobalLoadingOverlay loading={isGlobalLoading} message="Preparing Portal...">
            <div className="dashboard">
                <div className="page-header">
                    <h1>{t('dashboard.title')}</h1>
                    {isAdminView && (
                        <BounceButton disabled={isLoading} className="btn btn-primary" onClick={loadAdminData}>
                            {t('dashboard.refresh')}
                        </BounceButton>
                    )}
                </div>

                {specializedDashboard || (
                    <AdminDashboard
                        metrics={metrics}
                        monthlyFlow={monthlyFlow}
                        expensePie={expensePie}
                        projectProgress={projectProgress}
                        activities={activities}
                        projects={projects}
                        t={t}
                        fmt={fmt}
                        fmtShort={fmtShort}
                        ChartTooltip={ChartTooltip}
                        PieTooltip={PieTooltip}
                    />
                )}

                {isAdminView && <AIChatAssistant />}
            </div>
        </GlobalLoadingOverlay>
    );
}
