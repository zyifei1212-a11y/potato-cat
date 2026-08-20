import { useEffect, useMemo, useState } from "react";
import bagEasterEggSrc from "../assets/pet/bagEasterEgg/cat.png";
import breakRestSrc from "../assets/pet/breakOverlay/rest.png";
import breakSettleSrc from "../assets/pet/breakOverlay/settle.png";
import breakWalkSrc from "../assets/pet/breakOverlay/walk.png";
import dragLiftSrc from "../assets/pet/dragLift/cat.png";
import focusTypingSrc from "../assets/pet/focusTyping/cat.png";
import focusLeftPressSrc from "../assets/pet/focusTyping/left-press.png";
import focusRightPressSrc from "../assets/pet/focusTyping/right-press.png";
import hoverLookSrc from "../assets/pet/hoverLook/cat.png";
import idleLoafSrc from "../assets/pet/idleLoaf/cat.png";
import sleepBreathingSrc from "../assets/pet/sleepBreathing/cat.png";
import { resolvePetState } from "../domain/pet";
import type { PetVisualState, TimerSnapshot } from "../domain/types";
import {
  isPrimaryMouseButtonPressed,
  startWindowDragging,
} from "../services/windowManager";

interface PetCatProps {
  timer: TimerSnapshot;
  forceState?: PetVisualState;
  draggable?: boolean;
  onStateChange?: (state: PetVisualState) => void;
}

interface PetAssetFrame {
  src: string;
  className: string;
}

export interface PetAssetConfig {
  src: string;
  fallback: "css";
  className: string;
  loop: boolean;
  hearts: boolean;
  keyboard?: boolean;
  exclamation?: boolean;
  frames?: readonly PetAssetFrame[];
}

export const PET_ASSETS: Partial<Record<PetVisualState, PetAssetConfig>> = {
  idleLoaf: {
    src: idleLoafSrc,
    fallback: "css",
    className: "pet-real--idleLoaf",
    loop: true,
    hearts: false,
  },
  focusTyping: {
    src: focusTypingSrc,
    fallback: "css",
    className: "pet-real--focusTyping",
    loop: true,
    hearts: false,
    // The generated source already contains its single keyboard.
    keyboard: false,
    frames: [
      { src: focusTypingSrc, className: "pet-real-frame pet-real-frame--focus-base" },
      { src: focusLeftPressSrc, className: "pet-real-frame pet-real-frame--focus-left" },
      { src: focusRightPressSrc, className: "pet-real-frame pet-real-frame--focus-right" },
    ],
  },
  hoverLook: {
    src: hoverLookSrc,
    fallback: "css",
    className: "pet-real--hoverLook",
    loop: true,
    hearts: true,
  },
  sleepBreathing: {
    src: sleepBreathingSrc,
    fallback: "css",
    className: "pet-real--sleepBreathing",
    loop: true,
    hearts: false,
  },
  dragLift: {
    src: dragLiftSrc,
    fallback: "css",
    className: "pet-real--dragLift",
    loop: true,
    hearts: false,
  },
  breakOverlay: {
    src: breakRestSrc,
    fallback: "css",
    className: "pet-real--breakOverlay",
    loop: false,
    hearts: false,
    frames: [
      { src: breakWalkSrc, className: "pet-real-frame pet-real-frame--walk" },
      { src: breakSettleSrc, className: "pet-real-frame pet-real-frame--settle" },
      { src: breakRestSrc, className: "pet-real-frame pet-real-frame--rest" },
    ],
  },
  bagEasterEgg: {
    src: bagEasterEggSrc,
    fallback: "css",
    className: "pet-real--bagEasterEgg",
    loop: true,
    hearts: false,
  },
};

const stateLabel: Record<PetVisualState, string> = {
  idleLoaf: "卧趴陪伴",
  focusTyping: "慢慢敲键盘",
  hoverLook: "抬头看你",
  sleepBreathing: "闭眼休息",
  dragLift: "被双手托起",
  breakOverlay: "走来卧下提醒",
  bagEasterEgg: "钻进袋子",
};

