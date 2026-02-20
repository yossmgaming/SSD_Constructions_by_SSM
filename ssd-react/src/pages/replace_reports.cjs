const fs = require('fs');
const file = 'e:/My software Projects/SSD Constructions - react app/Custom software Main Functions/MainFunctions/ssd-react/src/pages/Reports.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /    const projects = useMemo\(\(\) => getAll\(KEYS\.projects\), \[\]\);\s+const workers = useMemo\(\(\) => getAll\(KEYS\.workers\), \[\]\);\s+const materials = useMemo\(\(\) => getAll\(KEYS\.materials\), \[\]\);\s+const suppliers = useMemo\(\(\) => getAll\(KEYS\.suppliers\), \[\]\);\s+const allPayments = useMemo\(\(\) => getAll\(KEYS\.payments\), \[\]\);\s+const allAttendance = useMemo\(\(\) => getAll\(KEYS\.attendances\), \[\]\);/,
    `    const [projects, setProjects] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [allAttendance, setAllAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setIsLoading(true);
        try {
            const [projs, wrks, mats, sups, pays, atts] = await Promise.all([
                getAll(KEYS.projects),
                getAll(KEYS.workers),
                getAll(KEYS.materials),
                getAll(KEYS.suppliers),
                getAll(KEYS.payments),
                getAll(KEYS.attendances)
            ]);
            setProjects(projs);
            setWorkers(wrks);
            setMaterials(mats);
            setSuppliers(sups);
            setAllPayments(pays);
            setAllAttendance(atts);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }`
);

content = content.replace(
    /        <div className="reports-page">\s+<div className="page-header"><h1>Reports & Analytics<\/h1><\/div>\s+<!-- Filters -->/,
    `        <div className="reports-page">
            <div className="page-header"><h1>Reports & Analytics</h1></div>
            {isLoading && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading database...</div>}

            {/* Filters */}`
);

fs.writeFileSync(file, content);
console.log('Done replacing in Reports.jsx');
