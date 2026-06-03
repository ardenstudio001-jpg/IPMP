'use client';

import { useState } from 'react';
import { Bell, KeyRound, LogOut, User } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/account/change-password-dialog';
import { useAuth } from '@/providers/auth-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileDrawer } from '@/components/layout/sidebar';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { CommandPalette } from '@/components/shared/command-palette';

function initials(user: { firstName?: string | null; lastName?: string | null; email: string }) {
  const f = user.firstName?.[0] ?? '';
  const l = user.lastName?.[0] ?? '';
  return (f + l || user.email[0]).toUpperCase();
}

export function Topbar({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <MobileDrawer />
        {title && <h1 className="text-lg font-semibold">{title}</h1>}
      </div>
      <div className="flex items-center gap-2">
        <CommandPalette />
        <NotificationCenter />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{user ? initials(user) : '?'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.firstName} {user?.lastName}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              {user?.role}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Change password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </header>
  );
}
