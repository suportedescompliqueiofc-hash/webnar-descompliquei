import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { useFadeUp } from "@/hooks/useFadeUp";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/agendamento")({
  head: () => ({
    meta: [
      { title: "Agende sua Consultoria Gratuita" },
      { name: "description", content: "Escolha o melhor dia e horário para falar com um especialista Descompliquei." },
    ],
  }),
  component: Agendamento,
});

// Dias adicionais disponíveis para agendamento, além de hoje e amanhã (formato yyyy-mm-dd)
const EXTRA_AVAILABLE_DATES = ["2026-07-08", "2026-07-09", "2026-07-10", "2026-07-13", "2026-07-14"];

// Horários disponíveis para qualquer dia habilitado acima
const TIME_SLOTS = [
  { label: "09h", value: "09:00" },
  { label: "11h", value: "11:00" },
  { label: "13h", value: "13:00" },
  { label: "15h", value: "15:00" },
  { label: "17h", value: "17:00" },
];

const QUESTIONS = [
  "Você teria tempo hábil para a consultoria gratuita de até uma hora e meia?",
  "Você de fato tem vontade de dobrar o seu faturamento em menos de 90 dias?",
];

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Um horário só é válido "hoje" se ainda não tiver passado
function isSlotPast(dateIso: string, slotValue: string, now: Date) {
  if (dateIso !== toISODate(now)) return false;
  const [h, m] = slotValue.split(":").map(Number);
  const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  return slotTime.getTime() <= now.getTime();
}

