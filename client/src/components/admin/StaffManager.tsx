import { FormEvent, useEffect, useState } from "react";
import { isVercelRuntime } from "@/lib/runtimeConfig";
import { trpc } from "@/lib/trpc";
import { createVercelAdminService, type SupabaseStaffRole } from "@/services/adminService";

type StaffRole = "user" | SupabaseStaffRole;
type InternalStaffRole = "staff" | "admin";
export type StaffMember = { id: string | number; name: string | null; email: string | null; role: StaffRole; lastSignedIn?: Date };
const adminService = createVercelAdminService();

function roleDescription(role: StaffRole) {
  return role === "admin" ? "Administrador" : role === "staff" ? "Equipe operacional" : "Sem acesso";
}

type StaffManagerViewProps = {
  members: StaffMember[];
  onUpdateRole: (input: { userId: string | number; role: StaffRole }) => void;
  onCreateMember?: (input: { displayName: string; email: string; role: InternalStaffRole }) => void;
  onInviteMember?: (userId: string | number) => void;
  pending?: boolean;
  errorMessage?: string;
};

export function StaffManagerView({ members, onUpdateRole, onCreateMember, onInviteMember, pending = false, errorMessage }: StaffManagerViewProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InternalStaffRole>("staff");

  function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateMember?.({ displayName: displayName.trim(), email: email.trim(), role });
    setDisplayName("");
    setEmail("");
    setRole("staff");
  }

  return (
    <section aria-labelledby="staff-manager-title" className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 shadow-sm md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#68703d]">Acessos</p>
      <h2 id="staff-manager-title" className="mt-1 font-display text-2xl font-semibold text-[#481e1f]">Equipe e acessos</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b4c42]">Convide apenas pessoas da operação ou gestão. O membro criará a própria senha pelo e-mail de convite, sem que a gestão tenha acesso a ela.</p>

      <form className="mt-5 grid gap-3 rounded-2xl border border-[#ead7bc] bg-white p-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end" onSubmit={submitInvitation}>
        <div className="space-y-1.5">
          <label htmlFor="staff-member-name" className="text-sm font-semibold text-[#481e1f]">Nome do membro</label>
          <input id="staff-member-name" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="min-h-10 w-full rounded-xl border border-[#d8c4a6] bg-white px-3 text-sm text-[#481e1f] outline-none focus:ring-2 focus:ring-[#68703d]" placeholder="Ex.: Equipe Cozinha" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="staff-member-email" className="text-sm font-semibold text-[#481e1f]">E-mail do membro</label>
          <input id="staff-member-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-10 w-full rounded-xl border border-[#d8c4a6] bg-white px-3 text-sm text-[#481e1f] outline-none focus:ring-2 focus:ring-[#68703d]" placeholder="equipe@empresa.com" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="staff-member-role" className="text-sm font-semibold text-[#481e1f]">Papel do novo membro</label>
          <select id="staff-member-role" aria-label="Papel do novo membro" value={role} onChange={(event) => setRole(event.target.value as InternalStaffRole)} className="min-h-10 w-full rounded-xl border border-[#d8c4a6] bg-white px-3 text-sm font-semibold text-[#481e1f] outline-none focus:ring-2 focus:ring-[#68703d]" disabled={pending}>
            <option value="staff">Operação</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <button type="submit" disabled={pending} className="min-h-10 rounded-xl bg-[#a82926] px-4 text-sm font-bold text-white transition-colors hover:bg-[#7e1f1d] disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Enviando…" : "Enviar convite"}</button>
      </form>

      {pending && <p className="mt-3 text-sm font-medium text-[#68703d]" aria-live="polite">Salvando acesso…</p>}
      {errorMessage && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{errorMessage}</p>}

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#ead7bc] bg-white">
        <ul className="divide-y divide-[#f0e4d1]">
          {members.map((member) => {
            const memberName = member.name || "usuário sem nome";
            return (
              <li key={member.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold text-[#481e1f]">{member.name || "Usuário sem nome"}</p>
                  <p className="mt-0.5 text-sm text-[#6b4c42]">{member.email || "E-mail não informado"} · {roleDescription(member.role)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onInviteMember && (member.role === "staff" || member.role === "admin") && (
                    <button type="button" aria-label={`Reenviar convite para ${memberName}`} onClick={() => onInviteMember(member.id)} disabled={pending} className="min-h-10 rounded-xl border border-[#d8c4a6] px-3 text-sm font-semibold text-[#6b4c42] hover:bg-[#fffaf1] disabled:cursor-not-allowed disabled:opacity-60">Reenviar convite</button>
                  )}
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#481e1f]">
                    <span className="sr-only">Papel de {memberName}</span>
                    <select aria-label={`Papel de ${memberName}`} value={member.role} disabled={pending} onChange={(event) => onUpdateRole({ userId: member.id, role: event.target.value as StaffRole })} className="min-h-10 rounded-xl border border-[#d8c4a6] bg-white px-3 text-sm font-semibold text-[#481e1f] outline-none transition-shadow focus:ring-2 focus:ring-[#68703d] disabled:cursor-not-allowed disabled:opacity-60">
                      <option value="user">Sem acesso</option>
                      <option value="customer">Sem acesso</option>
                      <option value="staff">Operação</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </label>
                </div>
              </li>
            );
          })}
          {members.length === 0 && <li className="p-4 text-sm text-[#6b4c42]">Ainda não há membros internos para gerenciar.</li>}
        </ul>
      </div>
    </section>
  );
}

