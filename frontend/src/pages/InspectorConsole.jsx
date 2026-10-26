import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  HardHat,
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  FileText,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  X,
  Eye,
  Check,
  Award,
  XCircle,
  FileCheck2,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function InspectorConsole() {
  const { user } = useAuth();

  // Main Tab: 'complaints' (Citizen Complaints Queue) vs 'tasks' (Work Order Inspections)
  const [mainTab, setMainTab] = useState('complaints');

  // Repair Tasks State
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [evidencePhoto, setEvidencePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [passedInspection, setPassedInspection] = useState(true);
  const [submittingTask, setSubmittingTask] = useState(false);

  // Citizen Complaints State
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintStatus, setComplaintStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Inspector Approval Modal
  const [notesModal, setNotesModal] = useState({
    open: false,
    reportId: null,
    targetStatus: null,
    notes: '',
  });

  // Global Alerts
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Repair Work Order Tasks
  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      setError('');
      const res = await axios.get('/api/repairs/inspector/tasks');
      if (res.data.success) {
        setTasks(res.data.tasks || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch inspector tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  // Fetch Citizen Complaints
  const fetchComplaints = async () => {
    try {
      setLoadingComplaints(true);
      setError('');
      const res = await axios.get(`/api/verification/queue?status=${complaintStatus}`);
      if (res.data.success) {
        setComplaints(res.data.reports || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch citizen complaints');
    } finally {
      setLoadingComplaints(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchTasks();
  }, [complaintStatus]);

  // Handle Photo Selection for Repair Task Inspection
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEvidencePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const openInspectionModal = (task) => {
    setActiveTask(task);
    setEvidencePhoto(null);
    setPhotoPreview(null);
    setInspectionNotes(
      'Field verification completed on-site. Surface asphalt restoration verified with grade tolerance < 5mm.'
    );
    setPassedInspection(true);
  };

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    if (!activeTask) return;

    try {
      setSubmittingTask(true);
      const formData = new FormData();
      if (evidencePhoto) {
        formData.append('photo', evidencePhoto);
      }
      formData.append('notes', inspectionNotes);
      formData.append('passed', passedInspection);

      const res = await axios.post(`/api/repairs/${activeTask._id}/inspect`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Inspection evidence recorded successfully!');
        setActiveTask(null);
        await fetchTasks();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit inspection evidence');
    } finally {
      setSubmittingTask(false);
    }
  };

  // Handle Citizen Complaint Status Transition (Approve / Reject)
  const handleComplaintStatusUpdate = async (reportId, status, notes = '') => {
    setActionLoadingId(reportId);
    setSuccessMsg('');
    try {
      const res = await axios.patch(`/api/verification/reports/${reportId}/status`, { status, notes });
      if (res.data.success) {
        setComplaints((prev) =>
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
        setSuccessMsg(
          res.data.message ||
            'Complaint marked as INSPECTED and citizen awarded verified civic points!'
        );
        fetchTasks(); // Refresh tasks since linked RoadIssue may be generated
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update complaint status');
    } finally {
      setActionLoadingId(null);
      setNotesModal({ open: false, reportId: null, targetStatus: null, notes: '' });
    }
  };

  // Filter complaints by search query
  const filteredComplaints = complaints.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.reportId?.toLowerCase().includes(q) ||
      c.damageType?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.reporter?.name?.toLowerCase().includes(q) ||
      c.reporter?.alias?.toLowerCase().includes(q) ||
      c.manualAddress?.toLowerCase().includes(q)
    );
  });

  const pendingComplaintsCount = complaints.filter(
    (c) => c.verificationStatus === 'UNVERIFIED' || c.verificationStatus === 'NEEDS_INSPECTION'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-100 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-500/20">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                Field Inspector Dispatch Console
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Certified Sign-off
                </span>
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                On-site verification of citizen complaints, pothole defect certification, and post-repair work order sign-offs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              if (mainTab === 'complaints') fetchComplaints();
              else fetchTasks();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingComplaints || loadingTasks ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Mode Tabs: Citizen Complaints vs Work Orders */}
      <div className="flex items-center gap-3 border-b border-emerald-100 pb-2">
        <button
          onClick={() => setMainTab('complaints')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mainTab === 'complaints'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Citizen Filed Complaints</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
              mainTab === 'complaints' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {pendingComplaintsCount} Pending
          </span>
        </button>

        <button
          onClick={() => setMainTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mainTab === 'tasks'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <HardHat className="w-4 h-4" />
          <span>Municipal Repair Work Orders</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
              mainTab === 'tasks' ? 'bg-amber-800 text-amber-100' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {tasks.length} Assigned
          </span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: CITIZEN FILED COMPLAINTS QUEUE */}
      {/* ========================================================================= */}
      {mainTab === 'complaints' && (
        <div className="space-y-6">
          {/* Controls Bar: Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'UNVERIFIED', 'NEEDS_INSPECTION', 'LOCATION_MISMATCH', 'CORROBORATED', 'INSPECTOR_VERIFIED', 'REJECTED'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setComplaintStatus(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    complaintStatus === tab
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, defect, citizen..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Complaints List / Cards */}
          {loadingComplaints ? (
            <div className="min-h-[30vh] flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-emerald-100 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">Queue is Clear!</h3>
              <p className="text-xs text-slate-500">
                No citizen complaints currently matching filter "{complaintStatus}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredComplaints.map((report) => (
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
                        e.target.src =
                          'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=200&auto=format&fit=crop';
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
                        {report.damageType?.replace('_', ' ')}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 max-w-xl">
                        {report.description}
                      </p>

                      <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          {report.rawLocation?.coordinates[1]?.toFixed(4)}°, {report.rawLocation?.coordinates[0]?.toFixed(4)}°
                        </span>
                        <span>•</span>
                        <span>
                          Reported by: <strong>{report.reporter?.alias || report.reporter?.name || 'Citizen'}</strong>
                        </span>
                        <span>•</span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Location Audit Signals */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 min-w-[260px]">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <span className="text-slate-500">Evidence Consistency:</span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded border text-[11px] ${
                          report.evidenceConsistencyScore >= 75
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : report.evidenceConsistencyScore >= 40
                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                            : 'text-rose-700 bg-rose-50 border-rose-200'
                        }`}
                      >
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
                          notes: 'On-site field inspection confirmed road defect. Approved and marked as INSPECTED.',
                        })
                      }
                      disabled={actionLoadingId === report._id}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs font-bold flex items-center justify-center gap-1.5 transition-all group disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Approve & Verify (+Award Points)</span>
                    </button>

                    <button
                      onClick={() => handleComplaintStatusUpdate(report._id, 'REJECTED', 'Marked as rejected / invalid')}
                      disabled={actionLoadingId === report._id}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <Link
                      to={`/reports/${report.reportId}`}
                      className="text-center text-[11px] text-slate-500 hover:text-emerald-700 pt-1 font-semibold"
                    >
                      View Details ➔
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: MUNICIPAL WORK ORDER REPAIR TASKS */}
      {/* ========================================================================= */}
      {mainTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Assigned Municipal Repair Inspections</span>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                {tasks.length} Active Tasks
              </span>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-emerald-100 bg-white text-slate-500 space-y-2 shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-800">All Inspection Tasks Clear!</div>
              <p className="text-xs text-slate-500">
                No active road repairs currently require on-site field verification in your zone.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tasks.map((task) => {
                const isInspected = task.status === 'INSPECTED';
                const isInProgress = task.status === 'IN_PROGRESS';

                return (
                  <div
                    key={task._id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between bg-white shadow-sm ${
                      isInspected ? 'border-emerald-300' : 'border-slate-200 hover:border-amber-400'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {task.issueCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isInspected
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isInProgress
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{task.title}</h3>

                      {/* Meta Info */}
                      <div className="space-y-1.5 text-xs text-slate-500 pt-1 border-t border-slate-100">
                        <div className="flex justify-between">
                          <span>Road Class:</span>
                          <strong className="text-slate-800 capitalize">{task.roadClass}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Priority Score:</span>
                          <strong className="text-amber-700 font-mono">
                            {task.priorityScore} ({task.priorityLevel})
                          </strong>
                        </div>
                        {task.workOrderNumber && (
                          <div className="flex justify-between">
                            <span>Work Order:</span>
                            <span className="font-mono text-indigo-700 font-semibold">{task.workOrderNumber}</span>
                          </div>
                        )}
                        {task.assignedTeam && (
                          <div className="flex justify-between">
                            <span>Repair Crew:</span>
                            <span className="text-slate-700">{task.assignedTeam}</span>
                          </div>
                        )}
                        {task.estimatedCompletionDate && (
                          <div className="flex justify-between">
                            <span>Target Date:</span>
                            <span>{new Date(task.estimatedCompletionDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Completion Evidence if already uploaded */}
                      {task.completionEvidence && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                          <div className="font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Inspection Evidence On Record
                          </div>
                          <p className="text-[11px] text-slate-600 italic line-clamp-2">
                            "{task.completionEvidence.notes}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {task.location?.coordinates
                          ? `${task.location.coordinates[1].toFixed(4)}°, ${task.location.coordinates[0].toFixed(4)}°`
                          : 'Coordinates Verified'}
                      </span>

                      {!isInspected ? (
                        <button
                          onClick={() => openInspectionModal(task)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-semibold text-xs shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Inspect & Sign-off</span>
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Awaiting Admin Close
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Inspector Notes / Citizen Complaint Approval */}
      {notesModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-emerald-200 shadow-2xl">
            <div className="flex items-center gap-2 mb-2 text-emerald-700">
              <HardHat className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Confirm Defect Approval & Inspection</h3>
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
              placeholder="e.g. Field inspection confirmed road defect on-site. Approved."
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
                onClick={() => handleComplaintStatusUpdate(notesModal.reportId, notesModal.targetStatus, notesModal.notes)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Confirm & Award Points</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Submit Repair Work Order Completion Evidence */}
      {activeTask && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-600" />
                Record On-Site Completion Evidence
              </h3>
              <button onClick={() => setActiveTask(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInspectionSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Defect Work Order</label>
                <div className="text-sm font-semibold text-slate-900">{activeTask.title}</div>
                <div className="text-xs font-mono text-emerald-700">
                  {activeTask.workOrderNumber || activeTask.issueCode}
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="text-xs text-slate-700 block mb-1.5 font-medium">
                  Upload Post-Repair Photo Evidence
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-4 text-center cursor-pointer transition-colors relative bg-slate-50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {photoPreview ? (
                    <div className="space-y-2">
                      <img
                        src={photoPreview}
                        alt="Evidence preview"
                        className="w-full h-36 object-cover rounded-lg border border-slate-200 mx-auto"
                      />
                      <span className="text-[11px] text-amber-700 block font-semibold">Click to change photo</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <div className="text-xs text-slate-700 font-medium">
                        Click or drag on-site inspection photo here
                      </div>
                      <div className="text-[10px] text-slate-500">Supports JPEG, PNG, WebP up to 5MB</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Inspection Notes */}
              <div>
                <label className="text-xs text-slate-700 block mb-1 font-medium">
                  Field Inspector Technical Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                  placeholder="Record compaction density, asphalt grade, seal integrity, and pavement smoothness..."
                />
              </div>

              {/* Compliance Signoff Checkbox */}
              <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={passedInspection}
                  onChange={(e) => setPassedInspection(e.target.checked)}
                  className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                />
                <span>
                  I certify that I have conducted on-site physical verification and the road surface conforms to municipal safety standards.
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTask(null)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-md disabled:opacity-50"
                >
                  {submittingTask ? 'Submitting...' : 'Sign-off as INSPECTED'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
