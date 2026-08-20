import { useMemo } from "react";
import { calculateTodayStats } from "../domain/stats";
import { useAppStore } from "../store/useAppStore";

export function StatsPanel() {
  const todos = useAppStore((state) => state.todos);
  const sessions = useAppStore((state) => state.sessions);
  const transactions = useAppStore((state) => state.reward.transactions);
  const stats = useMemo(
    () => calculateTodayStats(sessions, todos, transactions),
    [sessions, todos, transactions],
  );

  const items = [
    { icon: "◷", value: `${stats.focusMinutes}`, label: "专注分钟", tone: "green" },
    { icon: "●", value: `${stats.completedPomodoros}`, label: "完成番茄", tone: "red" },
    { icon: "✓", value: `${stats.completedTodos}`, label: "完成待办", tone: "blue" },
    { icon: "＋", value: `${stats.earnedCoins.toFixed(1)}`, label: "今日专注币", tone: "gold" },
  ];

  return (
    <section className="stats-grid" aria-label="今日统计">
      {items.map((item) => (
        <article className={`stat-card stat-card--${item.tone}`} key={item.label}>
          <span className="stat-card__icon">{item.icon}</span>
          <div><strong>{item.value}</strong><p>{item.label}</p></div>
        </article>
      ))}
    </section>
  );
}
