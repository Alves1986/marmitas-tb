import { buildPrintTicketText, type PrintTicketInput } from "@/lib/printTicket";

type ReceiptProps = {
  order: PrintTicketInput;
};

export function Receipt({ order }: ReceiptProps) {
  return (
    <article className="receipt-print mx-auto w-full max-w-[420px] rounded-2xl border border-[#ddcfba] bg-white p-5 font-mono text-sm leading-relaxed text-[#201712] shadow-sm">
      <pre className="whitespace-pre-wrap break-words">{buildPrintTicketText(order)}</pre>
    </article>
  );
}
