import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export type StaffMember = {
  id: number;
  name: string | null;
  email: string | null;
  role: "user" | "staff" | "admin";
  lastSignedIn: Date;
};

function roleDescription(role: StaffMember["role"]) {
  if (role === "admin") return "Administrador";
  if (role === "staff") return "Equipe operacional";
  return "Sem acesso operacional";
}

export function StaffManagerView({ members, onUpdateRole, pending = false }: {
  members: StaffMember[];
  onUpdateRole: (input: { userId: number; role: "user" | "staff" }) => void;
  pending?: boolean;
}) {
  return (
    <section aria-labelledby="staff-manager-title" className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 shadow-sm md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#68703d]">Acessos</p>
      <h2 id="staff-manager-title" className="mt-1 font-display text-2xl font-semibold text-[#481e1f]">Equipe operacional</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b4c42]">A pessoa precisa entrar no sistema pelo menos uma vez antes de aparecer nesta lista. Administradores mantêm acesso total; a equipe acessa apenas a fila de pedidos.</p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#ead7bc] bg-white">
        <ul className="divide-y divide-[#f0e4d1]">
          {members.map((member) => (
            <li key={member.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[#481e1f]">{member.name || "Usuário sem nome"}</p>
                <p className="mt-0.5 text-sm text-[#6b4c42]">{member.email || "E-mail não informado"} · {roleDescription(member.role)}</p>
              </div>
              {member.role === "user" && <Button type="button" size="sm" disabled={pending} onClick={() => onUpdateRole({ userId: member.id, role: "staff" })} className="bg-[#68703d] hover:bg-[#566031]">Liberar operação</Button>}
              {member.role === "staff" && <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onUpdateRole({ userId: member.id, role: "user" })}>Revogar operação</Button>}
              {member.role === "admin" && <span className="rounded-full bg-[#f8e9cf] px-3 py-1.5 text-xs font-bold text-[#815213]">Administração total</span>}
            </li>
          ))}
          {members.length === 0 && <li className="p-4 text-sm text-[#6b4c42]">Ainda não há usuários autenticados para gerenciar.</li>}
        </ul>
      </div>
    </section>
  );
}

export function StaffManager() {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.admin.listStaff.useQuery();
  const updateRole = trpc.admin.upsertStaff.useMutation({
    onSuccess: () => utils.admin.listStaff.invalidate(),
  });

  if (isLoading) return <section className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 text-sm text-[#6b4c42]">Carregando equipe…</section>;
  if (error) return <section role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Não foi possível carregar os acessos da equipe.</section>;
  return <StaffManagerView members={(data ?? []) as StaffMember[]} pending={updateRole.isPending} onUpdateRole={(input) => updateRole.mutate(input)} />;
}
