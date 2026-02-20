import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import CountUp from '../components/CountUp';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { getAll, create, update, remove, KEYS } from '../data/db';
import './Finance.css';
import BounceButton from '../components/BounceButton';

export default function Advances() {
    const [advances, setAdvances] = useState([]);
    const [projects, setProjects] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [form, setForm] = useState({ workerId: '', projectId: '', amount: '', date: '', status: 'Active', notes: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            const [advs, projs, wrks] = await Promise.all([
                getAll(KEYS.advances),
                getAll(KEYS.projects),
                getAll(KEYS.workers)
            ]);
            setAdvances(advs);
            setProjects(projs);
            setWorkers(wrks);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    function selectAdvance(a) {
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

    function handleClear() { setForm({ workerId: '', projectId: '', amount: '', date: '', status: 'Active', notes: '' }); setSelectedId(null); }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} `;

    const totalActive = advances.filter((a) => a.status === 'Active').reduce((s, a) => s + (a.amount || 0), 0);
    const totalSettled = advances.filter((a) => a.status === 'Settled').reduce((s, a) => s + (a.amount || 0), 0);

    const columns = [
        { key: 'workerId', label: 'Worker', render: (v) => workers.find((w) => w.id === v)?.fullName || '-' },
        { key: 'projectId', label: 'Project', render: (v) => projects.find((p) => p.id === v)?.name || '-' },
        { key: 'amount', label: 'Amount', render: (v) => fmt(v) },
        { key: 'date', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
        { key: 'status', label: 'Status', render: (v) => <span className={`badge ${v === 'Active' ? 'badge-info' : v === 'Settled' ? 'badge-success' : 'badge-default'} `}>{v}</span> },
    ];

    return (
        <div className="crud-page finance-page">
            <div className="page-header"><h1>Advances</h1><BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}><Plus size={18} /> New Advance</BounceButton></div>

            <div className="finance-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <Card className="report-summary-card">
                    <div className="card-label">Active Advances</div>
                    <div className="card-value" style={{ color: '#f59e0b' }}><span className="currency-prefix">LKR</span> <CountUp to={totalActive} separator="," /></div>
                </Card>
                <Card className="report-summary-card">
                    <div className="card-label">Settled Advances</div>
                    <div className="card-value" style={{ color: '#10b981' }}><span className="currency-prefix">LKR</span> <CountUp to={totalSettled} separator="," /></div>
                </Card>
            </div>

            <div className="finance-detail" style={{ gridTemplateColumns: '1fr' }}>
                <Card title="Advance Records"><DataTable columns={columns} data={advances} selectedId={selectedId} onRowClick={selectAdvance} emptyMessage="No advances" /></Card>
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); handleClear(); }}
                    title={selectedId ? 'Edit Advance' : 'New Advance'}
                    onSave={handleSave}
                    onDelete={selectedId ? handleDelete : undefined}
                >
                    <div className="form-group"><label>Worker</label><select value={form.workerId} onChange={(e) => setForm({ ...form, workerId: e.target.value })}><option value="">Select...</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.fullName}</option>)}</select></div>
                    <div className="form-group"><label>Project</label><select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">Select...</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div className="form-group"><label>Amount (LKR)</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                    <div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                    <div className="form-group"><label>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Settled</option><option>Cancelled</option></select></div>
                    <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                </Modal>
            </div>
        </div>
    );
}
