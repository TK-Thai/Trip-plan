"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Calendar,
  MapPin,
  Wallet,
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Users,
  Loader2,
  ArrowRight,
  Share2,
  CheckCheck,
} from "lucide-react";
import type { MapActivity } from "@/components/TripMap";
import {
  calculateSettlements,
  calculateBalances,
  type ExpenseEntry,
} from "@/lib/settlement";

/* ========== Dynamic map (SSR off) ========== */
const TripMap = dynamic(() => import("@/components/TripMap"), { ssr: false });

/* ========== Types ========== */
interface Member {
  id: number;
  name: string;
  color: string;
}
interface Day {
  id: number;
  dayNumber: number;
  date: string;
  title: string;
}
interface Activity {
  id: number;
  dayId: number;
  sortOrder: number;
  time: string;
  title: string;
  description: string;
  category: string;
  lat: number | null;
  lng: number | null;
  locationName: string;
}
interface Expense {
  id: number;
  tripId: number;
  dayId: number | null;
  description: string;
  amount: number;
  category: string;
  paidById: number;
  createdAt: string;
  splits: { memberId: number; shareAmount: number }[];
}
interface TripFull {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  members: Member[];
  days: Day[];
  activities: Activity[];
  expenses: Expense[];
}

/* ========== Constants ========== */
const ACTIVITY_CATEGORIES = [
  { value: "accommodation", label: "🏨 ที่พัก", color: "#a78bfa" },
  { value: "food", label: "🍜 อาหาร", color: "#fb923c" },
  { value: "sightseeing", label: "🏛️ ท่องเที่ยว", color: "#34d399" },
  { value: "transport", label: "🚗 เดินทาง", color: "#60a5fa" },
  { value: "shopping", label: "🛍️ ช้อปปิ้ง", color: "#f472b6" },
  { value: "activity", label: "🎯 กิจกรรม", color: "#fbbf24" },
];

const EXPENSE_CATEGORIES = [
  { value: "food", label: "🍜 อาหาร" },
  { value: "transport", label: "🚗 เดินทาง" },
  { value: "accommodation", label: "🏨 ที่พัก" },
  { value: "ticket", label: "🎫 ตั๋ว" },
  { value: "shopping", label: "🛍️ ช้อปปิ้ง" },
  { value: "other", label: "📦 อื่นๆ" },
];

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

