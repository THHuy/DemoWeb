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
  ChevronLeft,
  ChevronRight,
  Info,
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

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function StaffShifts() {
  const { user } = useAuth();
  const [shiftsList, setShiftsList] = useState<StaffShift[]>([]);
  const [availableShifts, setAvailableShifts] = useState<ActiveShift[]>([]);
  const [coworkers, setCoworkers] = useState<Coworker[]>([]);
  const [loading, setLoading] = useState(true);

  // Store shifts list
  const [allShiftsList, setAllShiftsList] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"personal" | "all">("personal");

  // Week Navigation for store schedule
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

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
    fetchData(true);
  }, []);

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

  // Helper: Build week dates array
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    weekDates.push(date);
  }

  // Week navigation
  function changeWeek(direction: number) {
    const nextStart = new Date(currentWeekStart);
    nextStart.setDate(nextStart.getDate() + direction * 7);
    setCurrentWeekStart(nextStart);
  }

  // Helper: Get unique employees for current week from allShiftsList
  const getWeekEmployees = () => {
    const weekStartStr = getLocalDateString(currentWeekStart);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = getLocalDateString(weekEnd);

    // Filter shifts for current week
    const weekShifts = allShiftsList.filter((s) => {
      const dateStr = s.shift_date.substring(0, 10);
      return dateStr >= weekStartStr && dateStr <= weekEndStr;
    });

    // Get unique employees
    const empMap = new Map<string, { id: string; name: string; code: string }>();
    weekShifts.forEach((s) => {
      const key = s.employee_id?.toString() || s.employee_name;
      if (!empMap.has(key)) {
        empMap.set(key, {
          id: key,
          name: s.employee_name,
          code: s.employee_code || "",
        });
      }
    });

    return { weekShifts, employees: Array.from(empMap.values()) };
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
  const todayStr = getLocalDateString(new Date());
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
          <div className="flex border-b border-white/5 gap-6 text-sm font-semibold mb-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-px">
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
                <div className="bg-stone-900/40 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl">
                  <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2 font-sans">
                    <CalendarIcon className="w-4 h-4 text-amber-500" />
                    Lịch Làm Việc Của Tôi
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
                              Chưa đăng ký ca làm việc nào.
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
                <div className="bg-stone-900/40 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl">
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
                <div className="bg-stone-900/40 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl">
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
                  <span>Lịch ca làm đã được duyệt của toàn bộ cửa hàng.</span>
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
                      {(() => {
                        const { weekShifts, employees } = getWeekEmployees();
                        if (employees.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} className="p-12 text-center text-stone-500 font-sans">
                                Không có nhân viên nào có lịch làm việc trong tuần này.
                              </td>
                            </tr>
                          );
                        }
                        return employees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 pl-6">
                              <p className="text-sm font-semibold text-white">{emp.name}</p>
                              {emp.code && (
                                <p className="text-[9px] text-stone-500 font-mono">{emp.code}</p>
                              )}
                            </td>

                            {weekDates.map((date, dateIdx) => {
                              const dateStr = getLocalDateString(date);
                              const empKey = emp.id;
                              const activeShiftDays = weekShifts.filter(
                                (s: any) =>
                                  (s.employee_id?.toString() === empKey || s.employee_name === emp.name) &&
                                  s.shift_date.substring(0, 10) === dateStr
                              );

                              return (
                                <td key={dateIdx} className="p-2 text-center">
                                  {activeShiftDays.length === 0 ? (
                                    <span className="text-[10px] text-stone-600 italic">Off</span>
                                  ) : (
                                    <div className="flex flex-col gap-1 items-center">
                                      {activeShiftDays.map((reg: any, regIdx: number) => (
                                        <span
                                          key={regIdx}
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
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
