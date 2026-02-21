import { jsPDF } from 'jspdf';
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
 * EXPORT AGREEMENT TO PDF
 */
export async function exportAgreementPDF({ agreement, htmlContent, fileName }) {
    try {
        const doc = new jsPDF();
        const logoBase64 = await getBase64Image(LOGO_PATH);

        if (logoBase64) {
            doc.setFillColor(255, 255, 255);
            doc.rect(15, 8, 55, 18, 'F');
            doc.addImage(logoBase64, 'PNG', 15, 8, 55, 18, 'main_logo');
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

        // Convert HTML to simple plain text with line breaks
        const plainText = htmlContent
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/h[1-6]>/gi, '\n\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<li>/gi, '  • ')
            .replace(/<[^>]+>/g, '') // remove remaining HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/\n\s*\n\s*\n/g, '\n\n') // remove excessive newlines
            .trim();

        doc.setFontSize(11);
        doc.setTextColor(0);

        let y = 52;
        const pageHeight = doc.internal.pageSize.getHeight();

        // Print text with wrapping
        const lines = doc.splitTextToSize(plainText, 170);

        for (let i = 0; i < lines.length; i++) {
            if (y > pageHeight - 40) {
                // Add footer
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(COMPANY.footerReg, 15, pageHeight - 15);

                doc.addPage();
                y = 20;
                doc.setFontSize(11);
                doc.setTextColor(0);
            }
            doc.text(lines[i], 15, y);
            y += 6;
        }

        y += 20;
        if (y > pageHeight - 40) { doc.addPage(); y = 20; }

        // Signatures
        doc.setFont('helvetica', 'bold');
        doc.text('For SSD CONSTRUCTIONS', 15, y);
        doc.text(`For the ${agreement.type === 'Client' ? 'Employer' : agreement.type === 'Worker' ? 'Employee' : 'Supplier'}`, 120, y);

        y += 20;
        doc.line(15, y, 75, y);
        doc.line(120, y, 180, y);

        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text('Authorized Signatory', 15, y);
        doc.text('Authorized Signatory', 120, y);

        if (agreement.status === 'Signed') {
            doc.setFontSize(40);
            doc.setTextColor(16, 185, 129);
            // Rotated watermark approximation by just printing across
            doc.text('SIGNED', 105, pageHeight / 2, { align: 'center', angle: 45 });
            doc.setFontSize(12);
            doc.text(new Date(agreement.signedAt.replace(' ', 'T')).toLocaleDateString(), 105, (pageHeight / 2) + 15, { align: 'center', angle: 45 });
        }

        // Final footer
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(COMPANY.footerReg, 15, doc.internal.pageSize.getHeight() - 15);

        doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
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

    const plainText = htmlContent
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();

    const paragraphs = plainText.split('\n\n').map(block => {
        return new Paragraph({
            children: block.split('\n').map((line, idx) => {
                return new TextRun({ text: line, break: idx > 0 ? 1 : 0 });
            }),
            spacing: { after: 200 }
        });
    });

    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
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
                                            children: [logoUint8 ? new Paragraph({ children: [new ImageRun({ data: logoUint8, transformation: { width: 156, height: 50 } })] }) : new Paragraph({ children: [new TextRun({ text: COMPANY.name, bold: true })] })],
                                        }),
                                        new TableCell({
                                            width: { size: 70, type: WidthType.PERCENTAGE },
                                            children: [
                                                new Paragraph({ children: [new TextRun({ text: COMPANY.name, bold: true, size: 28 })], alignment: AlignmentType.RIGHT }),
                                                new Paragraph({ children: [new TextRun({ text: COMPANY.proprietor, size: 18 })], alignment: AlignmentType.RIGHT }),
                                                new Paragraph({ children: [new TextRun({ text: COMPANY.address, size: 18 })], alignment: AlignmentType.RIGHT }),
                                                new Paragraph({ children: [new TextRun({ text: COMPANY.phones, size: 18 })], alignment: AlignmentType.RIGHT }),
                                                new Paragraph({ children: [new TextRun({ text: COMPANY.registration, size: 18 })], alignment: AlignmentType.RIGHT }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({ border: { bottom: { color: "CCCCCC", space: 1, value: "single", size: 6 } }, spacing: { after: 400 } })
                    ],
                }),
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({ children: [new TextRun({ text: COMPANY.footerReg, color: "888888", size: 16 })], alignment: AlignmentType.LEFT }),
                    ],
                }),
            },
            children: [
                ...paragraphs,
                new Paragraph({ spacing: { before: 800 } }),
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
                                        new Paragraph({ children: [new TextRun({ text: "For SSD CONSTRUCTIONS", bold: true })] }),
                                        new Paragraph({ text: "___________________________", spacing: { before: 600 } }),
                                        new Paragraph({ text: "Authorized Signatory" }),
                                    ]
                                }),
                                new TableCell({
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: `For the ${agreement.type === 'Client' ? 'Employer' : agreement.type === 'Worker' ? 'Employee' : 'Supplier'}`, bold: true })], alignment: AlignmentType.RIGHT }),
                                        new Paragraph({ text: "___________________________", spacing: { before: 600 }, alignment: AlignmentType.RIGHT }),
                                        new Paragraph({ text: "Authorized Signatory", alignment: AlignmentType.RIGHT }),
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
