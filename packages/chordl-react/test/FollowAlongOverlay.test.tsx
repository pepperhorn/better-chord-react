import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { render, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { FollowAlongOverlay } from "../src/components/FollowAlongOverlay";
import type { ChordCandidate } from "@pepperhorn/chordl-listen";
import type { FollowListener } from "../src/follow/useFollowAlong";

function cand(rootName: string, symbolSuffix: string): ChordCandidate {
  return { root: 0, rootName, quality: "", label: "", symbolSuffix, confidence: 0.99 };
}

/** Fake listener that hands the test control of the detection stream. */
function makeFakeListener() {
  let onChord: ((c: ChordCandidate) => void) | null = null;
  let running = false;
  const factory = (cb: (c: ChordCandidate) => void): FollowListener => {
    onChord = cb;
    return {
      start: async () => { running = true; },
      stop: () => { running = false; onChord = null; },
    };
  };
  return {
    factory,
    detect: (c: ChordCandidate) => onChord?.(c),
    get running() { return running; },
  };
}

describe("FollowAlongOverlay", () => {
  const chords = ["Am", "Dm7", "G7", "Cmaj7", "F"]; // pages of 2: [Am,Dm7][G7,Cmaj7][F]

  it("turns the page as detected chords advance the follower", async () => {
    const fake = makeFakeListener();
    let page = 0;
    let active = -1;
    const { getByTestId, findByText } = render(
      <FollowAlongOverlay
        open
        onClose={() => {}}
        chords={chords}
        perPage={2}
        createListener={fake.factory}
        onPageChange={(p) => { page = p; }}
        onActiveChange={(i) => { active = i; }}
      />,
    );

    // start() resolves → listening
    await findByText("Follow along");
    await act(async () => { await Promise.resolve(); });

    expect(getByTestId("follow-page-indicator").textContent).toContain("Page 1 of 3");

    // Detect G7 (index 2, page 2). Default confirmFrames = 2 → two agreeing frames.
    await act(async () => { fake.detect(cand("G", "7")); fake.detect(cand("G", "7")); });

    expect(getByTestId("follow-page-indicator").textContent).toContain("Page 2 of 3");
    expect(page).toBe(2);
    expect(active).toBe(2);

    // The active chord (G7) is highlighted on the current page.
    const activeCell = getByTestId("follow-page").querySelector('[data-active="true"]');
    expect(activeCell?.textContent).toBe("G7");
  });

  it("ignores an unrecognized chord (stays put)", async () => {
    const fake = makeFakeListener();
    const { getByTestId, findByText } = render(
      <FollowAlongOverlay open onClose={() => {}} chords={chords} perPage={2} createListener={fake.factory} />,
    );
    await findByText("Follow along");
    await act(async () => { await Promise.resolve(); });

    await act(async () => { fake.detect(cand("A", "b7")); fake.detect(cand("A", "b7")); });
    expect(getByTestId("follow-page-indicator").textContent).toContain("Page 1 of 3");
  });

  it("stops the listener when closed", async () => {
    const fake = makeFakeListener();
    const { rerender, findByText } = render(
      <FollowAlongOverlay open onClose={() => {}} chords={chords} perPage={2} createListener={fake.factory} />,
    );
    await findByText("Follow along");
    await act(async () => { await Promise.resolve(); });
    expect(fake.running).toBe(true);

    rerender(<FollowAlongOverlay open={false} onClose={() => {}} chords={chords} perPage={2} createListener={fake.factory} />);
    expect(fake.running).toBe(false);
  });
});
