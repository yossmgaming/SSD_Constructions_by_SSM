import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Briefcase, CalendarDays, Clock, Download, ChevronDown } from 'lucide-react';
import ExportDropdown from '../components/ExportDropdown';
import Card from '../components/Card';
import { getAll, create, update, remove, queryEq, KEYS } from '../data/db';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';

import { exportToPDF, exportToExcel, exportToWord, exportToCSV } from '../utils/exportUtils';
import './Attendance.css';
import BounceButton from '../components/BounceButton';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Attendance() {
    const { t, i18n } = useTranslation();
    const { hasRole } = useAuth();
    const [workers, setWorkers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [attendances, setAttendances] = useState([]);
    const [projectWorkers, setProjectWorkers] = useState([]);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [selectedProject, setSelectedProject] = useState('');
    const [workerAssignments, setWorkerAssignments] = useState([]);
    const [search, setSearch] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const [menu, setMenu] = useState(null); // { day, x, y }
    const [customHoursInput, setCustomHoursInput] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingExport, setIsLoadingExport] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        loadBaseData();
    }, [refreshKey]);

    async function loadBaseData() {
        setIsLoading(true);
        try {
            // Only fetch active reference data. Attendances will be fetched per worker.
            const [wrks, projs] = await Promise.all([
                getAll(KEYS.workers),
                getAll(KEYS.projects)
            ]);
            setWorkers(wrks);
            setProjects(projs);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    // Auto-detect worker's project assignments
    const detectWorkerProjects = useCallback(async (worker) => {
        if (!worker) {
            setWorkerAssignments([]);
            setAttendances([]);
            setProjectWorkers([]);
            return;
        }

        setIsLoading(true);
        try {
            // Optimization: Only fetch data for this specific worker
            const [workerAtt, workerPWs] = await Promise.all([
                queryEq(KEYS.attendances, 'workerId', worker.id),
                queryEq(KEYS.projectWorkers, 'workerId', worker.id)
            ]);

            setAttendances(workerAtt.sort((a, b) => (a.date || '').localeCompare(b.date || '')));
            setProjectWorkers(workerPWs);

            // Group attendance by project
            const projectMap = {};
            workerAtt.forEach((a) => {
                if (!a.projectId) return;
                if (!projectMap[a.projectId]) projectMap[a.projectId] = { projectId: a.projectId, dates: [], hours: 0 };
                projectMap[a.projectId].dates.push(a.date);
                projectMap[a.projectId].hours += (a.hoursWorked || a.hours || 0);
            });

            // Also include projectWorker assignments even if no attendance yet
            workerPWs.forEach((pw) => {
                if (!projectMap[pw.projectId]) projectMap[pw.projectId] = { projectId: pw.projectId, dates: [], hours: 0 };
            });

            const assignments = Object.values(projectMap).map((p) => {
                const proj = projects.find((pr) => pr.id === p.projectId);
                const sortedDates = [...p.dates].sort();

                // Detailed date range from projectWorkers table if available
                const pwRecord = workerPWs.find(pw => pw.projectId === p.projectId);

                return {
                    projectId: p.projectId,
                    projectName: proj?.name || 'Unknown Project',
                    projectStatus: proj?.status || '',
                    client: proj?.client || '',
                    firstDate: pwRecord?.assignedFrom || sortedDates[0] || null,
                    lastDate: pwRecord?.assignedTo || sortedDates[sortedDates.length - 1] || null,
                    daysWorked: p.dates.length,
                    totalHours: p.hours,
                };
            }).sort((a, b) => {
                // Most recent first
                if (b.lastDate && a.lastDate) return b.lastDate.localeCompare(a.lastDate);
                return b.daysWorked - a.daysWorked;
            });

            setWorkerAssignments(assignments);

            // Auto-select the most recent project if none selected
            if (!selectedProject && assignments.length > 0) {
                setSelectedProject(String(assignments[0].projectId));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [projects, selectedProject]);

    function handleSelectWorker(worker) {
        setSelectedWorker(worker);
        detectWorkerProjects(worker);
    }

    // Close context menu on outside click
    useEffect(() => {
        function handleClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                closeMenu();
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Auto-refresh when window gains focus (in case user updated workers in another tab)
    const handleExport = async (format) => {
        const exportData = attendances.map(a => {
            const worker = workers.find(w => w.id === a.workerId);
            const project = projects.find(p => p.id === a.projectId);

            // Proper hours: use hoursWorked if it's a number (even 0), then hours, then derive from status
            const hours = (a.hoursWorked != null) ? a.hoursWorked
                : (a.hours != null) ? a.hours
                    : a.isHalfDay ? 4
                        : a.isPresent ? 8
                            : 0;

            return {
                Date: a.date,
                Worker: worker?.fullName || '',
                Project: project?.name || '',
                Status: a.status || (a.isHalfDay ? 'Half Day' : a.isPresent ? 'Present' : 'Absent'),
                Hours: hours,
                Notes: a.notes || ''
            };
        }).sort((a, b) => b.Date.localeCompare(a.Date));

        const columns = [
            { header: 'Date', key: 'Date' },
            { header: 'Worker', key: 'Worker' },
            { header: 'Project', key: 'Project' },
            { header: 'Status', key: 'Status' },
            { header: 'Hours', key: 'Hours' },
            { header: 'Notes', key: 'Notes' }
        ];

        const title = 'Worker Attendance Detailed Logs';
        const fileName = 'Attendance_Records';

        setIsLoadingExport(true);
        try {
            if (format === 'pdf') await exportToPDF({ title, data: exportData, columns, fileName });
            else if (format === 'excel') exportToExcel({ title, data: exportData, columns, fileName });
            else if (format === 'word') await exportToWord({ title, data: exportData, columns, fileName });
            else if (format === 'csv') exportToCSV(exportData, fileName);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingExport(false);
        }
    }

    const monthName = currentDate.toLocaleString(i18n.language === 'sn' ? 'si-LK' : 'en-US', { month: 'long', year: 'numeric' });
    const TRANSLATED_DAYS = [
        t('days.sun') || 'Sun', t('days.mon') || 'Mon', t('days.tue') || 'Tue',
        t('days.wed') || 'Wed', t('days.thu') || 'Thu', t('days.fri') || 'Fri', t('days.sat') || 'Sat'
    ];

    const attendanceRecords = useMemo(() => {
        if (!selectedWorker) return [];
        return attendances.filter((a) => {
            const d = new Date(a.date);
            return a.workerId === selectedWorker.id && d.getMonth() === month && d.getFullYear() === year &&
                (!selectedProject || a.projectId === parseInt(selectedProject));
        });
    }, [selectedWorker, month, year, selectedProject, attendances]);

    function getDateStr(day) {
        return `${year} -${String(month + 1).padStart(2, '0')} -${String(day).padStart(2, '0')} `;
    }

    function getAttendance(day) {
        const dateStr = getDateStr(day);
        return attendanceRecords.find((a) => a.date === dateStr);
    }

    // derived state for assignment ranges (Array of {start, end})
    const assignmentRanges = useMemo(() => {
        if (!selectedWorker || !selectedProject) return [];
        // Find ALL assignments for this worker & project
        const assignments = projectWorkers.filter(pw => pw.workerId === selectedWorker.id && pw.projectId === parseInt(selectedProject));

        return assignments.map(a => ({
            start: a.assignedFrom ? new Date(a.assignedFrom) : null,
            end: a.assignedTo ? new Date(a.assignedTo) : null
        }));
    }, [selectedWorker, selectedProject, projectWorkers]);

    function isDateInAssignment(day) {
        if (assignmentRanges.length === 0) return false; // STRICT FIX: If no assignment record, BLOCK marking.
        // Actually, strictly speaking: if assignmentRanges is empty, it means "Not Assigned" to this project.
        // So we should probably return FALSE if we want to be strict.
        // But previously I said "if (!assignment) return null" -> "check if assignmentRange is null". 
        // If null, I returned true.
        // Let's keep that behavior: If NO assignments exist for this project, maybe it's an ad-hoc project?
        // But the user said "workers doesn't update... its locked". 
        // If they created an assignment, 'assignmentRanges' will have 1+ items.
        // So we just need to check if the day is in ANY of them.

        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);

        // Check if date falls in ANY range
        return assignmentRanges.some(range => {
            let afterStart = true;
            let beforeEnd = true;

            if (range.start) {
                const start = new Date(range.start);
                start.setHours(0, 0, 0, 0);
                if (date < start) afterStart = false;
            }

            if (range.end) {
                const end = new Date(range.end);
                end.setHours(0, 0, 0, 0);
                if (date > end) beforeEnd = false;
            }

            return afterStart && beforeEnd;
        });
    }

    async function markAttendance(day, isPresent, isHalfDay, hoursWorked) {
        if (!selectedWorker) return;

        const dateStr = getDateStr(day);
        const projId = selectedProject ? parseInt(selectedProject) : null;

        // STABILITY FIX: Prevent marking if outside assignment
        if (!isDateInAssignment(day)) {
            alert(t('attendance.error_no_assignment') || "Worker is not assigned to this project on this date.");
            return;
        }

        // DOUBLE ASSIGNMENT PREVENTION: Check if worker is assigned to ANOTHER project today
        const otherProjectAtt = attendances.find(a => a.date === dateStr && a.projectId !== projId && a.isPresent);
        if (otherProjectAtt) {
            const otherProj = projects.find(p => p.id === otherProjectAtt.projectId);
            alert(`${t('attendance.error_already_assigned') || "Worker is already marked present at"} ${otherProj?.name || 'another project'} ${t('attendance.on_this_date') || "on this date"}.`);
            return;
        }

        // Determine correct status string
        let statusStr = '';
        if (isPresent) {
            if (hoursWorked === 8 && !isHalfDay) statusStr = 'Present';
            else if (hoursWorked === 4 && isHalfDay) statusStr = 'Half Day';
            else statusStr = `${hoursWorked} h`;
        } else {
            statusStr = 'Absent';
        }

        const updateData = {
            workerId: selectedWorker.id,
            projectId: projId,
            date: dateStr,
            isPresent,
            isHalfDay: isPresent && hoursWorked === 4 && isHalfDay,
            hoursWorked,
            hours: null,
            status: statusStr
        };

        // Find existing record from local state first (fast)
        const existing = getAttendance(day);

        // OPTIMISTIC UPDATE: Update state immediately
        const tempId = existing ? existing.id : `temp - ${Date.now()} `;
        const previousAttendances = [...attendances];

        setAttendances(prev => {
            if (existing) {
                return prev.map(a => a.id === existing.id ? { ...updateData, id: existing.id } : a);
            } else {
                return [...prev, { ...updateData, id: tempId }].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
            }
        });

        try {
            if (existing && typeof existing.id === 'number') {
                // Direct update by known ID — no full table scan
                await update(KEYS.attendances, existing.id, updateData);
            } else {
                // Server-side check: prevent duplicate by querying worker+date
                const serverMatch = await queryEq(KEYS.attendances, 'workerId', selectedWorker.id);
                const exactMatch = serverMatch.find(a => a.date === dateStr && a.projectId === projId);

                if (exactMatch) {
                    await update(KEYS.attendances, exactMatch.id, updateData);
                } else {
                    await create(KEYS.attendances, updateData);
                }
            }
            // Silent refresh in background
            setRefreshKey((k) => k + 1);
            detectWorkerProjects(selectedWorker);
        } catch (error) {
            console.error('Attendance save error:', error);
            setAttendances(previousAttendances);
            alert("Failed to sync with database. Reverting changes.");
        }
    }

    async function clearAttendance(day) {
        const existing = getAttendance(day);
        if (existing && typeof existing.id === 'number') {
            const previousAttendances = [...attendances];

            // Optimistic remove from local state
            setAttendances(prev => prev.filter(a => a.id !== existing.id));

            try {
                await remove(KEYS.attendances, existing.id);
                setRefreshKey((k) => k + 1);
                detectWorkerProjects(selectedWorker);
            } catch (error) {
                console.error('Clear attendance error:', error);
                setAttendances(previousAttendances);
            }
        }
    }

    function handleContextMenu(e, day) {
        e.preventDefault();
        if (!selectedWorker) return;
        // Disable menu if not assigned
        if (!isDateInAssignment(day)) return;

        setShowCustomInput(false);
        setCustomHoursInput('');

        // Smart positioning to prevent overflow
        let x = e.clientX;
        let y = e.clientY;
        const menuWidth = 160; // Approximate width
        const menuHeight = 220; // Approximate height with all options

        if (x + menuWidth > window.innerWidth) {
            x -= menuWidth;
        }
        if (y + menuHeight > window.innerHeight) {
            y -= menuHeight;
        }

        setMenu({ day, x, y });
    }

    function handleLeftClick(day) {
        if (!selectedWorker || isLoading) return; // Prevent clicking while loading

        // Disable click if not assigned
        if (!isDateInAssignment(day)) return;

        const att = getAttendance(day);

        // Cycle: Empty -> Full (8h) -> Half (4h) -> Absent (0h) -> Empty
        if (!att) {
            // Empty -> Full
            markAttendance(day, true, false, 8);
        } else if (att.isPresent && !att.isHalfDay) {
            // Full -> Half
            markAttendance(day, true, true, 4);
        } else if (att.isHalfDay) {
            // Half -> Absent
            markAttendance(day, false, false, 0);
        } else {
            // Absent (or anything else) -> Empty (Clear)
            // Actually, for "Absent" we might want to go back to "Empty" (delete/clear) 
            // OR go back to "Full". Let's go to Empty (Clear) to match the cycle description.
            // But wait, "Absent" is a valid state (0 hours, but recorded). 
            // If user wants to *remove* the record, that's different.
            // Let's make the cycle: Full -> Half -> Absent -> Full (loop)
            // And right-click to clear? Or keep it simple.

            // Current user request suggests they want "Absent" to count as 0.
            // Let's cycle: Full -> Half -> Absent -> Clear (delete) -> Full...

            if (att.isPresent === false) {
                // Absent -> Clear
                // To "delete", we can just mark as not present / 0 hours, OR actually remove it.
                // db.js doesn't have a 'remove' exposed here easily without ID.
                // Let's just mark it as "Absent" again or cycle back to Full?
                // Let's cycle back to Full for ease of use.
                markAttendance(day, true, false, 8);
            } else {
                markAttendance(day, false, false, 0);
            }
        }
    }

    function closeMenu() {
        setMenu(null);
        setShowCustomInput(false);
        setCustomHoursInput('');
    }

    function handleMenuAction(action) {
        if (!menu) return;
        const { day } = menu;
        switch (action) {
            case 'full':
                markAttendance(day, true, false, 8);
                closeMenu();
                break;
            case 'half':
                markAttendance(day, true, true, 4);
                closeMenu();
                break;
            case 'absent':
                markAttendance(day, false, false, 0);
                closeMenu();
                break;
            case 'custom':
                setShowCustomInput(true);
                break;
            case 'clear':
                clearAttendance(day);
                closeMenu();
                break;
            default:
                break;
        }
    }

    function submitCustomHours() {
        if (!menu) return;
        const hours = parseFloat(customHoursInput);
        if (isNaN(hours) || hours <= 0 || hours > 24) return;
        markAttendance(menu.day, true, false, hours); // Pass false for isHalfDay, markAttendance will handle formatting
        closeMenu();
    }

    function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)); }
    function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)); }

    const filteredWorkers = workers.filter((w) => w.fullName.toLowerCase().includes(search.toLowerCase()));
    const today = new Date();
    const presentDays = attendanceRecords.filter((a) => a.isPresent && !a.isHalfDay).length;
    const halfDays = attendanceRecords.filter((a) => a.isHalfDay).length;
    const absentDays = attendanceRecords.filter((a) => !a.isPresent && !a.isHalfDay && a.hoursWorked === 0).length;
    const totalHours = attendanceRecords.reduce((s, a) => s + (a.hoursWorked || 0), 0);

    const calendarCells = [];
    for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

    if (!hasRole(['Super Admin', 'Finance', 'Project Manager', 'Site Supervisor'])) {
        return (
            <div className="attendance-page flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <Card>
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                        <Shield size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
                        <h2 style={{ color: 'var(--text-color)', marginBottom: 8 }}>Access Denied</h2>
                        <p>This module is for internal operational management and is not accessible to your role.</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <GlobalLoadingOverlay loading={isLoading} message="Analysing Attendance Records...">
            <div className="attendance-page">
                <div className="page-header">
                    <h1>{t('attendance.title')}</h1>
                    <ExportDropdown onExport={handleExport} isLoading={isLoadingExport} />
                </div>

                <div className="attendance-layout">
                    <Card title={t('workers.title')}>
                        <input placeholder={t('common.search') + "..."} value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
                        <div className="worker-search-list" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {filteredWorkers.map((w) => {
                                // Quick check if this worker has any project assigned
                                const wAtt = attendances.filter((a) => a.workerId === w.id);
                                const latestProjectId = wAtt.length > 0
                                    ? wAtt.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.projectId
                                    : null;
                                const latestProject = latestProjectId ? projects.find((p) => p.id === latestProjectId) : null;
                                return (
                                    <div key={w.id} className={`worker - item ${selectedWorker?.id === w.id ? 'active' : ''} `} onClick={() => handleSelectWorker(w)}>
                                        <div className="worker-item-info">
                                            <span>{w.fullName}</span>
                                            {latestProject && (
                                                <span className="worker-project-hint">{latestProject.name}</span>
                                            )}
                                        </div>
                                        <span className="worker-role-tag">{w.role}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card>
                        <div className="attendance-controls">
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div className="form-group" style={{ margin: 0, minWidth: 200 }}>
                                    <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                                        <option value="">{t('attendance.all_projects') || t('common.all')}</option>
                                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="month-nav">
                                    <BounceButton onClick={prevMonth}><ChevronLeft size={18} /></BounceButton>
                                    <span className="month-label">{monthName}</span>
                                    <BounceButton onClick={nextMonth}><ChevronRight size={18} /></BounceButton>
                                </div>
                            </div>

                            <div className="legend">
                                <span><span className="legend-dot present" /> {t('attendance.present')}</span>
                                <span><span className="legend-dot half" /> {t('attendance.half_day')}</span>
                                <span><span className="legend-dot custom" /> {t('attendance.overtime')}</span>
                                <span><span className="legend-dot absent" /> {t('attendance.absent')}</span>
                            </div>
                        </div>

                        {/* Smart Project Assignment Card */}
                        {selectedWorker && workerAssignments.length > 0 && (
                            <div className="worker-assignments-card">
                                <div className="assignments-header">
                                    <Briefcase size={16} />
                                    <span>{selectedWorker.fullName}{t('attendance.worker_assignments_suffix') || "'s Project Assignments"}</span>
                                </div>
                                <div className="assignments-list">
                                    {workerAssignments.map((a) => (
                                        <div
                                            key={a.projectId}
                                            className={`assignment - item ${String(a.projectId) === selectedProject ? 'active' : ''} `}
                                            onClick={() => setSelectedProject(String(a.projectId))}
                                        >
                                            <div className="assignment-main">
                                                <div className="assignment-name">{a.projectName}</div>
                                                <span className={`badge ${a.projectStatus === 'Ongoing' ? 'badge-info' : a.projectStatus === 'Completed' ? 'badge-success' : 'badge-warning'} `}>
                                                    {a.projectStatus}
                                                </span>
                                            </div>
                                            <div className="assignment-details">
                                                {a.client && <span className="assignment-detail"><Briefcase size={12} /> {a.client}</span>}
                                                {a.firstDate && (
                                                    <span className="assignment-detail">
                                                        <CalendarDays size={12} />
                                                        {new Date(a.firstDate).toLocaleDateString(i18n.language === 'sn' ? 'si-LK' : 'en-US', { month: 'short', day: 'numeric' })}
                                                        {a.lastDate && a.lastDate !== a.firstDate && ` → ${new Date(a.lastDate).toLocaleDateString(i18n.language === 'sn' ? 'si-LK' : 'en-US', { month: 'short', day: 'numeric' })} `}
                                                    </span>
                                                )}
                                                <span className="assignment-detail"><Clock size={12} /> {a.daysWorked} {t('attendance.days')} · {a.totalHours}{t('attendance.hours_short')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedWorker && (
                            <div className="attendance-summary-bar">
                                <div className="summary-chip present">{t('attendance.present')}: <strong>{presentDays}</strong></div>
                                <div className="summary-chip half">{t('attendance.half_day')}: <strong>{halfDays}</strong></div>
                                <div className="summary-chip absent">{t('attendance.absent')}: <strong>{absentDays}</strong></div>
                                <div className="summary-chip hours">{t('attendance.hours')}: <strong>{totalHours}</strong></div>
                            </div>
                        )}

                        <div className="attendance-hint">
                            {selectedWorker
                                ? t('attendance.hint_active') || '💡 Left-click to quick toggle  •  Right-click for options'
                                : t('attendance.hint_empty') || 'Select a worker to view / mark attendance'}
                        </div>

                        {selectedWorker && (
                            <div className="calendar-grid">
                                {TRANSLATED_DAYS.map((d) => <div key={d} className="calendar-header">{d}</div>)}
                                {calendarCells.map((day, i) => {
                                    if (day === null) return <div key={`e${i} `} className="calendar-day empty" />;

                                    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                                    const att = getAttendance(day);
                                    const isAssigned = isDateInAssignment(day);

                                    let statusClass = 'calendar-day';
                                    if (isToday) statusClass += ' today';

                                    if (!isAssigned) statusClass += ' not-assigned';
                                    else if (att?.isPresent && !att.isHalfDay) statusClass += ' present';
                                    else if (att?.isHalfDay) statusClass += ' half-day';
                                    else if (att?.isPresent && att?.status?.endsWith('h')) statusClass += ' custom-hours';
                                    else if (att && !att.isPresent) statusClass += ' absent';

                                    return (
                                        <div
                                            key={i}
                                            className={statusClass}
                                            onClick={() => handleLeftClick(day)}
                                            onContextMenu={(e) => handleContextMenu(e, day)}
                                        >
                                            <span className="day-number">{day}</span>
                                            {att && att.status && (
                                                <span className="atten-status">
                                                    {att.status === 'Present' ? t('attendance.present_short') || 'P' :
                                                        att.status === 'Half Day' ? t('attendance.half_day_short') || 'H' :
                                                            att.status === 'Absent' ? t('attendance.absent_short') || 'A' :
                                                                att.status}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right-click context menu */}
                {menu && (
                    <div
                        ref={menuRef}
                        className="attendance-context-menu"
                        style={{ top: menu.y, left: menu.x }}
                    >
                        <div className="ctx-menu-header">{t('common.date')} {menu.day} — {selectedWorker?.fullName}</div>
                        <BounceButton className="ctx-menu-item present" onClick={() => handleMenuAction('full')}>
                            <span className="ctx-dot present" /> {t('attendance.present')} (8h)
                        </BounceButton>
                        <BounceButton className="ctx-menu-item half" onClick={() => handleMenuAction('half')}>
                            <span className="ctx-dot half" /> {t('attendance.half_day')} (4h)
                        </BounceButton>
                        <BounceButton className="ctx-menu-item absent" onClick={() => handleMenuAction('absent')}>
                            <span className="ctx-dot absent" /> {t('attendance.absent')}
                        </BounceButton>
                        <div className="ctx-menu-divider" />
                        {!showCustomInput ? (
                            <BounceButton className="ctx-menu-item custom" onClick={() => handleMenuAction('custom')}>
                                <span className="ctx-dot custom" /> {t('attendance.overtime')}...
                            </BounceButton>
                        ) : (
                            <div className="ctx-custom-input">
                                <input
                                    type="number"
                                    min="0.5"
                                    max="24"
                                    step="0.5"
                                    placeholder={t('attendance.hours') + " (e.g. 6)"}
                                    value={customHoursInput}
                                    onChange={(e) => setCustomHoursInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && submitCustomHours()}
                                    autoFocus
                                />
                                <BounceButton className="btn btn-primary btn-sm" onClick={submitCustomHours}>{t('common.save')}</BounceButton>
                            </div>
                        )}
                        <div className="ctx-menu-divider" />
                        <BounceButton className="ctx-menu-item clear" onClick={() => handleMenuAction('clear')}>
                            ✕ {t('common.clear')}
                        </BounceButton>
                    </div>
                )}
            </div>
        </GlobalLoadingOverlay>
    );
}
