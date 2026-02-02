import { useState } from 'react';
import { X, FileSpreadsheet, Download, Calendar } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Payment {
    id: number;
    regNum: string;
    studentName?: string;
    amount: number;
    month: string;
    date: string;
    method: string;
    type: string;
    class: string;
}

interface PaymentReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    payments: Payment[]; // Should be ALL payments, unfiltered
}

export function PaymentReportModal({ isOpen, onClose, payments }: PaymentReportModalProps) {
    const [filterClass, setFilterClass] = useState('all');
    const [periodType, setPeriodType] = useState<'all' | 'monthly' | 'yearly'>('monthly');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [isGenerating, setIsGenerating] = useState(false);

    // Extract unique classes
    const availableClasses = Array.from(new Set(payments.map(p => p.class))).filter(Boolean).sort();

    if (!isOpen) return null;

    const generateReport = async () => {
        try {
            setIsGenerating(true);

            // 1. Filter Data
            let filtered = [...payments];

            // Filter by Class
            if (filterClass !== 'all') {
                filtered = filtered.filter(p => p.class === filterClass);
            }

            // Filter by Period
            let periodText = 'All Time Record';
            if (periodType === 'monthly' && selectedMonth) {
                const [year, month] = selectedMonth.split('-');
                const targetDate = new Date(parseInt(year), parseInt(month) - 1);
                const monthStr = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                // Match by string month name stored in DB (e.g. "January 2026")
                // Or robustly by date parsing if available. Sticking to DB 'month' field implies exact match? 
                // Checks "January 2026"
                filtered = filtered.filter(p => p.month === monthStr);
                periodText = monthStr;
            } else if (periodType === 'yearly' && selectedYear) {
                filtered = filtered.filter(p => p.date.startsWith(selectedYear) || p.month.includes(selectedYear));
                periodText = `Year ${selectedYear}`;
            }

            // Sort by Date Descending
            filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // 2. Create Workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Financial Report');

            // 3. Define Columns & Widths
            worksheet.columns = [
                { key: 'date', width: 15 },
                { key: 'id', width: 15 },
                { key: 'student', width: 30 },
                { key: 'class', width: 25 },
                { key: 'type', width: 15 },
                { key: 'method', width: 15 },
                { key: 'amount', width: 20 },
            ];

            // 4. Set Headers & Title
            // Design: 
            // Row 1-2: Main Title "SL DREAM JAPAN"
            // Row 3: Subtitle "Financial Statement - [Period]"
            // Row 4: Generated Date & Class info
            // Row 6: Table Headers

            // Main Title
            worksheet.mergeCells('A1:G2');
            const titleCell = worksheet.getCell('A1');
            titleCell.value = 'SL DREAM JAPAN';
            titleCell.font = { name: 'Arial', family: 2, size: 24, bold: true, color: { argb: 'FF1F2937' } }; // Dark Gray
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; // Light Gray BG

            // Subtitle
            worksheet.mergeCells('A3:G3');
            const subtitleCell = worksheet.getCell('A3');
            subtitleCell.value = `FINANCIAL STATEMENT - ${periodText.toUpperCase()}`;
            subtitleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF4B5563' } };
            subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

            // Meta Info
            worksheet.mergeCells('A4:G4');
            const metaCell = worksheet.getCell('A4');
            metaCell.value = `Generated on ${new Date().toLocaleDateString()} | Filter: ${filterClass === 'all' ? 'All Classes' : filterClass}`;
            metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
            metaCell.font = { italic: true, color: { argb: 'FF6B7280' } };
            metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

            // Add a bottom border to the header section
            worksheet.getCell('A4').border = { bottom: { style: 'medium', color: { argb: 'FFD1D5DB' } } };


            // Table Headers (Row 6)
            const tableStartRow = 6;
            const headerRow = worksheet.getRow(tableStartRow);
            headerRow.values = ['Date', 'Receipt ID', 'Student Name', 'Class', 'Type', 'Method', 'Amount (LKR)'];
            headerRow.height = 20;

            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Blue 600
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { bottom: { style: 'medium' } };
            });

            // 5. Add Data
            let totalAmount = 0;
            const dataStartRow = tableStartRow + 1;

            filtered.forEach((p, index) => {
                const row = worksheet.addRow([
                    p.date,
                    p.id,
                    p.studentName || p.regNum,
                    p.class,
                    p.type,
                    p.method,
                    p.amount
                ]);
                totalAmount += p.amount;

                // Styling
                // Alternate Row Colors
                if (index % 2 !== 0) {
                    // @ts-ignore
                    row.eachCell({ includeEmpty: true }, (cell) => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }; // Very light gray
                    });
                }

                // Borders & Alignment
                // @ts-ignore
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, // Vertical borders lighter
                        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                    };

                    if (colNumber === 7) { // Amount
                        cell.numFmt = '#,##0';
                        cell.alignment = { horizontal: 'right' };
                        cell.font = { bold: true };
                    } else if (colNumber === 2 || colNumber === 1) { // Date/ID
                        cell.alignment = { horizontal: 'center' };
                    } else {
                        cell.alignment = { horizontal: 'left' };
                    }
                });
            });

            // 6. Footer / Total
            const totalRow = worksheet.addRow(['', '', '', '', '', 'TOTAL REVENUE:', totalAmount]);
            totalRow.height = 25;

            // Style Total Label
            const labelCell = totalRow.getCell(6);
            labelCell.font = { bold: true, size: 12 };
            labelCell.alignment = { horizontal: 'right', vertical: 'middle' };

            // Style Total Amount
            const amountCell = totalRow.getCell(7);
            amountCell.numFmt = 'Rs #,##0';
            amountCell.alignment = { horizontal: 'right', vertical: 'middle' };
            amountCell.font = { bold: true, size: 13, color: { argb: 'FF166534' } }; // Green
            amountCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light Green BG
            amountCell.border = { top: { style: 'double' }, bottom: { style: 'double' } };

            // 8. Save
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/octet-stream' });
            saveAs(blob, `Financial_Report_${periodText.replace(/\s/g, '_')}.xlsx`);

            onClose();
        } catch (error) {
            console.error('Export failed', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                            <FileSpreadsheet size={20} />
                        </div>
                        <h3 className="font-semibold text-gray-900">Generate Report</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Period Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">Reporting Period</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['monthly', 'yearly', 'all'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setPeriodType(type)}
                                    className={`px-3 py-2 text-sm rounded-lg border capitalized ${periodType === type
                                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>

                        {periodType === 'monthly' && (
                            <div className="mt-2">
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none text-sm"
                                />
                            </div>
                        )}
                        {periodType === 'yearly' && (
                            <div className="mt-2">
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none text-sm"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Class Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">Filter by Class</label>
                        <select
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none text-sm"
                        >
                            <option value="all">All Classes</option>
                            {availableClasses.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-800">
                        <Calendar className="h-5 w-5 shrink-0" />
                        <p>This report will include the official SL Dream Japan letterhead and structure suitable for printing.</p>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={generateReport}
                        disabled={isGenerating}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? 'Generating...' : (
                            <>
                                <Download size={18} />
                                Download Excel
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
