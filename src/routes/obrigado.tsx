import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useFadeUp } from "@/hooks/useFadeUp";

export const Route = createFileRoute("/obrigado")({
  head: () => ({
    meta: [
      { title: "Falta apenas 1 passo — Entre no Grupo VIP" },
      { name: "description", content: "Sua inscrição está quase concluída. Entre no Grupo VIP do WhatsApp para garantir sua vaga no webinar." },
    ],
  }),
  component: Obrigado,
});

const WHATSAPP_LINK = "https://chat.whatsapp.com/IB8tkvFhj2VCr8N0Sd67Tu";

function Obrigado() {
  useFadeUp();
  const TARGET = 89;
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 1600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setPct(Math.round(eased * TARGET));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center bg-background px-5 py-10 text-center">
      {/* Check icon */}
      <div className="animate-pop-in relative flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-[0_0_60px_rgba(232,93,36,0.5)]">
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
        </svg>
      </div>

      {/* Progress */}
      <div className="mt-8 w-full">
        <div className="relative h-4 w-full overflow-hidden rounded-full border border-border bg-surface shadow-inner">
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-brand to-brand-hot shadow-[0_0_20px_rgba(232,93,36,0.6)] transition-[width] duration-100 ease-out"
            style={{ width: `${pct}%` }}
          >
            <span className="absolute inset-0 rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] font-semibold uppercase tracking-wider">
          <span className="text-muted-foreground">Inscrição</span>
          <span className="text-brand">{pct}% concluído</span>
        </div>
      </div>

      {/* Green badge */}
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        Vaga reservada
      </div>

      {/* Title */}
      <h1 className="font-display mt-6 text-[56px] leading-[0.9]">
        Falta Apenas
        <br />
        <span className="text-gradient-orange">1 Passo...</span>
      </h1>

      <p className="mt-4 text-[15px] text-muted-foreground">
        Clique no botão abaixo e entre no Grupo VIP do WhatsApp
      </p>

      {/* Pills */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {[
          { text: "02/07", indicator: "date" as const },
          { text: "12h", indicator: "pulse" as const },
          { text: "Online", indicator: "live" as const },
        ].map((p) => (
          <span
            key={p.text}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] text-foreground/90"
          >
            {p.indicator === "date" && (
              <span className="flex h-3 w-3 flex-col overflow-hidden rounded-[3px] border border-brand/70">
                <span className="h-[3px] w-full bg-brand" />
              </span>
            )}
            {p.indicator === "pulse" && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
            )}
            {p.indicator === "live" && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            )}
            {p.text}
          </span>
        ))}
      </div>

      {/* WhatsApp CTA */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="glow-orange shimmer-btn mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-brand-hot via-brand to-[#c44a18] px-5 py-4 text-left text-white"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
          <svg viewBox="0 0 32 32" className="h-6 w-6 fill-current">
            <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.123.555 4.116 1.527 5.85L4 28l7.354-1.494A11.94 11.94 0 0 0 16 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3zm0 21.818c-1.81 0-3.586-.487-5.13-1.41l-.367-.218-4.367.888.93-4.252-.24-.392A9.78 9.78 0 0 1 6.182 15c0-5.42 4.4-9.818 9.819-9.818 5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.399 9.818-9.818 9.818zm5.59-7.32c-.306-.153-1.812-.893-2.092-.995-.28-.103-.484-.153-.689.153-.204.306-.789.995-.967 1.2-.179.204-.357.23-.663.077-.306-.153-1.293-.477-2.463-1.52-.91-.812-1.524-1.815-1.703-2.121-.179-.306-.019-.471.134-.624.138-.137.306-.357.46-.536.153-.179.204-.306.306-.51.102-.205.051-.383-.026-.536-.077-.153-.689-1.662-.944-2.276-.248-.595-.5-.514-.689-.524l-.587-.01a1.124 1.124 0 0 0-.816.383c-.281.306-1.07 1.045-1.07 2.55s1.096 2.96 1.249 3.164c.153.204 2.156 3.293 5.222 4.617.73.315 1.299.503 1.743.644.732.233 1.398.2 1.925.122.587-.088 1.812-.74 2.067-1.456.255-.715.255-1.327.179-1.456-.076-.128-.281-.205-.587-.358z"/>
          </svg>
        </span>
        <span className="flex-1">
          <span className="block font-condensed text-[18px] font-bold uppercase tracking-wider leading-none">
            Entrar no Grupo VIP
          </span>
          <span className="mt-1 block text-[11px] text-white/80">
            WhatsApp · Gratuito · 100 vagas
          </span>
        </span>
      </a>

      <p className="mt-3 text-[11px] text-muted-foreground">
        🔒 Seus dados estão seguros · Não enviamos spam
      </p>

    </div>
  );
}
