import puppeteer from "puppeteer-core";
import type { Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import path from "path";
import fs from "fs";
import { OpenAI } from "openai";
import {setTimeout} from "node:timers/promises";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatbotCoordinates {
  x: number;
  y: number;
}

/**
 * Convierte un Buffer a una cadena base64 válida para OpenAI
 * @param buffer Buffer de imagen
 * @returns Cadena base64
 */
function bufferToBase64(buffer: Buffer): string {
  // Aseguramos de que estamos trabajando con un Buffer
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }
  return buffer.toString('base64');
}

/**
 * Takes a screenshot of the webpage
 * @param url URL of the page to capture
 * @param page Puppeteer page object
 * @param filename Optional filename to save the screenshot
 * @returns Buffer containing the screenshot
 */
export async function capturePage(
  url: string,
  page: Page,
  filename?: string
): Promise<Buffer> {
  try {
    // Intentar primero con una captura más simple para evitar errores
    let screenshot: Buffer;
    try {
      // Intentar con las opciones completas
      screenshot = await page.screenshot({ 
        type: 'jpeg',
        quality: 70,
        fullPage: false,  // Cambiado a false para capturar solo el viewport
        omitBackground: false
      }) as Buffer;
    } catch (screenshotError) {
      console.warn("Error en la primera captura, intentando con opciones más simples:", screenshotError);
      
      // Si falla, intentar con una configuración más simple
      screenshot = await page.screenshot({ 
        type: 'jpeg',
        quality: 50,
        fullPage: false
      }) as Buffer;
    }

    // Save the screenshot to disk if filename is provided
    if (filename && screenshot) {
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
    // En caso de error, devolver un buffer vacío para evitar que se rompa el flujo
    console.log("Returning an empty buffer to continue the flow");
    return Buffer.from('');
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
    // Convert buffer to base64 string properly for OpenAI API
    const base64Image = bufferToBase64(screenshot);

    console.log("Sending image to OpenAI for chatbot detection...");
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
                text: "Look at this website screenshot and find the chatbot widget. It's usually a button or icon in a corner of the page (often in the bottom right). Return ONLY a JSON object with the x and y coordinates where I should click to open the chatbot. Format: {\"x\": number, \"y\": number}"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || "";
      console.log("OpenAI response:", content);
      
      // Intentar diferentes patrones para extraer las coordenadas
      try {
        // Primer intento: buscar un objeto JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const coordinates = JSON.parse(jsonMatch[0]) as ChatbotCoordinates;
          // Verificar que las coordenadas son números válidos
          if (typeof coordinates.x === 'number' && typeof coordinates.y === 'number') {
            return coordinates;
          }
        }

        // Segundo intento: buscar números específicos en el texto
        const xMatch = content.match(/x\s*[:=]\s*(\d+)/i);
        const yMatch = content.match(/y\s*[:=]\s*(\d+)/i);
        
        if (xMatch && yMatch) {
          return {
            x: parseInt(xMatch[1], 10),
            y: parseInt(yMatch[1], 10)
          };
        }
        
        // Tercer intento: buscar coordenadas en formato (X, Y)
        const coordsMatch = content.match(/\((\d+)[,\s]+(\d+)\)/);
        if (coordsMatch) {
          return {
            x: parseInt(coordsMatch[1], 10),
            y: parseInt(coordsMatch[2], 10)
          };
        }
        
        // Si ninguno de los intentos funciona, usar valores predeterminados
        console.warn("No se pudieron extraer coordenadas válidas, usando valores predeterminados");
        return { x: 1200, y: 700 }; // Valores típicos para un chatbot en la esquina inferior derecha
      } catch (parseError) {
        console.error("Error al analizar las coordenadas:", parseError);
        // Valores predeterminados en caso de error
        return { x: 1200, y: 700 };
      }
    } catch (error: unknown) {
      console.error("OpenAI API error:", error);
      
      // Verificar si hay información adicional de error
      if (error instanceof Error) {
        const errorDetail = (error as any).error || {};
        console.error("Error details:", {
          message: errorDetail.message,
          type: errorDetail.type,
          code: errorDetail.code,
          param: errorDetail.param
        });
        
        // En caso de error, devolver coordenadas predeterminadas para no romper el flujo
        console.log("Using default coordinates due to OpenAI API error");
        return { x: 1200, y: 700 };
      }
      
      throw new Error(`Error desconocido en la API de OpenAI`);
    }
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
    // Convert buffer to base64 string properly for OpenAI API
    const base64Image = bufferToBase64(screenshot);
    
    console.log("Sending image to OpenAI for welcome message evaluation...");
    
    try {
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
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || "Could not evaluate the welcome message";
    } catch (error: unknown) {
      console.error("OpenAI API error:", error);
      
      // Verificar si hay información adicional de error
      if (error instanceof Error) {
        const errorDetail = (error as any).error || {};
        console.error("Error details:", {
          message: errorDetail.message,
          type: errorDetail.type,
          code: errorDetail.code,
          param: errorDetail.param
        });
        
        throw new Error(`Error en la API de OpenAI: ${error.message}`);
      }
      
      throw new Error(`Error desconocido en la API de OpenAI`);
    }
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
    // Determinar si estamos en desarrollo o producción
    const isDev = process.env.NODE_ENV === 'development';
    
    // Configuración del navegador según el entorno
    if (isDev) {
      // En desarrollo, usar el navegador local si está disponible
      const executablePath = process.env.BROWSER_PATH || "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
      const filteredArgs = chromium.args.filter(arg => !arg.includes('--headless'));
      
      browser = await puppeteer.launch({
        args: filteredArgs,
        defaultViewport: { width: 1280, height: 800 },
        executablePath,
        headless: false,
        devtools: true,
      });
    } else {
      // En producción, usar la configuración compatible con Vercel
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless === "new" ? true : false,
      });
    }

    const page = await browser.newPage();
    await page.setUserAgent(ua);

    // Navigate to the URL with a timeout
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    
    // Wait for the page to fully load
    await setTimeout(5000);

    // Take initial screenshot
    console.log("Taking initial screenshot...");
    const initialScreenshot = await capturePage(url, page, "initial_screenshot.png");
    
    // Verificar si pudimos obtener la captura inicial
    if (!initialScreenshot || initialScreenshot.length === 0) {
      throw new Error("No se pudo capturar la pantalla inicial");
    }

    // Get chatbot coordinates
    console.log("Getting chatbot coordinates...");
    const coordinates = await getChatbotCoordinates(initialScreenshot);
    console.log("Chatbot detected at coordinates:", coordinates);

    // Verificar si las coordenadas son válidas
    if (!coordinates || (coordinates.x <= 0 && coordinates.y <= 0)) {
      throw new Error("No se pudieron obtener coordenadas válidas para el chatbot");
    }

    try {
      // Click on the chatbot to open it
      console.log("Clicking on chatbot...");
      await page.mouse.click(coordinates.x, coordinates.y);

      // Wait for the chatbot to open
      await setTimeout(3000);

      // Take a screenshot with the open chatbot
      console.log("Taking screenshot with open chatbot...");
      const chatbotScreenshot = await capturePage(url, page, "chatbot_screenshot.png");

      // Verificar si pudimos obtener la captura del chatbot
      if (!chatbotScreenshot || chatbotScreenshot.length === 0) {
        throw new Error("No se pudo capturar la pantalla del chatbot después de hacer clic");
      }

      // Evaluate the welcome message
      console.log("Evaluating welcome message...");
      const evaluation = await evaluateWelcomeMessage(chatbotScreenshot);

      await browser.close();

      return {
        url,
        evaluation,
      };
    } catch (clickError) {
      console.error("Error después de detectar el chatbot:", clickError);
      
      // Si falla después de hacer clic, intentar una captura completa de la página
      console.log("Intentando capturar pantalla completa como alternativa...");
      try {
        const fullPageScreenshot = await page.screenshot({
          type: 'jpeg',
          quality: 50
        }) as Buffer;
        
        console.log("Evaluando la pantalla completa...");
        const evaluation = await evaluateWelcomeMessage(fullPageScreenshot);
        
        await browser.close();
        
        return {
          url,
          evaluation,
          note: "La evaluación se realizó en la pantalla completa, no se pudo abrir el chatbot"
        };
      } catch (fallbackError) {
        console.error("Error en el intento alternativo:", fallbackError);
        throw new Error("No se pudo evaluar el mensaje de bienvenida del chatbot");
      }
    }
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error("Error processing welcome message:", error);
    throw error;
  }
} 