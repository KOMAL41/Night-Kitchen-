import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, Boxes, Users,
  BarChart3, FileDown, Settings as SettingsIcon, Building2, ChefHat, Bike, Star,
} from "lucide-react";

export type Role = "platform_admin" | "hotel_manager" | "kitchen_staff" | "delivery_partner" | "customer";

export type NavItem = { label: string; to: string; icon: LucideIcon; end?: boolean };

export type RoleConfig = {
  roleLabel: string;
  appName: string;
  /** Tailwind background class for the sidebar mark + active nav state — this is the "different colors" per role. */
  accent: string;
  nav: NavItem[];
  /** Paths (relative to /app) this role may load directly. Anything else redirects to /app. */
  allowedPaths: string[];
};

export const ROLE_CONFIG: Record<Role, RoleConfig> = {
  platform_admin: {
    roleLabel: "Platform Owner",
    appName: "Platform Console",
    accent: "bg-gradient-to-br from-amber-500 to-orange-600",
    nav: [
      { label: "Dashboard", to: "/app", icon: Building2, end: true },
      { label: "Platform Analytics", to: "/app/analytics", icon: BarChart3 },
      { label: "Reviews", to: "/app/reviews", icon: Star },
      { label: "Reports", to: "/app/reports", icon: FileDown },
      { label: "Settings", to: "/app/settings", icon: SettingsIcon },
    ],
    allowedPaths: ["/app", "/app/analytics", "/app/reviews", "/app/reports", "/app/settings"],
  },
  hotel_manager: {
    roleLabel: "Hotel Manager",
    appName: "Kitchen Manager",
    accent: "bg-brand-gradient",
    nav: [
      { label: "Dashboard", to: "/app", icon: LayoutDashboard, end: true },
      { label: "Menu & Offers", to: "/app/menu", icon: UtensilsCrossed },
      { label: "Orders", to: "/app/orders", icon: ClipboardList },
      { label: "Inventory", to: "/app/inventory", icon: Boxes },
      { label: "Employees", to: "/app/employees", icon: Users },
      { label: "Reviews", to: "/app/reviews", icon: Star },
      { label: "Analytics", to: "/app/analytics", icon: BarChart3 },
      { label: "Reports", to: "/app/reports", icon: FileDown },
      { label: "Settings", to: "/app/settings", icon: SettingsIcon },
    ],
    allowedPaths: ["/app", "/app/menu", "/app/orders", "/app/inventory", "/app/employees", "/app/reviews", "/app/analytics", "/app/reports", "/app/settings"],
  },
  kitchen_staff: {
    roleLabel: "Kitchen Staff",
    appName: "Kitchen Display",
    accent: "bg-gradient-to-br from-sky-500 to-cyan-600",
    nav: [
      { label: "Kitchen Display", to: "/app", icon: ChefHat, end: true },
      { label: "Order Queue", to: "/app/orders", icon: ClipboardList },
      { label: "Ingredients", to: "/app/inventory", icon: Boxes },
      { label: "Settings", to: "/app/settings", icon: SettingsIcon },
    ],
    allowedPaths: ["/app", "/app/orders", "/app/inventory", "/app/settings"],
  },
  delivery_partner: {
    roleLabel: "Delivery Partner",
    appName: "Delivery App",
    accent: "bg-gradient-to-br from-emerald-500 to-teal-600",
    nav: [
      { label: "Dashboard", to: "/app", icon: Bike, end: true },
      { label: "My Deliveries", to: "/app/orders", icon: ClipboardList },
      { label: "Settings", to: "/app/settings", icon: SettingsIcon },
    ],
    allowedPaths: ["/app", "/app/orders", "/app/settings"],
  },
  // Customer isn't routed through this config — it has its own app under /customer.
  customer: {
    roleLabel: "Customer",
    appName: "Order Food",
    accent: "bg-brand-gradient",
    nav: [],
    allowedPaths: [],
  },
};
