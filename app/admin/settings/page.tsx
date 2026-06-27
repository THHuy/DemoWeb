"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Monitor,
  Printer,
  Fingerprint,
  Wifi,
  WifiOff,
  Save,
  RotateCcw,
  ChevronRight,
  Usb,
  Globe,
  Hash,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  Loader2,
  CreditCard,
  QrCode,
  Coffee,
  type LucideIcon,
} from "lucide-react";

interface DeviceConfig {
  id: number;
  deviceType: "pos" | "printer" | "timeClock";
  deviceName: string;
  connectionType: "usb" | "network" | "bluetooth";
  ipAddress: string;
  port: string;
  enabled: boolean;
}

interface PaymentConfig {
  id?: number;
  provider: "vietqr" | "momo" | "zalopay" | "vnpay";
  enabled: boolean;
  bank_name: string;
  account_number: string;
  account_holder: string;
  phone_number: string;
  merchant_id: string;
  secret_key: string;
}

const deviceTypes = [
  {
    key: "pos" as const,
    title: "Máy POS",
    description: "Máy bán hàng, máy thanh toán tại quầy",
    icon: Monitor,
    iconGradient: "from-blue-500 to-indigo-600",
    accentColor: "blue",
    defaultPort: "8080",
  },
  {
    key: "printer" as const,
    title: "Máy In",
    description: "Máy in hóa đơn, phiếu order bếp/bar",
    icon: Printer,
    iconGradient: "from-emerald-500 to-teal-600",
    accentColor: "emerald",
    defaultPort: "9100",
  },
  {
    key: "timeClock" as const,
    title: "Máy Chấm Công",
    description: "Máy chấm công vân tay, nhận diện khuôn mặt",
    icon: Fingerprint,
    iconGradient: "from-violet-500 to-purple-600",
    accentColor: "violet",
    defaultPort: "4370",
  },
  {
    key: "payment" as const,
    title: "Thanh toán & QR",
    description: "Cấu hình tài khoản nhận tiền ngân hàng, Momo, ZaloPay, VNPay",
    icon: CreditCard,
    iconGradient: "from-amber-500 to-orange-600",
    accentColor: "amber",
    defaultPort: "",
  },
  {
    key: "category" as const,
    title: "Danh mục Menu",
    description: "Quản lý danh mục món ăn (Cà phê, Trà, Bánh...)",
    icon: Coffee,
    iconGradient: "from-rose-500 to-red-600",
    accentColor: "rose",
    defaultPort: "",
  },
  {
    key: "topping" as const,
    title: "Topping Thêm",
    description: "Quản lý các loại topping thêm (Trân châu, thạch, kem cheese...)",
    icon: Sparkles,
    iconGradient: "from-fuchsia-500 to-pink-600",
    accentColor: "fuchsia",
    defaultPort: "",
  },
];

interface MenuCategoryConfig {
  id?: number;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
}

interface MenuToppingConfig {
  id?: number;
  name: string;
  price: number;
}

