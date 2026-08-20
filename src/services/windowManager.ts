import { APP_ICON_SOURCES } from "../config/appIcons";
import type { AppIconStyle } from "../domain/types";

const isTauri = () => Boolean(window.__TAURI_INTERNALS__);

// Includes a small transparent safety gutter. WebView and Windows display
// scaling can round opposite edges differently, so matching the 350x352 CSS
// stage exactly can still cut off the final few physical pixels.
export const PET_WINDOW_BASE_SIZE = { width: 370, height: 372 } as const;

interface Point {
  x: number;
  y: number;
}

export const petWindowSizeForScale = (scale: number) => ({
  width: Math.ceil(PET_WINDOW_BASE_SIZE.width * scale),
  height: Math.ceil(PET_WINDOW_BASE_SIZE.height * scale),
});

export const desktopPointerToClient = (
  pointer: Point,
  windowOrigin: Point,
  scaleFactor: number,
  contentScale = 1,
): Point => ({
  x: (pointer.x - windowOrigin.x) / scaleFactor / contentScale,
  y: (pointer.y - windowOrigin.y) / scaleFactor / contentScale,
});

export const showWindow = async (label: "main" | "pet" | "break-overlay") => {
  if (!isTauri()) return false;
  if (label === "main") {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<boolean>("show_main_window");
  }
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const target = await WebviewWindow.getByLabel(label);
  await target?.show();
  if (label === "break-overlay") await target?.setFocus();
  return Boolean(target);
};

export const hideCurrentWindow = async () => {
  if (!isTauri()) return false;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().hide();
  return true;
};

export const minimizeCurrentWindow = async () => {
  if (!isTauri()) return false;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().minimize();
  return true;
};

export const setCurrentWindowIgnoreCursorEvents = async (value: boolean) => {
  if (!isTauri()) return false;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setIgnoreCursorEvents(value);
  return true;
};

export const startWindowDragging = async () => {
  if (!isTauri()) return false;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().startDragging();
  return true;
};

export const isPrimaryMouseButtonPressed = async () => {
  if (!isTauri()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<boolean>("is_primary_mouse_button_pressed");
};

export const resizePetWindow = async (scale: number) => {
  if (!isTauri()) return false;
  const { invoke } = await import("@tauri-apps/api/core");
  try {
    const resized = await invoke<boolean>("resize_pet_window", { scale });
    if (resized) return true;
  } catch {
    // Keep the JS window API as a fallback for older development binaries.
  }
  const [{ LogicalSize }, { getCurrentWindow }] = await Promise.all([
    import("@tauri-apps/api/dpi"),
    import("@tauri-apps/api/window"),
  ]);
  const size = petWindowSizeForScale(scale);
  await getCurrentWindow().setSize(new LogicalSize(size.width, size.height));
  return true;
};

export const startDesktopPointerTracking = async (
  onMove: (position: Point) => void,
  contentScale = 1,
) => {
  if (!isTauri()) return null;

  const { cursorPosition, getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();
  let [windowOrigin, scaleFactor] = await Promise.all([
    appWindow.outerPosition(),
    appWindow.scaleFactor(),
  ]);
  let disposed = false;
  let pending = false;
  let animationFrame = 0;

  const [stopMoved, stopScaleChanged] = await Promise.all([
    appWindow.onMoved(({ payload }) => {
      windowOrigin = payload;
    }),
    appWindow.onScaleChanged(({ payload }) => {
      scaleFactor = payload.scaleFactor;
    }),
  ]);

  const sampleLatestPointer = () => {
    if (disposed) return;
    animationFrame = window.requestAnimationFrame(sampleLatestPointer);
    if (pending) return;

    pending = true;
    void cursorPosition()
      .then((pointer) => {
        if (!disposed) {
          onMove(desktopPointerToClient(pointer, windowOrigin, scaleFactor, contentScale));
        }
      })
      .catch(() => {
        // A desktop process being restarted can briefly reject an IPC sample.
        // The next animation frame retries without interrupting eye movement.
      })
      .finally(() => {
        pending = false;
      });
  };

  animationFrame = window.requestAnimationFrame(sampleLatestPointer);

  return () => {
    disposed = true;
    window.cancelAnimationFrame(animationFrame);
    stopMoved();
    stopScaleChanged();
  };
};

export const setPetAlwaysOnTop = async (value: boolean) => {
  if (!isTauri()) return false;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const pet = await WebviewWindow.getByLabel("pet");
  await pet?.setAlwaysOnTop(value);
  return Boolean(pet);
};

export const quitApplication = async () => {
  if (!isTauri()) return false;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("quit_app");
  return true;
};

export const applyAppIcon = async (style: AppIconStyle) => {
  if (!isTauri()) return { windowUpdated: false, shortcutCount: 0 };

  let windowUpdated = false;
  try {
    const [{ getCurrentWindow }, { Image: TauriImage }] = await Promise.all([
      import("@tauri-apps/api/window"),
      import("@tauri-apps/api/image"),
    ]);
    const source = new globalThis.Image();
    source.src = APP_ICON_SOURCES[style];
    await source.decode();
    const canvas = document.createElement("canvas");
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    const context = canvas.getContext("2d");
    if (context) {
      context.drawImage(source, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const nativeIcon = await TauriImage.new(Uint8Array.from(pixels.data), pixels.width, pixels.height);
      try {
        await getCurrentWindow().setIcon(nativeIcon);
        windowUpdated = true;
      } finally {
        await nativeIcon.close();
      }
    }
  } catch {
    // Some platforms cannot replace a running taskbar icon. The bundled icon
    // and the visible in-app icon still use the selected style.
  }

  let shortcutCount = 0;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    shortcutCount = await invoke<number>("set_shortcut_icon", { style });
  } catch {
    // Development builds normally do not have an installed shortcut.
  }

  return { windowUpdated, shortcutCount };
};
