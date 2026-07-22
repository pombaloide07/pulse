import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { DEMO_FLAG, useSync } from "./lib/sync";
import { TabBar } from "./components/TabBar";
import { NewPasswordSheet } from "./components/account";
import { Landing } from "./screens/Landing";
import { Onboarding } from "./screens/Onboarding";
import { Hoje } from "./screens/Hoje";
import { Sessao } from "./screens/Sessao";
import { Resumo } from "./screens/Resumo";
import { Treino } from "./screens/Treino";
import { PlanoEditor } from "./screens/PlanoEditor";
import { Dieta } from "./screens/Dieta";
import { DietaMetas } from "./screens/DietaMetas";
import { Pratos } from "./screens/Pratos";
import { PratoEditor } from "./screens/PratoEditor";
import { Corpo } from "./screens/Corpo";
import { Grupo } from "./screens/Grupo";

export function App() {
  const { needsOnboarding, needsNewPassword, session, ready } = useSync();
  // re-render quando o visitante opta pela demo (a flag mora no localStorage)
  const [, bump] = useState(0);

  // espera a sessão inicial resolver — senão a landing pisca pra quem já
  // está logado a cada abertura do app
  if (!ready) return null;

  let inDemo = false;
  try {
    inDemo = localStorage.getItem(DEMO_FLAG) === "1";
  } catch {
    /* sem localStorage: fica na landing */
  }

  // porta de entrada: deslogado só entra no app após login (ou optando
  // explicitamente pela demonstração)
  if (!session && !inDemo) {
    return (
      <Landing
        onDemo={() => {
          try {
            localStorage.setItem(DEMO_FLAG, "1");
          } catch {
            /* sem localStorage a demo não persiste, mas entra mesmo assim */
          }
          bump((n) => n + 1);
        }}
      />
    );
  }

  // chegou pelo link de "esqueci a senha": define a nova antes de tudo
  if (needsNewPassword) return <NewPasswordSheet />;

  // conta nova logada: escolhe o nome antes de qualquer coisa
  if (needsOnboarding) return <Onboarding />;
  return (
    <>
      <Routes>
        <Route path="/" element={<Hoje />} />
        <Route path="/treino" element={<Treino />} />
        <Route path="/treino/:sessionId" element={<Sessao />} />
        <Route path="/resumo/:sessionId" element={<Resumo />} />
        <Route path="/plano/:workoutId" element={<PlanoEditor />} />
        <Route path="/dieta" element={<Dieta />} />
        <Route path="/dieta/metas" element={<DietaMetas />} />
        <Route path="/dieta/pratos" element={<Pratos />} />
        <Route path="/dieta/pratos/:dishId" element={<PratoEditor />} />
        <Route path="/corpo" element={<Corpo />} />
        <Route path="/grupo" element={<Grupo />} />
        {/* rota desconhecida (link velho, typo) nunca vira tela em branco */}
        <Route path="*" element={<Hoje />} />
      </Routes>
      <TabBar />
    </>
  );
}