function Agendamento() {
  useFadeUp();
  const [answers, setAnswers] = useState<Array<"sim" | "nao" | null>>(QUESTIONS.map(() => null));
  const [temSocio, setTemSocio] = useState<"sim" | "nao" | null>(null);
  const [socioParticipa, setSocioParticipa] = useState<"sim" | "nao" | null>(null);
  const [declineReason, setDeclineReason] = useState<"padrao" | "socio">("padrao");
  const [declined, setDeclined] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [slotError, setSlotError] = useState("");

  const refreshBooked = async () => {
    const { data, error } = await supabase.from("webinar_agendamentos_v2").select("slot_key");
    if (!error && data) {
      setBookedSlots(new Set(data.map((r) => r.slot_key as string)));
    }
  };

  useEffect(() => {
    if (unlocked) refreshBooked();
  }, [unlocked]);

  useEffect(() => {
    if (date) refreshBooked();
  }, [date]);

  const setAnswer = (index: number, value: "sim" | "nao") => {
    setAnswers((prev) => prev.map((a, i) => (i === index ? value : a)));
  };

  const allAnswered =
    answers.every((a) => a !== null) &&
    temSocio !== null &&
    (temSocio === "nao" || socioParticipa !== null);

  const proceed = () => {
    if (answers.some((a) => a === "nao")) {
      setDeclineReason("padrao");
      setDeclined(true);
      return;
    }
    if (temSocio === "sim" && socioParticipa === "nao") {
      setDeclineReason("socio");
      setDeclined(true);
      return;
    }
    setUnlocked(true);
  };

  const restart = () => {
    setDeclined(false);
    setAnswers(QUESTIONS.map(() => null));
    setTemSocio(null);
    setSocioParticipa(null);
  };

  const now = new Date();
  const todayIso = toISODate(now);
  const availableDates = Array.from(
    new Set([
      todayIso,
      toISODate(addDays(now, 1)),
      ...EXTRA_AVAILABLE_DATES.filter((iso) => iso >= todayIso),
    ])
  );

  const isDayFull = (d: Date) => {
    const iso = toISODate(d);
    return TIME_SLOTS.every((s) => bookedSlots.has(`${iso}_${s.value}`) || isSlotPast(iso, s.value, now));
  };

  const submit = async () => {
    if (!date || !time) return;
    setLoading(true);
    setSlotError("");

    const iso = toISODate(date);
    const slotKey = `${iso}_${time}`;
    const diaLabel = `${capitalize(date.toLocaleDateString("pt-BR", { weekday: "long" }))} • ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
    const nome = sessionStorage.getItem("lead_nome") ?? "";
    const whatsapp = sessionStorage.getItem("lead_whatsapp") ?? "";

    const { error } = await supabase.from("webinar_agendamentos_v2").insert({
      slot_key: slotKey,
      dia_label: diaLabel,
      horario: time,
      nome,
      whatsapp,
    });

    if (error) {
      // Alguém acabou de reservar este horário — bloqueia e pede pra escolher outro
      setBookedSlots((prev) => new Set(prev).add(slotKey));
      setTime("");
      setSlotError("Esse horário acabou de ser reservado. Escolha outro, por favor.");
      setLoading(false);
      return;
    }

    try {
      await fetch("https://webhook.orbevision.shop/webhook/agendamento-descompliquei-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          whatsapp,
          data_agendamento: iso,
          horario: time,
          origem: "agendamento-v2",
          data_confirmacao: new Date().toISOString(),
        }),
      });
    } catch {
      // Segue para a confirmação mesmo se o webhook falhar
    }

    setLoading(false);
    setConfirmed(true);
  };

  if (confirmed && date) {
    const label = date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    const timeLabel = TIME_SLOTS.find((s) => s.value === time)?.label ?? time;
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center bg-background px-5 py-10 text-center text-foreground">
        <div className="animate-pop-in relative flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-[0_0_60px_rgba(232,93,36,0.5)]">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
          </svg>
        </div>
        <h1 className="font-display mt-6 text-[40px] leading-[0.95]">
          Agendamento
          <br />
          <span className="text-gradient-orange">Confirmado!</span>
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground">
          Sua consultoria gratuita está marcada para
        </p>
        <div className="mt-3 rounded-2xl border border-border bg-surface px-5 py-4">
          <p className="font-display text-[24px] capitalize leading-none">{label}</p>
          <p className="mt-1 text-[14px] text-brand">às {timeLabel}</p>
        </div>
        <p className="mt-6 text-[12px] text-muted-foreground">
          🔒 Você receberá a confirmação e o link de acesso pelo WhatsApp informado.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-background px-5 pb-16 pt-10 text-foreground">
      <div className="text-center">
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Falta apenas o agendamento
        </div>
        <h1 className="font-display mt-4 text-[36px] leading-[0.95]">
          Agende sua <span className="text-gradient-orange">Consultoria Gratuita</span>
        </h1>
        {unlocked && (
          <p className="mt-3 text-[15px] text-muted-foreground">
            Escolha o melhor dia e horário para conversar com um especialista
          </p>
        )}
      </div>

      {/* Perguntas de qualificação */}
      {!unlocked && !declined && (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
          <div className="space-y-5">
            {QUESTIONS.map((q, i) => (
              <div key={q}>
                <p className="text-[15px] leading-snug text-foreground/90">{q}</p>
                <YesNoToggle value={answers[i]} onChange={(v) => setAnswer(i, v)} />
              </div>
            ))}

            <div>
              <p className="text-[15px] leading-snug text-foreground/90">
                Seu negócio tem sócio(s)?
              </p>
              <YesNoToggle value={temSocio} onChange={setTemSocio} />
            </div>

            {temSocio === "sim" && (
              <div className="rounded-xl border border-brand/40 bg-brand/5 p-4">
                <p className="text-[13px] leading-snug text-foreground/85">
                  <strong className="text-brand">Atenção:</strong> como essa consultoria trata de
                  decisões estratégicas do negócio, é obrigatório que seu(s) sócio(s) também
                  participem da chamada.
                </p>
                <p className="mt-3 text-[14px] font-semibold text-foreground/90">
                  Seu(s) sócio(s) poderá(ão) participar com você?
                </p>
                <YesNoToggle value={socioParticipa} onChange={setSocioParticipa} />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={proceed}
            disabled={!allAnswered}
            className="glow-orange mt-6 flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-brand to-brand-hot font-condensed text-[15px] font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      )}

      {/* Recusa */}
      {declined && (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-5 text-center">
          <p className="text-[15px] text-foreground/85">
            {declineReason === "socio"
              ? "Essa consultoria envolve decisões estratégicas que precisam do alinhamento de todos os sócios. Assim que puder contar com a presença dele(s) na chamada, volte para agendar."
              : "Essa consultoria é pensada para quem já decidiu crescer e tem esse tempo disponível. Sem problemas — quando fizer sentido pra você, volte aqui."}
          </p>
          <button
            type="button"
            onClick={restart}
            className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-brand px-5 font-condensed text-[14px] font-bold uppercase tracking-wider text-brand"
          >
            Reconsiderar
          </button>
        </div>
      )}

      {/* Calendário */}
      {unlocked && (
        <>
          <div className="mt-8">
            <h4 className="font-display text-[22px]">Escolha o melhor dia</h4>
            <div className="mt-3 flex justify-center rounded-2xl border border-border bg-surface p-2">
              <Calendar
                mode="single"
                locale={ptBR}
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setTime("");
                  setSlotError("");
                }}
                disabled={(d) => !availableDates.includes(toISODate(d)) || isDayFull(d)}
                defaultMonth={now}
                className="text-base [--cell-size:3rem]"
              />
            </div>
          </div>

          {/* Horários */}
          {date && (() => {
            const iso = toISODate(date);
            const visibleSlots = TIME_SLOTS.filter((s) => !isSlotPast(iso, s.value, now));
            return (
              <div className="mt-6">
                <h4 className="font-display text-[22px]">Escolha o horário</h4>
                {visibleSlots.length === 0 ? (
                  <p className="mt-3 text-[13px] text-muted-foreground">
                    Não há mais horários disponíveis hoje. Escolha outro dia.
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {visibleSlots.map((s) => {
                      const slotKey = `${iso}_${s.value}`;
                      const booked = bookedSlots.has(slotKey);
                      const active = time === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          disabled={booked}
                          onClick={() => {
                            setTime(s.value);
                            setSlotError("");
                          }}
                          className={`rounded-xl border px-3 py-3 text-[15px] transition ${
                            booked
                              ? "cursor-not-allowed border-border bg-[#0f0f0f] text-muted-foreground/50 line-through"
                              : active
                                ? "cursor-pointer border-brand text-foreground"
                                : "cursor-pointer border-border bg-[#0f0f0f] text-foreground/80"
                          }`}
                          style={active && !booked ? { background: "rgba(232,93,36,0.07)" } : undefined}
                        >
                          {s.label}
                          {booked && <span className="ml-1 text-[10px] no-underline">(ocupado)</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {slotError && (
            <p className="mt-3 text-center text-[12px] text-brand">{slotError}</p>
          )}

          <button
            onClick={submit}
            disabled={!date || !time || loading}
            className="glow-orange shimmer-btn mt-8 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-hot px-4 font-condensed text-[16px] font-bold uppercase leading-none tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <span className="whitespace-nowrap">Confirmar Agendamento</span>
                <span aria-hidden="true" className="leading-none">→</span>
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            🔒 Seus dados estão seguros · Sem spam
          </p>
        </>
      )}
    </div>
  );
}

function YesNoToggle({
  value,
  onChange,
}: {
  value: "sim" | "nao" | null;
  onChange: (v: "sim" | "nao") => void;
}) {
  return (
    <div className="mt-3 flex gap-3">
      <button
        type="button"
        onClick={() => onChange("sim")}
        className={`flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border font-condensed text-[14px] font-bold uppercase tracking-wider transition ${
          value === "sim" ? "border-brand text-foreground" : "border-border bg-[#0f0f0f] text-foreground/70"
        }`}
        style={value === "sim" ? { background: "rgba(232,93,36,0.1)" } : undefined}
      >
        Sim
      </button>
      <button
        type="button"
        onClick={() => onChange("nao")}
        className={`flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border font-condensed text-[14px] font-bold uppercase tracking-wider transition ${
          value === "nao" ? "border-brand text-foreground" : "border-border bg-[#0f0f0f] text-foreground/70"
        }`}
        style={value === "nao" ? { background: "rgba(232,93,36,0.1)" } : undefined}
      >
        Não
      </button>
    </div>
  );
}
