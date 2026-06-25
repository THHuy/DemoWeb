"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import {
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
  XCircle,
  UserCheck,
  Send,
  Loader2,
  Info,
  Trash2,
  History,
} from "lucide-react";
import { motion } from "framer-motion";

interface AttendanceLog {
  id: number;
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
  status: "pending_approval" | "approved" | "rejected";
  ip: string;
  device: string;
}

interface StaffShift {
  id: number;
  shift_date: string;
  status: string;
  shift_id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
}

export default function StaffAttendance() {
  const { user } = useAuth();
  const [time, setTime] = useState<Date | null>(null);
  const [todayShifts, setTodayShifts] = useState<StaffShift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<string>("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Leave Form states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<"annual" | "sick" | "unpaid">("annual");
  const [reason, setReason] = useState("");
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveFeedback, setLeaveFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Digital clock
  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTodayShiftsAndLogs();
    requestGPS();
  }, []);

  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);

  async function fetchLeaveRequests() {
    try {
      const res = await fetch("/api/staff/leaves");
      if (res.ok) {
        setLeaveRequests(await res.json());
      }
    } catch (err) {
      console.error("Error fetching leave requests:", err);
    }
  }

  async function fetchTodayShiftsAndLogs() {
    setLoading(true);
    try {
      const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
      
      // Fetch shifts
      const shiftsRes = await fetch(`/api/staff/shifts?start_date=${todayStr}&end_date=${todayStr}`);
      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json();
        const approvedShifts = shiftsData.filter((s: any) => s.status === "approved");
        setTodayShifts(approvedShifts);
        if (approvedShifts.length > 0) {
          setSelectedShiftId(approvedShifts[0].shift_id.toString());
        }
      }

      // Fetch attendance history
      const logsRes = await fetch("/api/staff/attendance");
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }

      // Fetch leave requests
      await fetchLeaveRequests();
    } catch (err) {
      console.error("Error loading staff attendance data:", err);
    } finally {
      setLoading(false);
    }
  }

  function requestGPS() {
    if (typeof window !== "undefined" && navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          setGpsLocation(`${lat}, ${lng}`);
          setGpsLoading(false);
        },
        (error) => {
          console.warn("GPS access denied:", error.message);
          setGpsLocation("Bị chặn (Chỉ ghi nhận IP)");
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGpsLocation("Thiết bị không hỗ trợ");
    }
  }

  async function handleCheckIn() {
    if (!selectedShiftId) {
      setFeedback({ type: "error", msg: "Vui lòng chọn ca để Check-in." });
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/staff/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: parseInt(selectedShiftId),
          gps_location: gpsLocation,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: "success", msg: data.message });
        fetchTodayShiftsAndLogs();
      } else {
        setFeedback({ type: "error", msg: data.error || "Check-in thất bại." });
      }
    } catch {
      setFeedback({ type: "error", msg: "Lỗi kết nối." });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!selectedShiftId) {
      setFeedback({ type: "error", msg: "Vui lòng chọn ca để Check-out." });
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/staff/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: parseInt(selectedShiftId),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: "success", msg: data.message });
        fetchTodayShiftsAndLogs();
      } else {
        setFeedback({ type: "error", msg: data.error || "Check-out thất bại." });
      }
    } catch {
      setFeedback({ type: "error", msg: "Lỗi kết nối." });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      setLeaveFeedback({ type: "error", msg: "Vui lòng nhập đầy đủ thông tin xin nghỉ." });
      return;
    }
    setLeaveSubmitting(true);
    setLeaveFeedback(null);
    try {
      const res = await fetch("/api/staff/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          leave_type: leaveType,
          reason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeaveFeedback({ type: "success", msg: "Đã gửi đơn xin nghỉ phép. Đang chờ duyệt." });
        setStartDate("");
        setEndDate("");
        setReason("");
        await fetchLeaveRequests();
      } else {
        setLeaveFeedback({ type: "error", msg: data.error || "Gửi đơn phép thất bại." });
      }
    } catch {
      setLeaveFeedback({ type: "error", msg: "Lỗi kết nối." });
    } finally {
      setLeaveSubmitting(false);
    }
  }

  async function handleCancelLeave(id: number) {
    if (!confirm("Bạn có chắc muốn hủy đơn xin nghỉ phép này?")) return;
    setActionLoading(true);
    setLeaveFeedback(null);
    try {
      const res = await fetch(`/api/staff/leaves/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeaveFeedback({ type: "success", msg: data.message });
        await fetchLeaveRequests();
      } else {
        setLeaveFeedback({ type: "error", msg: data.error || "Hủy đơn xin nghỉ phép thất bại." });
      }
    } catch {
      setLeaveFeedback({ type: "error", msg: "Lỗi kết nối máy chủ." });
    } finally {
      setActionLoading(false);
    }
  }

  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const activeLogsToday = logs.filter(
    (l) => l.shift_date.substring(0, 10) === todayStr && l.shift_name === todayShifts.find(ts => ts.shift_id.toString() === selectedShiftId)?.shift_name
  );
  const currentLog = activeLogsToday.length > 0 ? activeLogsToday[0] : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Chấm Công & Nghỉ Phép</h1>
        <p className="text-white/50 text-sm">Điểm danh ca làm việc hàng ngày bằng định vị và xin nghỉ phép phép năm</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Check-In Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
            {/* Ambient Background Light */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Digital Clock */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-2xl font-mono font-bold text-white leading-tight tracking-wider">
                    {time ? time.toLocaleTimeString("vi-VN") : "00:00:00"}
                  </div>
                  <div className="text-xs text-stone-400 font-sans mt-0.5">
                    Thứ Tư, {time ? time.toLocaleDateString("vi-VN") : "---"}
                  </div>
                </div>
              </div>

              {/* Location Badge */}
              <div className="flex items-center gap-2.5 px-4 py-2 bg-stone-950/40 border border-white/5 rounded-2xl text-xs">
                <MapPin className={`w-4 h-4 ${gpsLocation && !gpsLocation.includes("Bị chặn") ? "text-emerald-400 animate-pulse" : "text-rose-400"}`} />
                <span className="text-stone-300 font-mono">
                  GPS: {gpsLoading ? "Đang định vị..." : gpsLocation || "Đang quét..."}
                </span>
              </div>
            </div>

            {/* Shift Picker and Action */}
            <div className="mt-8 space-y-6">
              {feedback && (
                <div
                  className={`p-4 rounded-2xl text-sm font-sans flex items-start gap-3 border ${
                    feedback.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}
                >
                  {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <span>{feedback.msg}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase font-sans">Chọn ca làm việc hôm nay</label>
                {todayShifts.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-stone-950/20 border border-stone-850 text-center text-sm text-stone-500 font-sans">
                    Bạn không có lịch phân ca được duyệt nào hôm nay.
                  </div>
                ) : (
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-sm font-sans"
                  >
                    {todayShifts.map((s) => (
                      <option key={s.id} value={s.shift_id}>
                        {s.shift_name} ({s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Action Buttons */}
              {todayShifts.length > 0 && (
                <div className="pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Check In */}
                    <button
                      onClick={handleCheckIn}
                      disabled={actionLoading || !!currentLog?.check_in}
                      className={`py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        currentLog?.check_in
                          ? "bg-white/5 border border-white/5 text-stone-500 cursor-not-allowed"
                          : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-lg shadow-amber-500/10"
                      }`}
                    >
                      {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                      {currentLog?.check_in ? "Đã Check-In" : "Check-In"}
                    </button>

                    {/* Check Out */}
                    <button
                      onClick={handleCheckOut}
                      disabled={actionLoading || !currentLog?.check_in || !!currentLog?.check_out}
                      className={`py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        !currentLog?.check_in || currentLog?.check_out
                          ? "bg-white/5 border border-white/5 text-stone-500 cursor-not-allowed"
                          : "bg-stone-850 hover:bg-stone-800 text-white border border-white/10"
                      }`}
                    >
                      {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Clock className="w-5 h-5" />}
                      {currentLog?.check_out ? "Đã Check-Out" : "Check-Out"}
                    </button>
                  </div>
                  
                  {/* Status Indicator */}
                  {currentLog && (
                    <div className="mt-4 p-3.5 rounded-xl bg-stone-950/30 border border-white/5 text-xs text-stone-400 font-sans flex flex-col gap-1.5">
                      <div className="flex justify-between">
                        <span>Giờ vào:</span>
                        <span className="font-semibold text-white font-mono">
                          {currentLog.check_in ? new Date(currentLog.check_in).toLocaleTimeString("vi-VN") : "Chưa Check-in"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Giờ ra:</span>
                        <span className="font-semibold text-white font-mono">
                          {currentLog.check_out ? new Date(currentLog.check_out).toLocaleTimeString("vi-VN") : "Chưa Check-out"}
                        </span>
                      </div>
                      {currentLog.is_late && (
                        <div className="text-amber-500 font-medium"> Đi trễ {currentLog.late_minutes} phút</div>
                      )}
                      {currentLog.is_early && (
                        <div className="text-amber-500 font-medium"> Về sớm {currentLog.early_minutes} phút</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* History Section */}
          <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
            <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2 font-sans">
              <Calendar className="w-4 h-4 text-amber-500" />
              Lịch sử Chấm công Tháng này
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Ngày</th>
                    <th className="pb-3 pr-4">Ca</th>
                    <th className="pb-3 pr-4">Check-in</th>
                    <th className="pb-3 pr-4">Check-out</th>
                    <th className="pb-3 pr-4">Vi phạm</th>
                    <th className="pb-3 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-stone-300 font-sans">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-600">
                        Chưa có dữ liệu chấm công.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/1 transition-colors">
                        <td className="py-3 pr-4">
                          {new Date(log.shift_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                        </td>
                        <td className="py-3 pr-4 font-medium text-stone-200">{log.shift_name}</td>
                        <td className="py-3 pr-4 font-mono text-stone-400">
                          {log.check_in ? new Date(log.check_in).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "---"}
                        </td>
                        <td className="py-3 pr-4 font-mono text-stone-400">
                          {log.check_out ? new Date(log.check_out).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "---"}
                        </td>
                        <td className="py-3 pr-4 text-amber-500/80">
                          {log.is_late && `Trễ ${log.late_minutes}p`}
                          {log.is_late && log.is_early && " | "}
                          {log.is_early && `Sớm ${log.early_minutes}p`}
                          {!log.is_late && !log.is_early && <span className="text-stone-500">Không</span>}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              log.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : log.status === "rejected"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {log.status === "approved" ? "Hợp lệ" : log.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Leave Request Form & History */}
        <div className="space-y-6">
          {/* Leave Request Form */}
          <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl h-fit">
            <h3 className="text-md font-semibold text-white mb-5 flex items-center gap-2 font-sans">
              <FileText className="w-4 h-4 text-amber-500" />
              Đơn Xin Nghỉ Phép
            </h3>
            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              {leaveFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-sans flex items-start gap-2.5 border ${
                    leaveFeedback.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}
                >
                  {leaveFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{leaveFeedback.msg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 tracking-wider uppercase font-sans">Loại Nghỉ Phép</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType("annual")}
                    className={`py-2 px-3 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      leaveType === "annual"
                        ? "bg-stone-900 text-white border-amber-500/50 shadow-md"
                        : "bg-stone-950/20 text-stone-500 border-stone-900 hover:text-stone-300"
                    }`}
                  >
                    Phép năm
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType("sick")}
                    className={`py-2 px-3 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      leaveType === "sick"
                        ? "bg-stone-900 text-white border-amber-500/50 shadow-md"
                        : "bg-stone-950/20 text-stone-500 border-stone-900 hover:text-stone-300"
                    }`}
                  >
                    Nghỉ bệnh
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType("unpaid")}
                    className={`py-2 px-3 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      leaveType === "unpaid"
                        ? "bg-stone-900 text-white border-amber-500/50 shadow-md"
                        : "bg-stone-950/20 text-stone-500 border-stone-900 hover:text-stone-300"
                    }`}
                  >
                    Không lương
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 tracking-wider uppercase font-sans">Từ ngày</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-900 border border-stone-850 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 tracking-wider uppercase font-sans">Đến ngày</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-900 border border-stone-850 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 tracking-wider uppercase font-sans">Lý do xin nghỉ</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Nhập lý do chi tiết..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-900 border border-stone-850 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={leaveSubmitting}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/5 mt-6"
              >
                {leaveSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Gửi đơn xin nghỉ</span>
              </button>
            </form>
          </div>

          {/* Leave History Card */}
          <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
            <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2 font-sans">
              <History className="w-4 h-4 text-amber-500" />
              Lịch sử Nghỉ phép
            </h3>

            <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
              {leaveRequests.length === 0 ? (
                <p className="text-stone-500 text-xs py-4 text-center">Chưa gửi đơn xin nghỉ phép nào.</p>
              ) : (
                leaveRequests.map((req) => (
                  <div key={req.id} className="p-3.5 bg-stone-950/40 border border-white/5 rounded-2xl space-y-2 relative group/leave font-sans">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        req.leave_type === "annual"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : req.leave_type === "sick"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-stone-500/10 text-stone-400 border-stone-500/20"
                      }`}>
                        {req.leave_type === "annual" ? "Phép năm" : req.leave_type === "sick" ? "Nghỉ bệnh" : "Không lương"}
                      </span>

                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        req.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : req.status === "rejected"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {req.status === "approved" ? "Đã duyệt" : req.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-300 font-mono">
                      {new Date(req.start_date).toLocaleDateString("vi-VN")} - {new Date(req.end_date).toLocaleDateString("vi-VN")}
                    </div>

                    {req.reason && (
                      <p className="text-[11px] text-stone-400 italic line-clamp-2">Lý do: {req.reason}</p>
                    )}

                    {req.status === "pending" && (
                      <button
                        onClick={() => handleCancelLeave(req.id)}
                        className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-colors"
                        title="Hủy đơn xin nghỉ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
