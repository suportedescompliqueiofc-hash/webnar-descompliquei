import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import carollinaBorgesImg from "@/assets/evento/carollina-borges.jpg";
import carollinaMoncaoImg from "@/assets/evento/carollina-moncao.jpg";
import tayaneImg from "@/assets/evento/tayane.jpg";
import derekImg from "@/assets/evento/derek.jpg";

/* -------------------------------------------------------------------------- */
/*  CONFIGURAÇÃO DO EVENTO — tudo que muda fica aqui, nada espalhado na página */
/*  Itens marcados com TODO ainda precisam ser confirmados.                   */
/* -------------------------------------------------------------------------- */

const EVENT = {
  brand: "Altta",
  // TODO: nome definitivo do evento (duas linhas no título)
  titleLine1: "Encontro",
  titleLine2: "de Cases",
  name: "Encontro de Cases",
  day: "07",
  month: "Dez",
  year: "2026",
  dateLabel: "7 de dezembro",
  dateShort: "07/12",
  weekday: "Segunda-feira",
  // Horário: 18h30 em ponto (ajustar aqui e em calendarStart/End se mudar)
  timeLabel: "18h30",
  timeNote: "em ponto",
  city: "Nova Iguaçu",
  // Local: Bauru de Nova Iguaçu
  venueName: "Bauru de Nova Iguaçu",
  venueAddress: "R. Arcelino Pereira Neves, 33 - Centro, Nova Iguaçu - RJ, 26220-010",
  seats: 30,
  // Prazo final de confirmação (para fechar o número com o restaurante)
  rsvpDeadline: "23/11",
  // Início/fim para o botão "Adicionar à agenda" (horário local). TODO: ajustar com o horário real.
  calendarStart: "20261207T183000",
  calendarEnd: "20261207T220000",
};

// Os Big Cases. Preencha role (especialidade) e photo (import de src/assets) quando tiver.
const CASES: { numeral: string; name: string; role?: string; photo?: string }[] = [
  { numeral: "I", name: "Dra. Carollina Borges", photo: carollinaBorgesImg },
  { numeral: "II", name: "Dra. Carollina Monção", photo: carollinaMoncaoImg },
  { numeral: "III", name: "Dra. Tayane Nascimento", photo: tayaneImg },
  { numeral: "IV", name: "Dr. Derek Gonçalves", photo: derekImg },
];

const PROGRAMA = [
  { title: "Recepção", text: "Boas-vindas e brinde de abertura." },
  { title: "Abertura", text: "O que nos trouxe até aqui." },
  { title: "Os Big Cases", text: "Quatro profissionais, quatro histórias, números reais." },
  { title: "Tendências do mercado", text: "Para onde o mercado caminha e como chegar na frente." },
  { title: "Jantar e networking", text: "Uma mesa com quem está no mesmo patamar." },
];

// Para onde a confirmação é enviada (n8n, Make, Zapier, etc.).
// TODO: preencher. Enquanto vazio, o envio só funciona em ambiente de desenvolvimento.
const RSVP_WEBHOOK_URL = "";

// Foto do local (opcional): coloque o arquivo em src/assets/local.jpg (ou .jpeg/.png/.webp)
// e a seção "O local" aparece sozinha. Sem arquivo, a seção não é exibida.
const venuePhotos = import.meta.glob("../assets/local.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const VENUE_PHOTO: string | undefined = Object.values(venuePhotos)[0];

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
        content: `Convite exclusivo: ${EVENT.name}, ${EVENT.weekday}, ${EVENT.dateLabel}. ${EVENT.seats} lugares.`,
      },
      // Evento fechado para convidados: não aparece em buscadores.
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: `${EVENT.name} — ${EVENT.brand}` },
      { property: "og:description", content: `Convite exclusivo. ${EVENT.seats} lugares.` },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500&display=swap",
      },
    ],
  }),
  component: Evento,
});

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

/* ------------------------------ estilos ------------------------------ */

