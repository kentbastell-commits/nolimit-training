import { describe, expect, it, vi } from "vitest";
import { createSharedRead } from "../../../src/sharedRead";

describe("shared reads", () => {
  it("lets simultaneous consumers share one request, but refreshes after it settles", async () => {
    const read = createSharedRead<number[]>();
    let finish!: (data: number[]) => void;
    const load = vi.fn(() => new Promise<number[]>(resolve => { finish = resolve; }));
    const first = read(load);
    const second = read(load);
    await Promise.resolve();
    expect(load).toHaveBeenCalledOnce();
    finish([1]);
    expect(await first).toEqual([1]);
    expect(await second).toEqual([1]);
    expect(await read(async () => [2])).toEqual([2]);
  });

  it("releases failed requests so a retry can recover", async () => {
    const read = createSharedRead<number>();
    const first = read(async () => { throw new Error("offline"); });
    const second = read(async () => 100);
    expect(second).toBe(first);
    await expect(first).rejects.toThrow("offline");
    expect(await read(async () => 3)).toBe(3);
  });

  it("keeps separate readers isolated", async () => {
    const coachA = createSharedRead<string>();
    const coachB = createSharedRead<string>();
    expect(await Promise.all([coachA(async () => "A"), coachB(async () => "B")])).toEqual(["A", "B"]);
  });
});
