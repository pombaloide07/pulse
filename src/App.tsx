import { Route, Routes } from "react-router-dom";
import { TabBar } from "./components/TabBar";
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
      </Routes>
      <TabBar />
    </>
  );
}
