import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import BounceButton from '../components/BounceButton';
import ExportDropdown from '../components/ExportDropdown';
import { getAll, create, update, KEYS } from '../data/db';
import { exportAgreementData } from '../utils/exportUtils';
import './AgreementGenerator.css';
import { CheckCircle2Icon, FileSignatureIcon, SaveIcon } from 'lucide-react';

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
        if (existing) {
            setCurrentAgreement(existing);
            return;
        }

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

                content = `
                    <h1>LETTER OF ACCEPTANCE</h1>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>To:</strong> SSD CONSTRUCTIONS</p>
                    <p><strong>Subject: Notification of Award for ${project.name}</strong></p>
                    <p>This is to notify you that your bid for the execution of the <strong>${project.name}</strong> has been accepted by our agency.</p>
                    <h2>1. Contract Value</h2>
                    <p>The accepted Contract Sum is <strong>LKR ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.</p>
                    <h2>2. Effective Date & Mobilization</h2>
                    <p>The <strong>Effective Date of Commencement</strong> shall be 14 days from the date of this letter. You are hereby instructed to commence mobilization of equipment and personnel to the site immediately.</p>
                    <h2>3. Time for Completion & Liquidated Damages</h2>
                    <p>The Contractor shall complete the Works within <strong>${durationStr} calendar days</strong> from the Commencement Date, as per the Contract Data.</p>
                    <p>In the event of delay attributable to the Contractor, <strong>Liquidated Damages</strong> shall be applied at <strong>0.05% of the Initial Contract Price per calendar day (LKR ${ldPerDay.toLocaleString(undefined, { minimumFractionDigits: 2 })})</strong>, capped at 10% of the Contract Price.</p>
                    <h2>4. Performance Security</h2>
                    <p>You are hereby requested to furnish the Performance Security in the amount of 5% (<strong>LKR ${perfSec.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>) within 14 days of receipt of this letter.</p>
                    ${isCIGFL ? `
                    <h2>5. CIGFL Levy Deduction</h2>
                    <p>Under the Finance Act No. 5 of 2005 (CIGFL), a deduction of ${levyPercent}% will be applied as this project value exceeds the LKR 15,000,000 threshold.</p>
                    ` : ''}
                `;
            } else if (clientSubType === 'ContractAgreement') {
                content = `
                    <h1>CONTRACT AGREEMENT (SBD-03)</h1>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Parties:</strong></p>
                    <p>This Contract Agreement is made between <strong>${project.client || 'Client Name'}</strong>${project.location ? `, with project location at ${project.location},` : ''} (hereinafter called "the Employer") and <strong>SSD CONSTRUCTIONS</strong> (hereinafter called "the Contractor").</p>
                    
                    <h2>1. Priority of Documents</h2>
                    <p>The following documents shall be deemed to form and be read and construed as part of this Agreement in the following order of priority:</p>
                    <ul>
                        <li>(a) The Letter of Acceptance</li>
                        <li>(b) This Contract Agreement</li>
                        <li>(c) The Memorandum of Understanding (MOU)</li>
                        <li>(d) The Accepted Bill of Quantities (BOQ)</li>
                        <li>(e) The Conditions of Contract</li>
                    </ul>
                    <h2>2. Formal Agreement</h2>
                    <p>For the consideration of <strong>LKR ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>, the Contractor agrees to execute and complete the Works and remedy any defects therein in conformity with the provisions of the Contract.</p>
                    <h2>3. Scope Definition & Variations</h2>
                    <p>The Works shall strictly conform to the Accepted BOQ and drawings. Any work outside this scope shall require a written Variation Order. If no rate exists in the BOQ, pricing shall be determined by fair market rate plus 15% overhead and profit.</p>
                    <h2>4. Access & Site Possession</h2>
                    <p>The Employer shall provide uninterrupted site access. Delays due to land disputes, utility relocation, or third-party interference shall entitle the Contractor to a time extension and cost recovery.</p>
                    <h2>5. Force Majeure</h2>
                    <p>Neither party shall be liable for delays caused by Force Majeure events, which include but are not limited to: severe weather extremes, national strikes, government bans, severe fuel shortages, and sudden material import restrictions.</p>
                `;
            } else if (clientSubType === 'MOU') {
                content = `
                    <h1>MEMORANDUM OF UNDERSTANDING</h1>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Project:</strong> ${project.name}</p>
                    <h2>Custom Clauses & Side-Agreements</h2>
                    <div style="white-space: pre-wrap; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-family: monospace;">${mouText || '<em>No custom clauses entered yet. Use the text box to draft conditions.</em>'}</div>
                `;
            } else if (clientSubType === 'AcceptedBOQ') {
                content = `
                    <h1>ACCEPTED BILL OF QUANTITIES (BOQ)</h1>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Project:</strong> ${project.name}</p>
                    <p><em>Reference to SLS 573:1982 Standard Method of Measurement</em></p>
                    <h2>1. Acceptance of Rates</h2>
                    <p>The rates and quantities specified in the final generated BOQ for this project are hereby locked and accepted as the baseline for all Interim Payment Certificates.</p>
                    <h1>${exportLanguage === 'en' ? 'CONTRACT AGREEMENT' : exportLanguage === 'sn' ? 'කොන්ත්‍රාත් ගිවිසුම' : 'ஒப்பந்த ஒப்பந்தம்'}</h1>
                    <p><strong>${l.date}:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>${l.parties}:</strong> ${project.client || 'Client'} & SSD CONSTRUCTIONS</p>
                    <p>${clean(`This Agreement is made between the Employer and SSD CONSTRUCTIONS regarding the project ${project.name}.`)}</p>
                    <h2>Conditions</h2>
                    <p>${l.rules.arbitration}</p>
                    <p>${l.rules.confidentiality}</p>
                `;
            } else {
                content = `<h1>${title}</h1><p>${l.date}: ${new Date().toLocaleDateString()}</p><p>Content generation for this subtype is in progress for ${exportLanguage}.</p>`;
            }
        }
        else if (type === 'Worker' || type === 'Management' || type === 'Accountant') {
            const worker = workers.find(w => String(w.id) === String(entityId));
            const dailyRate = Number(worker.dailyRate || 0);
            const monthlyEst = dailyRate * 26;
            const isBelowMin = monthlyEst > 0 && monthlyEst < 30000;

            if (isBelowMin) blockReason = "Statutory Wage Violation (<30,000 LKR)";

            content = `
                <h1>${title.toUpperCase()}</h1>
                <p><strong>${l.date}:</strong> ${new Date().toLocaleDateString()}</p>
                <p>${clean(`This Agreement is made between SSD CONSTRUCTIONS (${l.employer}) and ${worker.fullName || worker.name}, ${l.nic}: ${worker.nic || '_______'} (${l.employee}).`)}</p>
                
                <h2>1. ${l.position}</h2>
                <p>${clean(`The Employee is hired for the position of ${worker.role || (type === 'Accountant' ? 'Accountant' : 'Worker')}.`)}</p>

                <h2>2. ${l.remuneration}</h2>
                <p>LKR ${dailyRate.toLocaleString()} per day.</p>
                <p>${l.rules.insurance}</p>

                <h2>3. ${l.statutory}</h2>
                <ul><li>EPF: 12% Employer, 8% Employee</li><li>ETF: 3% Employer</li></ul>

                <h2>4. ${l.conduct}</h2>
                <ul>
                    <li>${l.rules.safety}</li>
                    ${(selectedRuleSet === 'Strict' || selectedRuleSet === 'Comprehensive') ? `<li>${l.rules.biometric}</li><li>${l.rules.logs}</li>` : ''}
                    ${selectedRuleSet === 'Comprehensive' ? `<li>${l.rules.arbitration}</li><li>${l.rules.confidentiality}</li>` : ''}
                </ul>

                <h2>5. ${l.probation}</h2>
                <p>${exportLanguage === 'en' ? '3 Months probation apply.' : exportLanguage === 'sn' ? 'මාස 3 ක පරිවාස කාලයක් අදාළ වේ.' : '3 மாத ஆய்வுக் காலம் பொருந்தும்.'}</p>
            `;
        }
        else {
            const supplier = suppliers.find(s => String(s.id) === String(entityId));
            content = `
                <h1>${title.toUpperCase()}</h1>
                <p><strong>${l.date}:</strong> ${new Date().toLocaleDateString()}</p>
                <p>${clean(`SSD CONSTRUCTIONS (${l.client}) and ${supplier.name} (${type === 'Supplier' ? l.supplier : l.subcontractor}).`)}</p>
                <h2>Conditions</h2>
                <p>${l.rules.arbitration}</p>
                <p>${l.rules.confidentiality}</p>
            `;
        }

        const newDoc = {
            title,
            content,
            status: 'Draft',
            signedAt: null,
            signedBy: null,
            blockReason
        };

        setCurrentAgreement(newDoc);
    }

    async function handleSaveDraft() {
        if (!currentAgreement) return;
        setIsSaving(true);
        try {
            const payload = {
                type: currentAgreement.type,
                entityId: currentAgreement.entityId,
                title: currentAgreement.title,
                content: currentAgreement.content,
                status: 'Draft'
            };

            if (currentAgreement.id === 'temp_new') {
                const res = await create(KEYS.agreements, payload);
                setCurrentAgreement(res);
                setAgreements([...agreements, res]);
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

            // If it's not saved yet, save it first
            if (idToUpdate === 'temp_new') {
                const payload = {
                    type: currentAgreement.type,
                    entityId: currentAgreement.entityId,
                    title: currentAgreement.title,
                    content: currentAgreement.content,
                    status: 'Draft'
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
                htmlContent: previewRef.current?.innerHTML || docToExport.content,
                fileName: docToExport.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            });
        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed.");
        } finally {
            setExportLoading(false);
        }
    }

    if (isLoading) return <div className="loading-screen">Loading Agreements...</div>;

    const entities = (type === 'Client') ? projects : (type === 'Worker' || type === 'Management' || type === 'Accountant') ? workers : suppliers;

    return (
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
                    <ExportDropdown onExport={handleExport} isLoading={exportLoading} />
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
                                <BounceButton className="btn btn-secondary w-full" onClick={() => setShowSignModal(true)}>
                                    <FileSignatureIcon size={18} /> Sign Document
                                </BounceButton>
                            )}
                            <small className="mt-2 text-muted">Serves as an electronic record under the Electronic Transactions Act</small>
                        </div>
                    )}

                    {type === 'Client' && clientSubType === 'MOU' && currentAgreement && currentAgreement.status === 'Draft' && currentAgreement.id === 'temp_new' && (
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

                    {type === 'Client' && clientSubType === 'VariationOrder' && currentAgreement && currentAgreement.status === 'Draft' && currentAgreement.id === 'temp_new' && (
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
    );
}
