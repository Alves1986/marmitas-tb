import { CircleAlert, ClipboardList, LoaderCircle, Printer, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import type { OrderStatus } from "@shared/operations";
import { Button } from "@/components/ui/button";
import { Receipt } from "@/components/operations/Receipt";
import { buildPrintTicketHtml, formatBRL } from "@/lib/printTicket";
import type { PrintTicketInput } from "@/lib/printTicket";
import { trpc } from "@/lib/trpc";
import { printReceipt } from "@/services/browserPrint";

export type OperationalOrder = {
  id: number;
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
  const utils = trpc.useUtils();
  const printedJobIds = useRef(new Set<number>());
  const { data, isLoading, error } = trpc.operations.list.useQuery(undefined, { refetchInterval: 10_000 });
  const { data: printJobs = [] } = trpc.operations.printJobs.useQuery(undefined, { refetchInterval: 10_000 });
  const transition = trpc.operations.transition.useMutation({
    onSuccess: () => void utils.operations.list.invalidate(),
  });
  const markPrintJob = trpc.operations.markPrintJob.useMutation({
    onSuccess: () => void utils.operations.printJobs.invalidate(),
  });
  const queuePrint = trpc.operations.queuePrint.useMutation({
    onSuccess: () => void utils.operations.printJobs.invalidate(),
  });
  const orders = (data ?? []) as OperationalOrder[];

  useEffect(() => {
    onOrdersChange?.(orders);
  }, [onOrdersChange, orders]);

  useEffect(() => {
    for (const printJob of printJobs) {
      if (printedJobIds.current.has(printJob.job.id)) continue;
      const order = orders.find((candidate) => candidate.id === printJob.order.id);
      if (!order) continue;
      printedJobIds.current.add(printJob.job.id);
      try {
        printReceipt(buildReceiptDocument(order));
        markPrintJob.mutate({ printJobId: printJob.job.id, status: "printed", printerName: "Navegador do posto" });
      } catch {
        markPrintJob.mutate({ printJobId: printJob.job.id, status: "failed", printerName: "Navegador do posto" });
      }
    }
  }, [markPrintJob, orders, printJobs]);

  if (isLoading) {
    return <div className="flex min-h-52 items-center justify-center rounded-2xl border border-[#e4d7c4] bg-white"><LoaderCircle aria-label="Carregando pedidos" className="size-6 animate-spin text-[#a82926]" /></div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-[#f2b4a2] bg-[#fff1eb] p-5 text-[#7e1f1d]"><CircleAlert className="mb-2 size-5" /><p className="font-bold">Não foi possível carregar a fila.</p><p className="mt-1 text-sm">{error.message}</p></div>;
  }

  if (orders.length === 0) {
    return <div className="rounded-2xl border border-dashed border-[#d8c5ad] bg-white/60 p-10 text-center"><ClipboardList className="mx-auto size-8 text-[#68703d]" /><p className="mt-3 font-display text-xl font-bold text-[#481e1f]">Nenhum pedido ativo</p><p className="mt-1 text-sm text-[#765f50]">A fila é atualizada automaticamente a cada 10 segundos.</p></div>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {orders.map((order) => {
        const actions = getNextStatusActions(order.status);
        const isMutating = transition.isPending && transition.variables?.orderId === order.id;
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
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-[#eee3d3] pt-4">
              <Button type="button" size="sm" variant="outline" disabled={queuePrint.isPending && queuePrint.variables?.orderId === order.id} className="border-[#c2ad91] text-[#481e1f] hover:bg-[#fff7e8]" onClick={() => queuePrint.mutate(getManualPrintRequest(order.id))}>
                <Printer aria-hidden="true" className="mr-1.5 size-4" />Reimprimir
              </Button>
              {actions.map((action) => <Button key={action.nextStatus} type="button" size="sm" disabled={isMutating} variant={action.nextStatus === "cancelado" ? "outline" : "default"} className={action.nextStatus === "cancelado" ? "border-[#e0ada9] text-[#a82926] hover:bg-[#fff1eb]" : "bg-[#68703d] text-white hover:bg-[#4e5729]"} onClick={() => transition.mutate({ orderId: order.id, nextStatus: action.nextStatus })}>{isMutating ? <RefreshCw aria-hidden="true" className="mr-1.5 size-4 animate-spin" /> : null}{action.label}</Button>)}
            </div>
          </article>
        );
      })}
    </div>
  );
}
