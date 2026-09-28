import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { EventProvider } from './context/EventContext.jsx';

// Global Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-base-200 border border-error/30 rounded-3xl p-8 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-error/20 text-error flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="font-display font-bold text-xl text-base-content">
              Temporary Render Notice
            </h2>
            <p className="text-xs text-base-content/70">
              {this.state.error?.message || 'An unexpected rendering state occurred.'}
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('eventops_user');
                window.location.reload();
              }}
              className="btn btn-sm btn-primary rounded-xl font-bold"
            >
              🔄 Refresh & Restore Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <EventProvider>
            <App />
          </EventProvider>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