export default function SettingsPage() {
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [payments, setPayments] = useState<PaymentConfig[]>([
    { provider: "vietqr", enabled: false, bank_name: "", account_number: "", account_holder: "", phone_number: "", merchant_id: "", secret_key: "" },
    { provider: "momo", enabled: false, bank_name: "", account_number: "", account_holder: "", phone_number: "", merchant_id: "", secret_key: "" },
    { provider: "zalopay", enabled: false, bank_name: "", account_number: "", account_holder: "", phone_number: "", merchant_id: "", secret_key: "" },
    { provider: "vnpay", enabled: false, bank_name: "", account_number: "", account_holder: "", phone_number: "", merchant_id: "", secret_key: "" }
  ]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"pos" | "printer" | "timeClock" | "payment" | "category" | "topping">("pos");
  const [expandedDevice, setExpandedDevice] = useState<number | null>(null);

  const [testingDevice, setTestingDevice] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string } | null>>({});

  const [savingDevice, setSavingDevice] = useState<number | null>(null);
  const [savedDevices, setSavedDevices] = useState<Record<number, boolean>>({});
  const [savingPayment, setSavingPayment] = useState(false);
  const [savedPayment, setSavedPayment] = useState(false);

  const [addingToType, setAddingToType] = useState<string | null>(null);

  const [globalVatEnabled, setGlobalVatEnabled] = useState(true);

  // Menu Categories states
  const [categories, setCategories] = useState<MenuCategoryConfig[]>([]);
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategoryConfig | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    icon: "Coffee",
    sort_order: 0,
  });

  // Menu Toppings states
  const [toppings, setToppings] = useState<MenuToppingConfig[]>([]);
  const [savingTopping, setSavingTopping] = useState(false);
  const [editingTopping, setEditingTopping] = useState<MenuToppingConfig | null>(null);
  const [toppingForm, setToppingForm] = useState({
    name: "",
    price: 0,
  });

  useEffect(() => {
    Promise.all([fetchDevices(), fetchPayments(), fetchCategories(), fetchToppings(), fetchSystemSettings()]).finally(() => {
      setLoading(false);
    });
  }, []);

  async function fetchSystemSettings() {
    try {
      const res = await fetch("/api/settings/system");
      if (res.ok) {
        const data = await res.json();
        setGlobalVatEnabled(data.vat_enabled === "true");
      }
    } catch (err) {
      console.error("Failed to load system settings:", err);
    }
  }

  async function handleToggleGlobalVat() {
    const nextVal = !globalVatEnabled;
    setGlobalVatEnabled(nextVal);
    try {
      await fetch("/api/settings/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vat_enabled: String(nextVal) }),
      });
    } catch (err) {
      console.error("Failed to save global VAT setting:", err);
    }
  }

  async function fetchPayments() {
    try {
      const res = await fetch("/api/settings/payment");
      if (res.ok) {
        const data = await res.json();
        setPayments(prev =>
          prev.map(def => {
            const fetched = data.find((d: any) => d.provider === def.provider);
            return fetched ? { ...def, ...fetched } : def;
          })
        );
      }
    } catch (err) {
      console.error("Failed to load payments config:", err);
    }
  }

  async function handleSavePayment() {
    setSavingPayment(true);
    try {
      const res = await fetch("/api/settings/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payments),
      });
      const data = await res.json();
      if (data.success) {
        setSavedPayment(true);
        setTimeout(() => setSavedPayment(false), 2500);
      } else {
        alert(data.error || "Lưu cấu hình thất bại");
      }
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setSavingPayment(false);
    }
  }

  function handleUpdatePaymentField(provider: string, field: keyof PaymentConfig, value: any) {
    setPayments((prev) =>
      prev.map((p) => (p.provider === provider ? { ...p, [field]: value } : p))
    );
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/menu/categories");
      if (res.ok) setCategories(await res.json());
    } catch (err) {
      console.error("Failed to load categories in settings:", err);
    }
  }

  async function handleSaveCategory() {
    setSavingCategory(true);
    try {
      const isEdit = !!editingCategory;
      const url = isEdit ? `/api/menu/categories/${editingCategory.id}` : "/api/menu/categories";
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });

      if (res.ok) {
        setCategoryForm({ name: "", slug: "", icon: "Coffee", sort_order: 0 });
        setEditingCategory(null);
        fetchCategories();
        alert(isEdit ? "Cập nhật danh mục thành công!" : "Thêm danh mục thành công!");
      } else {
        const data = await res.json();
        alert(data.error || "Không thể lưu danh mục");
      }
    } catch {
      alert("Lỗi kết nối khi lưu danh mục");
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm("Bạn có chắc chắn muốn xóa danh mục này? Hóa đơn cũ hoặc món ăn thuộc danh mục này có thể bị ảnh hưởng.")) return;
    try {
      const res = await fetch(`/api/menu/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCategories();
      } else {
        alert("Lỗi khi xóa danh mục");
      }
    } catch {
      alert("Lỗi kết nối");
    }
  }

  async function fetchToppings() {
    try {
      const res = await fetch("/api/menu/toppings");
      if (res.ok) setToppings(await res.json());
    } catch (err) {
      console.error("Failed to load toppings in settings:", err);
    }
  }

  async function handleSaveTopping() {
    setSavingTopping(true);
    try {
      const isEdit = !!editingTopping;
      const url = isEdit ? `/api/menu/toppings/${editingTopping.id}` : "/api/menu/toppings";
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toppingForm),
      });

      if (res.ok) {
        setToppingForm({ name: "", price: 0 });
        setEditingTopping(null);
        fetchToppings();
        alert(isEdit ? "Cập nhật topping thành công!" : "Thêm topping thành công!");
      } else {
        const data = await res.json();
        alert(data.error || "Không thể lưu topping");
      }
    } catch {
      alert("Lỗi kết nối khi lưu topping");
    } finally {
      setSavingTopping(false);
    }
  }

  async function handleDeleteTopping(id: number) {
    if (!confirm("Bạn có chắc chắn muốn xóa topping này? Các hóa đơn cũ hoặc giỏ hàng hiện tại có thể bị ảnh hưởng.")) return;
    try {
      const res = await fetch(`/api/menu/toppings/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchToppings();
      } else {
        alert("Lỗi khi xóa topping");
      }
    } catch {
      alert("Lỗi kết nối");
    }
  }

  async function fetchDevices() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
        if (data.length > 0) {
          setExpandedDevice(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    }
  }

  async function handleAddDevice(type: "pos" | "printer" | "timeClock") {
    setAddingToType(type);
    const typeInfo = deviceTypes.find((t) => t.key === type);
    const newDeviceData = {
      deviceType: type,
      deviceName: `Thiết bị ${typeInfo?.title || ""} mới`,
      connectionType: "network",
      ipAddress: "192.168.1.100",
      port: typeInfo?.defaultPort || "80",
      enabled: false,
    };

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDeviceData),
      });
      const data = await res.json();
      if (data.success) {
        setDevices((prev) => [...prev, data.device]);
        setExpandedDevice(data.device.id);
      }
    } catch (err) {
      console.error("Failed to add device:", err);
    } finally {
      setAddingToType(null);
    }
  }

  async function handleSaveDevice(id: number) {
    const device = devices.find((d) => d.id === id);
    if (!device) return;

    setSavingDevice(id);
    try {
      const res = await fetch(`/api/settings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(device),
      });
      const data = await res.json();
      if (data.success) {
        setSavedDevices((prev) => ({ ...prev, [id]: true }));
        setTimeout(() => {
          setSavedDevices((prev) => ({ ...prev, [id]: false }));
        }, 2000);
      } else {
        alert(data.error || "Lưu thất bại");
      }
    } catch (err) {
      alert("Lỗi kết nối");
    } finally {
      setSavingDevice(null);
    }
  }

  async function handleDeleteDevice(id: number) {
    if (!confirm("Bạn có chắc chắn muốn xoá thiết bị này?")) return;

    try {
      const res = await fetch(`/api/settings/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDevices((prev) => prev.filter((d) => d.id !== id));
        if (expandedDevice === id) {
          setExpandedDevice(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete device:", err);
    }
  }

  function handleUpdateDeviceField(id: number, field: keyof DeviceConfig, value: any) {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  }

  async function handleTestConnection(id: number) {
    const device = devices.find((d) => d.id === id);
    if (!device) return;

    setTestingDevice(id);
    setTestResults((prev) => ({ ...prev, [id]: null }));

    try {
      const res = await fetch("/api/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionType: device.connectionType,
          ipAddress: device.ipAddress,
          port: device.port,
        }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: data.success, message: data.message },
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, message: "Lỗi kết nối đến server" },
      }));
    } finally {
      setTestingDevice(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-xs text-stone-500">Đang tải cấu hình thiết bị...</p>
        </div>
      </div>
    );
  }

  const activeTypeInfo = deviceTypes.find((t) => t.key === activeSection);
  const filteredDevices = devices.filter((d) => d.deviceType === activeSection);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-violet-500/8 to-indigo-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-gradient-to-br from-blue-500/6 to-cyan-500/4 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium uppercase tracking-widest text-amber-400/80">
                Thiết bị & Hệ thống
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Cài đặt thiết bị
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-white/40">
              Quản lý danh sách và kết nối phần cứng của bạn. Hỗ trợ thêm nhiều máy in hóa đơn, máy POS và máy chấm công linh hoạt.
            </p>
          </div>
        </div>
      </div>

      {/* Device summary tabs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {deviceTypes.map((type) => {
          const Icon = type.icon;
          const isPayment = type.key === "payment";
          const isCategory = type.key === "category";
          const isTopping = type.key === "topping";
          
          const count = isPayment 
            ? payments.length 
            : isCategory
              ? categories.length
              : isTopping
                ? toppings.length
                : devices.filter((d) => d.deviceType === type.key).length;

          const activeCount = isPayment 
            ? payments.filter((p) => p.enabled).length 
            : isCategory
              ? categories.length
              : isTopping
                ? toppings.length
                : devices.filter((d) => d.deviceType === type.key && d.enabled).length;

          return (
            <button
              key={type.key}
              onClick={() => {
                setActiveSection(type.key);
                if (!isPayment && !isCategory && !isTopping) {
                  const firstOfType = devices.find((d) => d.deviceType === type.key);
                  if (firstOfType) setExpandedDevice(firstOfType.id);
                }
              }}
              className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 cursor-pointer ${
                activeSection === type.key
                  ? "border-white/15 bg-white/[0.06] shadow-lg shadow-black/10"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${type.iconGradient} transition-transform duration-200 group-hover:scale-105`}
              >
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {type.title}
                </p>
                <p className="text-[10px] text-stone-500">
                  {count > 0 ? (
                    <span className="text-emerald-400">
                      {isPayment 
                        ? `Đã cấu hình ${activeCount}/${count}` 
                        : isCategory 
                          ? `Đã có ${count} danh mục` 
                          : isTopping
                            ? `Đã có ${count} topping`
                            : `Đang bật ${activeCount}/${count} máy`}
                    </span>
                  ) : (
                    <span>Chưa cấu hình</span>
                  )}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Device / Payment / Category sections */}
      {activeSection === "payment" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-white/30" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">
                Liên kết & Thanh toán QR
              </h2>
            </div>
            <button
              onClick={handleSavePayment}
              disabled={savingPayment}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold shadow-lg transition-all cursor-pointer ${
                savedPayment
                  ? "bg-emerald-500 text-white shadow-emerald-500/20"
                  : "bg-amber-500 text-stone-950 shadow-amber-500/20 hover:bg-amber-400"
              } disabled:opacity-50`}
            >
              {savingPayment ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : savedPayment ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {savingPayment ? "Đang lưu..." : savedPayment ? "Đã lưu!" : "Lưu cấu hình"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. VietQR Card */}
            {(() => {
              const config = payments.find((p) => p.provider === "vietqr") || {
                provider: "vietqr", enabled: false, bank_name: "", account_number: "", account_holder: "", phone_number: "", merchant_id: "", secret_key: ""
              };
              return (
                <div className={`rounded-2xl border p-6 bg-white/[0.02] transition-all duration-300 ${config.enabled ? "border-amber-500/25 bg-white/[0.04]" : "border-white/[0.06]"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-amber-400 animate-pulse" />
                      <div>
                        <h3 className="text-sm font-bold text-white">Chuyển khoản VietQR</h3>
                        <p className="text-[10px] text-stone-500 mt-0.5">Tự động tạo mã QR quét chuyển khoản nhanh</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdatePaymentField("vietqr", "enabled", !config.enabled)}
                      className={`relative h-5.5 w-10 rounded-full transition-colors duration-200 cursor-pointer ${
                        config.enabled ? "bg-emerald-500" : "bg-stone-700"
                      }`}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-md transition-transform duration-200"
                        style={{ transform: config.enabled ? "translateX(18px)" : "translateX(0px)" }}
                      />
                    </button>
                  </div>
                  {config.enabled && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Ngân hàng liên kết</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Vietcombank, Techcombank..."
                          value={config.bank_name}
                          onChange={(e) => handleUpdatePaymentField("vietqr", "bank_name", e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-stone-900 px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Số tài khoản nhận tiền</label>
                        <input
                          type="text"
                          placeholder="Nhập số tài khoản ngân hàng"
                          value={config.account_number}
                          onChange={(e) => handleUpdatePaymentField("vietqr", "account_number", e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-stone-900 px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tên chủ tài khoản (Không dấu)</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: CONG TY CAFE L AMBIANCE"
                          value={config.account_holder}
                          onChange={(e) => handleUpdatePaymentField("vietqr", "account_holder", e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-stone-900 px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 2. MoMo Card */}
            {(() => {
              const config = payments.find((p) => p.provider === "momo") || {
                provider: "momo", enabled: false, bank_name: "", account_number: "", account_holder: "", phone_number: "", merchant_id: "", secret_key: ""
              };
              return (
                <div className={`rounded-2xl border p-6 bg-white/[0.02] transition-all duration-300 ${config.enabled ? "border-amber-500/25 bg-white/[0.04]" : "border-white/[0.06]"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-pink-500 animate-pulse" />
                      <div>
                        <h3 className="text-sm font-bold text-white">Ví điện tử MoMo</h3>
                        <p className="text-[10px] text-stone-500 mt-0.5">Thanh toán qua ví MoMo cá nhân / Merchant</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdatePaymentField("momo", "enabled", !config.enabled)}
                      className={`relative h-5.5 w-10 rounded-full transition-colors duration-200 cursor-pointer ${
                        config.enabled ? "bg-emerald-500" : "bg-stone-700"
                      }`}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-md transition-transform duration-200"
                        style={{ transform: config.enabled ? "translateX(18px)" : "translateX(0px)" }}
                      />
                    </button>
                  </div>
                  {config.enabled && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Số điện thoại đăng ký MoMo</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 0912345678"
                          value={config.phone_number}
                          onChange={(e) => handleUpdatePaymentField("momo", "phone_number", e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-stone-900 px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tên người thụ hưởng MoMo</label>
                        <input
                          type="text"
                          placeholder="Nhập tên chủ tài khoản MoMo"
                          value={config.account_holder}
                          onChange={(e) => handleUpdatePaymentField("momo", "account_holder", e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-stone-900 px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 3. ZaloPay Card */}
            {(() => {
              const config = payments.find((p) => p.provider === "zalopay") || {
                provider: "zalopay", enabled: false, bank_name: "", account_number: "", account_holder: "", phone_number: "", merchant_id: "", secret_key: ""
              };
              return (
                <div className={`rounded-2xl border p-6 bg-white/[0.02] transition-all duration-300 ${config.enabled ? "border-amber-500/25 bg-white/[0.04]" : "border-white/[0.06]"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-blue-500 animate-pulse" />
                      <div>
                        <h3 className="text-sm font-bold text-white">Cổng ZaloPay Merchant</h3>
                        <p className="text-[10px] text-stone-500 mt-0.5">Tích hợp thanh toán doanh nghiệp QR ZaloPay</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdatePaymentField("zalopay", "enabled", !config.enabled)}
                      className={`relative h-5.5 w-10 rounded-full transition-colors duration-200 cursor-pointer ${
                        config.enabled ? "bg-emerald-500" : "bg-stone-700"
                      }`}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-md transition-transform duration-200"
                        style={{ transform: config.enabled ? "translateX(18px)" : "translateX(0px)" }}
                      />
                    </button>
                  </div>
                  {config.enabled && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Mã liên kết doanh nghiệp (Merchant ID)</label>
                        <input
                          type="text"
                          placeholder="Nhập Merchant ID do ZaloPay cấp"
                          value={config.merchant_id}
                          onChange={(e) => handleUpdatePaymentField("zalopay", "merchant_id", e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-stone-900 px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Khóa bảo mật (Secret Key / MAC Key)</label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••"
                          value={config.secret_key}
                          onChange={(e) => handleUpdatePaymentField("zalopay", "secret_key", e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-stone-900 px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 4. VNPay Card */}
            {(() => {
              const config = payments.find((p) => p.provider === "vnpay") || {
                provider: "vnpay", enabled: false, bank_name: "", account_number: "", account_holder: "", phone_number: "", merchant_id: "", secret_key: ""
              };
              return (
                <div className={`rounded-2xl border p-6 bg-white/[0.02] transition-all duration-300 ${config.enabled ? "border-amber-500/25 bg-white/[0.04]" : "border-white/[0.06]"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-red-500 animate-pulse" />
                      <div>
                        <h3 className="text-sm font-bold text-white">Cổng VNPay QR Merchant</h3>
                        <p className="text-[10px] text-stone-500 mt-0.5">Tích hợp cổng thanh toán VNPay QR</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdatePaymentField("vnpay", "enabled", !config.enabled)}
                      className={`relative h-5.5 w-10 rounded-full transition-colors duration-200 cursor-pointer ${
                        config.enabled ? "bg-emerald-500" : "bg-stone-700"
                      }`}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-md transition-transform duration-200"
                        style={{ transform: config.enabled ? "translateX(18px)" : "translateX(0px)" }}
                      />
                    </button>
                  </div>
                  {config.enabled && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Mã định danh VNPay (Terminal ID / TmnCode)</label>
                        <input
                          type="text"
                          placeholder="Nhập Terminal ID do VNPay cấp"
                          value={config.merchant_id}
                          onChange={(e) => handleUpdatePaymentField("vnpay", "merchant_id", e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-stone-900 px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Khóa bảo mật checksum (Hash Secret)</label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••"
                          value={config.secret_key}
                          onChange={(e) => handleUpdatePaymentField("vnpay", "secret_key", e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-stone-900 px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeSection !== "payment" && activeSection !== "category" && activeSection !== "topping" && (
        <div className="space-y-4">
          {activeSection === "pos" && (
            <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6 space-y-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cấu hình Thuế VAT (POS)</h3>
                  <p className="text-xs text-stone-500 mt-1">Tự động áp thuế VAT 10% vào tất cả hóa đơn khi thanh toán trên POS.</p>
                </div>
                
                <button
                  onClick={handleToggleGlobalVat}
                  className={`relative h-6 w-11 rounded-full transition-colors duration-200 cursor-pointer ${
                    globalVatEnabled ? "bg-amber-500" : "bg-stone-700"
                  }`}
                >
                  <span
                    className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200"
                    style={{ transform: globalVatEnabled ? "translateX(20px)" : "translateX(0px)" }}
                  />
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-white/30" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">
                Danh sách {activeTypeInfo?.title}
              </h2>
            </div>

            <button
              onClick={() => handleAddDevice(activeSection as any)}
              disabled={addingToType !== null}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2 text-xs font-bold transition-all shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50"
            >
              {addingToType === activeSection ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Thêm thiết bị
            </button>
          </div>

          {filteredDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16 text-center">
              <Settings className="h-10 w-10 text-stone-600 mb-3" />
              <p className="text-sm text-stone-500 font-medium">Chưa có {activeTypeInfo?.title} nào</p>
              <p className="text-xs text-stone-600 mt-1">Bấm nút &quot;Thêm thiết bị&quot; để cài đặt thiết bị đầu tiên.</p>
            </div>
          ) : (
          <div className="space-y-4">
            {filteredDevices.map((device) => {
              const isExpanded = expandedDevice === device.id;
              const testResult = testResults[device.id];
              const isSaving = savingDevice === device.id;
              const isSaved = savedDevices[device.id];

              return (
                <div
                  key={device.id}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                    device.enabled
                      ? `border-${activeTypeInfo?.accentColor}-500/20 bg-white/[0.04]`
                      : "border-white/[0.06] bg-white/[0.02]"
                  } ${isExpanded ? "shadow-xl shadow-black/10" : ""}`}
                >
                  {/* Accent bar */}
                  {device.enabled && (
                    <div
                      className={`absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b ${activeTypeInfo?.iconGradient}`}
                    />
                  )}

                  {/* Device Header */}
                  <div className="flex w-full items-center justify-between px-6 py-5">
                    <button
                      onClick={() => setExpandedDevice(isExpanded ? null : device.id)}
                      className="flex flex-1 items-center gap-4 text-left cursor-pointer"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10`}
                      >
                        {activeTypeInfo && (
                          <activeTypeInfo.icon className="h-4 w-4 text-stone-400 group-hover:text-white transition-colors" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {device.deviceName}
                        </h3>
                        <p className="mt-0.5 text-[10px] font-mono text-stone-500">
                          {device.connectionType === "network"
                            ? `IP: ${device.ipAddress}:${device.port}`
                            : device.connectionType === "usb"
                            ? "Kết nối USB"
                            : "Kết nối Bluetooth"}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-3">
                      {/* Active Status switch */}
                      <button
                        onClick={() =>
                          handleUpdateDeviceField(device.id, "enabled", !device.enabled)
                        }
                        className={`relative h-5.5 w-10 rounded-full transition-colors duration-200 cursor-pointer ${
                          device.enabled ? "bg-emerald-500" : "bg-stone-700"
                        }`}
                        title={device.enabled ? "Tắt hoạt động" : "Bật hoạt động"}
                      >
                        <span
                          className="absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-md transition-transform duration-200"
                          style={{
                            transform: device.enabled ? "translateX(18px)" : "translateX(0px)",
                          }}
                        />
                      </button>

                      {/* Expand Chevron */}
                      <button
                        onClick={() => setExpandedDevice(isExpanded ? null : device.id)}
                        className="p-1 rounded-lg hover:bg-white/5 text-stone-500 hover:text-white cursor-pointer"
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded config panel */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.05] px-6 pb-6 pt-5 bg-stone-950/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        {/* Device name */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                            <Hash className="h-3 w-3" />
                            Tên hiển thị
                          </label>
                          <input
                            type="text"
                            value={device.deviceName}
                            onChange={(e) =>
                              handleUpdateDeviceField(device.id, "deviceName", e.target.value)
                            }
                            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-stone-200 backdrop-blur-sm focus:border-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                          />
                        </div>

                        {/* Connection type */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                            <Usb className="h-3 w-3" />
                            Kiểu kết nối
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(
                              [
                                { value: "usb", label: "USB" },
                                { value: "network", label: "Mạng LAN" },
                                { value: "bluetooth", label: "Bluetooth" },
                              ] as const
                            ).map((option) => (
                              <button
                                key={option.value}
                                onClick={() =>
                                  handleUpdateDeviceField(
                                    device.id,
                                    "connectionType",
                                    option.value
                                  )
                                }
                                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                                  device.connectionType === option.value
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                    : "border-white/[0.06] bg-white/[0.02] text-stone-500 hover:border-white/15 hover:text-stone-300"
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Network config (only for network type) */}
                        {device.connectionType === "network" && (
                          <div className="grid grid-cols-2 gap-4 md:col-span-2">
                            <div className="space-y-2">
                              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                                <Globe className="h-3 w-3" />
                                Địa chỉ IP
                              </label>
                              <input
                                type="text"
                                placeholder="192.168.1.100"
                                value={device.ipAddress}
                                onChange={(e) =>
                                  handleUpdateDeviceField(device.id, "ipAddress", e.target.value)
                                }
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-mono text-sm text-stone-200 backdrop-blur-sm focus:border-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                                <Hash className="h-3 w-3" />
                                Cổng (Port)
                              </label>
                              <input
                                type="text"
                                placeholder="8080"
                                value={device.port}
                                onChange={(e) =>
                                  handleUpdateDeviceField(device.id, "port", e.target.value)
                                }
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-mono text-sm text-stone-200 backdrop-blur-sm focus:border-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Form Actions */}
                      <div className="flex flex-wrap items-center justify-between border-t border-white/[0.05] pt-4 gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleTestConnection(device.id)}
                            disabled={testingDevice === device.id}
                            className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-500/15 disabled:opacity-50 cursor-pointer"
                          >
                            {testingDevice === device.id ? (
                              <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Wifi className="h-3.5 w-3.5" />
                            )}
                            {testingDevice === device.id ? "Đang thử..." : "Test kết nối"}
                          </button>

                          {testResult && (
                            <span
                              className={`flex items-center gap-1.5 text-xs font-medium ${
                                testResult.success ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {testResult.success ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                              )}
                              {testResult.message}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => handleDeleteDevice(device.id)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent bg-white/[0.04] text-stone-500 transition-all hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
                            title="Xoá thiết bị"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSaveDevice(device.id)}
                            disabled={isSaving}
                            className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold shadow-lg transition-all cursor-pointer ${
                              isSaved
                                ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                : "bg-amber-500 text-stone-950 shadow-amber-500/20 hover:bg-amber-400"
                            } disabled:opacity-50`}
                          >
                            {isSaving ? (
                              <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                            ) : isSaved ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            {isSaving ? "Đang lưu..." : isSaved ? "Đã lưu!" : "Lưu thiết bị"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {activeSection === "category" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: Add/Edit form */}
          <div className="md:col-span-1 bg-[#111114] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {editingCategory ? "Sửa danh mục" : "Thêm danh mục mới"}
            </h3>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5">Tên danh mục *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/đ/g, "d")
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "");
                    setCategoryForm({
                      ...categoryForm,
                      name,
                      slug: editingCategory ? categoryForm.slug : slug
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                  placeholder="VD: Trà trái cây"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5">Mã Slug (Không dấu, không khoảng cách) *</label>
                <input
                  type="text"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  className="w-full px-4 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50 font-mono"
                  placeholder="VD: tra-trai-cay"
                  disabled={!!editingCategory}
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5">Biểu tượng *</label>
                  <select
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Coffee" className="bg-stone-900 text-white">Ly Cà phê</option>
                    <option value="Flower" className="bg-stone-900 text-white">Hoa (Trà)</option>
                    <option value="Cake" className="bg-stone-900 text-white">Bánh ngọt</option>
                    <option value="Utensils" className="bg-stone-900 text-white">Món ăn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5">Thứ tự sắp xếp *</label>
                  <input
                    type="number"
                    value={categoryForm.sort_order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                {editingCategory && (
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm({ name: "", slug: "", icon: "Coffee", sort_order: 0 });
                    }}
                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  onClick={handleSaveCategory}
                  disabled={savingCategory || !categoryForm.name || !categoryForm.slug}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 px-4 py-2.5 text-xs font-bold transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  {savingCategory && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingCategory ? "Cập nhật" : "Thêm mới"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right panel: Table list */}
          <div className="md:col-span-2 bg-[#111114] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Danh sách danh mục hiện tại
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      <th className="py-2.5">Tên danh mục</th>
                      <th className="py-2.5">Mã Slug</th>
                      <th className="py-2.5">Icon</th>
                      <th className="py-2.5 text-center">Sắp xếp</th>
                      <th className="py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="text-stone-300 hover:bg-white/[0.01]">
                        <td className="py-3 font-semibold text-stone-200">{cat.name}</td>
                        <td className="py-3 font-mono text-stone-400 text-[10px]">{cat.slug}</td>
                        <td className="py-3 text-stone-400">{cat.icon}</td>
                        <td className="py-3 text-center">{cat.sort_order}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingCategory(cat);
                                setCategoryForm({
                                  name: cat.name,
                                  slug: cat.slug,
                                  icon: cat.icon || "Coffee",
                                  sort_order: cat.sort_order || 0
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-stone-400 hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => cat.id && handleDeleteCategory(cat.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === "topping" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: Add/Edit form */}
          <div className="md:col-span-1 bg-[#111114] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {editingTopping ? "Sửa Topping" : "Thêm Topping mới"}
            </h3>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5">Tên Topping *</label>
                <input
                  type="text"
                  value={toppingForm.name}
                  onChange={(e) => setToppingForm({ ...toppingForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                  placeholder="VD: Trân châu hoàng kim"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5">Giá Topping (đ) *</label>
                <input
                  type="number"
                  value={toppingForm.price}
                  onChange={(e) => setToppingForm({ ...toppingForm, price: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-4 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                  placeholder="VD: 8000"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                {editingTopping && (
                  <button
                    onClick={() => {
                      setEditingTopping(null);
                      setToppingForm({ name: "", price: 0 });
                    }}
                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  onClick={handleSaveTopping}
                  disabled={savingTopping || !toppingForm.name}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 px-4 py-2.5 text-xs font-bold transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  {savingTopping && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingTopping ? "Cập nhật" : "Thêm mới"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right panel: Table list */}
          <div className="md:col-span-2 bg-[#111114] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Danh sách topping hiện tại
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      <th className="py-2.5">Tên Topping</th>
                      <th className="py-2.5 text-right">Giá tiền (đ)</th>
                      <th className="py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {toppings.map((t) => (
                      <tr key={t.id} className="text-stone-300 hover:bg-white/[0.01]">
                        <td className="py-3 font-semibold text-stone-200">{t.name}</td>
                        <td className="py-3 text-right font-mono text-amber-400">{t.price.toLocaleString()}đ</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingTopping(t);
                                setToppingForm({
                                  name: t.name,
                                  price: t.price || 0
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-stone-400 hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => t.id && handleDeleteTopping(t.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
