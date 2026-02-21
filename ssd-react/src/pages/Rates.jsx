import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, HardHat, Hammer, Edit3, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
    const [wkCategory, setWkCategory] = useState('Masonry');
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

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} `;

    // Category mapping for display
    const getTranslatedCategory = (cat) => {
        const key = cat.toLowerCase();
        return t(`rates.categories.${key} `) || cat;
    };

    // --- Worker Rates ---
    async function addWorkerRate() {
        const role = wrRole === 'Other' ? wrCustomRole.trim() : wrRole;
        if (!role) return alert(t('common.is_required'));
        if (!wrHourly && !wrDaily) return alert(t('rates.enter_rates_error') || 'Enter at least an hourly or daily rate');

        // Check duplicate
        const exists = workerRates.find((r) => r.role.toLowerCase() === role.toLowerCase());
        if (exists) return alert(`${t('common.already_exists')}: "${role}"`);

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
        if (!confirm(t('common.delete_confirm'))) return;
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
        if (!category) return alert(t('common.category') + ' ' + t('common.is_required'));
        if (!wkName.trim()) return alert(t('rates.work_name') + ' ' + t('common.is_required'));
        if (!wkRate) return alert(t('common.amount') + ' ' + t('common.is_required'));

        setIsLoading(true);
        try {
            await create(KEYS.workRates, {
                category,
                name: wkName.trim(),
                ratePerUnit: parseFloat(wkRate) || 0,
                unit: wkUnit,
                description: wkDescription.trim(),
            });
            setWkCategory('Masonry'); setWkCustomCategory(''); setWkName(''); setWkRate(''); setWkUnit('sqft'); setWkDescription('');
            setIsWorkModalOpen(false);
            await loadAll();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    async function deleteWorkRate(id) {
        if (!confirm(t('common.delete_confirm'))) return;
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
                <h1>{t('rates.title')}</h1>
                {activeTab === 'worker' ? (
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => setIsWorkerModalOpen(true)}><Plus size={18} /> {t('rates.new_worker_rate')}</BounceButton>
                ) : (
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => setIsWorkModalOpen(true)}><Plus size={18} /> {t('rates.new_work_rate')}</BounceButton>
                )}
            </div>

            <div className="rates-tabs">
                <BounceButton className={`rates - tab ${activeTab === 'worker' ? 'active' : ''} `} onClick={() => setActiveTab('worker')}>
                    <HardHat size={16} className="tab-icon" /> {t('rates.worker_rates')}
                </BounceButton>
                <BounceButton className={`rates - tab ${activeTab === 'work' ? 'active' : ''} `} onClick={() => setActiveTab('work')}>
                    <Hammer size={16} className="tab-icon" /> {t('rates.service_rates')}
                </BounceButton>
            </div>

            {/* ========== WORKER RATES TAB ========== */}
            {activeTab === 'worker' && (
                <div className="rates-content">
                    <Modal isOpen={isWorkerModalOpen} onClose={() => setIsWorkerModalOpen(false)} title={t('rates.new_worker_rate')} onSave={addWorkerRate}>
                        <div className="form-group">
                            <label>{t('common.type')}</label>
                            <select value={wrRole} onChange={(e) => setWrRole(e.target.value)}>
                                {WorkerRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        {wrRole === 'Other' && (
                            <div className="form-group">
                                <label>{t('projects.custom_type')}</label>
                                <input placeholder="..." value={wrCustomRole} onChange={(e) => setWrCustomRole(e.target.value)} />
                            </div>
                        )}
                        <div className="form-group">
                            <label>{t('rates.hourly_rate')} (LKR)</label>
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
                            <label>{t('workers.daily_rate')} (LKR)</label>
                            <input type="number" placeholder="0.00" value={wrDaily} onChange={(e) => setWrDaily(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>{t('rates.overtime_rate')} (LKR/hr)</label>
                            <input type="number" placeholder="0.00" value={wrOvertime} onChange={(e) => setWrOvertime(e.target.value)} />
                        </div>
                    </Modal>

                    <Card title={`${t('rates.worker_rates')} (${workerRatesSorted.length})`}>
                        {workerRatesSorted.length === 0 ? (
                            <div className="empty-state">{t('common.no_data') || 'No worker rates defined yet.'}</div>
                        ) : (
                            <div className="rates-table">
                                <div className="rates-table-header">
                                    <span>{t('common.role')}</span>
                                    <span>{t('rates.hourly_rate')}</span>
                                    <span>{t('workers.daily_rate')}</span>
                                    <span>{t('rates.overtime_rate')}</span>
                                    <span>{t('common.actions')}</span>
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
                    <Modal isOpen={isWorkModalOpen} onClose={() => setIsWorkModalOpen(false)} title={t('rates.new_work_rate')} onSave={addWorkRate}>
                        <div className="form-group">
                            <label>{t('common.category')}</label>
                            <select value={wkCategory} onChange={(e) => setWkCategory(e.target.value)}>
                                {WORK_CATEGORIES.map((c) => <option key={c} value={c}>{getTranslatedCategory(c)}</option>)}
                            </select>
                        </div>
                        {wkCategory === 'Other' && (
                            <div className="form-group">
                                <label>{t('projects.custom_type')}</label>
                                <input placeholder="..." value={wkCustomCategory} onChange={(e) => setWkCustomCategory(e.target.value)} />
                            </div>
                        )}
                        <div className="form-group">
                            <label>{t('rates.work_name')}</label>
                            <input placeholder="..." value={wkName} onChange={(e) => setWkName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>{t('common.amount')} (LKR)</label>
                            <input type="number" placeholder="0.00" value={wkRate} onChange={(e) => setWkRate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>{t('rates.per_unit')}</label>
                            <select value={wkUnit} onChange={(e) => setWkUnit(e.target.value)}>
                                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: '1 1 100%' }}>
                            <label>{t('common.description')} ({t('common.optional') || 'optional'})</label>
                            <input placeholder="..." value={wkDescription} onChange={(e) => setWkDescription(e.target.value)} />
                        </div>
                    </Modal>

                    <Card title={`${t('rates.service_rates')} (${workRatesSorted.length})`}>
                        {workRatesSorted.length === 0 ? (
                            <div className="empty-state">{t('common.no_data') || 'No work rates defined yet.'}</div>
                        ) : (
                            Object.entries(grouped).map(([cat, items]) => (
                                <div key={cat} className="work-category-group">
                                    <div className="work-category-label">{getTranslatedCategory(cat)}</div>
                                    <div className="rates-table">
                                        <div className="rates-table-header work-header">
                                            <span>{t('rates.work_name')}</span>
                                            <span>{t('common.amount')}</span>
                                            <span>{t('nav.tools')}</span>
                                            <span>{t('common.description')}</span>
                                            <span>{t('common.actions')}</span>
                                        </div>
                                        {items.map((r) => (
                                            <div className="rates-table-row" key={r.id}>
                                                {editingId === r.id ? (
                                                    <>
                                                        <span><input className="inline-edit" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} /></span>
                                                        <span><input type="number" className="inline-edit" value={editData.ratePerUnit} onChange={(e) => setEditData({ ...editData, ratePerUnit: e.target.value })} /></span>
                                                        <span>
                                                            <select className="inline-edit" value={editData.unit} onChange={(e) => setEditData({ ...editData, unit: e.target.value })}>
                                                                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
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
