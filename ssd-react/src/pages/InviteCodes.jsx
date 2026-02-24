import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../data/supabase';
import { useAuth } from '../context/AuthContext';
import { Shield, Plus, Key, Info, Zap, Check } from 'lucide-react';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import DataTable from '../components/DataTable';
import { ClipboardIcon } from '../components/icons/ClipboardIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';

export default function InviteCodes() {
    const { t } = useTranslation();
    const { profile, user, hasRole } = useAuth();
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Form state
    const [newRole, setNewRole] = useState('Worker');
    const [newTargetId, setNewTargetId] = useState('');
    const [copiedNode, setCopiedNode] = useState(null);

    useEffect(() => {
        if (hasRole(['Super Admin', 'Finance'])) {
            fetchCodes();
        }
    }, [hasRole]);

    const fetchCodes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('invite_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Map code to id for DataTable consistency
            setCodes(data.map(c => ({ ...c, id: c.code })));
        }
        setLoading(false);
    };

    const generateCode = async (e) => {
        e.preventDefault();
        setGenerating(true);

        try {
            const rawCode = generateSecureToken();
            const codeHash = await hashToken(rawCode);
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 2); // Strict 48-hour TTL

            if (!profile?.id && !user?.id) {
                throw new Error("Authentication context invalid. Please refresh.");
            }

            const { data, error } = await supabase
                .from('invite_codes')
                .insert({
                    code: rawCode, // User-facing code
                    token_hash: codeHash, // Secure hash for verification
                    role: newRole,
                    target_id: newTargetId,
                    expires_at: expirationDate.toISOString(),
                    created_by: profile?.id || user?.id
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setCodes(prev => [{ ...data, id: data.code }, ...prev]);
                setNewTargetId('');
            }
        } catch (error) {
            console.error("Invite generation error:", error);
            alert(t('invite_codes.failed_generate') + (error ? ' ' + error.message : ''));
        } finally {
            setGenerating(false);
        }
    };

    const revokeCode = async (codeId) => {
        if (!window.confirm(t('invite_codes.revoke_confirm'))) return;

        const { error } = await supabase
            .from('invite_codes')
            .delete()
            .eq('code', codeId)
            .eq('is_used', false);

        if (!error) {
            setCodes(prev => prev.filter(c => c.code !== codeId));
        }
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedNode(code);
        setTimeout(() => setCopiedNode(null), 2000);
    };

    const columns = useMemo(() => [
        {
            key: 'code',
            label: t('invite_codes.table_code'),
            render: (val, row) => (
                <div>
                    <div className="font-mono text-blue-500 font-bold flex items-center gap-2">
                        <Key size={14} className="opacity-70" />
                        {val}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold opacity-40 mt-1">
                        Target: {row.target_id ? row.target_id.slice(0, 8) : 'Global'}
                    </div>
                </div>
            )
        },
        {
            key: 'role',
            label: t('invite_codes.table_role'),
            render: (val) => (
                <span className="font-medium text-slate-700">{val}</span>
            )
        },
        {
            key: 'status',
            label: t('invite_codes.table_status'),
            render: (_, row) => {
                const isExpired = new Date(row.expires_at) < new Date();
                if (row.is_used) {
                    return <span className="badge badge-success">{t('invite_codes.status_redeemed')}</span>;
                }
                if (isExpired) {
                    return <span className="badge badge-danger">{t('invite_codes.status_expired')}</span>;
                }
                return (
                    <span className="badge badge-warning">
                        <Zap size={10} className="mr-1" />
                        {t('invite_codes.status_pending')}
                    </span>
                );
            }
        },
        {
            key: 'actions',
            label: t('invite_codes.table_actions'),
            width: '120px',
            render: (_, row) => (
                <div className="flex items-center justify-end gap-2">
                    <BounceButton
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(row.code); }}
                        className="icon-btn copy-btn"
                        title={t('invite_codes.copy_code')}
                    >
                        {copiedNode === row.code ? (
                            <Check size={18} className="text-emerald-500" />
                        ) : (
                            <ClipboardIcon size={18} />
                        )}
                    </BounceButton>
                    {!row.is_used && (
                        <BounceButton
                            onClick={(e) => { e.stopPropagation(); revokeCode(row.code); }}
                            className="icon-btn delete-btn"
                            title={t('invite_codes.revoke_invite')}
                        >
                            <TrashIcon size={18} />
                        </BounceButton>
                    )}
                </div>
            )
        }
    ], [t, copiedNode]);

    if (!hasRole(['Super Admin', 'Finance'])) {
        return (
            <div className="flex items-center justify-center p-8" style={{ minHeight: '80vh' }}>
                <Card>
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                        <Shield size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
                        <h2 style={{ color: 'var(--text-color)', marginBottom: 8 }}>Access Denied</h2>
                        <p>This security module is restricted to Super Admin and Finance roles.</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <GlobalLoadingOverlay loading={loading} message="Authenticating Secure Credentials...">
            <div className="crud-page invite-codes-page">
                <div className="page-header">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl">
                            <Shield className="text-blue-500" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{t('invite_codes.title')}</h1>
                            <p className="text-slate-500 text-sm mt-0.5">{t('invite_codes.subtitle')}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                    {/* Generation Form */}
                    <div className="lg:col-span-1">
                        <Card title={t('invite_codes.generate_title')}>
                            <form onSubmit={generateCode} className="space-y-5">
                                <div className="form-group">
                                    <label>{t('invite_codes.target_role')}</label>
                                    <select
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                    >
                                        <option value="Worker">Worker</option>
                                        <option value="Site Supervisor">Site Supervisor</option>
                                        <option value="Project Manager">Project Manager</option>
                                        <option value="Client">Client</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Super Admin">Super Admin</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t('invite_codes.target_id')}</label>
                                    <input
                                        type="text"
                                        placeholder={t('invite_codes.target_id_placeholder')}
                                        value={newTargetId}
                                        onChange={(e) => setNewTargetId(e.target.value)}
                                        required
                                    />
                                    <div className="info-box-tiny mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        <Info size={12} className="inline mr-1 text-blue-500" />
                                        {t('invite_codes.target_id_hint')}
                                    </div>
                                </div>
                                <BounceButton
                                    type="submit"
                                    disabled={generating}
                                    className="btn btn-primary w-full py-3 shadow-lg shadow-orange-500/20"
                                >
                                    {generating ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            {t('invite_codes.generating')}
                                        </div>
                                    ) : (
                                        <><Plus size={18} /> {t('invite_codes.generate_button')}</>
                                    )}
                                </BounceButton>
                            </form>
                        </Card>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2">
                        <Card title={t('common.active') + " " + t('nav.invite_codes')}>
                            <DataTable
                                columns={columns}
                                data={codes}
                                loading={loading}
                                emptyMessage={t('invite_codes.no_records')}
                            />
                        </Card>
                    </div>
                </div>
            </div>
        </GlobalLoadingOverlay>
    );
}

// Security Helpers
function generateSecureToken(length = 12) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomBuffer = new Uint32Array(length);
    window.crypto.getRandomValues(randomBuffer);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset[randomBuffer[i] % charset.length];
    }
    return result;
}

async function hashToken(token) {
    const msgUint8 = new TextEncoder().encode(token);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
