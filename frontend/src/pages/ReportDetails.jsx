import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LocationPickerMap from '../components/LocationPickerMap';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  HardHat,
  CheckCircle2,
  XCircle,
  Award,
} from 'lucide-react';

export default function ReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await axios.get(`/api/reports/${id}`);
        if (res.data.success) {
          setReport(res.data.report);
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch report details');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 glass-panel rounded-2xl text-center border border-rose-500/30">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Report Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'The requested ticket does not exist.'}</p>
        <button
          onClick={() => navigate('/my-reports')}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl"
        >
          Return to My Reports
        </button>
      </div>
    );
  }

  const lat = report.rawLocation?.coordinates[1];
  const lng = report.rawLocation?.coordinates[0];

  const handleStatusUpdate = async (status) => {
    setActionLoading(true);
    setBannerMsg('');
    try {
      const res = await axios.patch(`/api/verification/reports/${report._id}/status`, {
        status,
        notes: `Inspection action taken from defect details console by ${user.name} (${user.role}).`,
      });
      if (res.data.success) {
        setReport(res.data.report);
        setBannerMsg(res.data.message || `Status successfully updated to ${status}`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update report status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {user && (user.role === 'inspector' || user.role === 'admin') && (
          <Link
            to="/admin/verification"
            className="text-xs font-bold text-emerald-400 hover:underline"
          >
            ← Full Complaints Verification Queue
          </Link>
        )}
      </div>

      {bannerMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{bannerMsg}</span>
        </div>
      )}

      {/* Inspector Quick Action Panel if Inspector / Admin */}
      {user && (user.role === 'inspector' || user.role === 'admin') && (
        <div className="mb-6 p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Field Inspector Certification & Review
              </h3>
              <p className="text-xs text-slate-600">
                Current status: <strong className="font-mono text-emerald-700">{report.verificationStatus}</strong>. Verify defect to certify as INSPECTED and award citizen reward points.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {report.verificationStatus !== 'INSPECTOR_VERIFIED' ? (
              <button
                onClick={() => handleStatusUpdate('INSPECTOR_VERIFIED')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Verify (+50 pts)</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Certified by Inspector
              </span>
            )}

            {report.verificationStatus !== 'REJECTED' && (
              <button
                onClick={() => handleStatusUpdate('REJECTED')}
                disabled={actionLoading}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-md border border-brand-500/20">
                {report.reportId}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Status: {report.verificationStatus}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white capitalize">
              {report.damageType.replace('_', ' ')}
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(report.createdAt).toLocaleString()}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Reported by: {report.reporter?.alias || report.reporter?.name || 'Citizen'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700/80 self-start sm:self-auto">
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Evidence Consistency
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {report.evidenceConsistencyScore} / 100
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Photo & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo Evidence */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
              Photo Evidence
            </h2>
            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
              <img
                src={report.photoUrl}
                alt={report.damageType}
                className="w-full max-h-96 object-contain mx-auto"
              />
            </div>
          </div>

          {/* Citizen Description */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
              Citizen Defect Notes
            </h2>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
              {report.description}
            </p>
            {report.manualAddress && (
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
                <strong>Reported Address/Landmark:</strong> {report.manualAddress}
              </div>
            )}
          </div>

          {/* Location Verification Audit Breakdown */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-brand-400" />
              <span>Location Verification Signals</span>
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Device GPS vs Pin Discrepancy:</span>
                <span className="font-mono font-semibold text-slate-200">
                  {report.evidenceBreakdown?.devicePinDeltaMeters != null
                    ? `${report.evidenceBreakdown.devicePinDeltaMeters} meters`
                    : 'Not provided'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Photo EXIF Coordinates Match:</span>
                <span className="font-semibold text-slate-200">
                  {report.exifCoordinates
                    ? `Matched within ${report.evidenceBreakdown?.exifPinDeltaMeters || 0}m`
                    : 'EXIF metadata absent (No penalty)'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Corroborating Reports in 30m:</span>
                <span className="font-mono font-semibold text-slate-200">
                  {report.evidenceBreakdown?.independentReportsNearby || 0}
                </span>
              </div>
            </div>

            {report.evidenceBreakdown?.notes && report.evidenceBreakdown.notes.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400">
                <strong>Algorithmic Evidence Notes:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {report.evidenceBreakdown.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Map & Repair Status */}
        <div className="space-y-6">
          {/* Defect Location Map */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-400" />
              <span>Reported Coordinates</span>
            </h2>
            <div className="h-64 rounded-xl overflow-hidden mb-3">
              <LocationPickerMap
                latitude={lat}
                longitude={lng}
                onLocationChange={() => {}}
                isDraggable={false}
                height="100%"
              />
            </div>
            <div className="text-xs font-mono text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-center">
              {lat?.toFixed(6)}, {lng?.toFixed(6)}
            </div>
          </div>

          {/* Linked Road Defect & Accident Impact (Phase 4) */}
          {report.roadIssue && (
            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400 block font-semibold">
                    Linked Ground-Truth Defect
                  </span>
                  <strong className="text-sm text-white font-mono">{report.roadIssue.issueCode}</strong>
                </div>
                {report.roadIssue.safetyOverride && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-600 text-white animate-pulse">
                    Safety Override Active
                  </span>
                )}
              </div>

              <span className="text-[11px] text-slate-400 block mb-2">
                Accident Impact (Five Separate Counts per Spec Section 7):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs text-center mb-3">
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Nearby</span>
                  <span className="text-blue-400 font-bold">{report.roadIssue.accidentCounts?.nearbyCount || 0}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Suspected</span>
                  <span className="text-amber-400 font-bold">{report.roadIssue.accidentCounts?.suspectedCount || 0}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Documented</span>
                  <span className="text-orange-400 font-bold">{report.roadIssue.accidentCounts?.documentedCount || 0}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Confirmed</span>
                  <span className="text-rose-400 font-bold">{report.roadIssue.accidentCounts?.confirmedCount || 0}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Total Injuries</span>
                  <span className="text-purple-400 font-bold">{report.roadIssue.accidentCounts?.totalInjuries || 0}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                * Note: Nearby accidents are co-located in space/time but are never counted as caused by this defect.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
