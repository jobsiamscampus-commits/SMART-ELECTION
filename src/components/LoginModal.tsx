import React, { useState } from 'react';
import { useElection } from '../context/ElectionContext';
import {
  X,
  UserCheck,
  ShieldCheck,
  Search,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { verifyStudent, loginAdmin, setActiveTab } = useElection();

  const [loginType, setLoginType] = useState<'student' | 'admin'>('student');
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [adminEmailInput, setAdminEmailInput] = useState('jobsiamscampus@gmail.com');
  const [adminPassInput, setAdminPassInput] = useState('admin123');

  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const res = verifyStudent(studentNameInput, studentIdInput);
    if (res.success) {
      onClose();
      setActiveTab('vote');
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const res = loginAdmin(adminEmailInput, adminPassInput);
    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20">
              IAMS Campus Authentication
            </span>
            <h2 className="text-xl font-extrabold tracking-tight mt-1">
              Sign In to Vote
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="p-6 pb-2">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              onClick={() => {
                setLoginType('student');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                loginType === 'student'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Student Portal</span>
            </button>

            <button
              onClick={() => {
                setLoginType('admin');
                setErrorMessage('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                loginType === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Student Verification Form */}
        {loginType === 'student' && (
          <form onSubmit={handleStudentLogin} className="p-6 pt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Student Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={studentNameInput}
                onChange={(e) => setStudentNameInput(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Student ID
              </label>
              <input
                type="text"
                placeholder="Enter your Student ID"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>Verify & Continue to Vote</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Admin Form */}
        {loginType === 'admin' && (
          <form onSubmit={handleAdminLogin} className="p-6 pt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                placeholder="admin@iamscampus.edu"
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Password
              </label>
              <input
                type="password"
                placeholder="Enter admin password"
                value={adminPassInput}
                onChange={(e) => setAdminPassInput(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Default admin password: <code className="font-mono text-blue-500 font-bold">admin123</code>
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>Access Admin Dashboard</span>
              <ShieldCheck className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
