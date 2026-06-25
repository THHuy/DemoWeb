"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";

type GalleryImage = {
  id: number;
  src: string;
  alt: string;
  category: "không gian" | "đồ uống" | "món ăn" | "check-in";
  spanClass: string;
};

const galleryImages: GalleryImage[] = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=800&auto=format&fit=crop",
    alt: "Không gian tràn ngập nắng mai",
    category: "không gian",
    spanClass: "md:col-span-2 md:row-span-2",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=800&auto=format&fit=crop",
    alt: "Nghệ thuật Espresso Latte",
    category: "đồ uống",
    spanClass: "md:col-span-1 md:row-span-1",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1498804103079-a6351b050096?q=80&w=800&auto=format&fit=crop",
    alt: "Góc check-in bên cửa sổ",
    category: "check-in",
    spanClass: "md:col-span-1 md:row-span-2",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=800&auto=format&fit=crop",
    alt: "Bánh Waffle dâu tây tươi",
    category: "món ăn",
    spanClass: "md:col-span-1 md:row-span-1",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop",
    alt: "Thưởng trà chiều cùng tri kỷ",
    category: "đồ uống",
    spanClass: "md:col-span-1 md:row-span-1",
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1463797221720-6b07e6426c24?q=80&w=800&auto=format&fit=crop",
    alt: "Khoảng sân vườn rợp bóng cây",
    category: "không gian",
    spanClass: "md:col-span-2 md:row-span-1",
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=800&auto=format&fit=crop",
    alt: "Pha chế Pour Over Specialty",
    category: "đồ uống",
    spanClass: "md:col-span-1 md:row-span-1",
  },
];

export default function Gallery() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIdx !== null) {
      setSelectedIdx(
        selectedIdx === 0 ? galleryImages.length - 1 : selectedIdx - 1
      );
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIdx !== null) {
      setSelectedIdx(
        selectedIdx === galleryImages.length - 1 ? 0 : selectedIdx + 1
      );
    }
  };

  return (
    <section id="gallery" className="py-24 bg-brand-bg">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-sans text-xs font-bold text-secondary uppercase tracking-widest mb-3 block">
            Góc Lưu Giữ Kỷ Niệm
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-black text-brand-dark mb-4">
            Bộ Sưu Tập L'Ambiance
          </h2>
          <p className="font-sans text-brand-text/70 text-base md:text-lg">
            Khám phá những khoảnh khắc đẹp tại quán, từ kiến trúc resort đầy mảng xanh tới nghệ thuật ẩm thực tinh tế.
          </p>
        </div>

        {/* Masonry Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 auto-rows-[220px] gap-4">
          {galleryImages.map((img, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              key={img.id}
              className={`relative group rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg ${img.spanClass}`}
              onClick={() => setSelectedIdx(idx)}
            >
              {/* Image */}
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                loading="lazy"
              />
              
              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-brand-dark/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                <span className="font-sans text-xs font-bold text-accent uppercase tracking-widest mb-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full self-start">
                  {img.category}
                </span>
                <h3 className="font-serif text-lg font-semibold text-brand-bg flex items-center gap-2">
                  <span>{img.alt}</span>
                  <ZoomIn className="w-5 h-5 text-accent shrink-0" />
                </h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedIdx(null)}
            className="fixed inset-0 bg-brand-dark/95 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedIdx(null)}
              className="absolute top-6 right-6 text-brand-bg/75 hover:text-brand-bg transition-colors p-2"
              aria-label="Close lightbox"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Left Control */}
            <button
              onClick={handlePrev}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-brand-bg p-3 rounded-full transition-colors hidden sm:block"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Main Content Area */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl max-h-[80vh] flex flex-col items-center"
            >
              <img
                src={galleryImages[selectedIdx].src}
                alt={galleryImages[selectedIdx].alt}
                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
              <div className="text-center mt-6">
                <span className="font-sans text-xs font-bold text-accent uppercase tracking-widest mb-1.5 inline-block">
                  {galleryImages[selectedIdx].category}
                </span>
                <p className="font-serif text-xl font-medium text-brand-bg">
                  {galleryImages[selectedIdx].alt}
                </p>
              </div>
            </motion.div>

            {/* Right Control */}
            <button
              onClick={handleNext}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-brand-bg p-3 rounded-full transition-colors hidden sm:block"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
