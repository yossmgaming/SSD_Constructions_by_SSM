import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { exportToPDF, exportToExcel, exportToWord, exportToCSV } from '../utils/exportUtils';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import ExportDropdown from '../components/ExportDropdown';
import { getAll, create, update, remove, query, KEYS } from '../data/db';
import './Finance.css';
import BounceButton from '../components/BounceButton';

export default function ProjectExpense() {
    const [headers, setHeaders] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [form, setForm] = useState({ projectId: '', description: '', totalAmount: '', status: 'Draft', notes: '' });
    const [settlements, setSettlements] = useState([]);
    const [settlementAmt, setSettlementAmt] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingExport, setIsLoadingExport] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        loadData();
    }, []);

    const handleExport = async (format) => {
        const exportData = headers.map(h => {
            const project = projects.find(p => p.id === h.projectId);
            return {
                Project: project?.name || '—',
                Description: h.description,
                Amount: h.totalAmountSnapshot,
                Status: h.status,
                Notes: h.notes || ''
            };
        });

        const columns = [
            { header: 'Project', key: 'Project' },
            { header: 'Description', key: 'Description' },
            { header: 'Total Amount (LKR)', key: 'Amount' },
            { header: 'Status', key: 'Status' },
            { header: 'Notes', key: 'Notes' }
        ];

        const title = 'Project Expenses Report';
        const fileName = 'Project_Expenses_List';

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
            const [allHeaders, allProjects] = await Promise.all([
                getAll(KEYS.obligationHeaders),
                getAll(KEYS.projects)
            ]);
            setHeaders(allHeaders.filter((h) => h.type === 'ProjectExpense'));
            setProjects(allProjects);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function selectHeader(h) {
        setSelectedId(h.id);
        setForm({ projectId: h.projectId || '', description: h.description || '', totalAmount: h.totalAmountSnapshot || '', status: h.status, notes: h.notes || '' });

        setIsLoading(true);
        try {
            setSettlements(await query(KEYS.cashSettlements, (s) => s.obligationHeaderId === h.id));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSave() {
        const data = {
            type: 'ProjectExpense', direction: 'Payable',
            entityType: 'Project', projectId: form.projectId ? parseInt(form.projectId) : null,
            description: form.description, totalAmountSnapshot: parseFloat(form.totalAmount) || 0,
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
            setIsLoading(false);
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
            await create(KEYS.cashSettlements, { obligationHeaderId: selectedId, date: new Date().toISOString().split('T')[0], amount: parseFloat(settlementAmt) || 0, direction: 'Outgoing', method: 'Cash' });
            setSettlementAmt('');
            setSettlements(await query(KEYS.cashSettlements, (s) => s.obligationHeaderId === selectedId));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    function handleClear() {
        setForm({ projectId: '', description: '', totalAmount: '', status: 'Draft', notes: '' });
        setSelectedId(null);
        setSettlements([]);
    }

    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const totalSettled = settlements.reduce((s, st) => s + (st.amount || 0), 0);

    const columns = [
        { key: 'projectId', label: 'Project', render: (v) => projects.find((p) => p.id === v)?.name || '-' },
        { key: 'description', label: 'Description' },
        { key: 'totalAmountSnapshot', label: 'Amount', render: (v) => fmt(v) },
        { key: 'status', label: 'Status', render: (v) => <span className={`badge ${v === 'Settled' ? 'badge-success' : v === 'Partial' ? 'badge-warning' : 'badge-default'}`}>{v}</span> },
    ];

    return (
        <div className="crud-page finance-page">
            <div className="page-header">
                <h1>Project Expenses</h1>
                <div className="page-header-actions" style={{ display: 'flex', gap: '12px' }}>
                    <ExportDropdown onExport={handleExport} isLoading={isLoadingExport} />
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={handleClear}><Plus size={18} /> New Expense</BounceButton>
                </div>
            </div>

            <div className="finance-detail">
                <Card title="Expense Records">
                    <DataTable columns={columns} data={headers} selectedId={selectedId} onRowClick={selectHeader} emptyMessage="No records" />
                </Card>
                <Card title={selectedId ? 'Edit Expense' : 'New Expense'} className="animate-slideIn">
                    <div className="form-group"><label>Project</label><select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">Select...</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div className="form-group"><label>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="form-group"><label>Total Amount (LKR)</label><input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} /></div>
                    <div className="form-group"><label>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Draft</option><option>Approved</option><option>Partial</option><option>Settled</option></select></div>
                    <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                    {selectedId && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Settlements ({fmt(totalSettled)} paid)</label>
                            <div className="settlement-list">{settlements.map((s) => <div className="settlement-item" key={s.id}><span>{new Date(s.date).toLocaleDateString()}</span><strong>{fmt(s.amount)}</strong></div>)}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><input type="number" placeholder="Amount" value={settlementAmt} onChange={(e) => setSettlementAmt(e.target.value)} /><BounceButton disabled={isLoading} className="btn btn-primary btn-sm" onClick={addSettlement}>Add</BounceButton></div>
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
