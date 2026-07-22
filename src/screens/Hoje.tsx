import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import { formatLong, greeting, todayISO } from "../lib/dates";
import {
  nextWorkout,
  presentToday,
  sessionsThisWeek,
  weekPresence,
  weekStreak,
} from "../lib/logic";
import { EXERCISE_BY_ID } from "../lib/exercises";
import { dayTotals } from "../lib/nutrition";
import { fmtInt } from "../lib/format";
import { Avatar, BigButton, Chip, WeekStrip } from "../components/ui";
import { IconCheck, IconChevronRight, IconDiet, IconPulse } from "../components/icons";
import { HeaderAccount } from "../components/account";
import { QuickLogSheet } from "../components/QuickLog";
import "./hoje.css";

export function Hoje() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [quickLog, setQuickLog] = useState(false);

  const sync = useSync();
  const me = state.members.find((m) => m.isMe)!;
  const friends =
    sync.session && sync.group
      ? (sync.friends ?? [])
      : state.members.filter((m) => !m.isMe);
  const friendsToday = friends.filter(presentToday);
  const trainedToday = presentToday(me);
  const workout = nextWorkout(state);
  const active = state.activeSessionId
    ? state.sessions.find((s) => s.id === state.activeSessionId)
    : null;
  const streak = weekStreak(me);
  const thisWeek = sessionsThisWeek(me);
  const food = dayTotals(state, todayISO());
  const targets = state.profile.targets;
  const hideNumbers = state.profile.hideNumbers;

  const start = () => {
    if (active) {
      navigate(`/treino/${active.id}`);
      return;
    }
    const sessionId = `s-${Date.now()}`;
    dispatch({ type: "START_SESSION", workoutId: workout.id, sessionId });
    navigate(`/treino/${sessionId}`);
  };

  const firstNames = friendsToday.map((f) => f.name);
  const presenceLine =
    friendsToday.length === 0
      ? "Ninguém do grupo treinou ainda. Seja o primeiro."
      : friendsToday.length === 1
        ? `${firstNames[0]} já treinou hoje.`
        : `${firstNames.slice(0, -1).join(", ")} e ${firstNames.at(-1)} já treinaram hoje.`;

  return (
    <main className="screen hoje">
      <div className="aurora" aria-hidden />

      <header className="hoje-head rise">
        <div className="hoje-head-text">
          <p className="eyebrow">{formatLong(new Date())}</p>
          <h1>
            {greeting()},<br />
            <em>{state.userName}.</em>
          </h1>
        </div>
        <HeaderAccount />
      </header>

      <section className="card week-card rise">
        <div className="week-card-top">
          <p className="eyebrow">Sua semana</p>
          <Chip tone={streak > 1 ? "mata" : "neutral"}>
            {streak > 1 ? `${streak} semanas no ritmo` : "começando o ritmo"}
          </Chip>
        </div>
        <WeekStrip presence={weekPresence(me)} />
        <p className="week-note">
          {trainedToday
            ? "Você apareceu hoje. É isso que constrói."
            : thisWeek > 0
              ? `${thisWeek} ${thisWeek === 1 ? "treino" : "treinos"} essa semana — hoje cabe mais um.`
              : "Semana aberta. O primeiro treino é o que puxa os outros."}
        </p>
      </section>

      <section className="card today-card rise">
        <div className="today-head">
          <span className="today-letter serif-num">{workout.letter}</span>
          <div>
            <p className="eyebrow">{active ? "Treino em andamento" : "Próximo treino"}</p>
            <h2>{workout.name}</h2>
          </div>
        </div>
        <ul className="today-list">
          {workout.items.slice(0, 4).map((item) => (
            <li key={item.exerciseId}>
              <span>{EXERCISE_BY_ID[item.exerciseId]?.name}</span>
              <small>
                {item.sets}×{item.targetReps}
                {item.targetLoad > 0 && ` · ${item.targetLoad}kg`}
              </small>
            </li>
          ))}
          {workout.items.length > 4 && (
            <li className="today-more">
              + {workout.items.length - 4}{" "}
              {workout.items.length - 4 === 1 ? "exercício" : "exercícios"}
            </li>
          )}
        </ul>
        <BigButton onClick={start} tone={trainedToday && !active ? "ink" : "pulse"}>
          <IconPulse size={20} />
          {active ? "Continuar treino" : trainedToday ? "Registrar outro treino" : "Começar treino"}
        </BigButton>
        {!active && (
          <button className="today-quicklog" onClick={() => setQuickLog(true)}>
            Treinou e não registrou? Lançar treino de outro dia
          </button>
        )}
      </section>

      <button className="card food-card rise" onClick={() => navigate("/dieta")}>
        <span className="food-icon">
          <IconDiet size={21} />
        </span>
        <div className="food-info">
          <p className="eyebrow">Dieta hoje</p>
          <p>
            <b>{Math.round(food.prot)}g</b> de proteína
            {!hideNumbers && (
              <>
                {" · "}
                {fmtInt(food.kcal)} kcal
              </>
            )}
          </p>
          <span className="food-bar">
            <em
              style={{
                width: `${Math.min(100, targets.prot ? (food.prot / targets.prot) * 100 : 0)}%`,
              }}
            />
          </span>
        </div>
        <IconChevronRight />
      </button>

      <button className="card presence-card rise" onClick={() => navigate("/grupo")}>
        <div className="presence-avatars">
          {friendsToday.length > 0 ? (
            friendsToday.map((f) => <Avatar key={f.id} initials={f.initials} color={f.color} />)
          ) : (
            <Avatar initials="—" color="#8a7d69" dimmed />
          )}
          {trainedToday && (
            <span className="presence-me">
              <IconCheck size={15} stroke={3} />
            </span>
          )}
        </div>
        <div className="presence-text">
          <p className="eyebrow">O grupo</p>
          <p>{presenceLine}</p>
        </div>
        <IconChevronRight />
      </button>

      {quickLog && <QuickLogSheet onClose={() => setQuickLog(false)} />}
    </main>
  );
}
