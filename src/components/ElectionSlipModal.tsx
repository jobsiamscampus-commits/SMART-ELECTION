import React, { useState } from 'react';
import { Student } from '../types/election';
import {
  Vote,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Share2,
  QrCode,
  ShieldCheck,
  X,
  ExternalLink,
  ArrowRight,
  User,
  Building2,
  GraduationCap,
} from 'lucide-react';

interface ElectionSlipModalProps {
  student: Student;
  onClose: () => void;
  onProceedToVote?: (student: Student) => void;
}

export const ElectionSlipModal: React.FC<ElectionSlipModalProps> = ({
  student,
  onClose,
  onProceedToVote,
}) => {
  const [copied, setCopied] = useState(false);

  const studentIdentifier = student.studentId || student.id;
  const tokenKey = student.slipToken || studentIdentifier;

  // Generate permanent election slip URL with token
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  const slipUrl = `${baseUrl}?slip=${encodeURIComponent(tokenKey)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(slipUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(slipUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const passcodeText = student.passcode ? ` Passcode: ${student.passcode}` : '';
    const text = `Official Election Slip for ${student.name} (ID: ${studentIdentifier}).${passcodeText}\nLink: ${slipUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-blue-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white leading-tight">
                Official Election Slip
              </h3>
              <p className="text-[11px] text-blue-200">
                IAMS Campus Digital Voting Commission
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Digital Slip Card */}
        <div className="p-6 space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-6 shadow-xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-400 tracking-wider">
                <Vote className="w-4 h-4 text-blue-400" />
                <span>IAMS Voter Identity Slip</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                student.hasVoted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {student.hasVoted ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Already Voted</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>Eligible to Vote</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <img
                  src={student.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                  alt={student.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-md"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute -bottom-1 -right-1 p-1 bg-blue-600 text-white rounded-lg">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-2 flex-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Student Name
                  </span>
                  <h2 className="text-lg font-black text-white leading-tight">
                    {student.name}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Student ID
                    </span>
                    <strong className="font-mono text-blue-400">{studentIdentifier}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Passcode
                    </span>
                    <strong className="font-mono text-emerald-400 font-extrabold tracking-wider bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      {student.passcode || student.password || '123456'}
                    </strong>
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
                    <strong className="text-slate-200">Sem {student.semester}</strong>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="shrink-0 p-1.5 bg-white rounded-xl shadow-md hidden sm:block">
                <img
                  src={qrUrl}
                  alt={`QR Code for ${student.name}`}
                  className="w-16 h-16 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Shareable Link Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Shared Election Slip Link</span>
              <span className="text-[10px] font-normal text-slate-500">Works on any device or browser</span>
            </label>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={slipUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleShareWhatsApp}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share via WhatsApp</span>
              </button>

              <a
                href={slipUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <span>Open Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Action buttons */}
          {onProceedToVote && !student.hasVoted && (
            <button
              onClick={() => onProceedToVote(student)}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Vote className="w-4 h-4" />
              <span>Proceed to Selfie Verification & Cast Vote</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
