"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import {
  Calendar,
  Clock,
  Users,
  Phone,
  MessageSquare,
  Check,
  X,
  Trash2,
  Loader2,
  Search,
  ClipboardList,
  MapPin,
  Sparkles,
  UserCheck,
  XCircle,
  Timer,
} from "lucide-react";

interface Reservation {
  id: number;
  name: string;
  phone: string;
  booking_date: string;
  booking_time: string;
  guests: number;
  notes: string;
  status: "pending" | "confirmed" | "cancelled";
  table_id?: number | null;
  table_number?: string | null;
  created_at: string;
}

export default function ReservationsManagement() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "confirmed" | "cancelled"
  >("all");
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState<string>("");
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [allTables, setAllTables] = useState<any[]>([]);
  const [tablesStatus, setTablesStatus] = useState<any[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);

  useEffect(() => {
    fetchReservations();
    fetchAllTables();
  }, []);

  useEffect(() => {
    const mapDate = filterDate || new Date().toLocaleDateString("sv-SE");
    fetchTablesStatus(mapDate);
  }, [filterDate]);

  async function fetchAllTables() {
    try {
      const res = await fetch("/api/reservations/tables");
      if (res.ok) {
        setAllTables(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch tables", err);
    }
  }

  async function fetchTablesStatus(dateStr: string) {
    if (!dateStr) return;
    setTablesLoading(true);
    try {
      const res = await fetch(
        `/api/reservations/tables/status?date=${dateStr}`
      );
      if (res.ok) {
        setTablesStatus(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch tables status", err);
    } finally {
      setTablesLoading(false);
    }
  }

  async function handleAssignTable(
    reservationId: number,
    tableId: number | null
  ) {
    try {
      const res = await fetch(
        `/api/reservations/${reservationId}/assign-table`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table_id: tableId }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        fetchReservations();
        const mapDate = filterDate || new Date().toLocaleDateString("sv-SE");
        fetchTablesStatus(mapDate);
      } else {
        alert(data.error || "Gán bàn thất bại");
      }
    } catch (err) {
      alert("Lỗi kết nối khi gán bàn");
    }
  }

  async function fetchReservations() {
    setLoading(true);
    try {
      const res = await fetch("/api/reservations");
      if (res.ok) {
        setReservations(await res.json());
      }
    } catch {
      console.error("Failed to fetch reservations");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(
    id: number,
    status: "confirmed" | "cancelled"
  ) {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchReservations();
      }
    } catch {
      console.error("Failed to update status");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bạn có chắc muốn xóa lượt đặt bàn này?")) return;
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchReservations();
      }
    } catch {
      console.error("Failed to delete reservation");
    }
  }

  function formatTime(timeStr: string) {
    return timeStr.substring(0, 5);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const filteredReservations = reservations.filter((r) => {
    const matchesFilter = activeFilter === "all" || r.status === activeFilter;
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search);

    let matchesDate = true;
    if (filterDate) {
      const formattedBookingDate = r.booking_date.split("T")[0];
      matchesDate = formattedBookingDate === filterDate;
    }

    return matchesFilter && matchesSearch && matchesDate;
  });

  const pendingCount = reservations.filter(
    (r) => r.status === "pending"
  ).length;
  const confirmedCount = reservations.filter(
    (r) => r.status === "confirmed"
  ).length;
  const cancelledCount = reservations.filter(
    (r) => r.status === "cancelled"
  ).length;

  const filterTabs = [
    {
      key: "all" as const,
      label: "Tất cả",
      count: reservations.length,
      icon: ClipboardList,
    },
    {
      key: "pending" as const,
      label: "Đang chờ",
      count: pendingCount,
      icon: Timer,
      dotColor: "bg-yellow-400",
    },
    {
      key: "confirmed" as const,
      label: "Đã xác nhận",
      count: confirmedCount,
      icon: UserCheck,
      dotColor: "bg-emerald-400",
    },
    {
      key: "cancelled" as const,
      label: "Đã hủy",
      count: cancelledCount,
      icon: XCircle,
      dotColor: "bg-rose-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-amber-500/8 to-orange-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-gradient-to-br from-rose-500/6 to-pink-500/4 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium uppercase tracking-widest text-amber-400/80">
                Quản lý đặt bàn
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Danh sách đặt bàn
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-white/40">
              Xem, duyệt các yêu cầu đặt bàn và sắp xếp bàn ăn cho khách hàng
              tại L&apos;Ambiance Café.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 backdrop-blur-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                viewMode === "list"
                  ? "bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20"
                  : "text-stone-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Danh sách
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                viewMode === "map"
                  ? "bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20"
                  : "text-stone-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              Sơ đồ bàn
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Filter Tabs */}
        {viewMode === "list" ? (
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`group flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  activeFilter === tab.key
                    ? "bg-white/10 text-white border border-white/15 shadow-lg shadow-black/10"
                    : "text-stone-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                {tab.dotColor && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${tab.dotColor} ${activeFilter === tab.key ? "opacity-100" : "opacity-50"}`}
                  />
                )}
                {tab.label}
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    activeFilter === tab.key
                      ? "bg-white/10 text-white"
                      : "bg-white/5 text-stone-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400/80">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">
              Xem trạng thái bàn trống
            </span>
          </div>
        )}

        {/* Date & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Date picker */}
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500">
              <Calendar className="h-4 w-4" />
            </span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-9 text-sm text-stone-200 backdrop-blur-sm transition-all placeholder:text-stone-600 focus:border-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-500/20 sm:w-52 [color-scheme:dark]"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500 hover:text-white cursor-pointer"
                title="Xóa lọc ngày"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search */}
          {viewMode === "list" && (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Tìm theo tên hoặc SĐT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-4 text-sm text-stone-200 backdrop-blur-sm transition-all placeholder:text-stone-600 focus:border-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-500/20 sm:w-64"
              />
            </div>
          )}
        </div>
      </div>

      {/* ===== LIST VIEW ===== */}
      {viewMode === "list" &&
        (loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <p className="text-xs text-stone-500">Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-24">
            <Calendar className="mb-4 h-14 w-14 text-stone-700" />
            <p className="text-sm font-medium text-stone-500">
              Không tìm thấy yêu cầu đặt bàn nào
            </p>
            <p className="mt-1 text-xs text-stone-600">
              Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredReservations.map((r) => (
              <div
                key={r.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.05] hover:shadow-xl hover:shadow-black/10 ${
                  r.status === "confirmed"
                    ? "border-emerald-500/15 hover:border-emerald-500/30"
                    : r.status === "cancelled"
                      ? "border-rose-500/10 opacity-60 hover:opacity-80"
                      : "border-amber-500/15 hover:border-amber-500/30"
                }`}
              >
                {/* Status accent line */}
                <div
                  className={`absolute left-0 top-0 h-full w-[3px] ${
                    r.status === "confirmed"
                      ? "bg-gradient-to-b from-emerald-400 to-emerald-600"
                      : r.status === "cancelled"
                        ? "bg-gradient-to-b from-rose-400 to-rose-600"
                        : "bg-gradient-to-b from-amber-400 to-orange-500"
                  }`}
                />

                <div className="p-6 pl-7">
                  {/* Header: User info + Status badge */}
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-sans text-sm font-bold uppercase ${
                          r.status === "confirmed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                            : r.status === "cancelled"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/15"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                        }`}
                      >
                        {r.name.substring(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {r.name}
                        </h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                          <Phone className="h-3 w-3" />
                          {r.phone}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold ${
                        r.status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : r.status === "cancelled"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          r.status === "confirmed"
                            ? "bg-emerald-400"
                            : r.status === "cancelled"
                              ? "bg-rose-400"
                              : "bg-amber-400 animate-pulse"
                        }`}
                      />
                      {r.status === "confirmed"
                        ? "Đã xác nhận"
                        : r.status === "cancelled"
                          ? "Đã hủy"
                          : "Chờ xác nhận"}
                    </span>
                  </div>

                  {/* Booking details - 3 columns */}
                  <div className="mb-5 grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3.5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                        <Calendar className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          Ngày
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-stone-200">
                          {formatDate(r.booking_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3.5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                        <Clock className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          Giờ
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-stone-200">
                          {formatTime(r.booking_time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3.5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
                        <Users className="h-3.5 w-3.5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          Khách
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-stone-200">
                          {r.guests} người
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Table Assignment (confirmed bookings) */}
                  {r.status === "confirmed" && (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="h-3.5 w-3.5 text-stone-500" />
                        <span className="text-stone-500">Bàn:</span>
                        <span className="font-semibold text-amber-400">
                          {r.table_number
                            ? `Bàn ${r.table_number}`
                            : "Chưa gán"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-600">
                          Đổi bàn:
                        </span>
                        <select
                          value={r.table_id || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleAssignTable(
                              r.id,
                              val ? parseInt(val) : null
                            );
                          }}
                          className="rounded-lg border border-white/[0.08] bg-white/[0.05] px-2.5 py-1.5 font-sans text-[11px] text-stone-300 focus:border-amber-500/40 focus:outline-none"
                        >
                          <option
                            value=""
                            className="bg-stone-900 text-stone-400"
                          >
                            Chọn bàn trống...
                          </option>
                          {allTables.map((t) => (
                            <option
                              key={t.id}
                              value={t.id}
                              disabled={t.capacity < r.guests}
                              className="bg-stone-900 text-stone-200 disabled:opacity-40"
                            >
                              Bàn {t.table_number} ({t.capacity} chỗ){" "}
                              {t.capacity < r.guests ? "- Thiếu chỗ" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {r.notes && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-stone-400">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-600" />
                      <p className="flex-1 italic">{r.notes}</p>
                    </div>
                  )}
                </div>

                {/* Footer: Timestamp + Actions */}
                <div className="flex items-center justify-between border-t border-white/[0.05] px-6 py-4 pl-7">
                  <span className="flex items-center gap-1.5 text-[10px] text-stone-600">
                    <Clock className="h-3 w-3" />
                    Đặt lúc:{" "}
                    {new Date(r.created_at).toLocaleString("vi-VN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    {r.status === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            handleUpdateStatus(r.id, "confirmed")
                          }
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/30 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Xác nhận
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateStatus(r.id, "cancelled")
                          }
                          className="flex items-center gap-1.5 rounded-lg border border-rose-500/15 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-400 transition-all hover:bg-rose-500/20 hover:border-rose-500/30 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          Từ chối
                        </button>
                      </>
                    )}
                    {user?.role === "admin" && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-white/[0.04] text-stone-500 transition-all hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
                        title="Xóa đặt bàn"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* ===== MAP VIEW ===== */}
      {viewMode === "map" && (
        <div className="space-y-5">
          {/* Map header card */}
          <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="mb-1 text-lg font-bold text-white">
                Sơ đồ bàn ngày{" "}
                {filterDate
                  ? formatDate(filterDate)
                  : new Date().toLocaleDateString("vi-VN")}
              </h2>
              <p className="text-xs leading-relaxed text-stone-500">
                Hiển thị trạng thái các bàn ăn. Bàn xanh lá là bàn trống, bàn
                cam là bàn đã được gán khách.
              </p>
            </div>
            {/* Legend */}
            <div className="flex gap-5 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-md border border-emerald-500/30 bg-emerald-500/15" />
                <span className="text-stone-400">Bàn trống</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-md border border-amber-500/30 bg-amber-500/15" />
                <span className="text-stone-400">Đã đặt</span>
              </div>
            </div>
          </div>

          {tablesLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <p className="text-xs text-stone-500">
                  Đang tải sơ đồ bàn...
                </p>
              </div>
            </div>
          ) : tablesStatus.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-24">
              <MapPin className="mb-4 h-14 w-14 text-stone-700" />
              <p className="text-sm font-medium text-stone-500">
                Không tìm thấy thông tin bàn ăn
              </p>
              <p className="mt-1 text-xs text-stone-600">
                Vui lòng kiểm tra cấu hình bàn ăn trong hệ thống
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {tablesStatus.map((t) => {
                const isOccupied = !!t.reservation_id;
                return (
                  <div
                    key={t.id}
                    className={`group relative flex min-h-[160px] flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
                      isOccupied
                        ? "border-amber-500/20 bg-amber-500/[0.03] hover:border-amber-500/35 hover:bg-amber-500/[0.06]"
                        : "border-emerald-500/15 bg-emerald-500/[0.02] hover:border-emerald-500/30 hover:bg-emerald-500/[0.05]"
                    }`}
                  >
                    {/* Accent dot */}
                    <div
                      className={`absolute right-3 top-3 h-2 w-2 rounded-full ${isOccupied ? "bg-amber-400" : "bg-emerald-400"}`}
                    />

                    <div>
                      <div className="mb-3 flex items-start justify-between">
                        <span className="text-lg font-bold text-white">
                          {t.table_number}
                        </span>
                      </div>

                      <span className="inline-block rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-stone-400">
                        {t.capacity} chỗ
                      </span>

                      {isOccupied ? (
                        <div className="mt-3 space-y-1">
                          <p className="truncate text-xs font-semibold text-stone-200">
                            {t.guest_name}
                          </p>
                          <p className="truncate text-[10px] text-stone-500">
                            {t.guest_phone}
                          </p>
                          <p className="flex items-center gap-1 text-[10px] text-stone-600">
                            <Clock className="h-2.5 w-2.5" />
                            {t.guests} khách &bull;{" "}
                            {formatTime(t.booking_time)}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <p className="text-[10px] italic text-stone-600">
                            Bàn trống
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Unassign button */}
                    {isOccupied && (
                      <div className="mt-3 border-t border-white/[0.05] pt-2">
                        <button
                          onClick={() =>
                            handleAssignTable(t.reservation_id, null)
                          }
                          className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 transition-colors hover:text-rose-300 cursor-pointer"
                          title="Hủy gán bàn"
                        >
                          <X className="h-3 w-3" />
                          Hủy gán
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
