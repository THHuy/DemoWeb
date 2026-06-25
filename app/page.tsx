import React from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import SignatureMenu from "@/components/sections/SignatureMenu";
import Gallery from "@/components/sections/Gallery";
import Experience from "@/components/sections/Experience";
import Reviews from "@/components/sections/Reviews";
import MapSection from "@/components/sections/MapSection";
import ReservationSection from "@/components/sections/ReservationSection";
import CTA from "@/components/sections/CTA";
import Footer from "@/components/sections/Footer";

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": "L'Ambiance Café & Bistro",
    "image": [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1545048702-79362596cdc9?q=80&w=1200&auto=format&fit=crop"
    ],
    "@id": "https://lambiancecafe.vn",
    "url": "https://lambiancecafe.vn",
    "telephone": "+84901234567",
    "priceRange": "$$",
    "menu": "https://lambiancecafe.vn#menu",
    "servesCuisine": ["Vietnamese Coffee", "Specialty Coffee", "Pastries", "Breakfast", "Brunch"],
    "acceptsReservations": "true",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "68 Đường Ngô Quang Huy, Thảo Điền",
      "addressLocality": "Quận 2, Thành phố Hồ Chí Minh",
      "addressRegion": "Thành phố Hồ Chí Minh",
      "postalCode": "713300",
      "addressCountry": "VN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 10.802276,
      "longitude": 10.729783
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ],
      "opens": "07:00",
      "closes": "22:00"
    },
    "sameAs": [
      "https://www.facebook.com/lambiancecafe",
      "https://www.instagram.com/lambiancecafe"
    ]
  };

  return (
    <>
      {/* JSON-LD LocalBusiness / Restaurant Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Landing Page Content */}
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <About />
        <SignatureMenu />
        <Gallery />
        <Experience />
        <Reviews />
        <MapSection />
        <ReservationSection />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
