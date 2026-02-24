import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import ExportDropdown from '../components/ExportDropdown';
import { getAll, create, update, KEYS } from '../data/db';
import { exportAgreementData } from '../utils/exportUtils';
import './AgreementGenerator.css';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';
import { CheckCircle2Icon, SaveIcon, Plus } from 'lucide-react';
import { FileTextIcon } from '../components/icons/FileTextIcon';

export default function AgreementGenerator() {
    const { t } = useTranslation();
    const [type, setType] = useState('Client'); // 'Client', 'Worker', 'Supplier'
    const [clientSubType, setClientSubType] = useState('LetterOfAcceptance');
    const [entityId, setEntityId] = useState('');
    const [mouText, setMouText] = useState('');
    const [voDescription, setVoDescription] = useState('');
    const [voReason, setVoReason] = useState('Client Request');
    const [voCost, setVoCost] = useState('');
    const [voTime, setVoTime] = useState('');

    const [exportLanguage, setExportLanguage] = useState('en'); // 'en', 'sn', 'ta'
    const [selectedRuleSet, setSelectedRuleSet] = useState('Standard'); // 'Standard', 'Strict', 'Comprehensive'
    const [projects, setProjects] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [agreements, setAgreements] = useState([]);

    // Current Document State
    const [currentAgreement, setCurrentAgreement] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    // Signature State
    const [showSignModal, setShowSignModal] = useState(false);
    const [signName, setSignName] = useState('');

    const previewRef = useRef(null);
    const signIconRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        generatePreview();
    }, [type, clientSubType, mouText, voDescription, voReason, voCost, voTime, entityId, projects, workers, suppliers, exportLanguage, selectedRuleSet]);

    async function loadData() {
        setIsLoading(true);
        try {
            const [projs, wrks, sups, agrs] = await Promise.all([
                getAll(KEYS.projects),
                getAll(KEYS.workers),
                getAll(KEYS.suppliers),
                getAll(KEYS.agreements)
            ]);
            setProjects(projs.sort((a, b) => b.id - a.id));
            setWorkers(wrks.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')));
            setSuppliers(sups.sort((a, b) => (a.fullName || a.name || '').localeCompare(b.fullName || b.name || '')));
            setAgreements(agrs);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    // Generator function based on type and selected entity
    function generatePreview() {
        if (!entityId) {
            setCurrentAgreement(null);
            return;
        }

        let content = '';
        let title = '';
        let blockReason = null;
        let expectedTitlePart = '';

        // Helper to get translated strings for fixed labels based on exportLanguage
        const lex = {
            en: {
                date: 'Date',
                subject: 'Subject',
                parties: 'Parties',
                employer: 'Employer',
                employee: 'Employee',
                management: 'Management',
                supplier: 'Supplier',
                subcontractor: 'Subcontractor',
                client: 'Client',
                worker: 'Worker',
                accountant: 'Accountant',
                authorized: 'Authorized Signatory',
                for: 'For',
                nic: 'NIC No',
                residing: 'residing at',
                probation: 'Probation and Termination',
                conduct: 'Operational Conduct & Safety',
                statutory: 'Statutory Contributions',
                remuneration: 'Remuneration',
                position: 'Position and Grade',
                roles: {
                    mason: 'Mason',
                    carpenter: 'Carpenter',
                    helper: 'Helper',
                    supervisor: 'Supervisor',
                    engineer: 'Engineer',
                    driver: 'Driver',
                    accountant: 'Accountant',
                    manager: 'Manager'
                },
                rules: {
                    biometric: 'Attendance Tracking: The Employee is explicitly responsible for verifying all subordinate worker attendance using the biometric/system verification to eliminate time theft and "buddy punching."',
                    logs: 'Daily Digital Logs: The Employee mandates the submission of daily digital logs through the application, verifying weather, headcount, and work progress summaries.',
                    safety: 'Personal Protective Equipment (PPE) is mandatory at all times on site. Repeated safety violations will result in dismissal.',
                    arbitration: 'Dispute Resolution: Any dispute arising out of this agreement shall be settled through arbitration under the Arbitration Act No. 11 of 1995.',
                    confidentiality: 'Confidentiality: The parties shall maintain strict confidentiality regarding project pricing, BOQ rates, and internal construction methodologies.',
                    insurance: 'Insurance & Liability: The Employer maintains Workmen Compensation Insurance, but any damage caused by the gross negligence of the Employee shall be recoverable from wages.'
                }
            },
            sn: {
                date: 'දිනය',
                subject: 'විෂය',
                parties: 'පාර්ශවයන්',
                employer: 'සේව්‍යයා',
                employee: 'සේවකයා',
                management: 'කළමනාකරණය',
                supplier: 'සැපයුම්කරු',
                subcontractor: 'අනුකොන්ත්‍රාත්කරු',
                client: 'සේවාදායකයා',
                worker: 'සේවකයා',
                accountant: 'ගණකාධිකාරී',
                authorized: 'බලයලත් අත්සන',
                for: 'සඳහා',
                nic: 'ජාතික හැඳුනුම්පත් අංකය',
                residing: 'පදිංචි ලිපිනය',
                probation: 'පරිවාස කාලය සහ සේවය අවසන් කිරීම',
                conduct: 'මෙහෙයුම් හැසිරීම සහ ආරක්ෂාව',
                statutory: 'ව්‍යවස්ථාපිත දායකත්වයන්',
                remuneration: 'ප්‍රතිලාභ',
                position: 'තනතුර සහ ශ්‍රේණිය',
                roles: {
                    mason: 'මේසන්',
                    carpenter: 'වඩුවා',
                    helper: 'සහායක',
                    supervisor: 'සුපරීක්ෂක',
                    engineer: 'ඉංජිනේරු',
                    driver: 'රියදුරු',
                    accountant: 'ගණකාධිකාරී',
                    manager: 'කළමනාකරු'
                },
                rules: {
                    biometric: 'පැමිණීම ලුහුබැඳීම: ජෛවමිතික/පද්ධති සත්‍යාපනය භාවිතා කරමින් සියලුම යටත් සේවකයින්ගේ පැමිණීම තහවුරු කිරීම සඳහා සේවකයා පැහැදිලිවම වගකිව යුතුය.',
                    logs: 'දෛනික ඩිජිටල් සටහන්: යෙදුම හරහා දෛනික ඩිජිටල් සටහන් ඉදිරිපත් කිරීම සේවකයා විසින් අනිවාර්ය කරනු ලැබේ.',
                    safety: 'පුද්ගලික ආරක්ෂක උපකරණ (PPE) සෑම විටම අනිවාර්ය වේ. ආරක්ෂක නීති නැවත නැවතත් උල්ලංඝනය කිරීම සේවයෙන් ඉවත් කිරීමට හේතු වේ.',
                    arbitration: 'ආරවුල් නිරාකරණය: මෙම ගිවිසුමෙන් පැන නගින ඕනෑම ආරවුලක් 1995 අංක 11 දරණ බේරුම්කරණ පනත යටතේ විසඳිය යුතුය.',
                    confidentiality: 'රහස්‍යභාවය: ව්‍යාපෘති මිලකරණය සහ අභ්‍යන්තර ඉදිකිරීම් ක්‍රමවේද පිළිබඳව පාර්ශවයන් දැඩි රහස්‍යභාවයක් පවත්වා ගත යුතුය.',
                    insurance: 'රක්ෂණය සහ වගකීම: සේව්‍යයා සේවක වන්දි රක්ෂණයක් පවත්වාගෙන යනු ලබන අතර, සේවකයාගේ නොසැලකිල්ල නිසා සිදුවන හානිය වැටුපෙන් අය කරගත හැක.'
                }
            },
            ta: {
                date: 'தேதி',
                subject: 'பொருள்',
                parties: 'தரப்பினர்',
                employer: 'வேலை வழங்குபவர்',
                employee: 'ஊழியர்',
                management: 'நிர்வாகம்',
                supplier: 'வழங்குநர்',
                subcontractor: 'உள் ஒப்பந்ததாரர்',
                client: 'வாடிக்கையாளர்',
                worker: 'தொழிலாளி',
                accountant: 'கணக்காளர்',
                authorized: 'அங்கீகரிக்கப்பட்ட கையொப்பம்',
                for: 'சார்பாக',
                nic: 'தேசிய அடையாள அட்டை எண்',
                residing: 'முகவரி',
                probation: 'ஆய்வுக் காலம் மற்றும் பணி நீக்கம்',
                conduct: 'செயல்பாட்டு நடத்தை மற்றும் பாதுகாப்பு',
                statutory: 'சட்டரீதியான பங்களிப்புகள்',
                remuneration: 'ஊதியம்',
                position: 'பதவி மற்றும் தரம்',
                roles: {
                    mason: 'மேசன்',
                    carpenter: 'தச்சர்',
                    helper: 'உதவியாளர்',
                    supervisor: 'மேற்பார்வையாளர்',
                    engineer: 'பொறியாளர்',
                    driver: 'ஓட்டுநர்',
                    accountant: 'கணக்காளர்',
                    manager: 'மேலாளர்'
                },
                rules: {
                    biometric: 'வருகை கண்காணிப்பு: பயோமெட்ரிக் முறையைப் பயன்படுத்தி அனைத்து தொழிலாளர்களின் வருகையையும் சரிபார்க்க ஊழியர் பொறுப்பு.',
                    logs: 'டிஜிட்டல் பதிவுகள்: விண்ணப்பம் மூலம் தினசரி டிஜிட்டல் பதிவுகளை சமர்ப்பிப்பதை ஊழியர் கட்டாயமாக்குகிறார்.',
                    safety: 'தனிப்பட்ட பாதுகாப்பு உபகரணங்கள் (PPE) தளத்தில் எப்போதும் கட்டாயமாகும். பாதுகாப்பு மீறல்கள் பணிநீக்கத்திற்கு வழிவகுக்கும்.',
                    arbitration: 'சர்ச்சை தீர்வு: இந்த ஒப்பந்தத்தின் மூலம் ஏற்படும் சர்ச்சைகள் 1995 ஆம் ஆண்டின் 11 ஆம் எண் நடுவர் சட்டத்தின் கீழ் தீர்க்கப்படும்.',
                    confidentiality: 'ரகசியத்தன்மை: திட்ட விலை மற்றும் கட்டுமான முறைகள் குறித்து தரப்பினர் ரகசியத்தை பேண வேண்டும்.',
                    insurance: 'காப்பீடு மற்றும் பொறுப்பு: ஊழியரின் அலட்சியத்தால் ஏற்படும் சேதங்கள் ஊதியத்தில் இருந்து வசூலிக்கப்படும்.'
                }
            }
        };

        const l = lex[exportLanguage] || lex.en;

        if (type === 'Client') {
            const project = projects.find(p => String(p.id) === String(entityId));
            if (!project) return;

            let subTitle = '';
            if (clientSubType === 'LetterOfAcceptance') subTitle = exportLanguage === 'en' ? 'Letter of Acceptance' : exportLanguage === 'sn' ? 'පිළිගැනීමේ ලිපිය' : 'ஏற்பு கடிதம்';
            if (clientSubType === 'ContractAgreement') subTitle = exportLanguage === 'en' ? 'Contract Agreement' : exportLanguage === 'sn' ? 'ගිවිසුම' : 'ஒப்பந்தம்';
            if (clientSubType === 'MOU') subTitle = 'MOU';
            if (clientSubType === 'AcceptedBOQ') subTitle = 'Accepted BOQ';
            if (clientSubType === 'ConditionsOfContract') subTitle = 'Conditions';
            if (clientSubType === 'VariationOrder') subTitle = 'Variation Order';

            title = `${subTitle} - ${project.name}`;
            expectedTitlePart = subTitle;
        } else if (type === 'Worker' || type === 'Management' || type === 'Accountant') {
            const worker = workers.find(w => String(w.id) === String(entityId));
            if (!worker) return;
            const subTitle = type === 'Worker' ? l.worker : type === 'Management' ? l.management : l.accountant;
            title = `${subTitle} Agreement - ${worker.fullName || worker.name}`;
            expectedTitlePart = subTitle;
        } else {
            const supplier = suppliers.find(s => String(s.id) === String(entityId));
            if (!supplier) return;
            const subTitle = type === 'Supplier' ? l.supplier : l.subcontractor;
            title = `${subTitle} Agreement - ${supplier.name}`;
            expectedTitlePart = subTitle;
        }

        // Check if an agreement already exists
        const existing = agreements.find(a => a.type === type && String(a.entityId) === String(entityId) && a.title.includes(expectedTitlePart) && (a.exportLanguage || 'en') === exportLanguage);

        // Whitespace scrubbing helper for templates
        const clean = (str) => str.replace(/\s+/g, ' ').trim();

        if (type === 'Client') {
            const project = projects.find(p => String(p.id) === String(entityId));
            const amt = Number(project.contractValue || 0);
            const isCIGFL = amt > 15000000;
            const isResidential = project.projectType === 'Residential';

            if (clientSubType === 'LetterOfAcceptance') {
                const levyPercent = amt > 50000000 ? 1 : 0.25;
                const perfSec = amt * 0.05;
                const ldPerDay = amt * 0.0005;

                let durationStr = "180";
                if (project.startDate && project.endDate) {
                    const start = new Date(project.startDate);
                    const end = new Date(project.endDate);
                    if (!isNaN(start) && !isNaN(end)) {
                        const diffTime = Math.abs(end - start);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays > 0) durationStr = String(diffDays);
                    }
                }

                if (exportLanguage === 'sn') {
                    content = `
                        <h1>ශ්‍රී ලංකා CIDA SBD-03 - පිළිගැනීමේ ලිපිය</h1>
                        <p><strong>දිනය:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>ලබන්නා:</strong> SSD CONSTRUCTIONS</p>
                        <p><strong>විෂය: ${project.name} සඳහා සම්මාන දැනුම්දීම</strong></p>
                        <p>ඔබ <strong>${project.name}</strong> ව්‍යාපෘතිය සඳහා ඉදිරිපත් කළ ලදු ස්ථිරව පිළිගනු ලැබූ බව දන්වා සිටිමු.</p>
                        <h2>1. ගිවිසුම් වටිනාකම</h2>
                        <p>පිළිගත් ගිවිසුම් මුදල <strong>LKR ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> වේ.</p>
                        <h2>2. ආරම්භ දිනය සහ ක්‍රියා ගැන්වීම</h2>
                        <p>ආරම්භ කිරීමේ ඵලදායී දිනය මෙම ලිපිය ලැබී දින 14 ක් ඇතුළත වේ. සේවා ස්ථානයට ජංගම හා කාර්ය මණ්ඩලය ගෙනයාම ප්‍රාරම්භ කළ යුතුය.</p>
                        <h2>3. සම්පූර්ණ කිරීමේ කාලය සහ ද්‍රව හානි</h2>
                        <p>කොන්ත්‍රාත්කරු <strong>දින ${durationStr}</strong> ඇතුළත කාර්යයන් සම්පූර්ණ කළ යුතුය.</p>
                        <p>ප්‍රමාද සිදු වුවහොත් <strong>ද්‍රව හානි (LKR ${ldPerDay.toLocaleString(undefined, { minimumFractionDigits: 2 })} )</strong> අය කෙරේ.</p>
                        <h2>4. කාර්යසාධන ඇපකරය</h2>
                        <p>ගිවිසුම් මුදලෙන් 5% (<strong>LKR ${perfSec.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>) ලෙස කාර්යසාධන ඇපකරය දින 14 ඇතුළත සපයා ගත යුතුය.</p>
                        ${isCIGFL ? `<h2>5. CIGFL ගාස්තු</h2><p>ව්‍යාපෘති අගය රු. ලක්ෂ 150 ඉක්මවන බැවින් ${levyPercent}% CIGFL ගාස්තු අය කෙරේ.</p>` : ''}
                    `;
                } else if (exportLanguage === 'ta') {
                    content = `
                        <h1>இலங்கை CIDA SBD-03 - ஏற்பு கடிதம்</h1>
                        <p><strong>தேதி:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>பெறுநர்:</strong> SSD CONSTRUCTIONS</p>
                        <p><strong>பொருள்: ${project.name} திட்டத்திற்கான விருது அறிவிப்பு</strong></p>
                        <p><strong>${project.name}</strong> திட்டத்திற்கான உங்கள் ஏலம் ஏற்றுக்கொள்ளப்பட்டது.</p>
                        <h2>1. ஒப்பந்த மதிப்பு</h2>
                        <p>ஒப்பந்த தொகை <strong>LKR ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.</p>
                        <h2>2. தொடக்க தேதி</h2>
                        <p>இக்கடிதம் பெற்ற 14 நாட்களுக்குள் தொடங்க வேண்டும்.</p>
                        <h2>3. முடிவு காலம் மற்றும் தாமத அபராதம்</h2>
                        <p><strong>${durationStr} நாட்களுக்குள்</strong> பணிகளை முடிக்க வேண்டும்.</p>
                        <p>தாமதம் ஏற்பட்டால் <strong>LKR ${ldPerDay.toLocaleString(undefined, { minimumFractionDigits: 2 })} / நாள்</strong> அபராதம் விதிக்கப்படும்.</p>
                        <h2>4. செயல்திறன் பத்திரம்</h2>
                        <p>5% (<strong>LKR ${perfSec.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>) 14 நாட்களுக்குள் செலுத்த வேண்டும்.</p>
                        ${isCIGFL ? `<h2>5. CIGFL வரி</h2><p>திட்ட மதிப்பு ரூ. 15 மில்லியனுக்கு மேல் உள்ளதால் ${levyPercent}% CIGFL கழிக்கப்படும்.</p>` : ''}
                    `;
                } else {
                    content = `
                        <h1>LETTER OF ACCEPTANCE</h1>
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>To:</strong> SSD CONSTRUCTIONS</p>
                        <p><strong>Subject: Notification of Award for ${project.name}</strong></p>
                        <p>This is to notify you that your bid for the execution of the <strong>${project.name}</strong> has been accepted.</p>
                        <h2>1. Contract Value</h2>
                        <p>The accepted Contract Sum is <strong>LKR ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.</p>
                        <h2>2. Effective Date & Mobilization</h2>
                        <p>The Effective Date of Commencement shall be 14 days from the date of this letter.</p>
                        <h2>3. Time for Completion & Liquidated Damages</h2>
                        <p>The Contractor shall complete Works within <strong>${durationStr} calendar days</strong>.</p>
                        <p>Liquidated Damages: <strong>0.05%/day (LKR ${ldPerDay.toLocaleString(undefined, { minimumFractionDigits: 2 })})</strong>, capped at 10%.</p>
                        <h2>4. Performance Security</h2>
                        <p>Furnish 5% (<strong>LKR ${perfSec.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>) within 14 days.</p>
                        ${isCIGFL ? `<h2>5. CIGFL Levy</h2><p>Finance Act No. 5 of 2005: ${levyPercent}% CIGFL levy applies.</p>` : ''}
                    `;
                }
            } else if (clientSubType === 'ContractAgreement') {
                if (exportLanguage === 'sn') {
                    content = `
                        <h1>CIDA SBD-03 - ගිවිසුම</h1>
                        <p><strong>දිනය:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>සේව්‍යයා:</strong> ${project.client || 'සේවාදායකයා'}</p>
                        <p><strong>කොන්ත්‍රාත්කරු:</strong> SSD CONSTRUCTIONS</p>
                        <p>මෙම ගිවිසුම Electronic Transactions Act No. 19 of 2006 යටතේ ඩිජිටල් ලෙස ක්‍රියාත්මක කෙරේ.</p>
                        <h2>1. ලේඛන ප්‍රමුඛතාව</h2>
                        <ol><li>පිළිගැනීමේ ලිපිය</li><li>ගිවිසුම</li><li>MOU</li><li>BOQ</li><li>ගිවිසුම් කොන්දේසි</li></ol>
                        <h2>2. ගිවිසුම් මුදල</h2>
                        <p>LKR <strong>${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
                        <h2>3. ප්‍රති සීමා සහ ස්ථාන</h2>
                        <p>BOQ ට ප්‍රතිවිරුද්ධ වෙනස් කිරීම් ලිඛිත Variation Order නොමැතිව ගෙවනු නොලැබේ.</p>
                        <h2>4. Force Majeure</h2>
                        <p>ස්වාභාවික ව්‍යසන, රාජ්‍ය තහනම් හෝ ජාතික වැඩ් නබ් හේතු කිරීමෙන් ප්‍රමාද සඳහා කිසිම පාර්ශවය වගකිව නොයුතුය.</p>
                    `;
                } else if (exportLanguage === 'ta') {
                    content = `
                        <h1>CIDA SBD-03 - ஒப்பந்தம்</h1>
                        <p><strong>தேதி:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>முதலாளி:</strong> ${project.client || 'வாடிக்கையாளர்'}</p>
                        <p><strong>ஒப்பந்ததாரர்:</strong> SSD CONSTRUCTIONS</p>
                        <p>இந்த ஒப்பந்தம் Electronic Transactions Act No. 19 of 2006 கீழ் டிஜிட்டல் முறையில் நிறைவேற்றப்படுகிறது.</p>
                        <h2>1. ஆவண முன்னுரிமை</h2>
                        <ol><li>ஏற்பு கடிதம்</li><li>ஒப்பந்தம்</li><li>MOU</li><li>BOQ</li><li>ஒப்பந்த நிபந்தனைகள்</li></ol>
                        <h2>2. ஒப்பந்த மதிப்பு</h2>
                        <p>LKR <strong>${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
                        <h2>3. வரம்பு மற்றும் மாறுபாடுகள்</h2>
                        <p>BOQ க்கு வெளியே எந்த வேலையும் எழுத்துப்பூர்வ Variation Order இல்லாமல் செலுத்தப்படாது.</p>
                        <h2>4. Force Majeure</h2>
                        <p>இயற்கை பேரிடர், அரசு தடைகள் காரணமான தாமதங்களுக்கு எந்த தரப்பும் பொறுப்பாகாது.</p>
                    `;
                } else {
                    content = `
                        <h1>CONTRACT AGREEMENT (SBD-03)</h1>
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>Parties:</strong></p>
                        <p>This Contract Agreement is made between <strong>${project.client || 'Client Name'}</strong>${project.location ? `, with project location at ${project.location},` : ''} (hereinafter called "the Employer") and <strong>SSD CONSTRUCTIONS</strong> (hereinafter called "the Contractor").</p>
                        <h2>1. Priority of Documents</h2>
                        <ol><li>Letter of Acceptance</li><li>This Contract Agreement</li><li>MOU (if any)</li><li>Accepted BOQ</li><li>Conditions of Contract</li></ol>
                        <h2>2. Formal Agreement</h2>
                        <p>For the consideration of <strong>LKR ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>, the Contractor agrees to execute and complete the Works in conformity with the Contract.</p>
                        <h2>3. Scope & Variations</h2>
                        <p>Any work outside the Accepted BOQ requires a written Variation Order. Pricing for new items shall be determined by fair market rate plus 15% overhead and profit.</p>
                        <h2>4. Force Majeure</h2>
                        <p>Neither party shall be liable for delays caused by severe weather, national strikes, government bans, or sudden material import restrictions.</p>
                    `;
                }
            } else if (clientSubType === 'MOU') {
                const mouTitle = exportLanguage === 'sn' ? 'අවබෝධතා ගිවිසුම (MOU)' : exportLanguage === 'ta' ? 'புரிந்துணர்வு குறிப்பாணை (MOU)' : 'MEMORANDUM OF UNDERSTANDING';
                const mouDateLabel = exportLanguage === 'sn' ? 'දිනය' : exportLanguage === 'ta' ? 'தேதி' : 'Date';
                const mouProjectLabel = exportLanguage === 'sn' ? 'ව්‍යාපෘතිය' : exportLanguage === 'ta' ? 'திட்டம்' : 'Project';
                const mouClausesLabel = exportLanguage === 'sn' ? 'විශේෂ වගන්ති සහ අනුෂාව ගිවිසුම්' : exportLanguage === 'ta' ? 'சிறப்பு ஷரத்துகள் மற்றும் பக்க ஒப்பந்தங்கள்' : 'Custom Clauses & Side-Agreements';
                const mouEmptyMsg = exportLanguage === 'sn' ? '<em>අදාළ කිරීමේ වගන්ති නොමැත. පහත පෙළ කොටුව භාවිතය.</em>' : exportLanguage === 'ta' ? '<em>இன்னும் ஷரத்துகள் இல்லை. கீழே உள்ள உரை பெட்டியைப் பயன்படுத்தவும்.</em>' : '<em>No custom clauses entered yet. Use the text box to draft conditions.</em>';
                content = `
                    <h1>${mouTitle}</h1>
                    <p><strong>${mouDateLabel}:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>${mouProjectLabel}:</strong> ${project.name}</p>
                    <h2>${mouClausesLabel}</h2>
                    <div style="white-space: pre-wrap; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-family: monospace;">${mouText || mouEmptyMsg}</div>
                `;
            } else if (clientSubType === 'AcceptedBOQ') {
                const boqTitle = exportLanguage === 'sn' ? 'අනුමත ප්‍රමාණ ගිණුම (BOQ)' : exportLanguage === 'ta' ? 'ஏற்றுக்கொள்ளப்பட்ட அளவீடுகளின் பட்டியல் (BOQ)' : 'ACCEPTED BILL OF QUANTITIES (BOQ)';
                const boqMeasureNote = exportLanguage === 'sn' ? 'SLS 573:1982 ප්‍රමිතිය යොමුව' : exportLanguage === 'ta' ? 'SLS 573:1982 அளவீட்டு தர குறிப்பு' : 'Reference to SLS 573:1982 Standard Method of Measurement';
                const boqRatesHead = exportLanguage === 'sn' ? '1. ගාස්තු පිළිගැනීම' : exportLanguage === 'ta' ? '1. விலைகளை ஏற்றுக்கொள்ளுதல்' : '1. Acceptance of Rates';
                const boqRatesBody = exportLanguage === 'sn' ? 'මෙම BOQ හි ගාස්තු සහ ප්‍රමාණ සියලුම අතුරු ගෙවීම් සඳහා රෙකමදාරු ලෙස අගුලු දමා ඇත.' : exportLanguage === 'ta' ? 'இந்த BOQ இல் உள்ள விலைகளும் அளவுகளும் அனைத்து இடைக்கால சான்றிதழ்களுக்கான அடிப்படையாக பூட்டப்பட ஏற்றுக்கொள்ளப்படுகின்றன.' : 'The rates and quantities in the final generated BOQ are hereby locked and accepted as the baseline for all Interim Payment Certificates.';
                const boqClause2 = exportLanguage === 'sn' ? '2. මිනුම් ගෙවීම් ක්‍රමය' : exportLanguage === 'ta' ? '2. அளவீடு மற்றும் கட்டண முறை' : '2. Measure & Pay Clause';
                const boqClause2Body = exportLanguage === 'sn' ? 'මෙය Measure and Pay ගිවිසුමකි. SSD ඉංජිනේරුවරයා දිනපතා ක්ෂේත්‍ර ප්‍රමාණ සත්‍යාපනය කරනු ලැබේ.' : exportLanguage === 'ta' ? 'இது Measure and Pay ஒப்பந்தம். SSD பொறியாளரால் தினசரி அளவீடுகள் சரிபார்க்கப்படும்.' : 'This is a Measure and Pay contract. Quantities in the BOQ are estimates; final payment is based on actual on-site measurements verified by SSD Engineers.';
                content = `
                    <h1>${boqTitle}</h1>
                    <p><strong>${exportLanguage === 'sn' ? 'දිනය' : exportLanguage === 'ta' ? 'தேதி' : 'Date'}:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>${exportLanguage === 'sn' ? 'ව්‍යාපෘතිය' : exportLanguage === 'ta' ? 'திட்டம்' : 'Project'}:</strong> ${project.name}</p>
                    <p><em>${boqMeasureNote}</em></p>
                    <h2>${boqRatesHead}</h2>
                    <p>${boqRatesBody}</p>
                    <h2>${boqClause2}</h2>
                    <p>${boqClause2Body}</p>
                `;
            } else if (clientSubType === 'ConditionsOfContract') {
                content = `
                    <h1>${exportLanguage === 'en' ? 'CONDITIONS OF CONTRACT' : exportLanguage === 'sn' ? 'කොන්ත්‍රාත් කොන්දේසි' : 'ஒப்பந்த நிபந்தனைகள்'}</h1>
                    <p><strong>${l.date}:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Project:</strong> ${project.name}</p>
                    <h2>1. ${l.rules.arbitration.split(':')[0]}</h2>
                    <p>${l.rules.arbitration}</p>
                    <h2>2. ${l.rules.confidentiality.split(':')[0]}</h2>
                    <p>${l.rules.confidentiality}</p>
                    <h2>3. Payment Retentions</h2>
                    <p>${exportLanguage === 'en' ? 'A 5% retention will be held from each interim payment, released upon successful completion of the defects liability period.' : exportLanguage === 'sn' ? 'සෑම අතුරු ගෙවීමකින්ම 5% ක රඳවා තබා ගැනීමක් සිදු කරනු ලබන අතර, දෝෂ වගකීම් කාලය අවසන් වූ පසු එය නිදහස් කරනු ලැබේ.' : 'ஒவ்வொரு இடைக்கால கொடுப்பனவிலிருந்தும் 5% நிறுத்திவைப்பு வைக்கப்படும்.'}</p>
                `;
            } else if (clientSubType === 'VariationOrder') {
                content = `
                    <h1>VARIATION ORDER (VO) FORM</h1>
                    <p><strong>VO No:</strong> VO-${Math.floor(Math.random() * 1000)}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Project:</strong> ${project.name}</p>
                    <div style="border: 2px solid #000; padding: 15px; margin-top: 20px;">
                        <h3>Description of Change:</h3>
                        <p>${voDescription || '________________________________________________'}</p>
                        <h3>Reason for Variation:</h3>
                        <p>${voReason}</p>
                        <div style="display: flex; gap: 50px; margin-top: 20px;">
                            <p><strong>Cost Impact:</strong> LKR ${Number(voCost || 0).toLocaleString()}</p>
                            <p><strong>Time Impact:</strong> ${voTime || '0'} Days</p>
                        </div>
                    </div>
                `;
                // Localize VO if needed
                if (exportLanguage === 'sn') {
                    content = `
                        <h1>වෙනස් කිරීමේ නියෝගය (VO)</h1>
                        <p><strong>දිනය:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>ව්‍යාපෘතිය:</strong> ${project.name}</p>
                        <div style="border: 2px solid #000; padding: 15px; margin-top: 20px;">
                            <h3>වෙනස් කිරීම් පිළිබඳ විස්තරය:</h3>
                            <p>${voDescription || '________________________________________________'}</p>
                            <h3>වෙනස් කිරීමට හේතුව:</h3>
                            <p>${voReason}</p>
                            <div style="display: flex; gap: 50px; margin-top: 20px;">
                                <p><strong>වියදම කෙරෙහි බලපෑම:</strong> LKR ${Number(voCost || 0).toLocaleString()}</p>
                                <p><strong>කාලය කෙරෙහි බලපෑම:</strong> දින ${voTime || '0'}</p>
                            </div>
                        </div>
                    `;
                } else if (exportLanguage === 'ta') {
                    content = `
                        <h1>மாறுபாட்டு உத்தரவு (VO) படிவம்</h1>
                        <p><strong>தேதி:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>திட்டம்:</strong> ${project.name}</p>
                        <div style="border: 2px solid #000; padding: 15px; margin-top: 20px;">
                            <h3>மாற்றத்தின் விளக்கம்:</h3>
                            <p>${voDescription || '________________________________________________'}</p>
                            <h3>மாறுபாட்டிற்கான காரணம்:</h3>
                            <p>${voReason}</p>
                            <div style="display: flex; gap: 50px; margin-top: 20px;">
                                <p><strong>செலவு தாக்கம்:</strong> LKR ${Number(voCost || 0).toLocaleString()}</p>
                                <p><strong>நேர தாக்கம்:</strong> ${voTime || '0'} நாட்கள்</p>
                            </div>
                        </div>
                    `;
                }
            } else {
                content = `<h1>${title}</h1><p>${l.date}: ${new Date().toLocaleDateString()}</p><p>Content generation for this subtype is in progress for ${exportLanguage}.</p>`;
            }
        }
        else if (type === 'Worker') {
            const worker = workers.find(w => String(w.id) === String(entityId));
            const dailyRate = Number(worker.dailyRate || 0);
            const monthlyEst = dailyRate * 26;
            if (monthlyEst > 0 && monthlyEst < 30000) blockReason = 'Statutory Wage Violation (<30,000 LKR)';
            const roleKey = (worker.role || '').toLowerCase();
            const translatedRole = l.roles[roleKey] || worker.role || l.worker;
            const d = exportLanguage === 'sn' ? 'දිනය' : exportLanguage === 'ta' ? 'தேதி' : 'Date';
            const workerTitle = exportLanguage === 'sn' ? 'සේවා ගිවිසුම' : exportLanguage === 'ta' ? 'வேலை ஒப்பந்தம்' : 'EMPLOYMENT AGREEMENT';
            const andWord = exportLanguage === 'sn' ? 'සහ' : exportLanguage === 'ta' ? 'மற்றும்' : 'and';
            const perDay = exportLanguage === 'sn' ? 'දිනකට' : exportLanguage === 'ta' ? 'ஒரு நாளைக்கு' : 'per day';
            content = `
                <h1>${workerTitle}</h1>
                <p><strong>${d}:</strong> ${new Date().toLocaleDateString()}</p>
                <p>${exportLanguage === 'en' ? `Agreement between SSD CONSTRUCTIONS (${l.employer}) and ${worker.fullName || worker.name}, NIC: ${worker.nic || '___'} (${l.employee}).` : exportLanguage === 'sn' ? `SSD CONSTRUCTIONS (${l.employer}) ${andWord} ${worker.fullName || worker.name}, ${l.nic}: ${worker.nic || '___'} (${l.employee}).` : `SSD CONSTRUCTIONS (${l.employer}) ${andWord} ${worker.fullName || worker.name}, ${l.nic}: ${worker.nic || '___'} (${l.employee}).`}</p>
                <h2>1. ${l.position}</h2>
                <p><strong>${translatedRole}</strong></p>
                <h2>2. ${l.remuneration}</h2>
                <p>LKR ${dailyRate.toLocaleString()} ${perDay}</p>
                <p>${l.rules.insurance}</p>
                <h2>3. ${l.statutory}</h2>
                <ul><li>EPF: 12% ${exportLanguage === 'en' ? 'Employer' : exportLanguage === 'sn' ? 'සේව්‍යයා' : 'முதலாளி'}, 8% ${exportLanguage === 'en' ? 'Employee' : exportLanguage === 'sn' ? 'සේවකයා' : 'ஊழியர்'}</li><li>ETF: 3% ${exportLanguage === 'en' ? 'Employer' : exportLanguage === 'sn' ? 'සේව්‍යයා' : 'முதலாளி'}</li></ul>
                <h2>4. ${exportLanguage === 'sn' ? 'සේවා කාල සීමා' : exportLanguage === 'ta' ? 'வேலை நேரம்' : 'Working Hours'}</h2>
                <p>${exportLanguage === 'en' ? '45-hour work week. Overtime (OT) at 1.5x the normal hourly rate.' : exportLanguage === 'sn' ? 'සතිය 45 පැය. OT: සාමාන්‍ය පැය ගාස්තුවෙන් 1.5x.' : 'வாராந்திர 45 மணி நேரம். OT: சாதாரண மணி வீதத்தில் 1.5 மடங்கு.'}</p>
                <h2>5. ${l.conduct}</h2>
                <ul>
                    <li>${l.rules.safety}</li>
                    ${(selectedRuleSet === 'Strict' || selectedRuleSet === 'Comprehensive') ? `<li>${l.rules.biometric}</li><li>${l.rules.logs}</li>` : ''}
                    ${selectedRuleSet === 'Comprehensive' ? `<li>${l.rules.arbitration}</li><li>${l.rules.confidentiality}</li>` : ''}
                </ul>
                <h2>6. ${l.probation}</h2>
                <p>${exportLanguage === 'en' ? '3–6 month probation. During probation: 1 week notice. After probation: 1–2 months notice based on length of service.' : exportLanguage === 'sn' ? 'මාස 3–6 පරිවාස කාලය. පරිවාස කාලය: සතිය 1 දැනුම්දීම. ස්ථිර: සේවා කාලය අනුව මාස 1-2.' : 'ஆய்வுக் காலம் 3–6 மாதம். ஆய்வுக் காலம்: 1 வாரம் அறிவிப்பு. நிரந்தரம்: சேவை நீளத்தைப் பொறுத்து 1–2 மாதம்.'}</p>
            `;
        }
        else if (type === 'Management') {
            const worker = workers.find(w => String(w.id) === String(entityId));
            const dailyRate = Number(worker.dailyRate || 0);
            const monthlyEst = dailyRate * 26;
            if (monthlyEst > 0 && monthlyEst < 30000) blockReason = 'Statutory Wage Violation (<30,000 LKR)';
            const roleKey = (worker.role || '').toLowerCase();
            const translatedRole = l.roles[roleKey] || worker.role || l.management;
            const mgmtTitle = exportLanguage === 'sn' ? 'කළමනාකරණ ගිවිසුම (Supervisor/Engineer)' : exportLanguage === 'ta' ? 'மேலாண்மை ஒப்பந்தம் (கண்காணிப்பாளர்/பொறியாளர்)' : 'MANAGEMENT EMPLOYMENT AGREEMENT (Supervisor / Engineer)';
            content = `
                <h1>${mgmtTitle}</h1>
                <p><strong>${l.date}:</strong> ${new Date().toLocaleDateString()}</p>
                <p>${exportLanguage === 'en' ? `This Agreement is made between SSD CONSTRUCTIONS and ${worker.fullName || worker.name}, NIC: ${worker.nic || '___'}.` : exportLanguage === 'sn' ? `SSD CONSTRUCTIONS සහ ${worker.fullName || worker.name}, ${l.nic}: ${worker.nic || '___'} අතර ගිවිසුම.` : `SSD CONSTRUCTIONS மற்றும் ${worker.fullName || worker.name}, ${l.nic}: ${worker.nic || '___'} இடையே ஒப்பந்தம்.`}</p>
                <h2>1. ${l.position}</h2>
                <p><strong>${translatedRole}</strong></p>
                <h2>2. ${l.remuneration}</h2>
                <p>LKR ${dailyRate.toLocaleString()} ${exportLanguage === 'sn' ? 'දිනකට' : exportLanguage === 'ta' ? 'நாளுக்கு' : 'per day'}</p>
                <h2>3. ${l.statutory}</h2>
                <ul><li>EPF 12% + 8% | ETF 3%</li></ul>
                <h2>4. ${exportLanguage === 'sn' ? 'අඛණ්ඩතාව සහ වාර්තා කිරීම' : exportLanguage === 'ta' ? 'நேர்மை மற்றும் அறிக்கையிடல்' : 'Integrity & Reporting Duties'}</h2>
                <ul>
                    <li>${l.rules.biometric}</li>
                    <li>${l.rules.logs}</li>
                    <li>${exportLanguage === 'en' ? 'Material Stewardship: The Supervisor/Engineer must update the Material Inventory in real-time to prevent quality fraud.' : exportLanguage === 'sn' ? 'ද්‍රව්‍ය භාරකාරත්වය: ගුණාත්මකභාවය වංචාව වැළැක්වීමට ද්‍රව්‍ය ඉන්වෙන්ටරිය යාවත්කාලීන කළ යුතුය.' : 'பொருள் மேலாண்மை: தர மோசடியை தடுக்க பொருள் சரக்கை நிகழ்நேரத்தில் புதுப்பிக்க வேண்டும்.'}</li>
                    ${(selectedRuleSet === 'Strict' || selectedRuleSet === 'Comprehensive') ? `<li>${l.rules.safety}</li>` : ''}
                    ${selectedRuleSet === 'Comprehensive' ? `<li>${l.rules.arbitration}</li><li>${l.rules.confidentiality}</li>` : ''}
                </ul>
                <h2>5. ${exportLanguage === 'sn' ? 'ඉලක්ක සහ KPI' : exportLanguage === 'ta' ? 'இலக்குகள் மற்றும் KPI' : 'Goals & KPI Tracking'}</h2>
                <p>${exportLanguage === 'en' ? 'Monthly goals are linked to Labour Efficiency Variance KPIs (budgeted vs biometric-verified actual hours).' : exportLanguage === 'sn' ? 'මාසික ඉලක්ක Labour Efficiency Variance KPI සමඟ සම්බන්ධ කෙරේ.' : 'மாதாந்திர இலக்குகள் Labour Efficiency Variance KPI யுடன் இணைக்கப்படுகின்றன.'}</p>
                <h2>6. ${l.probation}</h2>
                <p>${exportLanguage === 'en' ? '3–6 months probation. Notice: 1 week (probation), 1–2 months (permanent).' : exportLanguage === 'sn' ? 'මාස 3–6 පරිවාස. දැනුම්දීම: සතිය 1 (පරිවාස), මාස 1-2 (ස්ථිර).' : 'ஆய்வுக் காலம் 3–6 மாதம். அறிவிப்பு: 1 வாரம் (ஆய்வு), 1–2 மாதம் (நிரந்தரம்).'}</p>
            `;
        }
        else if (type === 'Accountant') {
            const worker = workers.find(w => String(w.id) === String(entityId));
            const accTitle = exportLanguage === 'sn' ? 'මූල්‍ය අනුකූලතාවය සහ ගණකාධිකරණ ගිවිසුම' : exportLanguage === 'ta' ? 'நிதி இணக்கம் மற்றும் கணக்கியல் ஒப்பந்தம்' : 'FINANCIAL COMPLIANCE & ACCOUNTING AGREEMENT';
            const scope1 = exportLanguage === 'sn' ? '1. මූල්‍ය වගකීම් පරාසය' : exportLanguage === 'ta' ? '1. நிதியியல் பொறுப்பின் நோக்கம்' : '1. Scope of Financial Responsibility';
            const scope1body = exportLanguage === 'sn' ? 'ගණකාධිකාරීවරයා Audit Rail, CIGFL (15M+), සහ DSO කළමනාකරණය කිරීමට වගකිව යුතුය.' : exportLanguage === 'ta' ? 'Audit Rail, CIGFL (15M+), DSO ஆகியவற்றை நிர்வகிக்க கணக்காளர் பொறுப்பு.' : 'The Accountant shall maintain the <strong>Audit Rail</strong>, verify <strong>CIGFL</strong> compliance (projects >Rs.15M), manage <strong>DSO</strong>, and reconcile biometric attendance against payroll.';
            const scope2 = exportLanguage === 'sn' ? '2. රහස්‍යභාවය සහ අඛණ්ඩතාව' : exportLanguage === 'ta' ? '2. இரகசியத்தன்மை மற்றும் நேர்மை' : '2. Confidentiality & Integrity (NDA)';
            const scope2body = exportLanguage === 'sn' ? 'ලාභ ආන්තික, BOQ ලකුණු සහ බැංකු තොරතුරු NDA ගරු කළ යුතුය.' : exportLanguage === 'ta' ? 'இலாப வரம்புகள், BOQ குறிப்புகள், வங்கி விவரங்கள் NDA படி ரகசியமாக வைக்கப்பட வேண்டும்.' : 'Strict adherence to NDA regarding profit margins, BOQ markups, and banking details. Any breach constitutes grounds for immediate dismissal.';
            const scope3 = exportLanguage === 'sn' ? '3. ගෙවීම් කළමනාකරණය' : exportLanguage === 'ta' ? '3. கட்டண நிர்வாகம்' : '3. Payment & Reporting';
            const scope3body = exportLanguage === 'sn' ? 'LankaPay JustPay/SLIPS හරහා ගෙවීම්. APIT (Rs.150,000+ ඉක්මවූ) සහ EPF/ETF නිවැරදිව ගෙවිය යුතුය.' : exportLanguage === 'ta' ? 'LankaPay JustPay/SLIPS மூலம் கொடுப்பனவுகள். APIT (Rs.150,000+) மற்றும் EPF/ETF சரியாக செலுத்தப்பட வேண்டும்.' : 'Payments via LankaPay JustPay/SLIPS. Manage APIT for employees earning >Rs.150,000/month. Weekly budget vs actual reports required.';
            content = `
                <h1>${accTitle}</h1>
                <p><strong>${l.date}:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>${l.parties}:</strong> SSD CONSTRUCTIONS & ${worker.fullName || worker.name}</p>
                <h2>${scope1}</h2><p>${scope1body}</p>
                <h2>${scope2}</h2><p>${scope2body}</p>
                <h2>${scope3}</h2><p>${scope3body}</p>
                ${(selectedRuleSet === 'Strict' || selectedRuleSet === 'Comprehensive') ? `
                <h2>${exportLanguage === 'sn' ? '4. DSO නිරීක්ෂණය' : exportLanguage === 'ta' ? '4. DSO கண்காணிப்பு' : '4. DSO & Liquidity Monitoring'}</h2>
                <p>${exportLanguage === 'en' ? 'Monitor Days Sales Outstanding (DSO) to ensure certified work is collected within 30 days. Alert management if receivable balance exceeds 90 days.' : exportLanguage === 'sn' ? 'DSO (Days Sales Outstanding) සතිය 30 ඇතුළත එකතු කළ යුතු අතර, ගෙවිය යුතු ශේෂය දින 90 ඉක්මවුණු විට කළමනාකාරිත්වය දැනුම්දිය යුතුය.' : 'DSO 30 நாட்களுக்குள் வசூலிக்கப்பட வேண்டும். 90 நாட்களுக்கும் மேல் நிலுவையிருந்தால் நிர்வாகத்தை எச்சரிக்க வேண்டும்.'}</p>` : ''}
                ${selectedRuleSet === 'Comprehensive' ? `
                <h2>${exportLanguage === 'sn' ? '5. ද්‍රවශීලතා අනුපාත' : exportLanguage === 'ta' ? '5. திரவ விகிதங்கள்' : '5. Liquidity Ratio Compliance'}</h2>
                <p>${exportLanguage === 'en' ? 'Monthly reports on Current Ratio (>1.1) and Quick Ratio (>1.0). Prevent insolvency despite economic volatility.' : exportLanguage === 'sn' ? 'Current Ratio (>1.1) සහ Quick Ratio (>1.0) මාසික වාර්තා ඉදිරිපත් කිරීම.' : 'Current Ratio (>1.1) மற்றும் Quick Ratio (>1.0) மாதாந்திர அறிக்கைகள் தயாரிக்க வேண்டும்.'}
                </p>
                <h2>${exportLanguage === 'sn' ? '6. ආරවුල් නිරාකරණය' : exportLanguage === 'ta' ? '6. சர்ச்சை தீர்வு' : '6. Dispute Resolution'}</h2>
                <p>${l.rules.arbitration}</p>` : ''}
            `;
        }
        else if (type === 'Supplier') {
            const supplier = suppliers.find(s => String(s.id) === String(entityId));
            const supplierTitle = exportLanguage === 'sn' ? 'සැපයුම්කරු ගිවිසුම' : exportLanguage === 'ta' ? 'வழங்குநர் ஒப்பந்தம்' : 'SUPPLIER AGREEMENT';
            const s1 = exportLanguage === 'sn' ? '1. නිෂ්පාදන ගුණාත්මකභාවය' : exportLanguage === 'ta' ? '1. பொருள் தரம்' : '1. Material Quality Standards';
            const s1b = exportLanguage === 'sn' ? 'සිමෙන්ති: SLS 107, වානේ: SLS 375 ප්‍රමිතීන්ට සියලු ද්‍රව්‍ය සම්පූර්ණ කළ යුතුය. SSD ඕනෑම ප්‍රමාණ-නොගැලපෙන ද්‍රව්‍ය සැපයුම්කරුගේ වැය ද සහිතව ප්‍රතික්ෂේප කිරීමට අයිතිය ඇත.' : exportLanguage === 'ta' ? 'சிமென்ட்: SLS 107, எஃகு: SLS 375. தரமற்ற பொருட்களை SSD நிராகரிக்கும் உரிமை கொண்டது.' : 'All materials must meet Sri Lankan Standards: Cement (SLS 107), Steel (SLS 375). SSD has the right to reject substandard materials at the Supplier\'s expense, including removal costs.';
            const s2 = exportLanguage === 'sn' ? '2. ගෙවීම් ක්‍රමය' : exportLanguage === 'ta' ? '2. கட்டண முறை' : '2. Payment Terms';
            const s2b = exportLanguage === 'sn' ? 'ගෙවීම් LankaPay JustPay හෝ SLIPS හරහා ඩිජිටල් ලෙස සිදු කෙරේ. ඩිජිටල් ගිණුම් සෛලය ලෙස ආරාව ලේඛනයෙහි සටහන් වේ.' : exportLanguage === 'ta' ? 'கொடுப்பனவுகள் LankaPay JustPay அல்லது SLIPS மூலம் மட்டுமே செய்யப்படும்.' : 'Payments exclusively via LankaPay JustPay or SLIPS for digital audit trail. No cash payments.';
            const s3 = exportLanguage === 'sn' ? '3. ගිවිසුම් කොන්දේසි' : exportLanguage === 'ta' ? '3. ஒப்பந்த நிபந்தனைகள்' : '3. General Conditions';
            content = `
                <h1>${supplierTitle}</h1>
                <p><strong>${l.date}:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>${exportLanguage === 'sn' ? 'SSD CONSTRUCTIONS සහ' : exportLanguage === 'ta' ? 'SSD CONSTRUCTIONS மற்றும்' : 'Between SSD CONSTRUCTIONS and'} ${supplier.name}</strong></p>
                <h2>${s1}</h2><p>${s1b}</p>
                <h2>${s2}</h2><p>${s2b}</p>
                <h2>${s3}</h2>
                <ul><li>${l.rules.arbitration}</li><li>${l.rules.confidentiality}</li></ul>
            `;
        }
        else if (type === 'Subcontractor') {
            const supplier = suppliers.find(s => String(s.id) === String(entityId));
            const subTitle = exportLanguage === 'sn' ? 'අනු-කොන්ත්‍රාත් ගිවිසුම (CIDA SBD-03)' : exportLanguage === 'ta' ? 'உட்ஒப்பந்த ஒப்பந்தம் (CIDA SBD-03)' : 'SUBCONTRACT AGREEMENT (CIDA SBD-03)';
            const sub1 = exportLanguage === 'sn' ? '1. කාර්ය පරාසය' : exportLanguage === 'ta' ? '1. பணி நோக்கம்' : '1. Scope of Externalized Work';
            const sub1b = exportLanguage === 'sn' ? 'BOQ හි සඳහන් කරන ලද කාර්යයන් (උදා: ජල සැපයුම, විදුලි) SSD ව්‍යාපෘති BOQ ට අනුව සිදු කළ යුතුය.' : exportLanguage === 'ta' ? 'BOQ இல் குறிப்பிட்ட பணிகள் (உ.தா: மின்சாரம், குழாய் வேலை) SSD BOQ படி செய்யப்பட வேண்டும்.' : 'Work items externalized under this contract are defined in the annexed BOQ scope. No work outside this scope will be paid without a written Variation Order.';
            const sub2 = exportLanguage === 'sn' ? '2. මිනුම් ගෙවීම් ක්‍රමය' : exportLanguage === 'ta' ? '2. அளவீட்டு கட்டண முறை' : '2. Measure & Pay Clause';
            const sub2b = exportLanguage === 'sn' ? 'ගෙවීම් SSD ඉංජිනේරු දිනපතා සත්‍යාපිත ක්ෂේත්‍ර ප්‍රමාණ ඇසුරෙනි. BOQ ප්‍රශ්නාර්ථ ප්‍රමාණ ඇස්තමේන්තු වේ.' : exportLanguage === 'ta' ? 'கொடுப்பனவுகள் SSD பொறியாளரால் நாளாந்தம் சரிபார்க்கப்பட்ட அளவீடுகளை அடிப்படையாக கொண்டது.' : 'Payment is based on actual on-site measurements verified daily by an SSD Engineer. BOQ quantities are estimates only.';
            const sub3 = exportLanguage === 'sn' ? '3. EPF/ETF ඒකාකාර වගකීම' : exportLanguage === 'ta' ? '3. EPF/ETF கூட்டு பொறுப்பு' : '3. Joint Liability – EPF/ETF';
            const sub3b = exportLanguage === 'sn' ? 'Subcontractor සිය කාර්ය මණ්ඩලයේ EPF/ETF සඳහා සම්පූර්ණ වගකීම දරනු ලැබේ. ව්‍යාර්ථ නම් SSD ඒකාකාරව වගකිවිය හැකි බැවින් ගිවිසුම කඩ කරනු ලැබේ.' : exportLanguage === 'ta' ? 'உட்ஒப்பந்ததாரர் தம் தொழிலாளர்களின் EPF/ETF க்கு பொறுப்பு. தவறினால் SSD கூட்டு பொறுப்பாகலாம்.' : 'The Subcontractor is solely responsible for their workers\' EPF (12%+8%) and ETF (3%). Failure constitutes a contract breach; SSD may be held jointly liable under Sri Lankan law.';
            const sub4 = exportLanguage === 'sn' ? '4. CIGFL අනුකූලතාව' : exportLanguage === 'ta' ? '4. CIGFL இணக்கம்' : '4. CIGFL Compliance';
            const sub4b = exportLanguage === 'sn' ? 'ව්‍යාපෘති අගය Rs. 15 මිලියන ඉක්මවූ විට, නිශ්චිත Subcontract අගය CIGFL ගාස්තු (0.25%-1%) ලේඛනය කළ යුතුය.' : exportLanguage === 'ta' ? 'திட்ட மதிப்பு Rs. 15 மில்லியனுக்கும் மேல் இருந்தால், CIGFL கடமை (0.25%–1%) நீடிக்கும்.' : 'If the main project exceeds Rs. 15M, the Subcontractor is also liable for CIGFL levy (0.25%–1%) on their subcontract value.';
            content = `
                <h1>${subTitle}</h1>
                <p><strong>${l.date}:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>${exportLanguage === 'sn' ? 'SSD CONSTRUCTIONS සහ' : exportLanguage === 'ta' ? 'SSD CONSTRUCTIONS மற்றும்' : 'Between SSD CONSTRUCTIONS and'} ${supplier.name}</strong></p>
                <h2>${sub1}</h2><p>${sub1b}</p>
                <h2>${sub2}</h2><p>${sub2b}</p>
                <h2>${sub3}</h2><p>${sub3b}</p>
                <h2>${sub4}</h2><p>${sub4b}</p>
                <h2>${exportLanguage === 'sn' ? '5. ආරවුල් නිරාකරණය' : exportLanguage === 'ta' ? '5. சர்ச்சை தீர்வு' : '5. Dispute Resolution'}</h2>
                <ul><li>${l.rules.arbitration}</li><li>${l.rules.confidentiality}</li></ul>
            `;
        }

        const newDoc = {
            id: existing ? existing.id : 'temp_new',
            title,
            content,
            status: existing ? existing.status : 'Draft',
            signedAt: existing ? existing.signedAt : null,
            signedBy: existing ? existing.signedBy : null,
            blockReason,
            exportLanguage
        };

        setCurrentAgreement(newDoc);
    }

    async function handleSaveDraft() {
        if (!currentAgreement) return;
        setIsSaving(true);
        try {
            const payload = {
                type,
                entityId,
                title: currentAgreement.title,
                content: currentAgreement.content,
                status: 'Draft',
                // Metadata for full restoration
                clientSubType: type === 'Client' ? clientSubType : null,
                exportLanguage,
                selectedRuleSet,
                mouText: clientSubType === 'MOU' ? mouText : null,
                voDetails: clientSubType === 'VariationOrder' ? {
                    description: voDescription,
                    reason: voReason,
                    cost: voCost,
                    time: voTime
                } : null
            };

            if (currentAgreement.id === 'temp_new') {
                const res = await create(KEYS.agreements, payload);
                setCurrentAgreement(res);
                setAgreements([res, ...agreements]);
            } else {
                const res = await update(KEYS.agreements, currentAgreement.id, payload);
                setCurrentAgreement(res);
                setAgreements(agreements.map(a => a.id === currentAgreement.id ? res : a));
            }
        } catch (error) {
            console.error(error);
            alert("Failed to save draft.");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSign() {
        if (!signName.trim()) return alert("Please enter your name to sign.");
        setIsSaving(true);
        try {
            let idToUpdate = currentAgreement.id;

            // If it's not saved yet, save it first with full metadata
            if (idToUpdate === 'temp_new') {
                const payload = {
                    type,
                    entityId,
                    title: currentAgreement.title,
                    content: currentAgreement.content,
                    status: 'Draft',
                    clientSubType: type === 'Client' ? clientSubType : null,
                    exportLanguage,
                    selectedRuleSet,
                    mouText: clientSubType === 'MOU' ? mouText : null,
                    voDetails: clientSubType === 'VariationOrder' ? {
                        description: voDescription,
                        reason: voReason,
                        cost: voCost,
                        time: voTime
                    } : null
                };
                const res = await create(KEYS.agreements, payload);
                idToUpdate = res.id;
            }

            const signPayload = {
                status: 'Signed',
                signedBy: signName,
                signedAt: new Date().toISOString()
            };

            const updated = await update(KEYS.agreements, idToUpdate, signPayload);
            setCurrentAgreement(updated);
            setAgreements(agreements.map(a => a.id === idToUpdate ? updated : a).concat(currentAgreement.id === 'temp_new' ? [updated] : []));
            setShowSignModal(false);
            setSignName('');
        } catch (error) {
            console.error(error);
            alert("Failed to sign agreement.");
        } finally {
            setIsSaving(false);
        }
    }

    function handleClear() {
        setEntityId('');
        setMouText('');
        setVoDescription('');
        setVoCost('');
        setVoTime('');
        setCurrentAgreement(null);
    }

    function selectAgreement(agr) {
        setType(agr.type || 'Client');
        setEntityId(agr.entityId || '');
        setExportLanguage(agr.exportLanguage || 'en');
        setSelectedRuleSet(agr.selectedRuleSet || 'Standard');

        if (agr.type === 'Client' && agr.clientSubType) {
            setClientSubType(agr.clientSubType);
        }

        if (agr.mouText) setMouText(agr.mouText);
        if (agr.voDetails) {
            setVoDescription(agr.voDetails.description || '');
            setVoReason(agr.voDetails.reason || 'Client Request');
            setVoCost(agr.voDetails.cost || '');
            setVoTime(agr.voDetails.time || '');
        }

        setCurrentAgreement(agr);
    }

    async function handleExport(format) {
        if (!currentAgreement) return;
        setExportLoading(true);
        try {
            // Need to save first if not saved
            let docToExport = currentAgreement;
            if (docToExport.id === 'temp_new') {
                await handleSaveDraft();
                docToExport = agreements.find(a => a.type === docToExport.type && String(a.entityId) === String(docToExport.entityId)) || docToExport;
            }

            await exportAgreementData({
                format,
                agreement: docToExport,
                htmlContent: docToExport.content,
                fileName: docToExport.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            });
        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed.");
        } finally {
            setExportLoading(false);
        }
    }

    // if (isLoading) return <div className="loading-screen">Loading Agreements...</div>;

    const entities = (type === 'Client') ? projects : (type === 'Worker' || type === 'Management' || type === 'Accountant') ? workers : suppliers;

    return (
        <GlobalLoadingOverlay loading={isLoading} message="Generating Legally Binding Instrument...">
            <div className="agreement-container page-animate">
                <div className="page-header">
                    <h1>{t('nav.agreements', { defaultValue: 'Agreement Generator' })}</h1>
                    <div className="page-header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {currentAgreement && currentAgreement.status !== 'Signed' && (
                            <BounceButton className="btn btn-primary" onClick={handleSaveDraft} disabled={isSaving}>
                                <SaveIcon size={18} /> {isSaving ? 'Saving...' : 'Save Draft'}
                            </BounceButton>
                        )}
                        {currentAgreement && currentAgreement.status === 'Signed' && (
                            <div className="badge badge-success"><CheckCircle2Icon size={16} /> Legally Signed</div>
                        )}
                        <ExportDropdown onExport={handleExport} isLoading={exportLoading} exclude={['pdf', 'excel', 'csv']} />
                        <BounceButton disabled={isLoading} className="btn btn-secondary" onClick={handleClear}><Plus size={18} /> New Agreement</BounceButton>
                    </div>
                </div>

                <div className="agreement-layout">
                    <Card className="agreement-sidebar">
                        <div className="agreement-form">
                            <div className="form-group">
                                <label>Agreement Category</label>
                                <select value={type} onChange={e => { setType(e.target.value); setEntityId(''); setClientSubType('LetterOfAcceptance'); }}>
                                    <option value="Client">Client Contracts (SBD-03)</option>
                                    <option value="Worker">Worker Employment</option>
                                    <option value="Management">Management (Supervisors/Engineers)</option>
                                    <option value="Accountant">Accountant (Financial Compliance)</option>
                                    <option value="Supplier">Supplier Agreement</option>
                                    <option value="Subcontractor">Subcontractor Agreement</option>
                                </select>
                            </div>

                            {type === 'Client' && (
                                <div className="form-group">
                                    <label>SBD-03 Document Type</label>
                                    <select value={clientSubType} onChange={e => { setClientSubType(e.target.value); setCurrentAgreement(null); setMouText(''); }}>
                                        <option value="LetterOfAcceptance">Letter of Acceptance</option>
                                        <option value="ContractAgreement">Contract Agreement</option>
                                        <option value="MOU">Memorandum of Understanding</option>
                                        <option value="AcceptedBOQ">Accepted BOQ</option>
                                        <option value="ConditionsOfContract">Conditions of Contract</option>
                                        <option value="VariationOrder">Variation Order Form</option>
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Select {type}</label>
                                <select value={entityId} onChange={e => setEntityId(e.target.value)}>
                                    <option value="">-- Choose --</option>
                                    {entities.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.fullName || e.name || e.companyName} {(type === 'Client' && e.client) ? `(${e.client})` : ''}
                                            {(type === 'Worker' && e.role) ? ` - ${e.role}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Export Language</label>
                                <div className="language-toggle" style={{ display: 'flex', gap: '8px' }}>
                                    <button className={`btn-toggle ${exportLanguage === 'en' ? 'active' : ''}`} onClick={() => setExportLanguage('en')}>English</button>
                                    <button className={`btn-toggle ${exportLanguage === 'sn' ? 'active' : ''}`} onClick={() => setExportLanguage('sn')}>සිංහල</button>
                                    <button className={`btn-toggle ${exportLanguage === 'ta' ? 'active' : ''}`} onClick={() => setExportLanguage('ta')}>தமிழ்</button>
                                </div>
                            </div>

                            {(type === 'Worker' || type === 'Management' || type === 'Accountant' || type === 'Subcontractor') && (
                                <div className="form-group">
                                    <label>Agreement Rules</label>
                                    <select value={selectedRuleSet} onChange={e => setSelectedRuleSet(e.target.value)}>
                                        <option value="Standard">Standard (Basic Legal)</option>
                                        <option value="Strict">Strict (High Monitoring + Biometrics)</option>
                                        <option value="Comprehensive">Comprehensive (Corporate SSD Standards)</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {currentAgreement && currentAgreement.status === 'Draft' && (
                            <div className="signature-box">
                                <p>Digital Signature Required</p>
                                {currentAgreement.blockReason ? (
                                    <div className="text-danger" style={{ padding: '10px', background: '#fee2e2', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '10px', color: '#991b1b' }}>
                                        <strong>Signing Blocked:</strong> {currentAgreement.blockReason}
                                    </div>
                                ) : (
                                    <BounceButton
                                        className="btn btn-secondary w-full"
                                        onClick={() => setShowSignModal(true)}
                                        onMouseEnter={() => signIconRef.current?.startAnimation?.()}
                                        onMouseLeave={() => signIconRef.current?.stopAnimation?.()}
                                    >
                                        <FileTextIcon ref={signIconRef} size={18} /> Sign Document
                                    </BounceButton>
                                )}
                                <small className="mt-2 text-muted">Serves as an electronic record under the Electronic Transactions Act</small>
                            </div>
                        )}

                        {type === 'Client' && clientSubType === 'MOU' && currentAgreement && currentAgreement.status === 'Draft' && (
                            <div className="form-group" style={{ marginTop: '20px' }}>
                                <label>Custom MOU Clauses</label>
                                <textarea
                                    value={mouText}
                                    onChange={e => setMouText(e.target.value)}
                                    placeholder="Enter custom project clauses, access times, or side-deals here..."
                                    rows={6}
                                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', resize: 'vertical' }}
                                />
                            </div>
                        )}

                        {type === 'Client' && clientSubType === 'VariationOrder' && currentAgreement && currentAgreement.status === 'Draft' && (
                            <div className="variation-form" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="form-group">
                                    <label>Variation Description</label>
                                    <textarea value={voDescription} onChange={e => setVoDescription(e.target.value)} placeholder="Describe the change..." rows={3} style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                                </div>
                                <div className="form-group">
                                    <label>Reason</label>
                                    <select value={voReason} onChange={e => setVoReason(e.target.value)} style={{ width: '100%' }}>
                                        <option>Client Request</option>
                                        <option>Design Change</option>
                                        <option>Unforeseen Site Condition</option>
                                        <option>Material Unavailability</option>
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="form-group">
                                        <label>Cost Impact (LKR)</label>
                                        <input type="number" value={voCost} onChange={e => setVoCost(e.target.value)} placeholder="e.g. 150000 or -50000" style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                                    </div>
                                    <div className="form-group">
                                        <label>Time Impact (Days)</label>
                                        <input type="number" value={voTime} onChange={e => setVoTime(e.target.value)} placeholder="e.g. 5" style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <Card title="Saved Agreements" className="agreements-list-card">
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {agreements.length === 0 ? (
                                    <div className="empty-state text-muted" style={{ textAlign: 'center', padding: 20 }}>No agreements saved yet</div>
                                ) : (
                                    agreements.map((a) => (
                                        <div
                                            key={a.id}
                                            className={`agreement-list-item ${currentAgreement?.id === a.id ? 'active' : ''}`}
                                            onClick={() => selectAgreement(a)}
                                            style={{
                                                padding: '10px',
                                                borderBottom: '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                borderRadius: '6px',
                                                marginBottom: '4px',
                                                background: currentAgreement?.id === a.id ? 'var(--primary-light)' : 'transparent',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.title}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                <span className={`status-badge ${a.status.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>{a.status}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.documentDate ? new Date(a.documentDate).toLocaleDateString() : new Date(a.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </Card>

                    <div className="document-preview-container">
                        {currentAgreement ? (
                            <div className="document-preview" ref={previewRef}>
                                <div dangerouslySetInnerHTML={{ __html: currentAgreement.content }} />

                                <div className="signature-grid">
                                    <div className="signature-line">
                                        <strong>For SSD CONSTRUCTIONS</strong>
                                        <span>Authorized Signatory</span>
                                    </div>
                                    <div className="signature-line">
                                        <strong>For the {type === 'Client' ? 'Employer' : type === 'Worker' ? 'Employee' : 'Supplier'}</strong>
                                        <span>Authorized Signatory</span>
                                    </div>
                                </div>

                                {currentAgreement.status === 'Signed' && (
                                    <div className="watermark-signed">SIGNED<br /><span style={{ fontSize: 24 }}>{new Date(currentAgreement.signedAt.replace(' ', 'T')).toLocaleDateString()}</span></div>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state text-muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                Select an agreement type and entity to generate a preview.
                            </div>
                        )}
                    </div>
                </div>

                {/* Signature Modal */}
                {showSignModal && (
                    <div className="modal-overlay">
                        <Card className="modal-content" style={{ maxWidth: 400 }}>
                            <h3 style={{ marginBottom: 20 }}>Digital Signature (CES)</h3>
                            <p className="text-muted" style={{ marginBottom: 20 }}>
                                By typing your name below, you electronically sign this <strong>{currentAgreement?.title}</strong>, serving as an electronic record and evidence of agreement under the Electronic Transactions Act.
                            </p>
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Enter your full name"
                                    value={signName}
                                    onChange={e => setSignName(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)' }}
                                />
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <BounceButton className="btn btn-ghost" onClick={() => setShowSignModal(false)}>Cancel</BounceButton>
                                <BounceButton className="btn btn-primary" onClick={handleSign} disabled={!signName.trim() || isSaving}>
                                    {isSaving ? 'Signing...' : 'Sign Legal Document'}
                                </BounceButton>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </GlobalLoadingOverlay>
    );
}
