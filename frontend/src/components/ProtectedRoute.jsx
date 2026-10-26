import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldX } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Verifying session security...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 glass-panel rounded-2xl text-center border border-rose-500/30">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
          <ShieldX className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied (403 Forbidden)</h2>
        <p className="text-sm text-slate-400 mb-6">
          Your active account role is <strong className="text-slate-200">[{user.role.toUpperCase()}]</strong>.
          This console requires privileges: <strong className="text-rose-400">[{allowedRoles.join(', ')}]</strong>.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return children;
}
