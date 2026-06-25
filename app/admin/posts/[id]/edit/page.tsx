"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Eye } from "lucide-react";
import Link from "next/link";

export default function EditPost({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    cover_image: "",
    is_published: false,
  });

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/posts/${id}`);
        if (res.ok) {
          const data = await res.json();
          setForm({
            title: data.title || "",
            slug: data.slug || "",
            content: data.content || "",
            excerpt: data.excerpt || "",
            cover_image: data.cover_image || "",
            is_published: data.is_published || false,
          });
        }
      } catch {
        console.error("Failed to fetch post");
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [id]);

  async function handleSave() {
    if (!form.title || !form.slug) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push("/admin/posts");
      }
    } catch {
      console.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/posts"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Sửa bài viết</h1>
            <p className="text-white/40 text-sm">Chỉnh sửa nội dung bài viết</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setForm({ ...form, is_published: !form.is_published })
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              form.is_published
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {form.is_published ? "Đã đăng" : "Nháp"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Cập nhật
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">
              Tiêu đề *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">
              Slug (URL)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-sm">/blog/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">
              Tóm tắt
            </label>
            <input
              type="text"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">
              Ảnh bìa (URL)
            </label>
            <input
              type="text"
              value={form.cover_image}
              onChange={(e) =>
                setForm({ ...form, cover_image: e.target.value })
              }
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
            />
            {form.cover_image && (
              <img
                src={form.cover_image}
                alt="Preview"
                className="mt-3 w-full h-48 object-cover rounded-xl border border-white/10"
              />
            )}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <label className="block text-xs font-semibold text-white/60 mb-1.5">
            Nội dung
          </label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={16}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
