# cmXmlKude (Generador un Pdf Kude con un Xml con Qr)

Este repositorio contiene una extensión para la generacion de archivos Kude con estructuras XML previamente firmadas y con codigo Qr. El código está diseñado para generar Archivos Pdf con formato kude de los XML previamente generados,el programa esta diseñado para cuando se ejecute `server.js` se cree un servidor HTTP que escuche una estructura XML que cumpla con los requisitos para la generacion del archivo KUDE

## Archivo de Entorno
Es necesario configurar correctamente el archivo .env para el correcto uso del proyecto, este repositorio ya incluye todos los archivos necesarios para la generacion del Kude pero tienes que adaptarlo segun la ruta de la maquina que se utilize aqui un ejemplo de como configurarlo

```bash
JAVA8_PATH= C:ruta/al/ejecutable/java.exe
DEST_FOLDER= C:ruta/a/la/carpeta/output/
SRC_JASPER= C:ruta/al/node_modules/facturacionelectronicapy-kude/dist/DE/
CREATE_KUDE_JAR_PATH= C:ruta/al//node_modules/facturacionelectronicapy-kude/dist/createKude.jar
```

## Requerimientos

Para utilizar este código, es necesario tener instalado:

- Node.js
- npm (Node Package Manager)

## Instalación

Para instalar las dependencias necesarias, ejecute el siguiente comando en la terminal:

```bash
npm install facturacionelectronicapy-kude
```
```bash
npm install http
```
```bash
npm install winston 
```
```bash
npm install dotenv
```

## Configuración

Antes de ejecutar el servidor, asegúrese de configurar adecuadamente los parámetros y datos necesarios según la documentación de la SET. Los datos del archivo XML deve de cumplirse de tener los modulos anteriormente instalados y los parametros correctamente asignados en el archivo `.env` con los requisitos necesarios para poder generar el Pdf Kude,hay mas informacion sobre la generacion de archivos XML en este repositorio [cmXmlQr](https://github.com/PxSxtrxw/cmXmlQr).

## Uso

### Ejecución del Servidor

Para iniciar el servidor de desarrollo, use el siguiente comando:

```bash
node server
```
El servidor se iniciará en http://localhost:3004.

## Logger

el servidor guardara los loggers en una carpte llamada logs y la actividad de errores en `errorLogger.log` y la informacion de toda la actividad del servidor en `eventLogger.log`



