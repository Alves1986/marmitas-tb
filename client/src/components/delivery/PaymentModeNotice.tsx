export function toPaymentNoticeMode(paymentMode: "test" | "asaas") {
  return paymentMode === "asaas" ? "official" : "test";
}

export function toPaymentNoticeModeFromConfirmation(isTestPayment: boolean) {
  return isTestPayment ? "test" : "official";
}

export function toPaymentNoticeModeFromProvider(paymentProvider: string | null | undefined) {
  return paymentProvider === "asaas_test" ? "test" : "official";
}

export function PaymentModeNotice({ mode }: { mode: "test" | "official" }) {
  if (mode === "official") {
    return <div role="status" className="rounded-xl border border-[#cbd6ad] bg-[#f2f7e6] px-4 py-3 text-sm leading-6 text-[#445321]"><strong>Pagamento oficial ativo.</strong> A cobrança será processada com segurança pelo Asaas.</div>;
  }
  return <div role="status" className="rounded-xl border border-[#f2cf84] bg-[#fff3d6] px-4 py-3 text-sm leading-6 text-[#70491c]"><strong>Ambiente de teste.</strong> Este pedido é uma simulação: nenhuma cobrança real será realizada.</div>;
}
