import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import path from "path";
import fs from "fs";
import { OpenAI } from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatbotCoordinates {
  x: number;
  y: number;
}

/**
 * Takes a screenshot of the webpage
 * @param url URL of the page to capture
 * @param filename Optional filename to save the screenshot
 * @returns Buffer containing the screenshot
 */
export async function capturePage(
  url: string,
  page: puppeteer.Page,
  filename?: string
): Promise<Buffer> {
  try {
    // Take a screenshot of the entire page
    const screenshot = await page.screenshot({ fullPage: true });

    // Save the screenshot to disk if filename is provided
    if (filename) {
      const screenshotDir = path.join(process.cwd(), "src/utils/screenshots");
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      
      const screenshotPath = path.join(screenshotDir, filename);
      fs.writeFileSync(screenshotPath, screenshot);
      console.log(`Screenshot saved to ${screenshotPath}`);
    }

    return screenshot;
  } catch (error) {
    console.error("Error capturing page:", error);
    throw error;
  }
}

/**
 * Gets the coordinates of the chatbot from an image using OpenAI's vision model
 * @param screenshot Screenshot buffer
 * @returns Coordinates of the chatbot button
 */
export async function getChatbotCoordinates(
  screenshot: Buffer
): Promise<ChatbotCoordinates> {
  try {
    const base64Image = screenshot.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: "You are a computer vision assistant that identifies chatbot widgets in web pages."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Look at this website screenshot and find the chatbot widget. It's usually a button or icon in a corner of the page. Return ONLY a JSON object with the x and y coordinates where I should click to open the chatbot. Format: {\"x\": number, \"y\": number}"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || "";
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract coordinates from the AI response");
    }

    const coordinates = JSON.parse(jsonMatch[0]) as ChatbotCoordinates;
    return coordinates;
  } catch (error) {
    console.error("Error getting chatbot coordinates:", error);
    throw error;
  }
}

/**
 * Evaluates the quality of a chatbot's welcome message
 * @param screenshot Screenshot buffer containing the open chatbot
 * @returns Analysis of the welcome message
 */
export async function evaluateWelcomeMessage(
  screenshot: Buffer
): Promise<string> {
  try {
    const base64Image = screenshot.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at evaluating chatbot UX and messaging."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this chatbot welcome message. Evaluate the following aspects: 1) How clear and instructive is the welcome message, 2) Does it explain what the chatbot can help with, 3) Is the message friendly and engaging, 4) How well does it guide the user to take the next action. Provide a detailed analysis with specific suggestions for improvement."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "Could not evaluate the welcome message";
  } catch (error) {
    console.error("Error evaluating welcome message:", error);
    throw error;
  }
}

/**
 * Main function to process a URL, detect the chatbot, and evaluate its welcome message
 * @param url URL of the page to analyze
 * @returns Object containing the evaluation and the vendor
 */
export async function processWelcomeMessage(url: string) {
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36";

  let browser;
  try {
    // Launch Puppeteer with Vercel-compatible settings
    browser = await puppeteer.launch({
      args: [...chromium.args, "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless === "new" ? true : false,
    });

    const page = await browser.newPage();
    await page.setUserAgent(ua);

    // Navigate to the URL with a timeout
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    
    // Wait for the page to fully load
    await page.waitForTimeout(5000);

    // Take initial screenshot
    console.log("Taking initial screenshot...");
    const initialScreenshot = await capturePage(url, page, "initial_screenshot.png");

    // Get chatbot coordinates
    console.log("Getting chatbot coordinates...");
    const coordinates = await getChatbotCoordinates(initialScreenshot);
    console.log("Chatbot detected at coordinates:", coordinates);

    // Click on the chatbot to open it
    console.log("Clicking on chatbot...");
    await page.mouse.click(coordinates.x, coordinates.y);

    // Wait for the chatbot to open
    await page.waitForTimeout(3000);

    // Take a screenshot with the open chatbot
    console.log("Taking screenshot with open chatbot...");
    const chatbotScreenshot = await capturePage(url, page, "chatbot_screenshot.png");

    // Evaluate the welcome message
    console.log("Evaluating welcome message...");
    const evaluation = await evaluateWelcomeMessage(chatbotScreenshot);

    await browser.close();

    return {
      url,
      evaluation,
    };
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error("Error processing welcome message:", error);
    throw error;
  }
} 