"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import {
  Star,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

interface Review {
  id: number;
  name: string;
  role: string;
  avatar_url: string;
  rating: number;
  comment: string;
  is_visible: boolean;
  created_at: string;
}

export default function ReviewsManagement() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews");
      if (res.ok) {
        setReviews(await res.json());
      }
    } catch {
      console.error("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleVisible(review: Review) {
    try {
      await fetch(`/api/reviews/${review.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: !review.is_visible }),
      });
      fetchReviews();
    } catch {
      console.error("Failed to toggle visibility");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bạn có chắc muốn xóa đánh giá này?")) return;
    try {
      await fetch(`/api/reviews/${id}`, { method: "DELETE" });
      fetchReviews();
    } catch {
      console.error("Failed to delete");
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Đánh giá</h1>
        <p className="text-white/50 text-sm">
          Quản lý các đánh giá từ khách hàng
        </p>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white/5 rounded-2xl border border-white/10 text-center py-20 text-white/40">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Chưa có đánh giá nào</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white/5 backdrop-blur-sm rounded-2xl border p-6 transition-all ${
                review.is_visible
                  ? "border-white/10"
                  : "border-white/5 opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="shrink-0">
                  {review.avatar_url ? (
                    <img
                      src={review.avatar_url}
                      alt={review.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-lg font-bold">
                      {review.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-white font-semibold text-sm">
                      {review.name}
                    </h3>
                    {review.role && (
                      <span className="text-xs text-white/40">
                        {review.role}
                      </span>
                    )}
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < review.rating
                            ? "text-amber-400 fill-amber-400"
                            : "text-white/20"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-sm text-white/60 leading-relaxed mb-2">
                    {review.comment}
                  </p>

                  <p className="text-xs text-white/30">
                    {formatDate(review.created_at)}
                  </p>
                </div>

                {/* Actions */}
                {user?.role === "admin" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleVisible(review)}
                      className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-colors ${
                        review.is_visible
                          ? "hover:bg-yellow-500/20 text-white/40 hover:text-yellow-400"
                          : "hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400"
                      }`}
                      title={review.is_visible ? "Ẩn đánh giá" : "Hiện đánh giá"}
                    >
                      {review.is_visible ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
