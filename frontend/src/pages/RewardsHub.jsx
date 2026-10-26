import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Award,
  Gift,
  Trophy,
  History,
  Shield,
  Eye,
  Target,
  Compass,
  Crown,
  Bus,
  Car,
  Activity,
  Trees,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function RewardsHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('wallet'); // 'wallet' | 'store' | 'leaderboard'
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [perks, setPerks] = useState([]);
  const [badgesCatalog, setBadgesCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Preferences form state
  const [prefAlias, setPrefAlias] = useState('');
  const [prefOptOut, setPrefOptOut] = useState(false);
  const [prefUseAlias, setPrefUseAlias] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Redemption state
  const [redeeming, setRedeeming] = useState(null);
  const [redemptionSuccess, setRedemptionSuccess] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchRewardsData = async () => {
    try {
      setLoading(true);
      setError('');

      const [walletRes, historyRes, leaderboardRes, perksRes] = await Promise.all([
        axios.get('/api/rewards/wallet'),
        axios.get('/api/rewards/history'),
        axios.get('/api/rewards/leaderboard'),
        axios.get('/api/rewards/perks'),
      ]);

      if (walletRes.data.success) {
        setWallet(walletRes.data.wallet);
        setPrefAlias(walletRes.data.wallet.alias || '');
        setPrefOptOut(walletRes.data.wallet.optOutLeaderboard);
        setPrefUseAlias(walletRes.data.wallet.useAliasOnLeaderboard);
      }

      if (historyRes.data.success) {
        setHistory(historyRes.data.history || []);
      }

      if (leaderboardRes.data.success) {
        setLeaderboard(leaderboardRes.data.leaderboard || []);
        setUserRank(leaderboardRes.data.userRank);
      }

      if (perksRes.data.success) {
        setPerks(perksRes.data.perks || []);
        setBadgesCatalog(perksRes.data.badgesCatalog || []);
      }
    } catch (err) {
      console.error('Failed to load rewards hub data:', err);
      setError(err.response?.data?.error || 'Failed to load civic rewards data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewardsData();
  }, []);

  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    setSuccessMsg('');
    setError('');
    try {
      const res = await axios.patch('/api/rewards/preferences', {
        alias: prefAlias,
        optOutLeaderboard: prefOptOut,
        useAliasOnLeaderboard: prefUseAlias,
      });

      if (res.data.success) {
        setSuccessMsg('Civic privacy preferences updated successfully!');
        // Refresh leaderboard & wallet
        fetchRewardsData();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleRedeemPerk = async (perkId) => {
    setRedeeming(perkId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await axios.post('/api/rewards/redeem', { perkId });
      if (res.data.success) {
        setRedemptionSuccess(res.data);
        // Refresh wallet balance and history
        fetchRewardsData();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to redeem perk.');
    } finally {
      setRedeeming(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getBadgeIcon = (iconName) => {
    switch (iconName) {
      case 'Compass':
        return <Compass className="w-5 h-5" />;
      case 'Target':
        return <Target className="w-5 h-5" />;
      case 'Eye':
        return <Eye className="w-5 h-5" />;
      case 'Shield':
        return <Shield className="w-5 h-5" />;
      case 'Crown':
        return <Crown className="w-5 h-5" />;
      default:
        return <Award className="w-5 h-5" />;
    }
  };

  const getPerkIcon = (iconName) => {
    switch (iconName) {
      case 'Bus':
        return <Bus className="w-6 h-6" />;
      case 'Car':
        return <Car className="w-6 h-6" />;
      case 'Activity':
        return <Activity className="w-6 h-6" />;
      case 'Trees':
        return <Trees className="w-6 h-6" />;
      case 'Coffee':
        return <Coffee className="w-6 h-6" />;
      default:
        return <Gift className="w-6 h-6" />;
    }
  };

  const isBadgeUnlocked = (badgeId) => {
    if (!wallet || !wallet.badges) return false;
    return wallet.badges.some((b) => b.id === badgeId);
  };

  const getBadgeAwardDate = (badgeId) => {
    if (!wallet || !wallet.badges) return null;
    const b = wallet.badges.find((item) => item.id === badgeId);
    return b ? new Date(b.awardedAt).toLocaleDateString() : null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-emerald-100 mb-8 bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/40 shadow-sm">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 font-bold">
                RoadWise Civic Rewards & Ledger
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Spec Sections 12, 13, 14
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <Award className="w-8 h-8 text-emerald-600" />
              RoadWise Rewards Hub
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Earn transparent civic reward points whenever your reported hazards or corroborations are verified by municipal inspectors. Redeem simulated transit vouchers, parking waivers, and community perks.
            </p>
          </div>

          {/* Wallet Balance Hero Card */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 flex items-center gap-5 shadow-sm min-w-[280px]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200/60 border border-emerald-300 flex items-center justify-center text-emerald-700">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs text-slate-600 block font-semibold">Your Civic Balance</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {wallet ? wallet.pointsBalance : '--'}
                </span>
                <span className="text-sm font-bold text-emerald-700">pts</span>
              </div>
              <span className="text-[11px] text-slate-600 block mt-0.5 font-mono">
                {wallet ? `${wallet.antiAbuse.remainingToday} pts remaining today` : 'Loading...'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-emerald-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'wallet'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Award className="w-4 h-4" />
            Civic Wallet & Badges
          </button>

          <button
            onClick={() => setActiveTab('store')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'store'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Gift className="w-4 h-4" />
            Simulated Perks Store
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              activeTab === 'store' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              Demo
            </span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'leaderboard'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Top 100 Leaderboard
          </button>
        </div>
      </div>

      {/* TAB 1: CIVIC WALLET & BADGES */}
      {activeTab === 'wallet' && (
        <div className="space-y-8">
          {/* 4 Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="text-xs font-semibold">Available Balance</span>
                <Award className="w-4 h-4 text-amber-700" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-900 font-mono">{wallet?.pointsBalance || 0}</span>
                <span className="text-xs text-amber-700 font-bold">pts</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-2">Ready for perk redemption</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="text-xs font-semibold">All-Time Earned</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-emerald-700 font-mono">+{wallet?.totalEarned || 0}</span>
                <span className="text-xs text-emerald-700 font-bold">pts</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-2">Verified civic contributions</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="text-xs font-semibold">Perks Redeemed</span>
                <ArrowDownRight className="w-4 h-4 text-rose-700" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-rose-700 font-mono">-{wallet?.totalRedeemed || 0}</span>
                <span className="text-xs text-rose-700 font-bold">pts</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-2">Simulated vouchers claimed</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="text-xs font-semibold">Verified Reports</span>
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-blue-700 font-mono">{wallet?.verifiedReportsCount || 0}</span>
                <span className="text-xs text-blue-700 font-bold">hazards</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-2">Audited by municipal teams</span>
            </div>
          </div>

          {/* Community Badges Showcase */}
          <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Civic Achievement Badges</h2>
                  <p className="text-xs text-slate-600">Milestone badges permanently awarded for authentic civic stewardship.</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                {wallet?.badges?.length || 0} / {badgesCatalog.length} Unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {badgesCatalog.map((b) => {
                const unlocked = isBadgeUnlocked(b.id);
                const awardDate = getBadgeAwardDate(b.id);
                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      unlocked
                        ? 'bg-amber-50/70 border-amber-300 shadow-sm'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            unlocked
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-200 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {getBadgeIcon(b.icon)}
                        </div>
                        {unlocked ? (
                          <span className="text-[10px] uppercase font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                            Unlocked
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-mono text-slate-600 flex items-center gap-1 font-semibold">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{b.name}</h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">{b.description}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200 text-[10px] text-slate-600 font-mono">
                      {unlocked ? `Awarded: ${awardDate}` : `Req: ${b.criteria}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Append-Only Reward Ledger Transaction History */}
          <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Append-Only Reward Ledger History</h2>
                  <p className="text-xs text-slate-600">Cryptographically indexed ledger with unique idempotency keys.</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600">{history.length} Transactions</span>
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No ledger transactions recorded yet. Submit and verify road defect reports to earn points!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase font-mono font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Action Type</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Idempotency Key</th>
                      <th className="py-3 px-4 text-right">Points Delta</th>
                      <th className="py-3 px-4 text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((tx) => (
                      <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              tx.pointsDelta > 0
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {tx.actionType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-800 max-w-xs truncate font-medium">{tx.description}</td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-[140px] truncate" title={tx.idempotencyKey}>
                          {tx.idempotencyKey}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                            tx.pointsDelta > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {tx.pointsDelta > 0 ? `+${tx.pointsDelta}` : tx.pointsDelta} pts
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold whitespace-nowrap">
                          {tx.balanceAfter} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SIMULATED PERKS STORE */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          {/* Explicit Demo Only Disclaimer */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-900 font-bold mb-1">
                DEMO ONLY • Simulated Civic Redemption Store (Spec Section 12)
              </strong>
              <p className="text-amber-800 leading-relaxed">
                All vouchers, waivers, and passes listed here are simulated civic demonstrations with NO cash or monetary value. Vouchers are generated atomically via database row locks to guarantee zero negative balance or double spending.
              </p>
            </div>
          </div>

          {/* Perks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {perks.map((perk) => {
              const canAfford = (wallet?.pointsBalance || 0) >= perk.cost;
              return (
                <div
                  key={perk.id}
                  className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm flex flex-col justify-between hover:border-emerald-400 hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                        {getPerkIcon(perk.icon)}
                      </div>
                      <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {perk.category}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                      {perk.name}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">{perk.description}</p>

                    <div className="text-[11px] text-slate-600 font-mono mb-2">
                      Partner: <span className="text-slate-900 font-semibold">{perk.partner}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">Perk Cost</span>
                      <span className="text-lg font-extrabold font-mono text-amber-800">{perk.cost} pts</span>
                    </div>

                    <button
                      onClick={() => handleRedeemPerk(perk.id)}
                      disabled={!canAfford || redeeming === perk.id}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        canAfford
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      }`}
                    >
                      {redeeming === perk.id
                        ? 'Redeeming...'
                        : canAfford
                        ? 'Redeem Perk ➔'
                        : `Need ${perk.cost - (wallet?.pointsBalance || 0)} more`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Redemption Modal / Receipt Display */}
          {redemptionSuccess && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-200 shadow-2xl relative">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 mb-4 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 text-center">Perk Voucher Issued!</h3>
                <p className="text-xs text-slate-600 text-center mt-1">
                  Atomic row lock successfully deducted {redemptionSuccess.pointsDeducted} points.
                </p>

                {/* Simulated Voucher Card */}
                <div className="my-6 p-5 rounded-2xl bg-amber-50/60 border border-dashed border-amber-400 text-center relative overflow-hidden">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 font-bold block mb-1">
                    {redemptionSuccess.perk.category} VOUCHER
                  </span>
                  <h4 className="text-base font-bold text-slate-900">{redemptionSuccess.perk.name}</h4>

                  <div className="my-3 py-2 px-3 rounded-xl bg-white border border-amber-300 flex items-center justify-between shadow-sm">
                    <span className="font-mono text-xs font-extrabold text-amber-800 tracking-wider">
                      {redemptionSuccess.voucherCode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(redemptionSuccess.voucherCode)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Copy Voucher Code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-600 font-mono block">
                    Valid for 30 Days • Non-Transferable Demo Asset
                  </span>
                </div>

                <div className="text-xs text-slate-700 space-y-1 mb-6 font-mono text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between">
                    <span>New Balance:</span>
                    <strong className="text-slate-900">{redemptionSuccess.balanceAfter} pts</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ledger ID:</span>
                    <span className="text-slate-500">{String(redemptionSuccess.ledgerId).substring(0, 12)}...</span>
                  </div>
                </div>

                <button
                  onClick={() => setRedemptionSuccess(null)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMMUNITY LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Leaderboard Table (Col 2) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Monthly Top-100 Civic Leaderboard</h2>
                  <p className="text-xs text-slate-600">Recognizing verified citizen stewardship across municipal wards.</p>
                </div>
              </div>
              {userRank && (
                <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  Your Rank: #{userRank}
                </span>
              )}
            </div>

            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-600 text-xs">
                No civic contributors on the leaderboard yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase font-mono font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Citizen / Alias</th>
                      <th className="py-3 px-4">Badges Earned</th>
                      <th className="py-3 px-4 text-right">Civic Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboard.map((champ) => (
                      <tr
                        key={champ.userId}
                        className={`transition-colors ${
                          champ.isCurrentUser
                            ? 'bg-amber-50/80 border-l-4 border-l-amber-500'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                          {champ.rank === 1 && <span className="text-amber-700 font-bold">🥇 1</span>}
                          {champ.rank === 2 && <span className="text-slate-700 font-bold">🥈 2</span>}
                          {champ.rank === 3 && <span className="text-amber-800 font-bold">🥉 3</span>}
                          {champ.rank > 3 && <span className="text-slate-600 font-semibold">#{champ.rank}</span>}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{champ.displayName}</span>
                            {champ.isCurrentUser && (
                              <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded border border-amber-400">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="flex items-center gap-1">
                            {champ.badges.slice(0, 3).map((b) => (
                              <span
                                key={b.id}
                                title={b.name}
                                className="w-5 h-5 rounded bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800 font-bold text-[10px]"
                              >
                                {b.name[0]}
                              </span>
                            ))}
                            {champ.badgesCount > 3 && (
                              <span className="text-[10px] text-slate-600 font-mono font-bold">+{champ.badgesCount - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-800 text-sm whitespace-nowrap">
                          {champ.pointsBalance} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Privacy & Alias Settings Panel (Col 1) */}
          <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Privacy & Alias Controls</h3>
                <p className="text-xs text-slate-600">Control how your identity is displayed.</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePreferences} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5">
                  Citizen Public Alias
                </label>
                <input
                  type="text"
                  value={prefAlias}
                  onChange={(e) => setPrefAlias(e.target.value)}
                  maxLength={30}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
                  placeholder="e.g. CivicHero_4892"
                />
                <span className="text-[11px] text-slate-600 block mt-1">
                  Randomized handle used when anonymous privacy mode is enabled.
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={prefUseAlias}
                    onChange={(e) => setPrefUseAlias(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 block">
                      Display Alias on Public Leaderboard
                    </span>
                    <span className="text-[11px] text-slate-600 leading-tight block">
                      Replaces your real name with your custom handle ({prefAlias || 'Anonymous'}).
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={prefOptOut}
                    onChange={(e) => setPrefOptOut(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 block">
                      Opt-Out Completely from Public Leaderboard
                    </span>
                    <span className="text-[11px] text-slate-600 leading-tight block">
                      Excludes you from public ranking. Your wallet balance is 100% retained.
                    </span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={savingPrefs}
                className="w-full mt-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                {savingPrefs ? 'Saving Settings...' : 'Save Privacy Settings'}
              </button>
            </form>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 leading-relaxed">
              <strong className="text-slate-900 block mb-1">Privacy Guarantee:</strong>
              Opting out hides your record from public leaderboards. Your personal wallet balance, earned badges, and simulated perk redemption rights are permanently preserved in the immutable append-only ledger.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
