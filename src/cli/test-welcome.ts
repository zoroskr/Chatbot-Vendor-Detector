import { processWelcomeMessage } from "@/utils/welcomePattern";
import { vendors } from "@/utils/vendors";
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

interface TestResult {
  vendor: string;
  website: string;
  score: number | null;
  welcomeMessage: string;
  wasDetected: boolean;
  screenshot?: Buffer;
  screenshotPath?: string;
}

/**
 * Extrae el puntaje del mensaje de bienvenida
 * @param evaluation Texto de evaluación
 * @returns Puntaje extraído o null si no se encuentra
 */
function extractScore(evaluation: string): number | null {
  const scoreMatch = evaluation.match(/score:\s*(\d+)/i) || 
                    evaluation.match(/(\d+)\s*\/\s*100/) ||
                    evaluation.match(/rating:\s*(\d+)/i);
  
  if (scoreMatch) {
    const score = parseInt(scoreMatch[1]);
    return score >= 0 && score <= 100 ? score : null;
  }
  return null;
}

/**
 * Guarda la captura de pantalla en disco
 * @param screenshot Buffer de la captura
 * @param vendorName Nombre del vendor
 * @returns Ruta donde se guardó la captura
 */
function saveScreenshot(screenshot: Buffer, vendorName: string): string {
  if (!screenshot || screenshot.length === 0) {
    return '';
  }
  
  try {
    // Crear directorio de capturas si no existe
    const screenshotDir = path.join(process.cwd(), "screenshots");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Nombre de archivo con timestamp para evitar sobreescrituras
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${vendorName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}_${timestamp}.jpg`;
    const filePath = path.join(screenshotDir, filename);
    
    // Guardar la captura
    fs.writeFileSync(filePath, screenshot);
    console.log(`Screenshot saved: ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error(`Error saving screenshot for ${vendorName}:`, error);
    return '';
  }
}

/**
 * Procesa un vendor y retorna los resultados del test
 * @param vendor Información del vendor a probar
 * @returns Resultado del test
 */
async function testVendor(vendor: typeof vendors[0]): Promise<TestResult> {
  console.log(`\nTesting ${vendor.name} (${vendor.website})`);
  
  try {
    const result = await processWelcomeMessage(vendor.website);
    const score = extractScore(result.evaluation);
    
    // Si hay captura, guardarla
    let screenshotPath = '';
    if (result.screenshot) {
      screenshotPath = saveScreenshot(result.screenshot, vendor.name);
    }
    
    return {
      vendor: vendor.name,
      website: vendor.website,
      score,
      welcomeMessage: result.evaluation,
      wasDetected: result.attempts === "success",
      screenshot: result.screenshot,
      screenshotPath
    };
  } catch (error) {
    console.error(`Error testing ${vendor.name}:`, error);
    return {
      vendor: vendor.name,
      website: vendor.website,
      score: null,
      welcomeMessage: error instanceof Error ? error.message : 'Unknown error',
      wasDetected: false
    };
  }
}

/**
 * Genera un archivo Excel con los resultados
 * @param results Resultados de los tests
 */
function generateExcel(results: TestResult[]) {
  // Crear el workbook y la worksheet
  const wb = XLSX.utils.book_new();
  
  // Preparar los datos para el Excel
  const data = [
    // Headers
    ['Vendor', 'Website', 'Welcome Message Score', 'Welcome Message', 'Was Detected', 'Screenshot Path'],
    // Data rows
    ...results.map(r => [
      r.vendor,
      r.website,
      r.score !== null ? r.score : 'N/A',
      r.welcomeMessage,
      r.wasDetected ? 'Yes' : 'No',
      r.screenshotPath || 'No screenshot'
    ])
  ];

  // Crear la worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Ajustar el ancho de las columnas
  const colWidths = [
    { wch: 20 },  // Vendor
    { wch: 40 },  // Website
    { wch: 15 },  // Score
    { wch: 60 },  // Welcome Message
    { wch: 12 },  // Was Detected
    { wch: 50 }   // Screenshot Path
  ];
  ws['!cols'] = colWidths;

  // Añadir la worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Welcome Message Analysis');

  // Guardar el archivo
  const outputPath = path.join(process.cwd(), 'welcome-message-analysis.xlsx');
  XLSX.writeFile(wb, outputPath);
  
  console.log(`\nResults saved to: ${outputPath}`);
}

/**
 * Función principal que ejecuta los tests en paralelo
 */
async function runTests() {
  console.log('Starting Welcome Message Analysis Tests in Parallel');
  console.log('---------------------------------------');
  
  // Configurar el número máximo de pruebas concurrentes
  const MAX_CONCURRENT = 5; // Ajustar según capacidad del sistema
  
  // Dividir los vendors en lotes para procesar en paralelo
  const results: TestResult[] = [];
  
  // Procesar los vendors en lotes
  for (let i = 0; i < vendors.length; i += MAX_CONCURRENT) {
    const batch = vendors.slice(i, i + MAX_CONCURRENT);
    
    // Ejecutar cada lote en paralelo
    const batchPromises = batch.map(vendor => testVendor(vendor));
    const batchResults = await Promise.all(batchPromises);
    
    // Guardar resultados y mostrar información
    for (const result of batchResults) {
      results.push(result);
      console.log(`Result for ${result.vendor}:`);
      console.log(`- Score: ${result.score !== null ? result.score : 'N/A'}`);
      console.log(`- Detected: ${result.wasDetected ? 'Yes' : 'No'}`);
      if (result.screenshotPath) {
        console.log(`- Screenshot: ${result.screenshotPath}`);
      }
    }
  }
  
  // Generar el Excel con los resultados
  generateExcel(results);
  
  // Mostrar resumen
  const totalVendors = results.length;
  const detectedCount = results.filter(r => r.wasDetected).length;
  const validScores = results.filter(r => r.score !== null);
  const averageScore = validScores.length > 0 
    ? validScores.reduce((acc, curr) => acc + (curr.score || 0), 0) / validScores.length 
    : 0;
  
  console.log('\nTest Summary');
  console.log('------------');
  console.log(`Total vendors tested: ${totalVendors}`);
  console.log(`Successfully detected: ${detectedCount}`);
  console.log(`Detection rate: ${((detectedCount / totalVendors) * 100).toFixed(2)}%`);
  console.log(`Average welcome message score: ${averageScore.toFixed(2)}`);
}

// Ejecutar los tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
}); 