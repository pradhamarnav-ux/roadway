import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import {
  MapPin,
  Filter,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  RefreshCw,
  Info,
  Car,
  DollarSign,
  HardHat,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  X,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Custom Map Marker generator with priority colors, pulsing safety aura, and unverified hollow circle
function createMarkerIcon(marker) {
  const isSafetyOverride = Boolean(marker.safetyOverride);
  const isUnverified = marker.markerType === 'UNVERIFIED_REPORT' || marker.verificationStatus === 'UNVERIFIED';
  const isClosed = marker.status === 'CLOSED';
  const isInspected = marker.status === 'INSPECTED';

  let color = '#3b82f6'; // default medium blue
  if (isClosed) {
    color = '#10b981'; // emerald green
  } else if (isInspected) {
    color = '#06b6d4'; // cyan
  } else if (isSafetyOverride || marker.priorityLevel === 'CRITICAL' || marker.priorityScore >= 85) {
    color = '#ef4444'; // rose red
  } else if (marker.priorityLevel === 'HIGH' || marker.priorityScore >= 70) {
    color = '#f59e0b'; // amber
  } else if (marker.priorityLevel === 'MEDIUM') {
    color = '#3b82f6'; // blue
  } else {
    color = '#64748b'; // slate/emerald
  }

  // Unverified raw complaints render as hollow dashed circles
  if (isUnverified) {
    return L.divIcon({
      className: 'custom-unverified-marker',
      html: `
        <div style="position: relative; transform: translate(-50%, -50%);">
          <div style="
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2.5px dashed #94a3b8;
            background: rgba(15, 23, 42, 0.8);
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #94a3b8;"></div>
          </div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
  }

  // Pulsing ring for Safety Override urgent items
  const pulsingRingHtml = isSafetyOverride
    ? `
      <div style="
        position: absolute;
        top: -6px;
        left: -6px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.4);
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        pointer-events: none;
      "></div>
    `
    : '';

  return L.divIcon({
    className: 'custom-priority-marker',
    html: `
      <div style="position: relative; transform: translate(-50%, -100%);">
        ${pulsingRingHtml}
        <div style="
          width: 32px;
          height: 32px;
          background: ${color};
          border: 2px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 14px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 12px;
            height: 12px;
            background: #ffffff;
            border-radius: 50%;
            transform: rotate(45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            font-weight: bold;
            color: ${color};
          ">
            ${isClosed ? '✓' : ''}
          </div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

// Center controller for MapContainer
function MapCenterController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function CityMap() {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMarker, setSelectedMarker] = useState(null);

  // Filter States
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [damageTypeFilter, setDamageTypeFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [repairStatusFilter, setRepairStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Map center default (New Delhi / NCR corridor)
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);

  const fetchMapDefects = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (damageTypeFilter !== 'ALL') params.damageType = damageTypeFilter;
      if (verificationFilter !== 'ALL') params.verificationStatus = verificationFilter;
      if (repairStatusFilter !== 'ALL') params.repairStatus = repairStatusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await axios.get('/api/repairs/map-defects', { params });
      if (res.data.success) {
        setMarkers(res.data.markers || []);
        if (res.data.markers?.length > 0) {
          // Center on first marker
          setMapCenter(res.data.markers[0].coordinates);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load GIS map defects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapDefects();
  }, [priorityFilter, damageTypeFilter, verificationFilter, repairStatusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMapDefects();
  };

  const handleResetFilters = () => {
    setPriorityFilter('ALL');
    setDamageTypeFilter('ALL');
    setVerificationFilter('ALL');
    setRepairStatusFilter('ALL');
    setSearchQuery('');
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">CLOSED / REPAIRED</span>;
      case 'INSPECTED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">INSPECTED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">IN PROGRESS</span>;
      case 'ASSIGNED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">ASSIGNED TO CREW</span>;
      case 'SCHEDULED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">SCHEDULED</span>;
      case 'VERIFIED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">VERIFIED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">REPORTED (RAW)</span>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Filter Bar */}
      <div className="glass-panel border-b border-slate-800 p-4 z-20">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                City GIS Defect Map
                <span className="text-xs font-mono font-normal bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  {markers.length} Defects Visualized
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Interactive spatial visualization with priority styling, safety aura, and repair lifecycle popups
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical (Score ≥ 85)</option>
              <option value="HIGH">High (Score 70-84)</option>
              <option value="MEDIUM">Medium (Score 40-69)</option>
              <option value="LOW">Low (Score &lt; 40)</option>
            </select>

            {/* Repair Status Filter */}
            <select
              value={repairStatusFilter}
              onChange={(e) => setRepairStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Repair Stages</option>
              <option value="REPORTED">1. Reported (Raw)</option>
              <option value="VERIFIED">2. Verified</option>
              <option value="SCHEDULED">3. Scheduled</option>
              <option value="ASSIGNED">4. Assigned to Crew</option>
              <option value="IN_PROGRESS">5. In Progress</option>
              <option value="INSPECTED">6. Inspected</option>
              <option value="CLOSED">7. Closed / Repaired</option>
            </select>

            {/* Damage Type Filter */}
            <select
              value={damageTypeFilter}
              onChange={(e) => setDamageTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Damage Types</option>
              <option value="pothole">Pothole</option>
              <option value="severe_crack">Severe Crack</option>
              <option value="rutting">Rutting / Depression</option>
              <option value="manhole_collapse">Manhole Collapse</option>
              <option value="erosion">Erosion / Edge</option>
            </select>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search code, title, street..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg pl-7 pr-3 py-1.5 w-44 sm:w-56 focus:ring-1 focus:ring-brand-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
              </div>
            </form>

            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Map + Side Drawer Container */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Leaflet GIS Map */}
        <div className="flex-1 h-full w-full">
          <MapContainer
            center={mapCenter}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapCenterController center={mapCenter} />

            {/* Render Markers */}
            {markers.map((marker) => {
              const icon = createMarkerIcon(marker);
              return (
                <Marker
                  key={marker._id}
                  position={marker.coordinates}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedMarker(marker),
                  }}
                >
                  <Popup className="roadwise-custom-popup" minWidth={280}>
                    <div className="p-2 space-y-2 font-['Plus_Jakarta_Sans',sans-serif]">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                        <span className="font-mono text-xs font-bold text-brand-400">
                          {marker.issueCode}
                        </span>
                        {getStatusBadge(marker.status)}
                      </div>

                      {/* Title */}
                      <div className="font-bold text-sm text-slate-900 leading-snug">
                        {marker.title}
                      </div>

                      {/* Safety Override Tag */}
                      {marker.safetyOverride && (
                        <div className="p-1.5 rounded bg-rose-50 border border-rose-300 text-rose-700 text-[11px] font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Urgent Safety Override Active</span>
                        </div>
                      )}

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700 pt-1">
                        <div>
                          <strong>Priority:</strong> {marker.priorityScore} ({marker.priorityLevel})
                        </div>
                        <div>
                          <strong>Severity:</strong> <span className="capitalize">{marker.severity}</span>
                        </div>
                        <div>
                          <strong>Road Class:</strong> <span className="capitalize">{marker.roadClass}</span>
                        </div>
                        <div>
                          <strong>Est. Cost:</strong> ${marker.estimatedCost?.toLocaleString()}
                        </div>
                        <div>
                          <strong>Reports:</strong> {marker.reportsCount} citizen complaints
                        </div>
                        <div>
                          <strong>Accidents:</strong> {marker.accidentCounts?.confirmedCount || 0} confirmed ({marker.accidentCounts?.nearbyCount || 0} nearby)
                        </div>
                      </div>

                      {/* Assigned Crew if any */}
                      {marker.assignedTeam && (
                        <div className="text-[11px] bg-slate-100 p-1.5 rounded text-slate-800">
                          <strong>Assigned Crew:</strong> {marker.assignedTeam}
                        </div>
                      )}

                      {/* Quick Action Button */}
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                        <button
                          onClick={() => setSelectedMarker(marker)}
                          className="px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Full Audit Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <Link
                          to={`/admin/repairs/${marker._id}`}
                          className="text-[11px] text-brand-600 hover:underline font-semibold"
                        >
                          Manage Workflow ➔
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Map Legend Overlay */}
        <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-xl max-w-xs text-xs space-y-2 pointer-events-auto">
          <div className="font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-400" />
              Marker Legend
            </span>
            <span className="text-[10px] text-slate-400">Spec Section 10</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
              <span>Critical (≥ 85)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
              <span>High (70 - 84)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              <span>Medium (40 - 69)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-500" />
              <span>Low (&lt; 40)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Closed / Repaired</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-dashed border-slate-400 bg-transparent" />
              <span>Unverified (Raw)</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-rose-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>Pulsing Aura: Safety Override Corridor</span>
          </div>
        </div>

        {/* Selected Defect Detail Drawer */}
        {selectedMarker && (
          <div className="absolute top-0 right-0 h-full w-full sm:w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 p-6 z-[1001] overflow-y-auto shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-brand-400">
                    {selectedMarker.issueCode}
                  </span>
                  <div className="text-xs text-slate-400">{selectedMarker.address}</div>
                </div>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Severity Pill */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedMarker.status)}
                <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-slate-800 text-slate-300">
                  {selectedMarker.severity} Severity
                </span>
              </div>

              {/* Title */}
              <h2 className="text-base font-bold text-white">{selectedMarker.title}</h2>

              {/* Safety Override Alert */}
              {selectedMarker.safetyOverride && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Mandatory Rapid Safety Override
                  </div>
                  <div className="text-[11px] text-rose-300/80">
                    {selectedMarker.safetyOverrideReason || 'Corridor hazard priority override active.'}
                  </div>
                </div>
              )}

              {/* Priority Formula Breakdown */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Composite Priority Score</span>
                  <strong className="text-white font-mono text-sm">
                    {selectedMarker.priorityScore} / 100 ({selectedMarker.priorityLevel})
                  </strong>
                </div>
                {selectedMarker.formulaBreakdown && (
                  <div className="font-mono text-[11px] text-amber-400/90 pt-1 border-t border-slate-800 break-words">
                    {selectedMarker.formulaBreakdown}
                  </div>
                )}
              </div>

              {/* Work Order Info */}
              {selectedMarker.workOrderNumber && (
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-indigo-400 font-semibold">Work Order:</span>
                    <span className="font-mono font-bold text-white">{selectedMarker.workOrderNumber}</span>
                  </div>
                  {selectedMarker.assignedTeam && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Team:</span>
                      <span className="font-medium text-white">{selectedMarker.assignedTeam}</span>
                    </div>
                  )}
                  {selectedMarker.estimatedCompletionDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Est. Target:</span>
                      <span>{new Date(selectedMarker.estimatedCompletionDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Completion Evidence if present */}
              {selectedMarker.completionEvidence && (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-2">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Inspection Evidence Recorded
                  </div>
                  <p className="text-[11px] text-slate-300 italic">
                    "{selectedMarker.completionEvidence.notes}"
                  </p>
                  {selectedMarker.completionEvidence.photoUrl && (
                    <img
                      src={selectedMarker.completionEvidence.photoUrl}
                      alt="Completion evidence"
                      className="w-full h-32 object-cover rounded-lg border border-slate-700"
                    />
                  )}
                </div>
              )}

              {/* Human-readable audit factors */}
              {selectedMarker.humanReadableReasons && selectedMarker.humanReadableReasons.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Audit Explanations
                  </span>
                  <div className="space-y-1">
                    {selectedMarker.humanReadableReasons.map((reason, idx) => (
                      <div key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="text-brand-400 mt-0.5">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <Link
                to={`/admin/repairs/${selectedMarker._id}`}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 transition-all"
              >
                <span>Open Repair Workflow Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
