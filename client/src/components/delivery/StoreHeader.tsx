import { ShoppingBag } from "lucide-react";
import { brandAsset } from "@/data/assets";
import { useOrder } from "@/contexts/OrderContext";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function StoreHeader() {
  const { itemCount, setCartOpen } = useOrder();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-900/8 bg-[#fffaf1]/88 backdrop-blur-xl">
      <div className="container flex h-17 items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => scrollToSection("inicio")}
          className="group flex items-center gap-2 text-left"
          aria-label="Voltar ao início"
        >
          <span className="grid size-10 place-items-center overflow-hidden rounded-2xl bg-[#8e1718] shadow-[0_8px_20px_rgba(142,23,24,0.2)] transition-transform duration-200 group-active:scale-95">
            <img src={brandAsset("logo-marmitastb.jpg")} alt="" className="size-full object-cover" />
          </span>
          <span className="leading-none">
            <strong className="font-display block text-[15px] tracking-tight text-[#481e1f]">Marmitas TB</strong>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#68703d]">Telêmaco Borba</span>
          </span>
        </button>

        <nav className="hidden items-center gap-5 text-sm font-semibold text-[#664b3d] md:flex" aria-label="Navegação principal">
          <button type="button" onClick={() => scrollToSection("cardapio")} className="transition-colors hover:text-[#a82926]">Cardápio</button>
          <button type="button" onClick={() => scrollToSection("informacoes")} className="transition-colors hover:text-[#a82926]">Informações</button>
          <button type="button" onClick={() => scrollToSection("contato")} className="transition-colors hover:text-[#a82926]">Contato</button>
        </nav>

        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative inline-flex h-10 items-center gap-2 rounded-full bg-[#481e1f] px-3.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-[#6e2220] active:scale-[0.97]"
          aria-label={`Abrir sacola com ${itemCount} itens`}
        >
          <ShoppingBag className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sacola</span>
          <span className="grid size-5 place-items-center rounded-full bg-[#ffdb87] text-[11px] font-black text-[#481e1f]">{itemCount}</span>
        </button>
      </div>
    </header>
  );
}
