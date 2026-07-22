import { useState } from "react";
import { LoginSheet } from "../components/account";
import { BigButton } from "../components/ui";
import {
  IconBarbell,
  IconBody,
  IconCheck,
  IconDiet,
  IconGroup,
  IconPulse,
} from "../components/icons";
import "./landing.css";

/**
 * Porta de entrada do Pulse: quem chega deslogado vê isto — manifesto,
 * o que o app faz, e o CTA de login. O app em si só abre com conta
 * (ou pela escolha explícita de explorar a demonstração).
 */
export function Landing({ onDemo }: { onDemo: () => void }) {
  const [login, setLogin] = useState(false);

  return (
    <main className="landing">
      <div className="aurora" aria-hidden />

      <header className="ld-top rise">
        <span className="ld-brand">
          <IconPulse size={22} stroke={2.4} />
          Pulse
        </span>
        <button className="ld-top-enter" onClick={() => setLogin(true)}>
          Entrar
        </button>
      </header>

      <section className="ld-hero rise">
        <p className="eyebrow">Treino · dieta · grupo</p>
        <h1>
          Aparecer é<br />o que <em>constrói.</em>
        </h1>
        <p className="ld-sub">
          O Pulse registra seus treinos, sua proteína e a presença da sua turma —
          com o mínimo de digitação e zero julgamento. Um dia ruim não é nada; o
          padrão de semanas é tudo.
        </p>
        <svg className="ld-pulseline" viewBox="0 0 320 44" aria-hidden>
          <path d="M0 24h86l14-16 18 30 14-22 10 8h178" />
        </svg>
        <div className="ld-cta">
          <BigButton onClick={() => setLogin(true)} tone="pulse">
            <IconPulse size={20} />
            Entrar no Pulse
          </BigButton>
          <button className="ld-demo" onClick={onDemo}>
            Explorar sem conta — dados de exemplo
          </button>
        </div>
        <p className="ld-cta-note">
          E-mail e senha, simples — a confirmação por e-mail é só na criação da conta.
        </p>
      </section>

      <section className="ld-features">
        <article className="card ld-feature rise">
          <span className="ld-fi ld-fi-pulse">
            <IconBarbell size={20} />
          </span>
          <div>
            <h2>Treino que anda sozinho</h2>
            <p>
              Plano A/B/C vivo, rotação automática, recordes e progressão de carga.
              Esqueceu de registrar? Lança o treino de qualquer dia da semana em
              dois toques.
            </p>
          </div>
        </article>

        <article className="card ld-feature rise">
          <span className="ld-fi ld-fi-mata">
            <IconDiet size={20} />
          </span>
          <div>
            <h2>Dieta sem digitação</h2>
            <p>
              Seus pratos registrados em um toque, "repetir ontem", e uma busca com
              ~640 alimentos brasileiros (TACO/Unicamp) mais milhões de produtos
              embalados (Open Food Facts).
            </p>
          </div>
        </article>

        <article className="card ld-feature rise">
          <span className="ld-fi ld-fi-ambar">
            <IconGroup size={20} />
          </span>
          <div>
            <h2>O grupo puxa você</h2>
            <p>
              Presença do dia, semanas no ritmo e desafios com check-in — o
              empurrão de ver que os amigos já treinaram hoje.
            </p>
          </div>
        </article>

        <article className="card ld-feature rise">
          <span className="ld-fi ld-fi-ink">
            <IconBody size={20} />
          </span>
          <div>
            <h2>Números do corpo são seus</h2>
            <p>
              Peso e calorias ficam privados por padrão — o grupo só vê presença e
              constância. Dá até pra esconder os números de você mesmo.
            </p>
          </div>
        </article>
      </section>

      <section className="ld-how rise">
        <p className="eyebrow">Como funciona</p>
        <ol>
          <li>
            <IconCheck size={15} stroke={3} />
            Entre com seu e-mail — a conta nasce na hora, sem senha.
          </li>
          <li>
            <IconCheck size={15} stroke={3} />
            Crie o grupo da academia ou entre com o código de um amigo.
          </li>
          <li>
            <IconCheck size={15} stroke={3} />
            Apareça. O Pulse cuida do resto: rotação, metas e leitura do mês.
          </li>
        </ol>
      </section>

      <footer className="ld-foot rise">
        <p>
          Feito no Brasil · dados nutricionais TACO (NEPA/Unicamp) e Open Food
          Facts (ODbL) · seus dados sincronizam na nuvem e são seus.
        </p>
      </footer>

      {login && <LoginSheet onClose={() => setLogin(false)} />}
    </main>
  );
}