const CSS = `
.lx{--bg:#070707;--ink:#f4ede1;--mut:#a59f93;--gold:#c8a96a;--gold-hi:#efdfb2;--line:rgba(200,169,106,.22);
  position:relative;min-height:100vh;overflow-x:hidden;background:var(--bg);color:var(--ink);
  font-family:'Jost',system-ui,sans-serif;font-weight:300;-webkit-font-smoothing:antialiased}
.lx *{box-sizing:border-box}
.lx-serif{font-family:'Cormorant Garamond','Playfair Display',Georgia,serif}
.lx-gold{background:linear-gradient(100deg,#b8934f 0%,#f3e4ba 35%,#c8a96a 55%,#f3e4ba 78%,#b8934f 100%);
  background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  color:transparent;animation:lxShine 8s linear infinite}
.lx-eyebrow{display:inline-flex;align-items:center;gap:14px;font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:var(--gold)}
.lx-eyebrow::before,.lx-eyebrow.both::after{content:"";width:34px;height:1px;background:var(--gold);opacity:.6}
.lx-h2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;line-height:1.02;letter-spacing:-.01em;
  font-size:clamp(38px,7.4vw,68px);margin:18px 0 0}
.lx-h2 em{font-style:italic;font-weight:400}
.lx-p{color:var(--mut);font-size:16px;line-height:1.75;max-width:520px}
.lx-wrap{max-width:1040px;margin:0 auto;padding:0 24px}
.lx-sec{padding:112px 0 0}

/* intro */
.lx-intro{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:#050505;
  transition:opacity 1s ease,transform 1.1s cubic-bezier(.7,0,.2,1),filter 1s ease;cursor:pointer}
.lx-intro::after{content:"";position:absolute;inset:0;background:radial-gradient(60% 45% at 50% 50%,rgba(200,169,106,.13),transparent 70%)}
.lx-intro.is-leaving{opacity:0;transform:scale(1.06);filter:blur(8px);pointer-events:none}
.lx-intro-inner{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:26px}
.lx-intro-line{display:block;width:1px;height:64px;background:linear-gradient(var(--gold),transparent);transform-origin:top;animation:lxGrowY 1.4s .1s cubic-bezier(.2,.7,.2,1) both}
.lx-intro-line.b{background:linear-gradient(transparent,var(--gold));transform-origin:bottom}
.lx-intro-mark{display:flex;gap:.34em;font-size:clamp(34px,9vw,60px);font-weight:300;letter-spacing:.1em;color:var(--gold-hi)}
.lx-intro-mark span{opacity:0;animation:lxLetter 1s cubic-bezier(.2,.7,.2,1) both}
.lx-intro-actions{display:flex;flex-direction:column;align-items:center;gap:16px;margin-top:14px;opacity:0;animation:lxFade 1.2s 2.5s ease both}
.lx-intro-sub{margin:0;font-size:10px;letter-spacing:.5em;text-transform:uppercase;color:var(--mut);opacity:0;animation:lxFade 1s 1.5s ease both}

/* hero */
.lx-hero{position:relative;min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:96px 24px 72px;isolation:isolate}
.lx-halo{position:absolute;left:50%;top:46%;z-index:-1;width:min(1100px,150vw);aspect-ratio:1;transform:translate(-50%,-50%);
  background:radial-gradient(closest-side,rgba(200,169,106,.16),rgba(200,169,106,.04) 55%,transparent 72%)}
.lx-ring{position:absolute;left:50%;top:46%;z-index:-1;border:1px solid rgba(200,169,106,.12);border-radius:50%;transform:translate(-50%,-50%)}
.lx-ring.r1{width:min(620px,92vw);aspect-ratio:1}
.lx-ring.r2{width:min(920px,140vw);aspect-ratio:1;border-color:rgba(200,169,106,.07)}
.lx-ring.r1{animation:lxBreath 9s ease-in-out infinite}
.lx-topmark{position:absolute;top:34px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:18px;
  font-size:12px;letter-spacing:.6em;text-transform:uppercase;color:var(--gold-hi)}
.lx-topmark::before,.lx-topmark::after{content:"";width:40px;height:1px;background:var(--line)}
.lx-title{margin:26px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;line-height:.92;letter-spacing:-.02em;
  font-size:clamp(58px,15vw,150px)}
.lx-title .l2{display:block;font-style:italic;font-weight:400}
.lx-lede{margin:30px auto 0;max-width:560px;color:#cfc7b8;font-size:clamp(16px,2.4vw,19px);line-height:1.7}
.lx-lede b{color:var(--gold-hi);font-weight:400}
.lx-meta{margin:46px auto 0;display:grid;grid-template-columns:1fr 1fr;gap:26px 0;width:100%;max-width:760px}
.lx-meta>div{padding:0 12px;border-left:1px solid var(--line)}
.lx-meta>div:nth-child(odd){border-left:0}
.lx-meta small{display:block;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
.lx-punct{margin:28px 0 0;font:italic 400 18px 'Cormorant Garamond',Georgia,serif;color:var(--gold-hi);opacity:.9}
.lx-meta span{font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;font-weight:400}
.lx-scroll{position:absolute;bottom:26px;left:50%;width:1px;height:54px;background:linear-gradient(var(--gold),transparent);
  transform-origin:top;animation:lxPulse 2.4s ease-in-out infinite}
.lx:not(.is-ready) .ha{opacity:0}
.lx.is-ready .ha{animation:lxRise 1.3s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--d,0s)}

/* botões */
.lx-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:12px;overflow:hidden;cursor:pointer;
  border:1px solid var(--gold);padding:19px 38px;font:400 12px 'Jost',sans-serif;letter-spacing:.34em;text-transform:uppercase;
  color:var(--gold-hi);background:transparent;text-decoration:none;transition:color .5s,box-shadow .5s}
.lx-btn::before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,#b8934f,#f1e1b6,#c8a96a);transform:translateY(101%);
  transition:transform .6s cubic-bezier(.2,.7,.2,1);z-index:-1}
.lx-btn{z-index:0}
.lx-btn:hover{color:#120d05;box-shadow:0 0 50px rgba(200,169,106,.28)}
.lx-btn:hover::before{transform:translateY(0)}
.lx-btn.solid{color:#120d05;border-color:transparent;background:linear-gradient(100deg,#b8934f,#f1e1b6 50%,#c8a96a)}
.lx-btn.solid::before{display:none}
.lx-btn.solid:hover{box-shadow:0 0 60px rgba(200,169,106,.4)}
.lx-btn[disabled]{opacity:.6;cursor:wait}

/* cases */
.lx-statement{font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;line-height:1.12;text-align:center;
  font-size:clamp(34px,6.6vw,70px);max-width:900px;margin:0 auto}
.lx-statement em{font-style:italic;font-weight:400}
.lx-cases{display:grid;grid-template-columns:1fr 1fr;gap:40px 18px;margin-top:70px}
.lx-case{text-align:center}
.lx-arch{position:relative;aspect-ratio:3/4;border-radius:999px 999px 6px 6px;overflow:hidden;
  border:1px solid var(--line);background:radial-gradient(90% 70% at 50% 25%,#1c1913,#0b0a08 70%)}
.lx-arch::after{content:"";position:absolute;inset:9px;border-radius:999px 999px 2px 2px;border:1px solid rgba(200,169,106,.25);pointer-events:none;z-index:2}
.lx-arch img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 18%;
  filter:saturate(.78) contrast(1.06) brightness(.88) sepia(.18);
  transition:filter .9s ease,transform 1.4s cubic-bezier(.2,.7,.2,1)}
.lx-arch.has-photo::before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(200,169,106,.12),transparent 38%,rgba(7,7,7,.88) 100%)}
.lx-case:hover .lx-arch img{filter:saturate(.95) contrast(1.04) brightness(.97) sepia(.06);transform:scale(1.035)}
.lx-arch svg{position:absolute;left:50%;bottom:0;width:62%;transform:translateX(-50%);fill:rgba(200,169,106,.13)}
.lx-arch .num{position:absolute;top:19%;left:0;right:0;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(40px,11vw,64px);color:rgba(239,223,178,.55)}
.lx-case h3{margin:22px 0 0;font-family:'Cormorant Garamond',serif;font-weight:400;font-style:italic;font-size:clamp(19px,5.4vw,26px);line-height:1.15}
.lx-case p{margin:8px auto 0;max-width:260px;color:var(--mut);font-size:14.5px;line-height:1.6}

/* programa */
.lx-prog{margin-top:46px;position:relative}
.lx-prog::before{content:"";position:absolute;left:5px;top:10px;bottom:10px;width:1px;background:linear-gradient(var(--gold),rgba(200,169,106,.08))}
.lx-prog li{position:relative;list-style:none;padding:0 0 34px 38px}
.lx-prog li:last-child{padding-bottom:0}
.lx-prog li::before{content:"";position:absolute;left:0;top:8px;width:11px;height:11px;transform:rotate(45deg);background:var(--bg);border:1px solid var(--gold)}
.lx-prog h4{margin:0;font-family:'Cormorant Garamond',serif;font-weight:400;font-size:27px}
.lx-prog p{margin:4px 0 0;color:var(--mut);font-size:15px}

/* confirmação */
.lx-frame{position:relative;padding:44px 26px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(200,169,106,.06),rgba(200,169,106,.01))}
.lx-frame::before{content:"";position:absolute;inset:8px;border:1px solid rgba(200,169,106,.1);pointer-events:none}
.lx-field{display:block;margin-top:26px}
.lx-field span{display:block;font-size:10px;letter-spacing:.38em;text-transform:uppercase;color:var(--gold)}
.lx-field input{width:100%;margin-top:6px;padding:10px 0 12px;background:transparent;border:0;border-bottom:1px solid rgba(244,237,225,.2);
  color:var(--ink);font:300 18px 'Jost',sans-serif;outline:none;transition:border-color .4s}
.lx-field input::placeholder{color:rgba(165,159,147,.55)}
.lx-field input:focus{border-bottom-color:var(--gold-hi)}
.lx-guest{margin-top:34px;padding-top:6px;border-top:1px solid var(--line)}
.lx-err{margin:20px 0 0;color:#e58b7a;font-size:14px}
.lx-row{display:grid;grid-template-columns:1fr 1fr;gap:0 22px}
.lx-guest-note{margin:10px 0 0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}
.lx-guest-title{margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;font-style:italic;color:var(--gold-hi)}

/* local */
.lx-venue{position:relative;margin-top:44px;border:1px solid var(--line);padding:9px}
.lx-venue img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
.lx-venue::after{content:"";position:absolute;inset:9px;pointer-events:none;
  background:linear-gradient(180deg,transparent 55%,rgba(7,7,7,.78))}
.lx-venue figcaption{position:absolute;z-index:1;left:30px;bottom:26px;right:30px;display:flex;flex-direction:column;gap:4px}
.lx-venue figcaption b{font:italic 400 clamp(24px,4vw,34px) 'Cormorant Garamond',Georgia,serif}
.lx-venue figcaption small{font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:var(--gold)}

/* botão de som */
.lx-sound{position:fixed;right:16px;bottom:16px;z-index:60;display:grid;place-items:center;width:42px;height:42px;
  border-radius:50%;border:1px solid var(--line);background:rgba(10,10,10,.72);color:var(--gold-hi);cursor:pointer;
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:border-color .3s,color .3s}
.lx-sound:hover{border-color:var(--gold);color:#fff}

/* mapa */
.lx-map{max-width:520px;height:220px;margin:26px auto 0;padding:6px;border:1px solid var(--line);background:#0c0c0c}
.lx-map iframe{display:block;width:100%;height:100%;border:0;
  filter:grayscale(1) invert(.92) contrast(.92) sepia(.4) brightness(.95)}
.lx-maplink{display:inline-block;margin-top:18px;padding-bottom:6px;border-bottom:1px solid var(--gold);
  font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold-hi);text-decoration:none;transition:color .3s}
.lx-maplink:hover{color:#fff}

/* revelar ao rolar */
.lx-rv{opacity:0;transform:translateY(30px);filter:blur(6px);
  transition:opacity 1.1s cubic-bezier(.2,.7,.2,1),transform 1.1s cubic-bezier(.2,.7,.2,1),filter 1.1s ease}
.lx-rv.in{opacity:1;transform:none;filter:none}

@media (min-width:768px){
  .lx-meta{grid-template-columns:repeat(4,1fr)}
  .lx-meta>div:nth-child(odd){border-left:1px solid var(--line)}
  .lx-meta>div:first-child{border-left:0}

  .lx-sec{padding-top:150px}
  .lx-frame{padding:60px 56px}
  .lx-split{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start}
}

@media (min-width:900px){
  .lx-cases{grid-template-columns:repeat(4,1fr);gap:28px}
}

@keyframes lxShine{to{background-position:220% center}}
@keyframes lxRise{from{opacity:0;transform:translateY(26px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
@keyframes lxFade{from{opacity:0}to{opacity:1}}
@keyframes lxLetter{from{opacity:0;transform:translateY(14px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
@keyframes lxGrowY{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes lxBreath{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.045)}}
@keyframes lxPulse{0%,100%{transform:scaleY(.3);opacity:.4}50%{transform:scaleY(1);opacity:1}}

@media (prefers-reduced-motion:reduce){
  .lx *{animation-duration:.01ms!important;animation-delay:0s!important;transition-duration:.01ms!important}
  .lx-rv{opacity:1;transform:none;filter:none}
  .lx-intro{display:none}
  .lx:not(.is-ready) .ha{opacity:1}
}
`;

