import { detectVendor } from "../utils/detectVendor";
import readline from "readline";

/**
 * runCLI
 *
 * Executes the CLI to detect a chatbot on a given page.
 *
 * @returns {void}
 */
const runCLI = async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Welcome to the Chatbot Vendor Detector CLI!");
    console.log("Enter a URL to analyze and press Enter:\n");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("URL: ", async (url) => {
      await processURL(url);
      rl.close();
    });
  } else {
    await processURL(args[0]);
  }
};

/**
 * processURL
 *
 * Processes the entered URL and detects the chatbot on the page.
 *
 * @param {string} url - The URL of the page to analyze.
 * @returns {Promise<void>}
 */
const processURL = async (url: string) => {
  console.log(`Analyzing: ${url}...\n`);

  try {
    const result = await detectVendor(url);
    if (result.vendor) {
      console.log(
        `✅ Detected vendor: ${result.vendor} (Method: ${result.method})`
      );
    } else {
      console.log("❌ No chatbot vendor detected from the database.");
    }
    console.log("Note: Detection is an estimation, please verify manually.");
  } catch (error) {
    console.error("Error analyzing the page:", error);
  }
};

runCLI();
