import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Download, ChevronDown, FileSpreadsheet, FileText, Shield, Pencil, User, Calendar } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToWord, exportToCSV } from '../utils/exportUtils';
import CountUp from '../components/CountUp';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { getAll, create, update, remove, queryEq, queryAdvanced, KEYS } from '../data/db';
import './Finance.css';
import BounceButton from '../components/BounceButton';
import ExportDropdown from '../components/ExportDropdown';
import { useAuth } from '../context/AuthContext';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';

export default function Advances() {
    const { t } = useTranslation();
    const { hasRole } = useAuth();
    const [advances, setAdvances] = useState([]);
    const [projects, setProjects] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [projectWorkers, setProjectWorkers] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    const emptyForm = {
        workerId: '',
        projectId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Active',
        notes: ''
    };

    const [form, setForm] = useState(emptyForm);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [isLoadingExport, setIsLoadingExport] = useState(false);

    // Date filters (Robust)
    const today = new Date();
    const toLocal = (d) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };
    const firstDay = toLocal(new Date(today.getFullYear(), today.getMonth(), 1));
    const lastDay = toLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    const [fromDate, setFromDate] = useState(firstDay);
    const [toDate, setToDate] = useState(lastDay);

    useEffect(() => {
        loadData();
    }, []);

    const handleExport = async (format) => {
        const exportData = advances.map(a => {
            const worker = workers.find(w => w.id === a.workerId);
            const project = projects.find(p => p.id === a.projectId);
            return {
                Date: a.date ? new Date(a.date).toLocaleDateString() : '—',
                Worker: worker?.fullName || '—',
                Project: project?.name || '—',
                Amount: a.amount,
                Status: a.status,
                Notes: a.notes || ''
            };
        });

        const columns = [
            { header: 'Date', key: 'Date' },
            { header: 'Worker Name', key: 'Worker' },
            { header: 'Project Name', key: 'Project' },
            { header: 'Advance Amount (LKR)', key: 'Amount' },
            { header: 'Status', key: 'Status' },
            { header: 'Notes', key: 'Notes' }
        ];

        const title = 'Worker Advances Report';
        const fileName = 'Advances_List';

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
            const filters = { range: { column: 'date', from: fromDate, to: toDate } };
            const [advs, projs, wrks, pw] = await Promise.all([
                queryAdvanced(KEYS.advances, { filters, orderBy: { column: 'date', ascending: false } }),
                getAll(KEYS.projects),
                getAll(KEYS.workers),
                getAll(KEYS.projectWorkers)
            ]);
            setAdvances(advs);
            setProjects(projs);
            setWorkers(wrks);
            setProjectWorkers(pw);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    const filteredWorkersForForm = useMemo(() => {
        if (!form.projectId) return workers;
        const assignedWorkerIds = projectWorkers
            .filter(pw => pw.projectId === parseInt(form.projectId))
            .map(pw => pw.workerId);
        return workers.filter(w => assignedWorkerIds.includes(w.id));
    }, [form.projectId, workers, projectWorkers]);

    function selectAdvance(a) {
        if (selectedId === a.id) {
            setSelectedId(null);
        } else {
            setSelectedId(a.id);
        }
    }

    function openEditModal(a) {
        setSelectedId(a.id);
        setForm({ workerId: a.workerId || '', projectId: a.projectId || '', amount: a.amount, date: a.date || '', status: a.status, notes: a.notes || '' });
        setIsModalOpen(true);
    }

    async function handleSave() {
        setIsLoading(true);
        const data = {
            ...form,
            workerId: form.workerId ? parseInt(form.workerId) : null,
            projectId: form.projectId ? parseInt(form.projectId) : null,
            amount: parseFloat(form.amount) || 0,
        };
        try {
            if (selectedId) { await update(KEYS.advances, selectedId, data); }
            else { await create(KEYS.advances, data); }
            handleClear();
            setIsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    async function handleDelete() {
        if (!selectedId || !confirm('Delete?')) return;
        setIsLoading(true);
        try {
            await remove(KEYS.advances, selectedId);
            handleClear();
            setIsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    function handleClear() {
        setForm(emptyForm);
        setSelectedId(null);
    }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} `;

    const totalActive = advances.filter((a) => a.status === 'Active').reduce((s, a) => s + (a.amount || 0), 0);
    const totalSettled = advances.filter((a) => a.status === 'Settled').reduce((s, a) => s + (a.amount || 0), 0);

    const columns = [
        { key: 'workerId', label: 'Worker', render: (v) => workers.find((w) => w.id === v)?.fullName || '-' },
        { key: 'projectId', label: 'Project', render: (v) => projects.find((p) => p.id === v)?.name || '-' },
        { key: 'amount', label: 'Amount', render: (v) => fmt(v) },
        { key: 'date', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
        { key: 'status', label: 'Status', render: (v) => <span className={`badge ${v === 'Active' ? 'badge-info' : v === 'Settled' ? 'badge-success' : 'badge-default'} `}>{v}</span> },
        {
            key: 'actions', label: '', render: (_, row) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <BounceButton
                        className="icon-btn edit-btn"
                        title="Edit Advance"
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                    >
                        <Pencil size={14} />
                    </BounceButton>
                </div>
            )
        }
    ];

    function renderAdvanceExpansion(advance) {
        const worker = workers.find(w => w.id === advance.workerId);
        const project = projects.find(p => p.id === advance.projectId);

        // Find other advances for this worker
        const otherAdvs = advances.filter(a => a.workerId === advance.workerId && a.id !== advance.id);

        return (
            <div className="advance-expansion-grid">
                <div className="expansion-col">
                    <h4><User size={14} style={{ marginRight: 6 }} /> Worker Context</h4>
                    <div className="worker-mini-profile">
                        <div className="profile-item">
                            <label>Full Name</label>
                            <span>{worker?.fullName || '—'}</span>
                        </div>
                        <div className="profile-item">
                            <label>Role / Position</label>
                            <span>{worker?.role || '—'}</span>
                        </div>
                        <div className="profile-item">
                            <label>Other Advances</label>
                            <span className={otherAdvs.length > 0 ? 'text-amber' : 'text-muted'}>
                                {otherAdvs.length > 0 ? `${otherAdvs.length} found` : 'None'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="expansion-col">
                    <h4><Calendar size={14} style={{ marginRight: 6 }} /> Details & Actions</h4>
                    <div className="details-mini-grid">
                        <div className="detail-item">
                            <label>Project Assigned</label>
                            <span>{project?.name || '—'}</span>
                        </div>
                        <div className="detail-item">
                            <label>Notes</label>
                            <span className="notes-text">{advance.notes || 'No specific notes recorded.'}</span>
                        </div>
                    </div>
                    <div className="expansion-actions">
                        <BounceButton className="btn btn-secondary btn-sm" onClick={() => openEditModal(advance)}>
                            <Pencil size={14} /> Quick Edit
                        </BounceButton>
                        <BounceButton className="btn btn-outline btn-sm" onClick={() => window.open('/workers', '_blank')}>
                            View Worker Profile
                        </BounceButton>
                    </div>
                </div>
            </div>
        );
    }

    if (!hasRole(['Super Admin', 'Finance'])) {
        return (
            <div className="crud-page finance-page flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <Card>
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                        <Shield size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
                        <h2 style={{ color: 'var(--text-color)', marginBottom: 8 }}>{t('common.access_denied')}</h2>
                        <p>{t('common.access_denied_desc')}</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <GlobalLoadingOverlay loading={isLoading} message="Processing Monetary Advances...">
            <div className="crud-page finance-page">
                <div className="filter-bar" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <div className="filter-group">
                        <label>{t('common.date')} (From)</label>
                        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} onBlur={loadData} />
                    </div>
                    <div className="filter-group">
                        <label>{t('common.date')} (To)</label>
                        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} onBlur={loadData} />
                    </div>
                </div>

                <div className="page-header">
                    <h1>{t('advances.title' || 'Advances')}</h1>
                    <div className="page-header-actions" style={{ display: 'flex', gap: '12px' }}>
                        <ExportDropdown onExport={handleExport} isLoading={isLoadingExport} />
                        <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}>
                            <Plus size={18} /> {t('advances.new_advance' || 'New Advance')}
                        </BounceButton>
                    </div>
                </div>

                <div className="finance-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <Card className="report-summary-card">
                        <div className="card-label">{t('advances.active_advances' || 'Active Advances')}</div>
                        <div className="card-value" style={{ color: '#f59e0b' }}><span className="currency-prefix">LKR</span> <CountUp to={totalActive} separator="," /></div>
                    </Card>
                    <Card className="report-summary-card">
                        <div className="card-label">{t('advances.settled_advances' || 'Settled Advances')}</div>
                        <div className="card-value" style={{ color: '#10b981' }}><span className="currency-prefix">LKR</span> <CountUp to={totalSettled} separator="," /></div>
                    </Card>
                </div>

                <div className="finance-detail" style={{ gridTemplateColumns: '1fr' }}>
                    <Card title={t('advances.records' || 'Advance Records')}>
                        <DataTable
                            columns={columns}
                            data={advances}
                            selectedId={selectedId}
                            onRowClick={selectAdvance}
                            emptyMessage={t('common.no_data')}
                            renderExpansion={renderAdvanceExpansion}
                        />
                    </Card>
                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => { setIsModalOpen(false); handleClear(); }}
                        title={selectedId ? t('advances.edit_advance' || 'Edit Advance') : t('advances.new_advance' || 'New Advance')}
                        onSave={handleSave}
                        onDelete={selectedId ? handleDelete : undefined}
                    >
                        <div className="form-group">
                            <label>{t('common.project')} *</label>
                            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value, workerId: '' })}>
                                <option value="">{t('common.select')}...</option>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{t('nav.workers')} *</label>
                            <select value={form.workerId} disabled={!form.projectId} onChange={(e) => setForm({ ...form, workerId: e.target.value })}>
                                <option value="">{t('common.select')}...</option>
                                {filteredWorkersForForm.map((w) => <option key={w.id} value={w.id}>{w.fullName}</option>)}
                            </select>
                            {!form.projectId && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('advances.select_project_first' || 'Please select a project first')}</span>}
                        </div>
                        <div className="form-group"><label>{t('common.amount')} (LKR)</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                        <div className="form-group"><label>{t('common.date')}</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                        <div className="form-group"><label>{t('common.status')}</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Settled</option><option>Cancelled</option></select></div>
                        <div className="form-group"><label>{t('common.notes')}</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                    </Modal>
                </div>
            </div>
        </GlobalLoadingOverlay >
    );
}
