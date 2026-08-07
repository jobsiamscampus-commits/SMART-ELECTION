import React, { useState } from 'react';
import { useElection } from '../context/ElectionContext';
import { Student, Candidate, Position, Announcement, IAMS_DEPARTMENTS } from '../types/election';
import { BulkStudentUpload } from './BulkStudentUpload';
import { NominateCandidateModal } from './NominateCandidateModal';
import {
  ShieldCheck,
  Users,
  Award,
  CheckCircle2,
  Lock,
  Unlock,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Search,
  Megaphone,
  BarChart3,
  ListPlus,
  X,
  FileText,
  Filter,
  Upload,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    settings,
    openVoting,
    closeVoting,
    publishResults,
    unpublishResults,
    resetElection,
    students,
    candidates,
    positions,
    announcements,
    addStudent,
    updateStudent,
    deleteStudent,
    resetStudentVoteStatus,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    addPosition,
    deletePosition,
    addAnnouncement,
    deleteAnnouncement,
  } = useElection();

  const [adminTab, setAdminTab] = useState<'students' | 'candidates' | 'positions' | 'announcements' | 'bulk_upload'>('students');

  // Search & Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDeptFilter, setStudentDeptFilter] = useState('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'voted' | 'pending'>('all');

  const [candidateDeptFilter, setCandidateDeptFilter] = useState('all');

  // Modals visibility
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
  const [showAddAnnModal, setShowAddAnnModal] = useState(false);

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    id: `IAMS-2026-0${students.length + 1}`,
    name: '',
    department: 'Business Management',
    semester: 4,
    password: 'student123',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  });

  // New Candidate Form State
  const [newCand, setNewCand] = useState({
    name: '',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    positionId: positions[0]?.id || 'pos-1',
    positionName: positions[0]?.title || 'Chairman',
    department: 'Business Management',
    manifesto: '',
    campaignMessage: '',
    achievementsText: '',
  });

  // New Position Form State
  const [newPos, setNewPos] = useState({
    title: '',
    description: '',
    displayOrder: positions.length + 1,
  });

  // New Announcement Form State
  const [newAnn, setNewAnn] = useState({
    title: '',
    description: '',
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: 'Notice' as 'Rules' | 'Schedule' | 'Notice' | 'Meeting',
  });

  const totalStudents = students.length || 70;
  const votedCount = students.filter((s) => s.hasVoted).length;
  const pendingCount = totalStudents - votedCount;
  const turnoutPercent = Math.round((votedCount / totalStudents) * 100);

  // Filtered Students list
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.department.toLowerCase().includes(studentSearch.toLowerCase());

    const matchesDept = studentDeptFilter === 'all' || s.department === studentDeptFilter;

    if (studentStatusFilter === 'voted') return matchesSearch && matchesDept && s.hasVoted;
    if (studentStatusFilter === 'pending') return matchesSearch && matchesDept && !s.hasVoted;
    return matchesSearch && matchesDept;
  });

  // Filtered Candidates list
  const filteredCandidates = candidates.filter((c) => {
    if (candidateDeptFilter === 'all') return true;
    return c.department === candidateDeptFilter;
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    addStudent(newStudent);
    setShowAddStudentModal(false);
    setNewStudent({
      id: `IAMS-2026-0${students.length + 2}`,
      name: '',
      department: 'Business Management',
      semester: 4,
      password: 'student123',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    });
  };

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    const posObj = positions.find((p) => p.id === newCand.positionId);
    const achievements = newCand.achievementsText
      .split('\n')
      .map((a) => a.trim())
      .filter(Boolean);

    addCandidate({
      name: newCand.name,
      photo: newCand.photo,
      positionId: newCand.positionId,
      positionName: posObj ? posObj.title : newCand.positionName,
      department: newCand.department,
      manifesto: newCand.manifesto,
      campaignMessage: newCand.campaignMessage,
      achievements,
    });

    setShowAddCandidateModal(false);
  };

  const handleCreatePosition = (e: React.FormEvent) => {
    e.preventDefault();
    addPosition(newPos);
    setShowAddPositionModal(false);
    setNewPos({ title: '', description: '', displayOrder: positions.length + 2 });
  };

  const handleCreateAnn = (e: React.FormEvent) => {
    e.preventDefault();
    addAnnouncement(newAnn);
    setShowAddAnnModal(false);
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Top Admin Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>IAMS Campus Election Commission</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Admin Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Manage 70 student records, candidate nominations, positions, and live Firestore voting states.
          </p>
        </div>

        {/* Global Controls Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {settings.votingOpen ? (
            <button
              onClick={closeVoting}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-2xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>Close Voting</span>
            </button>
          ) : (
            <button
              onClick={openVoting}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Unlock className="w-4 h-4" />
              <span>Open Voting</span>
            </button>
          )}

          {settings.resultPublished ? (
            <button
              onClick={unpublishResults}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Unpublish Results</span>
            </button>
          ) : (
            <button
              onClick={publishResults}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Publish Results</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm('Are you sure you want to RESET the election? This will clear all votes and allow all 70 students to vote again.')) {
                resetElection();
              }
            }}
            className="px-4 py-2.5 bg-rose-600/80 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Election</span>
          </button>
        </div>
      </div>

      {/* Admin Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Students
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalStudents}
          </div>
          <p className="text-[10px] text-slate-500">Registered voters</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Nominated Candidates
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {candidates.length}
          </div>
          <p className="text-[10px] text-slate-500">{positions.length} positions</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Votes Cast
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {votedCount}
          </div>
          <p className="text-[10px] text-slate-500">Recorded ballots</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Pending Votes
          </span>
          <div className="text-2xl font-black text-amber-500">
            {pendingCount}
          </div>
          <p className="text-[10px] text-slate-500">Awaiting submission</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Turnout Rate
          </span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {turnoutPercent}%
          </div>
          <p className="text-[10px] text-slate-500">Participation index</p>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setAdminTab('students')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminTab === 'students'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manage Students ({students.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('bulk_upload')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminTab === 'bulk_upload'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800'
          }`}
        >
          <Upload className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>📥 Bulk Student Upload</span>
        </button>

        <button
          onClick={() => setAdminTab('candidates')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminTab === 'candidates'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Manage Candidates ({candidates.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('positions')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminTab === 'positions'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <ListPlus className="w-4 h-4" />
          <span>Positions ({positions.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('announcements')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            adminTab === 'announcements'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Announcements ({announcements.length})</span>
        </button>
      </div>

      {/* Tab 0: Bulk Student Upload Dedicated View */}
      {adminTab === 'bulk_upload' && (
        <BulkStudentUpload onBack={() => setAdminTab('students')} />
      )}

      {/* Tab 1: Manage Students */}
      {adminTab === 'students' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Department Filter Dropdown */}
              <select
                value={studentDeptFilter}
                onChange={(e) => setStudentDeptFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Departments</option>
                {IAMS_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setStudentStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg ${studentStatusFilter === 'all' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setStudentStatusFilter('voted')}
                  className={`px-2.5 py-1 rounded-lg ${studentStatusFilter === 'voted' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Voted ({votedCount})
                </button>
                <button
                  onClick={() => setStudentStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg ${studentStatusFilter === 'pending' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Pending ({pendingCount})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={() => setAdminTab('bulk_upload')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>📥 Bulk Student Upload</span>
              </button>

              <button
                onClick={() => setShowAddStudentModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Student</span>
              </button>
            </div>
          </div>

          {/* Student Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Student ID</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Semester</th>
                  <th className="p-3">Voting Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 flex items-center gap-3">
                      <img
                        src={st.photo}
                        alt={st.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="font-bold text-slate-900 dark:text-white">{st.name}</span>
                    </td>
                    <td className="p-3 font-mono text-blue-600 dark:text-blue-400 font-bold">{st.id}</td>
                    <td className="p-3">{st.department}</td>
                    <td className="p-3">Sem {st.semester}</td>
                    <td className="p-3">
                      {st.hasVoted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          ✓ Voted
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          ○ Pending
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {st.hasVoted && (
                        <button
                          onClick={() => resetStudentVoteStatus(st.id)}
                          title="Reset voting status"
                          className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Reset Vote
                        </button>
                      )}
                      <button
                        onClick={() => deleteStudent(st.id)}
                        title="Delete Student"
                        className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Manage Candidates */}
      {adminTab === 'candidates' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Nominated Candidates ({filteredCandidates.length})
              </h2>

              <select
                value={candidateDeptFilter}
                onChange={(e) => setCandidateDeptFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Departments</option>
                {IAMS_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowAddCandidateModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              <span>Nominate Candidate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCandidates.map((cand) => (
              <div
                key={cand.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={cand.photo}
                      alt={cand.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-200"
                    />
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {cand.name}
                      </h3>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {cand.positionName}
                      </p>
                      <p className="text-[10px] text-slate-500">{cand.department}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteCandidate(cand.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2">
                  "{cand.manifesto}"
                </p>

                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Votes Received: <strong className="text-blue-600">{cand.votesCount || 0}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Positions */}
      {adminTab === 'positions' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Election Positions ({positions.length})
            </h2>
            <button
              onClick={() => setShowAddPositionModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Position</span>
            </button>
          </div>

          <div className="space-y-3">
            {positions.map((pos) => (
              <div
                key={pos.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {pos.displayOrder}. {pos.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {pos.description}
                  </p>
                </div>

                <button
                  onClick={() => deletePosition(pos.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Announcements */}
      {adminTab === 'announcements' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Notice Board Announcements ({announcements.length})
            </h2>
            <button
              onClick={() => setShowAddAnnModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Notice</span>
            </button>
          </div>

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                      {ann.category}
                    </span>
                    <span className="text-[11px] text-slate-400">{ann.date}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {ann.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {ann.description}
                  </p>
                </div>

                <button
                  onClick={() => deleteAnnouncement(ann.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Add New Student Record
              </h3>
              <button onClick={() => setShowAddStudentModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Student ID</label>
                <input
                  type="text"
                  value={newStudent.id}
                  onChange={(e) => setNewStudent({ ...newStudent, id: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Department</label>
                <select
                  value={newStudent.department}
                  onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  {IAMS_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Semester</label>
                <input
                  type="number"
                  value={newStudent.semester}
                  onChange={(e) => setNewStudent({ ...newStudent, semester: Number(e.target.value) })}
                  required
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Nominate Candidate Modal */}
      <NominateCandidateModal
        isOpen={showAddCandidateModal}
        onClose={() => setShowAddCandidateModal(false)}
      />

      {/* Add Position Modal */}
      {showAddPositionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Add Council Position
              </h3>
              <button onClick={() => setShowAddPositionModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreatePosition} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Position Title</label>
                <input
                  type="text"
                  value={newPos.title}
                  onChange={(e) => setNewPos({ ...newPos, title: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Description</label>
                <textarea
                  value={newPos.description}
                  onChange={(e) => setNewPos({ ...newPos, description: e.target.value })}
                  required
                  rows={2}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPositionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  Save Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Announcement Modal */}
      {showAddAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Publish Notice
              </h3>
              <button onClick={() => setShowAddAnnModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateAnn} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Notice Title</label>
                <input
                  type="text"
                  value={newAnn.title}
                  onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Description</label>
                <textarea
                  value={newAnn.description}
                  onChange={(e) => setNewAnn({ ...newAnn, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAnnModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
