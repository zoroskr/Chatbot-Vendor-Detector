import { detectVendor } from "@/utils/detectVendor";
import { processWelcomeMessage } from "@/utils/welcomePattern";
import readline from "readline";

/**
 * runCLI
 *
 * Executes the CLI to detect a chatbot on a given page and evaluate its welcome message.
 *
 * @returns {void}
 */
const runCLI = async () => {
  console.log("\x1b[34mWelcome to the Chatbot Vendor Detector CLI!\x1b[0m");
  console.log("\x1b[36mThis tool identifies chatbot vendors and evaluates welcome messages on a given webpage!\x1b[0m\n");

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
 * Processes the entered URL, detects the chatbot, and evaluates its welcome message.
 *
 * @param {string} url - The URL of the page to analyze.
 * @returns {Promise<void>}
 */
const processURL = async (url: string) => {
  console.log(`\x1b[34mAnalyzing: \x1b[4m${url}\x1b[0m...\n`);

  try {
    // Detect vendor
    console.log("\x1b[36m🔍 Detecting chatbot vendor...\x1b[0m");
    const result = await detectVendor(url);

    if (result.method === "timeout") {
      console.log("\x1b[33m⏳ The analysis timed out. The page might be too slow or unresponsive.\x1b[0m");
    } else if (result.method === "error") {
      console.log("\x1b[31m❌ An error occurred while analyzing the page. Please try again later.\x1b[0m");
    } else if (result.vendor) {
      console.log(`\x1b[32m✅ Detected vendor: ${result.vendor} (Method: ${result.method})\x1b[0m`);
      
      // If a vendor is detected, analyze the welcome message
      console.log("\x1b[36m🔍 Analyzing welcome message...\x1b[0m");
      try {
        const welcomeResult = await processWelcomeMessage(url);
        console.log("\x1b[32m✅ Welcome message analysis complete:\x1b[0m");
        console.log("\x1b[33m" + welcomeResult.evaluation + "\x1b[0m");
      } catch (error) {
        console.error("\x1b[31mError analyzing welcome message:\x1b[0m", error);
      }
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
