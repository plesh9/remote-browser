import puppeteer, { Browser, Page } from "puppeteer";
import { WebSocket } from "ws";

export class BrowserManager {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async launchBrowser({
    url,
    deviceWidth,
    deviceHeight,
  }: {
    url: string;
    deviceWidth: number;
    deviceHeight: number;
  }) {
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        `
        --window-size=;${deviceWidth},${deviceHeight}`,
        "--disable-infobars",
        "--mute-audio",
        "--disable-features=TranslateUI",
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({
      width: deviceWidth,
      height: deviceHeight,
      deviceScaleFactor: 2,
    });
    await this.page.goto(url, { waitUntil: "domcontentloaded" });

    await this.page.waitForSelector("#app", { timeout: 3000 });

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
            .login_content {
              background: none !important;
            }
            .login-cols {
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              height: 100dvh !important;
              overflow: hidden !important;
              padding: 16px !important;
            }
            .login-cols > .login-col:first-child {
              display: none !important;
            }
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
      document.querySelector(".contact_button")?.remove();
    });

    const selector = ".captcha_wrapper";

    await this.page.evaluate((selector) => {
      return new Promise<void>((resolve) => {
        const observer = new MutationObserver((mutations, obs) => {
          if (document.querySelector(selector)) {
            obs.disconnect();
            setTimeout(resolve, 2500);
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        if (document.querySelector(selector)) {
          observer.disconnect();
          setTimeout(resolve, 2500);
        }
      });
    }, selector);

    const boundingBox = await this.page.evaluate((selector) => {
      const element = document.querySelector(selector);

      if (!element) {
        return null;
      }

      const rect = element.getBoundingClientRect();

      return {
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.top + rect.height / 2 + window.scrollY,
      };
    }, selector);

    if (!boundingBox) {
      return;
    }

    await this.page.mouse.click(boundingBox.x, boundingBox.y);
  }

  async getScreenshot() {
    if (this.page) {
      const isCaptchaCompleted = await this.page.evaluate(() => {
        if (!document.querySelector(".captcha_wrapper")) {
          return true;
        }

        const isSubmitButtonDisabled =
          document
            .querySelector(".g-btn.m-rounded.m-block")
            ?.getAttribute("disabled") === "disabled";

        if (isSubmitButtonDisabled) {
          return false;
        }

        const isCaptchaError = document.querySelector(
          ".g-input__help.error_place"
        );

        if (isCaptchaError) {
          return false;
        }

        return true;
      });

      if (isCaptchaCompleted) {
        console.log("Капча виконана.");
        return null;
      }

      const captchaModalSelector = 'iframe[src*="recaptcha/enterprise/bframe"]';

      const iframeElement = await this.page.$(captchaModalSelector);
      if (!iframeElement) {
        console.log("reCAPTCHA iframe не знайдено.");
        return null;
      }

      const isVisible = await this.page.evaluate((selector) => {
        const iframe = document.querySelector(selector);
        if (!iframe) return false;

        const parentCaptchaModal = iframe.parentElement?.parentElement;
        if (!parentCaptchaModal) return false;

        const style = window.getComputedStyle(parentCaptchaModal);
        return style.display !== "none" && style.visibility !== "hidden";
      }, captchaModalSelector);

      if (!isVisible) {
        console.log("Капча прихована.");
        return null;
      }

      const boundingBox = await iframeElement.boundingBox();
      if (!boundingBox) {
        console.log("Не вдалося отримати розміри iframe.");
        return null;
      }

      const screenshotBuffer = await this.page.screenshot({
        encoding: "binary",
        type: "png",
        clip: {
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      });

      return {
        screenshotBuffer,
        screenshotWidth: boundingBox.width,
        screenshotHeight: boundingBox.height,
      };
    }

    return null;
  }

  async handleMouseEvent(event: any) {
    if (this.page) {
      const { eventType, x, y } = event;

      if (eventType === "click") {
        const captchaModalSelector =
          'iframe[src*="recaptcha/enterprise/bframe"]';

        const iframeElement = await this.page.$(captchaModalSelector);
        if (!iframeElement) {
          console.log("Iframe не знайдено.");
          return;
        }

        const frame = await iframeElement.contentFrame();
        if (!frame) {
          console.log("Не вдалося отримати вміст iframe.");
          return;
        }

        const boundingBox = await iframeElement.boundingBox();
        if (!boundingBox) {
          console.log("Не вдалося отримати розміри iframe.");
          return;
        }

        await frame.evaluate(
          ({ x, y }) => {
            const clickEvent = new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
            });

            document.elementFromPoint(x, y)?.dispatchEvent(clickEvent);
          },
          { x, y }
        );
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
