import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Wrench,
  Calendar,
  HardHat,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  UserCheck,
  Check,
  X,
  RefreshCw,
  ArrowRight,
  BarChart3,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function RepairWorkflow() {
  const [issues, setIssues] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active status filter tab
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [modalType, setModalType] = useState(null); // 'SCHEDULE', 'ASSIGN', 'CLOSE'
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formTeam, setFormTeam] = useState('Central Rapid Asphalt Crew');
  const [formScheduledDate, setFormScheduledDate] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCost, setFormCost] = useState(1500);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [repairsRes, analyticsRes] = await Promise.all([
        axios.get('/api/repairs'),
        axios.get('/api/repairs/analytics/overview'),
      ]);

      if (repairsRes.data.success) {
        setIssues(repairsRes.data.issues || []);
      }
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load repair data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openScheduleModal = (issue) => {
    setSelectedIssue(issue);
    setFormCost(issue.estimatedCost || 1500);
    setFormScheduledDate(new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]);
    setFormTargetDate(new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0]);
    setFormNotes(`Approved municipal repair plan for ${issue.title}.`);
    setModalType('SCHEDULE');
  };

  const openAssignModal = (issue) => {
    setSelectedIssue(issue);
    setFormTeam(issue.assignedTeam || 'Central Rapid Asphalt Crew');
    setFormTargetDate(
      issue.estimatedCompletionDate
        ? new Date(issue.estimatedCompletionDate).toISOString().split('T')[0]
        : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    );
    setFormNotes(`Assigned defect to crew.`);
    setModalType('ASSIGN');
  };

  const openCloseModal = (issue) => {
    setSelectedIssue(issue);
    setFormNotes('Repair inspected and confirmed completed to city safety standards.');
    setModalType('CLOSE');
  };

  const handleStartWork = async (issueId) => {
    try {
      setLoading(true);
      const res = await axios.patch(`/api/repairs/${issueId}/start`);
      if (res.data.success) {
        setSuccessMsg('Work marked as IN PROGRESS on-site.');
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start roadwork');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;
    try {
      setSubmitting(true);
      const res = await axios.patch(`/api/repairs/${selectedIssue._id}/schedule`, {
        scheduledDate: formScheduledDate,
        estimatedCompletionDate: formTargetDate,
        estimatedCost: formCost,
        notes: formNotes,
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Repair scheduled successfully.');
        setModalType(null);
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to schedule repair.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;
    try {
      setSubmitting(true);
      const res = await axios.patch(`/api/repairs/${selectedIssue._id}/assign`, {
        assignedTeam: formTeam,
        estimatedCompletionDate: formTargetDate,
        notes: formNotes,
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Crew assigned successfully.');
        setModalType(null);
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign crew.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;
    try {
      setSubmitting(true);
      const res = await axios.patch(`/api/repairs/${selectedIssue._id}/close`, {
        notes: formNotes,
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Work order completed and closed.');
        setModalType(null);
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to close work order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter issues cleanly
  const filteredIssues = issues.filter((issue) => {
    if (activeTab === 'SCHEDULED' && issue.status !== 'SCHEDULED') return false;
    if (activeTab === 'ASSIGNED' && issue.status !== 'ASSIGNED') return false;
    if (activeTab === 'IN_PROGRESS' && issue.status !== 'IN_PROGRESS') return false;
    if (activeTab === 'INSPECTED' && issue.status !== 'INSPECTED') return false;
    if (activeTab === 'CLOSED' && issue.status !== 'CLOSED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = issue.issueCode?.toLowerCase().includes(q);
      const matchTitle = issue.title?.toLowerCase().includes(q);
      const matchWO = issue.workOrderNumber?.toLowerCase().includes(q);
      const matchTeam = issue.assignedTeam?.toLowerCase().includes(q);
      if (!matchCode && !matchTitle && !matchWO && !matchTeam) return false;
    }

    return true;
  });

  // Chart data for status distribution
  const chartStatusData = analytics?.statusCounts
    ? [
        { name: 'Reported', count: analytics.statusCounts.REPORTED || 0, color: '#94a3b8' },
        { name: 'Scheduled', count: analytics.statusCounts.SCHEDULED || 0, color: '#3b82f6' },
        { name: 'Assigned', count: analytics.statusCounts.ASSIGNED || 0, color: '#6366f1' },
        { name: 'In Progress', count: analytics.statusCounts.IN_PROGRESS || 0, color: '#f59e0b' },
        { name: 'Inspected', count: analytics.statusCounts.INSPECTED || 0, color: '#06b6d4' },
        { name: 'Completed', count: analytics.statusCounts.CLOSED || 0, color: '#10b981' },
      ]
    : [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SCHEDULED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Scheduled</span>;
      case 'ASSIGNED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Crew Assigned</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">In Progress</span>;
      case 'INSPECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">Inspected</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Completed</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Clean, Simple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <span>City Road Works & Repairs</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of ongoing road repair works, assigned crews, and completion progress.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Simple 4 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Road Works</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
            {analytics?.totalIssues ?? issues.length}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">Active across city</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
          <div className="text-xs font-semibold text-blue-600">Scheduled Orders</div>
          <div className="text-3xl font-extrabold text-blue-600 mt-1 font-mono">
            {analytics?.statusCounts?.SCHEDULED ?? 0}
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">Ready for dispatch</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
          <div className="text-xs font-semibold text-amber-600">Active On-Site</div>
          <div className="text-3xl font-extrabold text-amber-600 mt-1 font-mono">
            {analytics?.statusCounts?.IN_PROGRESS ?? 0}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">Crews currently repairing</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700">Completed Repairs</div>
          <div className="text-3xl font-extrabold text-emerald-700 mt-1 font-mono">
            {analytics?.closedRepairs ?? analytics?.statusCounts?.CLOSED ?? 0}
          </div>
          <div className="text-[11px] text-emerald-800 font-medium mt-1">Officially verified & closed</div>
        </div>
      </div>

      {/* The Graph Section (Retained & Simplified) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Repair Status Overview</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Repairs by current stage</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartStatusData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clean Summary Card Beside Graph */}
        <div className="p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <HardHat className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">Active Repair Teams</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Municipal teams assigned to road repairs:
            </p>

            <div className="space-y-2">
              {analytics?.availableCrews?.slice(0, 4).map((crew) => (
                <div key={crew.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{crew.name}</span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100/70 font-semibold px-2 py-0.5 rounded">
                    {crew.zone}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span>Estimated Budget:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              ${analytics?.totalEstimatedSpend?.toLocaleString() || '15,000'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Works' },
              { id: 'SCHEDULED', label: 'Scheduled' },
              { id: 'ASSIGNED', label: 'Assigned' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'INSPECTED', label: 'Inspected' },
              { id: 'CLOSED', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Search work order or defect..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl pl-9 pr-3 py-2 w-full outline-none focus:bg-white focus:border-emerald-600 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Clean Works Table */}
        <div className="rounded-2xl border border-emerald-100 overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Road Defect</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Crew</th>
                  <th className="py-3 px-4">Estimated Spend</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No road works found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((issue) => (
                    <tr key={issue._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {issue.workOrderNumber || issue.issueCode}
                          </span>
                          <span className="capitalize text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                            {issue.primaryDamageType || 'Defect'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1">
                          {issue.title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{issue.address || `${issue.roadClass || 'corridor'} road`}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            issue.priorityLevel === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : issue.priorityLevel === 'HIGH'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {issue.priorityLevel || 'MEDIUM'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(issue.status)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {issue.assignedTeam ? (
                          <span className="font-medium text-slate-800">{issue.assignedTeam.split(':')[0]}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-800 font-semibold">
                        ${issue.estimatedCost?.toLocaleString() || '1,500'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {issue.status === 'VERIFIED' && (
                            <button
                              onClick={() => openScheduleModal(issue)}
                              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] transition-colors"
                            >
                              Schedule
                            </button>
                          )}

                          {issue.status === 'SCHEDULED' && (
                            <button
                              onClick={() => openAssignModal(issue)}
                              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition-colors"
                            >
                              Assign Crew
                            </button>
                          )}

                          {issue.status === 'ASSIGNED' && (
                            <button
                              onClick={() => handleStartWork(issue._id)}
                              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors"
                            >
                              Start Work
                            </button>
                          )}

                          {issue.status === 'INSPECTED' && (
                            <button
                              onClick={() => openCloseModal(issue)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors"
                            >
                              Close & Sign-off
                            </button>
                          )}

                          {issue.status === 'CLOSED' && (
                            <span className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Closed
                            </span>
                          )}

                          {issue.status === 'IN_PROGRESS' && (
                            <span className="text-amber-700 text-[11px] font-semibold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Repairing
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Clean Modal: Schedule Work Order */}
      {modalType === 'SCHEDULE' && selectedIssue && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Schedule Road Repair Work
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Defect Target</label>
                <div className="text-sm font-bold text-slate-900">{selectedIssue.title}</div>
                <div className="text-xs font-mono text-emerald-700">{selectedIssue.issueCode}</div>
              </div>

              <div>
                <label className="text-xs text-slate-700 block mb-1 font-semibold">Scheduled Start Date</label>
                <input
                  type="date"
                  required
                  value={formScheduledDate}
                  onChange={(e) => setFormScheduledDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 block mb-1 font-semibold">Estimated Budget ($)</label>
                <input
                  type="number"
                  min="100"
                  value={formCost}
                  onChange={(e) => setFormCost(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clean Modal: Assign Crew */}
      {modalType === 'ASSIGN' && selectedIssue && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HardHat className="w-4 h-4 text-indigo-600" />
                Assign Repair Crew
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Defect Target</label>
                <div className="text-sm font-bold text-slate-900">{selectedIssue.title}</div>
                <div className="text-xs font-mono text-indigo-700">{selectedIssue.workOrderNumber || selectedIssue.issueCode}</div>
              </div>

              <div>
                <label className="text-xs text-slate-700 block mb-1 font-semibold">Select Repair Crew</label>
                <select
                  value={formTeam}
                  onChange={(e) => setFormTeam(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600"
                >
                  {analytics?.availableCrews?.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 block mb-1 font-semibold">Target Completion Date</label>
                <input
                  type="date"
                  required
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign Crew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clean Modal: Close Work Order */}
      {modalType === 'CLOSE' && selectedIssue && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Close Work Order
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Defect Target</label>
                <div className="text-sm font-bold text-slate-900">{selectedIssue.title}</div>
                <div className="text-xs font-mono text-emerald-700">{selectedIssue.workOrderNumber || selectedIssue.issueCode}</div>
              </div>

              {selectedIssue.completionEvidence && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="text-slate-500 font-semibold block">Inspector Field Notes:</span>
                  <p className="text-slate-800 italic">"{selectedIssue.completionEvidence.notes}"</p>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-700 block mb-1 font-semibold">Closure Sign-off Note</label>
                <textarea
                  rows={2}
                  required
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Closing...' : 'Confirm Closure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
