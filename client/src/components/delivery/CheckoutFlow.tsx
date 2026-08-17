import { useState } from "react";
import { ArrowLeft, ArrowRight, Banknote, Bike, Check, CreditCard, MapPin, Package, QrCode, Ticket } from "lucide-react";
import { useForm } from "react-hook-form";
import type { CheckoutDraft, OrderConfirmation, PaymentMethod } from "@shared/order";
import { useOrder } from "@/contexts/OrderContext";
import { formatCurrency } from "@/lib/order";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaymentModeNotice, toPaymentNoticeMode } from "./PaymentModeNotice";
import { toast } from "sonner";

type CheckoutFlowProps = {
  onSuccess: (confirmation: OrderConfirmation, data: { items: ReturnType<typeof useOrder>["items"]; summary: ReturnType<typeof useOrder>["summary"]; deliveryMode: ReturnType<typeof useOrder>["deliveryMode"] }) => void;
  onBack: () => void;
};

const steps = ["Seus dados", "Recebimento", "Pagamento", "Revisão"];

export function CheckoutFlow({ onSuccess, onBack }: CheckoutFlowProps) {
  const { items, summary, deliveryMode, checkoutDraft, setCheckoutDraft } = useOrder();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createOrder = trpc.orders.create.useMutation();
  const confirmTestPayment = trpc.orders.confirmTestPayment.useMutation();
  const storeSettings = trpc.store.publicSettings.useQuery();
  const form = useForm<CheckoutDraft>({ defaultValues: checkoutDraft, mode: "onTouched" });
  const selectedPayment = form.watch("paymentMethod");
  const paymentNoticeMode = toPaymentNoticeMode(storeSettings.data?.paymentMode ?? "test");

  async function nextStep() {
    const fields = step === 0 ? ["name", "phone"] as const : step === 1 && deliveryMode === "delivery" ? ["address", "neighborhood"] as const : step === 2 ? ["paymentMethod"] as const : [] as const;
    const isValid = await form.trigger(fields);
    if (!isValid) return;
    if (step === 2 && !selectedPayment) {
      form.setError("paymentMethod", { message: "Escolha uma forma de pagamento." });
      return;
    }
    setCheckoutDraft(form.getValues());
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function submitOrder() {
    const isValid = await form.trigger();
    if (!isValid || !selectedPayment) return;
    setIsSubmitting(true);
    const customer = form.getValues();
    setCheckoutDraft(customer);
    try {
      const paymentMethod = selectedPayment === "card" ? "credit_card" : selectedPayment === "food_voucher" ? "voucher" : selectedPayment;
      const deliveryAddress = deliveryMode === "delivery"
        ? [customer.address, customer.neighborhood, customer.reference].filter(Boolean).join(" · ")
        : undefined;
      const customerNotes = customer.changeFor ? `Troco solicitado para: ${customer.changeFor}` : undefined;
      const createdOrder = await createOrder.mutateAsync({
        customerName: customer.name,
        customerPhone: customer.phone,
        fulfillmentMethod: deliveryMode,
        deliveryAddress,
        customerNotes,
        subtotalInCents: Math.round(summary.subtotal * 100),
        deliveryFeeInCents: Math.round(summary.deliveryFee * 100),
        totalInCents: Math.round(summary.total * 100),
        paymentMethod,
        items: items.map((item) => ({
          productName: item.name,
          unitPriceInCents: Math.round(item.unitPrice * 100),
          quantity: item.quantity,
          selections: item.selections,
          notes: item.note || undefined,
        })),
      });

      const isTestPayment = paymentMethod !== "cash";
      if (isTestPayment) {
        await confirmTestPayment.mutateAsync({ paymentReference: createdOrder.paymentReference });
      }

      onSuccess({
        orderNumber: createdOrder.code,
        trackingCode: createdOrder.code,
        paymentReference: createdOrder.paymentReference,
        paymentStatus: isTestPayment ? "confirmed" : "pending",
        isTestPayment,
        estimatedTime: deliveryMode === "delivery" ? "45–60 min" : "20–30 min",
        submittedAt: new Date().toISOString(),
      }, { items, summary, deliveryMode });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível confirmar seu pedido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldError = (name: keyof CheckoutDraft) => form.formState.errors[name]?.message;

  return (
    <div className="flex min-h-full flex-col bg-[#fffaf1] p-5 sm:p-7">
      <div><button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#765f50] transition hover:text-[#a82926]"><ArrowLeft className="size-3.5" /> Voltar à sacola</button><p className="mt-5 text-xs font-extrabold uppercase tracking-[0.15em] text-[#a82926]">Finalizar pedido</p><h2 className="font-display mt-1 text-3xl tracking-[-0.04em] text-[#481e1f]">Confira os detalhes.</h2></div>
      <ol className="mt-5 grid grid-cols-4 gap-1" aria-label="Etapas do checkout">{steps.map((label, index) => <li key={label} className="min-w-0"><span className={`block h-1 rounded-full ${index <= step ? "bg-[#a82926]" : "bg-[#ead8c0]"}`} /><span className={`mt-2 block truncate text-[10px] font-bold ${index === step ? "text-[#a82926]" : "text-[#a58f7a]"}`}>{label}</span></li>)}</ol>
      <form className="mt-7 flex flex-1 flex-col" onSubmit={(event) => event.preventDefault()}>
        {step === 0 && <div className="space-y-5"><div><Label htmlFor="checkout-name" className="font-bold text-[#481e1f]">Nome para o pedido</Label><Input id="checkout-name" {...form.register("name", { required: "Informe seu nome." })} placeholder="Como podemos chamar você?" className="mt-2 h-12 border-[#ead8c0] bg-white focus-visible:ring-[#a82926]" />{fieldError("name") && <p className="mt-1.5 text-xs font-semibold text-[#b42318]">{fieldError("name")}</p>}</div><div><Label htmlFor="checkout-phone" className="font-bold text-[#481e1f]">Telefone / WhatsApp</Label><Input id="checkout-phone" inputMode="tel" {...form.register("phone", { minLength: { value: 10, message: "Informe um telefone válido." }, required: "Informe seu telefone." })} placeholder="(42) 99999-9999" className="mt-2 h-12 border-[#ead8c0] bg-white focus-visible:ring-[#a82926]" />{fieldError("phone") && <p className="mt-1.5 text-xs font-semibold text-[#b42318]">{fieldError("phone")}</p>}</div><p className="rounded-xl bg-[#f3ead8] px-3 py-2.5 text-xs leading-relaxed text-[#765f50]">Usaremos esses dados somente para identificar e confirmar este pedido.</p></div>}
        {step === 1 && <div className="space-y-5">{deliveryMode === "delivery" ? <><div className="rounded-2xl bg-[#f7e7d5] px-4 py-3 text-sm text-[#664b3d]"><span className="flex items-center gap-2 font-extrabold text-[#a82926]"><Bike className="size-4" /> Entrega com taxa estimada de {formatCurrency(summary.deliveryFee)}</span><span className="mt-1 block text-xs">Confirme o ponto de entrega para seguirmos.</span></div><div><Label htmlFor="checkout-address" className="font-bold text-[#481e1f]">Endereço</Label><Input id="checkout-address" {...form.register("address", { required: "Informe rua e número." })} placeholder="Rua, número e complemento" className="mt-2 h-12 border-[#ead8c0] bg-white focus-visible:ring-[#a82926]" />{fieldError("address") && <p className="mt-1.5 text-xs font-semibold text-[#b42318]">{fieldError("address")}</p>}</div><div><Label htmlFor="checkout-neighborhood" className="font-bold text-[#481e1f]">Bairro</Label><Input id="checkout-neighborhood" {...form.register("neighborhood", { required: "Informe o bairro." })} placeholder="Ex.: Centro" className="mt-2 h-12 border-[#ead8c0] bg-white focus-visible:ring-[#a82926]" />{fieldError("neighborhood") && <p className="mt-1.5 text-xs font-semibold text-[#b42318]">{fieldError("neighborhood")}</p>}</div><div><Label htmlFor="checkout-reference" className="font-bold text-[#481e1f]">Ponto de referência <span className="font-normal text-[#8f7765]">(opcional)</span></Label><Textarea id="checkout-reference" {...form.register("reference")} placeholder="Ex.: portão azul, em frente à praça" className="mt-2 min-h-20 resize-none border-[#ead8c0] bg-white focus-visible:ring-[#a82926]" /></div></> : <div className="rounded-[1.5rem] bg-[#edf0d5] p-5"><Package className="size-6 text-[#68703d]" /><h3 className="mt-4 text-base font-extrabold text-[#354022]">Retirada no local</h3><p className="mt-2 text-sm leading-relaxed text-[#596437]">Assim que o pedido for confirmado, você receberá uma estimativa de preparo. Leve o número do pedido para a retirada.</p><p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#fffaf1]/75 px-3 py-2 text-xs font-bold text-[#596437]"><MapPin className="size-3.5" /> Marmitas TB · Telêmaco Borba/PR</p></div>}</div>}
        {step === 2 && <div className="space-y-3"><PaymentModeNotice mode={paymentNoticeMode} /><p className="text-sm leading-relaxed text-[#765f50]">Selecione como pretende pagar. A confirmação final será feita pelo atendimento.</p><PaymentOption value="pix" title="PIX" description="Receba a cobrança por QR Code ou chave após a confirmação do pedido." icon={<QrCode className="size-5" />} selected={selectedPayment} onSelect={(value) => form.setValue("paymentMethod", value, { shouldValidate: true })} /><PaymentOption value="cash" title="Dinheiro" description="Informe o troco na observação do pedido." icon={<Banknote className="size-5" />} selected={selectedPayment} onSelect={(value) => form.setValue("paymentMethod", value, { shouldValidate: true })} /><PaymentOption value="card" title="Cartão" description="Débito ou crédito na entrega/retirada." icon={<CreditCard className="size-5" />} selected={selectedPayment} onSelect={(value) => form.setValue("paymentMethod", value, { shouldValidate: true })} /><PaymentOption value="food_voucher" title="Voucher alimentação" description="Alelo, Pluxee, Sodexo, VR e Ticket, sujeitos à validação." icon={<Ticket className="size-5" />} selected={selectedPayment} onSelect={(value) => form.setValue("paymentMethod", value, { shouldValidate: true })} />{selectedPayment === "cash" && <div className="pt-2"><Label htmlFor="change-for" className="font-bold text-[#481e1f]">Precisa de troco para quanto? <span className="font-normal text-[#8f7765]">(opcional)</span></Label><Input id="change-for" {...form.register("changeFor")} inputMode="decimal" placeholder="Ex.: R$ 50,00" className="mt-2 h-12 border-[#ead8c0] bg-white focus-visible:ring-[#a82926]" /></div>}{fieldError("paymentMethod") && <p className="text-xs font-semibold text-[#b42318]">{fieldError("paymentMethod")}</p>}</div>}
        {step === 3 && <div className="space-y-4"><PaymentModeNotice mode={paymentNoticeMode} /><div className="rounded-2xl border border-[#ead8c0] bg-white p-4"><div className="flex items-center justify-between"><h3 className="font-extrabold text-[#481e1f]">Itens do pedido</h3><span className="text-xs font-bold text-[#a82926]">{items.length} itens</span></div><div className="mt-3 space-y-3">{items.map((item) => <div key={item.id} className="text-sm"><div className="flex justify-between gap-3 font-semibold text-[#664b3d]"><span>{item.quantity}× {item.name}</span><span>{formatCurrency(item.unitPrice * item.quantity)}</span></div>{item.selections.length > 0 && <p className="mt-0.5 text-xs text-[#9b806c]">{item.selections.map((selection) => selection.optionLabel).join(" · ")}</p>}{item.note && <p className="mt-0.5 text-xs italic text-[#9b806c]">Obs.: {item.note}</p>}</div>)}</div><div className="mt-4 space-y-1 border-t border-[#f0e4d0] pt-3 text-sm text-[#765f50]"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(summary.subtotal)}</span></div><div className="flex justify-between"><span>{deliveryMode === "delivery" ? "Entrega estimada" : "Retirada"}</span><span>{formatCurrency(summary.deliveryFee)}</span></div><div className="mt-2 flex justify-between text-base font-black text-[#a82926]"><span>Total</span><span>{formatCurrency(summary.total)}</span></div></div></div><div className="rounded-2xl bg-[#f3ead8] p-4 text-sm text-[#664b3d]"><span className="font-extrabold">{form.watch("name") || "Cliente"}</span><span className="block text-xs text-[#806859]">{deliveryMode === "delivery" ? `${form.watch("address")}, ${form.watch("neighborhood")}` : "Retirada no local"} · {selectedPayment === "cash" ? "Dinheiro" : selectedPayment === "pix" ? "PIX" : selectedPayment === "card" ? "Cartão" : "Voucher alimentação"}</span></div></div>}
        <div className="mt-auto flex gap-3 pt-7">{step > 0 && <Button type="button" variant="outline" aria-label="Voltar à etapa anterior" onClick={() => setStep((current) => current - 1)} className="h-12 rounded-xl border-[#d6bca1] bg-transparent text-[#664b3d] hover:bg-[#f1e4cc]"><ArrowLeft className="size-4" /></Button>}{step < 3 ? <Button type="button" onClick={nextStep} className="h-12 flex-1 rounded-xl bg-[#a82926] text-sm font-extrabold text-white hover:bg-[#8e1718]">Continuar <ArrowRight className="ml-2 size-4" /></Button> : <Button type="button" disabled={isSubmitting} onClick={submitOrder} className="h-12 flex-1 rounded-xl bg-[#68703d] text-sm font-extrabold text-white hover:bg-[#57622f]">{isSubmitting ? "Confirmando..." : "Confirmar pedido"}<Check className="ml-2 size-4" /></Button>}</div>
      </form>
    </div>
  );
}

function PaymentOption({ value, title, description, icon, selected, onSelect }: { value: PaymentMethod; title: string; description: string; icon: React.ReactNode; selected: CheckoutDraft["paymentMethod"]; onSelect: (value: PaymentMethod) => void }) {
  const isSelected = selected === value;
  return <button type="button" aria-pressed={isSelected} onClick={() => onSelect(value)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${isSelected ? "border-[#a82926] bg-[#fff0df]" : "border-[#ead8c0] bg-white hover:border-[#d5b793]"}`}><span className={`grid size-10 place-items-center rounded-xl ${isSelected ? "bg-[#a82926] text-white" : "bg-[#f3ead8] text-[#765f50]"}`}>{icon}</span><span className="flex-1"><span className="block text-sm font-extrabold text-[#481e1f]">{title}</span><span className="mt-0.5 block text-xs leading-relaxed text-[#806859]">{description}</span></span><span className={`grid size-5 place-items-center rounded-full border ${isSelected ? "border-[#a82926] bg-[#a82926] text-white" : "border-[#cfb99d]"}`}>{isSelected && <Check className="size-3.5" />}</span></button>;
}
