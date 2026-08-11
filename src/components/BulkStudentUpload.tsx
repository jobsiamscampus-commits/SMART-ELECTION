import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useElection } from '../context/ElectionContext';
import { Student, IAMS_DEPARTMENTS, IAMSDepartment } from '../types/election';
import {
  checkExistingStudentIdsInSupabase,
  saveStudentsToSupabaseBatch,
} from '../supabase/config';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Search,
  Check,
  X,
  Loader2,
  Database,
} from 'lucide-react';

interface PreviewRow {
  rowNum: number;
  studentId: string;
  name: string;
  department: string;
  password?: string;
  photo?: string;
  status: 'valid' | 'duplicate' | 'invalid';
  errorMessage?: string;
}

interface BulkStudentUploadProps {
  onBack?: () => void;
}

export const BulkStudentUpload: React.FC<BulkStudentUploadProps> = ({ onBack }) => {
  const { students, bulkAddStudents, reloadStudentsFromFirestore } = useElection();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<PreviewRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'duplicate' | 'invalid'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Progress & Import States
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0); // 0 to 100
  const [currentImportingIndex, setCurrentImportingIndex] = useState(0);
  const [allowOverwrite, setAllowOverwrite] = useState(false);

  // Summary State after import
  const [importSummary, setImportSummary] = useState<{
    importedCount: number;
    duplicateCount: number;
    failedCount: number;
    failedRows?: Array<{ rowNumber?: number; studentId: string; reason: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Generate and Download 70 Sample Students Excel File
  const handleDownloadSampleExcel = () => {
    const firstNames = [
      'Arjun', 'Ananya', 'Rohan', 'Amina', 'Aditya', 'Sneha', 'Vikram', 'Diya', 'Rahul', 'Kavya',
      'Arjun', 'Isha', 'Karan', 'Meera', 'Varun', 'Riya', 'Siddharth', 'Tanvi', 'Yash', 'Pooja',
      'Dev', 'Nisha', 'Aman', 'Sanya', 'Kabir', 'Tara', 'Ayush', 'Zara', 'Pranav', 'Simran'
    ];
    const lastNames = [
      'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Reddy', 'Deshmukh', 'Saxena', 'Nair',
      'Iyer', 'Menon', 'Rao', 'Bhat', 'Khan', 'Ahmed', 'Ali', 'Shah', 'Qureshi', 'Malhotra'
    ];

    const sampleData = [];
    for (let i = 1; i <= 70; i++) {
      const padded = i.toString().padStart(3, '0');
      const studentId = `IAMS${padded}`;
      const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
      const department = IAMS_DEPARTMENTS[i % IAMS_DEPARTMENTS.length];
      const password = 'student123';
      const photo = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`;

      sampleData.push({
        'Student ID': studentId,
        'Student Name': name,
        'Department': department,
        'Password': password,
        'Photo URL': photo,
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'IAMS Students');

    XLSX.writeFile(workbook, 'IAMS_Campus_Sample_Students_70.xlsx');
  };

  // Process uploaded file (.xlsx or .csv)
  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setImportSummary(null);

    // Fetch existing student IDs from Supabase
    const existingSupabaseIds = await checkExistingStudentIdsInSupabase();

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) return;

        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const existingLocalStudentIds = new Set(
          students.map((s) => (s.studentId || s.id).toUpperCase().replace(/\s+/g, ''))
        );

        const seenInFileIds = new Set<string>();

        const parsed: PreviewRow[] = rawJson.map((row, idx) => {
          // Normalize column headers
          const getVal = (keys: string[]) => {
            for (const k of Object.keys(row)) {
              const cleanK = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (keys.some((target) => cleanK.includes(target))) {
                return String(row[k]).trim();
              }
            }
            return '';
          };

          const rawId = getVal(['studentid', 'id', 'studentcode', 'code']) || String(row['Student ID'] || row['ID'] || '').trim();
          const rawName = getVal(['studentname', 'name', 'fullname']) || String(row['Student Name'] || row['Name'] || '').trim();
          const rawDept = getVal(['department', 'dept', 'stream', 'course']) || String(row['Department'] || row['Dept'] || '').trim();
          const rawPass = getVal(['password', 'pass', 'pwd']) || String(row['Password'] || '').trim() || 'student123';
          const rawPhoto = getVal(['photourl', 'photo', 'avatar', 'img', 'image']) || String(row['Photo URL'] || row['Photo'] || '').trim();

          const normalizedId = rawId.toUpperCase().replace(/\s+/g, '');
          const normalizedDept = IAMS_DEPARTMENTS.find(
            (d) => d.toLowerCase() === rawDept.toLowerCase()
          );

          let status: 'valid' | 'duplicate' | 'invalid' = 'valid';
          let errorMessage = '';

          // Validation Checks
          if (!normalizedId) {
            status = 'invalid';
            errorMessage = 'Student ID is required.';
          } else if (!rawName) {
            status = 'invalid';
            errorMessage = 'Student Name is required.';
          } else if (!normalizedDept) {
            status = 'invalid';
            errorMessage = `Invalid Department: "${rawDept || 'Empty'}". Must be Business Management, Digital Marketing, or Plus Two Commerce.`;
          } else if (!rawPass) {
            status = 'invalid';
            errorMessage = 'Password is required.';
          } else if (existingSupabaseIds.has(normalizedId) || existingLocalStudentIds.has(normalizedId)) {
            status = 'duplicate';
            errorMessage = `Student ID ${rawId} already exists in database (will be updated or preserved).`;
          } else if (seenInFileIds.has(normalizedId)) {
            status = 'duplicate';
            errorMessage = `Duplicate Student ID ${rawId} found in file (will be skipped).`;
          }

          if (normalizedId) {
            seenInFileIds.add(normalizedId);
          }

          return {
            rowNum: idx + 1,
            studentId: rawId || normalizedId || `ROW-${idx + 1}`,
            name: rawName,
            department: normalizedDept || rawDept,
            password: rawPass,
            photo: rawPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
            status,
            errorMessage,
          };
        });

        setParsedRows(parsed);
      } catch (err) {
        alert('Failed to parse Excel/CSV file. Please ensure it is a valid .xlsx or .csv document.');
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Execute Import directly to Supabase
  const handleStartImport = async () => {
    const rowsToImport = allowOverwrite
      ? parsedRows.filter((r) => r.status === 'valid' || r.status === 'duplicate')
      : parsedRows.filter((r) => r.status === 'valid');

    const skippedDuplicatesCount = allowOverwrite
      ? 0
      : parsedRows.filter((r) => r.status === 'duplicate').length;

    if (rowsToImport.length === 0) {
      if (skippedDuplicatesCount > 0) {
        alert('All records in the file are duplicates. Check "Overwrite existing students" if you wish to update them.');
      } else {
        alert('No valid student records found to import.');
      }
      return;
    }

    setIsImporting(true);
    setImportProgress(15);
    setCurrentImportingIndex(0);

    const studentsToWrite = rowsToImport.map((r) => ({
      id: r.studentId,
      studentId: r.studentId,
      name: r.name,
      department: r.department,
      password: r.password || '123456',
      photo: r.photo || '',
      hasVoted: false,
      semester: 2,
    }));

    // Write valid students to Supabase database
    setImportProgress(45);
    setCurrentImportingIndex(Math.floor(studentsToWrite.length / 2));
    const result = await saveStudentsToSupabaseBatch(studentsToWrite);
    setImportProgress(85);
    setCurrentImportingIndex(studentsToWrite.length);

    // WAIT & VERIFY records exist in Supabase
    await reloadStudentsFromFirestore();
    setImportProgress(100);

    setIsImporting(false);

    setImportSummary({
      importedCount: allowOverwrite ? result.inserted + result.updated : result.inserted,
      duplicateCount: skippedDuplicatesCount,
      failedCount: result.failed,
      failedRows: result.errors.map((e) => ({ studentId: e.studentId, reason: e.reason })),
    });
  };

  // Reset upload state
  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setImportSummary(null);
    setImportProgress(0);
  };

  // Computed summary counts
  const validCount = parsedRows.filter((r) => r.status === 'valid').length;
  const duplicateCount = parsedRows.filter((r) => r.status === 'duplicate').length;
  const invalidCount = parsedRows.filter((r) => r.status === 'invalid').length;

  const filteredRows = parsedRows.filter((r) => {
    const matchesSearch =
      r.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && r.status === statusFilter;
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header Card */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2 border border-blue-400/30">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Admin Roster Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span>📥 Bulk Student Upload</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Import student accounts via Excel (.xlsx) or CSV (.csv). Student records and election passcodes are saved directly to Supabase (`public.students`).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl cursor-pointer flex items-center gap-1.5 transition-all border border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin</span>
            </button>
          )}

          <button
            onClick={handleDownloadSampleExcel}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg cursor-pointer flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            <span>Download Sample Excel (70 Students)</span>
          </button>
        </div>
      </div>

      {/* Summary view after completion */}
      {importSummary && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-6 animate-scale-up">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              importSummary.failedCount === 0
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
            }`}>
              {importSummary.failedCount === 0 ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <AlertTriangle className="w-7 h-7" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {importSummary.failedCount === 0
                  ? 'Students Imported Successfully'
                  : 'Import Completed with Warnings'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                <Database className="w-3.5 h-3.5 text-blue-500" />
                <span>✓ {importSummary.importedCount} Students Saved Permanently in Supabase Database</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Successfully Saved</span>
              </div>
              <div className="text-3xl font-black text-emerald-800 dark:text-emerald-200 mt-2">
                ✔ {importSummary.importedCount}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                Stored permanently in Supabase Database
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Duplicates Skipped</span>
              </div>
              <div className="text-3xl font-black text-amber-800 dark:text-amber-200 mt-2">
                ⚠ {importSummary.duplicateCount}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                Already existing Student IDs kept unchanged
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase">
                <XCircle className="w-4 h-4 text-rose-500" />
                <span>Failed</span>
              </div>
              <div className="text-3xl font-black text-rose-800 dark:text-rose-200 mt-2">
                ❌ {importSummary.failedCount}
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                {importSummary.failedCount === 0 ? 'No errors encountered' : 'Could not write to Supabase'}
              </p>
            </div>
          </div>

          {/* Failed rows detailed breakdown table */}
          {importSummary.failedCount > 0 && importSummary.failedRows && importSummary.failedRows.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 space-y-3">
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500" />
                <span>Some students could not be saved:</span>
              </h4>
              <div className="overflow-x-auto rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-2.5">Row Number</th>
                      <th className="p-2.5">Student ID</th>
                      <th className="p-2.5">Failure Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {importSummary.failedRows.map((fail, fIdx) => (
                      <tr key={fIdx}>
                        <td className="p-2.5 font-mono text-[10px]">{fail.rowNumber || '-'}</td>
                        <td className="p-2.5 font-mono font-bold text-rose-600 dark:text-rose-400">{fail.studentId}</td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300">{fail.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Upload Another File</span>
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
              >
                Return to Admin Roster
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Zone when no file loaded or when summary not shown */}
      {!importSummary && parsedRows.length === 0 && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-10 sm:p-14 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
            Drag & Drop Excel (.xlsx) or CSV (.csv) File Here
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Supported columns: <strong className="text-slate-700 dark:text-slate-200">Student ID, Student Name, Department, Password, Photo URL</strong>
          </p>

          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all">
            <Upload className="w-4 h-4" />
            <span>Select Excel/CSV File</span>
          </div>
        </div>
      )}

      {/* File Parsing & Preview Section */}
      {!importSummary && parsedRows.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          {/* File details bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {file?.name}
                </h4>
                <p className="text-xs text-slate-500">
                  Total Parsed Rows: <strong>{parsedRows.length}</strong> • Size: {file ? Math.round(file.size / 1024) : 0} KB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={handleReset}
                disabled={isImporting}
                className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
              >
                Change File
              </button>

              <button
                onClick={handleStartImport}
                disabled={isImporting || validCount === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing... ({importProgress}%)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Import {validCount} Valid Students</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Progress Bar */}
          {isImporting && (
            <div className="space-y-2 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between text-xs font-bold text-blue-800 dark:text-blue-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Saving student records to Supabase (`public.students`) ({currentImportingIndex} processed)</span>
                </span>
                <span>{importProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-150 ease-out rounded-full"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Overwrite duplicates toggle option */}
          {duplicateCount > 0 && !isImporting && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {duplicateCount} student ID{duplicateCount > 1 ? 's' : ''} already exist in the database. By default, duplicate student IDs will be skipped and kept safe.
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200 shrink-0">
                <input
                  type="checkbox"
                  checked={allowOverwrite}
                  onChange={(e) => setAllowOverwrite(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span>Overwrite existing students</span>
              </label>
            </div>
          )}

          {/* Validation Summary Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setStatusFilter('all')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md border-transparent'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">All Records</div>
              <div className="text-xl font-black">{parsedRows.length}</div>
            </button>

            <button
              onClick={() => setStatusFilter('valid')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                statusFilter === 'valid'
                  ? 'bg-emerald-600 text-white shadow-md border-transparent'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Valid to Import</div>
              <div className="text-xl font-black">✔ {validCount}</div>
            </button>

            <button
              onClick={() => setStatusFilter('duplicate')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                statusFilter === 'duplicate'
                  ? 'bg-amber-600 text-white shadow-md border-transparent'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Duplicates (Skip)</div>
              <div className="text-xl font-black">⚠ {duplicateCount}</div>
            </button>

            <button
              onClick={() => setStatusFilter('invalid')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                statusFilter === 'invalid'
                  ? 'bg-rose-600 text-white shadow-md border-transparent'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Invalid Rows</div>
              <div className="text-xl font-black">❌ {invalidCount}</div>
            </button>
          </div>

          {/* Search in preview */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Filter preview by ID, name, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Preview Data Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-500 uppercase font-bold text-[10px] sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Student ID</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {filteredRows.map((row) => (
                  <tr
                    key={row.rowNum}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${
                      row.status === 'valid'
                        ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                        : row.status === 'duplicate'
                        ? 'bg-amber-50/30 dark:bg-amber-950/20'
                        : 'bg-rose-50/30 dark:bg-rose-950/20'
                    }`}
                  >
                    <td className="p-3 text-slate-400 font-mono text-[10px]">{row.rowNum}</td>
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {row.studentId}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{row.name}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {row.department}
                      </span>
                    </td>
                    <td className="p-3">
                      {row.status === 'valid' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Valid
                        </span>
                      )}

                      {row.status === 'duplicate' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3" /> Duplicate (Skip)
                        </span>
                      )}

                      {row.status === 'invalid' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <XCircle className="w-3 h-3" /> {row.errorMessage}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleReset}
              disabled={isImporting}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleStartImport}
              disabled={isImporting || validCount === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Import {validCount} Students</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
