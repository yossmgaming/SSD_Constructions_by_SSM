import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { getAll, create, update, remove, query, KEYS } from '../data/db';
import { WorkerRoles, MeasurementUnits } from '../models/enums';
import './Rates.css';
import BounceButton from '../components/BounceButton';

const WORK_CATEGORIES = [
    'Tiling', 'Plastering', 'Painting', 'Flooring', 'Roofing',
    'Plumbing', 'Electrical', 'Masonry', 'Carpentry', 'Welding',
    'Excavation', 'Concrete', 'Waterproofing', 'Demolition', 'Other',
];

const UNITS = MeasurementUnits;

export default function Rates() {
    const [activeTab, setActiveTab] = useState('worker');
    const [workerRates, setWorkerRates] = useState([]);
    const [workRates, setWorkRates] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
    const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Worker rate form
    const [wrRole, setWrRole] = useState('Mason');
    const [wrCustomRole, setWrCustomRole] = useState('');
    const [wrHourly, setWrHourly] = useState('');
    const [wrDaily, setWrDaily] = useState('');
    const [wrOvertime, setWrOvertime] = useState('');

    // Work rate form
    const [wkCategory, setWkCategory] = useState('Tiling');
    const [wkCustomCategory, setWkCustomCategory] = useState('');
    const [wkName, setWkName] = useState('');
    const [wkRate, setWkRate] = useState('');
    const [wkUnit, setWkUnit] = useState('sqft');
    const [wkDescription, setWkDescription] = useState('');

    useEffect(() => { loadAll(); }, []);

    async function loadAll() {
        setIsLoading(true);
        try {
            const [wrData, wkData] = await Promise.all([
                getAll(KEYS.workerRates),
                getAll(KEYS.workRates)
            ]);
            setWorkerRates(wrData);
            setWorkRates(wkData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    // --- Worker Rates ---
    async function addWorkerRate() {
        const role = wrRole === 'Other' ? wrCustomRole.trim() : wrRole;
        if (!role) return alert('Select or enter a role');
        if (!wrHourly && !wrDaily) return alert('Enter at least an hourly or daily rate');

        // Check duplicate
        const exists = workerRates.find((r) => r.role.toLowerCase() === role.toLowerCase());
        if (exists) return alert(`Rate for "${role}" already exists. Edit it instead.`);

        setIsLoading(true);
        try {
            await create(KEYS.workerRates, {
                role,
                hourlyRate: parseFloat(wrHourly) || 0,
                dailyRate: parseFloat(wrDaily) || 0,
                overtimeRate: parseFloat(wrOvertime) || 0,
            });
            setWrRole('Mason'); setWrCustomRole(''); setWrHourly(''); setWrDaily(''); setWrOvertime('');
            setIsWorkerModalOpen(false);
            await loadAll();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    async function deleteWorkerRate(id) {
        if (!confirm('Delete this rate?')) return;
        setIsLoading(true);
        try {
            await remove(KEYS.workerRates, id);
            await loadAll();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    // --- Work Rates ---
    async function addWorkRate() {
        const category = wkCategory === 'Other' ? wkCustomCategory.trim() : wkCategory;
        if (!category) return alert('Select or enter a category');
        if (!wkName.trim()) return alert('Enter a work name');
        if (!wkRate) return alert('Enter a rate');

        setIsLoading(true);
        try {
            await create(KEYS.workRates, {
                category,
                name: wkName.trim(),
                ratePerUnit: parseFloat(wkRate) || 0,
                unit: wkUnit,
                description: wkDescription.trim(),
            });
            setWkCategory('Tiling'); setWkCustomCategory(''); setWkName(''); setWkRate(''); setWkUnit('sqft'); setWkDescription('');
            setIsWorkModalOpen(false);
            await loadAll();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    async function deleteWorkRate(id) {
        if (!confirm('Delete this rate?')) return;
        setIsLoading(true);
        try {
            await remove(KEYS.workRates, id);
            await loadAll();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    // --- Inline editing ---
    function startEdit(item) {
        setEditingId(item.id);
        setEditData({ ...item });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditData({});
    }

    async function saveEdit(type) {
        setIsLoading(true);
        try {
            if (type === 'worker') {
                await update(KEYS.workerRates, editingId, {
                    hourlyRate: parseFloat(editData.hourlyRate) || 0,
                    dailyRate: parseFloat(editData.dailyRate) || 0,
                    overtimeRate: parseFloat(editData.overtimeRate) || 0,
                });
            } else {
                await update(KEYS.workRates, editingId, {
                    name: editData.name,
                    ratePerUnit: parseFloat(editData.ratePerUnit) || 0,
                    unit: editData.unit,
                    description: editData.description,
                });
            }
            cancelEdit();
            await loadAll();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    const workerRatesSorted = [...workerRates].sort((a, b) => a.role.localeCompare(b.role));
    const workRatesSorted = [...workRates].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    // Group work rates by category
    const grouped = {};
    workRatesSorted.forEach((r) => {
        if (!grouped[r.category]) grouped[r.category] = [];
        grouped[r.category].push(r);
    });

    return (
        <div className="rates-page">
            <div className="page-header">
                <h1>Rate Management</h1>
                {activeTab === 'worker' ? (
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => setIsWorkerModalOpen(true)}><Plus size={18} /> New Worker Rate</BounceButton>
                ) : (
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => setIsWorkModalOpen(true)}><Plus size={18} /> New Work Rate</BounceButton>
                )}
            </div>

            <div className="rates-tabs">
                <BounceButton className={`rates-tab ${activeTab === 'worker' ? 'active' : ''}`} onClick={() => setActiveTab('worker')}>
                    👷 Worker Hourly Rates
                </BounceButton>
                <BounceButton className={`rates-tab ${activeTab === 'work' ? 'active' : ''}`} onClick={() => setActiveTab('work')}>
                    🔨 Work & Service Rates
                </BounceButton>
            </div>

            {/* ========== WORKER RATES TAB ========== */}
            {activeTab === 'worker' && (
                <div className="rates-content">
                    <Modal isOpen={isWorkerModalOpen} onClose={() => setIsWorkerModalOpen(false)} title="Add Worker Rate" onSave={addWorkerRate}>
                        <div className="form-group">
                            <label>Worker Type</label>
                            <select value={wrRole} onChange={(e) => setWrRole(e.target.value)}>
                                {WorkerRoles.map((r) => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                        {wrRole === 'Other' && (
                            <div className="form-group">
                                <label>Custom Type</label>
                                <input placeholder="Enter type..." value={wrCustomRole} onChange={(e) => setWrCustomRole(e.target.value)} />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Hourly Rate (LKR)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={wrHourly}
                                onChange={(e) => {
                                    const h = e.target.value;
                                    setWrHourly(h);
                                    if (h) setWrDaily((parseFloat(h) * 8).toFixed(2));
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Daily Rate (LKR)</label>
                            <input type="number" placeholder="0.00" value={wrDaily} onChange={(e) => setWrDaily(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Overtime Rate (LKR/hr)</label>
                            <input type="number" placeholder="0.00" value={wrOvertime} onChange={(e) => setWrOvertime(e.target.value)} />
                        </div>
                    </Modal>

                    <Card title={`Worker Rates (${workerRatesSorted.length})`}>
                        {workerRatesSorted.length === 0 ? (
                            <div className="empty-state">No worker rates defined yet. Add one above.</div>
                        ) : (
                            <div className="rates-table">
                                <div className="rates-table-header">
                                    <span>Worker Type</span>
                                    <span>Hourly Rate</span>
                                    <span>Daily Rate</span>
                                    <span>Overtime Rate</span>
                                    <span>Actions</span>
                                </div>
                                {workerRatesSorted.map((r) => (
                                    <div className="rates-table-row" key={r.id}>
                                        <span className="rate-role-name">{r.role}</span>
                                        {editingId === r.id ? (
                                            <>
                                                <span><input type="number" className="inline-edit" value={editData.hourlyRate} onChange={(e) => setEditData({ ...editData, hourlyRate: e.target.value })} /></span>
                                                <span><input type="number" className="inline-edit" value={editData.dailyRate} onChange={(e) => setEditData({ ...editData, dailyRate: e.target.value })} /></span>
                                                <span><input type="number" className="inline-edit" value={editData.overtimeRate} onChange={(e) => setEditData({ ...editData, overtimeRate: e.target.value })} /></span>
                                                <span className="rate-actions">
                                                    <BounceButton className="btn-icon save" onClick={() => saveEdit('worker')}><Check size={14} /></BounceButton>
                                                    <BounceButton className="btn-icon cancel" onClick={cancelEdit}><X size={14} /></BounceButton>
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{fmt(r.hourlyRate)}</span>
                                                <span>{fmt(r.dailyRate)}</span>
                                                <span>{r.overtimeRate ? fmt(r.overtimeRate) : <span className="text-muted">—</span>}</span>
                                                <span className="rate-actions">
                                                    <BounceButton className="btn-icon edit" onClick={() => startEdit(r)}><Edit3 size={14} /></BounceButton>
                                                    <BounceButton className="btn-icon delete" onClick={() => deleteWorkerRate(r.id)}><Trash2 size={14} /></BounceButton>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* ========== WORK RATES TAB ========== */}
            {activeTab === 'work' && (
                <div className="rates-content">
                    <Modal isOpen={isWorkModalOpen} onClose={() => setIsWorkModalOpen(false)} title="Add Work Rate" onSave={addWorkRate}>
                        <div className="form-group">
                            <label>Category</label>
                            <select value={wkCategory} onChange={(e) => setWkCategory(e.target.value)}>
                                {WORK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        {wkCategory === 'Other' && (
                            <div className="form-group">
                                <label>Custom Category</label>
                                <input placeholder="Enter category..." value={wkCustomCategory} onChange={(e) => setWkCustomCategory(e.target.value)} />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Work Name</label>
                            <input placeholder="e.g. Floor Tiling 2x2" value={wkName} onChange={(e) => setWkName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Rate (LKR)</label>
                            <input type="number" placeholder="0.00" value={wkRate} onChange={(e) => setWkRate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Per Unit</label>
                            <select value={wkUnit} onChange={(e) => setWkUnit(e.target.value)}>
                                {UNITS.map((u) => <option key={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: '1 1 100%' }}>
                            <label>Description (optional)</label>
                            <input placeholder="Additional details..." value={wkDescription} onChange={(e) => setWkDescription(e.target.value)} />
                        </div>
                    </Modal>

                    <Card title={`Work Rates (${workRatesSorted.length})`}>
                        {workRatesSorted.length === 0 ? (
                            <div className="empty-state">No work rates defined yet. Add one above.</div>
                        ) : (
                            Object.entries(grouped).map(([cat, items]) => (
                                <div key={cat} className="work-category-group">
                                    <div className="work-category-label">{cat}</div>
                                    <div className="rates-table">
                                        <div className="rates-table-header work-header">
                                            <span>Work Name</span>
                                            <span>Rate</span>
                                            <span>Unit</span>
                                            <span>Description</span>
                                            <span>Actions</span>
                                        </div>
                                        {items.map((r) => (
                                            <div className="rates-table-row" key={r.id}>
                                                {editingId === r.id ? (
                                                    <>
                                                        <span><input className="inline-edit" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} /></span>
                                                        <span><input type="number" className="inline-edit" value={editData.ratePerUnit} onChange={(e) => setEditData({ ...editData, ratePerUnit: e.target.value })} /></span>
                                                        <span>
                                                            <select className="inline-edit" value={editData.unit} onChange={(e) => setEditData({ ...editData, unit: e.target.value })}>
                                                                {UNITS.map((u) => <option key={u}>{u}</option>)}
                                                            </select>
                                                        </span>
                                                        <span><input className="inline-edit" value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} /></span>
                                                        <span className="rate-actions">
                                                            <BounceButton className="btn-icon save" onClick={() => saveEdit('work')}><Check size={14} /></BounceButton>
                                                            <BounceButton className="btn-icon cancel" onClick={cancelEdit}><X size={14} /></BounceButton>
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="rate-work-name">{r.name}</span>
                                                        <span className="rate-value">{fmt(r.ratePerUnit)}</span>
                                                        <span className="rate-unit">per {r.unit}</span>
                                                        <span className="rate-desc">{r.description || <span className="text-muted">—</span>}</span>
                                                        <span className="rate-actions">
                                                            <BounceButton className="btn-icon edit" onClick={() => startEdit(r)}><Edit3 size={14} /></BounceButton>
                                                            <BounceButton className="btn-icon delete" onClick={() => deleteWorkRate(r.id)}><Trash2 size={14} /></BounceButton>
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
