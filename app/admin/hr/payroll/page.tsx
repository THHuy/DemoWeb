"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Calendar,
  FileSpreadsheet,
  Calculator,
  Plus,
  Search,
  Loader2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Coins,
  ChevronDown,
  Info,
} from "lucide-react";
import Modal from "@/components/admin/Modal";

interface Adjustment {
  id: number;
  allowance_type?: string;
  deduction_type?: string;
  amount: string;
  note: string;
}

interface PayrollRecord {
  id: number;
  employee_code: string;
  full_name: string;
  pay_month: string;
  actual_hours: string;
  actual_days: string;
  base_salary: string;
  allowance_total: string;
  deduction_total: string;
  net_salary: string;
  status: "draft" | "approved" | "paid";
  allowances: Adjustment[];
  deductions: Adjustment[];
}

export default function HRPayroll() {
  const { user } = useAuth();
  const router = useRouter();

  const [payMonth, setPayMonth] = useState(() => {
    const today = new Date();
    return today.toISOString().substring(0, 7); // YYYY-MM
  });

  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [search, setSearch] = useState("");

  // Adjustment Modal States
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [adjustType, setAdjustType] = useState<"allowance" | "deduction">("allowance");
  const [adjustSubType, setAdjustSubType] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [submittingAdjust, setSubmittingAdjust] = useState(false);
  const [adjustFeedback, setAdjustFeedback] = useState<string | null>(null);

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
    fetchPayroll();
  }, [payMonth]);

  async function fetchPayroll() {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/payroll?pay_month=${payMonth}`);
      if (res.ok) {
        setRecords(await res.json());
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Error loading payroll:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunCalculation() {
    setCalculating(true);
    try {
      const res = await fetch("/api/hr/payroll/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pay_month: payMonth }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchPayroll();
        alert(`Tính lương thành công cho ${data.count} nhân sự!`);
      } else {
        alert(data.error || "Tính lương thất bại.");
      }
    } catch {
      alert("Lỗi kết nối máy chủ.");
    } finally {
      setCalculating(false);
    }
  }

  async function handleUpdateStatus(id: number, status: "draft" | "approved" | "paid") {
    try {
      const res = await fetch(`/api/hr/payroll/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchPayroll();
      }
    } catch {
      alert("Lỗi kết nối.");
    }
  }

  async function handleAddAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRecordId || !adjustSubType || !adjustAmount) {
      setAdjustFeedback("Vui lòng điền đủ các thông tin điều chỉnh.");
      return;
    }
    setSubmittingAdjust(true);
    setAdjustFeedback(null);
    try {
      const res = await fetch("/api/hr/payroll/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salary_record_id: parseInt(selectedRecordId),
          type: adjustType,
          sub_type: adjustSubType,
          amount: parseFloat(adjustAmount),
          note: adjustNote,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdjustModalOpen(false);
        setAdjustSubType("");
        setAdjustAmount("");
        setAdjustNote("");
        fetchPayroll();
      } else {
        setAdjustFeedback(data.error || "Điều chỉnh lương thất bại.");
      }
    } catch {
      setAdjustFeedback("Lỗi kết nối.");
    } finally {
      setSubmittingAdjust(false);
    }
  }

  function handleExportExcel() {
    const apiUrl = `/api/hr/payroll/export?pay_month=${payMonth}`;
    window.open(apiUrl, "_blank");
  }

  function openAdjustmentModal(rec: PayrollRecord) {
    setSelectedRecordId(rec.id.toString());
    setAdjustType("allowance");
    setAdjustSubType("Thưởng doanh số");
    setAdjustAmount("");
    setAdjustNote("");
    setAdjustFeedback(null);
    setAdjustModalOpen(true);
  }

  function formatMoney(amountStr: string | number | null) {
    if (amountStr === null || amountStr === undefined) return "0đ";
    const val = typeof amountStr === "string" ? parseFloat(amountStr) : amountStr;
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  }

  const filteredRecords = records.filter(
    (r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayrollCost = records.reduce((sum, r) => sum + parseFloat(r.net_salary), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bảng Lương Tháng</h1>
          <p className="text-white/50 text-sm">Chạy tính lương định kỳ hàng tháng, điều chỉnh thưởng phạt và xuất báo cáo Excel</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-stone-900 border border-white/10 hover:bg-stone-850 text-stone-200 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Xuất Excel
          </button>
          <button
            onClick={handleRunCalculation}
            disabled={calculating}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/10"
          >
            {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Tính Lương Tháng
          </button>
        </div>
      </div>

      {/* Filter and Summary block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Date Selector */}
        <div className="bg-stone-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-center gap-2">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-sans">Chọn kỳ lương (Tháng)</label>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-amber-500 shrink-0" />
            <input
              type="month"
              value={payMonth}
              onChange={(e) => setPayMonth(e.target.value)}
              className="bg-transparent border-none text-white text-md font-mono focus:outline-none cursor-pointer w-full"
            />
          </div>
        </div>

        {/* Cost Summary */}
        <div className="bg-stone-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-center gap-1.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-sans">Tổng chi phí lương tháng</span>
          <div className="text-2xl font-mono font-bold text-white tracking-wide">
            {formatMoney(totalPayrollCost)}
          </div>
          <p className="text-[9px] text-stone-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Tính cho {records.length} nhân sự hoạt động.
          </p>
        </div>

        {/* Search filter */}
        <div className="bg-stone-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-xl flex items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm nhân viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-stone-950/40 border border-white/5 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
            />
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-stone-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-white/5 bg-stone-950/20 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Nhân viên</th>
                  <th className="p-4">Số công / giờ</th>
                  <th className="p-4">Lương cơ bản</th>
                  <th className="p-4 text-emerald-400">Tổng Phụ cấp</th>
                  <th className="p-4 text-rose-400">Tổng Khấu trừ</th>
                  <th className="p-4">Lương Thực nhận</th>
                  <th className="p-4">Trạng thái chi trả</th>
                  <th className="p-4 pr-6 text-right">Điều chỉnh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-stone-300 font-sans">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-stone-500">
                      Chưa có dữ liệu bảng lương cho kỳ lương này. Hãy nhấn &quot;Tính Lương Tháng&quot; để tạo.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-white/2 transition-colors">
                      {/* Name & Code */}
                      <td className="p-4 pl-6 font-semibold text-white">
                        <p className="text-sm font-semibold">{rec.full_name}</p>
                        <p className="text-[10px] text-stone-500 font-mono mt-0.5">{rec.employee_code}</p>
                      </td>

                      {/* Working hours/days */}
                      <td className="p-4 font-mono font-medium text-stone-200">
                        {parseFloat(rec.actual_hours) > 0 ? (
                          <p>{parseFloat(rec.actual_hours)} giờ</p>
                        ) : (
                          <p>{parseFloat(rec.actual_days)} công</p>
                        )}
                      </td>

                      {/* Base Rate */}
                      <td className="p-4 font-mono">{formatMoney(rec.base_salary)}</td>

                      {/* Total Allowance */}
                      <td className="p-4 font-mono text-emerald-400">+{formatVND(rec.allowance_total)}</td>

                      {/* Total Deduction */}
                      <td className="p-4 font-mono text-rose-400">-{formatVND(rec.deduction_total)}</td>

                      {/* Net Pay */}
                      <td className="p-4 font-mono font-bold text-sm text-amber-400">{formatMoney(rec.net_salary)}</td>

                      {/* Status select dropdown */}
                      <td className="p-4">
                        <div className="relative inline-block text-left">
                          <select
                            value={rec.status}
                            onChange={(e) => handleUpdateStatus(rec.id, e.target.value as any)}
                            className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded border focus:outline-none cursor-pointer ${
                              rec.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : rec.status === "approved"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-stone-500/10 text-stone-400 border-stone-850"
                            }`}
                          >
                            <option value="draft" className="bg-stone-950 text-stone-300">Nháp</option>
                            <option value="approved" className="bg-stone-950 text-amber-400">Đã duyệt</option>
                            <option value="paid" className="bg-stone-950 text-emerald-400">Đã chi trả</option>
                          </select>
                        </div>
                      </td>

                      {/* Adjustment trigger button */}
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => openAdjustmentModal(rec)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-amber-500/20 flex items-center justify-center text-stone-400 hover:text-amber-400 transition-all cursor-pointer border border-white/5"
                          title="Thêm phụ cấp/khấu trừ thủ công"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjustments Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title="Thêm Điều Chỉnh Lương Thủ Công"
        size="md"
      >
        <form onSubmit={handleAddAdjustment} className="space-y-4 pt-2">
          {adjustFeedback && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-sans rounded-xl">
              {adjustFeedback}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-stone-400 uppercase">Loại điều chỉnh</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustType("allowance");
                  setAdjustSubType("Thưởng chuyên cần");
                }}
                className={`py-2.5 px-3 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  adjustType === "allowance"
                    ? "bg-stone-900 text-white border-amber-500/50 shadow-md"
                    : "bg-stone-950/20 text-stone-500 border-stone-900 hover:text-stone-300"
                }`}
              >
                Cộng thêm (Thưởng/Phụ cấp)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustType("deduction");
                  setAdjustSubType("Phạt nội quy");
                }}
                className={`py-2.5 px-3 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  adjustType === "deduction"
                    ? "bg-stone-900 text-white border-amber-500/50 shadow-md"
                    : "bg-stone-950/20 text-stone-500 border-stone-900 hover:text-stone-300"
                }`}
              >
                Khấu trừ (Phạt/Tạm ứng)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-stone-400 uppercase">Khoản điều chỉnh</label>
            <select
              value={adjustSubType}
              onChange={(e) => setAdjustSubType(e.target.value)}
              className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
            >
              {adjustType === "allowance" ? (
                <>
                  <option value="Thưởng chuyên cần">Thưởng chuyên cần</option>
                  <option value="Thưởng doanh số">Thưởng doanh số</option>
                  <option value="Phụ cấp ăn uống bổ sung">Phụ cấp ăn uống bổ sung</option>
                  <option value="Thưởng nóng">Thưởng nóng</option>
                  <option value="Khác">Phụ cấp/Thưởng khác</option>
                </>
              ) : (
                <>
                  <option value="Phạt nội quy">Phạt nội quy</option>
                  <option value="Tạm ứng lương">Tạm ứng lương</option>
                  <option value="Trừ phép không lương">Trừ phép không lương</option>
                  <option value="Khấu trừ khác">Khấu trừ phạt khác</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-stone-400 uppercase">Số tiền điều chỉnh (VNĐ) *</label>
            <input
              type="number"
              required
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="e.g. 200000..."
              className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-stone-400 uppercase">Ghi chú chi tiết *</label>
            <textarea
              rows={3}
              required
              placeholder="Nhập lý do điều chỉnh..."
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setAdjustModalOpen(false)}
              className="px-4 py-2.5 border border-stone-850 hover:bg-stone-900 text-stone-300 text-xs font-semibold rounded-xl transition-all cursor-pointer font-sans"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submittingAdjust}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-amber-500/10"
            >
              {submittingAdjust && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu điều chỉnh</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );

  function formatVND(amountStr: string | number) {
    const val = typeof amountStr === "string" ? parseFloat(amountStr) : amountStr;
    return val.toLocaleString("vi-VN");
  }
}