/* ---------------------------- componentes ---------------------------- */

// ===== SOM: início (sem arquivos de áudio; tudo é sintetizado pelo navegador) =====
// Estética de cinema, mas elegante: risers, whooshes que cruzam o estéreo e impactos graves com cauda.
// Sem tom agudo, sem brilho. O grave carrega harmônicos para continuar audível em alto-falante de celular.
// O navegador só libera áudio depois de um toque, por isso a abertura exige o toque em "Entrar".
type Whoosh = {
  dur: number;
  from: number;
  peak: number;
  to: number;
  ceiling: number;
  gain: number;
  attack: number;
  pan?: [number, number]; // varre da esquerda para a direita (ou o contrário)
};

function softNoise(ctx: BaseAudioContext, seconds: number, smoothing: number) {
  const length = Math.ceil(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let smooth = 0;
  for (let i = 0; i < length; i++) {
    smooth += (Math.random() * 2 - 1 - smooth) * smoothing; // suaviza o chiado agudo
    data[i] = smooth;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

// O "whoosh": ruído suavizado passando por um filtro que abre e fecha, podendo cruzar o estéreo.
function whoosh(ctx: BaseAudioContext, out: AudioNode, t0: number, o: Whoosh) {
  const src = softNoise(ctx, o.dur + 0.3, 0.25);

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.8;
  band.frequency.setValueAtTime(o.from, t0);
  band.frequency.exponentialRampToValueAtTime(o.peak, t0 + o.attack + 0.1);
  band.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);

  const soft = ctx.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = o.ceiling;
  soft.Q.value = 0.5;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(o.gain, t0 + o.attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);

  src.connect(band);
  band.connect(soft);
  soft.connect(env);
  if (o.pan && typeof ctx.createStereoPanner === "function") {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(o.pan[0], t0);
    panner.pan.linearRampToValueAtTime(o.pan[1], t0 + o.dur);
    env.connect(panner);
    panner.connect(out);
  } else {
    env.connect(out);
  }
  src.start(t0);
  src.stop(t0 + o.dur + 0.1);
}

// O "riser": tensão que sobe e cresce até cortar seco (feito para terminar num impacto).
function riser(
  ctx: BaseAudioContext,
  out: AudioNode,
  t0: number,
  o: { dur: number; from: number; to: number; gain: number },
) {
  const end = t0 + o.dur;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(o.gain, end - 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, end + 0.04);
  env.connect(out);

  const src = softNoise(ctx, o.dur + 0.3, 0.3);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.1;
  band.frequency.setValueAtTime(o.from, t0);
  band.frequency.exponentialRampToValueAtTime(o.to, end);
  const soft = ctx.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = 1600;
  src.connect(band);
  band.connect(soft);
  soft.connect(env);
  src.start(t0);
  src.stop(end + 0.1);

  // um tom grave que sobe junto, dando corpo à tensão
  [
    [1, 1],
    [2, 0.6],
  ].forEach(([mult, amp]) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(70 * mult, t0);
    osc.frequency.exponentialRampToValueAtTime(150 * mult, end);
    const g = ctx.createGain();
    g.gain.value = amp * 0.5;
    osc.connect(g);
    g.connect(env);
    osc.start(t0);
    osc.stop(end + 0.1);
  });
}

// O impacto: um "boom" grave que cai de tom, com corpo de ruído e uma cauda de ressonância.
function boom(
  ctx: BaseAudioContext,
  out: AudioNode,
  t0: number,
  o: { size: number; gain: number; base?: number },
) {
  const base = o.base ?? 95;
  const dur = 0.35 + o.size * 0.9;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  env.connect(out);
  [
    [1, 1],
    [2, 0.7],
    [3, 0.35],
  ].forEach(([mult, amp]) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(base * mult, t0);
    osc.frequency.exponentialRampToValueAtTime(base * 0.34 * mult, t0 + dur);
    const g = ctx.createGain();
    g.gain.value = amp;
    osc.connect(g);
    g.connect(env);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  });

  // corpo do impacto
  const body = softNoise(ctx, 0.5, 0.2);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 380;
  const bodyEnv = ctx.createGain();
  bodyEnv.gain.setValueAtTime(0.0001, t0);
  bodyEnv.gain.exponentialRampToValueAtTime(o.gain * 0.7, t0 + 0.004);
  bodyEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12 + o.size * 0.25);
  body.connect(lp);
  lp.connect(bodyEnv);
  bodyEnv.connect(out);
  body.start(t0);
  body.stop(t0 + 0.5);

  // cauda ressonante (só nos impactos maiores)
  if (o.size >= 0.6) {
    whoosh(ctx, out, t0 + 0.02, {
      dur: 0.4 + o.size * 1.5,
      from: 260,
      peak: 200,
      to: 120,
      ceiling: 520,
      gain: o.gain * 0.35,
      attack: 0.05,
    });
  }
}

