import os from 'os';
import chalk from 'chalk';
import readline from 'readline';
import { randomBytes } from 'crypto';
import { readFile, writeFile, access, appendFile } from 'fs/promises';

const CSV_PATH = './claves-generadas.csv';

console.log(chalk.blue.bold('💻 Información del sistema:\n'));

console.log(chalk.green('Sistema operativo:'), os.type());
console.log(chalk.green('Versión:'), os.release());
console.log(chalk.green('Arquitectura:'), os.arch());
console.log(chalk.green('CPU:'), os.cpus()[0].model);
console.log(chalk.green('Núcleos:'), os.cpus().length);
console.log(chalk.green('Memoria total:'), (os.totalmem() / 1024 ** 3).toFixed(2), 'GB');
console.log(chalk.green('Memoria libre:'), (os.freemem() / 1024 ** 3).toFixed(2), 'GB');
console.log(chalk.green('Tiempo encendido:'), formatUptime(os.uptime()));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function mainMenu() {
  console.log(chalk.yellow('\nOpciones:'));
  console.log('  1) Generar clave aleatoria');
  console.log('  2) Ver claves ya generadas');
  console.log('  3) Salir');

  const option = (await prompt(chalk.yellow('\nElige una opción (1/2/3): '))).trim();

  switch(option) {
    case '1':
      await generateKeyFlow();
      break;
    case '2':
      await showSavedKeys();
      break;
    case '3':
      console.log(chalk.red('\nPrograma finalizado.'));
      rl.close();
      return;
    default:
      console.log(chalk.red('Opción inválida. Intenta otra vez.'));
      await mainMenu();
  }
}

async function generateKeyFlow() {
  const byteInput = await prompt(chalk.yellow('📏 ¿Cuántos bytes debe tener la clave? (Ej: 32): '));
  const byteLength = parseInt(byteInput.trim());
  if (isNaN(byteLength) || byteLength <= 0) {
    console.log(chalk.red('❌ Longitud inválida.'));
    return mainMenu();
  }

  const formatInput = await prompt(chalk.yellow('🔤 ¿Formato? (hex, base64, ascii): '));
  const format = formatInput.trim().toLowerCase();
  const validFormats = ['hex', 'base64', 'ascii'];

  if (!validFormats.includes(format)) {
    console.log(chalk.red('❌ Formato inválido. Usá: hex, base64 o ascii.'));
    return mainMenu();
  }

  const key = randomBytes(byteLength).toString(format);
  console.log(chalk.cyan.bold('\n🔐 Clave generada:\n'), key);

  try {
    await saveKeyToCSV(key);
    console.log(chalk.green.bold('\n📁 Clave guardada en archivo:'), CSV_PATH);
  } catch (err) {
    console.error(chalk.red('❌ Error al guardar la clave:'), err.message);
  }

  await mainMenu();
}

async function showSavedKeys() {
  try {
    await access(CSV_PATH);
  } catch {
    console.log(chalk.yellow('No hay claves guardadas aún.'));
    return mainMenu();
  }

  const content = await readFile(CSV_PATH, 'utf8');
  const lines = content.trim().split('\n');
  if (lines.length <= 1) {
    console.log(chalk.yellow('No hay claves guardadas aún.'));
    return mainMenu();
  }

  console.log(chalk.blue.bold('\n🔑 Claves guardadas:\n'));

  // Omito header y parseo líneas
  lines.slice(1).forEach((line, i) => {
    // CSV con comillas: "timestamp","clave"
    // Remuevo comillas y separo por coma (la clave puede tener comas, pero la guardamos entre comillas)
    const match = line.match(/^"(.+?)","(.+)"$/);
    if (match) {
      const [, timestamp, clave] = match;
      console.log(chalk.green(`${i + 1}) Fecha: ${timestamp}`));
      console.log(chalk.cyan(`   Clave: ${clave}\n`));
    } else {
      console.log(chalk.red(`Error leyendo línea: ${line}`));
    }
  });

  await mainMenu();
}

async function saveKeyToCSV(key) {
  // Revisar si existe el archivo
  try {
    await access(CSV_PATH);
  } catch {
    // No existe, crearlo con header
    await writeFile(CSV_PATH, '"timestamp","clave"\n', { encoding: 'utf8' });
  }

  // Leer contenido para evitar duplicados
  const content = await readFile(CSV_PATH, 'utf8');
  const lines = content.split('\n').slice(1); // saco header

  // Buscar si clave ya existe (sin comillas)
  const found = lines.some(line => {
    const match = line.match(/^"(.+?)","(.+)"$/);
    if (match) {
      return match[2] === key;
    }
    return false;
  });

  if (found) {
    console.log(chalk.yellow('⚠️  La clave ya existe en el archivo. No se agregó.'));
    return;
  }

  // Guardar con timestamp entre comillas
  const timestamp = new Date().toISOString();
  const newLine = `"${timestamp}","${key}"\n`;
  await appendFile(CSV_PATH, newLine, { encoding: 'utf8' });
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

// Ejecutar menú principal
mainMenu();
