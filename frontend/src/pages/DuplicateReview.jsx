import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Copy,
  GitMerge,
  Split,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function DuplicateReview() {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(30);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDuplicates = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/verification/duplicates?radiusMeters=${radiusMeters}`);
      if (res.data.success) {
        setDuplicates(res.data.duplicates);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch duplicate pairs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, [radiusMeters]);

  const handleResolve = async (pairId, reportAId, reportBId, action) => {
    setActionLoading(pairId);
    try {
      const res = await axios.post('/api/verification/duplicates/resolve', {
        action,
        reportIds: [reportAId, reportBId],
        primaryReportId: reportAId,
      });

      if (res.data.success) {
        setDuplicates((prev) => prev.filter((p) => p.pairId !== pairId));
        alert(res.data.message);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve duplicate complaints');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-brand-400 mb-1">
            <Copy className="w-4 h-4" />
            <span>Spatial Deduplication • 30m Buffer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Duplicate Complaint Triage</h1>
          <p className="text-sm text-slate-400 mt-1">
            Consolidate multiple citizen reports of the same defect into a single ground-truth municipal RoadIssue.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-800 self-start sm:self-auto">
          <span className="text-xs text-slate-400 font-medium pl-2">Search Radius:</span>
          <select
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(Number(e.target.value))}
            className="bg-slate-800 text-white text-xs font-mono rounded-lg px-2.5 py-1.5 border border-slate-700 outline-none"
          >
            <option value={15}>15 meters</option>
            <option value={30}>30 meters (Default)</option>
            <option value={50}>50 meters</option>
            <option value={100}>100 meters</option>
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
      ) : duplicates.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Unresolved Duplicates Found</h3>
          <p className="text-xs text-slate-400">
            All complaints inside the {radiusMeters}m spatial radius have been triaged or are distinct defects.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {duplicates.map((pair) => (
            <div
              key={pair.pairId}
              className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden"
            >
              {/* Top Banner: Score & Distance */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-mono font-bold text-sm">
                    {pair.confidence}%
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        Duplicate Confidence Score: {pair.confidence}%
                      </span>
                      {pair.autoLink ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Auto-Link Recommended
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Needs Admin Review
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      Spatial separation: <strong>{pair.distanceMeters.toFixed(1)} meters</strong> apart
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResolve(pair.pairId, pair.reportA._id, pair.reportB._id, 'DISMISS')}
                    disabled={actionLoading === pair.pairId}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Split className="w-3.5 h-3.5" />
                    <span>Keep Distinct</span>
                  </button>

                  <button
                    onClick={() => handleResolve(pair.pairId, pair.reportA._id, pair.reportB._id, 'MERGE')}
                    disabled={actionLoading === pair.pairId}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-brand-600/20 flex items-center gap-1.5 transition-all"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Merge into 1 Defect Issue</span>
                  </button>
                </div>
              </div>

              {/* Side-by-side Reports Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                {/* Report A */}
                <div className="glass-card rounded-2xl p-4 border border-slate-800/80">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-brand-400">
                      Report A: {pair.reportA.reportId}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(pair.reportA.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-3 mb-3">
                    <img
                      src={pair.reportA.photoUrl}
                      alt="Report A"
                      className="w-20 h-20 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-900"
                    />
                    <div>
                      <span className="text-xs font-bold text-white capitalize block">
                        {pair.reportA.damageType.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-3">
                        {pair.reportA.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-brand-400" />
                    <span>
                      {pair.reportA.rawLocation?.coordinates[1]?.toFixed(4)},{' '}
                      {pair.reportA.rawLocation?.coordinates[0]?.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Report B */}
                <div className="glass-card rounded-2xl p-4 border border-slate-800/80">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      Report B: {pair.reportB.reportId}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(pair.reportB.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-3 mb-3">
                    <img
                      src={pair.reportB.photoUrl}
                      alt="Report B"
                      className="w-20 h-20 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-900"
                    />
                    <div>
                      <span className="text-xs font-bold text-white capitalize block">
                        {pair.reportB.damageType.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-3">
                        {pair.reportB.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    <span>
                      {pair.reportB.rawLocation?.coordinates[1]?.toFixed(4)},{' '}
                      {pair.reportB.rawLocation?.coordinates[0]?.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Explanatory Reasons */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                <span className="font-semibold text-slate-300 block mb-1">
                  Algorithmic Deduplication Signals:
                </span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {pair.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
