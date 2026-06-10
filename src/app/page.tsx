"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Layout,
  Typography,
  Button,
  Card,
  Modal,
  Form,
  Input,
  DatePicker,
  Space,
  Empty,
  Skeleton,
  Row,
  Col,
  theme,
} from "antd";
import {
  PlusOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  DeleteOutlined,
  GlobalOutlined,
} from "@ant-design/icons";

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

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
  const { token } = theme.useToken();

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
    <Layout style={{ minHeight: "100vh" }}>
      {/* ---- Hero / Header ---- */}
      <Header
        style={{
          background: token.colorBgContainer,
          height: "auto",
          padding: "60px 24px 40px",
          textAlign: "center",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: token.colorPrimaryBg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              fontSize: 38,
              color: token.colorPrimary,
            }}
          >
            <GlobalOutlined />
          </div>
          <Title level={1} style={{ marginBottom: 8, color: token.colorPrimaryText }}>
            วางแผนทริปท่องเที่ยว
          </Title>
          <Paragraph type="secondary" style={{ fontSize: "1.1rem", marginBottom: 24 }}>
            จัดการเส้นทาง กิจกรรม และค่าใช้จ่ายสำหรับทริปท่องเที่ยว
          </Paragraph>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setShowModal(true)}
            id="btn-create-trip"
          >
            สร้างทริปใหม่
          </Button>
        </div>
      </Header>

      {/* ---- Trip Grid ---- */}
      <Content style={{ maxWidth: 1100, margin: "0 auto", width: "100%", padding: "40px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0 }}>ทริปทั้งหมด</Title>
          <Text type="secondary">{trips.length} ทริป</Text>
        </div>

        {loading ? (
          <Row gutter={[20, 20]}>
            {[1, 2, 3].map((i) => (
              <Col xs={24} sm={12} md={8} key={i}>
                <Card>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : trips.length === 0 ? (
          <Card style={{ textAlign: "center", padding: "40px 0" }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="ยังไม่มีทริป — เริ่มสร้างทริปแรกของคุณ!"
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
                สร้างทริปใหม่
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[20, 20]}>
            {trips.map((trip) => (
              <Col xs={24} sm={12} md={8} key={trip.id}>
                <Card
                  hoverable
                  onClick={() => router.push(`/trip/${trip.id}`)}
                  id={`trip-card-${trip.id}`}
                  styles={{
                    body: {
                      borderTop: `4px solid ${token.colorPrimary}`,
                      borderRadius: token.borderRadiusLG,
                    }
                  }}
                >
                  <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>{trip.name}</Title>
                  {trip.description && (
                    <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 16 }}>
                      {trip.description}
                    </Paragraph>
                  )}
                  <Space wrap size={[16, 8]} style={{ color: token.colorTextSecondary }}>
                    <Space size={4}>
                      <CalendarOutlined />
                      <Text type="secondary" style={{ fontSize: "0.85rem" }}>
                        {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
                      </Text>
                    </Space>
                    <Space size={4}>
                      <EnvironmentOutlined />
                      <Text type="secondary" style={{ fontSize: "0.85rem" }}>
                        {daysBetween(trip.startDate, trip.endDate)} วัน
                      </Text>
                    </Space>
                    {trip.memberCount !== undefined && (
                      <Space size={4}>
                        <TeamOutlined />
                        <Text type="secondary" style={{ fontSize: "0.85rem" }}>
                          {trip.memberCount} คน
                        </Text>
                      </Space>
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Content>

      {/* ---- Create Modal ---- */}
      <CreateTripModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          setShowModal(false);
          loadTrips();
        }}
      />
    </Layout>
  );
}

/* ------------------------------------------------------------------ */
/* Create Trip Modal                                                  */
/* ------------------------------------------------------------------ */
function CreateTripModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ members: [""] });
    }
  }, [open, form]);

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      const { name, description, dates, members } = values;
      const [start, end] = dates || [];

      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || "",
          startDate: start ? start.format("YYYY-MM-DD") : "",
          endDate: end ? end.format("YYYY-MM-DD") : "",
          members: (members || []).filter((m: string) => m && m.trim()),
        }),
      });

      if (res.ok) {
        onCreated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={<><GlobalOutlined style={{ marginRight: 8 }} /> สร้างทริปใหม่</>}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saving}
      okText="สร้างทริป"
      cancelText="ยกเลิก"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ members: [""] }}
      >
        <Form.Item
          name="name"
          label="ชื่อทริป"
          rules={[{ required: true, message: "กรุณาระบุชื่อทริป" }]}
        >
          <Input placeholder="เช่น ทริปเชียงใหม่ 2026" />
        </Form.Item>

        <Form.Item name="description" label="รายละเอียด">
          <Input.TextArea rows={2} placeholder="รายละเอียดทริป (ไม่บังคับ)" />
        </Form.Item>

        <Form.Item
          name="dates"
          label="ช่วงเวลาเดินทาง"
          rules={[{ required: true, message: "กรุณาระบุช่วงเวลาเดินทาง" }]}
        >
          <RangePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.List name="members">
          {(fields, { add, remove }) => (
            <>
              <div style={{ marginBottom: 8 }}>สมาชิก</div>
              {fields.map((field, index) => (
                <Form.Item
                  {...field}
                  key={field.key}
                  style={{ marginBottom: 8 }}
                >
                  <Space style={{ display: 'flex', width: '100%' }}>
                    <Input
                      placeholder={`สมาชิกคนที่ ${index + 1}`}
                      style={{ width: '100%' }}
                      onChange={(e) => {
                         const vals = form.getFieldValue("members");
                         vals[index] = e.target.value;
                         form.setFieldsValue({ members: vals });
                      }}
                    />
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                      />
                    )}
                  </Space>
                </Form.Item>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add("")} block icon={<PlusOutlined />}>
                  เพิ่มสมาชิก
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
