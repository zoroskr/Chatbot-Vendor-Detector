# Project Requirements Document (PRD)

## 1. Project Overview
The project already has a functionality to detect chatbots vendors in web pages. Now, a new functionality will be added to detect and evaluate the welcome messages of these chatbots.

The objective of this new functionality is to capture the welcome messages of chatbots embedded in web pages and send them to an LLM (Large Language Model) to evaluate their quality and clarity.

## 2. Key Functionalities

### URL Input:
- A user sends the URL to api/detect/route.ts. From there "detectVendor" is called and now another script must be called to parse the welcome message.

### Access and Content Extraction:
- 2.1. The page content is accessed using Puppeteer.
- 2.2. A screenshot of the entire page is taken.

### Chatbot Position Detection:
- 3.1. The screenshot is sent to an LLM specialized in image processing.
- 3.2. The LLM determines and returns the coordinates of the chatbot (initially minimized).

### Interaction with the Chatbot:
- 4.1. A click is performed at the coordinates indicated by the LLM to deploy the chatbot.
- 4.2. A new screenshot is taken with the deployed chatbot, showing the welcome messages.

### Welcome Message Quality Evaluation:
- 5.1. The screenshot with the deployed chatbot is sent to another LLM to analyze how explanatory and effective the welcome messages are.
- 5.2. The obtained response with the quality analysis is returned to the user.

## 3. Project Structure
To maintain simplicity and minimize the number of files, the following structure is proposed:

```
chatbot-quality-analyzer/
├── package.json       // Dependency configuration and scripts
├── .env               // Environment variables (if necessary)
├── welcomePattern.ts           // Main file that integrates:
│                      // - URL reading
│                      // - Puppeteer initialization to access the page
│                      // - Screenshots (before and after interacting with the chatbot)
│                      // - Communication with LLMs for detection and evaluation
├── Dockerfile         // Optional, for application containerization
└── README.md          // General documentation and usage guide
```

### Details of each file

#### package.json:
Manages project dependencies (Puppeteer, LLM libraries, etc.) and defines execution and development scripts.

#### .env:
Stores sensitive environment variables or specific configurations without exposing them in the code.

#### welcomePattern.ts:
Contains the central logic of the process, organized into functions that handle:

- Opening the URL and capturing the screen.
- Sending the image to the LLM to determine the chatbot coordinates.
- Performing the interaction (click) to deploy the chatbot.
- Taking the final capture and sending that image to an LLM to analyze the message quality.

Example of functions in welcomePattern.ts:

```typescript
import puppeteer from 'puppeteer';
import { sendImageToLLM, getChatbotCoordinatesLLM } from './utils/llm';

async function capturePage(url: string): Promise<Buffer> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const screenshot = await page.screenshot();
  await browser.close();
  return screenshot;
}

async function processChatbot(url: string): Promise<string> {
  // Step 1: Capture the initial screen
  const initialScreenshot = await capturePage(url);
  
  // Step 2: Get chatbot coordinates from the LLM
  const coordinates = await getChatbotCoordinatesLLM(initialScreenshot);
  
  // Step 3: Open the page again to interact with the chatbot
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.mouse.click(coordinates.x, coordinates.y);
  
  // Step 4: Capture the screen with the deployed chatbot
  const chatbotScreenshot = await page.screenshot();
  await browser.close();

  // Step 5: Evaluate the quality of the welcome message
  const evaluation = await sendImageToLLM(chatbotScreenshot);
  return evaluation;
}

// Main execution (can be adapted for CLI or server)
(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('You must provide a URL.');
    process.exit(1);
  }
  const result = await processChatbot(url);
  console.log('Welcome message evaluation:', result);
})();
```

#### Dockerfile:
If the application is containerized, the Dockerfile will contain the necessary instructions to build the image.
Basic example:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
```

#### README.md:
Reference document for project configuration, installation, and usage. It should include:

- Project description.
- Installation and execution instructions.
- Usage examples and expected responses.
- Links to the documentation of each component or function.

## 4. Additional Documentation and Code Examples
It is important to include in the PRD all the contextual details that have been provided, such as:

### Examples of code and responses:
Examples have been included in the index.ts section to illustrate how to perform the screen capture, interaction with the LLM, and evaluation of the welcome message.

### Context of communication with the LLM:
The functions `getChatbotCoordinatesLLM` and `sendImageToLLM` should be defined in the ./utils/llm directory and can handle the connection logic with LLM services.
For example:

```typescript
// utils/llm.ts
export async function getChatbotCoordinatesLLM(image: Buffer): Promise<{x: number, y: number}> {
  // Implement logic to send the image to the LLM and parse the response
  return { x: 100, y: 200 }; // Example return
}

export async function sendImageToLLM(image: Buffer): Promise<string> {
  // Implement logic to send the image and receive message analysis
  return 'Clear and concise message'; // Example response
}
```

### Instructions for developers:
It is recommended to include in the internal project documentation (for example, in the README or in a separate "Instructions" document):

- Steps to install dependencies and configure the environment.
- How to run and test each functionality.
- Examples of use cases and LLM response scenarios.

## 5. Summary and Final Considerations
- **Simplicity**: The proposed minimalist structure centralizes the logic in few files, which facilitates the maintenance and understanding of the process flow.
- **Comprehensive Documentation**: Including all provided documentation (with code examples and responses) is essential for alignment and correct implementation of functionalities.
- **Scalability**: Although starting with a simplified structure, the project can scale and be modularized as new functionalities are added or greater organization is needed.