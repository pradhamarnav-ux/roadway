import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowRight, UserCheck, HardHat, Building2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const getErrorMessage = (err) => {
    if (err.response?.data?.error) {
      return err.response.data.error;
    }
    if (err.response?.status === 500 || err.message?.includes('500')) {
      return 'Server connection error (HTTP 500). Please ensure the backend server is running on port 5000 (`npm run start:backend` or `npm start`).';
    }
    if (err.message === 'Network Error') {
      return 'Network Error: Cannot reach backend server on port 5000. Please verify the server is running.';
    }
    return err.message || 'Authentication failed';
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setSubmitting(true);
    try {
      await login(demoEmail, demoPass);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sign In to RoadWise AI
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Civic coordination portal for citizens, inspectors & city engineers
          </p>
        </div>

        {/* Quick Demo Role Selector */}
        <div className="mb-6 p-4 bg-white rounded-2xl border border-emerald-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              ⚡ Quick Demo One-Click Login
            </span>
            <span className="text-[11px] text-slate-500">Pre-seeded accounts</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('citizen@roadwise.ai', 'Citizen@123')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/80 text-slate-800 transition-all text-center group"
            >
              <UserCheck className="w-5 h-5 text-emerald-700 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold">Citizen</span>
              <span className="text-[10px] text-slate-500">Aarav</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('admin@roadwise.ai', 'Admin@123')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-800 transition-all text-center group"
            >
              <Building2 className="w-5 h-5 text-rose-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold">Admin</span>
              <span className="text-[10px] text-slate-500">Chief Priya</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('inspector@roadwise.ai', 'Inspector@123')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-800 transition-all text-center group"
            >
              <HardHat className="w-5 h-5 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold">Inspector</span>
              <span className="text-[10px] text-slate-500">Vikram</span>
            </button>
          </div>

          {/* Additional Citizen Personas */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
              <span>More Citizen Personas</span>
              <span className="text-emerald-700 font-medium">Phase 8 Seed</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('ananya.sen@example.com', 'Citizen@123')}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-[11px] text-slate-700 transition-all flex items-center justify-between"
              >
                <span className="truncate">Ananya Sen</span>
                <span className="text-[10px] text-emerald-700 font-mono font-semibold shrink-0">210 pts</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('sunita.verma@example.com', 'Citizen@123')}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-[11px] text-slate-700 transition-all flex items-center justify-between"
              >
                <span className="truncate">Sunita Verma</span>
                <span className="text-[10px] text-emerald-700 font-mono font-semibold shrink-0">95 pts</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('rohit.mehta@example.com', 'Citizen@123')}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-[11px] text-slate-700 transition-all flex items-center justify-between"
              >
                <span className="truncate">Rohit Mehta</span>
                <span className="text-[10px] text-emerald-700 font-mono font-semibold shrink-0">45 pts</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('vikas.yadav@example.com', 'Citizen@123')}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-[11px] text-slate-700 transition-all flex items-center justify-between"
              >
                <span className="truncate">Vikas (Opted-Out)</span>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">65 pts</span>
              </button>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-emerald-100">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. citizen@roadwise.ai"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Need an account?{' '}
            <Link to="/register" className="font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
