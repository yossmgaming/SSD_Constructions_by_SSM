const fs = require('fs');
const file = 'e:/My software Projects/SSD Constructions - react app/Custom software Main Functions/MainFunctions/ssd-react/src/pages/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /    const \[payments, setPayments\] = useState\(\[\]\);\s+const \[activities, setActivities\] = useState\(\[\]\);\s+useEffect\(\(\) => { loadData\(\); }, \[\]\);/g,
    `    const [payments, setPayments] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { loadData(); }, []);`
);

content = content.replace(
    /    function loadData\(\) \{\s+const p = getAll\(KEYS\.projects\);\s+const w = getAll\(KEYS\.workers\);\s+const m = getAll\(KEYS\.materials\);\s+const pay = getAll\(KEYS\.payments\);\s+setProjects\(p\);\s+setWorkers\(w\);\s+setMaterials\(m\);\s+setPayments\(pay\);/g,
    `    async function loadData() {
        setIsLoading(true);
        try {
            const [p, w, m, pay] = await Promise.all([
                getAll(KEYS.projects),
                getAll(KEYS.workers),
                getAll(KEYS.materials),
                getAll(KEYS.payments)
            ]);
            setProjects(p);
            setWorkers(w);
            setMaterials(m);
            setPayments(pay);`
);

content = content.replace(
    /        setActivities\(feed\.slice\(0, 8\)\.map\(\(a\) => \(\{ \.\.\.a, time: timeAgo\(a\.time\) \}\)\)\);\s+\}/g,
    `        setActivities(feed.slice(0, 8).map((a) => ({ ...a, time: timeAgo(a.time) })));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }`
);

content = content.replace(
    /                <BounceButton className="btn btn-primary" onClick=\{loadData\}>Refresh<\/BounceButton>\s+<\/div>/g,
    `                <BounceButton disabled={isLoading} className="btn btn-primary" onClick={loadData}>Refresh</BounceButton>
            </div>
            {isLoading && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading database...</div>}`
);

fs.writeFileSync(file, content);
console.log('Modified Dashboard.jsx to async');
