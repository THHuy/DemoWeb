"use client";
import React, { useState, useEffect } from "react";
import { Menu, X, Coffee } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { name: "Trang chủ", href: "#hero" },
  { name: "Câu chuyện", href: "#about" },
  { name: "Menu đặc trưng", href: "#menu" },
  { name: "Bộ sưu tập", href: "#gallery" },
  { name: "Trải nghiệm", href: "#experience" },
  { name: "Đánh giá", href: "#reviews" },
  { name: "Đặt bàn", href: "#booking" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "py-3 px-4 md:px-8 mt-2 md:mt-4 max-w-7xl mx-auto rounded-full glass shadow-lg"
            : "py-5 px-6 md:px-12 bg-transparent"
        }`}
        style={
          isScrolled
            ? {
                width: "calc(100% - 2rem)",
                maxWidth: "1200px",
              }
            : {}
        }
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-between p-2.5 text-brand-bg transition-transform group-hover:rotate-12 duration-300">
              <Coffee className="w-5 h-5" />
            </div>
            <span className="font-serif font-bold text-lg md:text-xl tracking-wider text-primary">
              L'Ambiance
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="font-sans text-sm font-medium text-brand-text/80 hover:text-primary transition-colors duration-200"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#booking"
              className="font-sans text-xs md:text-sm font-semibold uppercase tracking-wider bg-primary hover:bg-primary-hover text-brand-bg px-5 py-2.5 rounded-full transition-colors duration-300 shadow-md hover:shadow-lg"
            >
              Đặt bàn ngay
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-brand-text hover:text-primary transition-colors p-1"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          >
            {/* Drawer Body */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 bottom-0 w-[280px] bg-brand-bg shadow-2xl p-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-10">
                  <span className="font-serif font-bold text-xl text-primary">
                    L'Ambiance
                  </span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-brand-text hover:text-primary"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <nav className="flex flex-col gap-6">
                  {navLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="font-sans text-base font-semibold text-brand-text/80 hover:text-primary transition-colors"
                    >
                      {link.name}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="mt-auto">
                <a
                  href="#booking"
                  onClick={() => setIsOpen(false)}
                  className="font-sans block text-center text-sm font-semibold uppercase tracking-wider bg-primary hover:bg-primary-hover text-brand-bg py-3.5 rounded-full transition-colors duration-300 shadow-md"
                >
                  Đặt bàn ngay
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
