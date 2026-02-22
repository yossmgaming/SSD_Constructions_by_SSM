A. Client (Owner-Contractor) Agreement
This template should follow the CIDA (Construction Industry Development Authority) standard bidding documents, specifically SBD-03 for minor contracts.
• Priority of Documents: The code must automatically define the document hierarchy: Letter of Acceptance, Contract Agreement, MOU, Accepted BOQ, and Conditions of Contract.
• Financial Clauses:
    ◦ Advance Payment: Limit to 30% for projects below Rs. 50 million, conditional on an advance payment guarantee.
    ◦ Retention: Automate a 10% deduction from certified work, capped at a maximum of 5% of the initial contract price.
    ◦ Defects Liability: Set a standard 365-day period from the date of taking over.
• Contractor Protection Clauses:
    ◦ Suspension of Work: Include a clause allowing work suspension for non-payment.
    ◦ Interest on Late Payment: Automatically insert a clause for interest claims on certified work not settled within the agreed timeframe.
• Tax Compliance: If the contract value exceeds Rs. 15 million, the generator must include a notice regarding the Construction Industry Guarantee Fund Levy (CIGFL), ranging from 0.25% to 1%.
B. Worker (Employment) Agreement
This must strictly adhere to the Shop and Office Employees Act and the Industrial Disputes Act.
• Mandatory Particulars: The agreement must state the employee’s name, designation, grade, and nature of employment.
• Wage & Time Compliance:
    ◦ Minimum Wage: Ensure the base salary meets the national minimum of Rs. 30,000 per month (effective Jan 2026).
    ◦ Overtime: Define OT as 1.5 times the normal hourly rate.
    ◦ Probation: Explicitly state a period of 3 to 6 months.
• Statutory Contributions: Clearly outline the employer’s obligation to pay 12% EPF and 3% ETF.
• Termination Terms: Define notice periods based on service length (e.g., 1 week for <1 year, 1 month for 1–3 years).
C. Supplier Agreement
• Payment Standards: Use JustPay or SLIPS for automated fund transfers.
• Quality Assurance: Include clauses for materials testing (e.g., cement must meet SLS 107 standards).

(a) The Letter of Acceptance
• Purpose: This is the formal notification from the employer to the contractor confirming that their bid has been accepted. It establishes the "Contract Value".
• Related Laws:
    ◦ Finance Act No. 5 of 2005 (CIGFL): The contract value stated here determines the mandatory Construction Industry Guarantee Fund Levy (0.25% to 1%).
• Development Strategy:
    ◦ Data Source: Pull the "Awarded Sum" and "Project Name" from the projects table.
    ◦ Logic: The system should automatically generate a document stating the accepted sum, the intended start date, and a request for the Performance Security (typically 5% of the contract sum).
(b) The Contract Agreement
• Purpose: The formal legal instrument that binds both parties to the project terms.
• Related Laws:
    ◦ Electronic Transactions Act No. 19 of 2006: Validates that these agreements are legally binding when signed electronically.
    ◦ Evidence (Special Provisions) Act No. 14 of 1995: Ensures digital versions are admissible in court.
• Development Strategy:
    ◦ Template: Use the CIDA SBD-03 Standard Form of Agreement.
    ◦ Technical Implementation: Use your existing Certified Electronic Signature (CES) logic to lock the document once both parties click "Sign".
(c) The Memorandum of Understanding (MOU)
• Purpose: Used to capture specific side-agreements or preliminary understandings not fully detailed in the standard contract.
• Related Laws:
    ◦ Law of Contract (Sri Lanka): MOUs are enforceable if they contain clear offer, acceptance, and consideration.
• Development Strategy:
    ◦ UI Component: Add a rich-text editor in the "Tools" section where managers can type project-specific clauses (e.g., special material handling or site access hours).
    ◦ Database: Save this as a new entry in a project_mous table linked to the ProjectID.
