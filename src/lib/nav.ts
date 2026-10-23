import {
  LayoutDashboard,
  ScanLine,
  ListChecks,
  History,
  GraduationCap,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** short description for the drawer / tooltip */
  hint: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, hint: "Posture at a glance" },
  { href: "/scan", label: "Scan a URL", icon: ScanLine, hint: "Live passive audit" },
  { href: "/findings", label: "Findings", icon: ListChecks, hint: "Review and triage" },
  { href: "/scans", label: "History", icon: History, hint: "Past runs" },
  { href: "/learn", label: "Learn", icon: GraduationCap, hint: "Concepts and guidance" },
  { href: "/settings", label: "Settings", icon: Settings, hint: "Workspace and scope" },
];
