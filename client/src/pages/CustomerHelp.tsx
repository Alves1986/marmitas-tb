import { HelpGuidePage } from "@/components/help/HelpGuidePage";
import { getHelpGuide } from "@shared/helpContent";

export default function CustomerHelp() {
  return <HelpGuidePage guide={getHelpGuide("customer")} />;
}
