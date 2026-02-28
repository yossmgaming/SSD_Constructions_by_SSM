import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    FileText, Package, ShieldAlert, Users, Calendar, 
    RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import './ProjectLogs.css';

const ProjectLogs = () => {
    const { t } = useTranslation();
    const { profile, hasRole } = useAuth();

    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [loading, setLoading] = useState(true);

    // Filter states
    const [workerReqFilter, setWorkerReqFilter] = useState('all');
    const [materialReqFilter, setMaterialReqFilter] = useState('all');

    // Modal states
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [requestType, setRequestType] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Data states
    const [dailyReports, setDailyReports] = useState([]);
    const [materialUsage, setMaterialUsage] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [workerRequests, setWorkerRequests] = useState([]);
    const [materialRequests, setMaterialRequests] = useState([]);
    const [attendanceSummary, setAttendanceSummary] = useState({ present: 0, absent: 0, total: 0 });

    const [loadingData, setLoadingData] = useState(false);

    // Generate month options (last 12 months)
    const monthOptions = useMemo(() => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }
        return options;
    }, []);

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        if (selectedProject) {
            loadAllProjectData();
        }
    }, [selectedProject, selectedMonth]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('projects')
                .select('id, name, status, location')
                .order('name', { ascending: true });
            setProjects(data || []);
            if (data && data.length > 0) {
                setSelectedProject(data[0].id);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAllProjectData = async () => {
        if (!selectedProject) return;
        setLoadingData(true);

        const today = new Date().toISOString().split('T')[0];
        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        try {
            const [
                reportsRes,
                materialsRes,
                incidentsRes,
                workerReqRes,
                materialReqRes,
                attendanceRes,
                projectWorkersRes
            ] = await Promise.all([
                supabase.from('daily_reports')
                    .select('*')
                    .eq('project_id', selectedProject)
                    .gte('report_date', startDate)
                    .lte('report_date', endDate)
                    .order('report_date', { ascending: false }),
                supabase.from('projectMaterials')
                    .select('*, material:materialId(name, unit)')
                    .eq('projectId', selectedProject)
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('createdAt', { ascending: false }),
                supabase.from('incidents')
                    .select('*')
                    .eq('project_id', selectedProject)
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: false }),
                supabase.from('worker_requests')
                    .select('*, project:project_id(name), supervisor:supervisor_id(full_name)')
                    .eq('project_id', selectedProject)
                    .gte('created_at', startDate)
                    .lte('created_at', endDate + 'T23:59:59')
                    .order('created_at', { ascending: false }),
                supabase.from('material_requests')
                    .select('*, project:project_id(name), supervisor:supervisor_id(full_name)')
                    .eq('project_id', selectedProject)
                    .gte('created_at', startDate)
                    .lte('created_at', endDate + 'T23:59:59')
                    .order('created_at', { ascending: false }),
                supabase.from('attendances')
                    .select('*')
                    .eq('projectId', selectedProject)
                    .eq('date', today),
                supabase.from('projectWorkers')
                    .select('*')
                    .eq('projectId', selectedProject)
            ]);

            setDailyReports(reportsRes.data || []);
            setMaterialUsage(materialsRes.data || []);
            setIncidents(incidentsRes.data || []);
            setWorkerRequests(workerReqRes.data || []);
            setMaterialRequests(materialReqRes.data || []);

            const todayAttendance = attendanceRes.data || [];
            const presentCount = todayAttendance.filter(a => a.isPresent).length;
            const totalWorkers = projectWorkersRes.data?.length || 0;
            setAttendanceSummary({
                present: presentCount,
                absent: totalWorkers - presentCount,
                total: totalWorkers
            });

        } catch (error) {
            console.error('Error loading project data:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedRequest || !requestType) return;
        setProcessing(true);
        try {
            const table = requestType === 'worker' ? 'worker_requests' : 'material_requests';
            const { error } = await supabase
                .from(table)
                .update({
                    status: 'Approved',
                    reviewed_by: profile.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', selectedRequest.id);

            if (error) throw error;
            loadAllProjectData();
            setSelectedRequest(null);
            setRequestType(null);
        } catch (error) {
            console.error('Error approving request:', error);
            alert('Failed to approve request');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest || !requestType) return;
        setProcessing(true);
        try {
            const table = requestType === 'worker' ? 'worker_requests' : 'material_requests';
            const { error } = await supabase
                .from(table)
                .update({
                    status: 'Rejected',
                    reviewed_by: profile.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', selectedRequest.id);

            if (error) throw error;
            loadAllProjectData();
            setSelectedRequest(null);
            setRequestType(null);
        } catch (error) {
            console.error('Error rejecting request:', error);
            alert('Failed to reject request');
        } finally {
            setProcessing(false);
        }
    };

    const filteredWorkerRequests = useMemo(() => {
        if (workerReqFilter === 'all') return workerRequests;
        return workerRequests.filter(r => r.status === workerReqFilter);
    }, [workerRequests, workerReqFilter]);

    const filteredMaterialRequests = useMemo(() => {
        if (materialReqFilter === 'all') return materialRequests;
        return materialRequests.filter(r => r.status === materialReqFilter);
    }, [materialRequests, materialReqFilter]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusBadge = (status) => {
        const colors = {
            Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            Rejected: 'bg-rose-100 text-rose-700 border-rose-200',
            Pending: 'bg-amber-100 text-amber-700 border-amber-200',
            Reported: 'bg-blue-100 text-blue-700 border-blue-200',
            Resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200'
        };
        return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const getSeverityBadge = (severity) => {
        const colors = {
            Critical: 'bg-rose-100 text-rose-700 border-rose-200',
            High: 'bg-orange-100 text-orange-700 border-orange-200',
            Medium: 'bg-amber-100 text-amber-700 border-amber-200',
            Low: 'bg-blue-100 text-blue-700 border-blue-200'
        };
        return colors[severity] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    if (!hasRole(['Super Admin', 'Finance', 'Project Manager'])) {
        return (
            <div className="p-8 text-center">
                <p className="text-slate-500">Access denied. This page is for administrators only.</p>
            </div>
        );
    }

    return (
        <div className="project-logs-page">
            <div className="page-header">
                <div>
                    <h1>{t('nav.project_logs')}</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Monitor all site activities, requests, and incidents for your projects
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="form-input"
                    >
                        <option value="">Select Project</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="form-input"
                    >
                        {monthOptions.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <BounceButton
                        onClick={loadAllProjectData}
                        disabled={!selectedProject || loadingData}
                        className="btn btn-outline"
                    >
                        <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />
                    </BounceButton>
                </div>
            </div>

            {!selectedProject ? (
                <div className="empty-state-large">
                    <FileText size={48} className="text-slate-300" />
                    <h3>Select a Project</h3>
                    <p>Choose a project from the dropdown above to view all site activities</p>
                </div>
            ) : loadingData ? (
                <div className="loading-container">
                    <LoadingSpinner text="Loading project data..." />
                </div>
            ) : (
                <div className="logs-grid">
                    {/* Daily Site Logs */}
                    <div className="log-card">
                        <div className="log-card-header indigo">
                            <div className="flex items-center gap-2">
                                <FileText size={18} />
                                <span>Daily Site Logs</span>
                            </div>
                            <span className="log-count">{dailyReports.length}</span>
                        </div>
                        <div className="log-card-body">
                            {dailyReports.length === 0 ? (
                                <div className="empty-mini">
                                    <FileText size={24} className="text-slate-200" />
                                    <span>No daily logs recorded</span>
                                </div>
                            ) : (
                                <div className="log-list">
                                    {dailyReports.map(report => (
                                        <div key={report.id} className="log-item">
                                            <div className="log-item-header">
                                                <span className="log-date">{formatDate(report.report_date)}</span>
                                                <span className="log-meta">
                                                    {report.weather_condition} • {report.workers_count} workers
                                                </span>
                                            </div>
                                            <p className="log-description">{report.work_accomplished}</p>
                                            {report.issues_blockers && (
                                                <div className="log-issue">
                                                    <AlertTriangle size={12} />
                                                    <span>{report.issues_blockers}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Material Usage */}
                    <div className="log-card">
                        <div className="log-card-header amber">
                            <div className="flex items-center gap-2">
                                <Package size={18} />
                                <span>Material Usage</span>
                            </div>
                            <span className="log-count">{materialUsage.length}</span>
                        </div>
                        <div className="log-card-body">
                            {materialUsage.length === 0 ? (
                                <div className="empty-mini">
                                    <Package size={24} className="text-slate-200" />
                                    <span>No material usage recorded</span>
                                </div>
                            ) : (
                                <div className="log-list">
                                    {materialUsage.map(usage => (
                                        <div key={usage.id} className="log-item">
                                            <div className="log-item-header">
                                                <span className="log-material">{usage.material?.name || 'Unknown'}</span>
                                                <span className="log-qty">-{usage.quantity} {usage.material?.unit}</span>
                                            </div>
                                            <span className="log-date">{formatDate(usage.date || usage.createdAt)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Safety Incidents */}
                    <div className="log-card">
                        <div className="log-card-header rose">
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={18} />
                                <span>Safety & Incidents</span>
                            </div>
                            <span className="log-count">{incidents.length}</span>
                        </div>
                        <div className="log-card-body">
                            {incidents.length === 0 ? (
                                <div className="empty-mini success">
                                    <ShieldAlert size={24} className="text-emerald-200" />
                                    <span>No incidents reported</span>
                                </div>
                            ) : (
                                <div className="log-list">
                                    {incidents.map(incident => (
                                        <div key={incident.id} className="log-item">
                                            <div className="log-item-header">
                                                <span className={`log-badge ${getSeverityBadge(incident.severity)}`}>
                                                    {incident.severity}
                                                </span>
                                                <span className={`log-badge ${getStatusBadge(incident.status)}`}>
                                                    {incident.status}
                                                </span>
                                            </div>
                                            <p className="log-description">{incident.description}</p>
                                            <span className="log-date">{formatDate(incident.date)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Worker Requests */}
                    <div className="log-card">
                        <div className="log-card-header blue">
                            <div className="flex items-center gap-2">
                                <Users size={18} />
                                <span>Worker Requests</span>
                            </div>
                            <span className="log-count">{workerRequests.length}</span>
                        </div>
                        <div className="filter-tabs">
                            {['all', 'Pending', 'Approved', 'Rejected'].map(filter => (
                                <button
                                    key={filter}
                                    className={`filter-tab ${workerReqFilter === filter ? 'active' : ''}`}
                                    onClick={() => setWorkerReqFilter(filter)}
                                >
                                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="log-card-body">
                            {filteredWorkerRequests.length === 0 ? (
                                <div className="empty-mini">
                                    <Users size={24} className="text-slate-200" />
                                    <span>No worker requests</span>
                                </div>
                            ) : (
                                <div className="log-list">
                                    {filteredWorkerRequests.map(req => (
                                        <div key={req.id} className="log-item request-item">
                                            <div className="log-item-header">
                                                <span className="log-material">{req.worker_type}</span>
                                                <span className={`log-badge ${getStatusBadge(req.status)}`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <div className="log-meta">
                                                <span>Qty: {req.quantity}</span>
                                                <span>•</span>
                                                <span>{req.duration_days} days</span>
                                            </div>
                                            <div className="log-meta">
                                                <span>By: {req.supervisor?.full_name || 'Unknown'}</span>
                                            </div>
                                            <div className="request-actions">
                                                <span className="log-date">{formatDate(req.start_date)}</span>
                                                {req.status === 'Pending' && (
                                                    <div className="action-buttons">
                                                        <button 
                                                            className="action-btn approve"
                                                            onClick={() => { setSelectedRequest(req); setRequestType('worker'); }}
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={14} />
                                                        </button>
                                                        <button 
                                                            className="action-btn reject"
                                                            onClick={() => { setSelectedRequest(req); setRequestType('worker'); }}
                                                            title="Reject"
                                                        >
                                                            <XCircle size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {req.reviewed_at && (
                                                <div className="review-info">
                                                    {req.status === 'Approved' ? 'Approved' : 'Rejected'} on {formatDate(req.reviewed_at)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Material Requests */}
                    <div className="log-card">
                        <div className="log-card-header sky">
                            <div className="flex items-center gap-2">
                                <Package size={18} />
                                <span>Material Requests</span>
                            </div>
                            <span className="log-count">{materialRequests.length}</span>
                        </div>
                        <div className="filter-tabs">
                            {['all', 'Pending', 'Approved', 'Rejected'].map(filter => (
                                <button
                                    key={filter}
                                    className={`filter-tab ${materialReqFilter === filter ? 'active' : ''}`}
                                    onClick={() => setMaterialReqFilter(filter)}
                                >
                                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="log-card-body">
                            {filteredMaterialRequests.length === 0 ? (
                                <div className="empty-mini">
                                    <Package size={24} className="text-slate-200" />
                                    <span>No material requests</span>
                                </div>
                            ) : (
                                <div className="log-list">
                                    {filteredMaterialRequests.map(req => (
                                        <div key={req.id} className="log-item request-item">
                                            <div className="log-item-header">
                                                <span className="log-material">{req.material_name}</span>
                                                <span className={`log-badge ${getStatusBadge(req.status)}`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <div className="log-meta">
                                                <span>Qty: {req.quantity_needed} {req.unit}</span>
                                            </div>
                                            <div className="log-meta">
                                                <span>By: {req.supervisor?.full_name || 'Unknown'}</span>
                                            </div>
                                            <div className="request-actions">
                                                <span className="log-date">{formatDate(req.date_needed)}</span>
                                                {req.status === 'Pending' && (
                                                    <div className="action-buttons">
                                                        <button 
                                                            className="action-btn approve"
                                                            onClick={() => { setSelectedRequest(req); setRequestType('material'); }}
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={14} />
                                                        </button>
                                                        <button 
                                                            className="action-btn reject"
                                                            onClick={() => { setSelectedRequest(req); setRequestType('material'); }}
                                                            title="Reject"
                                                        >
                                                            <XCircle size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {req.reviewed_at && (
                                                <div className="review-info">
                                                    {req.status === 'Approved' ? 'Approved' : 'Rejected'} on {formatDate(req.reviewed_at)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attendance Summary */}
                    <div className="log-card">
                        <div className="log-card-header emerald">
                            <div className="flex items-center gap-2">
                                <Calendar size={18} />
                                <span>Today's Attendance</span>
                            </div>
                        </div>
                        <div className="log-card-body">
                            <div className="attendance-summary">
                                <div className="attendance-stat">
                                    <span className="stat-value emerald">{attendanceSummary.present}</span>
                                    <span className="stat-label">Present</span>
                                </div>
                                <div className="attendance-stat">
                                    <span className="stat-value rose">{attendanceSummary.absent}</span>
                                    <span className="stat-label">Absent</span>
                                </div>
                                <div className="attendance-stat">
                                    <span className="stat-value slate">{attendanceSummary.total}</span>
                                    <span className="stat-label">Total Assigned</span>
                                </div>
                            </div>
                            {attendanceSummary.total > 0 && (
                                <div className="attendance-bar">
                                    <div 
                                        className="attendance-progress emerald"
                                        style={{ width: `${(attendanceSummary.present / attendanceSummary.total) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <Modal
                isOpen={!!selectedRequest}
                onClose={() => { setSelectedRequest(null); setRequestType(null); }}
                title={selectedRequest?.status === 'Pending' ? `Confirm ${requestType === 'worker' ? 'Worker' : 'Material'} Request` : ''}
            >
                <div className="confirm-modal-content">
                    <p>
                        Are you sure you want to <strong>{selectedRequest?.status === 'Pending' ? 'approve' : 'reject'}</strong> this {requestType} request?
                    </p>
                    {selectedRequest && (
                        <div className="confirm-details">
                            <p><strong>{requestType === 'worker' ? 'Worker Type:' : 'Material:'}</strong> {requestType === 'worker' ? selectedRequest.worker_type : selectedRequest.material_name}</p>
                            <p><strong>Quantity:</strong> {requestType === 'worker' ? selectedRequest.quantity : `${selectedRequest.quantity_needed} ${selectedRequest.unit}`}</p>
                        </div>
                    )}
                    <div className="confirm-actions">
                        <button 
                            className="btn btn-ghost"
                            onClick={() => { setSelectedRequest(null); setRequestType(null); }}
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        {selectedRequest?.status === 'Pending' && (
                            <>
                                <button 
                                    className="btn btn-danger"
                                    onClick={handleReject}
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Reject'}
                                </button>
                                <button 
                                    className="btn btn-success"
                                    onClick={handleApprove}
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Approve'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProjectLogs;
