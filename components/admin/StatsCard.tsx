import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: "amber" | "blue" | "emerald" | "rose";
  description?: string;
}

const colorMap = {
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
  },
};

export default function StatsCard({ title, value, icon: Icon, color, description }: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border ${colors.border} hover:bg-white/8 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-white/50">{title}</p>
      {description && (
        <p className="text-xs text-white/40 mt-3 pt-3 border-t border-white/5">
          {description}
        </p>
      )}
    </div>
  );
}
