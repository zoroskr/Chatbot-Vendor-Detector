import { processWelcomeMessage } from "@/utils/welcomePattern";
import { vendors } from "@/utils/vendors";
import * as XLSX from 'xlsx';
import path from 'path';

interface TestResult {
  vendor: string;
  website: string;
  score: number | null;
  welcomeMessage: string;
  wasDetected: boolean;
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
 * Procesa un vendor y retorna los resultados del test
 * @param vendor Información del vendor a probar
 * @returns Resultado del test
 */
async function testVendor(vendor: typeof vendors[0]): Promise<TestResult> {
  console.log(`\nTesting ${vendor.name} (${vendor.website})`);
  
  try {
    const result = await processWelcomeMessage(vendor.website);
    const score = extractScore(result.evaluation);
    
    return {
      vendor: vendor.name,
      website: vendor.website,
      score,
      welcomeMessage: result.evaluation,
      wasDetected: result.attempts === "success"
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
    ['Vendor', 'Website', 'Welcome Message Score', 'Welcome Message', 'Was Detected'],
    // Data rows
    ...results.map(r => [
      r.vendor,
      r.website,
      r.score !== null ? r.score : 'N/A',
      r.welcomeMessage,
      r.wasDetected ? 'Yes' : 'No'
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
    { wch: 12 }   // Was Detected
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
 * Función principal que ejecuta los tests
 */
async function runTests() {
  console.log('Starting Welcome Message Analysis Tests');
  console.log('---------------------------------------');
  
  const results: TestResult[] = [];
  
  // Procesar cada vendor
  for (const vendor of vendors) {
    try {
      const result = await testVendor(vendor);
      results.push(result);
      
      // Mostrar resultado en consola
      console.log(`Result for ${vendor.name}:`);
      console.log(`- Score: ${result.score !== null ? result.score : 'N/A'}`);
      console.log(`- Detected: ${result.wasDetected ? 'Yes' : 'No'}`);
    } catch (error) {
      console.error(`Failed to test ${vendor.name}:`, error);
    }
    
    // Esperar 2 segundos entre cada vendor para evitar sobrecarga
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Generar el Excel con los resultados
  generateExcel(results);
  
  // Mostrar resumen
  const totalVendors = results.length;
  const detectedCount = results.filter(r => r.wasDetected).length;
  const averageScore = results
    .filter(r => r.score !== null)
    .reduce((acc, curr) => acc + (curr.score || 0), 0) / totalVendors;
  
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