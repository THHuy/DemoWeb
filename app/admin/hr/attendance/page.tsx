"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Loader2,
  Edit2,
  Info,
  Laptop,
  Globe,
  MapPin,
  Check,
  X,
} from "lucide-react";
import Modal from "@/components/admin/Modal";

interface AttendanceLog {
  id: number;
  employee_code: string;
  full_name: string;
  shift_date: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  check_in: string | null;
  check_out: string | null;
  is_late: boolean;
  late_minutes: number;
  is_early: boolean;
  early_minutes: number;
  device: string | null;
  ip: string | null;
  gps_location: string | null;
  status: "pending_approval" | "approved" | "rejected";
}

interface LeaveRequest {
  id: number;
  employee_code: string;
  full_name: string;
  start_date: string;
  end_date: string;
  leave_type: "annual" | "sick" | "unpaid";
  reason: string;
  status: "pending" | "approved" | "rejected";
}

function HRAttendanceContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"logs" | "leaves">("logs");

  useEffect(() => {
    if (tabParam === "leaves") {
      setActiveTab("leaves");
    } else if (tabParam === "logs") {
      setActiveTab("logs");
    }
  }, [tabParam]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDate, setFilterDate] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Edit Log Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [checkInVal, setCheckInVal] = useState("");
  const [checkOutVal, setCheckOutVal] = useState("");
  const [logStatus, setLogStatus] = useState<"pending_approval" | "approved" | "rejected">("approved");
  const [submittingLog, setSubmittingLog] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

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
    fetchData();
  }, [filterDate]);

  async function fetchData() {
    setLoading(true);
    try {
      let url = "/api/hr/attendance";
      if (filterDate) {
        url += `?start_date=${filterDate}&end_date=${filterDate}`;
      }

      // Fetch logs
      const logsRes = await fetch(url);
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }

      // Fetch leave requests
      const leavesRes = await fetch("/api/hr/leaves");
      if (leavesRes.ok) {
        setLeaves(await leavesRes.json());
      }
    } catch (err) {
      console.error("Error loading HR attendance:", err);
    } finally {
      setLoading(false);
    }
  }

  function openEditModal(log: AttendanceLog) {
    setEditingLog(log);
    
    // Format check_in/out dates for input type datetime-local
    if (log.check_in) {
      const d = new Date(log.check_in);
      // adjust for local timezone formatting YYYY-MM-DDTHH:MM
      const offset = d.getTimezoneOffset() * 60000;
      const local = new Date(d.getTime() - offset);
      setCheckInVal(local.toISOString().substring(0, 16));
    } else {
      setCheckInVal("");
    }

    if (log.check_out) {
      const d = new Date(log.check_out);
      const offset = d.getTimezoneOffset() * 60000;
      const local = new Date(d.getTime() - offset);
      setCheckOutVal(local.toISOString().substring(0, 16));
    } else {
      setCheckOutVal("");
    }

    setLogStatus(log.status);
    setModalFeedback(null);
    setEditModalOpen(true);
  }

  async function handleSaveLog(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLog) return;
    setSubmittingLog(true);
    setModalFeedback(null);
    try {
      const res = await fetch(`/api/hr/attendance/${editingLog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_in: checkInVal ? new Date(checkInVal).toISOString() : null,
          check_out: checkOutVal ? new Date(checkOutVal).toISOString() : null,
          status: logStatus,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditModalOpen(false);
        fetchData();
      } else {
        setModalFeedback(data.error || "Cập nhật công thất bại.");
      }
    } catch {
      setModalFeedback("Lỗi kết nối.");
    } finally {
      setSubmittingLog(false);
    }
  }

  async function handleProcessLeave(id: number, status: "approved" | "rejected") {
    if (!confirm(`Bạn có chắc chắn muốn ${status === "approved" ? "duyệt đồng ý" : "từ chối"} đơn xin nghỉ phép này không?`)) return;
    try {
      const res = await fetch(`/api/hr/leaves/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchData();
      } else {
        alert(data.error || "Xử lý đơn nghỉ phép thất bại.");
      }
    } catch {
      alert("Lỗi kết nối.");
    }
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return "---";
    const d = new Date(timeStr);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDevice(userAgent: string | null) {
    if (!userAgent) return "---";
    if (userAgent.includes("Mobi") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
      return "Di động";
    }
    return "Máy tính";
  }

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const term = filterSearch.toLowerCase();
    return (
      log.full_name.toLowerCase().includes(term) ||
      log.employee_code.toLowerCase().includes(term) ||
      log.shift_name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Chấm Công & Nghỉ Phép</h1>
        <p className="text-white/50 text-sm">Theo dõi lịch trình đi trễ về sớm, duyệt nghỉ phép và hiệu chỉnh sai sót giờ công</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 transition-colors cursor-pointer relative ${
            activeTab === "logs" ? "text-amber-400" : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Nhật Ký Chấm Công Hàng Ngày
          {activeTab === "logs" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
        </button>

        <button
          onClick={() => setActiveTab("leaves")}
          className={`pb-3 transition-colors cursor-pointer relative ${
            activeTab === "leaves" ? "text-amber-400" : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Đơn Xin Nghỉ Phép ({leaves.filter((l) => l.status === "pending").length})
          {activeTab === "leaves" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
        </button>
      </div>

      {/* Main Contents */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div>
          {/* TAB 1: ATTENDANCE LOGS LIST */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="bg-stone-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-xl flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center flex-1 min-w-[280px]">
                  <input
                    type="text"
                    placeholder="Tìm kiếm nhân viên, ca làm..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="px-4 py-2.5 bg-stone-950/40 border border-white/5 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans min-w-[240px]"
                  />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-4 py-2.5 bg-stone-950/40 border border-white/5 rounded-xl text-stone-300 text-xs focus:outline-none focus:border-amber-500/40 font-mono"
                  />
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate("")}
                      className="text-xs text-amber-500 hover:underline cursor-pointer"
                    >
                      Xóa lọc ngày
                    </button>
                  )}
                </div>

                <div className="text-xs text-stone-500 flex items-center gap-1.5 font-sans">
                  <Info className="w-4 h-4 text-stone-500" />
                  Bản ghi đi kèm thiết bị, IP mạng và tọa độ checkin.
                </div>
              </div>

              {/* Table logs */}
              <div className="bg-stone-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-stone-950/20 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                        <th className="p-4 pl-6">Nhân viên</th>
                        <th className="p-4">Ngày & Ca</th>
                        <th className="p-4">Check-in</th>
                        <th className="p-4">Check-out</th>
                        <th className="p-4">Lỗi vi phạm</th>
                        <th className="p-4">Thiết bị & IP</th>
                        <th className="p-4">Trạng thái</th>
                        <th className="p-4 pr-6 text-right">Sửa công</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-stone-300 font-sans">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-stone-500">
                            Không có nhật ký chấm công phù hợp.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/2 transition-colors">
                            {/* Employee */}
                            <td className="p-4 pl-6">
                              <p className="font-semibold text-white">{log.full_name}</p>
                              <p className="text-[9px] text-stone-500 font-mono mt-0.5">{log.employee_code}</p>
                            </td>

                            {/* Date and Shift */}
                            <td className="p-4">
                              <p className="font-semibold text-stone-200">
                                {new Date(log.shift_date).toLocaleDateString("vi-VN")}
                              </p>
                              <p className="text-[10px] text-stone-500 font-sans mt-0.5">{log.shift_name}</p>
                            </td>

                            {/* Check-In */}
                            <td className="p-4 font-mono">
                              <span className={log.check_in ? "text-stone-300" : "text-rose-400 font-semibold italic"}>
                                {log.check_in ? formatTime(log.check_in) : "Quên Checkin"}
                              </span>
                            </td>

                            {/* Check-Out */}
                            <td className="p-4 font-mono">
                              <span className={log.check_out ? "text-stone-300" : "text-rose-400 font-semibold italic"}>
                                {log.check_out ? formatTime(log.check_out) : "Quên Checkout"}
                              </span>
                            </td>

                            {/* Violations */}
                            <td className="p-4 text-amber-500">
                              {log.is_late && <p>Đi trễ {log.late_minutes}p</p>}
                              {log.is_early && <p>Về sớm {log.early_minutes}p</p>}
                              {!log.is_late && !log.is_early && <span className="text-stone-500">Đúng giờ</span>}
                            </td>

                            {/* Device & IP */}
                            <td className="p-4 text-stone-400 space-y-0.5">
                              <p className="flex items-center gap-1">
                                <Laptop className="w-3.5 h-3.5 text-stone-500" />
                                {formatDevice(log.device)}
                              </p>
                              <p className="flex items-center gap-1 font-mono text-[10px]">
                                <Globe className="w-3.5 h-3.5 text-stone-500" />
                                {log.ip || "---"}
                              </p>
                              {log.gps_location && !log.gps_location.includes("Bị chặn") && (
                                <p className="flex items-center gap-1 font-mono text-[9px] text-stone-500">
                                  <MapPin className="w-3 h-3 text-stone-600" />
                                  {log.gps_location}
                                </p>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-4">
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                  log.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : log.status === "rejected"
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }`}
                              >
                                {log.status === "approved" ? "Đã duyệt" : log.status === "rejected" ? "Từ chối" : "Chờ xác nhận"}
                              </span>
                            </td>

                            {/* Manual Override Action */}
                            <td className="p-4 pr-6 text-right">
                              <button
                                onClick={() => openEditModal(log)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-amber-500/20 flex items-center justify-center text-stone-400 hover:text-amber-400 transition-all cursor-pointer border border-white/5"
                                title="Chỉnh sửa giờ công"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LEAVE REQUESTS APPROVAL */}
          {activeTab === "leaves" && (
            <div className="bg-stone-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-stone-950/20 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      <th className="p-4 pl-6">Nhân viên</th>
                      <th className="p-4">Thời gian xin nghỉ</th>
                      <th className="p-4">Loại phép</th>
                      <th className="p-4">Lý do</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 pr-6 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-stone-300 font-sans">
                    {leaves.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-stone-500">
                          Chưa có đơn xin nghỉ phép nào.
                        </td>
                      </tr>
                    ) : (
                      leaves.map((leave) => (
                        <tr key={leave.id} className="hover:bg-white/2 transition-colors">
                          <td className="p-4 pl-6">
                            <p className="font-semibold text-white">{leave.full_name}</p>
                            <p className="text-[10px] text-stone-500 font-mono">{leave.employee_code}</p>
                          </td>
                          <td className="p-4 font-semibold text-stone-200">
                            {new Date(leave.start_date).toLocaleDateString("vi-VN")} - {new Date(leave.end_date).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-stone-950 text-[10px] border border-white/5 font-semibold text-stone-300">
                              {leave.leave_type === "annual" ? "Phép năm" : leave.leave_type === "sick" ? "Nghỉ bệnh" : "Không lương"}
                            </span>
                          </td>
                          <td className="p-4 text-stone-400 max-w-[200px] truncate" title={leave.reason}>
                            {leave.reason}
                          </td>
                          <td className="p-4">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                leave.status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : leave.status === "rejected"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}
                            >
                              {leave.status === "approved" ? "Đồng ý" : leave.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            {leave.status === "pending" ? (
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => handleProcessLeave(leave.id, "approved")}
                                  className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-stone-950 flex items-center justify-center transition-all cursor-pointer border border-emerald-500/20"
                                  title="Duyệt phép"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleProcessLeave(leave.id, "rejected")}
                                  className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-stone-950 flex items-center justify-center transition-all cursor-pointer border border-rose-500/20"
                                  title="Từ chối phép"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-stone-500 italic">Đã xử lý</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Override Log Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Hiệu chỉnh giờ công nhân viên"
        size="md"
      >
        <form onSubmit={handleSaveLog} className="space-y-4 pt-2">
          {modalFeedback && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-sans rounded-xl">
              {modalFeedback}
            </div>
          )}

          {editingLog && (
            <div className="p-3 bg-stone-950 border border-white/5 rounded-xl text-xs space-y-1">
              <p><span className="text-stone-500 font-sans">Nhân viên:</span> <span className="font-semibold text-white">{editingLog.full_name} ({editingLog.employee_code})</span></p>
              <p><span className="text-stone-500 font-sans">Ca làm việc:</span> <span className="font-semibold text-white">{editingLog.shift_name} ({editingLog.start_time.substring(0, 5)} - {editingLog.end_time.substring(0, 5)})</span></p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-stone-400 uppercase">Giờ Check-in thực tế</label>
            <input
              type="datetime-local"
              value={checkInVal}
              onChange={(e) => setCheckInVal(e.target.value)}
              className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-stone-400 uppercase">Giờ Check-out thực tế</label>
            <input
              type="datetime-local"
              value={checkOutVal}
              onChange={(e) => setCheckOutVal(e.target.value)}
              className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
            />
            <p className="text-[10px] text-stone-500 italic mt-1 font-sans">Nếu nhân viên chưa checkout, hãy nhập giờ checkout thủ công tại đây.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-stone-400 uppercase">Trạng thái công</label>
            <select
              value={logStatus}
              onChange={(e) => setLogStatus(e.target.value as any)}
              className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
            >
              <option value="approved">Hợp lệ (Đã duyệt công)</option>
              <option value="pending_approval">Chờ xác nhận công</option>
              <option value="rejected">Không tính ca (Từ chối công)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2.5 border border-stone-850 hover:bg-stone-900 text-stone-300 text-xs font-semibold rounded-xl transition-all cursor-pointer font-sans"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submittingLog}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-amber-500/10"
            >
              {submittingLog && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu công</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function HRAttendance() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B090A] flex flex-col items-center justify-center text-stone-300">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <p className="text-sm font-sans tracking-wide text-stone-500">Đang tải dữ liệu...</p>
      </div>
    }>
      <HRAttendanceContent />
    </Suspense>
  );
}
