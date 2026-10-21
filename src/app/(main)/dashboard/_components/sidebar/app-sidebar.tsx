"use client";

import Link from "next/link";
import { Command } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { NavMain } from "./nav-main";
import { sidebarItems, type NavGroup } from "@/navigation/sidebar/sidebar-items";
import { filterSidebar } from "@/navigation/sidebar/filter-sidebar";
import type { AuthProfile } from "@/utils/access-core";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  profile: AuthProfile;
}

export function AppSidebar({ profile, ...props }: AppSidebarProps) {
  const items: NavGroup[] = filterSidebar(profile, sidebarItems);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
                <Command />
                <span className="text-base font-semibold">Próximo Vest</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
    </Sidebar>
  );
}
