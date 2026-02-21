#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'rpg/api/content-routes.js');

let content = fs.readFileSync(filePath, 'utf-8');

// Replace all /api/ prefixes in router definitions
content = content.replaceAll("router.get('/api/", "router.get('/");
content = content.replaceAll("router.post('/api/", "router.post('/");
content = content.replaceAll("router.put('/api/", "router.put('/");
content = content.replaceAll("router.delete('/api/", "router.delete('/");

fs.writeFileSync(filePath, content);

console.log('Routes fixed!');
