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

interface RetryHistory {
  attempt: number;
  coordinates: ChatbotCoordinates;
  error?: string;
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
                text: "Look at this website screenshot and find the chatbot widget. It's usually a button or icon in a corner of the page (often in the bottom right). The widget is usually a circle, and its color contrasts with the background. Return ONLY a JSON object with the x and y coordinates of the center of the widget for better precision. Format: {'x': number, 'y': number}"
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
                text: "Analyze the welcome messages of the chatbot widget in the provided screenshot. If no chatbot widget is detected, respond with 'No chatbot widget found for analysis.' If found, list the analyzed messages (truncated if too long, max 300 characters) and provide a score from 1 to 100 based on clarity, usefulness, friendliness, and guidance. Keep the response concise."
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
 * Intenta detectar y abrir el chatbot con un sistema de reintentos inteligente
 */
async function retryOpenChatbot(
  page: Page,
  initialScreenshot: Buffer,
  maxRetries: number = 3
): Promise<{ success: boolean; screenshot?: Buffer; error?: string }> {
  const retryHistory: RetryHistory[] = [];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Intento ${attempt} de ${maxRetries} para abrir el chatbot...`);
    
    try {
      // Obtener coordenadas considerando el historial de intentos
      const coordinates = await getChatbotCoordinatesWithHistory(initialScreenshot, retryHistory);
      console.log(`Intento ${attempt}: Usando coordenadas:`, coordinates);

      // Registrar este intento en el historial
      retryHistory.push({
        attempt,
        coordinates
      });

      // Intentar hacer clic en las coordenadas
      await page.mouse.click(coordinates.x, coordinates.y);
      await setTimeout(3000); // Esperar a que se abra el chatbot

      // Tomar screenshot para verificar
      const chatbotScreenshot = await capturePage("", page, `chatbot_screenshot_attempt_${attempt}.png`);
      
      // Verificar si el chatbot se abrió correctamente
      const verificationResult = await verifyChatbotOpen(chatbotScreenshot);
      
      if (verificationResult.success) {
        console.log(`Éxito en el intento ${attempt}: Chatbot detectado y abierto correctamente`);
        return {
          success: true,
          screenshot: chatbotScreenshot
        };
      }

      // Si no se abrió, registrar el error y continuar con el siguiente intento
      retryHistory[retryHistory.length - 1].error = verificationResult.error;
      console.warn(`Intento ${attempt} fallido:`, verificationResult.error);
      
      // Esperar un poco antes del siguiente intento
      await setTimeout(2000);
    } catch (error) {
      console.error(`Error en el intento ${attempt}:`, error);
      retryHistory[retryHistory.length - 1].error = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  return {
    success: false,
    error: `No se pudo abrir el chatbot después de ${maxRetries} intentos`
  };
}

/**
 * Verifica si el chatbot está abierto en la imagen
 */
async function verifyChatbotOpen(screenshot: Buffer): Promise<{ success: boolean; error?: string }> {
  try {
    const base64Image = bufferToBase64(screenshot);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a computer vision assistant that verifies if a chatbot widget is open in screenshots."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Is there an open chatbot widget visible in this screenshot? Look for typical chatbot interfaces like message windows, chat bubbles, or conversation interfaces. Respond with ONLY 'true' if you see an open chatbot, or 'false' if you don't. No other text."
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
      max_tokens: 10,
    });

    const content = response.choices[0]?.message?.content?.toLowerCase() || '';
    const isOpen = content.includes('true');
    
    return {
      success: isOpen,
      error: isOpen ? undefined : 'No se detectó un chatbot abierto en la imagen'
    };
  } catch (error) {
    return {
      success: false,
      error: 'Error al verificar si el chatbot está abierto'
    };
  }
}

/**
 * Obtiene las coordenadas del chatbot considerando el historial de intentos previos
 */
async function getChatbotCoordinatesWithHistory(
  screenshot: Buffer,
  history: RetryHistory[]
): Promise<ChatbotCoordinates> {
  const base64Image = bufferToBase64(screenshot);
  
  // Construir el mensaje con el historial de intentos
  let historyMessage = "";
  if (history.length > 0) {
    historyMessage = "\n\nPrevious attempts failed with these coordinates:\n" +
      history.map(h => `Attempt ${h.attempt}: x=${h.coordinates.x}, y=${h.coordinates.y} - ${h.error || 'No error details'}`).join('\n') +
      "\nPlease suggest different coordinates avoiding these areas.";
  }

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
              text: `Look at this website screenshot and find the chatbot widget. It's usually a button or icon in a corner of the page (often in the bottom right). The widget is usually a circle, and its color contrasts with the background. Return ONLY a JSON object with the x and y coordinates of the center of the widget for better precision. Format: {'x': number, 'y': number}${historyMessage}`
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
    console.log("OpenAI response for coordinates:", content);

    // Intentar extraer las coordenadas con los diferentes métodos
    try {
      // ... (mantener el código existente de extracción de coordenadas) ...
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const coordinates = JSON.parse(jsonMatch[0]) as ChatbotCoordinates;
        if (typeof coordinates.x === 'number' && typeof coordinates.y === 'number') {
          return coordinates;
        }
      }

      const xMatch = content.match(/x\s*[:=]\s*(\d+)/i);
      const yMatch = content.match(/y\s*[:=]\s*(\d+)/i);
      
      if (xMatch && yMatch) {
        return {
          x: parseInt(xMatch[1], 10),
          y: parseInt(yMatch[1], 10)
        };
      }
      
      const coordsMatch = content.match(/\((\d+)[,\s]+(\d+)\)/);
      if (coordsMatch) {
        return {
          x: parseInt(coordsMatch[1], 10),
          y: parseInt(coordsMatch[2], 10)
        };
      }

      // Si no se encontraron coordenadas, usar valores predeterminados ajustados según el historial
      if (history.length > 0) {
        // Ajustar las coordenadas predeterminadas basándose en los intentos anteriores
        const lastAttempt = history[history.length - 1];
        return {
          x: lastAttempt.coordinates.x + 50, // Intentar un poco más a la derecha
          y: lastAttempt.coordinates.y - 50  // Intentar un poco más arriba
        };
      }

      return { x: 1200, y: 700 }; // Valores predeterminados para el primer intento
    } catch (parseError) {
      console.error("Error parsing coordinates:", parseError);
      return { x: 1200, y: 700 };
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    return { x: 1200, y: 700 };
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
    
    if (!initialScreenshot || initialScreenshot.length === 0) {
      throw new Error("No se pudo capturar la pantalla inicial");
    }

    // Intentar abrir el chatbot con el sistema de reintentos
    const chatbotResult = await retryOpenChatbot(page, initialScreenshot);

    if (chatbotResult.success && chatbotResult.screenshot) {
      // Evaluar el mensaje de bienvenida
      console.log("Evaluating welcome message...");
      const evaluation = await evaluateWelcomeMessage(chatbotResult.screenshot);

      await browser.close();
      return {
        url,
        evaluation,
        attempts: "success"
      };
    } else {
      // Si no se pudo abrir el chatbot, intentar evaluar la pantalla completa
      console.log("Fallback: evaluating full page...");
      const fullPageScreenshot = await page.screenshot({
        type: 'jpeg',
        quality: 50
      }) as Buffer;
      
      const evaluation = await evaluateWelcomeMessage(fullPageScreenshot);
      
      await browser.close();
      return {
        url,
        evaluation,
        attempts: "failed",
        error: chatbotResult.error
      };
    }
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error("Error processing welcome message:", error);
    throw error;
  }
} 