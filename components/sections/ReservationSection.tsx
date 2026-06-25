"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Users, Phone, User, MessageSquare, Loader2, Check } from "lucide-react";

export default function ReservationSection() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState("2");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !date || !time || !guests) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc (*).");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          booking_date: date,
          booking_time: time,
          guests,
          notes,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        // Reset form
        setName("");
        setPhone("");
        setDate("");
        setTime("");
        setGuests("2");
        setNotes("");
      } else {
        setError(data.error || "Có lỗi xảy ra khi đặt bàn. Vui lòng thử lại.");
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="booking" className="relative py-24 bg-[#080708] overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(212,175,55,0.05),rgba(0,0,0,0))] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-amber-500/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        {/* Title */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xs font-semibold tracking-[0.25em] text-amber-500/80 uppercase font-sans"
          >
            Trải nghiệm ẩm thực tinh tế
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl font-serif font-light text-stone-100 mt-3 tracking-wide"
          >
            Đặt Bàn Hẹn Trước
          </motion.h2>
          <div className="w-16 h-[1px] bg-amber-500/30 mx-auto mt-6" />
        </div>

        {/* Art Frame Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative p-[2px] rounded-2xl overflow-hidden bg-gradient-to-b from-amber-500/20 via-stone-800/40 to-stone-900 shadow-2xl"
        >
          {/* Subtle Outer Border Line */}
          <div className="absolute inset-[3px] border border-amber-500/10 rounded-[14px] pointer-events-none" />

          {/* Frame Corners (Art Design Element) */}
          <div className="absolute top-[8px] left-[8px] w-4 h-4 border-t-2 border-l-2 border-amber-500/50 pointer-events-none" />
          <div className="absolute top-[8px] right-[8px] w-4 h-4 border-t-2 border-r-2 border-amber-500/50 pointer-events-none" />
          <div className="absolute bottom-[8px] left-[8px] w-4 h-4 border-b-2 border-l-2 border-amber-500/50 pointer-events-none" />
          <div className="absolute bottom-[8px] right-[8px] w-4 h-4 border-b-2 border-r-2 border-amber-500/50 pointer-events-none" />

          {/* Form Content Wrapper */}
          <div className="relative bg-stone-950/90 rounded-[14px] p-8 md:p-12 backdrop-blur-xl">
            <AnimatePresence mode="wait">
              {!success ? (
                <motion.form
                  key="booking-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  {/* Form Error */}
                  {error && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-sans">
                      {error}
                    </div>
                  )}

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase font-sans">
                        Tên của bạn *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-stone-600">
                          <User className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          className="w-full pl-11 pr-4 py-3 bg-stone-900/40 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans text-sm"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase font-sans">
                        Số điện thoại *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-stone-600">
                          <Phone className="w-4 h-4" />
                        </span>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ví dụ: 0901234567"
                          className="w-full pl-11 pr-4 py-3 bg-stone-900/40 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans text-sm"
                        />
                      </div>
                    </div>

                    {/* Booking Date */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase font-sans">
                        Ngày đặt *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-stone-600">
                          <Calendar className="w-4 h-4" />
                        </span>
                        <input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-stone-900/40 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans text-sm [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    {/* Booking Time */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase font-sans">
                        Giờ đặt *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-stone-600">
                          <Clock className="w-4 h-4" />
                        </span>
                        <input
                          type="time"
                          required
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-stone-900/40 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans text-sm [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    {/* Guests count */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase font-sans">
                        Số lượng khách *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-stone-600">
                          <Users className="w-4 h-4" />
                        </span>
                        <select
                          value={guests}
                          onChange={(e) => setGuests(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-stone-900/40 border border-stone-800 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans text-sm appearance-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <option key={num} value={num} className="bg-stone-900 text-stone-200">
                              {num} người
                            </option>
                          ))}
                          <option value="11" className="bg-stone-900 text-stone-200">Hơn 10 người (Liên hệ trực tiếp)</option>
                        </select>
                      </div>
                    </div>

                    {/* Special requests */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-semibold text-stone-400 tracking-wider uppercase font-sans">
                        Yêu cầu đặc biệt (Không bắt buộc)
                      </label>
                      <div className="relative">
                        <span className="absolute top-3 left-4 text-stone-600">
                          <MessageSquare className="w-4 h-4" />
                        </span>
                        <textarea
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Ví dụ: Cần bàn hút thuốc, tổ chức tiệc sinh nhật..."
                          className="w-full pl-11 pr-4 py-3 bg-stone-900/40 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit button */}
                  <div className="text-center pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3.5 bg-gradient-to-r from-amber-500/90 to-amber-600 text-stone-950 font-semibold tracking-wider rounded-xl hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans text-sm uppercase shadow-lg shadow-amber-500/10 cursor-pointer"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang gửi yêu cầu...</span>
                        </div>
                      ) : (
                        "Xác nhận đặt bàn"
                      )}
                    </motion.button>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="booking-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-serif text-stone-100 font-light mb-3">
                    Đã Gửi Yêu Cầu Thành Công!
                  </h3>
                  <p className="text-stone-400 text-sm max-w-md mx-auto leading-relaxed font-sans mb-8">
                    Cảm ơn bạn đã lựa chọn L&apos;Ambiance Café. Nhân viên của chúng tôi sẽ liên hệ lại với bạn qua số điện thoại để xác nhận thông tin đặt bàn trong thời gian sớm nhất.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSuccess(false)}
                    className="px-6 py-2.5 bg-stone-900 border border-amber-500/20 hover:border-amber-500/40 text-amber-500 text-sm rounded-xl transition-all cursor-pointer font-sans"
                  >
                    Đặt thêm bàn khác
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
