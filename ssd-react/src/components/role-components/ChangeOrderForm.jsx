import React, { useState, useEffect } from 'react';
import { PencilRuler, Plus, CheckCircle, Clock, XCircle, FileText, ChevronRight } from 'lucide-react';
import { getChangeOrders, createChangeOrder, updateChangeOrder } from '../../data/db-extensions';
import BounceButton from '../BounceButton';
import Modal from '../Modal';

const ChangeOrderForm = ({ projects }) => {
    const [selectedProject, setSelectedProject] = useState('');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [costImpact, setCostImpact] = useState('');
    const [timeImpact, setTimeImpact] = useState('');

    useEffect(() => {
        if (projects && projects.length > 0 && !selectedProject) {
            setSelectedProject(projects[0].id);
        }
    }, [projects]);

    useEffect(() => {
        if (selectedProject) {
            loadOrders();
        }
    }, [selectedProject]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await getChangeOrders(selectedProject);
            setOrders(data || []);
        } catch (error) {
            console.error('Error loading change orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        if (!selectedProject) {
            alert('Please select a project first.');
            return;
        }
        setTitle('');
        setDescription('');
        setCostImpact('');
        setTimeImpact('');
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            alert('Please provide a title and description.');
            return;
        }

        setSubmitting(true);
        try {
            await createChangeOrder({
                project_id: selectedProject,
                title: title,
                description: description,
                cost_impact: parseFloat(costImpact) || 0,
                time_impact_days: parseInt(timeImpact) || 0,
                status: 'Pending'
            });

            setIsModalOpen(false);
            loadOrders();
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to log change order.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await updateChangeOrder(id, { status: newStatus });
            loadOrders();
        } catch (error) {
            alert('Failed to update status.');
        }
    };

    const fmtCost = (val) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(val || 0);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Approved': return <CheckCircle size={14} />;
            case 'Rejected': return <XCircle size={14} />;
            default: return <Clock size={14} />;
        }
    };

    if (!projects || projects.length === 0) return null;

    return (
        <div className="bg-white border flex flex-col h-full border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-fuchsia-100 text-fuchsia-600 rounded-lg">
                        <PencilRuler size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Change Orders</h3>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">SCOPE ADJUSTMENTS</p>
                    </div>
                </div>

                {projects.length > 1 && (
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-md p-1.5 text-slate-700 outline-none focus:border-fuchsia-400"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <BounceButton
                    className="w-full bg-slate-50 border border-slate-200 border-dashed rounded-lg p-3 flex items-center justify-center gap-2 hover:bg-fuchsia-50 hover:border-fuchsia-300 hover:text-fuchsia-600 text-slate-500 font-semibold text-sm transition-colors mb-4"
                    onClick={handleOpenModal}
                >
                    <Plus size={16} /> Draft New CO
                </BounceButton>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recorded Modifications</h4>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 animate-pulse text-sm">Loading change orders...</div>
                ) : orders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-70">
                        <FileText size={28} className="text-slate-300 mb-2" />
                        <span className="text-sm font-semibold text-slate-600">No Change Orders</span>
                        <span className="text-xs text-slate-400 max-w-[200px] mt-1">This project matches its original BOQ scope.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[300px] pr-1">
                        {orders.map(order => (
                            <div key={order.id} className="border border-slate-100 rounded-lg p-3 hover:border-fuchsia-200 transition-colors bg-white shadow-sm flex flex-col group">
                                <div className="flex items-start justify-between mb-2 gap-2">
                                    <div className="font-bold text-sm text-slate-800 line-clamp-1">{order.title}</div>
                                    <div className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                                        {getStatusIcon(order.status)}
                                        {order.status}
                                    </div>
                                </div>

                                <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                                    {order.description}
                                </p>

                                <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Cost Impact</div>
                                        <div className={`text-xs font-bold ${order.cost_impact > 0 ? 'text-rose-600' : order.cost_impact < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                            {order.cost_impact > 0 ? '+' : ''}{fmtCost(order.cost_impact)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Time Impact</div>
                                        <div className={`text-xs font-bold ${order.time_impact_days > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                                            {order.time_impact_days > 0 ? `+${order.time_impact_days} Days` : 'None'}
                                        </div>
                                    </div>
                                </div>

                                {order.status === 'Pending' && (
                                    <div className="grid grid-cols-2 gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            className="text-[10px] font-bold py-1.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                            onClick={() => handleStatusUpdate(order.id, 'Approved')}
                                        >
                                            APPROVE
                                        </button>
                                        <button
                                            className="text-[10px] font-bold py-1.5 bg-rose-50 text-rose-600 rounded border border-rose-100 hover:bg-rose-100 transition-colors"
                                            onClick={() => handleStatusUpdate(order.id, 'Rejected')}
                                        >
                                            REJECT
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Creation Modal */}
            <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title="Draft Change Order">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                        Record a formal request to change the scope, schedule, or cost of the project.
                    </p>

                    <div className="form-group mb-0">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Change Title <span className="text-fuchsia-500">*</span></label>
                        <input
                            type="text"
                            className="w-full text-sm p-3 border border-slate-200 rounded-md outline-none focus:border-fuchsia-400"
                            placeholder="e.g. Additional Electrical Outlets in Main Hall"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    <div className="form-group flex-1 pt-2">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                            Justification / Details <span className="text-fuchsia-500">*</span>
                        </label>
                        <textarea
                            className="w-full text-sm p-3 border border-slate-200 rounded-md focus:border-fuchsia-400 outline-none resize-y min-h-[100px]"
                            placeholder="Client requested more outlets during site walk. Requires additional wiring and labor..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Est. Cost Impact ()</label>
                            <input
                                type="number"
                                className="w-full text-sm p-2 bg-white border border-slate-200 rounded-md outline-none focus:border-rose-400 text-rose-700"
                                placeholder="0.00"
                                value={costImpact}
                                onChange={(e) => setCostImpact(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Est. Delay (Days)</label>
                            <input
                                type="number"
                                className="w-full text-sm p-2 bg-white border border-slate-200 rounded-md outline-none focus:border-amber-400 text-amber-700"
                                placeholder="0"
                                value={timeImpact}
                                onChange={(e) => setTimeImpact(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 mt-6 border-t border-slate-100">
                        <button
                            className="btn btn-ghost"
                            onClick={() => setIsModalOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <BounceButton
                            className="btn btn-primary bg-fuchsia-600 hover:bg-fuchsia-700 hover:shadow-md flex items-center gap-2 border-0"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <span>Saving...</span>
                            ) : (
                                <><PencilRuler size={16} /> Submit Draft</>
                            )}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ChangeOrderForm;
