import { Browser, Page } from "@astral/astral";

export class page_pool {
  public MAX_PAGES = 5;
  private pageQueue: (() => void)[] = [];
  private astral_browser: Browser;

  constructor(_astral_browser: Browser) {
    this.astral_browser = _astral_browser;
  }

  public async acquirePage(): Promise<Page> {
    if (this.pageQueue.length >= this.MAX_PAGES) {
      await new Promise<void>((resolve) => this.pageQueue.push(resolve));
    }
    const page = await this.astral_browser.newPage();
    return page;
  }

  public async releasePage(page: Page) {
    await page.close();
    const next = this.pageQueue.shift();
    if (next) next();
  }
}
