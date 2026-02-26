import React, { useState, useEffect } from 'react';
import { Package, Plus, CheckCircle, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '../../data/supabase';
import { KEYS, getAll, create, update } from '../../data/db';
import BounceButton from '../BounceButton';
import Modal from '../Modal';

const MaterialUsageForm = ({ supervisorId, projects }) => {
    const [selectedProject, setSelectedProject] = useState('');
    const [materials, setMaterials] = useState([]);
    const [recentUsage, setRecentUsage] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [usageQuantity, setUsageQuantity] = useState('');
    const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');

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

    const loadData = async () => {
        setLoading(true);
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
        } catch (error) {
            console.error('Error loading materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        if (!selectedProject) {
            alert('Please select a project first.');
            return;
        }
        setUsageQuantity('');
        setSelectedMaterialId('');
        setUsageDate(new Date().toISOString().split('T')[0]);
        setSearchQuery('');
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedMaterialId) {
            alert('Please select a material.');
            return;
        }

        const mat = materials.find(m => m.id === parseInt(selectedMaterialId));
        const qty = parseFloat(usageQuantity);

        if (isNaN(qty) || qty <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
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
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to log material usage. Please try again.');
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
        <div className="bg-white border flex flex-col h-full border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                        <Package size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Material Usage Log</h3>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">STOCK DEDUCTION</p>
                    </div>
                </div>

                {projects.length > 1 && (
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-md p-1.5 text-slate-700 outline-none focus:border-amber-400"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <BounceButton
                    className="w-full bg-slate-50 border border-slate-200 border-dashed rounded-lg p-3 flex items-center justify-center gap-2 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 text-slate-500 font-semibold text-sm transition-colors mb-4"
                    onClick={handleOpenModal}
                >
                    <Plus size={16} /> Log Consumed Material
                </BounceButton>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Consumptions</h4>

                {loading ? (
                    <div className="text-center p-4 text-slate-400 animate-pulse text-sm">Loading logs...</div>
                ) : recentUsage.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-70">
                        <Package size={24} className="text-slate-300 mb-2" />
                        <span className="text-sm font-semibold text-slate-600">No recent usage.</span>
                        <span className="text-xs text-slate-400 max-w-[200px]">Log materials deducted from inventory.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1">
                        {recentUsage.map(log => (
                            <div key={log.id} className="border border-slate-100 rounded-lg p-3 hover:border-amber-200 transition-colors bg-white shadow-sm flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-slate-800">{log.material?.name || 'Unknown Material'}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{formatDate(log.date || log.createdAt)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-amber-600">-{log.quantity} <span className="text-[10px] text-slate-400">{log.material?.unit}</span></div>
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
