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
  const [activeTab, setActiveTab] = useState("itinerary");
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
      const url = "/api/activities";
      const method = activity ? "PUT" : "POST";
      const body = {
        ...values,
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

  useEffect(() => {
    if (open) {
      if (expense) {
        setSplitType("custom");
        const customAmounts: Record<number, number> = {};
        expense.splits.forEach(s => customAmounts[s.memberId] = s.shareAmount);
        setSplitWith(expense.splits.map(s => s.memberId));
        form.setFieldsValue({
          ...expense,
          splitType: "custom",
          splitWith: expense.splits.map(s => s.memberId),
          customAmounts,
        });
      } else {
        setSplitType("equal");
        const allIds = trip.members.map(m => m.id);
        setSplitWith(allIds);
        form.resetFields();
        form.setFieldsValue({
          category: "other",
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
      title={expense ? "แก้ไขค่าใช้จ่าย" : "เพิ่มค่าใช้จ่าย"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saving}
      destroyOnClose
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item name="description" label="รายการ" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="amount" label="จำนวนเงิน (฿)" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} min={0} />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="paidById" label="ผู้จ่ายเงิน" rules={[{ required: true }]}>
              <Select>
                {trip.members.map(m => (
                  <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="category" label="หมวดหมู่">
              <Select>
                <Select.Option value="food">อาหาร</Select.Option>
                <Select.Option value="transport">เดินทาง</Select.Option>
                <Select.Option value="hotel">ที่พัก</Select.Option>
                <Select.Option value="activity">กิจกรรม</Select.Option>
                <Select.Option value="other">อื่นๆ</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="splitWith" label="หารกับใครบ้าง" rules={[{ required: true }]}>
          <Select
            mode="multiple"
            onChange={setSplitWith}
            options={trip.members.map(m => ({ label: m.name, value: m.id }))}
          />
        </Form.Item>

        <Form.Item name="splitType" label="วิธีหาร">
          <Select onChange={(val) => setSplitType(val)}>
            <Select.Option value="equal">หารเท่ากันทุกคน</Select.Option>
            <Select.Option value="custom">กำหนดเอง</Select.Option>
          </Select>
        </Form.Item>

        {splitType === "custom" && splitWith.length > 0 && (
          <Card size="small" style={{ background: "#fafafa" }}>
            <Typography.Text strong>ระบุยอดที่แต่ละคนต้องจ่าย</Typography.Text>
            {splitWith.map((id) => {
              const m = trip.members.find(x => x.id === id);
              return (
                <Form.Item
                  key={id}
                  name={["customAmounts", id]}
                  label={m?.name}
                  style={{ marginBottom: 8, marginTop: 8 }}
                >
                  <InputNumber style={{ width: "100%" }} min={0} />
                </Form.Item>
              );
            })}
          </Card>
        )}
      </Form>
    </Modal>
  );
}
