import { createFileRoute } from "@tanstack/react-router";
import { useState, type CSSProperties, type FormEvent } from "react";
import { useFadeUp } from "@/hooks/useFadeUp";

/* -------------------------------------------------------------------------- */
/*  CONFIGURAÇÃO DO EVENTO — tudo que muda fica aqui, nada espalhado na página */
/*  Itens marcados com TODO ainda precisam ser confirmados.                   */
/* -------------------------------------------------------------------------- */

const EVENT = {
  brand: "Altta",
  // TODO: nome definitivo do evento
  name: "Encontro de Cases",
  tagline:
    "Uma noite fechada com 3 grandes cases e as tendências que vão definir o seu consultório.",
  dateLabel: "26 de novembro",
  dateShort: "26/11",
  weekday: "Quinta-feira",
  // TODO: confirmar horário (a conversa dizia "6h" — manhã ou 18h?)
  timeLabel: "18h",
  // TODO: nome e endereço do restaurante
  venueName: "Restaurante a confirmar",
  venueAddress: "Rio de Janeiro, RJ",
  seats: 30,
  // Prazo final de confirmação (para fechar número com o restaurante)
  rsvpDeadline: "16/11",
  // Data/hora para o botão "Adicionar à agenda" (ISO local, sem fuso). TODO: ajustar com o horário real.
  calendarStart: "20261126T180000",
  calendarEnd: "20261126T213000",
};

// Cores da página (escopadas aqui — não afetam as outras rotas do site).
// TODO: trocar pelas cores da marca Altta.
const THEME: CSSProperties & Record<string, string> = {
  "--background": "#090909",
  "--surface": "#141414",
  "--surface-2": "#1c1c1c",
  "--border": "#262626",
  "--brand": "#e85d24",
  "--brand-hot": "#ff7a3d",
};

// Para onde a confirmação é enviada (n8n, Make, Zapier, etc.).
// TODO: preencher. Enquanto vazio, o envio só funciona em ambiente de desenvolvimento.
const RSVP_WEBHOOK_URL = "";

export const Route = createFileRoute("/evento")({
  // ?ref=nome-do-doutor identifica quem convidou; ?c=1 marca que é o convite do acompanhante
  validateSearch: (search: Record<string, unknown>) => ({
    ref:
      typeof search.ref === "string" && search.ref.trim()
        ? search.ref.trim().slice(0, 80)
        : undefined,
    c: search.c === "1" || search.c === 1 ? ("1" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: `${EVENT.name} — ${EVENT.brand} · ${EVENT.dateShort}` },
      {
        name: "description",
        content: `Convite exclusivo: ${EVENT.name}, ${EVENT.weekday}, ${EVENT.dateLabel}. Lugares limitados.`,
      },
      // Evento fechado para convidados: não aparece em buscadores.
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: `${EVENT.name} — ${EVENT.brand}` },
      { property: "og:description", content: "Convite exclusivo. Lugares limitados." },
    ],
  }),
  component: Evento,
});

const CASES = [
  {
    n: "01",
    title: "Big Case",
    text: "Um cliente conta, com números reais, o caminho que levou ao resultado.",
  },
  {
    n: "02",
    title: "Big Case",
    text: "Do desafio à virada: o que mudou na rotina e no faturamento.",
  },
  {
    n: "03",
    title: "Big Case",
    text: "Os erros, os ajustes e o que ele faria diferente desde o primeiro dia.",
  },
];

