import { useState } from "react";
import { useSync } from "../lib/sync";
import { BigButton } from "../components/ui";
import "./onboarding.css";

/**
 * Primeiro login de uma conta nova: escolhe o nome e o app nasce limpo —
 * plano A/B/C e pratos padrão como ponto de partida, zero dados de demonstração.
 */
export function Onboarding() {
  const sync = useSync();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    await sync.onboard(name);
    setBusy(false);
  };

  return (
    <main className="screen onboarding">
      <div className="aurora" aria-hidden />
      <div className="ob-body rise">
        <p className="eyebrow">Bem-vindo ao Pulse</p>
        <h1>
          Como o grupo
          <br />
          te <em>chama?</em>
        </h1>
        <p className="ob-sub">
          É esse nome que aparece pros seus amigos quando você treina. Dá pra usar
          apelido — aqui ninguém é formal.
        </p>
        <input
          className="food-search ob-input"
          placeholder="Seu nome ou apelido"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim().length >= 2 && !busy) go();
          }}
          autoFocus
        />
        <BigButton onClick={go} tone="pulse" disabled={busy || name.trim().length < 2}>
          {busy ? "Preparando…" : "Bora"}
        </BigButton>
        <p className="ob-note">
          Você começa com um plano de treino A/B/C e os pratos básicos prontos pra
          editar — o histórico é todo seu pra construir.
        </p>
      </div>
    </main>
  );
}