export function StaffManager() {
  const vercelRuntime = isVercelRuntime();
  const utils = trpc.useUtils();
  const legacyQuery = trpc.admin.listStaff.useQuery(undefined, { enabled: !vercelRuntime });
  const legacyUpdate = trpc.admin.upsertStaff.useMutation();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(vercelRuntime);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const loadStaff = async () => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      const data = await adminService.listStaff();
      setMembers(data.map((member) => ({ id: member.id, name: member.display_name, email: null, role: member.role })));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar os acessos da equipe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vercelRuntime) void loadStaff();
  }, [vercelRuntime]);

  if (vercelRuntime && loading) return <section className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 text-sm text-[#6b4c42]">Carregando equipe…</section>;
  if (vercelRuntime && errorMessage) return <section role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{errorMessage}</section>;
  if (!vercelRuntime && legacyQuery.isLoading) return <section className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 text-sm text-[#6b4c42]">Carregando equipe…</section>;
  if (!vercelRuntime && legacyQuery.error) return <section role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Não foi possível carregar os acessos da equipe.</section>;

  const visibleMembers = vercelRuntime ? members : (legacyQuery.data ?? []) as StaffMember[];
  const withPending = (operation: () => Promise<unknown>, fallback: string) => {
    setPending(true);
    setErrorMessage(undefined);
    void operation().then(loadStaff).catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : fallback)).finally(() => setPending(false));
  };
  const saveRole = (input: { userId: string | number; role: StaffRole }) => {
    if (vercelRuntime) {
      withPending(() => adminService.setStaffRole(String(input.userId), input.role === "user" ? "customer" : input.role), "Não foi possível atualizar o acesso.");
      return;
    }
    setPending(true);
    setErrorMessage(undefined);
    void legacyUpdate.mutateAsync({ userId: Number(input.userId), role: input.role === "customer" ? "user" : input.role as "user" | "staff" | "admin" }).then(() => utils.admin.listStaff.invalidate()).catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : "Não foi possível atualizar o acesso.")).finally(() => setPending(false));
  };
  const createMember = (input: { displayName: string; email: string; role: InternalStaffRole }) => {
    if (!vercelRuntime) {
      setErrorMessage("Os convites internos estão disponíveis na operação publicada.");
      return;
    }
    withPending(() => adminService.createStaffMember(input), "Não foi possível enviar o convite do membro.");
  };
  const resendInvite = (userId: string | number) => {
    if (!vercelRuntime) {
      setErrorMessage("Os convites internos estão disponíveis na operação publicada.");
      return;
    }
    withPending(() => adminService.inviteStaffMember(String(userId)), "Não foi possível reenviar o convite.");
  };

  return <StaffManagerView members={visibleMembers} pending={vercelRuntime ? pending : legacyUpdate.isPending || pending} errorMessage={errorMessage ?? legacyUpdate.error?.message} onUpdateRole={saveRole} onCreateMember={createMember} onInviteMember={resendInvite} />;
}
