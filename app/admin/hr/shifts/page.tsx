"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  X,
} from "lucide-react";
import Modal from "@/components/admin/Modal";

interface ShiftConfig {
  id: number;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  day_value: string;
  is_active: boolean;
}

interface Registration {
  id: number;
  employee_id: number;
  employee_code: string;
  full_name: string;
  shift_date: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected";
}

interface SwapRequest {
  id: number;
  requester_name: string;
  requester_code: string;
  target_name: string;
  target_code: string;
  req_date: string;
  req_shift_name: string;
  tar_date: string | null;
  tar_shift_name: string | null;
  status: "pending" | "approved" | "rejected";
}

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function HRShifts() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"calendar" | "approvals" | "swaps" | "configs">("calendar");
  const [shifts, setShifts] = useState<ShiftConfig[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Week Navigation
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  });

  // Modal ca làm
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftName, setShiftName] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("12:00");
  const [shiftBreak, setShiftBreak] = useState("0");
  const [shiftDayVal, setShiftDayVal] = useState("0.5");
  const [submittingShift, setSubmittingShift] = useState(false);
  const [shiftFeedback, setShiftFeedback] = useState<string | null>(null);

  // Access Control: Redirect if not Owner/Manager (or admin)
  useEffect(() => {
    if (user) {
      const isHR =
        user.role === "admin" ||
        user.businessRoles?.includes("owner") ||
        user.businessRoles?.includes("manager");
      if (!isHR) {
        router.push("/admin");
      }
    }
  }, [user, router]);

  useEffect(() => {
    fetchData(true);
  }, [currentWeekStart]);

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      const type = customEvent.detail?.type;
      if (type === "shift_register" || type === "shift_approval" || type === "swap_approval") {
        fetchData();
      }
    };
    window.addEventListener("sse-notification", handleNotification);
    return () => {
      window.removeEventListener("sse-notification", handleNotification);
    };
  }, []);

  async function fetchData(showSpinner = false) {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      // Get week range formatted strings
      const weekStartStr = getLocalDateString(currentWeekStart);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = getLocalDateString(weekEnd);

      // Fetch configs
      const configsRes = await fetch("/api/hr/shifts");
      if (configsRes.ok) {
        setShifts(await configsRes.json());
      }

      // Fetch registrations for current week
      const regsRes = await fetch(`/api/hr/registrations?start_date=${weekStartStr}&end_date=${weekEndStr}`);
      if (regsRes.ok) {
        setRegistrations(await regsRes.json());
      }

      // Fetch swap requests
      const swapsRes = await fetch("/api/hr/swap-requests");
      if (swapsRes.ok) {
        setSwaps(await swapsRes.json());
      }
    } catch (err) {
      console.error("Error fetching HR shifts details:", err);
    } finally {
      setLoading(false);
    }
  }

  // Shift config submit
  async function handleCreateShift(e: React.FormEvent) {
    e.preventDefault();
    if (!shiftName || !shiftCode || !shiftStart || !shiftEnd) {
      setShiftFeedback("Vui lòng điền đủ thông tin.");
      return;
    }
    setSubmittingShift(true);
    setShiftFeedback(null);
    try {
      const res = await fetch("/api/hr/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shiftName,
          code: shiftCode,
          start_time: `${shiftStart}:00`,
          end_time: `${shiftEnd}:00`,
          break_minutes: parseInt(shiftBreak) || 0,
          day_value: parseFloat(shiftDayVal) || 1.0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShiftModalOpen(false);
        setShiftName("");
        setShiftCode("");
        fetchData();
      } else {
        setShiftFeedback(data.error || "Tạo ca làm thất bại.");
      }
    } catch {
      setShiftFeedback("Lỗi kết nối.");
    } finally {
      setSubmittingShift(false);
    }
  }

  // Registration actions
  async function handleProcessRegistration(id: number, status: "approved" | "rejected") {
    try {
      const res = await fetch(`/api/hr/registrations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchData();
      } else {
        alert(data.error || "Xử lý đăng ký thất bại.");
      }
    } catch {
      alert("Lỗi kết nối.");
    }
  }

  // Swap requests actions
  async function handleProcessSwap(id: number, status: "approved" | "rejected") {
    try {
      const res = await fetch(`/api/hr/swap-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchData();
      } else {
        alert(data.error || "Xử lý đổi ca thất bại.");
      }
    } catch {
      alert("Lỗi kết nối.");
    }
  }

  // Toggle shift active status
  async function handleToggleShiftActive(shift: ShiftConfig) {
    try {
      const res = await fetch(`/api/hr/shifts/${shift.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !shift.is_active }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchData();
      }
    } catch {
      alert("Lỗi kết nối.");
    }
  }

  // Navigation week
  function changeWeek(direction: number) {
    const nextStart = new Date(currentWeekStart);
    nextStart.setDate(nextStart.getDate() + direction * 7);
    setCurrentWeekStart(nextStart);
  }

  // Generate week dates array
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    weekDates.push(date);
  }

  // Helper: Get unique employees scheduled this week
  const weekRegisteredEmployees = Array.from(
    new Set(registrations.filter((r) => r.status === "approved").map((r) => r.employee_id))
  ).map((empId) => {
    const found = registrations.find((r) => r.employee_id === empId);
    return {
      id: empId,
      full_name: found?.full_name || "Nhân viên",
      employee_code: found?.employee_code || "EMP000",
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Lịch Làm Việc & Phân Ca</h1>
          <p className="text-white/50 text-sm">Quản lý xếp ca tuần, duyệt đơn đăng ký ca và duyệt các yêu cầu đổi ca của nhân viên</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-6 text-sm font-semibold overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-px">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`pb-3 transition-colors cursor-pointer relative ${
            activeTab === "calendar" ? "text-amber-400" : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Lịch Phân Ca Tuần
          {activeTab === "calendar" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
        </button>

        <button
          onClick={() => setActiveTab("approvals")}
          className={`pb-3 transition-colors cursor-pointer relative ${
            activeTab === "approvals" ? "text-amber-400" : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Duyệt Đăng Ký Ca ({registrations.filter((r) => r.status === "pending").length})
          {activeTab === "approvals" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
        </button>

        <button
          onClick={() => setActiveTab("swaps")}
          className={`pb-3 transition-colors cursor-pointer relative ${
            activeTab === "swaps" ? "text-amber-400" : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Yêu Cầu Đổi Ca ({swaps.filter((s) => s.status === "pending").length})
          {activeTab === "swaps" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
        </button>

        <button
          onClick={() => setActiveTab("configs")}
          className={`pb-3 transition-colors cursor-pointer relative ${
            activeTab === "configs" ? "text-amber-400" : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Cấu Hình Danh Mục Ca
          {activeTab === "configs" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div>
          {/* TAB 1: WEEK CALENDAR */}
          {activeTab === "calendar" && (
            <div className="space-y-6">
              {/* Week navigation control */}
              <div className="flex items-center justify-between flex-wrap gap-4 bg-stone-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => changeWeek(-1)}
                    className="w-9 h-9 rounded-xl bg-stone-950 border border-stone-850 hover:bg-stone-900 flex items-center justify-center text-stone-400 hover:text-white transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-white font-mono">
                    Tuần: {weekDates[0].toLocaleDateString("vi-VN")} - {weekDates[6].toLocaleDateString("vi-VN")}
                  </span>
                  <button
                    onClick={() => changeWeek(1)}
                    className="w-9 h-9 rounded-xl bg-stone-950 border border-stone-850 hover:bg-stone-900 flex items-center justify-center text-stone-400 hover:text-white transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-stone-400 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dưới đây là lịch ca làm đã được duyệt hoạt động.</span>
                </div>
              </div>

              {/* Weekly schedule Matrix */}
              <div className="bg-stone-900/40 border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-white/5 bg-stone-950/20 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                        <th className="p-4 pl-6 w-[200px]">Nhân viên</th>
                        {weekDates.map((date, idx) => (
                          <th key={idx} className="p-4 text-center">
                            <p className="font-semibold text-white">
                              {date.toLocaleDateString("vi-VN", { weekday: "short" })}
                            </p>
                            <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                              {date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                            </p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-stone-300">
                      {weekRegisteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-stone-500 font-sans">
                            Không có nhân viên nào có lịch làm việc trong tuần này.
                          </td>
                        </tr>
                      ) : (
                        weekRegisteredEmployees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-white/1 transition-colors">
                            <td className="p-4 pl-6 font-semibold text-stone-200">
                              <p className="text-sm font-semibold text-white">{emp.full_name}</p>
                              <p className="text-[9px] text-stone-500 font-mono">{emp.employee_code}</p>
                            </td>

                            {/* Render ca làm cho mỗi ngày */}
                            {weekDates.map((date, dateIdx) => {
                              const dateStr = getLocalDateString(date);
                              const activeShiftDays = registrations.filter(
                                (r) =>
                                  r.employee_id === emp.id &&
                                  r.shift_date.substring(0, 10) === dateStr &&
                                  r.status === "approved"
                              );

                              return (
                                <td key={dateIdx} className="p-2 text-center">
                                  {activeShiftDays.length === 0 ? (
                                    <span className="text-[10px] text-stone-600 italic">Off</span>
                                  ) : (
                                    <div className="flex flex-col gap-1 items-center">
                                      {activeShiftDays.map((reg) => (
                                        <span
                                          key={reg.id}
                                          className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium tracking-wide w-full max-w-[100px] truncate"
                                          title={`${reg.shift_name} (${reg.start_time.substring(0, 5)} - ${reg.end_time.substring(0, 5)})`}
                                        >
                                          {reg.shift_name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PENDING REGISTRATIONS APPROVALS */}
          {activeTab === "approvals" && (
            <div className="bg-stone-900/40 border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-stone-950/20 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      <th className="p-4 pl-6">Nhân viên</th>
                      <th className="p-4">Ngày đăng ký</th>
                      <th className="p-4">Ca làm đề xuất</th>
                      <th className="p-4">Thời gian ca</th>
                      <th className="p-4 pr-6 text-right">Duyệt ca</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-stone-300 font-sans">
                    {registrations.filter((r) => r.status === "pending").length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-stone-500">
                          Không có đăng ký ca làm nào đang chờ phê duyệt trong tuần này.
                        </td>
                      </tr>
                    ) : (
                      registrations
                        .filter((r) => r.status === "pending")
                        .map((reg) => (
                          <tr key={reg.id} className="hover:bg-white/2 transition-colors">
                            <td className="p-4 pl-6">
                              <p className="font-semibold text-white">{reg.full_name}</p>
                              <p className="text-[10px] text-stone-500 font-mono">{reg.employee_code}</p>
                            </td>
                            <td className="p-4 font-semibold">
                              {new Date(reg.shift_date).toLocaleDateString("vi-VN", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </td>
                            <td className="p-4 font-medium text-stone-200">{reg.shift_name}</td>
                            <td className="p-4 font-mono text-stone-400">
                              {reg.start_time.substring(0, 5)} - {reg.end_time.substring(0, 5)}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleProcessRegistration(reg.id, "approved")}
                                  className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-all cursor-pointer border border-emerald-500/20 hover:border-emerald-500/40"
                                  title="Đồng ý duyệt"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleProcessRegistration(reg.id, "rejected")}
                                  className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-all cursor-pointer border border-rose-500/20 hover:border-rose-500/40"
                                  title="Từ chối duyệt"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SHIFT SWAP REQUESTS */}
          {activeTab === "swaps" && (
            <div className="bg-stone-900/40 border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-stone-950/20 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      <th className="p-4 pl-6">Người gửi yêu cầu</th>
                      <th className="p-4">Ca muốn đổi</th>
                      <th className="p-4">Đối tác nhận đổi</th>
                      <th className="p-4">Ca đổi đối ứng</th>
                      <th className="p-4 pr-6 text-right">Duyệt đổi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-stone-300 font-sans">
                    {swaps.filter((s) => s.status === "pending").length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-stone-500">
                          Không có yêu cầu đổi ca làm nào đang chờ phê duyệt.
                        </td>
                      </tr>
                    ) : (
                      swaps
                        .filter((s) => s.status === "pending")
                        .map((swap) => (
                          <tr key={swap.id} className="hover:bg-white/2 transition-colors">
                            {/* Requester */}
                            <td className="p-4 pl-6">
                              <p className="font-semibold text-white">{swap.requester_name}</p>
                              <p className="text-[10px] text-stone-500 font-mono">{swap.requester_code}</p>
                            </td>

                            {/* Requester Shift */}
                            <td className="p-4">
                              <p className="font-semibold text-stone-300">
                                {new Date(swap.req_date).toLocaleDateString("vi-VN")}
                              </p>
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-medium font-sans mt-1 inline-block">
                                {swap.req_shift_name}
                              </span>
                            </td>

                            {/* Target Employee */}
                            <td className="p-4">
                              <p className="font-semibold text-white">{swap.target_name}</p>
                              <p className="text-[10px] text-stone-500 font-mono">{swap.target_code}</p>
                            </td>

                            {/* Target Shift */}
                            <td className="p-4">
                              {swap.tar_date ? (
                                <>
                                  <p className="font-semibold text-stone-300">
                                    {new Date(swap.tar_date).toLocaleDateString("vi-VN")}
                                  </p>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-medium font-sans mt-1 inline-block">
                                    {swap.tar_shift_name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-stone-500 italic">Nhượng ca (không đối ứng)</span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="p-4 pr-6 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleProcessSwap(swap.id, "approved")}
                                  className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-all cursor-pointer border border-emerald-500/20 hover:border-emerald-500/40"
                                  title="Phê duyệt đổi ca"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleProcessSwap(swap.id, "rejected")}
                                  className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-all cursor-pointer border border-rose-500/20 hover:border-rose-500/40"
                                  title="Từ chối đổi ca"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SHIFT CONFIGS */}
          {activeTab === "configs" && (
            <div className="space-y-6">
              {/* Header block with trigger config add */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShiftModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Định nghĩa ca mới
                </button>
              </div>

              {/* Configurations List */}
              <div className="bg-stone-900/40 border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-stone-950/20 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                        <th className="p-4 pl-6">Tên ca</th>
                        <th className="p-4">Mã ca</th>
                        <th className="p-4">Giờ làm việc</th>
                        <th className="p-4">Nghỉ giữa ca</th>
                        <th className="p-4">Hệ số công</th>
                        <th className="p-4">Trạng thái</th>
                        <th className="p-4 pr-6 text-right">Bật/Tắt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-stone-300 font-sans">
                      {shifts.map((s) => (
                        <tr key={s.id} className="hover:bg-white/2 transition-colors">
                          <td className="p-4 pl-6 font-semibold text-white">{s.name}</td>
                          <td className="p-4 font-mono text-amber-500">{s.code}</td>
                          <td className="p-4 font-mono font-medium">
                            {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                          </td>
                          <td className="p-4 font-mono">{s.break_minutes} phút</td>
                          <td className="p-4 font-mono text-stone-200 font-bold">{parseFloat(s.day_value)} công</td>
                          <td className="p-4">
                            <span
                              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                s.is_active
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-stone-500/10 text-stone-500 border-stone-800"
                              }`}
                            >
                              {s.is_active ? "Hoạt động" : "Tạm khóa"}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => handleToggleShiftActive(s)}
                              className={`px-3 py-1 text-[10px] font-semibold rounded border cursor-pointer transition-all ${
                                s.is_active
                                  ? "bg-stone-850 hover:bg-stone-800 text-stone-300 border-white/5"
                                  : "bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-stone-950 border-amber-500/20"
                              }`}
                            >
                              {s.is_active ? "Khóa ca" : "Mở ca"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Custom Shift Modal */}
      <Modal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title="Định nghĩa ca làm việc mới"
        size="md"
      >
        <form onSubmit={handleCreateShift} className="space-y-4 pt-2">
          {shiftFeedback && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-sans rounded-xl">
              {shiftFeedback}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-stone-400 uppercase">Tên ca làm việc *</label>
            <input
              type="text"
              required
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="e.g. Ca Sáng, Ca Gãy..."
              className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-stone-400 uppercase">Mã ca (viết liền viết thường) *</label>
            <input
              type="text"
              required
              value={shiftCode}
              onChange={(e) => setShiftCode(e.target.value)}
              placeholder="e.g. casang, cagay..."
              className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-400 uppercase">Giờ bắt đầu *</label>
              <input
                type="time"
                required
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-400 uppercase">Giờ kết thúc *</label>
              <input
                type="time"
                required
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-400 uppercase">Nghỉ giữa ca (phút)</label>
              <input
                type="number"
                value={shiftBreak}
                onChange={(e) => setShiftBreak(e.target.value)}
                className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-400 uppercase">Hệ số tính công tháng</label>
              <input
                type="number"
                step="0.1"
                value={shiftDayVal}
                onChange={(e) => setShiftDayVal(e.target.value)}
                className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setShiftModalOpen(false)}
              className="px-4 py-2 border border-stone-850 hover:bg-stone-900 text-stone-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submittingShift}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-amber-500/10"
            >
              {submittingShift && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu ca làm</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
