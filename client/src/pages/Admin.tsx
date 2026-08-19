import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { MenuManager } from "@/components/admin/MenuManager";
import { StaffManager } from "@/components/admin/StaffManager";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { canManageCatalog, type OperationalRole } from "@shared/permissions";

export function AdminView({ actorRole }: { actorRole: OperationalRole }) {
  if (!canManageCatalog(actorRole)) {
    return (
      <section className="mx-auto max-w-lg rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-8 text-center text-[#481e1f] shadow-sm">
        <h1 className="font-display text-3xl font-semibold">Acesso administrativo necessário</h1>
        <p className="mt-3 text-sm leading-6 text-[#6b4c42]">Somente administradores podem gerenciar o cardápio, a equipe e as configurações da Marmitas TB.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-[#481e1f]">
      <header className="rounded-3xl bg-[#481e1f] p-6 text-[#fffaf1] shadow-lg md:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ffc94f]">Gestão Marmitas TB</p>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Administração da loja</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f3dcc7]">Atualize o cardápio, mantenha a equipe preparada e configure a operação de pedidos em um único lugar.</p>
      </header>

      <MenuManager />
      <div className="grid gap-6 xl:grid-cols-2">
        <StaffManager />
        <StoreSettingsForm />
      </div>
    </section>
  );
}

export function getAdminRedirectTarget(role: OperationalRole | undefined): string | null {
  return role === "admin" ? null : "/acesso";
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const redirectTarget = getAdminRedirectTarget(user?.role);
    if (!loading && redirectTarget) setLocation(redirectTarget);
  }, [loading, setLocation, user?.role]);

  if (loading || user?.role !== "admin") return null;

  return (
    <DashboardLayout>
      <AdminView actorRole="admin" />
    </DashboardLayout>
  );
}
