"use client";

import { BadgeCheck, CreditCard, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { getInitials } from "@/lib/utils";

export function AccountMenu({
  user,
}: {
  readonly user: { readonly name: string; readonly email: string; readonly image?: string | null };
}) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await authClient.signOut();
    } finally {
      // Tell other tabs, and keep the back button from returning to the dashboard.
      try {
        const channel = new BroadcastChannel("auth");
        channel.postMessage("logout");
        channel.close();
      } catch {}
      router.replace("/auth/login");
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-lg" aria-label="Menu da conta">
          <Avatar className="size-9 rounded-lg">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuLabel className="font-normal">
          <div className="grid text-sm leading-tight">
            <span className="truncate font-semibold">{user.name}</span>
            <span className="text-muted-foreground truncate text-xs">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/dashboard/minha-conta")}>
            <BadgeCheck />
            Minha conta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/dashboard/assinatura")}>
            <CreditCard />
            Assinatura
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
