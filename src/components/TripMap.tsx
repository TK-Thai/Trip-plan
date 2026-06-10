"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
export interface MapActivity {
  id: number;
  time: string;
  title: string;
  category: string;
  locationName: string;
  lat: number;
  lng: number;
  dayNumber?: number;
}

interface TripMapProps {
  activities: MapActivity[];
}

/* ------------------------------------------------------------------ */
/* Category → Color                                                   */
/* ------------------------------------------------------------------ */
const CATEGORY_COLORS: Record<string, string> = {
  accommodation: "#a78bfa",
  food: "#fb923c",
  sightseeing: "#34d399",
  transport: "#60a5fa",
  shopping: "#f472b6",
  activity: "#fbbf24",
  ticket: "#c084fc",
  other: "#94a3b8",
};

const CATEGORY_EMOJI: Record<string, string> = {
  accommodation: "🏨",
  food: "🍜",
  sightseeing: "🏛️",
  transport: "🚗",
  shopping: "🛍️",
  activity: "🎯",
  ticket: "🎫",
  other: "📦",
};

/* ------------------------------------------------------------------ */
/* Custom DivIcon (avoids broken default marker images)               */
/* ------------------------------------------------------------------ */
function createCategoryIcon(category: string) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  const emoji = CATEGORY_EMOJI[category] || "📍";

  return L.divIcon({
    className: "custom-map-marker",
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        background: ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(-45deg);
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        border: 2px solid rgba(255,255,255,0.3);
      ">
        <span style="transform: rotate(45deg); font-size: 16px; line-height: 1;">${emoji}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

/* ------------------------------------------------------------------ */
/* Auto-fit bounds                                                    */
/* ------------------------------------------------------------------ */
function FitBounds({ activities }: { activities: MapActivity[] }) {
  const map = useMap();

  useEffect(() => {
    if (activities.length === 0) {
      map.setView([15.87, 100.99], 6);
      return;
    }

    const bounds = L.latLngBounds(
      activities.map((a) => [a.lat, a.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [activities, map]);

  return null;
}

/* ------------------------------------------------------------------ */
/* TripMap Component                                                  */
/* ------------------------------------------------------------------ */
export default function TripMap({ activities }: TripMapProps) {
  /* polyline coords */
  const polylinePositions = useMemo(
    () => activities.map((a) => [a.lat, a.lng] as [number, number]),
    [activities]
  );

  return (
    <MapContainer
      center={[15.87, 100.99]}
      zoom={6}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--border-radius-md)",
        minHeight: 400,
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <FitBounds activities={activities} />

      {/* Polyline connecting activities in order */}
      {polylinePositions.length > 1 && (
        <Polyline
          positions={polylinePositions}
          pathOptions={{
            color: "#FF6B35",
            weight: 3,
            opacity: 0.6,
            dashArray: "8, 8",
          }}
        />
      )}

      {/* Markers */}
      {activities.map((act) => (
        <Marker
          key={act.id}
          position={[act.lat, act.lng]}
          icon={createCategoryIcon(act.category)}
        >
          <Popup>
            <div
              style={{
                fontFamily: "var(--font-prompt), sans-serif",
                minWidth: 160,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  marginBottom: 4,
                  color: "#1a1a2e",
                }}
              >
                {CATEGORY_EMOJI[act.category] || "📍"} {act.title}
              </div>
              {act.time && (
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  🕐 {act.time}
                </div>
              )}
              {act.locationName && (
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  📍 {act.locationName}
                </div>
              )}
              {act.dayNumber && (
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Day {act.dayNumber}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
