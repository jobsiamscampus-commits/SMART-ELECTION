import React from 'react';
import { Student } from '../types/election';
import { ShieldCheck, Vote, QrCode, X, Printer } from 'lucide-react';

interface PrintableElectionSlipsProps {
  students: Student[];
  onClose: () => void;
  collegeName?: string;
  electionName?: string;
}

export const PrintableElectionSlips: React.FC<PrintableElectionSlipsProps> = ({
  students,
  onClose,
  collegeName = 'IAMS Campus',
  electionName = 'Campus Student Union Election 2026',
}) => {
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/90 backdrop-blur-md p-4 sm:p-8 animate-fade-in">
      {/* Top Action Bar (hidden during printing) */}
      <div className="max-w-5xl mx-auto mb-6 p-4 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-between text-white shadow-xl print:hidden">
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span>Printable Election Slips ({students.length} Students)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Formatted for standard A4 printing. Click Print or save as PDF.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-5xl mx-auto bg-white text-slate-900 p-8 rounded-3xl shadow-2xl print:shadow-none print:p-0 print:m-0 print:max-w-none print:bg-transparent">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
          {students.map((student) => {
            const studentIdentifier = student.studentId || student.id;
            const tokenKey = student.slipToken || studentIdentifier;
            const slipUrl = `${baseUrl}?slip=${encodeURIComponent(tokenKey)}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(slipUrl)}`;
            const passcode = student.passcode || student.password || '123456';

            return (
              <div
                key={student.id}
                className="border-2 border-slate-800 rounded-2xl p-5 bg-white text-slate-900 space-y-4 shadow-sm break-inside-avoid print:break-inside-avoid page-break-inside-avoid"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                      IAMS
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        {collegeName}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {electionName}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded text-[9px] font-black uppercase tracking-wider">
                    Official Slip
                  </span>
                </div>

                {/* Body Details */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center">
                    {student.photo ? (
                      <img
                        src={student.photo}
                        alt={student.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShieldCheck className="w-8 h-8 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <h4 className="text-base font-black text-slate-900 leading-tight">
                      {student.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                      <div>
                        <span className="text-slate-500 font-semibold">Student ID: </span>
                        <strong className="font-mono text-slate-900">{studentIdentifier}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">Department: </span>
                        <strong className="text-slate-900">{student.department}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">Semester: </span>
                        <strong className="text-slate-900">Sem {student.semester}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">Status: </span>
                        <strong className={student.hasVoted ? 'text-emerald-700' : 'text-amber-700'}>
                          {student.hasVoted ? 'Voted' : 'Eligible'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="shrink-0 p-1 bg-white border border-slate-300 rounded-lg">
                    <img
                      src={qrUrl}
                      alt="QR Code"
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                </div>

                {/* Passcode & Security Footer */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Private Passcode
                    </span>
                    <strong className="font-mono text-sm tracking-widest text-slate-900">
                      {passcode}
                    </strong>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 block font-semibold">
                      Scan QR or Open Slip URL
                    </span>
                    <span className="text-[9px] font-mono text-blue-700 underline truncate max-w-[180px] block">
                      {slipUrl.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                </div>

                <div className="text-[9px] text-slate-400 text-center font-medium italic pt-1">
                  Do not share your private passcode with anyone. One student = One secure vote.
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
