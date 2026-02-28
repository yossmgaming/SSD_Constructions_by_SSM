import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock, CheckCircle, XCircle, Clock, RefreshCw, Filter, User, AlertTriangle, Briefcase } from 'lucide-react';
import { getAllLeaveRequests, updateLeaveRequestStatus, getWorkerLeaveCountThisMonth, getWorkerAssignedProjects } from '../../data/db-extensions';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../EmptyState';
import LoadingSpinner from '../LoadingSpinner';

const LeaveRequestApproval = ({ onSuccess, onError }) => {
    const { profile } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('Pending');
    const [updatingId, setUpdatingId] = useState(null);
    const [workerStats, setWorkerStats] = useState({});
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        loadRequests();
    }, [statusFilter]);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllLeaveRequests(statusFilter);
            setRequests(data || []);
            
            // Load stats for each worker
            const workerIds = [...new Set((data || []).map(r => r.worker_id).filter(Boolean))];
            if (workerIds.length > 0) {
                setLoadingStats(true);
                const stats = {};
                await Promise.all(workerIds.map(async (workerId) => {
                    try {
                        const [count, projects] = await Promise.all([
                            getWorkerLeaveCountThisMonth(workerId),
                            getWorkerAssignedProjects(workerId)
                        ]);
                        stats[workerId] = { leaveCount: count, projects: projects || [], projectCount: (projects || []).length };
                    } catch (e) {
                        console.warn('Failed to load stats for worker', workerId);
                    }
                }));
                setWorkerStats(stats);
                setLoadingStats(false);
            }
        } catch (err) {
            console.error('Error loading leave requests:', err);
            setError('Failed to load leave requests.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    const handleStatusUpdate = async (requestId, newStatus) => {
        setUpdatingId(requestId);
        try {
            await updateLeaveRequestStatus(requestId, newStatus, profile?.id);
            loadRequests();
            if (onSuccess) onSuccess(`Leave request ${newStatus.toLowerCase()} successfully!`);
        } catch (err) {
            console.error('Failed to update leave request:', err);
            setError('Failed to update request.');
            if (onError) onError('Failed to update request');
        } finally {
            setUpdatingId(null);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const calculateDays = (start, end) => {
        if (!start || !end) return 0;
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const getStatusDetails = (status) => {
        switch (status) {
            case 'Approved': 
                return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle size={14} /> };
            case 'Rejected': 
                return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: <XCircle size={14} /> };
            default: 
                return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Clock size={14} /> };
        }
    };

    const filterOptions = ['Pending', 'Approved', 'Rejected', 'All'];

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                        <CalendarClock size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Leave Request Approvals</h3>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">REVIEW & APPROVE WORKER REQUESTS</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadRequests}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="p-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500">Filter:</span>
                    <div className="flex gap-1">
                        {filterOptions.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setStatusFilter(opt)}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                    statusFilter === opt 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-0">
                {loading ? (
                    <div className="p-8 flex items-center justify-center">
                        <LoadingSpinner text="Loading requests..." />
                    </div>
                ) : error ? (
                    <EmptyState
                        icon="alert"
                        title="Unable to load requests"
                        description={error}
                        actionLabel="Try Again"
                        onAction={loadRequests}
                    />
                ) : requests.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center">
                        <CalendarClock size={28} className="text-slate-300 mb-2" />
                        <span className="text-sm font-semibold text-slate-600">No leave requests found</span>
                        <span className="text-xs text-slate-400 mt-1">
                            {statusFilter !== 'All' ? `No ${statusFilter.toLowerCase()} requests at the moment.` : 'No requests submitted yet.'}
                        </span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Worker</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Period</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Duration</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Leave This Month</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Projects</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Reason</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                                    <th className="text-center text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.map(req => {
                                    const status = getStatusDetails(req.status);
                                    const days = calculateDays(req.start_date, req.end_date);
                                    const workerName = req.worker?.fullName || req.worker?.pid || 'Unknown Worker';
                                    
                                    return (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                        <User size={14} className="text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-800">{workerName}</div>
                                                        <div className="text-[10px] text-slate-400">{req.worker?.phone || 'No phone'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-slate-700">
                                                    {formatDate(req.start_date)}
                                                    {req.start_date !== req.end_date && (
                                                        <> → {formatDate(req.end_date)}</>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400">Submitted {formatDate(req.created_at)}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-bold text-indigo-600">{days}</span>
                                                <span className="text-xs text-slate-500 ml-1">day{days !== 1 ? 's' : ''}</span>
                                                {req.is_half_day && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Half</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {loadingStats ? (
                                                    <span className="text-xs text-slate-400">Loading...</span>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-sm font-semibold ${workerStats[req.worker_id]?.leaveCount >= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            {workerStats[req.worker_id]?.leaveCount || 0}/5
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">this month</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {loadingStats ? (
                                                    <span className="text-xs text-slate-400">...</span>
                                                ) : workerStats[req.worker_id]?.projectCount > 0 ? (
                                                    <div className="flex items-center gap-1 text-emerald-600">
                                                        <Briefcase size={12} />
                                                        <span className="text-sm font-medium">{workerStats[req.worker_id]?.projectCount} active</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-amber-600" title="No active project assignments">
                                                        <AlertTriangle size={12} />
                                                        <span className="text-sm font-medium">None</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-slate-600 max-w-[200px] truncate" title={req.reason}>
                                                    {req.reason}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text} ${status.border}`}>
                                                    {status.icon}
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {req.status === 'Pending' ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleStatusUpdate(req.id, 'Approved')}
                                                            disabled={updatingId === req.id}
                                                            className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-50"
                                                            title="Approve"
                                                        >
                                                            {updatingId === req.id ? (
                                                                <RefreshCw size={14} className="animate-spin" />
                                                            ) : (
                                                                <CheckCircle size={14} />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(req.id, 'Rejected')}
                                                            disabled={updatingId === req.id}
                                                            className="p-1.5 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors disabled:opacity-50"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaveRequestApproval;
