import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import { getAll, create, update, remove, query, KEYS } from '../data/db';
import './Finance.css';
import BounceButton from '../components/BounceButton';

export default function WorkerPayroll() {
    const [headers, setHeaders] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [form, setForm] = useState({ workerId: '', projectId: '', periodStart: '', periodEnd: '', totalAmount: '', paidAmount: '', status: 'Draft', notes: '' });
    const [lines, setLines] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [settlementAmt, setSettlementAmt] = useState('');
    const [isLoading, setIsLoading] = useState(true);

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

    async function loadData() {
        setIsLoading(true);
        try {
            const [allHeaders, allWorkers, allProjects] = await Promise.all([
                getAll(KEYS.obligationHeaders),
                getAll(KEYS.workers),
                getAll(KEYS.projects)
            ]);
            setHeaders(allHeaders.filter((h) => h.type === 'WorkerPayroll'));
            setWorkers(allWorkers);
            setProjects(allProjects);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    // Filter headers
    const filteredHeaders = headers.filter(h => {
        // Filter by Period End date
        let d = h.periodEnd || h.periodStart;
        if (d) d = d.substring(0, 10); // Robust comparison

        if (fromDate || toDate) {
            if (!d) return false; // Hide if filtering
            if (fromDate && d < fromDate) return false;
            if (toDate && d > toDate) return false;
        }
        return true;
    });

    async function selectHeader(h) {
        setSelectedId(h.id);
        setForm({ workerId: h.entityId || '', projectId: h.projectId || '', periodStart: h.periodStart || '', periodEnd: h.periodEnd || '', totalAmount: h.totalAmountSnapshot || '', paidAmount: h.paidAmount || 0, status: h.status, notes: h.notes || '' });

        setIsLoading(true);
        try {
            const [headerLines, headerSettlements] = await Promise.all([
                query(KEYS.obligationLines, (l) => l.headerId === h.id),
                query(KEYS.cashSettlements, (s) => s.obligationHeaderId === h.id)
            ]);
            setLines(headerLines);
            setSettlements(headerSettlements);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSave() {
        const data = {
            type: 'WorkerPayroll', direction: 'Payable',
            entityType: 'Worker', entityId: form.workerId ? parseInt(form.workerId) : null,
            projectId: form.projectId ? parseInt(form.projectId) : null,
            periodStart: form.periodStart, periodEnd: form.periodEnd,
            totalAmountSnapshot: parseFloat(form.totalAmount) || 0,
            status: form.status, notes: form.notes,
        };
        setIsLoading(true);
        try {
            if (selectedId) { await update(KEYS.obligationHeaders, selectedId, data); }
            else { await create(KEYS.obligationHeaders, data); }
            handleClear();
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false); // Only set false on error, loadData sets it false on success
        }
    }

    async function handleDelete() {
        if (!selectedId || !confirm('Delete?')) return;
        setIsLoading(true);
        try {
            await remove(KEYS.obligationHeaders, selectedId);
            handleClear();
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    async function addSettlement() {
        if (!selectedId || !settlementAmt) return;
        setIsLoading(true);
        try {
            await create(KEYS.cashSettlements, {
                obligationHeaderId: selectedId, date: new Date().toISOString().split('T')[0],
                amount: parseFloat(settlementAmt) || 0, direction: 'Outgoing', method: 'Cash',
            });
            setSettlementAmt('');
            const updatedSettlements = await query(KEYS.cashSettlements, (s) => s.obligationHeaderId === selectedId);
            setSettlements(updatedSettlements);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    function handleClear() { setForm({ workerId: '', projectId: '', periodStart: '', periodEnd: '', totalAmount: '', paidAmount: '', status: 'Draft', notes: '' }); setSelectedId(null); setLines([]); setSettlements([]); }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const totalSettled = settlements.reduce((s, st) => s + (st.amount || 0), 0);

    const columns = [
        { key: 'entityId', label: 'Worker', render: (v) => workers.find((w) => w.id === v)?.fullName || '-' },
        { key: 'projectId', label: 'Project', render: (v) => projects.find((p) => p.id === v)?.name || '-' },
        { key: 'periodStart', label: 'From', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
        { key: 'periodEnd', label: 'To', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
        { key: 'totalAmountSnapshot', label: 'Amount', render: (v) => fmt(v) },
        {
            key: 'status', label: 'Status', render: (v) => (
                <span className={`badge ${v === 'Settled' ? 'badge-success' : v === 'Partial' ? 'badge-warning' : 'badge-default'}`}>{v}</span>
            )
        },
    ];

    return (
        <div className="crud-page finance-page">
            <div className="page-header">
                <h1>Worker Payroll</h1>
                <BounceButton disabled={isLoading} className="btn btn-primary" onClick={handleClear}><Plus size={18} /> New Payroll</BounceButton>
            </div>

            <div className="filter-bar" style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                <div className="filter-group">
                    <label>From</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="filter-group">
                    <label>To</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
            </div>

            <div className="finance-detail">
                <Card title="Payroll Records">
                    <DataTable columns={columns} data={filteredHeaders} selectedId={selectedId} onRowClick={selectHeader} emptyMessage="No payroll records" />
                </Card>

                <Card title={selectedId ? 'Edit Payroll' : 'New Payroll'} className="animate-slideIn">
                    <div className="form-group"><label>Worker</label>
                        <select value={form.workerId} onChange={(e) => setForm({ ...form, workerId: e.target.value })}>
                            <option value="">Select...</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.fullName}</option>)}
                        </select>
                    </div>
                    <div className="form-group"><label>Project</label>
                        <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                            <option value="">Select...</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group"><label>Period Start</label><input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} /></div>
                    <div className="form-group"><label>Period End</label><input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} /></div>
                    <div className="form-group"><label>Total Amount (LKR)</label><input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} /></div>
                    <div className="form-group"><label>Status</label>
                        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            <option>Draft</option><option>Approved</option><option>Partial</option><option>Settled</option>
                        </select>
                    </div>
                    <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

                    {selectedId && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Settlements ({fmt(totalSettled)} paid)</label>
                            <div className="settlement-list">
                                {settlements.map((s) => (
                                    <div className="settlement-item" key={s.id}>
                                        <span>{s.date ? new Date(s.date).toLocaleDateString() : '-'}</span>
                                        <strong>{fmt(s.amount)}</strong>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <input type="number" placeholder="Amount" value={settlementAmt} onChange={(e) => setSettlementAmt(e.target.value)} />
                                <BounceButton disabled={isLoading} className="btn btn-primary btn-sm" onClick={addSettlement}>Add</BounceButton>
                            </div>
                        </div>
                    )}

                    <div className="form-actions">
                        <BounceButton disabled={isLoading} className="btn btn-success" onClick={handleSave}>{selectedId ? 'Update' : 'Save'}</BounceButton>
                        {selectedId && <BounceButton disabled={isLoading} className="btn btn-danger" onClick={handleDelete}>Delete</BounceButton>}
                        <BounceButton disabled={isLoading} className="btn btn-secondary" onClick={handleClear}>Clear</BounceButton>
                    </div>
                </Card>
            </div>
        </div>
    );
}
