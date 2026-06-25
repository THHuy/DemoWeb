"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import {
  Banknote,
  Calendar,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  HelpCircle,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

interface SalaryAdjustment {
  id: number;
  allowance_type?: string;
  deduction_type?: string;
  amount: string;
  note: string;
}

interface SalaryRecord {
  id: number;
  pay_month: string;
  actual_hours: string;
  actual_days: string;
  base_salary: string;
  allowance_total: string;
  deduction_total: string;
  net_salary: string;
  status: "approved" | "paid";
  allowances: SalaryAdjustment[];
  deductions: SalaryAdjustment[];
}

export default function StaffSalary() {
  const { user } = useAuth();
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null);

  useEffect(() => {
    fetchSalary();
  }, []);

  async function fetchSalary() {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/salary");
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
        if (data.length > 0) {
          setSelectedRecord(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching staff salary:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatVND(amountStr: string | number) {
    const amount = typeof amountStr === "string" ? parseFloat(amountStr) : amountStr;
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  }

  function formatMonth(monthStr: string) {
    // Format YYYY-MM to MM/YYYY
    const parts = monthStr.split("-");
    if (parts.length === 2) {
      return `${parts[1]}/${parts[0]}`;
    }
    return monthStr;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Phiếu Lương Cá Nhân</h1>
        <p className="text-white/50 text-sm">Xem lịch sử phiếu lương và chi tiết các khoản thu nhập của bạn</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-12 text-center text-stone-500 backdrop-blur-xl">
          <Banknote className="w-12 h-12 mx-auto mb-4 opacity-15 text-stone-400" />
          <p className="font-sans text-sm">Hiện chưa có phiếu lương nào được xuất bản cho bạn.</p>
          <p className="font-sans text-xs text-stone-600 mt-1">Phiếu lương sẽ hiển thị sau khi Quản lý duyệt hoặc Chi trả.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List of Pay Slips */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-stone-500 tracking-wider uppercase font-sans mb-3">Lịch Sử Phiếu Lương</h3>
            {records.map((rec) => (
              <div
                key={rec.id}
                onClick={() => setSelectedRecord(rec)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  selectedRecord?.id === rec.id
                    ? "bg-gradient-to-br from-stone-900 to-stone-950 border-amber-500/40 shadow-lg shadow-amber-500/[0.02]"
                    : "bg-stone-900/40 border-white/5 hover:bg-stone-900/60 hover:border-white/10"
                }`}
              >
                {selectedRecord?.id === rec.id && (
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500" />
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-stone-500" />
                    <span className="text-sm font-semibold text-white">Tháng {formatMonth(rec.pay_month)}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      rec.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {rec.status === "paid" ? "Đã trả" : "Đã duyệt"}
                  </span>
                </div>
                <div className="text-xl font-bold text-white font-mono">{formatVND(rec.net_salary)}</div>
                <div className="flex items-center gap-3 mt-3 text-[10px] text-stone-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-600" />
                    {parseFloat(rec.actual_hours) > 0 ? `${parseFloat(rec.actual_hours)} giờ` : `${parseFloat(rec.actual_days)} công`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pay Slip Details */}
          {selectedRecord && (
            <div className="lg:col-span-2 bg-stone-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl h-fit relative overflow-hidden">
              {/* Fine Print Corner Line */}
              <div className="absolute top-[6px] left-[6px] w-2.5 h-2.5 border-t border-l border-amber-500/40" />
              <div className="absolute top-[6px] right-[6px] w-2.5 h-2.5 border-t border-r border-amber-500/40" />

              {/* Title Header */}
              <div className="flex justify-between items-start border-b border-white/5 pb-5">
                <div>
                  <h3 className="text-lg font-bold text-white mb-0.5">Chi Tiết Phiếu Lương</h3>
                  <p className="text-xs text-stone-400 font-sans">Kỳ thanh toán: Tháng {formatMonth(selectedRecord.pay_month)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-500 block uppercase tracking-wider font-sans mb-1">Mã Phiếu</span>
                  <span className="font-mono text-xs text-stone-300">#SLIP-{selectedRecord.id}</span>
                </div>
              </div>

              {/* Net Pay Highlight */}
              <div className="py-6 border-b border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold font-sans mb-1.5">LƯƠNG THỰC NHẬN</span>
                <div className="text-3xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                  {formatVND(selectedRecord.net_salary)}
                </div>
                <p className="text-[10px] text-stone-400 font-sans mt-2">
                  Đã chuyển khoản trực tiếp hoặc thanh toán tiền mặt.
                </p>
              </div>

              {/* Calculations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-white/5 text-sm font-sans">
                {/* Left: Working hours summary */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-stone-400 tracking-wider uppercase">Tóm Tắt Ngày Công</h4>
                  <div className="flex justify-between py-1 border-b border-white/[0.02] text-xs">
                    <span className="text-stone-500">Số giờ làm thực tế:</span>
                    <span className="font-mono text-stone-300 font-semibold">{parseFloat(selectedRecord.actual_hours)} giờ</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.02] text-xs">
                    <span className="text-stone-500">Số công ghi nhận:</span>
                    <span className="font-mono text-stone-300 font-semibold">{parseFloat(selectedRecord.actual_days)} công</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs">
                    <span className="text-stone-500">Lương cơ bản tính công:</span>
                    <span className="font-mono text-stone-300 font-semibold">{formatVND(selectedRecord.base_salary)}</span>
                  </div>
                </div>

                {/* Right: Payments breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-stone-400 tracking-wider uppercase">Cân đối Lương</h4>
                  <div className="flex justify-between py-1 border-b border-white/[0.02] text-xs text-emerald-400">
                    <span className="text-stone-500">Phụ cấp được nhận:</span>
                    <span className="font-mono font-semibold">+ {formatVND(selectedRecord.allowance_total)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs text-rose-400">
                    <span className="text-stone-500">Các khoản khấu trừ:</span>
                    <span className="font-mono font-semibold">- {formatVND(selectedRecord.deduction_total)}</span>
                  </div>
                </div>
              </div>

              {/* Adjustments Breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                {/* Allowances */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase font-sans mb-1">
                    <ArrowUpCircle className="w-4 h-4 shrink-0" />
                    Phụ cấp chi tiết
                  </div>
                  {selectedRecord.allowances.length === 0 ? (
                    <div className="text-[11px] text-stone-600 font-sans italic">Không có phụ cấp nào.</div>
                  ) : (
                    selectedRecord.allowances.map((al) => (
                      <div key={al.id} className="p-3 bg-stone-950/20 border border-white/5 rounded-xl text-xs flex justify-between">
                        <div>
                          <p className="font-semibold text-stone-200">{al.allowance_type}</p>
                          <p className="text-[10px] text-stone-500 mt-0.5">{al.note}</p>
                        </div>
                        <span className="font-mono font-semibold text-emerald-400">+{formatVND(al.amount)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Deductions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold uppercase font-sans mb-1">
                    <ArrowDownCircle className="w-4 h-4 shrink-0" />
                    Khấu trừ chi tiết
                  </div>
                  {selectedRecord.deductions.length === 0 ? (
                    <div className="text-[11px] text-stone-600 font-sans italic">Không có khoản khấu trừ nào.</div>
                  ) : (
                    selectedRecord.deductions.map((de) => (
                      <div key={de.id} className="p-3 bg-stone-950/20 border border-white/5 rounded-xl text-xs flex justify-between">
                        <div>
                          <p className="font-semibold text-stone-200">
                            {de.deduction_type === "late_early" ? "Trễ / Về sớm" : de.deduction_type}
                          </p>
                          <p className="text-[10px] text-stone-500 mt-0.5">{de.note}</p>
                        </div>
                        <span className="font-mono font-semibold text-rose-400">-{formatVND(de.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
