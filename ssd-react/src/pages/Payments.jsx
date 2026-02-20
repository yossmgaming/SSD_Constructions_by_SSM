import { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle, Zap } from 'lucide-react';
import CountUp from '../components/CountUp';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { getAll, create, update, remove, query, KEYS } from '../data/db';
import './Payments.css';
import BounceButton from '../components/BounceButton';

const CATEGORIES = ['Client Payment', 'Worker Pay', 'Material Purchase', 'Project Expense', 'Advance', 'Other'];

const emptyForm = {
    direction: 'Out', category: 'Worker Pay', projectId: '', workerId: '', supplierId: '', materialId: '',
    amount: '', date: new Date().toISOString().split('T')[0], method: 'Cash', reference: '', notes: '',
};

export default function Payments() {
    const [payments, setPayments] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [dirFilter, setDirFilter] = useState('All');
    const [catFilter, setCatFilter] = useState('All');
    const [projFilter, setProjFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Default to current month (robust)
    const today = new Date();
    const toLocal = (d) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };
    const firstDay = toLocal(new Date(today.getFullYear(), today.getMonth(), 1));
    const lastDay = toLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    const [fromDate, setFromDate] = useState(firstDay);
    const [toDate, setToDate] = useState(lastDay);
    const [suggestion, setSuggestion] = useState(null);

    const [isLoading, setIsLoading] = useState(true);

    const [projects, setProjects] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [materials, setMaterials] = useState([]);
    // Additional data needed for calculation
    const [attendances, setAttendances] = useState([]);
    const [advances, setAdvances] = useState([]);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            const [pays, projs, wrks, sups, mats, atts, advs] = await Promise.all([
                getAll(KEYS.payments),
                getAll(KEYS.projects),
                getAll(KEYS.workers),
                getAll(KEYS.suppliers),
                getAll(KEYS.materials),
                getAll(KEYS.attendances),
                getAll(KEYS.advances)
            ]);
            setPayments(pays);
            setProjects(projs);
            setWorkers(wrks);
            setSuppliers(sups);
            setMaterials(mats);
            setAttendances(atts);
            setAdvances(advs);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    // ─── Smart Auto-fill ─────────────────────────────────────────
    function calcWorkerSuggestion(workerId, projectId, salaryFrom, salaryTo) {
        if (!workerId) { setSuggestion(null); return; }
        const worker = workers.find((w) => w.id === parseInt(workerId));
        if (!worker) { setSuggestion(null); return; }

        const rate = worker.dailyRate || 0;
        const workerAttendance = attendances.filter((a) => {
            const matchWorker = a.workerId === parseInt(workerId);
            const matchProject = !projectId || a.projectId === parseInt(projectId);

            // Date Range Filter
            let matchDate = true;
            if (salaryFrom || salaryTo) {
                const dateStr = a.date ? a.date.substring(0, 10) : '';
                if (!dateStr) matchDate = false; // Hide undated if range selected
                else {
                    if (salaryFrom && dateStr < salaryFrom) matchDate = false;
                    if (salaryTo && dateStr > salaryTo) matchDate = false;
                }
            }

            return matchWorker && matchProject && matchDate;
        });

        // Sum up hours worked
        let totalDays = 0;
        let totalHours = 0;
        workerAttendance.forEach((a) => {
            // 1. Check for new UI fields (isPresent explicit)
            if (a.isPresent !== undefined) {
                if (!a.isPresent) return; // Explicitly absent
                if (a.hoursWorked) {
                    const h = parseFloat(a.hoursWorked);
                    totalDays += h / 8;
                    totalHours += h;
                } else if (a.isHalfDay) {
                    totalDays += 0.5;
                    totalHours += 4;
                } else {
                    totalDays += 1;
                    totalHours += 8;
                }
            }
            // 2. Fallback to legacy/seed data (only if UI hasn't touched it)
            else {
                if (a.hours !== undefined && a.hours !== null) {
                    const h = parseFloat(a.hours);
                    totalDays += h / 8;
                    totalHours += h;
                } else if (a.status === 'Present' || a.status === 'Full') {
                    totalDays += 1;
                    totalHours += 8;
                } else if (a.status === 'Half' || a.status === 'Half Day') {
                    totalDays += 0.5;
                    totalHours += 4;
                }
            }
        });

        // Already paid for this worker+project
        const alreadyPaid = payments
            .filter((p) => {
                const matchBase = p.category === 'Worker Pay' && p.workerId === parseInt(workerId)
                    && (!projectId || p.projectId === parseInt(projectId));

                // Date Range Filter for Payments
                let matchDate = true;
                if (salaryFrom || salaryTo) {
                    const dateStr = p.date ? p.date.substring(0, 10) : '';
                    if (!dateStr) matchDate = false;
                    else {
                        if (salaryFrom && dateStr < salaryFrom) matchDate = false;
                        if (salaryTo && dateStr > salaryTo) matchDate = false;
                    }
                }
                return matchBase && matchDate;
            })
            .reduce((s, p) => s + (p.amount || 0), 0);

        // Fetch active advances
        const activeAdvances = advances
            .filter((a) => a.workerId === parseInt(workerId) && a.status === 'Active' && (!projectId || a.projectId === parseInt(projectId)))
            .reduce((s, a) => s + (a.amount || 0), 0);

        // Calculate Total Earned: Use Hourly if available, else Daily
        let totalEarned = 0;
        const hr = worker.hourlyRate ? parseFloat(worker.hourlyRate) : 0;
        if (hr > 0) {
            totalEarned = totalHours * hr;
        } else {
            totalEarned = totalDays * rate;
        }

        // Outstanding can be negative (worker owes money)
        const outstanding = totalEarned - alreadyPaid - activeAdvances;

        setSuggestion({
            type: 'worker',
            label: worker.fullName,
            rate,
            hourlyRate: worker.hourlyRate || 0,
            totalHours: Math.round(totalHours * 100) / 100,
            totalDays: Math.round(totalDays * 10) / 10,
            totalEarned,
            alreadyPaid,
            activeAdvances,
            outstanding,
        });
    }

    function calcMaterialSuggestion(materialId) {
        if (!materialId) { setSuggestion(null); return; }
        const mat = materials.find((m) => m.id === parseInt(materialId));
        if (!mat) { setSuggestion(null); return; }

        const unitCost = mat.cost || 0;
        const totalValue = (mat.quantity || 0) * unitCost;

        // Already paid for this material
        const alreadyPaid = payments
            .filter((p) => p.category === 'Material Purchase' && p.materialId === parseInt(materialId))
            .reduce((s, p) => s + (p.amount || 0), 0);

        setSuggestion({
            type: 'material',
            label: mat.name,
            unitCost,
            quantity: mat.quantity || 0,
            unit: mat.unit || 'pcs',
            totalValue,
            alreadyPaid,
            outstanding: Math.max(0, totalValue - alreadyPaid),
        });
    }

    function calcProjectSuggestion(projectId) {
        if (!projectId) { setSuggestion(null); return; }
        const proj = projects.find((p) => p.id === parseInt(projectId));
        if (!proj) { setSuggestion(null); return; }

        const contractValue = proj.contractValue || proj.budget || 0;
        const received = payments
            .filter((p) => p.direction === 'In' && p.projectId === parseInt(projectId))
            .reduce((s, p) => s + (p.amount || 0), 0);
        const spent = payments
            .filter((p) => p.direction === 'Out' && p.projectId === parseInt(projectId))
            .reduce((s, p) => s + (p.amount || 0), 0);

        if (form.category === 'Client Payment') {
            setSuggestion({
                type: 'project-in',
                label: proj.name,
                contractValue,
                received,
                remaining: Math.max(0, contractValue - received),
            });
        } else {
            setSuggestion(null);
        }
    }

    // Trigger calculation when form fields change
    useEffect(() => {
        if (form.category === 'Worker Pay' || form.category === 'Advance') {
            calcWorkerSuggestion(form.workerId, form.projectId, form.salaryFrom, form.salaryTo);
        } else if (form.category === 'Material Purchase') {
            calcMaterialSuggestion(form.materialId);
        } else if (form.category === 'Client Payment') {
            calcProjectSuggestion(form.projectId);
        } else {
            setSuggestion(null);
        }
    }, [form.category, form.workerId, form.projectId, form.salaryFrom, form.salaryTo, form.materialId]);

    function onCategoryChange(cat) {
        setForm(f => ({ ...f, category: cat, workerId: '', materialId: '', supplierId: '', projectId: '' }));
    }

    function onWorkerChange(workerId) {
        // Auto-populate salary range with current month
        setForm((f) => ({ ...f, workerId, salaryFrom: firstDay, salaryTo: lastDay }));
    }

    function onMaterialChange(materialId) {
        setForm((f) => ({ ...f, materialId }));
    }

    function onProjectChange(projectId) {
        setForm((f) => ({ ...f, projectId }));
    }

    function applySuggested(val) {
        setForm((f) => ({ ...f, amount: String(Math.abs(val)) }));
    }

    function applySettlement(val) {
        setForm((f) => ({ ...f, direction: 'In', category: 'Advance', amount: String(Math.abs(val)) }));
    }

    // ─── Summary cards ───────────────────────────────────────────
    const summary = useMemo(() => {
        const totalIn = payments.filter((p) => p.direction === 'In').reduce((s, p) => s + (p.amount || 0), 0);
        const paymentsOut = payments.filter((p) => p.direction === 'Out').reduce((s, p) => s + (p.amount || 0), 0);
        const advancesOut = advances.reduce((s, a) => s + (a.amount || 0), 0);
        const totalOut = paymentsOut + advancesOut;
        return { totalIn, totalOut, net: totalIn - totalOut, count: payments.length + advances.length };
    }, [payments, advances]);

    const filtered = payments.filter((p) => {
        // Date Range
        if (fromDate || toDate) {
            // Handle ISO strings by taking first 10 chars (YYYY-MM-DD)
            const pDate = p.date ? p.date.substring(0, 10) : '';
            if (!pDate) return false;
            if (fromDate && pDate < fromDate) return false;
            if (toDate && pDate > toDate) return false;
        }

        const s = search.toLowerCase();
        const proj = projects.find((pr) => pr.id === p.projectId);
        const worker = workers.find((w) => w.id === p.workerId);
        const sup = suppliers.find((sp) => sp.id === p.supplierId);
        const matchSearch = !s || (proj?.name || '').toLowerCase().includes(s) || (worker?.fullName || '').toLowerCase().includes(s)
            || (sup?.name || '').toLowerCase().includes(s) || (p.category || '').toLowerCase().includes(s)
            || (p.reference || '').toLowerCase().includes(s) || (p.notes || '').toLowerCase().includes(s);
        const matchDir = dirFilter === 'All' || p.direction === dirFilter;
        const matchCat = catFilter === 'All' || p.category === catFilter;
        const matchProj = projFilter === 'All' || p.projectId === parseInt(projFilter);
        return matchSearch && matchDir && matchCat && matchProj;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    function selectPayment(p) {
        setSelectedId(p.id);
        setSuggestion(null);
        setForm({
            direction: p.direction || 'Out', category: p.category || 'Other',
            projectId: p.projectId || '', workerId: p.workerId || '', supplierId: p.supplierId || '',
            materialId: p.materialId || '', amount: p.amount || '',
            date: p.date || '', method: p.method || 'Cash', reference: p.reference || '', notes: p.notes || '',
        });
        setIsModalOpen(true);
    }

    async function handleSave() {
        if (!form.amount || parseFloat(form.amount) <= 0) return alert('Enter a valid amount');
        if (!form.projectId) return alert('Select a project');

        setIsLoading(true);
        const data = {
            direction: form.direction,
            category: form.category,
            projectId: parseInt(form.projectId),
            workerId: form.workerId ? parseInt(form.workerId) : null,
            supplierId: form.supplierId ? parseInt(form.supplierId) : null,
            materialId: form.materialId ? parseInt(form.materialId) : null,
            amount: parseFloat(form.amount),
            date: form.date,
            method: form.method,
            reference: form.reference,
            notes: form.notes,
        };

        try {
            if (selectedId) await update(KEYS.payments, selectedId, data);
            else await create(KEYS.payments, data);

            // Auto-settle advances logic if Money In + Advance + Worker
            if (data.direction === 'In' && data.category === 'Advance' && data.workerId) {
                const activeAdvances = advances
                    .filter(a => a.workerId === data.workerId && a.status === 'Active')
                    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first

                let remaining = data.amount;
                for (const adv of activeAdvances) {
                    if (remaining <= 0) break;

                    if (remaining >= adv.amount) {
                        // Full settlement
                        await update(KEYS.advances, adv.id, {
                            status: 'Settled',
                            notes: (adv.notes || '') + `\n[${new Date().toLocaleDateString()}] Fully settled via payment.`
                        });
                        remaining -= adv.amount;
                    } else {
                        // Partial settlement
                        await update(KEYS.advances, adv.id, {
                            amount: adv.amount - remaining,
                            notes: (adv.notes || '') + `\n[${new Date().toLocaleDateString()}] Partially settled ${fmt(remaining)}. Original: ${fmt(adv.amount)}`
                        });
                        remaining = 0;
                    }
                }
            }

            handleClear();
            setIsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    // #11 - Delete with proper confirm
    async function handleDelete() {
        if (selectedId && confirm('Delete this payment record?')) {
            setIsLoading(true);
            try {
                await remove(KEYS.payments, selectedId);
                handleClear();
                setIsModalOpen(false);
                await loadData();
            } catch (error) {
                console.error(error);
                setIsLoading(false);
            }
        }
    }

    function handleClear() {
        setForm(emptyForm); setSelectedId(null); setSuggestion(null);
    }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    function onCategoryChange(cat) {
        const dir = cat === 'Client Payment' ? 'In' : 'Out';
        setForm((f) => ({ ...f, category: cat, direction: dir, workerId: '', supplierId: '', materialId: '' }));
        setSuggestion(null);
    }

    const columns = [
        { key: 'date', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
        {
            key: 'direction', label: 'Type', render: (v) => (
                v === 'In' ? <span className="badge badge-success"><ArrowDownCircle size={14} /> In</span> : <span className="badge badge-warning"><ArrowUpCircle size={14} /> Out</span>
            )
        },
        { key: 'category', label: 'Category' },
        {
            key: 'description', label: 'Description', render: (_, r) => {
                const proj = projects.find((p) => p.id === r.projectId);
                const worker = workers.find((w) => w.id === r.workerId);
                const sup = suppliers.find((s) => s.id === r.supplierId);
                const mat = materials.find((m) => m.id === r.materialId);
                let desc = proj ? proj.name : 'Unknown Project';
                if (r.workerId) desc += ` • ${worker ? worker.fullName : 'Worker?'}`;
                if (r.supplierId) desc += ` • ${sup ? sup.name : 'Supplier?'}`;
                if (r.materialId) desc += ` • ${mat ? mat.name : 'Material'}`;
                if (r.notes) desc += ` • ${r.notes}`;
                return <div className="desc-cell">{desc}</div>;
            }
        },
        { key: 'amount', label: 'Amount', render: (v) => fmt(v) },
    ];

    // ─── Render suggestion card ──────────────────────────────────
    function renderSuggestion() {
        if (!suggestion) return null;

        if (suggestion.type === 'worker') {
            return (
                <div className="smart-suggestion">
                    <div className="smart-header"><Zap size={14} /> Smart Fill — {suggestion.label}</div>
                    <div className="smart-grid">
                        {form.salaryFrom && form.salaryTo && (
                            <div style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: '#6366f1', marginBottom: '4px' }}>
                                Period: {new Date(form.salaryFrom).toLocaleDateString()} — {new Date(form.salaryTo).toLocaleDateString()}
                            </div>
                        )}
                        {suggestion.hourlyRate > 0 ? (
                            <>
                                <span>Hourly Rate:</span><strong><span className="currency-prefix">LKR</span> <CountUp to={suggestion.hourlyRate} separator="," /></strong>
                                <span>Total Hours:</span><strong><CountUp to={suggestion.totalHours} /></strong>
                            </>
                        ) : (
                            <>
                                <span>Daily Rate:</span><strong><span className="currency-prefix">LKR</span> <CountUp to={suggestion.rate} separator="," /></strong>
                                <span>Total Hours:</span><strong><CountUp to={suggestion.totalHours} /></strong>
                            </>
                        )}
                        <span>Total Earned:</span><strong><span className="currency-prefix">LKR</span> <CountUp to={suggestion.totalEarned} separator="," /></strong>
                        <span>Already Paid:</span><strong className="text-muted"><span className="currency-prefix">LKR</span> <CountUp to={suggestion.alreadyPaid} separator="," /></strong>
                        {suggestion.activeAdvances > 0 && (
                            <><span>Active Adv:</span><strong className="text-warning">-<span className="currency-prefix">LKR</span> <CountUp to={suggestion.activeAdvances} separator="," /></strong></>
                        )}

                        <span>{suggestion.outstanding >= 0 ? 'Outstanding:' : 'Wait Payment:'}</span>
                        <strong className={suggestion.outstanding >= 0 ? "text-accent" : "text-danger"}>
                            <span className="currency-prefix">LKR</span> <CountUp to={Math.abs(suggestion.outstanding)} separator="," />
                        </strong>
                    </div>

                    {suggestion.outstanding > 0 && (
                        <BounceButton className="btn btn-smart" onClick={() => applySuggested(suggestion.outstanding)}>
                            <Zap size={12} /> Pay Outstanding: {fmt(suggestion.outstanding)}
                        </BounceButton>
                    )}
                    {suggestion.totalEarned > 0 && !(suggestion.outstanding < 0) && (
                        <BounceButton className="btn btn-smart-alt" onClick={() => applySuggested(suggestion.totalEarned)}>
                            Pay Full Earned: {fmt(suggestion.totalEarned)}
                        </BounceButton>
                    )}

                    {/* Settlement Button for Negative Outstanding */}
                    {suggestion.outstanding < 0 && (
                        <BounceButton className="btn btn-smart-alt" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => applySettlement(suggestion.outstanding)}>
                            <ArrowDownCircle size={12} /> Settle Advance {fmt(Math.abs(suggestion.outstanding))}
                        </BounceButton>
                    )}
                </div>
            );
        }

        if (suggestion.type === 'material') {
            return (
                <div className="smart-suggestion">
                    <div className="smart-header"><Zap size={14} /> Smart Fill — {suggestion.label}</div>
                    <div className="smart-grid">
                        <span>Unit Cost:</span><strong><span className="currency-prefix">LKR</span> <CountUp to={suggestion.unitCost} separator="," /></strong>
                        <span>Stock Qty:</span><strong><CountUp to={suggestion.quantity} /> {suggestion.unit}</strong>
                        <span>Total Value:</span><strong><span className="currency-prefix">LKR</span> <CountUp to={suggestion.totalValue} separator="," /></strong>
                        <span>Already Paid:</span><strong className="text-muted"><span className="currency-prefix">LKR</span> <CountUp to={suggestion.alreadyPaid} separator="," /></strong>
                        <span>Outstanding:</span><strong className="text-accent"><span className="currency-prefix">LKR</span> <CountUp to={suggestion.outstanding} separator="," /></strong>
                    </div>
                    {suggestion.outstanding > 0 && (
                        <BounceButton className="btn btn-smart" onClick={() => applySuggested(suggestion.outstanding)}>
                            <Zap size={12} /> Apply {fmt(suggestion.outstanding)}
                        </BounceButton>
                    )}
                    {suggestion.unitCost > 0 && (
                        <BounceButton className="btn btn-smart-alt" onClick={() => applySuggested(suggestion.unitCost)}>
                            Apply Unit Cost: {fmt(suggestion.unitCost)}
                        </BounceButton>
                    )}
                </div>
            );
        }

        if (suggestion.type === 'project-in') {
            return (
                <div className="smart-suggestion">
                    <div className="smart-header"><Zap size={14} /> Smart Fill — {suggestion.label}</div>
                    <div className="smart-grid">
                        <span>Contract Value:</span><strong><span className="currency-prefix">LKR</span> <CountUp to={suggestion.contractValue} separator="," /></strong>
                        <span>Already Received:</span><strong className="text-muted"><span className="currency-prefix">LKR</span> <CountUp to={suggestion.received} separator="," /></strong>
                        <span>Remaining:</span><strong className="text-accent"><span className="currency-prefix">LKR</span> <CountUp to={suggestion.remaining} separator="," /></strong>
                    </div>
                    {suggestion.remaining > 0 && (
                        <BounceButton className="btn btn-smart" onClick={() => applySuggested(suggestion.remaining)}>
                            <Zap size={12} /> Apply {fmt(suggestion.remaining)}
                        </BounceButton>
                    )}
                </div>
            );
        }

        return null;
    }

    return (
        <div className="crud-page payments-page">
            <div className="page-header">
                <h1>Payments</h1>
                <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}><Plus size={18} /> New Payment</BounceButton>
            </div>

            {/* Summary cards */}
            <div className="payment-summary">
                <div className="pay-card pay-in">
                    <div className="pay-card-label"><ArrowDownCircle size={14} /> Money In</div>
                    <div className="pay-card-value"><span className="currency-prefix">LKR</span> <CountUp to={summary.totalIn} separator="," /></div>
                </div>
                <div className="pay-card pay-out">
                    <div className="pay-card-label"><ArrowUpCircle size={14} /> Money Out</div>
                    <div className="pay-card-value"><span className="currency-prefix">LKR</span> <CountUp to={summary.totalOut} separator="," /></div>
                </div>
                <div className={`pay-card ${summary.net >= 0 ? 'pay-profit' : 'pay-loss'}`}>
                    <div className="pay-card-label"><Zap size={14} /> Net Cash Flow</div>
                    <div className="pay-card-value"><span className="currency-prefix">LKR</span> <CountUp to={summary.net} separator="," /></div>
                </div>
                <div className="pay-card pay-count">
                    <div className="pay-card-label">Total Transactions</div>
                    <div className="pay-card-value"><CountUp to={summary.count} /></div>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <div className="filter-group" style={{ flex: 2 }}>
                    <label>Search</label>
                    <input placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                {/* Date Range Filters */}
                <div className="filter-group">
                    <label>From</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="filter-group">
                    <label>To</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <div className="filter-group">
                    <label>Direction</label>
                    <select value={dirFilter} onChange={(e) => setDirFilter(e.target.value)}>
                        <option>All</option><option value="In">Money In</option><option value="Out">Money Out</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Category</label>
                    <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                        <option>All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Project</label>
                    <select value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
                        <option>All</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="result-count">
                Showing <strong>{filtered.length}</strong> of <strong>{payments.length}</strong> transaction{payments.length !== 1 ? 's' : ''}
                {(search || dirFilter !== 'All' || catFilter !== 'All' || projFilter !== 'All') && <span className="filter-active-tag">Filtered</span>}
            </div>

            <div className="payments-table-container">
                <Card title="All Transactions">
                    <DataTable columns={columns} data={filtered} selectedId={selectedId} onRowClick={selectPayment} emptyMessage="No payments found" />
                </Card>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); handleClear(); }}
                    title={selectedId ? 'Edit Payment' : 'New Payment'}
                    onSave={handleSave}
                    onDelete={selectedId ? handleDelete : undefined}
                >
                    {/* Direction toggle */}
                    <div className="direction-toggle">
                        <BounceButton className={`dir-btn ${form.direction === 'In' ? 'active-in' : ''}`}
                            onClick={() => setForm({ ...form, direction: 'In' })}>
                            <ArrowDownCircle size={16} /> Money In
                        </BounceButton>
                        <BounceButton className={`dir-btn ${form.direction === 'Out' ? 'active-out' : ''}`}
                            onClick={() => setForm({ ...form, direction: 'Out' })}>
                            <ArrowUpCircle size={16} /> Money Out
                        </BounceButton>
                    </div>

                    <div className="form-group">
                        <label>Category</label>
                        <select value={form.category} onChange={(e) => onCategoryChange(e.target.value)}>
                            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Project *</label>
                        <select value={form.projectId} onChange={(e) => onProjectChange(e.target.value)}>
                            <option value="">— Select Project —</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name} {p.status !== 'Ongoing' ? `[${p.status}]` : ''}</option>)}
                        </select>
                    </div>

                    {/* Contextual: Worker dropdown for Worker Pay / Advance */}
                    {(form.category === 'Worker Pay' || form.category === 'Advance') && (
                        <>
                            <div className="form-group">
                                <label>Worker</label>
                                <select value={form.workerId} onChange={(e) => onWorkerChange(e.target.value)}>
                                    <option value="">— Select Worker —</option>
                                    {workers.map((w) => <option key={w.id} value={w.id}>{w.fullName} ({w.role}) — {fmt(w.dailyRate)}/day</option>)}
                                </select>
                            </div>

                            {/* Custom Salary Range (Auto-appears) */}
                            {form.category === 'Worker Pay' && form.workerId && (
                                <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Salary From</label>
                                        <input
                                            type="date"
                                            value={form.salaryFrom || ''}
                                            onChange={(e) => setForm(f => ({ ...f, salaryFrom: e.target.value }))}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Salary To</label>
                                        <input
                                            type="date"
                                            value={form.salaryTo || ''}
                                            onChange={(e) => setForm(f => ({ ...f, salaryTo: e.target.value }))}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Contextual: Supplier + Material for Material Purchase */}
                    {form.category === 'Material Purchase' && (
                        <>
                            <div className="form-group">
                                <label>Supplier</label>
                                <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                                    <option value="">— Select Supplier —</option>
                                    {suppliers.filter((s) => s.isActive !== false).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Material</label>
                                <select value={form.materialId} onChange={(e) => onMaterialChange(e.target.value)}>
                                    <option value="">— Select Material —</option>
                                    {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.category}) — {fmt(m.cost)}/{m.unit}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {/* ⚡ Smart Suggestion Card */}
                    {renderSuggestion()}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Amount (LKR) {form.amount && <span className="rate-preview">{fmt(form.amount)}</span>}</label>
                            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Method</label>
                            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                                <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Online</option><option>Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Reference #</label>
                            <input placeholder="Cheque no, receipt..." value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Notes</label>
                        <textarea placeholder="Payment details..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                </Modal>
            </div>
        </div>
    );
}
