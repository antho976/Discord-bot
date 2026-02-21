/**
 * Performance Benchmark Test
 * Compares normal vs optimized vs ultra-fast startup modes
 */

import { performance } from 'perf_hooks';
import v8 from 'v8';

console.log('='.repeat(60));
console.log('RPG BOT PERFORMANCE BENCHMARK');
console.log('='.repeat(60));
console.log();

// Simulate bot operations
const testOperations = {
  'Player Load': () => {
    const start = performance.now();
    const player = {
      userId: 'test',
      username: 'benchmark',
      level: 50,
      xp: 10000,
      gold: 5000,
      health: 500,
      strength: 100,
      inventory: new Array(50).fill({ id: 'item', name: 'Test Item' })
    };
    // Simulate property access (hot path)
    for (let i = 0; i < 1000; i++) {
      const _ = player.level + player.xp + player.gold + player.health;
    }
    return performance.now() - start;
  },
  
  'Data Cache': () => {
    const start = performance.now();
    const cache = new Map();
    // Simulate caching operations
    for (let i = 0; i < 1000; i++) {
      cache.set(`key${i}`, { data: 'test', timestamp: Date.now() });
      cache.get(`key${i}`);
    }
    return performance.now() - start;
  },
  
  'Component Creation': () => {
    const start = performance.now();
    // Simulate Discord.js component creation
    const components = [];
    for (let i = 0; i < 100; i++) {
      components.push({
        type: 1,
        components: [
          { type: 2, style: 1, label: 'Button', custom_id: 'test' }
        ]
      });
    }
    return performance.now() - start;
  },
  
  'Array Operations': () => {
    const start = performance.now();
    const arr = new Array(1000).fill(0).map((_, i) => ({ id: i, value: i * 2 }));
    // Simulate filtering/mapping
    const filtered = arr.filter(x => x.value % 10 === 0);
    const mapped = filtered.map(x => x.value * 2);
    const sorted = mapped.sort((a, b) => b - a);
    return performance.now() - start;
  },
  
  'String Operations': () => {
    const start = performance.now();
    // Simulate embed descriptions
    for (let i = 0; i < 500; i++) {
      const str = `Level ${i} | XP: ${i * 100}/${i * 150} | Gold: 💰 ${i * 10}`;
      const split = str.split('|');
      const joined = split.join(' • ');
    }
    return performance.now() - start;
  },
  
  'JSON Operations': () => {
    const start = performance.now();
    const obj = {
      userId: 'test123',
      level: 50,
      inventory: new Array(30).fill({ id: 'item', qty: 5 })
    };
    // Simulate save/load
    for (let i = 0; i < 100; i++) {
      const json = JSON.stringify(obj);
      const parsed = JSON.parse(json);
    }
    return performance.now() - start;
  }
};

// Run benchmarks
console.log('Running benchmarks...\n');

const results = {};
const iterations = 10;

for (const [name, fn] of Object.entries(testOperations)) {
  const times = [];
  
  // Warmup
  for (let i = 0; i < 3; i++) fn();
  
  // Actual test
  for (let i = 0; i < iterations; i++) {
    times.push(fn());
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  results[name] = { avg, min, max };
}

// Display results
console.log('BENCHMARK RESULTS:');
console.log('-'.repeat(60));
console.log(`${'Operation'.padEnd(25)} ${'Avg'.padEnd(12)} ${'Min'.padEnd(12)} Max`);
console.log('-'.repeat(60));

for (const [name, stats] of Object.entries(results)) {
  console.log(
    `${name.padEnd(25)} ` +
    `${stats.avg.toFixed(2)}ms`.padEnd(12) +
    `${stats.min.toFixed(2)}ms`.padEnd(12) +
    `${stats.max.toFixed(2)}ms`
  );
}

console.log('-'.repeat(60));

// Memory usage
const mem = process.memoryUsage();
console.log('\nMEMORY USAGE:');
console.log(`  Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);
console.log(`  RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
console.log(`  External: ${(mem.external / 1024 / 1024).toFixed(2)} MB`);

// V8 optimization status
console.log('\nV8 CONFIGURATION:');
console.log(`  Max Old Space: ${(v8.getHeapStatistics().heap_size_limit / 1024 / 1024 / 1024).toFixed(2)}GB`);
console.log(`  Node Version: ${process.version}`);
console.log(`  V8 Version: ${process.versions.v8}`);

console.log('\n' + '='.repeat(60));
console.log('Benchmark complete!');
console.log('='.repeat(60));
