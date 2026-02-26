import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../data/supabase';
import { useAuth } from '../context/AuthContext';
import { Shield, Plus, Key, Zap, Check, Search, User, X, ChevronDown } from 'lucide-react';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import DataTable from '../components/DataTable';
import { ClipboardIcon } from '../components/icons/ClipboardIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';
import { generateSecureToken, hashToken } from '../utils/security';

// ─── Role → Table routing configuration ────────────────────────────────────
// Maps each user role to: which table to search, which field is the "PID/ID"
// stored in invite_codes.target_id, and display fields.
// Field names match the actual DB columns used in each page's form/queries:
//   workers: fullName, pid
//   clients: fullName, pid  (clients also use pid since previous session)
//   suppliers: name, pid
//   subcontractors: name, pid (check actual schema)
const ROLE_TABLE_MAP = {
    'Worker': { table: 'workers', idField: 'pid', nameField: 'fullName', searchField: 'fullName', label: 'Worker PID' },
    'Site Supervisor': { table: 'workers', idField: 'pid', nameField: 'fullName', searchField: 'fullName', label: 'Worker PID' },
    'Project Manager': { table: 'workers', idField: 'pid', nameField: 'fullName', searchField: 'fullName', label: 'Worker PID' },
    'Finance': { table: 'workers', idField: 'pid', nameField: 'fullName', searchField: 'fullName', label: 'Worker PID' },
    'Sub Contractor': { table: 'subcontractors', idField: 'pid', nameField: 'fullName', searchField: 'fullName', label: 'Subcontractor PID' },
    'Client': { table: 'clients', idField: 'pid', nameField: 'fullName', searchField: 'fullName', label: 'Client PID' },
    'Supplier': { table: 'suppliers', idField: 'pid', nameField: 'name', searchField: 'name', label: 'Supplier PID' },
    'Super Admin': { table: null, idField: null, nameField: null, searchField: null, label: 'N/A (Global)' },
};

