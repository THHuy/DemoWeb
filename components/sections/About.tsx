"use client";
import React from "react";
import { motion, Variants } from "framer-motion";
import { Heart, Landmark, Users } from "lucide-react";

export default function About() {
  const textVariants: Variants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  const imageVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: "easeOut", delay: 0.2 },
    },
  };

  const badgeVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: 0.4 + i * 0.15 },
    }),
  };

  return (
    <section id="about" className="py-24 bg-brand-bg overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          
          {/* Left Text Column */}
          <motion.div
            variants={textVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="lg:col-span-7 flex flex-col justify-center"
          >
            {/* Small Label */}
            <span className="font-sans text-xs font-bold text-secondary uppercase tracking-widest mb-3 block">
              Về L'Ambiance
            </span>
            
            {/* Title */}
            <h2 className="font-serif text-4xl md:text-5xl font-black text-brand-dark leading-tight mb-6">
              Câu chuyện của chúng tôi
            </h2>
            
            {/* Paragraphs */}
            <div className="font-sans text-brand-text/80 text-base md:text-lg leading-relaxed mb-8 space-y-4">
              <p>
                Khởi nguồn từ mong muốn tạo ra một "ốc đảo xanh" thanh bình giữa lòng thành phố nhộn nhịp, L'Ambiance Bistro được xây dựng theo phong cách Resort Café mang đậm hơi thở của thiên nhiên. Chúng tôi kết hợp hài hòa kiến trúc gỗ mộc mạc (Rustic) cùng mảng xanh trù phú của cây cối để mang đến cho bạn cảm giác thư giãn trọn vẹn nhất.
              </p>
              <p>
                Tại L'Ambiance, mỗi tách cà phê được phục vụ không chỉ là một thức uống, mà đó là cả một hành trình nghệ thuật. Từ khâu tuyển chọn những hạt Arabica chất lượng cao vùng Cầu Đất đến khâu rang xay mộc thủ công, chúng tôi gửi gắm tình yêu và sự tỉ mỉ trong từng giọt hương vị.
              </p>
            </div>

            {/* Badges / Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-secondary/20">
              <motion.div
                custom={0}
                variants={badgeVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex items-start gap-3"
              >
                <div className="p-2 bg-secondary/15 rounded-xl text-secondary shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-brand-dark text-sm mb-1">
                    Tận Tâm
                  </h4>
                  <p className="font-sans text-xs text-brand-text/70">
                    Phục vụ bằng tất cả sự chân thành và chu đáo.
                  </p>
                </div>
              </motion.div>

              <motion.div
                custom={1}
                variants={badgeVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex items-start gap-3"
              >
                <div className="p-2 bg-secondary/15 rounded-xl text-secondary shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-brand-dark text-sm mb-1">
                    Kiến Trúc
                  </h4>
                  <p className="font-sans text-xs text-brand-text/70">
                    Không gian mở giao hòa tuyệt đối với thiên nhiên.
                  </p>
                </div>
              </motion.div>

              <motion.div
                custom={2}
                variants={badgeVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex items-start gap-3"
              >
                <div className="p-2 bg-secondary/15 rounded-xl text-secondary shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-brand-dark text-sm mb-1">
                    Kết Nối
                  </h4>
                  <p className="font-sans text-xs text-brand-text/70">
                    Điểm hẹn lý tưởng để lưu giữ những khoảnh khắc đẹp.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Image Column */}
          <motion.div
            variants={imageVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="lg:col-span-5 relative"
          >
            {/* Decorative shape */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-accent/20 to-transparent rounded-[2.5rem] -rotate-3 z-0" />
            
            {/* Primary Image */}
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-4 border-brand-bg z-10 aspect-[3/4] max-h-[500px] lg:max-h-none">
              <img
                src="https://images.unsplash.com/photo-1545048702-79362596cdc9?q=80&w=1200&auto=format&fit=crop"
                alt="L'Ambiance garden cafe setup"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
            
            {/* Floating Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="absolute bottom-8 -left-6 z-20 bg-brand-dark text-brand-bg p-5 rounded-2xl shadow-xl flex items-center gap-4 border border-white/10"
            >
              <span className="font-serif text-4xl font-extrabold text-accent">5+</span>
              <div className="border-l border-white/20 pl-4">
                <p className="font-sans text-xs uppercase tracking-wider text-brand-bg/60">Năm hình thành</p>
                <p className="font-sans text-sm font-semibold text-brand-bg">Phát triển bền vững</p>
              </div>
            </motion.div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
