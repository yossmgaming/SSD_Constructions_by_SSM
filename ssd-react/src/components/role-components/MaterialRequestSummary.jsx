import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Clock, CheckCircle, XCircle, Package, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '../../data/supabase';
import BounceButton from '../BounceButton';
import LoadingSpinner from '../LoadingSpinner';
import Modal from '../Modal';

const MATERIAL_TYPES = [
    'Cement', 'Sand', 'Metal', 'Bricks', 'Blocks', 'Steel', 'Timber',
    'Plywood', 'Tiles', 'Paint', 'Wire', 'Pipes', 'Fittings', 'Glass', 'Other'
];

const MaterialRequestSummary = ({ supervisorId, projects }) => {
    const [selectedProject, setSelectedProject] = useState('');
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        material_name: '',
        quantity_needed: 1,
        unit: 'pieces',
        purpose: '',
        date_needed: ''
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
                .from('material_requests')
                .select('*, project:project_id(name)')
                .eq('supervisor_id', supervisorId)
                .eq('project_id', selectedProject)
                .order('created_at', { ascending: false })
                .limit(10);
            setRequests(data || []);
        } catch (error) {
            console.error('Error fetching material requests:', error);
        } finally {
            setLoading(false);
        }
    }, [supervisorId, selectedProject]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = async () => {
        if (!form.material_name || !form.purpose) {
            alert('Please fill in all required fields');
            return;
        }
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('material_requests')
                .insert({
                    supervisor_id: supervisorId,
                    project_id: selectedProject,
                    material_name: form.material_name,
                    quantity_needed: parseInt(form.quantity_needed),
                    unit: form.unit,
                    purpose: form.purpose,
                    date_needed: form.date_needed || null,
                    status: 'Pending'
                });
            if (error) throw error;
            setShowModal(false);
            setForm({ material_name: '', quantity_needed: 1, unit: 'pieces', purpose: '', date_needed: '' });
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
                    <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-lg shadow-sky-200">
                        <ShoppingCart size={20} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider leading-none">Procurement Requests</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Material Supply Chain</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <RefreshCw
                        size={16}
                        className={`text-slate-400 cursor-pointer hover:text-sky-600 transition-colors ${loading ? 'animate-spin' : ''}`}
                        onClick={loadData}
                    />
                    {projects && projects.length > 1 && (
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="text-[11px] font-bold bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all cursor-pointer shadow-sm hover:border-slate-200"
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
                    className="w-full bg-sky-50/50 border-2 border-sky-100 border-dashed rounded-xl p-4 flex items-center justify-center gap-3 hover:bg-sky-600 hover:text-white hover:border-sky-600 hover:shadow-lg hover:shadow-sky-200 text-sky-700 font-black text-xs uppercase tracking-widest transition-all mb-6 group"
                    onClick={() => setShowModal(true)}
                >
                    <div className="p-1 bg-white rounded-lg group-hover:bg-sky-400 transition-colors">
                        <Plus size={18} />
                    </div>
                    Request Materials
                </BounceButton>

                <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Requisitions</h4>
                    <div className="h-px bg-slate-100 flex-grow ml-4"></div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <LoadingSpinner text="Querying supply..." />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 italic">
                        <div className="p-3 bg-white rounded-2xl shadow-sm mb-3 text-slate-200">
                            <Package size={28} />
                        </div>
                        <span className="text-sm font-bold text-slate-400">Inventory stable.</span>
                        <span className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">No pending material orders for this site.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                        {requests.map(req => (
                            <div key={req.id} className="group-item border-2 border-slate-50 rounded-xl p-3 hover:border-sky-100 hover:bg-sky-50/30 transition-all bg-white relative">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px]">{req.material_name}</span>
                                    <div className={`flex items-center gap-1.5 text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-wider ${getStatusColor(req.status)}`}>
                                        {req.status}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]">{req.project?.name}</span>
                                    <span className="text-[11px] font-black text-slate-700">{req.quantity_needed} <span className="text-[9px] text-slate-400 font-bold uppercase">{req.unit}</span></span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Materials">
                <div className="space-y-4">
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
                        <button className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
                        <BounceButton className="px-4 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-lg shadow-sky-200" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MaterialRequestSummary;
