
import { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { saveStudent } from '../../lib/storage';
import { commitNextStudentId } from '../../lib/idGenerator';
import Swal from 'sweetalert2';

interface ImportResult {
    total: number;
    success: number;
    failed: number;
    errors: string[];
}

export function BulkImport({ onImportComplete }: { onImportComplete: () => void }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const processFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setProgress(0);

        const results: ImportResult = {
            total: 0,
            success: 0,
            failed: 0,
            errors: []
        };

        try {
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) {
                throw new Error("No worksheet found in the Excel file.");
            }

            // Assumes Row 1 is header. Data starts from Row 2.
            const rows = worksheet.getRows(2, worksheet.rowCount - 1) || [];
            results.total = rows.length;

            if (results.total === 0) {
                Swal.fire('Empty File', 'No data rows found.', 'warning');
                setLoading(false);
                return;
            }

            // Headers mapping (simple index based or find by name)
            // Let's try to map by name first for robustness
            const headerRow = worksheet.getRow(1);
            const headers: Record<string, number> = {};
            headerRow.eachCell((cell, colNumber) => {
                const val = cell.value?.toString().toLowerCase().trim();
                if (val) headers[val] = colNumber;
            });

            // Expected headers: name, phone, class, dob, gender
            if (!headers['name'] && !headers['student name']) {
                throw new Error("Missing required column: 'Name' or 'Student Name'");
            }

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const startRowIndex = 2; // Data starts at 2
                // Update progress
                setProgress(Math.round(((i + 1) / results.total) * 100));

                try {
                    // Extract data helper
                    const getVal = (keys: string[]) => {
                        for (const key of keys) {
                            if (headers[key]) {
                                const val = row.getCell(headers[key]).value;
                                return val ? val.toString().trim() : '';
                            }
                        }
                        return '';
                    };

                    const name = getVal(['name', 'student name', 'full name']);
                    const phone = getVal(['phone', 'mobile', 'contact']);
                    const className = getVal(['class', 'course', 'initial payment']);
                    const dob = getVal(['dob', 'date of birth', 'birthday']); // Format might be tricky
                    const genderRaw = getVal(['gender', 'sex']);
                    const guardian = getVal(['guardian', 'parent']);
                    const guardianPhone = getVal(['guardian phone', 'parent contact']);
                    const email = getVal(['email']);

                    if (!name) {
                        results.failed++;
                        results.errors.push(`Row ${startRowIndex + i}: Missing Name`);
                        continue;
                    }

                    // Basic validation
                    // Generate ID
                    const regNum = commitNextStudentId();

                    // Normalize Gender
                    let gender: 'male' | 'female' = 'male'; // Default
                    if (genderRaw.toLowerCase().includes('f') || genderRaw.toLowerCase().includes('girl')) gender = 'female';

                    // Determine Avatar
                    const avatar = gender === 'male' ? 'boy.png' : 'girl.png';

                    // Parse Classes (comma separated or single)
                    const classes = className.split(',').map(c => c.trim()).filter(c => c);

                    // Parse DOB (Excel might return object or string)
                    // If simple string, use it. If date object, ISO dict.
                    // For now assume string or leave empty if invalid
                    let finalDob = dob;

                    await saveStudent({
                        regNum,
                        name,
                        gender,
                        avatar,
                        class: classes,
                        dob: finalDob,
                        phone,
                        email,
                        guardian,
                        guardianPhone
                    });

                    results.success++;

                } catch (err) {
                    results.failed++;
                    results.errors.push(`Row ${startRowIndex + i}: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
            }

            // Summary Alert
            let html = `<p>Successfully imported <b>${results.success}</b> students.</p>`;
            if (results.failed > 0) {
                html += `<p class="text-red-500 mt-2">Failed: ${results.failed}</p>`;
                html += `<div class="mt-2 text-xs text-left max-h-32 overflow-y-auto bg-gray-50 p-2 rounded border">`;
                results.errors.forEach(e => html += `<div class="text-red-600 truncate">${e}</div>`);
                html += `</div>`;
            }

            Swal.fire({
                title: results.failed === 0 ? 'Import Successful!' : 'Import Completed',
                html,
                icon: results.failed === 0 ? 'success' : 'warning',
                width: 400
            });

            if (results.success > 0) {
                onImportComplete();
            }

        } catch (error) {
            console.error("Import failed:", error);
            Swal.fire('Import Failed', error instanceof Error ? error.message : "Unknown error", 'error');
        } finally {
            setLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset
            }
        }
    };

    const downloadTemplate = () => {
        // Create a basic workbook
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Students');
        sheet.columns = [
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Gender', key: 'gender', width: 10 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Class', key: 'class', width: 20 },
            { header: 'DOB', key: 'dob', width: 15 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Guardian', key: 'guardian', width: 20 },
            { header: 'Guardian Phone', key: 'guardianPhone', width: 15 },
        ];

        // Add sample row
        sheet.addRow({
            name: 'John Doe',
            gender: 'Male',
            phone: '0771234567',
            class: 'JLPT N5',
            dob: '2000-01-01',
            email: 'john@example.com',
            guardian: 'Jane Doe',
            guardianPhone: '0777654321'
        });

        // Write buffer
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'student_import_template.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        });
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={processFile}
                accept=".xlsx, .xls"
                className="hidden"
            />

            <button
                onClick={downloadTemplate}
                className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg"
                title="Download Template"
            >
                <FileSpreadsheet size={20} />
            </button>

            <button
                onClick={handleButtonClick}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:border-primary hover:text-primary transition-all shadow-sm text-sm font-medium disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Upload className="h-4 w-4" />}
                {loading ? `Importing ${progress}%` : 'Import Excel'}
            </button>
        </div>
    );
}
