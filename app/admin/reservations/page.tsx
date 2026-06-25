"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import {
  Calendar,
  Clock,
  Users,
  Phone,
  User,
  MessageSquare,
  Check,
  X,
  Trash2,
  Loader2,
  Search,
  CheckCircle,
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
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
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
      const res = await fetch(`/api/reservations/tables/status?date=${dateStr}`);
      if (res.ok) {
        setTablesStatus(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch tables status", err);
    } finally {
      setTablesLoading(false);
    }
  }

  async function handleAssignTable(reservationId: number, tableId: number | null) {
    try {
      const res = await fetch(`/api/reservations/${reservationId}/assign-table`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: tableId }),
      });
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

  async function handleUpdateStatus(id: number, status: "confirmed" | "cancelled") {
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Quản lý Đặt Bàn</h1>
          <p className="text-white/50 text-sm">
            Xem, duyệt các yêu cầu đặt bàn và sắp xếp bàn ăn cho khách
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex p-1 bg-stone-900 border border-white/5 rounded-xl">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-amber-500 text-stone-950 shadow-md"
                : "text-stone-400 hover:text-white"
            }`}
          >
            Danh sách đặt bàn
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === "map"
                ? "bg-amber-500 text-stone-950 shadow-md"
                : "text-stone-400 hover:text-white"
            }`}
          >
            Sơ đồ bàn (Table Map)
          </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-stone-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
        {/* Filters */}
        {viewMode === "list" ? (
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "confirmed", "cancelled"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeFilter === filter
                    ? "bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/10"
                    : "bg-white/5 text-stone-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {filter === "all"
                  ? "Tất cả"
                  : filter === "pending"
                  ? "Đang chờ"
                  : filter === "confirmed"
                  ? "Đã xác nhận"
                  : "Đã hủy"}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-500 py-2">
            Xem danh sách bàn trống
          </div>
        )}

        {/* Date Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full xl:w-auto">
          {/* Date picker */}
          <div className="relative w-full sm:w-56">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 pointer-events-none">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-950/50 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all text-sm font-sans [color-scheme:dark]"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-500 hover:text-white cursor-pointer"
                title="Xóa lọc ngày"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search */}
          {viewMode === "list" && (
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Tìm theo tên hoặc SĐT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-950/50 border border-stone-800 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all text-sm font-sans"
              />
            </div>
          )}
        </div>
      </div>

      {/* List Container */}
      {viewMode === "list" && (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="bg-stone-900/10 rounded-2xl border border-stone-900/50 text-center py-20 text-stone-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-sans">Không tìm thấy yêu cầu đặt bàn nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredReservations.map((r) => (
              <div
                key={r.id}
                className={`bg-stone-900/40 backdrop-blur-xl border rounded-2xl p-6 transition-all flex flex-col justify-between ${
                  r.status === "confirmed"
                    ? "border-emerald-500/20"
                    : r.status === "cancelled"
                    ? "border-rose-500/20 opacity-60"
                    : "border-amber-500/20"
                }`}
              >
                <div>
                  {/* User details and status */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center text-amber-500 text-sm font-bold uppercase font-sans">
                        {r.name.substring(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-base">{r.name}</h3>
                        <p className="text-stone-400 text-xs flex items-center gap-1 mt-0.5 font-sans">
                          <Phone className="w-3.5 h-3.5" />
                          {r.phone}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        r.status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : r.status === "cancelled"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}
                    >
                      {r.status === "confirmed"
                        ? "Đã xác nhận"
                        : r.status === "cancelled"
                        ? "Đã hủy"
                        : "Chờ xác nhận"}
                    </span>
                  </div>

                  {/* Reservation specifications */}
                  <div className="grid grid-cols-3 gap-2 bg-stone-950/40 p-3.5 rounded-xl border border-white/5 mb-4">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Calendar className="w-4 h-4 text-stone-500 mb-1" />
                      <span className="text-[10px] text-stone-500 font-sans uppercase font-semibold">Ngày</span>
                      <span className="text-xs text-stone-200 font-sans mt-0.5">{formatDate(r.booking_date)}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center border-x border-white/5">
                      <Clock className="w-4 h-4 text-stone-500 mb-1" />
                      <span className="text-[10px] text-stone-500 font-sans uppercase font-semibold">Giờ</span>
                      <span className="text-xs text-stone-200 font-sans mt-0.5">{formatTime(r.booking_time)}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center">
                      <Users className="w-4 h-4 text-stone-500 mb-1" />
                      <span className="text-[10px] text-stone-500 font-sans uppercase font-semibold">Khách</span>
                      <span className="text-xs text-stone-200 font-sans mt-0.5">{r.guests} người</span>
                    </div>
                  </div>

                  {/* Table Assignment (For confirmed bookings) */}
                  {r.status === "confirmed" && (
                    <div className="bg-stone-950/30 border border-white/5 p-3 rounded-xl mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs font-sans">
                        <span className="text-stone-500">Bàn gán: </span>
                        <span className="font-semibold text-amber-500">
                          {r.table_number ? `Bàn ${r.table_number}` : "Chưa gán"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-stone-500 font-sans">Đổi bàn:</span>
                        <select
                          value={r.table_id || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleAssignTable(r.id, val ? parseInt(val) : null);
                          }}
                          className="bg-stone-950 border border-stone-850 text-stone-300 text-[11px] font-sans rounded-lg py-1 px-2 focus:outline-none focus:border-amber-500/50"
                        >
                          <option value="" className="bg-stone-900 text-stone-400">Chọn bàn trống...</option>
                          {allTables.map((t) => (
                            <option
                              key={t.id}
                              value={t.id}
                              disabled={t.capacity < r.guests}
                              className="bg-stone-900 text-stone-200 disabled:opacity-40"
                            >
                              Bàn {t.table_number} ({t.capacity} chỗ) {t.capacity < r.guests ? "- Thiếu chỗ" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {r.notes && (
                    <div className="flex items-start gap-2 bg-stone-950/20 p-3 rounded-lg border border-white/5 text-xs text-stone-400 mb-4 font-sans leading-relaxed">
                      <MessageSquare className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                      <p className="flex-1 italic">{r.notes}</p>
                    </div>
                  )}
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                  <span className="text-[10px] text-stone-600 font-sans">
                    Đặt lúc: {new Date(r.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Approve */}
                    {r.status === "pending" && (
                      <button
                        onClick={() => handleUpdateStatus(r.id, "confirmed")}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-500/10"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Xác nhận
                      </button>
                    )}
                    {/* Cancel */}
                    {r.status === "pending" && (
                      <button
                        onClick={() => handleUpdateStatus(r.id, "cancelled")}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-500/10"
                      >
                        <X className="w-3.5 h-3.5" />
                        Hủy bàn
                      </button>
                    )}
                    {/* Delete (Admin only) */}
                    {user?.role === "admin" && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/25 text-stone-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Xóa đặt bàn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Map Container */}
      {viewMode === "map" && (
        <div className="space-y-6">
          <div className="bg-stone-900/40 p-5 rounded-2xl border border-white/5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">
                Sơ đồ bàn ngày {filterDate ? formatDate(filterDate) : new Date().toLocaleDateString("vi-VN")}
              </h2>
              <p className="text-xs text-stone-400">
                Hiển thị trạng thái các bàn ăn. Màu xanh lá đại diện cho bàn trống, màu cam là bàn đã được gán khách đặt.
              </p>
            </div>
            {/* Legend */}
            <div className="flex gap-4 text-xs font-sans">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-md bg-emerald-500/10 border border-emerald-500/20" />
                <span className="text-stone-400">Bàn trống</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-md bg-amber-500/10 border border-amber-500/20" />
                <span className="text-stone-400">Đã đặt</span>
              </div>
            </div>
          </div>

          {tablesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : tablesStatus.length === 0 ? (
            <div className="bg-stone-900/10 rounded-2xl border border-stone-900/50 text-center py-20 text-stone-500 font-sans">
              Không tìm thấy thông tin bàn ăn. Vui lòng bấm &quot;Khởi tạo DB&quot; ở Dashboard để đồng bộ danh sách bàn ăn.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tablesStatus.map((t) => {
                const isOccupied = !!t.reservation_id;
                return (
                  <div
                    key={t.id}
                    className={`border rounded-2xl p-4 flex flex-col justify-between transition-all min-h-[140px] ${
                      isOccupied
                        ? "bg-amber-500/[0.02] border-amber-500/20 shadow-lg shadow-amber-500/2"
                        : "bg-emerald-500/[0.02] border-emerald-500/10 hover:border-emerald-500/25"
                    }`}
                  >
                    <div>
                      {/* Table Header */}
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-base font-bold text-white font-sans">{t.table_number}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-stone-400 font-sans">
                          {t.capacity} chỗ
                        </span>
                      </div>

                      {/* Status details */}
                      {isOccupied ? (
                        <div className="space-y-1.5 text-left">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/10 rounded-full">
                            Đã đặt
                          </span>
                          <p className="text-xs font-semibold text-stone-200 mt-2 truncate">{t.guest_name}</p>
                          <p className="text-[10px] text-stone-400 truncate">{t.guest_phone}</p>
                          <p className="text-[9px] text-stone-500 flex items-center gap-1 font-sans mt-1">
                            <Clock className="w-3 h-3 text-stone-600" />
                            {t.guests} khách &bull; {formatTime(t.booking_time)}
                          </p>
                        </div>
                      ) : (
                        <div className="text-left space-y-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded-full">
                            Trống
                          </span>
                          <p className="text-[10px] text-stone-500 italic mt-3 font-sans">Trống</p>
                        </div>
                      )}
                    </div>

                    {/* Unassign button if occupied */}
                    {isOccupied && (
                      <div className="border-t border-white/5 pt-2 mt-3 flex justify-end">
                        <button
                          onClick={() => handleAssignTable(t.reservation_id, null)}
                          className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                          title="Hủy gán bàn"
                        >
                          <X className="w-3 h-3" />
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
