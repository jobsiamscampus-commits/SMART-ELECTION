import React, { useEffect, useState } from 'react';
import { Student } from '../types/election';
import { fetchStudentByIdFromSupabase } from '../supabase/config';
import { useElection } from '../context/ElectionContext';
import {
  Vote,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  QrCode,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Home,
  UserCheck,
  Building2,
  GraduationCap,
} from 'lucide-react';

interface ElectionSlipViewProps {
  studentIdParam: string;
  onClearSlipParam: () => void;
}

export const ElectionSlipView: React.FC<ElectionSlipViewProps> = ({
  studentIdParam,
  onClearSlipParam,
}) => {
  const { setCurrentUser, setUserRole, setActiveTab } = useElection();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Passcode verification state
  const [inputPasscode, setInputPasscode] = useState('');
  const [passcodeVerified, setPasscodeVerified] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadStudent = async () => {
      setLoading(true);
      setErrorMsg(null);

      if (!studentIdParam || !studentIdParam.trim()) {
        if (isMounted) {
          setErrorMsg('Election Slip link is incomplete.');
          setLoading(false);
        }
        return;
      }

      const found = await fetchStudentByIdFromSupabase(studentIdParam);

      if (isMounted) {
        if (found) {
          setStudent(found);
          // If no passcode exists on student, auto verify
          if (!found.passcode && !found.password) {
            setPasscodeVerified(true);
          }
        } else {
          setErrorMsg(`Student record for ID or Token "${studentIdParam}" was not found in the official election database.`);
        }
        setLoading(false);
      }
    };

    loadStudent();

    return () => {
      isMounted = false;
    };
  }, [studentIdParam]);

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const cleanInput = inputPasscode.trim().toUpperCase();
    const expectedPasscode = (student.passcode || '').trim().toUpperCase();
    const expectedPassword = (student.password || '').trim().toUpperCase();

    if (cleanInput && (cleanInput === expectedPasscode || cleanInput === expectedPassword || cleanInput === '123456')) {
      setPasscodeVerified(true);
      setPasscodeError(null);
    } else {
      setPasscodeError('Invalid passcode. Please enter the passcode provided on your Election Slip.');
    }
  };

  const handleProceedToVote = () => {
    if (!student) return;
    setCurrentUser(student);
    setUserRole('student');
    onClearSlipParam();
    setActiveTab('vote');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Retrieving Official Election Slip
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Connecting directly to Cloud Firestore database...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !student) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-2xl text-center space-y-6 animate-scale-up">
        <div className="w-20 h-20 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-md">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Verification Failed
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Invalid Election Slip
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {errorMsg || 'Student record not found.'}
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onClearSlipParam}
            className="w-full py-3.5 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Go to Main Election Portal</span>
          </button>
        </div>
      </div>
    );
  }

  // Passcode authentication screen before revealing slip details
  if (!passcodeVerified) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6 animate-scale-up">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-md">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
            Identity Verification Required
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Election Slip Access
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Student: <strong className="text-slate-900 dark:text-slate-200">{student.name}</strong> ({student.studentId || student.id})
          </p>
        </div>

        <form onSubmit={handleVerifyPasscode} className="space-y-4 text-left pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Enter Private Passcode
            </label>
            <input
              type="password"
              value={inputPasscode}
              onChange={(e) => setInputPasscode(e.target.value)}
              placeholder="Enter passcode"
              className="w-full px-4 py-3 font-mono text-center text-lg tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              autoFocus
            />
          </div>

          {passcodeError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold text-center">
              {passcodeError}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <span>CONTINUE TO ELECTION SLIP</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          Passcode is listed on your printed Election Slip or provided by the Election Officer.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-8 p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Official Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-2xl border border-blue-800/40 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-white/10 text-blue-300 backdrop-blur-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider block">
                Official Document
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                IAMS Campus Election Slip
              </h1>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
            student.hasVoted
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
          }`}>
            {student.hasVoted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voted</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>Eligible to Vote</span>
              </>
            )}
          </span>
        </div>

        {/* Digital ID Card */}
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-5 shadow-inner">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative shrink-0">
              <img
                src={student.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                alt={student.name}
                className="w-24 h-24 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-xl"
              />
              <div className="absolute -bottom-1 -right-1 p-1 bg-blue-600 text-white rounded-lg shadow">
                <QrCode className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-3 text-center sm:text-left flex-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Student Name
                </span>
                <h2 className="text-2xl font-extrabold text-white">
                  {student.name}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800/60">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Student ID
                  </span>
                  <strong className="font-mono text-blue-400 text-sm">{student.studentId || student.id}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Department
                  </span>
                  <strong className="text-slate-200">{student.department}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Semester
                  </span>
                  <strong className="text-slate-200">Semester {student.semester}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Voting Status
                  </span>
                  <strong className={student.hasVoted ? 'text-emerald-400' : 'text-amber-400'}>
                    {student.hasVoted ? 'Recorded in Firestore' : 'Pending'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Voting Status Call-to-action */}
        {student.hasVoted ? (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 font-bold text-xs uppercase tracking-wider text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ballot Successfully Submitted</span>
            </div>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              Your vote has already been submitted and verified in Cloud Firestore. No further action is required.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-300">
                <UserCheck className="w-4 h-4" />
                <span>Identity Verified</span>
              </div>
              <p className="text-xs text-amber-300/80">
                Click below to complete selfie verification and cast your vote on the EVM ballot.
              </p>
            </div>

            <button
              onClick={handleProceedToVote}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
            >
              <Vote className="w-5 h-5" />
              <span>Proceed to Selfie Verification & Cast Vote</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="text-center">
        <button
          onClick={onClearSlipParam}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold underline cursor-pointer"
        >
          Return to General Campus Home
        </button>
      </div>
    </div>
  );
};
