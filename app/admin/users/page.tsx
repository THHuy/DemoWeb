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
  UserCheck,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import Modal from "@/components/admin/Modal";

interface UserAccount {
  id: number;
  username: string;
  role: "admin" | "staff";
  created_at: string;
}

export default function UsersManagement() {
  const { user } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/admin");
    }
  }, [user, router]);

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchUsers();
    }
  }, [user]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingUser(null);
    setUsername("");
    setPassword("");
    setRole("staff");
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(acc: UserAccount) {
    setEditingUser(acc);
    setUsername(acc.username);
    setPassword(""); // Keep blank to not change unless typed
    setRole(acc.role);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError("Vui lòng nhập tên đăng nhập.");
      return;
    }

    if (!editingUser && !password.trim()) {
      setError("Vui lòng nhập mật khẩu cho tài khoản mới.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const body: any = { username, role };

      if (password.trim()) {
        body.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setModalOpen(false);
        fetchUsers();
      } else {
        setError(data.error || "Có lỗi xảy ra. Vui lòng thử lại.");
      }
    } catch (err) {
      setError("Lỗi kết nối đến máy chủ.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number, targetUsername: string) {
    if (user?.id === id) {
      alert("Bạn không thể tự xóa tài khoản của chính mình!");
      return;
    }

    if (!confirm(`Bạn có chắc muốn xóa tài khoản "${targetUsername}"?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchUsers();
      } else {
        alert(data.error || "Xóa tài khoản thất bại.");
      }
    } catch {
      alert("Lỗi kết nối.");
    }
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
        <p className="font-sans">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Quản lý Tài khoản</h1>
          <p className="text-white/50 text-sm">
            Thêm mới, chỉnh sửa mật khẩu và phân quyền quản trị viên / nhân viên
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/10"
        >
          <Plus className="w-4 h-4" />
          Thêm tài khoản
        </button>
      </div>

      {/* Users List Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-stone-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-stone-950/20 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Người dùng</th>
                  <th className="p-4">Vai trò</th>
                  <th className="p-4">Ngày tạo</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-stone-200">
                {users.map((acc) => (
                  <tr key={acc.id} className="hover:bg-white/2 transition-colors">
                    {/* User profile */}
                    <td className="p-4 pl-6 font-semibold flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center text-xs font-bold text-amber-500 uppercase">
                        {acc.username.substring(0, 2)}
                      </div>
                      <span>
                        {acc.username}
                        {user.id === acc.id && (
                          <span className="text-[10px] text-stone-500 font-medium pl-2 italic">
                            (Tài khoản của bạn)
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Role Badge */}
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          acc.role === "admin"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-stone-500/10 text-stone-400 border-stone-800"
                        }`}
                      >
                        {acc.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="p-4 text-xs text-stone-400 font-sans">
                      {new Date(acc.created_at).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(acc)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-amber-500/20 flex items-center justify-center text-stone-400 hover:text-amber-400 transition-all cursor-pointer"
                          title="Sửa tài khoản"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.id, acc.username)}
                          disabled={user.id === acc.id}
                          className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-all ${
                            user.id === acc.id
                              ? "opacity-30 cursor-not-allowed text-stone-600"
                              : "hover:bg-red-500/20 text-stone-400 hover:text-red-400 cursor-pointer"
                          }`}
                          title={user.id === acc.id ? "Không thể tự xóa chính mình" : "Xóa tài khoản"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? "Chỉnh sửa tài khoản" : "Thêm tài khoản mới"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-sans">
              {error}
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase font-sans">
              Tên đăng nhập
            </label>
            <input
              type="text"
              required
              disabled={submitting || !!editingUser}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập viết liền không dấu..."
              className="w-full px-4 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 disabled:opacity-50 text-sm font-sans"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase font-sans">
              {editingUser ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu"}
            </label>
            <div className="relative">
              <input
                type="password"
                required={!editingUser}
                disabled={submitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full px-4 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 text-sm font-sans"
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase font-sans">
              Vai trò (Phân quyền)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Staff option */}
              <button
                type="button"
                onClick={() => setRole("staff")}
                disabled={submitting || (editingUser?.id === user.id)}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  role === "staff"
                    ? "bg-stone-900 text-white border-amber-500/50 shadow-md"
                    : "bg-stone-950/20 text-stone-500 border-stone-900 hover:text-stone-300"
                } disabled:opacity-50`}
              >
                <Users className="w-4 h-4" />
                Nhân viên
              </button>

              {/* Admin option */}
              <button
                type="button"
                onClick={() => setRole("admin")}
                disabled={submitting || (editingUser?.id === user.id)}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  role === "admin"
                    ? "bg-stone-900 text-white border-amber-500/50 shadow-md"
                    : "bg-stone-950/20 text-stone-500 border-stone-900 hover:text-stone-300"
                } disabled:opacity-50`}
              >
                <Shield className="w-4 h-4" />
                Quản trị viên
              </button>
            </div>
            {editingUser?.id === user.id && (
              <p className="text-[10px] text-stone-500 italic mt-1 font-sans">
                Bạn không thể tự thay đổi vai trò của chính mình để tránh mất quyền quản trị.
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2.5 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-stone-850 hover:bg-stone-900 text-stone-300 text-sm font-semibold rounded-xl transition-all cursor-pointer font-sans"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu tài khoản</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
