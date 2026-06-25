"use client";
import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";

type Review = {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  comment: string;
  role: string;
};

const staticReviews: Review[] = [
  {
    id: 1,
    name: "Minh Anh Nguyễn",
    role: "Khách hàng thân thiết",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
    rating: 5,
    comment: "Không gian vô cùng xanh mát và thư giãn đúng kiểu resort. Trà Đào Cam Sả ngọt thanh mát lạnh cực kỳ giải nhiệt. Sẽ ghé lại cùng gia đình thường xuyên!",
  },
  {
    id: 2,
    name: "Thanh Thảo Phạm",
    role: "Local Guide",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop",
    rating: 5,
    comment: "Rất nhiều góc chụp hình đẹp xuất sắc, ánh sáng tự nhiên lên hình rất trong. Cà phê trứng béo ngậy chuẩn vị, không hề tanh chút nào. Rất recommend!",
  },
  {
    id: 3,
    name: "Hoàng Nam Trần",
    role: "Freelance Designer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
    rating: 5,
    comment: "Wifi tốc độ cao cực kỳ ổn định, nhiều ổ cắm tiện lợi ở mọi góc bàn. Cà phê nguyên chất đắng dịu, thơm nồng giúp mình tập trung làm việc hiệu quả cả ngày.",
  },
  {
    id: 4,
    name: "Khánh Linh Vũ",
    role: "Food Blogger",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
    rating: 5,
    comment: "Kiến trúc resort sân vườn mộc mạc cực kỳ ấn tượng, cảm giác như đi du lịch ngắn ngày ngay tại Sài Gòn. Bánh sừng bò bơ Pháp nóng giòn rụm, ngon khó cưỡng.",
  },
  {
    id: 5,
    name: "Tuấn Kiệt Đặng",
    role: "Khách hàng thường xuyên",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop",
    rating: 5,
    comment: "Điểm tâm English Breakfast chuẩn vị, đầy đặn nhiều năng lượng. Đồ uống và đồ ăn bày trí sang trọng tinh tế. Nhân viên lịch sự, giữ xe miễn phí chu đáo.",
  },
];

export default function Reviews() {
  const [reviewsList, setReviewsList] = useState<Review[]>(staticReviews);

  useEffect(() => {
    async function loadReviews() {
      try {
        const res = await fetch("/api/reviews");
        if (res.ok) {
          const data = await res.json();
          const visibleReviews = data
            .filter((r: any) => r.is_visible !== false)
            .map((r: any) => ({
              id: r.id,
              name: r.name,
              role: r.role || "Khách hàng",
              avatar: r.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop",
              rating: r.rating || 5,
              comment: r.comment,
            }));
          if (visibleReviews.length > 0) {
            setReviewsList(visibleReviews);
          }
        }
      } catch (err) {
        console.error("Error loading reviews from DB, using fallback static reviews:", err);
      }
    }
    loadReviews();
  }, []);

  // Duplicate reviews to make the infinite scroll continuous
  const doubledReviews = [...reviewsList, ...reviewsList];

  return (
    <section id="reviews" className="py-24 bg-brand-dark overflow-hidden relative">
      {/* Decorative gradient background glows */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-sans text-xs font-bold text-accent uppercase tracking-widest mb-3 block">
            Ý Kiến Khách Hàng
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-black text-brand-bg mb-4">
            Đánh Giá Trải Nghiệm
          </h2>
          <p className="font-sans text-brand-bg/70 text-base md:text-lg">
            Sự hài lòng của khách hàng là động lực lớn nhất giúp L'Ambiance hoàn thiện mỗi ngày.
          </p>
        </div>
      </div>

      {/* Infinite Horizontal Scrolling Slider */}
      <div className="w-full flex overflow-hidden mask-gradient-horizontal select-none">
        <div className="flex gap-6 animate-infinite-scroll w-max py-4 px-6">
          {doubledReviews.map((rev, idx) => (
            <div
              key={`${rev.id}-${idx}`}
              className="w-[300px] md:w-[380px] shrink-0 glass-dark border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col justify-between"
            >
              {/* Review Comment */}
              <p className="font-sans text-brand-bg/80 text-sm md:text-base leading-relaxed italic mb-6">
                "{rev.comment}"
              </p>

              {/* User Metadata */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <img
                    src={rev.avatar}
                    alt={rev.name}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-accent/20"
                    loading="lazy"
                  />
                  <div>
                    <h4 className="font-sans font-bold text-brand-bg text-sm md:text-base">
                      {rev.name}
                    </h4>
                    <p className="font-sans text-xs text-brand-bg/60">
                      {rev.role}
                    </p>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex gap-0.5 text-accent">
                  {Array.from({ length: rev.rating }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
