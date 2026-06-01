'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import type { Role } from '@/lib/api/types';

const ROUTES: { href: string; label: string; roles: Role[] }[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN'] },
  { href: '/workspace', label: 'Admin Workspace', roles: ['ADMIN'] },
  { href: '/inventory', label: 'Inventory Spreadsheet', roles: ['INVENTORY'] },
  { href: '/procurement', label: 'Procurement Spreadsheet', roles: ['PROCUREMENT'] },
  { href: '/pricing', label: 'Pricing Formula', roles: ['ADMIN'] },
  { href: '/users', label: 'User Management', roles: ['ADMIN'] },
  { href: '/audit', label: 'Audit Logs', roles: ['ADMIN'] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const items = ROUTES.filter((r) => user && r.roles.includes(user.role));

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="text-xs">Search...</span>
        <kbd className="pointer-events-none rounded border bg-muted px-1.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {items.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
              >
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
