import { useState, useEffect } from 'react';
import { Landmark, Plus, Search, Building, User, Truck, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import BounceButton from '../components/BounceButton';
import Modal from '../components/Modal';
import { getAll, create, remove, KEYS } from '../data/db';
import './BankAccounts.css';

export default function BankAccounts() {
    const [entityType, setEntityType] = useState('worker');
    const [selectedEntityId, setSelectedEntityId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Database states
    const [allBankAccounts, setAllBankAccounts] = useState([]);
    const [entities, setEntities] = useState({ worker: [], supplier: [], client: [] });

    // Form states
    const [form, setForm] = useState({ entityId: '', accName: '', accNo: '', bank: '', branch: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [w, s, p, b] = await Promise.all([
                getAll(KEYS.workers),
                getAll(KEYS.suppliers),
                getAll(KEYS.projects),
                getAll(KEYS.bankAccounts)
            ]);

            const workers = w.map(wa => ({ id: wa.id, name: wa.fullName }));
            const suppliers = s.map(sa => ({ id: sa.id, name: sa.name }));
            const clients = p.map(pa => ({ id: pa.id, name: pa.clientName || pa.name }));

            setEntities({ worker: workers, supplier: suppliers, client: clients });
            setAllBankAccounts(b || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = () => {
        setForm({ entityId: currentEntities[0]?.id || '', accName: '', accNo: '', bank: '', branch: '' });
        setIsAddModalOpen(true);
    };

    const handleSaveAccount = async () => {
        if (!form.entityId || !form.accName || !form.accNo || !form.bank) return;

        // Find entity name to denormalize for quick rendering
        const entityName = entities[entityType].find(e => e.id.toString() === form.entityId.toString())?.name || 'Unknown';

        setIsLoading(true);
        try {
            await create(KEYS.bankAccounts, {
                ...form,
                entityType,
                name: entityName
            });
            await loadData();
            setIsAddModalOpen(false);
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async (id) => {
        if (window.confirm("Are you sure you want to delete this bank account?")) {
            setIsLoading(true);
            try {
                await remove(KEYS.bankAccounts, id);
                await loadData();
            } catch (error) {
                console.error(error);
                setIsLoading(false);
            }
        }
    };

    // Filtering logic
    const currentAccounts = allBankAccounts.filter(acc => acc.entityType === entityType);
    const filteredAccounts = currentAccounts.filter(acc => {
        const matchesEntity = selectedEntityId === 'all' || acc.entityId === selectedEntityId;
        const matchesSearch = acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            acc.accNo.includes(searchQuery) ||
            acc.bank.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesEntity && matchesSearch;
    });

    const currentEntities = entities[entityType] || [];

    const getTypeIcon = () => {
        if (entityType === 'worker') return <User size={16} />;
        if (entityType === 'supplier') return <Truck size={16} />;
        return <Building size={16} />;
    };

    return (
        <div className="bank-accounts-page">
            <div className="page-header">
                <div>
                    <h1>Bank Accounts</h1>
                    <p>Manage payment details for Workers, Suppliers, and Clients</p>
                </div>
                <div className="header-actions">
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={handleOpenModal}>
                        <Plus size={16} /> Add Account
                    </BounceButton>
                </div>
            </div>

            <div className="filter-bar">
                <div className="filter-group">
                    <label>Entity Type</label>
                    <div className="type-toggle">
                        <BounceButton
                            className={`type-btn ${entityType === 'worker' ? 'active' : ''}`}
                            onClick={() => { setEntityType('worker'); setSelectedEntityId('all'); }}
                        >
                            <User size={14} /> Workers
                        </BounceButton>
                        <BounceButton
                            className={`type-btn ${entityType === 'supplier' ? 'active' : ''}`}
                            onClick={() => { setEntityType('supplier'); setSelectedEntityId('all'); }}
                        >
                            <Truck size={14} /> Suppliers
                        </BounceButton>
                        <BounceButton
                            className={`type-btn ${entityType === 'client' ? 'active' : ''}`}
                            onClick={() => { setEntityType('client'); setSelectedEntityId('all'); }}
                        >
                            <Building size={14} /> Clients
                        </BounceButton>
                    </div>
                </div>

                <div className="filter-group">
                    <label>Select {entityType}</label>
                    <div className="select-wrapper">
                        <span className="select-icon">{getTypeIcon()}</span>
                        <select
                            value={selectedEntityId}
                            onChange={(e) => setSelectedEntityId(e.target.value)}
                            className="entity-select"
                        >
                            <option value="all">All {entityType}s</option>
                            {currentEntities.map(ent => (
                                <option key={ent.id} value={ent.id}>{ent.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="filter-group search-group">
                    <label>Search Details</label>
                    <div className="search-input-wrapper">
                        <Search className="search-icon" size={16} />
                        <input
                            type="text"
                            placeholder="Search name, acc no, bank..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="accounts-container">
                <div className="accounts-header">
                    <h2>Saved Accounts</h2>
                    <span className="count-badge">{filteredAccounts.length}</span>
                </div>

                {filteredAccounts.length > 0 ? (
                    <div className="accounts-grid">
                        {filteredAccounts.map(account => (
                            <motion.div
                                key={account.id}
                                className="account-card"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="acc-card-header">
                                    <div className="acc-entity-info">
                                        <div className="acc-avatar">
                                            {getTypeIcon()}
                                        </div>
                                        <div>
                                            <h3>{account.name}</h3>
                                            <span className="acc-type-tag">{entityType}</span>
                                        </div>
                                    </div>
                                    <div className="acc-actions">
                                        <button className="icon-btn delete-btn" onClick={() => handleDeleteAccount(account.id)}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div className="acc-card-body">
                                    <div className="acc-detail-row">
                                        <span className="acc-label">Account Name</span>
                                        <span className="acc-value">{account.accName}</span>
                                    </div>
                                    <div className="acc-detail-row highlight-acc">
                                        <span className="acc-label">Account No.</span>
                                        <span className="acc-value mono">{account.accNo}</span>
                                    </div>
                                    <div className="acc-detail-row">
                                        <span className="acc-label">Bank</span>
                                        <span className="acc-value text-primary">{account.bank}</span>
                                    </div>
                                    <div className="acc-detail-row">
                                        <span className="acc-label">Branch</span>
                                        <span className="acc-value">{account.branch}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <Landmark size={48} className="empty-icon" />
                        <h3>No Bank Accounts Found</h3>
                        <p>No banking details match your current selection.</p>
                        <BounceButton disabled={isLoading} className="btn btn-primary" onClick={handleOpenModal}>
                            Add New Account
                        </BounceButton>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add New Bank Account"
                subtitle={`Link a new bank account to a ${entityType}.`}
                onSave={handleSaveAccount}
            >
                <div className="form-group mt-4">
                    <label>Select {entityType}</label>
                    <select className="form-control" value={form.entityId} onChange={e => setForm({ ...form, entityId: e.target.value })}>
                        <option value="">Select a {entityType}...</option>
                        {currentEntities.map(ent => (
                            <option key={ent.id} value={ent.id}>{ent.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Account Name</label>
                    <input type="text" className="form-control" placeholder="e.g. Priyantha Madawatta" value={form.accName} onChange={e => setForm({ ...form, accName: e.target.value })} />
                </div>
                <div className="form-group">
                    <label>Account Number</label>
                    <input type="text" className="form-control mono" placeholder="000-000-0000" value={form.accNo} onChange={e => setForm({ ...form, accNo: e.target.value })} />
                </div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Bank Name</label>
                        <input type="text" className="form-control" placeholder="e.g. Commercial Bank" value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Branch</label>
                        <input type="text" className="form-control" placeholder="e.g. Colombo 01" value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })} />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
