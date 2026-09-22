// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { ScrollReveal } from "@/templates/events/elegance/components/scroll-reveal";

/**
 * THE REVEAL GATE MUST NOT STRAND CONTENT THAT ARRIVES LATE.
 *
 * `.reveal` is `opacity: 0` until something adds `is-visible`. The observer
 * used to query the document once on mount, which was fine for a static page
 * and wrong for this one: clicking a filter chip re-renders the event grid,
 * and changing WHICH items are in the list makes React unmount the old cards
 * and mount fresh DOM nodes. Those nodes were never observed, never revealed,
 * and the section went blank — filtering to "Debuts" showed an empty grid.
 *
 * The failure is invisible to every other kind of test here: the markup is
 * correct, the component returns the right cards, and only a real layout
 * engine applying real CSS shows a reader nothing. So this test works at the
 * only level that can catch it — which elements the observer is watching.
 */

/** The observed set, and a handle to fire intersections at will. */
let observed: Element[] = [];
let unobserved: Element[] = [];
let fire: (els: Element[]) => void = () => {};

beforeEach(() => {
  observed = [];
  unobserved = [];
  class FakeObserver {
    constructor(private cb: IntersectionObserverCallback) {
      fire = (els) =>
        this.cb(
          els.map((target) => ({ target, isIntersecting: true })) as never,
          this as never,
        );
    }
    observe(el: Element) {
      // The real one ignores a repeat; so must this, or the test would pass
      // on a sweep that re-adds everything every frame.
      if (!observed.includes(el)) observed.push(el);
    }
    unobserve(el: Element) {
      unobserved.push(el);
      observed = observed.filter((o) => o !== el);
    }
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function addReveal(id: string) {
  const el = document.createElement("div");
  el.id = id;
  el.className = "reveal reveal-up";
  document.body.appendChild(el);
  return el;
}

describe("scroll reveal", () => {
  it("watches the elements present when it mounts", () => {
    const first = addReveal("a");
    render(<ScrollReveal />);
    expect(observed).toContain(first);
  });

  it("watches elements mounted afterwards", async () => {
    render(<ScrollReveal />);
    // What a filter click does: a card that did not exist a moment ago.
    const late = addReveal("late");
    await waitFor(() => expect(observed).toContain(late));
  });

  it("reveals a late element once it intersects", async () => {
    render(<ScrollReveal />);
    const late = addReveal("late");
    await waitFor(() => expect(observed).toContain(late));

    fire([late]);
    expect(late.classList.contains("is-visible")).toBe(true);
    // One-way: it stops being watched, which is what makes the sweep cheap.
    expect(unobserved).toContain(late);
  });

  it("does not re-watch what it has already revealed", async () => {
    const el = addReveal("a");
    render(<ScrollReveal />);
    fire([el]);
    expect(el.classList.contains("is-visible")).toBe(true);

    // Another mutation triggers another sweep; the revealed element must not
    // come back, or the observer would grow without bound on a page that
    // re-renders often.
    addReveal("b");
    await waitFor(() =>
      expect(observed.some((o) => (o as HTMLElement).id === "b")).toBe(true),
    );
    expect(observed).not.toContain(el);
  });
});