// Um toque minúsculo e grave, usado ao clicar nos campos.
function pop(
  ctx: BaseAudioContext,
  out: AudioNode,
  t0: number,
  o: { from: number; to: number; dur: number; gain: number },
) {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  env.connect(out);
  [
    [1, 1],
    [2, 0.75],
  ].forEach(([mult, amp]) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(o.from * mult, t0);
    osc.frequency.exponentialRampToValueAtTime(o.to * mult, t0 + o.dur);
    const g = ctx.createGain();
    g.gain.value = amp;
    osc.connect(g);
    g.connect(env);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  });
}

// Entrada: riser de tensão → impacto grave → o ar escapando em volta (~3 s).
function scheduleEntrance(ctx: BaseAudioContext, out: AudioNode, t0: number) {
  riser(ctx, out, t0, { dur: 1.1, from: 140, to: 1300, gain: 0.4 });
  boom(ctx, out, t0 + 1.1, { size: 1.3, gain: 0.38 });
  whoosh(ctx, out, t0 + 1.1, {
    dur: 1.9,
    from: 520,
    peak: 360,
    to: 120,
    ceiling: 900,
    gain: 0.3,
    attack: 0.05,
    pan: [0.5, -0.5],
  });
}

type UiSound = "reveal" | "tap" | "focus" | "error" | "success";
let audio: { ctx: AudioContext; master: GainNode } | null = null;
let soundOn = true;
let lastSoftAt = 0;
let revealSide = 1;

