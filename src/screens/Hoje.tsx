import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import { formatLong, greeting, todayISO } from "../lib/dates";
import {
  nextWorkout,
  presentToday,
  sessionsThisWeek,
  todayPlan,
  weekPresence,
  weekStreak,
} from "../lib/logic";
import { EXERCISE_BY_ID } from "../lib/exercises";
import { dayTotals } from "../lib/nutrition";
import { fmtInt } from "../lib/format";
import { Avatar, BigButton, Chip, Sheet, WeekStrip } from "../components/ui";
import { IconCheck, IconChevronRight, IconDiet, IconPulse } from "../components/icons";
import { HeaderAccount } from "../components/account";
import { NotifBell } from "../components/NotifBell";
import { QuickLogSheet } from "../components/QuickLog";
import "./hoje.css";

export function Hoje() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [quickLog, setQuickLog] = useState(false);
  const [picking, setPicking] = useState(false);
  const [chosenId, setChosenId] = useState<string | null>(null);

  const sync = useSync();
  const me = state.members.find((m) => m.isMe)!;
  const friends =
    sync.session && sync.group
      ? (sync.friends ?? [])
      : state.members.filter((m) => !m.isMe);
  const friendsToday = friends.filter(presentToday);
  const trainedToday = presentToday(me);
  const active = state.activeSessionId
    ? state.sessions.find((s) => s.id === state.activeSessionId)
    : null;
  // treino do dia: o escolhido na hora > o da agenda > a rotação (fallback)
  const planned = todayPlan(state);
  const chosen = chosenId ? state.workouts.find((w) => w.id === chosenId) : null;
  const workout = chosen ?? planned.workout ?? nextWorkout(state);
  const isRest = planned.isRest && !chosen && !active;
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
        <div className="hoje-head-actions">
          {sync.session && <NotifBell />}
          <HeaderAccount />
        </div>
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
          <span className={`today-letter serif-num ${isRest ? "today-letter-rest" : ""}`}>
            {isRest ? "·" : workout.letter}
          </span>
          <div>
            <p className="eyebrow">
              {active ? "Treino em andamento" : isRest ? "Hoje é descanso" : "Treino de hoje"}
            </p>
            <h2>{active ? workout.name : isRest ? "Dia de recuperação" : workout.name}</h2>
          </div>
        </div>

        {isRest ? (
          <>
            <p className="today-rest-note">
              Descanso também constrói — músculo cresce na recuperação. Se quiser mexer o corpo
              mesmo assim, escolha um treino.
            </p>
            <BigButton onClick={() => setPicking(true)} tone="ink">
              <IconPulse size={20} />
              Treinar mesmo assim
            </BigButton>
            <button className="today-alt" onClick={() => setQuickLog(true)}>
              Treinou e não registrou? Lançar treino
            </button>
          </>
        ) : (
          <>
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
              {workout.items.length === 0 && (
                <li className="today-more">Treino sem exercícios — monte ele no Plano.</li>
              )}
            </ul>
            <BigButton onClick={start} tone={trainedToday && !active ? "ink" : "pulse"}>
              <IconPulse size={20} />
              {active
                ? "Continuar treino"
                : trainedToday
                  ? "Registrar outro treino"
                  : "Começar treino"}
            </BigButton>
            {!active && (
              <div className="today-alts">
                <button className="today-alt" onClick={() => setPicking(true)}>
                  Fazer outro treino
                </button>
                <span className="today-alt-sep" aria-hidden>
                  ·
                </span>
                <button className="today-alt" onClick={() => setQuickLog(true)}>
                  Lançar treino de outro dia
                </button>
              </div>
            )}
          </>
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

      {picking && (
        <Sheet title="Escolher treino de hoje" onClose={() => setPicking(false)}>
          <div className="today-picker">
            {state.workouts.map((w) => (
              <button
                key={w.id}
                className={`today-pick ${workout.id === w.id ? "today-pick-on" : ""}`}
                onClick={() => {
                  setChosenId(w.id);
                  setPicking(false);
                }}
              >
                <span className="today-pick-letter serif-num">{w.letter}</span>
                <div className="today-pick-info">
                  <b>{w.name}</b>
                  <small>
                    {w.items.length} {w.items.length === 1 ? "exercício" : "exercícios"}
                  </small>
                </div>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </main>
  );
}
