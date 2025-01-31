import puppeteer, { Browser, Page } from "puppeteer";

const WINDOW_SIZE = { width: 1200, height: 800 };

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async launchBrowser(url: string) {
    this.browser = await puppeteer.launch({
      headless: false, // Відкритий браузер, щоб можна було бачити
      args: [`--window-size=;${WINDOW_SIZE.width},${WINDOW_SIZE.height}`],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({
      width: WINDOW_SIZE.width,
      height: WINDOW_SIZE.height,
      deviceScaleFactor: 2,
    });
    await this.page.goto(url, { waitUntil: "domcontentloaded" });

    await this.page.waitForSelector("#app", { timeout: 1000 });

    await this.page.evaluate(() => {
      const acceptButton = document.querySelector(
        ".b-cookies-informer__nav .g-btn.m-btn-gaps.m-reset-width.g-nowrap.m-rounded.m-sm"
      ) as HTMLElement;

      acceptButton?.click();

      document.querySelector(".b-loginreg__form__issues")?.remove();
      document.querySelector(".b-loginreg__links")?.remove();
      document.querySelector(".m-twitter")?.remove();
      document.querySelector(".m-google")?.remove();
      document
        .querySelector(".g-btn.m-rounded.m-md.m-block.m-mb-16.m-social-btn")
        ?.remove();

        const logCols = document.querySelector(".login-cols") as HTMLElement;

        if (logCols) {
            logCols.style.paddingBottom = "400px";
        }
    });
  }

  async getScreenshot() {
    if (this.page) {
      const clip = {
        x: 0,
        y: 0,
        width: WINDOW_SIZE.width,
        height: WINDOW_SIZE.height,
      };
      return await this.page.screenshot({ encoding: "binary",
        type: "webp",
        quality: 100, 
        clip });
    }

    return null;
  }

  async handleMouseEvent(event: any) {
    if (this.page) {
      const { eventType, x, y } = event;

      if (eventType === "click") {
        await this.page.mouse.click(x, y);
      }
    }
  }

  async handleKeyboardEvent(event: any) {
    if (this.page) {
      const { eventType, key } = event;
      if (eventType === "keydown") {
        await this.page.keyboard.down(key);
      } else if (eventType === "keyup") {
        await this.page.keyboard.up(key);
      } else if (eventType === "keypress") {
        await this.page.keyboard.press(key);
      }
    }
  }

  async handlePasteEvent(event: any) {
    if (this.page) {
        const { text } = event;
        await this.page.keyboard.sendCharacter(text);
        console.log(`Inserted text: ${text}`);
    }
}

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
