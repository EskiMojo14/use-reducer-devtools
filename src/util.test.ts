import { describe, expect, it } from "vite-plus/test";

import { processActionCreators } from "./util";

describe("processActionCreators", () => {
  it("does not reuse creators from a different function map", () => {
    const firstCreators = { first: () => ({ type: "FIRST" }) };
    const secondCreators = { second: () => ({ type: "SECOND" }) };

    const first = processActionCreators(firstCreators);
    const second = processActionCreators(secondCreators);

    expect(second).not.toBe(first);
  });
});
