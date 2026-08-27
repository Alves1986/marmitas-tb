import { ArrowLeft, ChefHat, ClipboardList, LayoutDashboard, LockKeyhole, LogIn, PackageSearch, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { canAccessOperation } from "@shared/permissions";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { OrderAlert } from "@/components/operations/OrderAlert";
import { OrderQueue, type OperationalOrder } from "@/components/operations/OrderQueue";
import { trpc } from "@/lib/trpc";
import { isVercelRuntime } from "@/lib/runtimeConfig";
import { vercelOperationsService } from "@/services/operationsService";

type OperationsAccessGateProps = {
  role?: "user" | "admin" | "staff" | null;
  children: React.ReactNode;
};

export function OperationsAccessGate({ role, children }: OperationsAccessGateProps) {
  if (role && canAccessOperation(role)) return <>{children}</>;

  return (
    <main className="grid min-h-screen place-items-center bg-[#fffaf1] p-6 text-center">
      <section className="max-w-md rounded-3xl border border-[#ead9c0] bg-white p-8 shadow-[0_18px_50px_rgba(72,30,31,0.10)]">
        <LockKeyhole aria-hidden="true" className="mx-auto size-9 text-[#a82926]" />
        <h1 className="mt-4 font-display text-3xl font-bold text-[#481e1f]">Acesso restrito</h1>
        <p className="mt-3 text-sm leading-6 text-[#765f50]">Esta área é exclusiva para administradores e equipe operacional da Marmitas TB.</p>
        <Button asChild className="mt-6 bg-[#68703d] text-white hover:bg-[#4e5729]"><a href="/"><ArrowLeft aria-hidden="true" className="mr-2 size-4" />Voltar ao cardápio</a></Button>
      </section>
    </main>
  );
}

export function toAlertableOrders(orders: Array<{ id: string | number; code: string; status: string; acknowledgedAt: Date | null }>) {
  return orders.map((order) => ({
    id: String(order.id),
    code: order.code,
    status: order.status,
    acknowledgedAt: order.acknowledgedAt,
  }));
}

export function toOperationFailureMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível reconhecer o alerta. Tente novamente.";
}

export default function Operations() {
  const { user, loading } = useAuth();
  const useVercelApi = isVercelRuntime();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [orders, setOrders] = useState<OperationalOrder[]>([]);
  const [operationError, setOperationError] = useState<string | null>(null);
  const role = user?.role ?? null;
  const canOperate = Boolean(role && canAccessOperation(role));
  const acknowledge = trpc.operations.acknowledge.useMutation({
    onSuccess: () => void utils.operations.list.invalidate(),
  });

  useEffect(() => {
    if (loading || !user || canOperate) return;
    const timeout = window.setTimeout(() => setLocation("/"), 2_500);
    return () => window.clearTimeout(timeout);
  }, [canOperate, loading, setLocation, user]);

  const onOrdersChange = useCallback((nextOrders: OperationalOrder[]) => {
    setOrders(nextOrders);
  }, []);
  const onAcknowledge = useCallback((orderId: string) => {
    if (!useVercelApi) {
      acknowledge.mutate({ orderId: Number(orderId) });
      return;
    }
    setOperationError(null);
    void vercelOperationsService.acknowledgeAlert(orderId)
      .then(() => {
        setOrders((current) => current.map((order) => order.id === orderId ? { ...order, acknowledgedAt: new Date() } : order));
      })
      .catch((error) => setOperationError(toOperationFailureMessage(error)));
  }, [acknowledge, useVercelApi]);
  const alertOrders = toAlertableOrders(orders);

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-[#fffaf1]"><ClipboardList aria-label="Carregando área operacional" className="size-8 animate-pulse text-[#a82926]" /></main>;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fffaf1] p-6 text-center">
        <section className="max-w-md rounded-3xl border border-[#ead9c0] bg-white p-8 shadow-[0_18px_50px_rgba(72,30,31,0.10)]">
          <LogIn aria-hidden="true" className="mx-auto size-9 text-[#68703d]" />
          <h1 className="mt-4 font-display text-3xl font-bold text-[#481e1f]">Acesso da equipe</h1>
          <p className="mt-3 text-sm leading-6 text-[#765f50]">Entre com a conta autorizada para acompanhar os pedidos em tempo real.</p>
          <Button asChild className="mt-6 bg-[#a82926] text-white hover:bg-[#7e1f1d]"><a href="/acesso">Entrar para operar</a></Button>
        </section>
      </main>
    );
  }

  return (
    <OperationsAccessGate role={role}>
      <main className="min-h-screen bg-[#fffaf1] text-[#481e1f]">
        <header className="border-b border-[#ead9c0] bg-white/80 backdrop-blur">
          <div className="container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#68703d]">Marmitas TB · equipe</p>
              <h1 className="mt-1 font-display text-3xl font-bold">Fila operacional</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className="border-[#c9b28f] text-[#481e1f] hover:bg-[#fff5df]"><a href="/admin"><LayoutDashboard aria-hidden="true" className="mr-2 size-4" />Gestão administrativa</a></Button>
              <Button asChild className="bg-[#a82926] text-white hover:bg-[#7e1f1d]"><a href="/operacao/pdv"><ShoppingBag aria-hidden="true" className="mr-2 size-4" />Abrir PDV de balcão</a></Button>
              <Button asChild variant="outline" className="border-[#c9b28f] text-[#481e1f] hover:bg-[#fff5df]"><a href="/operacao/cozinha"><ChefHat aria-hidden="true" className="mr-2 size-4" />Abrir tela de cozinha</a></Button>
              <Button asChild variant="outline" className="border-[#c9b28f] text-[#481e1f] hover:bg-[#fff5df]"><a href="/operacao/estoque"><PackageSearch aria-hidden="true" className="mr-2 size-4" />Abrir estoque</a></Button>
              <Button asChild variant="outline" className="border-[#c9b28f] text-[#481e1f] hover:bg-[#fff5df]"><a href="/operacao/despesas">Registrar despesa</a></Button>
              <Button asChild variant="outline" className="border-[#c9b28f] text-[#481e1f] hover:bg-[#fff5df]"><a href="/"><ArrowLeft aria-hidden="true" className="mr-2 size-4" />Cardápio</a></Button>
            </div>
          </div>
        </header>

        <div className="container space-y-5 py-7">
          <p className="rounded-xl border border-[#ead7bc] bg-[#fff7e8] px-4 py-3 text-sm text-[#6b4c42]">Lançamentos seguem como rascunho até revisão administrativa.</p>
          {operationError ? <div role="alert" className="rounded-xl border border-[#f2b4a2] bg-[#fff1eb] p-4 text-sm font-medium text-[#7e1f1d]">{operationError}</div> : null}
          <OrderAlert orders={alertOrders} onAcknowledge={onAcknowledge} />
          <OrderQueue onOrdersChange={onOrdersChange} />
        </div>
      </main>
    </OperationsAccessGate>
  );
}
