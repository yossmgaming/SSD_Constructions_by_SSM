import React, { useState, useEffect, useCallback } from 'react';
import { Target, PlusCircle, CheckCircle, Clock, XCircle, FileSpreadsheet, Percent, Wallet, RefreshCw } from 'lucide-react';
import { getSubcontractorClaims, submitSubcontractorClaim } from '../../data/db-extensions';
import BounceButton from '../BounceButton';
import Modal from '../Modal';
import EmptyState from '../EmptyState';
import LoadingSpinner from '../LoadingSpinner';

const SubcontractorClaimsForm = ({ subId, assignments, onSuccess, onError }) => {
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [title, setTitle] = useState('');
    const [percentage, setPercentage] = useState('');
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (assignments && assignments.length > 0 && !selectedAssignment) {
            setSelectedAssignment(assignments[0].id); // ID of the project_subcontractors record
        }
    }, [assignments]);

    useEffect(() => {
        if (subId) {
            loadClaims();
        }
    }, [subId, selectedAssignment]);

    const loadClaims = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getSubcontractorClaims(subId);
            setClaims(data || []);
        } catch (err) {
            console.error('Error loading claims:', err);
            setError('Failed to load claims.');
        } finally {
            setLoading(false);
        }
    }, [subId]);

    const handleOpenModal = () => {
        if (!selectedAssignment) return;
        setTitle('');
        setPercentage('');
        setFormErrors({});
        setIsModalOpen(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!title.trim()) errors.title = 'Title is required';
        const pct = parseInt(percentage);
        if (!percentage || isNaN(pct) || pct <= 0 || pct > 100) {
            errors.percentage = 'Percentage must be between 1 and 100';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        const activeAssignment = assignments.find(a => a.id === selectedAssignment);

        if (!activeAssignment) return;
        if (!validateForm()) return;

        const pct = parseInt(percentage);
        const contractVal = activeAssignment.contractAmount || 0;
        const claimAmount = (pct / 100) * contractVal;

        setSubmitting(true);
        try {
            await submitSubcontractorClaim({
                project_subcontractor_id: activeAssignment.id,
                subcontractor_id: subId,
                project_id: activeAssignment.projectId || activeAssignment.project_id,
                title: title,
                percentage_claimed: pct,
                amount_claimed: claimAmount,
                status: 'Pending'
            });

            setIsModalOpen(false);
            loadClaims();
            if (onSuccess) onSuccess('Claim submitted successfully!');
        } catch (err) {
            console.error('Submit error:', err);
            setError('Failed to submit claim.');
            if (onError) onError('Failed to submit claim');
        } finally {
            setSubmitting(false);
        }
    };

    const fmtCurrency = (val) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(val || 0);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Approved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200'; // Pending
        }
    };

    const activeProjectClaims = claims.filter(c => c.project_subcontractor_id === selectedAssignment);

    if (!assignments || assignments.length === 0) return null;

    const currentAssignment = assignments.find(a => a.id === selectedAssignment);

    return (
        <div className="bg-white border flex flex-col h-full border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-violet-100 text-violet-600 rounded-lg">
                        <Target size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Milestone Claims</h3>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">REQUEST PAYMENT FOR PROGRESS</p>
                    </div>
                </div>

                {assignments.length > 1 && (
                    <select
                        value={selectedAssignment}
                        onChange={(e) => setSelectedAssignment(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-md p-1.5 max-w-[150px] truncate text-slate-700 outline-none focus:border-violet-400"
                    >
                        {assignments.map(a => (
                            <option key={a.id} value={a.id}>{a.projectName || 'Assignment'}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="mb-4 bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center text-sm">
                    <div>
                        <div className="text-xs text-slate-500 font-semibold uppercase">Total Contract Value</div>
                        <div className="font-bold text-slate-800">{fmtCurrency(currentAssignment?.contractAmount)}</div>
                    </div>
                    <BounceButton
                        className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 font-bold shadow-sm transition-colors cursor-pointer text-xs border-0"
                        onClick={handleOpenModal}
                    >
                        <PlusCircle size={14} /> New Claim
                    </BounceButton>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 animate-pulse text-sm">Loading claims...</div>
                ) : activeProjectClaims.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-70">
                        <FileSpreadsheet size={28} className="text-slate-300 mb-2" />
                        <span className="text-sm font-semibold text-slate-600">No Claims Yet</span>
                        <span className="text-xs text-slate-400 max-w-[200px] mt-1">Submit your first claim once a milestone is completed.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[250px] pr-1">
                        {activeProjectClaims.map(claim => (
                            <div key={claim.id} className="border border-slate-100 rounded-lg p-3 hover:border-violet-200 transition-colors bg-white shadow-sm flex flex-col">
                                <div className="flex items-start justify-between mb-2 gap-2">
                                    <div className="font-bold text-sm text-slate-800 line-clamp-1">{claim.title}</div>
                                    <div className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(claim.status)}`}>
                                        {claim.status}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs mt-2 border-t border-slate-50 pt-2">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                        <Percent size={14} className="text-violet-500" />
                                        <span>Progress: <strong className="text-slate-800">{claim.percentage_claimed}%</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                        <Wallet size={14} className="text-emerald-500" />
                                        <span>Claimed: <strong className="text-slate-800">{fmtCurrency(claim.amount_claimed)}</strong></span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Creation Modal */}
            <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title="Submit New Milestone Claim">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                        Request payment for completed progress on <strong className="text-slate-800">{currentAssignment?.projectName}</strong>.
                    </p>

                    <div className="form-group mb-0">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Milestone Description <span className="text-violet-500">*</span></label>
                        <input
                            type="text"
                            className="w-full text-sm p-3 border border-slate-200 rounded-md outline-none focus:border-violet-400"
                            placeholder="e.g. Foundation poured and cured, 1st Floor Framing..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Percentage Claimed (%)</label>
                            <input
                                type="number"
                                className="w-full text-sm p-3 bg-white border border-slate-200 rounded-md outline-none focus:border-violet-400 font-bold"
                                placeholder="0"
                                min="1"
                                max="100"
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                        <div className="form-group mb-0 flex flex-col justify-end pb-3">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1 block">Estimated Claim Amount</label>
                            <div className="text-lg font-bold text-emerald-600">
                                {fmtCurrency((parseInt(percentage) || 0) / 100 * (currentAssignment?.contractAmount || 0))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 mt-6 border-t border-slate-100">
                        <button
                            className="btn btn-ghost"
                            onClick={() => setIsModalOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <BounceButton
                            className="btn btn-primary bg-violet-600 hover:bg-violet-700 hover:shadow-md flex items-center gap-2 border-0"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <span>Submitting...</span>
                            ) : (
                                <><Target size={16} /> Request Payment</>
                            )}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SubcontractorClaimsForm;
