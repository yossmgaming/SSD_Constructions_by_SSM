import React, { useEffect, useState } from 'react';
import { getWorkerAttendanceHistory } from '../../data/db-extensions';
import { Calendar, Info } from 'lucide-react';

const AttendanceHeatmap = ({ workerId }) => {
    const [attendanceLog, setAttendanceLog] = useState([]);
    const [loading, setLoading] = useState(true);

    // Number of days to display
    const DAYS_TO_SHOW = 28; // 4 weeks

    useEffect(() => {
        if (!workerId) return;
        loadHistory();
    }, [workerId]);

    const loadHistory = async () => {
        setLoading(true);
        const data = await getWorkerAttendanceHistory(workerId, DAYS_TO_SHOW);
        setAttendanceLog(data);
        setLoading(false);
    };

    // Generate grid map for the last DAYS_TO_SHOW days
    const generateGrid = () => {
        const grid = [];
        const today = new Date();

        for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Find attendance record for this date
            const record = attendanceLog.find(a => a.date === dateStr);

            grid.push({
                date: date,
                dateStr: dateStr,
                isPresent: record?.isPresent || false,
                isHalfDay: record?.isHalfDay || false,
                project: record?.project?.name || null
            });
        }
        return grid;
    };

    const getStatusBlockClass = (day) => {
        if (!day.isPresent && !day.isHalfDay) return 'bg-slate-100 hover:bg-slate-200 border-slate-200';
        if (day.isHalfDay) return 'bg-amber-400 hover:bg-amber-500 border-amber-500 shadow-sm';
        return 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 shadow-sm'; // Present
    };

    if (loading) {
        return (
            <div className="animate-pulse p-4 rounded-xl bg-slate-50 border border-slate-100 h-32 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Calendar size={24} />
                    <span className="text-sm font-medium">Loading history map...</span>
                </div>
            </div>
        );
    }

    const grid = generateGrid();

    // Summary stats
    const totalPresent = grid.filter(d => d.isPresent && !d.isHalfDay).length;
    const totalHalf = grid.filter(d => d.isHalfDay).length;
    const totalAbsent = DAYS_TO_SHOW - (totalPresent + totalHalf);

    return (
        <div className="bg-white border flex flex-col border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">4-Week Activity Map</h3>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">PAST {DAYS_TO_SHOW} DAYS</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold">
                    <div className="flex items-center gap-1.5 border border-slate-200 px-2 py-1 rounded-md bg-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-600 font-bold">{totalPresent}</span>
                    </div>
                    <div className="flex items-center gap-1.5 border border-slate-200 px-2 py-1 rounded-md bg-white">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span className="text-slate-600 font-bold">{totalHalf}</span>
                    </div>
                    <div className="flex items-center gap-1.5 border border-slate-200 px-2 py-1 rounded-md bg-white">
                        <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                        <span className="text-slate-600 font-bold">{totalAbsent}</span>
                    </div>
                </div>
            </div>

            <div className="p-4">
                {/* Heatmap Grid container */}
                <div className="flex justify-center flex-wrap gap-1.5 md:gap-2 relative pb-2">
                    {grid.map((day, idx) => {
                        const isToday = new Date().toISOString().split('T')[0] === day.dateStr;
                        const dayName = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][day.date.getDay()];
                        const dateNum = day.date.getDate();
                        const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

                        return (
                            <div
                                key={idx}
                                className="group relative"
                            >
                                <div className={`
                                    w-6 h-10 md:w-8 md:h-12 rounded-md border 
                                    transition-all duration-200 flex flex-col items-center justify-between py-1
                                    ${getStatusBlockClass(day)}
                                    ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
                                    ${isWeekend && !day.isPresent && !day.isHalfDay ? 'opacity-50' : 'opacity-100'}
                                `}>
                                    <span className={`text-[8px] md:text-[9px] font-bold uppercase ${day.isPresent || day.isHalfDay ? 'text-white' : 'text-slate-400'}`}>
                                        {dayName}
                                    </span>
                                    <span className={`text-[10px] md:text-xs font-bold ${day.isPresent || day.isHalfDay ? 'text-white' : 'text-slate-500'}`}>
                                        {dateNum}
                                    </span>
                                </div>

                                {/* Tooltip hover logic (pure CSS via group-hover) */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[140px] bg-slate-800 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                                    <div className="font-bold border-b border-slate-600 pb-1 mb-1">{day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                    <div className="text-slate-300">
                                        Status: {day.isHalfDay ? 'Half Day' : day.isPresent ? 'Present (Full)' : 'Absent/Rest'}
                                    </div>
                                    {day.project && (
                                        <div className="mt-1 font-semibold text-indigo-300 truncate">
                                            @ {day.project}
                                        </div>
                                    )}
                                    {isToday && <div className="text-emerald-400 font-bold mt-1 tracking-wider text-[10px] uppercase">Today</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Info size={14} className="text-indigo-400" /> Hover over a day for detailed assignment information.
                </div>
            </div>
        </div>
    );
};

export default AttendanceHeatmap;
