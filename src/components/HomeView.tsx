import React from 'react';
import { useElection } from '../context/ElectionContext';
import {
  Vote,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    currentUser,
    userRole,
    settings,
    setActiveTab,
  } = useElection();

  const isStudent = userRole === 'student' && currentUser && 'hasVoted' in currentUser;
  const studentHasVoted = isStudent ? (currentUser as any).hasVoted : false;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="w-full max-w-2xl">
        {/* Main Action Card (Material Design 3, 18px rounded, #1565C0 Professional Blue Theme) */}
        <div className="relative overflow-hidden rounded-[18px] bg-[#1565C0] text-white p-8 sm:p-12 shadow-2xl border border-blue-400/20 transition-all transform hover:shadow-3xl">
          {/* Background Ambient Glow Accents */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 text-center space-y-6">
            {/* Voting State Logic */}
            {studentHasVoted ? (
              /* State 1: Student Has Voted */
              <div className="space-y-6 animate-scale-up">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto shadow-lg text-emerald-400">
                  <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verified Ballot</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                    Vote Submitted
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                    Thank you, {currentUser?.name || 'Student'}! Your ballot has been securely submitted and recorded in the election system.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('results')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/20 transition-all cursor-pointer"
                  >
                    <span>View Election Results</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : settings.votingOpen ? (
              /* State 2: Voting Open & Student Has Not Voted */
              <div className="space-y-6 animate-fade-in">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto shadow-xl text-white text-3xl sm:text-4xl">
                  🗳️
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-bold uppercase tracking-wider border border-white/20">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Official IAMS Campus Election</span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                    Cast Your Vote Now
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                    Choose your student leaders for Chairman, Treasurer, Media Head, Program Coordinator, and General Captain.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setActiveTab('vote')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-white hover:bg-blue-50 text-[#1565C0] font-black text-base shadow-2xl hover:shadow-white/20 transition-all transform hover:-translate-y-0.5 cursor-pointer active:scale-95"
                  >
                    <Vote className="w-6 h-6 text-[#1565C0]" />
                    <span>Vote Now</span>
                    <ArrowRight className="w-5 h-5 text-[#1565C0]" />
                  </button>
                </div>
              </div>
            ) : (
              /* State 3: Voting Closed */
              <div className="space-y-6 animate-fade-in">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto shadow-xl text-amber-300">
                  <Lock className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                    Voting is currently closed.
                  </h1>
                  <p className="text-blue-100 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                    The voting portal is currently offline or closed by the Election Commission. Please check back later.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('candidates')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/20 transition-all cursor-pointer"
                  >
                    <span>Browse Nominated Candidates</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

