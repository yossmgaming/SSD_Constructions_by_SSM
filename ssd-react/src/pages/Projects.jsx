import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, MapPin, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { getAll, create, update, remove, queryEq, KEYS } from '../data/db';
import { ProjectStatus, ProjectTypes } from '../models/enums';
import './Projects.css';
import BounceButton from '../components/BounceButton';

const emptyForm = {
    name: '', client: '', clientContact: '', clientPhone: '',
    location: '', projectType: 'Residential', budget: '', contractValue: '',
    startDate: '', endDate: '', progress: 0,
    status: 'Ongoing', description: '',
};

export default function Projects() {
    const { t } = useTranslation();
    const [projects, setProjects] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Dependencies for financials and delete checks
    const [payments, setPayments] = useState([]); // This will now hold payments FOR THE SELECTED PROJECT
    const [advances, setAdvances] = useState([]); // This will now hold advances FOR THE SELECTED PROJECT

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            const projs = await getAll(KEYS.projects);
            setProjects(projs);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    // Fetch financial data for selected project
    useEffect(() => {
        if (!selectedId) {
            setPayments([]);
            setAdvances([]);
            return;
        }

        async function loadFinancials() {
            try {
                const [pays, advs] = await Promise.all([
                    queryEq(KEYS.payments, 'projectId', selectedId),
                    queryEq(KEYS.advances, 'projectId', selectedId)
                ]);
                setPayments(pays);
                setAdvances(advs);
            } catch (error) {
                console.error("Error loading financials:", error);
            }
        }

        loadFinancials();
    }, [selectedId]);

    const filtered = projects.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.client || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || p.status === statusFilter;
        const matchType = typeFilter === 'All' || p.projectType === typeFilter;
        return matchSearch && matchStatus && matchType;
    });

    // ✅ #5–9 Live financial summary
    const financials = useMemo(() => {
        if (!selectedId || !projects.length) return null;

        // Money received from client (direction: In)
        const received = payments
            .filter((p) => p.direction === 'In')
            .reduce((s, p) => s + (p.amount || 0), 0);

        // Money spent (direction: Out)
        const expenses = payments
            .filter((p) => p.direction === 'Out')
            .reduce((s, p) => s + (p.amount || 0), 0);

        // Advances given on this project
        const advancesTotal = advances.reduce((s, a) => s + (a.amount || 0), 0);

        // Pending = advance payments from payments table that are active
        const pendingObl = advances
            .filter((a) => a.status === 'Active')
            .reduce((s, a) => s + (a.amount || 0), 0);

        const proj = projects.find((p) => p.id === selectedId);
        const contractValue = proj?.contractValue || proj?.budget || 0;
        const remainingBalance = contractValue - received;
        const profitLoss = received - expenses;

        return { received, expenses, advancesTotal, pendingObl, remainingBalance, profitLoss, contractValue };
    }, [selectedId, projects, payments, advances]);

    function selectProject(p) {
        setSelectedId(p.id);
        setForm({
            name: p.name, client: p.client || '', clientContact: p.clientContact || '', clientPhone: p.clientPhone || '',
            location: p.location || '', projectType: p.projectType || 'Residential',
            budget: p.budget || '', contractValue: p.contractValue || '',
            startDate: p.startDate || '', endDate: p.endDate || '', progress: p.progress || 0,
            status: p.status, description: p.description || '',
        });
        setIsModalOpen(true);
    }

    async function handleSave() {
        if (!form.name.trim()) return alert(t('projects.project_name') + ' is required');

        setIsLoading(true);
        const data = {
            ...form,
            budget: parseFloat(form.budget) || 0,
            contractValue: parseFloat(form.contractValue) || 0,
            progress: parseInt(form.progress) || 0,
        };
        try {
            if (selectedId) {
                await update(KEYS.projects, selectedId, data);
            } else {
                await create(KEYS.projects, data);
            }
            handleClear();
            setIsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    // ✅ #10 Delete with dependency check
    async function handleDelete() {
        if (!selectedId) return;

        setIsLoading(true);
        try {
            const [workerCount, paymentCount, materialCount, boqCount, advanceCount, oblCount] = await Promise.all([
                queryEq(KEYS.projectWorkers, 'projectId', selectedId),
                queryEq(KEYS.payments, 'projectId', selectedId),
                queryEq(KEYS.projectMaterials, 'projectId', selectedId),
                queryEq(KEYS.boqs, 'projectId', selectedId),
                queryEq(KEYS.advances, 'projectId', selectedId),
                queryEq(KEYS.obligationHeaders, 'projectId', selectedId),
            ]).then(results => results.map(r => r.length));

            const deps = [];
            if (workerCount > 0) deps.push(`${workerCount} worker assignment${workerCount > 1 ? 's' : ''}`);
            if (paymentCount > 0) deps.push(`${paymentCount} payment${paymentCount > 1 ? 's' : ''}`);
            if (materialCount > 0) deps.push(`${materialCount} material record${materialCount > 1 ? 's' : ''}`);
            if (boqCount > 0) deps.push(`${boqCount} BOQ${boqCount > 1 ? 's' : ''}`);
            if (advanceCount > 0) deps.push(`${advanceCount} advance${advanceCount > 1 ? 's' : ''}`);
            if (oblCount > 0) deps.push(`${oblCount} obligation${oblCount > 1 ? 's' : ''}`);

            let msg = t('projects.delete_confirm');
            if (deps.length > 0) {
                msg = `⚠️ This project has ${deps.join(', ')}.\n\n${t('projects.delete_warning')}?`;
            }

            if (!confirm(msg)) {
                setIsLoading(false);
                return;
            }
            await remove(KEYS.projects, selectedId);
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
        { key: 'client', label: t('common.client') },
        { key: 'projectType', label: t('common.type'), render: (v) => v || '—' },
        { key: 'budget', label: t('dashboard.budget'), render: (v) => fmt(v) },
        { key: 'startDate', label: t('projects.start_date'), render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
        {
            key: 'progress', label: 'Progress', render: (v) => (
                <div className="progress-cell">
                    <div className="progress-bar-mini">
                        <div className="progress-fill-mini" style={{ width: `${v || 0}%` }} />
                    </div>
                    <span>{v || 0}%</span>
                </div>
            )
        },
        {
            key: 'status', label: t('common.status'), render: (v) => (
                <span className={`badge ${v === 'Ongoing' ? 'badge-info' : v === 'Completed' ? 'badge-success' : v === 'On Hold' ? 'badge-warning' : 'badge-danger'}`}>{v}</span>
            )
        },
    ];

    return (
        <div className="crud-page projects-page">
            <div className="page-header">
                <h1>{t('projects.title')}</h1>
                <div className="page-header-actions">
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}><Plus size={18} /> {t('projects.new_project')}</BounceButton>
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
                        {Object.values(ProjectStatus).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="filter-group" style={{ flex: 1 }}>
                    <label>{t('common.type')}</label>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="All">{t('common.all')}</option>
                        {ProjectTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {/* ✅ #11 Project count */}
            <div className="result-count">
                Showing <strong>{filtered.length}</strong> of <strong>{projects.length}</strong> project{projects.length !== 1 ? 's' : ''}
                {(search || statusFilter !== 'All' || typeFilter !== 'All') && <span className="filter-active-tag">Filtered</span>}
            </div>

            <div className="crud-layout">
                <div className="project-left-col">
                    <Card title={t('projects.project_list')}>
                        <DataTable columns={columns} data={filtered} selectedId={selectedId} onRowClick={selectProject} emptyMessage={t('projects.no_projects')} />
                    </Card>
                </div>

                {/* ✅ #5–9 Financial Summary Panel */}
                {selectedId && financials && (
                    <Card title={t('common.financial_summary')} className="financial-summary-card">
                        <div className="fin-grid">
                            <div className="fin-item">
                                <div className="fin-label">{t('projects.contract_value')}</div>
                                <div className="fin-value">{fmt(financials.contractValue)}</div>
                            </div>
                            <div className="fin-item received">
                                <div className="fin-label"><TrendingUp size={14} /> {t('projects.total_received')}</div>
                                <div className="fin-value">{fmt(financials.received)}</div>
                            </div>
                            <div className="fin-item expenses">
                                <div className="fin-label"><TrendingDown size={14} /> {t('projects.total_expenses')}</div>
                                <div className="fin-value">{fmt(financials.expenses)}</div>
                            </div>
                            <div className="fin-item balance">
                                <div className="fin-label"><Wallet size={14} /> {t('projects.remaining_balance')}</div>
                                <div className="fin-value">{fmt(financials.remainingBalance)}</div>
                            </div>
                            <div className={`fin-item ${financials.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                                <div className="fin-label"><DollarSign size={14} /> {t('projects.profit_loss')}</div>
                                <div className="fin-value">{fmt(financials.profitLoss)}</div>
                            </div>
                            <div className="fin-item advances">
                                <div className="fin-label">{t('projects.advances_given')}</div>
                                <div className="fin-value">{fmt(financials.advancesTotal)}</div>
                            </div>
                        </div>
                        {financials.pendingObl > 0 && (
                            <div className="fin-alert">⚠ {t('projects.pending_obligations')}: {fmt(financials.pendingObl)}</div>
                        )}
                    </Card>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); handleClear(); }}
                title={selectedId ? t('projects.edit_project') : t('projects.new_project')}
                onSave={handleSave}
                onDelete={selectedId ? handleDelete : undefined}
            >
                <div className="form-group">
                    <label>{t('projects.project_name')}</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>

                {/* ✅ #4 Project Type */}
                <div className="form-group">
                    <label>{t('common.type')}</label>
                    <select
                        value={ProjectTypes.includes(form.projectType) ? form.projectType : 'Other'}
                        onChange={(e) => {
                            if (e.target.value === 'Other') {
                                setForm({ ...form, projectType: '' });
                            } else {
                                setForm({ ...form, projectType: e.target.value });
                            }
                        }}
                    >
                        {ProjectTypes.map((t) => <option key={t}>{t}</option>)}
                    </select>
                </div>
                {(!ProjectTypes.includes(form.projectType) || form.projectType === 'Other' || form.projectType === '') && (
                    <div className="form-group">
                        <label>{t('projects.custom_type')}</label>
                        <input
                            placeholder="Enter project type..."
                            value={form.projectType === 'Other' ? '' : form.projectType}
                            onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                        />
                    </div>
                )}

                <div className="form-group">
                    <label>{t('projects.client_name')}</label>
                    <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
                </div>

                {/* ✅ #2 Contact Person */}
                <div className="form-grid">
                    <div className="form-group">
                        <label>{t('projects.contact_person')}</label>
                        <input placeholder="Point of contact..." value={form.clientContact} onChange={(e) => setForm({ ...form, clientContact: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>{t('projects.contact_phone')}</label>
                        <input placeholder="Phone number..." value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} />
                    </div>
                </div>

                {/* ✅ #1 Location */}
                <div className="form-group">
                    <label><MapPin size={13} style={{ marginRight: 4 }} />{t('common.location')}</label>
                    <input placeholder="e.g. Colombo 07, Galle Road" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>{t('dashboard.budget')} (LKR) {form.budget && <span className="rate-preview">{fmt(form.budget)}</span>}</label>
                        <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                    </div>
                    {/* ✅ #3 Contract Value */}
                    <div className="form-group">
                        <label>{t('projects.contract_value')} (LKR) {form.contractValue && <span className="rate-preview">{fmt(form.contractValue)}</span>}</label>
                        <input type="number" value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: e.target.value })} />
                    </div>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>{t('projects.start_date')}</label>
                        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>{t('projects.end_date')}</label>
                        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                    </div>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>{t('common.status')}</label>
                        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            {Object.values(ProjectStatus).map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    {/* ✅ #12 Progress */}
                    <div className="form-group">
                        <label>{t('common.progress')}: <strong>{form.progress}%</strong></label>
                        <input
                            type="range" min="0" max="100" step="5"
                            value={form.progress}
                            onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })}
                            className="progress-slider"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>{t('common.description')}</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
            </Modal>
        </div>
    );
}
