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
    const [entityId, setEntityId] = useState('');

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
    }, [type, entityId, projects, workers, suppliers]);

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

        // Check if an agreement already exists for this type and entity
        const existing = agreements.find(a => a.type === type && String(a.entityId) === String(entityId));
        if (existing) {
            setCurrentAgreement(existing);
            return;
        }

        let content = '';
        let title = '';
        let blockReason = null;

        if (type === 'Client') {
            const project = projects.find(p => String(p.id) === String(entityId));
            if (!project) return;
            title = `Contract Agreement - ${project.name}`;

            const amt = Number(project.contractValue || 0);
            const isCIGFL = amt > 15000000;
            const isResidential = project.projectType === 'Residential';

            content = `
                <h1>CONTRACT AGREEMENT (SBD-03)</h1>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Parties:</strong></p>
                <p>This Contract Agreement is made between <strong>${project.client || 'Client Name'}</strong> (hereinafter called "the Employer") and <strong>SSD CONSTRUCTIONS</strong> (hereinafter called "the Contractor").</p>
                
                <h2>1. Priority of Documents</h2>
                <p>The following documents shall be deemed to form and be read and construed as part of this Agreement in the following order of priority:</p>
                <ul>
                    <li>(a) The Letter of Acceptance</li>
                    <li>(b) This Contract Agreement</li>
                    <li>(c) The Memorandum of Understanding (MOU)</li>
                    <li>(d) The Accepted Bill of Quantities (BOQ)</li>
                    <li>(e) The Conditions of Contract</li>
                </ul>

                <h2>2. Financial Clauses</h2>
                <p><strong>Contract Value:</strong> LKR ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <ul>
                    <li><strong>Advance Payment:</strong> The Employer shall pay an advance payment of maximum 30% of the Contract Price subject to an Advance Payment Guarantee.</li>
                    <li><strong>Retention:</strong> A retention of 10% shall be deducted from each interim payment, up to a maximum limit of 5% of the Initial Contract Price.</li>
                    <li><strong>Defects Liability Period:</strong> The Defects Liability Period is 365 Days from the date of taking over.</li>
                </ul>

                <h2>3. Contractor Protections</h2>
                <ul>
                    <li><strong>Suspension of Work:</strong> The Contractor reserves the right to suspend works in the event of non-payment of certified bills exceeding 14 days from due date.</li>
                    <li><strong>Interest on Late Payment:</strong> Late payments shall incur an interest charge of 1.5% per month.</li>
                </ul>
                
                ${isCIGFL ? `
                <div class="clause-highlight">
                    <h2>4. Tax & Regulatory Compliance (CIGFL)</h2>
                    <p>As this contract exceeds LKR 15,000,000, it is subject to the Construction Industry Guarantee Fund Levy (CIGFL). The Contractor's CIDA registration (CPC/DS/KU/4717) is maintained accordingly.</p>
                </div>
                ` : ''}

                ${isResidential ? `
                <div class="clause-highlight">
                    <h2>5. Construction Escrow (Residential)</h2>
                    <p>Both parties agree that milestone payments may be facilitated via a Construction Escrow account to ensure financial security and timely disbursements.</p>
                </div>
                ` : ''}
            `;
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
                <p>This Employment Agreement is entered into by and between <strong>SSD CONSTRUCTIONS</strong> (hereinafter the "Employer") and <strong>${worker.fullName || worker.name}</strong>, NIC No: ${worker.nic || '___________'} (hereinafter the "Employee").</p>

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

                <h2>4. Probation and Termination</h2>
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
                <p>This Supplier Agreement is made between <strong>SSD CONSTRUCTIONS</strong> (hereinafter the "Buyer") and <strong>${supplier.name}</strong> (hereinafter the "Supplier").</p>

                <h2>1. Scope of Supply</h2>
                <p>The Supplier agrees to provide construction materials under the category of <strong>${supplier.category || 'General Materials'}</strong> conforming to requested specifications.</p>

                <h2>2. Quality Assurance</h2>
                <p>All materials supplied must meet relevant Sri Lankan Standards (e.g., SLS 107 for Cement, SLS 375 for Steel). The Buyer reserves the right to reject sub-standard materials at the Supplier's expense.</p>

                <h2>3. Payment Terms</h2>
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
            <div className="section-header">
                <h2>Agreement Generator</h2>
                <div className="header-actions">
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
                            <label>Agreement Type</label>
                            <select value={type} onChange={e => { setType(e.target.value); setEntityId(''); }}>
                                <option value="Client">Client Contract (SBD-03)</option>
                                <option value="Worker">Worker Employment</option>
                                <option value="Supplier">Supplier Agreement</option>
                            </select>
                        </div>

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
