"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MapPin,
  Calendar,
  Users,
  Plane,
  X,
  Trash2,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
interface Trip {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  memberCount?: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000) + 1);
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  /* fetch trips */
  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trips");
      if (res.ok) {
        const data = await res.json();
        setTrips(data);
      }
    } catch {
      /* API not ready yet */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  return (
    <div style={styles.page}>
      {/* ---- Hero ---- */}
      <header style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroIcon}>
            <Plane size={38} color="#FF6B35" />
          </div>
          <h1 style={styles.heroTitle}>วางแผนทริปท่องเที่ยว</h1>
          <p style={styles.heroSub}>
            จัดการเส้นทาง กิจกรรม และค่าใช้จ่ายสำหรับทริปท่องเที่ยวไทย
          </p>
          <button
            id="btn-create-trip"
            className="btn btn-primary btn-lg"
            style={{ marginTop: 24 }}
            onClick={() => setShowModal(true)}
          >
            <Plus size={20} />
            สร้างทริปใหม่
          </button>
        </div>
      </header>

      {/* ---- Trip Grid ---- */}
      <main style={styles.main}>
        <div style={styles.sectionHeader}>
          <h2>ทริปทั้งหมด</h2>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {trips.length} ทริป
          </span>
        </div>

        {loading ? (
          <div style={styles.grid} className="stagger">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={styles.skeletonCard} />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div style={styles.emptyState} className="animate-fade-in">
            <MapPin size={48} color="var(--text-muted)" />
            <p style={{ color: "var(--text-muted)", marginTop: 12 }}>
              ยังไม่มีทริป — เริ่มสร้างทริปแรกของคุณ!
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} />
              สร้างทริปใหม่
            </button>
          </div>
        ) : (
          <div style={styles.grid} className="stagger">
            {trips.map((trip) => (
              <article
                key={trip.id}
                className="card card-clickable animate-slide-up"
                style={styles.tripCard}
                onClick={() => router.push(`/trip/${trip.id}`)}
                id={`trip-card-${trip.id}`}
              >
                <div style={styles.cardAccent} />
                <h3 style={styles.cardTitle}>{trip.name}</h3>
                {trip.description && (
                  <p style={styles.cardDesc}>{trip.description}</p>
                )}
                <div style={styles.cardMeta}>
                  <span style={styles.metaItem}>
                    <Calendar size={14} />
                    {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
                  </span>
                  <span style={styles.metaItem}>
                    <MapPin size={14} />
                    {daysBetween(trip.startDate, trip.endDate)} วัน
                  </span>
                  {trip.memberCount !== undefined && (
                    <span style={styles.metaItem}>
                      <Users size={14} />
                      {trip.memberCount} คน
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* ---- Create Modal ---- */}
      {showModal && (
        <CreateTripModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            loadTrips();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create Trip Modal                                                  */
/* ------------------------------------------------------------------ */
function CreateTripModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [members, setMembers] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  const addMember = () => setMembers([...members, ""]);
  const removeMember = (idx: number) =>
    setMembers(members.filter((_, i) => i !== idx));
  const updateMember = (idx: number, val: string) =>
    setMembers(members.map((m, i) => (i === idx ? val : m)));

  const handleSubmit = async () => {
    if (!name.trim() || !startDate || !endDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          startDate,
          endDate,
          members: members.filter((m) => m.trim()),
        }),
      });
      if (res.ok) onCreated();
    } catch {
      /* API not ready */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="create-trip-modal">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🌴 สร้างทริปใหม่</h2>
          <button className="btn-icon" onClick={onClose} id="btn-close-modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="trip-name">
              ชื่อทริป
            </label>
            <input
              id="trip-name"
              className="form-input"
              placeholder="เช่น ทริปเชียงใหม่ 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="trip-description">
              รายละเอียด
            </label>
            <textarea
              id="trip-description"
              className="form-textarea"
              placeholder="รายละเอียดทริป (ไม่บังคับ)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Dates */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="trip-start-date">
                วันเริ่ม
              </label>
              <input
                id="trip-start-date"
                className="form-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="trip-end-date">
                วันสิ้นสุด
              </label>
              <input
                id="trip-end-date"
                className="form-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Members */}
          <div className="form-group">
            <label className="form-label">สมาชิก</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((m, idx) => (
                <div
                  key={idx}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <input
                    className="form-input"
                    placeholder={`สมาชิกคนที่ ${idx + 1}`}
                    value={m}
                    onChange={(e) => updateMember(idx, e.target.value)}
                    id={`member-input-${idx}`}
                  />
                  {members.length > 1 && (
                    <button
                      className="btn-icon"
                      onClick={() => removeMember(idx)}
                      title="ลบสมาชิก"
                      id={`btn-remove-member-${idx}`}
                    >
                      <Trash2 size={16} color="var(--color-danger)" />
                    </button>
                  )}
                </div>
              ))}
              <button
                className="btn btn-secondary btn-sm"
                onClick={addMember}
                style={{ alignSelf: "flex-start" }}
                id="btn-add-member"
              >
                <Plus size={16} />
                เพิ่มสมาชิก
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            ยกเลิก
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!name.trim() || !startDate || !endDate || saving}
            id="btn-submit-trip"
          >
            {saving ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
            สร้างทริป
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline styles (layout-only, theme via CSS vars)                    */
/* ------------------------------------------------------------------ */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
  },
  hero: {
    background: "var(--bg-dark)",
    borderBottom: "1px solid var(--border-color)",
    padding: "60px 24px 52px",
    textAlign: "center",
  },
  heroInner: {
    maxWidth: 600,
    margin: "0 auto",
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "#fae8ff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    border: "2px solid #fdf4ff",
  },
  heroTitle: {
    fontSize: "2.4rem",
    fontWeight: 700,
    background: "var(--accent-gradient)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: 8,
  },
  heroSub: {
    color: "var(--text-secondary)",
    fontSize: "1.1rem",
    maxWidth: 440,
    margin: "0 auto",
    lineHeight: 1.7,
  },
  main: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "40px 24px 80px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 20,
  },
  tripCard: {
    position: "relative",
    overflow: "hidden",
    padding: "24px 24px 20px",
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "var(--accent-gradient)",
  },
  cardTitle: {
    fontSize: "1.2rem",
    marginBottom: 6,
  },
  cardDesc: {
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    marginBottom: 14,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 8,
  },
  metaItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: "0.85rem",
    color: "var(--text-muted)",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 24px",
    textAlign: "center",
  },
  skeletonCard: {
    height: 160,
    borderRadius: "var(--border-radius-lg)",
  },
};
