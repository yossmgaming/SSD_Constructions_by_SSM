import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import Modal from '../components/Modal';
import { Users, Plus, Clock, CheckCircle, XCircle, AlertCircle, Briefcase, Calendar } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const WORKER_TYPES = [
    'Mason', 'Carpenter', 'Electrician', 'Plumber', 'Welder', 'Steel Fixer', 
    'Labour', 'Machine Operator', 'Helper', 'Painter', 'Tile Mason', 'Aluminum Worker'
];

export default function SupervisorWorkerRequests() {
    const { t } = useTranslation();
    const { profile, identity } = useAuth();

    const [requests, setRequests] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const [form, setForm] = useState({
        project_id: '',
        worker_type: '',
        quantity: 1,
        duration_days: 1,
        start_date: '',
        reason: ''
    });

    useEffect(() => {
        loadData();
    }, [profile?.id]);

    async function loadData() {
        if (!profile?.id) return;
        setLoading(true);
        try {
            // Load assigned projects using identity (worker ID)
            const { data: assignments } = await supabase
                .from('projectWorkers')
                .select('projectId')
                .eq('workerId', identity.id);

            const projectIds = (assignments || []).map(a => a.projectId);

            if (projectIds.length > 0) {
                const { data: p } = await supabase
                    .from('projects')
                    .select('id, name')
                    .in('id', projectIds)
                    .eq('status', 'Ongoing');
                setProjects(p || []);
            }

            // Load worker's requests using profile.id (UUID)
            const { data: reqs } = await supabase
                .from('worker_requests')
                .select('*, project:project_id(name)')
                .eq('supervisor_id', profile.id)
                .order('created_at', { ascending: false });
            setRequests(reqs || []);
        } catch (e) {
            console.error('Error loading data:', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit() {
        if (!form.project_id || !form.worker_type || !form.reason) {
            alert('Please fill in all required fields');
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('worker_requests')
                .insert({
                    supervisor_id: profile.id,
                    project_id: form.project_id,
                    worker_type: form.worker_type,
                    quantity: parseInt(form.quantity),
                    duration_days: parseInt(form.duration_days),
                    start_date: form.start_date || null,
                    reason: form.reason,
                    status: 'Pending'
                });
            if (error) throw error;
            setShowModal(false);
            setForm({ project_id: '', worker_type: '', quantity: 1, duration_days: 1, start_date: '', reason: '' });
            loadData();
        } catch (e) {
            console.error('Error submitting request:', e);
            alert('Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Approved': return 'badge-success';
            case 'Rejected': return 'badge-error';
            default: return 'badge-warning';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Approved': return <CheckCircle size={16} className="text-emerald-500" />;
            case 'Rejected': return <XCircle size={16} className="text-rose-500" />;
            default: return <Clock size={16} className="text-amber-500" />;
        }
    };

    if (loading) {
        return <div className="p-8 flex items-center justify-center"><LoadingSpinner text="Loading..." /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Worker Requests</h1>
                    <p className="text-slate-500">Request workers for your projects</p>
                </div>
                <BounceButton className="btn btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Request Workers
                </BounceButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="stat-card amber">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg"><Clock size={20} className="text-amber-600" /></div>
                        <div>
                            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'Pending').length}</div>
                            <div className="text-sm text-slate-500">Pending</div>
                        </div>
                    </div>
                </Card>
                <Card className="stat-card emerald">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle size={20} className="text-emerald-600" /></div>
                        <div>
                            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'Approved').length}</div>
                            <div className="text-sm text-slate-500">Approved</div>
                        </div>
                    </div>
                </Card>
                <Card className="stat-card rose">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg"><XCircle size={20} className="text-rose-600" /></div>
                        <div>
                            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'Rejected').length}</div>
                            <div className="text-sm text-slate-500">Rejected</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Requests Table */}
            <Card title="Request History">
                {requests.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No requests yet</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-slate-200">
                                <tr>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Project</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Worker Type</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Qty</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Duration</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Start Date</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Reason</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-3 py-2 text-sm font-medium">{req.project?.name || 'Unknown'}</td>
                                        <td className="px-3 py-2 text-sm">{req.worker_type}</td>
                                        <td className="px-3 py-2 text-sm">{req.quantity}</td>
                                        <td className="px-3 py-2 text-sm">{req.duration_days} days</td>
                                        <td className="px-3 py-2 text-sm">{req.start_date || '-'}</td>
                                        <td className="px-3 py-2 text-sm text-slate-500 max-w-[200px] truncate">{req.reason}</td>
                                        <td className="px-3 py-2">
                                            <span className={`badge ${getStatusBadge(req.status)} flex items-center gap-1 w-fit`}>
                                                {getStatusIcon(req.status)}
                                                {req.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Request Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Workers">
                <div className="space-y-4">
                    <div className="form-group">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Project *</label>
                        <select 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            value={form.project_id}
                            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                        >
                            <option value="">Select Project</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Worker Type *</label>
                        <select 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            value={form.worker_type}
                            onChange={(e) => setForm({ ...form, worker_type: e.target.value })}
                        >
                            <option value="">Select Worker Type</option>
                            {WORKER_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Quantity *</label>
                            <input 
                                type="number" 
                                min="1" 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                value={form.quantity}
                                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Duration (days) *</label>
                            <input 
                                type="number" 
                                min="1" 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                value={form.duration_days}
                                onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Start Date</label>
                        <input 
                            type="date" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            value={form.start_date}
                            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Reason *</label>
                        <textarea 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl resize-y min-h-[100px]"
                            placeholder="Explain why you need these workers..."
                            value={form.reason}
                            onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                        <BounceButton className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
