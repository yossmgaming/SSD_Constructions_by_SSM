import { useState, useEffect } from 'react';
import { Plus, Download, ChevronDown, FileSpreadsheet, FileText, Pencil, Check } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToWord, exportToCSV } from '../utils/exportUtils';
import { useTranslation } from 'react-i18next';
import CountUp from '../components/CountUp';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ExportDropdown from '../components/ExportDropdown';
import { getAll, create, update, queryEq, KEYS } from '../data/db';
import './Suppliers.css';
import BounceButton from '../components/BounceButton';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';
import { generateSupplierPID } from '../utils/security';
import { ClipboardIcon } from '../components/icons/ClipboardIcon';

const emptyForm = { name: '', contact: '', email: '', address: '', notes: '', isActive: true };

export default function Suppliers() {
    const { t } = useTranslation();
    const [suppliers, setSuppliers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedPID, setCopiedPID] = useState(null);

    const { profile, hasRole } = useAuth();
    const isSuperAdminOrFinance = hasRole(['Super Admin', 'Finance']);
    const isClient = profile?.role === 'Client';

    const [isLoadingExport, setIsLoadingExport] = useState(false);

    useEffect(() => { loadData(); }, []);

    const handleExport = async (format) => {
        const exportData = suppliers.map(s => ({
            Supplier: s.name,
            Contact: s.contact,
            Email: s.email,
            Address: s.address,
            Status: s.isActive !== false ? 'Active' : 'Inactive',
            Notes: s.notes
        }));

        const columns = [
            { header: 'Supplier Name', key: 'Supplier' },
            { header: 'Contact Person/Phone', key: 'Contact' },
            { header: 'Email', key: 'Email' },
            { header: 'Address', key: 'Address' },
            { header: 'Status', key: 'Status' },
            { header: 'Notes', key: 'Notes' }
        ];

        const title = 'Company Supplier Directory';
        const fileName = 'Supplier_List';

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
            const [sups, mats] = await Promise.all([
                getAll(KEYS.suppliers),
                getAll(KEYS.materials)
            ]);
            setSuppliers(sups);
            setMaterials(mats);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    const filtered = suppliers.filter((s) => {
        const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.contact || '').includes(search);
        const matchStatus = statusFilter === 'All' || (statusFilter === 'Active' ? s.isActive !== false : s.isActive === false);
        return matchSearch && matchStatus;
    });

    // Duplicate check
    function isNameDuplicate(name) {
        if (!name || !name.trim()) return false;
        return suppliers.some((s) => s.name.toLowerCase() === name.trim().toLowerCase() && s.id !== selectedId);
    }

    function selectSupplier(s) {
        if (selectedId === s.id) {
            setSelectedId(null);
        } else {
            setSelectedId(s.id);
            setForm({ name: s.name, contact: s.contact || '', email: s.email || '', address: s.address || '', notes: s.notes || '', isActive: s.isActive !== false });
        }
    }

    function openEditModal(s) {
        selectSupplier(s);
        setIsModalOpen(true);
    }

    async function handleSave() {
        if (!form.name.trim()) return alert(t('suppliers.supplier_name') + ' ' + t('common.is_required'));
        if (isNameDuplicate(form.name)) return alert(t('suppliers.duplicate_error') || 'A supplier with this name already exists.');

        setIsLoading(true);
        const data = { ...form };
        try {
            if (selectedId) { await update(KEYS.suppliers, selectedId, data); }
            else {
                // Generate a PID for new suppliers
                const pid = generateSupplierPID();
                await create(KEYS.suppliers, { ...data, pid });
            }
            handleClear();
            setIsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }


    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    function renderSupplierExpansion(supplier) {
        const linkedMaterials = materials.filter(m => m.supplierId === supplier.id);
        const totalStockValue = linkedMaterials.reduce((acc, m) => acc + (m.quantity * m.cost), 0);
        return (
            <div className="supplier-expansion-grid">
                <div className="expansion-col">
                    <h4>{t('nav.materials')} {t('common.summary')}</h4>
                    <div className="material-list-inline">
                        {linkedMaterials.length === 0 ? (
                            <div className="no-data-small">No materials associated with this supplier</div>
                        ) : (
                            linkedMaterials.map((m) => (
                                <div className="material-item-inline" key={m.id}>
                                    <div className="mat-name">{m.name}</div>
                                    <div className="mat-stock">{m.quantity} {m.unit} in stock</div>
                                    <div className="mat-value">{fmt(m.quantity * m.cost)}</div>
                                </div>
                            ))
                        )}
                        {linkedMaterials.length > 0 && (
                            <div className="total-row-inline">
                                <span>{t('dashboard.total_value')}</span>
                                <strong>{fmt(totalStockValue)}</strong>
                            </div>
                        )}
                    </div>
                </div>
                <div className="expansion-col">
                    <h4>{t('common.details')} & {t('common.address')}</h4>
                    <div className="details-mini-grid">
                        <div className="detail-item">
                            <label>{t('common.email')}</label>
                            <span>{supplier.email || 'No email provided'}</span>
                        </div>
                        <div className="detail-item">
                            <label>{t('common.address')}</label>
                            <span className="address-text">{supplier.address || 'No address recorded.'}</span>
                        </div>
                        <div className="detail-item">
                            <label>{t('common.notes')}</label>
                            <span className="notes-text">{supplier.notes || 'No specific notes recorded.'}</span>
                        </div>
                    </div>
                    {isSuperAdminOrFinance && (
                        <div className="expansion-actions">
                            <BounceButton className="btn btn-secondary btn-sm" onClick={() => openEditModal(supplier)}>
                                <Pencil size={14} /> {t('suppliers.edit_supplier')}
                            </BounceButton>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function handleClear() { setForm(emptyForm); setSelectedId(null); }

    const columns = [
        {
            key: 'pid',
            label: 'PID',
            render: (v) => v ? (
                <div className="flex items-center gap-2">
                    <span className="pid-badge">{v}</span>
                    <BounceButton className="icon-btn copy-btn" style={{ width: 22, height: 22 }}
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(v); setCopiedPID(v); setTimeout(() => setCopiedPID(null), 2000); }}
                        title="Copy PID">
                        {copiedPID === v ? <Check size={12} className="text-emerald-500" /> : <ClipboardIcon size={12} />}
                    </BounceButton>
                </div>
            ) : <span className="text-slate-400 text-xs">—</span>
        },
        { key: 'name', label: t('suppliers.supplier_name') },
        { key: 'contact', label: t('common.phone') },
        { key: 'email', label: t('common.email'), render: (v) => v || '—' },
        { key: 'address', label: t('common.address'), render: (v) => v ? (v.length > 30 ? v.slice(0, 30) + '…' : v) : '—' },
        {
            key: 'isActive', label: t('common.status'), render: (v) => (
                <span className={`badge ${v !== false ? 'badge-success' : 'badge-danger'} `}>{v !== false ? t('common.active') : t('common.inactive')}</span>
            )
        },
        {
            key: 'actions', label: '', render: (_, row) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <BounceButton
                        className="icon-btn edit-btn"
                        title="Edit Supplier"
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                    >
                        <Pencil size={14} />
                    </BounceButton>
                </div>
            )
        }
    ];

    if (isClient) {
        return (
            <div className="crud-page suppliers-page flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <Card>
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                        <Shield size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
                        <h2 style={{ color: 'var(--text-color)', marginBottom: 8 }}>Access Denied</h2>
                        <p>This module contains company supplier data restricted to internal staff.</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <GlobalLoadingOverlay loading={isLoading} message="Retrieving Supplier Network Data...">
            <div className="crud-page suppliers-page">
                <div className="page-header">
                    <h1>{t('suppliers.title')}</h1>
                    <div className="page-header-actions" style={{ display: 'flex', gap: '12px' }}>
                        <ExportDropdown onExport={handleExport} isLoading={isLoadingExport} />
                        {isSuperAdminOrFinance && (
                            <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}><Plus size={18} /> {t('suppliers.new_supplier')}</BounceButton>
                        )}
                    </div>
                </div>

                <div className="filter-bar">
                    <div className="filter-group" style={{ flex: 2 }}>
                        <label>{t('common.search')}</label>
                        <input placeholder={t('projects.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="filter-group" style={{ flex: 1 }}>
                        <label>{t('common.status')}</label>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="All">{t('common.all')}</option>
                            <option value="Active">{t('common.active')}</option>
                            <option value="Inactive">{t('common.inactive')}</option>
                        </select>
                    </div>
                </div>

                <div className="result-count">
                    {t('common.showing')} <strong><CountUp to={filtered.length} /></strong> {t('common.of')} <strong><CountUp to={suppliers.length} /></strong> {t('nav.suppliers')}
                    {(search || statusFilter !== 'All') && <span className="filter-active-tag">{t('common.filtered')}</span>}
                </div>

                <div className="crud-layout" style={{ gridTemplateColumns: '1fr' }}>
                    <Card title={t('suppliers.supplier_list')}>
                        <DataTable
                            columns={columns}
                            data={filtered}
                            selectedId={selectedId}
                            onRowClick={selectSupplier}
                            emptyMessage={t('suppliers.no_suppliers')}
                            renderExpansion={renderSupplierExpansion}
                        />
                    </Card>

                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => { setIsModalOpen(false); handleClear(); }}
                        title={selectedId ? (isSuperAdminOrFinance ? t('suppliers.edit_supplier') : t('common.details')) : t('suppliers.new_supplier')}
                        onSave={isSuperAdminOrFinance ? handleSave : undefined}
                    >
                        <div className="form-group">
                            <label>{t('suppliers.supplier_name')}</label>
                            <input disabled={!isSuperAdminOrFinance} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={isNameDuplicate(form.name) ? 'input-error' : ''} />
                            {isNameDuplicate(form.name) && <span className="field-error">⚠ {t('suppliers.duplicate_error') || 'A supplier with this name already exists'}</span>}
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('common.phone')}</label>
                                <input disabled={!isSuperAdminOrFinance} placeholder="077XXXXXXX" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>{t('common.email')}</label>
                                <input disabled={!isSuperAdminOrFinance} type="email" placeholder="supplier@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>{t('common.address')}</label>
                            <input disabled={!isSuperAdminOrFinance} placeholder="..." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>{t('common.status')}</label>
                            <select disabled={!isSuperAdminOrFinance} value={form.isActive ? 'Active' : 'Inactive'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'Active' })}>
                                <option value="Active">{t('common.active')}</option>
                                <option value="Inactive">{t('common.inactive')}</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{t('common.notes')}</label>
                            <textarea disabled={!isSuperAdminOrFinance} placeholder="..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </div>
                    </Modal>
                </div>
            </div>
        </GlobalLoadingOverlay>
    );
}
