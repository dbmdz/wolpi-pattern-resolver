import { lstatSync } from "wolpi:fs";
import {
  FilesystemResolvedImage,
  HttpResolvedImage,
  WolpiExtension,
} from "@mdz/wolpi-types";
import fetchSync from "wolpi:fetch";
import {
  getCacheInfo,
  getCacheInfoFromHeaders,
  notModified,
} from "./caching.js";

interface ResolvingPatternConfig {
  pattern: string;
  substitutions: string[];
}

interface CompiledResolvingPattern {
  pattern: RegExp;
  substitutions: string[];
}

let PATTERNS: CompiledResolvingPattern[] | null;

const extension: WolpiExtension = {
  info: () => ({
    apiVersion: 1,
    name: "resolving",
    description:
      "Resolves identifiers to a path on the local file system or a remote HTTP endpoint",
  }),
  setup: () => {
    // initialize extension at startup: compile regex patterns once and reuse them for every request
    PATTERNS = wolpi.config?.resolvingPatterns?.map(
      ({ pattern, substitutions }: ResolvingPatternConfig) => ({
        pattern: new RegExp(pattern),
        substitutions: substitutions,
      }),
    );
    if (!PATTERNS) {
      wolpi.logger.warn("No resolving patterns configured");
    }
  },
  destroy: () => {
    // discard regex patterns when extension is shutdown
    PATTERNS = null;
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
            image = fetchRemote(resolved);
          } else {
            image = fetchLocal(resolved);
          }
          if (!image) {
            continue;
          }
          wolpi.logger.debug(`Resolved ${identifier} to ${resolved}`);
          if (notModified(image?.cacheInfo, clientETag, clientLastModified)) {
            return { notModified: true };
          }
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

function fetchRemote(url: string): HttpResolvedImage | null {
  const response = fetchSync(url, {
    method: "HEAD",
    headers: { Accept: "image/*" },
  });
  if (!response.ok) {
    return null;
  }
  const cacheInfo = getCacheInfoFromHeaders(response.headers);
  return { url: url, ...(cacheInfo && { cacheInfo: cacheInfo }) };
}

function fetchLocal(path: string): FilesystemResolvedImage | null {
  const stats = lstatSync(path);
  if (stats.isFile()) {
    const cacheInfo = getCacheInfo(path, stats);
    return { path: path, cacheInfo: cacheInfo };
  }
  return null;
}

export default extension;
