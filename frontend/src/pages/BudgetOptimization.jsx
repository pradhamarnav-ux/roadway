import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  DollarSign,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Scale,
  Sparkles,
  ShieldAlert,
  Sliders,
  RefreshCw,
  BarChart3,
  AlertOctagon,
  Check,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function BudgetOptimization() {
  const [budget, setBudget] = useState(50000);
  const [roadClassFilter, setRoadClassFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);
  const [activeTab, setActiveTab] = useState('SELECTED'); // SELECTED vs UNSELECTED
  const [applying, setApplying] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState('');

  const fetchPlan = async (budgetValue = budget, roadClass = roadClassFilter) => {
    try {
      setLoading(true);
      setError('');
      setAppliedMessage('');
      const res = await axios.post('/api/optimization/plan', {
        budget: Number(budgetValue),
        roadClass: roadClass || undefined,
      });

      if (res.data.success) {
        setPlan(res.data.plan);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to compute optimization plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan(budget, roadClassFilter);
  }, []);

  const handleBudgetChange = (newVal) => {
    setBudget(newVal);
    fetchPlan(newVal, roadClassFilter);
  };

  const handleApplyPlan = async () => {
    if (!plan || !plan.selectedIssues || plan.selectedIssues.length === 0) return;
    setApplying(true);
    try {
      const selectedIds = plan.selectedIssues.map((i) => i._id);
      const res = await axios.post('/api/optimization/apply', {
        selectedIssueIds: selectedIds,
      });

      if (res.data.success) {
        setAppliedMessage(res.data.message);
        // Refresh plan
        fetchPlan(budget, roadClassFilter);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to apply repair plan');
    } finally {
      setApplying(false);
    }
  };

  // Prepare chart data comparing Knapsack vs Heuristics
  const chartData = plan?.comparisons
    ? [
        {
          name: 'Knapsack (Optimal)',
          spend: plan.comparisons.knapsack.totalCost,
          benefit: plan.comparisons.knapsack.totalBenefit,
          repaired: plan.comparisons.knapsack.issuesRepaired,
          utilization: plan.comparisons.knapsack.utilizationPercent,
          fill: '#10b981', // emerald
        },
        {
          name: 'First-Come First-Served',
          spend: plan.comparisons.fcfs.totalCost,
          benefit: plan.comparisons.fcfs.totalBenefit,
          repaired: plan.comparisons.fcfs.issuesRepaired,
          utilization: plan.comparisons.fcfs.utilizationPercent,
          fill: '#6366f1', // indigo
        },
        {
          name: 'Highest Complaints',
          spend: plan.comparisons.complaints.totalCost,
          benefit: plan.comparisons.complaints.totalBenefit,
          repaired: plan.comparisons.complaints.issuesRepaired,
          utilization: plan.comparisons.complaints.utilizationPercent,
          fill: '#f59e0b', // amber
        },
        {
          name: 'Highest Priority (Greedy)',
          spend: plan.comparisons.greedyPriority.totalCost,
          benefit: plan.comparisons.greedyPriority.totalBenefit,
          repaired: plan.comparisons.greedyPriority.issuesRepaired,
          utilization: plan.comparisons.greedyPriority.utilizationPercent,
          fill: '#ec4899', // pink
        },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 mb-1">
          <Zap className="w-4 h-4" />
          <span>Algorithmic Capital Allocation • Phase 5 (Spec Section 9)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Repair Plan Budget Optimization
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Exact 0/1 Knapsack formulation maximizing modeled priority benefit subject to budget ceiling and mandatory public-safety constraints.
        </p>
      </div>

      {/* Modeled Benefit Metric Formula Card */}
      <div className="mb-8 glass-panel rounded-2xl p-4 border border-brand-500/20 bg-brand-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">
              Ethical Metric Definition: Modeled Priority Benefit (Not "Lives Saved")
            </span>
            <span className="text-slate-300 block mt-0.5">
              Optimization objective: <code className="text-brand-300 font-mono">Max Σ(Benefit_i × x_i)</code> subject to{' '}
              <code className="text-brand-300 font-mono">Σ(Cost_i × x_i) ≤ Budget</code>. Benefit is formulated as:{' '}
              <code className="text-emerald-300 font-mono">round(PriorityScore × TrafficMultiplier)</code> (Highway: 1.5×, Arterial: 1.25×, Collector: 1.1×, Residential: 1.0×).
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700/80">
          <Scale className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-semibold text-slate-200">OR-Tools 0/1 Knapsack Formulation</span>
        </div>
      </div>

      {/* Interactive Budget Control Bar */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-400" />
                <span>Municipal Repair Budget Allocation</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Total Funds:</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  ${Number(budget).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="5000"
              max="250000"
              step="2500"
              value={budget}
              onChange={(e) => handleBudgetChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            {/* Preset Buttons */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
              {[15000, 25000, 50000, 100000, 150000, 250000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleBudgetChange(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    budget === preset
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/80'
                  }`}
                >
                  ${(preset / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchPlan(budget, roadClassFilter)}
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-Optimize Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Infeasibility Warning Alert (if mandatory safety items exceed budget) */}
      {plan?.isInfeasible && (
        <div className="mb-8 p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-300 flex items-start gap-3 shadow-xl">
          <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <strong className="text-sm font-bold text-rose-200 block">
              Infeasible Budget Warning: Critical Safety Mandate Deficit
            </strong>
            <p className="text-xs leading-relaxed">{plan.infeasibilityWarning}</p>
            <span className="text-xs font-mono text-rose-400 block pt-1">
              Required Supplemental Emergency Appropriation: <strong>${plan.deficitRequired?.toLocaleString()}</strong>
            </span>
          </div>
        </div>
      )}

      {appliedMessage && (
        <div className="mb-8 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{appliedMessage}</span>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">1. Allocated Spend</span>
          <span className="text-2xl font-bold text-white font-mono mt-1 block">
            ${plan?.totalCost?.toLocaleString() || 0}
          </span>
          <span className="text-[11px] text-emerald-400 mt-1 block font-mono">
            {plan?.budgetUtilization || 0}% budget utilized
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">2. Remaining Funds</span>
          <span className="text-2xl font-bold text-slate-200 font-mono mt-1 block">
            ${plan?.remainingFunds?.toLocaleString() || 0}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Surplus available</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">3. Modeled Priority Benefit</span>
          <span className="text-2xl font-bold text-brand-400 font-mono mt-1 block">
            {plan?.totalBenefit?.toLocaleString() || 0}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Knapsack objective sum</span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">4. Repairs Scheduled</span>
          <span className="text-2xl font-bold text-purple-400 font-mono mt-1 block">
            {plan?.selectedCount || 0} / {(plan?.selectedCount || 0) + (plan?.unselectedCount || 0)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {plan?.mandatoryCount || 0} safety overrides
          </span>
        </div>
      </div>

      {/* Comparison Against Baseline Heuristics (Spec Section 9) */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <span>Optimization Comparison Against Municipal Baselines</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Empirical verification comparing RoadWise Knapsack against FCFS, complaint volume, and greedy priority sorting.
            </p>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-72 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#fff',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="benefit" name="Modeled Priority Benefit" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="spend" name="Budget Spent ($)" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
                <th className="pb-3 font-semibold">Allocation Strategy</th>
                <th className="pb-3 font-semibold">Total Spend ($)</th>
                <th className="pb-3 font-semibold">Budget Utilization</th>
                <th className="pb-3 font-semibold">Modeled Benefit</th>
                <th className="pb-3 font-semibold">Issues Repaired</th>
                <th className="pb-3 font-semibold">Unaddressed Critical</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {plan?.comparisons &&
                Object.values(plan.comparisons).map((c, idx) => {
                  const isOptimal = c.id === 'knapsack';
                  return (
                    <tr key={idx} className={isOptimal ? 'bg-emerald-500/5 font-bold' : ''}>
                      <td className="py-3 text-slate-200 font-sans flex items-center gap-2">
                        {isOptimal && <Sparkles className="w-4 h-4 text-emerald-400" />}
                        <span>{c.name}</span>
                      </td>
                      <td className="py-3 text-slate-300">${c.totalCost?.toLocaleString()}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] ${
                            c.utilizationPercent >= 90
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {c.utilizationPercent}%
                        </span>
                      </td>
                      <td className="py-3 text-brand-400 font-extrabold">{c.totalBenefit}</td>
                      <td className="py-3 text-slate-300">{c.issuesRepaired}</td>
                      <td className="py-3">
                        {c.unaddressedCriticalCount > 0 ? (
                          <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full">
                            {c.unaddressedCriticalCount} at risk
                          </span>
                        ) : (
                          <span className="text-emerald-400">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected vs Deferred Repair Candidates */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('SELECTED')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'SELECTED'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Selected for Repair ({plan?.selectedCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('UNSELECTED')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'UNSELECTED'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Deferred Candidates ({plan?.unselectedCount || 0})
            </button>
          </div>

          {activeTab === 'SELECTED' && (
            <button
              onClick={handleApplyPlan}
              disabled={applying || !plan?.selectedIssues?.length}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              <span>{applying ? 'Scheduling Work Orders...' : 'Apply Repair Plan (Schedule All)'}</span>
            </button>
          )}
        </div>

        {/* List */}
        {activeTab === 'SELECTED' ? (
          plan?.selectedIssues?.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No defects selected. Adjust budget slider above to expand allocation.
            </div>
          ) : (
            <div className="space-y-3">
              {plan?.selectedIssues?.map((issue) => (
                <div
                  key={issue._id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-all ${
                    issue.safetyOverride
                      ? 'border-rose-500/30 bg-rose-950/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-bold text-brand-400">{issue.issueCode}</span>
                      <span className="font-semibold text-white capitalize">{issue.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                        {issue.roadClass}
                      </span>
                      {issue.safetyOverride && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-600 text-white animate-pulse">
                          Safety Override
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-400 font-sans">
                      ✓ {issue.selectionReason}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 font-mono text-right shrink-0">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Repair Cost</span>
                      <span className="font-bold text-slate-200">${issue.cost?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Priority Score</span>
                      <span className="font-bold text-amber-400">{issue.priorityScore}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Modeled Benefit</span>
                      <span className="font-extrabold text-emerald-400">{issue.modeledBenefit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : plan?.unselectedIssues?.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            All eligible road defects have been funded within the allocated budget!
          </div>
        ) : (
          <div className="space-y-3">
            {plan?.unselectedIssues?.map((issue) => (
              <div
                key={issue._id}
                className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs opacity-75 hover:opacity-100 transition-opacity"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono font-bold text-slate-400">{issue.issueCode}</span>
                    <span className="font-semibold text-slate-300 capitalize">{issue.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase bg-slate-800 text-slate-400">
                      {issue.roadClass}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    • {issue.selectionReason}
                  </p>
                </div>

                <div className="flex items-center gap-6 font-mono text-right shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Repair Cost</span>
                    <span className="font-bold text-slate-300">${issue.cost?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Priority Score</span>
                    <span className="font-bold text-slate-400">{issue.priorityScore}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Modeled Benefit</span>
                    <span className="font-bold text-slate-400">{issue.modeledBenefit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
