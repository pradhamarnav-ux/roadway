import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import LocationPickerMap from '../components/LocationPickerMap';
import {
  ShieldAlert,
  Camera,
  Upload,
  MapPin,
  Navigation,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight,
  Info,
} from 'lucide-react';

const DAMAGE_TYPES = [
  { id: 'pothole', label: 'Pothole', desc: 'Cavity or pit in asphalt surface' },
  { id: 'severe_crack', label: 'Severe Crack', desc: 'Deep alligator cracking or fissures' },
  { id: 'rutting', label: 'Depression / Rutting', desc: 'Longitudinal wheel path ruts' },
  { id: 'manhole_collapse', label: 'Manhole Collapse', desc: 'Sunken or fractured drainage utility lid' },
  { id: 'erosion', label: 'Erosion / Edge Failure', desc: 'Shoulder washout or crumbling asphalt edge' },
  { id: 'other', label: 'Other Hazard', desc: 'Other dangerous road defect' },
];

const SEVERITIES = [
  { id: 'low', label: 'Low', desc: 'Surface wear / cosmetic (<2cm depth)', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { id: 'medium', label: 'Medium', desc: 'Moderate hazard (2-4cm depth)', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'high', label: 'High', desc: 'Significant hazard (4-7cm depth)', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  { id: 'critical', label: 'Critical', desc: 'Severe structural failure (>7cm depth)', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
];

export default function ReportHazard() {
  const navigate = useNavigate();

  // Form State
  const [damageType, setDamageType] = useState('pothole');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [manualAddress, setManualAddress] = useState('');

  // Coordinates State (Default: New Delhi city center 28.6139, 77.2090)
  const [latitude, setLatitude] = useState(28.6139);
  const [longitude, setLongitude] = useState(77.2090);
  const [deviceCoords, setDeviceCoords] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState(null);

  // File Upload State
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdReport, setCreatedReport] = useState(null);

  // Handle Photo Selection
  const handleFileChange = (e) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setPhotoError('Invalid image format. Please select a JPEG, PNG, or WebP photo.');
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File size exceeds the 5MB maximum limit.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError('');
  };

  // "Use My Current Location" via Geolocation API
  const handleGetCurrentLocation = () => {
    setGpsLoading(true);
    setGpsMessage(null);

    if (!navigator.geolocation) {
      setGpsLoading(false);
      setGpsMessage({
        type: 'error',
        text: 'Geolocation is not supported by your browser. Please adjust the map pin manually.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);

        setLatitude(lat);
        setLongitude(lng);
        setDeviceCoords({ latitude: lat, longitude: lng });
        setAccuracy(acc);
        setGpsLoading(false);
        setGpsMessage({
          type: 'success',
          text: `Device location captured (Accuracy: ±${acc}m). Pin centered.`,
        });
      },
      (err) => {
        setGpsLoading(false);
        let msg = 'Could not access device GPS.';
        if (err.code === 1) {
          msg = 'Location permission was denied. You can still set the pin manually on the map below.';
        } else if (err.code === 2) {
          msg = 'Position unavailable. Please adjust the map pin manually.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please drag the pin on the map.';
        }
        setGpsMessage({ type: 'warning', text: msg });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Drag or Click pin on map
  const handleLocationChange = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!photoFile) {
      setPhotoError('A photo of the defect is required for verification.');
      return;
    }

    if (!description.trim()) {
      setSubmitError('Please provide a brief description of the hazard.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('damageType', damageType);
      formData.append('severity', severity);
      formData.append('description', description);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('manualAddress', manualAddress);

      if (deviceCoords) {
        formData.append('deviceLatitude', deviceCoords.latitude);
        formData.append('deviceLongitude', deviceCoords.longitude);
      }
      if (accuracy) {
        formData.append('deviceAccuracyMeters', accuracy);
      }

      const res = await axios.post('/api/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setCreatedReport(res.data.report);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  // Success view
  if (createdReport) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="glass-panel rounded-3xl p-8 border border-emerald-500/30 text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block mb-3">
            Report Registered • Status: UNVERIFIED
          </span>

          <h2 className="text-2xl font-bold text-white mb-2">Complaint Submitted Successfully!</h2>
          <p className="text-sm text-slate-300 mb-6">
            Your complaint has been safely recorded in the municipal queue.
          </p>

          <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-700/80 mb-6 text-left space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Ticket ID:</span>
              <span className="text-brand-400 font-bold text-sm">{createdReport.reportId}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Damage Type:</span>
              <span className="text-slate-200 capitalize font-sans">{createdReport.damageType.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Initial Verification Status:</span>
              <span className="text-amber-400 font-bold font-sans">{createdReport.verificationStatus}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Location Coordinates:</span>
              <span className="text-slate-200">{createdReport.rawLocation?.coordinates[1]?.toFixed(5)}, {createdReport.rawLocation?.coordinates[0]?.toFixed(5)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Initial Evidence Score:</span>
              <span className="text-emerald-400 font-bold">{createdReport.evidenceConsistencyScore} / 100</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/my-reports"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-lg shadow-brand-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>View in My Reports</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => {
                setCreatedReport(null);
                setPhotoFile(null);
                setPhotoPreview(null);
                setDescription('');
                setManualAddress('');
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Submit Another Report
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
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-brand-400 mb-1">
          <ShieldAlert className="w-4 h-4" />
          <span>Citizen Portal • Problem Statement #13</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Report Road Defect or Hazard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Provide accurate photo evidence and location. Raw reports start as{' '}
          <strong className="text-amber-400 font-mono">UNVERIFIED</strong> until corroborated.
        </p>
      </div>

      {submitError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div>{submitError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Photo Evidence Upload */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-400" />
            <span>1. Defect Photo Evidence</span>
            <span className="text-rose-400 text-xs">*Required</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Upload a clear photo. EXIF GPS metadata will be extracted automatically if available.
          </p>

          {photoPreview ? (
            <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-700 group">
              <img src={photoPreview} alt="Defect preview" className="w-full h-64 object-cover" />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-3 right-3 p-2 bg-slate-950/80 hover:bg-rose-600 text-white rounded-full transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-3 right-3 glass-panel px-3 py-1.5 rounded-lg text-[11px] text-slate-200">
                {photoFile?.name} ({(photoFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-all text-center">
              <Upload className="w-10 h-10 text-slate-400 mb-2" />
              <span className="text-sm font-semibold text-slate-200">Click to upload photo evidence</span>
              <span className="text-xs text-slate-500 mt-1">JPEG, PNG, or WebP up to 5MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          {photoError && (
            <p className="text-xs text-rose-400 mt-2 font-medium">{photoError}</p>
          )}
        </div>

        {/* Step 2: Defect Classification */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h2 className="text-base font-bold text-white mb-3">2. Damage Classification & Severity</h2>

          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Damage Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DAMAGE_TYPES.map((dt) => (
                <button
                  key={dt.id}
                  type="button"
                  onClick={() => setDamageType(dt.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    damageType === dt.id
                      ? 'border-brand-500 bg-brand-500/10 text-white shadow-md shadow-brand-500/10'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="block text-xs font-bold">{dt.label}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{dt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Estimated Severity
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SEVERITIES.map((sev) => (
                <button
                  key={sev.id}
                  type="button"
                  onClick={() => setSeverity(sev.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    severity === sev.id
                      ? sev.color + ' ring-1 ring-current'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="block text-xs font-bold">{sev.label}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{sev.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 3: Location Verification (GPS & Interactive Map) */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-400" />
                <span>3. Location Pin & Verification</span>
              </h2>
              <p className="text-xs text-slate-400">
                Reported location is never automatically treated as verified location.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gpsLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
            >
              <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>{gpsLoading ? 'Detecting GPS...' : 'Use My Current Location'}</span>
            </button>
          </div>

          {gpsMessage && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                gpsMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
              }`}
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>{gpsMessage.text}</span>
            </div>
          )}

          {/* Interactive Draggable Leaflet Map */}
          <div className="mb-4">
            <LocationPickerMap
              latitude={latitude}
              longitude={longitude}
              onLocationChange={handleLocationChange}
              height="340px"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Exact Coordinates
              </label>
              <input
                type="text"
                readOnly
                value={`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Street / Landmark Description (Optional)
              </label>
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="e.g. Near Metro Pillar 142, Ring Road"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Description */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h2 className="text-base font-bold text-white mb-2">4. Defect Description & Road Context</h2>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the depth, lane affected, any nearby vehicular swerving, or water accumulation..."
            className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder-slate-500"
          />
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-xl shadow-brand-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Submit Complaint</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
