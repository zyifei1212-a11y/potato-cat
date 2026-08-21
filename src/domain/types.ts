export type TodoPriority =
  | "importantUrgent"
  | "importantNotUrgent"
  | "urgentNotImportant"
  | "notImportantNotUrgent";

export type TodoScheduleType = "ordinary" | "scheduled" | "recurring" | "dateRange";
export type TodoRepeatFrequency = "daily" | "weekly" | "monthly";
export type WindowSizePreset = "compact" | "medium" | "fullscreen";

export interface TodoRecurrence {
  frequency: TodoRepeatFrequency;
  weekdays?: number[];
  monthDay?: number;
}

export interface TodoPlan {
  id: string;
  title: string;
  priority: TodoPriority;
  scheduleType: "recurring" | "dateRange";
  estimatedPomodoros: number;
  requiresPomodoro?: boolean;
  startDate: string;
  endDate?: string;
  recurrence?: TodoRecurrence;
  createdAt: string;
  lastGeneratedDate?: string;
  archivedAt?: string;
}

export interface Todo {
  id: string;
  planId?: string;
  title: string;
  priority: TodoPriority;
  scheduleType: TodoScheduleType;
  scheduledDate: string;
  estimatedPomodoros: number;
  requiresPomodoro?: boolean;
  completedPomodoros: number;
  isCompleted: boolean;
  createdAt: string;
  completedAt?: string;
  completionRewardedAt?: string;
  archivedAt?: string;
}

export interface FocusSession {
  id: string;
  runId: string;
  todoId?: string;
  todoTitle?: string;
  startedAt: string;
  endedAt?: string;
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  status: "completed" | "abandoned" | "interrupted";
  rewardCoins: number;
}

export interface RewardTransaction {
  id: string;
  sourceKey: string;
  type: "focus_completed" | "todo_completed" | "daily_four_bonus";
  amount: number;
  createdAt: string;
}

export interface RewardState {
  coins: number;
  ownedStickerIds: string[];
  dailyBonusClaimedDate?: string;
  transactions: RewardTransaction[];
}

export interface AppSettings {
  theme: AppTheme;
  appIconStyle: AppIconStyle;
  windowSizePreset: WindowSizePreset;
  catName: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  enableFullscreenBreakReminder: boolean;
  enableSound: boolean;
  enableAlwaysOnTop: boolean;
  floatingOpacity: number;
  floatingScale: number;
  enableBagEasterEgg: boolean;
}

export type AppTheme = "latte" | "matcha" | "mistBlue" | "warmBerry";
export type AppIconStyle = "meimeiGreen" | "classic";

export type TimerMode = "focus" | "shortBreak" | "longBreak";
export type TimerStatus = "idle" | "running" | "paused" | "completed";

export interface TimerSnapshot {
  runId?: string;
  mode: TimerMode;
  status: TimerStatus;
  durationSeconds: number;
  remainingSeconds: number;
  startedAt?: string;
  endAt?: number;
  selectedTodoId?: string;
  completedFocusCount: number;
}

export type PetVisualState =
  | "idleLoaf"
  | "focusTyping"
  | "hoverLook"
  | "sleepBreathing"
  | "dragLift"
  | "breakOverlay"
  | "bagEasterEgg";

export interface TodayStats {
  focusMinutes: number;
  completedPomodoros: number;
  completedTodos: number;
  abandonedSessions: number;
  earnedCoins: number;
}

