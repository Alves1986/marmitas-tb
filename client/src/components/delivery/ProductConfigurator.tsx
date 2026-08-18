import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import type { CartSelection, Product } from "@shared/order";
import { useOrder } from "@/contexts/OrderContext";
import { formatCurrency } from "@/lib/order";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ProductConfiguratorProps = {
  product: Product | null;
  onOpenChange: (isOpen: boolean) => void;
};

export function ProductConfigurator({ product, onOpenChange }: ProductConfiguratorProps) {
  const { addProduct } = useOrder();
  const [choiceMap, setChoiceMap] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!product) return;
    setChoiceMap({});
    setNote("");
    setQuantity(1);
  }, [product]);

  const selections = useMemo<CartSelection[]>(() => {
    if (!product?.options) return [];
    return product.options.flatMap((group) => {
      const option = group.options.find((entry) => entry.id === choiceMap[group.id]);
      return option ? [{ groupId: group.id, groupLabel: group.label, optionId: option.id, optionLabel: option.label, priceAdjustment: option.priceAdjustment }] : [];
    });
  }, [choiceMap, product]);

  const canAdd = useMemo(() => {
    if (!product?.options) return false;
    return product.options.every((group) => !group.required || Boolean(choiceMap[group.id]));
  }, [choiceMap, product]);

  if (!product) return null;
  const configuredPrice = product.price + selections.reduce((total, selection) => total + (selection.priceAdjustment ?? 0), 0);

  function handleAdd() {
    const activeProduct = product;
    if (!activeProduct) return;
    if (!canAdd) {
      toast.error("Escolha as opções obrigatórias antes de adicionar.");
      return;
    }
    for (let index = 0; index < quantity; index += 1) addProduct(activeProduct, selections, note);
    toast.success(`${activeProduct.name} adicionado à sacola.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={Boolean(product)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[1.7rem] border-[#ead8c0] bg-[#fffaf1] p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-[#ead8c0] px-6 pb-5 pt-6">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={`Foto de ${product.name}`} className="h-48 w-full rounded-2xl object-cover sm:h-56" />
          ) : null}
          <div className="flex items-start justify-between gap-4 pr-7"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a82926]">Personalize seu pedido</p><DialogTitle className="font-display mt-1 text-3xl tracking-[-0.035em] text-[#481e1f]">{product.name}</DialogTitle></div><span className="rounded-full bg-[#f2e6d0] px-3 py-1.5 text-sm font-black text-[#a82926]">{formatCurrency(configuredPrice)}</span></div>
          <DialogDescription className="mt-2 text-sm leading-relaxed text-[#765f50]">{product.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 px-6 py-6">
          {product.options?.map((group) => (
            <fieldset key={group.id}>
              <legend className="text-sm font-extrabold text-[#481e1f]">{group.label} {group.required && <span className="text-[#a82926]">*</span>}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {group.options.map((option) => {
                  const isSelected = choiceMap[group.id] === option.id;
                  return <button key={option.id} type="button" aria-pressed={isSelected} onClick={() => setChoiceMap((current) => ({ ...current, [group.id]: option.id }))} className={`flex min-h-12 items-center justify-between rounded-xl border px-3 text-left text-sm font-semibold transition ${isSelected ? "border-[#a82926] bg-[#fff0df] text-[#731e1d]" : "border-[#ead8c0] bg-white text-[#664b3d] hover:border-[#d3b38d]"}`}><span className="flex items-center gap-2">{isSelected ? <span className="grid size-5 place-items-center rounded-full bg-[#a82926] text-white"><Check className="size-3.5" /></span> : <span className="size-5 rounded-full border border-[#cfb99d]" />}{option.label}</span>{option.priceAdjustment ? <span className="text-xs font-black">+ {formatCurrency(option.priceAdjustment)}</span> : null}</button>;
                })}
              </div>
            </fieldset>
          ))}
          <div><label htmlFor="product-note" className="text-sm font-extrabold text-[#481e1f]">Observações para a cozinha</label><Textarea id="product-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex.: sem cebola, molho à parte..." className="mt-3 min-h-22 resize-none border-[#ead8c0] bg-white text-[#481e1f] placeholder:text-[#a58f7a] focus-visible:ring-[#a82926]" /></div>
        </div>
        <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-[#ead8c0] bg-[#fffaf1] px-6 py-4">
          <div className="inline-flex items-center rounded-xl border border-[#ead8c0] bg-white p-1"><button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="grid size-8 place-items-center rounded-lg text-[#664b3d] hover:bg-[#f4ead8]"><Minus className="size-4" /></button><span className="w-8 text-center text-sm font-black text-[#481e1f]">{quantity}</span><button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantity((current) => current + 1)} className="grid size-8 place-items-center rounded-lg text-[#664b3d] hover:bg-[#f4ead8]"><Plus className="size-4" /></button></div>
          <Button type="button" onClick={handleAdd} className="h-11 rounded-xl bg-[#a82926] px-5 text-sm font-extrabold text-white hover:bg-[#8e1718]">Adicionar · {formatCurrency(configuredPrice * quantity)}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
