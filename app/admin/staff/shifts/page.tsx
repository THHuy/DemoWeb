"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import {
  Calendar as CalendarIcon,
  Plus,
  RefreshCw,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ListFilter,
  Check,
} from "lucide-react";

interface Coworker {
  id: number;
  employee_code: string;
  full_name: string;
  avatar_url: string | null;
}

interface StaffShift {
  id: number;
  shift_date: string;
  status: "pending" | "approved" | "rejected";
  shift_id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
}

interface ActiveShift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  day_value: string;
}

export default function StaffShifts() {
  const { user } = useAuth();
  const [shiftsList, setShiftsList] = useState<StaffShift[]>([]);
  const [availableShifts, setAvailableShifts] = useState<ActiveShift[]>([]);
  const [coworkers, setCoworkers] = useState<Coworker[]>([]);
  const [loading, setLoading] = useState(true);

  // Store shifts list
  const [allShiftsList, setAllShiftsList] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"personal" | "all">("personal");

  // Registration Form States
  const [regDate, setRegDate] = useState("");
  const [regShiftId, setRegShiftId] = useState("");
  const [regFeedback, setRegFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Swap Form States
  const [swapMyRegId, setSwapMyRegId] = useState("");
  const [swapTargetEmpId, setSwapTargetEmpId] = useState("");
  const [swapFeedback, setSwapFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [swapSubmitting, setSwapSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch own shifts
      const ownShiftsRes = await fetch("/api/staff/shifts");
      if (ownShiftsRes.ok) {
        setShiftsList(await ownShiftsRes.json());
      }

      // 2. Fetch available shifts list
      const shiftsConfigRes = await fetch("/api/staff/active-shifts");
      if (shiftsConfigRes.ok) {
        const shiftsConfigData = await shiftsConfigRes.json();
        const activeShiftsConfig = shiftsConfigData.filter((s: any) => s.is_active);
        setAvailableShifts(activeShiftsConfig);
        if (activeShiftsConfig.length > 0) {
          setRegShiftId(activeShiftsConfig[0].id.toString());
        }
      }

      // 3. Fetch coworkers
      const coworkersRes = await fetch("/api/staff/coworkers");
      if (coworkersRes.ok) {
        setCoworkers(await coworkersRes.json());
      }

      // 4. Fetch all shifts (for store schedule tab)
      const allShiftsRes = await fetch("/api/staff/shifts/all");
      if (allShiftsRes.ok) {
        setAllShiftsList(await allShiftsRes.json());
      }
    } catch (err) {
      console.error("Error loading staff shift data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Helper to group approved shifts by date and ca
  const groupAllShiftsByDate = () => {
    const grouped: { [date: string]: { [shiftId: string]: { shift_name: string; start_time: string; end_time: string; employees: string[] } } } = {};
    
    allShiftsList.forEach((s) => {
      const dateStr = s.shift_date.substring(0, 10);
      if (!grouped[dateStr]) {
        grouped[dateStr] = {};
      }
      
      const sId = s.shift_id.toString();
      if (!grouped[dateStr][sId]) {
        grouped[dateStr][sId] = {
          shift_name: s.shift_name,
          start_time: s.start_time,
          end_time: s.end_time,
          employees: [],
        };
      }
      
      grouped[dateStr][sId].employees.push(s.employee_name);
    });

    // Sort dates ascending
    return Object.keys(grouped)
      .sort()
      .map((date) => ({
        date,
        shifts: Object.keys(grouped[date]).map((sId) => ({
          shift_id: sId,
          ...grouped[date][sId],
        })),
      }));
  };

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regDate || !regShiftId) {
      setRegFeedback({ type: "error", msg: "Vui lòng chọn ngày và ca làm việc." });
      return;
    }

    setRegSubmitting(true);
    setRegFeedback(null);

    try {
      const res = await fetch("/api/staff/shifts/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_date: regDate,
          shift_id: parseInt(regShiftId),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRegFeedback({ type: "success", msg: "Đăng ký ca làm thành công! Vui lòng chờ quản lý duyệt." });
        setRegDate("");
        fetchData();
      } else {
        setRegFeedback({ type: "error", msg: data.error || "Đăng ký ca làm thất bại." });
      }
    } catch {
      setRegFeedback({ type: "error", msg: "Lỗi kết nối đến máy chủ." });
    } finally {
      setRegSubmitting(false);
    }
  }

  async function handleSwap(e: React.FormEvent) {
    e.preventDefault();
    if (!swapMyRegId || !swapTargetEmpId) {
      setSwapFeedback({ type: "error", msg: "Vui lòng chọn ca của bạn và đồng nghiệp muốn đổi." });
      return;
    }

    setSwapSubmitting(true);
    setSwapFeedback(null);

    try {
      const res = await fetch("/api/staff/shifts/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester_registration_id: parseInt(swapMyRegId),
          target_employee_id: parseInt(swapTargetEmpId),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSwapFeedback({ type: "success", msg: "Gửi yêu cầu đổi ca thành công! Đang chờ đối tác và Quản lý duyệt." });
        setSwapMyRegId("");
        setSwapTargetEmpId("");
        fetchData();
      } else {
        setSwapFeedback({ type: "error", msg: data.error || "Gửi yêu cầu đổi ca thất bại." });
      }
    } catch {
      setSwapFeedback({ type: "error", msg: "Lỗi kết nối máy chủ." });
    } finally {
      setSwapSubmitting(false);
    }
  }

  // Get approved future shifts of staff for swapping
  const todayStr = new Date().toISOString().substring(0, 10);
  const swappableShifts = shiftsList.filter(
    (s) => s.status === "approved" && s.shift_date >= todayStr
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Quản Lý Ca Làm Việc</h1>
        <p className="text-white/50 text-sm">Xem lịch làm việc cá nhân, đăng ký ca theo tuần và gửi yêu cầu đổi ca</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div>
          {/* Tabs */}
          <div className="flex border-b border-white/5 gap-6 text-sm font-semibold mb-6">
            <button
              onClick={() => setActiveView("personal")}
              className={`pb-3 transition-colors cursor-pointer relative ${
                activeView === "personal" ? "text-amber-400" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              Lịch Cá Nhân
              {activeView === "personal" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
            </button>

            <button
              onClick={() => setActiveView("all")}
              className={`pb-3 transition-colors cursor-pointer relative ${
                activeView === "all" ? "text-amber-400" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              Lịch Toàn Cửa Hàng
              {activeView === "all" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
            </button>
          </div>

          {activeView === "personal" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Calendar/List own shifts */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                  <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2 font-sans">
                    <CalendarIcon className="w-4 h-4 text-amber-500" />
                    Lịch Làm Việc Tháng Này
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                          <th className="pb-3 pr-4">Ngày làm</th>
                          <th className="pb-3 pr-4">Ca làm</th>
                          <th className="pb-3 pr-4">Thời gian</th>
                          <th className="pb-3 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-stone-300 font-sans">
                        {shiftsList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-stone-600">
                              Chưa đăng ký ca làm việc nào trong tháng này.
                            </td>
                          </tr>
                        ) : (
                          shiftsList.map((shift) => (
                            <tr key={shift.id} className="hover:bg-white/1 transition-colors">
                              <td className="py-3.5 pr-4 font-semibold text-stone-200">
                                {new Date(shift.shift_date).toLocaleDateString("vi-VN", {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-3.5 pr-4 text-stone-300 font-medium">{shift.shift_name}</td>
                              <td className="py-3.5 pr-4 font-mono text-stone-400">
                                {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                              </td>
                              <td className="py-3.5 text-right">
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                    shift.status === "approved"
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : shift.status === "rejected"
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  }`}
                                >
                                  {shift.status === "approved" ? "Đã duyệt" : shift.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
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

              {/* Action Columns */}
              <div className="space-y-8">
                {/* Shift Register Card */}
                <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                  <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2 font-sans">
                    <Plus className="w-4 h-4 text-amber-500" />
                    Đăng Ký Ca Làm
                  </h3>
                  <form onSubmit={handleRegister} className="space-y-4">
                    {regFeedback && (
                      <div
                        className={`p-3 rounded-xl text-xs font-sans flex items-start gap-2 border ${
                          regFeedback.type === "success"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        }`}
                      >
                        {regFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                        <span>{regFeedback.msg}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-stone-400 tracking-wider uppercase font-sans">Chọn Ngày</label>
                      <input
                        type="date"
                        required
                        value={regDate}
                        onChange={(e) => setRegDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-stone-900 border border-stone-850 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-stone-400 tracking-wider uppercase font-sans">Chọn Ca Làm</label>
                      <select
                        value={regShiftId}
                        onChange={(e) => setRegShiftId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-stone-900 border border-stone-850 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                      >
                        {availableShifts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={regSubmitting}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-amber-500/5 mt-4"
                    >
                      {regSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Gửi đăng ký</span>
                    </button>
                  </form>
                </div>

                {/* Shift Swap Card */}
                <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                  <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2 font-sans">
                    <RefreshCw className="w-4 h-4 text-amber-500" />
                    Yêu Cầu Đổi Ca Làm
                  </h3>
                  <form onSubmit={handleSwap} className="space-y-4">
                    {swapFeedback && (
                      <div
                        className={`p-3 rounded-xl text-xs font-sans flex items-start gap-2 border ${
                          swapFeedback.type === "success"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        }`}
                      >
                        {swapFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                        <span>{swapFeedback.msg}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-stone-400 tracking-wider uppercase font-sans">Ca Của Bạn Muốn Đổi</label>
                      <select
                        value={swapMyRegId}
                        onChange={(e) => setSwapMyRegId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-stone-900 border border-stone-850 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                      >
                        <option value="">-- Chọn ca làm của bạn --</option>
                        {swappableShifts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {new Date(s.shift_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} - {s.shift_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-stone-400 tracking-wider uppercase font-sans">Đồng Nghiệp Nhận Ca</label>
                      <select
                        value={swapTargetEmpId}
                        onChange={(e) => setSwapTargetEmpId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-stone-900 border border-stone-850 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                      >
                        <option value="">-- Chọn đồng nghiệp --</option>
                        {coworkers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name} ({c.employee_code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={swapSubmitting || !swapMyRegId || !swapTargetEmpId}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-amber-500/5 mt-4 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {swapSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      <span>Yêu cầu đổi ca</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
              <h3 className="text-md font-semibold text-white mb-6 flex items-center gap-2 font-sans">
                <Users className="w-4 h-4 text-amber-500" />
                Lịch Phân Ca Toàn Cửa Hàng
              </h3>

              <div className="space-y-6">
                {groupAllShiftsByDate().length === 0 ? (
                  <p className="text-stone-500 text-xs py-8 text-center">Chưa có lịch làm việc nào được duyệt.</p>
                ) : (
                  groupAllShiftsByDate().map((group) => (
                    <div key={group.date} className="p-5 bg-stone-950/30 border border-white/5 rounded-2xl space-y-4">
                      {/* Date Header */}
                      <div className="text-xs font-bold text-amber-400 font-mono tracking-wider">
                        {new Date(group.date).toLocaleDateString("vi-VN", {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </div>

                      {/* Shifts in this date */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.shifts.map((shift) => (
                          <div key={shift.shift_id} className="p-4 bg-stone-900/50 border border-white/5 rounded-xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-stone-200">{shift.shift_name}</span>
                              <span className="text-[10px] text-stone-500 font-mono">
                                {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                              </span>
                            </div>
                            
                            {/* Employees in this shift */}
                            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
                              {shift.employees.map((empName, idx) => (
                                <span key={idx} className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                  {empName}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
