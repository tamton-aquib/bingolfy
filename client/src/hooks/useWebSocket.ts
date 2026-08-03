import { useEffect, useRef, useCallback, useMemo, useState } from 'react';

// biome-ignore lint/suspicious/noExplicitAny: webhook payloads are dynamic JSON
type MessageHandler = (payload: any) => void;

const MAX_QUEUE_SIZE = 50;

interface QueuedMessage {
  type: string;
  data: Record<string, unknown>;
}

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const [ready, setReady] = useState(false);
  const reconnectAttempt = useRef(0);
  const mountedRef = useRef(true);
  const messageQueue = useRef<QueuedMessage[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function flushQueue() {
      const queue = messageQueue.current;
      messageQueue.current = [];
      for (const msg of queue) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: msg.type, ...msg.data }));
        } else {
          messageQueue.current = queue.slice(queue.indexOf(msg));
          break;
        }
      }
    }

    function connect() {
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        setReady(true);
        reconnectAttempt.current = 0;
        flushQueue();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { type, payload } = msg;
          const handlers = handlersRef.current.get(type);
          if (handlers) {
            handlers.forEach(handler => {
              try { handler(payload); } catch (e) { console.error("WS handler error:", e); }
            });
          }
        } catch (e) {
          console.error("WS parse error:", e);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setReady(false);
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
        reconnectAttempt.current++;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => { ws.close(); };
    }

    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer);
      messageQueue.current = [];
      ws.close();
    };
  }, [url]);

  const send = useCallback((type: string, data: Record<string, unknown> = {}) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...data }));
    } else {
      if (messageQueue.current.length >= MAX_QUEUE_SIZE) {
        messageQueue.current.shift();
      }
      messageQueue.current.push({ type, data });
    }
  }, []);

  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);
    return () => { handlersRef.current.get(type)?.delete(handler); };
  }, []);

  return useMemo(() => ({ send, subscribe, ready }), [send, subscribe, ready]);
}
