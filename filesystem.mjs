import fs from 'fs/promises';

console.log("Leyendo 1er archivo...");

fs.readFile('./claves-generadas.csv', 'utf8')
    .then(content => {
        console.log('Contenido del archivo:', content);
    })

console.log("Haciendo cosas mientras se lee el archivo...");

console.log("Leyendo 2do archivo...");

fs.readFile('./claves-generadas.csv', 'utf8')
    .then(content => {
        console.log('Contenido del archivo:', content);
    })