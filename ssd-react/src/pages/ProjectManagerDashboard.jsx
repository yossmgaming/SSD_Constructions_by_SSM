import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import Card from '../components/Card';
import { TrendingUp, ClipboardList, Users, ShieldCheck, Briefcase } from 'lucide-react';
import CountUp from '../components/CountUp';
import './Dashboard.css';
import ProjectTimeline from '../components/role-components/ProjectTimeline';
import ResourceAllocationView from '../components/role-components/ResourceAllocationView';
import ChangeOrderForm from '../components/role-components/ChangeOrderForm';


export default function ProjectManagerDashboard() {
    const { t } = useTranslation();
    const { profile, identity } = useAuth();

    const [projects, setProjects] = useState([]);
    const [activities, setActivities] = useState([]);
    const [stats, setStats] = useState({ workers: 0, budget: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const fmt = (val) => new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        maximumFractionDigits: 0
    }).format(val || 0);

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('dashboard.just_now');
        if (mins < 60) return `${mins}${t('dashboard.m_ago')}`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}${t('dashboard.h_ago')}`;
        const days = Math.floor(hrs / 24);
        return `${days}${t('dashboard.d_ago')}`;
    };

    useEffect(() => {
        loadData();
    }, [identity?.id]);

    async function loadData() {
        if (!identity?.id) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // 1. Fetch projects assigned to PM
            const { data: assignments } = await supabase
                .from('projectWorkers')
                .select('projectId')
                .eq('workerId', identity.id);

            const allowedIds = (assignments || []).map(a => a.projectId);

            if (allowedIds.length > 0) {
                const { data: p } = await supabase
                    .from('projects')
                    .select('*')
                    .in('id', allowedIds);
                setProjects(p || []);

                // 2. Fetch worker count for these projects
                const { count: workerCount } = await supabase
                    .from('projectWorkers')
                    .select('*', { count: 'exact', head: true })
                    .in('projectId', allowedIds);

                setStats({
                    workers: workerCount || 0,
                    budget: (p || []).reduce((s, x) => s + (x.contractValue || x.budget || 0), 0)
                });

                // 3. Fetch recent payments/activities
                const { data: recentPays } = await supabase
                    .from('payments')
                    .select('id, category, amount, date, createdAt, projectId')
                    .in('projectId', allowedIds)
                    .order('createdAt', { ascending: false })
                    .limit(5);

                const feed = [];
                (p || []).forEach(r =>
                    feed.push({ text: `Project oversight: ${r.name}`, time: r.createdAt, color: 'blue' })
                );
                (recentPays || []).forEach(r => {
                    const proj = p.find(x => x.id === r.projectId);
                    feed.push({
                        text: `${r.category}: ${fmt(r.amount)} ${proj ? `(${proj.name})` : ''}`,
                        time: r.createdAt || r.date, color: 'rose'
                    });
                });

                feed.sort((a, b) => new Date(b.time) - new Date(a.time));
                setActivities(feed.slice(0, 10).map(a => ({ ...a, time: timeAgo(a.time) })));
            }
        } catch (e) {
            console.error('[PMDashboard] Load error:', e);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="pm-dashboard">
            <div className="worker-welcome">
                <div className="welcome-text">
                    <h2>{t('dashboard.welcome_back')}, {profile?.full_name || 'PM'}</h2>
                    <p>{t('dashboard.pm_subtitle', 'Managing your assigned projects and team performance.')}</p>
                </div>
                <div className="worker-status-badge pm-badge">
                    <ShieldCheck size={18} />
                    <span>{profile?.role} Access</span>
                </div>
            </div>

            <div className="dashboard-stats">
                <Card className="stat-card indigo">
                    <div className="stat-icon indigo">
                        <Briefcase size={22} />
                    </div>
                    <div className="card-label">Managed Projects</div>
                    <div className="card-value"><CountUp to={projects.length} /></div>
                    <div className="stat-sub">Active Oversight</div>
                </Card>

                <Card className="stat-card emerald">
                    <div className="stat-icon emerald">
                        <Users size={22} />
                    </div>
                    <div className="card-label">Assigned Workforce</div>
                    <div className="card-value"><CountUp to={stats.workers} /></div>
                    <div className="stat-sub">Across all projects</div>
                </Card>

                <Card className="stat-card amber">
                    <div className="stat-icon amber">
                        <TrendingUp size={22} />
                    </div>
                    <div className="card-label">Total Managed Value</div>
                    <div className="card-value">{fmt(stats.budget)}</div>
                    <div className="stat-sub">Portfolio scale</div>
                </Card>
            </div>

            <div className="dashboard-grid-full">
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                    <ProjectTimeline projects={projects} />
                    <ResourceAllocationView projects={projects} />
                </div>
            </div>



            <div className="dashboard-grid">
                <Card title="Project Summary">
                    {projects.length === 0 ? (
                        <div className="empty-state">No projects assigned for management.</div>
                    ) : (
                        projects.map((p) => (
                            <div className="project-mini" key={p.id}>
                                <div className="flex-grow">
                                    <div className="project-mini-name">{p.name}</div>
                                    <div className="text-xs text-slate-400">{p.projectType} • {p.client}</div>
                                </div>
                                <span className={`badge ${p.status === 'Ongoing' ? 'badge-info' : 'badge-warning'}`}>
                                    {p.status}
                                </span>
                            </div>
                        ))
                    )}
                </Card>

                <ChangeOrderForm projects={projects} />

                <Card title="Recent Management Feed">
                    {activities.length === 0 ? (
                        <div className="empty-state">No recent activities found.</div>
                    ) : (
                        activities.map((a, i) => (
                            <div className="activity-item" key={i}>
                                <div className={`activity-dot ${a.color}`} />
                                <div>
                                    <div className="activity-text">{a.text}</div>
                                    <div className="activity-time">{a.time}</div>
                                </div>
                            </div>
                        ))
                    )}
                </Card>
            </div>
        </div>
    );
}
