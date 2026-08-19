import { CircleAlert, ClipboardList, LoaderCircle, Printer, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderStatus } from "@shared/operations";
import { Button } from "@/components/ui/button";
import { Receipt } from "@/components/operations/Receipt";
import { buildPrintTicketHtml, formatBRL } from "@/lib/printTicket";
import type { PrintTicketInput } from "@/lib/printTicket";
import { trpc } from "@/lib/trpc";
import { isVercelRuntime } from "@/lib/runtimeConfig";
import { printReceipt } from "@/services/browserPrint";
import { vercelOperationsService, type VercelOperationalOrder, type VercelPrintJob } from "@/services/operationsService";

export type OperationalOrder = {
  id: string | number;
  code: string;
  customerName: string;
  customerPhone: string;
  fulfillmentMethod: "delivery" | "pickup";
  deliveryAddress: string | null;
  customerNotes: string | null;
  totalInCents: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  acknowledgedAt: Date | null;
  createdAt: Date;
  items: Array<{
    productName: string;
    quantity: number;
    unitPriceInCents: number;
    notes: string | null;
  }>;
};

export type StatusAction = {
  nextStatus: OrderStatus;
  label: string;
};

const statusActions: Record<OrderStatus, StatusAction[]> = {
  aguardando_pagamento: [],
  confirmado: [
    { nextStatus: "em_preparo", label: "Iniciar preparo" },
    { nextStatus: "cancelado", label: "Cancelar pedido" },
  ],
  em_preparo: [
    { nextStatus: "saiu_para_entrega", label: "Saiu para entrega" },
    { nextStatus: "pronto_para_retirada", label: "Pronto para retirada" },
    { nextStatus: "cancelado", label: "Cancelar pedido" },
  ],
  saiu_para_entrega: [
    { nextStatus: "concluido", label: "Concluir entrega" },
    { nextStatus: "cancelado", label: "Cancelar pedido" },
  ],
  pronto_para_retirada: [
    { nextStatus: "concluido", label: "Concluir retirada" },
    { nextStatus: "cancelado", label: "Cancelar pedido" },
  ],
  concluido: [],
  cancelado: [],
};

const statusLabels: Record<OrderStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  confirmado: "Novo pedido",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Em rota",
  pronto_para_retirada: "Pronto para retirada",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão",
  voucher: "Vale-refeição",
  cash: "Dinheiro",
};

export function getNextStatusActions(status: OrderStatus): StatusAction[] {
  return statusActions[status];
}

export function getManualPrintRequest(orderId: number) {
  return { orderId };
}

export function toPrintFailureMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível registrar a impressão. Tente novamente.";
}

export function toOperationalOrders(orders: VercelOperationalOrder[]): OperationalOrder[] {
  return orders.map((order) => ({
    ...order,
    acknowledgedAt: order.acknowledgedAt ? new Date(order.acknowledgedAt) : null,
    createdAt: new Date(order.createdAt),
  }));
}

function buildReceiptDocument(order: OperationalOrder): string {
  return buildPrintTicketHtml({
    ...order,
    notes: order.customerNotes,
  });
}

export function OrderReceiptPreview({ order }: { order: PrintTicketInput & { customerNotes?: string | null } }) {
  return (
    <details className="mt-4 rounded-xl border border-dashed border-[#d8c5ad] bg-[#fffaf1] p-3">
      <summary className="cursor-pointer text-sm font-bold text-[#4e5729]">Pré-visualizar comanda térmica</summary>
      <div className="mt-3 max-h-80 overflow-auto">
        <Receipt order={{ ...order, notes: order.notes ?? order.customerNotes ?? null }} />
      </div>
    </details>
  );
}

type OrderQueueProps = {
  onOrdersChange?: (orders: OperationalOrder[]) => void;
};

