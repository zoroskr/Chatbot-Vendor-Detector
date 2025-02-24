import puppeteer from "puppeteer";
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
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36';
  const browser = await puppeteer.launch({
    headless: true,
    args: [      
      "--no-sandbox", 
      "--disable-setuid-sandbox",
    ]
  });
  const page = await browser.newPage();
  page.setUserAgent(ua);

  // Set request interception
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet' || request.resourceType() === 'font') {
      // Block images, stylesheets, and fonts to optimize load
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
};
