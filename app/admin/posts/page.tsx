"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/admin/AuthProvider";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export default function PostsManagement() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch("/api/posts");
      if (res.ok) {
        setPosts(await res.json());
      }
    } catch {
      console.error("Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    try {
      await fetch(`/api/posts/${id}`, { method: "DELETE" });
      fetchPosts();
    } catch {
      console.error("Failed to delete");
    }
  }

  async function handleTogglePublish(post: Post) {
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !post.is_published }),
      });
      fetchPosts();
    } catch {
      console.error("Failed to toggle");
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
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Bài viết</h1>
          <p className="text-white/50 text-sm">
            Quản lý blog và tin tức
          </p>
        </div>
        {user?.role === "admin" && (
          <Link
            href="/admin/posts/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Viết bài mới
          </Link>
        )}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white/5 rounded-2xl border border-white/10 text-center py-20 text-white/40">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Chưa có bài viết nào</p>
            <Link
              href="/admin/posts/new"
              className="inline-flex items-center gap-2 mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Tạo bài viết đầu tiên
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 hover:bg-white/8 transition-all"
            >
              <div className="flex items-start gap-5">
                {/* Cover Image */}
                {post.cover_image && (
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-24 h-16 rounded-lg object-cover shrink-0"
                  />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-white font-semibold text-base truncate">
                      {post.title}
                    </h3>
                    <span
                      className={`shrink-0 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        post.is_published
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-yellow-500/15 text-yellow-400"
                      }`}
                    >
                      {post.is_published ? "Đã đăng" : "Nháp"}
                    </span>
                  </div>
                  {post.excerpt && (
                    <p className="text-sm text-white/40 line-clamp-1 mb-2">
                      {post.excerpt}
                    </p>
                  )}
                  <p className="text-xs text-white/30">
                    Slug: /{post.slug} · Tạo: {formatDate(post.created_at)}
                  </p>
                </div>

                {/* Actions */}
                {user?.role === "admin" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTogglePublish(post)}
                      className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center transition-colors ${
                        post.is_published
                          ? "hover:bg-yellow-500/20 text-white/40 hover:text-yellow-400"
                          : "hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400"
                      }`}
                      title={post.is_published ? "Chuyển về nháp" : "Đăng bài"}
                    >
                      {post.is_published ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-white/40 hover:text-blue-400 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(post.id)}
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
