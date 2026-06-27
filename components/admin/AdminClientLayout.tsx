"use client";
import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./AuthProvider";
import Sidebar from "./Sidebar";
import Modal from "./Modal";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Bell, X, Calendar, Clock, Users, Trash2, Check, Phone, ExternalLink, ArrowRight, AlertCircle, UserCheck, RefreshCw, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationToast {
  id: number;
  name: string;
  phone: string;
  booking_date: string;
  booking_time: string;
  guests: number;
  type?: string;
  title?: string;
  message?: string;
  time?: string;
}

interface PersistentNotification {
  id: string;
  name: string;
  phone: string;
  guests: number;
  booking_date: string;
  booking_time: string;
  read: boolean;
  created_at: number;
  type?: string;
  title?: string;
  message?: string;
  time?: string;
}

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const isPOSPage = pathname === "/admin/pos";
  const isHRAdmin =
    user?.role === "admin" ||
    user?.businessRoles?.includes("owner") ||
    user?.businessRoles?.includes("manager");
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [notifications, setNotifications] = useState<PersistentNotification[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<PersistentNotification | null>(null);

  // Responsive sidebar states
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load notifications from localStorage when user is loaded
  useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`lambiance_notifications_${user.id}`);
      if (stored) {
        try {
          setNotifications(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to load notifications:", e);
        }
      } else {
        setNotifications([]);
      }
    }
  }, [user]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#notif-bell-container")) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [dropdownOpen]);

  // Synthesize a premium double chime chime using Web Audio API
  const playChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      // C5 Note
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      // C6 Note (Delayed by 120ms)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("AudioContext failed or blocked by browser policy:", e);
    }
  };

  // SSE connection for real-time notifications
  useEffect(() => {
    if (!user || isLoginPage) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const eventSource = new EventSource(`${apiUrl}/api/reservations/sse`, {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const newBooking = JSON.parse(event.data);
        playChime();
        
        // Add to active toast notifications
        const toastId = Date.now();
        setToasts((prev) => [...prev, { id: toastId, ...newBooking }]);

        // Add to persistent notifications
        const newPersNotification: PersistentNotification = {
          id: `notif-${toastId}-${Math.random().toString(36).substring(2, 9)}`,
          name: newBooking.name || "",
          phone: newBooking.phone || "",
          guests: newBooking.guests || 0,
          booking_date: newBooking.booking_date || "",
          booking_time: newBooking.booking_time || "",
          read: false,
          created_at: toastId,
          type: newBooking.type,
          title: newBooking.title,
          message: newBooking.message,
          time: newBooking.time,
        };

        setNotifications((prev) => {
          const updated = [newPersNotification, ...prev].slice(0, 50); // limit to 50 items
          if (typeof window !== "undefined" && user) {
            localStorage.setItem(`lambiance_notifications_${user.id}`, JSON.stringify(updated));
          }
          return updated;
        });

        // Dispatch a custom event so active pages can refetch dynamically in real-time
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("sse-notification", { detail: newBooking }));
        }

        // Auto remove toast after 8 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, 8000);
      } catch (err) {
        console.error("SSE message parsing error:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE reconnecting...", err);
    };

    return () => {
      eventSource.close();
    };
  }, [user, isLoginPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B090A] flex flex-col items-center justify-center text-stone-300">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <p className="text-sm font-sans tracking-wide text-stone-500">Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  }

  // If logged in or on the login/POS page
  if (isLoginPage || isPOSPage) {
    return <>{children}</>;
  }

  const handleToastClick = (toast: NotificationToast) => {
    setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    if (toast.type === "shift_register") {
      router.push("/admin/hr/shifts?tab=approvals");
    } else if (toast.type === "check_out" || toast.type === "check_in") {
      router.push("/admin/hr/attendance?tab=logs");
    } else if (toast.type === "leave_request") {
      router.push("/admin/hr/attendance?tab=leaves");
    } else {
      router.push("/admin/reservations");
    }
  };

  const handleNotificationClick = (notif: PersistentNotification) => {
    // Mark as read
    const updated = notifications.map((n) => (n.id === notif.id ? { ...n, read: true } : n));
    setNotifications(updated);
    if (typeof window !== "undefined" && user) {
      localStorage.setItem(`lambiance_notifications_${user.id}`, JSON.stringify(updated));
    }
    setDropdownOpen(false);
    // Open detail modal instead of navigating
    setSelectedNotification(notif);
  };

  const getNotificationRoute = (notif: PersistentNotification) => {
    if (notif.type === "shift_register") return "/admin/hr/shifts?tab=approvals";
    if (notif.type === "check_out" || notif.type === "check_in") return "/admin/hr/attendance?tab=logs";
    if (notif.type === "leave_request") return "/admin/hr/attendance?tab=leaves";
    if (notif.type === "shift_approval" || notif.type === "swap_approval") return "/admin/staff/shifts";
    if (notif.type === "leave_approval") return "/admin/staff/attendance";
    return "/admin/reservations";
  };

  const getNotificationTypeLabel = (type?: string) => {
    switch (type) {
      case "shift_register": return "Đăng ký ca làm";
      case "check_in": return "Check-in";
      case "check_out": return "Check-out";
      case "leave_request": return "Xin nghỉ phép";
      case "shift_approval": return "Duyệt ca làm";
      case "swap_approval": return "Duyệt đổi ca";
      case "leave_approval": return "Duyệt nghỉ phép";
      default: return "Đặt bàn mới";
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "shift_register": return <RefreshCw className="w-5 h-5" />;
      case "check_in": return <UserCheck className="w-5 h-5" />;
      case "check_out": return <Clock className="w-5 h-5" />;
      case "leave_request": return <AlertCircle className="w-5 h-5" />;
      case "shift_approval": return <CheckCircle2 className="w-5 h-5" />;
      case "swap_approval": return <RefreshCw className="w-5 h-5" />;
      case "leave_approval": return <CheckCircle2 className="w-5 h-5" />;
      default: return <Calendar className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type?: string) => {
    switch (type) {
      case "shift_register": return { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" };
      case "check_in": return { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" };
      case "check_out": return { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400" };
      case "leave_request": return { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400" };
      case "shift_approval": return { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" };
      case "swap_approval": return { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400" };
      case "leave_approval": return { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-400" };
      default: return { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" };
    }
  };

  const handleNavigateFromModal = () => {
    if (!selectedNotification) return;
    const route = getNotificationRoute(selectedNotification);
    setSelectedNotification(null);
    router.push(route);
  };

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    if (typeof window !== "undefined" && user) {
      localStorage.setItem(`lambiance_notifications_${user.id}`, JSON.stringify(updated));
    }
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    if (typeof window !== "undefined" && user) {
      localStorage.setItem(`lambiance_notifications_${user.id}`, JSON.stringify(updated));
    }
  };

  const handleClearAll = () => {
    if (!confirm("Bạn có chắc muốn xóa tất cả thông báo?")) return;
    setNotifications([]);
    if (typeof window !== "undefined" && user) {
      localStorage.removeItem(`lambiance_notifications_${user.id}`);
    }
  };

  const formatTime = (timeStr: string) => timeStr.substring(0, 5);
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="min-h-screen text-stone-100 font-sans relative"
      style={{
        background: "linear-gradient(135deg, #0A0A0A 0%, #121212 50%, #1A1A1A 100%)",
      }}
    >
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      
      <main className={`min-h-screen transition-all duration-300 flex flex-col ${
        collapsed ? "md:ml-[72px]" : "md:ml-64"
      } ml-0`}>
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-stone-900/10 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button for mobile */}
            {user && !isLoginPage && (
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-stone-300 hover:text-white md:hidden cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div>
              <span className="text-xs text-stone-500 font-sans tracking-wide">
                Hệ thống quản trị &bull; {user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell Dropdown */}
            {user && !isLoginPage && (
              <div className="relative" id="notif-bell-container">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-stone-300 hover:text-white transition-all cursor-pointer relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold text-stone-950 shadow-lg shadow-amber-500/20 animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="absolute right-0 mt-3 w-80 bg-stone-950/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
                    >
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">Thông báo ({notifications.length})</span>
                        <div className="flex gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="text-[10px] font-semibold text-amber-500 hover:text-amber-400 cursor-pointer"
                            >
                              Đọc tất cả
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={handleClearAll}
                              className="text-[10px] font-semibold text-rose-500 hover:text-rose-400 cursor-pointer pl-2 border-l border-white/10"
                            >
                              Xóa tất cả
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notification List */}
                      <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-stone-600 text-xs font-sans">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-10" />
                            Không có thông báo mới.
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-4 flex gap-3 hover:bg-white/2 cursor-pointer transition-colors relative group/item ${
                                !notif.read ? "bg-amber-500/[0.02]" : ""
                              }`}
                            >
                              {/* Unread indicator dot */}
                              {!notif.read && (
                                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              )}
                              
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                                <Users className="w-4 h-4" />
                              </div>

                              <div className="flex-1 min-w-0 pr-4">
                                <p className="text-xs font-semibold text-white truncate">{notif.title || notif.name}</p>
                                {notif.type ? (
                                  <>
                                    <p className="text-[10px] text-stone-400 truncate mt-0.5">
                                      {notif.message}
                                    </p>
                                    {notif.time && (
                                      <p className="text-[9px] text-stone-500 mt-1 flex items-center gap-1 font-sans">
                                        <Clock className="w-3.5 h-3.5 text-stone-600" />
                                        {notif.time}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <p className="text-[10px] text-stone-400 truncate mt-0.5">
                                      Đặt bàn {notif.guests} khách - {notif.phone}
                                    </p>
                                    <p className="text-[9px] text-stone-500 mt-1 flex items-center gap-1 font-sans">
                                      <Clock className="w-3 h-3 text-stone-600" />
                                      {formatTime(notif.booking_time)} &bull; {formatDate(notif.booking_date)}
                                    </p>
                                  </>
                                )}
                              </div>

                              {/* Delete button */}
                              <button
                                onClick={(e) => handleDeleteNotification(e, notif.id)}
                                className="opacity-0 group-hover/item:opacity-100 absolute bottom-4 right-4 text-stone-600 hover:text-rose-400 transition-opacity p-1 cursor-pointer"
                                title="Xóa thông báo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      {isHRAdmin && (
                        <Link
                          href="/admin/reservations"
                          onClick={() => setDropdownOpen(false)}
                          className="block text-center py-2.5 bg-stone-950 hover:bg-white/2 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-t border-t-white/5 transition-colors"
                        >
                          Xem tất cả đặt bàn &rarr;
                        </Link>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </header>

        <div className="p-8 flex-grow">{children}</div>
      </main>

      {/* Floating Notifications Area */}
      {user && !isLoginPage && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4 max-w-sm w-full pointer-events-none">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative p-[1px] rounded-2xl bg-gradient-to-br from-amber-500/30 via-stone-800 to-stone-900 shadow-2xl pointer-events-auto cursor-pointer group"
                onClick={() => handleToastClick(toast)}
              >
                {/* Inner Fine Border */}
                <div className="absolute inset-[3px] border border-amber-500/10 rounded-[13px] pointer-events-none" />

                {/* Art Design Corners */}
                <div className="absolute top-[6px] left-[6px] w-2 h-2 border-t border-l border-amber-500/50 pointer-events-none" />
                <div className="absolute top-[6px] right-[6px] w-2 h-2 border-t border-r border-amber-500/50 pointer-events-none" />
                <div className="absolute bottom-[6px] left-[6px] w-2 h-2 border-b border-l border-amber-500/50 pointer-events-none" />
                <div className="absolute bottom-[6px] right-[6px] w-2 h-2 border-b border-r border-amber-500/50 pointer-events-none" />

                <div className="bg-stone-950/90 rounded-[13px] p-5 backdrop-blur-xl flex gap-3.5">
                  {/* Bell Icon */}
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-white tracking-wide">{toast.title || "Đặt bàn mới!"}</h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                        }}
                        className="text-stone-600 hover:text-stone-400 p-0.5 rounded transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {toast.type ? (
                      <>
                        <p className="text-xs text-stone-300 font-medium">{toast.message}</p>
                        {toast.time && (
                          <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1 font-sans">
                            <Clock className="w-3.5 h-3.5 text-stone-600" />
                            {toast.time}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-stone-300 font-medium">Khách: {toast.name}</p>
                        <p className="text-[10px] text-stone-500 mt-0.5">{toast.phone}</p>
                        <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-white/5 text-[10px] text-stone-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-500/60" />
                            {new Date(toast.booking_date).toLocaleDateString("vi-VN")}
                          </span>
                          <span className="flex items-center gap-1 border-l border-white/10 pl-3">
                            <Clock className="w-3.5 h-3.5 text-amber-500/60" />
                            {toast.booking_time.substring(0, 5)}
                          </span>
                          <span className="flex items-center gap-1 border-l border-white/10 pl-3">
                            <Users className="w-3.5 h-3.5 text-amber-500/60" />
                            {toast.guests} khách
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Notification Detail Modal */}
      <Modal
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        title="Chi tiết thông báo"
        size="sm"
      >
        {selectedNotification && (
          <div className="space-y-6">
            {/* Type Badge & Time */}
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg border ${getNotificationColor(selectedNotification.type).bg} ${getNotificationColor(selectedNotification.type).border} ${getNotificationColor(selectedNotification.type).text}`}>
                {getNotificationTypeLabel(selectedNotification.type)}
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                {new Date(selectedNotification.created_at).toLocaleString("vi-VN", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>

            {/* Icon + Title */}
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${getNotificationColor(selectedNotification.type).bg} border ${getNotificationColor(selectedNotification.type).border} flex items-center justify-center ${getNotificationColor(selectedNotification.type).text} shrink-0`}>
                {getNotificationIcon(selectedNotification.type)}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedNotification.title || selectedNotification.name}
                </h3>
                {selectedNotification.message && (
                  <p className="text-xs text-stone-400 mt-0.5">{selectedNotification.message}</p>
                )}
              </div>
            </div>

            {/* Detail Info Cards */}
            {selectedNotification.type ? (
              /* HR-type notification details */
              <div className="space-y-3">
                {selectedNotification.name && (
                  <div className="flex items-center gap-3 p-3.5 bg-stone-950/40 border border-white/5 rounded-xl">
                    <Users className="w-4 h-4 text-stone-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Nhân viên</p>
                      <p className="text-sm text-white font-medium">{selectedNotification.name}</p>
                    </div>
                  </div>
                )}
                {selectedNotification.time && (
                  <div className="flex items-center gap-3 p-3.5 bg-stone-950/40 border border-white/5 rounded-xl">
                    <Clock className="w-4 h-4 text-stone-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Thời gian</p>
                      <p className="text-sm text-white font-medium">{selectedNotification.time}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Reservation-type notification details */
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3.5 bg-stone-950/40 border border-white/5 rounded-xl">
                  <Users className="w-4 h-4 text-stone-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Khách hàng</p>
                    <p className="text-sm text-white font-medium">{selectedNotification.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 bg-stone-950/40 border border-white/5 rounded-xl">
                  <Phone className="w-4 h-4 text-stone-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Điện thoại</p>
                    <p className="text-sm text-white font-medium">{selectedNotification.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 bg-stone-950/40 border border-white/5 rounded-xl">
                  <Calendar className="w-4 h-4 text-stone-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Ngày đặt</p>
                    <p className="text-sm text-white font-medium">
                      {new Date(selectedNotification.booking_date).toLocaleDateString("vi-VN", {
                        weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 bg-stone-950/40 border border-white/5 rounded-xl">
                  <Clock className="w-4 h-4 text-stone-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Giờ đặt</p>
                    <p className="text-sm text-white font-medium">{formatTime(selectedNotification.booking_time)}</p>
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-3 p-3.5 bg-stone-950/40 border border-white/5 rounded-xl">
                  <Users className="w-4 h-4 text-stone-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Số khách</p>
                    <p className="text-sm text-white font-medium">{selectedNotification.guests} khách</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedNotification(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-stone-300 hover:bg-white/5 text-xs font-semibold transition-all cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={handleNavigateFromModal}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
              >
                Xem chi tiết
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default function AdminClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}
