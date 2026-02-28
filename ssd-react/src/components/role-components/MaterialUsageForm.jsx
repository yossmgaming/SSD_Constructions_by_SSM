import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, CheckCircle, Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../../data/supabase';
import { KEYS, getAll, create, update } from '../../data/db';
import BounceButton from '../BounceButton';
import Modal from '../Modal';
import EmptyState from '../EmptyState';
import LoadingSpinner from '../LoadingSpinner';

const MaterialUsageForm = ({ supervisorId, projects, onSuccess, onError }) => {
    const [selectedProject, setSelectedProject] = useState('');
    const [materials, setMaterials] = useState([]);
    const [recentUsage, setRecentUsage] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [usageQuantity, setUsageQuantity] = useState('');
    const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (projects && projects.length > 0 && !selectedProject) {
            setSelectedProject(projects[0].id);
        }
    }, [projects]);

    useEffect(() => {
        if (selectedProject) {
            loadData();
        }
    }, [selectedProject]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch global stock
            const allMats = await getAll(KEYS.materials);
            setMaterials(allMats.filter(m => m.quantity > 0)); // Only show items with stock

            // Fetch recent usage for THIS project
            const { data: usageLogs } = await supabase
                .from(KEYS.projectMaterials)
                .select('*, material:materialId(name, unit)')
                .eq('projectId', selectedProject)
                .order('createdAt', { ascending: false })
                .limit(10);

            setRecentUsage(usageLogs || []);
        } catch (err) {
            console.error('Error loading materials:', err);
            setError('Failed to load materials.');
        } finally {
            setLoading(false);
        }
    }, [selectedProject]);

    const handleOpenModal = () => {
        if (!selectedProject) return;
        setUsageQuantity('');
        setSelectedMaterialId('');
        setUsageDate(new Date().toISOString().split('T')[0]);
        setSearchQuery('');
        setFormErrors({});
        setIsModalOpen(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!selectedMaterialId) errors.selectedMaterialId = 'Material is required';
        if (!usageQuantity || isNaN(parseFloat(usageQuantity)) || parseFloat(usageQuantity) <= 0) {
            errors.usageQuantity = 'Valid quantity is required';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const mat = materials.find(m => m.id === parseInt(selectedMaterialId));
        const qty = parseFloat(usageQuantity);

        if (qty > mat.quantity) {
            alert(`Insufficient stock! You requested ${qty} but only ${mat.quantity} ${mat.unit} are available.`);
            return;
        }

        setSubmitting(true);
        try {
            // 1. Create Usage Log 
            await create(KEYS.projectMaterials, {
                projectId: selectedProject,
                materialId: parseInt(selectedMaterialId),
                quantity: qty,
                date: usageDate
            });

            // 2. Deduct from Global Stock
            await update(KEYS.materials, mat.id, {
                quantity: mat.quantity - qty,
                updatedAt: new Date().toISOString()
            });

            setIsModalOpen(false);
            loadData(); // Reload stock and logs
            if (onSuccess) onSuccess('Material usage logged successfully!');
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to log material usage. Please try again.');
            if (onError) onError('Failed to log material usage');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const filteredMaterials = materials.filter(m =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedMatObj = materials.find(m => m.id === parseInt(selectedMaterialId));

    if (!projects || projects.length === 0) return null;

    return (
        <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col h-full group/card">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-200">
                        <Package size={20} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider leading-none">Material Usage</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Stock Deduction Tracking</p>
                    </div>
                </div>

                {projects.length > 1 && (
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="text-[11px] font-bold bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer shadow-sm hover:border-slate-200"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <BounceButton
                    className="w-full bg-amber-50/50 border-2 border-amber-100 border-dashed rounded-xl p-4 flex items-center justify-center gap-3 hover:bg-amber-500 hover:text-white hover:border-amber-500 hover:shadow-lg hover:shadow-amber-200 text-amber-700 font-black text-xs uppercase tracking-widest transition-all mb-6 group"
                    onClick={handleOpenModal}
                >
                    <div className="p-1 bg-white rounded-lg group-hover:bg-amber-400 transition-colors">
                        <Plus size={18} />
                    </div>
                    Log Consumed Material
                </BounceButton>

                <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usage Records</h4>
                    <div className="h-px bg-slate-100 flex-grow ml-4"></div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12 text-slate-400 animate-pulse text-xs font-bold uppercase tracking-widest">
                        Inventory sync...
                    </div>
                ) : recentUsage.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 italic">
                        <div className="p-3 bg-white rounded-2xl shadow-sm mb-3 text-slate-200">
                            <Package size={28} />
                        </div>
                        <span className="text-sm font-bold text-slate-400">Inventory untouched.</span>
                        <span className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">Deduct used materials now.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                        {recentUsage.map(log => (
                            <div key={log.id} className="group/item border-2 border-slate-50 rounded-2xl p-4 hover:border-amber-100 hover:bg-amber-50/30 hover:shadow-md transition-all bg-white flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-black text-slate-800">{log.material?.name || 'Unknown Material'}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">{formatDate(log.date || log.createdAt)}</div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="text-sm font-black text-amber-600 bg-amber-100/50 px-3 py-1 rounded-xl border border-amber-200/50">
                                        -{log.quantity} <span className="text-[9px] text-amber-400 uppercase tracking-tighter ml-1">{log.material?.unit}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Creation Modal */}
            <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title="Log Material Usage">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                        Deduct materials used on site from the global inventory stock.
                    </p>

                    <div className="form-group mb-0 relative">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Search Material Stock</label>
                        <div className="absolute top-7 left-3 text-slate-400">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            className="w-full text-sm py-2 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-amber-400"
                            placeholder="Type to filter materials..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    <div className="border border-slate-200 rounded-md overflow-hidden max-h-[160px] overflow-y-auto">
                        {filteredMaterials.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-400">No stock found matching "{searchQuery}"</div>
                        ) : (
                            filteredMaterials.map(m => (
                                <div
                                    key={m.id}
                                    onClick={() => setSelectedMaterialId(m.id)}
                                    className={`p-3 border-b border-slate-100 last:border-0 cursor-pointer transition-colors flex items-center justify-between ${parseInt(selectedMaterialId) === m.id ? 'bg-amber-50 border-l-4 border-l-amber-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                                >
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">{m.name}</div>
                                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                            <span className="px-1.5 py-0.5 bg-slate-100 rounded-sm">{m.category}</span>
                                            <span>SKU: {m.itemCode || m.id}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <div className="text-xs font-semibold text-slate-600">Stock: <span className="text-emerald-600 font-bold">{m.quantity}</span> {m.unit}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {selectedMatObj && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="form-group mb-0">
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Usage Date</label>
                                <input
                                    type="date"
                                    className="w-full text-sm p-2 border border-slate-200 rounded-md outline-none focus:border-amber-400"
                                    value={usageDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setUsageDate(e.target.value)}
                                    disabled={submitting}
                                />
                            </div>
                            <div className="form-group mb-0">
                                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Amount Used</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full text-sm p-2 pr-12 border border-slate-200 rounded-md outline-none focus:border-amber-400"
                                        value={usageQuantity}
                                        onChange={(e) => setUsageQuantity(e.target.value)}
                                        placeholder={`Max ${selectedMatObj.quantity}`}
                                        min="0.1"
                                        step="0.1"
                                        max={selectedMatObj.quantity}
                                        disabled={submitting}
                                    />
                                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">{selectedMatObj.unit}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3 mt-6 border-t border-slate-100">
                        <button
                            className="btn btn-ghost"
                            onClick={() => setIsModalOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <BounceButton
                            className="btn btn-primary bg-amber-500 hover:bg-amber-600 hover:shadow-md flex items-center gap-2 border-0"
                            onClick={handleSubmit}
                            disabled={submitting || !selectedMaterialId}
                        >
                            {submitting ? (
                                <span>Logging...</span>
                            ) : (
                                <><CheckCircle size={16} /> Submit Record</>
                            )}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MaterialUsageForm;
