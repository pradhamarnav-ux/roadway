import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import LocationPickerMap from '../components/LocationPickerMap';
import {
  Car,
  AlertTriangle,
  MapPin,
  Calendar,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Info,
  Camera,
  Upload,
  Lock,
  Eye,
  Check,
} from 'lucide-react';

const ATTRIBUTION_INFO = [
  {
    tier: 'NEARBY_ACCIDENT',
    label: 'Nearby Accident',
    desc: 'Occurred within 50m of defect; NO defect causation claimed or established. Strictly excluded from pothole damage statistics.',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    tier: 'SUSPECTED_CONTRIBUTION',
    label: 'Suspected Contribution',
    desc: 'Citizen or witness reports driver swerved, braked abruptly, or bottomed out on defect.',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  {
    tier: 'DOCUMENTED_CONTRIBUTION',
    label: 'Documented Contribution',
    desc: 'Official police FIR, paramedic incident log, or dashcam evidence documents the road defect.',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  {
    tier: 'CONFIRMED_CONTRIBUTION',
    label: 'Confirmed Contribution',
    desc: 'Municipal engineering forensic analysis certifies road defect as primary or contributing cause.',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
];

export default function ReportAccident() {
  const navigate = useNavigate();

  // Coordinates (Default: New Delhi center 28.6139, 77.2090)
  const [latitude, setLatitude] = useState(28.6139);
  const [longitude, setLongitude] = useState(77.2090);

  // Form State
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [vehiclesInvolved, setVehiclesInvolved] = useState(1);
  const [injuriesCount, setInjuriesCount] = useState(0);
  const [injurySeverity, setInjurySeverity] = useState('none');
  const [policeReportRef, setPoliceReportRef] = useState('');
  const [claimedContribution, setClaimedContribution] = useState(false);
  const [evidenceNotes, setEvidenceNotes] = useState('');

  // Evidence photo upload
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdAccident, setCreatedAccident] = useState(null);

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError('Evidence photo exceeds 5MB limit.');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);

    try {
      let res;
      if (photoFile) {
        const formData = new FormData();
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
        formData.append('occurredAt', occurredAt);
        formData.append('vehiclesInvolved', vehiclesInvolved);
        formData.append('injuriesCount', injuriesCount);
        formData.append('injurySeverity', injurySeverity);
        formData.append('policeReportRef', policeReportRef);
        formData.append('claimedContribution', claimedContribution);
        formData.append('evidenceNotes', evidenceNotes);
        formData.append('photo', photoFile);

        res = await axios.post('/api/accidents', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await axios.post('/api/accidents', {
          latitude,
          longitude,
          occurredAt,
          vehiclesInvolved,
          injuriesCount,
          injurySeverity,
          policeReportRef,
          claimedContribution,
          evidenceNotes,
        });
      }

      if (res.data.success) {
        setCreatedAccident(res.data.accident);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || err.message || 'Failed to submit accident report');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdAccident) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="glass-panel rounded-3xl p-8 border border-emerald-500/30 text-center shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block mb-3">
            Accident Incident Logged • Spec Section 7
          </span>

          <h2 className="text-2xl font-bold text-white mb-2">Accident Report Recorded</h2>
          <p className="text-sm text-slate-300 mb-6">
            The municipal engineering department and traffic safety unit have received this record for verification.
          </p>

          <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-700/80 mb-6 text-left space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Incident Ticket ID:</span>
              <span className="text-brand-400 font-bold text-sm">{createdAccident.accidentId}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Initial Attribution Tier:</span>
              <span className="text-amber-400 font-bold font-sans">{createdAccident.attributionTier}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Verification Status:</span>
              <span className="text-emerald-400 font-bold font-sans">
                {createdAccident.verificationStatus || 'UNVERIFIED'}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Vehicles Involved:</span>
              <span className="text-slate-200">{createdAccident.vehiclesInvolved}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Reported Injuries:</span>
              <span className="text-slate-200">
                {createdAccident.injuriesCount} ({createdAccident.injurySeverity})
              </span>
            </div>
            {createdAccident.policeReportRef && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Police Reference:</span>
                <span className="text-slate-300">{createdAccident.policeReportRef}</span>
              </div>
            )}
            {createdAccident.photoUrl && (
              <div className="pt-2">
                <span className="text-slate-400 block mb-2">Stored Photo Evidence:</span>
                <img
                  src={createdAccident.photoUrl}
                  alt="Evidence"
                  className="w-32 h-24 object-cover rounded-xl border border-slate-700"
                />
              </div>
            )}
          </div>

          {/* Ethical Reminder Box */}
          <div className="mb-6 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-xs text-slate-400">
            <strong className="text-slate-300 block mb-1">Ethical Accounting Note:</strong>
            Nearby accidents are kept strictly separate from defect-caused statistics. Only verified claims with formal
            investigation elevate to Documented or Confirmed contribution.
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link
              to="/"
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-colors"
            >
              Return to Dashboard
            </Link>
            <button
              onClick={() => {
                setCreatedAccident(null);
                setEvidenceNotes('');
                setPoliceReportRef('');
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Log Another Incident
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-rose-400 mb-1">
          <Car className="w-4 h-4" />
          <span>Civic Road Safety • Phase 4 (Spec Section 7)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Report Vehicular Accident</h1>
        <p className="text-sm text-slate-400 mt-1">
          Report traffic collisions occurring near known or suspected road surface defects to assist municipal safety calibration.
        </p>
      </div>

      {/* Ethical Safety Notice */}
      <div className="mb-6 p-4 rounded-2xl bg-brand-950/30 border border-brand-500/20 text-xs text-brand-300 flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-brand-400" />
        <div className="space-y-1">
          <strong className="block text-brand-200">Ethical Attribution Principle (Section 7):</strong>
          <span>
            Nearby accidents are <strong>never automatically counted as pothole-caused</strong>. Co-location in space/time
            does not equal causality. All reports start in the ethical <em>NEARBY_ACCIDENT</em> or <em>SUSPECTED_CONTRIBUTION</em> tier
            and require municipal engineering or police incident documentation before causality is officially confirmed.
          </span>
        </div>
      </div>

      {/* Minimal Personal Data Guarantee */}
      <div className="mb-6 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <strong className="text-slate-200 block">Minimal Personal Data Guarantee (Privacy by Design):</strong>
          <span>
            We do NOT collect driver's licenses, victim names, vehicle registration plates, or private medical details.
            Only incident parameters and defect context are logged.
          </span>
        </div>
      </div>

      {/* 4 Attribution Tiers Reference */}
      <div className="mb-8 glass-panel rounded-2xl p-4 border border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-brand-400" />
          <span>The Four Attribution Categories</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {ATTRIBUTION_INFO.map((item) => (
            <div key={item.tier} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border mb-1.5 ${item.badge}`}>
                {item.label}
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {submitError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div>{submitError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Location of Incident */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-400" />
            <span>1. Accident Coordinates</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Drag the pin or click on the map to pinpoint where the collision occurred (auto-matches road defect within 50m).
          </p>

          <LocationPickerMap
            latitude={latitude}
            longitude={longitude}
            onLocationChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
            height="320px"
          />
        </div>

        {/* Step 2: Incident Parameters */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h2 className="text-base font-bold text-white mb-4">2. Incident Details (Minimal PII)</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Date & Time of Accident
              </label>
              <input
                type="datetime-local"
                required
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Vehicles Involved
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={vehiclesInvolved}
                onChange={(e) => setVehiclesInvolved(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Persons Injured
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={injuriesCount}
                onChange={(e) => setInjuriesCount(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Highest Injury Severity
              </label>
              <select
                value={injurySeverity}
                onChange={(e) => setInjurySeverity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
              >
                <option value="none">None (Property Damage Only)</option>
                <option value="minor">Minor (Cuts, Bruises, First-Aid)</option>
                <option value="serious">Serious (Hospitalization, Fracture)</option>
                <option value="fatal">Fatal (Fatal vehicular collision)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Police Report / FIR Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. FIR-2026-8812 / Traffic Log #44"
                value={policeReportRef}
                onChange={(e) => setPoliceReportRef(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Evidence Storage (Optional Photo / Document Upload) */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-400" />
            <span>3. Evidence Storage (Optional Photo / Police Document)</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Upload photo of the collision scene, tire skid marks, vehicle damage, or official police report scan (Max 5MB).
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <label className="flex-1 w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-brand-500/60 rounded-2xl cursor-pointer bg-slate-900/40 hover:bg-slate-900/70 transition-all">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-slate-200">
                {photoFile ? photoFile.name : 'Click to select collision evidence photo'}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">JPEG, PNG, WebP up to 5MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>

            {photoPreview && (
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-700 shrink-0">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute top-1 right-1 bg-slate-900/80 text-rose-400 rounded-full w-5 h-5 text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Road Defect Contribution Claim */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h2 className="text-base font-bold text-white mb-3">4. Road Defect Contribution Claim</h2>

          <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all mb-4">
            <input
              type="checkbox"
              checked={claimedContribution}
              onChange={(e) => setClaimedContribution(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 text-brand-600 focus:ring-brand-500"
            />
            <div>
              <span className="text-xs font-bold text-white block">
                Do you suspect a road surface defect contributed to this collision?
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Check this if a driver swerved to dodge a pothole, lost traction on rutting, or bottomed out on collapsed asphalt.
                (Initial tier will be <em>SUSPECTED_CONTRIBUTION</em> instead of <em>NEARBY_ACCIDENT</em>).
              </span>
            </div>
          </label>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Incident Circumstances & Defect Role Description
            </label>
            <textarea
              rows={3}
              required
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="Detail what occurred: vehicle swerving to avoid defect, loss of steering control, road wetness conditions..."
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 shadow-xl shadow-rose-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Submit Accident Record</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
