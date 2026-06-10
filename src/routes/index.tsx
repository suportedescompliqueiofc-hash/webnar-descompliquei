import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { LuxuryBackground } from "@/components/LuxuryBackground";
import lupaImg from "../../img/lupa.jpg?url";

export const Route = createFileRoute("/")({
  component: Index,
});

// TODO: replace with the real WhatsApp group link
const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/B7mqNCQmFIp7uF9fX2sdhB";
// Optional: webhook endpoint for form submissions
const WEBHOOK_URL = "https://webhook.orbevision.shop/webhook/forms-pos-webnar";

type Choice = { key: string; label: string };
type Step =
  | { kind: "text"; id: string; title: string; subtitle?: string; placeholder: string; inputType?: string }
  | { kind: "choice"; id: string; title: (name: string) => string; subtitle?: string; choices: Choice[] };

const STEPS: Step[] = [
  { kind: "text", id: "nome", title: "Qual o seu nome?", subtitle: "Digite nome e sobrenome.", placeholder: "Nome e sobrenome" },
  {
    kind: "choice",
    id: "especializacao",
    title: () => "Qual a sua especialização?",
    choices: [
      { key: "A", label: "Médico(a)" },
      { key: "B", label: "Cirurgião(ã) Dentista" },
      { key: "C", label: "Biomédico(a)" },
      { key: "D", label: "Endocrinologista" },
      { key: "E", label: "Outro" },
    ],
  },
  {
    kind: "text",
    id: "whatsapp",
    title: "Qual o seu WhatsApp?",
    subtitle: "Use seu número pessoal — prometemos não fazer spam.",
    placeholder: "(21) 98406-2808",
    inputType: "tel",
  },
  {
    kind: "text",
    id: "instagram",
    title: "Qual o seu @ do Instagram?",
    subtitle: "Se não tiver pessoal, pode usar o da sua clínica.",
    placeholder: "@seu_usuario",
  },
  {
    kind: "choice",
    id: "clinica",
    title: () => "Você tem uma clínica própria hoje?",
    choices: [
      { key: "A", label: "Sim" },
      { key: "B", label: "Não, trabalho em outra clínica ou coworking" },
      { key: "C", label: "Não, sou apenas estudante" },
    ],
  },
  {
    kind: "choice",
    id: "socio",
    title: (name) =>
      `${name ? name.split(" ")[0] : "Você"}, você tem algum sócio ou parceiro de negócios que toma decisão junto com você?`,
    choices: [
      { key: "A", label: "Sim, tenho sócio(a) e não decido sozinho(a)" },
      { key: "B", label: "Sim, tenho sócio(a), mas eu sou o decisor" },
      { key: "C", label: "Não tenho sócio(a) e tomo as decisões sozinho(a)" },
      { key: "D", label: "Não tenho sócio(a), mas meu cônjuge toma as decisões comigo" },
    ],
  },
  {
    kind: "choice",
    id: "faturamento",
    title: () => "Qual é o faturamento médio mensal da sua clínica?",
    choices: [
      { key: "A", label: "Abaixo de R$10 mil" },
      { key: "B", label: "Entre R$10 mil e R$15 mil" },
      { key: "C", label: "Entre R$15 mil e R$30 mil" },
      { key: "D", label: "Entre R$30 mil e R$60 mil" },
      { key: "E", label: "Entre R$60 mil e R$100 mil" },
      { key: "F", label: "Acima de R$300 mil" },
    ],
  },
  {
    kind: "choice",
    id: "gargalo",
    title: () => "Qual é o maior gargalo comercial da sua clínica hoje?",
    choices: [
      { key: "A", label: "Os leads chegam mas somem antes de agendar" },
      { key: "B", label: "Agendam mas não aparecem na consulta" },
      { key: "C", label: "Aparecem mas não fecham o procedimento" },
      { key: "D", label: "Fecham mas o ticket é baixo" },
    ],
  },
];

type Screen = "hero" | "video" | "form" | "done" | "disqualified";

function Logo() {
  return (
    <div className="flex flex-col items-center pt-10 pb-2">
      <span
        className="text-2xl font-light lowercase italic tracking-[0.04em] text-white/90"
        style={{ fontFamily: '"Cormorant Garamond", serif' }}
      >
        descompliquei
      </span>
      <img
        src={lupaImg}
        alt=""
        aria-hidden="true"
        className="mt-1 h-7 w-7 select-none object-contain mix-blend-screen"
        draggable={false}
      />
    </div>
  );
}

