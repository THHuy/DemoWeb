"use client";
import React from "react";
import { motion, Variants } from "framer-motion";
import { Leaf, Coffee, Wifi, Camera } from "lucide-react";

export default function Experience() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  return (
    <section id="experience" className="py-24 bg-brand-light">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-sans text-xs font-bold text-secondary uppercase tracking-widest mb-3 block">
            Trải Nghiệm Trọn Vẹn
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-black text-brand-dark mb-4">
            Giá Trị Khác Biệt
          </h2>
          <p className="font-sans text-brand-text/70 text-base md:text-lg">
            Chúng tôi chăm chút tỉ mỉ cho từng góc nhỏ và dịch vụ nhằm mang lại sự hài lòng cao nhất cho bạn.
          </p>
        </div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px] md:auto-rows-[200px]"
        >
          {/* Card 1: Không gian xanh - Large span */}
          <motion.div
            variants={cardVariants}
            className="md:col-span-2 md:row-span-2 relative rounded-3xl overflow-hidden shadow-md group border border-secondary/5"
          >
            {/* Background Image */}
            <img
              src="https://images.unsplash.com/photo-1545048702-79362596cdc9?q=80&w=1000&auto=format&fit=crop"
              alt="Không gian xanh"
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent" />
            
            {/* Content Overlay */}
            <div className="absolute inset-0 p-8 flex flex-col justify-end text-brand-bg">
              <div className="w-12 h-12 rounded-2xl bg-accent/20 backdrop-blur-md flex items-center justify-center text-accent mb-4 border border-white/10">
                <Leaf className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl md:text-3xl font-bold mb-2">
                Không Gian Sân Vườn Xanh Mát
              </h3>
              <p className="font-sans text-brand-bg/80 text-sm md:text-base max-w-xl font-light">
                Được bao phủ bởi những tầng cây xanh rộng mở như một resort thu nhỏ, mang lại không khí trong lành, sảng khoái tối đa để bạn trút bỏ mọi muộn phiền thường nhật.
              </p>
            </div>
          </motion.div>

          {/* Card 2: Cà phê rang xay nguyên chất */}
          <motion.div
            variants={cardVariants}
            className="md:col-span-1 md:row-span-1 bg-brand-bg rounded-3xl p-8 flex flex-col justify-between shadow-md border border-secondary/5 group hover:shadow-lg transition-shadow duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-brand-dark mb-2">
                Hạt Cà Phê Mộc Rang Xay
              </h3>
              <p className="font-sans text-brand-text/75 text-sm">
                Sử dụng 100% hạt Arabica & Robusta tuyển chọn chất lượng cao vùng Cầu Đất, rang mộc hoàn toàn không pha trộn.
              </p>
            </div>
          </motion.div>

          {/* Card 3: Wifi tốc độ cao */}
          <motion.div
            variants={cardVariants}
            className="md:col-span-1 md:row-span-1 bg-brand-bg rounded-3xl p-8 flex flex-col justify-between shadow-md border border-secondary/5 group hover:shadow-lg transition-shadow duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-brand-dark mb-2">
                Wifi Tốc Độ Cao Ổn Định
              </h3>
              <p className="font-sans text-brand-text/75 text-sm">
                Đường truyền cáp quang băng thông rộng kèm các trạm phát sóng chuyên dụng, hỗ trợ hoàn hảo cho việc học tập và làm việc từ xa.
              </p>
            </div>
          </motion.div>

          {/* Card 4: Nhiều góc check-in - Wide card */}
          <motion.div
            variants={cardVariants}
            className="md:col-span-3 md:row-span-1 relative rounded-3xl overflow-hidden shadow-md group border border-secondary/5"
          >
            {/* Background Image */}
            <img
              src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop"
              alt="Nhiều góc sống ảo"
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/30 to-transparent" />

            {/* Content Overlay */}
            <div className="absolute inset-0 p-8 flex flex-col md:flex-row md:items-center justify-between text-brand-bg gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-accent/20 backdrop-blur-md flex items-center justify-center text-accent border border-white/10 shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-xl md:text-2xl font-bold mb-1">
                    Thiết Kế Đẹp Lên Hình Tự Nhiên
                  </h3>
                  <p className="font-sans text-brand-bg/80 text-sm max-w-xl font-light">
                    Mọi góc tại L'Ambiance đều được bày trí tỉ mỉ từ ánh sáng đến phụ kiện, là địa điểm check-in "Instagram-friendly" đầy phong cách được giới trẻ yêu mến.
                  </p>
                </div>
              </div>
              <a
                href="#gallery"
                className="font-sans text-xs font-bold text-accent uppercase tracking-wider bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full border border-white/15 backdrop-blur-sm self-start md:self-auto transition-colors"
              >
                Xem Album Ảnh
              </a>
            </div>
          </motion.div>
          
        </motion.div>
      </div>
    </section>
  );
}
