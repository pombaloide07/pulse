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
 * Porta de entrada do Pulse: manifesto + o que o app faz + prova social + uma
 * espiada nas telas + CTA. O app em si só abre com conta (ou pela escolha
 * explícita de explorar a demonstração).
 */
export function Landing({
  onDemo,
  onLogin,
}: {
  onDemo: () => void;
  onLogin: (mode: "entrar" | "criar") => void;
}) {
  return (
    <main className="landing">
      <div className="aurora" aria-hidden />

      <header className="ld-top rise">
        <span className="ld-brand">
          <IconPulse size={22} stroke={2.4} />
          Pulse
        </span>
        <button className="ld-top-enter" onClick={() => onLogin("entrar")}>
          Entrar
        </button>
      </header>

      {/* hero */}
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
          <BigButton onClick={() => onLogin("criar")} tone="pulse">
            <IconPulse size={20} />
            Criar conta grátis
          </BigButton>
          <button className="ld-demo" onClick={onDemo}>
            Explorar sem conta — dados de exemplo →
          </button>
        </div>
        <p className="ld-cta-note">E-mail e senha. Sem cartão, sem pegadinha.</p>
      </section>

      {/* prova social — PLACEHOLDER: voz do produto, não um depoimento real.
          Troque por citações de usuários reais (ou remova) antes do lançamento. */}
      <section className="ld-social rise">
        <div className="ld-social-avatars" aria-hidden>
          <span className="ld-social-av ld-av-pulse">JP</span>
          <span className="ld-social-av ld-av-mata">RM</span>
          <span className="ld-social-av ld-av-ambar">CA</span>
          <span className="ld-social-av ld-av-ceu">LS</span>
          <span className="ld-social-av ld-social-check">
            <IconCheck size={15} stroke={3} />
          </span>
        </div>
        <p className="ld-social-quote">
          Feito pra treinar em turma — sem ranking, sem peso, sem foto do corpo.
        </p>
        <p className="ld-social-note">
          A presença e a constância ficam com o grupo. Seus números ficam só com você.
        </p>
      </section>

      {/* veja por dentro — mini Hoje + mini Resumo */}
      <section className="ld-peek rise">
        <p className="eyebrow">Veja por dentro</p>
        <div className="ld-peek-row">
          <div className="ld-peek-card">
            <p className="ld-peek-eyebrow">Sua semana</p>
            <div className="ld-peek-week" aria-hidden>
              <span className="ld-dot ld-dot-on" />
              <span className="ld-dot ld-dot-on" />
              <span className="ld-dot" />
              <span className="ld-dot ld-dot-on" />
              <span className="ld-dot" />
              <span className="ld-dot" />
              <span className="ld-dot" />
            </div>
            <div className="ld-peek-today">
              <span className="ld-peek-letter">A</span>
              <div>
                <p className="ld-peek-cap">Treino de hoje</p>
                <p className="ld-peek-name">Empurrar</p>
              </div>
            </div>
          </div>
          <div className="ld-peek-card ld-peek-resumo">
            <span className="ld-peek-check">
              <IconCheck size={18} stroke={2.6} />
            </span>
            <p className="ld-peek-appeared">
              Você<br />
              <em>apareceu.</em>
            </p>
          </div>
        </div>
      </section>

      {/* features — os 4 pilares */}
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

      {/* como funciona — 3 passos numerados */}
      <section className="ld-how rise">
        <p className="eyebrow">Como funciona</p>
        <ol>
          <li>
            <span className="ld-how-num">1</span>
            Crie sua conta com e-mail e senha — você entra na hora.
          </li>
          <li>
            <span className="ld-how-num">2</span>
            Monte o grupo da academia ou entre com o código de um amigo.
          </li>
          <li>
            <span className="ld-how-num">3</span>
            Apareça. O Pulse cuida do resto: rotação, metas e a leitura do mês.
          </li>
        </ol>
      </section>

      {/* CTA final */}
      <section className="ld-final rise">
        <h2>
          Bora <em>aparecer.</em>
        </h2>
        <BigButton onClick={() => onLogin("criar")} tone="pulse">
          <IconPulse size={20} />
          Criar conta grátis
        </BigButton>
      </section>

      <footer className="ld-foot rise">
        <p>
          Feito no Brasil · dados nutricionais TACO (NEPA/Unicamp) e Open Food
          Facts (ODbL) · seus dados sincronizam na nuvem e são seus.
        </p>
      </footer>
    </main>
  );
}
