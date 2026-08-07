import React, { useState } from 'react';
import { useElection } from '../context/ElectionContext';
import {
  User,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  LogOut,
  Users,
  Search,
  BookOpen,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

export const StudentProfileView: React.FC = () => {
  const {
    currentUser,
    userRole,
    logout,
    students,
    loginStudent,
    soundEnabled,
    setSoundEnabled,
    darkMode,
    setDarkMode,
    setActiveTab,
  } = useElection();

  const [showSwitchDrawer, setShowSwitchDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (userRole === 'admin') {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6 animate-fade-in">
        <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 text-center">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-950/80 rounded-full flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Admin Session Active
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              Election Administrator
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Logged in as {currentUser?.email || 'admin@iamscampus.edu'}
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => setActiveTab('admin')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md cursor-pointer"
            >
              Go to Admin Dashboard
            </button>
            <button
              onClick={logout}
              className="px-6 py-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl hover:bg-rose-100 cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isStudent = userRole === 'student' && currentUser && 'hasVoted' in currentUser;
  const student = isStudent ? (currentUser as any) : null;

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Digital Student ID Card Header */}
      {student ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white p-6 sm:p-8 shadow-2xl border border-blue-800/50">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <img
                src={student.photo}
                alt={student.name}
                className="w-28 h-28 rounded-2xl object-cover ring-4 ring-white/20 shadow-xl"
              />
              <div className="absolute -bottom-2 -right-2 p-1.5 bg-blue-600 text-white rounded-xl shadow-md">
                <QrCode className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-blue-200">
                  IAMS Student ID Card
                </span>
                {student.hasVoted ? (
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Voted</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Eligible to Vote</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {student.name}
              </h1>

              <div className="grid grid-cols-2 gap-2 text-xs text-blue-200 pt-1 max-w-md">
                <div>
                  <span className="text-[10px] text-blue-300/80 uppercase block font-bold">
                    Student ID
                  </span>
                  <strong className="font-mono text-white text-sm">{student.id}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-blue-300/80 uppercase block font-bold">
                    Department
                  </span>
                  <strong className="text-white">{student.department}</strong>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] text-blue-300/80 uppercase block font-bold">
                    Semester
                  </span>
                  <strong className="text-white">Semester {student.semester}</strong>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] text-blue-300/80 uppercase block font-bold">
                    Voting Status
                  </span>
                  <strong className={student.hasVoted ? 'text-emerald-400' : 'text-amber-400'}>
                    {student.hasVoted ? 'Recorded in Firestore' : 'Not Yet Cast'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-[18px] border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <User className="w-12 h-12 text-[#1565C0] mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Not Verified
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Enter your Student Name and Student ID on the voting screen to verify your registration and cast your vote.
          </p>
          <button
            onClick={() => setActiveTab('vote')}
            className="px-6 py-3 bg-[#1565C0] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-[#0D47A1] transition-all"
          >
            Go to Voting Verification
          </button>
        </div>
      )}

      {/* Preferences & Actions Section */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-[18px] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
          System Preferences & Audio Settings
        </h2>

        <div className="space-y-4">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-[#1565C0] dark:text-blue-400 rounded-xl">
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  EVM Electronic Sound Effects
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Plays official EVM electronic voting beep and audio feedback
                </p>
              </div>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-[#1565C0] text-white shadow-md'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Theme Appearance
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Switch between Light and Dark Material 3 color palettes
                </p>
              </div>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                darkMode
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {darkMode ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>
        </div>

        {/* Log Out Action */}
        {student && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
            <button
              onClick={logout}
              className="px-5 py-3 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out Student Session</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
