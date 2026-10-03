import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useEvent } from './context/EventContext';
import Navbar from './components/Navbar';
import EscalationChat from './components/EscalationChat';
import CollectPhoneModal from './components/CollectPhoneModal';
import MobileBottomNav from './components/MobileBottomNav';
import LoginView from './views/Auth/LoginView';
import EventCreatorDashboard from './views/EventCreator/EventCreatorDashboard';
import TeamLeaderDashboard from './views/TeamLeader/TeamLeaderDashboard';
import WorkerDashboard from './views/Worker/WorkerDashboard';

export function App() {
  const { user, loading: authLoading } = useAuth();
  const { loading: eventLoading } = useEvent();
  const [mobileTab, setMobileTab] = useState(null);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl animate-bounce shadow-xl shadow-indigo-600/25">
          ⚡
        </div>
        <h2 className="font-display font-black text-xl text-slate-900 mt-4 tracking-tight">
          Event<span className="text-primary">Ops</span> Command
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Authenticating secure operational session...
        </p>
      </div>
    );
  }

  // If not logged in, display the Login / Registration screen
  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation & Live Event Controls */}
      <Navbar />

      {/* Main Operational Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 md:p-8">
        {user?.role === 'EVENT_CREATOR' && <EventCreatorDashboard />}
        {user?.role === 'TEAM_LEADER' && <TeamLeaderDashboard />}
        {user?.role === 'WORKER' && <WorkerDashboard />}
      </main>

      {/* Global Real-time Contextual Issue Escalation Drawer */}
      <EscalationChat />

      {/* Mandatory Phone Number Popup if user's phone is null */}
      <CollectPhoneModal />

      {/* Mobile Bottom Navigation Dock (Thumb-friendly for smartphone operations) */}
      <MobileBottomNav 
        activeTab={mobileTab} 
        onSelectTab={(tab) => setMobileTab(tab)} 
      />
    </div>
  );
}

export default App;
