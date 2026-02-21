import { useState, useEffect, useMemo } from 'react';
import { Plus, AlertTriangle, Package, Trash2, Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToWord, exportToCSV } from '../utils/exportUtils';
import { useTranslation } from 'react-i18next';
import CountUp from '../components/CountUp';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ExportDropdown from '../components/ExportDropdown';
import { getAll, create, update, remove, query, KEYS } from '../data/db';
import { MaterialCategories, MeasurementUnits } from '../models/enums';
import './Materials.css';
import BounceButton from '../components/BounceButton';

const emptyForm = { name: '', category: '', customCategory: '', unit: '', customUnit: '', quantity: '', cost: '', minStock: '', supplierId: '', notes: '' };

export default function Materials() {
    const { t } = useTranslation();
    const [materials, setMaterials] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Project assignment state
    const [assignProject, setAssignProject] = useState('');
    const [assignQty, setAssignQty] = useState('');
    const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
    const [assignNotes, setAssignNotes] = useState('');

    // Core data references
    const [suppliers, setSuppliers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [workRates, setWorkRates] = useState([]);
    const [projectMaterials, setProjectMaterials] = useState([]);

    const [isLoadingExport, setIsLoadingExport] = useState(false);

    useEffect(() => { loadData(); }, []);

    const handleExport = async (format) => {
        const exportData = materials.map(m => ({
            Material: m.name,
            Category: m.category,
            Unit: m.unit,
            Quantity: m.quantity,
            UnitCost: m.cost,
            TotalValue: (m.quantity || 0) * (m.cost || 0),
            MinStock: m.minStock,
            Notes: m.notes
        }));

        const columns = [
            { header: 'Material Name', key: 'Material' },
            { header: 'Category', key: 'Category' },
            { header: 'Unit', key: 'Unit' },
            { header: 'Qty in Stock', key: 'Quantity' },
            { header: 'Unit Cost (LKR)', key: 'UnitCost' },
            { header: 'Total Value (LKR)', key: 'TotalValue' },
            { header: 'Reorder Level', key: 'MinStock' },
            { header: 'Notes', key: 'Notes' }
        ];

        const title = 'Company Material Inventory Report';
        const fileName = 'Material_Inventory_List';

        setIsLoadingExport(true);
        try {
            if (format === 'pdf') await exportToPDF({ title, data: exportData, columns, fileName });
            else if (format === 'excel') exportToExcel({ title, data: exportData, columns, fileName });
            else if (format === 'word') await exportToWord({ title, data: exportData, columns, fileName });
            else if (format === 'csv') exportToCSV(exportData, fileName);
        } catch (e) {
            console.error("Export failed:", e);
        } finally {
            setIsLoadingExport(false);
        }
    };

    async function loadData() {
        setIsLoading(true);
        try {
            const [mats, sups, projs, wrkRts, pm] = await Promise.all([
                getAll(KEYS.materials),
                getAll(KEYS.suppliers),
                getAll(KEYS.projects),
                getAll(KEYS.workRates),
                getAll(KEYS.projectMaterials)
            ]);
            setMaterials(mats);
            setSuppliers(sups);
            setProjects(projs);
            setWorkRates(wrkRts);
            setProjectMaterials(pm);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    // Get assignments for selected material
    const assignments = useMemo(() => {
        if (!selectedId) return [];
        return projectMaterials.filter((pm) => pm.materialId === selectedId);
    }, [selectedId, projectMaterials]);

    async function assignToProject() {
        if (!assignProject) return alert(t('attendance.select_project') || 'Select a project');
        if (!assignQty || parseFloat(assignQty) <= 0) return alert('Enter a valid quantity');
        setIsLoading(true);
        try {
            await create(KEYS.projectMaterials, {
                materialId: selectedId,
                projectId: parseInt(assignProject),
                quantity: parseFloat(assignQty),
                date: assignDate,
                notes: assignNotes,
            });
            setAssignProject(''); setAssignQty(''); setAssignNotes('');
            await loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function removeAssignment(id) {
        if (!confirm('Remove this project assignment?')) return;
        setIsLoading(true);
        await remove(KEYS.projectMaterials, id);
        await loadData();
    }

    function getProjectName(id) {
        const p = projects.find((pr) => pr.id === id);
        return p ? p.name : 'Unknown';
    }

    const filtered = materials.filter((m) => {
        const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || (m.category || '').toLowerCase().includes(search.toLowerCase());
        const matchCat = catFilter === 'All' || m.category === catFilter;
        return matchSearch && matchCat;
    });

    // ✅ Stock value summary
    const stockSummary = useMemo(() => {
        const totalValue = materials.reduce((s, m) => s + ((m.quantity || 0) * (m.cost || 0)), 0);
        const lowStockCount = materials.filter((m) => m.minStock && m.quantity <= m.minStock).length;
        return { totalItems: materials.length, totalValue, lowStockCount };
    }, [materials]);

    // ✅ Duplicate name check
    function isNameDuplicate(name) {
        if (!name || !name.trim()) return false;
        return materials.some((m) => m.name.toLowerCase() === name.trim().toLowerCase() && m.id !== selectedId);
    }

    // ✅ Build unique categories from data + enum + workRates
    const allCategories = useMemo(() => {
        const fromData = materials.map((m) => m.category).filter(Boolean);
        const workRateCats = workRates.map(r => r.category).filter(Boolean);
        const combined = new Set([...MaterialCategories.filter(c => c !== 'Other'), ...fromData, ...workRateCats]);
        return [...combined].sort();
    }, [materials, workRates]);

    function selectMaterial(m) {
        setSelectedId(m.id);
        const isCatPreset = allCategories.includes(m.category); // Use dynamic list
        const isUnitPreset = MeasurementUnits.includes(m.unit);
        setForm({
            name: m.name, category: isCatPreset ? m.category : 'Other', customCategory: isCatPreset ? '' : (m.category || ''),
            unit: isUnitPreset ? m.unit : 'Other', customUnit: isUnitPreset ? '' : (m.unit || ''),
            quantity: m.quantity || '', cost: m.cost || '', minStock: m.minStock || '',
            supplierId: m.supplierId || '', notes: m.notes || '',
        });
        setIsModalOpen(true);
    }

    async function handleSave() {
        if (!form.name.trim()) return alert('Material name is required');
        if (isNameDuplicate(form.name)) return alert('A material with this name already exists.');

        const category = form.category === 'Other' ? form.customCategory.trim() : form.category;
        const unit = form.unit === 'Other' ? form.customUnit.trim() : form.unit;

        setIsLoading(true);
        const data = {
            name: form.name.trim(), category, unit,
            quantity: parseFloat(form.quantity) || 0,
            cost: parseFloat(form.cost) || 0,
            minStock: parseFloat(form.minStock) || 0,
            supplierId: form.supplierId, notes: form.notes,
        };
        try {
            if (selectedId) { await update(KEYS.materials, selectedId, data); }
            else { await create(KEYS.materials, data); }
            handleClear();
            setIsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    // ✅ Delete with dependency check
    async function handleDelete() {
        if (!selectedId) return;

        setIsLoading(true);
        try {
            const pmCount = (await query(KEYS.projectMaterials, (pm) => pm.materialId === selectedId)).length;
            const boqCount = (await query(KEYS.boqItems, (b) => b.materialId === selectedId)).length;

            const deps = [];
            if (pmCount > 0) deps.push(`${pmCount} project material record${pmCount > 1 ? 's' : ''}`);
            if (boqCount > 0) deps.push(`${boqCount} BOQ item${boqCount > 1 ? 's' : ''}`);

            let msg = 'Delete this material?';
            if (deps.length > 0) {
                msg = `⚠️ This material has ${deps.join(', ')}.\n\nDeleting will leave orphan records. Are you sure?`;
            }
            if (!confirm(msg)) {
                setIsLoading(false);
                return;
            }
            await remove(KEYS.materials, selectedId);
            handleClear();
            setIsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    function handleClear() { setForm(emptyForm); setSelectedId(null); }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const columns = [
        { key: 'name', label: t('common.name') },
        { key: 'category', label: t('common.category') },
        {
            key: 'quantity', label: t('materials.stock_qty'), render: (v, row) => {
                const isLow = row.minStock && v <= row.minStock;
                return (
                    <span className={isLow ? 'low-stock-qty' : ''}>
                        {v} {row.unit || ''}
                        {/* ✅ Low stock badge */}
                        {isLow && <span className="low-stock-badge">{t('materials.low_stock')}</span>}
                    </span>
                );
            }
        },
        { key: 'cost', label: t('materials.unit_cost'), render: (v) => fmt(v) },
        {
            /* ✅ Total value column */
            key: 'quantity', label: t('dashboard.total'), render: (v, row) => {
                const total = (row.quantity || 0) * (row.cost || 0);
                return <span className="total-value">{fmt(total)}</span>;
            }
        },
    ];

    return (
        <div className="crud-page materials-page">
            <div className="page-header">
                <h1>{t('materials.title')}</h1>
                <div className="page-header-actions" style={{ display: 'flex', gap: '12px' }}>
                    <ExportDropdown onExport={handleExport} isLoading={isLoadingExport} />
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}><Plus size={18} /> {t('materials.new_material')}</BounceButton>
                </div>
            </div>

            {/* ✅ Stock summary cards */}
            <div className="stock-summary">
                <div className="stock-card">
                    <div className="stock-card-label">{t('materials.total_items')}</div>
                    <div className="stock-card-value"><CountUp to={stockSummary.totalItems} /></div>
                </div>
                <div className="stock-card">
                    <div className="stock-card-label">{t('materials.total_stock_value')}</div>
                    <div className="stock-card-value value-green"><span className="currency-prefix">LKR</span> <CountUp to={stockSummary.totalValue} separator="," /></div>
                </div>
                <div className={`stock-card ${stockSummary.lowStockCount > 0 ? 'stock-card-alert' : ''}`}>
                    <div className="stock-card-label">{stockSummary.lowStockCount > 0 && <AlertTriangle size={13} />} {t('materials.low_stock_items')}</div>
                    <div className={`stock-card-value ${stockSummary.lowStockCount > 0 ? 'value-red' : ''}`}><CountUp to={stockSummary.lowStockCount} /></div>
                </div>
            </div>

            <div className="filter-bar">
                <div className="filter-group" style={{ flex: 2 }}>
                    <label>{t('common.search')}</label>
                    <input placeholder={t('projects.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {/* ✅ Category filter */}
                <div className="filter-group" style={{ flex: 1 }}>
                    <label>{t('common.category')}</label>
                    <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                        <option value="All">{t('common.all')}</option>
                        {allCategories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* ✅ Material count */}
            <div className="result-count">
                {t('common.showing')} <strong>{filtered.length}</strong> {t('common.of')} <strong>{materials.length}</strong> {t('nav.materials')}
                {(search || catFilter !== 'All') && <span className="filter-active-tag">{t('common.filtered')}</span>}
            </div>

            <div className="crud-layout" style={{ gridTemplateColumns: '1fr' }}>
                <Card title={t('materials.material_list')}>
                    <DataTable columns={columns} data={filtered} selectedId={selectedId} onRowClick={selectMaterial} emptyMessage={t('materials.no_materials')} />
                </Card>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); handleClear(); }}
                    title={selectedId ? t('materials.edit_material') : t('materials.new_material')}
                    onSave={handleSave}
                    onDelete={selectedId ? handleDelete : undefined}
                >
                    <div className="form-group">
                        <label>{t('materials.material_name')}</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={isNameDuplicate(form.name) ? 'input-error' : ''} />
                        {/* ✅ Duplicate warning */}
                        {isNameDuplicate(form.name) && <span className="field-error">⚠ A material with this name already exists</span>}
                    </div>

                    {/* ✅ Category dropdown */}
                    <div className="form-group">
                        <label>{t('common.category')}</label>
                        <select value={allCategories.includes(form.category) ? form.category : 'Other'} onChange={(e) => {
                            if (e.target.value === 'Other') setForm({ ...form, category: 'Other', customCategory: '' });
                            else setForm({ ...form, category: e.target.value, customCategory: '' });
                        }}>
                            {allCategories.map((c) => <option key={c}>{c}</option>)}
                            <option value="Other">{t('payments.categories.other')}</option>
                        </select>
                    </div>
                    {(form.category === 'Other') && (
                        <div className="form-group">
                            <label>{t('projects.custom_type')}</label>
                            <input placeholder="..." value={form.customCategory} onChange={(e) => setForm({ ...form, customCategory: e.target.value })} />
                        </div>
                    )}

                    <div className="form-grid">
                        <div className="form-group">
                            <label>{t('materials.stock_qty')}</label>
                            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                        </div>
                        {/* ✅ Unit dropdown from shared enums */}
                        <div className="form-group">
                            <label>{t('nav.tools')}</label>
                            <select value={MeasurementUnits.includes(form.unit) ? form.unit : 'Other'} onChange={(e) => {
                                if (e.target.value === 'Other') setForm({ ...form, unit: 'Other', customUnit: '' });
                                else setForm({ ...form, unit: e.target.value, customUnit: '' });
                            }}>
                                {MeasurementUnits.map((u) => <option key={u}>{u}</option>)}
                                <option value="Other">{t('payments.categories.other')}</option>
                            </select>
                        </div>
                    </div>
                    {(form.unit === 'Other') && (
                        <div className="form-group">
                            <label>{t('projects.custom_type')}</label>
                            <input placeholder="..." value={form.customUnit} onChange={(e) => setForm({ ...form, customUnit: e.target.value })} />
                        </div>
                    )}

                    <div className="form-grid">
                        <div className="form-group">
                            {/* ✅ Cost preview */}
                            <label>{t('materials.unit_cost')} (LKR) {form.cost && <span className="rate-preview">{fmt(form.cost)}</span>}</label>
                            <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
                        </div>
                        {/* ✅ Minimum stock level */}
                        <div className="form-group">
                            <label>{t('materials.min_stock')}</label>
                            <input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
                        </div>
                    </div>

                    {/* Total value preview */}
                    {form.quantity && form.cost && (
                        <div className="total-preview" style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                            {t('dashboard.total')}: <strong style={{ color: 'var(--text-primary)' }}>{fmt(form.quantity * form.cost)}</strong>
                        </div>
                    )}

                    {/* ✅ Supplier dropdown */}
                    <div className="form-group">
                        <label>{t('nav.suppliers')}</label>
                        <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                            <option value="">— {t('common.all')} —</option>
                            {suppliers.filter((s) => s.isActive !== false).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    {/* ✅ Notes */}
                    <div className="form-group">
                        <label>{t('common.notes')}</label>
                        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>

                    {/* Project Assignment Section */}
                    <div className="assignment-section" style={{ borderTop: '1px solid var(--border-color)', marginTop: 16, paddingTop: 16 }}>
                        <h4 style={{ fontSize: '0.875rem', marginBottom: 12 }}>📁 {t('materials.project_assignment')}</h4>
                        {!selectedId ? (
                            <p className="text-muted-hint" style={{ fontSize: '0.8125rem' }}>{t('dashboard.no_projects')}</p>
                        ) : (
                            <>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('common.project')}</label>
                                        <select value={assignProject} onChange={(e) => setAssignProject(e.target.value)}>
                                            <option value="">— {t('common.all')} —</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.status !== 'Ongoing' ? `[${p.status}]` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('materials.stock_qty')}</label>
                                        <input type="number" placeholder="0" value={assignQty} onChange={(e) => setAssignQty(e.target.value)} />
                                    </div>
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>{t('common.date')}</label>
                                        <input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>{t('common.notes')}</label>
                                        <input value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} />
                                    </div>
                                </div>
                                <BounceButton className="btn btn-primary btn-sm mt-2" onClick={assignToProject}><Plus size={14} /> {t('materials.assign_to_project')}</BounceButton>

                                {assignments.length > 0 && (
                                    <div className="history-list mt-4" style={{ maxHeight: '120px', overflowY: 'auto', background: 'var(--bg-card)', padding: 8, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                        <div className="history-header" style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 8 }}>{t('materials.project_assignment')} ({assignments.length})</div>
                                        {assignments.map((a) => (
                                            <div key={a.id} className="history-item" style={{ fontSize: '0.8125rem', padding: '4px 0', borderBottom: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div className="history-item-info">
                                                    <strong>{getProjectName(a.projectId)}</strong>
                                                    <span style={{ margin: '0 8px' }}>{a.quantity} {form.unit !== 'Other' ? form.unit : form.customUnit}</span>
                                                    <span className="text-muted">{a.date ? new Date(a.date).toLocaleDateString() : ''}</span>
                                                    {a.notes && <div className="history-note text-muted" style={{ marginTop: 2 }}>{a.notes}</div>}
                                                </div>
                                                <BounceButton className="btn-icon delete" onClick={() => removeAssignment(a.id)}><Trash2 size={12} color="var(--text-danger)" /></BounceButton>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </Modal>
            </div>
        </div>
    );
}
