import { LoaderCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { HelpGuidePage } from "@/components/help/HelpGuidePage";
import { OperationsAccessGate } from "@/pages/Operations";
import { getHelpGuide } from "@shared/helpContent";

type ManagementHelpContentProps = {
  role?: "user" | "staff" | "admin" | null;
};

export function ManagementHelpContent({ role }: ManagementHelpContentProps) {
  const guide = getHelpGuide("management");
  const returnGuide = role === "staff" ? { ...guide, returnPath: "/operacao", returnLabel: "Voltar para a operação" } : guide;
  return <OperationsAccessGate role={role}><HelpGuidePage guide={returnGuide} /></OperationsAccessGate>;
}

export default function ManagementHelp() {
  const { user, loading } = useAuth();
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fffaf1]"><LoaderCircle className="size-8 animate-spin text-[#a82926]" /></main>;
  return <ManagementHelpContent role={user?.role ?? null} />;
}
