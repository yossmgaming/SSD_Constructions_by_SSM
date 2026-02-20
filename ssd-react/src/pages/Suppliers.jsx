import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import CountUp from '../components/CountUp';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { getAll, create, update, remove, query, KEYS } from '../data/db';
import './Suppliers.css';
import BounceButton from '../components/BounceButton';

const emptyForm = { name: '', contact: '', email: '', address: '', notes: '', isActive: true };

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

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
        if (!form.name.trim()) return alert('Supplier name is required');
        if (isNameDuplicate(form.name)) return alert('A supplier with this name already exists.');

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
            let msg = 'Delete this supplier?';
            if (matCount > 0) {
                msg = `⚠️ This supplier is linked to ${matCount} material${matCount > 1 ? 's' : ''}.\n\nDeleting will remove the supplier link. Are you sure?`;
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
        { key: 'name', label: 'Supplier Name' },
        { key: 'contact', label: 'Phone' },
        { key: 'email', label: 'Email', render: (v) => v || '—' },
        { key: 'address', label: 'Address', render: (v) => v ? (v.length > 30 ? v.slice(0, 30) + '…' : v) : '—' },
        {
            key: 'isActive', label: 'Status', render: (v) => (
                <span className={`badge ${v !== false ? 'badge-success' : 'badge-danger'} `}>{v !== false ? 'Active' : 'Inactive'}</span>
            )
        },
    ];

    return (
        <div className="crud-page suppliers-page">
            <div className="page-header">
                <h1>Suppliers</h1>
                <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}><Plus size={18} /> New Supplier</BounceButton>
            </div>

            <div className="filter-bar">
                <div className="filter-group" style={{ flex: 2 }}>
                    <label>Search</label>
                    <input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="filter-group" style={{ flex: 1 }}>
                    <label>Status</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option>All</option>
                        <option>Active</option>
                        <option>Inactive</option>
                    </select>
                </div>
            </div>

            <div className="result-count">
                Showing <strong><CountUp to={filtered.length} /></strong> of <strong><CountUp to={suppliers.length} /></strong> supplier{suppliers.length !== 1 ? 's' : ''}
                {(search || statusFilter !== 'All') && <span className="filter-active-tag">Filtered</span>}
            </div>

            <div className="crud-layout" style={{ gridTemplateColumns: '1fr' }}>
                <Card title="Supplier List">
                    <DataTable columns={columns} data={filtered} selectedId={selectedId} onRowClick={selectSupplier} emptyMessage="No suppliers found" />
                </Card>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); handleClear(); }}
                    title={selectedId ? 'Edit Supplier' : 'New Supplier'}
                    onSave={handleSave}
                    onDelete={selectedId ? handleDelete : undefined}
                >
                    <div className="form-group">
                        <label>Supplier Name</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={isNameDuplicate(form.name) ? 'input-error' : ''} />
                        {isNameDuplicate(form.name) && <span className="field-error">⚠ A supplier with this name already exists</span>}
                    </div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Phone</label>
                            <input placeholder="077XXXXXXX" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" placeholder="supplier@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Address</label>
                        <input placeholder="Business address..." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Status</label>
                        <select value={form.isActive ? 'Active' : 'Inactive'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'Active' })}>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Notes</label>
                        <textarea placeholder="Additional details..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                </Modal>
            </div>
        </div>
    );
}
