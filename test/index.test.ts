import { beforeAll, describe, expect, it } from "vitest";
import extension from "../src/index";

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
      cacheInfo: {
        eTag: "94c11ed3c3c73016adb92416352678e169cbe47bb48bc27e5e9d466115b06252",
        lastModified: "2026-04-14T13:17:57.000Z",
      },
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
      cacheInfo: {
        eTag: "94c11ed3c3c73016adb92416352678e169cbe47bb48bc27e5e9d466115b06252",
        lastModified: "Fri, 10 Apr 2026 12:24:20 GMT",
      },
    });
  });

  it("returns not modified for identifier with matching eTag and last modified timestamp", () => {
    expect(extension.resolve).toBeDefined();
    expect(
      extension.resolve!(
        "remote-abc-123",
        "94c11ed3c3c73016adb92416352678e169cbe47bb48bc27e5e9d466115b06252",
        "Fri, 10 Apr 2026 12:24:20 GMT",
      ),
    ).toEqual({
      notModified: true,
    });
  });

  it("returns updated resource for identifier with outdated last modified timestamp", () => {
    expect(extension.resolve).toBeDefined();
    expect(
      extension.resolve!(
        "remote-abc-123",
        "94c11ed3c3c73016adb92416352678e169cbe47bb48bc27e5e9d466115b06252",
        "Fri, 09 Apr 2026 12:24:20 GMT",
      ),
    ).toEqual({
      url: "https://some.domain.de/abc/123.jpg",
      cacheInfo: {
        eTag: "94c11ed3c3c73016adb92416352678e169cbe47bb48bc27e5e9d466115b06252",
        lastModified: "Fri, 10 Apr 2026 12:24:20 GMT",
      },
    });
  });
});
