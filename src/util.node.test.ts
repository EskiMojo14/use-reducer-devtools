import { describe, expect, it, vi } from "vite-plus/test";

import { isDevelopment } from "./environment";
import { processActionCreators } from "./util";

describe("isDevelopment", () => {
  it("returns false when process is unavailable", () => {
    vi.stubGlobal("process", undefined);

    expect(isDevelopment()).toBe(false);
  });
});

describe("processActionCreators", () => {
  it("keeps actions from different creator maps separate", () => {
    const firstCreators = { first: () => ({ type: "FIRST" }) };
    const secondCreators = { second: () => ({ type: "SECOND" }) };

    const first = processActionCreators(firstCreators);
    const second = processActionCreators(secondCreators);

    expect(second.map(({ name, func }) => ({ name, action: func() }))).toEqual([
      { name: "second", action: { type: "SECOND" } },
    ]);
    expect(first.map(({ name, func }) => ({ name, action: func() }))).toEqual([
      { name: "first", action: { type: "FIRST" } },
    ]);
  });
});
