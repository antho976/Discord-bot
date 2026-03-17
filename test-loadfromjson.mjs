import SmartBot from './smart-bot.js';
const s = new SmartBot();
console.log('loadFromJSON type:', typeof s.loadFromJSON);
console.log('setApiKeys type:', typeof s.setApiKeys);
console.log('ai exists:', !!s.ai);
s.loadFromJSON({ config: { enabled: true } });
console.log('PASS');
