"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, Flower, Cake, UtensilsCrossed } from "lucide-react";

type MenuItem = {
  id: string | number;
  name: string;
  category: "coffee" | "tea" | "pastry" | "dish";
  price: string;
  description: string;
  image: string;
};

const staticMenuItems: MenuItem[] = [
  // Coffee
  {
    id: "c1",
    name: "L'Ambiance Egg Coffee",
    category: "coffee",
    price: "69.000đ",
    description: "Cà phê trứng béo ngậy truyền thống kết hợp hạt Arabica cao cấp Cầu Đất rang xay mộc.",
    image: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "c2",
    name: "Cold Brew Tonic Orange",
    category: "coffee",
    price: "75.000đ",
    description: "Cà phê ủ lạnh 16 tiếng mát lành kết hợp nước cam tươi và tonic sảng khoái.",
    image: "https://images.unsplash.com/photo-1513530534585-c7b1394c6d51?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "c3",
    name: "Coconut Latte",
    category: "coffee",
    price: "65.000đ",
    description: "Espresso đậm vị hòa cùng sữa cốt dừa béo ngậy xay mịn cùng đá bào mát lạnh.",
    image: "https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?q=80&w=600&auto=format&fit=crop",
  },
  // Tea
  {
    id: "t1",
    name: "Trà Đào Cam Sả",
    category: "tea",
    price: "59.000đ",
    description: "Trà đen đậm đà kết hợp đào ngâm giòn ngọt, cam tươi ngọt thanh và hương sả nồng nàn.",
    image: "https://images.unsplash.com/photo-1497534446932-c925b458314e?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "t2",
    name: "Trà Lài Vải Nha Đam",
    category: "tea",
    price: "62.000đ",
    description: "Hương hoa lài thanh tao hòa quyện vải thiều mọng nước và nha đam giòn sần sật.",
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=600&auto=format&fit=crop",
  },
  // Pastry
  {
    id: "p1",
    name: "Tiramisu Classic",
    category: "pastry",
    price: "55.000đ",
    description: "Bánh bông lan mềm xốp thấm đẫm espresso, rượu rum nhẹ và lớp kem Mascarpone béo ngậy.",
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "p2",
    name: "Croissant Bơ Pháp",
    category: "pastry",
    price: "45.000đ",
    description: "Bánh sừng bò ngập vị bơ thơm lừng, nhiều lớp xếp tầng vỏ giòn xốp rụm chuẩn vị Pháp.",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=600&auto=format&fit=crop",
  },
  // Dish
  {
    id: "d1",
    name: "English Breakfast",
    category: "dish",
    price: "110.000đ",
    description: "Bữa sáng dinh dưỡng trọn vẹn với xúc xích nướng, trứng ốp la, thịt xông khói, đậu sốt và bánh mì.",
    image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "d2",
    name: "Mỳ Ý Sốt Bò Băm",
    category: "dish",
    price: "95.000đ",
    description: "Mỳ Ý sợi dai mềm hoàn hảo phủ sốt bò băm đậm vị, phô mai Parmesan rắc bên trên.",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=600&auto=format&fit=crop",
  },
];

const categories = [
  { id: "all", name: "Tất cả", icon: Coffee },
  { id: "coffee", name: "Cà phê đặc trưng", icon: Coffee },
  { id: "tea", name: "Trà trái cây", icon: Flower },
  { id: "pastry", name: "Bánh ngọt", icon: Cake },
  { id: "dish", name: "Món ăn nổi bật", icon: UtensilsCrossed },
];

export default function SignatureMenu() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [items, setItems] = useState<MenuItem[]>(staticMenuItems);

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch("/api/menu?scope=website");
        if (res.ok) {
          const data = await res.json();
          // Filter only active items and map image_url to image
          const activeItems = data
            .filter((item: any) => item.is_active !== false)
            .map((item: any) => ({
              id: item.id,
              name: item.name,
              category: item.category,
              price: item.price,
              description: item.description,
              image: item.image_url || "https://images.unsplash.com/photo-1554118811-1e0d58224f24",
            }));
          if (activeItems.length > 0) {
            setItems(activeItems);
          }
        }
      } catch (err) {
        console.error("Error loading menu from DB, using fallback static items:", err);
      }
    }
    loadMenu();
  }, []);

  const filteredItems =
    activeTab === "all"
      ? items
      : items.filter((item) => item.category === activeTab);

  return (
    <section id="menu" className="py-24 bg-brand-light">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-sans text-xs font-bold text-secondary uppercase tracking-widest mb-3 block">
            Hương Vị Đặc Trưng
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-black text-brand-dark mb-4">
            Menu L'Ambiance
          </h2>
          <p className="font-sans text-brand-text/70 text-base md:text-lg">
            Được tuyển chọn từ nguyên liệu tươi ngon nhất và chế biến bởi những nghệ nhân pha chế tận tâm của chúng tôi.
          </p>
        </div>

        {/* Categories Tab Selector */}
        <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4 mb-16">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 font-sans text-sm font-semibold px-6 py-3 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-brand-bg shadow-md shadow-primary/20 scale-105"
                    : "bg-brand-bg text-brand-text/80 hover:text-primary hover:bg-brand-bg/80 border border-secondary/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Menu Items Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                key={item.id}
                className="bg-brand-bg rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:scale-[1.02] border border-secondary/5 transition-all duration-300 group flex flex-col h-full"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-brand-light">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Price Tag Overlay */}
                  <div className="absolute top-4 right-4 bg-brand-dark/80 backdrop-blur-md text-accent px-4 py-1.5 rounded-full text-sm font-bold border border-white/10">
                    {item.price}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col justify-between flex-grow">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-brand-dark group-hover:text-primary transition-colors mb-2">
                      {item.name}
                    </h3>
                    <p className="font-sans text-sm text-brand-text/75 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  
                  {/* Bottom element */}
                  <div className="mt-6 pt-4 border-t border-secondary/15 flex items-center justify-between">
                    <span className="font-sans text-xs uppercase tracking-widest text-secondary font-bold">
                      {item.category === "coffee" && "Cà phê"}
                      {item.category === "tea" && "Trà thảo mộc"}
                      {item.category === "pastry" && "Bánh ngọt"}
                      {item.category === "dish" && "Món điểm tâm"}
                    </span>
                    <a
                      href="#booking"
                      className="font-sans text-xs font-bold text-primary group-hover:underline flex items-center gap-1"
                    >
                      Đặt bàn thưởng thức &rarr;
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        
      </div>
    </section>
  );
}
