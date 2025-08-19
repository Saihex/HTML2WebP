import { TemplateParser } from "~/src/parser.ts";
import { launch, Page } from "@astral/astral";
const abortController = new AbortController();

const MAX_PAGES = 5;
const pageQueue: (() => void)[] = [];

const browser = await launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

if (Deno.args.includes("--setup")) {
  Deno.exit(0);
}

const TWEMOJI_SCRIPT = `
<script src="https://unpkg.com/twemoji@latest/dist/twemoji.min.js" crossorigin="anonymous"></script>
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

async function acquirePage(): Promise<Page> {
  if (pageQueue.length >= MAX_PAGES) {
    await new Promise<void>((resolve) => pageQueue.push(resolve));
  }
  const page = await browser.newPage();
  return page;
}

async function releasePage(page: Page) {
  await page.close();
  const next = pageQueue.shift();
  if (next) next();
}

interface request_structure {
  html: string;
  width?: number;
  height?: number;
  values: Record<string, string>;
}

function safeViewport(width?: unknown, height?: unknown) {
  const defaultWidth = 1700;
  const defaultHeight = 893;

  const safeWidth = typeof width === "number" && !isNaN(width)
    ? width
    : defaultWidth;
  const safeHeight = typeof height === "number" && !isNaN(height)
    ? height
    : defaultHeight;

  return { width: safeWidth, height: safeHeight };
}

async function serveHandler(req: Request): Promise<Response> {
  const _url = new URL(req.url);
  if (_url.pathname === "/health") {
    let page;

    try {
      page = await acquirePage();
      page.goto("file://runtime_health.html");
      await page.waitForNetworkIdle();
      await releasePage(page)
      return new Response("Everything is well!", {
        status: 200,
      });
    } catch (e) {
      try {
        if (page) await releasePage(page)
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

  const parser = new TemplateParser(body.html);
  const result = parser.render(body.values);

  const page = await acquirePage();
  try {
    await page.setUserAgent("HTML2WebP");
    await page.setContent(`${result}${TWEMOJI_SCRIPT}`);

    const { width, height } = safeViewport(body.width, body.height);
    await page.setViewportSize({ width, height });

    await page.waitForNetworkIdle();
    await new Promise((event) => setTimeout(event, 720)); // Gravatar
    await page.waitForNetworkIdle();

    const webp = await page.screenshot({ format: "webp" });

    return new Response(webp, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
      },
    });
  } catch (e) {
    return new Response(`${e}`, {
      status: 500,
    });
  } finally {
    await releasePage(page);
  }
}

///

{
  // 48 hours → milliseconds
  const RESTART_INTERVAL = 48 * 60 * 60 * 1000; // more readable than 3.6e+6

  setTimeout(async () => {
    console.log("♻️ RESTARTING NOW: 48-hour auto-restart triggered");

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

Deno.serve({ port: 8080, signal: abortController.signal }, serveHandler);
