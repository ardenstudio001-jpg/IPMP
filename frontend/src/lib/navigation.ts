import type { ComponentType } from 'react';
import type { Role } from '@/lib/api/types';
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  PackageCheck,
  ClipboardCheck,
  Calculator,
  Users,
  ScrollText,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
  {
    href: '/lists/procurement',
    label: 'Procurement Lists',
    icon: ClipboardList,
    roles: ['ADMIN', 'PROCUREMENT'],
  },
  {
    href: '/lists/purchase',
    label: 'Purchase Lists',
    icon: ShoppingBag,
    roles: ['ADMIN', 'PROCUREMENT'],
  },
  {
    href: '/lists/acquired',
    label: 'Acquired Lists',
    icon: PackageCheck,
    roles: ['ADMIN', 'PROCUREMENT', 'INVENTORY'],
  },
  {
    href: '/verification',
    label: 'Verification',
    icon: ClipboardCheck,
    roles: ['ADMIN', 'INVENTORY'],
  },
  { href: '/pricing', label: 'Pricing Settings', icon: Calculator, roles: ['ADMIN'] },
  { href: '/users', label: 'Users', icon: Users, roles: ['ADMIN'] },
  { href: '/audit', label: 'Audit Logs', icon: ScrollText, roles: ['ADMIN'] },
];

export function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
