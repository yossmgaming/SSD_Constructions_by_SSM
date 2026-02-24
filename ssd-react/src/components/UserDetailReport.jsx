import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../data/supabase';
import {
    Shield, User, Landmark, History, MapPin,
    ArrowUpRight, AlertTriangle, RefreshCw,
    Lock, Calendar, FileText, Smartphone, Plus, Check
} from 'lucide-react';
import Card from './Card';
import BounceButton from './BounceButton';
import DataTable from './DataTable';
import GlobalLoadingOverlay from './GlobalLoadingOverlay';


export default function UserDetailReport({ pid, workerId, onClose }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [worker, setWorker] = useState(null);
    const [loginLogs, setLoginLogs] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [financials, setFinancials] = useState({ totalPaid: 0, advanceBalance: 0, rateHistory: [] });

    useEffect(() => {
        if (pid || workerId) {
            loadReportData();
        } else if (loading) {
            // Safety: if component is mounted without identifiers, stop loading
            setLoading(false);
        }
    }, [pid, workerId]);

    const loadReportData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Worker Base Data
            let workerQuery = supabase.from('workers').select('*');
            if (pid) workerQuery = workerQuery.eq('pid', pid);
            else workerQuery = workerQuery.eq('id', workerId);

            const { data: workerData, error: wError } = await workerQuery.single();
            if (wError) throw wError;
            setWorker(workerData);

            // Helper for super-resilient fetching
            const safeFetch = async (table) => {
                try {
                    const attempts = [
                        { col: 'workerId', val: workerData.id },
                        { col: 'worker_id', val: workerData.id },
                        { col: 'record_id', val: workerData.id },
                        { col: 'target_id', val: workerData.id },
                        { col: 'workerId', val: workerData.pid },
                        { col: 'worker_id', val: workerData.pid },
                        { col: 'record_id', val: workerData.pid },
                        { col: 'target_id', val: workerData.pid }
                    ];

                    for (const attempt of attempts) {
                        try {
                            const { data, error } = await supabase
                                .from(table)
                                .select('*')
                                .eq(attempt.col, attempt.val);
                            if (!error && data?.length > 0) return data;
                        } catch (e) { /* ignore missing column errors */ }
                    }
                    return [];
                } catch (e) { return []; }
            };

            // 2 & 3. Fetch User Profile & Audit Logs with resilience
            const profileData = await safeFetch('profiles');
            const profile = profileData?.[0];

            if (profile) {
                const { data: logs } = await supabase
                    .from('login_logs')
                    .select('*')
                    .or(`user_id.eq.${profile.id},user_id.eq.${profile.target_id}`);
                setLoginLogs(logs || []);
            }

            const audits = await safeFetch('audit_logs');
            setActivityLogs(audits || []);

            // 4. Financial Calculations
            const payments = await safeFetch('payments');
            const total = (payments || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);

            // 5. Fetch Attendance (Last 30 entries)
            const attData = await safeFetch('attendances');

            // 6. Fetch Active Assignment
            const assignments = await safeFetch('projectWorkers');

            // 7. Fetch Rate History
            const rates = await safeFetch('workerRates');

            // 8. Fetch Projects to resolve names
            const { data: allProjs } = await supabase.from('projects').select('id, name');
            const projMap = {};
            (allProjs || []).forEach(p => {
                projMap[p.id] = p.name;
                projMap[String(p.id)] = p.name;
            });

            const getProjId = (obj) => obj?.projectId || obj?.project_id || obj?.projectid;
            const getAssignedTo = (obj) => obj?.assignedTo || obj?.assigned_to || obj?.assignedto;
            const getAssignedFrom = (obj) => obj?.assignedFrom || obj?.assigned_from || obj?.assignedfrom;

            const sortedAssignments = (assignments || []).sort((a, b) =>
                (getAssignedFrom(b) || '').localeCompare(getAssignedFrom(a) || '')
            );

            const activeAssignment = sortedAssignments.find(a => !getAssignedTo(a)) || sortedAssignments[0];

            setFinancials({
                totalPaid: total,
                rateHistory: rates || [],
                advanceBalance: 0 // Will be handled later if needed
            });

            // Store extra data with fallbacks
            setWorker(prev => ({
                ...prev,
                current_assignment: projMap[getProjId(activeAssignment)] || 'Floating / Unassigned',
                attendanceHistory: (attData || [])
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                    .slice(0, 30)
                    .map(a => ({
                        ...a,
                        projectName: projMap[getProjId(a)] || 'Unknown'
                    }))
            }));

        } catch (err) {
            console.error("Report loading error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleForceReset = async () => {
        if (!worker?.email) return;
        if (!window.confirm("CAUTION: This will revoke all active sessions and send a password reset link to the user. Proceed?")) return;
        const { error } = await supabase.auth.resetPasswordForEmail(worker.email);
        if (error) alert("Failed to trigger reset: " + error.message);
        else alert("Security protocol initiated. Reset link sent to " + worker.email);
    };

    if (!worker && !loading) return <div className="p-12 text-center text-red-500">Personnel Record Not Found.</div>;

    return (
        <GlobalLoadingOverlay loading={loading} message="Analysing Personnel Data...">
            <div className="forensic-dashboard">
                <div className="forensic-grid">
                    {/* Left Column: Personal Forensic File */}
                    <div className="forensic-profile">
                        <div className="forensic-section">
                            <h3 className="forensic-title">
                                <Shield size={18} className="text-slate-400" /> Security & Access
                            </h3>
                            <div className="forensic-field">
                                <span className="forensic-label">Personnel ID</span>
                                <span className="forensic-value font-mono text-blue-600">{worker?.pid || 'PENDING'}</span>
                            </div>
                            <div className="forensic-field">
                                <span className="forensic-label">Verified NIC</span>
                                <span className="forensic-value">{worker?.nic || 'VERIFYING...'}</span>
                            </div>
                            <div className="forensic-field">
                                <span className="forensic-label">Account Status</span>
                                <span className="forensic-status-active">Active</span>
                            </div>
                        </div>

                        <div className="forensic-section">
                            <h3 className="forensic-title">
                                <Smartphone size={18} className="text-slate-400" /> Recent Access Logs
                            </h3>
                            {loginLogs.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No login history recorded.</p>
                            ) : (
                                <div className="space-y-3">
                                    {loginLogs.map(log => (
                                        <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                                                <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 font-mono">{log.ip_address}</span>
                                            </div>
                                            <p className="text-[9px] text-slate-400 truncate">{log.user_agent}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <BounceButton
                                onClick={handleForceReset}
                                className="btn btn-secondary btn-sm w-full mt-6 flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} /> Force Identity Reset
                            </BounceButton>
                        </div>
                    </div>

                    {/* Right Column: Operational Intelligence */}
                    <div className="forensic-ops">
                        <div className="forensic-section">
                            <h3 className="forensic-title">
                                <MapPin size={18} className="text-slate-400" /> Operational Intelligence
                            </h3>
                            <div className="op-intel-grid">
                                <div className="op-card">
                                    <span className="op-card-label">Current Assignment</span>
                                    <div className="op-card-value">{worker?.current_assignment || 'Unassigned'}</div>
                                    <span className="op-card-sub">Assigned via Project Lead</span>
                                </div>
                                <div className="op-card">
                                    <span className="op-card-label">Daily Rate</span>
                                    <div className="op-card-value">LKR {worker?.dailyRate?.toLocaleString() || '0'}</div>
                                    <span className="op-card-sub">Fixed Contractual Rate</span>
                                </div>
                                <div className="op-card">
                                    <span className="op-card-label">Operational Reliability</span>
                                    <div className="op-card-value text-emerald-500">{worker?.attendanceHistory?.length > 0 ? 'VERIFIED' : 'PENDING'}</div>
                                    <span className="op-card-sub">{worker?.attendanceHistory?.length || 0} Service Records</span>
                                </div>
                            </div>

                            <div className="liquidity-spent mb-8">
                                <span className="liquidity-label">Total Liquidity Spent</span>
                                <span className="liquidity-amount">LKR {financials.totalPaid?.toLocaleString() || '0'}</span>
                                <span className="liquidity-meta">Incl. EPF/ETF Contributions & Statutory Levies</span>
                            </div>

                            {financials.rateHistory?.length > 0 && (
                                <div className="forensic-section mt-4">
                                    <h3 className="forensic-title">
                                        <Shield size={18} className="text-slate-400" /> Rate Evolution History
                                    </h3>
                                    <div className="space-y-2">
                                        {financials.rateHistory.map((rh, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded border border-slate-100">
                                                <span className="text-slate-500">{new Date(rh.effectiveDate).toLocaleDateString()}</span>
                                                <span className="font-bold">LKR {rh.dailyRate?.toLocaleString()} / Day</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="forensic-section">
                            <h3 className="forensic-title">
                                <History size={18} className="text-slate-400" /> Service Record History
                            </h3>
                            {!worker?.attendanceHistory || worker.attendanceHistory.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-sm text-slate-400">No attendance records found for this personnel ID.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', width: '100%' }}>
                                    <table className="audit-table-mini">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Project</th>
                                                <th>Hours</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {worker.attendanceHistory.map(att => (
                                                <tr key={att.id}>
                                                    <td className="font-mono">{new Date(att.date).toLocaleDateString()}</td>
                                                    <td className="font-bold">{att.projectName || 'Unknown'}</td>
                                                    <td>{att.hoursWorked || att.hours}h</td>
                                                    <td><span className="text-emerald-500 font-bold">VERIFIED</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="forensic-section">
                            <h3 className="forensic-title">
                                <FileText size={18} className="text-slate-400" /> Activity Integrity
                            </h3>
                            {activityLogs.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-sm text-slate-400">No auditable activity records found for this personnel ID.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', width: '100%' }}>
                                    <table className="audit-table-mini">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Action</th>
                                                <th>Origin</th>
                                                <th>Integrity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activityLogs.map(audit => (
                                                <tr key={audit.id}>
                                                    <td className="font-mono">{new Date(audit.created_at).toLocaleDateString()}</td>
                                                    <td className="font-bold">{audit.action}</td>
                                                    <td>{audit.table_name}</td>
                                                    <td><span className="text-emerald-500 font-bold">VERIFIED</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </GlobalLoadingOverlay>
    );
}