// 0,12 s de silêncio: no iPhone, tocar um <audio> libera o som mesmo com o modo silencioso ligado.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRqQHAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function playEntrance() {
  try {
    // iPhone/Safari: trata o som como "reprodução de mídia" (não some com o botão de silencioso)
    const nav = navigator as unknown as { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "playback";
    const keepAlive = new Audio(SILENT_WAV);
    keepAlive.setAttribute("playsinline", "");
    void keepAlive.play().catch(() => undefined);

    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    void ctx.resume();
    const master = ctx.createGain();
    master.gain.value = soundOn ? 1 : 0;
    // limitador de segurança: nunca estoura, mesmo com vários sons juntos
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master.connect(limiter);
    limiter.connect(ctx.destination);
    audio = { ctx, master };
    scheduleEntrance(ctx, master, ctx.currentTime + 0.05);
  } catch {
    // sem áudio disponível: segue em silêncio
  }
}

function setSoundEnabled(on: boolean) {
  soundOn = on;
  if (audio) audio.master.gain.setTargetAtTime(on ? 1 : 0, audio.ctx.currentTime, 0.03);
}

// Sons das ações. Antes do "Entrar" (ou com o som desligado) não fazem nada.
function playUi(kind: UiSound) {
  if (!audio || !soundOn || audio.ctx.state !== "running") return;
  if (kind === "reveal" || kind === "focus") {
    const now = performance.now();
    if (now - lastSoftAt < 140) return; // evita rajadas
    lastSoftAt = now;
  }
  const { ctx, master } = audio;
  const t = ctx.currentTime + 0.01;
  switch (kind) {
    case "reveal": {
      // um whoosh que "passa" de um lado ao outro, alternando a direção a cada seção
      const side = revealSide;
      revealSide = -revealSide;
      whoosh(ctx, master, t, {
        dur: 0.75,
        from: 180,
        peak: 800,
        to: 220,
        ceiling: 1400,
        gain: 1.05,
        attack: 0.3,
        pan: [0.8 * side, -0.8 * side],
      });
      break;
    }
    case "tap":
      boom(ctx, master, t, { size: 0.25, gain: 0.3, base: 120 });
      break;
    case "focus":
      pop(ctx, master, t, { from: 240, to: 170, dur: 0.08, gain: 0.1 });
      break;
    case "error":
      boom(ctx, master, t, { size: 0.3, gain: 0.38, base: 105 });
      break;
    case "success":
      riser(ctx, master, t, { dur: 0.55, from: 160, to: 1000, gain: 0.3 });
      boom(ctx, master, t + 0.55, { size: 0.7, gain: 0.34 });
      whoosh(ctx, master, t + 0.55, {
        dur: 1.2,
        from: 480,
        peak: 340,
        to: 120,
        ceiling: 900,
        gain: 0.28,
        attack: 0.05,
        pan: [-0.4, 0.4],
      });
      break;
  }
}
// ===== SOM: fim =====

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          playUi("reveal");
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`lx-rv ${seen ? "in" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

function Silhouette() {
  return (
    <svg viewBox="0 0 100 120" aria-hidden="true">
      <circle cx="50" cy="42" r="20" />
      <path d="M10 120c0-27 18-44 40-44s40 17 40 44z" />
    </svg>
  );
}

type Person = { nome: string; sobrenome: string; instagram: string; phone: string };
const EMPTY_PERSON: Person = { nome: "", sobrenome: "", instagram: "", phone: "" };

const isInstagram = (v: string) => /^@?[A-Za-z0-9._]{1,30}$/.test(v.trim());
const normalizeInstagram = (v: string) => `@${v.trim().replace(/^@/, "")}`;

// label vem com espaço à frente quando existe (ex.: " do convidado")
function validatePerson(p: Person, label: string): string | null {
  if (p.nome.trim().length < 2) return `Informe o nome${label}.`;
  if (p.sobrenome.trim().length < 2) return `Informe o sobrenome${label}.`;
  if (!isInstagram(p.instagram)) return `Informe o @ do Instagram${label}.`;
  if (p.phone.replace(/\D/g, "").length < 10) return `Telefone${label} inválido.`;
  return null;
}

function personPayload(p: Person) {
  return {
    nome: `${p.nome.trim()} ${p.sobrenome.trim()}`.trim(),
    instagram: p.instagram.trim() ? normalizeInstagram(p.instagram) : "",
    whatsapp: p.phone.replace(/\D/g, ""),
  };
}

// Nome, sobrenome, @ do Instagram e telefone. `own` = a própria pessoa preenchendo (liga o autopreenchimento).
function PersonFields({
  value,
  onChange,
  own = false,
}: {
  value: Person;
  onChange: (p: Person) => void;
  own?: boolean;
}) {
  const set = (k: keyof Person, v: string) => onChange({ ...value, [k]: v });
  return (
    <>
      <div className="lx-row">
        <label className="lx-field">
          <span>Nome</span>
          <input
            placeholder="Nome"
            autoComplete={own ? "given-name" : "off"}
            value={value.nome}
            onChange={(e) => set("nome", e.target.value)}
          />
        </label>
        <label className="lx-field">
          <span>Sobrenome</span>
          <input
            placeholder="Sobrenome"
            autoComplete={own ? "family-name" : "off"}
            value={value.sobrenome}
            onChange={(e) => set("sobrenome", e.target.value)}
          />
        </label>
      </div>
      <label className="lx-field">
        <span>Instagram</span>
        <input
          placeholder="@usuario"
          autoCapitalize="none"
          autoCorrect="off"
          value={value.instagram}
          onChange={(e) => set("instagram", e.target.value)}
        />
      </label>
      <label className="lx-field">
        <span>Telefone</span>
        <input
          placeholder="(00) 00000-0000"
          inputMode="tel"
          autoComplete={own ? "tel" : "off"}
          value={value.phone}
          onChange={(e) => set("phone", maskPhone(e.target.value))}
        />
      </label>
    </>
  );
}

type IntroState = "show" | "leaving" | "gone";

function Evento() {
  const { ref, c } = Route.useSearch();
  const isGuest = c === "1";

  const [intro, setIntro] = useState<IntroState>("show");
  const [hasAudio, setHasAudio] = useState(false);
  const [muted, setMuted] = useState(false);
  const [nome, setNome] = useState("");
  const [eu, setEu] = useState<Person>(EMPTY_PERSON);
  const [convidado, setConvidado] = useState<Person>(EMPTY_PERSON);
  const [convidadoPor, setConvidadoPor] = useState(ref ? prettifyRef(ref) : "");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Abertura: com "reduzir movimento" ativado ela é pulada; senão espera o toque em "Entrar".
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setIntro("gone");
  }, []);

  // Trava a rolagem enquanto a abertura está na tela.
  useEffect(() => {
    document.body.style.overflow = intro === "show" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [intro]);

  const enter = () => {
    if (intro !== "show") return;
    playEntrance();
    setHasAudio(true);
    setIntro("leaving");
    window.setTimeout(() => setIntro("gone"), 1100);
  };

  const toggleSound = () => {
    const turningOn = muted;
    setSoundEnabled(turningOn);
    setMuted(!muted);
    if (turningOn) playUi("tap");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    let invalid: string | null;
    if (isGuest) {
      invalid =
        validatePerson(eu, "") ?? (convidadoPor.trim() ? null : "Informe quem te convidou.");
    } else if (nome.trim().split(/\s+/).length < 2) {
      invalid = "Informe seu nome e sobrenome.";
    } else {
      invalid = validatePerson(convidado, " do convidado");
    }
    if (invalid) {
      playUi("error");
      return setErr(invalid);
    }

    setErr("");
    setLoading(true);

    const base = {
      evento: EVENT.name,
      data_evento: EVENT.dateShort,
      ref: ref ?? "",
      data_confirmacao: new Date().toISOString(),
    };
    const guestData = personPayload(convidado);
    const payload = isGuest
      ? { ...base, tipo: "convidado", ...personPayload(eu), convidado_por: convidadoPor.trim() }
      : {
          ...base,
          tipo: "cliente",
          nome: nome.trim(),
          convidado_nome: guestData.nome,
          convidado_instagram: guestData.instagram,
          convidado_whatsapp: guestData.whatsapp,
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
      playUi("success");
    } catch {
      playUi("error");
      setErr("Não conseguimos registrar sua confirmação agora. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  const confirmedNames = isGuest ? eu.nome.trim() : `${nome.trim()} e ${convidado.nome.trim()}`;

  const ready = intro !== "show";

  return (
    <div className={`lx ${ready ? "is-ready" : ""}`}>
      <style>{CSS}</style>

      {intro !== "gone" && (
        <div className={`lx-intro ${intro === "leaving" ? "is-leaving" : ""}`}>
          <div className="lx-intro-inner">
            <span className="lx-intro-line" />
            <div className="lx-intro-mark lx-serif" aria-label={EVENT.brand}>
              {EVENT.brand
                .toUpperCase()
                .split("")
                .map((ch, i) => (
                  <span key={i} style={{ animationDelay: `${0.5 + i * 0.14}s` }}>
                    {ch}
                  </span>
                ))}
            </div>
            <p className="lx-intro-sub">Convite exclusivo</p>
            <div className="lx-intro-actions">
              <button type="button" className="lx-btn solid" onClick={enter}>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
                  <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" strokeLinecap="round" />
                </svg>
                Entrar
              </button>
            </div>
            <span className="lx-intro-line b" />
          </div>
        </div>
      )}

      {hasAudio && (
        <button
          type="button"
          className="lx-sound"
          onClick={toggleSound}
          aria-pressed={!muted}
          aria-label={muted ? "Ativar som" : "Desativar som"}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            {muted ? (
              <path d="M16 9.5l5 5M21 9.5l-5 5" />
            ) : (
              <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
            )}
          </svg>
        </button>
      )}

      {/* HERO */}
      <header className="lx-hero">
        <div className="lx-halo" />
        <div className="lx-ring r2" />
        <div className="lx-ring r1" />

        <div className="lx-topmark ha" style={{ "--d": "0.1s" } as CSSProperties}>
          {EVENT.brand}
        </div>

        <p className="lx-eyebrow both ha" style={{ "--d": "0.25s" } as CSSProperties}>
          Convite exclusivo
        </p>
        <h1 className="lx-title ha" style={{ "--d": "0.4s" } as CSSProperties}>
          {EVENT.titleLine1}
          <span className="l2 lx-gold">{EVENT.titleLine2}</span>
        </h1>
        <p className="lx-lede ha" style={{ "--d": "0.6s" } as CSSProperties}>
          Uma noite fechada com profissionais que faturaram{" "}
          <b>mais de R$ 1 milhão em um único ano</b>, e vão contar como fizeram.
        </p>

        <div className="lx-meta ha" style={{ "--d": "0.8s" } as CSSProperties}>
          <div>
            <small>Data</small>
            <span>
              {EVENT.day} {EVENT.month} {EVENT.year}
            </span>
          </div>
          <div>
            <small>Dia</small>
            <span>{EVENT.weekday}</span>
          </div>
          <div>
            <small>Horário</small>
            <span>{EVENT.timeLabel}</span>
          </div>
          <div>
            <small>Local</small>
            <span>{EVENT.city}</span>
          </div>
        </div>
        <p className="lx-punct ha" style={{ "--d": "0.9s" } as CSSProperties}>
          Começamos às {EVENT.timeLabel} {EVENT.timeNote}.
        </p>

        <a
          href="#confirmar"
          onClick={() => playUi("tap")}
          className="lx-btn solid ha"
          style={{ "--d": "1s", marginTop: 34 } as CSSProperties}
        >
          Reservar meu lugar
        </a>
        <p
          className="ha"
          style={
            {
              "--d": "1.1s",
              marginTop: 18,
              fontSize: 12,
              letterSpacing: ".18em",
              color: "var(--mut)",
            } as CSSProperties
          }
        >
          {EVENT.seats} LUGARES · CONFIRME ATÉ {EVENT.rsvpDeadline}
        </p>
        <span className="lx-scroll" />
      </header>

      {/* DECLARAÇÃO */}
      <section className="lx-sec">
        <div className="lx-wrap">
          <Reveal>
            <p className="lx-statement">
              Quatro histórias. <em className="lx-gold">Mais de R$ 1 milhão</em> em um único ano.
              Uma noite para ouvir, de perto, <em>como foi feito.</em>
            </p>
          </Reveal>

          <div className="lx-cases">
            {CASES.map((cs, i) => (
              <Reveal key={cs.numeral} delay={i * 140}>
                <div className="lx-case">
                  <div className={`lx-arch ${cs.photo ? "has-photo" : ""}`}>
                    {cs.photo ? (
                      <img src={cs.photo} alt={cs.name} />
                    ) : (
                      <>
                        <span className="num">{cs.numeral}</span>
                        <Silhouette />
                      </>
                    )}
                  </div>

                  <h3>{cs.name}</h3>
                  {cs.role && <p>{cs.role}</p>}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TENDÊNCIAS + PROGRAMA */}
      <section className="lx-sec">
        <div className="lx-wrap lx-split">
          <Reveal>
            <span className="lx-eyebrow">Além dos cases</span>
            <h2 className="lx-h2">
              Para onde o <em className="lx-gold">mercado</em> caminha
            </h2>
            <p className="lx-p" style={{ marginTop: 26 }}>
              Uma conversa franca sobre as tendências que estão redesenhando o mercado nos próximos
              anos, e o que fazer agora para chegar na frente de quem ainda está olhando para trás.
            </p>
          </Reveal>

          <Reveal delay={150}>
            <ul className="lx-prog" style={{ padding: 0, margin: 0 }}>
              {PROGRAMA.map((p) => (
                <li key={p.title}>
                  <h4>{p.title}</h4>
                  <p>{p.text}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* LOCAL */}
      {VENUE_PHOTO && (
        <section className="lx-sec">
          <div className="lx-wrap">
            <Reveal>
              <div style={{ textAlign: "center" }}>
                <span className="lx-eyebrow both">O local</span>
                <h2 className="lx-h2">
                  Uma mesa posta para <em className="lx-gold">poucos</em>
                </h2>
                <p className="lx-p" style={{ margin: "18px auto 0" }}>
                  Poucos lugares e conversas de verdade, num ambiente pensado para isso.
                </p>
              </div>
              <figure className="lx-venue" style={{ marginInline: 0 }}>
                <img src={VENUE_PHOTO} alt={`${EVENT.venueName}, local do evento`} loading="lazy" />
                <figcaption>
                  <small>{EVENT.city}</small>
                  <b>{EVENT.venueName}</b>
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>
      )}

      {/* CONFIRMAÇÃO */}
      <section id="confirmar" className="lx-sec" style={{ scrollMarginTop: 20 }}>
        <div className="lx-wrap" style={{ maxWidth: 720 }}>
          <Reveal>
            <div className="lx-frame">
              {confirmed ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <span className="lx-eyebrow both">Confirmado</span>
                  <h2 className="lx-h2">
                    Seu lugar está <em className="lx-gold">reservado</em>
                  </h2>
                  <p className="lx-p" style={{ margin: "24px auto 0" }}>
                    {confirmedNames}, nos vemos na {EVENT.weekday.toLowerCase()}, {EVENT.dateLabel},
                    às {EVENT.timeLabel} {EVENT.timeNote}.
                  </p>
                  <a
                    href={calendarUrl()}
                    onClick={() => playUi("tap")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lx-btn"
                    style={{ marginTop: 40 }}
                  >
                    Adicionar à agenda
                  </a>
                </div>
              ) : (
                <form
                  onSubmit={submit}
                  noValidate
                  onFocus={(e) => {
                    if (e.target instanceof HTMLInputElement) playUi("focus");
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <span className="lx-eyebrow both">{EVENT.seats} lugares</span>
                    <h2 className="lx-h2">
                      Reserve o <em className="lx-gold">seu lugar</em>
                    </h2>
                    <p className="lx-p" style={{ margin: "18px auto 0" }}>
                      {isGuest
                        ? "Você foi convidado(a) para esta noite. Confirme seus dados para garantir o seu lugar."
                        : "Confirme a sua presença e informe os dados do seu convidado, que precisa ser um profissional da sua área."}
                    </p>
                  </div>

                  {isGuest ? (
                    <>
                      <PersonFields own value={eu} onChange={setEu} />
                      <label className="lx-field">
                        <span>Quem te convidou</span>
                        <input
                          placeholder="Nome de quem te convidou"
                          value={convidadoPor}
                          onChange={(e) => setConvidadoPor(e.target.value)}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="lx-field">
                        <span>Seu nome</span>
                        <input
                          placeholder="Nome e sobrenome"
                          autoComplete="name"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                        />
                      </label>
                      <div className="lx-guest">
                        <p className="lx-guest-title">Seu convidado(a)</p>
                        <p className="lx-guest-note">
                          Obrigatório · precisa ser um profissional da sua área
                        </p>
                        <PersonFields value={convidado} onChange={setConvidado} />
                      </div>
                    </>
                  )}

                  {err && (
                    <p role="alert" className="lx-err">
                      {err}
                    </p>
                  )}

                  <div style={{ textAlign: "center", marginTop: 40 }}>
                    <button type="submit" disabled={loading} className="lx-btn solid">
                      {loading ? "Confirmando..." : "Confirmar presença"}
                    </button>
                    <p style={{ marginTop: 18, fontSize: 12, color: "var(--mut)" }}>
                      Seus dados são usados apenas para organizar o evento.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </Reveal>

          <Reveal delay={100}>
            <p
              style={{
                marginTop: 40,
                textAlign: "center",
                fontSize: 14,
                lineHeight: 1.8,
                color: "var(--mut)",
              }}
            >
              <span className="lx-serif" style={{ fontSize: 22, color: "var(--ink)" }}>
                {EVENT.venueName}
              </span>
              <br />
              {EVENT.venueAddress}
            </p>
            <div className="lx-map">
              <iframe
                title={`Mapa: ${EVENT.venueName}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(EVENT.venueAddress)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <a
                className="lx-maplink"
                onClick={() => playUi("tap")}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(EVENT.venueAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir no Google Maps
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <footer
        style={{
          padding: "90px 24px 60px",
          textAlign: "center",
          fontSize: 10,
          letterSpacing: ".4em",
          textTransform: "uppercase",
          color: "rgba(165,159,147,.7)",
        }}
      >
        {EVENT.brand} · Convite pessoal e intransferível
      </footer>
    </div>
  );
}
