import { NavLink, useLocation } from "react-router-dom";
import { IconBarbell, IconBody, IconDiet, IconGroup, IconPulse } from "./icons";
import "./tabbar.css";

const TABS = [
  { to: "/", label: "Hoje", icon: IconPulse },
  { to: "/treino", label: "Treino", icon: IconBarbell },
  { to: "/dieta", label: "Dieta", icon: IconDiet },
  { to: "/corpo", label: "Corpo", icon: IconBody },
  { to: "/grupo", label: "Grupo", icon: IconGroup },
];

export function TabBar() {
  const { pathname } = useLocation();
  // some durante a sessão de treino ativa e no resumo — foco total
  if (/^\/treino\/.+/.test(pathname) || pathname.startsWith("/resumo")) return null;

  return (
    <nav className="tabbar" aria-label="Navegação principal">
      <div className="tabbar-inner">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => `tab ${isActive ? "tab-active" : ""}`}
          >
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
