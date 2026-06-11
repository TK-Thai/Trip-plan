"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  Layout,
  Typography,
  Button,
  Tabs,
  Row,
  Col,
  Card,
  Menu,
  Timeline,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Table,
  Space,
  Empty,
  Popconfirm,
  message,
  theme,
  Statistic,
  Radio,
  Avatar,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  ShareAltOutlined,
  CalendarOutlined,
  TeamOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  SettingOutlined,
  CloudOutlined,
} from "@ant-design/icons";
import { calculateSettlements, calculateBalances } from "@/lib/settlement";

// Need dynamic import for Leaflet map to avoid SSR issues
import dynamic from "next/dynamic";
import type { MapActivity } from "@/components/TripMap";

const TripMap = dynamic(() => import("@/components/TripMap"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 400, display: "flex", justifyContent: "center", alignItems: "center", background: "#f0f2f5" }}>
      <Typography.Text type="secondary">กำลังโหลดแผนที่...</Typography.Text>
    </div>
  ),
});

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
interface Member {
  id: number;
  name: string;
  color: string;
}

interface Activity {
  id: number;
  dayId: number;
  sortOrder: number;
  time: string;
  title: string;
  description: string;
  category: "activity" | "food" | "hotel" | "transport";
  lat: number | null;
  lng: number | null;
  locationName: string;
}

interface Day {
  id: number;
  dayNumber: number;
  date: string;
  title: string;
  activities: Activity[];
}

interface ExpenseSplit {
  id: number;
  expenseId: number;
  memberId: number;
  shareAmount: number;
}

interface Expense {
  id: number;
  dayId: number | null;
  description: string;
  amount: number;
  category: string;
  paidById: number;
  createdAt: string;
  splits: ExpenseSplit[];
}

