import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, User, Phone, Mail, MapPin, Info, Check, Shield } from 'lucide-react';
import { supabase } from '../data/supabase';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import BounceButton from '../components/BounceButton';
import Modal from '../components/Modal';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';
import { generateClientPID } from '../utils/security';
import { ClipboardIcon } from '../components/icons/ClipboardIcon';
import './Workers.css'; // Reuse worker styles for consistency

const emptyForm = {
    fullName: '',
    phone: '',
    phone2: '',
    email: '',
    address: '',
    nic_passport: '',
    notes: ''
};

export default function Clients() {
    const { t } = useTranslation();
    const { profile, user, hasRole } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState('');
    const [copiedPID, setCopiedPID] = useState(null);

    const isAdmin = hasRole(['Super Admin', 'Finance']);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('fullName', { ascending: true });

        if (!error && data) {
            setClients(data);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!form.fullName.trim()) return alert(t('common.full_name') + ' is required');

        setLoading(true);
        try {
            if (selectedId) {
                const { error } = await supabase
                    .from('clients')
                    .update({
                        ...form,
                        updatedAt: new Date().toISOString()
                    })
                    .eq('id', selectedId);
                if (error) throw error;
            } else {
                const pid = generateClientPID();
                const { error } = await supabase
                    .from('clients')
                    .insert({
                        ...form,
                        pid
                    });
                if (error) throw error;
            }
            setIsModalOpen(false);
            fetchClients();
            handleClear();
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save client: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('common.confirm_delete'))) return;

        setLoading(true);
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchClients();
        } else {
            alert("Failed to delete client: " + error.message);
        }
        setLoading(false);
    };

    const handleClear = () => {
        setForm(emptyForm);
        setSelectedId(null);
    };

    const openEditModal = (client) => {
        setSelectedId(client.id);
        setForm({
            fullName: client.fullName,
            phone: client.phone || '',
            phone2: client.phone2 || '',
            email: client.email || '',
            address: client.address || '',
            nic_passport: client.nic_passport || '',
            notes: client.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleCopyPID = (pid, e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(pid);
        setCopiedPID(pid);
        setTimeout(() => setCopiedPID(null), 2000);
    };

    const filtered = clients.filter(c =>
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        c.pid.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        {
            key: 'pid',
            label: 'PID',
            render: (v) => (
                <div className="flex items-center gap-2">
                    <span className="pid-badge">{v}</span>
                    <BounceButton
                        className="icon-btn copy-btn"
                        style={{ width: 22, height: 22 }}
                        onClick={(e) => handleCopyPID(v, e)}
                        title="Copy PID"
                    >
                        {copiedPID === v ? <Check size={12} className="text-emerald-500" /> : <ClipboardIcon size={12} />}
                    </BounceButton>
                </div>
            )
        },
        { key: 'fullName', label: t('common.full_name') },
        { key: 'phone', label: t('common.phone') },
        { key: 'nic_passport', label: t('clients.nic_passport') },
        { key: 'email', label: t('common.email') },
        {
            key: 'actions',
            label: '',
            width: '100px',
            render: (_, row) => (
                <div className="flex justify-end gap-2">
                    <BounceButton
                        className="icon-btn edit-btn"
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                    >
                        <Pencil size={14} />
                    </BounceButton>
                    {isAdmin && (
                        <BounceButton
                            className="icon-btn delete-btn"
                            style={{ color: '#ef4444' }}
                            onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
                        >
                            <Trash2 size={14} />
                        </BounceButton>
                    )}
                </div>
            )
        }
    ];

    return (
        <GlobalLoadingOverlay loading={loading} message="Accessing Client Identity Gate...">
            <div className="crud-page clients-page">
                <div className="page-header">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-500/10 rounded-xl">
                            <User className="text-orange-500" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{t('clients.title')}</h1>
                            <p className="text-slate-500 text-sm mt-0.5">Manage enterprise client identities and contact protocols.</p>
                        </div>
                    </div>
                    <div className="page-header-actions">
                        <BounceButton
                            className="btn btn-primary"
                            onClick={() => { handleClear(); setIsModalOpen(true); }}
                        >
                            <Plus size={18} /> {t('clients.new_client')}
                        </BounceButton>
                    </div>
                </div>

                <div className="filter-bar mt-6">
                    <div className="filter-group w-full max-w-md">
                        <label>{t('common.search')}</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                className="pl-10"
                                placeholder="Search by name or PID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <Card title={t('clients.client_list')} className="mt-6">
                    <DataTable
                        columns={columns}
                        data={filtered}
                        loading={loading}
                        emptyMessage={t('clients.no_clients')}
                    />
                </Card>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); handleClear(); }}
                    title={selectedId ? t('clients.edit_client') : t('clients.new_client')}
                    onSave={handleSave}
                >
                    <div className="space-y-4">
                        <div className="form-group">
                            <label>{t('common.full_name')}</label>
                            <input
                                value={form.fullName}
                                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                placeholder="Enter full client name..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-group">
                                <label>{t('common.phone')} 1</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        className="pl-9"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="Primary contact..."
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{t('common.phone')} 2</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        className="pl-9"
                                        value={form.phone2}
                                        onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                                        placeholder="Secondary contact..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('common.email')}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    className="pl-9"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="client@example.com"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('common.address')}</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400" size={14} />
                                <textarea
                                    className="pl-9"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    placeholder="Enter physical address..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('clients.nic_passport')}</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    className="pl-9"
                                    value={form.nic_passport}
                                    onChange={(e) => setForm({ ...form, nic_passport: e.target.value })}
                                    placeholder="Enter national identity or passport..."
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('common.notes')}</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                placeholder="Additional details, preferences, etc."
                                rows={2}
                            />
                        </div>
                    </div>
                </Modal>
            </div>
        </GlobalLoadingOverlay>
    );
}
