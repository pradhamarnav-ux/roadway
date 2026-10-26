import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  MapPin,
  Award,
  HardHat,
  CheckCircle2,
  PlusCircle,
  Clock,
  Map,
  Wrench,
  Gift,
  AlertTriangle,
  Building2,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [repairStats, setRepairStats] = useState(null);
  const [recentWorks, setRecentWorks] = useState([]);
  const [loadingWorks, setLoadingWorks] = useState(false);

  // Inspector-specific complaint state
  const [inspectorReports, setInspectorReports] = useState([]);
  const [triageStats, setTriageStats] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [complaintTab, setComplaintTab] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [inspectorSuccessMsg, setInspectorSuccessMsg] = useState('');

  const fetchInspectorData = () => {
    if (user && user.role === 'inspector') {
      setLoadingReports(true);
      axios
        .get(`/api/verification/queue?status=${complaintTab}`)
        .then((res) => {
          if (res.data.success) setInspectorReports(res.data.reports || []);
        })
        .catch((err) => console.warn('Could not fetch inspector reports:', err.message))
        .finally(() => setLoadingReports(false));

      axios
        .get('/api/verification/stats')
        .then((res) => {
          if (res.data.success) setTriageStats(res.data.stats);
        })
        .catch((err) => console.warn('Could not fetch triage stats:', err.message));
    }
  };

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'inspector')) {
      axios
        .get('/api/repairs/analytics/overview')
        .then((res) => {
          if (res.data.success) setRepairStats(res.data);
        })
        .catch((err) => console.warn('Could not fetch repair stats:', err.message));

      if (user.role === 'admin') {
        setLoadingWorks(true);
        axios
          .get('/api/repairs')
          .then((res) => {
            if (res.data.success) setRecentWorks(res.data.issues || []);
          })
          .catch((err) => console.warn('Could not fetch repairs:', err.message))
          .finally(() => setLoadingWorks(false));
      }

      if (user.role === 'inspector') {
        fetchInspectorData();
      }
    }
  }, [user, complaintTab]);

  const handleInspectorVerify = async (reportId, status, notes = 'Field verified on-site by inspector.') => {
    try {
      setActionLoading(reportId);
      setInspectorSuccessMsg('');
      const res = await axios.patch(`/api/verification/reports/${reportId}/status`, { status, notes });
      if (res.data.success) {
        setInspectorReports((prev) =>
          prev.map((r) =>
            r._id === reportId
              ? { ...r, verificationStatus: status, evidenceConsistencyScore: res.data.report.evidenceConsistencyScore }
              : r
          )
        );
        setInspectorSuccessMsg(res.data.message || `Complaint marked as ${status} successfully!`);
        // Refresh triage stats
        axios.get('/api/verification/stats').then((s) => {
          if (s.data.success) setTriageStats(s.data.stats);
        });
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update complaint status');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SCHEDULED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">SCHEDULED</span>;
      case 'ASSIGNED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">ASSIGNED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">IN PROGRESS</span>;
      case 'INSPECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">INSPECTED</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">CLOSED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-emerald-200/80 mb-8 bg-gradient-to-r from-white via-emerald-50/40 to-white shadow-sm">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-300/60 font-semibold">
                RoadWise AI Active Platform
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Role: {user.role.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Welcome, {user.name}
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              {user.role === 'citizen' &&
                'Report road hazards, earn verified civic points, redeem simulated transit perks, and track city repairs in real time.'}
              {user.role === 'admin' &&
                'Municipal Works Status: Check all road repair works, assigned municipal crews, and defect lifecycles across the city.'}
              {user.role === 'inspector' &&
                'Field Verification & Inspection Console: Verify potholes on-site, mark them as INSPECTED to award citizen reward points, and certify completed repairs.'}
            </p>
          </div>

          {/* Quick Metrics Header Pill (CITIZEN ONLY) */}
          {user.role === 'citizen' && (
            <Link
              to="/rewards"
              className="flex items-center gap-3 bg-white hover:bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200 shadow-sm transition-all group"
              title="Open Civic Wallet"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block font-medium group-hover:text-emerald-800">Civic Reward Balance</span>
                <span className="text-lg font-bold text-slate-900 font-mono">{user.pointsBalance || 0} pts</span>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Role-Specific Content: CITIZEN */}
      {/* ========================================================================= */}
      {user.role === 'citizen' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link
            to="/report-hazard"
            className="glass-card rounded-2xl p-6 border border-emerald-100 hover:border-emerald-500/60 flex flex-col justify-between group transition-all shadow-sm"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                Report Road Hazard
              </h3>
              <p className="text-xs text-slate-600">
                Submit photo evidence with GPS coordinates for potholes, cracks, or collapsed manholes.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-semibold group-hover:underline">Start Report ➔</span>
              <span className="text-[10px] text-slate-400 font-mono">Map Pinning</span>
            </div>
          </Link>

          <Link
            to="/map"
            className="glass-card rounded-2xl p-6 border border-emerald-100 hover:border-emerald-500/60 flex flex-col justify-between group transition-all shadow-sm"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-110 transition-transform">
                <Map className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                Interactive City Map
              </h3>
              <p className="text-xs text-slate-600">
                View real-time citywide GIS defects styled by priority, safety aura, and repair state.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-semibold group-hover:underline">Explore Map ➔</span>
              <span className="text-[10px] text-slate-400 font-mono">React Leaflet</span>
            </div>
          </Link>

          <Link
            to="/rewards"
            className="glass-card rounded-2xl p-6 border border-emerald-100 hover:border-emerald-500/60 flex flex-col justify-between group transition-all shadow-sm"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-110 transition-transform">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                RoadWise Rewards
              </h3>
              <p className="text-xs text-slate-600">
                Civic wallet, append-only points ledger, simulated transit perks, and top-100 leaderboard.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-semibold group-hover:underline">Open Rewards Hub ➔</span>
              <span className="text-[10px] text-slate-400 font-mono">Atomic Perks</span>
            </div>
          </Link>

          <Link
            to="/my-reports"
            className="glass-card rounded-2xl p-6 border border-emerald-100 hover:border-emerald-500/60 flex flex-col justify-between group transition-all shadow-sm"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                My Reports & Workflow
              </h3>
              <p className="text-xs text-slate-600">
                Live 7-stage lifecycle tracker: Reported ➔ Scheduled ➔ Crew Assigned ➔ Inspected ➔ Closed.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-semibold group-hover:underline">Track Repairs ➔</span>
              <span className="text-[10px] text-slate-400 font-mono">Work Orders</span>
            </div>
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Role-Specific Content: ADMIN (Check what works are present) */}
      {/* ========================================================================= */}
      {user.role === 'admin' && (
        <div className="space-y-8 mb-8">
          {/* Top Works Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <span className="text-xs text-slate-500 block font-medium">Total Road Works Present</span>
              <span className="text-3xl font-bold text-slate-900 mt-1 block font-mono">
                {repairStats ? repairStats.totalIssues : recentWorks.length}
              </span>
              <span className="text-[11px] text-emerald-700 mt-2 block font-medium">
                Tracked Across City Corridors
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <span className="text-xs text-slate-500 block font-medium">Scheduled Works</span>
              <span className="text-3xl font-bold text-amber-600 mt-1 block font-mono">
                {repairStats?.statusCounts?.SCHEDULED ?? 0}
              </span>
              <span className="text-[11px] text-amber-700 mt-2 block font-medium">
                Work Orders Approved
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <span className="text-xs text-slate-500 block font-medium">Active In-Progress</span>
              <span className="text-3xl font-bold text-indigo-600 mt-1 block font-mono">
                {repairStats?.statusCounts?.IN_PROGRESS ?? 0}
              </span>
              <span className="text-[11px] text-indigo-700 mt-2 block font-medium">
                Crews Dispatched On-Site
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <span className="text-xs text-slate-500 block font-medium">Inspected Works</span>
              <span className="text-3xl font-bold text-emerald-600 mt-1 block font-mono">
                {repairStats?.statusCounts?.INSPECTED ?? 0}
              </span>
              <span className="text-[11px] text-emerald-700 mt-2 block font-medium">
                Certified by Field Inspectors
              </span>
            </div>
          </div>

          {/* Quick Action Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              to="/admin/repairs"
              className="bg-white rounded-2xl p-6 border border-emerald-100 hover:border-emerald-500/60 transition-all group shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Check All Road Works & Repairs
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Filter by status, view assigned crews, work orders, and completion timelines.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/map"
              className="bg-white rounded-2xl p-6 border border-emerald-100 hover:border-emerald-500/60 transition-all group shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                  <Map className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Check Road Works on GIS Map
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Geographic overview of all active defects, road classes, and repair coordinates.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>

          {/* Current Road Works Present Table */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Current Road Works Present Across City</h3>
                <p className="text-xs text-slate-500">Live list of ground-truth defects and municipal work orders</p>
              </div>
              <Link
                to="/admin/repairs"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                View Full Works Directory ➔
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Work Order / ID</th>
                    <th className="py-3 px-4">Defect Description</th>
                    <th className="py-3 px-4">Road Class</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Crew</th>
                    <th className="py-3 px-4">Est. Spend</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentWorks.slice(0, 8).map((work) => (
                    <tr key={work._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {work.workOrderNumber || work.issueCode}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 capitalize block">{work.primaryDamageType || 'Road Defect'}</span>
                        <span className="text-[11px] text-slate-500 truncate block max-w-xs">{work.title}</span>
                      </td>
                      <td className="py-3 px-4 capitalize font-medium text-slate-700">
                        {work.roadClass || 'collector'}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(work.status)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {work.assignedTeam ? work.assignedTeam.split(':')[0] : <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        ${work.estimatedCost?.toLocaleString() || '1,500'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/map`}
                          className="text-emerald-700 hover:text-emerald-900 font-semibold"
                        >
                          View Map ➔
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {recentWorks.length === 0 && !loadingWorks && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        No active road works recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Role-Specific Content: INSPECTOR */}
      {/* ========================================================================= */}
      {user.role === 'inspector' && (
        <div className="space-y-8 mb-8">
          {/* Inspector KPI Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <span className="text-xs text-slate-500 block font-medium">Pending Citizen Complaints</span>
              <span className="text-3xl font-bold text-amber-600 mt-1 block font-mono">
                {triageStats
                  ? (triageStats.unverifiedCount || 0) + (triageStats.needsInspectionCount || 0)
                  : inspectorReports.filter((r) => r.verificationStatus === 'UNVERIFIED' || r.verificationStatus === 'NEEDS_INSPECTION').length}
              </span>
              <span className="text-[11px] text-amber-700 mt-2 block font-medium">
                Awaiting Field Verification
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <span className="text-xs text-slate-500 block font-medium">Corroborated Reports</span>
              <span className="text-3xl font-bold text-blue-600 mt-1 block font-mono">
                {triageStats?.corroboratedCount ?? inspectorReports.filter((r) => r.verificationStatus === 'CORROBORATED').length}
              </span>
              <span className="text-[11px] text-blue-700 mt-2 block font-medium">
                Multi-Citizen Reported Defects
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <span className="text-xs text-slate-500 block font-medium">Certified / Inspected</span>
              <span className="text-3xl font-bold text-emerald-600 mt-1 block font-mono">
                {repairStats?.statusCounts?.INSPECTED ?? inspectorReports.filter((r) => r.verificationStatus === 'INSPECTOR_VERIFIED').length}
              </span>
              <span className="text-[11px] text-emerald-700 mt-2 block font-medium">
                Field Sign-offs Recorded
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <span className="text-xs text-slate-500 block font-medium">Total City Complaints</span>
              <span className="text-3xl font-bold text-slate-900 mt-1 block font-mono">
                {triageStats?.totalReports ?? inspectorReports.length}
              </span>
              <span className="text-[11px] text-slate-500 mt-2 block font-medium">
                Tracked in Municipal Triage
              </span>
            </div>
          </div>

          {/* Quick Action Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/admin/verification"
              className="bg-white rounded-2xl p-6 border border-emerald-100 hover:border-emerald-500/60 transition-all group block shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                Citizen Complaints Queue
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Review all citizen-reported hazards on-site, inspect defect evidence, approve as <strong>INSPECTED</strong>, and award verified points.
              </p>
              <span className="text-xs text-emerald-700 font-bold mt-4 block group-hover:underline">
                Open Full Verification Queue ➔
              </span>
            </Link>

            <Link
              to="/inspector/console"
              className="bg-white rounded-2xl p-6 border border-emerald-100 hover:border-emerald-500/60 transition-all group block shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-110 transition-transform">
                <HardHat className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                Field Inspector Console
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unified console for citizen complaints triage and repair work order quality verification with photo uploads.
              </p>
              <span className="text-xs text-emerald-700 font-bold mt-4 block group-hover:underline">
                Open Dispatch Console ➔
              </span>
            </Link>

            <Link
              to="/map"
              className="bg-white rounded-2xl p-6 border border-emerald-100 hover:border-emerald-500/60 transition-all group block shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                Zone GIS Map View
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct spatial navigation coordinates for reported citizen defects, assigned inspection tasks, and municipal repair zones.
              </p>
              <span className="text-xs text-emerald-700 font-bold mt-4 block group-hover:underline">
                Launch City Map ➔
              </span>
            </Link>
          </div>

          {/* Success Banner */}
          {inspectorSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{inspectorSuccessMsg}</span>
              </div>
              <button
                onClick={() => setInspectorSuccessMsg('')}
                className="text-xs text-emerald-700 font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Live Citizen Complaints Table */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Citizen Complaints Awaiting Inspector Verification
                  </h3>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-mono font-semibold px-2 py-0.5 rounded-full">
                    {inspectorReports.length} Reports
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complaints filed by citizens across the city. Review evidence and certify on-site.
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'UNVERIFIED', 'NEEDS_INSPECTION', 'CORROBORATED', 'INSPECTOR_VERIFIED'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setComplaintTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      complaintTab === tab
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {tab.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Ticket ID</th>
                    <th className="py-3 px-4">Defect Evidence</th>
                    <th className="py-3 px-4">Reported By</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Evidence Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Inspector Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspectorReports.slice(0, 10).map((rep) => (
                    <tr key={rep._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        <Link
                          to={`/reports/${rep.reportId}`}
                          className="text-emerald-700 hover:underline"
                        >
                          {rep.reportId}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={rep.photoUrl}
                            alt={rep.damageType}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=100&auto=format&fit=crop';
                            }}
                          />
                          <div>
                            <span className="font-semibold text-slate-800 capitalize block">
                              {rep.damageType?.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block max-w-xs">
                              {rep.description}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              Severity: {rep.severity}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-medium block">
                          {rep.reporter?.alias || rep.reporter?.name || 'Citizen'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(rep.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {rep.manualAddress ? (
                          <span className="block font-sans text-slate-700 truncate max-w-[150px]" title={rep.manualAddress}>
                            {rep.manualAddress}
                          </span>
                        ) : null}
                        <span className="text-slate-400">
                          {rep.rawLocation?.coordinates[1]?.toFixed(4)}°, {rep.rawLocation?.coordinates[0]?.toFixed(4)}°
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                            rep.evidenceConsistencyScore >= 75
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : rep.evidenceConsistencyScore >= 40
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {rep.evidenceConsistencyScore} / 100
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {rep.verificationStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rep.verificationStatus !== 'INSPECTOR_VERIFIED' ? (
                            <button
                              onClick={() => handleInspectorVerify(rep._id, 'INSPECTOR_VERIFIED')}
                              disabled={actionLoading === rep._id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-sm transition-colors disabled:opacity-50"
                              title="Approve defect on-site and award points"
                            >
                              {actionLoading === rep._id ? 'Verifying...' : 'Approve & Verify'}
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Inspected
                            </span>
                          )}
                          <Link
                            to={`/reports/${rep.reportId}`}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {inspectorReports.length === 0 && !loadingReports && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                        <span className="block font-semibold text-slate-700">No citizen complaints found</span>
                        <span className="text-xs text-slate-400">
                          No reports currently match status "{complaintTab}".
                        </span>
                      </td>
                    </tr>
                  )}
                  {loadingReports && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
                        <span>Loading citizen complaints...</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing up to 10 latest complaints</span>
              <Link
                to="/admin/verification"
                className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
              >
                Go to Full Citizen Complaints Queue ➔
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
