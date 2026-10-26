import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

// Create a modern custom SVG map pin to avoid Leaflet broken asset paths
const createCustomPin = (color = '#2563eb') => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="position: relative; transform: translate(-50%, -100%);">
        <div style="
          width: 32px;
          height: 32px;
          background: ${color};
          border: 2px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

// Component to handle map clicks and marker repositioning
function MapClickHandler({ onLocationChange }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to fly/pan map when coordinates update
function MapViewUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onLocationChange,
  isDraggable = true,
  height = '320px',
}) {
  const markerRef = useRef(null);

  // Default to city center (e.g. New Delhi / Metro coordinates: 28.6139, 77.2090) if none provided
  const center = useMemo(() => {
    const lat = latitude != null && !isNaN(latitude) ? latitude : 28.6139;
    const lng = longitude != null && !isNaN(longitude) ? longitude : 77.2090;
    return [lat, lng];
  }, [latitude, longitude]);

  const customIcon = useMemo(() => createCustomPin('#2563eb'), []);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onLocationChange(lat, lng);
        }
      },
    }),
    [onLocationChange]
  );

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-700/80 shadow-inner" style={{ height }}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewUpdater center={center} />
        {isDraggable && <MapClickHandler onLocationChange={onLocationChange} />}

        <Marker
          draggable={isDraggable}
          eventHandlers={eventHandlers}
          position={center}
          ref={markerRef}
          icon={customIcon}
        />
      </MapContainer>

      {/* Floating Coordinate Pill */}
      <div className="absolute bottom-3 left-3 z-[1000] glass-panel px-3 py-1.5 rounded-lg text-xs font-mono text-slate-200 border border-slate-700/80 shadow-lg pointer-events-none flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-brand-400" />
        <span>
          {center[0].toFixed(5)}, {center[1].toFixed(5)}
        </span>
      </div>

      {isDraggable && (
        <div className="absolute top-3 right-3 z-[1000] glass-panel px-2.5 py-1 rounded-md text-[11px] text-slate-300 border border-slate-700/80 shadow pointer-events-none">
          Click or drag pin to adjust defect location
        </div>
      )}
    </div>
  );
}
