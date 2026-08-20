import { useMemo, useState } from "react";
import {
  countPlanCompletions,
  describeRecurrence,
  formatShortDate,
  isTodoOverdue,
  isTodoVisibleToday,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
} from "../domain/todo";
import { localDateKey } from "../domain/stats";
import { useLocalDayKey } from "../hooks/useLocalDayKey";
import type {
  Todo,
  TodoPlan,
  TodoPriority,
  TodoRepeatFrequency,
  TodoScheduleType,
} from "../domain/types";
import { useAppStore, type TodoInput } from "../store/useAppStore";

const priorityOptions: Array<{ value: TodoPriority; label: string }> = [
  { value: "importantUrgent", label: "重要且紧急" },
  { value: "importantNotUrgent", label: "重要但不紧急" },
  { value: "urgentNotImportant", label: "紧急但不重要" },
  { value: "notImportantNotUrgent", label: "不紧急也不重要" },
];

const scheduleOptions: Array<{ value: TodoScheduleType; label: string }> = [
  { value: "ordinary", label: "普通待办" },
  { value: "scheduled", label: "指定日期" },
  { value: "recurring", label: "重复待办" },
  { value: "dateRange", label: "时间区间" },
];

const weekdays = [
  { value: 1, label: "一" }, { value: 2, label: "二" },
  { value: 3, label: "三" }, { value: 4, label: "四" },
  { value: 5, label: "五" }, { value: 6, label: "六" },
  { value: 0, label: "日" },
];

const makeEmptyForm = (): TodoInput => {
  // This helper is also called from a useState initializer. Hooks must never
  // run here, otherwise opening the form changes TodoPanel's hook order and
  // React replaces the window with its error background on the next input.
  const today = localDateKey();
  return {
    title: "", priority: "importantNotUrgent", scheduleType: "ordinary",
    estimatedPomodoros: 1, scheduledDate: today, startDate: today, endDate: today,
    recurrence: { frequency: "daily", weekdays: [new Date().getDay()], monthDay: new Date().getDate() },
  };
};

const inputFromTodo = (todo: Todo): TodoInput => ({
  title: todo.title, priority: todo.priority,
  scheduleType: todo.scheduleType === "scheduled" ? "scheduled" : "ordinary",
  estimatedPomodoros: todo.estimatedPomodoros, scheduledDate: todo.scheduledDate,
});

const inputFromPlan = (plan: TodoPlan): TodoInput => ({
  title: plan.title, priority: plan.priority, scheduleType: plan.scheduleType,
  estimatedPomodoros: plan.estimatedPomodoros, startDate: plan.startDate,
  endDate: plan.endDate ?? plan.startDate,
  recurrence: plan.recurrence ?? { frequency: "daily" },
});

