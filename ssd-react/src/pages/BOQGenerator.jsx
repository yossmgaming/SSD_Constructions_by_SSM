import { useState, useEffect } from 'react';
import { Plus, Trash2, FileDown, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { exportBOQData } from '../utils/exportUtils';
import Card from '../components/Card';
import ExportDropdown from '../components/ExportDropdown';
import { getAll, create, update, remove, query, KEYS } from '../data/db';
import './BOQGenerator.css';
import BounceButton from '../components/BounceButton';

const emptyHeader = { projectId: '', title: '', clientName: '', toAddress: '', notes: '', documentDate: '' };
const emptyItem = { itemNo: '', description: '', quantity: '', unit: '', rate: '' };

export default function BOQGenerator() {
    const [boqs, setBoqs] = useState([]);
    const [projects, setProjects] = useState([]);
    const [header, setHeader] = useState(emptyHeader);
    const [items, setItems] = useState([{ ...emptyItem }]);
    const [selectedId, setSelectedId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingExport, setIsLoadingExport] = useState(false);
    const { t } = useTranslation();

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            const [allBoqs, allProjects] = await Promise.all([
                getAll(KEYS.boqs),
                getAll(KEYS.projects)
            ]);
            setBoqs(allBoqs);
            setProjects(allProjects);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function selectBoq(boq) {
        setSelectedId(boq.id);
        setHeader({ projectId: boq.projectId || '', title: boq.title, clientName: boq.clientName || '', toAddress: boq.toAddress || '', notes: boq.notes || '', documentDate: boq.documentDate || '' });

        setIsLoading(true);
        try {
            const boqItems = await query(KEYS.boqItems, (i) => i.boqId === boq.id);
            setItems(boqItems.length > 0 ? boqItems.map(({ id, boqId, ...rest }) => rest) : [{ ...emptyItem }]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    function addItem() { setItems([...items, { ...emptyItem }]); }
    function removeItem(index) { setItems(items.filter((_, i) => i !== index)); }
    function updateItem(index, field, value) {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
    }

    async function handleSave() {
        if (!header.title.trim()) return alert('BOQ title is required');
        // Only send columns that exist in the boqs table — exclude clientName until the DB column is added
        const { clientName, ...headerForDb } = header;
        const boqData = { ...headerForDb, projectId: header.projectId ? parseInt(header.projectId) : null };
        let boqId;

        setIsLoading(true);
        try {
            if (selectedId) {
                await update(KEYS.boqs, selectedId, boqData);
                boqId = selectedId;
                // Remove old items
                const oldItems = await query(KEYS.boqItems, (i) => i.boqId === boqId);
                await Promise.all(oldItems.map((i) => remove(KEYS.boqItems, i.id)));
            } else {
                const created = await create(KEYS.boqs, boqData);
                boqId = created.id;
            }

            await Promise.all(items.map(async (item) => {
                if (item.description.trim()) {
                    await create(KEYS.boqItems, {
                        boqId, itemNo: item.itemNo, description: item.description,
                        quantity: parseFloat(item.quantity) || 0, unit: item.unit,
                        rate: parseFloat(item.rate) || 0, amount: (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0),
                    });
                }
            }));

            handleClear();
            await loadData();
        } catch (error) {
            console.error('BOQ save error:', error);
            alert('Failed to save BOQ. Please try again.');
            setIsLoading(false);
        }
    }

    async function handleDelete() {
        if (!selectedId) return;
        if (!confirm('Delete this BOQ?')) return;

        setIsLoading(true);
        try {
            const oldItems = await query(KEYS.boqItems, (i) => i.boqId === selectedId);
            await Promise.all(oldItems.map((i) => remove(KEYS.boqItems, i.id)));
            await remove(KEYS.boqs, selectedId);

            handleClear();
            await loadData();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    }

    function handleClear() { setHeader(emptyHeader); setItems([{ ...emptyItem }]); setSelectedId(null); }

    async function handleExport(format) {
        if (!selectedId && items.length <= 1 && !items[0].description) {
            return alert('Please save the BOQ or enter items to export.');
        }

        const project = projects.find(p => p.id === parseInt(header.projectId)) || { name: 'General' };
        const name = header.title || 'Untitled_BOQ';
        const fileName = `BOQ_${name.replace(/\s+/g, '_')}`;

        setIsLoadingExport(true);
        try {
            await exportBOQData({
                format,
                project: { ...project, client: header.clientName || project.client || '' },
                items: items.filter(i => i.description.trim()).map(i => ({
                    ...i,
                    qty: parseFloat(i.quantity) || 0,
                    amount: (parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0)
                })),
                fileName
            });
        } catch (e) {
            console.error("Export error:", e);
        } finally {
            setIsLoadingExport(false);
        }
    }

    const grandTotal = items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0), 0);
    const fmt = (v) => `LKR ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    return (
        <div className="crud-page boq-page">
            <div className="page-header">
                <h1>BOQ Generator</h1>
                <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
                    <ExportDropdown onExport={handleExport} isLoading={isLoadingExport} />
                    <BounceButton disabled={isLoading} className="btn btn-primary" onClick={handleClear}><Plus size={18} /> New BOQ</BounceButton>
                </div>
            </div>

            <div className="boq-layout">
                <Card title={selectedId ? 'Edit BOQ' : 'New BOQ'}>
                    <div className="boq-header-form">
                        <div className="form-group"><label>Title</label><input value={header.title} onChange={(e) => setHeader({ ...header, title: e.target.value })} /></div>
                        <div className="form-group"><label>Project</label>
                            <select value={header.projectId} onChange={(e) => {
                                const pid = e.target.value;
                                const proj = projects.find(p => p.id === parseInt(pid));
                                setHeader({ ...header, projectId: pid, clientName: proj ? proj.client : header.clientName });
                            }}>
                                <option value="">Select project...</option>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label>Client Name</label><input value={header.clientName || ''} onChange={(e) => setHeader({ ...header, clientName: e.target.value })} placeholder="Custom client name..." /></div>
                        <div className="form-group"><label>Document Date</label><input type="date" value={header.documentDate} onChange={(e) => setHeader({ ...header, documentDate: e.target.value })} /></div>
                        <div className="form-group"><label>To / Address</label><input value={header.toAddress} onChange={(e) => setHeader({ ...header, toAddress: e.target.value })} /></div>
                        <div className="form-group full-width"><label>Notes</label><textarea value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} rows={2} /></div>
                    </div>

                    <h3 style={{ marginBottom: 12 }}>Line Items</h3>
                    <table className="boq-items-table">
                        <thead>
                            <tr><th>No.</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th><th></th></tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr key={i}>
                                    <td><input value={item.itemNo} onChange={(e) => updateItem(i, 'itemNo', e.target.value)} style={{ width: 60 }} /></td>
                                    <td><input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} /></td>
                                    <td><input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} style={{ width: 80 }} /></td>
                                    <td><input value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} style={{ width: 80 }} /></td>
                                    <td><input type="number" value={item.rate} onChange={(e) => updateItem(i, 'rate', e.target.value)} style={{ width: 100 }} /></td>
                                    <td className="amount-cell">{fmt((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0))}</td>
                                    <td><BounceButton className="btn btn-ghost" onClick={() => removeItem(i)}><Trash2 size={16} /></BounceButton></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <BounceButton disabled={isLoading} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={addItem}><Plus size={14} /> Add Item</BounceButton>

                    <div className="boq-total-row">Grand Total: {fmt(grandTotal)}</div>

                    <div className="form-actions">
                        <BounceButton disabled={isLoading} className="btn btn-success" onClick={handleSave}>{selectedId ? 'Update' : 'Save'}</BounceButton>
                        {selectedId && <BounceButton disabled={isLoading} className="btn btn-danger" onClick={handleDelete}>Delete</BounceButton>}
                        <BounceButton disabled={isLoading} className="btn btn-secondary" onClick={handleClear}>Clear</BounceButton>
                    </div>
                </Card>

                <Card title="Saved BOQs">
                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {boqs.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No BOQs yet</div>
                        ) : (
                            boqs.map((b) => (
                                <div key={b.id} className={`boq-list-item ${selectedId === b.id ? 'active' : ''}`} onClick={() => selectBoq(b)}>
                                    <div className="boq-list-item-title">{b.title}</div>
                                    <div className="boq-list-item-date">{b.documentDate ? new Date(b.documentDate).toLocaleDateString() : 'No date'}</div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
