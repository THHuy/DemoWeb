"use client";
import React from "react";
import { motion, Variants } from "framer-motion";
import { Spotlight } from "@/components/ui/Spotlight";
import { Coffee, MapPin, Phone, Clock, UtensilsCrossed, Navigation } from "lucide-react";

export default function Hero() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  const scaleVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 80, damping: 15, delay: 0.2 },
    },
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-dark"
    >
      {/* Background Image with Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <motion.img
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.45 }}
          transition={{ duration: 2.5, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2000&auto=format&fit=crop"
          alt="L'Ambiance Cafe background"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/70 to-transparent" />
      </div>

      {/* Aceternity Spotlight */}
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="#D4A373"
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center flex flex-col items-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          {/* Tagline / Subtitle */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-dark text-accent text-sm font-semibold uppercase tracking-wider mb-6"
          >
            <Coffee className="w-4 h-4" />
            <span>Resort Café & Bistro</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={itemVariants}
            className="font-serif text-5xl md:text-7xl lg:text-8xl font-black text-brand-bg tracking-tight leading-tight mb-6"
          >
            Hương vị của <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-secondary to-accent">
              sự thư giãn
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={itemVariants}
            className="font-sans text-lg md:text-xl text-brand-bg/85 max-w-2xl mb-10 font-light leading-relaxed"
          >
            Không chỉ là cà phê, mà còn là nơi lưu giữ những khoảnh khắc đẹp. <br className="hidden md:inline"/>
            Trải nghiệm không gian sân vườn resort giữa lòng Sài Gòn.
          </motion.p>

          {/* Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-16"
          >
            <a
              href="#menu"
              className="w-full sm:w-auto flex items-center justify-center gap-2 font-sans font-bold text-sm uppercase tracking-wider bg-accent hover:bg-accent-hover text-brand-dark px-8 py-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Xem Menu</span>
            </a>
            <a
              href="#map"
              className="w-full sm:w-auto flex items-center justify-center gap-2 font-sans font-bold text-sm uppercase tracking-wider bg-transparent hover:bg-brand-bg/10 text-brand-bg border border-brand-bg/30 px-8 py-4 rounded-full transition-all duration-300 hover:-translate-y-0.5"
            >
              <Navigation className="w-4 h-4" />
              <span>Chỉ Đường</span>
            </a>
          </motion.div>
        </motion.div>

        {/* Contact Info Cards */}
        <motion.div
          variants={scaleVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl p-6 rounded-3xl glass-dark border border-white/5"
        >
          {/* Address */}
          <div className="flex flex-col items-center text-center p-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-sans text-xs font-bold text-accent uppercase tracking-wider mb-1">
              Địa chỉ
            </h3>
            <p className="font-sans text-sm text-brand-bg/80">
              68 Đường Ngô Quang Huy, Thảo Điền, Quận 2, TP. HCM
            </p>
          </div>

          {/* Hours */}
          <div className="flex flex-col items-center text-center p-3 border-t sm:border-t-0 sm:border-x border-white/5">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-sans text-xs font-bold text-accent uppercase tracking-wider mb-1">
              Giờ mở cửa
            </h3>
            <p className="font-sans text-sm text-brand-bg/80">
              Mở cửa hàng ngày: 07:00 AM - 10:00 PM
            </p>
          </div>

          {/* Hotline */}
          <div className="flex flex-col items-center text-center p-3 border-t sm:border-t-0 border-white/5">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent mb-3">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="font-sans text-xs font-bold text-accent uppercase tracking-wider mb-1">
              Hotline
            </h3>
            <p className="font-sans text-sm text-brand-bg/80">
              Đặt bàn: 090 123 4567
            </p>
          </div>
        </motion.div>
      </div>

      {/* Floating Elements (Subtle Animation) */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <motion.div
          animate={{
            y: [0, -15, 0],
            x: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-10 w-16 h-16 rounded-full bg-gradient-to-tr from-accent/10 to-transparent blur-xl"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            x: [0, -8, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-1/4 right-10 w-24 h-24 rounded-full bg-gradient-to-br from-secondary/15 to-transparent blur-xl"
        />
      </div>
    </section>
  );
}
