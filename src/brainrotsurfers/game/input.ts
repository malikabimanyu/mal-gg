import type { InputAction } from "./types";

/**
 * Keyboard + swipe → discrete actions. Swipes are decided on pointermove as soon as the finger
 * travels 24 px (not on release) for responsiveness; one swipe = one action. Keys ignore
 * auto-repeat. Buffering/timing lives in the engine, which knows whether an action can apply.
 */

const SWIPE_PX = 24;

const KEYS: Record<string, InputAction> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  Space: "up",
  ArrowDown: "down",
  KeyS: "down",
  KeyP: "pause",
  Escape: "pause",
  Enter: "confirm",
};

/** Focusable controls that own Space/Enter themselves (buttons, links, form fields, tabs). */
const INTERACTIVE = "a[href],button,input,select,textarea,summary,[role=button],[role=link],[role=tab],[contenteditable]:not([contenteditable=false])";

/** Simultaneous pointers tracked (two thumbs + spare); fixed slots, so nothing is allocated. */
const MAX_POINTERS = 4;

interface PointerSlot {
  active: boolean;
  id: number;
  startX: number;
  startY: number;
  fired: boolean;
}

export class Input {
  private readonly slots: PointerSlot[] = Array.from({ length: MAX_POINTERS }, () => ({
    active: false, id: 0, startX: 0, startY: 0, fired: false,
  }));

  /**
   * @param wantsKeys false while keys aren't game input (shop, credits): they then keep their
   *   browser meaning — arrows/Space/PageDown scroll the credits — and are never prevented.
   */
  constructor(
    private readonly surface: HTMLElement,
    private readonly onAction: (a: InputAction, source: "key" | "swipe" | "tap") => void,
    private readonly wantsKeys: () => boolean = () => true,
  ) {
    window.addEventListener("keydown", this.onKey);
    surface.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
  }

  private readonly onKey = (e: KeyboardEvent) => {
    // Browser/OS shortcuts (Ctrl/Cmd+D, +P, +S, +A …) are never game input.
    if (e.ctrlKey || e.metaKey || e.altKey || !this.wantsKeys()) return;
    const target = e.target instanceof Element ? e.target : null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || (target as HTMLElement).isContentEditable)) return;
    const a = KEYS[e.code];
    if (!a) return;
    // Space/Enter on a focused control (button, credit link, …) belong to that control.
    if ((e.code === "Space" || e.code === "Enter") && target?.closest(INTERACTIVE)) return;
    e.preventDefault();
    if (e.repeat) return;
    this.onAction(a, "key");
  };

  private slotFor(id: number): PointerSlot | null {
    for (const s of this.slots) if (s.active && s.id === id) return s;
    return null;
  }

  private readonly onDown = (e: PointerEvent) => {
    if (this.slotFor(e.pointerId)) return;
    const s = this.slots.find((q) => !q.active);
    if (!s) return;
    s.active = true;
    s.id = e.pointerId;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.fired = false;
  };

  private readonly onMove = (e: PointerEvent) => {
    const s = this.slotFor(e.pointerId);
    if (!s || s.fired) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    // One swipe = one action, per finger.
    s.fired = true;
    if (Math.abs(dx) > Math.abs(dy)) this.onAction(dx < 0 ? "left" : "right", "swipe");
    else this.onAction(dy < 0 ? "up" : "down", "swipe");
  };

  private readonly onUp = (e: PointerEvent) => {
    const s = this.slotFor(e.pointerId);
    if (!s) return;
    s.active = false;
    if (!s.fired && e.type === "pointerup") this.onAction("confirm", "tap");
  };

  dispose(): void {
    window.removeEventListener("keydown", this.onKey);
    this.surface.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
  }
}