// ─── Person Picker Component ────────────────────────────────────────────────
function PersonPicker({ role, value, onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedName, setSelectedName] = useState('');
    const wrapperRef = useRef(null);
    const debounceRef = useRef(null);

    const config = ROLE_TABLE_MAP[role];

    // Reset when role changes
    useEffect(() => {
        setQuery('');
        setResults([]);
        setSelectedName('');
        setIsOpen(false);
        onSelect('', '');
    }, [role]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const search = useCallback(async (q) => {
        if (!config?.table || q.trim().length < 1) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const { data } = await supabase
                .from(config.table)
                .select(`${config.idField}, ${config.nameField}`)
                .ilike(config.searchField, `%${q.trim()}%`)
                .limit(8);
            setResults(data || []);
            setIsOpen(true);
        } catch {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [config]);

    const handleInput = (e) => {
        const q = e.target.value;
        setQuery(q);
        setSelectedName(''); // Clear selection when typing
        onSelect('', '');
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(q), 280);
    };

    const handleSelect = (person) => {
        const id = String(person[config.idField]);
        const name = person[config.nameField];
        setQuery(name);
        setSelectedName(name);
        setIsOpen(false);
        setResults([]);
        onSelect(id, name);
    };

    const handleClear = () => {
        setQuery('');
        setSelectedName('');
        setResults([]);
        onSelect('', '');
    };

    if (!config?.table) {
        // Super Admin — no linking needed
        return (
            <div className="form-group">
                <label>Linked Identity</label>
                <div className="pid-picker-disabled">
                    <Shield size={14} className="text-slate-400" />
                    <span className="text-slate-400 text-sm">Super Admin — no identity linking required</span>
                </div>
            </div>
        );
    }

    return (
        <div className="form-group" ref={wrapperRef}>
            <label>Link to Person <span className="text-red-500">*</span></label>
            <div className="pid-picker-wrapper">
                <div className="pid-picker-input-row">
                    <Search size={15} className="pid-picker-icon" />
                    <input
                        type="text"
                        className={`pid-picker-input ${selectedName ? 'has-selection' : ''}`}
                        placeholder={`Search ${config.table} by name...`}
                        value={query}
                        onChange={handleInput}
                        onFocus={() => query && results.length > 0 && setIsOpen(true)}
                        autoComplete="off"
                    />
                    {isSearching && <div className="pid-spinner" />}
                    {query && !isSearching && (
                        <button type="button" className="pid-clear-btn" onClick={handleClear}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Dropdown */}
                {isOpen && results.length > 0 && (
                    <ul className="pid-dropdown">
                        {results.map((person) => (
                            <li
                                key={person[config.idField]}
                                className="pid-dropdown-item"
                                onMouseDown={() => handleSelect(person)}
                            >
                                <div className="pid-dropdown-id">
                                    {String(person[config.idField]).slice(0, 16)}
                                </div>
                                <div className="pid-dropdown-name">
                                    <User size={12} className="mr-1 opacity-60" />
                                    {person[config.nameField]}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {isOpen && !isSearching && results.length === 0 && query.length >= 1 && (
                    <div className="pid-no-results">No matches found for "{query}"</div>
                )}
            </div>

            {/* Selected person badge */}
            {selectedName && value && (
                <div className="pid-selected-badge">
                    <Check size={13} className="text-emerald-500" />
                    <span className="pid-selected-name">{selectedName}</span>
                    <code className="pid-selected-id">{value}</code>
                </div>
            )}
        </div>
    );
}

// ─── Role color chips ────────────────────────────────────────────────────────
const ROLE_COLORS = {
    'Worker': 'bg-blue-100 text-blue-700',
    'Site Supervisor': 'bg-indigo-100 text-indigo-700',
    'Project Manager': 'bg-violet-100 text-violet-700',
    'Finance': 'bg-yellow-100 text-yellow-700',
    'Client': 'bg-teal-100 text-teal-700',
    'Supplier': 'bg-orange-100 text-orange-700',
    'Sub Contractor': 'bg-rose-100 text-rose-700',
    'Super Admin': 'bg-slate-800 text-white',
};

export default function InviteCodes() {
    const { t } = useTranslation();
    const { profile, user, hasRole } = useAuth();
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Form state
    const [newRole, setNewRole] = useState('Worker');
    const [newTargetId, setNewTargetId] = useState('');
    const [newTargetName, setNewTargetName] = useState(''); // Human-readable name for confirmation
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

        // Validate: Super Admin doesn't need a target, but everyone else does
        const config = ROLE_TABLE_MAP[newRole];
        if (config?.table && !newTargetId) {
            alert('Please search and select a person to link this invite to.');
            setGenerating(false);
            return;
        }

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
                    code: rawCode,
                    token_hash: codeHash,
                    role: newRole,
                    target_id: newTargetId || null,
                    target_name: newTargetName || null, // Store name for display
                    expires_at: expirationDate.toISOString(),
                    created_by: profile?.id || user?.id
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setCodes(prev => [{ ...data, id: data.code }, ...prev]);
                setNewTargetId('');
                setNewTargetName('');
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
                    <div className="flex items-center gap-1.5 mt-1">
                        <User size={10} className="opacity-40" />
                        <span className="text-[11px] font-medium text-slate-500">
                            {row.target_name || (row.target_id ? row.target_id.slice(0, 12) + '…' : 'Global Access')}
                        </span>
                    </div>
                </div>
            )
        },
        {
            key: 'role',
            label: t('invite_codes.table_role'),
            render: (val) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[val] || 'bg-slate-100 text-slate-700'
                    }`}>
                    {val}
                </span>
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
                                        <option value="Worker">🔨 Worker</option>
                                        <option value="Site Supervisor">🦺 Site Supervisor</option>
                                        <option value="Project Manager">📋 Project Manager</option>
                                        <option value="Finance">💰 Finance</option>
                                        <option value="Client">🤝 Client</option>
                                        <option value="Supplier">🚚 Supplier</option>
                                        <option value="Sub Contractor">🏗️ Sub Contractor</option>
                                        <option value="Super Admin">🛡️ Super Admin</option>
                                    </select>
                                </div>

                                {/* Smart Person Picker */}
                                <PersonPicker
                                    role={newRole}
                                    value={newTargetId}
                                    onSelect={(id, name) => { setNewTargetId(id); setNewTargetName(name); }}
                                />
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

// NOTE: generateSecureToken and hashToken are now imported from ../utils/security
