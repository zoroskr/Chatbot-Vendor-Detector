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

  return {
    text: "No chatbot widget found for analysis.",
    chatbotDetected: false,
  };

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
        
        throw new Error(`Error en la API de OpenAI: ${(error as Error).message}`);
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
        // Intercom específico
        '.intercom-lightweight-app-launcher',
        '.intercom-launcher',
        '[class*="intercom-lightweight-app-launcher" i]',
        '.intercom-lightweight-app-launcher-icon',
        
        // Tidio específico
        '#tidio-chat-iframe',
        '[title="Tidio Chat"]',
        
        // LiveChat específico
        '#chat-widget-container',
        '#chat-widget-minimized',
        '[id*="chat-widget" i]',
        
        // HubSpot específico
        '#hubspot-conversations-iframe',
        '[title="Chat Widget"]',
        '[data-test-id="chat-widget-iframe"]',
        
        // Chatbot.com específico
        '#chat-widget-container',
        '#chat-widget-minimized',
        'iframe[src*="openwidget.com" i]',
        
        // Trengo específico
        '.trengo-vue-iframe',
        '[title="trengo-widget-launcher"]',
        
        // Verloop específico
        '.verloop-button',
        '.verloop-livechat-logo',
        '.verloop-livechat-unread-count',
        '[class*="verloop" i]',
        '[id*="verloop" i]',
        
        // Kommunicate específico
        '[id="kommunicate-widget-iframe"]',
        '.kommunicate-custom-iframe',
        
        // H&M específico
        '#CXButtonContainer',
        '#CXButton',
        '[aria-label="Open Digital Assistant"]',
        '[title="Open Digital Assistant"]',
        
        // UPS específico
        '#inqChatStage',
        '[title="Chat Window"]',
        
        // ADIB específico
        '.message-sticky',
        '#btnchatclick',
        
        // BellaSante específico (también usa Tidio)
        '[title="Tidio Chat"][class*="awesome-iframe"]',
        
        // Devialet específico
        '#launcher[title="Botón para iniciar la ventana de mensajería"]',
        
        // Expedia específico
        '#vac_iframe',
        '.vac_iframe',
        '[title="Chat Window"]',
        
        // Eye-OO específico
        '#tidio-chat-iframe[class*="awesome-iframe"]',
        
        // IHERB específico
        '#ada-button-frame',
        '[title="Iherb Chat Button Frame"]',
        
        // PluralSight específico
        '#launcher[title="Button to launch messaging window"]',
        
        // Procosmet específico (similar a Tidio)
        '[title="Tidio Chat"][srcdoc*="awesome-iframe"]',
        
        // Zillow específico
        '.genesys-mxg-frame',
        '.genesys-mxg-launcher-frame',
        '#genesys-mxg-frame',
        '[title="Messenger Launcher"]',
        
        // Vodafone específico
        '.tobi-header-cta',
        '#fixedBtn2',
        '[id*="fixedBtn" i]',
        
        // Samsung específico
        '[name="spr-chat__trigger-frame"]',
        '[title="Live chat"]',
        '[aria-label="Live chat"]',
        
        // Jio específico
        '.chatbotEntry',
        '.circle-rippl',
        '.chatbotImg',
        '.open_chatbox',
        '[alt="Chat Bot Avatar"]',
        
        // Sensely específico
        '#__sensely-include-widget-dropdown-image',
        'img[src*="sense.ly" i]',
        
        // Standard Chartered específico
        '.chatbot-icon-wrapper',
        '.chatbot-avatar',
        '#chatbot-icon',
        '.icon-sc-chatbot-avatar-round',
        
        // Ikea específico
        '#syndeo-chatbot-start-chat-button',
        '[role="button"][aria-label="Start Chat"]',
        
        // AT&T específico
        '[data-testid="chatButton"]',
        '#chatActiveBtn',
        '.chatfrontend-ui__chat-btn-container',
        
        // Selectores específicos para Kommunicate
        '#km-chat-widget-btn',
        '.km-chat-widget-btn',
        '[data-target="kommunicate-widget"]', 
        '[data-widget="kommunicate"]',
        '#kommunicate-widget-iframe',
        '.kommunicate-custom-iframe',
        '.chat-popup-widget-actionable',
        
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
    
    // 5. Intentar detectar por objetos de ventana específicos de proveedores
    // Basado en los objetos de ventana definidos en vendors.ts
    const vendorDetected = await page.evaluate(() => {
      // Lista de objetos de ventana a detectar (copiada de vendors.ts)
      const vendorWindowObjects = [
        "drift", "Intercom", "tidioChatApi", "LC_API", "_hsq", "__chatbot", 
        "Trengo", "Verloop", "kommunicate", "HM", "UPS", "Vainu", "ADIB", 
        "BellaSante", "Devialet", "Expedia", "EyeOO", "IHerb", "PluralSight", 
        "Procosmet", "Zillow", "Vodafone", "Samsung", "Jio", "Sensely", "SC", 
        "IKEA", "ATT"
      ];
      
      // Buscar objetos de ventana disponibles
      const detectedVendors = vendorWindowObjects.filter(objName => {
        try {
          const windowObj = window as any;
          return windowObj[objName] !== undefined;
        } catch (e) {
          return false;
        }
      });
      
      console.log("Detected vendors by window objects:", detectedVendors);
      
      if (detectedVendors.length > 0) {
        // Si encontramos objetos de chatbot, buscar elementos visibles
        // para los proveedores detectados
        const vendorSelectors: string[] = [];
        
        // Agregar selectores específicos según los proveedores detectados
        detectedVendors.forEach(vendor => {
          switch(vendor) {
            case "Intercom":
              vendorSelectors.push('.intercom-launcher', '.intercom-lightweight-app-launcher');
              break;
            case "tidioChatApi":
              vendorSelectors.push('#tidio-chat-iframe', '[title="Tidio Chat"]');
              break;
            case "LC_API":
              vendorSelectors.push('#chat-widget-container', '#chat-widget-minimized');
              break;
            case "_hsq": // HubSpot
              vendorSelectors.push('#hubspot-conversations-iframe', '[data-test-id="chat-widget-iframe"]');
              break;
            case "Verloop":
              vendorSelectors.push('.verloop-button', '.verloop-livechat-logo');
              break;
            case "kommunicate":
              vendorSelectors.push('#kommunicate-widget-iframe', '.kommunicate-custom-iframe');
              break;
            default:
              // Para otros proveedores, agregar selectores genéricos
              vendorSelectors.push(
                `[id*="${vendor.toLowerCase()}" i]`,
                `[class*="${vendor.toLowerCase()}" i]`,
                'button[id*="chat" i]',
                'div[id*="chat" i]'
              );
          }
        });
        
        // Buscar y devolver elementos visibles que correspondan a los selectores
        const vendorElements = vendorSelectors.flatMap(selector => {
          try {
            return Array.from(document.querySelectorAll(selector));
          } catch (e) {
            return [];
          }
        });
        
        // Filtrar elementos duplicados y obtener coordenadas
        const uniqueElements = Array.from(new Set(vendorElements));
        const clickableElements = uniqueElements
          .map(element => {
            try {
              const rect = element.getBoundingClientRect();
              return {
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
        
        if (clickableElements.length > 0) {
          // Devolver el primer elemento clickeable
          return clickableElements[0];
        }
      }
      
      return null;
    });
    
    if (vendorDetected && typeof vendorDetected.x === 'number' && typeof vendorDetected.y === 'number') {
      console.log(`Haciendo clic en elemento detectado por objeto de ventana: ${JSON.stringify(vendorDetected)}`);
      await page.mouse.click(vendorDetected.x, vendorDetected.y);
      await setTimeout(6000); // Esperar a que se abra el chat
      return true;
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
    
    // Intentar métodos adicionales para interactuar con iframes
    console.log("Intentando interactuar con chatbots en iframes...");
    const iframeInteractionResult = await interactWithChatbotIframes(page);
    
    if (iframeInteractionResult) {
      // Tomar screenshot para verificar
      await setTimeout(3000); // Esperar un poco para que se abra el chat
      const chatbotScreenshot = await capturePage("", page, "chatbot_iframe_detected.png");
      
      // Verificar si el chatbot se abrió correctamente usando la misma función de evaluación
      const evaluationResult = await evaluateWelcomeMessage(chatbotScreenshot);
      
      if (evaluationResult.chatbotDetected) {
        console.log("Éxito: Chatbot en iframe detectado y abierto correctamente");
        return {
          success: true,
          screenshot: chatbotScreenshot
        };
      }
    }
    
    // Último intento: patrones específicos de DOM para cada vendedor
    console.log("Intentando patrones específicos de DOM para cada vendedor...");
    const vendorPatternResult = await clickVendorSpecificPatterns(page);
    
    if (vendorPatternResult) {
      // Tomar screenshot para verificar
      await setTimeout(3000); // Esperar un poco para que se abra el chat
      const chatbotScreenshot = await capturePage("", page, "chatbot_vendor_pattern_detected.png");
      
      // Verificar si el chatbot se abrió correctamente usando la misma función de evaluación
      const evaluationResult = await evaluateWelcomeMessage(chatbotScreenshot);
      
      if (evaluationResult.chatbotDetected) {
        console.log("Éxito: Chatbot detectado usando patrones específicos de vendedor");
        return {
          success: true,
          screenshot: chatbotScreenshot
        };
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
 * Intenta interactuar con chatbots que están dentro de iframes
 * @param page Página de Puppeteer
 * @returns Si se logró interactuar exitosamente
 */
async function interactWithChatbotIframes(page: Page): Promise<boolean> {
  try {
    // 1. Detectar todos los iframes en la página
    const frameHandles = await page.$$('iframe');
    
    console.log(`Encontrados ${frameHandles.length} iframes en la página`);
    
    // Iterar por cada iframe
    for (const frameHandle of frameHandles) {
      try {
        // Obtener información básica del iframe
        const frameInfo = await page.evaluate(frame => {
          if (!frame) return null;
          
          try {
            const src = frame.src || '';
            const id = frame.id || '';
            const title = frame.title || '';
            const className = frame.className || '';
            
            const rect = frame.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;
            
            return {
              src,
              id,
              title,
              className,
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              width: rect.width,
              height: rect.height,
              isVisible,
              isChatRelated: 
                src.toLowerCase().includes('chat') || 
                id.toLowerCase().includes('chat') || 
                title.toLowerCase().includes('chat') ||
                className.toLowerCase().includes('chat') ||
                src.toLowerCase().includes('messaging') ||
                id.toLowerCase().includes('widget') ||
                className.toLowerCase().includes('widget') ||
                // Patrones específicos de proveedores conocidos
                src.includes('livechatinc.com') ||
                src.includes('tidio.com') ||
                src.includes('intercom.io') ||
                src.includes('hubspot.com') ||
                src.includes('drift.com') ||
                src.includes('openwidget.com')
            };
          } catch (e) {
            return null;
          }
        }, frameHandle);
        
        // Si el iframe no se ve como un chat o no es visible, pasar al siguiente
        if (!frameInfo || !frameInfo.isVisible) continue;
        
        console.log(`Analizando iframe: ${JSON.stringify(frameInfo)}`);
        
        // Si el iframe parece ser de chat, intentar interactuar con él
        if (frameInfo.isChatRelated) {
          console.log(`Intentando interactuar con iframe relacionado con chat: ${frameInfo.id || frameInfo.src}`);
          
          // Intentar obtener el contenido del iframe
          const frame = await frameHandle.contentFrame();
          
          if (frame) {
            // Método 1: Buscar elementos de chat dentro del iframe
            const chatButtonFound = await frame.evaluate(() => {
              // Lista de selectores de botones comunes
              const selectors = [
                'button[id*="chat" i]',
                'button[class*="chat" i]',
                'div[id*="chat" i]',
                'div[class*="chat" i]',
                'a[id*="chat" i]',
                'span[id*="chat" i]',
                '[id*="launcher" i]',
                '[class*="launcher" i]',
                '[class*="icon" i][id*="open" i]',
                '[class*="open" i]',
                '[class*="button" i]',
                '.conversation-launcher',
                '.chat-button',
                '.message-button',
                // Buscar por atributos aria
                '[role="button"]',
                '[aria-label*="chat" i]',
                '[aria-label*="message" i]',
                '[title*="chat" i]',
                // Botones con íconos
                'svg',
                'img[alt*="chat" i]',
                // Cualquier botón
                'button',
                // Divs que parecen botones
                'div[role="button"]',
                // Elementos con eventos de clic
                '[onclick]'
              ];
              
              // Buscar y hacer clic en el primer botón visible
              for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of Array.from(elements)) {
                  // Verificar si es visible
                  const rect = el.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    // Intentar hacer clic en el elemento
                    try {
                      (el as HTMLElement).click();
                      console.log(`Clic exitoso en elemento ${selector} dentro del iframe`);
                      return true;
                    } catch (e) {
                      console.log(`Error al hacer clic en ${selector}:`, e);
                    }
                  }
                }
              }
              
              return false;
            });
            
            if (chatButtonFound) {
              console.log("Se ha hecho clic en un elemento de chat dentro del iframe");
              await setTimeout(5000); // Dar tiempo al chat para abrirse
              return true;
            }
          }
          
          // Método 2: Si no podemos acceder al contenido del iframe, hacer clic en el iframe mismo
          if (frameInfo.x && frameInfo.y) {
            console.log(`Haciendo clic en el iframe en (${frameInfo.x}, ${frameInfo.y})`);
            await page.mouse.click(frameInfo.x, frameInfo.y);
            await setTimeout(3000);
            
            // Intentar hacer un segundo clic en la misma posición para activar el chatbot
            await page.mouse.click(frameInfo.x, frameInfo.y);
            await setTimeout(5000);
            
            // Si el iframe era un botón de chat, debería haberse abierto ahora
            return true;
          }
        }
      } catch (frameError) {
        console.warn("Error al analizar iframe:", frameError);
        // Continuar con el siguiente iframe
      }
    }
    
    // No se pudo interactuar con ningún iframe
    return false;
  } catch (error) {
    console.error("Error al interactuar con iframes:", error);
    return false;
  }
}

/**
 * Intenta detectar y hacer clic en patrones específicos de DOM para diferentes vendedores de chatbot
 * basado en la información de comun_selectors.md
 * @param page Página de Puppeteer
 * @returns Si se logró hacer clic en un patrón específico de vendedor
 */
async function clickVendorSpecificPatterns(page: Page): Promise<boolean> {
  try {
    // Definir patrones específicos para cada vendedor
    const vendorPatterns = [
      // Intercom
      { 
        name: 'Intercom', 
        selectors: [
          '.intercom-lightweight-app-launcher', 
          '.intercom-launcher', 
          '[aria-label="Open Intercom Messenger"]'
        ] 
      },
      // Tidio
      { 
        name: 'Tidio', 
        selectors: [
          '#tidio-chat-iframe',
          'iframe[title="Tidio Chat"]'
        ],
        frameSelectors: ['div:first-child']
      },
      // LiveChat
      { 
        name: 'LiveChat', 
        selectors: [
          '#chat-widget-container',
          '#chat-widget-minimized'
        ] 
      },
      // HubSpot
      { 
        name: 'HubSpot', 
        selectors: [
          '#hubspot-conversations-iframe',
          'iframe[title="Chat Widget"]',
          'iframe[data-test-id="chat-widget-iframe"]'
        ] 
      },
      // Chatbot.com
      { 
        name: 'Chatbot', 
        selectors: [
          '#chat-widget-container',
          '#chat-widget-minimized',
          'iframe[src*="openwidget.com"]'
        ] 
      },
      // Trengo
      { 
        name: 'Trengo', 
        selectors: [
          '.trengo-vue-iframe',
          'iframe[title="trengo-widget-launcher"]'
        ] 
      },
      // Verloop
      { 
        name: 'Verloop', 
        selectors: [
          '.verloop-button',
          '.verloop-livechat-logo',
          '.verloop-livechat-unread-count'
        ] 
      },
      // Kommunicate
      { 
        name: 'Kommunicate', 
        selectors: [
          'iframe#kommunicate-widget-iframe',
          '.kommunicate-custom-iframe'
        ] 
      },
      // H&M
      { 
        name: 'H&M', 
        selectors: [
          '#CXButtonContainer',
          '#CXButton',
          'button[aria-label="Open Digital Assistant"]',
          'button[title="Open Digital Assistant"]'
        ] 
      },
      // UPS
      { 
        name: 'UPS', 
        selectors: [
          '#inqChatStage',
          'iframe[title="Chat Window"]'
        ] 
      },
      // ADIB
      { 
        name: 'ADIB', 
        selectors: [
          '.message-sticky',
          '#btnchatclick',
          'a[id="btnchatclick"]'
        ] 
      },
      // BellaSante
      { 
        name: 'BellaSante', 
        selectors: [
          'iframe[title="Tidio Chat"][srcdoc*="awesome-iframe"]'
        ] 
      },
      // Devialet
      { 
        name: 'Devialet', 
        selectors: [
          '#launcher[title="Botón para iniciar la ventana de mensajería"]',
          'iframe[title*="Botón para iniciar"]'
        ] 
      },
      // Expedia
      { 
        name: 'Expedia', 
        selectors: [
          '#vac_iframe',
          '.vac_iframe',
          'iframe[title="Chat Window"]'
        ] 
      },
      // Eye-OO
      { 
        name: 'Eye-OO', 
        selectors: [
          '#tidio-chat-iframe[srcdoc*="awesome-iframe"]'
        ] 
      },
      // IHERB
      { 
        name: 'IHERB', 
        selectors: [
          '#ada-button-frame',
          'iframe[title="Iherb Chat Button Frame"]',
          'iframe[sandbox*="allow-same-origin"][id="ada-button-frame"]'
        ] 
      },
      // PluralSight
      { 
        name: 'PluralSight', 
        selectors: [
          '#launcher[title="Button to launch messaging window"]',
          'iframe[title*="Button to launch messaging"]'
        ] 
      },
      // Procosmet
      { 
        name: 'Procosmet', 
        selectors: [
          'iframe[title="Tidio Chat"][srcdoc*="awesome-iframe"]'
        ] 
      },
      // Zillow
      { 
        name: 'Zillow', 
        selectors: [
          '.genesys-mxg-frame',
          '.genesys-mxg-launcher-frame',
          '#genesys-mxg-frame',
          'iframe[title="Messenger Launcher"]'
        ] 
      },
      // Vodafone
      { 
        name: 'Vodafone', 
        selectors: [
          '.tobi-header-cta',
          '#fixedBtn2',
          'div[style*="background-color: rgb(0, 0, 0)"]'
        ] 
      },
      // Samsung
      { 
        name: 'Samsung', 
        selectors: [
          'iframe[aria-label="Live chat"]',
          'iframe[name="spr-chat__trigger-frame"]',
          'iframe[title="Live chat"]'
        ] 
      },
      // Jio
      { 
        name: 'Jio', 
        selectors: [
          '.chatbotEntry',
          '.chatbotImg',
          '.open_chatbox',
          'img[alt="Chat Bot Avatar"]',
          '.circle-rippl'
        ] 
      },
      // Sensely
      { 
        name: 'Sensely', 
        selectors: [
          '#__sensely-include-widget-dropdown-image',
          'img[src*="sense.ly"]'
        ] 
      },
      // Standard Chartered
      { 
        name: 'Standard Chartered', 
        selectors: [
          '.chatbot-icon-wrapper',
          '.chatbot-avatar',
          '#chatbot-icon',
          '.icon-sc-chatbot-avatar-round'
        ] 
      },
      // IKEA
      { 
        name: 'IKEA', 
        selectors: [
          '#syndeo-chatbot-start-chat-button',
          '[role="button"][aria-label="Start Chat"]'
        ] 
      },
      // AT&T
      { 
        name: 'AT&T', 
        selectors: [
          '[data-testid="chatButton"]',
          '#chatActiveBtn',
          '.chatfrontend-ui__chat-btn-container'
        ] 
      }
    ];
    
    // Intentar detectar y hacer clic en un patrón específico de cada vendedor
    for (const pattern of vendorPatterns) {
      console.log(`Buscando patrones específicos para ${pattern.name}...`);
      
      // Buscar elementos que coincidan con los selectores
      // @ts-ignore - Browser code in evaluate doesn't need TS checking
      const matchResult = await page.evaluate((selectors) => {
        for (const selector of selectors) {
          try {
            const elements = document.querySelectorAll(selector);
            
            for (const element of Array.from(elements)) {
              const rect = element.getBoundingClientRect();
              
              // Verificar si el elemento es visible
              if (rect.width > 0 && rect.height > 0 && 
                  window.getComputedStyle(element).display !== 'none' &&
                  window.getComputedStyle(element).visibility !== 'hidden') {
                
                return {
                  selector,
                  x: rect.x + rect.width / 2,
                  y: rect.y + rect.height / 2,
                  width: rect.width,
                  height: rect.height
                };
              }
            }
          } catch (e) {
            continue;
          }
        }
        
        return null;
      }, pattern.selectors);
      
      // Si encontramos un elemento, hacer clic en él
      if (matchResult) {
        console.log(`Encontrado elemento de ${pattern.name} con selector ${matchResult.selector}`);
        console.log(`Haciendo clic en (${matchResult.x}, ${matchResult.y})`);
        
        await page.mouse.click(matchResult.x, matchResult.y);
        await setTimeout(3000);
        
        // Si hay selectores específicos de iframe, intentar interactuar con ellos
        if (pattern.frameSelectors && pattern.frameSelectors.length > 0) {
          const frameHandles = await page.$$('iframe');
          
          for (const frameHandle of frameHandles) {
            const frame = await frameHandle.contentFrame();
            
            if (frame) {
              // @ts-ignore - Browser code in evaluate doesn't need TS checking
              const frameClickResult = await frame.evaluate((selectors) => {
                for (const selector of selectors) {
                  try {
                    const elements = document.querySelectorAll(selector);
                    for (const element of Array.from(elements)) {
                      const rect = element.getBoundingClientRect();
                      if (rect.width > 0 && rect.height > 0) {
                        try {
                          (element as HTMLElement).click();
                          return true;
                        } catch (e) {
                          continue;
                        }
                      }
                    }
                  } catch (e) {
                    continue;
                  }
                }
                return false;
              }, pattern.frameSelectors);
              
              if (frameClickResult) {
                console.log(`Clic adicional en elemento dentro del iframe para ${pattern.name}`);
                await setTimeout(3000);
              }
            }
          }
        }
        
        // Esperar a que se abra el chat
        await setTimeout(3000);
        return true;
      }
    }
    
    console.log("No se encontraron patrones específicos de vendedor");
    return false;
  } catch (error) {
    console.error("Error al intentar patrones específicos de vendedor:", error);
    return false;
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
        '--window-size=1024,1024',
        '--enable-features=NetworkService',
        '--allow-running-insecure-content',
        '--enable-automation'
      ],
      defaultViewport: { width: 1024, height: 1024 },
      executablePath,
      headless: false // Usar modo headless
    };

    browser = await puppeteer.launch(browserConfig);
    console.log("Navegador iniciado correctamente");

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