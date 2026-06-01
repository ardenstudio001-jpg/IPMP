import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getTokens } from '@/lib/auth/session';
import type { Product } from '@/lib/api/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type RealtimeEventType = 'products.changed' | 'notifications.changed';

export interface RealtimeEvent {
  type: RealtimeEventType;
  product?: Product;
}

export interface RealtimeHandlers {
  onProductsChanged: (event: RealtimeEvent) => void;
  onNotificationsChanged: () => void;
  onConnectionError?: (error: unknown) => void;
}

export function connectRealtimeStream(
  handlers: RealtimeHandlers,
  signal: AbortSignal,
): Promise<void> {
  const { accessToken } = getTokens();
  if (!accessToken) {
    return Promise.resolve();
  }

  return fetchEventSource(`${API_URL}/realtime/stream`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream',
    },
    signal,
    openWhenHidden: true,
    onopen: async (response) => {
      if (response.ok) return;
      throw new Error(`Realtime stream failed: ${response.status}`);
    },
    onmessage: (message) => {
      if (!message.data) return;
      try {
        const event = JSON.parse(message.data) as RealtimeEvent;
        if (event.type === 'products.changed') {
          handlers.onProductsChanged(event);
        } else if (event.type === 'notifications.changed') {
          handlers.onNotificationsChanged();
        }
      } catch {
        // ignore malformed events
      }
    },
    onerror: (error) => {
      handlers.onConnectionError?.(error);
      throw error;
    },
  });
}
