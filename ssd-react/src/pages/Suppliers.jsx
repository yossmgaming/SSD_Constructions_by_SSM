import { useState, useEffect } from 'react';
import { Plus, Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToWord, exportToCSV } from '../utils/exportUtils';
import { useTranslation } from 'react-i18next';
import CountUp from '../components/CountUp';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ExportDropdown from '../components/ExportDropdown';
import { getAll, create, update, remove, query, KEYS } from '../data/db';
import './Suppliers.css';
import BounceButton from '../components/BounceButton';

const emptyForm = { name: '', contact: '', email: '', address: '', notes: '', isActive: true };

export default function Suppliers() {
    const { t } = useTranslation();
    const [suppliers, setSuppliers] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

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
            const data = await getAll(KEYS.suppliers);
            setSuppliers(data);
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
        setSelectedId(s.id);
        setForm({ name: s.name, contact: s.contact || '', email: s.email || '', address: s.address || '', notes: s.notes || '', isActive: s.isActive !== false });
        setIsModalOpen(true);
    }

    async function handleSave() {
        if (!form.name.trim()) return alert(t('suppliers.supplier_name') + ' ' + t('common.is_required'));
        if (isNameDuplicate(form.name)) return alert(t('suppliers.duplicate_error') || 'A supplier with this name already exists.');

        setIsLoading(true);
        const data = { ...form };
        try {
            if (selectedId) { await update(KEYS.suppliers, selectedId, data); }
            else { await create(KEYS.suppliers, data); }
            handleClear();
            setIsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    async function handleDelete() {
        if (!selectedId) return;

        setIsLoading(true);
        try {
            // Dependency check — materials linked to this supplier
            const matCount = (await query(KEYS.materials, (m) => m.supplierId == selectedId)).length;
            let msg = t('common.delete_confirm') || 'Delete this supplier?';
            if (matCount > 0) {
                msg = `⚠️ ${t('suppliers.linked_materials_warning', { count: matCount }) || `This supplier is linked to ${matCount} materials.`}\n\n${t('common.delete_anyway') || 'Are you sure?'}`;
            }
            if (!confirm(msg)) {
                setIsLoading(false);
                return;
            }
            await remove(KEYS.suppliers, selectedId);
            handleClear();
            setIsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    function handleClear() { setForm(emptyForm); setSelectedId(null); }

    const columns = [
        { key: 'name', label: t('suppliers.supplier_name') },
        { key: 'contact', label: t('common.phone') },
        { key: 'email', label: t('common.email'), render: (v) => v || '—' },
        { key: 'address', label: t('common.address'), render: (v) => v ? (v.length > 30 ? v.slice(0, 30) + '…' : v) : '—' },
        {
            key: 'isActive', label: t('common.status'), render: (v) => (
                <span className={`badge ${v !== false ? 'badge-success' : 'badge-danger'} `}>{v !== false ? t('common.active') : t('common.inactive')}</span>
            )
        },
    ];

    return (
        <div className="crud-page suppliers-page">
            <div className="page-header">
                <h1>{t('suppliers.title')}</h1>
                <div className="page-header-actions" style={{ display: 'flex', gap: '12px' }}>
                    <ExportDropdown onExport={handleExport} isLoading={isLoadingExport} />
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}><Plus size={18} /> {t('suppliers.new_supplier')}</BounceButton>
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
                    <DataTable columns={columns} data={filtered} selectedId={selectedId} onRowClick={selectSupplier} emptyMessage={t('suppliers.no_suppliers')} />
                </Card>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); handleClear(); }}
                    title={selectedId ? t('suppliers.edit_supplier') : t('suppliers.new_supplier')}
                    onSave={handleSave}
                    onDelete={selectedId ? handleDelete : undefined}
                >
                    <div className="form-group">
                        <label>{t('suppliers.supplier_name')}</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={isNameDuplicate(form.name) ? 'input-error' : ''} />
                        {isNameDuplicate(form.name) && <span className="field-error">⚠ {t('suppliers.duplicate_error') || 'A supplier with this name already exists'}</span>}
                    </div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>{t('common.phone')}</label>
                            <input placeholder="077XXXXXXX" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>{t('common.email')}</label>
                            <input type="email" placeholder="supplier@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>{t('common.address')}</label>
                        <input placeholder="..." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>{t('common.status')}</label>
                        <select value={form.isActive ? 'Active' : 'Inactive'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'Active' })}>
                            <option value="Active">{t('common.active')}</option>
                            <option value="Inactive">{t('common.inactive')}</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>{t('common.notes')}</label>
                        <textarea placeholder="..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                </Modal>
            </div>
        </div>
    );
}
