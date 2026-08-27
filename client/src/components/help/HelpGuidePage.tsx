import { ArrowLeft, BookOpenCheck, Download, ListChecks } from "lucide-react";
import type { HelpGuide } from "@shared/helpContent";

type HelpGuidePageProps = {
  guide: HelpGuide;
};

export function HelpGuidePage({ guide }: HelpGuidePageProps) {
  return (
    <main className="min-h-screen bg-[#fffaf1] pb-16 text-[#481e1f]">
      <header className="border-b border-[#ead9c0] bg-white/90 backdrop-blur">
        <div className="container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#68703d]">Marmitas TB · central de ajuda</p>
            <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-bold"><BookOpenCheck className="size-7 text-[#a82926]" />{guide.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={guide.pdfUrl} target="_blank" rel="noreferrer" aria-label={guide.pdfLabel} className="inline-flex min-h-11 items-center rounded-xl bg-[#68703d] px-4 text-sm font-bold text-white transition hover:bg-[#4e5729]"><Download className="mr-2 size-4" />PDF</a>
            <a href={guide.returnPath} className="inline-flex min-h-11 items-center rounded-xl border border-[#c9b28f] px-4 text-sm font-bold transition hover:bg-[#fff5df]"><ArrowLeft className="mr-2 size-4" />{guide.returnLabel}</a>
          </div>
        </div>
      </header>

      <div className="container grid gap-6 py-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-[#ead9c0] bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-[#765f50]"><ListChecks className="size-4 text-[#a82926]" />Neste guia</p>
          <nav className="mt-3 grid gap-1" aria-label="Seções do tutorial">
            {guide.sections.map((section, index) => <a key={section.id} href={`#${section.id}`} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#664b3d] transition hover:bg-[#fff5df] hover:text-[#a82926]">{index + 1}. {section.title}</a>)}
          </nav>
        </aside>

        <section className="min-w-0">
          <div className="rounded-3xl bg-[#481e1f] p-6 text-[#fff8e9] shadow-[0_16px_38px_rgba(72,30,31,0.14)] sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#d9e19b]">Orientação passo a passo</p>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#fff8e9]/82">{guide.summary}</p>
          </div>

          <div className="mt-6 space-y-5">
            {guide.sections.map((section, index) => (
              <article id={section.id} key={section.id} className="scroll-mt-6 rounded-2xl border border-[#ead9c0] bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#68703d]">Passo {index + 1}</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-[#481e1f]">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#765f50]">{section.body}</p>
                <ol className="mt-4 grid gap-2">
                  {section.steps.map((step, stepIndex) => <li key={step} className="flex gap-3 rounded-xl bg-[#fffaf1] p-3 text-sm leading-5 text-[#664b3d]"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#68703d] text-xs font-black text-white">{stepIndex + 1}</span><span>{step}</span></li>)}
                </ol>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
