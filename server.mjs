// app.js
import express from 'express';
import os from 'os';
import { randomBytes } from 'crypto';
import { readFile, writeFile, appendFile, access } from 'fs/promises';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const CSV_PATH = './claves-generadas.csv';

app.use(cors());
app.use(express.json()); // para leer JSON en POST

// Ruta 1: Info del sistema
// Ruta 1: Info del sistema - formato legible
app.get('/info', (req, res) => {
    const lines = [
        `Sistema operativo: ${os.type()}`,
        `Versión: ${os.release()}`,
        `Arquitectura: ${os.arch()}`,
        `CPU: ${os.cpus()[0].model}`,
        `Núcleos: ${os.cpus().length}`,
        `Memoria total: ${(os.totalmem() / 1024 ** 3).toFixed(2)} GB`,
        `Memoria libre: ${(os.freemem() / 1024 ** 3).toFixed(2)} GB`,
        `Tiempo encendido: ${formatUptime(os.uptime())}`
    ];

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(lines.join('\n'));
});


// Ruta 2: Ver claves generadas
// Ruta 2: Ver claves generadas - formato texto legible
app.get('/claves', async (req, res) => {
    try {
        await access(CSV_PATH);
        const content = await readFile(CSV_PATH, 'utf8');
        const lines = content.trim().split('\n').slice(1); // skip header

        if (lines.length === 0) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.send('🔐 No hay claves guardadas aún.');
        }

        const salida = lines
            .map((line, i) => {
                const match = line.match(/^"(.+?)","(.+)"$/);
                if (match) {
                    const [, timestamp, clave] = match;
                    const fecha = new Date(timestamp);
                    const fechaFormateada = fecha.toLocaleString('es-AR', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                        hour12: false,
                    });

                    return `${i + 1}) Fecha: ${fechaFormateada}\n   Clave: ${clave}`;
                } else {
                    return `${i + 1}) Línea malformada: ${line}`;
                }
            })
            .join('\n\n');


        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(salida);
    } catch {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');

        res.send('🔐 No hay claves guardadas aún.');
    }
});


// Ruta 3: Generar nueva clave
app.post('/generate', async (req, res) => {
    const { bytes = 32, format = 'hex' } = req.body;
    const validFormats = ['hex', 'base64', 'ascii'];

    if (!validFormats.includes(format)) {
        return res.status(400).json({ error: 'Formato inválido.' });
    }

    const key = randomBytes(bytes).toString(format);

    try {
        const alreadyExists = await checkKeyExists(key);
        if (alreadyExists) {
            return res.status(409).json({ message: 'La clave ya existe.', clave: key });
        }

        await saveKeyToCSV(key);
        res.json({ message: 'Clave generada y guardada', clave: key });
    } catch (err) {
        res.status(500).json({ error: 'Error al guardar la clave.' });
    }
});

// Lógica de utilidades
async function checkKeyExists(key) {
    try {
        const content = await readFile(CSV_PATH, 'utf8');
        const lines = content.split('\n').slice(1);
        return lines.some(line => {
            const match = line.match(/^"(.+?)","(.+)"$/);
            return match && match[2] === key;
        });
    } catch {
        return false;
    }
}

async function saveKeyToCSV(key) {
    try {
        await access(CSV_PATH);
    } catch {
        await writeFile(CSV_PATH, '"timestamp","clave"\n');
    }

    const timestamp = new Date().toISOString();
    await appendFile(CSV_PATH, `"${timestamp}","${key}"\n`);
}

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
