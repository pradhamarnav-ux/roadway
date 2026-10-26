import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Award,
  LogOut,
  User as UserIcon,
  HardHat,
  Building2,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Building2 className="w-3.5 h-3.5" />
            City Admin
          </span>
        );
      case 'inspector':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <HardHat className="w-3.5 h-3.5" />
            Field Inspector
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <UserIcon className="w-3.5 h-3.5" />
            Citizen
          </span>
        );
    }
  };

  const getNavLinkClass = (path) => {
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    return `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
        : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/80'
    }`;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900">
                  RoadWise<span className="text-emerald-600">.AI</span>
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                  PS#13
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">Civic Road Repair & Coordination</p>
            </div>
          </Link>

          {/* Navigation Links based on authentication */}
          {user ? (
            <div className="flex items-center gap-4 sm:gap-6">
              <nav className="hidden md:flex items-center gap-1">
                <Link to="/" className={getNavLinkClass('/')}>
                  Dashboard
                </Link>

                <Link to="/map" className={getNavLinkClass('/map')}>
                  City Map
                </Link>

                {user.role === 'citizen' && (
                  <>
                    <Link to="/report-hazard" className={getNavLinkClass('/report-hazard')}>
                      Report Hazard
                    </Link>

                    <Link to="/report-accident" className={getNavLinkClass('/report-accident')}>
                      Report Accident
                    </Link>

                    <Link to="/my-reports" className={getNavLinkClass('/my-reports')}>
                      My Reports
                    </Link>

                    <Link to="/rewards" className={getNavLinkClass('/rewards')}>
                      Rewards
                    </Link>

                    <span className="text-slate-300 px-1">|</span>
                    <Link
                      to="/rewards"
                      className="text-xs text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 hover:border-emerald-300 transition-all font-medium"
                      title="View Civic Wallet"
                    >
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      <strong className="text-emerald-700 font-mono">{user.pointsBalance || 0}</strong> pts
                    </Link>
                  </>
                )}

                {user.role === 'inspector' && (
                  <>
                    <Link to="/admin/verification" className={getNavLinkClass('/admin/verification')}>
                      Citizen Complaints
                    </Link>

                    <Link to="/inspector/console" className={getNavLinkClass('/inspector/console')}>
                      Inspector Console
                    </Link>
                  </>
                )}

                {user.role === 'admin' && (
                  <>
                    <Link to="/admin/repairs" className={getNavLinkClass('/admin/repairs')}>
                      Works & Repairs
                    </Link>
                  </>
                )}
              </nav>

              {/* User Pill & Logout */}
              <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-200">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-800">{user.name}</span>
                  {getRoleBadge(user.role)}
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-sm transition-all duration-200"
              >
                Join Platform
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
