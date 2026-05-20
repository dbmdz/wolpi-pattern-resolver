import { lstatSync } from "wolpi:fs";
import {
  CacheInfo,
  FilesystemResolvedImage,
  HttpResolvedImage,
  SourceNotModified,
  WolpiExtension,
} from "wolpi-types";
import fetchSync from "wolpi:fetch";

interface ResolvingPatternConfig {
  pattern: string;
  substitutions: string[];
}

interface ExtensionConfig {
  resolvingPatterns: ResolvingPatternConfig[];
}

interface CompiledResolvingPattern {
  pattern: RegExp;
  substitutions: string[];
}

let PATTERNS: CompiledResolvingPattern[] | null;

const extension: WolpiExtension = {
  info: () => ({
    apiVersion: 1,
    name: "Pattern Resolver",
    description:
      "Resolves identifiers to a path on the local file system or a remote HTTP endpoint",
  }),
  setup: () => {
    // initialize extension at startup: compile regex patterns once and reuse
    // them for every request
    const patternSpec = wolpi.config?.resolvingPatterns as ResolvingPatternConfig[] | undefined;;
    PATTERNS =
      patternSpec?.map(
        ({ pattern, substitutions }: ResolvingPatternConfig) => ({
          pattern: new RegExp(pattern),
          substitutions: substitutions,
        }),
      ) ?? null;
    if (!PATTERNS) {
      wolpi.logger.warn("No resolving patterns configured");
    }
  },
  cleanup: () => {
    // extension does not store request-specific information -> no cleanup needed after each request, but method must be present
  },
  resolve: (identifier, clientETag, clientLastModified) => {
    if (!PATTERNS) {
      return null;
    }
    for (const { pattern, substitutions } of PATTERNS) {
      // does the identifier match the pattern?
      if (!pattern.test(identifier)) {
        continue;
      }

      for (const sub of substitutions) {
        const resolved = identifier.replace(pattern, sub);
        // does the resolved path or URL refer to an actual file?
        try {
          let image;
          if (
            resolved.startsWith("http://") ||
            resolved.startsWith("https://")
          ) {
            image = checkRemote(resolved, clientETag, clientLastModified);
          } else {
            image = checkLocal(resolved);
          }
          if (!image) {
            continue;
          }
          wolpi.logger.debug(`Resolved ${identifier} to ${resolved}`);
          return image;
        } catch (e) {
          // resource doesn't exist, continue
        }
      }
    }
    // no matching patterns or no corresponding resources found
    return null;
  },
};

function checkRemote(
  url: string,
  clientETag?: string | null,
  clientLastModified?: string | null,
): HttpResolvedImage | SourceNotModified | null {
  const response = fetchSync(url, {
    method: "HEAD",
    headers: {
      Accept: "image/*",
      ...(clientETag ? { "If-None-Match": clientETag } : {}),
      ...(clientLastModified
        ? { "If-Modified-Since": clientLastModified }
        : {}),
    },
  });

  if (!response.ok && response.status !== 304) {
    return null;
  }
  const cacheInfo = getCacheInfoFromHeaders(response.headers);
  const baseResp = cacheInfo ? { cacheInfo } : {};
  if (response.status === 304) {
    return { notModified: true, ...baseResp };
  } else {
    return { url, ...baseResp };
  }
}

function checkLocal(path: string): FilesystemResolvedImage | null {
  const stats = lstatSync(path);
  if (stats.isFile()) {
    // cache info for FilesystemResolvedImages will be automatically provided by Wolpi
    return { path: path };
  }
  return null;
}

function getCacheInfoFromHeaders(
  headers: Record<string, string>,
): CacheInfo | null {
  if (!headers["last-modified"] && !headers["etag"]) {
    return null;
  }
  return {
    ...(headers["etag"] ? { eTag: headers["etag"] } : {}),
    ...(headers["last-modified"]
      ? { lastModified: new Date(headers["last-modified"]) }
      : {}),
  };
}

export default extension;