interface FullTrip {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  members: Member[];
  days: Day[];
  expenses: Expense[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  activity: "blue",
  food: "orange",
  hotel: "purple",
  transport: "green",
  other: "default",
};

const CATEGORY_LABELS: Record<string, string> = {
  activity: "สถานที่เที่ยว",
  food: "ร้านอาหาร",
  hotel: "ที่พัก",
  transport: "การเดินทาง",
  other: "อื่นๆ",
};

/* ------------------------------------------------------------------ */
/* Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  // Unwrap params using React.use() as required in Next.js 15
  const { id: tripIdStr } = use(params);

  const [trip, setTrip] = useState<FullTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Modals
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const { token } = theme.useToken();

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      message.success("คัดลอกลิงก์เรียบร้อยแล้ว!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      message.error("Failed to copy link");
    }
  };

  const loadTrip = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripIdStr}`);
      if (res.ok) {
        const data = await res.json();
        setTrip(data);
        if (data.days?.length > 0 && !selectedDayId) {
          setSelectedDayId(data.days[0].id);
        }
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tripIdStr, router, selectedDayId]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  const handleDeleteActivity = async (id: number) => {
    try {
      await fetch(`/api/activities?id=${id}`, { method: "DELETE" });
      message.success("ลบกิจกรรมแล้ว");
      loadTrip();
    } catch (err) {
      message.error("ลบกิจกรรมไม่สำเร็จ");
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      message.success("ลบค่าใช้จ่ายแล้ว");
      loadTrip();
    } catch (err) {
      message.error("ลบค่าใช้จ่ายไม่สำเร็จ");
    }
  };

  if (loading || !trip) {
    return (
      <Layout style={{ minHeight: "100vh", justifyContent: "center", alignItems: "center" }}>
        <Typography.Text type="secondary">กำลังโหลดข้อมูลทริป...</Typography.Text>
      </Layout>
    );
  }

  const selectedDay = trip.days.find((d) => d.id === selectedDayId);
  const mapActivities: MapActivity[] =
    selectedDay?.activities
      .filter((a) => a.lat !== null && a.lng !== null)
      .map((a) => ({
        id: a.id,
        time: a.time,
        lat: a.lat as number,
        lng: a.lng as number,
        title: a.title,
        category: a.category,
        locationName: a.locationName,
      })) || [];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 80,
        }}
      >
        <Space size={16} align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/")} type="text" size="large" />
          <div>
            <Title level={4} style={{ margin: 0 }}>{trip.name}</Title>
            <Space size={16} style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              <Space size={4}><CalendarOutlined />{formatDate(trip.startDate)} — {formatDate(trip.endDate)}</Space>
              <Space size={4}><TeamOutlined />{trip.members.length} คน</Space>
            </Space>
          </div>
        </Space>
        <Button
          type={copied ? "primary" : "default"}
          icon={copied ? <CheckCircleOutlined /> : <ShareAltOutlined />}
          onClick={handleShare}
        >
          {copied ? "คัดลอกแล้ว" : "แชร์ทริป"}
        </Button>
      </Header>

      <Content style={{ padding: "24px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "overview",
              label: "ภาพรวม",
              children: (
                <OverviewTab trip={trip} setActiveTab={setActiveTab} setShowExpenseModal={setShowExpenseModal} />
              ),
            },
            {
              key: "itinerary",
              label: "แผนการเดินทาง",
              children: (
                <Row gutter={[24, 24]}>
                  {/* Sidebar */}
                  <Col xs={24} md={6}>
                    <Card styles={{ body: { padding: 0 } }}>
                      <Menu
                        mode="inline"
                        selectedKeys={selectedDayId ? [selectedDayId.toString()] : []}
                        onClick={({ key }) => setSelectedDayId(parseInt(key))}
                        items={trip.days.map((day) => ({
                          key: day.id.toString(),
                          label: `วันที่ ${day.dayNumber}`,
                          title: formatDate(day.date),
                        }))}
                        style={{ borderRight: 0 }}
                      />
                    </Card>
                  </Col>

                  {/* Content */}
                  <Col xs={24} md={18}>
                    {selectedDay && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <Card
                          title={`วันที่ ${selectedDay.dayNumber} — ${formatDate(selectedDay.date)}`}
                          extra={
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={() => {
                                setEditingActivity(null);
                                setShowActivityModal(true);
                              }}
                            >
                              เพิ่มกิจกรรม
                            </Button>
                          }
                        >
                          {selectedDay.activities.length === 0 ? (
                            <Empty description="ยังไม่มีกิจกรรมในวันนี้" />
                          ) : (
                            <Timeline
                              items={selectedDay.activities.map((act) => ({
                                color: CATEGORY_COLORS[act.category],
                                children: (
                                  <div style={{ paddingBottom: 16 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                      <div>
                                        <Text strong>{act.time || "--:--"} </Text>
                                        <Text strong style={{ marginLeft: 8 }}>{act.title}</Text>
                                      </div>
                                      <Space>
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<EditOutlined />}
                                          onClick={() => {
                                            setEditingActivity(act);
                                            setShowActivityModal(true);
                                          }}
                                        />
                                        <Popconfirm
                                          title="ยืนยันการลบกิจกรรม?"
                                          onConfirm={() => handleDeleteActivity(act.id)}
                                        >
                                          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                                        </Popconfirm>
                                      </Space>
                                    </div>
                                    <Tag color={CATEGORY_COLORS[act.category]}>{CATEGORY_LABELS[act.category]}</Tag>
                                    {act.locationName && (
                                      <Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 13 }}>
                                        <EnvironmentOutlined /> {act.locationName}
                                      </Text>
                                    )}
                                    {act.description && <Paragraph style={{ marginTop: 8 }}>{act.description}</Paragraph>}
                                  </div>
                                ),
                              }))}
                            />
                          )}
                        </Card>

                        <Card title="แผนที่ประจำวัน" styles={{ body: { padding: 0 } }}>
                          <TripMap activities={mapActivities} />
                        </Card>
                      </div>
                    )}
                  </Col>
                </Row>
              ),
            },
            {
              key: "expenses",
              label: "ค่าใช้จ่าย & หารเงิน",
              children: (
                <ExpenseView
                  trip={trip}
                  onEditExpense={(ex) => {
                    setEditingExpense(ex);
                    setShowExpenseModal(true);
                  }}
                  onDeleteExpense={handleDeleteExpense}
                  onAddExpense={() => {
                    setEditingExpense(null);
                    setShowExpenseModal(true);
                  }}
                />
              ),
            },
          ]}
        />
      </Content>

      <ActivityModal
        open={showActivityModal}
        activity={editingActivity}
        dayId={selectedDayId!}
        onClose={() => setShowActivityModal(false)}
        onSaved={() => {
          setShowActivityModal(false);
          loadTrip();
        }}
      />

      {showExpenseModal && (
        <ExpenseModal
          open={showExpenseModal}
          expense={editingExpense}
          trip={trip}
          onClose={() => setShowExpenseModal(false)}
          onSaved={() => {
            setShowExpenseModal(false);
            loadTrip();
          }}
        />
      )}
    </Layout>
  );
}

