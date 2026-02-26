import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import Card from '../components/Card';
import { Clock, Users, HardHat, ShieldCheck, MapPin } from 'lucide-react';
import CountUp from '../components/CountUp';
import './Dashboard.css';

export default function SupervisorDashboard() {
    const { t } = useTranslation();
    const { profile, identity } = useAuth();

    const [projects, setProjects] = useState([]);
    const [activities, setActivities] = useState([]);
    const [stats, setStats] = useState({ workersOnSite: 0, totalAssigned: 0 });
    const [isLoading, setIsLoading] = useState(true);

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
            // 1. Fetch projects assigned to Supervisor
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

                // 2. Fetch daily attendance for these projects
                const today = new Date().toISOString().split('T')[0];
                const { data: todayAtt } = await supabase
                    .from('attendances')
                    .select('*')
                    .in('projectId', allowedIds)
                    .eq('date', today)
                    .eq('isPresent', true);

                const { count: totalWorkers } = await supabase
                    .from('projectWorkers')
                    .select('*', { count: 'exact', head: true })
                    .in('projectId', allowedIds);

                setStats({
                    workersOnSite: (todayAtt || []).length,
                    totalAssigned: totalWorkers || 0
                });

                // 3. Activity feed: Focus on recent attendance and projects
                const feed = [];
                (p || []).forEach(r =>
                    feed.push({ text: `Supervising site: ${r.name}`, time: r.createdAt, color: 'blue' })
                );
                (todayAtt || []).slice(0, 5).forEach(r => {
                    feed.push({
                        text: `Worker Present at Site`,
                        time: r.createdAt || today, color: 'emerald'
                    });
                });

                feed.sort((a, b) => new Date(b.time) - new Date(a.time));
                setActivities(feed.slice(0, 10).map(a => ({ ...a, time: timeAgo(a.time) })));
            }
        } catch (e) {
            console.error('[SupervisorDashboard] Load error:', e);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="supervisor-dashboard">
            <div className="worker-welcome">
                <div className="welcome-text">
                    <h2>{t('dashboard.welcome_back')}, {profile?.full_name || 'Supervisor'}</h2>
                    <p>{t('dashboard.supervisor_subtitle', 'Monitoring site attendance and project progress.')}</p>
                </div>
                <div className="worker-status-badge supervisor-badge">
                    <ShieldCheck size={18} />
                    <span>{profile?.role} Access</span>
                </div>
            </div>

            <div className="dashboard-stats">
                <Card className="stat-card indigo">
                    <div className="stat-icon indigo">
                        <MapPin size={22} />
                    </div>
                    <div className="card-label">Active Sites</div>
                    <div className="card-value"><CountUp to={projects.length} /></div>
                    <div className="stat-sub">Direct Supervision</div>
                </Card>

                <Card className="stat-card emerald">
                    <div className="stat-icon emerald">
                        <Users size={22} />
                    </div>
                    <div className="card-label">Workers on Site Today</div>
                    <div className="card-value"><CountUp to={stats.workersOnSite} /></div>
                    <div className="stat-sub">Out of {stats.totalAssigned} assigned</div>
                </Card>

                <Card className="stat-card amber">
                    <div className="stat-icon amber">
                        <Clock size={22} />
                    </div>
                    <div className="card-label">Daily Status</div>
                    <div className="card-value" style={{ fontSize: '1.2rem' }}>Live Tracking</div>
                    <div className="stat-sub">Updated just now</div>
                </Card>
            </div>

            <div className="dashboard-grid">
                <Card title="My Sites">
                    {projects.length === 0 ? (
                        <div className="empty-state">No sites assigned for supervision.</div>
                    ) : (
                        projects.map((p) => (
                            <div className="project-mini" key={p.id}>
                                <div className="flex-grow">
                                    <div className="project-mini-name">{p.name}</div>
                                    <div className="text-xs text-slate-400">{p.location || 'No location set'}</div>
                                </div>
                                <span className={`badge ${p.status === 'Ongoing' ? 'badge-info' : 'badge-warning'}`}>
                                    {p.status}
                                </span>
                            </div>
                        ))
                    )}
                </Card>

                <Card title="Live Site Feed">
                    {activities.length === 0 ? (
                        <div className="empty-state">No site activity reported.</div>
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
