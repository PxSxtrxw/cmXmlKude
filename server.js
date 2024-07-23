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
        // Parsear el JSON recibido
        const jsonData = JSON.parse(data);

        // Obtener la ruta al archivo XML desde el JSON
        const xmlFilePath = jsonData.xml;

        // Comprobar si el archivo existe antes de leerlo
        if (!fs.existsSync(xmlFilePath)) {
          const errorMessage = 'El archivo XML no existe en la ruta especificada';
          errorLogger.error(errorMessage);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: errorMessage }));
          return;
        }

        // Leer el archivo XML desde la ruta especificada con codificación UTF-8
        fs.readFile(xmlFilePath, 'utf8', (err, xmlString) => {
          if (err) {
            const errorMessage = 'Error al leer el archivo XML';
            errorLogger.error(`${errorMessage}: ${err}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: errorMessage }));
            return;
          }

          // Verifica si el contenido XML es válido o tiene la estructura esperada
          if (!xmlString || xmlString.trim() === '') {
            const errorMessage = 'El contenido del archivo XML está vacío o no es válido';
            errorLogger.error(errorMessage);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: errorMessage }));
            return;
          }

          // Crear un archivo temporal para almacenar el contenido XML
          const tempXmlPath = path.join(destFolder, 'temp_kude.xml');
          fs.writeFileSync(tempXmlPath, xmlString, 'utf8');

          // Parámetros JSON opcionales
          const jsonParam = JSON.stringify({ param1: "value1", param2: "value2" });

          // Llamar a la función para generar KUDE usando el archivo temporal
          generateKUDEInMemory(java8Path, tempXmlPath, srcJasper, destFolder, jsonParam)
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
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
