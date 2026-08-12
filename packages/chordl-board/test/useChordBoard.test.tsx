import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChordBoard, memoryStorageAdapter } from "../src";
import type { BoardItem } from "../src";

const board = () => renderHook(() => useChordBoard({ storage: memoryStorageAdapter() }));

describe("useChordBoard", () => {
  /**
   * `addItem` used to copy a fixed list of properties, so any field added to
   * BoardItem later was silently dropped between the editor and the board.
   * That is how `display` went missing. This pins the general rule rather than
   * the specific field, so the next field added can't repeat it.
   */
  it("carries every card field through addItem", () => {
    const { result } = board();
    const card: Omit<BoardItem, "id"> = {
      nl: "Cmaj7",
      title: "bar 1",
      subheading: "shell",
      footerText: "let it ring",
      display: "guitar",
      instrument: "ukulele",
      position: 2,
    };
    act(() => { result.current.addItem(card); });
    expect(result.current.items[0]).toMatchObject(card);
    expect(result.current.items[0].id).toBeTruthy();
  });

  it("keeps every field through updateItem", () => {
    const { result } = board();
    act(() => { result.current.addItem({ nl: "Cmaj7" }); });
    const id = result.current.items[0].id;
    act(() => {
      result.current.updateItem(id, { display: "staff", title: "bar 2" });
    });
    expect(result.current.items[0]).toMatchObject({
      nl: "Cmaj7", display: "staff", title: "bar 2",
    });
  });

  it("keeps every field through copy and paste", () => {
    const { result } = board();
    act(() => {
      result.current.addItem({ nl: "Am", display: "guitar", instrument: "ukulele", position: 1 });
    });
    act(() => { result.current.copyItem(result.current.items[0].id); });
    act(() => { result.current.pasteItem(); });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[1]).toMatchObject({
      nl: "Am", display: "guitar", instrument: "ukulele", position: 1,
    });
    // A pasted card is a new card, not an alias of the original.
    expect(result.current.items[1].id).not.toBe(result.current.items[0].id);
  });

  it("keeps every field through duplicateItem, inserted after the source", () => {
    const { result } = board();
    act(() => {
      result.current.addItem({ nl: "C", display: "staff" });
      result.current.addItem({ nl: "G", display: "keyboard" });
    });
    act(() => { result.current.duplicateItem(result.current.items[0].id); });
    expect(result.current.items.map((i) => i.nl)).toEqual(["C", "C", "G"]);
    expect(result.current.items[1].display).toBe("staff");
  });
});
