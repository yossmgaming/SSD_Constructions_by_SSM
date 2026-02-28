import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import { TrendingUp, CheckCircle, Clock, ShieldCheck, DollarSign, Wallet } from 'lucide-react';
import CountUp from '../components/CountUp';
import './Dashboard.css';
import { supabase } from '../data/supabase';
import DocumentVault from '../components/role-components/DocumentVault';

export default function ClientDashboard() {
    const { t } = useTranslation();
    const { profile, identity } = useAuth();

    // Independent State
    const [projects, setProjects] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState(null);

    const fmt = (val) => new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        maximumFractionDigits: 0
    }).format(val || 0);

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

    useEffect(() => {
        console.log('[ClientDashboard] identity:', identity, 'profile:', profile);
        loadData();
    }, [identity?.id, profile?.target_id]);

    async function loadData() {
        if (!identity?.id) {
            console.log('[ClientDashboard] No identity found - user may not be linked to a client record');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // 1. Fetch client's projects using target_id (not identity.id)
            let projectData = [];
            if (profile?.target_id) {
                const { data: p } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', profile.target_id);
                projectData = p || [];
            } else {
                // Fallback: try client_id matching
                const { data: p } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('client_id', identity.id);
                projectData = p || [];
            }
            setProjects(projectData);

            if (projectData.length > 0 && !selectedProjectId) {
                setSelectedProjectId(projectData[0].id);
            }

            if (projectData.length > 0) {
                const projectIds = projectData.map(x => x.id);

                // 2. Fetch notifications/activities for these projects
                const { data: recentPays } = await supabase
                    .from('payments')
                    .select('id, category, date, createdAt, projectId')
                    .in('projectId', projectIds)
                    .order('createdAt', { ascending: false })
                    .limit(10);

                const feed = [];
                (projectData || []).forEach(r =>
                    feed.push({ text: `Project "${r.name}" started successfully`, time: r.createdAt || r.startDate, color: 'blue' })
                );
                (recentPays || []).forEach(r => {
                    const proj = projectData.find(x => x.id === r.projectId);
                    feed.push({
                        text: `Update: ${r.category || 'Payment'} processed for ${proj?.name || 'project'}`,
                        time: r.createdAt || r.date, color: 'emerald'
                    });
                });

                feed.sort((a, b) => new Date(b.time) - new Date(a.time));
                setActivities(feed.slice(0, 10).map(a => ({ ...a, time: timeAgo(a.time) })));
            }
        } catch (e) {
            console.error('[ClientDashboard] Load error:', e);
        } finally {
            setIsLoading(false);
        }
    }

    const totalContractValue = projects.reduce((sum, p) => sum + (p.contractValue || p.budget || 0), 0);
    // Note: In the real app, we would fetch paid amounts per project for the client.
    // For the dashboard, we'll assume the 'projects' passed in contains the necessary financial summary.

    return (
        <div className="client-dashboard">
            <div className="worker-welcome">
                <div className="welcome-text">
                    <h2>{t('dashboard.welcome_back')}, {profile?.full_name || 'Client'}</h2>
                    <p>{t('dashboard.client_subtitle', 'Overview of your construction projects and financial status.')}</p>
                </div>
                <div className="worker-status-badge client-badge">
                    <ShieldCheck size={18} />
                    <span>{profile?.role} Access</span>
                </div>
            </div>

            <div className="dashboard-stats">
                <Card className="stat-card indigo">
                    <div className="stat-icon indigo">
                        <TrendingUp size={22} />
                    </div>
                    <div className="card-label">{t('projects.contract_value')}</div>
                    <div className="card-value">{fmt(totalContractValue)}</div>
                    <div className="stat-sub">{projects.length} {t('projects.active_now', 'Active Projects')}</div>
                </Card>

                <Card className="stat-card emerald">
                    <div className="stat-icon emerald">
                        <CheckCircle size={22} />
                    </div>
                    <div className="card-label">Overall Progress</div>
                    <div className="card-value">
                        <CountUp to={projects.length > 0 ? (projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length) : 0} />%
                    </div>
                    <div className="stat-sub">{projects.filter(p => p.status === 'Completed').length} Projects Completed</div>
                </Card>
            </div>

            <div className="dashboard-grid">
                <Card title={t('dashboard.my_projects', 'My Projects')}>
                    {projects.length === 0 ? (
                        <div className="empty-state">{t('dashboard.no_projects_found', 'No project data available.')}</div>
                    ) : (
                        projects.map((p) => (
                            <div className="project-mini" key={p.id}>
                                <div className="flex-grow">
                                    <div className="project-mini-name">{p.name}</div>
                                    <div className="project-mini-progress-wrapper">
                                        <div className="progress-bar-mini">
                                            <div className="progress-fill-mini" style={{ width: `${p.progress || 0}%` }} />
                                        </div>
                                        <span className="text-xs text-slate-400">{p.progress || 0}%</span>
                                    </div>
                                </div>
                                <span className={`badge ${p.status === 'Ongoing' ? 'badge-info' : 'badge-warning'}`}>
                                    {p.status}
                                </span>
                            </div>
                        ))
                    )}
                </Card>

                <Card title={t('dashboard.latest_notifications', 'Latest Notifications')}>
                    {activities.length === 0 ? (
                        <div className="empty-state">{t('dashboard.no_recent_notifications', 'No new notifications.')}</div>
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

            {selectedProjectId && (
                <div className="dashboard-grid-full">
                    <Card>
                        {projects.length > 1 && (
                            <div className="mb-4">
                                <label className="text-sm font-semibold text-slate-700 mr-3">Select Project Vault:</label>
                                <select
                                    className="p-2 border border-slate-200 rounded-md text-sm bg-slate-50"
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                >
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <DocumentVault projectId={selectedProjectId} readOnly={true} />
                    </Card>
                </div>
            )}
        </div>
    );
}
