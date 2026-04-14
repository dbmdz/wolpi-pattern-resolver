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

const MessageDigestMock = {
  getInstance: vi.fn(() => {
    return {
      digest: vi.fn(() => [
        -108, -63, 30, -45, -61, -57, 48, 22, -83, -71, 36, 22, 53, 38, 120,
        -31, 105, -53, -28, 123, -76, -117, -62, 126, 94, -99, 70, 97, 21, -80,
        98, 82,
      ]),
    };
  }),
};

const ByteBufferMock = {
  remaining: vi.fn().mockReturnValue(39),
  get: vi.fn().mockReturnValue([]),
};

// mock Java API that will be provided by Wolpi at runtime
const JavaMock = {
  type: vi.fn((javaType) => {
    if (javaType === "java.security.MessageDigest") {
      return MessageDigestMock;
    }
    if (javaType === "java.nio.charset.StandardCharsets") {
      return {
        UTF_8: {
          encode: vi.fn().mockReturnValue(ByteBufferMock),
        },
      };
    }
  }),
};

vi.stubGlobal("Java", JavaMock);
vi.stubGlobal("wolpi", WolpiMock);

// mock modules that will be provided by Wolpi at runtime
vi.mock("wolpi:fetch", () => ({
  default: vi.fn((url) => {
    if (url === "https://some.domain.de/abc/123.jpg") {
      return {
        ok: true,
        headers: {
          "last-modified": "Fri, 10 Apr 2026 12:24:20 GMT",
          etag: "94c11ed3c3c73016adb92416352678e169cbe47bb48bc27e5e9d466115b06252",
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
        mtimeMs: 1776172677316,
        size: 1420168,
      };
    }
    return {
      isFile: vi.fn().mockReturnValue(false),
    };
  }),
}));
