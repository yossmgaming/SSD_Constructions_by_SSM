import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../data/supabase';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Search, FileText, UserCheck, Zap, Plus, Check } from 'lucide-react';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import InviteCodes from './InviteCodes';
import UserDetailReport from '../components/UserDetailReport';
import DataTable from '../components/DataTable';
import './PersonnelCommand.css';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';

export default function PersonnelCommand() {
    const { t } = useTranslation();
    const { hasRole } = useAuth();
    const [activeTab, setActiveTab] = useState('gatekeeper'); // 'gatekeeper' or 'intelligence'

    // Intelligence state
    const [searchPID, setSearchPID] = useState('');
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPersonnel, setSelectedPersonnel] = useState(null);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        if (activeTab === 'intelligence') {
            fetchWorkers();
        }
    }, [activeTab]);

    const fetchWorkers = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('workers')
            .select('id, pid, fullName, role, nic')
            .order('fullName', { ascending: true });
        setWorkers(data || []);
        setLoading(false);
    };

    const [copiedPID, setCopiedPID] = useState(null);

    const handleCopyPID = (pid, e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(pid);
        setCopiedPID(pid);
        setTimeout(() => setCopiedPID(null), 2000);
    };

    const columns = [
        {
            key: 'pid',
            label: 'PID',
            render: (v) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#3b82f6',
                        background: '#eff6ff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid #dbeafe'
                    }}>
                        {v || 'N/A'}
                    </span>
                    {v && (
                        <button
                            className="icon-btn"
                            style={{ width: 22, height: 22 }}
                            onClick={(e) => handleCopyPID(v, e)}
                            title="Copy PID"
                        >
                            {copiedPID === v ? <Check size={12} className="text-emerald-500" /> : <Plus size={12} className="rotate-45" />}
                        </button>
                    )}
                </div>
            )
        },
        { key: 'fullName', label: t('common.full_name') },
        { key: 'role', label: t('common.role') },
        { key: 'nic', label: t('workers.nic_number') },
        {
            key: 'actions',
            label: '',
            render: (_, row) => (
                <BounceButton
                    className="icon-btn"
                    onClick={(e) => { e.stopPropagation(); setSelectedPersonnel(row.pid || row.id); }}
                >
                    <FileText size={16} />
                </BounceButton>
            )
        }
    ];

    function renderPersonnelExpansion(worker) {
        return (
            <div className="personnel-expansion-grid">
                <div className="expansion-col">
                    <h4><Shield size={14} style={{ marginRight: 6 }} /> Intelligence Summary</h4>
                    <div className="intel-mini-grid">
                        <div className="intel-item">
                            <label>Status</label>
                            <span className="forensic-status-active">Active Service</span>
                        </div>
                        <div className="intel-item">
                            <label>Designation</label>
                            <span>{worker.role}</span>
                        </div>
                        <div className="intel-item">
                            <label>PID Access</label>
                            <code style={{ fontSize: '0.75rem', color: '#3b82f6' }}>{worker.pid || 'UNASSIGNED'}</code>
                        </div>
                    </div>
                </div>
                <div className="expansion-col">
                    <h4><FileText size={14} style={{ marginRight: 6 }} /> Forensic Gateway</h4>
                    <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '16px', lineHeight: '1.4' }}>
                        Open the authenticated forensic report to view deep attendance records, financial liquidity spent, and operational history.
                    </p>
                    <div className="expansion-actions">
                        <BounceButton
                            className="btn btn-primary btn-sm"
                            onClick={() => setSelectedPersonnel(worker.pid || worker.id)}
                        >
                            <Zap size={14} /> LOAD FULL FORENSIC REPORT
                        </BounceButton>
                    </div>
                </div>
            </div>
        );
    }

    if (!hasRole(['Super Admin', 'Finance'])) {
        return (
            <div className="crud-page flex items-center justify-center p-8" style={{ minHeight: '80vh' }}>
                <Card>
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                        <Shield size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
                        <h2 style={{ color: 'var(--text-color)', marginBottom: 8 }}>Access Denied</h2>
                        <p>Personnel Intelligence is restricted to authorized administrative roles.</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <GlobalLoadingOverlay loading={loading} message="Accessing Enterprise Personnel Intelligence...">
            <div className="crud-page personnel-command-page">
                <div className="page-header mb-8">
                    <div className="flex items-center gap-4">
                        <div style={{ color: '#0f172a' }}>
                            <Shield size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Personnel Command Center</h1>
                            <p className="text-slate-500 text-sm">Enterprise Governance & Personnel Intelligence Gateway</p>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="pc-tabs">
                    <button
                        onClick={() => setActiveTab('gatekeeper')}
                        className={`pc-tab-btn ${activeTab === 'gatekeeper' ? 'active' : ''}`}
                    >
                        <Key size={16} />
                        Identity Gatekeeper
                    </button>
                    <button
                        onClick={() => setActiveTab('intelligence')}
                        className={`pc-tab-btn ${activeTab === 'intelligence' ? 'active' : ''}`}
                    >
                        <UserCheck size={16} />
                        Personnel Intelligence
                    </button>
                </div>

                {selectedPersonnel ? (
                    <div className="report-frame animate-in slide-in-from-bottom-4 duration-500">
                        <div className="report-access-bar">
                            <div className="report-badge">
                                <FileText size={14} />
                                <span className="report-badge-text">In-Depth Forensic Report</span>
                            </div>
                            <button
                                onClick={() => setSelectedPersonnel(null)}
                                className="back-hub-btn"
                            >
                                BACK TO HUB
                            </button>
                        </div>
                        <div className="p-8">
                            <UserDetailReport
                                pid={typeof selectedPersonnel === 'string' && selectedPersonnel.includes('SSD') ? selectedPersonnel : null}
                                workerId={typeof selectedPersonnel === 'number' ? selectedPersonnel : null}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        {activeTab === 'gatekeeper' ? (
                            <div className="gatekeeper-view no-header-invite">
                                <InviteCodes />
                            </div>
                        ) : (
                            <div className="intel-matrix">
                                <div className="matrix-side">
                                    <Card title="Search Matrix" icon={<Search size={16} />}>
                                        <div className="space-y-4">
                                            <div className="form-group">
                                                <label>Personnel ID / NIC</label>
                                                <input
                                                    placeholder="SSD-W-..."
                                                    value={searchPID}
                                                    onChange={(e) => setSearchPID(e.target.value)}
                                                />
                                            </div>
                                            <div className="search-matrix-tip">
                                                <Zap size={16} />
                                                <p>
                                                    Enter a unique PID or NIC to pull an authenticated real-time service record.
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                                <div className="lg:col-span-3">
                                    <Card title="Personnel Registry">
                                        <DataTable
                                            columns={columns}
                                            data={workers.filter(w =>
                                                w.fullName?.toLowerCase().includes(searchPID.toLowerCase()) ||
                                                w.pid?.toLowerCase().includes(searchPID.toLowerCase()) ||
                                                w.nic?.includes(searchPID)
                                            )}
                                            loading={loading}
                                            selectedId={selectedId}
                                            onRowClick={(row) => setSelectedId(selectedId === row.id ? null : row.id)}
                                            renderExpansion={renderPersonnelExpansion}
                                        />
                                    </Card>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </GlobalLoadingOverlay>
    );
}
