import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CalendarClock, Plus, Edit2, Trash2, RefreshCw,
    CheckCircle, XCircle, Filter, ChevronLeft, ChevronRight,
    AlertTriangle, Globe, Calendar, Clock
} from 'lucide-react';
import { getCompanyHolidays, addCompanyHoliday, updateCompanyHoliday, deleteCompanyHoliday } from '../data/db-extensions';
import { getAllLeaveRequests, updateLeaveRequestStatus, getWorkerLeaveCountThisMonth, getWorkerAssignedProjects } from '../data/db-extensions';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './Dashboard.css';

const HolidaysPage = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('holidays');

    return (
        <div className="admin-dashboard animate-fadeIn">
            <div className="page-header mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                        Holidays & Leave Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                        MANAGE COMPANY HOLIDAYS AND WORKER LEAVE REQUESTS
                    </p>
                </div>
            </div>

            <div className="tab-switcher mb-8 mx-auto shadow-sm border border-slate-200">
                <button
                    onClick={() => setActiveTab('holidays')}
                    className={`tab-btn ${activeTab === 'holidays' ? 'active' : ''}`}
                >
                    <Globe size={16} />
                    Company Holidays
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                >
                    <CalendarClock size={16} />
                    Leave Requests
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                >
                    <CalendarClock size={16} />
                    Calendar View
                </button>
            </div>

            <div className="dashboard-grid-full">
                {activeTab === 'holidays' && <CompanyHolidaysTab />}
                {activeTab === 'requests' && <LeaveRequestsTab />}
                {activeTab === 'calendar' && <CalendarViewTab />}
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------------
// Company Holidays Tab
// ----------------------------------------------------------------------------
const CompanyHolidaysTab = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', date: '', is_recurring: true, description: '' });

    useEffect(() => { loadHolidays(); }, []);

    const loadHolidays = async () => {
        setLoading(true);
        try {
            const data = await getCompanyHolidays();
            setHolidays(data || []);
        } catch (err) {
            console.error('Error loading holidays:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (holiday = null) => {
        if (holiday) {
            setEditingHoliday(holiday);
            setFormData({ name: holiday.name, date: holiday.date, is_recurring: holiday.is_recurring, description: holiday.description || '' });
        } else {
            setEditingHoliday(null);
            setFormData({ name: '', date: '', is_recurring: true, description: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.date) return;
        setSubmitting(true);
        try {
            if (editingHoliday) {
                await updateCompanyHoliday(editingHoliday.id, formData);
            } else {
                await addCompanyHoliday(formData);
            }
            loadHolidays();
            setIsModalOpen(false);
        } catch (err) {
            console.error('Error saving holiday:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this holiday?')) return;
        try {
            await deleteCompanyHoliday(id);
            loadHolidays();
        } catch (err) {
            console.error('Error deleting holiday:', err);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown';
        const datePart = dateStr.split(' ')[0];
        const [year, month, day] = datePart.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const groupedHolidays = holidays.reduce((acc, h) => {
        const year = h.date?.split('-')[0] || 'Recurring';
        if (!acc[year]) acc[year] = [];
        acc[year].push(h);
        return acc;
    }, {});

    return (
        <Card title="Company Holidays">
            {loading ? (
                <div className="p-8 flex items-center justify-center">
                    <LoadingSpinner text="Loading holidays..." />
                </div>
            ) : holidays.length === 0 ? (
                <div className="p-8">
                    <EmptyState icon="calendar" title="No holidays configured" description="Add company holidays to help workers plan their leave." actionLabel="Add Holiday" onAction={() => handleOpenModal()} />
                </div>
            ) : (
                <div className="p-0">
                    <div className="flex items-center justify-end mb-4 gap-2">
                        <button onClick={loadHolidays} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all active:scale-95" title="Refresh">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <BounceButton className="btn btn-primary btn-sm flex items-center gap-2" onClick={() => handleOpenModal()}>
                            <Plus size={16} /> Add Holiday
                        </BounceButton>
                    </div>
                    {Object.entries(groupedHolidays).map(([year, yearHolidays]) => (
                        <div key={year} className="mb-8 last:mb-0">
                            <div className="flex items-center gap-3 mb-4">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{year}</h4>
                                <div className="h-px bg-slate-100 flex-1"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {yearHolidays.map(holiday => (
                                    <div key={holiday.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-900 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Day</span>
                                                <span className="text-lg font-black leading-none">{holiday.date?.split('-')[2]}</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 mb-0.5">
                                                    {holiday.name}
                                                    {holiday.is_recurring && <Globe size={12} className="text-indigo-400" title="Recurring annually" />}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium tracking-wide">
                                                    {formatDate(holiday.date)} • {holiday.description || (holiday.is_recurring ? 'Annual Holiday' : 'One-time Event')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(holiday)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all" title="Edit">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(holiday.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}>
                <div className="space-y-4">
                    <div className="form-group">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Holiday Name *</label>
                        <input type="text" className="w-full text-sm p-2 border border-slate-200 rounded-md focus:border-indigo-400 outline-none" placeholder="e.g., Sinhala & Hindu New Year" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Date *</label>
                        <input type="date" className="w-full text-sm p-2 border border-slate-200 rounded-md focus:border-indigo-400 outline-none" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl transition-all hover:bg-indigo-50">
                        <input type="checkbox" id="isRecurring" checked={formData.is_recurring} onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })} className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                        <label htmlFor="isRecurring" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">Recurring annually</label>
                    </div>
                    <div className="form-group">
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1 block">Description (optional)</label>
                        <textarea className="w-full text-sm p-2 border border-slate-200 rounded-md focus:border-indigo-400 outline-none resize-y min-h-[60px]" placeholder="Additional details..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <BounceButton className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !formData.name || !formData.date}>
                            {submitting ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Add Holiday'}
                        </BounceButton>
                    </div>
                </div>
            </Modal>
        </Card>
    );
};

// ----------------------------------------------------------------------------
// Leave Requests Tab
// ----------------------------------------------------------------------------
const LeaveRequestsTab = () => {
    const { profile } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('Pending');
    const [updatingId, setUpdatingId] = useState(null);
    const [workerStats, setWorkerStats] = useState({});

    useEffect(() => { loadRequests(); }, [statusFilter]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await getAllLeaveRequests(statusFilter);
            setRequests(data || []);
            const workerIds = [...new Set((data || []).map(r => r.worker_id).filter(Boolean))];
            if (workerIds.length > 0) {
                const stats = {};
                await Promise.all(workerIds.map(async (workerId) => {
                    try {
                        const [count, projects] = await Promise.all([getWorkerLeaveCountThisMonth(workerId), getWorkerAssignedProjects(workerId)]);
                        stats[workerId] = { leaveCount: count, projectCount: (projects || []).length };
                    } catch (e) { }
                }));
                setWorkerStats(stats);
            }
        } catch (err) {
            console.error('Error loading requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (requestId, newStatus) => {
        setUpdatingId(requestId);
        try {
            await updateLeaveRequestStatus(requestId, newStatus, profile?.id);
            loadRequests();
        } catch (err) {
            console.error('Error updating request:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const datePart = dateStr.split(' ')[0];
        const [year, month, day] = datePart.split('-');
        return `${month}/${day}`;
    };
    const calculateDays = (start, end) => {
        if (!start || !end) return 0;
        const startPart = start.split(' ')[0];
        const endPart = end.split(' ')[0];
        return Math.ceil((new Date(endPart) - new Date(startPart)) / (1000 * 60 * 60 * 24)) + 1;
    };
    const getStatusClass = (status) => ({ Approved: 'badge-success', Rejected: 'badge-error', Pending: 'badge-warning' }[status] || 'badge-info');

    const filterOptions = ['Pending', 'Approved', 'Rejected'];

    return (
        <Card title="Leave Requests">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter By</span>
                    <div className="segment-control">
                        {filterOptions.map(opt => (
                            <button key={opt} onClick={() => setStatusFilter(opt)} className={`segment-btn ${statusFilter === opt ? 'active' : ''}`}>
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={loadRequests} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all active:scale-95" title="Refresh">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="overflow-x-auto">
                {loading ? (
                    <div className="p-8 flex items-center justify-center">
                        <LoadingSpinner text="Loading requests..." />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="p-8 text-center">
                        <CalendarClock size={40} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 font-medium">No {statusFilter.toLowerCase()} requests</p>
                        <p className="text-sm text-slate-400 mt-1">Leave requests from workers will appear here</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="border-b border-slate-200">
                            <tr>
                                <th className="text-left text-xs font-bold text-slate-500 uppercase px-4 py-3 bg-slate-50/50 rounded-tl-lg">Worker</th>
                                <th className="text-left text-xs font-bold text-slate-500 uppercase px-4 py-3 bg-slate-50/50">Period</th>
                                <th className="text-left text-xs font-bold text-slate-500 uppercase px-4 py-3 bg-slate-50/50">Days</th>
                                <th className="text-left text-xs font-bold text-slate-500 uppercase px-4 py-3 bg-slate-50/50">Month Stats</th>
                                <th className="text-left text-xs font-bold text-slate-500 uppercase px-4 py-3 bg-slate-50/50">Projects</th>
                                <th className="text-left text-xs font-bold text-slate-500 uppercase px-4 py-3 bg-slate-50/50">Reason</th>
                                <th className="text-left text-xs font-bold text-slate-500 uppercase px-4 py-3 bg-slate-50/50">Status</th>
                                <th className="text-center text-xs font-bold text-slate-500 uppercase px-4 py-3 bg-slate-50/50 rounded-tr-lg">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(req => {
                                const days = req.is_half_day ? 0.5 : calculateDays(req.start_date, req.end_date);
                                const workerName = req.worker?.fullName || req.worker?.pid || 'Unknown';
                                return (
                                    <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-bold text-slate-900 tracking-tight">{workerName}</div>
                                            <div className="text-xs text-slate-500 font-medium">{req.worker?.phone || 'No phone'}</div>
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-600">
                                            {formatDate(req.start_date)} {req.start_date !== req.end_date && `→ ${formatDate(req.end_date)}`}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="text-sm font-bold text-indigo-600">{days}</span>
                                            {req.is_half_day && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">Half</span>}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`text-sm font-bold ${workerStats[req.worker_id]?.leaveCount >= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {workerStats[req.worker_id]?.leaveCount || 0} <span className="text-[10px] text-slate-400 font-medium italic">/ 5 days</span>
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            {workerStats[req.worker_id]?.projectCount > 0 ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    <span className="text-slate-900 text-sm font-bold">{workerStats[req.worker_id]?.projectCount}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active</span>
                                                </div>
                                            ) : (
                                                <span className="text-amber-600 text-[10px] font-bold uppercase tracking-tight flex items-center gap-1"><AlertTriangle size={12} /> Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-500 max-w-[150px] truncate">{req.reason}</td>
                                        <td className="px-3 py-2">
                                            <span className={`badge ${getStatusClass(req.status)}`}>{req.status}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            {req.status === 'Pending' && (
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleStatusUpdate(req.id, 'Approved')}
                                                        disabled={updatingId === req.id}
                                                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 border border-emerald-100 shadow-sm"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(req.id, 'Rejected')}
                                                        disabled={updatingId === req.id}
                                                        className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 border border-rose-100 shadow-sm"
                                                        title="Reject"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </Card>
    );
};

// ----------------------------------------------------------------------------
// Calendar View Tab - Similar to Attendance Calendar
// ----------------------------------------------------------------------------
const CalendarViewTab = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [holidays, setHolidays] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(null);

    useEffect(() => { loadData(); }, [currentDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [hols, requests] = await Promise.all([getCompanyHolidays(currentDate.getFullYear()), getAllLeaveRequests('All')]);
            setHolidays(hols || []);
            setLeaveRequests(requests || []);
        } catch (err) {
            console.error('Error loading calendar data:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const calendar = [];

        // Get Sunday of the first week
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Get Saturday of the last week  
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

        // Loop through each week
        for (let w = 0; w < 6; w++) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const current = new Date(startDate);
                current.setDate(startDate.getDate() + (w * 7) + d);

                const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

                // Find holidays
                let foundHoliday = null;
                for (const h of holidays) {
                    const hDate = h.date ? h.date.split(' ')[0] : null;
                    if (!hDate) continue;

                    if (hDate === dateKey) {
                        foundHoliday = h;
                        break;
                    }
                    // Check recurring
                    if (h.is_recurring) {
                        const hParts = hDate.split('-');
                        if (hParts[1] === dateKey.split('-')[1] && hParts[2] === dateKey.split('-')[2]) {
                            foundHoliday = h;
                            break;
                        }
                    }
                }

                // Find leaves
                const foundLeaves = [];
                for (const req of leaveRequests) {
                    if (req.start_date && req.end_date) {
                        const start = req.start_date.split(' ')[0];
                        const end = req.end_date.split(' ')[0];
                        if (dateKey >= start && dateKey <= end) {
                            foundLeaves.push(req);
                        }
                    }
                }

                const isCurrentMonth = current.getMonth() === month;
                const today = new Date();
                const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                week.push({
                    date: current,
                    dateKey,
                    isCurrentMonth,
                    isToday: dateKey === todayKey,
                    isFuture: dateKey > todayKey,
                    holiday: foundHoliday,
                    leaves: foundLeaves
                });
            }
            calendar.push(week);
        }
        return calendar;
    };

    const getDayStatus = (day) => {
        // Priority: holiday > approved leave > pending leave > future/empty
        if (day.holiday) return 'holiday';
        if (day.leaves.some(l => l.status === 'Approved')) return 'approved';
        if (day.leaves.length > 0) return 'pending';
        if (day.isFuture) return 'future';
        if (!day.isCurrentMonth) return 'other-month';
        return 'none';
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'holiday':
                return 'holiday';
            case 'approved':
                return 'approved';
            case 'pending':
                return 'pending';
            case 'future':
                return 'future';
            case 'other-month':
                return 'other-month';
            default:
                return 'none';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'holiday': return <Globe size={14} />;
            case 'approved': return <CheckCircle size={14} />;
            case 'pending': return <Clock size={14} />;
            default: return null;
        }
    };

    const calendar = generateCalendar();

    // Calculate summary - count events in current month view
    const currentMonthHolidays = holidays.filter(h => {
        if (h.is_recurring) return true;
        const hMonth = parseInt(h.date?.split('-')[1]);
        return hMonth === currentDate.getMonth() + 1;
    });

    const summary = {
        holidays: currentMonthHolidays.length,
        approved: leaveRequests.filter(l => l.status === 'Approved').length,
        pending: leaveRequests.filter(l => l.status === 'Pending').length
    };

    const handleDayClick = (day) => {
        if (day.holiday || day.leaves.length > 0) {
            setSelectedDay(day);
        }
    };

    if (loading) {
        return (
            <Card title="Holidays & Leave Calendar">
                <div className="calendar-loading">
                    <LoadingSpinner text="Loading calendar..." />
                </div>
            </Card>
        );
    }

    return (
        <Card title="Holidays & Leave Calendar">
            <div className="attendance-calendar">
                {/* Calendar Header */}
                <div className="calendar-header">
                    <div className="calendar-title">
                        <Calendar size={18} />
                        <span>Holidays & Leave Calendar</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-bold text-slate-800 min-w-[140px] text-center tracking-tight">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="calendar-summary">
                    <div className="summary-item present">
                        <Globe size={14} />
                        <span className="summary-count">{summary.holidays}</span>
                        <span className="summary-label">Holidays</span>
                    </div>
                    <div className="summary-item" style={{ color: '#3b82f6' }}>
                        <CheckCircle size={14} />
                        <span className="summary-count">{summary.approved}</span>
                        <span className="summary-label">Approved</span>
                    </div>
                    <div className="summary-item half">
                        <Clock size={14} />
                        <span className="summary-count">{summary.pending}</span>
                        <span className="summary-label">Pending</span>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="calendar-grid">
                    <div className="calendar-weekday-header">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="weekday-label">{day}</div>
                        ))}
                    </div>

                    {calendar.map((week, weekIdx) => (
                        <div key={weekIdx} className="calendar-week">
                            {week.map((day, dayIdx) => {
                                const status = getDayStatus(day);
                                const styles = getStatusStyles(status);

                                return (
                                    <div
                                        key={dayIdx}
                                        className={`calendar-day ${styles} ${day.isToday ? 'today' : ''} ${(day.holiday || day.leaves.length > 0) && !day.isFuture ? 'cursor-pointer' : ''}`}
                                        onClick={() => handleDayClick(day)}
                                        title={day.holiday ? day.holiday.name : day.leaves.length > 0 ? `${day.leaves.length} leave request(s)` : ''}
                                    >
                                        <span className="day-number">{day.date.getDate()}</span>
                                        {status !== 'future' && status !== 'other-month' && (
                                            <span className="day-icon">{getStatusIcon(status)}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="calendar-legend">
                    <div className="legend-item">
                        <span className="legend-dot present"></span>
                        <span>Holiday</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
                        <span>Approved Leave</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot half"></span>
                        <span>Pending Leave</span>
                    </div>
                </div>
            </div>

            {/* Day Details Modal */}
            <Modal isOpen={!!selectedDay} onClose={() => setSelectedDay(null)} title={selectedDay ? selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}>
                {selectedDay && (
                    <div className="space-y-4">
                        {selectedDay.holiday && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                                    <Globe size={18} />
                                    Company Holiday
                                </div>
                                <div className="text-emerald-800 mt-2 font-medium">{selectedDay.holiday.name}</div>
                                {selectedDay.holiday.description && <div className="text-sm text-emerald-600 mt-1">{selectedDay.holiday.description}</div>}
                            </div>
                        )}
                        {selectedDay.leaves.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
                                    <CalendarClock size={18} />
                                    Leave Requests ({selectedDay.leaves.length})
                                </div>
                                <div className="space-y-2">
                                    {selectedDay.leaves.map((leave, idx) => (
                                        <div key={idx} className={`p-3 border rounded-lg ${leave.status === 'Approved' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-slate-800">{leave.worker?.fullName || 'Worker'}</span>
                                                <span className={`badge ${leave.status === 'Approved' ? 'badge-success' : 'badge-warning'}`}>{leave.status}</span>
                                            </div>
                                            <div className="text-sm text-slate-500 mt-1">{leave.start_date} - {leave.end_date}</div>
                                            <div className="text-sm text-slate-600 mt-1">{leave.reason}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </Card>
    );
};

export default HolidaysPage;
