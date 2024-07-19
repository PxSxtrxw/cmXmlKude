const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { logger, errorLogger } = require('./logger'); // Importar los loggers correctos
require('dotenv').config();

// Cargar las variables de entorno desde el archivo .env
const java8Path = process.env.JAVA8_PATH;
const destFolder = process.env.DEST_FOLDER;
const srcJasper = process.env.SRC_JASPER;
const createKudeJarPath = process.env.CREATE_KUDE_JAR_PATH;

// Función para generar un nombre de archivo único basado en la fecha y hora actual
function generateUniqueFileName(prefix, extension) {
  const timestamp = new Date().getTime();
  return `${prefix}_${timestamp}.${extension}`;
}

// Función para limpiar el nombre de archivo de caracteres especiales
function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

// Función personalizada para generar KUDE y capturar la salida en memoria
function generateKUDEInMemory(javaPath, xmlFile, jasperPath, outputPath, params) {
  return new Promise((resolve, reject) => {
    const args = ['-jar', createKudeJarPath, xmlFile, jasperPath, outputPath, params];
    logger.info(`Ejecutando comando: ${javaPath} ${args.join(' ')}`);
    execFile(javaPath, args, (error, stdout, stderr) => {
      if (error) {
        errorLogger.error(`Error ejecutando CreateKude.jar: ${error}`);
        errorLogger.error(`stderr: ${stderr}`);
        reject(error);
      } else {
        logger.info(`stdout: ${stdout}`);
        logger.info(`stderr: ${stderr}`);
        resolve(stdout.trim());
      }

      // Eliminar el archivo XML temporal después de usarlo
      fs.unlink(xmlFile, err => {
        if (err) {
          errorLogger.error(`Error al eliminar el archivo XML temporal: ${err}`);
        } else {
          logger.info(`Archivo XML temporal eliminado correctamente: ${xmlFile}`);
        }
      });
    });
  });
}

// Función para encontrar el archivo PDF más reciente en una carpeta
function getMostRecentFile(dir) {
  const files = fs.readdirSync(dir);
  let mostRecentFile = null;
  let mostRecentTime = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile() && path.extname(file) === '.pdf' && stat.mtimeMs > mostRecentTime) {
      mostRecentFile = filePath;
      mostRecentTime = stat.mtimeMs;
    }
  });

  return mostRecentFile;
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let data = '';

    // Recibir datos del cuerpo del request
    req.on('data', chunk => {
      data += chunk.toString();
    });

    // Procesar datos cuando se complete la recepción
    req.on('end', () => {
      try {
        // Extraer el XML recibido
        const xmlString = data.trim();

        // Generar nombre de archivo temporal único
        const xmlFileName = generateUniqueFileName('temp', 'xml');
        const xmlFilePath = path.join(destFolder, xmlFileName);

        // Guardar el XML correctamente en un archivo temporal
        fs.writeFileSync(xmlFilePath, xmlString);

        // Parámetros JSON opcionales
        const jsonParam = JSON.stringify({ param1: "value1", param2: "value2" });

        // Llamar a la función para generar KUDE con los datos dinámicos
        generateKUDEInMemory(java8Path, xmlFilePath, srcJasper, destFolder, jsonParam)
          .then(() => {
            logger.info('Generación de KUDE completada.');

            // Buscar el archivo PDF más reciente en la carpeta de destino
            const mostRecentFile = getMostRecentFile(destFolder);

            if (!mostRecentFile) {
              throw new Error("No se encontró ningún archivo PDF en la carpeta de destino.");
            }

            logger.info(`Archivo PDF más reciente encontrado: ${mostRecentFile}`);

            const sanitizedFileName = sanitizeFileName(path.basename(mostRecentFile));
            const sanitizedFilePath = path.join(destFolder, sanitizedFileName);

            // Renombrar el archivo con el nombre sanitizado
            fs.renameSync(mostRecentFile, sanitizedFilePath);

            logger.info(`KUDE generado exitosamente. Nombre del archivo: ${sanitizedFileName}`);

            // Responder al cliente con el nombre del archivo generado
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ fileName: sanitizedFileName }));
          })
          .catch(error => {
            const errorMessage = 'Error generando KUDE';
            errorLogger.error(`${errorMessage}: ${error}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: errorMessage }));
          });

      } catch (error) {
        const errorMessage = 'Error al procesar los datos';
        errorLogger.error(`${errorMessage}: ${error}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorMessage }));
      }
    });
  } else {
    // Si el método del request no es POST
    const errorMessage = 'Método no permitido';
    logger.error(errorMessage);
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: errorMessage }));
  }
});

const PORT = 3004;
server.listen(PORT, () => {
  logger.info(`Servidor iniciado en http://localhost:${PORT}`);
});
