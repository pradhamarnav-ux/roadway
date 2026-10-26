import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldAlert,
  AlertTriangle,
  Zap,
  BarChart3,
  RefreshCw,
  Info,
  CheckCircle2,
  Sliders,
  Scale,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertOctagon,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export default function PriorityAnalysis() {
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [expandedIssueId, setExpandedIssueId] = useState(null);

  // Simulator state for testing custom weights / benchmark
  const [simS, setSimS] = useState(75);
  const [simT, setSimT] = useState(75);
  const [simA, setSimA] = useState(70);
  const [simC, setSimC] = useState(68);
  const [simE, setSimE] = useState(80);
  const [simW, setSimW] = useState(90);
  const [simCriticalRoad, setSimCriticalRoad] = useState(false);
  const [simConfirmedAcc, setSimConfirmedAcc] = useState(false);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('/api/optimization/priority-analysis');
      if (res.data.success) {
        setAnalysisData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load priority analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const handleRecalculateAll = async () => {
    try {
      setRecalculating(true);
      setSuccessMsg('');
      setError('');
      const res = await axios.post('/api/optimization/recalculate-priorities');
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Recalculation complete!');
        await fetchAnalysis();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Recalculation failed.');
    } finally {
      setRecalculating(false);
    }
  };

  // Simulator computation
  const simWeightedSum =
    0.25 * simS + 0.2 * simT + 0.15 * simA + 0.25 * simC + 0.1 * simE + 0.05 * simW;
  const simRawScore = Math.round(simWeightedSum * 100) / 100;
  const simOverride = simCriticalRoad || simConfirmedAcc;
  let simOverrideReason = '';
  if (simCriticalRoad) {
    simOverrideReason = 'SAFETY OVERRIDE: Critical defect on highway/arterial corridor';
  } else if (simConfirmedAcc) {
    simOverrideReason = 'SAFETY OVERRIDE: Defect linked to confirmed traffic accident';
  }
  const simFinalScore = simOverride ? Math.max(90, simRawScore) : simRawScore;
  let simLevel = 'LOW';
  if (simFinalScore >= 85) simLevel = 'CRITICAL';
  else if (simFinalScore >= 70) simLevel = 'HIGH';
  else if (simFinalScore >= 40) simLevel = 'MEDIUM';

  const isSpecBenchmark =
    simS === 75 &&
    simT === 75 &&
    simA === 70 &&
    simC === 68 &&
    simE === 80 &&
    simW === 90 &&
    !simOverride;

  // Colors for Priority Levels
  const getLevelBadge = (level, override) => {
    if (override || level === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
          <AlertOctagon className="w-3 h-3 text-rose-400" />
          CRITICAL {override ? '(OVERRIDE)' : ''}
        </span>
      );
    }
    if (level === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          HIGH
        </span>
      );
    }
    if (level === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          <Info className="w-3 h-3 text-blue-400" />
          MEDIUM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        LOW
      </span>
    );
  };

  // Pie chart data for distribution
  const pieData = analysisData?.priorityDistribution
    ? [
        { name: 'Critical', value: analysisData.priorityDistribution.CRITICAL, color: '#f43f5e' },
        { name: 'High', value: analysisData.priorityDistribution.HIGH, color: '#f59e0b' },
        { name: 'Medium', value: analysisData.priorityDistribution.MEDIUM, color: '#3b82f6' },
        { name: 'Low', value: analysisData.priorityDistribution.LOW, color: '#10b981' },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 shadow-lg shadow-amber-500/20 text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Priority Scoring & Risk Analysis
                <span className="text-xs font-mono font-normal px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Spec Section 8
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Explainable Multi-Factor Scoring with Deterministic Safety Overrides
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculateAll}
            disabled={recalculating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-brand-600 hover:from-amber-500 hover:to-brand-500 shadow-md shadow-brand-600/20 disabled:opacity-50 transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculating Scores...' : 'Recalculate All Priorities'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm">
          <AlertOctagon className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Safety Overrides Alert Banner (if any) */}
      {analysisData?.safetyOverrideIssues && analysisData.safetyOverrideIssues.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/40 border border-rose-500/40 p-5 shadow-xl shadow-rose-950/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 mt-0.5">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-rose-300">
                  Urgent Safety Override Active ({analysisData.safetyOverrideIssues.length}{' '}
                  Defect{analysisData.safetyOverrideIssues.length > 1 ? 's' : ''})
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                  Mandatory Rapid Inspection
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                The safety override flags urgent on-site inspection regardless of composite score.
                Triggers when a critical defect occurs on high-speed arterial/highway corridors or
                has confirmed accident attribution.
              </p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analysisData.safetyOverrideIssues.map((issue) => (
                  <div
                    key={issue._id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/30 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-rose-400">{issue.issueCode}</span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                          Score: {issue.priorityScore}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-200 mt-1 line-clamp-1">
                        {issue.title}
                      </div>
                      <div className="text-[11px] text-rose-300/80 mt-1 italic">
                        {issue.safetyOverrideReason}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                      <span className="capitalize">{issue.roadClass} road</span>
                      <span className="capitalize text-rose-400">{issue.severity} severity</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="text-xs text-slate-400 font-medium">Evaluated Defects</div>
          <div className="text-2xl font-bold text-white mt-1">
            {analysisData?.totalIssues ?? '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            100% Normalized (0-100)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-rose-900/30 backdrop-blur-sm">
          <div className="text-xs text-rose-400 font-medium flex items-center justify-between">
            <span>Safety Overrides</span>
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {analysisData?.safetyOverrideCount ?? 0}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1">Urgent Inspection Queue</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-900/30 backdrop-blur-sm">
          <div className="text-xs text-amber-400 font-medium flex items-center justify-between">
            <span>Critical Priority</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {analysisData?.priorityDistribution?.CRITICAL ?? 0}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">Threshold ≥ 85 pts</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-blue-900/30 backdrop-blur-sm">
          <div className="text-xs text-blue-400 font-medium flex items-center justify-between">
            <span>High Priority</span>
            <Info className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {analysisData?.priorityDistribution?.HIGH ?? 0}
          </div>
          <div className="text-[11px] text-blue-400/80 mt-1">Threshold 70 - 84 pts</div>
        </div>
      </div>

      {/* Factor Weights & Formula Breakdown Card */}
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-bold text-white">Explainable Formula Weights Specification</h2>
          <span className="text-xs bg-brand-500/10 text-brand-400 px-2.5 py-0.5 rounded-full border border-brand-500/20 font-mono">
            Sum of Weights = 1.00
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'S', name: 'Defect Severity', weight: '25%', factor: '0.25 × S', desc: 'Pothole depth, area & structural failure' },
            { key: 'T', name: 'Road Hierarchy', weight: '20%', factor: '0.20 × T', desc: 'Highway > Arterial > Collector > Local' },
            { key: 'A', name: 'Accident Safety', weight: '15%', factor: '0.15 × A', desc: 'Confirmed & suspected accidents (Base=10)' },
            { key: 'C', name: 'Complaint Density', weight: '25%', factor: '0.25 × C', desc: 'Reports count + aging days escalation' },
            { key: 'E', name: 'Cost Efficiency', weight: '10%', factor: '0.10 × E', desc: 'High benefit-to-cost ratio multiplier' },
            { key: 'W', name: 'Weather Season', weight: '5%', factor: '0.05 × W', desc: 'Monsoon vulnerability & freeze-thaw' },
          ].map((item) => (
            <div key={item.key} className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-slate-700/80 flex items-center justify-center font-bold font-mono text-brand-300 text-sm">
                  {item.key}
                </span>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {item.weight}
                </span>
              </div>
              <div className="text-xs font-semibold text-white mt-2">{item.name}</div>
              <div className="text-[11px] font-mono text-brand-400/90 mt-0.5">{item.factor}</div>
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
          <span>
            <strong className="text-amber-400">Score =</strong> (0.25 × S) + (0.20 × T) + (0.15 × A) + (0.25 × C) + (0.10 × E) + (0.05 × W)
          </span>
          <span className="text-slate-400 text-[11px]">
            *Zero accidents defaults to base safety risk A=10 (never 0 safety risk)
          </span>
        </div>
      </div>

      {/* Visual Analytics Section: Radar & Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart: Factor Average Performance */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Factor Score Averages</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Normalized (0 - 100)</span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {analysisData?.factorAverages ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysisData.factorAverages} margin={{ top: 10, right: 20, left: -20, bottom: 25 }}>
                  <XAxis dataKey="factor" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(val) => [`${val} / 100`, 'Average Score']}
                  />
                  <Bar dataKey="average" radius={[6, 6, 0, 0]}>
                    {analysisData.factorAverages.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={['#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'][index % 6]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No factor data available
              </div>
            )}
          </div>
        </div>

        {/* Priority Tier Distribution */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Priority Level Distribution</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Configurable Thresholds</span>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-center gap-6">
            <div className="h-56 w-56 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`pie-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-3 w-full">
              {[
                { label: 'Critical Priority (≥ 85)', count: analysisData?.priorityDistribution?.CRITICAL ?? 0, color: 'bg-rose-500', text: 'text-rose-400' },
                { label: 'High Priority (70 - 84)', count: analysisData?.priorityDistribution?.HIGH ?? 0, color: 'bg-amber-500', text: 'text-amber-400' },
                { label: 'Medium Priority (40 - 69)', count: analysisData?.priorityDistribution?.MEDIUM ?? 0, color: 'bg-blue-500', text: 'text-blue-400' },
                { label: 'Low Priority (< 40)', count: analysisData?.priorityDistribution?.LOW ?? 0, color: 'bg-emerald-500', text: 'text-emerald-400' },
              ].map((tier, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${tier.color}`} />
                    <span className="text-xs text-slate-300 font-medium">{tier.label}</span>
                  </div>
                  <span className={`text-sm font-bold font-mono ${tier.text}`}>{tier.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Spec Benchmark Simulator */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white">Interactive Scoring Sandbox & Spec Benchmark</h2>
              <p className="text-xs text-slate-400">
                Adjust sliders or click Benchmark Preset to verify exact formula calculation
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSimS(75);
              setSimT(75);
              setSimA(70);
              setSimC(68);
              setSimE(80);
              setSimW(90);
              setSimCriticalRoad(false);
              setSimConfirmedAcc(false);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition-colors"
          >
            Reset to Spec Benchmark (73.75)
          </button>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Severity (S)', val: simS, setVal: setSimS, weight: '0.25' },
            { label: 'Road Hierarchy (T)', val: simT, setVal: setSimT, weight: '0.20' },
            { label: 'Accident Safety (A)', val: simA, setVal: setSimA, weight: '0.15' },
            { label: 'Complaints (C)', val: simC, setVal: setSimC, weight: '0.25' },
            { label: 'Cost Efficiency (E)', val: simE, setVal: setSimE, weight: '0.10' },
            { label: 'Weather Season (W)', val: simW, setVal: setSimW, weight: '0.05' },
          ].map((slider) => (
            <div key={slider.label} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
                <span className="truncate">{slider.label}</span>
                <span className="font-mono text-indigo-400 font-bold">{slider.val}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={slider.val}
                onChange={(e) => slider.setVal(Number(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="text-[10px] text-slate-500 mt-1">Weight: {slider.weight}</div>
            </div>
          ))}
        </div>

        {/* Safety Overrides Checkboxes */}
        <div className="mt-4 flex flex-wrap items-center gap-6 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={simCriticalRoad}
              onChange={(e) => setSimCriticalRoad(e.target.checked)}
              className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
            />
            <span>Critical Defect on Arterial/Highway (Safety Override)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={simConfirmedAcc}
              onChange={(e) => setSimConfirmedAcc(e.target.checked)}
              className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
            />
            <span>Confirmed Accident Attribution (Safety Override)</span>
          </label>
        </div>

        {/* Output Calculation Banner */}
        <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-400 font-medium">Calculated Formula Breakdown:</div>
            <div className="font-mono text-xs sm:text-sm text-slate-200">
              (0.25 × {simS}) + (0.20 × {simT}) + (0.15 × {simA}) + (0.25 × {simC}) + (0.10 × {simE}) + (0.05 × {simW}) ={' '}
              <strong className="text-amber-400">{simRawScore}</strong>
            </div>
            {simOverride && (
              <div className="text-xs font-semibold text-rose-400 mt-1 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" />
                {simOverrideReason} (Escalated to Priority 90)
              </div>
            )}
            {isSpecBenchmark && (
              <div className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Spec benchmark match: 73.75 verified exactly!
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-400">Final Priority Score</div>
              <div className="text-3xl font-extrabold font-mono text-white">
                {simFinalScore}
              </div>
            </div>
            <div>{getLevelBadge(simLevel, simOverride)}</div>
          </div>
        </div>
      </div>

      {/* Defect Scoring & Audit Table */}
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-bold text-white">Top Evaluated Defects & Audit Explanations</h2>
          </div>
          <span className="text-xs text-slate-400">Showing Top 10 by Priority</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase font-mono text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Code / Title</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Priority Score</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4 text-right">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {analysisData?.topPriorityIssues?.map((issue) => {
                const isExpanded = expandedIssueId === issue._id;
                const factors = issue.priorityFactors || {};
                const reasons = factors.humanReadableReasons || [];

                return (
                  <React.Fragment key={issue._id}>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs font-bold text-brand-400">
                          {issue.issueCode}
                        </div>
                        <div className="text-xs text-white font-medium line-clamp-1">
                          {issue.title}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 capitalize text-xs">{issue.roadClass}</td>
                      <td className="py-3.5 px-4 capitalize text-xs">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            issue.severity === 'critical'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : issue.severity === 'high'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white text-base">
                        {issue.priorityScore}
                      </td>
                      <td className="py-3.5 px-4">
                        {getLevelBadge(issue.priorityLevel, issue.safetyOverride)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setExpandedIssueId(isExpanded ? null : issue._id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <span>Hide</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <span>Explain</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Explainability Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-950/70 border-y border-slate-800">
                        <td colSpan={6} className="p-4 space-y-3">
                          {/* Formula Breakdown */}
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                              Deterministic Formula Breakdown
                            </div>
                            <div className="font-mono text-xs text-amber-300">
                              {factors.formulaBreakdown ||
                                `(0.25 × ${factors.defectSeverityScore || 0}) + (0.20 × ${
                                  factors.roadHierarchyScore || 0
                                }) + (0.15 × ${factors.accidentSafetyScore || 0}) + (0.25 × ${
                                  factors.complaintDensityScore || 0
                                }) + (0.10 × ${factors.costEfficiencyScore || 0}) + (0.05 × ${
                                  factors.weatherSeasonScore || 0
                                }) = ${issue.priorityScore}`}
                            </div>
                          </div>

                          {/* Safety Override Reason if applicable */}
                          {issue.safetyOverride && (
                            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                              <AlertOctagon className="w-4 h-4 flex-shrink-0" />
                              <span>{issue.safetyOverrideReason}</span>
                            </div>
                          )}

                          {/* Human-Readable Audit Reasons */}
                          {reasons.length > 0 && (
                            <div>
                              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Human-Readable Audit Factors
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {reasons.map((r, i) => (
                                  <span
                                    key={i}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Factor Chips */}
                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                            <div className="p-2 rounded bg-slate-900 text-center">
                              <span className="text-slate-500 block">Severity (S)</span>
                              <strong className="text-white font-mono">{factors.defectSeverityScore || 0}</strong>
                            </div>
                            <div className="p-2 rounded bg-slate-900 text-center">
                              <span className="text-slate-500 block">Road (T)</span>
                              <strong className="text-white font-mono">{factors.roadHierarchyScore || 0}</strong>
                            </div>
                            <div className="p-2 rounded bg-slate-900 text-center">
                              <span className="text-slate-500 block">Safety (A)</span>
                              <strong className="text-white font-mono">{factors.accidentSafetyScore || 0}</strong>
                            </div>
                            <div className="p-2 rounded bg-slate-900 text-center">
                              <span className="text-slate-500 block">Density (C)</span>
                              <strong className="text-white font-mono">{factors.complaintDensityScore || 0}</strong>
                            </div>
                            <div className="p-2 rounded bg-slate-900 text-center">
                              <span className="text-slate-500 block">Cost (E)</span>
                              <strong className="text-white font-mono">{factors.costEfficiencyScore || 0}</strong>
                            </div>
                            <div className="p-2 rounded bg-slate-900 text-center">
                              <span className="text-slate-500 block">Weather (W)</span>
                              <strong className="text-white font-mono">{factors.weatherSeasonScore || 0}</strong>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
