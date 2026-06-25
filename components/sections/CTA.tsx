"use client";
import React from "react";
import { Phone, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section id="cta" className="relative py-28 overflow-hidden bg-brand-dark">
      {/* Background Image at Night with Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop"
          alt="L'Ambiance at night"
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/90 to-brand-dark/60" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left Column Content */}
        <div className="max-w-2xl">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-sans text-xs font-bold text-accent uppercase tracking-widest mb-3 block"
          >
            Thời gian trọn vẹn
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-serif text-4xl md:text-5xl font-black text-brand-bg leading-tight mb-4"
          >
            Hẹn bạn tại quán
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="font-sans text-brand-bg/80 text-base md:text-lg font-light leading-relaxed"
          >
            Một ly cà phê ngon luôn bắt đầu bằng một cuộc gặp gỡ. Hãy cùng chia sẻ những tiếng cười ấm cúng và lắng đọng bên không gian ngập tràn sắc xanh của chúng tôi.
          </motion.p>
        </div>

        {/* Right Column Buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 w-full md:w-auto shrink-0"
        >
          <a
            href="#booking"
            className="flex items-center justify-center gap-2 font-sans font-bold text-sm uppercase tracking-wider bg-accent hover:bg-accent-hover text-brand-dark px-8 py-4 rounded-full transition-all duration-300 shadow-md hover:shadow-lg w-full sm:w-auto"
          >
            <Calendar className="w-4 h-4" />
            <span>Đặt bàn ngay</span>
          </a>
          <a
            href="tel:0901234567"
            className="flex items-center justify-center gap-2 font-sans font-bold text-sm uppercase tracking-wider bg-transparent hover:bg-brand-bg/10 text-brand-bg border border-brand-bg/30 px-8 py-4 rounded-full transition-all duration-300 w-full sm:w-auto"
          >
            <Phone className="w-4 h-4" />
            <span>Gọi hotline</span>
          </a>
        </motion.div>
        
      </div>
    </section>
  );
}
