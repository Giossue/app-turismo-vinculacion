import { describe, expect, it } from "vitest";

import { buildLoginHref, parseReturnTo } from "./login-href";

describe("login href", () => {
  it("carries the return path as a search param", () => {
    expect(buildLoginHref("/centers/ABC")).toEqual({
      pathname: "/login",
      params: { returnTo: "/centers/ABC" },
    });
  });

  it("accepts internal absolute paths", () => {
    expect(parseReturnTo("/saved")).toBe("/saved");
    expect(parseReturnTo(["/route", "/saved"])).toBe("/route");
    expect(parseReturnTo(" /offline ")).toBe("/offline");
  });

  it("falls back to the map for unsafe or missing targets", () => {
    expect(parseReturnTo(undefined)).toBe("/");
    expect(parseReturnTo("")).toBe("/");
    expect(parseReturnTo("https://evil.test")).toBe("/");
    expect(parseReturnTo("//evil.test/path")).toBe("/");
    expect(parseReturnTo("/login?returnTo=/saved")).toBe("/");
  });
});
