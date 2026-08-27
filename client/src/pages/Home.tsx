import { Heart, Instagram, MapPin, MessageCircle } from "lucide-react";
import { CartPanel } from "@/components/delivery/CartPanel";
import { Hero } from "@/components/delivery/Hero";
import { MobileCartBar } from "@/components/delivery/OrderActions";
import { ProductCatalog } from "@/components/delivery/ProductCatalog";
import { StoreHeader } from "@/components/delivery/StoreHeader";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fffaf1] pb-22 text-[#481e1f] lg:pb-0">
      <StoreHeader />
      <main>
        <Hero />
        <ProductCatalog />
      </main>
      <footer id="contato" className="border-t border-[#e5d5bc] bg-[#f3ead8] py-10">
        <div className="container flex flex-col justify-between gap-6 text-sm sm:flex-row sm:items-end">
          <div><p className="font-display text-2xl tracking-[-0.035em] text-[#481e1f]">Marmitas TB</p><p className="mt-2 max-w-sm text-xs leading-relaxed text-[#765f50]">Comida caseira para tornar o seu dia mais leve e saboroso, em Telêmaco Borba/PR.</p></div>
          <div className="flex flex-wrap gap-3 text-xs font-bold text-[#664b3d]"><a className="inline-flex items-center gap-1.5 rounded-full bg-[#fffaf1] px-3 py-2 transition hover:text-[#a82926]" href="#informacoes"><MapPin className="size-3.5" /> Telêmaco Borba/PR</a><a className="inline-flex items-center gap-1.5 rounded-full bg-[#fffaf1] px-3 py-2 transition hover:text-[#a82926]" href="https://www.instagram.com" target="_blank" rel="noreferrer"><Instagram className="size-3.5" /> Instagram</a><a className="inline-flex items-center gap-1.5 rounded-full bg-[#fffaf1] px-3 py-2 transition hover:text-[#a82926]" href="#cardapio"><MessageCircle className="size-3.5" /> Faça seu pedido</a></div>
        </div>
        <div className="container mt-8 border-t border-[#ddc9ac] pt-5 text-[11px] text-[#967c66]">Marmitas TB · Cardápio e pedidos online <span className="float-right inline-flex items-center gap-1">feito com <Heart className="size-3 fill-[#a82926] text-[#a82926]" /> em Telêmaco Borba</span></div>
      </footer>
      <CartPanel />
      <MobileCartBar />
    </div>
  );
}
