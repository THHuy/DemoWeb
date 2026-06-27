"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/admin/AuthProvider";
import {
  UtensilsCrossed,
  FileText,
  Star,
  ArrowRight,
  Calendar,
  TrendingUp,
  Sparkles,
  Clock,
  Activity,
} from "lucide-react";

interface Stats {
  menuItems: number;
  posts: number;
  reviews: number;
  reservations: number;
}

const statsConfig = [
  {
    key: "menuItems" as const,
    title: "Món trong menu",
    icon: UtensilsCrossed,
    gradient: "from-amber-500 to-orange-500",
    bgGlow: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",


  },
  {
    key: "reservations" as const,
    title: "Lượt đặt bàn",
    icon: Calendar,
    gradient: "from-rose-500 to-pink-500",
    bgGlow: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-400",
    barColor: "bg-rose-400/30",
  },
  {
    key: "posts" as const,
    title: "Bài viết",
    icon: FileText,
    gradient: "from-blue-500 to-indigo-500",
    bgGlow: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    barColor: "bg-blue-400/30",
  },
  {
    key: "reviews" as const,
    title: "Đánh giá",
    icon: Star,
    gradient: "from-emerald-500 to-teal-500",
    bgGlow: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    barColor: "bg-emerald-400/30",
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Chào buổi sáng"
      : currentHour < 18
        ? "Chào buổi chiều"
        : "Chào buổi tối";

  const quickLinks = [
    {
      name: "Quản lý Menu",
      description: "Thêm, sửa, xoá món ăn",
      href: "/admin/menu",
      icon: UtensilsCrossed,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      name: "Duyệt Đặt Bàn",
      description: "Xem và phê duyệt đặt bàn",
      href: "/admin/reservations",
      icon: Calendar,
      gradient: "from-rose-500 to-pink-600",
    },
    {
      name: user?.role === "admin" ? "Viết bài mới" : "Xem bài viết",
      description:
        user?.role === "admin"
          ? "Tạo bài viết blog mới"
          : "Quản lý bài viết blog",
      href: user?.role === "admin" ? "/admin/posts/new" : "/admin/posts",
      icon: FileText,
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      name: "Xem đánh giá",
      description: "Phản hồi đánh giá khách hàng",
      href: "/admin/reviews",
      icon: Star,
      gradient: "from-emerald-500 to-teal-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/8 to-blue-500/5 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium uppercase tracking-widest text-amber-400/80">
                {greeting}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {user?.username ? (
                <>
                  Xin chào,{" "}
                  <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                    {user.username}
                  </span>
                </>
              ) : (
                "Dashboard"
              )}
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-white/40">
              Quản lý nội dung website L&apos;Ambiance Café & Bistro. Theo dõi
              hoạt động và cập nhật thông tin tại đây.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-white/40">Trạng thái</p>
              <p className="text-sm font-semibold text-emerald-400">
                Hoạt động
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-white/30" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">
            Tổng quan
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[160px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
              />
            ))
            : statsConfig.map((config) => {
              const Icon = config.icon;
              const value = stats?.[config.key] ?? 0;

              return (
                <div
                  key={config.key}
                  className={`group relative overflow-hidden rounded-2xl border ${config.borderColor} bg-white/[0.03] p-6 transition-all duration-500 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/20`}
                >
                  {/* Background glow on hover */}
                  <div
                    className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full ${config.bgGlow} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
                  />

                  {/* Decorative bar */}
                  <div
                    className={`absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b ${config.gradient} opacity-40 transition-opacity duration-300 group-hover:opacity-80`}
                  />

                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${config.iconBg} transition-transform duration-300 group-hover:scale-110`}
                      >
                        <Icon className={`h-5 w-5 ${config.iconColor}`} />
                      </div>
                    </div>

                    <p className="mb-1 text-4xl font-bold tracking-tight text-white">
                      {value}
                    </p>
                    <p className="text-sm text-white/40">{config.title}</p>


                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-white/30" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">
            Thao tác nhanh
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06]"
              >
                {/* Gradient overlay on hover */}
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${link.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.08]`}
                />

                <div className="relative flex flex-col gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${link.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">
                        {link.name}
                      </h3>
                      <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-white/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-white/60" />
                    </div>
                    <p className="text-xs leading-relaxed text-white/30">
                      {link.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
