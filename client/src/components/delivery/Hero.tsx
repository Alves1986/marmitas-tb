import { ArrowDown, Clock3, MapPin, Sparkles } from "lucide-react";

function scrollToMenu() {
  document.getElementById("cardapio")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden bg-[#481e1f] py-11 text-[#fff8e9] sm:py-16 lg:py-21">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="absolute -right-20 -top-32 size-88 rounded-full bg-[#b7372f]/35 blur-3xl" />
      <div className="absolute -bottom-48 left-1/4 size-88 rounded-full bg-[#809044]/25 blur-3xl" />
      <div className="container relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ffefce]/20 bg-[#fff8e9]/10 px-3 py-1.5 text-xs font-bold text-[#ffdf92]">
            <span className="relative flex size-2"><span className="absolute inline-flex size-2 animate-ping rounded-full bg-[#9dad54] opacity-70" /><span className="relative inline-flex size-2 rounded-full bg-[#c6d270]" /></span>
            Pedidos por agendamento
          </div>
          <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.19em] text-[#d9e19b]"><img src="/manus-storage/logo-marmitastb_9d67f9be.jpg" alt="Marmitas TB" className="size-8 rounded-lg object-cover" /><span className="flex items-center gap-2"><Sparkles className="size-3.5" /> Comida de verdade, perto de você</span></div>
          <h1 className="font-display max-w-xl text-5xl leading-[0.96] tracking-[-0.045em] text-[#fff8e9] sm:text-6xl lg:text-7xl">
            Seu almoço com <span className="text-[#ffc94f]">gosto de casa.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#fff8e9]/74 sm:text-lg">
            Marmitas caprichadas, feitas para deixar sua rotina mais saborosa. Escolha, personalize e peça do seu jeito.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={scrollToMenu} className="inline-flex items-center gap-2 rounded-full bg-[#ffc94f] px-5 py-3.5 text-sm font-extrabold text-[#481e1f] shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition duration-200 hover:bg-[#ffdc77] active:scale-[0.97]">
              Ver cardápio <ArrowDown className="size-4" />
            </button>
            <a href="#informacoes" className="inline-flex items-center gap-2 rounded-full border border-[#fff8e9]/22 px-5 py-3.5 text-sm font-bold text-[#fff8e9] transition hover:bg-[#fff8e9]/10">
              Como funciona
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-[#fff8e9]/75">
            <span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-[#c6d270]" /> Almoço: 10h15–15h</span>
            <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-[#c6d270]" /> Telêmaco Borba/PR</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute inset-x-8 bottom-0 h-12 rounded-full bg-black/30 blur-2xl" />
          <div className="relative rotate-[-2deg] rounded-[2rem] border border-[#fff3d4]/15 bg-gradient-to-br from-[#f9d77e] via-[#d9933d] to-[#92411e] p-3 shadow-[0_26px_70px_rgba(0,0,0,0.33)]">
            <div className="rounded-[1.55rem] border border-[#6c2d1f]/15 bg-[#ffecc2] p-4 text-[#481e1f]">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-[#9c4d28]"><span>Prato de hoje</span><span>feito com carinho</span></div>
              <div className="mt-4 grid grid-cols-[1.2fr_0.8fr] gap-3">
                <div className="relative min-h-43 overflow-hidden rounded-3xl bg-[#ad4d27] shadow-inner">
                  <img src="/manus-storage/carne-panela_e0eb82b4.jpg" alt="Carne de panela com purê de batata" className="absolute inset-0 size-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#481e1f]/80 via-[#481e1f]/10 to-transparent" />
                  <p className="absolute inset-x-5 bottom-5 font-display text-2xl leading-none text-[#fff8e9]">Seu prato,<br />seu ritmo.</p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-3xl bg-[#7d8a42] p-4 text-[#fffce8]"><span className="text-3xl" role="img" aria-label="Salada">🥗</span><p className="mt-3 text-xs font-bold">Opções com legumes</p></div>
                  <div className="rounded-3xl bg-[#f5c050] p-4 text-[#5b271d]"><span className="text-3xl" role="img" aria-label="Bebida">🥤</span><p className="mt-3 text-xs font-bold">Combos especiais</p></div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-[#fffaf1]/65 px-4 py-3 text-sm font-semibold text-[#664b3d]">Do tradicional ao fit: escolha a sua favorita.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
