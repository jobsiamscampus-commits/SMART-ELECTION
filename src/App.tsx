import React, { useState } from 'react';
import { ElectionProvider, useElection } from './context/ElectionContext';
import { SplashScreen } from './components/SplashScreen';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { HomeView } from './components/HomeView';
import { CandidatesView } from './components/CandidatesView';
import { VotingView } from './components/VotingView';
import { ResultsView } from './components/ResultsView';
import { StudentProfileView } from './components/StudentProfileView';
import { AdminDashboard } from './components/AdminDashboard';
import { NoticeBoardView } from './components/NoticeBoardView';
import { Vote, ShieldCheck, Heart } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { splashVisible, activeTab, currentUser } = useElection();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Splash Screen on startup */}
      {splashVisible && <SplashScreen />}

      {/* Main Top Header Navigation */}
      <Navbar onOpenLogin={() => setIsLoginModalOpen(true)} />

      {/* Auth Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Main View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 md:pb-12">
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'candidates' && <CandidatesView />}
        {activeTab === 'vote' && <VotingView />}
        {activeTab === 'results' && <ResultsView />}
        {activeTab === 'profile' && <StudentProfileView />}
        {activeTab === 'admin' && <AdminDashboard />}
        {activeTab === 'noticeboard' && <NoticeBoardView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Vote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Smart Campus Election System
            </span>
            <span>• IAMS Campus</span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <span>Powered by Cloud Firestore & React</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 70 Verified Voters
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ElectionProvider>
      <MainAppContent />
    </ElectionProvider>
  );
}
