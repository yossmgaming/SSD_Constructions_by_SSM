import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    ImageRun,
    AlignmentType,
    Header,
    Footer,
    PageNumber,
    WidthType,
    BorderStyle
} from 'docx';

// COMPANY DETAILS (From company_details.md)
const COMPANY = {
    name: "SSD CONSTRUCTIONS",
    proprietor: "Mr. Priyantha Madawatta",
    address: "136/1, UDAGUNNAPANA, GUNNAPANA, KANDY",
    phones: "0774 286 106 / 0765 711 938",
    registration: "CPC/DS/KU/4717",
    email: "ssdconstructions2020@gmail.com",
    footerReg: "SSD CONSTRUCTIONS - CPC/DS/KU/4717"
};

// LOGO PATHS (Formal BOQ logo is now preferred for all headers as per user request)
const LOGO_PATH = '/Logo/boq_header_logo.png';
const BOQ_LOGO_PATH = '/Logo/boq_header_logo.png';

/**
 * Helper to fetch image and convert to Base64 for PDF/Word
 */
async function getBase64Image(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to load image:", url, e);
        return null;
    }
}

/**
 * EXPORT BOQ TO PDF (Specialized for Engineers/Clients)
 */
export async function exportBOQ({ project, items, fileName }) {
    try {
        const doc = new jsPDF();
        const boqLogoBase64 = await getBase64Image(BOQ_LOGO_PATH);

        // Header for BOQ (Synchronized with Word)
        if (boqLogoBase64) {
            doc.addImage(boqLogoBase64, 'PNG', 15, 10, 55, 18, 'boq_logo');
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(COMPANY.name, 195, 15, { align: 'right' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(COMPANY.proprietor, 195, 22, { align: 'right' });
        doc.text(COMPANY.address, 195, 27, { align: 'right' });
        doc.text(`Phone: ${COMPANY.phones}`, 195, 32, { align: 'right' });
        doc.text(`Reg: ${COMPANY.registration}`, 195, 37, { align: 'right' });

        doc.setDrawColor(200);
        doc.line(15, 42, 195, 42);

        let y = 52;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`BILL OF QUANTITIES: ${project.name}`, 15, y);

        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Client: ${project.client || 'N/A'}`, 15, y);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 160, y);

        y += 10;
        autoTable(doc, {
            startY: y,
            head: [['ITEM', 'DESCRIPTION', 'QTY', 'UNIT', 'RATE', 'AMOUNT']],
            body: items.map((item, i) => [
                i + 1,
                item.description,
                item.qty,
                item.unit,
                Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })
            ]),
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50] },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { top: 45, bottom: 25 },
            didDrawPage: (data) => {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();

                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(COMPANY.footerReg, 15, pageHeight - 15);

                const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
                const str = "Page " + pageNumber + " of {total_pages_count_tag}";
                doc.text(str, (pageWidth / 2) + 20, pageHeight - 15, { align: 'center' });

                const emailWidth = doc.getTextWidth(COMPANY.email);
                doc.text(COMPANY.email, pageWidth - emailWidth - 15, pageHeight - 15);
            }
        });

        if (typeof doc.putTotalPages === 'function') {
            doc.putTotalPages('{total_pages_count_tag}');
        }

        const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL PROJECT ESTIMATE: LKR ${total.toLocaleString()}`, 120, finalY);

        doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
        console.error("BOQ Export Error:", e);
        alert("Failed to generate BOQ PDF.");
    }
}

/**
 * Helper to decode basic HTML entities for PDF/Word text
 */
function decodeHTML(html) {
    if (!html) return '';
    return html
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#39;/g, "'");
}

/**
 * Helper to draw standard branded letterhead on a PDF page
 */
function drawLetterhead(doc, logoBase64) {
    if (logoBase64) {
        doc.setFillColor(255, 255, 255);
        doc.rect(15, 8, 55, 18, 'F');
        doc.addImage(logoBase64, 'PNG', 15, 8, 55, 18, 'main_logo');
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(COMPANY.name, 195, 15, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY.proprietor, 195, 22, { align: 'right' });
    doc.text(COMPANY.address, 195, 27, { align: 'right' });
    doc.text(`Phone: ${COMPANY.phones}`, 195, 32, { align: 'right' });
    doc.text(`Reg: ${COMPANY.registration}`, 195, 37, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(15, 42, 195, 42);
}

export async function exportAgreementPDF({ agreement, htmlContent, fileName }) {
    const lang = agreement.exportLanguage || 'en';
    const fontUrl = lang === 'sn'
        ? 'https://fonts.googleapis.com/css2?family=Noto+Serif+Sinhala:wght@400;700&display=swap'
        : lang === 'ta'
            ? 'https://fonts.googleapis.com/css2?family=Noto+Serif+Tamil:wght@400;700&display=swap'
            : 'https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap';

    const fontFamily = lang === 'sn' ? "'Noto Serif Sinhala', serif" : lang === 'ta' ? "'Noto Serif Tamil', serif" : "'Times New Roman', serif";
    const secondParty = agreement.type === 'Client' ? 'Employer' : agreement.type === 'Worker' ? 'Employee' : agreement.type === 'Supplier' ? 'Supplier' : agreement.type === 'Subcontractor' ? 'Subcontractor' : 'Party';

    try {
        const logoBase64 = await getBase64Image(LOGO_PATH);

        // Preload font in current document to ensure it's cached by the browser
        if (!document.getElementById('ssd-unicode-font')) {
            const link = document.createElement('link');
            link.id = 'ssd-unicode-font';
            link.rel = 'stylesheet';
            link.href = fontUrl;
            document.head.appendChild(link);
            await document.fonts.ready;
        }

        // Create a standalone HTML element to pass to html2pdf
        const container = document.createElement('div');
        // Setting specific styling ensures html2canvas parses it correctly. No fixed/hidden needed since from(element) manages it.
        container.style.cssText = 'width: 170mm; background: #fff; box-sizing: border-box;';

        container.innerHTML = `
            <style>
                @import url("${fontUrl}");
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: ${fontFamily}; font-size: 11pt; color: #000; }
                h1 { font-size: 14pt; font-weight: bold; text-align: center; margin: 12px 0 12px 0; }
                h2 { font-size: 11pt; font-weight: bold; margin: 12px 0 6px 0; }
                p { margin: 6px 0 10px 0; line-height: 1.5; }
                ul, ol { margin: 6px 0 10px 24px; }
                li { margin-bottom: 4px; line-height: 1.5; }
                strong { font-weight: bold; }
                .watermark { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; color: rgba(16,185,129,0.1); font-weight: bold; font-family: Arial; pointer-events: none; z-index: -1; }
                .signatures { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                .sig-block { text-align: center; width: 45%; }
                .sig-line { border-top: 1px solid #000; margin-top: 50px; margin-bottom: 6px; }
            </style>
            ${agreement.status === 'Signed' ? '<div class="watermark">SIGNED</div>' : ''}
            <div>${htmlContent}</div>
            <div class="signatures">
                <div class="sig-block">
                    <div class="sig-line"></div>
                    <div style="font-family:Arial;font-weight:bold;">For SSD CONSTRUCTIONS</div>
                    <div style="font-family:Arial;font-size:9pt;">Authorized Signatory</div>
                </div>
                <div class="sig-block">
                    <div class="sig-line"></div>
                    <div style="font-family:Arial;font-weight:bold;">For the ${secondParty}</div>
                    <div style="font-family:Arial;font-size:9pt;">Authorized Signatory</div>
                </div>
            </div>`;

        // Configure html2pdf to use margins to leave space for our custom jsPDF headers/footers
        const opt = {
            margin: [45, 20, 30, 20], // top, right, bottom, left margins in mm
            filename: `${fileName}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Generate PDF, then manually add repeating headers and footers to every sliced page
        await html2pdf().set(opt).from(container).toPdf().get('pdf').then((pdf) => {
            const totalPages = pdf.internal.getNumberOfPages();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);

                // Draw Global Header (Letterhead)
                drawLetterhead(pdf, logoBase64);

                // Draw Global Footer
                pdf.setFontSize(8);
                pdf.setTextColor(100);
                pdf.setFont('helvetica', 'normal');
                pdf.text(COMPANY.footerReg, 15, pageHeight - 15);

                const emailWidth = pdf.getTextWidth(COMPANY.email);
                pdf.text(COMPANY.email, pageWidth - emailWidth - 15, pageHeight - 15);

                pdf.text(`Page ${i} of ${totalPages}`, (pageWidth / 2), pageHeight - 15, { align: 'center' });
            }
        }).save();

    } catch (e) {
        console.error("Agreement PDF Export Error:", e);
        alert("Failed to generate Agreement PDF.");
    }
}

/**
 * EXPORT AGREEMENT TO DOCX
 */
export async function exportAgreementWord({ agreement, htmlContent, fileName }) {
    const logoBase64 = await getBase64Image(LOGO_PATH);
    const logoUint8 = logoBase64 ? Uint8Array.from(atob(logoBase64.split(',')[1]), c => c.charCodeAt(0)) : null;

    const decodedContent = decodeHTML(htmlContent);
    // Parse HTML into docx Paragraphs with native formatting
    const blocks = decodedContent
        .split(/(<\/?h[1-2]>|<\/?p>|<\/?ul>|<\/?ol>|<\/?li>|<\/?div>|<br\s*\/?>)/gi)
        .filter(b => b && b.trim() !== '');

    const paragraphs = [];
    let currentBlockType = 'p';
    let isInsideList = false;

    for (const block of blocks) {
        const tag = block.toLowerCase();
        if (tag === '<h1>') { currentBlockType = 'h1'; continue; }
        if (tag === '<h2>') { currentBlockType = 'h2'; continue; }
        if (tag === '<ul>' || tag === '<ol>') { isInsideList = true; continue; }
        if (tag === '<li>') { currentBlockType = 'li'; continue; }
        if (tag === '<p>' || tag === '<div>') { currentBlockType = 'p'; continue; }
        if (tag.startsWith('<br')) { currentBlockType = 'p'; continue; }

        if (tag.startsWith('</')) {
            if (tag === '</ul>' || tag === '</ol>') isInsideList = false;
            currentBlockType = 'p';
            continue;
        }

        const cleanText = block.replace(/<[^>]+>/g, '').trim();
        if (!cleanText) continue;

        // Parse inline bolding
        const segments = block.split(/(<\/?strong>)/gi);
        const children = [];
        let isStrong = false;

        for (const seg of segments) {
            if (seg.match(/<strong/i)) { isStrong = true; continue; }
            if (seg.match(/<\/strong/i)) { isStrong = false; continue; }

            const text = seg.replace(/<[^>]+>/g, '');
            if (text) {
                children.push(new TextRun({
                    text: isInsideList && currentBlockType === 'li' && children.length === 0 ? `• ${text}` : text,
                    bold: isStrong || currentBlockType === 'h1' || currentBlockType === 'h2',
                    size: currentBlockType === 'h1' ? 28 : currentBlockType === 'h2' ? 22 : 20,
                    font: "Times New Roman"
                }));
            }
        }

        if (children.length > 0) {
            paragraphs.push(new Paragraph({
                children,
                spacing: {
                    after: currentBlockType === 'li' ? 80 : 160,
                    before: currentBlockType.startsWith('h') ? 240 : 0
                },
                alignment: currentBlockType === 'h1' ? AlignmentType.CENTER : AlignmentType.LEFT,
                indent: isInsideList ? { left: 720 } : undefined // Indent list items
            }));
        }
    }

    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 1440, bottom: 1440, left: 1134, right: 1134 } } }, // ~25mm top/bottom, 20mm sides
            headers: {
                default: new Header({
                    children: [
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            width: { size: 30, type: WidthType.PERCENTAGE },
                                            children: [logoUint8 ? new Paragraph({ children: [new ImageRun({ data: logoUint8, transformation: { width: 140, height: 45 } })] }) : new Paragraph({ children: [new TextRun({ text: COMPANY.name, bold: true, font: "Times New Roman" })] })],
                                        }),
                                        new TableCell({
                                            width: { size: 70, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({ children: [new TextRun({ text: COMPANY.name, bold: true, size: 24, font: "Times New Roman" })], alignment: AlignmentType.RIGHT }),
                                                new Paragraph({ children: [new TextRun({ text: COMPANY.proprietor, size: 16, font: "Times New Roman" })], alignment: AlignmentType.RIGHT }),
                                                new Paragraph({ children: [new TextRun({ text: COMPANY.address, size: 16, font: "Times New Roman" })], alignment: AlignmentType.RIGHT }),
                                                new Paragraph({ children: [new TextRun({ text: COMPANY.phones, size: 16, font: "Times New Roman" })], alignment: AlignmentType.RIGHT }),
                                                new Paragraph({ children: [new TextRun({ text: COMPANY.registration, size: 16, font: "Times New Roman" })], alignment: AlignmentType.RIGHT }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({ border: { bottom: { color: "CCCCCC", space: 1, value: "single", size: 6 } }, spacing: { after: 300 } })
                    ],
                }),
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({ text: "" }), // Space to footer
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' },
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE }
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            width: { size: 33, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({
                                                    children: [new TextRun({ text: COMPANY.footerReg, size: 14, font: "Times New Roman" })],
                                                }),
                                            ],
                                        }),
                                        new TableCell({
                                            width: { size: 34, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: "Page ", size: 14, font: "Times New Roman" }),
                                                        new TextRun({ children: [PageNumber.CURRENT], size: 14, font: "Times New Roman" }),
                                                        new TextRun({ text: " of ", size: 14, font: "Times New Roman" }),
                                                        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, font: "Times New Roman" }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                        new TableCell({
                                            width: { size: 33, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: COMPANY.email, size: 14, font: "Times New Roman" })],
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
            },
            children: [
                ...paragraphs,
                new Paragraph({ spacing: { before: 600 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
                        insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "For SSD CONSTRUCTIONS", bold: true, size: 20, font: "Times New Roman" })] }),
                                        new Paragraph({ text: "___________________________", spacing: { before: 2880 } }),
                                        new Paragraph({ children: [new TextRun({ text: "Authorized Signatory", size: 18, font: "Times New Roman" })] }),
                                    ]
                                }),
                                new TableCell({
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: `For the ${agreement.type === 'Client' ? 'Employer' : agreement.type === 'Worker' ? 'Employee' : 'Supplier'}`, bold: true, size: 20, font: "Times New Roman" })], alignment: AlignmentType.RIGHT }),
                                        new Paragraph({ text: "___________________________", spacing: { before: 2880 }, alignment: AlignmentType.RIGHT }),
                                        new Paragraph({ children: [new TextRun({ text: "Authorized Signatory", size: 18, font: "Times New Roman" })], alignment: AlignmentType.RIGHT }),
                                    ]
                                }),
                            ]
                        })
                    ]
                })
            ]
        }]
    });

    Packer.toBlob(doc).then(blob => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
    }).catch(err => {
        console.error("Word Export Error:", err);
        alert(`Failed to generate Word document: ${err.message}`);
    });
}

/**
 * EXPORT AGREEMENT SWITCHER
 */
export async function exportAgreementData({ format, agreement, htmlContent, fileName }) {
    if (format === 'pdf') {
        return exportAgreementPDF({ agreement, htmlContent, fileName });
    }
    if (format === 'word') {
        return exportAgreementWord({ agreement, htmlContent, fileName });
    }
    alert("Export format not supported for agreements (use PDF or Word).");
}

/**
 * EXPORT BOQ SWITCHER (Handles multiple formats)
 */
export async function exportBOQData({ format, project, items, fileName }) {
    if (format === 'pdf') {
        return exportBOQ({ project, items, fileName });
    }

    // For Excel/Word, we can reuse the generic exporters with mapped columns
    const columns = [
        { header: 'ITEM', key: 'item' },
        { header: 'DESCRIPTION', key: 'description' },
        { header: 'QTY', key: 'qty' },
        { header: 'UNIT', key: 'unit' },
        { header: 'RATE', key: 'rate' },
        { header: 'AMOUNT', key: 'amount' }
    ];

    const mappedData = items.map((item, i) => ({
        item: i + 1,
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        rate: item.rate,
        amount: item.amount
    }));

    if (format === 'excel') {
        return exportToExcel({ title: `BOQ: ${project.name}`, data: mappedData, columns, fileName });
    }
    if (format === 'word') {
        return exportToWord({ title: `BOQ: ${project.name}`, data: mappedData, columns, fileName });
    }
    if (format === 'csv') {
        return exportToCSV(mappedData, fileName);
    }
}

/**
 * EXPORT TO PDF (Branded)
 */
export async function exportToPDF({ title, data, columns, fileName }) {
    if (!data || !columns || !Array.isArray(data) || !Array.isArray(columns)) {
        console.error("Export aborted: Invalid data or columns format", { data, columns });
        alert("Export Error: Data or Columns are missing/invalid.");
        return;
    }

    try {
        const doc = new jsPDF();
        const logoBase64 = await getBase64Image(LOGO_PATH);

        // Add Header
        if (logoBase64) {
            try {
                // Background clear to avoid rendering artifacts
                doc.setFillColor(255, 255, 255);
                doc.rect(15, 8, 55, 18, 'F');
                doc.addImage(logoBase64, 'PNG', 15, 8, 55, 18, 'main_logo', 'NONE');
            } catch (e) {
                console.error("PDF Logo Error:", e);
            }
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(COMPANY.name, 195, 15, { align: 'right' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(COMPANY.proprietor, 195, 22, { align: 'right' });
        doc.text(COMPANY.address, 195, 27, { align: 'right' });
        doc.text(`Phone: ${COMPANY.phones}`, 195, 32, { align: 'right' });
        doc.text(`Reg: ${COMPANY.registration}`, 195, 37, { align: 'right' });

        doc.setDrawColor(200);
        doc.line(15, 42, 195, 42);

        // Title
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(title || 'Report', 15, 52);

        // Sanitize headers and body for AutoTable
        const tableHead = [columns.map(c => c.header || c.label || 'Unknown')];
        const tableBody = data.map(row =>
            columns.map(c => {
                const val = row[c.key];
                return val === undefined || val === null ? '' : String(val);
            })
        );

        // Table
        autoTable(doc, {
            startY: 62,
            head: tableHead,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [217, 217, 217], textColor: [0, 0, 0], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', textColor: [0, 0, 0] },
            margin: { bottom: 25 },
            didDrawPage: (pageData) => {
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(COMPANY.footerReg, 15, pageHeight - 15);

                const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
                const str = "Page " + pageNumber + " of {total_pages_count_tag}";
                doc.text(str, (pageWidth / 2) + 20, pageHeight - 15, { align: 'center' });

                const emailWidth = doc.getTextWidth(COMPANY.email);
                doc.text(COMPANY.email, pageWidth - emailWidth - 15, pageHeight - 15);
            }
        });

        if (typeof doc.putTotalPages === 'function') {
            doc.putTotalPages('{total_pages_count_tag}');
        }

        doc.save(`${fileName || 'Export'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
        console.error("PDF Export Error:", e);
        alert(`Failed to generate PDF: ${e.message}`);
    }
}

/**
 * EXPORT TO EXCEL (Branded)
 */
export function exportToExcel({ title, data, columns, fileName }) {
    const wsData = [
        [COMPANY.name],
        [COMPANY.address],
        [`Phone: ${COMPANY.phones} | Email: ${COMPANY.email}`],
        [],
        [title],
        [],
        [],
        columns ? columns.map(c => c.header) : Object.keys(data[0] || {}),
        ...data.map(row => (columns ? columns : Object.keys(row)).map(c => {
            const key = columns ? c.key : c;
            return row[key] === undefined || row[key] === null ? '' : row[key];
        }))
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * EXPORT TO WORD (Branded)
 */
export async function exportToWord({ title, data, columns, fileName }) {
    const logoBase64 = await getBase64Image(LOGO_PATH);
    const logoUint8 = logoBase64 ? Uint8Array.from(atob(logoBase64.split(',')[1]), c => c.charCodeAt(0)) : null;

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 720, // ~1 inch
                        bottom: 720,
                        left: 720,
                        right: 720,
                    },
                },
            },
            headers: {
                default: new Header({
                    children: [
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.NONE },
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE }
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            width: { size: 30, type: WidthType.PERCENTAGE },
                                            children: [
                                                logoUint8 ? new Paragraph({
                                                    children: [
                                                        new ImageRun({
                                                            data: logoUint8,
                                                            transformation: { width: 156, height: 50 },
                                                        }),
                                                    ],
                                                }) : new Paragraph({ children: [new TextRun({ text: COMPANY.name, bold: true })] }),
                                            ],
                                        }),
                                        new TableCell({
                                            width: { size: 70, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: COMPANY.name, bold: true, size: 28 })],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: COMPANY.proprietor, size: 18 })],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: COMPANY.address, size: 16 })],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: `Phone: ${COMPANY.phones}`, size: 16 })],
                                                }),
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: `Reg: ${COMPANY.registration}`, size: 16 })],
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({ text: "" }), // Space from header
                    ],
                }),
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({ text: "" }), // Space to footer
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' },
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE }
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            width: { size: 33, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({
                                                    children: [new TextRun({ text: COMPANY.footerReg, size: 16 })],
                                                }),
                                            ],
                                        }),
                                        new TableCell({
                                            width: { size: 34, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [
                                                        new TextRun({ text: "Page ", size: 16 }),
                                                        new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
                                                        new TextRun({ text: " of ", size: 16 }),
                                                        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                        new TableCell({
                                            width: { size: 33, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.RIGHT,
                                                    children: [new TextRun({ text: COMPANY.email, size: 16 })],
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
            },
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: title, bold: true, size: 28 }), // Title
                    ],
                }),
                new Paragraph({ text: "" }), // Spacing
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: columns.map(c => new TableCell({
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: String(c.header || c.label), bold: true, size: 18 })]
                                    })
                                ],
                                shading: { fill: "D9D9D9" }
                            })),
                        }),
                        ...data.map(row => new TableRow({
                            children: columns.map(c => new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [new TextRun({ text: String(row[c.key] === undefined || row[c.key] === null ? '' : row[c.key]), size: 18 })]
                                    })
                                ]
                            })),
                        })),
                    ],
                }),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.docx`;
    link.click();
}

/**
 * CSV Export (Simple fallback)
 */
export function exportToCSV(data, fileName = 'export') {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const cell = row[header] === undefined || row[header] === null ? '' : row[header];
                const cellStr = String(cell).replace(/\"/g, '\"\"');
                return cellStr.includes(',') || cellStr.includes('\"') ? `\"${cellStr}\"` : cellStr;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}
