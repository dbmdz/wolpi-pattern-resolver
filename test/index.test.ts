import { beforeAll, describe, expect, it, vi } from "vitest";
import extension from "../src/index";
import { WolpiContext } from "@mdz/wolpi-types";

// mock modules that will be provided by Wolpi at runtime
vi.mock("wolpi:fetch", () => ({
  default: vi.fn((url) => {
    if (url === "https://some.domain.de/abc/123.jpg") {
      return { ok: true };
    }
    return { ok: false };
  }),
}));

vi.mock("wolpi:fs", () => ({
  lstatSync: vi.fn((path) => {
    if (path === "/images/abc_123.jpg") {
      return {
        isFile: vi.fn().mockReturnValue(true),
      };
    }
    return {
      isFile: vi.fn().mockReturnValue(false),
    };
  }),
}));

// mock Wolpi context with extension configuration that will be provided at runtime
const WolpiMock = {
  config: {
    resolvingPatterns: [
      {
        pattern: "^test-(\\w+)-(\\d+)$",
        substitutions: ["/images/$1_$2.tif", "/images/$1_$2.jpg"],
      },
      {
        pattern: "^remote-(\\w+)-(\\d+)$",
        substitutions: ["/images/$1.jpg", "https://some.domain.de/$1/$2.jpg"],
      },
    ],
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLogger: vi.fn(),
  },
};

vi.stubGlobal("wolpi", WolpiMock);

beforeAll(() => {
  if (extension.setup) {
    extension.setup();
  }
});

describe("wolpi resolving extension", () => {
  it("resolves identifier to path", () => {
    expect(extension.resolve).toBeDefined();
    expect(extension.resolve!("test-abc-123")).toEqual({
      path: "/images/abc_123.jpg",
    });
  });

  it("returns null if no resource exists for identifier", () => {
    expect(extension.resolve).toBeDefined();
    expect(extension.resolve!("test-abc-456")).toBeNull();
  });

  it("returns null if identifier does not match any resolving pattern", () => {
    expect(extension.resolve).toBeDefined();
    expect(extension.resolve!("abc-123")).toBeNull();
  });

  it("resolves identifier to remote endpoint", () => {
    expect(extension.resolve).toBeDefined();
    expect(extension.resolve!("remote-abc-123")).toEqual({
      url: "https://some.domain.de/abc/123.jpg",
    });
  });
});
