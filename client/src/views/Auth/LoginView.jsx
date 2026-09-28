import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from '../../firebase/firebaseConfig';
import { LogIn, UserPlus, AlertCircle, Mail, Lock, User, Phone, CheckCircle2 } from 'lucide-react';

export const LoginView = () => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Friendly translation of Firebase Auth Error Codes
  const getFirebaseErrorMessage = (err) => {
    switch (err.code) {
      case 'auth/email-already-in-use':
        return 'This email address is already registered. Please sign in instead.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters long.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check and try again.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed before completing.';
      case 'auth/popup-blocked':
        return 'Google sign-in popup was blocked by your browser. Please allow popups.';
      default:
        return err.message || 'Authentication failed. Please try again.';
    }
  };

  // Email & Password Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      let firebaseUser = null;

      if (isRegister) {
        // 1. Create User in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        firebaseUser = userCredential.user;
      } else {
        // 1. Sign In with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        firebaseUser = userCredential.user;
      }

      // 2. Save / Sync user in backend database
      await login({
        email: firebaseUser.email,
        name: isRegister ? name.trim() : (firebaseUser.displayName || email.split('@')[0]),
        phone: phone.trim() || '+880 1700-000000',
        avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || email)}`,
        uid: firebaseUser.uid
      });

      setSuccessMessage('Authenticated successfully!');

    } catch (err) {
      console.error('Firebase Auth Error:', err);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In with Firebase
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      // 1. Trigger Google Sign-In Popup
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      // 2. Save / Sync user in backend database
      await login({
        email: fbUser.email,
        name: fbUser.displayName || fbUser.email.split('@')[0],
        phone: fbUser.phoneNumber || '+880 1700-000000',
        avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fbUser.displayName || fbUser.email)}`,
        uid: fbUser.uid
      });

      setSuccessMessage('Signed in with Google successfully!');

    } catch (err) {
      console.error('Google Sign-In Error:', err);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-300 via-base-100 to-base-300 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-primary to-secondary mx-auto flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-primary/30 mb-3">
            ⚡
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-base-content tracking-tight">
            EventOps Command
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Hierarchical Operations & Escalation Platform
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-base-200/90 backdrop-blur-xl border border-base-content/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          
          {/* Toggle Sign In / Sign Up */}
          <div className="flex bg-base-100 p-1 rounded-2xl border border-base-content/10">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                !isRegister ? 'bg-primary text-white shadow-md' : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                isRegister ? 'bg-primary text-white shadow-md' : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="alert alert-error p-3 rounded-2xl text-xs text-white flex items-center gap-2 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success p-3 rounded-2xl text-xs text-white flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <>
                <div>
                  <label className="label-text text-xs font-bold text-base-content/70 mb-1 flex items-center gap-1">
                    <User size={13} /> Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input input-sm input-bordered w-full bg-base-100 rounded-xl"
                  />
                </div>

                <div>
                  <label className="label-text text-xs font-bold text-base-content/70 mb-1 flex items-center gap-1">
                    <Phone size={13} /> Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input input-sm input-bordered w-full bg-base-100 rounded-xl font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="label-text text-xs font-bold text-base-content/70 mb-1 flex items-center gap-1">
                <Mail size={13} /> Email Address
              </label>
              <input
                type="email"
                required
                placeholder="your.email@events.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-sm input-bordered w-full bg-base-100 rounded-xl"
              />
            </div>

            <div>
              <label className="label-text text-xs font-bold text-base-content/70 mb-1 flex items-center gap-1">
                <Lock size={13} /> Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-sm input-bordered w-full bg-base-100 rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-sm btn-primary w-full rounded-xl font-bold mt-2 shadow-lg shadow-primary/20 gap-1.5"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : isRegister ? (
                <>
                  <UserPlus size={15} /> Register Account
                </>
              ) : (
                <>
                  <LogIn size={15} /> Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider text-[10px] text-base-content/40 uppercase tracking-widest my-2">
            Or continue with
          </div>

          {/* Google Sign In via Firebase */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn btn-sm btn-outline border-base-content/20 hover:bg-base-100 w-full rounded-xl gap-2 text-xs normal-case shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            Sign in with Google
          </button>

        </div>

        {/* Footer Role Notice */}
        <p className="text-center text-[11px] text-base-content/50 mt-4 max-w-xs mx-auto">
          The first user to register becomes the <strong>Event Creator (Admin)</strong>. Subsequent users register as <strong>Workers</strong> and can be promoted to Team Leaders.
        </p>

      </div>
    </div>
  );
};

export default LoginView;