const PROGRAMA = [
  "Recepção e boas-vindas",
  "Abertura",
  "Os 3 Big Cases",
  "Tendências para o seu consultório",
  "Jantar e networking",
];

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// "dra-maria-silva" -> "Dra Maria Silva"
function prettifyRef(ref: string) {
  return ref.replace(/[-_]+/g, " ").replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

function calendarUrl() {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${EVENT.name} — ${EVENT.brand}`,
    dates: `${EVENT.calendarStart}/${EVENT.calendarEnd}`,
    location: `${EVENT.venueName}, ${EVENT.venueAddress}`,
    details: "Evento fechado para convidados.",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function Evento() {
  useFadeUp();
  const { ref, c } = Route.useSearch();
  const isGuest = c === "1";

  const [nome, setNome] = useState("");
  const [phone, setPhone] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [instagram, setInstagram] = useState("");
  const [convidadoPor, setConvidadoPor] = useState(ref ? prettifyRef(ref) : "");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (nome.trim().split(/\s+/).length < 2) return setErr("Informe nome e sobrenome.");
    if (phone.replace(/\D/g, "").length < 10) return setErr("WhatsApp inválido.");
    if (!especialidade.trim()) return setErr("Informe sua especialidade.");
    if (isGuest && !convidadoPor.trim()) return setErr("Informe quem te convidou.");

    setErr("");
    setLoading(true);

    const payload = {
      evento: EVENT.name,
      data_evento: EVENT.dateShort,
      tipo: isGuest ? "convidado" : "cliente",
      nome: nome.trim(),
      whatsapp: phone.replace(/\D/g, ""),
      especialidade: especialidade.trim(),
      instagram: instagram.trim()
        ? instagram.trim().startsWith("@")
          ? instagram.trim()
          : `@${instagram.trim()}`
        : "",
      convidado_por: convidadoPor.trim(),
      ref: ref ?? "",
      data_confirmacao: new Date().toISOString(),
    };

    try {
      if (RSVP_WEBHOOK_URL) {
        const res = await fetch(RSVP_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Webhook respondeu ${res.status}`);
      } else if (import.meta.env.DEV) {
        // Sem destino configurado: só simula em desenvolvimento, para não perder confirmações em produção.
        console.warn("[evento] RSVP_WEBHOOK_URL vazio — confirmação não enviada:", payload);
      } else {
        throw new Error("RSVP_WEBHOOK_URL não configurado");
      }
      setConfirmed(true);
    } catch {
      setErr("Não conseguimos registrar sua confirmação agora. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-1 focus:ring-brand";

  return (
    <div style={THEME} className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[480px] pb-16">
        {/* Barra de topo */}
        <div className="w-full bg-brand px-3 py-2 text-center font-condensed text-[12px] font-semibold uppercase tracking-wider text-white">
          Convite exclusivo · Lugares limitados
        </div>

        {/* Hero */}
        <section className="px-5 pt-10 text-center">
          <p className="font-condensed text-[13px] font-semibold uppercase tracking-[0.35em] text-brand">
            {EVENT.brand} apresenta
          </p>
          <h1 className="font-display mt-4 text-[56px] leading-[0.95]">
            {EVENT.name.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="bg-gradient-to-r from-brand to-brand-hot bg-clip-text text-transparent">
              {EVENT.name.split(" ").slice(-1)}
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-[360px] text-[16px] leading-snug text-foreground/85">
            {EVENT.tagline}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[`${EVENT.weekday}, ${EVENT.dateShort}`, EVENT.timeLabel, "Rio de Janeiro"].map(
              (p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] text-foreground/90"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  {p}
                </span>
              ),
            )}
          </div>

          <a
            href="#confirmar"
            className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-br from-brand-hot via-brand to-[#c44a18] px-5 py-4 font-condensed text-[18px] font-bold uppercase tracking-wider text-white shadow-[0_0_40px_rgba(232,93,36,0.35)]"
          >
            Confirmar minha presença
          </a>
          <p className="mt-3 text-[12px] text-muted-foreground">
            {EVENT.seats} lugares · confirmação até {EVENT.rsvpDeadline}
          </p>
        </section>

        {/* O que esperar */}
        <section className="fade-up px-5 pt-14">
          <h2 className="font-display text-[34px] leading-none">
            O que você vai <span className="text-brand">viver</span>
          </h2>
          <div className="mt-5 space-y-3">
            {CASES.map((c) => (
              <div key={c.n} className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
                <span className="font-display text-[34px] leading-none text-brand">{c.n}</span>
                <div>
                  <h3 className="font-condensed text-[17px] font-bold uppercase tracking-wide">
                    {c.title}
                  </h3>
                  <p className="mt-1 text-[14px] leading-snug text-muted-foreground">{c.text}</p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-brand/40 bg-surface-2 p-4">
              <h3 className="font-condensed text-[17px] font-bold uppercase tracking-wide text-brand">
                Conteúdo de tendências
              </h3>
              <p className="mt-1 text-[14px] leading-snug text-muted-foreground">
                O que está mudando no mercado e como se posicionar antes de todo mundo.
              </p>
            </div>
          </div>
        </section>

        {/* Programação */}
        <section className="fade-up px-5 pt-14">
          <h2 className="font-display text-[34px] leading-none">
            A <span className="text-brand">noite</span>
          </h2>
          <ol className="mt-5 space-y-0">
            {PROGRAMA.map((item, i) => (
              <li
                key={item}
                className="flex items-center gap-4 border-b border-border py-3.5 last:border-b-0"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 font-condensed text-[13px] font-bold text-brand">
                  {i + 1}
                </span>
                <span className="text-[15px]">{item}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-2xl border border-border bg-surface p-4 text-[14px] leading-snug text-muted-foreground">
            <strong className="text-foreground">{EVENT.venueName}</strong>
            <br />
            {EVENT.venueAddress}
          </div>
        </section>

        {/* Confirmação */}
        <section id="confirmar" className="fade-up scroll-mt-4 px-5 pt-14">
          <div className="rounded-3xl border border-border bg-surface p-5">
            {confirmed ? (
              <div className="py-4 text-center">
                <div className="animate-pop-in mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-[0_0_50px_rgba(232,93,36,0.5)]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
                  </svg>
                </div>
                <h2 className="font-display mt-5 text-[38px] leading-none">Presença confirmada</h2>
                <p className="mt-3 text-[15px] text-muted-foreground">
                  Nos vemos {EVENT.weekday.toLowerCase()}, dia {EVENT.dateShort}, às{" "}
                  {EVENT.timeLabel}.
                </p>
                <a
                  href={calendarUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-brand px-5 py-3.5 font-condensed text-[16px] font-bold uppercase tracking-wider text-brand"
                >
                  Adicionar à agenda
                </a>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <h2 className="font-display text-[34px] leading-none">
                  Confirme sua <span className="text-brand">presença</span>
                </h2>
                <p className="mt-2 text-[14px] text-muted-foreground">
                  {isGuest
                    ? "Você recebeu um convite como acompanhante. Preencha para garantir seu lugar."
                    : "Leva menos de um minuto. Seu acompanhante confirma pelo convite dele."}
                </p>

                <div className="mt-5 space-y-3">
                  <input
                    className={inputCls}
                    placeholder="Nome e sobrenome"
                    autoComplete="name"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                  <input
                    className={inputCls}
                    placeholder="WhatsApp"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                  />
                  <input
                    className={inputCls}
                    placeholder="Especialidade"
                    value={especialidade}
                    onChange={(e) => setEspecialidade(e.target.value)}
                  />
                  <input
                    className={inputCls}
                    placeholder="Instagram (opcional)"
                    autoCapitalize="none"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                  {isGuest && (
                    <input
                      className={inputCls}
                      placeholder="Quem te convidou?"
                      value={convidadoPor}
                      onChange={(e) => setConvidadoPor(e.target.value)}
                    />
                  )}
                </div>

                {err && (
                  <p role="alert" className="mt-3 text-[13px] text-red-400">
                    {err}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-br from-brand-hot via-brand to-[#c44a18] px-5 py-4 font-condensed text-[18px] font-bold uppercase tracking-wider text-white shadow-[0_0_40px_rgba(232,93,36,0.35)] disabled:opacity-60"
                >
                  {loading ? "Confirmando..." : "Confirmar presença"}
                </button>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  🔒 Seus dados são usados só para organizar o evento.
                </p>
              </form>
            )}
          </div>
        </section>

        <p className="px-5 pt-10 text-center text-[11px] text-muted-foreground">
          Evento fechado para convidados · Este convite é pessoal e intransferível.
        </p>
      </div>
    </div>
  );
}
