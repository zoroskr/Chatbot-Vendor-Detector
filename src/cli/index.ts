import { detectVendor } from "@/utils/detectVendor";
import readline from "readline";

/**
 * runCLI
 *
 * Executes the CLI to detect a chatbot on a given page.
 *
 * @returns {void}
 */
const runCLI = async () => {
  console.log("\x1b[34mWelcome to the Chatbot Vendor Detector CLI!\x1b[0m");
  console.log("\x1b[36mThis tool identifies chatbot vendors on a given webpage using advanced detection algorithms!\x1b[0m\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askForURL = () => {
    console.log("\x1b[33mEnter a URL to analyze and press Enter:\x1b[0m");
    rl.question("\x1b[32mURL:\x1b[0m ", async (url) => {
      await processURL(url);
      askForURL();
    });
  };

  askForURL();
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
  console.log(`\x1b[34mAnalyzing: \x1b[4m${url}\x1b[0m...\n`);

  try {
    const result = await detectVendor(url);

    if (result.method === "timeout") {
      console.log("\x1b[33m⏳ The analysis timed out. The page might be too slow or unresponsive.\x1b[0m");
    } else if (result.method === "error") {
      console.log("\x1b[31m❌ An error occurred while analyzing the page. Please try again later.\x1b[0m");
    } else if (result.vendor) {
      console.log(`\x1b[32m✅ Detected vendor: ${result.vendor} (Method: ${result.method})\x1b[0m`);
    } else {
      console.log("\x1b[36m🔍 No chatbot vendor detected from our database.\x1b[0m");
    }
    
    console.log("\x1b[35mNote: Detection is based on our algorithm and may have a margin of error. We recommend verifying manually for accuracy.\x1b[0m\n");
    console.log("\x1b[90m--------------------------------------------------\x1b[0m\n");
  } catch (error) {
    console.error("\x1b[31mError analyzing the page:\x1b[0m", error);
  }
};

runCLI();
