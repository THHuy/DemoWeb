"use client";
import React from "react";
import { MapPin, Phone, Clock, Mail, Navigation } from "lucide-react";

export default function MapSection() {
  const mapEmbedUrl =
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.1179679116744!2d106.72978397573678!3d10.802276558674256!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3175261ab8fb2261%3A0x6001d28362fb8f3f!2zNjggTmdvIFF1YW5nIEh1eSwgVGjhuqNvIMSQaeG7gW4sIFF14bqtbiAyLCBI4buTIENow60gTWluaCwgVmnhu4d0IE5hbQ!5e0!3m2!1svi!2svn!4v1719201506000!5m2!1svi!2svn";

  const googleMapsDirectionsUrl =
    "https://maps.app.goo.gl/r634nKx6kHn1379s6"; // Placeholder or direct search URL for directions

  return (
    <section id="map" className="py-24 bg-brand-bg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Map Left Column Details */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <span className="font-sans text-xs font-bold text-secondary uppercase tracking-widest mb-3 block">
              Ghé thăm L'Ambiance
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-black text-brand-dark leading-tight mb-8">
              Địa Chỉ & Bản Đồ
            </h2>

            {/* Info Items */}
            <div className="space-y-6 mb-10">
              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-brand-dark text-base mb-1">
                    Địa chỉ của chúng tôi
                  </h4>
                  <p className="font-sans text-brand-text/75 text-sm md:text-base leading-relaxed">
                    68 Đường Ngô Quang Huy, Thảo Điền, Quận 2, <br className="hidden sm:inline" />
                    Thành phố Hồ Chí Minh, Việt Nam
                  </p>
                </div>
              </div>

              {/* Hotline */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-brand-dark text-base mb-1">
                    Hotline đặt bàn
                  </h4>
                  <p className="font-sans text-brand-text/75 text-sm md:text-base">
                    090 123 4567 (Hỗ trợ 24/7)
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-brand-dark text-base mb-1">
                    Giờ phục vụ
                  </h4>
                  <p className="font-sans text-brand-text/75 text-sm md:text-base">
                    Thứ 2 - Chủ Nhật: 07:00 AM - 10:00 PM <br className="hidden sm:inline"/>
                    (Nhận gọi món cuối lúc 09:30 PM)
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-brand-dark text-base mb-1">
                    Hộp thư góp ý
                  </h4>
                  <p className="font-sans text-brand-text/75 text-sm md:text-base">
                    contact@lambiancecafe.vn
                  </p>
                </div>
              </div>
            </div>

            {/* Directions Action Button */}
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 font-sans font-bold text-sm uppercase tracking-wider bg-primary hover:bg-primary-hover text-brand-bg px-8 py-4 rounded-full transition-all duration-300 shadow-md hover:shadow-lg self-start"
            >
              <Navigation className="w-4 h-4 fill-current" />
              <span>Chỉ đường ngay</span>
            </a>
          </div>

          {/* Map Right Column Map Frame */}
          <div className="lg:col-span-7 h-[350px] sm:h-[450px] w-full rounded-[2rem] overflow-hidden shadow-2xl border-4 border-brand-bg relative">
            <iframe
              src={mapEmbedUrl}
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Google Map L'Ambiance Cafe & Bistro"
            />
          </div>
          
        </div>
      </div>
    </section>
  );
}