function TodoForm({ todo, plan, onDone }: { todo?: Todo; plan?: TodoPlan; onDone: () => void }) {
  const addTodo = useAppStore((state) => state.addTodo);
  const updateTodo = useAppStore((state) => state.updateTodo);
  const updateTodoPlan = useAppStore((state) => state.updateTodoPlan);
  const [form, setForm] = useState<TodoInput>(() => plan ? inputFromPlan(plan) : todo ? inputFromTodo(todo) : makeEmptyForm());
  const editing = Boolean(todo || plan);

  const setFrequency = (frequency: TodoRepeatFrequency) => setForm({
    ...form,
    recurrence: {
      ...form.recurrence, frequency,
      weekdays: form.recurrence?.weekdays?.length ? form.recurrence.weekdays : [new Date().getDay()],
      monthDay: form.recurrence?.monthDay ?? new Date().getDate(),
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    const normalized: TodoInput = {
      ...form,
      endDate: form.scheduleType === "dateRange" && form.endDate && form.startDate && form.endDate < form.startDate ? form.startDate : form.endDate,
      recurrence: form.scheduleType === "recurring" ? {
        frequency: form.recurrence?.frequency ?? "daily",
        weekdays: form.recurrence?.frequency === "weekly" ? form.recurrence.weekdays?.length ? form.recurrence.weekdays : [new Date().getDay()] : undefined,
        monthDay: form.recurrence?.frequency === "monthly" ? Math.min(31, Math.max(1, form.recurrence.monthDay ?? 1)) : undefined,
      } : undefined,
    };
    if (plan) updateTodoPlan(plan.id, normalized);
    else if (todo) updateTodo(todo.id, normalized);
    else addTodo(normalized);
    onDone();
  };

  return (
    <form className="todo-form todo-form--expanded" onSubmit={submit}>
      <label className="todo-field todo-field--wide"><span>待办内容</span><input autoFocus value={form.title} maxLength={80} placeholder="例如：完成项目方案" onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
      <label className="todo-field"><span>优先级</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TodoPriority })}>{priorityOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
      <label className="todo-field"><span>安排方式</span><select value={form.scheduleType} disabled={editing} title={editing ? "如需改变安排方式，请删除后重新建立" : undefined} onChange={(event) => setForm({ ...form, scheduleType: event.target.value as TodoScheduleType })}>{scheduleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
      <label className="todo-field todo-field--compact"><span>预计番茄</span><input type="number" min={1} max={20} value={form.estimatedPomodoros} onChange={(event) => setForm({ ...form, estimatedPomodoros: Number(event.target.value) })} /></label>

      {form.scheduleType === "scheduled" ? <label className="todo-field"><span>出现日期</span><input type="date" value={form.scheduledDate} onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} required /></label> : null}

      {form.scheduleType === "recurring" ? <>
        <label className="todo-field"><span>开始日期</span><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></label>
        <label className="todo-field"><span>重复周期</span><select value={form.recurrence?.frequency ?? "daily"} onChange={(event) => setFrequency(event.target.value as TodoRepeatFrequency)}><option value="daily">每天</option><option value="weekly">每周</option><option value="monthly">每月</option></select></label>
        {form.recurrence?.frequency === "weekly" ? <div className="todo-field todo-field--wide"><span>每周执行</span><div className="weekday-picker">{weekdays.map((day) => {
          const active = form.recurrence?.weekdays?.includes(day.value) ?? false;
          return <button type="button" className={active ? "weekday-button weekday-button--active" : "weekday-button"} aria-pressed={active} key={day.value} onClick={() => {
            const current = form.recurrence?.weekdays ?? [];
            const next = active ? current.filter((value) => value !== day.value) : [...current, day.value];
            setForm({ ...form, recurrence: { ...form.recurrence!, weekdays: next } });
          }}>{day.label}</button>;
        })}</div></div> : null}
        {form.recurrence?.frequency === "monthly" ? <label className="todo-field"><span>每月日期</span><input type="number" min={1} max={31} value={form.recurrence.monthDay ?? 1} onChange={(event) => setForm({ ...form, recurrence: { ...form.recurrence!, monthDay: Number(event.target.value) } })} /></label> : null}
      </> : null}

      {form.scheduleType === "dateRange" ? <>
        <label className="todo-field"><span>开始日期</span><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></label>
        <label className="todo-field"><span>结束日期</span><input type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required /></label>
      </> : null}

      <div className="todo-form__actions todo-field--wide"><button type="button" className="button button--ghost" onClick={onDone}>取消</button><button type="submit" className="button button--mini-primary">{editing ? "保存" : "添加"}</button></div>
    </form>
  );
}

const PriorityTag = ({ priority }: { priority: TodoPriority }) => <span className={`tag priority-tag priority-tag--${priority}`}>{PRIORITY_LABELS[priority]}</span>;
type TodoTab = "today" | "plans" | "history";

