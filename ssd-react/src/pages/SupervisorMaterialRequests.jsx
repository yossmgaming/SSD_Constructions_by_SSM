import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import Modal from '../components/Modal';
import { Package, Plus, Clock, CheckCircle, XCircle, AlertCircle, Briefcase, Calendar } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const MATERIAL_TYPES = [
    'Cement', 'Sand', 'Metal', 'Bricks', 'Blocks', 'Steel', 'Timber', 
    'Plywood', 'Tiles', 'Paint', 'Wire', 'Pipes', 'Fittings', 'Glass', 'Other'
];

export default function SupervisorMaterialRequests() {
    const { t } = useTranslation();
    const { profile, identity } = useAuth();

    const [requests, setRequests] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const [form, setForm] = useState({
        project_id: '',
        material_name: '',
        quantity_needed: 1,
        unit: 'pieces',
        purpose: '',
        date_needed: ''
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

            // Load material requests using profile.id (UUID)
            const { data: reqs } = await supabase
                .from('material_requests')
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
        if (!form.project_id || !form.material_name || !form.purpose) {
            alert('Please fill in all required fields');
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('material_requests')
                .insert({
                    supervisor_id: profile.id,
                    project_id: form.project_id,
                    material_name: form.material_name,
                    quantity_needed: parseInt(form.quantity_needed),
                    unit: form.unit,
                    purpose: form.purpose,
                    date_needed: form.date_needed || null,
                    status: 'Pending'
                });
            if (error) throw error;
            setShowModal(false);
            setForm({ project_id: '', material_name: '', quantity_needed: 1, unit: 'pieces', purpose: '', date_needed: '' });
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
                    <h1 className="text-2xl font-bold text-slate-800">Material Requests</h1>
                    <p className="text-slate-500">Request materials for your projects</p>
                </div>
                <BounceButton className="btn btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Request Materials
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
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Material</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Quantity</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Date Needed</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Purpose</th>
                                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-3 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-3 py-2 text-sm font-medium">{req.project?.name || 'Unknown'}</td>
                                        <td className="px-3 py-2 text-sm">{req.material_name}</td>
                                        <td className="px-3 py-2 text-sm">{req.quantity_needed} {req.unit}</td>
                                        <td className="px-3 py-2 text-sm">{req.date_needed || '-'}</td>
                                        <td className="px-3 py-2 text-sm text-slate-500 max-w-[200px] truncate">{req.purpose}</td>
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
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Materials">
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
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Material Name *</label>
                        <select 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            value={form.material_name}
                            onChange={(e) => setForm({ ...form, material_name: e.target.value })}
                        >
                            <option value="">Select Material</option>
                            {MATERIAL_TYPES.map(type => (
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
                                value={form.quantity_needed}
                                onChange={(e) => setForm({ ...form, quantity_needed: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Unit</label>
                            <select 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                                value={form.unit}
                                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                            >
                                <option value="pieces">Pieces</option>
                                <option value="kg">Kg</option>
                                <option value="tons">Tons</option>
                                <option value="cubic meters">Cubic Meters</option>
                                <option value="bags">Bags</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Date Needed</label>
                        <input 
                            type="date" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            value={form.date_needed}
                            onChange={(e) => setForm({ ...form, date_needed: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Purpose *</label>
                        <textarea 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl resize-y min-h-[100px]"
                            placeholder="Explain why you need this material..."
                            value={form.purpose}
                            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
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
