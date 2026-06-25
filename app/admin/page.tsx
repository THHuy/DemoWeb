"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import StatsCard from "@/components/admin/StatsCard";
import { useAuth } from "@/components/admin/AuthProvider";
import {
  UtensilsCrossed,
  FileText,
  Star,
  Database,
  ArrowRight,
  Loader2,
  Calendar,
} from "lucide-react";

interface Stats {
  menuItems: number;
  posts: number;
  reviews: number;
  reservations: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [initLoading, setInitLoading] = useState(false);
  const [initResult, setInitResult] = useState<string | null>(null);
  const { user, dbInitialized, checkAuth } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // DB might not be initialized yet
    } finally {
      setLoading(false);
    }
  }

  async function handleInitDB() {
    setInitLoading(true);
    setInitResult(null);
    try {
      const res = await fetch("/api/db-init", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setInitResult("✅ Database đã được khởi tạo thành công!");
        await checkAuth(); // Refresh auth session to pick up default accounts
        fetchStats();
      } else {
        setInitResult(`❌ Lỗi: ${data.error}`);
      }
    } catch (err) {
      setInitResult(`❌ Không thể kết nối đến API server. Hãy chắc chắn rằng Express server đang chạy (npm run server).`);
    } finally {
      setInitLoading(false);
    }
  }

  const quickLinks = [
    {
      name: "Quản lý Menu",
      href: "/admin/menu",
      color: "from-amber-500 to-orange-600",
    },
    {
      name: "Duyệt Đặt Bàn",
      href: "/admin/reservations",
      color: "from-rose-500 to-pink-600",
    },
    {
      name: user?.role === "admin" ? "Viết bài mới" : "Xem bài viết",
      href: user?.role === "admin" ? "/admin/posts/new" : "/admin/posts",
      color: "from-blue-500 to-indigo-600",
    },
    {
      name: "Xem đánh giá",
      href: "/admin/reviews",
      color: "from-emerald-500 to-teal-600",
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/50">
          Chào mừng trở lại! Quản lý nội dung website L&apos;Ambiance Café tại đây.
        </p>
      </div>

      {/* DB Init Section */}
      {(dbInitialized === false || user?.role === "admin") && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <Database className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Khởi tạo Database</h3>
                <p className="text-white/40 text-xs">
                  Tạo bảng và dữ liệu mẫu (chỉ cần chạy 1 lần)
                </p>
              </div>
            </div>
            <button
              onClick={handleInitDB}
              disabled={initLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {initLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {initLoading ? "Đang khởi tạo..." : "Khởi tạo DB"}
            </button>
          </div>
          {initResult && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-white/5 text-sm text-white/80">
              {initResult}
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white/5 rounded-2xl p-6 border border-white/10 animate-pulse h-[140px]"
              />
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Món trong menu"
              value={stats?.menuItems ?? 0}
              icon={UtensilsCrossed}
              color="amber"
            />
            <StatsCard
              title="Lượt đặt bàn"
              value={stats?.reservations ?? 0}
              icon={Calendar}
              color="rose"
            />
            <StatsCard
              title="Bài viết"
              value={stats?.posts ?? 0}
              icon={FileText}
              color="blue"
            />
            <StatsCard
              title="Đánh giá"
              value={stats?.reviews ?? 0}
              icon={Star}
              color="emerald"
            />
          </>
        )}
      </div>

      {/* Quick Links */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-80 group-hover:opacity-100 transition-opacity`}
              />
              <div className="relative flex items-center justify-between">
                <span className="text-white font-semibold text-sm">
                  {link.name}
                </span>
                <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
