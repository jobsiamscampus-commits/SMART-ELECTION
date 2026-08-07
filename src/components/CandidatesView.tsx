import React, { useState } from 'react';
import { useElection } from '../context/ElectionContext';
import { Candidate, IAMS_DEPARTMENTS } from '../types/election';
import {
  Search,
  Filter,
  Award,
  Vote,
  ExternalLink,
  X,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const CandidatesView: React.FC = () => {
  const { candidates, positions, setActiveTab, currentUser, settings } = useElection();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const departments = Array.from(
    new Set([...IAMS_DEPARTMENTS, ...candidates.map((c) => c.department)])
  );

  const filteredCandidates = candidates.filter((cand) => {
    const matchesSearch =
      cand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.positionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.manifesto.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPosition =
      selectedPositionId === 'all' || cand.positionId === selectedPositionId;

    const matchesDept =
      selectedDepartment === 'all' || cand.department === selectedDepartment;

    return matchesSearch && matchesPosition && matchesDept;
  });

  const isStudent = currentUser && 'hasVoted' in currentUser;
  const studentHasVoted = isStudent ? (currentUser as any).hasVoted : false;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>Nominated Candidates ({candidates.length})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Meet the Candidates
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Explore manifestos, achievements, and visions for IAMS Campus Student Council 2026
          </p>
        </div>

        {settings.votingOpen && !studentHasVoted && (
          <button
            onClick={() => setActiveTab('vote')}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/20 cursor-pointer transition-all self-start md:self-center"
          >
            <Vote className="w-4 h-4" />
            <span>Go to Voting Booth</span>
          </button>
        )}
      </div>

      {/* Filter Controls Bar */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-7 relative">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, position, or manifesto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Department Filter Dropdown */}
          <div className="sm:col-span-5 relative">
            <Filter className="w-4 h-4 absolute left-4 top-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Position Tab Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedPositionId('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedPositionId === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
            }`}
          >
            All Positions ({candidates.length})
          </button>
          {positions.map((pos) => {
            const count = candidates.filter((c) => c.positionId === pos.id).length;
            const isActive = selectedPositionId === pos.id;
            return (
              <button
                key={pos.id}
                onClick={() => setSelectedPositionId(pos.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {pos.title} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Candidate Cards Grid */}
      {filteredCandidates.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Award className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            No Candidates Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No candidates match your current search criteria or department filter. Try clearing filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((cand) => (
            <div
              key={cand.id}
              className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Top Image & Badge Header */}
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img
                      src={cand.photo}
                      alt={cand.name}
                      className="w-20 h-20 rounded-2xl object-cover ring-4 ring-slate-100 dark:ring-slate-800 group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm">
                      #{cand.positionName}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                      {cand.department}
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                      {cand.name}
                    </h3>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Running for {cand.positionName}
                    </p>
                  </div>
                </div>

                {/* Campaign Short Manifesto */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed border border-slate-200/50 dark:border-slate-700/50">
                  "{cand.campaignMessage || cand.manifesto}"
                </div>

                {/* Key Achievements Bullets */}
                {cand.achievements && cand.achievements.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Key Milestones
                    </span>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {cand.achievements.slice(0, 2).map((ach, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{ach}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => setSelectedCandidate(cand)}
                  className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span>View Manifesto</span>
                </button>

                {settings.votingOpen && !studentHasVoted && (
                  <button
                    onClick={() => setActiveTab('vote')}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Vote className="w-3.5 h-3.5" />
                    <span>Vote</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Profile & Manifesto Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="relative p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={selectedCandidate.photo}
                  alt={selectedCandidate.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/30"
                />
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20">
                    Candidate Profile
                  </span>
                  <h2 className="text-xl font-extrabold mt-0.5">
                    {selectedCandidate.name}
                  </h2>
                  <p className="text-xs text-blue-200">
                    {selectedCandidate.positionName} • {selectedCandidate.department}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Campaign Message Box */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-700 dark:text-blue-300">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Campaign Motto</span>
                </div>
                <p className="text-sm font-bold italic text-slate-800 dark:text-slate-200">
                  "{selectedCandidate.campaignMessage}"
                </p>
              </div>

              {/* Full Manifesto */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Official Election Manifesto
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  {selectedCandidate.manifesto}
                </p>
              </div>

              {/* Achievements & Credentials */}
              {selectedCandidate.achievements && selectedCandidate.achievements.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Key Achievements & Campus Roles
                  </h3>
                  <div className="space-y-2">
                    {selectedCandidate.achievements.map((ach, i) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex items-start gap-2 text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{ach}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                IAMS Campus Elections 2026
              </span>
              {settings.votingOpen && !studentHasVoted && (
                <button
                  onClick={() => {
                    setSelectedCandidate(null);
                    setActiveTab('vote');
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Vote className="w-4 h-4" />
                  <span>Cast Vote for Candidate</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
