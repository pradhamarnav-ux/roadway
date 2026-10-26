import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Car,
  AlertTriangle,
  ShieldCheck,
  Filter,
  CheckCircle2,
  FileText,
  MapPin,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
  Lock,
  Camera,
  ExternalLink,
  X,
  AlertOctagon,
} from 'lucide-react';

const ATTRIBUTION_TIERS = [
  { id: 'NEARBY_ACCIDENT', label: 'Nearby Accident', desc: 'Within 50m of defect; no causation established', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { id: 'SUSPECTED_CONTRIBUTION', label: 'Suspected Contribution', desc: 'Anecdotal or preliminary claim of swerving/braking', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'DOCUMENTED_CONTRIBUTION', label: 'Documented Contribution', desc: 'Official police / paramedic FIR references defect', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { id: 'CONFIRMED_CONTRIBUTION', label: 'Confirmed Contribution', desc: 'Forensic municipal engineering sign-off', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
];

const VERIFICATION_STATUSES = [
  { id: 'UNVERIFIED', label: 'Unverified', color: 'bg-slate-800 text-slate-300 border-slate-700' },
  { id: 'UNDER_REVIEW', label: 'Under Review', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'VERIFIED', label: 'Verified', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'REJECTED', label: 'Rejected / Disproven', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
];

export default function AccidentReview() {
  const [accidents, setAccidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [savingId, setSavingId] = useState(null);

  // Edit states per accident
  const [selectedTiers, setSelectedTiers] = useState({});
  const [selectedStatuses, setSelectedStatuses] = useState({});
  const [reviewNotes, setReviewNotes] = useState({});

  // Image preview modal
  const [previewImage, setPreviewImage] = useState(null);

  const fetchAccidents = async () => {
    try {
      setLoading(true);
      let queryParams = [];
      if (activeTab !== 'ALL') queryParams.push(`attributionTier=${activeTab}`);
      if (statusFilter !== 'ALL') queryParams.push(`verificationStatus=${statusFilter}`);

      const url = queryParams.length > 0 ? `/api/accidents?${queryParams.join('&')}` : '/api/accidents';
      const res = await axios.get(url);
      if (res.data.success) {
        setAccidents(res.data.accidents);
        const tiers = {};
        const statuses = {};
        res.data.accidents.forEach((a) => {
          tiers[a._id] = a.attributionTier;
          statuses[a._id] = a.verificationStatus || 'UNVERIFIED';
        });
        setSelectedTiers(tiers);
        setSelectedStatuses(statuses);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load accidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccidents();
  }, [activeTab, statusFilter]);

  const handleUpdateAccident = async (accidentId) => {
    setSavingId(accidentId);
    try {
      const tier = selectedTiers[accidentId];
      const status = selectedStatuses[accidentId];
      const note = reviewNotes[accidentId];

      const res = await axios.patch(`/api/accidents/${accidentId}/attribution`, {
        attributionTier: tier,
        verificationStatus: status,
        evidenceNotes: note || `Municipal review calibrated attribution to ${tier} (${status})`,
      });

      if (res.data.success) {
        // Update local list
        setAccidents((prev) =>
          prev.map((a) => {
            if (a._id === accidentId) {
              return {
                ...a,
                attributionTier: tier,
                verificationStatus: status,
                roadIssue: a.roadIssue
                  ? {
                      ...a.roadIssue,
                      accidentCounts: res.data.issueAccidentCounts || a.roadIssue.accidentCounts,
                      safetyOverride:
                        tier === 'CONFIRMED_CONTRIBUTION' ? true : a.roadIssue.safetyOverride,
                    }
                  : a.roadIssue,
              };
            }
            return a;
          })
        );
        // Clear note
        setReviewNotes((prev) => ({ ...prev, [accidentId]: '' }));
        alert(res.data.message);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update attribution');
    } finally {
      setSavingId(null);
    }
  };

  // Metrics summary
  const nearbyTotal = accidents.filter((a) => a.attributionTier === 'NEARBY_ACCIDENT').length;
  const suspectedTotal = accidents.filter((a) => a.attributionTier === 'SUSPECTED_CONTRIBUTION').length;
  const documentedTotal = accidents.filter((a) => a.attributionTier === 'DOCUMENTED_CONTRIBUTION').length;
  const confirmedTotal = accidents.filter((a) => a.attributionTier === 'CONFIRMED_CONTRIBUTION').length;
  const injuriesTotal = accidents
    .filter((a) => a.attributionTier !== 'NEARBY_ACCIDENT' && a.verificationStatus !== 'REJECTED')
    .reduce((sum, a) => sum + (a.injuriesCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-rose-400 mb-1">
          <Car className="w-4 h-4" />
          <span>Accident Evidence Review Console • Phase 4 (Spec Section 7)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Vehicular Accident Evidence Review</h1>
        <p className="text-sm text-slate-400 mt-1">
          Review collision incident evidence, cross-examine police reports, and calibrate the 4 ethical attribution tiers.
        </p>
      </div>

      {/* Ethical Safety Rule Card */}
      <div className="mb-6 p-4 rounded-2xl bg-brand-950/30 border border-brand-500/20 text-xs text-brand-300 flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-brand-400" />
        <div className="space-y-1">
          <strong className="block text-brand-200">Ethical Attribution Guarantee:</strong>
          <span>
            Nearby accidents ({nearbyTotal}) are <strong>never counted as pothole-caused</strong>. Cumulative injuries ({injuriesTotal}) strictly exclude
            nearby collisions. A confirmed attribution triggers an automatic <em>SAFETY_OVERRIDE_URGENT</em> on the linked road defect.
          </span>
        </div>
      </div>

      {/* 5 Distinct Counts Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <div className="glass-card p-4 rounded-2xl border border-blue-500/20 bg-blue-950/10">
          <span className="text-[11px] text-blue-300 block font-medium">1. Nearby (No Causation)</span>
          <span className="text-2xl font-bold text-blue-400 font-mono mt-1 block">{nearbyTotal}</span>
          <span className="text-[10px] text-blue-400/70 mt-1 block">Co-located only</span>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-amber-950/10">
          <span className="text-[11px] text-amber-300 block font-medium">2. Suspected Link</span>
          <span className="text-2xl font-bold text-amber-400 font-mono mt-1 block">{suspectedTotal}</span>
          <span className="text-[10px] text-amber-400/70 mt-1 block">Swerving / braking</span>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-orange-500/20 bg-orange-950/10">
          <span className="text-[11px] text-orange-300 block font-medium">3. Documented (FIR)</span>
          <span className="text-2xl font-bold text-orange-400 font-mono mt-1 block">{documentedTotal}</span>
          <span className="text-[10px] text-orange-400/70 mt-1 block">Police / Paramedic</span>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-rose-500/20 bg-rose-950/10">
          <span className="text-[11px] text-rose-300 block font-medium">4. Confirmed Cause</span>
          <span className="text-2xl font-bold text-rose-400 font-mono mt-1 block">{confirmedTotal}</span>
          <span className="text-[10px] text-rose-400/70 mt-1 block">Forensic Certified</span>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-purple-500/20 bg-purple-950/10">
          <span className="text-[11px] text-purple-300 block font-medium">5. Cumulative Injuries</span>
          <span className="text-2xl font-bold text-purple-400 font-mono mt-1 block">{injuriesTotal}</span>
          <span className="text-[10px] text-purple-400/70 mt-1 block">Attributed persons</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'NEARBY_ACCIDENT', 'SUSPECTED_CONTRIBUTION', 'DOCUMENTED_CONTRIBUTION', 'CONFIRMED_CONTRIBUTION'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Verification:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1 border border-slate-700 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : accidents.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Accidents in This Queue</h3>
          <p className="text-xs text-slate-400">All collision reports matching current filters have been calibrated.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {accidents.map((acc) => {
            const counts = acc.roadIssue?.accidentCounts || {
              nearbyCount: 0,
              suspectedCount: 0,
              documentedCount: 0,
              confirmedCount: 0,
              totalInjuries: 0,
            };
            const isCriticalOverride = acc.attributionTier === 'CONFIRMED_CONTRIBUTION' || acc.roadIssue?.safetyOverride;

            return (
              <div
                key={acc._id}
                className={`glass-panel rounded-2xl p-6 border transition-all shadow-xl ${
                  isCriticalOverride ? 'border-rose-500/50 bg-rose-950/5' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Strip */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-md border border-rose-500/20">
                        {acc.accidentId}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {new Date(acc.occurredAt).toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        Vehicles: {acc.vehiclesInvolved}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase ${
                          acc.injurySeverity === 'fatal'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : acc.injurySeverity === 'serious'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : acc.injurySeverity === 'minor'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Injuries: {acc.injuriesCount} ({acc.injurySeverity})
                      </span>

                      {/* Verification Status Pill */}
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase border ${
                          acc.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : acc.verificationStatus === 'UNDER_REVIEW'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : acc.verificationStatus === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        Status: {acc.verificationStatus || 'UNVERIFIED'}
                      </span>

                      {isCriticalOverride && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase bg-rose-600 text-white animate-pulse flex items-center gap-1">
                          <AlertOctagon className="w-3 h-3" />
                          Safety Override Urgent
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-300 flex items-center gap-2 mt-1">
                      <span className="text-slate-400">Reporter:</span>
                      <span className="text-slate-200 font-medium">
                        {acc.reportedBy?.alias || acc.reportedBy?.name || 'Citizen (Verified User)'}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">GPS:</span>
                      <span className="font-mono text-slate-300">
                        {acc.location?.coordinates[1]?.toFixed(4)}, {acc.location?.coordinates[0]?.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* Attribution Tier Calibration Dropdown & Save */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-slate-900/90 p-3 rounded-2xl border border-slate-700/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase mb-0.5">
                        Attribution Tier
                      </span>
                      <select
                        value={selectedTiers[acc._id] || acc.attributionTier}
                        onChange={(e) =>
                          setSelectedTiers({ ...selectedTiers, [acc._id]: e.target.value })
                        }
                        className="bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 border border-slate-600 outline-none"
                      >
                        {ATTRIBUTION_TIERS.map((tier) => (
                          <option key={tier.id} value={tier.id}>
                            {tier.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase mb-0.5">
                        Verification Status
                      </span>
                      <select
                        value={selectedStatuses[acc._id] || acc.verificationStatus || 'UNVERIFIED'}
                        onChange={(e) =>
                          setSelectedStatuses({ ...selectedStatuses, [acc._id]: e.target.value })
                        }
                        className="bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 border border-slate-600 outline-none"
                      >
                        {VERIFICATION_STATUSES.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => handleUpdateAccident(acc._id)}
                      disabled={
                        savingId === acc._id ||
                        (selectedTiers[acc._id] === acc.attributionTier &&
                          selectedStatuses[acc._id] === (acc.verificationStatus || 'UNVERIFIED') &&
                          !reviewNotes[acc._id])
                      }
                      className="mt-3 sm:mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-40 shadow-md shadow-rose-600/20"
                    >
                      {savingId === acc._id ? 'Saving...' : 'Save Review'}
                    </button>
                  </div>
                </div>

                {/* 5 Separate Counts Per Issue Box */}
                {acc.roadIssue && (
                  <div className="mb-4 p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Linked Road Defect:</span>
                        <strong className="text-brand-400 font-mono text-xs">
                          {acc.roadIssue.issueCode || 'Direct Defect'}
                        </strong>
                        <span className="text-xs text-slate-200">
                          ({acc.roadIssue.title || 'Reported Road Defect'})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Defect Status: <strong className="text-slate-200">{acc.roadIssue.status}</strong>
                      </span>
                    </div>

                    {/* 5 Distinct Counts Display */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1.5">
                        Defect Accident Impact (Five Separate Counts per Spec Section 7):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-400 block font-sans">Nearby</span>
                          <span className="text-blue-400 font-bold">{counts.nearbyCount}</span>
                        </div>
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-400 block font-sans">Suspected</span>
                          <span className="text-amber-400 font-bold">{counts.suspectedCount}</span>
                        </div>
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-400 block font-sans">Documented</span>
                          <span className="text-orange-400 font-bold">{counts.documentedCount}</span>
                        </div>
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-400 block font-sans">Confirmed</span>
                          <span className="text-rose-400 font-bold">{counts.confirmedCount}</span>
                        </div>
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-center">
                          <span className="text-[10px] text-slate-400 block font-sans">Total Injuries</span>
                          <span className="text-purple-400 font-bold">{counts.totalInjuries}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evidence Storage & Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mb-3">
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block font-semibold mb-1">Police / FIR Reference:</span>
                    <span className="font-mono text-slate-200">
                      {acc.policeReportRef || 'No formal police report submitted yet'}
                    </span>
                  </div>

                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 md:col-span-2">
                    <span className="text-slate-400 block font-semibold mb-1">Witness & Defect Context Notes:</span>
                    <p className="text-slate-300 whitespace-pre-wrap">{acc.evidenceNotes || 'None provided'}</p>
                  </div>
                </div>

                {/* Photo Evidence Thumbnail if available */}
                {(acc.photoUrl || (acc.evidenceFiles && acc.evidenceFiles.length > 0)) && (
                  <div className="mb-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Camera className="w-4 h-4 text-brand-400" />
                      <span>Stored Photo Evidence:</span>
                    </div>
                    <img
                      src={acc.photoUrl || acc.evidenceFiles[0]?.url}
                      alt="Accident Evidence"
                      onClick={() => setPreviewImage(acc.photoUrl || acc.evidenceFiles[0]?.url)}
                      className="w-16 h-12 object-cover rounded-lg border border-slate-700 cursor-pointer hover:opacity-80 transition-opacity"
                    />
                    <span className="text-[11px] text-slate-500 font-mono">Click thumbnail to view full image</span>
                  </div>
                )}

                {/* Admin Note Input */}
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Add engineering audit note (e.g. 'Investigated on-site; tire skid marks match road rutting depth')..."
                    value={reviewNotes[acc._id] || ''}
                    onChange={(e) => setReviewNotes({ ...reviewNotes, [acc._id]: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for full evidence image preview */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl p-4 border border-slate-700">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-white mb-3">Collision Scene Evidence File</h3>
            <img src={previewImage} alt="Accident Evidence Full" className="w-full max-h-[70vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
