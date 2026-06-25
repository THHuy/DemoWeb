"use client";
import React from "react";
import { Coffee, Phone, MapPin, Clock, MessageSquareHeart } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-brand-dark text-brand-bg/85 pt-16 pb-8 border-t border-white/5 relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Main Footer Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-16 mb-12">
          
          {/* Col 1: Brand & Bio */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <a href="#hero" className="flex items-center gap-2 self-start group">
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-brand-dark transition-transform group-hover:rotate-12 duration-300">
                <Coffee className="w-4 h-4" />
              </div>
              <span className="font-serif font-bold text-xl tracking-wider text-brand-bg">
                L'Ambiance
              </span>
            </a>
            
            <p className="font-sans text-sm text-brand-bg/70 leading-relaxed">
              Không gian Resort Café sân vườn xanh mát giữa trung tâm Thảo Điền. Chúng tôi đem lại những hạt cà phê rang mộc chuẩn vị, ẩm thực tinh tế và phong cách phục vụ chu đáo tận tâm nhất.
            </p>

            {/* Social Media Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-primary hover:text-brand-bg flex items-center justify-center transition-all duration-300 border border-white/10"
                aria-label="Facebook Page"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-primary hover:text-brand-bg flex items-center justify-center transition-all duration-300 border border-white/10"
                aria-label="Instagram Profile"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-primary hover:text-brand-bg flex items-center justify-center transition-all duration-300 border border-white/10 font-bold text-xs"
                aria-label="TikTok Channel"
              >
                𝅘𝅥𝅯
              </a>
              <a
                href="https://maps.app.goo.gl/r634nKx6kHn1379s6"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-primary hover:text-brand-bg flex items-center justify-center transition-all duration-300 border border-white/10"
                aria-label="Google Maps Business"
              >
                <MapPin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="lg:col-span-3 lg:col-start-6 flex flex-col gap-6">
            <h4 className="font-sans font-bold text-accent uppercase tracking-widest text-xs">
              Đường Dẫn Nhanh
            </h4>
            <nav className="flex flex-col gap-3 font-sans text-sm">
              <a href="#hero" className="hover:text-accent transition-colors self-start">
                Trang chủ
              </a>
              <a href="#about" className="hover:text-accent transition-colors self-start">
                Câu chuyện L'Ambiance
              </a>
              <a href="#menu" className="hover:text-accent transition-colors self-start">
                Thực đơn đặc trưng
              </a>
              <a href="#gallery" className="hover:text-accent transition-colors self-start">
                Album hình ảnh
              </a>
              <a href="#experience" className="hover:text-accent transition-colors self-start">
                Dịch vụ trải nghiệm
              </a>
              <a href="#booking" className="hover:text-accent transition-colors self-start">
                Đặt lịch đặt bàn
              </a>
            </nav>
          </div>

          {/* Col 3: Contact Info */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <h4 className="font-sans font-bold text-accent uppercase tracking-widest text-xs">
              Thông Tin Liên Hệ
            </h4>
            <div className="flex flex-col gap-4 font-sans text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span className="text-brand-bg/75">
                  68 Đường Ngô Quang Huy, Thảo Điền, Quận 2, TP. Hồ Chí Minh
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-accent shrink-0" />
                <a href="tel:0901234567" className="hover:text-accent transition-colors">
                  090 123 4567
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span className="text-brand-bg/75">
                  Mở cửa hàng ngày: 07:00 AM - 10:00 PM <br />
                  (Cả ngày lễ và cuối tuần)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MessageSquareHeart className="w-4 h-4 text-accent shrink-0" />
                <span className="text-brand-bg/75">MST: 0317526189</span>
              </div>
            </div>
          </div>
          
        </div>

        {/* Divider & Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-center gap-4 text-xs text-brand-bg/60">
          <p>
            &copy; {currentYear} L'Ambiance Café & Bistro. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#about" className="hover:text-accent transition-colors">Chính sách bảo mật</a>
            <a href="#booking" className="hover:text-accent transition-colors">Điều khoản dịch vụ</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
