import {
  ShoppingBag,
  Forklift,
  Mail,
  MessageSquare,
  Calendar,
  Kanban,
  ReceiptText,
  Users,
  Lock,
  Fingerprint,
  SquareArrowUpRight,
  LayoutDashboard,
  Gauge,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

import type { RoleName, PermissionKey } from "@/utils/access-core";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;

  requiredRoles?: RoleName[];
  requiredPerms?: PermissionKey[];
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;

  requiredRoles?: RoleName[];
  requiredPerms?: PermissionKey[];
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];

  requiredRoles?: RoleName[];
  requiredPerms?: PermissionKey[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Administrator",
    items: [
      {
        title: "Provas",
        url: "/dashboard/admin/provas-questoes",
        icon: SquareArrowUpRight,
        comingSoon: false,
        requiredPerms: ["examBoard.manage"],
      },
      {
        title: "Users",
        url: "/dashboard/admin/users",
        icon: Users,
        comingSoon: false,
        requiredPerms: ["user.create", "user.delete", "user.update"],
      },
      {
        title: "Roles",
        url: "/dashboard/admin/roles",
        icon: Lock,
        comingSoon: false,
        requiredPerms: ["role.manage"],
      },
      {
        title: "Permissions",
        url: "/dashboard/admin/permissions",
        icon: Fingerprint,
        comingSoon: false,
        requiredPerms: ["permission.manage"],
      },
      {
        title: "Planos",
        url: "/dashboard/admin/planos",
        icon: Fingerprint,
        comingSoon: false,
        requiredPerms: ["plan.manage"],
      },
      {
        title: "Assinaturas",
        url: "/dashboard/admin/subscriptions",
        icon: Fingerprint,
        comingSoon: false,
        requiredPerms: ["subscription.manage"],
      },
      {
        title: "Cupoms",
        url: "/dashboard/admin/coupons",
        icon: Fingerprint,
        comingSoon: false,
        requiredPerms: ["coupon.manage"],
      },
    ],
  },
  {
    id: 2,
    label: "Geral",
    items: [
      {
        title: "Início",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
    ],
  },
];
