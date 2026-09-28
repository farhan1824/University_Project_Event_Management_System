import React from 'react';
import { useAuth } from './context/AuthContext';
import { useEvent } from './context/EventContext';
import Navbar from './components/Navbar';
import EscalationChat from './components/EscalationChat';
import CollectPhoneModal from './components/CollectPhoneModal';
import LoginView from './views/Auth/LoginView';
import EventCreatorDashboard from './views/EventCreator/EventCreatorDashboard';
import TeamLeaderDashboard from './views/TeamLeader/TeamLeaderDashboard';
import WorkerDashboard from './views/Worker/WorkerDashboard';

export function App() {
  const { user, loading: authLoading } = useAuth();
  const { loading: eventLoading } = useEvent();

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold text-2xl animate-bounce shadow-xl shadow-primary/30">
          ⚡
        </div>
        <h2 className="font-display font-bold text-lg text-base-content mt-4">
          EventOps Command
        </h2>
        <p className="text-xs text-base-content/50 mt-1">
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
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content">
      {/* Top Navigation & Live Event Controls */}
      <Navbar />

      {/* Main Operational Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {user?.role === 'EVENT_CREATOR' && <EventCreatorDashboard />}
        {user?.role === 'TEAM_LEADER' && <TeamLeaderDashboard />}
        {user?.role === 'WORKER' && <WorkerDashboard />}
      </main>

      {/* Global Real-time Contextual Issue Escalation Drawer */}
      <EscalationChat />

      {/* Mandatory Phone Number Popup if user's phone is null */}
      <CollectPhoneModal />
    </div>
  );
}

export default App;
