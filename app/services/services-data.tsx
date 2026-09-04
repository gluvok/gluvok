import React from "react";
import {
  Database,
  Cloud,
  Server,
  Link,
  HardDrive,
  TrendingUp,
  Cpu,
  Zap,
  Clock,
  Box,
  Lock,
  Settings,
  CheckCircle2,
  Shield,
} from "lucide-react";

export interface FeatureItem {
  text: string;
  icon: React.ReactNode;
}

export interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: FeatureItem[];
  caveat?: string;
  caveatType?: "warning" | "danger";
  successNote?: string;
  accentClass: string;
  badgeText: string;
  badgeIcon: React.ReactNode;
  badgeBgClass: string;
}

export const accentBorder = (color: string) => {
  switch (color) {
    case "blue":
      return "border-t-2 border-t-blue-500 dark:border-t-blue-600";
    case "emerald":
      return "border-t-2 border-t-emerald-500 dark:border-t-emerald-600";
    case "indigo":
      return "border-t-2 border-t-indigo-500 dark:border-t-indigo-600";
    default:
      return "";
  }
};

export const badgeBg = (color: string) => {
  switch (color) {
    case "blue":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "emerald":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "indigo":
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20";
    default:
      return "";
  }
};

const serviceIconCls = "h-5 w-5";
const featureIconCls = "h-3 w-3";
const badgeIconCls = "h-3 w-3";

export const SERVICES: ServiceCardProps[] = [
  {
    title: "Bring Your Own Database and/or Object Storage",
    icon: <Database className={serviceIconCls} />,
    description:
      "Connect your database to our platform via our custom backend integration layer. Enjoy granular control over your fields and tables while keeping full ownership of your data hosting and performance management.",
    features: [
      {
        text: "Integrate your database directly into our backend platform.",
        icon: <Link className={featureIconCls} />,
      },
      {
        text: "Support custom storage buckets or use managed storage.",
        icon: <HardDrive className={featureIconCls} />,
      },
      {
        text: "Retain complete control over scaling performance.",
        icon: <TrendingUp className={featureIconCls} />,
      },
    ],
    caveat:
      "Your database health is your responsibility. Any service interruptions, slow queries, or data issues resulting from your database performance are not covered by our platform support.",
    caveatType: "warning",
    accentClass: accentBorder("blue"),
    badgeText: "Flexible Control",
    badgeIcon: <Settings className={badgeIconCls} />,
    badgeBgClass: badgeBg("blue"),
  },
  {
    title: "Everything Fully Managed And Coordinated By Us",
    icon: <Cloud className={serviceIconCls} />,
    description:
      "Let us handle the infrastructure, from databases and server hosting to object storage setups. Get started instantly without DevOps overhead, while choosing how your tables and fields are structured.",
    features: [
      {
        text: "Host your database and backend server within our systems.",
        icon: <Cpu className={featureIconCls} />,
      },
      {
        text: "Deploy instantly without server setup or maintenance.",
        icon: <Zap className={featureIconCls} />,
      },
      {
        text: "Guarantee high availability with system updates.",
        icon: <Clock className={featureIconCls} />,
      },
    ],
    successNote:
      "We take full responsibility for database scaling, performance, security, and backups. Enjoy complete peace of mind with our fully monitored, highly available, and updated hosting services.",
    accentClass: accentBorder("emerald"),
    badgeText: "Zero DevOps",
    badgeIcon: <CheckCircle2 className={badgeIconCls} />,
    badgeBgClass: badgeBg("emerald"),
  },
  {
    title: "Bring Your Own Private Application Server Host",
    icon: <Server className={serviceIconCls} />,
    description:
      "Host frontend and backend on your server using private Docker images with your database. Keep full deployment privacy and control without accessing the underlying business logic source code.",
    features: [
      {
        text: "Deploy our Docker containers directly on local servers.",
        icon: <Box className={featureIconCls} />,
      },
      {
        text: "Connect to either our storage or your storage bucket.",
        icon: <HardDrive className={featureIconCls} />,
      },
      {
        text: "Isolate application traffic within local networks.",
        icon: <Lock className={featureIconCls} />,
      },
    ],
    caveat:
      "Any server crashes, hardware bottlenecks, or configuration errors arising from your self-hosted infrastructure are your sole responsibility. We do not provide server maintenance.",
    accentClass: accentBorder("indigo"),
    badgeText: "Maximum Privacy",
    badgeIcon: <Shield className={badgeIconCls} />,
    badgeBgClass: badgeBg("indigo"),
  },
];
