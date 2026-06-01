'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { connectRealtimeStream } from '@/lib/realtime/realtime-client';
import { notificationKeys } from '@/hooks/queries/use-notifications';
import { productKeys } from '@/hooks/queries/use-products';
import {
  invalidateProductStats,
  upsertProductInAllListCaches,
} from '@/lib/products/product-cache';
import type { Product } from '@/lib/api/types';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;

      void connectRealtimeStream(
        {
          onProductsChanged: (event) => {
            if (event.product) {
              upsertProductInAllListCaches(qc, event.product as Product);
              invalidateProductStats(qc);
            } else {
              void qc.invalidateQueries({ queryKey: productKeys.all });
            }
          },
          onNotificationsChanged: () => {
            void qc.invalidateQueries({ queryKey: notificationKeys.all });
          },
        },
        controller.signal,
      ).catch(() => {
        if (disposed) return;
        reconnectTimer = setTimeout(connect, 3000);
      });
    };

    connect();

    return () => {
      disposed = true;
      controller.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [user, qc]);

  return <>{children}</>;
}
