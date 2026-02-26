import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import Card from '../components/Card';
import { Clock, ClipboardList, ShieldCheck } from 'lucide-react';
import CountUp from '../components/CountUp';
import './Dashboard.css';

export default function WorkerDashboard({ projects = [], activities = [] }) {
    const { t } = useTranslation();
    const { profile, identity } = useAuth();

    // Real attendance state
    const [attendanceDays, setAttendanceDays] = useState(null);
    const [loadingAtt, setLoadingAtt] = useState(false);

    useEffect(() => {
        fetchAttendance();
    }, [identity?.id]);

    async function fetchAttendance() {
        if (!identity?.id) return;
        setLoadingAtt(true);
        try {
            // Count attendance records for this month where isPresent = true
            const now = new Date();
            const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

            const { data: att } = await supabase
                .from('attendances')
                .select('id, isPresent, isHalfDay, hoursWorked, date')
                .eq('workerId', identity.id)
                .eq('isPresent', true)
                .gte('date', monthStart)
                .lte('date', monthEnd);

            // Count: full days + 0.5 per half day
            const days = (att || []).reduce((sum, a) => {
                const h = a.hoursWorked || (a.isHalfDay ? 4 : 8);
                return sum + (h / 8);
            }, 0);
            setAttendanceDays(Math.round(days * 10) / 10);
        } catch (e) {
            console.warn('[WorkerDashboard] Attendance fetch failed:', e.message);
        } finally {
            setLoadingAtt(false);
        }
    }

    return (
        <div className="worker-dashboard">
            <div className="worker-welcome">
                <div className="welcome-text">
                    <h2>{t('dashboard.welcome_back')}, {profile?.full_name || 'Worker'}</h2>
                    <p>{t('dashboard.worker_subtitle', 'Stay updated with your assigned projects and attendance.')}</p>
                </div>
                <div className="worker-status-badge">
                    <ShieldCheck size={18} />
                    <span>{profile?.role} Access</span>
                </div>
            </div>

            <div className="dashboard-stats">
                <Card className="stat-card indigo">
                    <div className="stat-icon indigo">
                        <ClipboardList size={22} />
                    </div>
                    <div className="card-label">{t('dashboard.assigned_projects', 'Assigned Projects')}</div>
                    <div className="card-value"><CountUp to={projects.length} /></div>
                    <div className="stat-sub">{t('dashboard.active_now', 'Active now')}</div>
                </Card>

                <Card className="stat-card emerald">
                    <div className="stat-icon emerald">
                        <Clock size={22} />
                    </div>
                    <div className="card-label">{t('dashboard.attendance_this_month', 'Attendance (Month)')}</div>
                    <div className="card-value">
                        {loadingAtt ? (
                            <span style={{ fontSize: '1rem', color: '#94a3b8' }}>—</span>
                        ) : !identity ? (
                            <span style={{ fontSize: '0.8rem', color: '#f87171' }}>ID Link Missing</span>
                        ) : (
                            <CountUp to={attendanceDays ?? 0} />
                        )}
                    </div>
                    <div className="stat-sub">{t('dashboard.days_present', 'Days present this month')}</div>
                </Card>
            </div>

            <div className="dashboard-grid">
                <Card title={t('dashboard.my_active_projects', 'My Active Projects')}>
                    {projects.length === 0 ? (
                        <div className="empty-state">{t('dashboard.no_projects_assigned', 'No projects currently assigned.')}</div>
                    ) : (
                        projects.map((p) => (
                            <div className="project-mini" key={p.id}>
                                <div>
                                    <div className="project-mini-name">{p.name}</div>
                                    <div className="project-mini-client">{p.client}</div>
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
        </div>
    );
}
