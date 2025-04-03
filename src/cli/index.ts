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
    console.log("\x1b[33mEnter a URL to analyze and press Enter (or type 'exit' to quit):\x1b[0m");
    rl.question("\x1b[32mURL:\x1b[0m ", async (url) => {
      if (url.toLowerCase() === 'exit') {
        console.log("\x1b[34mThank you for using Chatbot Vendor Detector CLI. Goodbye!\x1b[0m");
        rl.close();
        return;
      }
      await showOptions(url, rl);
    });
  };

  askForURL();
};

/**
 * showOptions
 * 
 * Shows the available analysis options for the URL.
 * 
 * @param {string} url - The URL to analyze
 * @param {readline.Interface} rl - The readline interface
 * @returns {Promise<void>}
 */
const showOptions = async (url: string, rl: readline.Interface) => {
  console.log(`\x1b[34mURL to analyze: \x1b[4m${url}\x1b[0m\n`);
  console.log("\x1b[33mSelect an option:\x1b[0m");
  console.log("1. \x1b[36mDetect Vendor\x1b[0m");
  console.log("2. \x1b[36mAnalyze Welcome Message\x1b[0m");
  console.log("3. \x1b[36mBoth\x1b[0m");
  console.log("4. \x1b[36mEnter a new URL\x1b[0m");
  console.log("5. \x1b[36mExit\x1b[0m");

  rl.question("\x1b[32mOption (1-5):\x1b[0m ", async (option) => {
    switch (option) {
      case "1":
        await detectVendorOnly(url);
        await showOptions(url, rl);
        break;
      case "2":
        await analyzeWelcomeMessageOnly(url);
        await showOptions(url, rl);
        break;
      case "3":
        await detectVendorAndWelcomeMessage(url);
        await showOptions(url, rl);
        break;
      case "4":
        askForURL();
        break;
      case "5":
        console.log("\x1b[34mThank you for using Chatbot Vendor Detector CLI. Goodbye!\x1b[0m");
        rl.close();
        break;
      default:
        console.log("\x1b[31mInvalid option. Please try again.\x1b[0m");
        await showOptions(url, rl);
    }
  });
};

/**
 * detectVendorOnly
 *
 * Detects only the chatbot vendor for a given URL.
 *
 * @param {string} url - The URL of the page to analyze.
 * @returns {Promise<void>}
 */
const detectVendorOnly = async (url: string) => {
  console.log(`\x1b[34mAnalyzing vendor for: \x1b[4m${url}\x1b[0m...\n`);

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
    } else {
      console.log("\x1b[36m🔍 No chatbot vendor detected from our database.\x1b[0m");
    }
    
    console.log("\x1b[35mNote: Detection is based on our algorithm and may have a margin of error. We recommend verifying manually for accuracy.\x1b[0m\n");
    console.log("\x1b[90m--------------------------------------------------\x1b[0m\n");
  } catch (error) {
    console.error("\x1b[31mError analyzing the page:\x1b[0m", error);
    console.log("\x1b[90m--------------------------------------------------\x1b[0m\n");
  }
};

/**
 * analyzeWelcomeMessageOnly
 *
 * Analyzes only the welcome message for a given URL.
 *
 * @param {string} url - The URL of the page to analyze.
 * @returns {Promise<void>}
 */
const analyzeWelcomeMessageOnly = async (url: string) => {
  console.log(`\x1b[34mAnalyzing welcome message for: \x1b[4m${url}\x1b[0m...\n`);

  try {
    console.log("\x1b[36m🔍 Analyzing welcome message...\x1b[0m");
    const welcomeResult = await processWelcomeMessage(url);
    console.log("\x1b[32m✅ Welcome message analysis complete:\x1b[0m");
    console.log("\x1b[33m" + welcomeResult.evaluation + "\x1b[0m");
    
    if (welcomeResult.attempts === "failed") {
      console.log("\x1b[33m⚠️ Analysis was performed on the full page as the chatbot could not be opened.\x1b[0m");
    }
    
    console.log("\x1b[90m--------------------------------------------------\x1b[0m\n");
  } catch (error) {
    console.error("\x1b[31mError analyzing welcome message:\x1b[0m", error);
    console.log("\x1b[90m--------------------------------------------------\x1b[0m\n");
  }
};

/**
 * detectVendorAndWelcomeMessage
 *
 * Detects the chatbot vendor and analyzes the welcome message for a given URL.
 *
 * @param {string} url - The URL of the page to analyze.
 * @returns {Promise<void>}
 */
const detectVendorAndWelcomeMessage = async (url: string) => {
  console.log(`\x1b[34mPerforming full analysis for: \x1b[4m${url}\x1b[0m...\n`);

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
    } else {
      console.log("\x1b[36m🔍 No chatbot vendor detected from our database.\x1b[0m");
    }
    
    // Analyze welcome message regardless of vendor detection
    console.log("\n\x1b[36m🔍 Analyzing welcome message...\x1b[0m");
    try {
      const welcomeResult = await processWelcomeMessage(url);
      console.log("\x1b[32m✅ Welcome message analysis complete:\x1b[0m");
      console.log("\x1b[33m" + welcomeResult.evaluation + "\x1b[0m");
      
      if (welcomeResult.attempts === "failed") {
        console.log("\x1b[33m⚠️ Analysis was performed on the full page as the chatbot could not be opened.\x1b[0m");
      }
    } catch (error) {
      console.error("\x1b[31mError analyzing welcome message:\x1b[0m", error);
    }
    
    console.log("\x1b[35mNote: Detection is based on our algorithm and may have a margin of error. We recommend verifying manually for accuracy.\x1b[0m\n");
    console.log("\x1b[90m--------------------------------------------------\x1b[0m\n");
  } catch (error) {
    console.error("\x1b[31mError analyzing the page:\x1b[0m", error);
    console.log("\x1b[90m--------------------------------------------------\x1b[0m\n");
  }
};

/**
 * Helper function to ask for the URL
 * 
 * @param {readline.Interface} rl - The readline interface
 * @returns {void}
 */
const askForURL = () => {
  console.log("\x1b[33mEnter a URL to analyze and press Enter (or type 'exit' to quit):\x1b[0m");
  rl.question("\x1b[32mURL:\x1b[0m ", async (url) => {
    if (url.toLowerCase() === 'exit') {
      console.log("\x1b[34mThank you for using Chatbot Vendor Detector CLI. Goodbye!\x1b[0m");
      rl.close();
      return;
    }
    await showOptions(url, rl);
  });
};

runCLI();
