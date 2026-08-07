import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('.output/chrome-mv3');
const destinationRoot = resolve('dist');
const destination = resolve(destinationRoot, 'chrome-mv3');

await rm(destination, { recursive: true, force: true });
await mkdir(destinationRoot, { recursive: true });
await cp(source, destination, { recursive: true });

console.log(`Prepared unpacked Chrome extension at ${destination}`);