(d) The Accepted Bill of Quantities (BOQ)
• Purpose: The detailed breakdown of work items, quantities, and rates used as the primary reference for all payments.
• Related Laws:
    ◦ Standard Method of Measurement (SLS 573:1982): All quantities and measurements must follow these principles for building works in Sri Lanka.
• Development Strategy:
    ◦ Enhancement: Your current BOQGenerator.jsx already creates this.
    ◦ Integration: The "Accepted BOQ" must be "locked" upon project award. This data should then feed directly into the Interim Certificate module, allowing engineers to enter daily dimensions to prevent "he-said-she-said" disputes.
(e) The Conditions of Contract
• Purpose: The "Rulebook" for the project, defining how to handle variations, delays, and payments.
• Related Laws/Standard Clauses:
    ◦ Advance Payments: Limit to 30% for projects < Rs. 50 million.
    ◦ Retention Money: Deduct 10% from each interim bill, capped at 5% of the total price to cover defects.
    ◦ Defects Liability Period: A standard 365-day period after project take-over.
    ◦ Suspension of Work: Contractors have a legal right to suspend work for non-payment.
• Development Strategy:
    ◦ Automated Clause Injection:
        ▪ If Project Value > 15M, inject the CIGFL Tax Clause.
        ▪ If Project Type = Residential, inject the Rolling 3-Month Escrow Clause to secure funding from private clients.
    ◦ Dispute Resolution: Automatically include a clause identifying the Construction Guarantee Fund (CGF) as a provider for collateral-free bonds and dispute mediation.
Summary Table for Developers
Document
Legal Anchor
Software Action
Letter of Acceptance
Finance Act (CIGFL)
Pull AwardSum, calculate Levy%
Contract Agreement
Electronic Transactions Act
Trigger CertifiedSignature logic
MOU
Contract Law
Provide custom text entry for side-deals
Accepted BOQ
SLS 573 Measurement Standard
Lock items to prevent rate changes
Conditions of Contract
CIDA SBD-03 Framework
Auto-deduct 10% Retention in Payroll/Payments

Below is a verification of the legal text and logic for each component:
(a) Letter of Acceptance
• Performance Security: Your 5% calculation is exactly in line with the Procurement Manual Supplement-29, which mandates a performance security of not less than 5% of the estimated contract sum.
• CIGFL Tiers: Quoting the Construction Industry Guarantee Fund Levy (CIGFL) for projects > Rs. 15M is legally required under the Finance Act No. 5 of 2005. To be 100% correct, ensure your "explicit quotes" follow these specific tiers:
    ◦ Rs. 15M to < Rs. 50M: 0.25%
    ◦ Rs. 50M to < Rs. 150M: 0.5%
    ◦ Rs. 150M or more: 1.0%.
(b) Contract Agreement (SBD-03)
• Adherence: Using the CIDA/SBD/03 (Minor Contracts) framework is the industry standard in Sri Lanka.
• Document Priority: Your system should ensure the generated agreement reflects the standard Priority of Documents hierarchy: (1) Letter of Acceptance, (2) Contract Agreement, (3) MOU, (4) Accepted BOQ, (5) Schedule, and (6) Conditions of Contract.
(c) Memorandum of Understanding (MOU)
• Flexibility: Including a custom text box for side-deals is a critical feature because the CIDA framework explicitly recognizes the MOU (if any) as the third-highest priority document in a contract.
(d) Accepted Bill of Quantities (BOQ)
• Measurement Standards: Locking the measurements to the SLS 573:1982 (Standard Method of Measurement) is the correct legal anchor for building works in Sri Lanka. This prevents "measure and pay" disputes, which are a leading cause of payment delays in the local sector.
(e) Conditions of Contract
The specific parameters you’ve listed are perfectly compliant with Supplement-29 and CIDA guidelines:
• Advance Payment: A 30% limit for works below Rs. 50 million is the legal maximum.
• Retention: The 10% deduction from interim bills, capped at 5% of the initial contract price, is the standard practice for remedying defects.
• Defects Liability: The 365-day period from taking over is the standard duration required by CIDA for minor contracts.
• CGF Integration: Identifying the Construction Guarantee Fund (CGF) for dispute resolution is a major strategic advantage, as CGF provides technical advice and mediation specifically for Sri Lankan contractors.
Legal Validity of the System
Your implementation of the digital signature lock and timestamped agreements table provides high judicial assurance under two key acts:
1. Electronic Transactions Act No. 19 of 2006: Ensures the legal validity of your electronic contracts and signatures.
2. Evidence (Special Provisions) Act No. 14 of 1995: Makes these digital records admissible as evidence in Sri Lankan courts, protecting SSD Constructions from unethical client behaviors like "bid shopping" or "unjustified withholding".
Verdict: The legal logic implemented in Phase 5 is correct and provides a comprehensive shield against the financial and ethical risks prevalent in the Sri Lankan construction sector.

