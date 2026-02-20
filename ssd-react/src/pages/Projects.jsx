import { useState, useEffect, useMemo } from 'react';
import { Plus, MapPin, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { getAll, create, update, remove, query, KEYS } from '../data/db';
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
    const [projects, setProjects] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Dependencies for financials and delete checks
    const [payments, setPayments] = useState([]);
    const [advances, setAdvances] = useState([]);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            const [projs, pays, advs] = await Promise.all([
                getAll(KEYS.projects),
                getAll(KEYS.payments),
                getAll(KEYS.advances)
            ]);
            setProjects(projs);
            setPayments(pays);
            setAdvances(advs);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    const filtered = projects.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.client || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || p.status === statusFilter;
        const matchType = typeFilter === 'All' || p.projectType === typeFilter;
        return matchSearch && matchStatus && matchType;
    });

    // ✅ #5–9 Live financial summary
    const financials = useMemo(() => {
        if (!selectedId) return null;

        const allPayments = payments.filter((p) => p.projectId === selectedId);
        const projAdvances = advances.filter((a) => a.projectId === selectedId);

        // Money received from client (direction: In)
        const received = allPayments
            .filter((p) => p.direction === 'In')
            .reduce((s, p) => s + (p.amount || 0), 0);

        // Money spent (direction: Out)
        const expenses = allPayments
            .filter((p) => p.direction === 'Out')
            .reduce((s, p) => s + (p.amount || 0), 0);

        // Advances given on this project
        const advancesTotal = projAdvances.reduce((s, a) => s + (a.amount || 0), 0);

        // Pending = advance payments from payments table that are active
        const pendingObl = projAdvances
            .filter((a) => a.status === 'Active')
            .reduce((s, a) => s + (a.amount || 0), 0);

        const proj = projects.find((p) => p.id === selectedId);
        const contractValue = proj?.contractValue || proj?.budget || 0;
        const remainingBalance = contractValue - received;
        const profitLoss = received - expenses;

        return { received, expenses, advancesTotal, pendingObl, remainingBalance, profitLoss, contractValue };
    }, [selectedId, projects]);

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
        if (!form.name.trim()) return alert('Project name is required');

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
            const workerCount = (await query(KEYS.projectWorkers, (pw) => pw.projectId === selectedId)).length;
            const paymentCount = (await query(KEYS.payments, (p) => p.projectId === selectedId)).length;
            const materialCount = (await query(KEYS.projectMaterials, (pm) => pm.projectId === selectedId)).length;
            const boqCount = (await query(KEYS.boqs, (b) => b.projectId === selectedId)).length;
            const advanceCount = (await query(KEYS.advances, (a) => a.projectId === selectedId)).length;
            const oblCount = (await query(KEYS.obligationHeaders, (h) => h.projectId === selectedId)).length;

            const deps = [];
            if (workerCount > 0) deps.push(`${workerCount} worker assignment${workerCount > 1 ? 's' : ''}`);
            if (paymentCount > 0) deps.push(`${paymentCount} payment${paymentCount > 1 ? 's' : ''}`);
            if (materialCount > 0) deps.push(`${materialCount} material record${materialCount > 1 ? 's' : ''}`);
            if (boqCount > 0) deps.push(`${boqCount} BOQ${boqCount > 1 ? 's' : ''}`);
            if (advanceCount > 0) deps.push(`${advanceCount} advance${advanceCount > 1 ? 's' : ''}`);
            if (oblCount > 0) deps.push(`${oblCount} obligation${oblCount > 1 ? 's' : ''}`);

            let msg = 'Delete this project?';
            if (deps.length > 0) {
                msg = `⚠️ This project has ${deps.join(', ')}.\n\nDeleting will leave orphan records. Are you sure?`;
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
        { key: 'name', label: 'Name' },
        { key: 'client', label: 'Client' },
        { key: 'projectType', label: 'Type', render: (v) => v || '—' },
        { key: 'budget', label: 'Budget', render: (v) => fmt(v) },
        { key: 'startDate', label: 'Start', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
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
            key: 'status', label: 'Status', render: (v) => (
                <span className={`badge ${v === 'Ongoing' ? 'badge-info' : v === 'Completed' ? 'badge-success' : v === 'On Hold' ? 'badge-warning' : 'badge-danger'}`}>{v}</span>
            )
        },
    ];

    return (
        <div className="crud-page projects-page">
            <div className="page-header">
                <h1>Projects</h1>
                <div className="page-header-actions">
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}><Plus size={18} /> New Project</BounceButton>
                </div>
            </div>

            <div className="filter-bar">
                <div className="filter-group" style={{ flex: 2 }}>
                    <label>Search</label>
                    <input placeholder="Search by name or client..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="filter-group" style={{ flex: 1 }}>
                    <label>Status</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option>All</option>
                        {Object.values(ProjectStatus).map((s) => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div className="filter-group" style={{ flex: 1 }}>
                    <label>Type</label>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option>All</option>
                        {ProjectTypes.map((t) => <option key={t}>{t}</option>)}
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
                    <Card title="Project List">
                        <DataTable columns={columns} data={filtered} selectedId={selectedId} onRowClick={selectProject} emptyMessage="No projects found" />
                    </Card>

                    {/* ✅ #5–9 Financial Summary Panel */}
                    {selectedId && financials && (
                        <Card title="Financial Summary" className="financial-summary-card">
                            <div className="fin-grid">
                                <div className="fin-item">
                                    <div className="fin-label">Contract Value</div>
                                    <div className="fin-value">{fmt(financials.contractValue)}</div>
                                </div>
                                <div className="fin-item received">
                                    <div className="fin-label"><TrendingUp size={14} /> Total Received</div>
                                    <div className="fin-value">{fmt(financials.received)}</div>
                                </div>
                                <div className="fin-item expenses">
                                    <div className="fin-label"><TrendingDown size={14} /> Total Expenses</div>
                                    <div className="fin-value">{fmt(financials.expenses)}</div>
                                </div>
                                <div className="fin-item balance">
                                    <div className="fin-label"><Wallet size={14} /> Remaining Balance</div>
                                    <div className="fin-value">{fmt(financials.remainingBalance)}</div>
                                </div>
                                <div className={`fin-item ${financials.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                                    <div className="fin-label"><DollarSign size={14} /> Profit / Loss</div>
                                    <div className="fin-value">{fmt(financials.profitLoss)}</div>
                                </div>
                                <div className="fin-item advances">
                                    <div className="fin-label">Advances Given</div>
                                    <div className="fin-value">{fmt(financials.advancesTotal)}</div>
                                </div>
                            </div>
                            {financials.pendingObl > 0 && (
                                <div className="fin-alert">⚠ Pending obligations: {fmt(financials.pendingObl)}</div>
                            )}
                        </Card>
                    )}
                </div>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); handleClear(); }}
                    title={selectedId ? 'Edit Project' : 'New Project'}
                    onSave={handleSave}
                    onDelete={selectedId ? handleDelete : undefined}
                >
                    <div className="form-group">
                        <label>Project Name</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>

                    {/* ✅ #4 Project Type */}
                    <div className="form-group">
                        <label>Project Type</label>
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
                            <label>Custom Type</label>
                            <input
                                placeholder="Enter project type..."
                                value={form.projectType === 'Other' ? '' : form.projectType}
                                onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Client Name</label>
                        <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
                    </div>

                    {/* ✅ #2 Contact Person */}
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Contact Person</label>
                            <input placeholder="Point of contact..." value={form.clientContact} onChange={(e) => setForm({ ...form, clientContact: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Contact Phone</label>
                            <input placeholder="Phone number..." value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} />
                        </div>
                    </div>

                    {/* ✅ #1 Location */}
                    <div className="form-group">
                        <label><MapPin size={13} style={{ marginRight: 4 }} />Location</label>
                        <input placeholder="e.g. Colombo 07, Galle Road" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>Budget (LKR) {form.budget && <span className="rate-preview">{fmt(form.budget)}</span>}</label>
                            <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                        </div>
                        {/* ✅ #3 Contract Value */}
                        <div className="form-group">
                            <label>Contract Value (LKR) {form.contractValue && <span className="rate-preview">{fmt(form.contractValue)}</span>}</label>
                            <input type="number" value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>Start Date</label>
                            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>End Date</label>
                            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>Status</label>
                            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                {Object.values(ProjectStatus).map((s) => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        {/* ✅ #12 Progress */}
                        <div className="form-group">
                            <label>Progress: <strong>{form.progress}%</strong></label>
                            <input
                                type="range" min="0" max="100" step="5"
                                value={form.progress}
                                onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })}
                                className="progress-slider"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                </Modal>
            </div>
        </div>
    );
}
