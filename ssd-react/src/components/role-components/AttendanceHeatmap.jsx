import React, { useEffect, useState } from 'react';
import { getWorkerAttendanceHistory } from '../../data/db-extensions';
import { Calendar, Info, CheckCircle, XCircle, MinusCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import BounceButton from '../BounceButton';

const AttendanceHeatmap = ({ workerId }) => {
    const [attendanceLog, setAttendanceLog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        if (!workerId) return;
        loadHistory();
    }, [workerId, selectedDate?.getMonth(), selectedDate?.getYear()]);

    const loadHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth() + 1;
            const daysInMonth = new Date(year, month, 0).getDate();
            const totalDays = daysInMonth + 30; // Current month + 1 month padding for history

            const data = await getWorkerAttendanceHistory(workerId, totalDays);
            setAttendanceLog(data || []);
        } catch (err) {
            console.error('Error loading attendance:', err);
            setError('Failed to load attendance history');
        } finally {
            setLoading(false);
        }
    };

    const goToPreviousMonth = () => {
        setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
    };

    const goToCurrentMonth = () => {
        setSelectedDate(new Date());
    };

    // Generate calendar grid for selected month with padding
    const generateCalendar = () => {
        const calendar = [];
        const today = new Date();
        const currentYear = selectedDate.getFullYear();
        const currentMonth = selectedDate.getMonth();

        // Get first day of selected month
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        // Get last day of selected month
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

        // Find the Sunday before or on the first day of month
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

        // Calculate weeks needed (usually 5-6 for a month view)
        const totalDays = Math.ceil((lastDayOfMonth - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const weeksNeeded = Math.ceil(totalDays / 7);

        for (let week = 0; week < weeksNeeded; week++) {
            const weekDays = [];
            for (let day = 0; day < 7; day++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + (week * 7) + day);
                const dateStr = date.toISOString().split('T')[0];

                // Find attendance record
                const record = attendanceLog.find(a => a.date === dateStr);

                // Check if date is in the future
                const isFuture = date > today;

                // Check if date is in current month
                const isCurrentMonth = date.getMonth() === currentMonth;

                weekDays.push({
                    date: date,
                    dateStr: dateStr,
                    hasRecord: !!record,
                    isPresent: record?.isPresent || false,
                    isHalfDay: record?.isHalfDay || false,
                    hoursWorked: record?.hoursWorked || 0,
                    project: record?.project?.name || null,
                    isFuture: isFuture,
                    isCurrentMonth: isCurrentMonth,
                    isToday: dateStr === today.toISOString().split('T')[0]
                });
            }
            calendar.push(weekDays);
        }
        return calendar;
    };

    const getDayStatus = (day) => {
        if (day.isFuture) return 'future';
        if (!day.isCurrentMonth) return 'other-month';
        if (!day.hasRecord) return 'none';
        if (!day.isPresent && !day.isHalfDay) return 'absent';
        if (day.isHalfDay) return 'half';
        return 'present';
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'present': return 'present';
            case 'half': return 'half';
            case 'absent': return 'absent';
            case 'future': return 'future';
            case 'other-month': return 'other-month';
            default: return 'none';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'present': return <CheckCircle size={14} />;
            case 'half': return <MinusCircle size={14} />;
            case 'absent': return <XCircle size={14} />;
            default: return null;
        }
    };

    if (loading) {
        return (
            <div className="calendar-loading">
                <LoadingSpinner text="Loading calendar..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="calendar-error">
                <div className="text-center py-8">
                    <XCircle size={32} className="mx-auto text-rose-400 mb-3" />
                    <p className="text-sm text-slate-500 mb-3">{error}</p>
                    <button onClick={loadHistory} className="text-sm text-indigo-600 font-medium hover:underline">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const calendar = generateCalendar();

    // Calculate summary for selected month
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    const daysInSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    const monthAttendance = attendanceLog.filter(a => {
        const date = new Date(a.date);
        return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
    });

    const summary = {
        present: monthAttendance.filter(a => a.isPresent && !a.isHalfDay).length,
        half: monthAttendance.filter(a => a.isHalfDay).length,
        absent: monthAttendance.filter(a => !a.isPresent && !a.isHalfDay).length,
        total: daysInSelectedMonth
    };

    return (
        <div className="attendance-calendar">
            {/* Calendar Header with Navigation */}
            <div className="calendar-header">
                <div className="flex items-center gap-2">
                    <BounceButton
                        onClick={goToPreviousMonth}
                        className="p-1.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition-all border border-slate-100 active:scale-95"
                        title="Previous Month"
                    >
                        <ChevronLeft size={16} />
                    </BounceButton>
                    <span className="text-xs font-bold text-slate-700 min-w-[140px] text-center uppercase tracking-widest">
                        {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <BounceButton
                        onClick={goToNextMonth}
                        className="p-1.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition-all border border-slate-100 active:scale-95"
                        title="Next Month"
                    >
                        <ChevronRight size={16} />
                    </BounceButton>
                </div>
                <div className="flex items-center gap-2">
                    <BounceButton
                        onClick={goToCurrentMonth}
                        className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                        title="Go to Current Month"
                    >
                        Today
                    </BounceButton>
                    <BounceButton
                        onClick={loadHistory}
                        className="p-1.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 hover:text-indigo-600 border border-slate-100 transition-all active:scale-90"
                        title="Refresh Data"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </BounceButton>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="calendar-summary">
                <div className="summary-item present">
                    <CheckCircle size={14} />
                    <span className="summary-count">{summary.present}</span>
                    <span className="summary-label">Present</span>
                </div>
                <div className="summary-item half">
                    <MinusCircle size={14} />
                    <span className="summary-count">{summary.half}</span>
                    <span className="summary-label">Half Day</span>
                </div>
                <div className="summary-item absent">
                    <XCircle size={14} />
                    <span className="summary-count">{Math.max(0, summary.absent)}</span>
                    <span className="summary-label">Absent</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
                {/* Day Headers */}
                <div className="calendar-weekday-header">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="weekday-label">{day}</div>
                    ))}
                </div>

                {/* Calendar Weeks */}
                {calendar.map((week, weekIdx) => (
                    <div key={weekIdx} className="calendar-week">
                        {week.map((day, dayIdx) => {
                            const status = getDayStatus(day);
                            const styles = getStatusStyles(status);

                            return (
                                <div
                                    key={dayIdx}
                                    className={`calendar-day ${styles} ${day.isToday ? 'today' : ''}`}
                                    title={!day.isFuture ? `${day.date.toLocaleDateString()}: ${status === 'present' ? 'Full Day' : status === 'half' ? 'Half Day' : 'Absent'}` : ''}
                                >
                                    <span className="day-number">{day.date.getDate()}</span>
                                    {status !== 'future' && (
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
                    <span>Present</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot half"></span>
                    <span>Half Day</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot absent" style={{ background: '#f43f5e' }}></span>
                    <span>Absent</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}></span>
                    <span>Not Assigned</span>
                </div>
            </div>
        </div>
    );
};

export default AttendanceHeatmap;
