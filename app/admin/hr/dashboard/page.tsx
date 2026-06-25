"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Users,
  Clock,
  Banknote,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Loader2,
  Calendar,
} from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";

interface EmployeeStat {
  full_name: string;
  employee_code: string;
  shift_count?: string;
  penalty_minutes?: string;
}

interface HRDashboardStats {
  employees: {
    total: number;
    active: number;
    on_leave: number;
    terminated: number;
  };
  totalHours: number;
  totalCost: number;
  topDiligent: EmployeeStat[];
  topLate: EmployeeStat[];
}

export default function HRDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<HRDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Access Control
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
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/dashboard");
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error("Error loading HR dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(amount: number) {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  }

  const currentMonthStr = new Date().toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Báo Cáo Nhân Sự</h1>
        <p className="text-white/50 text-sm">Thống kê chi phí lương, tần suất đi làm và thống kê vi phạm trong tháng {currentMonthStr}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : !stats ? (
        <div className="text-center text-stone-500 py-10 font-sans">
          Không tải được số liệu thống kê. Vui lòng kiểm tra lại.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Tổng Nhân Viên"
              value={stats.employees.total}
              icon={Users}
              color="amber"
              description={`Đang làm: ${stats.employees.active} | Tạm nghỉ: ${stats.employees.on_leave}`}
            />
            <StatsCard
              title="Tổng Giờ Chấm Công"
              value={`${stats.totalHours.toFixed(1)}h`}
              icon={Clock}
              color="blue"
              description="Giờ làm đã duyệt tháng này"
            />
            <StatsCard
              title="Tổng Lương Đã Duyệt"
              value={formatMoney(stats.totalCost)}
              icon={Banknote}
              color="emerald"
              description="Tổng chi phí chi trả lương"
            />
            <StatsCard
              title="Nhân viên Nghỉ Việc"
              value={stats.employees.terminated}
              icon={AlertTriangle}
              color="rose"
              description="Đã thôi việc / hủy hồ sơ"
            />
          </div>

          {/* Leaderboards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Top Diligent */}
            <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
              <h3 className="text-md font-semibold text-white mb-6 flex items-center gap-2 font-sans">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                Top Nhân Viên Chuyên Cần (Số Ca)
              </h3>
              <div className="space-y-5">
                {stats.topDiligent.length === 0 ? (
                  <p className="text-xs text-stone-500 font-sans italic text-center py-6">Chưa có dữ liệu ca làm việc tháng này.</p>
                ) : (
                  stats.topDiligent.map((emp, idx) => {
                    const maxShifts = parseInt(stats.topDiligent[0].shift_count || "1");
                    const count = parseInt(emp.shift_count || "0");
                    const pct = maxShifts > 0 ? (count / maxShifts) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1.5 font-sans">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-stone-200">
                            {emp.full_name} <span className="text-[10px] text-stone-500 font-mono">({emp.employee_code})</span>
                          </span>
                          <span className="font-mono text-emerald-400 font-bold">{count} ca làm</span>
                        </div>
                        <div className="h-2 w-full bg-stone-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Top Late */}
            <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
              <h3 className="text-md font-semibold text-white mb-6 flex items-center gap-2 font-sans">
                <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
                Top Nhân Viên Đi Trễ / Về Sớm (Phút)
              </h3>
              <div className="space-y-5">
                {stats.topLate.length === 0 ? (
                  <p className="text-xs text-stone-500 font-sans italic text-center py-6">Không có nhân viên nào đi trễ hoặc về sớm.</p>
                ) : (
                  stats.topLate.map((emp, idx) => {
                    const maxMins = parseInt(stats.topLate[0].penalty_minutes || "1");
                    const count = parseInt(emp.penalty_minutes || "0");
                    const pct = maxMins > 0 ? (count / maxMins) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1.5 font-sans">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-stone-200">
                            {emp.full_name} <span className="text-[10px] text-stone-500 font-mono">({emp.employee_code})</span>
                          </span>
                          <span className="font-mono text-rose-400 font-bold">{count} phút vi phạm</span>
                        </div>
                        <div className="h-2 w-full bg-stone-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
