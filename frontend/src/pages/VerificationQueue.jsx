import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  MapPin,
  CheckCircle2,
  XCircle,
  HardHat,
  Award,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VerificationQueue() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Inspector modal notes
  const [notesModal, setNotesModal] = useState({
    open: false,
    reportId: null,
    targetStatus: null,
    notes: '',
  });

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/api/verification/queue?status=${activeTab}`);
      if (res.data.success) {
        setReports(res.data.reports || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch verification queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [activeTab]);

  const handleStatusUpdate = async (reportId, status, notes = '') => {
    setActionLoading(reportId);
    setSuccessBanner('');
    try {
      const res = await axios.patch(`/api/verification/reports/${reportId}/status`, { status, notes });
      if (res.data.success) {
        setReports((prev) =>
          prev.map((r) =>
            r._id === reportId
              ? {
                  ...r,
                  verificationStatus: status,
                  evidenceConsistencyScore: res.data.report.evidenceConsistencyScore,
                }
              : r
          )
        );
        setSuccessBanner(
          res.data.message ||
            'Pothole marked as INSPECTED and citizen awarded verified civic points!'
        );
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(null);
      setNotesModal({ open: false, reportId: null, targetStatus: null, notes: '' });
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-700 mb-1 font-semibold">
          <HardHat className="w-4 h-4" />
          <span>Field Inspector Console • Citizen Complaints Verification</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Citizen Complaints Verification & Sign-off Queue
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Review citizen-reported road defects (potholes, cracks, rutting, manholes, erosion) on-site. When you approve, the defect is officially marked as <strong>INSPECTED</strong> and the reporting citizen is automatically awarded verified reward points.
        </p>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner('')}
            className="text-xs text-emerald-700 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-emerald-100">
        {['ALL', 'UNVERIFIED', 'NEEDS_INSPECTION', 'LOCATION_MISMATCH', 'CORROBORATED', 'INSPECTOR_VERIFIED', 'REJECTED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Queue Table / Cards */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-emerald-100">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Queue is Clear!</h3>
          <p className="text-xs text-slate-500">No reports currently matching filter "{activeTab}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <div
              key={report._id}
              className="bg-white rounded-2xl p-6 border border-emerald-100 hover:border-emerald-300 transition-all shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              {/* Left Column: Defect Info */}
              <div className="flex items-start gap-4">
                <img
                  src={report.photoUrl}
                  alt={report.damageType}
                  className="w-24 h-24 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=200&auto=format&fit=crop';
                  }}
                />

                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {report.reportId}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      {report.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      {report.verificationStatus}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 capitalize">
                    {report.damageType.replace('_', ' ')}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 max-w-xl">
                    {report.description}
                  </p>

                  <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      {report.rawLocation?.coordinates[1]?.toFixed(4)}, {report.rawLocation?.coordinates[0]?.toFixed(4)}
                    </span>
                    <span>•</span>
                    <span>Reported by: <strong>{report.reporter?.alias || report.reporter?.name || 'Citizen'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Middle Column: Location Audit Signals */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 min-w-[260px]">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Evidence Consistency:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border text-[11px] ${getScoreColor(report.evidenceConsistencyScore)}`}>
                    {report.evidenceConsistencyScore} / 100
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">GPS Pin Delta:</span>
                  <span className="font-mono text-slate-700 font-semibold">
                    {report.evidenceBreakdown?.devicePinDeltaMeters != null
                      ? `${report.evidenceBreakdown.devicePinDeltaMeters}m`
                      : 'No device GPS'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">EXIF Matched:</span>
                  <span className="text-slate-700">
                    {report.exifCoordinates ? 'Yes (within 50m)' : 'No EXIF (Raw Web)'}
                  </span>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                <button
                  onClick={() =>
                    setNotesModal({
                      open: true,
                      reportId: report._id,
                      targetStatus: 'INSPECTOR_VERIFIED',
                      notes: 'On-site field inspection confirmed pothole defect. Approved and marked as INSPECTED.',
                    })
                  }
                  disabled={actionLoading === report._id}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs font-bold flex items-center justify-center gap-1.5 transition-all group"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Approve & Mark Inspected (+Award Points)</span>
                </button>

                <button
                  onClick={() => handleStatusUpdate(report._id, 'REJECTED', 'Marked as rejected / invalid')}
                  disabled={actionLoading === report._id}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>

                <Link
                  to={`/reports/${report.reportId}`}
                  className="text-center text-[11px] text-slate-500 hover:text-emerald-700 pt-1 font-medium"
                >
                  View Details ➔
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspector Notes Modal */}
      {notesModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-emerald-200 shadow-2xl">
            <div className="flex items-center gap-2 mb-2 text-emerald-700">
              <HardHat className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Confirm Pothole Approval & Inspection</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Approving this defect will officially mark it as <strong>INSPECTED</strong> and credit verified reward points (+50 pts) to the reporting citizen.
            </p>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Inspection Certification Notes:
            </label>
            <textarea
              rows={3}
              value={notesModal.notes}
              onChange={(e) => setNotesModal({ ...notesModal, notes: e.target.value })}
              placeholder="e.g. Field inspection confirmed 12cm crater depth on-site. Defect verified."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs outline-none focus:border-emerald-600 mb-4"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setNotesModal({ open: false, reportId: null, targetStatus: null, notes: '' })}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate(notesModal.reportId, notesModal.targetStatus, notesModal.notes)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Confirm & Award Points</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
