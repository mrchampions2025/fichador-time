import fs from "fs";
import path from "path";

const assetsDir = path.resolve("dist/client/assets");
const files = fs.readdirSync(assetsDir);

const jsFile = files.find(f => f.startsWith("index-") && f.endsWith(".js"));
const cssFile = files.find(f => f.startsWith("styles-") && f.endsWith(".css"));

if (!jsFile) {
  console.error("No index-*.js found in dist/client/assets!");
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fichador Time - Control Horario</title>
    <link rel="icon" href="/favicon.ico" />
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}">` : ""}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/${jsFile}"></script>
  </body>
</html>`;

fs.writeFileSync(path.resolve("dist/client/index.html"), html);
console.log(`Generated dist/client/index.html linking /assets/${jsFile} and /assets/${cssFile}`);
