import { describe, expect, it, vi } from "vite-plus/test";

import { isDevelopment } from "./environment";
import { processActionCreators } from "./util";

describe("isDevelopment", () => {
  it("returns false when process is unavailable", () => {
    const originalProcess = process;
    vi.stubGlobal("process", undefined);
    const result = isDevelopment();
    vi.stubGlobal("process", originalProcess);

    expect(result).toBe(false);
  });
});

describe("processActionCreators", () => {
  it("does not reuse creators from a different function map", () => {
    const firstCreators = { first: () => ({ type: "FIRST" }) };
    const secondCreators = { second: () => ({ type: "SECOND" }) };

    const first = processActionCreators(firstCreators);
    const second = processActionCreators(secondCreators);

    expect(second).not.toBe(first);
  });
});
