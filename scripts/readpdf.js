import { readFileSync } from 'fs';
const buf = readFileSync('C:/Users/Christian Gonzalez/Downloads/APIs e Integraciones Callpicker 2025.pdf');
const text = buf.toString('latin1');
const chunks = text.match(/[\x20-\x7E]{5,}/g) || [];
const result = chunks.filter(c => /[a-zA-Z]{3,}/.test(c)).join('\n');
console.log(result.substring(0, 12000));
