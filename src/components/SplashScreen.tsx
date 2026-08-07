import React, { useEffect, useState } from 'react';
import { useElection } from '../context/ElectionContext';
import { Vote, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  const { setSplashVisible, soundEnabled } = useElection();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setSplashVisible(false), 300);
          return 100;
        }
        return prev + 5;
      });
    }, 60);

    return () => clearInterval(timer);
  }, [setSplashVisible]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white p-6 select-none overflow-hidden">
      {/* Background Decorative Ripples */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Badge */}
      <div className="pt-8 flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-full text-xs font-semibold tracking-wider uppercase text-blue-200">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Secure Firestore e-Voting System</span>
      </div>

      {/* Center Branding & Logo */}
      <div className="flex flex-col items-center text-center my-auto max-w-sm px-4">
        <div className="relative mb-6 group">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-3xl blur-lg opacity-60 animate-pulse" />
          <div className="relative w-28 h-28 bg-blue-800/90 border border-white/20 rounded-3xl flex items-center justify-center shadow-2xl backdrop-blur-xl">
            <Vote className="w-14 h-14 text-white transform group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border border-white/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
          Smart Campus Election
        </h1>
        <p className="text-blue-200 text-base font-medium mb-1">
          IAMS Campus • Student Council 2026
        </p>
        <p className="text-xs text-blue-300/80 max-w-xs">
          Official digital voting portal for 70 registered campus voters
        </p>
      </div>

      {/* Footer Loader & Skip Action */}
      <div className="w-full max-w-xs pb-10 flex flex-col items-center gap-4">
        <div className="w-full bg-white/10 backdrop-blur-md rounded-full h-2 overflow-hidden border border-white/10 p-0.5">
          <div
            className="bg-gradient-to-r from-blue-400 to-emerald-400 h-full rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-full text-xs text-blue-200/80 px-1">
          <span>Initializing portal... {progress}%</span>
          <button
            onClick={() => setSplashVisible(false)}
            className="hover:text-white flex items-center gap-1 font-semibold underline underline-offset-4 cursor-pointer transition-colors"
          >
            <span>Skip</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
