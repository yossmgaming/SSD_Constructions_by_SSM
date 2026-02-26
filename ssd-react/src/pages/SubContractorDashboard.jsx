import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import Card from '../components/Card';
import { HardHat, ConstructionIcon, ClipboardList, ShieldCheck, DollarSign } from 'lucide-react';
import CountUp from '../components/CountUp';
import './Dashboard.css';
import SubcontractorClaimsForm from '../components/role-components/SubcontractorClaimsForm';

export default function SubContractorDashboard() {
    const { t } = useTranslation();
    const { profile, identity } = useAuth();
    const [projects, setProjects] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    const contractorName = identity?.name || profile?.full_name || 'Sub Contractor';
    const contractorId = identity?.id || null;

    useEffect(() => {
        if (!contractorId) {
            setLoading(false);
            return;
        }
        loadData();
    }, [contractorId]);

    async function loadData() {
        setLoading(true);
        try {
            // Sub-contractors are now linked to projects via the project_subcontractors junction table
            const { data: assignments, error: assignError } = await supabase
                .from('project_subcontractors')
                .select(`
                    id,
                    projectId,
                    amount,
                    startDate,
                    endDate,
                    projects (id, name, status, progress, budget, contractValue)
                `)
                .eq('subcontractorId', contractorId);

            if (assignError) throw assignError;

            const payResult = await supabase
                .from('payments')
                .select('id, amount, direction, category, date, createdAt')
                .eq('subcontractorId', contractorId)
                .order('date', { ascending: false })
                .limit(20);

            setProjects(assignments || []);
            setPayments(payResult.data || []);
        } catch (e) {
            console.error('[SubContractorDashboard] Load error:', e);
        } finally {
            setLoading(false);
        }
    }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
    const totalPaid = payments.filter(p => p.direction === 'Out').reduce((s, p) => s + (p.amount || 0), 0);

    return (
        <div className="worker-dashboard">
            <div className="worker-welcome">
                <div className="welcome-text">
                    <h2>{t('dashboard.welcome_back')}, {contractorName}</h2>
                    <p>Your sub-contractor portal — assigned projects and financial overview.</p>
                </div>
                <div className="worker-status-badge" style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)' }}>
                    <ShieldCheck size={18} />
                    <span>Sub Contractor Access</span>
                </div>
            </div>

            {/* Identity Card */}
            {identity && (
                <Card className="mb-6" style={{ background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)', border: '1px solid #fecdd3' }}>
                    <div className="flex items-center gap-4 p-2">
                        <div style={{ background: '#e11d48', borderRadius: '50%', padding: 10 }}>
                            <HardHat size={20} color="#fff" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">Linked Sub-Contractor Record</div>
                            <div className="font-bold text-slate-800">{identity.name}</div>
                            {identity.phone && <div className="text-sm text-slate-500">{identity.phone}</div>}
                            {identity.specialty && (
                                <span className="inline-block mt-1 text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">
                                    {identity.specialty}
                                </span>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            <div className="dashboard-stats">
                <Card className="stat-card indigo">
                    <div className="stat-icon indigo">
                        <ClipboardList size={22} />
                    </div>
                    <div className="card-label">Assigned Projects</div>
                    <div className="card-value"><CountUp to={projects.length} /></div>
                    <div className="stat-sub">Active engagements</div>
                </Card>

                <Card className="stat-card emerald">
                    <div className="stat-icon emerald">
                        <DollarSign size={22} />
                    </div>
                    <div className="card-label">Total Payments Received</div>
                    <div className="card-value" style={{ fontSize: '1.1rem' }}>{fmt(totalPaid)}</div>
                    <div className="stat-sub">From SSD accounts</div>
                </Card>
            </div>

            <div className="mt-6 mb-6">
                <SubcontractorClaimsForm subId={contractorId} assignments={projects.map(p => ({
                    id: p.id,
                    projectId: p.projectId,
                    projectName: p.projects?.name,
                    contractAmount: p.amount
                }))} />
            </div>

            <div className="dashboard-grid">
                <Card title="My Projects">
                    {loading ? (
                        <div className="empty-state">Loading...</div>
                    ) : (
                        projects.map(p => (
                            <div key={p.projects.id} className="project-mini flex-col items-stretch gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-purple-200 transition-all">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">{p.projects.name}</div>
                                        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">Building Project</div>
                                    </div>
                                    <span className={`badge ${p.projects.status === 'Ongoing' ? 'badge-info' : 'badge-warning'}`}>
                                        {p.projects.status}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-2 border-y border-slate-100/80">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase font-bold text-slate-400">Your Contract</span>
                                        <span className="text-sm font-bold text-emerald-600">LKR {Number(p.amount || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] uppercase font-bold text-slate-400">Dates</span>
                                        <span className="text-[10px] font-semibold text-slate-600">
                                            {p.startDate || '—'} to {p.endDate || '—'}
                                        </span>
                                    </div>
                                </div>

                                <div className="project-mini-progress-wrapper mb-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Overall Progress</span>
                                        <span className="text-xs font-bold text-purple-600">{p.projects.progress || 0}%</span>
                                    </div>
                                    <div className="progress-bar-mini w-full">
                                        <div className="progress-fill-mini" style={{ width: `${p.projects.progress || 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </Card>

                <Card title="Recent Payments">
                    {payments.length === 0 ? (
                        <div className="empty-state">No payment records found.</div>
                    ) : (
                        payments.slice(0, 8).map((p, i) => (
                            <div key={i} className="activity-item">
                                <div className={`activity-dot ${p.direction === 'Out' ? 'green' : 'blue'}`} />
                                <div>
                                    <div className="activity-text">{p.category || 'Payment'} — {fmt(p.amount)}</div>
                                    <div className="activity-time">{p.date || ''}</div>
                                </div>
                            </div>
                        ))
                    )}
                </Card>
            </div>
        </div>
    );
}
