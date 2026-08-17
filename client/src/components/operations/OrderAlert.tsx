import { BellRing, Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { shouldAlert } from "@/services/browserPrint";

export type AlertableOrder = {
  id: number;
  code: string;
  status: string;
  acknowledgedAt: Date | null;
};

type OrderAlertProps = {
  orders: AlertableOrder[];
  onAcknowledge: (orderId: number) => void;
};

function playNotificationTone() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  const context = new window.AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.05, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.18);
  oscillator.addEventListener("ended", () => void context.close());
}

export function shouldPlayNotification(hasInteracted: boolean, newOrderCount: number): boolean {
  return hasInteracted && newOrderCount > 0;
}

export function getAlertRepeatInterval(pendingOrderCount: number): number | null {
  return pendingOrderCount > 0 ? 30_000 : null;
}

export function OrderAlert({ orders, onAcknowledge }: OrderAlertProps) {
  const pendingOrders = orders.filter(shouldAlert);
  const announcedCodes = useRef(new Set<string>());
  const hasInteracted = useRef(false);

  useEffect(() => {
    const markInteraction = () => {
      hasInteracted.current = true;
    };
    window.addEventListener("pointerdown", markInteraction, { once: true });
    window.addEventListener("keydown", markInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", markInteraction);
      window.removeEventListener("keydown", markInteraction);
    };
  }, []);

  useEffect(() => {
    const newOrders = pendingOrders.filter((order) => !announcedCodes.current.has(order.code));
    if (newOrders.length === 0) return;
    newOrders.forEach((order) => announcedCodes.current.add(order.code));
    if (shouldPlayNotification(hasInteracted.current, newOrders.length)) {
      playNotificationTone();
    }
  }, [pendingOrders]);

  useEffect(() => {
    const delay = getAlertRepeatInterval(pendingOrders.length);
    if (!delay) return;
    const interval = window.setInterval(() => {
      if (shouldPlayNotification(hasInteracted.current, pendingOrders.length)) {
        playNotificationTone();
      }
    }, delay);
    return () => window.clearInterval(interval);
  }, [pendingOrders.length]);

  if (pendingOrders.length === 0) return null;

  return (
    <section role="alert" aria-live="assertive" className="rounded-2xl border border-[#f2b4a2] bg-[#fff1eb] p-4 text-[#6f2721] shadow-[0_10px_30px_rgba(168,41,38,0.12)]">
      <div className="flex items-start gap-3">
        <BellRing aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#a82926]" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">Novo pedido confirmado</p>
          <p className="mt-1 text-sm">{pendingOrders.length === 1 ? `A comanda ${pendingOrders[0].code} está pronta para a cozinha.` : `${pendingOrders.length} pedidos aguardam reconhecimento.`}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingOrders.map((order) => (
              <Button key={order.id} type="button" onClick={() => onAcknowledge(order.id)} size="sm" className="bg-[#a82926] text-white hover:bg-[#7e1f1d]">
                <Check aria-hidden="true" className="mr-1.5 size-4" />
                Reconhecer pedido {order.code}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
