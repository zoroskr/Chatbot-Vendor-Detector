import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { vendors } from "./vendors";

/**
 * detectVendor
 *
 * Analyzes a webpage and detects if there is a chatbot from our vendor list.
 *
 * @param {string} url - The URL of the page to analyze.
 * @returns {Promise<{ vendor: string | null, method: string }>} - Detected vendor and the method used.
 */
export const detectVendor = async (url: string) => {
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36";

  let browser;
  try {
    const filteredArgs = chromium.args.filter(arg => !arg.includes('--headless'));

    // Launch Puppeteer with Vercel-compatible settings
    browser = await puppeteer.launch({
      args: filteredArgs,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      headless: false,
      devtools: true, // Abre DevTools automáticamente
    });

    

    const page = await browser.newPage();
    await page.setUserAgent(ua);

    // Set request interception to block unnecessary resources
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (["image", "stylesheet", "font"].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Navigate to the URL with a 60-second timeout
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Check network traffic
    const responses = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((r) => r.name)
    );

    let detectedVendor = null;
    let method = "";

    // Check if any network resource contains vendor keywords
    for (const vendor of vendors) {
      if (responses.some((r) => r.includes(vendor.networkKeyword))) {
        detectedVendor = vendor.name;
        method = "network";
        break;
      }
    }

    // Check window objects
    const detectedWindowVendor = await page.evaluate((vendors) => {
      return (
        vendors.find((v) => window[v.windowObject as keyof Window])?.name || null
      );
    }, vendors);

    if (detectedWindowVendor) {
      if (detectedVendor) {
        method = "both";
      } else {
        detectedVendor = detectedWindowVendor;
        method = "window";
      }
    }

    await browser.close();

    return {
      vendor: detectedVendor,
      method: detectedVendor ? method : "none",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return { vendor: null, method: "timeout" };
    }
    console.error("Error detecting vendor:", error);
    return { vendor: null, method: "error" };
  }
};
