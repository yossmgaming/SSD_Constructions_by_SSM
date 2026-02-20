const fs = require('fs');
const file = 'e:/My software Projects/SSD Constructions - react app/Custom software Main Functions/MainFunctions/ssd-react/src/pages/Attendance.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `    const [showCustomInput, setShowCustomInput] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const menuRef = useRef(null);

    useEffect(() => {
        setWorkers(getAll(KEYS.workers));
        setProjects(getAll(KEYS.projects));
    }, []);`,
    `    const [showCustomInput, setShowCustomInput] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [attendances, setAttendances] = useState([]);
    const [projectWorkers, setProjectWorkers] = useState([]);
    const menuRef = useRef(null);

    useEffect(() => {
        loadBaseData();
    }, [refreshKey]);

    async function loadBaseData() {
        setIsLoading(true);
        try {
            const [wrks, projs, atts, pws] = await Promise.all([
                getAll(KEYS.workers),
                getAll(KEYS.projects),
                getAll(KEYS.attendances),
                getAll(KEYS.projectWorkers)
            ]);
            setWorkers(wrks);
            setProjects(projs);
            setAttendances(atts);
            setProjectWorkers(pws);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }`
);

content = content.replace(
    `    // Auto-detect worker's project assignments
    const detectWorkerProjects = useCallback((worker) => {
        if (!worker) { setWorkerAssignments([]); return; }
        const allAtt = getAll(KEYS.attendances).filter((a) => a.workerId === worker.id);
        const allProjects = getAll(KEYS.projects);
        const projectWorkers = getAll(KEYS.projectWorkers).filter((pw) => pw.workerId === worker.id);

        // Group attendance by project
        const projectMap = {};
        allAtt.forEach((a) => {
            if (!a.projectId) return;
            if (!projectMap[a.projectId]) projectMap[a.projectId] = { projectId: a.projectId, dates: [], hours: 0 };
            projectMap[a.projectId].dates.push(a.date);
            projectMap[a.projectId].hours += (a.hoursWorked || a.hours || 0);
        });

        // Also include projectWorker assignments even if no attendance yet
        projectWorkers.forEach((pw) => {
            if (!projectMap[pw.projectId]) projectMap[pw.projectId] = { projectId: pw.projectId, dates: [], hours: 0 };
        });`,
    `    // Auto-detect worker's project assignments
    const detectWorkerProjects = useCallback(async (worker) => {
        if (!worker) { setWorkerAssignments([]); return; }
        
        setIsLoading(true);
        try {
            // Need latest data for this detection
            const [allAtt, allProjects, allPWs] = await Promise.all([
                getAll(KEYS.attendances),
                getAll(KEYS.projects),
                getAll(KEYS.projectWorkers)
            ]);
            
            const workerAtt = allAtt.filter((a) => a.workerId === worker.id);
            const workerPWs = allPWs.filter((pw) => pw.workerId === worker.id);

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
            });`
);

content = content.replace(
    `        // Auto-select the most recent project
        if (assignments.length > 0) {
            setSelectedProject(String(assignments[0].projectId));
        } else {
            setSelectedProject('');
        }
    }, []);`,
    `        // Auto-select the most recent project
        if (assignments.length > 0) {
            setSelectedProject(String(assignments[0].projectId));
        } else {
            setSelectedProject('');
        }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);`
);

content = content.replace(
    `    // Auto-refresh when window gains focus (in case user updated workers in another tab)
    useEffect(() => {
        function onFocus() {
            setRefreshKey(k => k + 1);
            setWorkers(getAll(KEYS.workers)); // Also refresh workers list
            setProjects(getAll(KEYS.projects)); // And projects
            if (selectedWorker) detectWorkerProjects(selectedWorker); // And assignments
        }
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [selectedWorker, detectWorkerProjects]);`,
    `    // Auto-refresh when window gains focus (in case user updated workers in another tab)
    useEffect(() => {
        function onFocus() {
            setRefreshKey(k => k + 1);
            if (selectedWorker) detectWorkerProjects(selectedWorker); // Refresh assignments
        }
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [selectedWorker, detectWorkerProjects]);`
);

content = content.replace(
    `    const attendanceRecords = useMemo(() => {
        if (!selectedWorker) return [];
        return query(KEYS.attendances, (a) => {
            const d = new Date(a.date);
            return a.workerId === selectedWorker.id && d.getMonth() === month && d.getFullYear() === year &&
                (!selectedProject || a.projectId === parseInt(selectedProject));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWorker, month, year, selectedProject, refreshKey]);`,
    `    const attendanceRecords = useMemo(() => {
        if (!selectedWorker) return [];
        return attendances.filter((a) => {
            const d = new Date(a.date);
            return a.workerId === selectedWorker.id && d.getMonth() === month && d.getFullYear() === year &&
                (!selectedProject || a.projectId === parseInt(selectedProject));
        });
    }, [selectedWorker, month, year, selectedProject, attendances]);`
);

content = content.replace(
    `    // derived state for assignment ranges (Array of {start, end})
    const assignmentRanges = useMemo(() => {
        if (!selectedWorker || !selectedProject) return [];
        const pws = getAll(KEYS.projectWorkers);
        // Find ALL assignments for this worker & project
        const assignments = pws.filter(pw => pw.workerId === selectedWorker.id && pw.projectId === parseInt(selectedProject));

        return assignments.map(a => ({
            start: a.assignedFrom ? new Date(a.assignedFrom) : null,
            end: a.assignedTo ? new Date(a.assignedTo) : null
        }));
    }, [selectedWorker, selectedProject, refreshKey]);`,
    `    // derived state for assignment ranges (Array of {start, end})
    const assignmentRanges = useMemo(() => {
        if (!selectedWorker || !selectedProject) return [];
        // Find ALL assignments for this worker & project
        const assignments = projectWorkers.filter(pw => pw.workerId === selectedWorker.id && pw.projectId === parseInt(selectedProject));

        return assignments.map(a => ({
            start: a.assignedFrom ? new Date(a.assignedFrom) : null,
            end: a.assignedTo ? new Date(a.assignedTo) : null
        }));
    }, [selectedWorker, selectedProject, projectWorkers]);`
);

content = content.replace(
    `    function markAttendance(day, isPresent, isHalfDay, hoursWorked) {
        if (!selectedWorker) return;

        // STABILITY FIX: Prevent marking if outside assignment
        if (!isDateInAssignment(day)) {
            alert("Worker is not assigned to the project on this date.");
            return;
        }

        const dateStr = getDateStr(day);

        // Find existing record for this specific day/project to update
        // We use query instead of getAttendance to be sure we get the exact DB record
        const existing = getAttendance(day);

        const updateData = {
            workerId: selectedWorker.id,
            projectId: selectedProject ? parseInt(selectedProject) : null,
            date: dateStr,
            isPresent,
            isHalfDay,
            hoursWorked,
            // Explicitly clear legacy fields if they exist to prevent calculation errors
            hours: null,
            status: isPresent ? (isHalfDay ? 'Half Day' : 'Present') : 'Absent'
        };

        if (existing) {
            upsert(KEYS.attendances, (a) => a.id === existing.id, updateData);
        } else {
            upsert(KEYS.attendances, () => false, updateData);
        }
        setRefreshKey((k) => k + 1);
        detectWorkerProjects(selectedWorker); // Refresh project assignments
    }`,
    `    async function markAttendance(day, isPresent, isHalfDay, hoursWorked) {
        if (!selectedWorker) return;

        // STABILITY FIX: Prevent marking if outside assignment
        if (!isDateInAssignment(day)) {
            alert("Worker is not assigned to the project on this date.");
            return;
        }

        const dateStr = getDateStr(day);

        // Find existing record for this specific day/project to update
        const existing = getAttendance(day);

        const updateData = {
            workerId: selectedWorker.id,
            projectId: selectedProject ? parseInt(selectedProject) : null,
            date: dateStr,
            isPresent,
            isHalfDay,
            hoursWorked,
            // Explicitly clear legacy fields if they exist to prevent calculation errors
            hours: null,
            status: isPresent ? (isHalfDay ? 'Half Day' : 'Present') : 'Absent'
        };

        setIsLoading(true);
        try {
            if (existing) {
                await upsert(KEYS.attendances, (a) => a.id === existing.id, updateData);
            } else {
                await upsert(KEYS.attendances, () => false, updateData);
            }
            setRefreshKey((k) => k + 1);
            await detectWorkerProjects(selectedWorker); // Refresh project assignments
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }`
);

content = content.replace(
    `    function clearAttendance(day) {
        // Allow clearing even if outside assignment? Probably yes, to fix mistakes.
        // But technically if they aren't assigned, they shouldn't have attendance.
        // Let's allow clearing to be safe.
        const existing = getAttendance(day);
        if (existing) {
            upsert(KEYS.attendances, (a) => a.id === existing.id, {
                isPresent: false,
                isHalfDay: false,
                hoursWorked: 0,
                hours: null,
                status: 'Absent'
            });
        }
        setRefreshKey((k) => k + 1);
        detectWorkerProjects(selectedWorker);
    }`,
    `    async function clearAttendance(day) {
        const existing = getAttendance(day);
        if (existing) {
            setIsLoading(true);
            try {
                await upsert(KEYS.attendances, (a) => a.id === existing.id, {
                    isPresent: false,
                    isHalfDay: false,
                    hoursWorked: 0,
                    hours: null,
                    status: 'Absent'
                });
                setRefreshKey((k) => k + 1);
                await detectWorkerProjects(selectedWorker);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
    }`
);

content = content.replace(
    `    function handleLeftClick(day) {
        if (!selectedWorker) return;

        // Disable click if not assigned
        if (!isDateInAssignment(day)) return;`,
    `    function handleLeftClick(day) {
        if (!selectedWorker || isLoading) return; // Prevent clicking while loading

        // Disable click if not assigned
        if (!isDateInAssignment(day)) return;`
);

content = content.replace(
    `        <div className="attendance-page">
            <div className="page-header"><h1>Attendance</h1></div>

            <div className="attendance-layout">`,
    `        <div className="attendance-page">
            <div className="page-header"><h1>Attendance</h1></div>
            {isLoading && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading database...</div>}

            <div className="attendance-layout">`
);

content = content.replace(
    `                        {filteredWorkers.map((w) => {
                            // Quick check if this worker has any project assigned
                            const wAtt = getAll(KEYS.attendances).filter((a) => a.workerId === w.id);
                            const latestProjectId = wAtt.length > 0
                                ? wAtt.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.projectId`,
    `                        {filteredWorkers.map((w) => {
                            // Quick check if this worker has any project assigned
                            const wAtt = attendances.filter((a) => a.workerId === w.id);
                            const latestProjectId = wAtt.length > 0
                                ? wAtt.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.projectId`
);

if (content.indexOf('Loading database') > -1) {
    fs.writeFileSync(file, content);
    console.log('✅ Changes applied via script');
} else {
    console.log('❌ Failed to apply changes');
}
