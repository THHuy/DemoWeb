"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useRouter } from "next/navigation";
import { History, User, Clock, Shield, ChevronDown, ChevronUp, Loader2, Info } from "lucide-react";

interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  target_type: string;
  target_id: number | null;
  old_values: any;
  new_values: any;
  created_at: string;
}

export default function HRAuditLogs() {
  const { user } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

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
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/audit-logs");
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error("Error fetching HR audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  function translateAction(action: string) {
    switch (action) {
      case "create_employee":
        return "Tạo hồ sơ nhân viên";
      case "update_employee":
        return "Cập nhật hồ sơ nhân viên";
      case "delete_employee":
        return "Xóa hồ sơ nhân viên";
      case "register_shift":
        return "Đăng ký ca làm";
      case "request_shift_swap":
        return "Yêu cầu đổi ca";
      case "approve_shift":
        return "Phê duyệt đăng ký ca";
      case "approve_shift_swap":
        return "Duyệt đồng ý đổi ca";
      case "reject_shift_swap":
        return "Duyệt từ chối đổi ca";
      case "check_in":
        return "Check-in chấm công";
      case "check_out":
        return "Check-out chấm công";
      case "check_out_forgot_checkin":
        return "Check-out (Thiếu Check-in)";
      case "edit_attendance":
        return "Sửa giờ chấm công";
      case "request_leave":
        return "Nộp đơn nghỉ phép";
      case "approve_leave":
        return "Duyệt đơn nghỉ phép";
      case "reject_leave":
        return "Từ chối nghỉ phép";
      case "calculate_payroll":
        return "Chạy tính lương tháng";
      case "update_payroll_status":
        return "Cập nhật chi trả lương";
      case "adjust_salary":
        return "Điều chỉnh lương thủ công";
      case "update_hr_setting":
        return "Cập nhật cấu hình HR";
      default:
        return action;
    }
  }

  function toggleExpand(id: number) {
    setExpandedLogId(expandedLogId === id ? null : id);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Nhật Ký Hoạt Động</h1>
        <p className="text-white/50 text-sm">Lịch sử thay đổi hệ thống cấu hình lương, ca làm, sửa giờ công và duyệt phép</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-stone-900/40 border border-white/5 rounded-3xl p-12 text-center text-stone-500 backdrop-blur-xl">
          <History className="w-12 h-12 mx-auto mb-4 opacity-15" />
          <p className="font-sans text-sm">Chưa ghi nhận hoạt động hệ thống nào.</p>
        </div>
      ) : (
        <div className="bg-stone-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-stone-950/20 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Người thực hiện</th>
                  <th className="p-4">Thời gian</th>
                  <th className="p-4">Hành động</th>
                  <th className="p-4">Đối tượng</th>
                  <th className="p-4 pr-6 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-stone-300 font-sans">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => toggleExpand(log.id)}
                      className="hover:bg-white/2 transition-colors cursor-pointer"
                    >
                      {/* Operator Username */}
                      <td className="p-4 pl-6 font-semibold flex items-center gap-2">
                        <User className="w-4 h-4 text-stone-500 shrink-0" />
                        <span className="text-white">{log.username || "Hệ thống"}</span>
                      </td>

                      {/* Timestamp */}
                      <td className="p-4 text-stone-400 font-mono">
                        {new Date(log.created_at).toLocaleString("vi-VN")}
                      </td>

                      {/* Translated Action */}
                      <td className="p-4 font-semibold text-amber-400">
                        {translateAction(log.action)}
                      </td>

                      {/* Target type & ID */}
                      <td className="p-4 text-stone-400 font-mono">
                        {log.target_type} {log.target_id ? `[#${log.target_id}]` : ""}
                      </td>

                      {/* Expand Control Icon */}
                      <td className="p-4 pr-6 text-right text-stone-500">
                        {expandedLogId === log.id ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                      </td>
                    </tr>

                    {/* Collapsible JSON details */}
                    {expandedLogId === log.id && (
                      <tr>
                        <td colSpan={5} className="p-6 bg-stone-950/40 border-b border-white/5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Old values */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Giá Trị Cũ (Trước Thay Đổi)</span>
                              <pre className="p-4 bg-stone-950 border border-white/5 rounded-2xl overflow-x-auto text-[10px] font-mono text-stone-400 max-h-48 overflow-y-auto leading-relaxed">
                                {log.old_values ? JSON.stringify(log.old_values, null, 2) : "NULL (Dữ liệu mới hoàn toàn)"}
                              </pre>
                            </div>

                            {/* New values */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Giá Trị Mới (Sau Thay Đổi)</span>
                              <pre className="p-4 bg-stone-950 border border-white/5 rounded-2xl overflow-x-auto text-[10px] font-mono text-stone-400 max-h-48 overflow-y-auto leading-relaxed">
                                {log.new_values ? JSON.stringify(log.new_values, null, 2) : "NULL (Dữ liệu bị xóa)"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
