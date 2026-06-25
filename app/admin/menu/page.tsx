"use client";
import React, { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Coffee,
  Flower,
  Cake,
  UtensilsCrossed,
  Search,
} from "lucide-react";
import Modal from "@/components/admin/Modal";

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: string;
  description: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

const categories = [
  { id: "all", name: "Tất cả", icon: Coffee },
  { id: "coffee", name: "Cà phê", icon: Coffee },
  { id: "tea", name: "Trà", icon: Flower },
  { id: "pastry", name: "Bánh ngọt", icon: Cake },
  { id: "dish", name: "Món ăn", icon: UtensilsCrossed },
];

const emptyForm = {
  name: "",
  category: "coffee",
  price: "",
  description: "",
  image_url: "",
  sort_order: 0,
};

export default function MenuManagement() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [activeCategory]);

  async function fetchItems() {
    setLoading(true);
    try {
      const url =
        activeCategory === "all"
          ? "/api/menu"
          : `/api/menu?category=${activeCategory}`;
      const res = await fetch(url);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch {
      console.error("Failed to fetch menu items");
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingItem(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(item: MenuItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description,
      image_url: item.image_url,
      sort_order: item.sort_order,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingItem) {
        await fetch(`/api/menu/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      fetchItems();
    } catch {
      console.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bạn có chắc muốn xóa món này?")) return;
    try {
      await fetch(`/api/menu/${id}`, { method: "DELETE" });
      fetchItems();
    } catch {
      console.error("Failed to delete");
    }
  }

  async function handleToggleActive(item: MenuItem) {
    try {
      await fetch(`/api/menu/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      fetchItems();
    } catch {
      console.error("Failed to toggle");
    }
  }

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Quản lý Menu</h1>
          <p className="text-white/50 text-sm">
            Thêm, sửa, xóa các món trong menu
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm món mới
        </button>
      </div>

      {/* Category Tabs + Search */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === cat.id
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-white/5 text-white/60 hover:bg-white/10 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.name}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 w-56"
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-white/40">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Chưa có món nào</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Món
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Giá
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">
                          {item.name}
                        </p>
                        <p className="text-xs text-white/40 line-clamp-1 max-w-xs">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-white/60 bg-white/10 px-2.5 py-1 rounded-lg capitalize">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-amber-400 font-semibold">
                    {item.price}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                        item.is_active
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {item.is_active ? "Hiển thị" : "Ẩn"}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-white/40 hover:text-blue-400 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? "Sửa món" : "Thêm món mới"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">
              Tên món *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
              placeholder="VD: Cà phê sữa đá"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">
                Danh mục *
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50"
              >
                <option value="coffee" className="bg-stone-900 text-white">Cà phê</option>
                <option value="tea" className="bg-stone-900 text-white">Trà</option>
                <option value="pastry" className="bg-stone-900 text-white">Bánh ngọt</option>
                <option value="dish" className="bg-stone-900 text-white">Món ăn</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">
                Giá *
              </label>
              <input
                type="text"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                placeholder="VD: 45.000đ"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">
              Mô tả
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 resize-none"
              placeholder="Mô tả ngắn về món..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">
              URL Hình ảnh
            </label>
            <input
              type="text"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 mb-1.5">
              Thứ tự sắp xếp
            </label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) =>
                setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })
              }
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-sm font-semibold rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.price}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingItem ? "Cập nhật" : "Thêm món"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
