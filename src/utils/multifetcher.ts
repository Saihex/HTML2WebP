import { image_to_blob } from "~/src/utils/blob.ts";

// Utility: fetch a map of string -> URL and return string -> Blob (as base64)
export function fetchMapWithLimit(
  map: Record<string, string>,
  limit = 5,
): Promise<Record<string, string>> {
  const entries = Object.entries(map);
  const results: Record<string, string> = {};

  let active = 0;
  let index = 0;

  return new Promise((resolve) => {
    function next() {
      if (index >= entries.length && active === 0) {
        resolve(results);
        return;
      }

      while (active < limit && index < entries.length) {
        const [key, url] = entries[index];
        index++;
        active++;

        (async () => {
          try {
            if (!url || typeof url !== "string") return;

            const res = await fetch(url, {
              headers: { "User-Agent": "HTML2WebP Multifetcher" },
            });

            if (!res.ok) return;

            const buffer = await res.arrayBuffer();
            const image_bytes = new Uint8Array(buffer);
            const content_type = res.headers.get("content-type") ?? "image/png";

            // You’d have to provide this util
            const base64Blob = image_to_blob(image_bytes, content_type);

            results[key] = base64Blob;
          } catch {
            // ignore errors
          } finally {
            active--;
            next();
          }
        })();
      }
    }
    next();
  });
}
