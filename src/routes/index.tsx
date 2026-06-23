import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import draImg from "@/assets/dra-carollina.jpg";
import { useFadeUp } from "@/hooks/useFadeUp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "De R$20k a R$200k — Webinar Gratuito 02/07" },
      { name: "description", content: "Webinar exclusivo: o método comercial que ninguém te contou. 02 de Julho, 12h. Vagas limitadas." },
      { property: "og:title", content: "De R$20k a R$200k — Webinar Gratuito" },
      { property: "og:description", content: "O método comercial que ninguém te contou. 02/07 · 12h · Online" },
    ],
  }),
  component: Landing,
});

const ESPECIALIDADES = [
  "Medicina Estética",
  "Cirurgião Dentista",
  "Harmonizador Facial",
  "Dentista",
  "Médico",
];

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `( ${d}` : "";
  if (d.length <= 7) return `( ${d.slice(0, 2)} ) ${d.slice(2)}`;
  return `( ${d.slice(0, 2)} ) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function Landing() {
  const navigate = useNavigate();
  useFadeUp();
  const [nome, setNome] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [faturamento, setFaturamento] = useState("");
  
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || nome.trim().split(" ").length < 2) {
      setErr("Informe nome e sobrenome.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setErr("WhatsApp inválido.");
      return;
    }
    if (!especialidade) return setErr("Selecione sua especialidade.");
    if (!faturamento) return setErr("Selecione seu faturamento.");
    if (!instagram.trim()) return setErr("Informe seu @ do Instagram.");

    setErr("");
    setLoading(true);

    try {
      await fetch("https://webhook.orbevision.shop/webhook/webnar-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: phone.replace(/\D/g, ""),
          whatsapp_formatado: phone,
          instagram: instagram.trim().startsWith("@") ? instagram.trim() : `@${instagram.trim()}`,
          especialidade,
          faturamento,
          origem: "landing-page-webinar",
          data_inscricao: new Date().toISOString(),
        }),
      });
    } catch {
      // Segue para /obrigado mesmo se o webhook falhar
    }

    setLoading(false);
    navigate({ to: "/obrigado" });
  };

  const scrollToForm = () => {
    document.getElementById("form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-background pb-24 text-foreground">
      {/* Urgency bar */}
      <div className="sticky top-0 z-50 w-full bg-brand px-3 py-2 text-center font-condensed text-[12px] font-semibold uppercase tracking-wider text-white">
        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white align-middle" />{" "}
        Evento Gratuito · Online · 02/07 · Quarta · 12h · Vagas Limitadas
      </div>

      {/* Hero */}
      <section className="px-5 pt-7">


        <h1 className="font-display mt-5 text-center text-[44px] font-bold leading-[1.02] tracking-tight">
          Você Está <span className="text-gradient-orange">Perdendo R$40 mil por Mês</span> Sem Perceber...
        </h1>

        <p className="mt-4 text-center text-[16px] leading-snug text-foreground/85">
          Veja o método que tirou a clínica da <strong className="text-brand">Dra. Carollina Borges</strong> de <strong>R$20k para R$200k</strong> em <strong>90 dias</strong>.
        </p>

        <div className="mt-5 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-hot px-5 py-2.5 shadow-[0_0_30px_rgba(232,93,36,0.6)] ring-1 ring-white/20">


            <span className="font-condensed text-[16px] font-bold uppercase tracking-[0.2em] text-white">
              Sem Tráfego Pago
            </span>
          </div>
        </div>


        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {[
            { text: "02 de Julho", indicator: "date" as const },
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

        <div className="mt-6">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="animate-progress h-full rounded-full bg-gradient-to-r from-brand to-brand-hot"
              style={{ width: "73%" }}
            />
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            73% das vagas preenchidas
          </p>
        </div>
      </section>

      {/* Form */}
      <section id="form" className="px-5 pt-8">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <h2 className="font-display text-[28px] leading-none">
            Garanta sua vaga
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Preenchimento rápido · Acesso imediato
          </p>

          <div className="mt-5 space-y-4">
            <Field label="Nome e Sobrenome">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="input-base"
              />
            </Field>

            <Field label="WhatsApp">
              <input
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="( 21 ) 98708-3498"
                inputMode="numeric"
                className="input-base"
              />
            </Field>

            <RadioGroup
              label="Especialidade"
              options={ESPECIALIDADES}
              value={especialidade}
              onChange={setEspecialidade}
            />

            <RadioGroup
              label="Faturamento Mensal"
              options={["Até R$15k", "R$15k a R$30k", "R$30k a R$60k", "Mais de R$100k"]}
              value={faturamento}
              onChange={setFaturamento}
            />

            <Field label="@ do Instagram Profissional">
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@sua_clinica"
                autoComplete="off"
                className="input-base"
              />
            </Field>
          </div>

          {err && (
            <p className="mt-4 text-[12px] text-brand">{err}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="glow-orange shimmer-btn mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-hot px-4 font-condensed text-[16px] font-bold uppercase leading-none tracking-wider text-white disabled:opacity-70"
          >
            {loading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <span className="whitespace-nowrap">Quero Garantir Minha Vaga</span>
                <span aria-hidden="true" className="leading-none">→</span>
              </>
            )}
          </button>


          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            🔒 Seus dados estão seguros · Sem spam
          </p>
        </form>
      </section>

      {/* Case section */}
      <section className="mt-12">
        <div className="fade-up relative w-full overflow-hidden" style={{ height: "75vw", maxHeight: 520 }}>
          <img
            src={draImg}
            alt="Dra. Carollina Borges"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
            <span className="font-condensed text-[11px] uppercase tracking-[0.2em] text-brand">
              Case real
            </span>
            <h3 className="font-display mt-1 text-[40px] leading-[0.95]">
              Dra. Carollina
              <br />Borges
            </h3>
          </div>
        </div>

        <div className="px-5">
          <div className="fade-up mt-6 rounded-2xl border border-border bg-surface p-5">
            <span className="font-condensed text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Resultado
            </span>
            <p className="font-display mt-2 text-[36px] leading-none">
              R$20k → <span className="text-gradient-orange">R$200k</span>
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">em 90 dias</p>
          </div>

          <blockquote className="fade-up mt-6 border-l-2 border-brand pl-4 italic text-foreground/90">
            "Eu já tinha tentado de tudo. Quando apliquei o método, meu faturamento simplesmente explodiu — em 90 dias multipliquei por 10."
            <footer className="mt-2 not-italic text-[12px] uppercase tracking-wider text-muted-foreground">
              — Dra. Carollina Borges
            </footer>
          </blockquote>

          <div className="fade-up mt-8">
            <h4 className="font-display text-[24px]">O que você vai aprender</h4>
            <ul className="mt-3 space-y-3">
              {[
                "Como qualificar pacientes que pagam mais",
                "O script de venda que converte sem desconto",
                "Estratégia de precificação premium",
                "Como construir autoridade no digital",
                "O método ACE aplicado passo a passo",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-[15px] leading-snug">
                  <span className="mt-0.5 text-brand">✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="fade-up mt-8">
            <h4 className="font-display text-[24px]">Para quem está cansado de</h4>
            <ul className="mt-3 space-y-3">
              {[
                "Trabalhar muito e faturar pouco",
                "Dar desconto pra fechar venda",
                "Agenda cheia de paciente errado",
                "Não saber escalar o consultório",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-[15px] leading-snug text-muted-foreground">
                  <span className="mt-0.5">✕</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>


        </div>
      </section>

      {/* Sticky CTA */}
      <div
        className={`fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 transition-all duration-300 ${
          showSticky ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        <div className="border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <button
            onClick={scrollToForm}
            className="glow-orange shimmer-btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-hot py-3.5 font-condensed text-[15px] font-bold uppercase tracking-wider text-white"
          >
            Garantir minha vaga gratuita →
          </button>
        </div>
      </div>

      <style>{`
        .input-base {
          width: 100%;
          background: #0f0f0f;
          border: 1px solid #222;
          border-radius: 10px;
          padding: 14px 14px;
          color: #fafafa;
          font-size: 15px;
          outline: none;
          transition: border-color .2s, background .2s;
        }
        .input-base:focus {
          border-color: #e85d24;
          background: rgba(232,93,36,0.05);
        }
        .input-base::placeholder { color: #555; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-condensed text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function RadioGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block font-condensed text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div className="space-y-2">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              type="button"
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-[14px] transition ${
                active
                  ? "border-brand text-foreground"
                  : "border-border bg-[#0f0f0f] text-foreground/80"
              }`}
              style={active ? { background: "rgba(232,93,36,0.07)" } : undefined}
            >
              <span>{opt}</span>
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  active ? "border-brand" : "border-border"
                }`}
              >
                {active && <span className="h-2 w-2 rounded-full bg-brand" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
