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

    // Data
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
    }, [type, clientSubType, mouText, voDescription, voReason, voCost, voTime, entityId, projects, workers, suppliers]);

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

        if (type === 'Client') {
            const project = projects.find(p => String(p.id) === String(entityId));
            if (!project) return;

            let subTitle = '';
            if (clientSubType === 'LetterOfAcceptance') subTitle = 'Letter of Acceptance';
            if (clientSubType === 'ContractAgreement') subTitle = 'Contract Agreement';
            if (clientSubType === 'MOU') subTitle = 'Memorandum of Understanding';
            if (clientSubType === 'AcceptedBOQ') subTitle = 'Accepted BOQ Reference';
            if (clientSubType === 'ConditionsOfContract') subTitle = 'Conditions of Contract';
            if (clientSubType === 'VariationOrder') subTitle = 'Variation Order';

            title = `${subTitle} - ${project.name}`;
            expectedTitlePart = subTitle;
        } else if (type === 'Worker') {
            const worker = workers.find(w => String(w.id) === String(entityId));
            if (!worker) return;
            title = `Employment Agreement - ${worker.fullName || worker.name}`;
            expectedTitlePart = 'Employment Agreement';
        } else if (type === 'Supplier') {
            const supplier = suppliers.find(s => String(s.id) === String(entityId));
            if (!supplier) return;
            title = `Supplier Agreement - ${supplier.name}`;
            expectedTitlePart = 'Supplier Agreement';
        }

        // Check if an agreement already exists for this type and entity and expected title
        const existing = agreements.find(a => a.type === type && String(a.entityId) === String(entityId) && a.title.includes(expectedTitlePart));
        if (existing) {
            setCurrentAgreement(existing);
            return;
        }

        if (type === 'Client') {
            const project = projects.find(p => String(p.id) === String(entityId));
            const amt = Number(project.contractValue || 0);
            const isCIGFL = amt > 15000000;
            const isResidential = project.projectType === 'Residential';

            if (clientSubType === 'LetterOfAcceptance') {
                const levyPercent = amt > 50000000 ? 1 : 0.25;
                const perfSec = amt * 0.05;

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
                    <p>In the event of delay attributable to the Contractor, <strong>Liquidated Damages</strong> shall be applied at <strong>0.05% of the Initial Contract Price per calendar day</strong>, capped at 10% of the Contract Price.</p>
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
                    <h2>2. Contract Sum Binding</h2>
                    <p>The final Accepted sum is <strong>LKR ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>. Variations shall only be entertained subject to written approval via formal Variation Orders.</p>
                    <h2>3. Re-measurement & Quantity Variance</h2>
                    <p>If executed quantities vary by more than ±15% from the initial BOQ quantities, the rates for those specific items may be subject to review and renegotiation.</p>
                    <h2>4. Price Fluctuation Adjustments</h2>
                    <p>If the project duration exceeds 6 months due to delays not attributable to the Contractor, material price adjustments shall be allowed based on official indices to account for construction inflation.</p>
                `;
            } else if (clientSubType === 'ConditionsOfContract') {
                content = `
                    <h1>CONDITIONS OF CONTRACT (Minor Contracts SBD-03)</h1>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Project:</strong> ${project.name}</p>
                    
                    <h2>1. Payment & Certification Procedure</h2>
                    <ul>
                        <li>The Contractor shall submit the Interim Payment Certificate (IPC).</li>
                        <li>The Engineer/Employer must certify the IPC within <strong>7 days</strong> of submission.</li>
                        <li>The Employer shall pay the certified amount within <strong>14 days</strong> of certification.</li>
                        <li><em>If no certification response is provided within 7 days, the IPC is deemed approved.</em></li>
                    </ul>

                    <h2>2. Financial Clauses</h2>
                    <ul>
                        <li><strong>Advance Payment:</strong> The Employer shall pay an advance payment of maximum 30% of the Contract Price subject to an Advance Payment Guarantee.</li>
                        <li><strong>Retention:</strong> A retention of 10% shall be deducted from each interim payment, up to a maximum limit of 5% of the Initial Contract Price.</li>
                        <li><strong>Defects Liability Period:</strong> The Defects Liability Period is 365 Days from the date of taking over.</li>
                        <li><strong>Interest on Late Payment:</strong> Late payments shall incur an interest charge of 1.5% per month.</li>
                    </ul>

                    <h2>3. Suspension Rights</h2>
                    <p>The Contractor reserves the right to suspend works in the event of:</p>
                    <ul>
                        <li>Non-payment of certified bills exceeding 14 days from due date.</li>
                        <li>Employer interference or failure to release the site.</li>
                        <li>Failure of the Employer/Consultant to provide necessary working drawings in a timely manner.</li>
                    </ul>

                    <h2>4. Termination Rights</h2>
                    <p><strong>Employer Termination:</strong> The Employer may terminate the contract for abandonment of works, insolvency of the Contractor, or serious, repeated breach of contract.<br/>
                    <strong>Contractor Termination:</strong> The Contractor may terminate the contract for 30+ days of non-payment, repeated suspension of works without cause by the Employer, or Employer insolvency.</p>
                    
                    <h2>5. Dispute Resolution</h2>
                    <p>Disputes shall be handled through a tiered structure: 1) Site-level negotiation (7 days), followed by 2) Formal written dispute notice, followed by 3) Mediation through the Construction Guarantee Fund (CGF), and finally 4) Formal Arbitration under the Sri Lanka Arbitration Act.</p>

                    ${isCIGFL ? `
                    <div class="clause-highlight">
                        <h2>Tax & Regulatory Compliance (CIGFL)</h2>
                        <p>As this contract exceeds LKR 15,000,000, it is subject to the Construction Industry Guarantee Fund Levy (CIGFL). The Contractor's CIDA registration (CPC/DS/KU/4717) is maintained accordingly.</p>
                    </div>
                    ` : ''}

                    ${isResidential ? `
                    <div class="clause-highlight">
                        <h2>Construction Escrow (Residential)</h2>
                        <p>Both parties agree that milestone payments may be facilitated via a Construction Escrow account to ensure financial security and timely disbursements.</p>
                    </div>
                    ` : ''}
                `;
            } else if (clientSubType === 'VariationOrder') {
                content = `
                    <h1>VARIATION ORDER</h1>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Project:</strong> ${project.name}</p>
                    
                    <div style="border: 1px solid #000; padding: 15px; margin-bottom: 20px;">
                        <h2>Variation Details</h2>
                        <p><strong>Description of Variation:</strong><br/> ${voDescription || '<em>Description not provided...</em>'}</p>
                        <p><strong>Reason for Variation:</strong> ${voReason}</p>
                        <hr/>
                        <p><strong>Cost Impact:</strong> LKR ${Number(voCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p><strong>Time Impact:</strong> ${voTime || '0'} Days</p>
                        <p><strong>Revised Contract Sum:</strong> LKR ${(amt + Number(voCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>

                    <h2>Authorization</h2>
                    <p><em>"No variation shall be executed without written approval. Verbal instructions shall not be binding."</em></p>
                    <p>By signing this Variation Order, both parties agree to the amended scope, cost, and time implications stated above.</p>
                `;
            }
        }
        else if (type === 'Worker') {
            const worker = workers.find(w => String(w.id) === String(entityId));
            if (!worker) return;
            title = `Employment Agreement - ${worker.fullName || worker.name}`;

            // Calculate monthly equivalent (roughly 26 days)
            const dailyRate = Number(worker.dailyRate || 0);
            const monthlyEst = dailyRate * 26;
            const isBelowMin = monthlyEst > 0 && monthlyEst < 30000;

            if (isBelowMin) {
                blockReason = "Statutory Minimum Wage Violation: The estimated monthly wage based on the daily rate is strictly below the mandatory LKR 30,000 minimum. Agreement signing is blocked until the rate is adjusted in the Workers module.";
            }

            content = `
                <h1>EMPLOYMENT AGREEMENT</h1>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p>This Employment Agreement is entered into by and between <strong>SSD CONSTRUCTIONS</strong> (hereinafter the "Employer") and <strong>${worker.fullName || worker.name}</strong>, NIC No: ${worker.nic || '___________'}${worker.address ? `, residing at ${worker.address}` : ''} (hereinafter the "Employee").</p>

                <h2>1. Position and Grade</h2>
                <p>The Employee is hired for the position of <strong>${worker.role || 'Construction Worker'}</strong>.</p>
                
                <h2>2. Remuneration</h2>
                <p><strong>Base Rate:</strong> LKR ${dailyRate.toLocaleString()} per day.</p>
                <p><strong>Overtime (OT):</strong> Any work exceeding 8 hours per day shall be paid at 1.5 times the normal hourly rate, as mandated by the Shop and Office Employees Act.</p>

                ${isBelowMin ? `
                <div class="clause-highlight" style="background-color: #fee2e2; color: #991b1b; border: 1px solid #f87171;">
                    <p><em>CRITICAL WARNING: The estimated monthly wage based on the daily rate is below the statutory minimum of LKR 30,000. Signing is strictly blocked.</em></p>
                </div>
                ` : ''}

                <h2>3. Statutory Contributions</h2>
                <p>The Employer shall comply with national statutory requirements:</p>
                <ul>
                    <li>12% of earnings contributed to the Employees' Provident Fund (EPF) by the Employer.</li>
                    <li>8% of earnings deducted as the Employee's contribution to the EPF.</li>
                    <li>3% of earnings contributed to the Employees' Trust Fund (ETF) by the Employer.</li>
                </ul>

                <h2>4. Operational Conduct & Safety</h2>
                <ul>
                    <li><strong>Attendance:</strong> Daily biometric or system attendance marking is mandatory. Fraudulent marking or proxy attendance is grounds for immediate termination without prior notice.</li>
                    <li><strong>Site Safety:</strong> Wearing provided Personal Protective Equipment (PPE) is mandatory at all times on site. Repeated safety violations will result in dismissal.</li>
                    <li><strong>Damage Liability:</strong> Gross negligence causing damage to tools, machinery, or materials shall make the Employee liable, and associated costs may be recovered from wages.</li>
                </ul>

                <h2>5. Probation and Termination</h2>
                <p>The Employee will be on probation for a period of three (3) months. During probation, the agreement may be terminated with 1 week's notice. Thereafter, a minimum of 1 month's notice is required for termination without cause.</p>
            `;
        }
        else if (type === 'Supplier') {
            const supplier = suppliers.find(s => String(s.id) === String(entityId));
            if (!supplier) return;
            title = `Supplier Agreement - ${supplier.name}`;

            content = `
                <h1>SUPPLIER AGREEMENT</h1>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p>This Supplier Agreement is made between <strong>SSD CONSTRUCTIONS</strong> (hereinafter the "Buyer") and <strong>${supplier.name}</strong>${supplier.address ? `, located at ${supplier.address},` : ''} (hereinafter the "Supplier").</p>

                <h2>1. Scope of Supply</h2>
                <p>The Supplier agrees to provide construction materials under the category of <strong>${supplier.category || 'General Materials'}</strong> conforming to requested specifications.</p>

                <h2>2. Quality Assurance & Replacements</h2>
                <p>All materials supplied must meet relevant Sri Lankan Standards (e.g., SLS 107 for Cement, SLS 375 for Steel). The Buyer reserves the right to reject sub-standard materials at the Supplier's expense. <strong>Rejected material must be replaced by the Supplier within 3 days at their own expense.</strong></p>

                <h2>3. Pricing & Delivery</h2>
                <ul>
                    <li><strong>Price Lock:</strong> Quoted rates are valid and locked for 60 days unless a written revision is specifically approved by the Buyer.</li>
                    <li><strong>Delivery Delay Penalty:</strong> Late supply beyond the agreed delivery date shall attract a penalty of 1% of the invoice value per day of delay.</li>
                </ul>

                <h2>4. Payment Terms</h2>
                <p>Payments will be settled via direct bank transfer (SLIPS/JustPay/CEFT) to the Supplier's designated bank account within 14 days of invoice submission and material verification.</p>
            `;
        }

        const newDoc = {
            id: 'temp_new',
            type,
            entityId: parseInt(entityId),
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

    const entities = type === 'Client' ? projects : type === 'Worker' ? workers : suppliers;

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
                                <option value="Supplier">Supplier Agreement</option>
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