function GoldButton({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`group inline-flex items-center justify-between gap-6 rounded-full py-2.5 pl-7 pr-2.5 text-base font-semibold tracking-tight transition-all duration-300 ${
        disabled
          ? "cursor-not-allowed bg-white/30 text-black/40"
          : "cursor-pointer bg-white text-black hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.4)]"
      }`}
    >
      <span>{children}</span>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
          disabled ? "bg-black/20 text-black/40" : "bg-[#C9A84C] text-black group-hover:bg-[#d4b35a]"
        }`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
        )}
      </span>
    </button>
  );
}

function Index() {
  const [screen, setScreen] = useState<Screen>("hero");
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [joining, setJoining] = useState(false);

  const total = STEPS.length;
  const step = STEPS[stepIdx];
  const value = answers[step?.id] ?? "";
  const isValidFullName = (v: string) => {
    const parts = v.trim().split(/\s+/).filter((p) => p.length >= 2);
    return parts.length >= 2;
  };
  const canAdvance =
    step?.id === "nome" ? isValidFullName(value) : value.trim().length > 0;
  const showNameError =
    step?.id === "nome" && value.trim().length > 0 && !isValidFullName(value);
  const name = answers["nome"] ?? "";

  const progress = useMemo(
    () => `${String(stepIdx + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
    [stepIdx, total],
  );

  const setAnswer = (v: string) => setAnswers((a) => ({ ...a, [step.id]: v }));

  const next = async () => {
    if (!canAdvance) return;
    if (step.id === "especializacao" && value === "E") {
      setScreen("disqualified");
      return;
    }
    if (step.id === "clinica" && value === "C") {
      setScreen("disqualified");
      return;
    }
    if (stepIdx < total - 1) {
      setStepIdx((i) => i + 1);
    } else {
      setSubmitting(true);
      if (WEBHOOK_URL) {
        const choiceLabels: Record<string, Record<string, string>> = {
          especializacao: { A: "Médico(a)", B: "Cirurgião(ã) Dentista", C: "Biomédico(a)", D: "Endocrinologista", E: "Outro" },
          clinica: { A: "Sim", B: "Não, trabalho em outra clínica ou coworking", C: "Não, sou apenas estudante" },
          socio: {
            A: "Sim, tenho sócio(a) e não decido sozinho(a)",
            B: "Sim, tenho sócio(a), mas eu sou o decisor",
            C: "Não tenho sócio(a) e tomo as decisões sozinho(a)",
            D: "Não tenho sócio(a), mas meu cônjuge toma as decisões comigo",
          },
          faturamento: {
            A: "Abaixo de R$10 mil",
            B: "Entre R$10 mil e R$15 mil",
            C: "Entre R$15 mil e R$30 mil",
            D: "Entre R$30 mil e R$60 mil",
            E: "Entre R$60 mil e R$100 mil",
            F: "Acima de R$300 mil",
          },
          gargalo: {
            A: "Os leads chegam mas somem antes de agendar",
            B: "Agendam mas não aparecem na consulta",
            C: "Aparecem mas não fecham o procedimento",
            D: "Fecham mas o ticket é baixo",
          },
        };
        const payload = {
          nome: answers.nome ?? "",
          whatsapp: answers.whatsapp ?? "",
          instagram: answers.instagram ?? "",
          especializacao: choiceLabels.especializacao[answers.especializacao] ?? answers.especializacao ?? "",
          clinica_propria: choiceLabels.clinica[answers.clinica] ?? answers.clinica ?? "",
          socio: choiceLabels.socio[answers.socio] ?? answers.socio ?? "",
          faturamento_mensal: choiceLabels.faturamento[answers.faturamento] ?? answers.faturamento ?? "",
          maior_gargalo: choiceLabels.gargalo[answers.gargalo] ?? answers.gargalo ?? "",
          evento: "Webinário 16/06",
          submitted_at: new Date().toISOString(),
        };
        try {
          await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (e) {
          console.error("webhook failed", e);
        }
      }
      setSubmitting(false);
      setScreen("done");
    }
  };

  const prev = () => {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
    else setScreen("video");
  };

  const joinGroup = () => {
    setJoining(true);
    setTimeout(() => {
      window.location.href = WHATSAPP_GROUP_URL;
    }, 1200);
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <LuxuryBackground />

      {/* Top event banner — only on hero */}
      {screen === "hero" && (
        <div className="relative z-20 w-full bg-gradient-to-r from-[#9b7a2a] via-[#C9A84C] to-[#9b7a2a] px-4 py-3 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black sm:text-xs">
            EVENTO GRATUITO · ONLINE · 16/06 · SEGUNDA · 12H · VAGAS LIMITADAS
          </p>
        </div>
      )}

      {screen !== "hero" && <Logo />}

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col items-center justify-center px-6 pb-32 pt-10">
          {screen === "hero" && (
            <section className="text-center animate-[fade-in-up_0.5s_ease-out]">
              <h1 className="text-5xl font-black leading-[1] tracking-tight text-white sm:text-6xl md:text-[5rem]">
                Esse método já <span className="text-[#E8C77A]">dobrou</span> o faturamento de{" "}
                <span className="bg-gradient-to-r from-[#C9A84C] to-[#E8C77A] bg-clip-text text-transparent">
                  +20 clínicas
                </span>{" "}
                de estética
              </h1>
              <p className="mx-auto mt-8 max-w-lg text-base font-light leading-relaxed text-white/70 sm:text-lg">
                Vou abrir um horário exclusivo no webinário do dia{" "}
                <span className="font-semibold text-white">16/06 às 12h</span> para mostrar como sua clínica pode faturar mais sem investir mais em tráfego pago.
              </p>
              <div className="mt-12">
                <GoldButton onClick={() => setScreen("video")}>Garantir minha vaga</GoldButton>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/80">
                  16 de Junho
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C9A84C]" /> 12h
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                </span>
              </div>
            </section>
          )}

          {screen === "video" && (
            <section className="w-full text-center animate-[fade-in-up_0.5s_ease-out]">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                Assista antes de continuar
              </p>
              <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
                Veja o que você vai aprender no{" "}
                <span className="text-[#C9A84C]">dia 16/06</span>
              </h2>
              <div className="mx-auto mt-10 aspect-video w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.06]">
                <iframe
                  src="https://www.youtube.com/embed/YGwhvfFzVVI"
                  title="Descompliquei — Webinário 16/06"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
              <div className="mt-12">
                <GoldButton onClick={() => setScreen("form")}>Continuar</GoldButton>
              </div>
            </section>
          )}

          {screen === "form" && step && (
            <section key={stepIdx} className="w-full text-center animate-[fade-in-slide_0.35s_ease-out]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#C9A84C]">
                Pergunta {stepIdx + 1} de {total}
              </p>

              {step.kind === "text" ? (
                <>
                  <h2 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
                    {step.title}
                  </h2>
                  {step.subtitle && (
                    <p className="mx-auto mt-3 max-w-md text-sm font-light text-white/50">
                      {step.subtitle}
                    </p>
                  )}
                  {step.id === "whatsapp" ? (
                    <div className="mx-auto mt-10 flex w-full max-w-md items-center gap-3 border-b border-white/15 pb-3 focus-within:border-[#C9A84C]">
                      <span className="flex shrink-0 items-center gap-2 text-lg font-light text-white/80 sm:text-xl">
                        <span aria-hidden className="text-xl leading-none">🇧🇷</span>
                        <span>+55</span>
                      </span>
                      <input
                        autoFocus
                        type="tel"
                        inputMode="numeric"
                        value={value}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                          let formatted = digits;
                          if (digits.length > 2 && digits.length <= 7) {
                            formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                          } else if (digits.length > 7) {
                            formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
                          } else if (digits.length > 0) {
                            formatted = `(${digits}`;
                          }
                          setAnswer(formatted);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") next();
                        }}
                        placeholder={step.placeholder}
                        className="w-full bg-transparent text-center text-lg font-light text-white placeholder:text-white/25 focus:outline-none sm:text-xl"
                      />
                    </div>
                  ) : (
                    <input
                      autoFocus
                      type={step.inputType ?? "text"}
                      value={value}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") next();
                      }}
                      placeholder={step.placeholder}
                      className="mx-auto mt-10 block w-full max-w-md border-b border-white/15 bg-transparent pb-3 text-center text-lg font-light text-white placeholder:text-white/25 focus:border-[#C9A84C] focus:outline-none sm:text-xl"
                    />
                  )}
                  {showNameError && (
                    <p className="mx-auto mt-3 max-w-md text-xs font-light text-[#E8C77A]">
                      Por favor, digite seu nome e sobrenome.
                    </p>
                  )}
                  <div className="mt-10 flex justify-center">
                    <GoldButton onClick={next} disabled={!canAdvance} loading={submitting}>
                      {stepIdx === total - 1 ? "Garantir vaga" : "Avançar"}
                    </GoldButton>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mx-auto max-w-xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
                    {step.title(name)}
                  </h2>
                  <div className="mx-auto mt-10 max-w-md space-y-2.5 text-left">
                    {step.choices.map((c) => {
                      const selected = value === c.key;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, [step.id]: c.key }))}
                          className={`group flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all duration-200 ${
                            selected
                              ? "border-[#C9A84C]/60 bg-[#C9A84C]/[0.06]"
                              : "border-white/[0.08] bg-white/[0.015] hover:border-white/20 hover:bg-white/[0.03]"
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-all ${
                              selected
                                ? "border-[#C9A84C] bg-[#C9A84C] text-black"
                                : "border-white/15 text-white/50"
                            }`}
                          >
                            {selected ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : c.key}
                          </span>
                          <span className="text-sm font-light text-white/90 sm:text-[15px]">
                            {c.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-10 flex justify-center">
                    <GoldButton onClick={next} disabled={!canAdvance} loading={submitting}>
                      {stepIdx === total - 1 ? "Garantir vaga" : "Avançar"}
                    </GoldButton>
                  </div>
                </>
              )}
            </section>
          )}

          {screen === "done" && (
            <section className="text-center animate-[fade-in-up_0.6s_ease-out]">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/70 animate-[fade-in_0.5s_ease-out_0.2s_both]">
                Falta apenas um passo
              </p>

              <h2 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-[4rem]">
                Sua vaga está{" "}
                <span className="text-[#C9A84C]">quase garantida</span>
              </h2>

              <p className="mx-auto mt-8 max-w-md text-sm font-light leading-relaxed text-white/60 sm:text-base">
                {name ? `${name.split(" ")[0]}, para` : "Para"} garantir sua presença na aula ao vivo no dia{" "}
                <span className="text-white/90">16/06 — 12h</span>, entre agora no grupo exclusivo do WhatsApp — é por lá que enviaremos os avisos.
              </p>

              <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/[0.06] px-4 py-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C9A84C] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C9A84C]" />
                </span>
                <span className="text-xs font-medium tracking-wide text-[#C9A84C]">
                  Restam apenas 13 vagas no grupo
                </span>
              </div>



              <div className="mt-12">
                <GoldButton onClick={joinGroup} loading={joining}>
                  {joining ? "Abrindo grupo" : "Entrar no grupo do WhatsApp"}
                </GoldButton>
              </div>

              <p className="mt-6 text-xs font-light text-white/30">
                Sua vaga só estará confirmada após entrar no grupo.
              </p>
            </section>
          )}

          {screen === "disqualified" && (
            <section className="text-center animate-[fade-in-up_0.6s_ease-out]">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                Obrigado pelo interesse
              </p>

              <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-[3.5rem]">
                Esta aula é{" "}
                <span className="text-[#C9A84C]">exclusiva</span> para profissionais da saúde estética
              </h2>

              <p className="mx-auto mt-8 max-w-md text-sm font-light leading-relaxed text-white/60 sm:text-base">
                {name ? `${name.split(" ")[0]}, no` : "No"} momento, o método é direcionado apenas para{" "}
                <span className="text-white/90">médicos, cirurgiões-dentistas, biomédicos e endocrinologistas</span>{" "}
                com clínica própria ou em formação.
              </p>

              <p className="mx-auto mt-4 max-w-md text-sm font-light leading-relaxed text-white/50">
                Por isso, não conseguimos liberar sua vaga nesta turma. Agradecemos o seu interesse.
              </p>
            </section>
          )}
      </main>

      {/* footer pill */}
      {screen === "form" && (
        <footer className="fixed inset-x-0 bottom-0 z-20 flex justify-center pb-8">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-2 py-2 backdrop-blur-md">
            <button
              type="button"
              onClick={prev}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold tracking-[0.3em] text-white/80">
              {progress}
            </span>
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance || submitting}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                canAdvance && !submitting
                  ? "text-white/80 hover:bg-white/5 hover:text-white"
                  : "cursor-not-allowed text-white/20"
              }`}
              aria-label="Avançar"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
