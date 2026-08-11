import React, { useState, useEffect } from 'react';
import { Student } from '../types/election';
import {
  bulkGenerateSlipsInSupabase,
  fetchStudentsFromSupabase,
} from '../supabase/config';
import { ElectionSlipModal } from './ElectionSlipModal';
import { PrintableElectionSlips } from './PrintableElectionSlips';
import {
  Ticket,
  Sparkles,
  Download,
  Printer,
  Search,
  Filter,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Users,
  Key,
} from 'lucide-react';

export const ElectionSlipsSection: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('All');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [genCompletedMsg, setGenCompletedMsg] = useState<string | null>(null);

  // Modal / Selection states
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [copiedPasscodeId, setCopiedPasscodeId] = useState<string | null>(null);

  // Printing state
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [studentsToPrint, setStudentsToPrint] = useState<Student[]>([]);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchStudentsFromSupabase();
    setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Bulk Slip Generation
  const handleGenerateAllSlips = async () => {
    setGenerating(true);
    setGenCompletedMsg(null);

    try {
      const res = await bulkGenerateSlipsInSupabase();
      const updatedList = await fetchStudentsFromSupabase();
      setStudents(updatedList);
      setGenCompletedMsg(
        `Success! Generated Election Slips for ${res.totalStudents} students in Supabase (${res.generatedCount} new tokens/passcodes).`
      );
    } catch (err) {
      console.error('Error generating election slips:', err);
      setGenCompletedMsg('Failed to generate election slips. Please check your Supabase setup.');
    } finally {
      setGenerating(false);
    }
  };

  // Base URL for slip links
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  const getSlipUrl = (student: Student) => {
    const tokenKey = student.slipToken || student.studentId || student.id;
    return `${baseUrl}?slip=${encodeURIComponent(tokenKey)}`;
  };

  const handleCopyLink = (student: Student) => {
    const url = getSlipUrl(student);
    navigator.clipboard.writeText(url);
    setCopiedTokenId(student.id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const handleCopyPasscode = (student: Student) => {
    const code = student.passcode || student.password || '123456';
    navigator.clipboard.writeText(code);
    setCopiedPasscodeId(student.id);
    setTimeout(() => setCopiedPasscodeId(null), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (students.length === 0) return;

    const headers = ['Student Name', 'Student ID', 'Department', 'Semester', 'Passcode', 'Election Slip Link', 'Voting Status'];
    const rows = students.map((s) => {
      const stId = s.studentId || s.id;
      const passcode = s.passcode || s.password || '123456';
      const link = getSlipUrl(s);
      const status = s.hasVoted ? 'Voted' : 'Eligible';
      return [
        `"${s.name.replace(/"/g, '""')}"`,
        `"${stId}"`,
        `"${s.department}"`,
        `"Sem ${s.semester}"`,
        `"${passcode}"`,
        `"${link}"`,
        `"${status}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IAMS_Campus_Election_Slips_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      s.name.toLowerCase().includes(query) ||
      (s.studentId && s.studentId.toLowerCase().includes(query)) ||
      s.id.toLowerCase().includes(query) ||
      s.department.toLowerCase().includes(query);

    const matchesDept = deptFilter === 'All' || s.department === deptFilter;

    return matchesQuery && matchesDept;
  });

  // Select all logic
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const handlePrintAll = () => {
    setStudentsToPrint(students);
    setShowPrintModal(true);
  };

  const handlePrintSelected = () => {
    const selectedList = students.filter((s) => selectedStudentIds.has(s.id));
    setStudentsToPrint(selectedList.length > 0 ? selectedList : students);
    setShowPrintModal(true);
  };

  const totalSlipsWithTokens = students.filter((s) => Boolean(s.slipToken)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Main Actions */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl border border-blue-800/40 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/10 text-blue-300 backdrop-blur-md">
              <Ticket className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Bulk Slip Engine
                </span>
                <span className="text-xs text-blue-200">
                  Cloud Firestore Storage
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                Election Slip Generator & Management
              </h2>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleGenerateAllSlips()}
              disabled={generating || students.length === 0}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-black text-xs rounded-2xl shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>GENERATE ALL ELECTION SLIPS</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={students.length === 0}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrintAll}
              disabled={students.length === 0}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Print All Slips</span>
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Total Registered Students
            </span>
            <strong className="text-xl font-black text-white">{students.length}</strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Slips Ready with Tokens
            </span>
            <strong className="text-xl font-black text-emerald-400">{totalSlipsWithTokens}</strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Unique Passcodes
            </span>
            <strong className="text-xl font-black text-blue-400">
              {students.filter((s) => Boolean(s.passcode)).length}
            </strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Voted
            </span>
            <strong className="text-xl font-black text-amber-400">
              {students.filter((s) => s.hasVoted).length}
            </strong>
          </div>
        </div>
      </div>

      {/* Generation Progress Overlay */}
      {generating && (
        <div className="p-6 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-3xl space-y-3 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
              <span>Generating Secure Election Slips for All Students...</span>
            </div>
            <span className="font-mono text-sm">
              {progress.current} / {progress.total}
            </span>
          </div>

          <div className="w-full h-3 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-200 rounded-full"
              style={{
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
              }}
            />
          </div>

          <p className="text-[11px] text-blue-700 dark:text-blue-300">
            Assigning unique passcodes and encryption tokens in Cloud Firestore batches. Please do not close your browser window.
          </p>
        </div>
      )}

      {/* Completion Banner */}
      {genCompletedMsg && !generating && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 animate-fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{genCompletedMsg}</span>
          </div>
          <button
            onClick={() => setGenCompletedMsg(null)}
            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Table Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="All">All Departments</option>
              <option value="Business Management">Business Management</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Plus Two Commerce">Plus Two Commerce</option>
            </select>

            {selectedStudentIds.size > 0 && (
              <button
                onClick={handlePrintSelected}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Selected ({selectedStudentIds.size})</span>
              </button>
            )}

            <button
              onClick={loadData}
              title="Refresh from Firestore"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Students Slips Table */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="text-xs">Loading election slips from Firestore...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Ticket className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No students found
            </p>
            <p className="text-xs text-slate-500">
              Upload student records or change your search filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        selectedStudentIds.size === filteredStudents.length
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Student Name</th>
                  <th className="p-3.5">Student ID</th>
                  <th className="p-3.5">Class / Dept</th>
                  <th className="p-3.5">Passcode</th>
                  <th className="p-3.5">Election Slip</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {filteredStudents.map((st) => {
                  const passcode = st.passcode || st.password || '123456';
                  const isSelected = selectedStudentIds.has(st.id);

                  return (
                    <tr
                      key={st.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(st.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              st.photo ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
                            }
                            alt={st.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-700"
                          />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {st.name}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-blue-600 dark:text-blue-400 font-bold">
                        {st.studentId || st.id}
                      </td>

                      <td className="p-3.5">
                        <span className="block font-semibold">{st.department}</span>
                        <span className="text-[10px] text-slate-400">Sem {st.semester}</span>
                      </td>

                      <td className="p-3.5">
                        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
                          <Key className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-mono font-bold text-slate-900 dark:text-white tracking-wider">
                            {passcode}
                          </span>
                          <button
                            onClick={() => handleCopyPasscode(st)}
                            title="Copy Passcode"
                            className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                          >
                            {copiedPasscodeId === st.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyLink(st)}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-blue-200 dark:border-blue-900 cursor-pointer"
                          >
                            {copiedTokenId === st.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span>Copied Link</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 ${
                            st.hasVoted
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : st.slipToken
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {st.hasVoted ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Voted</span>
                            </>
                          ) : st.slipToken ? (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>Ready</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>Pending</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedStudentForModal(st)}
                          className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 shadow-sm"
                        >
                          <Ticket className="w-3.5 h-3.5 text-blue-400" />
                          <span>View Slip</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Slip Modal */}
      {selectedStudentForModal && (
        <ElectionSlipModal
          student={selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
        />
      )}

      {/* Printable Sheet View */}
      {showPrintModal && (
        <PrintableElectionSlips
          students={studentsToPrint}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
