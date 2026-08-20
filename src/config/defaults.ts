import type { AppSettings, RewardState } from "../domain/types";
import { createIdleTimer } from "../domain/timer";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "latte",
  appIconStyle: "meimeiGreen",
  catName: "煤煤",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  enableFullscreenBreakReminder: true,
  enableSound: false,
  enableAlwaysOnTop: true,
  floatingOpacity: 1,
  floatingScale: 1,
  enableBagEasterEgg: false,
};

export const DEFAULT_REWARD: RewardState = {
  coins: 0,
  ownedStickerIds: [],
  transactions: [],
};

export const DEFAULT_TIMER = createIdleTimer("focus", DEFAULT_SETTINGS);