export function OrderQueue({ onOrdersChange }: OrderQueueProps) {
  const useVercelApi = isVercelRuntime();
  const utils = trpc.useUtils();
  const printedJobIds = useRef(new Set<string | number>());
  const legacyQueryOptions = { enabled: !useVercelApi, refetchInterval: (useVercelApi ? false : 10_000) as number | false };
  const { data: legacyData, isLoading: legacyLoading, error: legacyError } = trpc.operations.list.useQuery(undefined, legacyQueryOptions);
  const { data: legacyPrintJobs = [] } = trpc.operations.printJobs.useQuery(undefined, legacyQueryOptions);
  const transition = trpc.operations.transition.useMutation({
    onSuccess: () => void utils.operations.list.invalidate(),
  });
  const markPrintJob = trpc.operations.markPrintJob.useMutation({
    onSuccess: () => void utils.operations.printJobs.invalidate(),
  });
  const queuePrint = trpc.operations.queuePrint.useMutation({
    onSuccess: () => void utils.operations.printJobs.invalidate(),
  });
  const [vercelOrders, setVercelOrders] = useState<OperationalOrder[]>([]);
  const [vercelPrintJobs, setVercelPrintJobs] = useState<VercelPrintJob[]>([]);
  const [vercelLoading, setVercelLoading] = useState(false);
  const [vercelError, setVercelError] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | number | null>(null);
  const [pendingPrintOrderId, setPendingPrintOrderId] = useState<string | number | null>(null);
  const [printFeedback, setPrintFeedback] = useState<Record<string, string>>({});

  const refreshVercelQueue = useCallback(async () => {
    const [orders, jobs] = await Promise.all([vercelOperationsService.listOrders(), vercelOperationsService.listPrintJobs()]);
    setVercelOrders(toOperationalOrders(orders));
    setVercelPrintJobs(jobs);
  }, []);

  useEffect(() => {
    if (!useVercelApi) return;
    let active = true;
    setVercelLoading(true);
    const load = async () => {
      try {
        await refreshVercelQueue();
        if (active) setVercelError(null);
      } catch (error) {
        if (active) setVercelError(error instanceof Error ? error.message : "Não foi possível carregar a fila.");
      } finally {
        if (active) setVercelLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [refreshVercelQueue, useVercelApi]);

  const orders = useVercelApi ? vercelOrders : (legacyData ?? []) as OperationalOrder[];
  const printJobs = useVercelApi
    ? vercelPrintJobs.map((job) => ({ id: job.id, orderId: job.order_id }))
    : legacyPrintJobs.map((printJob) => ({ id: printJob.job.id, orderId: printJob.order.id }));
  const isLoading = useVercelApi ? vercelLoading : legacyLoading;
  const errorMessage = useVercelApi ? vercelError : legacyError?.message;

  const handleTransition = async (orderId: string | number, nextStatus: OrderStatus) => {
    if (!useVercelApi) {
      transition.mutate({ orderId: Number(orderId), nextStatus });
      return;
    }
    setPendingOrderId(orderId);
    try {
      await vercelOperationsService.transitionOrder(String(orderId), nextStatus);
      await refreshVercelQueue();
    } catch (error) {
      setVercelError(error instanceof Error ? error.message : "Não foi possível atualizar o pedido.");
    } finally {
      setPendingOrderId(null);
    }
  };

  const handleReprint = async (order: OperationalOrder) => {
    const orderId = order.id;
    if (!useVercelApi) {
      queuePrint.mutate(getManualPrintRequest(Number(orderId)));
      return;
    }
    setPendingPrintOrderId(orderId);
    let printStatus: "printed" | "failed" = "printed";
    try {
      printReceipt(buildReceiptDocument(order));
      setPrintFeedback((current) => ({
        ...current,
        [String(orderId)]: "A janela de impressão foi aberta. Se ela não aparecer, permita pop-ups neste navegador.",
      }));
    } catch (error) {
      printStatus = "failed";
      setPrintFeedback((current) => ({ ...current, [String(orderId)]: toPrintFailureMessage(error) }));
    }

    try {
      const job = await vercelOperationsService.requeuePrint(String(orderId));
      printedJobIds.current.add(job.id);
      await vercelOperationsService.markPrintJob(job.id, printStatus, "Navegador do posto");
      await refreshVercelQueue();
    } catch (error) {
      setPrintFeedback((current) => ({ ...current, [String(orderId)]: toPrintFailureMessage(error) }));
    } finally {
      setPendingPrintOrderId(null);
    }
  };

  useEffect(() => {
    onOrdersChange?.(orders);
  }, [onOrdersChange, orders]);

  useEffect(() => {
    const finalizePrint = async (printJobId: string | number, status: "printed" | "failed") => {
      try {
        if (useVercelApi) {
          await vercelOperationsService.markPrintJob(String(printJobId), status, "Navegador do posto");
          await refreshVercelQueue();
        } else {
          markPrintJob.mutate({ printJobId: Number(printJobId), status, printerName: "Navegador do posto" });
        }
      } catch (error) {
        printedJobIds.current.delete(printJobId);
        setVercelError(toPrintFailureMessage(error));
      }
    };

    for (const printJob of printJobs) {
      if (printedJobIds.current.has(printJob.id)) continue;
      const order = orders.find((candidate) => String(candidate.id) === String(printJob.orderId));
      if (!order) continue;
      printedJobIds.current.add(printJob.id);
      try {
        printReceipt(buildReceiptDocument(order));
        void finalizePrint(printJob.id, "printed");
      } catch {
        void finalizePrint(printJob.id, "failed");
      }
    }
  }, [markPrintJob, orders, printJobs, refreshVercelQueue, useVercelApi]);

  if (isLoading) {
    return <div className="flex min-h-52 items-center justify-center rounded-2xl border border-[#e4d7c4] bg-white"><LoaderCircle aria-label="Carregando pedidos" className="size-6 animate-spin text-[#a82926]" /></div>;
  }

  if (errorMessage) {
    return <div className="rounded-2xl border border-[#f2b4a2] bg-[#fff1eb] p-5 text-[#7e1f1d]"><CircleAlert className="mb-2 size-5" /><p className="font-bold">Não foi possível carregar a fila.</p><p className="mt-1 text-sm">{errorMessage}</p></div>;
  }

  if (orders.length === 0) {
    return <div className="rounded-2xl border border-dashed border-[#d8c5ad] bg-white/60 p-10 text-center"><ClipboardList className="mx-auto size-8 text-[#68703d]" /><p className="mt-3 font-display text-xl font-bold text-[#481e1f]">Nenhum pedido ativo</p><p className="mt-1 text-sm text-[#765f50]">A fila é atualizada automaticamente a cada 10 segundos.</p></div>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {orders.map((order) => {
        const actions = getNextStatusActions(order.status);
        const isMutating = useVercelApi ? pendingOrderId === order.id : transition.isPending && transition.variables?.orderId === Number(order.id);
        return (
          <article key={order.id} className="rounded-2xl border border-[#dfd0ba] bg-white p-5 shadow-[0_8px_30px_rgba(72,30,31,0.07)]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eee3d3] pb-4">
              <div>
                <p className="font-display text-xl font-bold text-[#481e1f]">{order.code}</p>
                <p className="mt-1 text-sm text-[#765f50]">{order.customerName} · {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <span className="rounded-full bg-[#edf0dd] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#4e5729]">{statusLabels[order.status]}</span>
            </div>

            <div className="mt-4 text-sm text-[#4c382e]">
              <p className="font-bold">{order.fulfillmentMethod === "delivery" ? "Entrega" : "Retirada"}</p>
              <p>{order.fulfillmentMethod === "delivery" ? order.deliveryAddress : "Retirada no balcão"}</p>
              <ul className="mt-4 space-y-2 border-t border-[#eee3d3] pt-3">
                {order.items.map((item, index) => <li key={`${item.productName}-${index}`} className="flex justify-between gap-4"><span>{item.quantity}× {item.productName}</span><span className="whitespace-nowrap font-bold">{formatBRL(item.quantity * item.unitPriceInCents)}</span></li>)}
              </ul>
              {order.customerNotes ? <p className="mt-3 rounded-lg bg-[#fff7e8] p-2 text-xs"><strong>Observação:</strong> {order.customerNotes}</p> : null}
              <p className="mt-4 text-xs"><strong>Pagamento:</strong> {paymentLabels[order.paymentMethod] ?? order.paymentMethod} · {order.paymentStatus === "confirmed" ? "confirmado" : "pendente"} · <strong>Total:</strong> {formatBRL(order.totalInCents)}</p>
              <OrderReceiptPreview order={order} />
              {printFeedback[String(order.id)] ? <p role="status" className="mt-3 rounded-lg bg-[#fff7e8] p-3 text-sm text-[#4c382e]">{printFeedback[String(order.id)]}</p> : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-[#eee3d3] pt-4">
              <Button type="button" size="sm" variant="outline" disabled={useVercelApi ? pendingPrintOrderId === order.id : queuePrint.isPending && queuePrint.variables?.orderId === Number(order.id)} className="border-[#c2ad91] text-[#481e1f] hover:bg-[#fff7e8]" onClick={() => void handleReprint(order)}>
                <Printer aria-hidden="true" className="mr-1.5 size-4" />Reimprimir
              </Button>
              {actions.map((action) => <Button key={action.nextStatus} type="button" size="sm" disabled={isMutating} variant={action.nextStatus === "cancelado" ? "outline" : "default"} className={action.nextStatus === "cancelado" ? "border-[#e0ada9] text-[#a82926] hover:bg-[#fff1eb]" : "bg-[#68703d] text-white hover:bg-[#4e5729]"} onClick={() => void handleTransition(order.id, action.nextStatus)}>{isMutating ? <RefreshCw aria-hidden="true" className="mr-1.5 size-4 animate-spin" /> : null}{action.label}</Button>)}
            </div>
          </article>
        );
      })}
    </div>
  );
}
