"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  SlidersHorizontal,
  DollarSign,
  User,
  Shield,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  Check,
} from "lucide-react";
import Modal from "@/components/admin/Modal";

interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  cccd: string | null;
  address: string | null;
  date_of_birth: string | null;
  hire_date: string;
  status: "active" | "terminated" | "on_leave";
  avatar_url: string | null;
  user_id: number | null;
  username: string | null;
  roles: { code: string; name: string }[];
  salary_type: "hourly" | "monthly" | null;
  base_rate: string | null;
  standard_working_days: number | null;
  meal_allowance: string | null;
  parking_allowance: string | null;
  responsibility_allowance: string | null;
  attendance_allowance: string | null;
  sales_bonus: string | null;
}

export default function HREmployees() {
  const { user } = useAuth();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Search and filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Form States - Profile
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cccd, setCccd] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [status, setStatus] = useState<"active" | "terminated" | "on_leave">("active");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Form States - Account
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [systemRole, setSystemRole] = useState<"admin" | "staff">("staff");

  // Form States - Business Roles
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Form States - Salary Config
  const [salaryType, setSalaryType] = useState<"hourly" | "monthly">("hourly");
  const [baseRate, setBaseRate] = useState("");
  const [stdWorkingDays, setStdWorkingDays] = useState("26");
  const [mealAllowance, setMealAllowance] = useState("0");
  const [parkingAllowance, setParkingAllowance] = useState("0");
  const [responsibilityAllowance, setResponsibilityAllowance] = useState("0");
  const [attendanceAllowance, setAttendanceAllowance] = useState("0");

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Access Control: Redirect if not Owner or Manager (or system admin)
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
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/employees");
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error("Error fetching HR employees:", err);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingEmployee(null);
    setFullName("");
    setPhone("");
    setEmail("");
    setCccd("");
    setAddress("");
    setDob("");
    setHireDate(new Date().toISOString().substring(0, 10));
    setStatus("active");
    setAvatarUrl("");
    setUsername("");
    setPassword("");
    setSystemRole("staff");
    setSelectedRoles([]);
    setSalaryType("hourly");
    setBaseRate("30000");
    setStdWorkingDays("26");
    setMealAllowance("0");
    setParkingAllowance("200000");
    setResponsibilityAllowance("0");
    setAttendanceAllowance("0");
    setFeedback(null);
    setModalOpen(true);
  }

  function openEditModal(emp: Employee) {
    setEditingEmployee(emp);
    setFullName(emp.full_name);
    setPhone(emp.phone || "");
    setEmail(emp.email || "");
    setCccd(emp.cccd || "");
    setAddress(emp.address || "");
    setDob(emp.date_of_birth ? emp.date_of_birth.substring(0, 10) : "");
    setHireDate(emp.hire_date ? emp.hire_date.substring(0, 10) : "");
    setStatus(emp.status);
    setAvatarUrl(emp.avatar_url || "");
    setUsername(emp.username || "");
    setPassword(""); // Leave blank
    setSystemRole(emp.user_id ? "staff" : "staff"); // Placeholder
    setSelectedRoles(emp.roles.map((r) => r.code));
    setSalaryType(emp.salary_type || "hourly");
    setBaseRate(emp.base_rate ? parseFloat(emp.base_rate).toString() : "0");
    setStdWorkingDays(emp.standard_working_days ? emp.standard_working_days.toString() : "26");
    setMealAllowance(emp.meal_allowance ? parseFloat(emp.meal_allowance).toString() : "0");
    setParkingAllowance(emp.parking_allowance ? parseFloat(emp.parking_allowance).toString() : "0");
    setResponsibilityAllowance(emp.responsibility_allowance ? parseFloat(emp.responsibility_allowance).toString() : "0");
    setAttendanceAllowance(emp.attendance_allowance ? parseFloat(emp.attendance_allowance).toString() : "0");
    setFeedback(null);
    setModalOpen(true);
  }

  function toggleRole(code: string) {
    setSelectedRoles((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setFeedback({ type: "error", msg: "Họ tên là bắt buộc." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const payload = {
      full_name: fullName,
      phone,
      email,
      cccd,
      address,
      date_of_birth: dob || null,
      hire_date: hireDate,
      status,
      avatar_url: avatarUrl || null,
      username: username.trim() || null,
      password: password.trim() || null,
      system_role: selectedRoles.includes("owner") || selectedRoles.includes("manager") ? "admin" : "staff",
      role_codes: selectedRoles,
      salary_type: salaryType,
      base_rate: parseFloat(baseRate) || 0,
      standard_working_days: parseInt(stdWorkingDays) || 26,
      meal_allowance: parseFloat(mealAllowance) || 0,
      parking_allowance: parseFloat(parkingAllowance) || 0,
      responsibility_allowance: parseFloat(responsibilityAllowance) || 0,
      attendance_allowance: parseFloat(attendanceAllowance) || 0,
    };

    try {
      const url = editingEmployee ? `/api/hr/employees/${editingEmployee.id}` : "/api/hr/employees";
      const method = editingEmployee ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModalOpen(false);
        fetchEmployees();
      } else {
        setFeedback({ type: "error", msg: data.error || "Lưu nhân viên thất bại." });
      }
    } catch {
      setFeedback({ type: "error", msg: "Lỗi kết nối." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(emp: Employee) {
    if (user?.id === emp.user_id) {
      alert("Bạn không thể tự xóa hồ sơ của chính mình!");
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa hồ sơ nhân sự của "${emp.full_name}" không?`)) return;

    try {
      const res = await fetch(`/api/hr/employees/${emp.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchEmployees();
      } else {
        alert(data.error || "Xóa hồ sơ thất bại.");
      }
    } catch {
      alert("Lỗi kết nối.");
    }
  }

  function formatMoney(amount: string | number | null) {
    if (amount === null || amount === undefined || amount === "") return "0đ";
    const val = typeof amount === "number" ? amount : parseFloat(amount);
    if (isNaN(val)) return "0đ";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  }

  // Filter logic
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? emp.roles.some((r) => r.code === roleFilter) : true;
    const matchesStatus = statusFilter ? emp.status === statusFilter : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Hồ Sơ Nhân Sự</h1>
          <p className="text-white/50 text-sm">Quản lý lý lịch nhân viên, chức danh, tài khoản đăng nhập và đơn giá lương</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/10"
        >
          <Plus className="w-4 h-4" />
          Thêm nhân sự
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-stone-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-xl flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc mã nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-stone-950/40 border border-white/5 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-sm font-sans"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 bg-stone-950/40 border border-white/5 rounded-xl text-stone-300 text-xs focus:outline-none focus:border-amber-500/40"
          >
            <option value="">Tất cả chức danh</option>
            <option value="owner">Chủ quán</option>
            <option value="manager">Quản lý</option>
            <option value="barista">Pha chế</option>
            <option value="cashier">Thu ngân</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-stone-950/40 border border-white/5 rounded-xl text-stone-300 text-xs focus:outline-none focus:border-amber-500/40"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang làm</option>
            <option value="on_leave">Tạm nghỉ</option>
            <option value="terminated">Nghỉ việc</option>
          </select>
        </div>
      </div>

      {/* Employee List Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-stone-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-stone-950/20 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Mã & Nhân viên</th>
                  <th className="p-4">Vai trò (Chức danh)</th>
                  <th className="p-4">Thông tin liên hệ</th>
                  <th className="p-4">Cấu hình Lương</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-stone-200">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-stone-500 font-sans">
                      Không tìm thấy nhân viên nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-white/2 transition-colors">
                      {/* Name and avatar */}
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-950 border border-stone-850 flex items-center justify-center text-xs font-bold text-amber-500 uppercase overflow-hidden">
                          {emp.avatar_url ? (
                            <img src={emp.avatar_url} alt={emp.full_name} className="w-full h-full object-cover" />
                          ) : (
                            emp.full_name.substring(0, 2)
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{emp.full_name}</p>
                          <p className="text-[10px] text-stone-500 font-mono mt-0.5">{emp.employee_code}</p>
                        </div>
                      </td>

                      {/* Business Roles */}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {emp.roles.map((r) => (
                            <span
                              key={r.code}
                              className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                                r.code === "owner" || r.code === "manager"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-stone-500/10 text-stone-400 border border-stone-800"
                              }`}
                            >
                              {r.name}
                            </span>
                          ))}
                          {emp.roles.length === 0 && <span className="text-xs text-stone-600 italic">Chưa phân vai</span>}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="p-4 text-xs space-y-1 text-stone-400">
                        <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-stone-500" /> {emp.phone || "---"}</p>
                        <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-stone-500" /> {emp.email || "---"}</p>
                      </td>

                      {/* Salary Config */}
                      <td className="p-4">
                        {emp.salary_type ? (
                          <div>
                            <p className="text-xs font-semibold text-white">
                              {formatMoney(emp.base_rate)}/{emp.salary_type === "hourly" ? "giờ" : "tháng"}
                            </p>
                            <p className="text-[10px] text-stone-500 font-sans mt-0.5">
                              Công chuẩn: {emp.standard_working_days} ngày &bull; PC: {formatMoney(parseFloat(emp.meal_allowance || "0") + parseFloat(emp.parking_allowance || "0"))}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-600 italic">Chưa thiết lập</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                            emp.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : emp.status === "on_leave"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-stone-500/10 text-stone-400 border-stone-800"
                          }`}
                        >
                          {emp.status === "active" ? "Đang làm" : emp.status === "on_leave" ? "Tạm nghỉ" : "Nghỉ việc"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 pr-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-amber-500/20 flex items-center justify-center text-stone-400 hover:text-amber-400 transition-all cursor-pointer"
                            title="Sửa hồ sơ"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            disabled={user?.id === emp.user_id}
                            className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-all ${
                              user?.id === emp.user_id
                                ? "opacity-30 cursor-not-allowed text-stone-600"
                                : "hover:bg-red-500/20 text-stone-400 hover:text-red-400 cursor-pointer"
                            }`}
                            title="Xóa hồ sơ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Edit / Add Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEmployee ? "Chỉnh sửa hồ sơ nhân viên" : "Thêm nhân sự mới"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6 pt-2 max-h-[80vh] overflow-y-auto pr-1">
          {feedback && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-sans">
              {feedback.msg}
            </div>
          )}

          {/* Section 1: Personal Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-stone-850 pb-2">1. Thông tin lý lịch</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập đầy đủ họ tên..."
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Số điện thoại</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Nhập số điện thoại liên hệ..."
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email..."
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Số CCCD</label>
                <input
                  type="text"
                  value={cccd}
                  onChange={(e) => setCccd(e.target.value)}
                  placeholder="Nhập số thẻ căn cước..."
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Ngày sinh</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Ngày vào làm</label>
                <input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Địa chỉ thường trú</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Nhập địa chỉ nhà hiện tại..."
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Trạng thái làm việc</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                >
                  <option value="active">Đang làm</option>
                  <option value="on_leave">Tạm nghỉ</option>
                  <option value="terminated">Nghỉ việc</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Ảnh đại diện (URL)</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Nhập URL ảnh chân dung..."
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Account details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-stone-850 pb-2">2. Tài khoản đăng nhập hệ thống</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!editingEmployee?.user_id}
                  placeholder="Tên viết liền không dấu, e.g. nguyenvana..."
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans disabled:opacity-40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">
                  {editingEmployee?.user_id ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu tài khoản"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Roles mapping */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-stone-850 pb-2">3. Chức danh doanh nghiệp</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { code: "owner", name: "Chủ quán" },
                { code: "manager", name: "Quản lý" },
                { code: "barista", name: "Pha chế" },
                { code: "cashier", name: "Thu ngân" },
              ].map((role) => {
                const isActive = selectedRoles.includes(role.code);
                return (
                  <button
                    type="button"
                    key={role.code}
                    onClick={() => toggleRole(role.code)}
                    className={`py-2 px-3 border text-xs font-semibold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      isActive
                        ? "bg-stone-900 text-white border-amber-500/50 shadow-md"
                        : "bg-stone-950/20 text-stone-500 border-stone-900 hover:text-stone-300"
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    {role.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Salary Config */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-stone-850 pb-2">4. Cấu hình lương & Phụ cấp</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Hình thức lương</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSalaryType("hourly")}
                    className={`py-2 px-3 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      salaryType === "hourly"
                        ? "bg-stone-900 text-white border-amber-500/50 shadow-md"
                        : "bg-stone-950/20 text-stone-500 border-stone-900 hover:text-stone-300"
                    }`}
                  >
                    Theo Giờ
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryType("monthly")}
                    className={`py-2 px-3 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      salaryType === "monthly"
                        ? "bg-stone-900 text-white border-amber-500/50 shadow-md"
                        : "bg-stone-950/20 text-stone-500 border-stone-900 hover:text-stone-300"
                    }`}
                  >
                    Theo Tháng cố định
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">
                  {salaryType === "hourly" ? "Đơn giá giờ (VNĐ/giờ)" : "Lương tháng cơ bản (VNĐ/tháng)"}
                </label>
                <input
                  type="number"
                  required
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
                />
              </div>

              {salaryType === "monthly" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-stone-400 uppercase">Ngày công chuẩn của tháng (ngày)</label>
                  <input
                    type="number"
                    value={stdWorkingDays}
                    onChange={(e) => setStdWorkingDays(e.target.value)}
                    className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Phụ cấp ăn uống (VNĐ/tháng)</label>
                <input
                  type="number"
                  value={mealAllowance}
                  onChange={(e) => setMealAllowance(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Phụ cấp gửi xe (VNĐ/tháng)</label>
                <input
                  type="number"
                  value={parkingAllowance}
                  onChange={(e) => setParkingAllowance(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Phụ cấp trách nhiệm (VNĐ/tháng)</label>
                <input
                  type="number"
                  value={responsibilityAllowance}
                  onChange={(e) => setResponsibilityAllowance(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-400 uppercase">Phụ cấp chuyên cần (VNĐ/tháng)</label>
                <input
                  type="number"
                  value={attendanceAllowance}
                  onChange={(e) => setAttendanceAllowance(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 text-xs font-sans font-mono"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-850">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 border border-stone-850 hover:bg-stone-900 text-stone-300 text-xs font-semibold rounded-xl transition-all cursor-pointer font-sans"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu hồ sơ</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
