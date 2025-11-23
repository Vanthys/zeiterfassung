const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireOwnerOrAdmin } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Helper function to format duration from hours to "Xh Ym" string
 */
function formatDuration(hours) {
    if (!hours) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
}

/**
 * Helper function to format time
 */
function formatTime(date, locale = 'en-US') {
    return new Date(date).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * GET /api/reports/excel
 * Generate Excel report for current user
 */
router.get('/excel', authenticateToken, async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const locale = req.user.company?.country || 'en-US';

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const sessions = await prisma.workSession.findMany({
            where: {
                userId: req.user.id,
                startTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { startTime: 'asc' },
        });

        const workbook = await generateExcelReport(sessions, req.user, year, month, locale);

        const monthName = startDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
        const filename = `Work_Report_${monthName.replace(' ', '_')}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).json({ error: 'Failed to generate Excel report' });
    }
});

/**
 * GET /api/reports/excel/:userId
 * Generate Excel report for specific user (admin only)
 */
router.get('/excel/:userId', authenticateToken, requireOwnerOrAdmin('userId'), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { company: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const locale = user.company?.country || 'en-US';
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const sessions = await prisma.workSession.findMany({
            where: {
                userId,
                startTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { startTime: 'asc' },
        });

        const workbook = await generateExcelReport(sessions, user, year, month, locale);

        const monthName = startDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
        const filename = `Work_Report_${monthName.replace(' ', '_')}_${user.firstName || user.email}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).json({ error: 'Failed to generate Excel report' });
    }
});

/**
 * GET /api/reports/pdf
 * Generate PDF report for current user
 */
router.get('/pdf', authenticateToken, async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const locale = req.user.company?.country || 'en-US';

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const sessions = await prisma.workSession.findMany({
            where: {
                userId: req.user.id,
                startTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { startTime: 'asc' },
        });

        const monthName = startDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
        const filename = `Work_Report_${monthName.replace(' ', '_')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        generatePDFReport(sessions, req.user, year, month, locale, res);
    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({ error: 'Failed to generate PDF report' });
    }
});

/**
 * GET /api/reports/pdf/:userId
 * Generate PDF report for specific user (admin only)
 */
router.get('/pdf/:userId', authenticateToken, requireOwnerOrAdmin('userId'), async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { company: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const locale = user.company?.country || 'en-US';
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const sessions = await prisma.workSession.findMany({
            where: {
                userId,
                startTime: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { startTime: 'asc' },
        });

        const monthName = startDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
        const filename = `Work_Report_${monthName.replace(' ', '_')}_${user.firstName || user.email}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        generatePDFReport(sessions, user, year, month, locale, res);
    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({ error: 'Failed to generate PDF report' });
    }
});

/**
 * Generate Excel workbook with formatted report
 */
async function generateExcelReport(sessions, user, year, month, locale) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Work Report');

    const startDate = new Date(year, month - 1, 1);
    const monthName = startDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

    // Set column widths
    worksheet.columns = [
        { width: 15 },  // Date
        { width: 10 },  // Start
        { width: 10 },  // End
        { width: 12 },  // Breaks
        { width: 12 },  // Net Duration
        { width: 30 },  // Note
    ];

    // Title
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Work Report - ${monthName}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Employee info
    worksheet.mergeCells('A2:F2');
    const employeeCell = worksheet.getCell('A2');
    employeeCell.value = `Employee: ${user.firstName || ''} ${user.lastName || user.email}`;
    employeeCell.font = { size: 12 };

    // Generated date
    worksheet.mergeCells('A3:F3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `Generated: ${new Date().toLocaleDateString(locale)}`;
    dateCell.font = { size: 10, italic: true };

    // Add empty row
    worksheet.addRow([]);

    // Header row
    const headerRow = worksheet.addRow(['Date', 'Start', 'End', 'Breaks', 'Net Duration', 'Note']);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // Data rows
    let totalNet = 0;
    let totalBreaks = 0;

    sessions.forEach(session => {
        const row = worksheet.addRow([
            new Date(session.startTime).toLocaleDateString(locale),
            formatTime(session.startTime, locale),
            session.endTime ? formatTime(session.endTime, locale) : 'Ongoing',
            formatDuration(session.breakDuration),
            formatDuration(session.netDuration),
            session.note || ''
        ]);

        totalNet += session.netDuration || 0;
        totalBreaks += session.breakDuration || 0;
    });

    // Totals row
    const totalRow = worksheet.addRow([
        '',
        '',
        'Total:',
        formatDuration(totalBreaks),
        formatDuration(totalNet),
        ''
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
    };

    // Add borders to all data cells
    const lastRow = worksheet.lastRow.number;
    for (let row = 5; row <= lastRow; row++) {
        for (let col = 1; col <= 6; col++) {
            const cell = worksheet.getCell(row, col);
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
    }

    return workbook;
}

/**
 * Generate PDF report and stream to response
 */
function generatePDFReport(sessions, user, year, month, locale, res) {
    const doc = new PDFDocument({ margin: 50 });

    // Pipe to response
    doc.pipe(res);

    const startDate = new Date(year, month - 1, 1);
    const monthName = startDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

    // Title
    doc.fontSize(20).text(`Work Report - ${monthName}`, { align: 'center' });
    doc.moveDown();

    // Employee info
    doc.fontSize(12).text(`Employee: ${user.firstName || ''} ${user.lastName || user.email}`);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString(locale)}`);
    doc.moveDown(2);

    // Table header
    const tableTop = doc.y;
    const colWidths = [80, 60, 60, 70, 80, 150];
    const headers = ['Date', 'Start', 'End', 'Breaks', 'Net Duration', 'Note'];

    doc.fontSize(10).font('Helvetica-Bold');
    let x = 50;
    headers.forEach((header, i) => {
        doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
    });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    doc.moveDown();

    // Table rows
    doc.font('Helvetica').fontSize(9);
    let totalNet = 0;
    let totalBreaks = 0;

    sessions.forEach(session => {
        // Save the current Y position for this row
        const rowY = doc.y;

        // Check if we need a new page
        if (rowY > 700) {
            doc.addPage();
            doc.y = 50;
        }

        const currentRowY = doc.y;
        x = 50;
        const rowData = [
            new Date(session.startTime).toLocaleDateString(locale),
            formatTime(session.startTime, locale),
            session.endTime ? formatTime(session.endTime, locale) : 'Ongoing',
            formatDuration(session.breakDuration),
            formatDuration(session.netDuration),
            session.note || ''
        ];

        // Write all columns at the same Y position
        rowData.forEach((data, i) => {
            doc.text(data, x, currentRowY, { width: colWidths[i], align: 'left', lineBreak: false });
            x += colWidths[i];
        });

        // Move down for the next row
        doc.y = currentRowY + 15;

        totalNet += session.netDuration || 0;
        totalBreaks += session.breakDuration || 0;
    });

    // Totals
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold');
    const totalsY = doc.y;
    x = 50;
    const totalsData = ['', '', 'Total:', formatDuration(totalBreaks), formatDuration(totalNet), ''];
    totalsData.forEach((data, i) => {
        doc.text(data, x, totalsY, { width: colWidths[i], align: 'left', lineBreak: false });
        x += colWidths[i];
    });

    // Finalize PDF
    doc.end();
}

module.exports = router;