export function TodoPanel() {
  const todos = useAppStore((state) => state.todos);
  const plans = useAppStore((state) => state.todoPlans);
  const selectedTodoId = useAppStore((state) => state.timer.selectedTodoId);
  const timerStatus = useAppStore((state) => state.timer.status);
  const selectTodo = useAppStore((state) => state.selectTodo);
  const toggleTodo = useAppStore((state) => state.toggleTodo);
  const deleteTodo = useAppStore((state) => state.deleteTodo);
  const deleteTodoPlan = useAppStore((state) => state.deleteTodoPlan);
  const [tab, setTab] = useState<TodoTab>("today");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [editingPlanId, setEditingPlanId] = useState<string>();
  const today = useLocalDayKey();
  const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
  const activePlans = useMemo(() => plans.filter((plan) => !plan.archivedAt), [plans]);

  const todayTodos = useMemo(() => todos.filter((todo) => isTodoVisibleToday(todo, today)).sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted) || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.scheduledDate.localeCompare(b.scheduledDate)), [today, todos]);
  const futureTodos = useMemo(() => todos.filter((todo) => !todo.archivedAt && !todo.planId && todo.scheduledDate > today).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)), [today, todos]);
  const historyTodos = useMemo(() => todos.filter((todo) => todo.archivedAt && todo.isCompleted && todo.scheduleType !== "dateRange").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")), [todos]);
  const rangeHistory = useMemo(() => plans.filter((plan) => plan.scheduleType === "dateRange" && (Boolean(plan.archivedAt) || countPlanCompletions(plan.id, todos) > 0)), [plans, todos]);

  const choose = (todo: Todo) => {
    if (todo.isCompleted) return;
    if (timerStatus === "running" && todo.id !== selectedTodoId && !window.confirm("专注正在进行，确定把本轮改绑到这个待办吗？")) return;
    selectTodo(todo.id === selectedTodoId ? undefined : todo.id);
  };
  const openTab = (next: TodoTab) => { setTab(next); setShowForm(false); setEditingId(undefined); setEditingPlanId(undefined); };

  return (
    <section className="panel todo-panel">
      <div className="panel__header todo-panel__header"><div><p className="section-kicker">TASKS</p><h2>{tab === "today" ? "今日待办" : tab === "plans" ? "任务计划" : "历史记录"}</h2></div>{tab === "today" ? <button className="add-button" onClick={() => setShowForm(true)}>＋ 新增待办</button> : null}</div>
      <div className="todo-tabs" role="tablist" aria-label="待办视图">
        <button className={tab === "today" ? "todo-tab todo-tab--active" : "todo-tab"} onClick={() => openTab("today")}>今日 <span>{todayTodos.length}</span></button>
        <button className={tab === "plans" ? "todo-tab todo-tab--active" : "todo-tab"} onClick={() => openTab("plans")}>计划 <span>{activePlans.length + futureTodos.length}</span></button>
        <button className={tab === "history" ? "todo-tab todo-tab--active" : "todo-tab"} onClick={() => openTab("history")}>历史 <span>{historyTodos.length + rangeHistory.length}</span></button>
      </div>
      {showForm && <TodoForm onDone={() => setShowForm(false)} />}

      {tab === "today" ? <div className="todo-list">
        {todayTodos.length === 0 && !showForm ? <div className="empty-state"><span>✓</span><strong>今天还没有待办</strong><p>写下一件小事，和煤煤一起开始。</p></div> : null}
        {todayTodos.map((todo) => {
          const plan = todo.planId ? planById.get(todo.planId) : undefined;
          const overdue = isTodoOverdue(todo, today);
          return editingId === todo.id ? <TodoForm key={todo.id} todo={plan ? undefined : todo} plan={plan} onDone={() => setEditingId(undefined)} /> :
            <article key={todo.id} className={`todo-row ${todo.id === selectedTodoId ? "todo-row--selected" : ""} ${todo.isCompleted ? "todo-row--done" : ""} ${overdue ? "todo-row--overdue" : ""}`} onClick={() => choose(todo)}>
              <button className="todo-check" aria-label={todo.isCompleted ? "取消完成" : "标记完成"} onClick={(event) => { event.stopPropagation(); toggleTodo(todo.id); }}>{todo.isCompleted ? "✓" : ""}</button>
              <div className="todo-row__main"><strong>{todo.title}</strong><div className="todo-row__meta">
                <PriorityTag priority={todo.priority} />
                {overdue ? <span className="tag overdue-tag">{formatShortDate(todo.scheduledDate)} · 已逾期</span> : null}
                {!overdue && todo.scheduleType === "scheduled" ? <span className="tag">指定 {formatShortDate(todo.scheduledDate)}</span> : null}
                {plan ? <span className="tag schedule-tag">{describeRecurrence(plan)}</span> : null}
                {plan?.scheduleType === "dateRange" ? <span>✓ {countPlanCompletions(plan.id, todos)} 次</span> : null}
                <span>🍅 {todo.completedPomodoros}/{todo.estimatedPomodoros}</span>
              </div></div>
              {todo.id === selectedTodoId && !todo.isCompleted ? <span className="focus-badge">当前专注</span> : null}
              <div className="todo-row__actions"><button aria-label="编辑待办" onClick={(event) => { event.stopPropagation(); setEditingId(todo.id); }}>✎</button><button aria-label="删除待办" onClick={(event) => { event.stopPropagation(); const text = plan ? `删除“${todo.title}”的整个计划及全部记录吗？` : `删除“${todo.title}”吗？`; if (window.confirm(text)) deleteTodo(todo.id); }}>×</button></div>
            </article>;
        })}
      </div> : null}

      {tab === "plans" ? <div className="todo-list plan-list">
        {activePlans.map((plan) => editingPlanId === plan.id ? <TodoForm key={plan.id} plan={plan} onDone={() => setEditingPlanId(undefined)} /> :
          <article className="plan-row" key={plan.id}><div className="plan-row__main"><strong>{plan.title}</strong><div><PriorityTag priority={plan.priority} /><span className="tag schedule-tag">{describeRecurrence(plan)}</span><span className="tag">开始 {formatShortDate(plan.startDate)}</span></div><small>已完成 {countPlanCompletions(plan.id, todos)} 次</small></div><div className="plan-row__actions"><button onClick={() => setEditingPlanId(plan.id)}>编辑</button><button onClick={() => { if (window.confirm(`删除“${plan.title}”的整个计划及全部记录吗？`)) deleteTodoPlan(plan.id); }}>删除</button></div></article>)}
        {futureTodos.map((todo) => editingId === todo.id ? <TodoForm key={todo.id} todo={todo} onDone={() => setEditingId(undefined)} /> :
          <article className="plan-row" key={todo.id}><div className="plan-row__main"><strong>{todo.title}</strong><div><PriorityTag priority={todo.priority} /><span className="tag">指定 {formatShortDate(todo.scheduledDate)}</span></div><small>到指定日期自动进入今日待办</small></div><div className="plan-row__actions"><button onClick={() => setEditingId(todo.id)}>编辑</button><button onClick={() => { if (window.confirm(`删除“${todo.title}”吗？`)) deleteTodo(todo.id); }}>删除</button></div></article>)}
        {activePlans.length === 0 && futureTodos.length === 0 ? <div className="empty-state empty-state--compact"><span>◷</span><strong>还没有任务计划</strong><p>重复待办、时间区间和未来指定日期会显示在这里。</p></div> : null}
      </div> : null}

      {tab === "history" ? <div className="todo-list history-list">
        {rangeHistory.map((plan) => <article className="history-row" key={`range-${plan.id}`}><span className="history-row__icon">↻</span><div><strong>{plan.title}</strong><p>{describeRecurrence(plan)} · 共完成 {countPlanCompletions(plan.id, todos)} 次{plan.archivedAt ? " · 已结束" : " · 进行中"}</p></div></article>)}
        {historyTodos.map((todo) => <article className="history-row" key={todo.id}><span className="history-row__icon">✓</span><div><strong>{todo.title}</strong><p>{formatShortDate(todo.scheduledDate)} 的任务 · 完成于 {todo.completedAt ? formatShortDate(localDateKey(todo.completedAt)) : "—"}</p></div><PriorityTag priority={todo.priority} /></article>)}
        {rangeHistory.length === 0 && historyTodos.length === 0 ? <div className="empty-state empty-state--compact"><span>□</span><strong>历史记录还是空的</strong><p>今天完成的待办会在明天自动收纳到这里。</p></div> : null}
      </div> : null}
    </section>
  );
}
