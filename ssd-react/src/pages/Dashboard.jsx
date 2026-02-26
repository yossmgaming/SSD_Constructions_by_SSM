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
import './Dashboard.css';

export default function Dashboard() {
    const { t } = useTranslation();
    const [projects, setProjects] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [payments, setPayments] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { profile, identity, hasRole } = useAuth();

    const isClient = profile?.role === 'Client';
    const isWorker = profile?.role === 'Worker';
    const isSupervisorOrPM = profile?.role === 'Site Supervisor' || profile?.role === 'Project Manager';
    const isSupplier = profile?.role === 'Supplier';
    const isSubContractor = profile?.role === 'Sub Contractor';
    const isRestricted = isClient || isWorker || isSupplier || isSubContractor || isSupervisorOrPM;

    useEffect(() => { loadData(); }, [profile?.id, identity?.id]);

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
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const dateFrom = sixMonthsAgo.toISOString().split('T')[0];

            // ─── STEP 1: Determine which project IDs this user is allowed to see ───
            let allowedProjectIds = isRestricted ? [] : null; // Admin/Finance see ALL (null), everyone else starts with NONE ([])

            if (isWorker && identity?.id) {
                // Workers are linked to projects via the projectWorkers junction table
                const { data: assignments } = await supabase
                    .from('projectWorkers')
                    .select('projectId')
                    .eq('workerId', identity.id);

                allowedProjectIds = (assignments || []).map(a => a.projectId);
                console.log(`[Dashboard] Worker sees ${allowedProjectIds.length} assigned projects`);
            }

            if ((isSupervisorOrPM) && identity?.id) {
                // Supervisors/PMs: scope to their specific worker assignment
                const { data: assignments } = await supabase
                    .from('projectWorkers')
                    .select('projectId')
                    .eq('workerId', identity.id);
                if (assignments && assignments.length > 0) {
                    allowedProjectIds = assignments.map(a => a.projectId);
                }
            }

            if (isClient && identity?.id) {
                // Clients are linked to projects via projects.client_id
                const { data: clientProjects } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('client_id', identity.id);

                allowedProjectIds = (clientProjects || []).map(p => p.id);
                console.log(`[Dashboard] Client sees ${allowedProjectIds.length} projects`);
            }

            if (isSubContractor && identity?.id) {
                // Sub-Contractors are linked to projects via projects.subcontract_id
                const { data: contractorProjects } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('subcontract_id', identity.id);

                allowedProjectIds = (contractorProjects || []).map(p => p.id);
                console.log(`[Dashboard] Sub-Contractor sees ${allowedProjectIds.length} projects`);
            }

            if (isSupplier && identity?.id) {
                // Suppliers see projects where they have supplied materials (linked via payments)
                // OR we check if they have specific material records linked to projects
                const { data: supplierPays } = await supabase
                    .from('payments')
                    .select('projectId')
                    .eq('supplierId', identity.id);

                const projIds = (supplierPays || []).map(p => p.projectId).filter(Boolean);
                allowedProjectIds = [...new Set(projIds)];
                console.log(`[Dashboard] Supplier sees ${allowedProjectIds.length} projects through payment/supply history`);
            }

            // ─── STEP 2: Load projects scoped to allowed IDs ───
            let projectQuery = supabase
                .from('projects')
                .select('id, name, budget, contractValue, client, client_id, status, progress, createdAt')
                .eq('status', 'Ongoing');

            if (allowedProjectIds !== null) {
                if (allowedProjectIds.length === 0) {
                    // No projects assigned — short-circuit
                    setProjects([]);
                    setWorkers([]);
                    setMaterials([]);
                    setPayments([]);
                    setAdvances([]);
                    setActivities([]);
                    setIsLoading(false);
                    return;
                }
                projectQuery = projectQuery.in('id', allowedProjectIds);
            }

            const { data: p = [] } = await projectQuery;
            setProjects(p || []);

            // ─── STEP 3: Load supporting data ───
            // Only admin/finance need the full worker/material lists
            let w = [], m = [];
            if (!isRestricted) {
                [w, m] = await Promise.all([
                    queryEq(KEYS.workers, 'status', 'Active', 'id, fullName, role, status'),
                    getAll(KEYS.materials, 'id'),
                ]);
                setWorkers(w);
                setMaterials(m);
            }

            // ─── STEP 4: Load financial data ───
            let pay = [], adv = [];

            if (!isRestricted) {
                // Admin/Finance: load everything regardless of project count
                const [payResult, advResult] = await Promise.all([
                    queryAdvanced(KEYS.payments, {
                        filters: { range: { column: 'date', from: dateFrom } },
                        select: 'id, amount, direction, category, projectId, workerId, date, createdAt'
                    }),
                    queryAdvanced(KEYS.advances, {
                        filters: { range: { column: 'date', from: dateFrom } },
                        select: 'id, amount, projectId, workerId, date, createdAt'
                    }),
                ]);
                pay = payResult || [];
                adv = advResult || [];
            } else if (allowedProjectIds && allowedProjectIds.length > 0) {
                // Workers/Clients/Supervisors: only load financial data for their allowed projects
                const [payResult, advResult] = await Promise.all([
                    supabase
                        .from('payments')
                        .select('id, amount, direction, category, projectId, workerId, date, createdAt')
                        .in('projectId', allowedProjectIds)
                        .gte('date', dateFrom),
                    supabase
                        .from('advances')
                        .select('id, amount, projectId, workerId, date, createdAt')
                        .in('projectId', allowedProjectIds)
                        .gte('date', dateFrom),
                ]);
                pay = payResult.data || [];
                adv = advResult.data || [];
            }

            setPayments(pay);
            setAdvances(adv || []);

            // ─── STEP 4: Build activity feed scoped to allowed projects ───
            const feed = [];

            // Recent projects (scoped)
            const recentProjs = [...(p || [])].sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            ).slice(0, 5);
            recentProjs.forEach(r =>
                feed.push({ text: `Project "${r.name}" created`, time: r.createdAt, color: 'blue', projectId: r.id })
            );

            // Workers and materials only show for admin
            if (!isRestricted) {
                const [recentWorkers, recentMats] = await Promise.all([
                    queryAdvanced(KEYS.workers, { orderBy: { column: 'createdAt', ascending: false }, limit: 8, select: 'id, fullName, role, createdAt' }),
                    queryAdvanced(KEYS.materials, { orderBy: { column: 'createdAt', ascending: false }, limit: 5, select: 'id, name, createdAt' }),
                ]);
                recentWorkers?.forEach(r =>
                    feed.push({ text: `Worker ${r.fullName} added (${r.role})`, time: r.createdAt, color: 'green' })
                );
                recentMats?.forEach(r =>
                    feed.push({ text: `Material "${r.name}" registered`, time: r.createdAt, color: 'orange' })
                );
            }

            // Recent payments (already project-scoped above)
            const recentPays = [...pay].sort((a, b) =>
                new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
            ).slice(0, 8);
            recentPays.forEach(r => {
                const proj = (p || []).find(x => x.id === r.projectId);
                const dir = r.direction === 'In' ? '↗' : '↙';
                // Don't show financial amounts to Workers — just show project events
                if (!isWorker) {
                    feed.push({
                        text: `${dir} ${r.category || 'Payment'} — LKR ${(r.amount || 0).toLocaleString()} ${proj ? `(${proj.name})` : ''}`,
                        time: r.createdAt || r.date, color: r.direction === 'In' ? 'green' : 'rose', projectId: r.projectId
                    });
                }
            });

            // Recent advances (already project-scoped)
            const recentAdvs = [...(adv || [])].sort((a, b) =>
                new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
            ).slice(0, 5);
            recentAdvs.forEach(r => {
                const proj = (p || []).find(x => x.id === r.projectId);
                if (!isWorker) {
                    feed.push({
                        text: `↙ Advance — LKR ${(r.amount || 0).toLocaleString()} ${proj ? `(${proj.name})` : ''}`,
                        time: r.createdAt || r.date, color: 'rose', projectId: r.projectId
                    });
                }
            });

            feed.sort((a, b) => new Date(b.time) - new Date(a.time));
            setActivities(feed.slice(0, 10).map(a => ({ ...a, time: timeAgo(a.time) })));

        } catch (error) {
            console.error('[Dashboard] Load error:', error);
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

    const metrics = useMemo(() => {
        const totalIn = payments.filter(p => p.direction === 'In').reduce((s, p) => s + (p.amount || 0), 0);
        const paymentsOut = payments.filter(p => p.direction === 'Out').reduce((s, p) => s + (p.amount || 0), 0);
        const advancesOut = advances.reduce((s, a) => s + (a.amount || 0), 0);
        const totalOut = paymentsOut + advancesOut;
        return { totalIn, totalOut, net: totalIn - totalOut, activeProjects: projects.length, activeWorkers: workers.length };
    }, [payments, advances, projects, workers]);

    const { data: monthlyFlow, isComputing: isComputingMonthlyFlow } = useAsyncData(async () => {
        const months = {};
        payments.forEach(p => {
            const m = p.date ? p.date.slice(0, 7) : null;
            if (!m) return;
            if (!months[m]) months[m] = { month: m, In: 0, Out: 0 };
            if (p.direction === 'In') months[m].In += (p.amount || 0);
            else months[m].Out += (p.amount || 0);
        });
        advances.forEach(a => {
            const m = a.date ? a.date.slice(0, 7) : null;
            if (!m) return;
            if (!months[m]) months[m] = { month: m, In: 0, Out: 0 };
            months[m].Out += (a.amount || 0);
        });
        return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
            .map(m => ({ ...m, label: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }) }));
    }, [payments, advances], []);

    const { data: expensePie, isComputing: isComputingExpensePie } = useAsyncData(async () => {
        const cats = {};
        payments.filter(p => p.direction === 'Out').forEach(p => {
            const cat = p.category || 'Other';
            cats[cat] = (cats[cat] || 0) + (p.amount || 0);
        });
        const totalAdvances = advances.reduce((s, a) => s + (a.amount || 0), 0);
        if (totalAdvances > 0) cats['Advance'] = (cats['Advance'] || 0) + totalAdvances;
        return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [payments, advances], []);

    const { data: projectProgress, isComputing: isComputingProjectProgress } = useAsyncData(async () => {
        return projects.slice(0, 5).map(p => {
            const budget = p.contractValue || p.budget || 0;
            const projectPays = payments.filter(pay => pay.projectId === p.id);
            const projectAdvs = advances.filter(adv => adv.projectId === p.id);
            const received = projectPays.filter(pay => pay.direction === 'In').reduce((s, pay) => s + (pay.amount || 0), 0);
            const spent = projectPays.filter(pay => pay.direction === 'Out').reduce((s, pay) => s + (pay.amount || 0), 0)
                + projectAdvs.reduce((s, adv) => s + (adv.amount || 0), 0);
            return {
                name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
                Budget: budget, Received: received, Spent: spent,
                pct: budget > 0 ? Math.round((received / budget) * 100) : 0, status: p.status
            };
        });
    }, [projects, payments, advances], []);

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

    const isGlobalLoading = isLoading || isComputingMonthlyFlow || isComputingExpensePie || isComputingProjectProgress;

    return (
        <GlobalLoadingOverlay loading={isGlobalLoading} message="Calculating Dashboard Intelligence...">
            <div className="dashboard">
                <div className="page-header">
                    <h1>{t('dashboard.title')}</h1>
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={loadData}>{t('dashboard.refresh')}</BounceButton>
                </div>

                {(isWorker || isSupervisorOrPM) ? (
                    <WorkerDashboard
                        projects={projects}
                        activities={activities}
                    />
                ) : isClient ? (
                    <ClientDashboard
                        projects={projects}
                        activities={activities}
                        fmt={fmt}
                    />
                ) : isSupplier ? (
                    <SupplierDashboard />
                ) : isSubContractor ? (
                    <SubContractorDashboard />
                ) : (
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
            </div>
        </GlobalLoadingOverlay>
    );
}
