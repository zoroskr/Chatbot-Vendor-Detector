import { processWelcomeMessage } from "@/utils/welcomePattern";

/**
 * A simple test script for the welcome message evaluation functionality
 * Usage: npm run test-welcome <url>
 */

const testWelcomeMessage = async () => {
  const url = process.argv[2];
  
  if (!url) {
    console.error("Please provide a URL as an argument");
    console.log("Usage: npm run test-welcome <url>");
    process.exit(1);
  }

  console.log(`Testing welcome message evaluation for URL: ${url}`);
  
  try {
    console.log("Processing welcome message...");
    const result = await processWelcomeMessage(url);
    
    console.log("\n--- Welcome Message Evaluation Results ---");
    console.log(`URL: ${result.url}`);
    console.log("\nEvaluation:");
    console.log(result.evaluation);
    console.log("\n--- End of Results ---");
  } catch (error) {
    console.error("Error processing welcome message:", error);
  }
};

testWelcomeMessage(); 