/* ------------------------------------------------------------------ */
/* Expense View                                                       */
/* ------------------------------------------------------------------ */
function ExpenseView({
  trip,
  onEditExpense,
  onDeleteExpense,
  onAddExpense,
}: {
  trip: FullTrip;
  onEditExpense: (ex: Expense) => void;
  onDeleteExpense: (id: number) => void;
  onAddExpense: () => void;
}) {
  const totalExpense = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const transactions = calculateSettlements(trip.expenses, trip.members);
  const balances = calculateBalances(trip.expenses, trip.members);

  const expenseColumns = [
    { title: "วันที่", dataIndex: "createdAt", key: "date", render: (val: string) => formatDate(val) },
    { title: "รายการ", dataIndex: "description", key: "desc" },
    { title: "หมวดหมู่", dataIndex: "category", key: "cat", render: (cat: string) => <Tag color={CATEGORY_COLORS[cat] || "default"}>{CATEGORY_LABELS[cat] || cat}</Tag> },
    { title: "ผู้จ่าย", dataIndex: "paidById", key: "paid", render: (id: number) => {
        const m = trip.members.find((x) => x.id === id);
        return m ? <Tag color={m.color}>{m.name}</Tag> : "-";
      }
    },
    { title: "ยอดเงิน (฿)", dataIndex: "amount", key: "amount", align: "right" as const, render: (val: number) => <Text strong>{val.toLocaleString()}</Text> },
    { title: "จัดการ", key: "actions", align: "center" as const, render: (_: any, record: Expense) => (
        <Space>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => onEditExpense(record)} />
          <Popconfirm title="ยืนยันการลบ?" onConfirm={() => onDeleteExpense(record.id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card>
            <Statistic title="ค่าใช้จ่ายรวมทั้งทริป" value={totalExpense} prefix="฿" precision={2} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card>
            <Statistic title="เฉลี่ยต่อคน (โดยประมาณ)" value={trip.members.length > 0 ? totalExpense / trip.members.length : 0} prefix="฿" precision={2} />
          </Card>
        </Col>
      </Row>

      <Card
        title="รายการค่าใช้จ่าย"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={onAddExpense}>เพิ่มค่าใช้จ่าย</Button>}
      >
        <Table
          dataSource={trip.expenses}
          columns={expenseColumns}
          rowKey="id"
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>

      <Card title="สรุปการเคลียร์เงิน (Settlement)">
        {transactions.length === 0 ? (
          <Empty description="ไม่มีรายการเคลียร์เงิน" />
        ) : (
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Title level={5}>ใครต้องโอนให้ใคร?</Title>
              <Timeline
                items={transactions.map((tx, idx) => {
                  const from = trip.members.find((m) => m.id === tx.fromId);
                  const to = trip.members.find((m) => m.id === tx.toId);
                  return {
                    color: "red",
                    children: (
                      <Text>
                        <Tag color={from?.color}>{from?.name}</Tag>
                        โอนให้
                        <Tag color={to?.color} style={{ marginLeft: 8 }}>{to?.name}</Tag>
                        <Text strong type="danger">฿{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                      </Text>
                    ),
                  };
                })}
              />
            </Col>
            <Col xs={24} md={12}>
              <Title level={5}>สรุปยอดแต่ละคน</Title>
              <Table
                dataSource={balances}
                rowKey="memberId"
                pagination={false}
                size="small"
                columns={[
                  { title: "ชื่อ", dataIndex: "name", render: (name) => name },
                  { title: "สถานะ", dataIndex: "netBalance", render: (bal) => (
                      <Text type={bal > 0 ? "success" : bal < 0 ? "danger" : "secondary"}>
                        {bal > 0 ? `ได้คืน ฿${bal.toFixed(2)}` : bal < 0 ? `จ่ายเพิ่ม ฿${Math.abs(bal).toFixed(2)}` : "พอดี"}
                      </Text>
                    )
                  }
                ]}
              />
            </Col>
          </Row>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity Modal                                                     */
/* ------------------------------------------------------------------ */
function ActivityModal({
  open,
  activity,
  dayId,
  onClose,
  onSaved,
}: {
  open: boolean;
  activity: Activity | null;
  dayId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (activity) {
        form.setFieldsValue(activity);
      } else {
        form.resetFields();
        form.setFieldsValue({ category: "activity" });
      }
    }
  }, [open, activity, form]);

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      let finalLat = values.lat;
      let finalLng = values.lng;

      // Auto-fetch coordinates if location name is provided but coords are missing
      if (values.locationName && (!finalLat || !finalLng)) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(values.locationName)}&format=json&limit=1`);
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            finalLat = parseFloat(geoData[0].lat);
            finalLng = parseFloat(geoData[0].lon);
          } else {
            message.warning("ไม่พบพิกัดสำหรับสถานที่นี้ กรุณาปักหมุดเอง");
          }
        } catch (e) {
          console.warn("Failed to auto-geocode location", e);
        }
      }

      const url = "/api/activities";
      const method = activity ? "PUT" : "POST";
      const body = {
        ...values,
        lat: finalLat,
        lng: finalLng,
        id: activity?.id,
        dayId,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) onSaved();
    } catch (err) {
      message.error("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={activity ? "แก้ไขกิจกรรม" : "เพิ่มกิจกรรม"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saving}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item name="title" label="ชื่อกิจกรรม" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="time" label="เวลา (เช่น 09:00)">
              <Input placeholder="HH:mm" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="category" label="หมวดหมู่">
          <Select>
            <Select.Option value="activity">สถานที่เที่ยว</Select.Option>
            <Select.Option value="food">ร้านอาหาร</Select.Option>
            <Select.Option value="hotel">ที่พัก</Select.Option>
            <Select.Option value="transport">การเดินทาง</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="locationName" label="สถานที่ (ชื่อในแผนที่)">
          <Input prefix={<EnvironmentOutlined />} />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="lat" label="ละติจูด (Lat)">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="lng" label="ลองจิจูด (Lng)">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label="รายละเอียดเพิ่มเติม">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Expense Modal                                                      */
/* ------------------------------------------------------------------ */
function ExpenseModal({
  open,
  expense,
  trip,
  onClose,
  onSaved,
}: {
  open: boolean;
  expense: Expense | null;
  trip: FullTrip;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [splitWith, setSplitWith] = useState<number[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Watch amount to dynamically show split per person
  const amountValue = Form.useWatch("amount", form) || 0;

  useEffect(() => {
    if (open) {
      if (expense) {
        setSplitType("custom");
        const customAmounts: Record<number, number> = {};
        expense.splits.forEach(s => customAmounts[s.memberId] = s.shareAmount);
        setSplitWith(expense.splits.map(s => s.memberId));
        
        const isEqual = expense.splits.every(s => Math.abs(s.shareAmount - (expense.amount / expense.splits.length)) < 0.02);
        setShowAdvanced(!isEqual);
        
        form.setFieldsValue({
          ...expense,
          splitType: isEqual ? "equal" : "custom",
          splitWith: expense.splits.map(s => s.memberId),
          customAmounts,
        });
      } else {
        setSplitType("equal");
        setShowAdvanced(false);
        const allIds = trip.members.map(m => m.id);
        setSplitWith(allIds);
        form.resetFields();
        form.setFieldsValue({
          category: "food",
          splitType: "equal",
          splitWith: allIds,
        });
      }
    }
  }, [open, expense, trip, form]);

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      const url = "/api/expenses";
      const method = expense ? "PUT" : "POST";
      const body = {
        ...values,
        id: expense?.id,
        tripId: trip.id,
        splitWith: splitWith,
        splitType: showAdvanced ? "custom" : "equal",
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) onSaved();
    } catch (err) {
      message.error("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const toggleSplitMember = (memberId: number) => {
    setSplitWith((prev) => {
      const newSplit = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
      form.setFieldValue("splitWith", newSplit);
      return newSplit;
    });
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <Modal
      title={
        <div style={{ textAlign: "center", width: "100%", fontSize: 18, fontWeight: 600 }}>
          {expense ? "แก้ไขค่าใช้จ่าย" : "เพิ่มค่าใช้จ่าย"}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={
        <Button
          type="primary"
          block
          size="large"
          onClick={() => form.submit()}
          loading={saving}
          style={{ height: 48, fontSize: 16, borderRadius: 8 }}
        >
          Save Expense
        </Button>
      }
      destroyOnClose
      width={600}
      bodyStyle={{ padding: "20px 0" }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ padding: "0 24px" }}>
        
        <Form.Item name="description" label={<Text type="secondary" style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>EXPENSE NAME</Text>} rules={[{ required: true, message: "โปรดระบุชื่อรายการ" }]}>
          <Input size="large" placeholder="เช่น Ramen, ค่าตั๋วเครื่องบิน..." style={{ borderRadius: 8 }} />
        </Form.Item>

        <Form.Item label={<Text type="secondary" style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>AMOUNT & CURRENCY</Text>} required>
          <Input.Group compact style={{ display: "flex", width: "100%" }}>
            <Select size="large" defaultValue="THB" style={{ width: "35%", borderRadius: "8px 0 0 8px" }}>
              <Select.Option value="THB">THB ฿</Select.Option>
            </Select>
            <Form.Item name="amount" noStyle rules={[{ required: true, message: "โปรดระบุยอดเงิน" }]}>
              <InputNumber
                size="large"
                style={{ width: "65%", borderRadius: "0 8px 8px 0" }}
                min={0}
                prefix="฿"
                placeholder="1000"
              />
            </Form.Item>
          </Input.Group>
        </Form.Item>

        <Form.Item name="category" label={<Text type="secondary" style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>CATEGORY</Text>}>
          <Radio.Group style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Radio.Button value="flight" style={{ borderRadius: 16 }}>✈️ Flight</Radio.Button>
            <Radio.Button value="hotel" style={{ borderRadius: 16 }}>🏨 Hotel</Radio.Button>
            <Radio.Button value="food" style={{ borderRadius: 16 }}>🍜 Food</Radio.Button>
            <Radio.Button value="transport" style={{ borderRadius: 16 }}>🚗 Transport</Radio.Button>
            <Radio.Button value="activity" style={{ borderRadius: 16 }}>🎟️ Activity</Radio.Button>
            <Radio.Button value="other" style={{ borderRadius: 16 }}>📦 Other</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="paidById" label={<Text type="secondary" style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>PAID BY</Text>} rules={[{ required: true, message: "โปรดระบุผู้จ่ายเงิน" }]}>
          <Select size="large" style={{ borderRadius: 8 }}>
            {trip.members.map(m => (
              <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Divider />

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>SPLIT WITH</Text>
            <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => setShowAdvanced(!showAdvanced)}>
              Advanced
            </Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trip.members.map((m) => {
              const isSelected = splitWith.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => toggleSplitMember(m.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? "#1677ff" : "#d9d9d9"}`,
                    background: isSelected ? "#e6f4ff" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <Space>
                    <Avatar size="small" style={{ backgroundColor: m.color, color: "#fff" }}>{getInitials(m.name)}</Avatar>
                    <Text strong={isSelected} style={{ color: isSelected ? "#1677ff" : "inherit" }}>{m.name}</Text>
                  </Space>
                  {isSelected && <CheckCircleOutlined style={{ color: "#1677ff", fontSize: 16 }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Split Box */}
        {!showAdvanced && (
          <div style={{
            background: "#f0f5ff",
            padding: "16px 20px",
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}>
            <Text style={{ color: "#1677ff", fontSize: 16 }}>Split {splitWith.length} ways</Text>
            <div>
              <Text strong style={{ fontSize: 20, color: "#1677ff" }}>
                ฿{splitWith.length > 0 ? (amountValue / splitWith.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
              </Text>
              <Text style={{ color: "#1677ff", fontSize: 14 }}> / person</Text>
            </div>
          </div>
        )}

        {/* Custom Split / Advanced */}
        {showAdvanced && splitWith.length > 0 && (
          <Card size="small" style={{ background: "#fafafa", marginTop: 16, borderRadius: 8 }}>
            <Typography.Text strong>ระบุยอดที่แต่ละคนต้องจ่าย (กำหนดเอง)</Typography.Text>
            <div style={{ marginTop: 12 }}>
              {splitWith.map((id) => {
                const m = trip.members.find(x => x.id === id);
                return (
                  <Form.Item
                    key={id}
                    name={["customAmounts", id]}
                    label={m?.name}
                    style={{ marginBottom: 8 }}
                  >
                    <InputNumber size="large" style={{ width: "100%", borderRadius: 8 }} min={0} prefix="฿" />
                  </Form.Item>
                );
              })}
            </div>
          </Card>
        )}
      </Form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Overview Tab                                                       */
/* ------------------------------------------------------------------ */
function OverviewTab({ trip, setActiveTab, setShowExpenseModal }: any) {
  const totalSpent = trip.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const perPerson = trip.members.length > 0 ? totalSpent / trip.members.length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>TOTAL SPENT</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0, color: '#1677ff' }}>฿{totalSpent.toLocaleString()}</Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>TRANSACTIONS</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>{trip.expenses.length}</Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>PER PERSON</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>฿{perPerson.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>MEMBERS</Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>{trip.members.length}</Typography.Title>
          </Card>
        </Col>
      </Row>

      {/* Quick Links */}
      <Row gutter={[16, 16]}>
        <Col xs={12}>
          <Card hoverable onClick={() => setActiveTab("itinerary")} size="small" style={{ cursor: 'pointer' }}>
            <Space><CalendarOutlined style={{ color: '#1677ff' }} /> แผนการเดินทาง</Space>
          </Card>
        </Col>
        <Col xs={12}>
          <Card hoverable onClick={() => setActiveTab("expenses")} size="small" style={{ cursor: 'pointer' }}>
            <Space><DollarOutlined style={{ color: '#52c41a' }} /> ค่าใช้จ่าย</Space>
          </Card>
        </Col>
        <Col xs={24}>
          <Card hoverable onClick={() => setShowExpenseModal(true)} size="small" style={{ borderColor: '#1677ff', cursor: 'pointer', background: '#e6f4ff' }}>
            <Space><PlusOutlined style={{ color: '#1677ff' }} /> <Typography.Text strong style={{ color: '#1677ff' }}>เพิ่มค่าใช้จ่ายใหม่</Typography.Text></Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