const CATEGORY_COLOR: Record<string, string> = {
  accommodation: "#a78bfa",
  food: "#fb923c",
  sightseeing: "#34d399",
  transport: "#60a5fa",
  shopping: "#f472b6",
  activity: "#fbbf24",
  ticket: "#c084fc",
  other: "#94a3b8",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatNumber(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/* ================================================================== */
/* MAIN PAGE                                                          */
/* ================================================================== */
export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<TripFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"itinerary" | "map" | "expenses">(
    "itinerary"
  );
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);

  /* Modal state */
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  /* Share Link */
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  /* Fetch full trip data */
  const loadTrip = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/full`);
      if (res.ok) {
        const data: TripFull = await res.json();
        setTrip(data);
        if (data.days.length > 0 && !selectedDayId) {
          setSelectedDayId(data.days[0].id);
        }
      }
    } catch {
      /* API not ready */
    } finally {
      setLoading(false);
    }
  }, [tripId, selectedDayId]);

  useEffect(() => {
    loadTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  /* Derived */
  const currentDay = trip?.days.find((d) => d.id === selectedDayId) ?? null;
  const dayActivities = useMemo(
    () =>
      trip?.activities
        .filter((a) => a.dayId === selectedDayId)
        .sort((a, b) => {
          if (a.time && b.time) return a.time.localeCompare(b.time);
          return a.sortOrder - b.sortOrder;
        }) ?? [],
    [trip, selectedDayId]
  );

  /* ---- CRUD handlers ---- */
  const deleteActivity = async (id: number) => {
    if (!confirm("ลบกิจกรรมนี้?")) return;
    await fetch(`/api/activities?id=${id}`, {
      method: "DELETE",
    });
    loadTrip();
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("ลบค่าใช้จ่ายนี้?")) return;
    await fetch(`/api/expenses?id=${id}`, {
      method: "DELETE",
    });
    loadTrip();
  };

  /* ---- Loading state ---- */
  if (loading && !trip) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={36} color="var(--accent-primary)" style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)", marginTop: 12 }}>กำลังโหลด...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={styles.loadingContainer}>
        <p style={{ color: "var(--text-muted)" }}>ไม่พบทริป</p>
        <button className="btn btn-primary" onClick={() => router.push("/")}>
          กลับหน้าแรก
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* ===== HEADER ===== */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              className="btn-icon"
              onClick={() => router.push("/")}
              id="btn-back"
              title="กลับ"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 style={styles.headerTitle}>{trip.name}</h1>
              <div style={styles.headerMeta}>
                <span style={styles.metaChip}>
                  <Calendar size={14} />
                  {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
                </span>
                <span style={styles.metaChip}>
                  <Users size={14} />
                  {trip.members.length} คน
                </span>
              </div>
            </div>
          </div>
          
          {/* Share Button */}
          <button 
            className="btn btn-secondary" 
            onClick={handleShare}
            style={{ 
              backgroundColor: copied ? "var(--color-success)" : undefined,
              color: copied ? "white" : undefined,
              borderColor: copied ? "var(--color-success)" : undefined,
              minWidth: 140
            }}
            id="btn-share-trip"
          >
            {copied ? <CheckCheck size={18} /> : <Share2 size={18} />}
            {copied ? "คัดลอกลิงก์แล้ว!" : "แชร์ทริป"}
          </button>
        </div>
      </header>

      {/* ===== TABS ===== */}
      <div style={styles.tabBar}>
        <div className="tabs" style={{ maxWidth: 560, margin: "0 auto" }}>
          <button
            className={`tab ${activeTab === "itinerary" ? "active" : ""}`}
            onClick={() => setActiveTab("itinerary")}
            id="tab-itinerary"
          >
            <Calendar size={18} />
            แผนการเดินทาง
          </button>
          <button
            className={`tab ${activeTab === "map" ? "active" : ""}`}
            onClick={() => setActiveTab("map")}
            id="tab-map"
          >
            <MapPin size={18} />
            แผนที่
          </button>
          <button
            className={`tab ${activeTab === "expenses" ? "active" : ""}`}
            onClick={() => setActiveTab("expenses")}
            id="tab-expenses"
          >
            <Wallet size={18} />
            ค่าใช้จ่าย
          </button>
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <main style={styles.content}>
        {activeTab === "itinerary" && (
          <ItineraryTab
            days={trip.days}
            activities={dayActivities}
            selectedDayId={selectedDayId}
            currentDay={currentDay}
            onSelectDay={setSelectedDayId}
            onAddActivity={() => {
              setEditingActivity(null);
              setShowActivityModal(true);
            }}
            onEditActivity={(a) => {
              setEditingActivity(a);
              setShowActivityModal(true);
            }}
            onDeleteActivity={deleteActivity}
          />
        )}

        {activeTab === "map" && (
          <MapTab
            trip={trip}
            selectedDayId={selectedDayId}
            onSelectDay={setSelectedDayId}
          />
        )}

        {activeTab === "expenses" && (
          <ExpensesTab
            trip={trip}
            onAddExpense={() => {
              setEditingExpense(null);
              setShowExpenseModal(true);
            }}
            onEditExpense={(e) => {
              setEditingExpense(e);
              setShowExpenseModal(true);
            }}
            onDeleteExpense={deleteExpense}
          />
        )}
      </main>

      {/* ===== MODALS ===== */}
      {showActivityModal && (
        <ActivityModal
          tripId={trip.id}
          dayId={selectedDayId!}
          days={trip.days}
          activity={editingActivity}
          onClose={() => {
            setShowActivityModal(false);
            setEditingActivity(null);
          }}
          onSaved={() => {
            setShowActivityModal(false);
            setEditingActivity(null);
            loadTrip();
          }}
        />
      )}

      {showExpenseModal && (
        <ExpenseModal
          tripId={trip.id}
          members={trip.members}
          days={trip.days}
          expense={editingExpense}
          onClose={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
          }}
          onSaved={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
            loadTrip();
          }}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/* TAB 1 — ITINERARY                                                  */
/* ================================================================== */
function ItineraryTab({
  days,
  activities,
  selectedDayId,
  currentDay,
  onSelectDay,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
}: {
  days: Day[];
  activities: Activity[];
  selectedDayId: number | null;
  currentDay: Day | null;
  onSelectDay: (id: number) => void;
  onAddActivity: () => void;
  onEditActivity: (a: Activity) => void;
  onDeleteActivity: (id: number) => void;
}) {
  return (
    <div style={styles.itineraryLayout}>
      {/* Day sidebar */}
      <aside style={styles.daySidebar}>
        <h3 style={styles.sidebarTitle}>📅 วันทั้งหมด</h3>
        <div style={styles.dayList}>
          {days.map((day) => (
            <button
              key={day.id}
              style={{
                ...styles.dayButton,
                ...(day.id === selectedDayId ? styles.dayButtonActive : {}),
              }}
              onClick={() => onSelectDay(day.id)}
              id={`day-btn-${day.id}`}
            >
              <div style={styles.dayBtnNumber}>Day {day.dayNumber}</div>
              <div style={styles.dayBtnDate}>{formatDate(day.date)}</div>
              {day.title && (
                <div style={styles.dayBtnTitle}>{day.title}</div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main timeline area */}
      <section style={styles.timelineArea}>
        {currentDay ? (
          <>
            <div style={styles.timelineHeader}>
              <div>
                <h2 style={{ fontSize: "1.3rem" }}>
                  Day {currentDay.dayNumber} — {formatDate(currentDay.date)}
                </h2>
                {currentDay.title && (
                  <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
                    {currentDay.title}
                  </p>
                )}
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={onAddActivity}
                id="btn-add-activity"
              >
                <Plus size={16} />
                เพิ่มกิจกรรม
              </button>
            </div>

            {activities.length === 0 ? (
              <div style={styles.emptyTimeline} className="animate-fade-in">
                <Clock size={36} color="var(--text-muted)" />
                <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
                  ยังไม่มีกิจกรรมในวันนี้
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 12 }}
                  onClick={onAddActivity}
                >
                  <Plus size={16} />
                  เพิ่มกิจกรรม
                </button>
              </div>
            ) : (
              <div style={styles.timeline} className="stagger">
                {activities.map((act, idx) => (
                  <div
                    key={act.id}
                    style={styles.timelineItem}
                    className="animate-slide-right"
                    id={`activity-${act.id}`}
                  >
                    {/* Connector */}
                    <div style={styles.connector}>
                      <div
                        style={{
                          ...styles.connectorDot,
                          background:
                            CATEGORY_COLOR[act.category] || CATEGORY_COLOR.other,
                        }}
                      />
                      {idx < activities.length - 1 && (
                        <div style={styles.connectorLine} />
                      )}
                    </div>

                    {/* Card */}
                    <div style={styles.activityCard} className="card">
                      <div style={styles.actCardHeader}>
                        <div style={styles.actCardLeft}>
                          <span
                            style={{
                              ...styles.catBadge,
                              color:
                                CATEGORY_COLOR[act.category] ||
                                CATEGORY_COLOR.other,
                              background: `${CATEGORY_COLOR[act.category] || CATEGORY_COLOR.other}18`,
                            }}
                          >
                            {CATEGORY_EMOJI[act.category] || "📍"}{" "}
                            {ACTIVITY_CATEGORIES.find(
                              (c) => c.value === act.category
                            )?.label.split(" ")[1] || act.category}
                          </span>
                          {act.time && (
                            <span style={styles.actTime}>
                              <Clock size={13} /> {act.time}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            className="btn-icon"
                            onClick={() => onEditActivity(act)}
                            title="แก้ไข"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => onDeleteActivity(act.id)}
                            title="ลบ"
                          >
                            <Trash2 size={15} color="var(--color-danger)" />
                          </button>
                        </div>
                      </div>
                      <h4 style={{ marginTop: 8, fontSize: "1.05rem" }}>
                        {act.title}
                      </h4>
                      {act.description && (
                        <p
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.9rem",
                            marginTop: 4,
                            lineHeight: 1.5,
                          }}
                        >
                          {act.description}
                        </p>
                      )}
                      {act.locationName && (
                        <div style={styles.actLocation}>
                          <MapPin size={13} />
                          {act.locationName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={styles.emptyTimeline}>
            <p style={{ color: "var(--text-muted)" }}>เลือกวันจากด้านซ้าย</p>
          </div>
        )}
      </section>
    </div>
  );
}

/* ================================================================== */
/* TAB 2 — MAP                                                        */
/* ================================================================== */
function MapTab({
  trip,
  selectedDayId,
  onSelectDay,
}: {
  trip: TripFull;
  selectedDayId: number | null;
  onSelectDay: (id: number | null) => void;
}) {
  const [mapDayFilter, setMapDayFilter] = useState<number | null>(null);

  const mapActivities: MapActivity[] = useMemo(() => {
    const filtered = mapDayFilter
      ? trip.activities.filter((a) => a.dayId === mapDayFilter)
      : trip.activities;

    return filtered
      .filter((a) => a.lat != null && a.lng != null)
      .map((a) => ({
        id: a.id,
        time: a.time,
        title: a.title,
        category: a.category,
        locationName: a.locationName,
        lat: a.lat!,
        lng: a.lng!,
        dayNumber: trip.days.find((d) => d.id === a.dayId)?.dayNumber,
      }));
  }, [trip, mapDayFilter]);

  return (
    <div style={styles.mapTab} className="animate-fade-in">
      {/* Day filter bar */}
      <div style={styles.mapDayBar}>
        <button
          className={`btn btn-sm ${mapDayFilter === null ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setMapDayFilter(null)}
          id="map-filter-all"
        >
          ทั้งหมด
        </button>
        {trip.days.map((d) => (
          <button
            key={d.id}
            className={`btn btn-sm ${mapDayFilter === d.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMapDayFilter(d.id)}
            id={`map-filter-day-${d.id}`}
          >
            Day {d.dayNumber}
          </button>
        ))}
      </div>

      {/* Map */}
      <div style={styles.mapWrapper}>
        <TripMap activities={mapActivities} />
      </div>

      {mapActivities.length === 0 && (
        <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: 16 }}>
          ไม่มีกิจกรรมที่มีพิกัดสถานที่
        </p>
      )}
    </div>
  );
}

/* ================================================================== */
/* TAB 3 — EXPENSES                                                   */
/* ================================================================== */
function ExpensesTab({
  trip,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}: {
  trip: TripFull;
  onAddExpense: () => void;
  onEditExpense: (e: Expense) => void;
  onDeleteExpense: (id: number) => void;
}) {
  /* Totals */
  const totalExpense = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const perPerson =
    trip.members.length > 0 ? totalExpense / trip.members.length : 0;

  /* Per-member paid */
  const memberPaidMap = useMemo(() => {
    const m: Record<number, number> = {};
    for (const e of trip.expenses) {
      m[e.paidById] = (m[e.paidById] || 0) + e.amount;
    }
    return m;
  }, [trip.expenses]);

  /* Settlement calculations */
  const expenseEntries: ExpenseEntry[] = useMemo(
    () =>
      trip.expenses.map((e) => ({
        amount: e.amount,
        paidById: e.paidById,
        splits: e.splits,
      })),
    [trip.expenses]
  );

  const memberList = useMemo(
    () => trip.members.map((m) => ({ id: m.id, name: m.name })),
    [trip.members]
  );

  const balances = useMemo(
    () => calculateBalances(expenseEntries, memberList),
    [expenseEntries, memberList]
  );

  const settlements = useMemo(
    () => calculateSettlements(expenseEntries, memberList),
    [expenseEntries, memberList]
  );

  return (
    <div style={styles.expenseTab} className="animate-fade-in">
      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <div style={{ ...styles.summaryCard, borderLeftColor: "#FF6B35" }}>
          <div style={styles.summaryLabel}>ค่าใช้จ่ายทั้งหมด</div>
          <div style={styles.summaryValue}>฿{formatNumber(totalExpense)}</div>
        </div>
        <div style={{ ...styles.summaryCard, borderLeftColor: "#0ea5e9" }}>
          <div style={styles.summaryLabel}>เฉลี่ยต่อคน</div>
          <div style={styles.summaryValue}>฿{formatNumber(perPerson)}</div>
        </div>
        <div style={{ ...styles.summaryCard, borderLeftColor: "#22c55e" }}>
          <div style={styles.summaryLabel}>จำนวนรายการ</div>
          <div style={styles.summaryValue}>{trip.expenses.length}</div>
        </div>
      </div>

      {/* Add expense button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          className="btn btn-primary"
          onClick={onAddExpense}
          id="btn-add-expense"
        >
          <Plus size={18} />
          เพิ่มค่าใช้จ่าย
        </button>
      </div>

      {/* Expense Table */}
      {trip.expenses.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>รายการ</th>
                <th>จำนวน</th>
                <th>หมวด</th>
                <th>จ่ายโดย</th>
                <th>แบ่งกับ</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {trip.expenses.map((exp) => {
                const payer = trip.members.find(
                  (m) => m.id === exp.paidById
                );
                const splitNames = exp.splits
                  .map((s) => trip.members.find((m) => m.id === s.memberId)?.name)
                  .filter(Boolean);
                return (
                  <tr key={exp.id} id={`expense-row-${exp.id}`}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{exp.description}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--accent-primary)" }}>
                      ฿{formatNumber(exp.amount)}
                    </td>
                    <td>
                      <span className="badge badge-accent">
                        {CATEGORY_EMOJI[exp.category] || "📦"}{" "}
                        {EXPENSE_CATEGORIES.find((c) => c.value === exp.category)
                          ?.label.split(" ")[1] || exp.category}
                      </span>
                    </td>
                    <td>{payer?.name || "—"}</td>
                    <td>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {splitNames.length === trip.members.length
                          ? "ทุกคน"
                          : splitNames.join(", ")}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn-icon"
                          onClick={() => onEditExpense(exp)}
                          title="แก้ไข"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => onDeleteExpense(exp.id)}
                          title="ลบ"
                        >
                          <Trash2 size={15} color="var(--color-danger)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.emptyTimeline} className="animate-fade-in">
          <Wallet size={36} color="var(--text-muted)" />
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
            ยังไม่มีค่าใช้จ่าย
          </p>
        </div>
      )}

      {/* ===== SETTLEMENT SECTION ===== */}
      {trip.expenses.length > 0 && (
        <section style={styles.settlementSection}>
          <h3 style={{ marginBottom: 20 }}>
            💰 สรุปยอด — ใครต้องจ่ายใคร
          </h3>

          {/* Per-person balances */}
          <div style={styles.balanceGrid}>
            {balances.map((b) => (
              <div
                key={b.memberId}
                style={{
                  ...styles.balanceCard,
                  borderLeftColor:
                    b.netBalance > 0
                      ? "var(--color-success)"
                      : b.netBalance < 0
                        ? "var(--color-danger)"
                        : "var(--border-color)",
                }}
                id={`balance-${b.memberId}`}
              >
                <div style={styles.balanceName}>{b.name}</div>
                <div style={styles.balanceRow}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    จ่ายไป
                  </span>
                  <span style={{ fontWeight: 500 }}>
                    ฿{formatNumber(b.totalPaid)}
                  </span>
                </div>
                <div style={styles.balanceRow}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    ส่วนที่ต้องจ่าย
                  </span>
                  <span style={{ fontWeight: 500 }}>
                    ฿{formatNumber(b.totalOwed)}
                  </span>
                </div>
                <div
                  style={{
                    ...styles.balanceRow,
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: 8,
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>ยอดสุทธิ</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        b.netBalance > 0
                          ? "var(--color-success)"
                          : b.netBalance < 0
                            ? "var(--color-danger)"
                            : "var(--text-primary)",
                    }}
                  >
                    {b.netBalance > 0 ? "+" : ""}฿{formatNumber(b.netBalance)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Settlement transactions */}
          {settlements.length > 0 && (
            <div style={styles.settlementsBox}>
              <h4 style={{ marginBottom: 14, color: "var(--text-secondary)" }}>
                การชำระเงิน ({settlements.length} รายการ)
              </h4>
              <div style={styles.settlementsList}>
                {settlements.map((s, i) => (
                  <div
                    key={i}
                    style={styles.settlementRow}
                    className="animate-slide-up"
                    id={`settlement-${i}`}
                  >
                    <span style={styles.settlementPerson}>{s.fromName}</span>
                    <ArrowRight
                      size={18}
                      color="var(--accent-primary)"
                      style={{ flexShrink: 0 }}
                    />
                    <span style={styles.settlementPerson}>{s.toName}</span>
                    <span style={styles.settlementAmount}>
                      ฿{formatNumber(s.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ================================================================== */
/* ACTIVITY MODAL                                                     */
/* ================================================================== */
function ActivityModal({
  tripId,
  dayId,
  days,
  activity,
  onClose,
  onSaved,
}: {
  tripId: number;
  dayId: number;
  days: Day[];
  activity: Activity | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedDayId, setSelectedDayId] = useState(activity?.dayId ?? dayId);
  const [time, setTime] = useState(activity?.time ?? "");
  const [title, setTitle] = useState(activity?.title ?? "");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [category, setCategory] = useState(activity?.category ?? "sightseeing");
  const [locationName, setLocationName] = useState(activity?.locationName ?? "");
  const [lat, setLat] = useState(activity?.lat?.toString() ?? "");
  const [lng, setLng] = useState(activity?.lng?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const isEdit = !!activity;

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const payload = {
      ...(isEdit ? { id: activity.id } : {}),
      dayId: selectedDayId,
      time,
      title: title.trim(),
      description: description.trim(),
      category,
      locationName: locationName.trim(),
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      sortOrder: activity?.sortOrder ?? 0,
    };

    try {
      await fetch("/api/activities", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSaved();
    } catch {
      /* API not ready */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="activity-modal">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? "✏️ แก้ไขกิจกรรม" : "📌 เพิ่มกิจกรรม"}</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {/* Day selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="act-day">วัน</label>
            <select
              id="act-day"
              className="form-select"
              value={selectedDayId}
              onChange={(e) => setSelectedDayId(Number(e.target.value))}
            >
              {days.map((d) => (
                <option key={d.id} value={d.id}>
                  Day {d.dayNumber} — {formatDate(d.date)}
                </option>
              ))}
            </select>
          </div>

          {/* Time + Category */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="act-time">เวลา</label>
              <input
                id="act-time"
                className="form-input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="act-category">หมวดหมู่</label>
              <select
                id="act-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {ACTIVITY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="act-title">ชื่อกิจกรรม</label>
            <input
              id="act-title"
              className="form-input"
              placeholder="เช่น เช็คอินโรงแรม"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="act-desc">รายละเอียด</label>
            <textarea
              id="act-desc"
              className="form-textarea"
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="form-label" htmlFor="act-location">สถานที่</label>
            <input
              id="act-location"
              className="form-input"
              placeholder="ชื่อสถานที่"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="act-lat">Latitude</label>
              <input
                id="act-lat"
                className="form-input"
                type="number"
                step="any"
                placeholder="เช่น 18.7883"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="act-lng">Longitude</label>
              <input
                id="act-lng"
                className="form-input"
                type="number"
                step="any"
                placeholder="เช่น 98.9853"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
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
            disabled={!title.trim() || saving}
            id="btn-save-activity"
          >
            {saving ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Plus size={18} />
            )}
            {isEdit ? "บันทึก" : "เพิ่มกิจกรรม"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* EXPENSE MODAL                                                      */
/* ================================================================== */
function ExpenseModal({
  tripId,
  members,
  days,
  expense,
  onClose,
  onSaved,
}: {
  tripId: number;
  members: Member[];
  days: Day[];
  expense: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!expense;

  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? "");
  const [category, setCategory] = useState(expense?.category ?? "food");
  const [paidById, setPaidById] = useState<number>(
    expense?.paidById ?? members[0]?.id ?? 0
  );
  const [dayId, setDayId] = useState<number | "">(expense?.dayId ?? "");
  const [splitWith, setSplitWith] = useState<number[]>(
    expense?.splits?.map((s) => s.memberId) ??
      members.map((m) => m.id)
  );
  const [saving, setSaving] = useState(false);

  const toggleSplit = (memberId: number) => {
    setSplitWith((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount || splitWith.length === 0) return;
    setSaving(true);

    const numAmount = parseFloat(amount);
    const shareAmount = numAmount / splitWith.length;

    const payload = {
      ...(isEdit ? { id: expense.id } : {}),
      tripId,
      dayId: dayId || null,
      description: description.trim(),
      amount: numAmount,
      category,
      paidById,
      splits: splitWith.map((memberId) => ({
        memberId,
        shareAmount: Math.round(shareAmount * 100) / 100,
      })),
    };

    try {
      await fetch("/api/expenses", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSaved();
    } catch {
      /* API not ready */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="expense-modal">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? "✏️ แก้ไขค่าใช้จ่าย" : "💰 เพิ่มค่าใช้จ่าย"}</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="exp-desc">
              รายละเอียด
            </label>
            <input
              id="exp-desc"
              className="form-input"
              placeholder="เช่น อาหารเย็นร้านส้มตำ"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Amount + Category */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="exp-amount">
                จำนวนเงิน (฿)
              </label>
              <input
                id="exp-amount"
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="exp-category">
                หมวดหมู่
              </label>
              <select
                id="exp-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paid by + Day */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="exp-paid-by">
                จ่ายโดย
              </label>
              <select
                id="exp-paid-by"
                className="form-select"
                value={paidById}
                onChange={(e) => setPaidById(Number(e.target.value))}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="exp-day">
                วัน
              </label>
              <select
                id="exp-day"
                className="form-select"
                value={dayId}
                onChange={(e) =>
                  setDayId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">— ไม่ระบุ —</option>
                {days.map((d) => (
                  <option key={d.id} value={d.id}>
                    Day {d.dayNumber} — {formatDate(d.date)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Split with */}
          <div className="form-group">
            <label className="form-label">แบ่งกับ (เลือกสมาชิก)</label>
            <div className="form-checkbox-group">
              {members.map((m) => (
                <label
                  key={m.id}
                  className={`form-checkbox-label ${splitWith.includes(m.id) ? "checked" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={splitWith.includes(m.id)}
                    onChange={() => toggleSplit(m.id)}
                  />
                  {m.name}
                </label>
              ))}
            </div>
            {amount && splitWith.length > 0 && (
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  marginTop: 6,
                }}
              >
                แบ่งเท่ากันคนละ ฿
                {formatNumber(parseFloat(amount) / splitWith.length)}
              </p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            ยกเลิก
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!description.trim() || !amount || splitWith.length === 0 || saving}
            id="btn-save-expense"
          >
            {saving ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Plus size={18} />
            )}
            {isEdit ? "บันทึก" : "เพิ่มค่าใช้จ่าย"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* INLINE STYLES                                                      */
/* ================================================================== */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    gap: 8,
  },

  /* Header */
  header: {
    background: "var(--bg-dark)",
    borderBottom: "1px solid var(--border-color)",
    padding: "20px 24px",
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
  },
  headerMeta: {
    display: "flex",
    gap: 14,
    marginTop: 4,
  },
  metaChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: "0.85rem",
    color: "var(--text-muted)",
  },

  /* Tabs */
  tabBar: {
    background: "var(--bg-darkest)",
    padding: "16px 24px 0",
    position: "sticky",
    top: 0,
    zIndex: 200,
  },

  /* Content */
  content: {
    flex: 1,
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px",
    width: "100%",
  },

  /* Itinerary */
  itineraryLayout: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: 24,
    minHeight: 500,
  },

  daySidebar: {
    background: "var(--bg-dark)",
    borderRadius: "var(--border-radius-lg)",
    border: "1px solid var(--border-color)",
    padding: 16,
    height: "fit-content",
    position: "sticky",
    top: 100,
  },
  sidebarTitle: {
    fontSize: "1rem",
    marginBottom: 12,
    color: "var(--text-secondary)",
  },
  dayList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  dayButton: {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: "var(--border-radius-sm)",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 150ms ease",
    fontFamily: "inherit",
    color: "var(--text-secondary)",
  },
  dayButtonActive: {
    background: "var(--bg-card)",
    borderColor: "var(--accent-primary)",
    color: "var(--text-primary)",
  },
  dayBtnNumber: {
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  dayBtnDate: {
    fontSize: "0.8rem",
    opacity: 0.7,
    marginTop: 2,
  },
  dayBtnTitle: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  /* Timeline */
  timelineArea: {
    minWidth: 0,
  },
  timelineHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  emptyTimeline: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 24px",
    textAlign: "center",
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  timelineItem: {
    display: "flex",
    gap: 16,
    minHeight: 80,
  },
  connector: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 20,
    flexShrink: 0,
    paddingTop: 6,
  },
  connectorDot: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    flexShrink: 0,
    boxShadow: "0 0 8px rgba(255,107,53,0.3)",
  },
  connectorLine: {
    width: 2,
    flex: 1,
    background: "var(--border-color)",
    marginTop: 4,
    marginBottom: -4,
  },
  activityCard: {
    flex: 1,
    marginBottom: 12,
    padding: "16px 20px",
  },
  actCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actCardLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  catBadge: {
    fontSize: "0.8rem",
    fontWeight: 500,
    padding: "3px 10px",
    borderRadius: 100,
  },
  actTime: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: "0.85rem",
    color: "var(--text-muted)",
  },
  actLocation: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: "0.85rem",
    color: "var(--color-teal)",
    marginTop: 8,
  },

  /* Map tab */
  mapTab: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  mapDayBar: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  mapWrapper: {
    height: 550,
    borderRadius: "var(--border-radius-lg)",
    overflow: "hidden",
    border: "1px solid var(--border-color)",
  },

  /* Expenses tab */
  expenseTab: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },
  summaryCard: {
    background: "var(--bg-card)",
    borderRadius: "var(--border-radius-md)",
    border: "1px solid var(--border-color)",
    borderLeftWidth: 4,
    borderLeftStyle: "solid",
    padding: "20px 24px",
  },
  summaryLabel: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: "1.6rem",
    fontWeight: 700,
  },

  /* Settlement */
  settlementSection: {
    marginTop: 32,
    padding: "28px",
    background: "var(--bg-dark)",
    borderRadius: "var(--border-radius-lg)",
    border: "1px solid var(--border-color)",
  },
  balanceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 24,
  },
  balanceCard: {
    background: "var(--bg-card)",
    borderRadius: "var(--border-radius-md)",
    border: "1px solid var(--border-color)",
    borderLeftWidth: 4,
    borderLeftStyle: "solid",
    padding: "16px 20px",
  },
  balanceName: {
    fontWeight: 600,
    fontSize: "1rem",
    marginBottom: 10,
  },
  balanceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "3px 0",
  },
  settlementsBox: {
    background: "var(--bg-card)",
    borderRadius: "var(--border-radius-md)",
    border: "1px solid var(--border-color)",
    padding: "20px 24px",
  },
  settlementsList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  settlementRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "var(--bg-dark)",
    borderRadius: "var(--border-radius-sm)",
    border: "1px solid var(--border-color)",
  },
  settlementPerson: {
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  settlementAmount: {
    marginLeft: "auto",
    fontWeight: 700,
    fontSize: "1.05rem",
    color: "var(--accent-primary)",
  },
};

/* ---- responsive override via global CSS for itinerary grid ---- */
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @media (max-width: 768px) {
      .itinerary-grid {
        grid-template-columns: 1fr !important;
      }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .custom-map-marker {
      background: transparent !important;
      border: none !important;
    }
  `;
  document.head.appendChild(style);
}
