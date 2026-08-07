import React from 'react';
import { useElection } from '../context/ElectionContext';
import {
  BarChart3,
  Trophy,
  Users,
  CheckCircle2,
  Lock,
  Award,
  TrendingUp,
  Percent,
} from 'lucide-react';

export const ResultsView: React.FC = () => {
  const { settings, positions, candidates, students, getCandidatesByPosition } = useElection();

  const totalStudents = students.length || 70;
  const votedCount = students.filter((s) => s.hasVoted).length;
  const turnoutPercent = Math.round((votedCount / totalStudents) * 100);

  // If Admin hasn't published results yet
  if (!settings.resultPublished) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6 animate-fade-in">
        <div className="p-8 sm:p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/80 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              Results Under Tabulation
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Election Results Locked
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Official election results will be published by the Election Admin once voting concludes and Firestore vote audits are finalized.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>Current Turnout:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {votedCount} / {totalStudents} Voters ({turnoutPercent}%)
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Published Header Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              ● Official Published Results
            </span>
            <span className="text-xs text-blue-200 font-medium">
              {settings.electionName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Election Results & Winner Tally
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1">
            Certified candidate vote totals and winner breakdown for IAMS Campus
          </p>
        </div>

        {/* Turnout Summary */}
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-blue-200 block">
              Total Turnout
            </span>
            <span className="text-xl font-extrabold text-emerald-400">
              {votedCount} / {totalStudents} ({turnoutPercent}%)
            </span>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-400 shrink-0" />
        </div>
      </div>

      {/* Position Breakdown Section */}
      <div className="space-y-8">
        {positions.map((pos) => {
          const candsForPos = getCandidatesByPosition(pos.id);
          const totalPosVotes = candsForPos.reduce((sum, c) => sum + (c.votesCount || 0), 0);

          // Sort candidates by votes descending
          const sortedCands = [...candsForPos].sort(
            (a, b) => (b.votesCount || 0) - (a.votesCount || 0)
          );

          const winner = sortedCands[0];
          const runnerUp = sortedCands[1];

          return (
            <div
              key={pos.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6"
            >
              {/* Position Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Council Seat
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {pos.title}
                  </h2>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Total Votes Cast: <strong className="text-slate-900 dark:text-white">{totalPosVotes}</strong>
                </div>
              </div>

              {/* Winner Highlight Box */}
              {winner && (winner.votesCount || 0) > 0 ? (
                <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5 border border-amber-300 dark:border-amber-800/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={winner.photo}
                        alt={winner.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-4 ring-amber-400/30"
                      />
                      <div className="absolute -bottom-2 -right-2 p-1 bg-amber-500 text-white rounded-lg shadow-md">
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white">
                        🏆 Elected {pos.title}
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                        {winner.name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {winner.department}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block">
                      {winner.votesCount} Votes
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {totalPosVotes > 0 ? Math.round(((winner.votesCount || 0) / totalPosVotes) * 100) : 0}% Victory Margin
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs text-slate-500 italic text-center">
                  No votes recorded yet for this position.
                </div>
              )}

              {/* Candidate Bar Charts */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Vote Breakdown Chart
                </h4>

                {sortedCands.map((cand, idx) => {
                  const votesRec = cand.votesCount || 0;
                  const pct = totalPosVotes > 0 ? Math.round((votesRec / totalPosVotes) * 100) : 0;
                  const isWinner = idx === 0 && votesRec > 0;

                  return (
                    <div key={cand.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center ${
                            isWinner ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200">
                            {cand.name}
                          </span>
                          <span className="text-slate-400 text-[10px] font-normal">
                            ({cand.department})
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-slate-900 dark:text-white font-extrabold">
                            {votesRec} votes
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 font-extrabold w-10 text-right">
                            {pct}%
                          </span>
                        </div>
                      </div>

                      {/* Bar Fill */}
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isWinner
                              ? 'bg-gradient-to-r from-amber-400 to-amber-600 shadow-sm'
                              : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
