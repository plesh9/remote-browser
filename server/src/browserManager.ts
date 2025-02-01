import puppeteer, { Browser, Page } from "puppeteer";
import { WebSocket } from "ws";

const WINDOW_SIZE = { width: 375, height: 667 };

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async launchBrowser(url: string) {
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        `
        --window-size=;${WINDOW_SIZE.width},${WINDOW_SIZE.height}`,
        "--disable-infobars",
        "--mute-audio",
        "--disable-features=TranslateUI",
      ],
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
      document.cookie.split(";").forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      const css = document.createElement("style");

      css.appendChild(
        document.createTextNode(
          `
            *{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}
            html {
              overflow: hidden !important;
            }
            .login-cols {
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              height: 100dvh !important;
              overflow: hidden !important;
              padding: 16px !important;
            }
            // .v-text-field__details {
            //   display: none !important;
            // }
            // :root {
            //   --bg-color: #242529;
            //   --text-color: #fff;
            // }
          `
        )
      );
      document.head.appendChild(css);

      const acceptButton = document.querySelector(
        ".b-cookies-informer__nav .g-btn.m-btn-gaps.m-reset-width.g-nowrap.m-rounded.m-sm"
      ) as HTMLElement;

      acceptButton?.click();

      document.querySelector(".login-col__inner")?.remove();
      document.querySelector(".b-loginreg__form > h3")?.remove();
      document.querySelector(".b-loginreg__form__issues")?.remove();
      document.querySelector(".b-loginreg__links")?.remove();
      document.querySelector(".m-twitter")?.remove();
      document.querySelector(".m-google")?.remove();
      document
        .querySelector(".g-btn.m-rounded.m-md.m-block.m-mb-16.m-social-btn")
        ?.remove();
      document.querySelector(".b-login-posts-outer")?.remove();
      document.querySelector(".l-footer-static")?.remove();
    });
  }

  async getScreenshot() {
    if (this.page) {
      return await this.page!.screenshot({
        encoding: "binary",
        type: "webp",
        quality: 99,
      });
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
    }
  }

  async handleSelectAllEvent() {
    if (!this.page) return;

    await this.page.evaluate(() => {
      document.execCommand("selectAll");
    });
  }

  async handleCopyTextEvent(ws: WebSocket) {
    if (!this.page) return;

    const copiedText = await this.page.evaluate(() => {
      const selection = document.getSelection();
      if (selection && selection.rangeCount > 0) {
        return selection.toString();
      }

      return "";
    });

    console.log(`Copied text from Puppeteer: "${copiedText}"`);

    if (copiedText.trim()) {
      ws.send(JSON.stringify({ type: "copyText", text: copiedText }));
    }
  }

  async handleBlurEvent() {
    if (this.page) {
      await this.page.evaluate(() => {
        const activeEl = document.activeElement;
        if (activeEl && activeEl instanceof HTMLElement) {
          activeEl.blur();
        }
      });
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
