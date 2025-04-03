import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

// Validate OpenAI API key
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY environment variable is missing. Please add it to your .env file.');
}

import puppeteer from "puppeteer-core";
import type { Page } from "puppeteer-core";
import path from "path";
import fs from "fs";
import { OpenAI } from "openai";
import {setTimeout} from "node:timers/promises";

// Initialize OpenAI client with validated API key
const openai = new OpenAI({
  apiKey: apiKey,
});


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
 * Evaluates the quality of a chatbot's welcome message and verifies if a chatbot is visible
 * @param screenshot Screenshot buffer containing the potential open chatbot
 * @returns Analysis of the welcome message and detection status
 */
export async function evaluateWelcomeMessage(
  screenshot: Buffer
): Promise<{ text: string; chatbotDetected: boolean }> {
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
            content: "You are an expert at evaluating chatbot UX and messaging. First check if a chatbot widget is visible, then analyze its welcome messages."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "First, determine if there is an open chatbot widget visible in this screenshot. This may be a mobile view. If no chatbot widget is visible, respond with ONLY 'No chatbot widget found for analysis.'\n\nIf a chatbot widget IS visible, analyze its welcome messages and provide a score from 1 to 100 based on how well they introduce the chatbot's main functionalities or offer a tutorial in the initial interactions. Keep the response concise."
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

      const evaluationText = response.choices[0]?.message?.content || "Could not evaluate the welcome message";
      const chatbotDetected = !evaluationText.includes("No chatbot widget found for analysis.");
      
      console.log(`Chatbot detected: ${chatbotDetected}`);
      if (chatbotDetected) {
        console.log("Evaluation result:", evaluationText.substring(0, 100) + "...");
      } else {
        console.log("No chatbot widget found in the image");
      }
      
      return {
        text: evaluationText,
        chatbotDetected
      };
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
 * Busca elementos de chat en la página mediante diversos selectores y patrones
 * @param page Página de Puppeteer
 * @returns Si se encontró y activó un elemento de chat
 */
async function findAndActivateChatElement(page: Page): Promise<boolean> {
  console.log("Buscando elementos de chat en la página...");
  
  try {
    // 1. Buscar iframes que contengan "chat" en sus atributos
    // @ts-ignore - Browser code in evaluate doesn't need TS checking
    const chatIframes = await page.evaluate(() => {
      try {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        return iframes
          .filter(iframe => {
            try {
              const src = iframe.src || '';
              const id = iframe.id || '';
              const className = iframe.className || '';
              const name = iframe.name || '';
              const title = iframe.title || '';
              const dataUrl = iframe.getAttribute('data-url') || '';
              
              // Patrones específicos de chat widgets conocidos
              const kommunicatePattern = (
                id.includes('kommunicate-widget-iframe') || 
                className.includes('kommunicate') || 
                className.includes('chat-popup-widget') ||
                dataUrl.includes('kommunicate.io')
              );
              
              // Patrones comunes para iframes de chat
              const commonChatPatterns = (
                src.toLowerCase().includes('chat') ||
                id.toLowerCase().includes('chat') ||
                className.toLowerCase().includes('chat') ||
                name.toLowerCase().includes('chat') ||
                title.toLowerCase().includes('chat') ||
                title.toLowerCase().includes('live chat') ||
                className.toLowerCase().includes('widget') ||
                id.toLowerCase().includes('widget') ||
                name.toLowerCase().includes('widget') ||
                src.toLowerCase().includes('messaging') ||
                src.toLowerCase().includes('zendesk') ||
                src.toLowerCase().includes('intercom') ||
                src.toLowerCase().includes('drift') ||
                src.toLowerCase().includes('hubspot') ||
                src.toLowerCase().includes('crisp') ||
                src.toLowerCase().includes('freshchat') ||
                src.toLowerCase().includes('livechat') ||
                src.toLowerCase().includes('tawk') ||
                src.toLowerCase().includes('tidio')
              );
              
              return kommunicatePattern || commonChatPatterns;
            } catch (e) {
              return false;
            }
          })
          .map((iframe, index) => {
            try {
              const rect = iframe.getBoundingClientRect();
              // También revisar si el iframe tiene un estilo inline que lo haga visible
              const style = iframe.getAttribute('style') || '';
              const isDisplayed = style.includes('display: block') || 
                                !style.includes('display: none');
              
              return {
                index,
                src: iframe.src || '',
                id: iframe.id || '',
                className: iframe.className || '',
                title: iframe.title || '',
                dataUrl: iframe.getAttribute('data-url') || '',
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2,
                width: rect.width,
                height: rect.height,
                visible: rect.width > 0 && rect.height > 0 && isDisplayed
              };
            } catch (e) {
              return null;
            }
          })
          .filter(info => info && info.visible);
      } catch (e: unknown) {
        const error = e as Error;
        console.error('Error searching for chat iframes:', error.message || 'Unknown error');
        return [];
      }
    });
    
    console.log(`Encontrados ${chatIframes.length} iframes de chat`);
    
    if (chatIframes.length > 0) {
      // Intentar hacer clic en el centro del primer iframe de chat visible
      const iframe = chatIframes[0];
      if (iframe && typeof iframe.x === 'number' && typeof iframe.y === 'number') {
        console.log(`Haciendo clic en iframe de chat: ${JSON.stringify(iframe)}`);
        await page.mouse.click(iframe.x, iframe.y);
        await setTimeout(6000); // Esperar a que se abra el chat (aumentado a 6 segundos)
        return true;
      }
    }
    
    // 2. Buscar elementos en Shadow DOM
    // @ts-ignore - Browser code in evaluate doesn't need TS checking
    const shadowDomElements = await page.evaluate(() => {
      // Función recursiva para buscar en el shadow DOM
      function searchShadowDOM(root: Element | Document, results: Array<{x: number, y: number, width: number, height: number, isShadow: boolean}> = []) {
        try {
          // Si este elemento tiene shadow root, buscar dentro de él
          if ('shadowRoot' in root && root.shadowRoot) {
            // Buscar elementos que podrían ser de chat dentro del shadow root
            const chatElements = Array.from(root.shadowRoot.querySelectorAll('*')).filter((el: unknown) => {
              if (!(el instanceof Element)) return false;
              
              try {
                const tagName = el.tagName.toLowerCase();
                const id = (el.id || '').toLowerCase();
                const className = (el.className?.toString() || '').toLowerCase();
                const dataTarget = el instanceof HTMLElement ? (el.getAttribute('data-target') || '') : '';
                const dataWidget = el instanceof HTMLElement ? (el.getAttribute('data-widget') || '') : '';
                const dataUrl = el instanceof HTMLElement ? (el.getAttribute('data-url') || '') : '';
                const dataAttr = (dataTarget + dataWidget + dataUrl).toLowerCase();
                
                // Buscar patrones específicos de Kommunicate
                const isKommunicate = (
                  id.includes('kommunicate') || 
                  className.includes('kommunicate') || 
                  className.includes('chat-popup-widget') ||
                  dataAttr.includes('kommunicate')
                );
                
                // Verificar patrones comunes de chat
                const isChatElement = (
                  id.includes('chat') || 
                  className.includes('chat') || 
                  id.includes('message') || 
                  className.includes('message') ||
                  id.includes('support') || 
                  className.includes('support') ||
                  tagName.includes('chat')
                );
                
                return isKommunicate || isChatElement;
              } catch (err) {
                return false;
              }
            });
            
            // Agregar elementos encontrados
            chatElements.forEach((el: unknown) => {
              if (!(el instanceof Element)) return;
              
              try {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  results.push({
                    x: rect.x + rect.width / 2,
                    y: rect.y + rect.height / 2,
                    width: rect.width,
                    height: rect.height,
                    isShadow: true
                  });
                }
              } catch (err) {
                // Ignorar errores al obtener rect
              }
            });
            
            // Buscar elementos con shadow root dentro de este shadow root
            Array.from(root.shadowRoot.querySelectorAll('*')).forEach((el: unknown) => {
              if (el instanceof Element) {
                searchShadowDOM(el, results);
              }
            });
          }
          
          // También buscar en los hijos del elemento actual
          if (root.children) {
            Array.from(root.children).forEach((child: Element) => {
              searchShadowDOM(child, results);
            });
          }
        } catch (err) {
          // Ignorar errores en la búsqueda recursiva
        }
        
        return results;
      }
      
      // Comenzar la búsqueda desde el documento
      try {
        return searchShadowDOM(document.documentElement);
      } catch (e: unknown) {
        const error = e as Error;
        console.error('Error searching shadow DOM:', error.message || 'Unknown error');
        return [];
      }
    });
    
    console.log(`Encontrados ${shadowDomElements.length} elementos en Shadow DOM`);
    
    if (shadowDomElements.length > 0) {
      // Ordenar elementos por posición (preferir elementos en la esquina inferior derecha)
      const sortedElements = shadowDomElements.sort((a, b) => {
        // Añadir comprobaciones de tipo
        const aX = typeof a.x === 'number' ? a.x : 0;
        const aY = typeof a.y === 'number' ? a.y : 0;
        const bX = typeof b.x === 'number' ? b.x : 0;
        const bY = typeof b.y === 'number' ? b.y : 0;
        
        const aScore = (aY * 2) + aX;
        const bScore = (bY * 2) + bX;
        return bScore - aScore;
      });
      
      // Intentar con el primer elemento
      const element = sortedElements[0];
      if (element && typeof element.x === 'number' && typeof element.y === 'number') {
        console.log(`Haciendo clic en elemento de Shadow DOM: ${JSON.stringify(element)}`);
        await page.mouse.click(element.x, element.y);
        await setTimeout(6000); // Aumentado a 6 segundos
        return true;
      }
    }
    
    // 3. Buscar botones, divs o elementos con clases/IDs que contengan "chat"
    // @ts-ignore - Browser code in evaluate doesn't need TS checking
    const chatButtons = await page.evaluate(() => {
      // Selectores comunes para botones de chat
      const selectors = [
        // Selectores específicos para Kommunicate
        '#km-chat-widget-btn',
        '.km-chat-widget-btn',
        '[data-target="kommunicate-widget"]', 
        '[data-widget="kommunicate"]',
        '#kommunicate-widget-iframe',
        '.kommunicate-custom-iframe',
        '.chat-popup-widget-actionable',
        
        // Selectores específicos para Verloop
        '.verloop-button',
        '.verloop-livechat-logo',
        '.verloop-livechat-unread-count',
        '[class*="verloop" i]',
        '[id*="verloop" i]',
        
        // Chat selectores generales
        'button[id*="chat" i]',
        'button[class*="chat" i]',
        'div[id*="chat" i]',
        'div[class*="chat" i]',
        'a[id*="chat" i]',
        'a[class*="chat" i]',
        'span[id*="chat" i]',
        'span[class*="chat" i]',
        
        // Chats por mensajería
        '[id*="messenger" i]',
        '[class*="messenger" i]',
        '[id*="whatsapp" i]',
        '[class*="whatsapp" i]',
        '[id*="support" i]',
        '[class*="support" i]',
        '[id*="message" i]',
        '[class*="message" i]',
        
        // Proveedores comunes de chatbots
        '[id*="intercom" i]',
        '[class*="intercom" i]',
        '[id*="drift" i]',
        '[class*="drift" i]',
        '[id*="zendesk" i]',
        '[class*="zendesk" i]',
        '[id*="crisp" i]',
        '[class*="crisp" i]',
        '[id*="helpscout" i]',
        '[class*="helpscout" i]',
        '[id*="hubspot" i]',
        '[class*="hubspot" i]',
        '[id*="freshchat" i]',
        '[class*="freshchat" i]',
        '[id*="livechat" i]',
        '[class*="livechat" i]',
        '[id*="tawk" i]',
        '[class*="tawk" i]',
        '[id*="olark" i]',
        '[class*="olark" i]',
        '[id*="purechat" i]',
        '[class*="purechat" i]',
        '[id*="tidio" i]',
        '[class*="tidio" i]',
        '[id*="liveagent" i]',
        '[class*="liveagent" i]',
        '[id*="chatra" i]',
        '[class*="chatra" i]',
        '[id*="userlike" i]',
        '[class*="userlike" i]',
        
        // Selectores para iconos de chat
        'svg[id*="chat" i]',
        'svg[class*="chat" i]',
        'img[alt*="chat" i]',
        'img[src*="chat" i]',
        'svg[class*="icon" i]',
        '.fab',
        'div[class*="icon" i]',
        'button[aria-label*="chat" i]',
        'a[aria-label*="chat" i]',
        'button[aria-label*="support" i]',
        'button[aria-label*="message" i]'
      ];
      
      // Obtener todos los elementos que coinciden con los selectores
      const elements = selectors.flatMap(selector => {
        try {
          return Array.from(document.querySelectorAll(selector));
        } catch (e) {
          return [];
        }
      });
      
      // Filtrar elementos duplicados y obtener sus coordenadas
      const uniqueElements = Array.from(new Set(elements));
      return uniqueElements
        .map((element, index) => {
          try {
            const rect = element.getBoundingClientRect();
        return {
              index,
              tag: element.tagName,
              id: element.id || '',
              className: element.className || '',
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              width: rect.width,
              height: rect.height,
              visible: rect.width > 0 && rect.height > 0 && 
                      window.getComputedStyle(element).display !== 'none' &&
                      window.getComputedStyle(element).visibility !== 'hidden'
            };
          } catch (e) {
            return null;
          }
        })
        .filter(info => info && info.visible);
    });
    
    console.log(`Encontrados ${chatButtons.length} elementos de chat`);
    
    if (chatButtons.length > 0) {
      // Ordenar botones por posición (priorizar los que están en la parte inferior derecha)
      const sortedButtons = chatButtons.filter(button => button !== null).sort((a, b) => {
        if (!a || !b) return 0;
        // Dar prioridad a los elementos en la esquina inferior derecha
        const aScore = (a.y * 2) + a.x;  // Damos más peso a la posición vertical
        const bScore = (b.y * 2) + b.x;
        return bScore - aScore;
      });
      
      // Intentar hacer clic en el elemento más probable
      const button = sortedButtons[0];
      if (button && typeof button.x === 'number' && typeof button.y === 'number') {
        console.log(`Haciendo clic en elemento de chat: ${JSON.stringify(button)}`);
        await page.mouse.click(button.x, button.y);
        await setTimeout(6000); // Esperar a que se abra el chat (aumentado a 6 segundos)
        return true;
      }
    }
    
    // 4. Como último recurso, buscar elementos fijos en posiciones típicas de chatbots
    // @ts-ignore - Browser code in evaluate doesn't need TS checking
    const fixedElements = await page.evaluate(() => {
      // Buscar elementos fijos o absolutos en la esquina inferior
      try {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements
          .filter(element => {
            try {
              const style = window.getComputedStyle(element);
              const id = (element.id || '').toLowerCase();
              const className = (element.className || '').toString().toLowerCase();
              
              // Verificar si es un elemento de Kommunicate
              const isKommunicate = (
                id.includes('kommunicate') || 
                className.includes('kommunicate') || 
                className.includes('chat-popup-widget')
              );
              
              // Verificar si es un elemento de Verloop
              const isVerloop = (
                id.includes('verloop') || 
                className.includes('verloop') || 
                style.backgroundColor?.includes('rgb(65, 77, 225)')
              );
              
              // Verificar si es un elemento fijo típico de chatbot
              const isFixedChatElement = (
                (style.position === 'fixed' || style.position === 'absolute') &&
                style.bottom !== 'auto' && 
                parseInt(style.bottom, 10) < 100 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden'
              );
              
              return isKommunicate || isVerloop || (
                isFixedChatElement && (
                  // Para elementos normales, verificar que sean pequeños y en esquina
                  id.includes('chat') || 
                  className.includes('chat') || 
                  id.includes('widget') || 
                  className.includes('widget')
                )
              );
            } catch (e) {
              return false;
            }
          })
          .map((element, index) => {
            try {
              const rect = element.getBoundingClientRect();
              return {
                index,
                tag: element.tagName,
                id: element.id || '',
                className: element.className || '',
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2,
                width: rect.width,
                height: rect.height,
                right: window.innerWidth - (rect.x + rect.width),
                visible: rect.width > 0 && rect.height > 0
              };
            } catch (e) {
              return null;
            }
          })
          .filter(info => 
            info && 
            info.visible && 
            (
              // Ser menos restrictivos con los tamaños para Kommunicate
              (info.id && info.id.includes('kommunicate')) ||
              (info.className && info.className.includes('kommunicate')) ||
              // Para otros elementos, mantener restricciones de tamaño normales
              (info.width < 150 && info.height < 150 && info.right < 150)
            )
          );
      } catch (e: unknown) {
        const error = e as Error;
        console.error('Error in fixed elements search:', error.message || 'Unknown error');
        return [];
      }
    });
    
    console.log(`Encontrados ${fixedElements.length} elementos fijos potenciales`);
    
    if (fixedElements.length > 0) {
      // Ordenar por proximidad a la esquina inferior derecha
      const sortedElements = fixedElements.filter(el => el !== null).sort((a, b) => {
        if (!a || !b) return 0;
        const aScore = a.right + parseInt(a.y.toString(), 10);
        const bScore = b.right + parseInt(b.y.toString(), 10);
        return aScore - bScore;
      });
      
      // Hacer clic en el elemento más probable
      const element = sortedElements[0];
      if (element && typeof element.x === 'number' && typeof element.y === 'number') {
        console.log(`Haciendo clic en elemento fijo: ${JSON.stringify(element)}`);
        await page.mouse.click(element.x, element.y);
        await setTimeout(6000); // Esperar a que se abra el chat (aumentado a 6 segundos)
        return true;
      }
    }
    
    console.log("No se encontraron elementos de chat en la página");
    return false;
  } catch (error) {
    console.error("Error al buscar elementos de chat:", error);
    return false;
  }
}

