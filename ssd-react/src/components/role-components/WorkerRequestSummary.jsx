import React, { useState, useEffect, useCallback } from 'react';
import { Users, Clock, CheckCircle, XCircle, Activity, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '../../data/supabase';
import BounceButton from '../BounceButton';
import LoadingSpinner from '../LoadingSpinner';
import Modal from '../Modal';

const WORKER_TYPES = [
    'Mason', 'Carpenter', 'Electrician', 'Plumber', 'Welder', 'Steel Fixer',
    'Labour', 'Machine Operator', 'Helper', 'Painter', 'Tile Mason', 'Aluminum Worker'
];

const WorkerRequestSummary = ({ supervisorId, projects }) => {
    const [selectedProject, setSelectedProject] = useState('');
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        worker_type: '',
        quantity: 1,
        duration_days: 1,
        start_date: '',
        reason: ''
    });

    useEffect(() => {
        if (projects && projects.length > 0 && !selectedProject) {
            setSelectedProject(projects[0].id);
        }
    }, [projects]);

    const loadData = useCallback(async () => {
        if (!supervisorId || !selectedProject) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('worker_requests')
                .select('*, project:project_id(name)')
                .eq('supervisor_id', supervisorId)
                .eq('project_id', selectedProject)
                .order('created_at', { ascending: false })
                .limit(10);
            setRequests(data || []);
        } catch (error) {
            console.error('Error fetching worker requests:', error);
        } finally {
            setLoading(false);
        }
    }, [supervisorId, selectedProject]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = async () => {
        if (!form.worker_type || !form.reason) {
            alert('Please fill in all required fields');
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('worker_requests')
                .insert({
                    supervisor_id: supervisorId,
                    project_id: selectedProject,
                    worker_type: form.worker_type,
                    quantity: parseInt(form.quantity),
                    duration_days: parseInt(form.duration_days),
                    start_date: form.start_date || null,
                    reason: form.reason,
                    status: 'Pending'
                });
            if (error) throw error;
            setShowModal(false);
            setForm({ worker_type: '', quantity: 1, duration_days: 1, start_date: '', reason: '' });
            loadData();
        } catch (e) {
            console.error('Error submitting request:', e);
            alert('Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'Rejected': return 'text-rose-600 bg-rose-50 border-rose-100';
            default: return 'text-amber-600 bg-amber-50 border-amber-100';
        }
    };

    return (
        <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col h-full group">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                        <Users size={20} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider leading-none">Manpower Requisitions</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Personnel Augmentation</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <RefreshCw
                        size={16}
                        className={`text-slate-400 cursor-pointer hover:text-blue-600 transition-colors ${loading ? 'animate-spin' : ''}`}
                        onClick={loadData}
                    />
                    {projects && projects.length > 1 && (
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="text-[11px] font-bold bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm hover:border-slate-200"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <BounceButton
                    className="w-full bg-blue-50/50 border-2 border-blue-100 border-dashed rounded-xl p-4 flex items-center justify-center gap-3 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-lg hover:shadow-blue-200 text-blue-700 font-black text-xs uppercase tracking-widest transition-all mb-6 group"
                    onClick={() => setShowModal(true)}
                >
                    <div className="p-1 bg-white rounded-lg group-hover:bg-blue-400 transition-colors">
                        <Plus size={18} />
                    </div>
                    Request Staff
                </BounceButton>

                <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personnel Flow</h4>
                    <div className="h-px bg-slate-100 flex-grow ml-4"></div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <LoadingSpinner text="Mobilizing forces..." />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 italic">
                        <div className="p-3 bg-white rounded-2xl shadow-sm mb-3 text-slate-200">
                            <Activity size={28} />
                        </div>
                        <span className="text-sm font-bold text-slate-400">Force fully deployed.</span>
                        <span className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">No personnel requests open for this site.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                        {requests.map(req => (
                            <div key={req.id} className="group-item border-2 border-slate-50 rounded-xl p-3 hover:border-blue-100 hover:bg-blue-50/30 transition-all bg-white relative">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px]">{req.worker_type}</span>
                                    <div className={`flex items-center gap-1.5 text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-wider ${getStatusColor(req.status)}`}>
                                        {req.status}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]">{req.project?.name}</span>
                                    <span className="text-[11px] font-black text-slate-700 flex items-center gap-2">
                                        <Users size={12} className="text-blue-500" />
                                        {req.quantity} <span className="text-[9px] text-slate-400 font-bold uppercase">Staff</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Workers">
                <div className="space-y-4">
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
                        <button className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
                        <BounceButton className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-200" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default WorkerRequestSummary;