function RealPetVisual({
  config,
  state,
  onAssetError,
}: {
  config: PetAssetConfig;
  state: PetVisualState;
  onAssetError: () => void;
}) {
  const frames = config.frames ?? [{ src: config.src, className: "" }];

  return (
    <div
      className={`pet-real ${config.className} ${config.loop ? "pet-real--loop" : ""}`}
      data-state={state}
    >
      {frames.map((frame) => (
        <img
          key={frame.src}
          className={`pet-real-image ${frame.className}`}
          src={frame.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          onError={onAssetError}
        />
      ))}

      {config.hearts ? (
        <div className="pet-overlay-hearts" aria-hidden="true">
          <span>♥</span><span>♥</span><span>♥</span>
        </div>
      ) : null}

      {config.exclamation ? <div className="pet-overlay-exclamation" aria-hidden="true">!</div> : null}

      {config.keyboard ? (
        <div className="pet-keyboard-prop" aria-hidden="true">
          <span className="pet-real-paw-motion pet-real-paw-motion--left" />
          <span className="pet-real-paw-motion pet-real-paw-motion--right" />
        </div>
      ) : null}
    </div>
  );
}

function CssPetFallback({ state }: { state: PetVisualState }) {
  return (
    <div className={`real-cat real-cat--${state}`} aria-hidden="true">
      <div className="real-cat__hands"><span /><span /></div>
      <div className="real-cat__hearts"><span>♥</span><span>♥</span><span>♥</span></div>
      <div className="real-cat__zzz">Zzz</div>
      <div className="real-cat__tail" />
      <div className="real-cat__body">
        <div className="real-cat__chest" />
        <div className="real-cat__leg real-cat__leg--left" />
        <div className="real-cat__leg real-cat__leg--right" />
      </div>
      <div className="real-cat__head">
        <div className="real-cat__ear real-cat__ear--left" />
        <div className="real-cat__ear real-cat__ear--right" />
        <div className="real-cat__mask" />
        <span className="real-cat__eye real-cat__eye--left" />
        <span className="real-cat__eye real-cat__eye--right" />
        <span className="real-cat__nose" />
        <span className="real-cat__mouth">⌄</span>
      </div>
      <div className="real-cat__paw real-cat__paw--left" />
      <div className="real-cat__paw real-cat__paw--right" />
      <div className="real-cat__keyboard">
        <span>• • • • •</span><span>• • • •</span>
      </div>
      <div className="real-cat__bag">袋</div>
    </div>
  );
}

export function PetCat({
  timer,
  forceState,
  draggable = false,
  onStateChange,
}: PetCatProps) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [failedAssets, setFailedAssets] = useState<Set<PetVisualState>>(() => new Set());
  const focusing = timer.mode === "focus" && timer.status === "running";
  const state = useMemo(
    () =>
      forceState ??
      resolvePetState(
        timer,
        dragging ? "drag" : hovered && !focusing ? "hover" : undefined,
      ),
    [dragging, focusing, forceState, hovered, timer],
  );
  const asset = PET_ASSETS[state];
  const useRealAsset = Boolean(asset && !failedAssets.has(state));

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  useEffect(() => {
    if (!dragging) return;

    const finishDrag = () => {
      setDragging(false);
      setHovered(false);
    };
    let checkingButton = false;
    let releasedReadings = 0;
    const checkNativeButton = async () => {
      if (checkingButton) return;
      checkingButton = true;
      try {
        const pressed = await isPrimaryMouseButtonPressed();
        if (pressed === false) {
          releasedReadings += 1;
          if (releasedReadings >= 2) finishDrag();
        } else if (pressed === true) {
          releasedReadings = 0;
        }
      } catch {
        // Pointer events below remain the browser-preview fallback.
      } finally {
        checkingButton = false;
      }
    };
    const finishDragWhenReleased = (event: PointerEvent) => {
      if (event.buttons === 0) finishDrag();
    };
    const buttonPoll = window.setInterval(() => void checkNativeButton(), 40);
    window.addEventListener("pointerup", finishDrag, true);
    window.addEventListener("pointercancel", finishDrag, true);
    window.addEventListener("pointermove", finishDragWhenReleased, true);
    window.addEventListener("mouseup", finishDrag, true);
    return () => {
      window.clearInterval(buttonPoll);
      window.removeEventListener("pointerup", finishDrag, true);
      window.removeEventListener("pointercancel", finishDrag, true);
      window.removeEventListener("pointermove", finishDragWhenReleased, true);
      window.removeEventListener("mouseup", finishDrag, true);
    };
  }, [dragging]);

  const startDrag = () => {
    if (!draggable) return;
    setHovered(false);
    setDragging(true);
    void startWindowDragging().catch(() => setDragging(false));
  };

  const markAssetFailed = () => {
    setFailedAssets((current) => new Set(current).add(state));
  };

  return (
    <div
      className={`pet-cat pet-cat--${state}`}
      aria-label={`真实猫视觉：${stateLabel[state]}`}
      onMouseEnter={() => !forceState && !dragging && setHovered(true)}
      onMouseLeave={() => !forceState && !dragging && setHovered(false)}
      onPointerDown={(event) => {
        if (event.button === 0) startDrag();
      }}
    >
      {useRealAsset && asset ? (
        <RealPetVisual config={asset} state={state} onAssetError={markAssetFailed} />
      ) : (
        <CssPetFallback state={state} />
      )}
      <span className="pet-cat__state-label">{stateLabel[state]}</span>
    </div>
  );
}
