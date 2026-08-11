import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useElection } from '../context/ElectionContext';
import { Candidate, IAMS_DEPARTMENTS, IAMSDepartment } from '../types/election';
import { saveCandidatesToSupabaseBatch } from '../supabase/config';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Users,
  Info,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface BulkCandidateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedCandidateRow {
  rowNum: number;
  candidateId: string;
  name: string;
  positionId: string;
  positionName: string;
  department: string;
  manifesto: string;
  campaignMessage: string;
  photoUrl: string;
  achievements: string[];
  status: 'new' | 'update' | 'invalid';
  errorMessage?: string;
}

export const BulkCandidateUploadModal: React.FC<BulkCandidateUploadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { candidates, positions } = useElection();

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedCandidateRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isImportingRef = useRef(false);

  if (!isOpen) return null;

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Candidate ID': 'C001',
        'Candidate Name': 'MUHAMMED NIHAJ U',
        'Position': 'Chairman',
        'Department': 'Business Management',
        'Manifesto': 'Dedicated to student welfare, campus incubation fund, and upgraded infrastructure.',
        'Campaign Message': 'Leadership through innovation and student empowerment!',
        'Photo URL': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        'Achievements': 'Organized Management Fest 2025; Top Ranker in BM',
      },
      {
        'Candidate ID': 'C002',
        'Candidate Name': 'FATIMA ZAHRA',
        'Position': 'Treasurer',
        'Department': 'Plus Two Commerce',
        'Manifesto': '100% financial transparency and quarterly budget reports online.',
        'Campaign Message': 'Trust, Integrity, and Financial Clarity!',
        'Photo URL': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        'Achievements': 'Head Auditor for Commerce Club; Outstanding Scorer in Accounts',
      },
      {
        'Candidate ID': 'C003',
        'Candidate Name': 'RAHUL KRISHNA',
        'Position': 'Media Head',
        'Department': 'Digital Marketing',
        'Manifesto': 'Amplifying IAMS campus voice across digital media platforms.',
        'Campaign Message': 'Creative Vision for Modern Campus Media!',
        'Photo URL': 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
        'Achievements': 'Campus Spotlight Lead 2025; 20k+ Views on Official Videos',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidate_Import_Template');
    XLSX.writeFile(workbook, 'IAMS_Candidate_Import_Template.xlsx');
  };

  // Process File
  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setSummaryMessage(null);

    const existingCandidateIds = new Set(
      candidates.map((c) => (c.candidateId || c.id).toUpperCase().trim())
    );

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) return;

        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const rows: ParsedCandidateRow[] = rawJson.map((row, idx) => {
          const getVal = (keys: string[]) => {
            for (const k of Object.keys(row)) {
              const cleanK = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (keys.some((target) => cleanK.includes(target))) {
                return String(row[k]).trim();
              }
            }
            return '';
          };

          const rawId =
            getVal(['candidateid', 'id', 'code']) ||
            String(row['Candidate ID'] || row['ID'] || '').trim();
          const rawName =
            getVal(['candidatename', 'name', 'fullname']) ||
            String(row['Candidate Name'] || row['Name'] || '').trim();
          const rawPos =
            getVal(['position', 'post', 'positionname']) ||
            String(row['Position'] || row['Post'] || '').trim();
          const rawDept =
            getVal(['department', 'dept', 'stream']) ||
            String(row['Department'] || row['Dept'] || '').trim();
          const rawManifesto =
            getVal(['manifesto', 'description', 'agenda']) ||
            String(row['Manifesto'] || row['Description'] || '').trim();
          const rawCampaign =
            getVal(['campaignmessage', 'motto', 'tagline']) ||
            String(row['Campaign Message'] || row['Motto'] || '').trim();
          const rawPhoto =
            getVal(['photourl', 'photo', 'image', 'avatar']) ||
            String(row['Photo URL'] || row['Photo'] || '').trim();
          const rawAchievements =
            getVal(['achievements', 'milestones']) ||
            String(row['Achievements'] || '').trim();

          // Check existing candidate by rawId or by normalized name
          const normRawName = rawName.trim().toLowerCase().replace(/\s+/g, ' ');
          const existingCandidateByName = candidates.find(
            (c) => (c.name || '').trim().toLowerCase().replace(/\s+/g, ' ') === normRawName
          );

          // Generate stable candidate ID if missing
          const candidateId = rawId
            ? rawId.toUpperCase().trim()
            : existingCandidateByName
            ? (existingCandidateByName.candidateId || existingCandidateByName.id)
            : `CAND-${rawName.toLowerCase().replace(/[^a-z0-9]/g, '') || idx + 1}`;

          // Match Position
          const matchedPos = positions.find(
            (p) =>
              p.title.toLowerCase() === rawPos.toLowerCase() ||
              p.id.toLowerCase() === rawPos.toLowerCase()
          ) || positions[0] || { id: 'pos-1', title: 'Council Member' };

          // Match Department
          const matchedDept =
            IAMS_DEPARTMENTS.find((d) => d.toLowerCase() === rawDept.toLowerCase()) ||
            IAMS_DEPARTMENTS[0];

          // Achievements list
          const achievements = rawAchievements
            ? rawAchievements.split(/[;\n]/).map((a) => a.trim()).filter(Boolean)
            : [`Nominated representative for ${matchedDept}`];

          let status: 'new' | 'update' | 'invalid' = 'new';
          let errorMessage = '';

          if (!rawName) {
            status = 'invalid';
            errorMessage = 'Candidate Name is required.';
          } else if (existingCandidateIds.has(candidateId)) {
            status = 'update';
          }

          return {
            rowNum: idx + 2,
            candidateId,
            name: rawName,
            positionId: matchedPos.id,
            positionName: matchedPos.title,
            department: matchedDept,
            manifesto:
              rawManifesto ||
              `Dedicated to serving ${matchedDept} and advancing student council goals at IAMS Campus.`,
            campaignMessage:
              rawCampaign || `Vote for ${rawName} for ${matchedPos.title}!`,
            photoUrl:
              rawPhoto ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            achievements,
            status,
            errorMessage,
          };
        });

        setParsedRows(rows);
        setIsProcessing(false);
      } catch (err: any) {
        alert('Failed to parse file: ' + (err?.message || 'Invalid format'));
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

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

  const handleStartImport = async () => {
    if (isImportingRef.current || isImporting) return;

    const validRows = parsedRows.filter((r) => r.status !== 'invalid');
    if (validRows.length === 0) {
      alert('No valid candidate records found to import.');
      return;
    }

    isImportingRef.current = true;
    setIsImporting(true);
    setImportProgress(20);

    try {
      const candidatesToSave = validRows.map((r) => ({
        id: r.candidateId,
        candidateId: r.candidateId,
        name: r.name,
        photo: r.photoUrl,
        photoUrl: r.photoUrl,
        positionId: r.positionId,
        positionName: r.positionName,
        position: r.positionName,
        department: r.department,
        manifesto: r.manifesto,
        campaignMessage: r.campaignMessage,
        achievements: r.achievements,
        isActive: true,
      }));

      setImportProgress(60);
      const res = await saveCandidatesToSupabaseBatch(candidatesToSave);
      setImportProgress(100);

      setIsImporting(false);
      setSummaryMessage(
        `✔ Successfully processed candidate records in Supabase database. Existing candidates remained safe and intact!`
      );

      setTimeout(() => {
        isImportingRef.current = false;
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Error during bulk import:', err);
      setIsImporting(false);
      isImportingRef.current = false;
      alert('Failed to import candidates. Please try again.');
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setSummaryMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const newCount = parsedRows.filter((r) => r.status === 'new').length;
  const updateCount = parsedRows.filter((r) => r.status === 'update').length;
  const invalidCount = parsedRows.filter((r) => r.status === 'invalid').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Bulk Candidate Upload (Excel / CSV)
              </h2>
              <p className="text-xs text-slate-500">
                UPSERT candidates directly to Cloud Firestore without deleting existing candidates.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 grow">
          {summaryMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{summaryMessage}</span>
            </div>
          )}

          {/* Download Template Banner */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-blue-900 dark:text-blue-200">
                  Standard Excel Format Required
                </p>
                <p className="text-blue-700 dark:text-blue-400 mt-0.5">
                  Columns: Candidate ID, Candidate Name, Position, Department, Manifesto, Campaign Message, Photo URL
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-center"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel Template</span>
            </button>
          </div>

          {/* Drag & Drop Upload Zone */}
          {!file && (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 scale-[0.99]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 mx-auto flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>

              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Drag & Drop Candidate File Here
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Supports Excel (.xlsx, .xls) and CSV (.csv) spreadsheets
              </p>
            </div>
          )}

          {/* File Loaded Preview Stats */}
          {file && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {file.name}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • {parsedRows.length} candidates parsed
                    </p>
                  </div>
                </div>

                <button
                  onClick={resetState}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Choose Different File</span>
                </button>
              </div>

              {/* Status Badges Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-center">
                  <span className="block text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {newCount}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                    New Candidates
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-center">
                  <span className="block text-lg font-black text-blue-600 dark:text-blue-400">
                    {updateCount}
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">
                    Updates Existing
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center">
                  <span className="block text-lg font-black text-rose-600 dark:text-rose-400">
                    {invalidCount}
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">
                    Invalid Rows
                  </span>
                </div>
              </div>

              {/* Preview Rows Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Candidate Name</th>
                      <th className="p-2.5">Position</th>
                      <th className="p-2.5">Department</th>
                      <th className="p-2.5">Action Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {parsedRows.map((row) => (
                      <tr key={row.rowNum} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {row.candidateId}
                        </td>
                        <td className="p-2.5 font-extrabold text-slate-900 dark:text-white">
                          {row.name || <span className="text-rose-500 italic">Missing</span>}
                        </td>
                        <td className="p-2.5 font-semibold text-blue-600">{row.positionName}</td>
                        <td className="p-2.5 text-slate-500">{row.department}</td>
                        <td className="p-2.5">
                          {row.status === 'new' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              CREATE NEW
                            </span>
                          )}
                          {row.status === 'update' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              UPDATE EXISTING
                            </span>
                          )}
                          {row.status === 'invalid' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              {row.errorMessage || 'Invalid'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] font-semibold text-slate-500">
            * Existing Firestore candidates will NOT be deleted or cleared during import.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>

            {file && (
              <button
                onClick={handleStartImport}
                disabled={isImporting || isProcessing || parsedRows.filter((r) => r.status !== 'invalid').length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing ({importProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Import Candidate Records</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
