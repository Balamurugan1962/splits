import type { Group } from "./types";

/**
 * Encodes a Group object into a safe Base64 URL string.
 */
export function encodeGroupData(group: Group): string {
  try {
    const jsonStr = JSON.stringify(group);
    const bytes = new TextEncoder().encode(jsonStr);
    let binString = "";
    bytes.forEach((b) => {
      binString += String.fromCharCode(b);
    });
    return btoa(binString);
  } catch (err) {
    console.error("Failed to encode group data:", err);
    return "";
  }
}

/**
 * Decodes a Base64 URL string back into a Group object.
 */
export function decodeGroupData(encodedStr: string): Group | null {
  try {
    const binString = atob(encodedStr);
    const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.id && parsed.name && Array.isArray(parsed.members)) {
      return parsed as Group;
    }
    return null;
  } catch (err) {
    console.error("Failed to decode group data:", err);
    return null;
  }
}
