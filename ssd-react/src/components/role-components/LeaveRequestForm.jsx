import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock, CheckCircle, XCircle, Clock, Plus, ArrowRight, RefreshCw, AlertTriangle, Briefcase, Send, Calculator } from 'lucide-react';
import { submitLeaveRequest, getWorkerLeaveCountThisMonth, getWorkerAssignedProjects } from '../../data/db-extensions';
import BounceButton from '../BounceButton';
import LoadingSpinner from '../LoadingSpinner';

const LeaveRequestForm = ({ workerId, onSuccess, onError }) => {
    const [loadingStats, setLoadingStats] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [leaveCountThisMonth, setLeaveCountThisMonth] = useState(0);
    const [assignedProjects, setAssignedProjects] = useState([]);

    // Form State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [reason, setReason] = useState('');
    const [formErrors, setFormErrors] = useState({});

    const MAX_LEAVES_PER_MONTH = 5;

    const loadWorkerStats = useCallback(async () => {
        if (!workerId) return;
        setLoadingStats(true);
        try {
            const [count, projects] = await Promise.all([
                getWorkerLeaveCountThisMonth(workerId),
                getWorkerAssignedProjects(workerId)
            ]);
            setLeaveCountThisMonth(count);
            setAssignedProjects(projects || []);
        } catch (err) {
            console.error('Error loading worker stats:', err);
        } finally {
            setLoadingStats(false);
        }
    }, [workerId]);

    useEffect(() => {
        loadWorkerStats();
    }, [loadWorkerStats]);

    const calculateDays = (start, end) => {
        if (!start || !end) return 0;
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const validateForm = () => {
        const errors = {};
        const requestedDays = calculateDays(startDate, endDate);
        // Half day means half of the total days requested (e.g., 3 days half-day = 1.5 days)
        const effectiveDays = isHalfDay ? requestedDays / 2 : requestedDays;
        const totalAfterRequest = leaveCountThisMonth + effectiveDays;

        if (totalAfterRequest > MAX_LEAVES_PER_MONTH) {
            errors.limit = `Monthly cap of ${MAX_LEAVES_PER_MONTH} days will be exceeded.`;
        }

        if (!startDate) errors.startDate = 'Required';
        if (!endDate) errors.endDate = 'Required';
        if (!reason.trim()) errors.reason = 'Please explain the necessity';

        if (assignedProjects.length === 0 && reason.trim().length < 10) {
            errors.reason = 'Unassigned Worker: Please provide a detailed justification.';
        }

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            errors.endDate = 'End date is before start date';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            await submitLeaveRequest(workerId, {
                start_date: startDate,
                end_date: endDate,
                reason: reason,
                is_half_day: isHalfDay,
                status: 'Pending'
            });

            setStartDate('');
            setEndDate('');
            setReason('');
            setIsHalfDay(false);
            loadWorkerStats();
            if (onSuccess) onSuccess('Leave request submitted successfully!');
        } catch (err) {
            console.error('Failed to submit leave request:', err);
            if (onError) onError('Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingStats) {
        return (
            <div className="py-12 flex flex-col items-center justify-center">
                <LoadingSpinner />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">Synchronizing...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Status & Balance Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border-2 transition-all ${leaveCountThisMonth >= MAX_LEAVES_PER_MONTH ? 'bg-rose-50 border-rose-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Monthly Cycle</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${leaveCountThisMonth >= MAX_LEAVES_PER_MONTH ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {leaveCountThisMonth} / {MAX_LEAVES_PER_MONTH} Days Used
                        </span>
                    </div>
                    <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out ${leaveCountThisMonth >= MAX_LEAVES_PER_MONTH ? 'bg-rose-500' : 'bg-indigo-600'}`}
                            style={{ width: `${Math.min((leaveCountThisMonth / MAX_LEAVES_PER_MONTH) * 100, 100)}%` }}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {assignedProjects.length === 0 ? (
                        <div className="p-4 rounded-xl bg-amber-50/50 border-2 border-amber-100 flex items-center gap-3 h-full">
                            <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                            <div>
                                <span className="text-[11px] font-black text-amber-800 uppercase tracking-widest block leading-none mb-1">Unassigned</span>
                                <p className="text-[10px] text-amber-700 font-medium">Detailed justification required for approval.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl bg-indigo-50/50 border-2 border-indigo-100 flex items-center gap-3 h-full">
                            <Briefcase size={20} className="text-indigo-600 shrink-0" />
                            <div>
                                <span className="text-[11px] font-black text-indigo-800 uppercase tracking-widest block leading-none mb-1">Assigned Sites</span>
                                <p className="text-[10px] text-indigo-700 font-medium">Currently deployed on {assignedProjects.length} construction site(s).</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Application Data Grid */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Side: Dates & Reason */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block px-1">Start Date</label>
                                <input
                                    type="date"
                                    className={`w-full text-sm font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white transition-all ${formErrors.startDate ? 'border-rose-300 bg-rose-50' : ''}`}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    disabled={submitting}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block px-1">End Date</label>
                                <input
                                    type="date"
                                    className={`w-full text-sm font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white transition-all ${formErrors.endDate ? 'border-rose-300 bg-rose-50' : ''}`}
                                    value={endDate}
                                    min={startDate || undefined}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        <div
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-center gap-4 ${isHalfDay ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                            onClick={() => !submitting && setIsHalfDay(!isHalfDay)}
                        >
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isHalfDay ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                {isHalfDay && <CheckCircle size={16} className="text-white" />}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-sm font-bold ${isHalfDay ? 'text-indigo-900' : 'text-slate-700'}`}>Request as Half-Day (4 Hours)</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Reduces balance by 0.5 per day requested</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Reason */}
                    <div className="space-y-1.5 h-full flex flex-col">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block px-1">Justification</label>
                        <textarea
                            className={`w-full text-sm font-medium p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white transition-all resize-none flex-grow min-h-[110px] ${formErrors.reason ? 'border-rose-300 bg-rose-50' : ''}`}
                            placeholder="Please provide the specific reason for your time-off request..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={submitting}
                        />
                    </div>
                </div>

                {/* Footer / Summary Action */}
                <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        {startDate && endDate && (
                            <div className="flex items-center gap-4 animate-in slide-in-from-left-2">
                                <div className="text-center">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Days</div>
                                    <div className="text-2xl font-black text-slate-800 leading-none mt-1">
                                        {isHalfDay ? (calculateDays(startDate, endDate) / 2).toFixed(1) : calculateDays(startDate, endDate)}
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-slate-100" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration Type</span>
                                    <span className={`text-xs font-bold ${isHalfDay ? 'text-amber-600' : 'text-indigo-600'}`}>
                                        {isHalfDay ? `${calculateDays(startDate, endDate) * 4} Working Hours` : 'Full-Day Absence'}
                                    </span>
                                </div>
                            </div>
                        )}
                        {(formErrors.reason || formErrors.limit || formErrors.startDate || formErrors.endDate) && (
                            <div className="flex items-center gap-2 text-rose-500 text-[10px] font-bold uppercase tracking-wide bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                                <AlertTriangle size={14} />
                                {formErrors.limit || formErrors.reason || formErrors.startDate || 'Input Error'}
                            </div>
                        )}
                    </div>

                    <BounceButton
                        className="w-full md:w-auto btn btn-primary px-12 py-4 rounded-xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-indigo-500/30 active:scale-95 disabled:grayscale"
                        onClick={handleSubmit}
                        disabled={submitting || (leaveCountThisMonth >= MAX_LEAVES_PER_MONTH && !startDate)}
                    >
                        {submitting ? (
                            <><LoadingSpinner size="small" color="white" /> Dispatching...</>
                        ) : (
                            <><Send size={16} /> {leaveCountThisMonth >= MAX_LEAVES_PER_MONTH ? 'Monthly Cap Reached' : 'Dispatch Leave Request'}</>
                        )}
                    </BounceButton>
                </div>
            </div>
        </div>
    );
};

export default LeaveRequestForm;
