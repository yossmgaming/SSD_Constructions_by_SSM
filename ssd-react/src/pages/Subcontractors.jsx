import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, HardHat, Phone, Mail, MapPin, Shield, Check } from 'lucide-react';
import { supabase } from '../data/supabase';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import BounceButton from '../components/BounceButton';
import Modal from '../components/Modal';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';
import { generateSubcontractorPID } from '../utils/security';
import { ClipboardIcon } from '../components/icons/ClipboardIcon';
import './Workers.css'; // Reuse worker styles

const emptyForm = {
    fullName: '',
    company: '',
    specialty: '',
    phone: '',
    phone2: '',
    email: '',
    address: '',
    nic_passport: '',
    notes: '',
    status: 'Active',
};

export default function Subcontractors() {
    const { t } = useTranslation();
    const { profile, hasRole } = useAuth();
    const [subcontractors, setSubcontractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState('');
    const [copiedPID, setCopiedPID] = useState(null);

    const isAdmin = hasRole(['Super Admin', 'Finance']);

    useEffect(() => { fetchSubcontractors(); }, []);

    const fetchSubcontractors = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('subcontractors')
            .select('*')
            .order('fullName', { ascending: true });

        if (!error && data) setSubcontractors(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!form.fullName.trim()) return alert('Full name is required');

        setLoading(true);
        try {
            if (selectedId) {
                const { error } = await supabase.from('subcontractors')
                    .update({ ...form, updatedAt: new Date().toISOString() })
                    .eq('id', selectedId);
                if (error) throw error;
            } else {
                const pid = generateSubcontractorPID();
                const { error } = await supabase.from('subcontractors')
                    .insert({ ...form, pid });
                if (error) throw error;
            }
            setIsModalOpen(false);
            fetchSubcontractors();
            handleClear();
        } catch (error) {
            alert('Failed to save: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this sub-contractor? This cannot be undone.')) return;
        setLoading(true);
        const { error } = await supabase.from('subcontractors').delete().eq('id', id);
        if (!error) fetchSubcontractors();
        else alert('Failed to delete: ' + error.message);
        setLoading(false);
    };

    const handleClear = () => { setForm(emptyForm); setSelectedId(null); };

    const openEditModal = (sc) => {
        setSelectedId(sc.id);
        setForm({
            fullName: sc.fullName,
            company: sc.company || '',
            specialty: sc.specialty || '',
            phone: sc.phone || '',
            phone2: sc.phone2 || '',
            email: sc.email || '',
            address: sc.address || '',
            nic_passport: sc.nic_passport || '',
            notes: sc.notes || '',
            status: sc.status || 'Active',
        });
        setIsModalOpen(true);
    };

    const handleCopyPID = (pid, e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(pid);
        setCopiedPID(pid);
        setTimeout(() => setCopiedPID(null), 2000);
    };

    const filtered = useMemo(() =>
        subcontractors.filter(sc =>
            sc.fullName.toLowerCase().includes(search.toLowerCase()) ||
            (sc.company || '').toLowerCase().includes(search.toLowerCase()) ||
            (sc.pid || '').toLowerCase().includes(search.toLowerCase())
        ), [subcontractors, search]);

    const columns = [
        {
            key: 'pid',
            label: 'PID',
            render: (v) => (
                <div className="flex items-center gap-2">
                    <span className="pid-badge">{v}</span>
                    <BounceButton className="icon-btn copy-btn" style={{ width: 22, height: 22 }}
                        onClick={(e) => handleCopyPID(v, e)} title="Copy PID">
                        {copiedPID === v ? <Check size={12} className="text-emerald-500" /> : <ClipboardIcon size={12} />}
                    </BounceButton>
                </div>
            )
        },
        { key: 'fullName', label: 'Full Name' },
        { key: 'company', label: 'Company', render: v => v || '—' },
        { key: 'specialty', label: 'Specialty', render: v => v || '—' },
        { key: 'phone', label: 'Phone', render: v => v || '—' },
        {
            key: 'status',
            label: 'Status',
            render: v => (
                <span className={`badge ${v === 'Active' ? 'badge-success' : 'badge-danger'}`}>{v}</span>
            )
        },
        {
            key: 'actions',
            label: '',
            width: '100px',
            render: (_, row) => (
                <div className="flex justify-end gap-2">
                    <BounceButton className="icon-btn edit-btn"
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}>
                        <Pencil size={14} />
                    </BounceButton>
                    {isAdmin && (
                        <BounceButton className="icon-btn delete-btn" style={{ color: '#ef4444' }}
                            onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}>
                            <Trash2 size={14} />
                        </BounceButton>
                    )}
                </div>
            )
        }
    ];

    return (
        <GlobalLoadingOverlay loading={loading} message="Loading Sub-Contractor Registry...">
            <div className="crud-page clients-page">
                <div className="page-header">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-500/10 rounded-xl">
                            <HardHat className="text-purple-500" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Sub-Contractors</h1>
                            <p className="text-slate-500 text-sm mt-0.5">Manage sub-contractor identities and specializations.</p>
                        </div>
                    </div>
                    <div className="page-header-actions">
                        {isAdmin && (
                            <BounceButton className="btn btn-primary"
                                onClick={() => { handleClear(); setIsModalOpen(true); }}>
                                <Plus size={18} /> New Sub-Contractor
                            </BounceButton>
                        )}
                    </div>
                </div>

                <div className="filter-bar mt-6">
                    <div className="filter-group w-full max-w-md">
                        <label>Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input className="pl-10" placeholder="Search by name, company or PID..."
                                value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                    </div>
                </div>

                <Card title="Sub-Contractor Registry" className="mt-6">
                    <DataTable
                        columns={columns}
                        data={filtered}
                        loading={loading}
                        emptyMessage="No sub-contractors found."
                    />
                </Card>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); handleClear(); }}
                    title={selectedId ? 'Edit Sub-Contractor' : 'New Sub-Contractor'}
                    onSave={handleSave}
                >
                    <div className="space-y-4">
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input value={form.fullName}
                                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                placeholder="Enter full legal name..." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-group">
                                <label>Company Name</label>
                                <input value={form.company}
                                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                                    placeholder="Company or trading name..." />
                            </div>
                            <div className="form-group">
                                <label>Specialty / Trade</label>
                                <input value={form.specialty}
                                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                                    placeholder="e.g. Plumbing, Electrical, Tiling..." />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-group">
                                <label>Phone 1</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input className="pl-9" value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="Primary contact..." />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Phone 2</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input className="pl-9" value={form.phone2}
                                        onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                                        placeholder="Secondary contact..." />
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input className="pl-9" type="email" value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="contractor@example.com" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400" size={14} />
                                <textarea className="pl-9" value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    placeholder="Business address..." rows={2} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>NIC / Passport</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input className="pl-9" value={form.nic_passport}
                                    onChange={(e) => setForm({ ...form, nic_passport: e.target.value })}
                                    placeholder="National identity or passport number..." />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                placeholder="Additional details..." rows={2} />
                        </div>
                    </div>
                </Modal>
            </div>
        </GlobalLoadingOverlay>
    );
}
