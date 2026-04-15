import { vi } from "vitest";

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

// mock modules that will be provided by Wolpi at runtime
vi.mock("wolpi:fetch", () => ({
  default: vi.fn((url) => {
    if (url === "https://some.domain.de/abc/123.jpg") {
      return {
        ok: true,
        status: 200,
        headers: {
          "last-modified": "Fri, 10 Apr 2026 12:24:20 GMT",
          etag: "94c11ed3c3c73016adb92416352678e169cbe47bb48bc27e5e9d466115b06252",
        },
      };
    }
    if (url === "https://some.domain.de/abc/456.jpg") {
      return {
        ok: true,
        status: 304,
        headers: {
          "last-modified": "Fri, 08 Apr 2026 12:24:00 GMT",
          etag: "94c11ed3c3c73016adb9241635a93457169cbe47bb48bc27e5e9d466115b06252",
        },
      };
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
