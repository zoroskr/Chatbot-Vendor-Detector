import { processWelcomeMessage } from "../utils/welcomePattern.js";
import { vendors } from "../utils/vendors.js";
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestResult {
  vendor: string;
  website: string;
  evaluation: string;
  wasDetected: boolean;
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
    
    return {
      vendor: vendor.name,
      website: vendor.website,
      evaluation: result.evaluation,
      wasDetected: result.attempts === "success"
    };
  } catch (error) {
    console.error(`Error testing ${vendor.name}:`, error);
    return {
      vendor: vendor.name,
      website: vendor.website,
      evaluation: error instanceof Error ? error.message : 'Unknown error',
      wasDetected: false
    };
  }
}

/**
 * Crea o actualiza el archivo Excel con los resultados
 */
function updateExcel(results: TestResult[], outputPath: string) {
  // Crear el workbook
  let wb: XLSX.WorkBook;
  
  try {
    // Intentar leer el archivo existente
    wb = XLSX.readFile(outputPath);
  } catch {
    // Si no existe, crear uno nuevo
    wb = XLSX.utils.book_new();
  }
  
  // Preparar los datos
  const data = [
    // Headers
    ['Vendor', 'Website', 'Welcome Message Evaluation', 'Was Detected'],
    // Data rows
    ...results.map(r => [
      r.vendor,
      r.website,
      r.evaluation,
      r.wasDetected ? 'Yes' : 'No'
    ])
  ];

  // Crear la worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Ajustar el ancho de las columnas
  const colWidths = [
    { wch: 20 },  // Vendor
    { wch: 40 },  // Website
    { wch: 80 },  // Evaluation
    { wch: 12 }   // Was Detected
  ];
  ws['!cols'] = colWidths;

  // Eliminar la hoja anterior si existe y añadir la nueva
  const sheetName = 'Welcome Message Analysis';
  if (wb.Sheets[sheetName]) {
    delete wb.Sheets[sheetName];
  }
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Guardar el archivo
  XLSX.writeFile(wb, outputPath);
  console.log(`Excel updated with latest results: ${outputPath}`);
}

/**
 * Función principal que ejecuta los tests
 */
async function runTests() {
  console.log('Starting Welcome Message Analysis Tests');
  console.log('---------------------------------------');
  
  const results: TestResult[] = [];
  const outputPath = path.join(process.cwd(), 'welcome-message-analysis.xlsx');
  
  // Procesar cada vendor
  for (const vendor of vendors) {
    try {
      const result = await testVendor(vendor);
      results.push(result);
      
      // Mostrar resultado en consola
      console.log(`Result for ${vendor.name}:`);
      console.log(`- Evaluation: ${result.evaluation.substring(0, 100)}...`);
      console.log(`- Detected: ${result.wasDetected ? 'Yes' : 'No'}`);
      
      // Actualizar el Excel después de cada vendor
      updateExcel(results, outputPath);
      
    } catch (error) {
      console.error(`Failed to test ${vendor.name}:`, error);
    }
    
    // Esperar 2 segundos entre cada vendor para evitar sobrecarga
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Mostrar resumen final
  const totalVendors = results.length;
  const detectedCount = results.filter(r => r.wasDetected).length;
  
  console.log('\nTest Summary');
  console.log('------------');
  console.log(`Total vendors tested: ${totalVendors}`);
  console.log(`Successfully detected: ${detectedCount}`);
  console.log(`Detection rate: ${((detectedCount / totalVendors) * 100).toFixed(2)}%`);
  console.log(`\nFinal results saved to: ${outputPath}`);
}

// Ejecutar los tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
}); 