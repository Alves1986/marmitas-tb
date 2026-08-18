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
  return "Sem acesso";
}

export function StaffManagerView({ members, onUpdateRole, pending = false, errorMessage }: {
  members: StaffMember[];
  onUpdateRole: (input: { userId: number; role: StaffMember["role"] }) => void;
  pending?: boolean;
  errorMessage?: string;
}) {
  return (
    <section aria-labelledby="staff-manager-title" className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 shadow-sm md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#68703d]">Acessos</p>
      <h2 id="staff-manager-title" className="mt-1 font-display text-2xl font-semibold text-[#481e1f]">Equipe e acessos</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b4c42]">A pessoa precisa entrar no sistema pelo menos uma vez antes de aparecer nesta lista. Defina o acesso de cada membro como administrador, operação ou sem acesso.</p>
      {pending && <p className="mt-3 text-sm font-medium text-[#68703d]" aria-live="polite">Salvando acesso…</p>}
      {errorMessage && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{errorMessage}</p>}
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#ead7bc] bg-white">
        <ul className="divide-y divide-[#f0e4d1]">
          {members.map((member) => (
            <li key={member.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[#481e1f]">{member.name || "Usuário sem nome"}</p>
                <p className="mt-0.5 text-sm text-[#6b4c42]">{member.email || "E-mail não informado"} · {roleDescription(member.role)}</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#481e1f]">
                <span className="sr-only">Papel de {member.name || "usuário sem nome"}</span>
                <select
                  aria-label={`Papel de ${member.name || "usuário sem nome"}`}
                  value={member.role}
                  disabled={pending}
                  onChange={(event) => onUpdateRole({ userId: member.id, role: event.target.value as StaffMember["role"] })}
                  className="min-h-10 rounded-xl border border-[#d8c4a6] bg-white px-3 text-sm font-semibold text-[#481e1f] outline-none transition-shadow focus:ring-2 focus:ring-[#68703d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="user">Sem acesso</option>
                  <option value="staff">Operação</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
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
  return <StaffManagerView members={(data ?? []) as StaffMember[]} pending={updateRole.isPending} errorMessage={updateRole.error?.message} onUpdateRole={(input) => updateRole.mutate(input)} />;
}
