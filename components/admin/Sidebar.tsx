"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import {
  LayoutDashboard,
  UtensilsCrossed,
  FileText,
  Star,
  ChevronLeft,
  ChevronRight,
  Coffee,
  LogOut,
  Calendar,
  Users,
  Clock,
  CreditCard,
  History,
  X,
  Settings,
  ShoppingCart,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const isHRAdmin =
    user?.role === "admin" ||
    user?.businessRoles?.includes("owner") ||
    user?.businessRoles?.includes("manager");

  const hasStaffRole =
    user?.businessRoles?.includes("barista") ||
    user?.businessRoles?.includes("cashier") ||
    user?.role === "staff"; // Fallback for default staff users

  const menuItems = [
    // Standard Website Admin links & HR Admin links (only show for Owner/Manager or standard Admin)
    ...(isHRAdmin
      ? [
          { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
          { name: "Màn hình POS", href: "/admin/pos", icon: ShoppingCart },
          { name: "Menu", href: "/admin/menu", icon: UtensilsCrossed },
          { name: "Đặt bàn", href: "/admin/reservations", icon: Calendar },
          { name: "Bài viết", href: "/admin/posts", icon: FileText },
          { name: "Đánh giá", href: "/admin/reviews", icon: Star },
          ...(user?.role === "admin"
            ? [{ name: "Tài khoản", href: "/admin/users", icon: Users }]
            : []),
          // HR Admin Links
          { name: "Báo cáo nhân sự", href: "/admin/hr/dashboard", icon: LayoutDashboard },
          { name: "Hồ sơ Nhân viên", href: "/admin/hr/employees", icon: Users },
          { name: "Lịch ca làm việc", href: "/admin/hr/shifts", icon: Calendar },
          { name: "Duyệt Chấm công", href: "/admin/hr/attendance?tab=logs", icon: Clock },
          { name: "Duyệt Nghỉ phép", href: "/admin/hr/attendance?tab=leaves", icon: FileText },
          { name: "Bảng lương tháng", href: "/admin/hr/payroll", icon: CreditCard },
          { name: "Lịch sử Audit", href: "/admin/hr/audit-logs", icon: History },
          ...(user?.role === "admin"
            ? [{ name: "Cài đặt", href: "/admin/settings", icon: Settings }]
            : []),
        ]
      : []),
    // Staff-only links (only show if they don't have manager/owner roles)
    ...(!isHRAdmin && hasStaffRole
      ? [
          { name: "Màn hình POS", href: "/admin/pos", icon: ShoppingCart },
          { name: "Chấm công & Phép", href: "/admin/staff/attendance", icon: Clock },
          { name: "Ca làm việc", href: "/admin/staff/shifts", icon: Calendar },
          { name: "Phiếu lương", href: "/admin/staff/salary", icon: CreditCard },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col transition-all duration-300 
          ${collapsed ? "md:w-[72px]" : "md:w-64"} 
          w-64
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{
          background: "linear-gradient(180deg, #131215 0%, #1a191e 50%, #151417 100%)",
        }}
      >
        {/* Logo Area */}
        <div className="flex items-center justify-between px-5 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-stone-950 shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="overflow-hidden">
                <h1 className="text-white font-bold text-sm tracking-wide truncate">
                  L&apos;Ambiance
                </h1>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">
                  Admin Panel
                </p>
              </div>
            )}
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg hover:bg-white/5 text-stone-400 hover:text-white md:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-white/10 text-white shadow-lg"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              }`}
              title={(collapsed && !mobileOpen) ? item.name : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive
                    ? "text-amber-400"
                    : "text-white/40 group-hover:text-amber-400/70"
                }`}
              />
              {(!collapsed || mobileOpen) && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section & Logout */}
      <div className="px-3 py-3 border-t border-white/5 flex flex-col gap-2 bg-stone-950/20">
        <div className={`flex items-center gap-3 px-3 py-1.5 ${(collapsed && !mobileOpen) ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-xs font-bold text-stone-950 font-sans shrink-0 uppercase">
            {user?.username.substring(0, 2) || "AD"}
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate leading-tight text-stone-200">
                {user?.username}
              </p>
              <p className="text-[10px] text-stone-500 font-medium tracking-wide uppercase mt-0.5">
                {user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all duration-200 cursor-pointer ${
            (collapsed && !mobileOpen) ? "justify-center" : ""
          }`}
          title={(collapsed && !mobileOpen) ? "Đăng xuất" : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {(!collapsed || mobileOpen) && <span>Đăng xuất</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex items-center justify-center py-4 border-t border-white/5 text-white/30 hover:text-white transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
    </>
  );
}
