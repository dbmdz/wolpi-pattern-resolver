import { CacheInfo } from "@mdz/wolpi-types";
import { Stats } from "wolpi:fs";

// Wolpi runs GraalJS in Java mode, so we don't have access to Node.js modules and will use the Java API instead
const MessageDigest = Java.type("java.security.MessageDigest");
const StandardCharsets = Java.type("java.nio.charset.StandardCharsets");

export function getCacheInfoFromHeaders(
  headers: Record<string, string>,
): CacheInfo | null {
  if (!headers["last-modified"] || !headers["etag"]) {
    return null;
  }
  return { eTag: headers["etag"], lastModified: headers["last-modified"] };
}

export function getCacheInfo(path: string, stats: Stats): CacheInfo {
  const lastModified = new Date(stats.mtimeMs);
  lastModified.setMilliseconds(0);
  const lastModifiedStr = lastModified.toISOString();

  // Generate ETag using SHA-256
  const digest = MessageDigest.getInstance("SHA-256");
  const raw = `${path}:${stats.mtimeMs}:${stats.size}`;

  // Encode string to bytes using charset
  const byteBuffer = StandardCharsets.UTF_8.encode(raw);
  const bytes = new Int8Array(byteBuffer.remaining());
  byteBuffer.get(bytes);

  const hashBytes = digest.digest(bytes);

  // Convert bytes to hex string
  let hash = "";
  for (let i = 0; i < hashBytes.length; i++) {
    const hex = (hashBytes[i] & 0xff).toString(16);
    hash += hex.length === 1 ? "0" + hex : hex;
  }

  return {
    eTag: hash,
    lastModified: lastModifiedStr,
  };
}

export function notModified(
  cacheInfo?: CacheInfo | null,
  clientETag?: string | null,
  clientLastModified?: string | null,
): boolean {
  if (clientETag && cacheInfo?.eTag && clientETag !== cacheInfo.eTag) {
    return false;
  }

  if (clientLastModified && cacheInfo?.lastModified) {
    try {
      const clientDt = new Date(clientLastModified);
      const fileDt = new Date(cacheInfo.lastModified);

      if (isNaN(clientDt.getTime()) || isNaN(fileDt.getTime())) {
        return false; // Malformed timestamp, assume modified
      }

      if (clientDt >= fileDt) {
        return true;
      }
    } catch (e) {
      return false; // Error parsing timestamp, assume modified
    }
  }

  return false;
}
