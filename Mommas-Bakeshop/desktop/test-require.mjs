import { createRequire } from 'node:module';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { app } = require('electron');
console.log('App:', app ? 'Found' : 'Undefined');
process.exit(0);
