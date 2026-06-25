import type { Metadata } from "next";
import { Be_Vietnam_Pro, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-be-vietnam",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "vietnamese"],
  variable: "--font-cormorant",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "L'Ambiance Café & Bistro - Quán Cà Phê Đẹp Tại Thảo Điền, Quận 2",
  description:
    "Khám phá không gian cà phê resort sân vườn thư giãn, cà phê rang xay nguyên chất, đồ uống chất lượng và những góc check-in đẹp tại L'Ambiance Café & Bistro, Thảo Điền, Quận 2.",
  keywords: [
    "cà phê thảo điền",
    "quán cà phê đẹp quận 2",
    "resort cafe thảo điền",
    "cà phê rang xay nguyên chất",
    "đặt bàn quán cà phê",
    "check-in đẹp quận 2",
  ],
  authors: [{ name: "L'Ambiance Café" }],
  openGraph: {
    title: "L'Ambiance Café & Bistro - Quán Cà Phê Đẹp Tại Thảo Điền, Quận 2",
    description:
      "Khám phá không gian cà phê resort sân vườn thư giãn, cà phê rang xay nguyên chất, đồ uống chất lượng và những góc check-in đẹp tại L'Ambiance Café & Bistro.",
    type: "website",
    locale: "vi_VN",
    url: "https://lambiancecafe.vn",
    siteName: "L'Ambiance Café & Bistro",
    images: [
      {
        url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop",
        width: 1200,
        height: 630,
        alt: "Không gian sang trọng tại L'Ambiance Café & Bistro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "L'Ambiance Café & Bistro - Quán Cà Phê Đẹp Tại Thảo Điền, Quận 2",
    description:
      "Khám phá không gian cà phê resort sân vườn thư giãn, cà phê rang xay nguyên chất, đồ uống chất lượng và những góc check-in đẹp tại L'Ambiance Café & Bistro.",
    images: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  alternates: {
    canonical: "https://lambiancecafe.vn",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${cormorant.variable} h-full scroll-smooth`}
    >
      <body className="font-sans antialiased bg-brand-bg text-brand-text min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
