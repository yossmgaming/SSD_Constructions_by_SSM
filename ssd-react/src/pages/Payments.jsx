import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ArrowDownCircle, ArrowUpCircle, Zap, FileSpreadsheet, Download, ChevronDown, FileText, Box, Pencil } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToWord, exportToCSV } from '../utils/exportUtils';
import CountUp from '../components/CountUp';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { getAll, create, update, remove, queryEq, queryAdvanced, KEYS } from '../data/db';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';

import './Payments.css';
import BounceButton from '../components/BounceButton';
import ExportDropdown from '../components/ExportDropdown';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

const CATEGORIES = ['Client Payment', 'Worker Pay', 'Material Purchase', 'Project Expense', 'Advance', 'Other'];

const emptyForm = {
    direction: 'Out', category: 'Worker Pay', projectId: '', workerId: '', supplierId: '', materialId: '',
    amount: '', date: new Date().toISOString().split('T')[0], method: 'Cash', reference: '', notes: '',
};

export default function Payments() {
    const { t } = useTranslation();
    const { hasRole } = useAuth();

    const CATEGORY_MAP = {
        'Client Payment': t('payments.categories.client_payment'),
        'Worker Pay': t('payments.categories.worker_pay'),
        'Material Purchase': t('payments.categories.material_purchase'),
        'Project Expense': t('payments.categories.project_expense'),
        'Advance': t('payments.categories.advance'),
        'Other': t('payments.categories.other')
    };
    const [payments, setPayments] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [dirFilter, setDirFilter] = useState('All');
    const [catFilter, setCatFilter] = useState('All');
    const [projFilter, setProjFilter] = useState('All');
    const [workerFilter, setWorkerFilter] = useState('All');
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
    // We no longer fetch all attendances/advances globally - that was the bottleneck.

    const [advances, setAdvances] = useState([]); // Needed for summary and auto-settle
    const [isLoadingExport, setIsLoadingExport] = useState(false);
    const [selectedRowStats, setSelectedRowStats] = useState(null);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            // Fetch primary data
            const [wrks, sups, projs, mats] = await Promise.all([
                getAll(KEYS.workers),
                getAll(KEYS.suppliers),
                getAll(KEYS.projects),
                getAll(KEYS.materials)
            ]);
            setWorkers(wrks);
            setSuppliers(sups);
            setProjects(projs);
            setMaterials(mats);

            // Fetch filtered data (Payments & Advances) for the current view
            await refreshFilteredData();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function refreshFilteredData() {
        try {
            const filters = { range: { column: 'date', from: fromDate, to: toDate } };
            const [pays, advs] = await Promise.all([
                queryAdvanced(KEYS.payments, { filters, orderBy: { column: 'date', ascending: false } }),
                queryAdvanced(KEYS.advances, { filters })
            ]);
            setPayments(pays);
            setAdvances(advs);
        } catch (error) {
            console.error(error);
        }
    }

    const calculateEarnings = useCallback((atts, hr, rate, from, to) => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        let total = 0;
        let totalHours = 0;
        let totalDays = 0;
        const debugBreakdown = [];

        atts.forEach(a => {
            const dateStr = a.date ? a.date.substring(0, 10).trim() : '';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;

            // Date Cap: Ignore future records
            if (dateStr > todayStr) return;

            // Range Filter (Optional)
            if (from && dateStr < from) return;
            if (to && dateStr > to) return;

            let hours = 0;
            if (a.isPresent === true) {
                if (a.hoursWorked != null && a.hoursWorked !== '') hours = parseFloat(a.hoursWorked);
                else if (a.isHalfDay) hours = 4;
                else hours = 8;
            } else if (a.isPresent === false) {
                hours = 0;
            } else {
                // Fallback for legacy data (status-based)
                if (a.hours != null && a.hours !== '') hours = parseFloat(a.hours);
                else if (a.status === 'Present' || a.status === 'Full') hours = 8;
                else if (a.status === 'Half' || a.status === 'Half Day') hours = 4;
                else if (a.status === 'Absent') hours = 0;
            }

            if (hours > 0) {
                // Calculation matches calcWorkerSuggestion logic
                const dailyEarned = hours * (hr || (rate / 8));
                total += dailyEarned;
                totalHours += hours;
                totalDays += hours / 8;
                debugBreakdown.push({ date: dateStr, amount: dailyEarned });
            }
        });
        return { total, totalHours, totalDays, debugBreakdown };
    }, []);

    // ─── Smart Auto-fill ─────────────────────────────────────────
    async function calcWorkerSuggestion(workerId, projectId, salaryFrom, salaryTo) {
        if (!workerId) { setSuggestion(null); return; }
        const worker = workers.find((w) => w.id === parseInt(workerId));
        if (!worker) { setSuggestion(null); return; }

        setIsLoading(true); // Show local loading feedback
        try {
            // Optimization: Fetch only relevant worker data ON DEMAND
            const [workerAttendance, workerAdvances] = await Promise.all([
                queryEq(KEYS.attendances, 'workerId', parseInt(workerId)),
                queryEq(KEYS.advances, 'workerId', parseInt(workerId))
            ]);

            const rate = worker.dailyRate || 0;
            const hr = worker.hourlyRate ? parseFloat(worker.hourlyRate) : 0;
            const projectFilteredAtts = workerAttendance.filter(a => !projectId || a.projectId === parseInt(projectId));
            const { total: totalEarned, totalHours, totalDays } = calculateEarnings(projectFilteredAtts, hr, rate, salaryFrom, salaryTo);

            // Fetch ALL-TIME payments for this worker to calculate true balance
            const allWorkerPayments = await queryEq(KEYS.payments, 'workerId', parseInt(workerId));

            // Already paid for this worker (All-time, but project-filtered if project selected)
            const alreadyPaid = allWorkerPayments
                .filter((p) => {
                    if (p.direction !== 'Out' || p.category !== 'Worker Pay') return false;
                    if (projectId && p.projectId !== parseInt(projectId)) return false;
                    return true;
                })
                .reduce((s, p) => s + (p.amount || 0), 0);

            // For Period-specific payout, we can calculate periodPaid too
            const periodPaid = allWorkerPayments
                .filter((p) => {
                    if (p.direction !== 'Out' || p.category !== 'Worker Pay' || (projectId && p.projectId !== parseInt(projectId))) return false;
                    if (salaryFrom || salaryTo) {
                        const dateStr = p.date ? p.date.substring(0, 10) : '';
                        if (salaryFrom && dateStr < salaryFrom) return false;
                        if (salaryTo && dateStr > salaryTo) return false;
                    }
                    return true;
                })
                .reduce((s, p) => s + (p.amount || 0), 0);

            // Also fetch all-time earnings for this worker/project to show cumulative balance
            const attsQuery = projectId
                ? queryAdvanced(KEYS.attendances, { filters: { eq: { workerId: parseInt(workerId), projectId: parseInt(projectId) } } })
                : queryEq(KEYS.attendances, 'workerId', parseInt(workerId));

            const advsQuery = queryEq(KEYS.advances, 'workerId', parseInt(workerId));

            const [allAttsForWorker, allAdvsForWorker] = await Promise.all([attsQuery, advsQuery]);

            const { total: allTimeEarnings, debugBreakdown } = calculateEarnings(allAttsForWorker, hr, rate);
            const activeAdvs = allAdvsForWorker.filter((a) => a.status === 'Active');
            const activeAdvances = activeAdvs.reduce((s, a) => s + (a.amount || 0), 0);
            const oldestAdv = activeAdvs.sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
            const suggestedProjectId = oldestAdv?.projectId || null;

            // Cumulative outstanding
            const cumulativeOutstanding = allTimeEarnings - alreadyPaid - activeAdvances;
            // Period outstanding (if period set)
            const periodOutstanding = totalEarned - periodPaid;

            setSuggestion({
                type: 'worker',
                label: worker.fullName,
                rate,
                hourlyRate: hr,
                totalDays,
                totalHours,
                totalEarned,
                periodPaid,
                periodOutstanding,
                alreadyPaid,
                activeAdvances,
                suggestedProjectId,
                allTimeEarnings,
                debugBreakdown,
                outstanding: (salaryFrom || salaryTo) ? periodOutstanding : cumulativeOutstanding,
                cumulativeOutstanding
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function calcMaterialSuggestion(materialId) {
        if (!materialId) { setSuggestion(null); return; }
        const mat = materials.find((m) => m.id === parseInt(materialId));
        if (!mat) { setSuggestion(null); return; }

        const unitCost = mat.cost || 0;
        const totalValue = (mat.quantity || 0) * unitCost;

        // Already paid for this material (All-time)
        const allMatPayments = await queryEq(KEYS.payments, 'materialId', parseInt(materialId));
        const alreadyPaid = allMatPayments
            .filter((p) => p.category === 'Material Purchase')
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

    async function calcProjectSuggestion(projectId) {
        if (!projectId) { setSuggestion(null); return; }
        const proj = projects.find((p) => p.id === parseInt(projectId));
        if (!proj) { setSuggestion(null); return; }

        const contractValue = proj.contractValue || proj.budget || 0;

        const allProjPayments = await queryEq(KEYS.payments, 'projectId', parseInt(projectId));
        const totalReceived = allProjPayments
            .filter((p) => p.direction === 'In' && p.category === 'Client Payment')
            .reduce((s, p) => s + (p.amount || 0), 0);

        setSuggestion({
            type: 'project',
            label: proj.name,
            contractValue,
            totalReceived,
            outstanding: Math.max(0, contractValue - totalReceived),
        });
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

    function applySettlement(val, pId) {
        setForm((f) => ({
            ...f,
            direction: 'In',
            category: 'Advance',
            amount: String(Math.abs(val)),
            projectId: pId ? String(pId) : f.projectId
        }));
    }

    // ─── Summary cards ───────────────────────────────────────────
    const summary = useMemo(() => {
        const totalIn = payments.filter((p) => p.direction === 'In').reduce((s, p) => s + (p.amount || 0), 0);
        const paymentsOut = payments.filter((p) => p.direction === 'Out').reduce((s, p) => s + (p.amount || 0), 0);

        // Only count ACTIVE advances in the current outflow summary to avoid double-counting settled ones as debt
        // Actually, for a pure cash-flow summary, all advances that went out are "Out".
        // But the user seems to want a more "Remaining Debt" or "Net Exposure" view in some contexts.
        // However, we'll stick to pure cash flow for the main cards but ensure settlements are easy.

        const advancesOut = advances.reduce((s, a) => s + (a.amount || 0), 0);
        const totalOut = paymentsOut + advancesOut;
        return { totalIn, totalOut, net: totalIn - totalOut, count: payments.length + advances.length };
    }, [payments, advances]);

    // ─── Cumulative Entity Summary (All Time) ──────────────────────────
    const [entityStats, setEntityStats] = useState(null);
    useEffect(() => {
        const fetchAllTimeStats = async () => {
            if (projFilter === 'All' && workerFilter === 'All') {
                setEntityStats(null);
                return;
            }

            try {
                let allPays = [];
                let allAdvs = [];
                let allAtts = [];

                if (projFilter !== 'All' && workerFilter !== 'All') {
                    // Filtered by both: Payments/Attendance by project, but Advances GLOBAL for worker
                    const [p, a, att] = await Promise.all([
                        queryEq(KEYS.payments, 'projectId', parseInt(projFilter)),
                        queryEq(KEYS.advances, 'workerId', parseInt(workerFilter)),
                        queryEq(KEYS.attendances, 'projectId', parseInt(projFilter))
                    ]);
                    allPays = p.filter(x => x.workerId === parseInt(workerFilter));
                    allAdvs = a;
                    allAtts = att.filter(x => x.workerId === parseInt(workerFilter));
                } else if (projFilter !== 'All') {
                    const [p, a] = await Promise.all([
                        queryEq(KEYS.payments, 'projectId', parseInt(projFilter)),
                        queryEq(KEYS.advances, 'projectId', parseInt(projFilter))
                    ]);
                    allPays = p;
                    allAdvs = a;
                } else if (workerFilter !== 'All') {
                    const [p, a, att] = await Promise.all([
                        queryEq(KEYS.payments, 'workerId', parseInt(workerFilter)),
                        queryEq(KEYS.advances, 'workerId', parseInt(workerFilter)),
                        queryEq(KEYS.attendances, 'workerId', parseInt(workerFilter))
                    ]);
                    allPays = p;
                    allAdvs = a;
                    allAtts = att;
                }

                const totalPaid = allPays.filter(p => p.direction === 'Out').reduce((s, p) => s + (p.amount || 0), 0);
                const totalIn = allPays.filter(p => p.direction === 'In').reduce((s, p) => s + (p.amount || 0), 0);
                const activeAdvances = allAdvs.filter(a => a.status === 'Active').reduce((s, a) => s + (a.amount || 0), 0);

                let earnings = 0;
                if (workerFilter !== 'All') {
                    const w = workers.find(x => x.id === parseInt(workerFilter));
                    if (w) {
                        const { total: earned } = calculateEarnings(allAtts, w.hourlyRate, w.dailyRate);
                        earnings = earned;
                    }
                }

                setEntityStats({
                    totalPaid, totalIn, activeAdvances, earnings,
                    balance: earnings - totalPaid - activeAdvances,
                    projRemaining: projFilter !== 'All' ? (projects.find(p => p.id === parseInt(projFilter))?.contractValue || 0) - totalIn : 0
                });
            } catch (error) {
                console.error("Error fetching all-time stats:", error);
            }
        };

        fetchAllTimeStats();
    }, [projFilter, workerFilter, workers, projects]);

    // ✅ Calculation for Expansion Row (Selected Transaction Context)
    useEffect(() => {
        const fetchSelectedStats = async () => {
            if (!selectedId) {
                setSelectedRowStats(null);
                return;
            }

            const payment = payments.find(p => p.id === selectedId);
            if (!payment) return;

            try {
                if (payment.workerId) {
                    const wId = payment.workerId;
                    const [workerAttendance, workerAdvances, allWorkerPayments] = await Promise.all([
                        queryEq(KEYS.attendances, 'workerId', wId),
                        queryEq(KEYS.advances, 'workerId', wId),
                        queryEq(KEYS.payments, 'workerId', wId)
                    ]);

                    const worker = workers.find(w => w.id === wId);
                    const rate = worker?.dailyRate || 0;
                    const hr = worker?.hourlyRate || 0;

                    const { total: totalEarnings } = calculateEarnings(workerAttendance, hr, rate);

                    const alreadyPaid = allWorkerPayments
                        .filter(p => p.direction === 'Out' && p.category === 'Worker Pay')
                        .reduce((s, p) => s + (p.amount || 0), 0);

                    const activeAdvances = workerAdvances
                        .filter(a => a.status === 'Active')
                        .reduce((s, a) => s + (a.amount || 0), 0);

                    setSelectedRowStats({
                        type: 'worker',
                        earnings: totalEarnings,
                        paid: alreadyPaid,
                        advances: activeAdvances,
                        balance: totalEarnings - alreadyPaid - activeAdvances
                    });
                } else if (payment.materialId) {
                    const mId = payment.materialId;
                    const [mat, matPays] = await Promise.all([
                        materials.find(m => m.id === mId),
                        queryEq(KEYS.payments, 'materialId', mId)
                    ]);
                    const totalVal = (mat?.quantity || 0) * (mat?.cost || 0);
                    const paid = matPays.reduce((s, p) => s + (p.amount || 0), 0);
                    setSelectedRowStats({
                        type: 'material',
                        totalValue: totalVal,
                        paid,
                        outstanding: totalVal - paid
                    });
                } else {
                    setSelectedRowStats(null);
                }
            } catch (err) {
                console.error("Error fetching selected row stats:", err);
            }
        };

        fetchSelectedStats();
    }, [selectedId, payments, workers, materials]);


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
        const matchWrk = workerFilter === 'All' || p.workerId === parseInt(workerFilter);
        return matchSearch && matchDir && matchCat && matchProj && matchWrk;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    function selectPayment(p) {
        if (selectedId === p.id) {
            setSelectedId(null);
        } else {
            setSelectedId(p.id);
        }
    }

    function openEditModal(p) {
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

    const handleExport = async (format) => {
        const exportData = filtered.map(p => {
            const proj = projects.find(pr => pr.id === p.projectId);
            const worker = workers.find(w => w.id === p.workerId);
            const supplier = suppliers.find(s => s.id === p.supplierId);
            const material = materials.find(m => m.id === p.materialId);

            return {
                Date: p.date ? new Date(p.date).toLocaleDateString() : '',
                Type: p.direction === 'In' ? 'Money In' : 'Money Out',
                Category: p.category,
                Amount: p.amount,
                Project: proj?.name || 'General/Office',
                Entity: worker?.fullName || supplier?.name || material?.name || 'N/A',
                Method: p.method,
                Reference: p.reference || '—',
                Notes: p.notes || ''
            };
        });

        const columns = [
            { header: 'Date', key: 'Date' },
            { header: 'Type', key: 'Type' },
            { header: 'Category', key: 'Category' },
            { header: 'Amount (LKR)', key: 'Amount' },
            { header: 'Project', key: 'Project' },
            { header: 'Related Entity', key: 'Entity' },
            { header: 'Payment Method', key: 'Method' },
            { header: 'Reference', key: 'Reference' },
            { header: 'Notes', key: 'Notes' }
        ];

        const title = 'Company Payment Transactions Report';
        const fileName = `Payments_Report_${fromDate || 'All'}_to_${toDate || 'All'}`;

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
                const activeAdvances = await queryEq(KEYS.advances, 'workerId', data.workerId);
                const toSettle = activeAdvances
                    .filter(a => a.status === 'Active')
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                let remainingSettleAmount = data.amount;
                for (const adv of toSettle) {
                    if (remainingSettleAmount <= 0) break;
                    if (remainingSettleAmount >= adv.amount) {
                        await update(KEYS.advances, adv.id, {
                            status: 'Settled',
                            notes: (adv.notes || '') + `\n[${new Date().toLocaleDateString()}] Settled via Payment Settlement.`
                        });
                        remainingSettleAmount -= adv.amount;
                    } else {
                        await update(KEYS.advances, adv.id, {
                            amount: adv.amount - remainingSettleAmount,
                            notes: (adv.notes || '') + `\n[${new Date().toLocaleDateString()}] Partially settled ${fmt(remainingSettleAmount)}.`
                        });
                        remainingSettleAmount = 0;
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
        // Advances in Payment page are usually settlements (Money In)
        const dir = (cat === 'Client Payment' || cat === 'Advance') ? 'In' : 'Out';
        setForm((f) => ({ ...f, category: cat, direction: dir, workerId: '', supplierId: '', materialId: '', projectId: '' }));
        setSuggestion(null);
    }

    const columns = [
        { key: 'date', label: t('common.date'), render: (v) => new Date(v).toLocaleDateString() },
        {
            key: 'direction', label: t('common.type'), render: (v) => (
                v === 'In' ? <span className="badge badge-success"><ArrowDownCircle size={14} /> {t('payments.money_in')}</span> : <span className="badge badge-warning"><ArrowUpCircle size={14} /> {t('payments.money_out')}</span>
            )
        },
        { key: 'category', label: t('common.category'), render: (v) => CATEGORY_MAP[v] || v },
        {
            key: 'description', label: t('common.description'), render: (_, r) => {
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
        { key: 'amount', label: t('common.amount'), render: (v) => fmt(v) },
        {
            key: 'actions', label: '', render: (_, row) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <BounceButton
                        className="icon-btn edit-btn"
                        title="Edit Payment"
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                    >
                        <Pencil size={14} />
                    </BounceButton>
                </div>
            )
        }
    ];

    function renderPaymentExpansion(payment) {
        return (
            <div className="payment-expansion-grid">
                <div className="expansion-col">
                    <h4>{t('common.details')} & {t('common.notes')}</h4>
                    <div className="details-mini-grid">
                        <div className="detail-item">
                            <label>{t('common.method')}</label>
                            <span>{payment.method}</span>
                        </div>
                        <div className="detail-item">
                            <label>{t('common.reference')} #</label>
                            <span>{payment.reference || '—'}</span>
                        </div>
                        <div className="detail-item">
                            <label>{t('common.notes')}</label>
                            <span className="notes-text">{payment.notes || 'No notes available.'}</span>
                        </div>
                    </div>
                </div>
                <div className="expansion-col">
                    <h4>{t('payments.smart_fill')} {t('common.context')}</h4>
                    {selectedRowStats ? (
                        <div className="stats-mini-card">
                            {selectedRowStats.type === 'worker' && (
                                <div className="stats-grid-inline">
                                    <div className="stat-row"><span>Earnings:</span> <strong>{fmt(selectedRowStats.earnings)}</strong></div>
                                    <div className="stat-row"><span>Total Paid:</span> <strong className="text-muted">{fmt(selectedRowStats.paid)}</strong></div>
                                    <div className="stat-row"><span>Advances:</span> <strong className="text-red">-{fmt(selectedRowStats.advances)}</strong></div>
                                    <div className="stat-row total"><span>Remaining:</span> <strong className={selectedRowStats.balance >= 0 ? 'text-green' : 'text-red'}>{fmt(selectedRowStats.balance)}</strong></div>
                                </div>
                            )}
                            {selectedRowStats.type === 'material' && (
                                <div className="stats-grid-inline">
                                    <div className="stat-row"><span>Total Value:</span> <strong>{fmt(selectedRowStats.totalValue)}</strong></div>
                                    <div className="stat-row"><span>Already Paid:</span> <strong className="text-muted">{fmt(selectedRowStats.paid)}</strong></div>
                                    <div className="stat-row total"><span>Outstanding:</span> <strong className="text-red">{fmt(selectedRowStats.outstanding)}</strong></div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-data-small">No additional entity context for this category.</div>
                    )}
                    <div className="expansion-actions">
                        <BounceButton className="btn btn-secondary btn-sm" onClick={() => openEditModal(payment)}>
                            <Pencil size={14} /> {t('payments.edit_payment')}
                        </BounceButton>
                    </div>
                </div>
            </div>
        );
    }

    function renderSuggestion() {
        if (!suggestion) return null;

        if (suggestion.type === 'worker') {
            return (
                <div className="smart-suggestion">
                    <div className="smart-header"><Zap size={14} /> {t('payments.smart_fill')} — {suggestion.label}</div>
                    <div className="smart-grid">
                        {form.salaryFrom && form.salaryTo && (
                            <div style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: '#6366f1', marginBottom: '4px' }}>
                                {t('common.date')}: {new Date(form.salaryFrom).toLocaleDateString()} — {new Date(form.salaryTo).toLocaleDateString()}
                            </div>
                        )}
                        {suggestion.hourlyRate > 0 ? (
                            <>
                                <span>Hourly Rate:</span><strong>{fmt(suggestion.hourlyRate)}</strong>
                                <span>Total Hours:</span><strong>{suggestion.totalHours}</strong>
                            </>
                        ) : (
                            <>
                                <span>Daily Rate:</span><strong>{fmt(suggestion.rate)}</strong>
                                <span>Total Days:</span><strong>{suggestion.totalDays}</strong>
                            </>
                        )}
                        <span>Period Earned:</span><strong>{fmt(suggestion.totalEarned)}</strong>
                        <span>Period Paid:</span><strong className="text-muted">{fmt(suggestion.periodPaid)}</strong>
                        <span>Active Advances:</span><strong className="text-red">-{fmt(suggestion.activeAdvances)}</strong>
                        <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(99, 102, 241, 0.2)', margin: '8px 0' }} />
                        <span style={{ fontWeight: 700 }}>Total Balance:</span><strong className={suggestion.cumulativeOutstanding >= 0 ? 'text-green' : 'text-red'}>{fmt(suggestion.cumulativeOutstanding)}</strong>

                        {suggestion.debugBreakdown && suggestion.debugBreakdown.length > 0 && (
                            <div style={{ gridColumn: '1 / -1', marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', maxHeight: '100px', overflowY: 'auto', fontSize: '0.7rem' }}>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Earnings Trace (Project/Filtered):</div>
                                {suggestion.debugBreakdown.map((b, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                                        <span>{b.date}</span>
                                        <span>{fmt(b.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {suggestion.periodOutstanding > 0 && (
                        <BounceButton className="btn btn-smart" onClick={() => setForm({ ...form, amount: suggestion.periodOutstanding })}>
                            <Plus size={14} /> Pay Period Outstanding ({fmt(suggestion.periodOutstanding)})
                        </BounceButton>
                    )}
                    {suggestion.cumulativeOutstanding > 0 && (
                        <BounceButton className="btn btn-smart-alt" onClick={() => setForm({ ...form, amount: suggestion.cumulativeOutstanding })}>
                            <Plus size={14} /> Pay Total Balance ({fmt(suggestion.cumulativeOutstanding)})
                        </BounceButton>
                    )}
                    {suggestion.activeAdvances > 0 && (
                        <BounceButton className="btn btn-smart" onClick={() => applySettlement(suggestion.activeAdvances, suggestion.suggestedProjectId)}>
                            <Zap size={14} /> Settle Active Advances ({fmt(suggestion.activeAdvances)})
                        </BounceButton>
                    )}
                </div>
            );
        }

        if (suggestion.type === 'material') {
            return (
                <div className="smart-suggestion">
                    <div className="smart-header"><Box size={14} /> {t('payments.smart_fill')} — {suggestion.label}</div>
                    <div className="smart-grid">
                        <span>Unit Cost:</span><strong>{fmt(suggestion.unitCost)}</strong>
                        <span>Stock Qty:</span><strong>{suggestion.quantity} {suggestion.unit}</strong>
                        <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(99, 102, 241, 0.2)', margin: '8px 0' }} />
                        <span>Total value:</span><strong>{fmt(suggestion.totalValue)}</strong>
                        <span>Paid:</span><strong className="text-muted">{fmt(suggestion.alreadyPaid)}</strong>
                        <span style={{ fontWeight: 700 }}>{t('payments.outstanding')}:</span><strong className="text-red">{fmt(suggestion.outstanding)}</strong>
                    </div>
                    {suggestion.outstanding > 0 && (
                        <BounceButton className="btn btn-smart" onClick={() => setForm({ ...form, amount: suggestion.outstanding })}>
                            <Plus size={14} /> {t('payments.pay_outstanding')}
                        </BounceButton>
                    )}
                </div>
            );
        }

        if (suggestion.type === 'project') {
            return (
                <div className="smart-suggestion">
                    <div className="smart-header"><FileText size={14} /> {t('payments.smart_fill')} — {suggestion.label}</div>
                    <div className="smart-grid">
                        <span>Contract Val:</span><strong>{fmt(suggestion.contractValue)}</strong>
                        <span>Collected:</span><strong className="text-green">{fmt(suggestion.totalReceived)}</strong>
                        <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(99, 102, 241, 0.2)', margin: '8px 0' }} />
                        <span style={{ fontWeight: 700 }}>Remainder:</span><strong className="text-red">{fmt(suggestion.outstanding)}</strong>
                    </div>
                    {suggestion.outstanding > 0 && (
                        <BounceButton className="btn btn-smart" onClick={() => setForm({ ...form, amount: suggestion.outstanding })}>
                            <Plus size={14} /> Fill Remaining Balance
                        </BounceButton>
                    )}
                </div>
            );
        }

        return null;
    }

    if (!hasRole(['Super Admin', 'Finance'])) {
        return (
            <div className="crud-page payments-page flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <Card>
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                        <Shield size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
                        <h2 style={{ color: 'var(--text-color)', marginBottom: 8 }}>Access Denied</h2>
                        <p>This module contains sensitive financial data restricted to Finance and Super Admin roles.</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <GlobalLoadingOverlay loading={isLoading} message="Synchronizing Payment Records...">
            <div className="crud-page payments-page">
                <div className="page-header">
                    <h1>{t('payments.title')}</h1>
                    <div className="page-header-actions" style={{ display: 'flex', gap: '12px' }}>
                        <ExportDropdown onExport={handleExport} isLoading={isLoadingExport} />
                        <BounceButton disabled={isLoading} className="btn btn-primary" onClick={() => { handleClear(); setIsModalOpen(true); }}>
                            <Plus size={18} /> {t('payments.new_payment')}
                        </BounceButton>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="payment-summary">
                    <div className="pay-card pay-in">
                        <div className="pay-card-label"><ArrowDownCircle size={14} /> {t('payments.money_in')}</div>
                        <div className="pay-card-value"><span className="currency-prefix">LKR</span> <CountUp to={summary.totalIn} separator="," /></div>
                    </div>
                    <div className="pay-card pay-out">
                        <div className="pay-card-label"><ArrowUpCircle size={14} /> {t('payments.money_out')}</div>
                        <div className="pay-card-value"><span className="currency-prefix">LKR</span> <CountUp to={summary.totalOut} separator="," /></div>
                    </div>
                    <div className={`pay-card ${summary.net >= 0 ? 'pay-profit' : 'pay-loss'}`}>
                        <div className="pay-card-label"><Zap size={14} /> {t('payments.net_cash_flow')}</div>
                        <div className="pay-card-value"><span className="currency-prefix">LKR</span> <CountUp to={summary.net} separator="," /></div>
                    </div>
                    <div className="pay-card pay-count">
                        <div className="pay-card-label">{t('payments.total_transactions')}</div>
                        <div className="pay-card-value"><CountUp to={summary.count} /></div>
                    </div>
                </div>

                {/* Entity Context Card */}
                {entityStats && (
                    <div className="entity-summary-banner">
                        <div className="entity-stat">
                            <span className="entity-stat-label">Earnings (All-time)</span>
                            <span className="entity-stat-value">{fmt(entityStats.earnings)}</span>
                        </div>
                        <div className="entity-stat">
                            <span className="entity-stat-label">Total Paid (All-time)</span>
                            <span className="entity-stat-value">{fmt(entityStats.totalPaid)}</span>
                        </div>
                        <div className="entity-stat">
                            <span className="entity-stat-label">Active Advances</span>
                            <span className="entity-stat-value text-red">{fmt(entityStats.activeAdvances)}</span>
                        </div>
                        <div className="entity-stat highlight">
                            <span className="entity-stat-label">Remaining Balance</span>
                            <span className={`entity-stat-value ${entityStats.balance >= 0 ? 'text-green' : 'text-red'}`}>{fmt(entityStats.balance)}</span>
                        </div>
                        {projFilter !== 'All' && (
                            <div className="entity-stat secondary">
                                <span className="entity-stat-label">Proj. Remainder</span>
                                <span className="entity-stat-value">{fmt(entityStats.projRemaining)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Filters */}
                <div className="filter-bar">
                    <div className="filter-group" style={{ flex: 2 }}>
                        <label>{t('common.search')}</label>
                        <input placeholder={t('common.search') + "..."} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>

                    {/* Date Range Filters */}
                    <div className="filter-group">
                        <label>{t('common.date')} (From)</label>
                        <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); }} onBlur={refreshFilteredData} />
                    </div>
                    <div className="filter-group">
                        <label>{t('common.date')} (To)</label>
                        <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); }} onBlur={refreshFilteredData} />
                    </div>
                    <div className="filter-group">
                        <label>{t('common.type')}</label>
                        <select value={dirFilter} onChange={(e) => setDirFilter(e.target.value)}>
                            <option value="All">{t('common.all')}</option>
                            <option value="In">{t('payments.money_in')}</option>
                            <option value="Out">{t('payments.money_out')}</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>{t('common.category')}</label>
                        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                            <option value="All">{t('common.all')}</option>
                            {Object.entries(CATEGORY_MAP).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>{t('common.project')}</label>
                        <select value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
                            <option value="All">{t('common.all')}</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>{t('nav.workers')}</label>
                        <select value={workerFilter} onChange={(e) => setWorkerFilter(e.target.value)}>
                            <option value="All">{t('common.all')}</option>
                            {workers.map((w) => <option key={w.id} value={w.id}>{w.fullName}</option>)}
                        </select>
                    </div>
                </div>

                <div className="result-count">
                    Showing <strong>{filtered.length}</strong> of <strong>{payments.length}</strong> transaction{payments.length !== 1 ? 's' : ''}
                    {(search || dirFilter !== 'All' || catFilter !== 'All' || projFilter !== 'All' || workerFilter !== 'All') && <span className="filter-active-tag">Filtered</span>}
                </div>

                <div className="payments-table-container">
                    <Card title={t('payments.all_transactions')}>
                        <DataTable
                            columns={columns}
                            data={filtered}
                            selectedId={selectedId}
                            onRowClick={selectPayment}
                            emptyMessage={t('dashboard.no_transactions')}
                            renderExpansion={renderPaymentExpansion}
                        />
                    </Card>

                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => { setIsModalOpen(false); handleClear(); }}
                        title={selectedId ? t('payments.edit_payment') : t('payments.new_payment')}
                        onSave={handleSave}
                        onDelete={selectedId ? handleDelete : undefined}
                    >
                        {/* Direction toggle */}
                        <div className="direction-toggle">
                            <BounceButton className={`dir-btn ${form.direction === 'In' ? 'active-in' : ''}`}
                                onClick={() => setForm({ ...form, direction: 'In' })}>
                                <ArrowDownCircle size={16} /> {t('payments.money_in')}
                            </BounceButton>
                            <BounceButton className={`dir-btn ${form.direction === 'Out' ? 'active-out' : ''}`}
                                onClick={() => setForm({ ...form, direction: 'Out' })}>
                                <ArrowUpCircle size={16} /> {t('payments.money_out')}
                            </BounceButton>
                        </div>

                        <div className="form-group">
                            <label>{t('common.category')}</label>
                            <select value={form.category} onChange={(e) => onCategoryChange(e.target.value)}>
                                {Object.entries(CATEGORY_MAP).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>{t('common.project')} *</label>
                            <select value={form.projectId} onChange={(e) => onProjectChange(e.target.value)}>
                                <option value="">— {t('common.project')} —</option>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name} {p.status !== 'Ongoing' ? `[${p.status}]` : ''}</option>)}
                            </select>
                        </div>

                        {/* Contextual: Worker dropdown for Worker Pay / Advance */}
                        {(form.category === 'Worker Pay' || form.category === 'Advance') && (
                            <>
                                <div className="form-group">
                                    <label>{t('nav.workers')}</label>
                                    <select value={form.workerId} onChange={(e) => onWorkerChange(e.target.value)}>
                                        <option value="">— {t('nav.workers')} —</option>
                                        {workers.map((w) => <option key={w.id} value={w.id}>{w.fullName} ({w.role}) — {fmt(w.dailyRate)}/day</option>)}
                                    </select>
                                </div>

                                {/* Custom Salary Range (Auto-appears) */}
                                {form.category === 'Worker Pay' && form.workerId && (
                                    <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('projects.start_date')}</label>
                                            <input
                                                type="date"
                                                value={form.salaryFrom || ''}
                                                onChange={(e) => setForm(f => ({ ...f, salaryFrom: e.target.value }))}
                                                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('projects.end_date')}</label>
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
                                    <label>{t('nav.suppliers')}</label>
                                    <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                                        <option value="">— {t('nav.suppliers')} —</option>
                                        {suppliers.filter((s) => s.isActive !== false).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t('nav.materials')}</label>
                                    <select value={form.materialId} onChange={(e) => onMaterialChange(e.target.value)}>
                                        <option value="">— {t('nav.materials')} —</option>
                                        {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.category}) — {fmt(m.cost)}/{m.unit}</option>)}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* ⚡ Smart Suggestion Card */}
                        {renderSuggestion()}

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('common.amount')} (LKR) {form.amount && <span className="rate-preview">{fmt(form.amount)}</span>}</label>
                                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>{t('common.date')}</label>
                                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('common.method')}</label>
                                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                                    <option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Online</option><option>Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t('common.reference')} #</label>
                                <input placeholder="..." value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('common.notes')}</label>
                            <textarea placeholder="..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </div>
                    </Modal>
                </div>
            </div>
        </GlobalLoadingOverlay>
    );
}