/**
 * Intenta detectar y abrir el chatbot mediante identificación inteligente de elementos
 */
async function detectAndOpenChatbot(
  page: Page
): Promise<{ success: boolean; screenshot?: Buffer; error?: string }> {
  try {
    console.log("Intentando detectar y abrir chatbot...");
    
    // Intentar encontrar y activar un elemento de chat
    const foundChat = await findAndActivateChatElement(page);
    
    if (foundChat) {
      // Tomar screenshot para verificar
      const chatbotScreenshot = await capturePage("", page, "chatbot_screenshot_detected.png");
      
      // Verificar si el chatbot se abrió correctamente usando la misma función de evaluación
      const evaluationResult = await evaluateWelcomeMessage(chatbotScreenshot);
      
      if (evaluationResult.chatbotDetected) {
        console.log("Éxito: Chatbot detectado y abierto correctamente");
        return {
          success: true,
          screenshot: chatbotScreenshot
        };
      } else {
        console.warn("Se detectó un elemento de chat pero no se abrió correctamente: No se detectó un chatbot abierto en la imagen");
      }
    }
    
    // Si llegamos aquí, no pudimos abrir el chatbot
    return {
      success: false,
      error: "No se pudo encontrar o abrir el chatbot en la página"
    };
  } catch (error) {
    console.error("Error al detectar el chatbot:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

/**
 * Main function to process a URL, detect the chatbot, and evaluate its welcome message
 * @param url URL of the page to analyze
 * @returns Object containing the evaluation, detection status, and screenshot
 */
export async function processWelcomeMessage(url: string) {
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36";

  let browser;
  try {
    // Intentar diferentes rutas para el navegador
    const possiblePaths = [
      "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.BROWSER_PATH // Usar la ruta personalizada si está definida
    ].filter(Boolean); // Eliminar valores nulos/undefined

    let executablePath;
    for (const path of possiblePaths) {
      if (path && fs.existsSync(path)) {
        executablePath = path;
        break;
      }
    }

    if (!executablePath) {
      throw new Error("No se encontró ningún navegador compatible instalado. Por favor, instala Brave o Chrome, o especifica la ruta en BROWSER_PATH.");
    }

    console.log(`Usando navegador en: ${executablePath}`);

    // Configuración del navegador
    const browserConfig = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=768,1024',
        '--enable-features=NetworkService',
        '--allow-running-insecure-content',
        '--enable-automation'
      ],
      defaultViewport: { width: 768, height: 1024 },
      executablePath,
      headless: true // Usar modo headless
    };

    browser = await puppeteer.launch(browserConfig);
    console.log("Navegador iniciado correctamente");

    const page = await browser.newPage();
    await page.setUserAgent(ua);
    
    // Configurar la emulación de dispositivo móvil
    await page.emulate({
      viewport: { 
        width: 768,
        height: 1024,
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
      },
      userAgent: ua
    });

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

    // Intentar detectar y abrir el chatbot mediante identificación inteligente de elementos
    const chatbotResult = await detectAndOpenChatbot(page);

    if (chatbotResult.success && chatbotResult.screenshot) {
      // Evaluar el mensaje de bienvenida
      console.log("Evaluating welcome message...");
      const evaluationResult = await evaluateWelcomeMessage(chatbotResult.screenshot);

      await browser.close();
      return {
        url,
        evaluation: evaluationResult.text,
        attempts: evaluationResult.chatbotDetected ? "success" : "failed",
        chatbotDetected: evaluationResult.chatbotDetected,
        screenshot: chatbotResult.screenshot
      };
    } else {
      // Si no se pudo abrir el chatbot, intentar evaluar la pantalla completa
      console.log("Fallback: evaluating full page...");
      const fullPageScreenshot = await page.screenshot({
        type: 'jpeg',
        quality: 50
      }) as Buffer;
      
      const evaluationResult = await evaluateWelcomeMessage(fullPageScreenshot);
      
      await browser.close();
      return {
        url,
        evaluation: evaluationResult.text,
        attempts: "failed",
        error: chatbotResult.error,
        chatbotDetected: evaluationResult.chatbotDetected,
        screenshot: fullPageScreenshot
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