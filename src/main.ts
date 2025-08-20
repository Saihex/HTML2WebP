import { page_pool } from "~/src/classes/page_pool.ts";
import { createdeferred } from "./utils/deferred.ts";
import { TemplateParser } from "./classes/parser.ts";
import { launch } from "@astral/astral";
import * as pretty_print from "saihex/pretty_logs";
import {
  request_cache,
  request_structure,
} from "~/src/types/request_struct.ts";
import { fetchMapWithLimit } from "~/src/utils/multifetcher.ts";
const abortController = new AbortController();

const RequestCache: Map<string, request_cache> = new Map();
const ReqCacheMaxAgeSeconds = 1200;

const browser = await launch({
  userAgent: "HTML2WebP",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ],
  headless: true,
});

if (Deno.args.includes("--setup-only")) {
  await browser.close();
  Deno.exit(0);
}

const PAGE_POOL = new page_pool(browser);

const TWEMOJI_SCRIPT = `
<script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous" preload></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    twemoji.parse(document.body, {
      folder: 'svg',
      ext: '.svg'
    });

    const emojis = document.querySelectorAll('img.emoji');
    emojis.forEach(e => {
      e.style.height = '1em';
      e.style.width = '1em';
      e.style.display = 'inline-block';
      e.style.margin = '0 0.05em';
      e.style.verticalAlign = 'text-top';
    });
  });
</script>
`;

function safeViewport(width?: unknown, height?: unknown) {
  const defaultWidth = 1700;
  const defaultHeight = 893;

  const safeWidth =
    typeof width === "number" && !isNaN(width) && width > 0 && width <= 5120
      ? width
      : defaultWidth;
  const safeHeight =
    typeof height === "number" && !isNaN(height) && height > 0 && height <= 5120
      ? height
      : defaultHeight;

  return { width: safeWidth, height: safeHeight };
}

async function serveHandler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(null, {
      status: 405,
    });
  }

  const _url = new URL(req.url);
  if (_url.pathname === "/health") {
    let page;

    try {
      page = await PAGE_POOL.acquirePage();
      page.goto("file://runtime_health.html");
      await page.waitForNetworkIdle();
      await PAGE_POOL.releasePage(page);
      return new Response("Everything is well!", {
        status: 200,
      });
    } catch (e) {
      try {
        if (page) await PAGE_POOL.releasePage(page);
      } catch (_) {
        //
      }
      return new Response(`${e}`, {
        status: 500,
      });
    }
  }

  let body: request_structure;

  try {
    body = await req.json();
  } catch (_) {
    return new Response("MISSING BODY", {
      status: 400,
    });
  }

  const ongoingSimilar = body.cache_id
    ? RequestCache.get(`${body.cache_id}`)
    : undefined;

  if (
    ongoingSimilar &&
    Date.now() - ongoingSimilar.timestamp <= ReqCacheMaxAgeSeconds * 1000
  ) {
    const res = await ongoingSimilar.promise;

    if (res instanceof Error) {
      pretty_print.logWarning(`CACHE ERROR: ${body.cache_id} cache errored.`);
      return new Response("Parenting Request Failed", {
        status: 500,
      });
    }

    return new Response(res, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
      },
    });
  }

  const _promise = createdeferred<Uint8Array | Error>();

  if (typeof body.cache_id === "string") {
    const register: request_cache = {
      promise: _promise.promise,
      timestamp: Date.now(),
    };

    RequestCache.set(body.cache_id, register);
  }

  if (body.image_values && Array.isArray(body.image_values)) {
    const toFetch: Record<string, string> = {};

    for (const key of body.image_values) {
      toFetch[key] = body.values[key];
    }

    const blobs = await fetchMapWithLimit(toFetch, 5);

    Object.assign(body.values, blobs);
  }

  const parser = new TemplateParser(body.html);
  const result = parser.render(body.values);

  const page = await PAGE_POOL.acquirePage();

  try {
    await page.setContent(`${result}${TWEMOJI_SCRIPT}`);

    const { width, height } = safeViewport(body.width, body.height);
    await page.setViewportSize({ width, height });

    await page.waitForNetworkIdle();

    const webp = await page.screenshot({ format: "webp" });

    _promise.resolve(webp);

    return new Response(webp, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
      },
    });
  } catch (e) {
    _promise.reject(new Error());

    if (typeof body.cache_id === "string") {
      RequestCache.delete(body.cache_id);
    }

    return new Response(`RENDER ERROR: ${e}`, {
      status: 500,
    });
  } finally {
    await PAGE_POOL.releasePage(page);
  }
}

///

(async () => {
  while (true) {
    await new Promise((event) => {
      setTimeout(event, 60 * 1000);
    });

    const now = Date.now();
    let cleared = 0;

    for (const [key, val] of RequestCache) {
      try {
        if (now - val.timestamp < ReqCacheMaxAgeSeconds * 1000) continue;
        RequestCache.delete(key);
        cleared++;
      } catch (_) {
        //
      }
    }

    if (cleared > 0) {
      pretty_print.logSuccess(`Cleared ${cleared} render caches`);
    }
  }
})();

{
  // 48 hours → milliseconds
  const RESTART_INTERVAL = 48 * 60 * 60 * 1000; // more readable than 3.6e+6

  setTimeout(async () => {
    pretty_print.log("♻️ RESTARTING NOW: 48-hour auto-restart triggered");

    try {
      await browser.close();
    } catch (_) {
      //
    }

    // Optional: Abort anything long-running
    abortController.abort("48-HOUR RESTART");

    // Optional delay to let logs flush / services wind down
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Let Docker do the actual restart
    Deno.exit(1);
  }, RESTART_INTERVAL);
}

async function SeverCleanup() {
  try {
    await browser.close();
  } catch (_) {
    //
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));
  Deno.exit(0);
}

function setupGracefulShutdown() {
  const signals: Deno.Signal[] = ["SIGTERM", "SIGINT"];

  for (const sig of signals) {
    Deno.addSignalListener(sig, async () => {
      await SeverCleanup();
    });
  }
}

setupGracefulShutdown();

Deno.serve({
  port: 8080,
  hostname: Deno.env.get("HOSTNAME") ?? "0.0.0.0",
  signal: abortController.signal,
}, serveHandler);
