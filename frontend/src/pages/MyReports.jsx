import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  FileText,
  PlusCircle,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await axios.get('/api/reports/my');
        if (res.data.success) {
          setReports(res.data.reports);
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to load your reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CORROBORATED':
      case 'INSPECTOR_VERIFIED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {status}
          </span>
        );
      case 'LOCATION_MISMATCH':
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {status}
          </span>
        );
      case 'NEEDS_INSPECTION':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            NEEDS INSPECTION
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            UNVERIFIED
          </span>
        );
    }
  };

  const getSeverityBadge = (severity) => {
    const map = {
      low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      critical: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${map[severity] || map.medium}`}>
        {severity}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-brand-400 mb-1">
            <Clock className="w-4 h-4" />
            <span>Citizen Tracking Log</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">My Submitted Reports</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track the verification progress, evidence scores, and repair lifecycle of your complaints.
          </p>
        </div>

        <Link
          to="/report-hazard"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-lg shadow-brand-600/25 flex items-center gap-2 self-start sm:self-auto transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Hazard</span>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">No Reports Submitted Yet</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Help coordinate safer city streets by photographing and reporting potholes, surface fissures, or manhole collapses.
          </p>
          <Link
            to="/report-hazard"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>File Your First Report</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <div
              key={report._id}
              className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              {/* Photo & Basic Info */}
              <div className="flex items-start gap-4">
                <img
                  src={report.photoUrl}
                  alt={report.damageType}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-700/80 shrink-0 bg-slate-900"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=200&auto=format&fit=crop';
                  }}
                />
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-brand-400">
                      {report.reportId}
                    </span>
                    {getSeverityBadge(report.severity)}
                    {getStatusBadge(report.verificationStatus)}
                    {report.roadIssue?.status && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Repair: {report.roadIssue.status}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white capitalize">
                    {report.damageType.replace('_', ' ')}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {report.rawLocation?.coordinates[1]?.toFixed(4)}, {report.rawLocation?.coordinates[0]?.toFixed(4)}
                    </span>
                    <span>•</span>
                    <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Score & View Action */}
              <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                <div className="text-left md:text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Evidence Consistency
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          report.evidenceConsistencyScore >= 70
                            ? 'bg-emerald-500'
                            : report.evidenceConsistencyScore >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${report.evidenceConsistencyScore}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {report.evidenceConsistencyScore}%
                    </span>
                  </div>
                </div>

                <Link
                  to={`/reports/${report.reportId}`}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors group-hover:bg-brand-600 group-hover:text-white"
                >
                  <span>Details</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
