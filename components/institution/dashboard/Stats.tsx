import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatsProps {
  data?: {
    totalPrograms: number;
    pacMembers: number;
    bosMembers: number;
    academicCouncilMembers: number;
    activeStudents: number;
    totalResponses: number;
    avgRating: number;
    obeFrameworkCount: number;
  };
}

export default function Stats({ data }: StatsProps) {
  const stats = [
    {
      title: "Academic Council",
      value: data?.academicCouncilMembers || 1,
      icon: <Users className="h-5 w-5" />,
      change: 2,
      trend: "up" as const,
      href: "/institution/dashboard?step=council",
      color: "blue",
    },
    {
      title: "OBE Framework",
      value: data?.obeFrameworkCount || 0,
      icon: <FileText className="h-5 w-5" />,
      change: 0,
      trend: "up" as const,
      href: "/institution/dashboard?step=process-1",
      color: "purple",
    },
    {
      title: "OBE Protocols",
      value: "Enabled",
      icon: <ShieldCheck className="h-5 w-5" />,
      change: 0,
      trend: "up" as const,
      href: "/institution/dashboard?step=process-1",
      color: "emerald",
    },
  ];

  const colorStyles = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="h-full"
        >
          <Link href={stat.href}>
            <Card className="relative h-full overflow-hidden border-border/60 bg-white/50 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-xl hover:border-indigo-100 flex flex-col justify-between p-7 rounded-[24px] group">
              {/* Top Right Icon */}
              <div
                className={cn(
                  "absolute top-6 right-6 p-2.5 rounded-xl transition-all duration-300",
                  colorStyles[stat.color as keyof typeof colorStyles] ||
                    "bg-slate-50 text-slate-400",
                  "group-hover:scale-110 shadow-sm",
                )}
              >
                {stat.icon}
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-4">
                  {stat.title}
                </p>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                  {stat.value}
                </h3>

                <div className="flex items-center gap-2 mb-6">
                  {stat.change === 0 ? (
                    <div className="flex items-center text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      0%
                    </div>
                  ) : stat.trend === "up" ? (
                    <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <TrendingUp className="h-3 w-3 mr-1" />+{stat.change}%
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <TrendingDown className="h-3 w-3 mr-1" />-{stat.change}%
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-slate-400">
                    vs last month
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
                <span>View Details</span>
                <ChevronRight className="size-3 transition-transform group-hover:translate-x-1" />
              </div>

              {/* Background Glow Effect */}
              <div className="absolute -bottom-10 -right-10 size-32 bg-slate-100/20 rounded-full blur-3xl group-hover:bg-indigo-100/40 transition-colors duration-500" />
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
