import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, CalendarDays, Pencil, Trash2, Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToWord, exportToCSV } from '../utils/exportUtils';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import BounceButton from '../components/BounceButton';
import Modal from '../components/Modal';
import ExportDropdown from '../components/ExportDropdown';
import { getAll, create, update, remove, query, KEYS } from '../data/db';
import { WorkerRoles, ProjectStatus } from '../models/enums';
import './Workers.css';

const emptyForm = { fullName: '', nic: '', role: 'Mason', hourlyRate: '', dailyRate: '', phone: '', phone2: '', status: 'Active', notes: '' };

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
    const [isLoading, setIsLoading] = useState(true);

    // Assignment state
    const [assignProject, setAssignProject] = useState('');
    const [assignFrom, setAssignFrom] = useState('');
    const [assignTo, setAssignTo] = useState('');
    const [assignments, setAssignments] = useState([]);

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
                dailyRate: savedRate ? savedRate.dailyRate : ''
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function loadAssignments(workerId) {
        setAssignments(await query(KEYS.projectWorkers, (pw) => pw.workerId === workerId));
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
        setSelectedId(w.id);
        setForm({ fullName: w.fullName, nic: w.nic, role: w.role, hourlyRate: w.hourlyRate || '', dailyRate: w.dailyRate, phone: w.phone || '', phone2: w.phone2 || '', status: w.status, notes: w.notes || '' });
        loadAssignments(w.id);
        setIsModalOpen(true); // Open modal when selecting a worker
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
        const data = { ...form, dailyRate: parseFloat(form.dailyRate) || 0, hourlyRate: parseFloat(form.hourlyRate) || 0 };

        try {
            if (selectedId) {
                await update(KEYS.workers, selectedId, data);
            } else {
                const newWorker = await create(KEYS.workers, data);
                // Auto-assign to project if selected during creation
                if (assignProject) {
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

    // ✅ Delete with dependency check
    async function handleDelete() {
        if (!selectedId) return;

        setIsLoading(true);
        try {
            const attCount = (await query(KEYS.attendances, (a) => a.workerId === selectedId)).length;
            const payCount = (await query(KEYS.payments, (p) => p.workerId === selectedId)).length;
            const assignCount = (await query(KEYS.projectWorkers, (pw) => pw.workerId === selectedId)).length;
            const oblCount = (await query(KEYS.obligationHeaders, (h) => h.entityId === selectedId && h.entityType === 'Worker')).length;

            const deps = [];
            if (attCount > 0) deps.push(`${attCount} attendance record${attCount > 1 ? 's' : ''}`);
            if (payCount > 0) deps.push(`${payCount} payment${payCount > 1 ? 's' : ''}`);
            if (assignCount > 0) deps.push(`${assignCount} project assignment${assignCount > 1 ? 's' : ''}`);
            if (oblCount > 0) deps.push(`${oblCount} obligation${oblCount > 1 ? 's' : ''}`);

            let msg = t('common.confirm') + '?';
            if (deps.length > 0) {
                msg = `⚠️ This worker has ${deps.join(', ')}.\n\n${t('projects.delete_warning')}?`;
            }

            if (!confirm(msg)) {
                setIsLoading(false);
                return;
            }

            await remove(KEYS.workers, selectedId);
            setIsModalOpen(false); // Close modal after deleting
            await loadData();
            setSelectedId(null);
            setAssignments([]);
            setAssignProject('');
            setAssignFrom('');
            setAssignTo('');
        } catch (error) {
            alert('Failed to delete worker');
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
            dailyRate: savedRate ? savedRate.dailyRate : ''
        });
        setSelectedId(null);
        setAssignments([]);
        setAssignProject('');
        setAssignFrom('');
        setAssignTo('');
    }

    async function handleAssign() {
        if (!selectedId || !assignProject) return alert('Select a project');
        setIsLoading(true);
        try {
            await create(KEYS.projectWorkers, {
                workerId: selectedId,
                projectId: parseInt(assignProject),
                assignedFrom: assignFrom,
                assignedTo: assignTo,
                role: form.role,
                notes: '',
            });
            await loadAssignments(selectedId);
            setAssignProject('');
            setAssignFrom('');
            setAssignTo('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} `;

    const columns = [
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
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <BounceButton className="icon-btn edit-btn" title="Edit Worker" onClick={(e) => { e.stopPropagation(); selectWorker(row); }}><Pencil size={14} /></BounceButton>
                </div>
            )
        }
    ];

    return (
        <div className="crud-page workers-page">
            <div className="page-header">
                <h1>{t('workers.title')}</h1>
                <div className="page-header-actions" style={{ display: 'flex', gap: '12px' }}>
                    <ExportDropdown onExport={handleExport} isLoading={isLoadingExport} />
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}><Plus size={18} /> {t('workers.new_worker')}</BounceButton>
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
                    <DataTable columns={columns} data={filtered} selectedId={selectedId} onRowClick={selectWorker} emptyMessage={t('workers.no_workers')} />
                </Card>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); handleClear(); }}
                    title={selectedId ? t('workers.edit_worker') : t('workers.new_worker')}
                    onSave={handleSave}
                >
                    <div className="form-group">
                        <label>{t('common.full_name')}</label>
                        <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>{t('workers.nic_number')}</label>
                        <input
                            value={form.nic}
                            onChange={(e) => setForm({ ...form, nic: e.target.value })}
                            className={isNICDuplicate(form.nic) ? 'input-error' : ''}
                        />
                        {/* ✅ Inline NIC duplicate warning */}
                        {isNICDuplicate(form.nic) && (
                            <span className="field-error">⚠ A worker with this NIC already exists</span>
                        )}
                    </div>
                    <div className="form-group">
                        <label>{t('common.role')}</label>
                        <select
                            value={allRoles.includes(form.role) ? form.role : 'Other'}
                            onChange={(e) => {
                                const r = e.target.value;
                                if (r === 'Other') {
                                    setForm(f => ({ ...f, role: '' }));
                                } else {
                                    // Auto-fill rates from Rate Management if available
                                    const savedRate = workerRates.find(wr => wr.role === r);
                                    setForm(f => ({
                                        ...f,
                                        role: r,
                                        hourlyRate: savedRate ? savedRate.hourlyRate : '',
                                        dailyRate: savedRate ? savedRate.dailyRate : ''
                                    }));
                                }
                            }}
                        >
                            {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                            <option value="Other">{t('projects.custom_type')}</option>
                        </select>
                    </div>
                    {(!allRoles.includes(form.role) || form.role === 'Other' || form.role === '') && (
                        <div className="form-group">
                            <label>{t('workers.custom_role') || 'Custom Role'}</label>
                            <input
                                placeholder="Enter custom role..."
                                value={form.role === 'Other' ? '' : form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                            />
                        </div>
                    )}
                    <div className="form-grid">
                        <div className="form-group">
                            <label>{t('workers.base_salary')} <span className="text-muted">(Locked)</span></label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={form.hourlyRate || ''}
                                readOnly
                                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                            />
                        </div>
                        <div className="form-group">
                            {/* ✅ Daily rate with formatted preview */}
                            <label>{t('workers.daily_rate')} (x8) {form.dailyRate && <span className="text-muted text-xs">({fmt(form.dailyRate)})</span>}</label>
                            <input
                                type="number"
                                value={form.dailyRate}
                                readOnly
                                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                            />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>Phone 1</label>
                            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Phone 2</label>
                            <input value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Status</label>
                        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>Assigned</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Notes</label>
                        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>

                    <div className="assignment-section" style={{ borderTop: '1px solid var(--border-color)', marginTop: 16, paddingTop: 16 }}>
                        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                            {selectedId ? t('workers.project_assignment') : t('workers.assign_to_project')}
                        </label>
                        <div className="form-grid">
                            <div className="form-group">
                                {/* ✅ Project status badge in dropdown */}
                                <label>{t('common.project')}</label>
                                <select value={assignProject} onChange={(e) => setAssignProject(e.target.value)}>
                                    <option value="">{t('common.search')}...</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t('common.date')}</label>
                                <input type="date" value={assignFrom} onChange={(e) => setAssignFrom(e.target.value)} />
                            </div>
                        </div>
                        {selectedId && <BounceButton className="btn btn-primary btn-sm mt-2" onClick={handleAssign}>Set Assignment</BounceButton>}

                        {selectedId && (
                            <div className="mt-4">
                                <label style={{ fontWeight: 600, marginBottom: 6, display: 'block', fontSize: '0.8125rem' }}>Assignment History</label>
                                <div className="history-list" style={{ maxHeight: '120px', overflowY: 'auto', background: 'var(--bg-card)', padding: 8, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                    {assignments.length === 0 ? (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No assignments</div>
                                    ) : (
                                        assignments.map((a) => {
                                            const proj = projects.find((p) => p.id === a.projectId);
                                            return (
                                                <div className="history-item" style={{ fontSize: '0.8125rem', padding: '4px 0', borderBottom: '1px dashed var(--border-color)' }} key={a.id}>
                                                    <strong>{proj?.name || 'Unknown'}</strong> <br /><span className="text-muted">{a.assignedFrom ? new Date(a.assignedFrom).toLocaleDateString() : '?'} to {a.assignedTo ? new Date(a.assignedTo).toLocaleDateString() : 'Present'}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedId && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                            <BounceButton className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/attendance')}>
                                <CalendarDays size={16} /> {t('attendance.mark_attendance')}
                            </BounceButton>
                            <BounceButton className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>
                                <Trash2 size={16} /> {t('common.delete')}
                            </BounceButton>
                        </div>
                    )}
                </Modal>
            </div>
        </div>
    );
}
