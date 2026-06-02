import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getTokens } from '@/lib/auth/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type RealtimeEventType =
  | 'lists.changed'
  | 'list-items.changed'
  | 'verifications.changed'
  | 'notifications.changed';

export interface RealtimeEvent {
  type: RealtimeEventType;
}

export interface RealtimeHandlers {
  onListsChanged?: () => void;
  onListItemsChanged?: () => void;
  onVerificationsChanged?: () => void;
  onNotificationsChanged?: () => void;
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
        switch (event.type) {
          case 'lists.changed':
            handlers.onListsChanged?.();
            break;
          case 'list-items.changed':
            handlers.onListItemsChanged?.();
            break;
          case 'verifications.changed':
            handlers.onVerificationsChanged?.();
            break;
          case 'notifications.changed':
            handlers.onNotificationsChanged?.();
            break;
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
