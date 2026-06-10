import { useEffect, useRef } from "react";

export function LuxuryBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let tx = 50, ty = 30, cx = 50, cy = 30;

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 100;
      ty = (e.clientY / window.innerHeight) * 100;
    };

    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.setProperty("--mx", `${cx}%`);
      el.style.setProperty("--my", `${cy}%`);
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ ["--mx" as string]: "50%", ["--my" as string]: "30%" }}
    >
      {/* base black */}
      <div className="absolute inset-0 bg-black" />

      {/* interactive gold spotlight follows cursor */}
      <div
        className="absolute inset-0 transition-[background] duration-300"
        style={{
          background:
            "radial-gradient(600px circle at var(--mx) var(--my), rgba(201,168,76,0.18), transparent 60%)",
        }}
      />

      {/* drifting amber orbs */}
      <div className="absolute -left-32 top-[-10%] h-[55vh] w-[55vh] rounded-full bg-[#C9A84C]/10 blur-[120px] animate-[drift1_18s_ease-in-out_infinite]" />
      <div className="absolute -right-40 top-[20%] h-[60vh] w-[60vh] rounded-full bg-[#7a5b1f]/15 blur-[140px] animate-[drift2_22s_ease-in-out_infinite]" />
      <div className="absolute left-1/2 bottom-[-20%] h-[70vh] w-[70vh] -translate-x-1/2 rounded-full bg-[#C9A84C]/[0.07] blur-[160px] animate-[drift3_26s_ease-in-out_infinite]" />

      {/* fine gold particles */}
      <div className="absolute inset-0 opacity-60">
        {Array.from({ length: 10 }).map((_, i) => {
          const left = (i * 137.5) % 100;
          const top = (i * 89.7) % 100;
          const delay = (i * 0.7) % 8;
          const dur = 6 + ((i * 1.3) % 6);
          return (
            <span
              key={i}
              className="absolute h-[2px] w-[2px] rounded-full bg-[#C9A84C] shadow-[0_0_8px_#C9A84C] animate-[twinkle_var(--d)_ease-in-out_infinite]"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${delay}s`,
                ["--d" as string]: `${dur}s`,
              }}
            />
          );
        })}
      </div>

      {/* grain */}
      <div
        className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 0.85 0 0 0 0 0.5 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />

      <style>{`
        @keyframes drift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(60px,40px) scale(1.1); }
        }
        @keyframes drift2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-80px,60px) scale(1.15); }
        }
        @keyframes drift3 {
          0%,100% { transform: translate(-50%,0) scale(1); }
          50% { transform: translate(-50%,-50px) scale(1.1); }
        }
        @keyframes twinkle {
          0%,100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.6); }
        }
      `}</style>
    </div>
  );
}
