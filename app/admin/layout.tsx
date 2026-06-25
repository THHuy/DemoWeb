import type { Metadata } from "next";
import AdminClientLayout from "@/components/admin/AdminClientLayout";

export const metadata: Metadata = {
  title: "Admin | L'Ambiance Café",
  description: "Trang quản trị L'Ambiance Café & Bistro",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminClientLayout>{children}</AdminClientLayout>;
}
