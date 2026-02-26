import React, { useState, useEffect } from 'react';
import { CalendarClock, CheckCircle, XCircle, Clock, Plus, ArrowRight } from 'lucide-react';
import { getWorkerLeaveRequests, submitLeaveRequest } from '../../data/db-extensions';
import BounceButton from '../BounceButton';
import Modal from '../Modal';

const LeaveRequestForm = ({ workerId }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!workerId) return;
        loadRequests();
    }, [workerId]);

    const loadRequests = async () => {
        setLoading(true);
        const data = await getWorkerLeaveRequests(workerId);
        setRequests(data || []);
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!startDate || !endDate || !reason.trim()) {
            alert('Please fill in all fields (Start Date, End Date, Reason).');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('End date cannot be before start date.');
            return;
        }

        setSubmitting(true);
        try {
            await submitLeaveRequest(workerId, {
                start_date: startDate,
                end_date: endDate,
                reason: reason,
                status: 'Pending'
            });

            // Reset and close
            setStartDate('');
            setEndDate('');
            setReason('');
            setIsModalOpen(false);

            // Reload list
            loadRequests();
        } catch (error) {
            console.error('Failed to submit leave request:', error);
            alert('Error submitting request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Approved': return <CheckCircle size={16} className="text-emerald-500" />;
            case 'Rejected': return <XCircle size={16} className="text-red-500" />;
            default: return <Clock size={16} className="text-amber-500" />;
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Rejected': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const calculateDays = (start, end) => {
        if (!start || !end) return 0;
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                        <CalendarClock size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Leave / Time-off Requests</h3>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">HISTORY & SUBMISSION</p>
                    </div>
                </div>

                <BounceButton
                    className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs py-1.5 px-3"
                    onClick={() => setIsModalOpen(true)}
                >
                    <Plus size={14} /> New Request
                </BounceButton>
            </div>

            <div className="p-0">
                {loading ? (
                    <div className="p-6 text-center text-sm text-slate-400 animate-pulse">Loading requests...</div>
                ) : requests.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center">
                        <CalendarClock size={28} className="text-slate-300 mb-2" />
                        <span className="text-sm font-semibold text-slate-600">No leave requests found.</span>
                        <span className="text-xs text-slate-400 mt-1 max-w-[200px]">You have not requested any time off yet.</span>
                    </div>
                ) : (
                    <div className="flex flex-col max-h-[250px] overflow-y-auto">
                        {requests.map(req => {
                            const days = calculateDays(req.start_date, req.end_date);
                            return (
                                <div key={req.id} className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-800">{formatDate(req.start_date)}</span>
                                            {req.start_date !== req.end_date && (
                                                <>
                                                    <ArrowRight size={12} className="text-slate-300" />
                                                    <span className="text-sm font-bold text-slate-800">{formatDate(req.end_date)}</span>
                                                </>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-500 pr-4 truncate max-w-[250px]">{req.reason}</span>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5 min-w-[90px]">
                                        <div className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${getStatusClass(req.status)}`}>
                                            {getStatusIcon(req.status)}
                                            {req.status}
                                        </div>
                                        <span className="text-[10px] font-semibold text-slate-400">{days} day{days !== 1 && 's'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => !submitting && setIsModalOpen(false)}
                title="Request Time Off"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                        Submit a request to your supervisor/manager for upcoming personal leave.
                        Unpaid leave unless statutory rules apply.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Start Date &ast;</label>
                            <input
                                type="date"
                                className="w-full text-sm p-2 border border-slate-200 rounded-md focus:border-purple-400 outline-none"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                        <div className="form-group mb-0">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">End Date &ast;</label>
                            <input
                                type="date"
                                className="w-full text-sm p-2 border border-slate-200 rounded-md focus:border-purple-400 outline-none"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => setEndDate(e.target.value)}
                                disabled={submitting}
                            />
                        </div>
                    </div>

                    <div className="flex items-center text-xs font-semibold text-slate-500 py-1">
                        Total duration: <span className="text-indigo-600 ml-1">{startDate && endDate && (new Date(startDate) <= new Date(endDate)) ? calculateDays(startDate, endDate) : 0} days</span>
                    </div>

                    <div className="form-group">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Reason for Leave &ast;</label>
                        <textarea
                            className="w-full text-sm p-3 border border-slate-200 rounded-md focus:border-purple-400 outline-none resize-y min-h-[80px]"
                            placeholder="Please provide a brief reason..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={submitting}
                        />
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
                            className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 hover:shadow-md"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default LeaveRequestForm;
