
import { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { saveStudent } from '../../lib/storage';
import { commitNextStudentId } from '../../lib/idGenerator';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    const [resultDialog, setResultDialog] = useState({ isOpen: false, success: 0, failed: 0, errors: [] as string[] });

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
                toast.warning('Empty File', { description: 'No data rows found.' });
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
            setResultDialog({
                isOpen: true,
                success: results.success,
                failed: results.failed,
                errors: results.errors
            });

        } catch (error) {
            console.error("Import failed:", error);
            toast.error('Import Failed', { description: error instanceof Error ? error.message : "Unknown error" });
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
            <AlertDialog open={resultDialog.isOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setResultDialog({ isOpen: false, success: 0, failed: 0, errors: [] });
                    if (resultDialog.success > 0) {
                        onImportComplete();
                    }
                }
            }}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{resultDialog.failed === 0 ? 'Import Successful!' : 'Import Completed'}</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                <p>Successfully imported <b className="text-emerald-600 dark:text-emerald-400">{resultDialog.success}</b> students.</p>
                                {resultDialog.failed > 0 && (
                                    <div className="mt-2 text-xs text-left max-h-32 overflow-y-auto bg-gray-50 dark:bg-slate-900 p-2 rounded border dark:border-slate-800">
                                        <p className="text-red-500 mb-1">Failed: {resultDialog.failed}</p>
                                        {resultDialog.errors.map((e, idx) => (
                                            <div key={idx} className="text-red-600 dark:text-red-400 truncate">{e}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction>Done</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <input
                type="file"
                ref={fileInputRef}
                onChange={processFile}
                accept=".xlsx, .xls"
                className="hidden"
            />

            <button
                onClick={downloadTemplate}
                className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800"
                title="Download Template"
            >
                <FileSpreadsheet size={20} />
            </button>

            <button
                onClick={handleButtonClick}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:border-primary hover:text-primary transition-all shadow-sm text-sm font-medium disabled:opacity-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
            >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Upload className="h-4 w-4" />}
                {loading ? `Importing ${progress}%` : 'Import Excel'}
            </button>
        </div>
    );
}
