"use client";

import { ScissorsIcon, PlusIcon, SearchIcon, LogInIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { ClipNavUser } from "@/components/clip-nav-user";
import { useAuthModal } from "@/_state/auth-modal.state";

type ClipSidebarProps = {
  isAuthenticated: boolean;
};

export function ClipSidebar({ isAuthenticated }: ClipSidebarProps) {
  const { openModal } = useAuthModal();

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      {/* ── Header ─────────────────────────────────────────── */}
      <SidebarHeader className="p-3 gap-2">
        {/* Logo + name */}
        <div className="flex items-center gap-2.5 px-1 py-0.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScissorsIcon className="size-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Clipper</span>
        </div>

        {/* Actions — only show when authenticated */}
        {isAuthenticated && (
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-start gap-2 text-muted-foreground"
              aria-label="New clip"
            >
              <PlusIcon className="size-3.5" />
              <span>New Clip</span>
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Search clips">
              <SearchIcon className="size-3.5" />
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator />

      {/* ── Recent clips ───────────────────────────────────── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Clips</SidebarGroupLabel>
          <SidebarGroupContent>
            {isAuthenticated ? (
              <ClipHistoryEmpty />
            ) : (
              <GuestClipsPlaceholder onSignIn={openModal} />
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ─────────────────────────────────────────── */}
      <SidebarFooter className="p-2">
        {isAuthenticated ? (
          <ClipNavUser />
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={openModal}
            aria-label="Sign in"
          >
            <LogInIcon className="size-3.5" />
            Sign in
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function ClipHistoryEmpty() {
  return (
    <Empty className="border-0 py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ScissorsIcon className="size-4 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle className="text-xs font-normal text-muted-foreground">
          No clips yet
        </EmptyTitle>
        <EmptyDescription className="text-xs text-center">
          Your generated clips will appear here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function GuestClipsPlaceholder({ onSignIn }: { onSignIn: () => void }) {
  return (
    <Empty className="border-0 py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ScissorsIcon className="size-4 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle className="text-xs font-normal text-muted-foreground">
          Sign in to save clips
        </EmptyTitle>
        <EmptyDescription className="text-xs text-center">
          <button
            type="button"
            onClick={onSignIn}
            className="underline underline-offset-3 hover:text-foreground transition-colors"
          >
            Sign in
          </button>{" "}
          to start clipping videos.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
