import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, CalendarDays, Pencil, Trash2, Download, ChevronDown, FileSpreadsheet, FileText, Key, Check, User, Phone, Shield, Fingerprint, Briefcase, Banknote, Calendar, MapPin, Search, Mail, Info } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToWord, exportToCSV } from '../utils/exportUtils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../data/supabase';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import BounceButton from '../components/BounceButton';
import Modal from '../components/Modal';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';

import ExportDropdown from '../components/ExportDropdown';
import { generateSecureToken, hashToken } from '../utils/security';
import { ClipboardIcon } from '../components/icons/ClipboardIcon';
import { getAll, create, update, remove, query, queryEq, queryAdvanced, KEYS } from '../data/db';
import { WorkerRoles, ProjectStatus } from '../models/enums';
import './Workers.css';

const emptyForm = { fullName: '', nic: '', role: 'Mason', hourlyRate: '', dailyRate: '', overtimeRate: '', phone: '', phone2: '', status: 'Active', notes: '' };

export default function Workers() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [workers, setWorkers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [searchNIC, setSearchNIC] = useState('');
    const [roleFilter, setRoleFilter] = useState('All Roles');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Auth and Invite State
    const { profile, user, hasRole } = useAuth();
    const isSuperAdminOrFinance = hasRole(['Super Admin', 'Finance']);
    const isClient = profile?.role === 'Client';
    const isWorker = profile?.role === 'Worker';

    const [isGeneratingInvite, setIsGeneratingInvite] = useState(null); // stores worker id
    const [generatedCodeFor, setGeneratedCodeFor] = useState(null); // stores {id, code}

    // Assignment state
    const [assignProject, setAssignProject] = useState('');
    const [assignFrom, setAssignFrom] = useState('');
    const [assignTo, setAssignTo] = useState('');
    const [assignments, setAssignments] = useState([]);
    const [editingAssignmentId, setEditingAssignmentId] = useState(null);

    // Rates store for defaults
    const [workerRates, setWorkerRates] = useState([]);

    const [isLoadingExport, setIsLoadingExport] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const handleExport = async (format) => {
        const exportData = workers.map(w => ({
            Name: w.fullName,
            NIC: w.nic,
            Role: w.role,
            DailyRate: w.dailyRate,
            Phone: w.phone,
            Status: w.status,
            Notes: w.notes
        }));

        const columns = [
            { header: 'Full Name', key: 'Name' },
            { header: 'NIC', key: 'NIC' },
            { header: 'Role', key: 'Role' },
            { header: 'Daily Rate', key: 'DailyRate' },
            { header: 'Phone', key: 'Phone' },
            { header: 'Status', key: 'Status' },
            { header: 'Notes', key: 'Notes' }
        ];

        const title = 'Company Workers Directory';
        const fileName = 'Workers_List';

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
            const [wrks, projs, rates] = await Promise.all([
                getAll(KEYS.workers),
                getAll(KEYS.projects),
                getAll(KEYS.workerRates)
            ]);
            setWorkers(wrks);
            setProjects(projs.filter(p => p.status === ProjectStatus.Ongoing));
            setWorkerRates(rates);

            // Auto-load default Mason rates
            const defaultRole = 'Mason';
            const savedRate = rates.find(wr => wr.role === defaultRole);
            setForm({
                ...emptyForm,
                role: defaultRole,
                hourlyRate: savedRate ? savedRate.hourlyRate : '',
                dailyRate: savedRate ? savedRate.dailyRate : '',
                overtimeRate: savedRate ? savedRate.overtimeRate : ''
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function loadAssignments(workerId) {
        setAssignments(await queryEq(KEYS.projectWorkers, 'workerId', workerId));
    }

    // Helper to check for overlapping project assignments
    function checkOverlap(workerId, projId, from, to, existingId = null) {
        if (!from) return false;
        const newStart = new Date(from);
        const newEnd = to ? new Date(to) : new Date('9999-12-31');

        return assignments.some(a => {
            if (existingId && a.id === existingId) return false;

            const start = new Date(a.assignedFrom);
            const end = a.assignedTo ? new Date(a.assignedTo) : new Date('9999-12-31');

            return (newStart <= end && newEnd >= start);
        });
    }

    // ✅ Merge WorkerRoles with custom roles from Rates
    const allRoles = [...new Set([...WorkerRoles, ...workerRates.map(r => r.role)])].sort();

    const filtered = workers.filter((w) => {
        const matchName = w.fullName.toLowerCase().includes(search.toLowerCase());
        const matchNIC = w.nic.toLowerCase().includes(searchNIC.toLowerCase());
        const matchRole = roleFilter === 'All Roles' || w.role === roleFilter;
        return matchName && matchNIC && matchRole;
    });

    function selectWorker(w) {
        if (selectedId === w.id) {
            setSelectedId(null);
            setAssignments([]);
        } else {
            setSelectedId(w.id);
            setForm({ fullName: w.fullName, nic: w.nic, role: w.role, hourlyRate: w.hourlyRate || '', dailyRate: w.dailyRate, overtimeRate: w.overtimeRate || '', phone: w.phone || '', phone2: w.phone2 || '', status: w.status, notes: w.notes || '' });
            loadAssignments(w.id);
        }
    }

    function openEditModal(w) {
        setSelectedId(w.id);
        setForm({
            fullName: w.fullName,
            nic: w.nic,
            role: w.role,
            hourlyRate: w.hourlyRate || '',
            dailyRate: w.dailyRate,
            overtimeRate: w.overtimeRate || '',
            phone: w.phone || '',
            phone2: w.phone2 || '',
            status: w.status,
            notes: w.notes || ''
        });
        loadAssignments(w.id);
        setIsModalOpen(true);
    }

    // ✅ NIC duplicate check
    function isNICDuplicate(nic) {
        if (!nic || !nic.trim()) return false;
        return workers.some((w) => w.nic.toLowerCase() === nic.trim().toLowerCase() && w.id !== selectedId);
    }

    async function handleSave() {
        if (!form.fullName.trim()) return alert(t('common.full_name') + ' is required');

        // ✅ NIC duplicate validation
        if (isNICDuplicate(form.nic)) {
            return alert(`A worker with NIC "${form.nic}" already exists.Duplicate NICs are not allowed.`);
        }

        setIsLoading(true);
        const data = { ...form, dailyRate: parseFloat(form.dailyRate) || 0, hourlyRate: parseFloat(form.hourlyRate) || 0, overtimeRate: parseFloat(form.overtimeRate) || 0 };

        try {
            if (selectedId) {
                await update(KEYS.workers, selectedId, data);
            } else {
                const newWorker = await create(KEYS.workers, data);
                // Auto-assign to project if selected during creation
                if (assignProject) {
                    // Check overlap for initial assignment
                    if (checkOverlap(null, assignProject, assignFrom, assignTo)) {
                        alert("Warning: Initial assignment overlaps with an existing/conflicting period for this worker logic. However, since it's a new worker, this should be impossible. Check date logic.");
                    }
                    await create(KEYS.projectWorkers, {
                        workerId: newWorker.id,
                        projectId: parseInt(assignProject),
                        assignedFrom: assignFrom,
                        assignedTo: assignTo,
                        role: data.role,
                        notes: '',
                    });
                }
            }
            setIsModalOpen(false); // Close modal after saving
            await loadData(); // Reload all data
            setSelectedId(null);
            setAssignments([]);
            setAssignProject('');
            setAssignFrom('');
            setAssignTo('');
        } catch (error) {
            alert('Failed to save worker');
            console.error(error);
            setIsLoading(false);
        }
    }


    function handleClear() {
        const defaultRole = 'Mason';
        const savedRate = workerRates.find(wr => wr.role === defaultRole);
        setForm({
            ...emptyForm,
            role: defaultRole,
            hourlyRate: savedRate ? savedRate.hourlyRate : '',
            dailyRate: savedRate ? savedRate.dailyRate : '',
            overtimeRate: savedRate ? savedRate.overtimeRate : ''
        });
        setSelectedId(null);
        setAssignments([]);
        setAssignProject('');
        setAssignFrom('');
        setAssignTo('');
        setEditingAssignmentId(null);
    }

    async function handleProjectAssignment() {
        if (!selectedId || !assignProject) return alert('Select a project');

        // STABILITY FIX: Prevent overlapping assignments
        if (checkOverlap(selectedId, assignProject, assignFrom, assignTo, editingAssignmentId)) {
            return alert("Error: This worker is already assigned to a project during this period. Double assignments are not allowed.");
        }

        setIsLoading(true);
        try {
            const data = {
                workerId: selectedId,
                projectId: parseInt(assignProject),
                assignedFrom: assignFrom,
                assignedTo: assignTo,
                role: form.role,
                notes: '',
            };

            if (editingAssignmentId) {
                await update(KEYS.projectWorkers, editingAssignmentId, data);
            } else {
                await create(KEYS.projectWorkers, data);
            }

            await loadAssignments(selectedId);
            setAssignProject('');
            setAssignFrom('');
            setAssignTo('');
            setEditingAssignmentId(null);
        } catch (error) {
            console.error(error);
            alert("Failed to save assignment.");
        } finally {
            setIsLoading(false);
        }
    }

    function handleEditAssignment(a) {
        setEditingAssignmentId(a.id);
        setAssignProject(a.projectId.toString());
        setAssignFrom(a.assignedFrom ? a.assignedFrom.split('T')[0] : '');
        setAssignTo(a.assignedTo ? a.assignedTo.split('T')[0] : '');
    }

    function handleCancelAssignmentEdit() {
        setEditingAssignmentId(null);
        setAssignProject('');
        setAssignFrom('');
        setAssignTo('');
    }

    async function handleRemoveAssignment(id) {
        setDeleteTargetId(id);
        setIsConfirmDeleteOpen(true);
    }

    async function confirmDeleteAssignment() {
        if (!deleteTargetId) return;
        setIsLoading(true);
        try {
            // Ensure ID is passed correctly (Supabase expects the PK value)
            const res = await remove(KEYS.projectWorkers, deleteTargetId);
            if (res) {
                await loadAssignments(selectedId);
                setIsConfirmDeleteOpen(false);
                setDeleteTargetId(null);
            }
        } catch (error) {
            console.error('Delete assignment failure:', error);
            alert("Failed to remove assignment. Please check connectivity or database permissions.");
        } finally {
            setIsLoading(false);
        }
    }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} `;

    const handleGenerateInvite = async (workerId, e) => {
        e.stopPropagation();
        setIsGeneratingInvite(workerId);

        const rawCode = generateSecureToken();
        const codeHash = await hashToken(rawCode);
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 2); // 48h TTL

        const { data, error } = await supabase
            .from('invite_codes')
            .insert({
                code: rawCode,
                token_hash: codeHash,
                role: 'Worker',
                target_id: workerId.toString(),
                expires_at: expirationDate.toISOString(),
                created_by: profile?.id || user?.id
            })
            .select()
            .single();

        if (error || !data) {
            alert("Failed to generate code." + (error ? ' ' + error.message : ''));
            setIsGeneratingInvite(null);
        } else {
            setGeneratedCodeFor({ id: workerId, code: rawCode });
            navigator.clipboard.writeText(rawCode);
            setTimeout(() => setGeneratedCodeFor(null), 3000); // clear after 3s
            setIsGeneratingInvite(null);
        }
    };

    const [copiedPID, setCopiedPID] = useState(null);

    const handleCopyPID = (pid, e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(pid);
        setCopiedPID(pid);
        setTimeout(() => setCopiedPID(null), 2000);
    };

    function renderWorkerExpansion(worker) {
        return (
            <div className="worker-expansion-grid">
                <div className="expansion-col">
                    <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-100">
                        <CalendarDays className="text-indigo-400" size={14} />
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">
                            {t('workers.assignment_history')}
                        </h4>
                    </div>
                    <div className="history-list-inline">
                        {assignments.length === 0 ? (
                            <div className="no-data-small">No assignments yet</div>
                        ) : (
                            assignments.map((a) => {
                                const proj = projects.find((p) => p.id === a.projectId);
                                return (
                                    <div className="history-item-inline" key={a.id}>
                                        <div className="hist-p-name">{proj?.name || 'Unknown Project'}</div>
                                        <div className="hist-p-dates">{a.assignedFrom ? new Date(a.assignedFrom).toLocaleDateString() : '?'} - {a.assignedTo ? new Date(a.assignedTo).toLocaleDateString() : 'Present'}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                <div className="expansion-col">
                    <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-100">
                        <Info className="text-indigo-400" size={14} />
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 m-0">
                            {t('common.details')}
                        </h4>
                    </div>
                    <div className="details-mini-grid">
                        <div className="detail-item">
                            <label className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1 block">
                                {t('common.phone_2')}
                            </label>
                            <span className="text-sm font-medium">{worker.phone2 || '-'}</span>
                        </div>
                        <div className="detail-item">
                            <label className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1 block">
                                {t('common.notes')}
                            </label>
                            <span className="notes-text text-sm">{worker.notes || 'No notes available.'}</span>
                        </div>
                    </div>
                    {isSuperAdminOrFinance && (
                        <div className="expansion-actions mt-4">
                            <BounceButton className="btn btn-secondary btn-sm" onClick={() => navigate('/attendance')}>
                                <CalendarDays size={14} /> {t('attendance.mark_attendance')}
                            </BounceButton>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const columns = [
        {
            key: 'pid',
            label: 'PID',
            render: (v) => (
                <div className="flex items-center gap-2">
                    <span className="pid-badge">
                        {v || 'PENDING'}
                    </span>
                    {v && (
                        <BounceButton
                            className="icon-btn copy-btn"
                            style={{ width: 22, height: 22 }}
                            onClick={(e) => handleCopyPID(v, e)}
                            title="Copy PID"
                        >
                            {copiedPID === v ? <Check size={12} className="text-emerald-500" /> : <ClipboardIcon size={12} />}
                        </BounceButton>
                    )}
                </div>
            )
        },
        { key: 'fullName', label: t('common.full_name') },
        { key: 'nic', label: t('workers.nic_number') },
        { key: 'role', label: t('common.role') },
        // ✅ Daily rate formatting in table
        { key: 'dailyRate', label: t('workers.daily_rate'), render: (v) => fmt(v) },
        { key: 'phone', label: t('common.phone') },
        {
            key: 'status', label: t('common.status'), render: (v) => (
                <span className={`badge ${v === 'Active' ? 'badge-success' : v === 'Assigned' ? 'badge-info' : 'badge-default'} `}>{v}</span>
            )
        },
        {
            key: 'actions', label: '', render: (_, row) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {hasRole(['Super Admin', 'Finance']) && (
                        <BounceButton
                            className="icon-btn"
                            style={{
                                color: generatedCodeFor?.id === row.id ? '#10B981' : '#3B82F6',
                                border: '1px solid currentColor',
                                background: 'transparent'
                            }}
                            title={generatedCodeFor?.id === row.id ? 'Code Copied!' : 'Generate Invite Code'}
                            onClick={(e) => handleGenerateInvite(row.id, e)}
                            disabled={isGeneratingInvite === row.id}
                        >
                            {isGeneratingInvite === row.id ? (
                                <span className="spinner" style={{ width: 14, height: 14, display: 'block', border: '2px solid transparent', borderTopColor: 'currentColor', borderRadius: '50%' }} />
                            ) : generatedCodeFor?.id === row.id ? (
                                <Check size={14} />
                            ) : (
                                <Key size={14} />
                            )}
                        </BounceButton>
                    )}
                    <BounceButton className="icon-btn edit-btn" title="Edit Worker" onClick={(e) => { e.stopPropagation(); openEditModal(row); }}><Pencil size={14} /></BounceButton>
                </div>
            )
        }
    ];

    if (isClient || isWorker) {
        return (
            <div className="crud-page workers-page flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <Card>
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                        <Shield size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
                        <h2 style={{ color: 'var(--text-color)', marginBottom: 8 }}>Access Denied</h2>
                        <p>This module contains sensitive personnel data restricted to company administration.</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <GlobalLoadingOverlay loading={isLoading} message="Scanning Personnel Records...">
            <div className="crud-page workers-page">
                <div className="page-header">
                    <h1>{t('workers.title')}</h1>
                    <div className="page-header-actions" style={{ display: 'flex', gap: '12px' }}>
                        <ExportDropdown onExport={handleExport} isLoading={isLoadingExport} />
                        {isSuperAdminOrFinance && (
                            <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}><Plus size={18} /> {t('workers.new_worker')}</BounceButton>
                        )}
                    </div>
                </div>

                <div className="filter-bar">
                    <div className="filter-group">
                        <label>{t('common.name')}</label>
                        <input placeholder={t('common.search') + "..."} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="filter-group">
                        <label>{t('workers.nic_number')}</label>
                        <input placeholder={t('common.search') + "..."} value={searchNIC} onChange={(e) => setSearchNIC(e.target.value)} />
                    </div>
                    <div className="filter-group" style={{ maxWidth: 200 }}>
                        <label>{t('common.role')}</label>
                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                            <option value="All Roles">{t('common.all')}</option>
                            {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>

                {/* ✅ Worker count indicator */}
                <div className="result-count">
                    Showing <strong>{filtered.length}</strong> of <strong>{workers.length}</strong> worker{workers.length !== 1 ? 's' : ''}
                    {(search || searchNIC || roleFilter !== 'All Roles') && <span className="filter-active-tag">Filtered</span>}
                </div>

                <div className="crud-layout" style={{ gridTemplateColumns: '1fr' }}>
                    <Card title={t('workers.worker_list')}>
                        <DataTable
                            columns={columns}
                            data={filtered}
                            selectedId={selectedId}
                            onRowClick={selectWorker}
                            emptyMessage={t('workers.no_workers')}
                            renderExpansion={renderWorkerExpansion}
                        />
                    </Card>

                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => { setIsModalOpen(false); handleClear(); }}
                        title={selectedId ? (isSuperAdminOrFinance ? t('workers.edit_worker') : t('common.details')) : t('workers.new_worker')}
                        onSave={isSuperAdminOrFinance ? handleSave : undefined}
                    >
                        <div className="space-y-4">
                            <div className="form-group">
                                <label>{t('common.full_name')}</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        className="pl-9"
                                        disabled={!isSuperAdminOrFinance}
                                        value={form.fullName}
                                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                        placeholder="Enter full worker name..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label>{t('workers.nic_number')}</label>
                                    <div className="relative">
                                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            className={`pl-9 ${isNICDuplicate(form.nic) ? 'input-error' : ''}`}
                                            disabled={!isSuperAdminOrFinance}
                                            value={form.nic}
                                            onChange={(e) => setForm({ ...form, nic: e.target.value })}
                                            placeholder="NIC Number..."
                                        />
                                    </div>
                                    {isNICDuplicate(form.nic) && (
                                        <span className="field-error">⚠ A worker with this NIC already exists</span>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>{t('common.role')}</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} pointerEvents="none" />
                                        <select
                                            className="pl-9"
                                            disabled={!isSuperAdminOrFinance}
                                            value={allRoles.includes(form.role) ? form.role : 'Other'}
                                            onChange={(e) => {
                                                const r = e.target.value;
                                                if (r === 'Other') {
                                                    setForm(f => ({ ...f, role: '' }));
                                                } else {
                                                    const savedRate = workerRates.find(wr => wr.role === r);
                                                    setForm(f => ({
                                                        ...f,
                                                        role: r,
                                                        hourlyRate: savedRate ? savedRate.hourlyRate : '',
                                                        dailyRate: savedRate ? savedRate.dailyRate : '',
                                                        overtimeRate: savedRate ? savedRate.overtimeRate : ''
                                                    }));
                                                }
                                            }}
                                        >
                                            {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                                            <option value="Other">{t('projects.custom_type')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {(!allRoles.includes(form.role) || form.role === 'Other' || form.role === '') && (
                                <div className="form-group">
                                    <label>{t('workers.custom_role') || 'Custom Role'}</label>
                                    <input
                                        disabled={!isSuperAdminOrFinance}
                                        placeholder="Enter custom role..."
                                        value={form.role === 'Other' ? '' : form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label>{t('workers.base_salary')} <span className="text-muted text-xs">(Locked)</span></label>
                                    <div className="relative">
                                        <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            className="pl-9"
                                            type="number"
                                            placeholder="0.00"
                                            value={form.hourlyRate || ''}
                                            readOnly
                                            style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('workers.daily_rate')} (x8) {form.dailyRate && <span className="text-muted text-xs">({fmt(form.dailyRate)})</span>}</label>
                                    <div className="relative">
                                        <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            className="pl-9"
                                            type="number"
                                            value={form.dailyRate}
                                            readOnly
                                            style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>{t('workers.overtime_rate') || t('rates.overtime_rate')} <span className="text-muted text-xs">(Locked)</span></label>
                                <div className="relative">
                                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        className="pl-9"
                                        type="number"
                                        placeholder="0.00"
                                        value={form.overtimeRate || ''}
                                        readOnly
                                        style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label>{t('common.phone')} 1</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            className="pl-9"
                                            disabled={!isSuperAdminOrFinance}
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
                                            disabled={!isSuperAdminOrFinance}
                                            value={form.phone2}
                                            onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                                            placeholder="Secondary contact..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>{t('common.status')}</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} pointerEvents="none" />
                                    <select
                                        className="pl-9"
                                        disabled={!isSuperAdminOrFinance}
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>{t('common.notes')}</label>
                                <textarea
                                    disabled={!isSuperAdminOrFinance}
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    placeholder="Personnel notes, performance, etc."
                                    rows={2}
                                />
                            </div>

                            {/* Project Assignment Section Refactor */}
                            {isSuperAdminOrFinance && (
                                <div className="assignment-section bg-slate-50/50 p-4 rounded-xl border border-slate-200 mt-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                                            <MapPin className="text-indigo-500" size={16} />
                                        </div>
                                        <h4 className="text-sm font-bold m-0">{t('workers.assign_to_project')}</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="form-group m-0">
                                            <label className="text-xs">{t('common.project')}</label>
                                            <select value={assignProject} onChange={(e) => setAssignProject(e.target.value)}>
                                                <option value="">{t('common.search')}...</option>
                                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group m-0">
                                            <label className="text-xs">{t('common.date')}</label>
                                            <input type="date" value={assignFrom} onChange={(e) => setAssignFrom(e.target.value)} />
                                        </div>
                                        <div className="form-group m-0">
                                            <label className="text-xs">{t('common.to_date')}</label>
                                            <input type="date" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} />
                                        </div>
                                    </div>

                                    {selectedId && (
                                        <div className="flex gap-2 mt-3">
                                            <BounceButton
                                                className="btn btn-primary py-2 text-xs"
                                                style={{ flex: 2 }}
                                                disabled={!assignProject || !assignFrom}
                                                onClick={handleProjectAssignment}
                                            >
                                                <Check size={14} /> {editingAssignmentId ? 'Update Deployment' : 'Establish Deployment'}
                                            </BounceButton>

                                            {editingAssignmentId && (
                                                <BounceButton
                                                    className="btn btn-secondary py-2 text-xs"
                                                    style={{ flex: 1 }}
                                                    onClick={handleCancelAssignmentEdit}
                                                >
                                                    Cancel
                                                </BounceButton>
                                            )}
                                        </div>
                                    )}

                                    {!selectedId && assignProject && (
                                        <p className="text-xs text-slate-500 mt-3 italic">
                                            * Assignment will be applied upon saving the new worker profile.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        {selectedId && (
                            <div className="mt-4">
                                <label style={{ fontWeight: 600, marginBottom: 6, display: 'block', fontSize: '0.8125rem' }}>{t('workers.assignment_history')}</label>
                                <div className="history-list" style={{ maxHeight: '120px', overflowY: 'auto', background: 'var(--bg-card)', padding: 8, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                    {assignments.length === 0 ? (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No assignments</div>
                                    ) : (
                                        assignments.map((a) => {
                                            const proj = projects.find((p) => p.id === a.projectId);
                                            return (
                                                <div className="history-item" style={{ fontSize: '0.8125rem', padding: '6px 0', borderBottom: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} key={a.id}>
                                                    <div>
                                                        <strong>{proj?.name || 'Unknown'}</strong> <br />
                                                        <span className="text-muted">{a.assignedFrom ? new Date(a.assignedFrom).toLocaleDateString() : '?'} to {a.assignedTo ? new Date(a.assignedTo).toLocaleDateString() : 'Present'}</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <BounceButton
                                                            className="icon-btn"
                                                            style={{ color: 'var(--accent-primary)', padding: 4 }}
                                                            onClick={() => handleEditAssignment(a)}
                                                        >
                                                            <Pencil size={12} />
                                                        </BounceButton>
                                                        <BounceButton
                                                            className="icon-btn"
                                                            style={{ color: '#ef4444', padding: 4 }}
                                                            onClick={() => handleRemoveAssignment(a.id)}
                                                        >
                                                            <Trash2 size={12} />
                                                        </BounceButton>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedId && (
                            <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                                <BounceButton className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/attendance')}>
                                    <CalendarDays size={16} /> {t('attendance.mark_attendance')}
                                </BounceButton>
                            </div>
                        )}
                    </Modal>
                </div>
                {/* Confirmation Modal for Assignment Deletion */}
                <Modal
                    isOpen={isConfirmDeleteOpen}
                    onClose={() => setIsConfirmDeleteOpen(false)}
                    title={t('common.confirm_action') || "Confirm Removal"}
                    footer={
                        <div className="modal-footer-btns">
                            <BounceButton className="btn btn-secondary" onClick={() => setIsConfirmDeleteOpen(false)}>{t('common.cancel') || "Cancel"}</BounceButton>
                            <BounceButton className="btn btn-danger" onClick={confirmDeleteAssignment} isLoading={isLoading}>
                                {t('common.confirm_delete') || "Confirm Delete"}
                            </BounceButton>
                        </div>
                    }
                >
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ color: '#ef4444', marginBottom: 16 }}>
                            <Trash2 size={48} style={{ margin: '0 auto' }} />
                        </div>
                        <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>
                            {t('workers.confirm_remove_assignment') || "Confirm Assignment Removal"}
                        </p>
                        <p className="text-muted">
                            {t('workers.remove_assignment_warning') || "Are you sure you want to remove this project assignment?"}
                        </p>
                    </div>
                </Modal>
            </div>
        </GlobalLoadingOverlay>
    );
}