Below is the research-based expanded plan for each agreement, including the specific legal language and details needed to mitigate risks like "scope creep," "payment delays," and "ethical deficits."
1. The Letter of Acceptance (LoA)
The LoA should not just notify the award; it must set the legal clock for the project.
• Performance Security Deadline: Explicitly state that failure to furnish the 5% Performance Security within 14 days constitutes a breach of contract, allowing the employer to cancel the award.
• CIGFL Registration Requirement: For contracts over Rs. 15 million, include a mandatory clause requiring the contractor to register with the Inland Revenue WHT Branch for the Construction Industry Guarantee Fund Levy (0.25%–1%).
• Hierarchy of Documents: List the documents that will form the contract to establish "Priority of Documents" immediately (LoA, Agreement, MOU, BOQ, Conditions).
2. The Contract Agreement (SBD-03)
This document should be the anchor for digital and physical legal validity.
• Digital Signature Validity: Incorporate a clause stating the agreement is executed under the Electronic Transactions Act No. 19 of 2006, making digital signatures and timestamps legally equivalent to handwritten ones.
• Reference to CIDA Standards: State clearly that the contract is governed by the CIDA/SBD/03 (Minor Contracts) second edition (January 2007).
• Definition of Parties: Clearly define the "Employer" (the one providing funds) and the "Contractor" (the one implementing the work) to avoid role ambiguity during disputes.
3. The Memorandum of Understanding (MOU)
Use the MOU to address the "small details" that clients often turn into big problems.
• Site Access & Utilities: Detail who is responsible for paying for construction water and electricity (typically the contractor's cost in Preliminaries).
• Storage of Materials: Define the "ownership of material at site"—stating that materials paid for in interim bills become the property of the employer but remain under the contractor's care.
• Workplace Ethics: Add a "Anti-Bribery and Transparency" clause to signal SSD's commitment to ethical leadership, reducing the chance of clients requesting illicit favors.
4. The Accepted Bill of Quantities (BOQ)
This is where most "he-said-she-said" disputes occur regarding money.
• The "Measure and Pay" Clause: Explicitly state that this is a Measure and Pay contract. Explain that the quantities in the BOQ are estimates, and final payment will be based on actual on-site measurements verified by field engineers.
• Standard of Measurement: Lock the measurement principles to SLS 573:1982 (Standard Method of Measurement for Building Works in Sri Lanka) to prevent disputes over how volumes and areas are calculated.
• Variation Logic: State that no work outside the "Accepted BOQ" will be paid for without a written Variation Order signed via the SSD client portal.
5. The Conditions of Contract
This should be the "Rulebook" for the project.
• Advance Payment Recovery: Detail that the 30% advance is not a gift; it will be fully recovered before 90% of total payments are made to the contractor.
• Retention Mechanics: Explain that 10% is deducted from every bill (capped at 5% of total price) and held for 365 days as a "Defects Liability Period" to ensure the client is protected from poor workmanship.
• Suspension for Non-Payment: Include a clause giving the contractor the right to suspend work if a certified interim bill is not paid within 14 days of the due date.
• CGF Dispute Resolution: Identify the Construction Guarantee Fund (CGF) as the first point of mediation to avoid expensive court cases.
6. The Employment Agreement (Worker)
To protect SSD at a Labour Tribunal, this must be highly detailed.
• Statutory Compliance: Explicitly list the 12% EPF and 3% ETF employer contributions and the 8% EPF employee deduction.
• Probation and Termination: Define a 3 to 6-month probation period. State that during probation, termination requires 1 week's notice, whereas permanent staff require 1 to 2 months based on service length.
• Working Hours: Set a standard 45-hour work week (Shop & Office Act) or 48-hour week (Wages Boards) and define Overtime (OT) as 1.5x the normal hourly rate.
• Disciplinary Code: Reference a "Disciplinary Inquiry Procedure" (preliminary investigation, show-cause letter, impartial inquiry) to justify any future dismissals.
7. The Supplier Agreement
To prevent "Quality Fraud" and supply chain delays.
• SLS Standards: Explicitly list that materials must meet Sri Lankan Standards (e.g., SLS 107 for Cement, SLS 375 for Steel).
• Right to Reject: Add a clause stating SSD has the right to reject substandard materials at the supplier's expense, including the cost of removing the material from the site.
• Digital Payment Terms: Specify that payments will only be made via LankaPay JustPay or SLIPS to ensure a digital audit trail and faster liquidity.
Summary Recommendation: By including these specific statutory references and procedural details, you transform these documents from simple forms into a "Single Source of Truth" that discourages clients from creating "fictional" problems during the project lifecycle.

Based on the sources, here is the development plan for these specific roles and agreements.
1. Site Supervisor & Engineer Agreements (Management Staff)
These roles are covered by the Shop and Office Employees Act. Unlike manual workers, their agreements must include specific "Duty and Integrity Clauses."
• Remuneration & Statutory Compliance:
    ◦ Must meet the Rs. 30,000 national minimum wage (effective Jan 2026).
    ◦ Automatic calculation of 12% EPF and 3% ETF (Employer) and 8% EPF (Employee).
• The "Integrity & Reporting" Clause:
    ◦ Attendance Tracking: Explicitly state that the supervisor is responsible for verifying worker attendance using the biometric facial verification system to eliminate "buddy punching" and time theft.
    ◦ Daily Digital Logs: Mandate the submission of daily digital logs through the app. The software should auto-fill weather, headcount, and progress updates, requiring the supervisor to only verify work summaries.
    ◦ Goal Setting: Include a clause for Project Daily/Weekly/Monthly Goals. These should be linked to the "Labor Efficiency Variance" KPI in your software, which tracks the difference between budgeted labor hours and actual biometric-verified hours.
• Material Stewardship: Supervisors must be contractually liable for updating the Material Inventory in real-time to prevent "Quality Fraud" (using substandard materials or exaggerated quantities).
2. Subcontractor Agreements (Domestic Sub-Contracts)
Subcontractors are independent entities. Their agreements should follow the CIDA SBD-03 framework but with specific protections for SSD Constructions.
• Scope of Externalized Work: Use the MOU function to detail exactly which parts of the BOQ (e.g., plumbing, electrical) are outsourced.
• "Measure and Pay" Clause: Ensure the agreement specifies that payments are based on actual on-site measurements verified by an SSD Engineer daily. This reduces the lengthy measurement finalizing process that often causes payment delays.
• Joint Liability Protection: Include a clause stating that the Subcontractor is solely responsible for their workers' EPF/ETF and insurance. Under Sri Lankan law, if a subcontractor fails to pay, the main employer (SSD) could be held jointly liable.
• CIGFL Compliance: If the subcontract value is part of a project exceeding Rs. 15 million, the software must flag that the subcontractor is also liable for the CIGFL levy (0.25% to 1.0%).
3. Fraud Prevention & Goal Tracking Features
To automate the duties described in these agreements, your software should implement the following functions:
Feature
Legal/Strategic Anchor
Technical Action
Biometric Facial Verification
Eliminate "Buddy Punching"
Use AI-powered face scans for all clock-ins to ensure 100% timesheet accuracy.
GPS Geo-Fencing
Accountability from the field
Restrict clock-ins to within 50 meters of the project coordinates defined in the projects table.
SLS Standard Locking
Quality Assurance
Force Supervisors to select material types that meet SLS 107 (Cement) or SLS 375 (Steel) in the inventory module.
Rolling 3-Month Escrow
Private Client Security
For residential villa/house projects, link the supervisor's progress reports to trigger fund releases from a segregated escrow account.
Automated Interest Claims
Contractor Protection
If a client or main contractor delays payment beyond 14 days, the software should automatically generate an Interest Claim of 1.5% per month.
4. KPIs for Site Management
Your "Reports" page should track these three specific metrics to evaluate supervisor and engineer performance:
1. Attendance Fraud Incident Rate: Should be 0% if using biometrics.
2. Labor Efficiency Variance: Comparing actual hours (biometric) against budgeted hours (BOQ) to spot inefficiencies or over-reporting.
3. Defect Notification Frequency: Tracking defects found during the 365-day liability period via the client portal to assess the engineer's quality control.
By integrating these specific clauses and tracking tools, you ensure that every stakeholder—from the engineer to the subcontractor—is contractually and technologically held to the same high ethical and operational standards.

Integrating accountants into the system will bridge the gap between field progress and financial finalization, specifically addressing the "non-payment crisis" and tax compliance.
1. Strategic Justification for the Accountant Role
• Managing the "Domino Effect": Construction projects in Sri Lanka suffer from a chain of payment delays that can lead to insolvency. Accountants are needed to monitor Days Sales Outstanding (DSO) and ensure that certified work is collected within 30 days.
• Statutory Compliance: The Sri Lankan legal framework for employment and taxes is complex. Accountants ensure that mandatory contributions like EPF (12%) and ETF (3%) are remitted correctly to avoid "red flags" during labor audits.
• Fraud Prevention: Accountants act as a final check against phantom employee schemes (where fictitious names are added to payroll) and invoice fraud (duplicate or exaggerated material claims).
2. The Accountant Agreement: Key Clauses
The agreement for this role should follow the Shop and Office Employees Act and include these specific duties:
• Tax Management (CIGFL & APIT): The accountant must be responsible for registering and remitting the Construction Industry Guarantee Fund Levy (CIGFL) for projects exceeding Rs. 15 million (ranging from 0.25% to 1%). They must also manage the Advance Personal Income Tax (APIT) for employees exceeding the Rs. 150,000 monthly threshold.
• Payroll Audit: A mandatory duty to reconcile biometric facial verification data against the payroll to ensure 100% accuracy in labor costs.
• Bank Reconciliation: Responsibility for settling supplier and worker payments via the LankaPay JustPay or SLIPS network to maintain a digital audit trail.
• Liquidity Monitoring: They must provide monthly reports on Liquidity Ratios (Current Ratio > 1.1 and Quick Ratio > 1.0) to ensure the firm can meet short-term obligations despite economic volatility.
3. Suggested Software Features for the Accountant Module
To empower this role, your software should include:
Feature
Strategic Anchor
Software Action
Tax Compliance Dashboard
CIGFL Compliance
Automatically flag projects over Rs. 15M for levy deductions.
Financial Red Flag Alerts
Risk Mitigation
Alert the accountant if a contract receivable balance exceeds 90 days.
Biometric vs. Payroll Sync
Fraud Prevention
Compare actual verified hours from SmartBarrel-style logs to the payroll run.
DSO Tracker
Cash Flow Management
Track the "Days Sales Outstanding" to evaluate the efficiency of the agreement and payment system.
JustPay Integration
Digital Trust
Direct link to the LankaPay network for real-time fund transfers at low commission rates (0.5% - 1%).
4. Legal Admissibility for Financial Records
Because accountants will be handling sensitive financial data and contracts, the system must maintain records according to the Evidence (Special Provisions) Act No. 14 of 1995. This ensures that the digital balance sheets and tax filings generated by your software are admissible in the Colombo Commercial Court or other judicial forums in case of a dispute.
By adding this role, you transform the SSD software from a site management tool into a full Enterprise Resource Planning (ERP) system, similar to industry leaders like AFAS or Zoho, but localized for the Sri Lankan construction sector.

To implement separate generation buttons for Sinhala and Tamil in the SSD Constructions suite, you should leverage the existing react-i18next framework and the professional branding engine in exportUtils.js. This ensures that your agreements comply with the statutory requirement in Sri Lanka to provide clear contractual terms in an employee’s or client's native language.
1. UI Implementation: The Dual-Button System
Within your Agreement Generator (Phase 5) UI, instead of a single "Generate" button, you will implement a multi-language selection group.
• Placement: Add these buttons to the AgreementGenerator.jsx component and the ExportDropdown.jsx menu.
• Visual Design: Use the Sri Lankan flag or clear labels (e.g., "සිංහල" and "தமிழ்") to differentiate the generation triggers.
• How it works: Each button will pass a specific language parameter (e.g., lang: 'sn' or lang: 'tm') to the document generation function.
2. Technical Architecture for Multilingual Generation
The process will follow a four-step logic flow:
1. Translation Repositories: You must create a new locale file, tm.json, in the src/locales/ directory to store Tamil legal terminology alongside your existing English and Sinhala files.
2. Standard Bidding Document (SBD) Mapping: To ensure legal accuracy, your Tamil templates should strictly follow the CIDA/SBD/06 (Tamil version of Minor Contracts) and your Sinhala templates should follow ICTAD/SBD/05.
3. Font Embedding: Since standard PDF libraries like jsPDF often struggle with Unicode, your exportUtils.js must be updated to embed Unicode-compliant fonts (e.g., Iskoola Pota for Sinhala and Latha for Tamil) to prevent the "boxes/corrupted text" issue in exported PDFs.
4. Branding Engine Integration: The generation function will pull the SSD Constructions letterhead and registration details, then dynamically inject the translated text based on the user's button choice.
3. Legal and Operational Benefits
Adding these buttons is more than a UI upgrade; it fulfills specific legal and ethical goals:
• Statutory Compliance: Under Section 10B of the Industrial Disputes Act, employers bound by collective agreements are required to exhibit notices and provisions in Sinhala, Tamil, and English. Providing employment agreements in the worker's native tongue ensures the contract is enforceable in a Labour Tribunal.
• Ethical Leadership: By providing Tamil agreements for projects in regions like the North or East, or for Tamil-speaking workforces, SSD Constructions demonstrates "ethical leadership" and transparency, which helps attract institutional partners and higher-quality clients.
• Admissibility in Court: Documents generated in native languages through your system remain legally valid under the Electronic Transactions Act No. 19 of 2006 and are admissible as evidence in the Colombo Commercial Court or other judicial forums.
4. Sample Workflow for a "Worker Agreement"
• Action: Manager clicks the "தமிழ்" (Tamil) generation button for a new plumber.
• Logic: The system pulls the plumber’s specific data (Daily Rate: LKR 4,500, Designation: Plumber).
• Generation: The engine loads the Tamil template for employment contracts, calculates the mandatory 12% EPF / 3% ETF and 1.5x OT clauses in Tamil, and applies the "SIGNED" watermark upon electronic signature.
• Output: A professionally branded PDF in Tamil is generated, ready for the worker to review and sign.