// Ponto de entrada da prévia estática: renderiza a mesma página do site (sem o roteador).
import { createRoot } from "react-dom/client";
import { EventoPage } from "../src/routes/evento";

const invitedBy = new URLSearchParams(window.location.search).get("ref") ?? undefined;
createRoot(document.getElementById("root")!).render(<EventoPage invitedBy={invitedBy} />);
