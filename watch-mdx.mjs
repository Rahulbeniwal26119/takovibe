import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';

console.log('🔍 Watching MDX files for escaped brackets...\n');

const watcher = chokidar.watch('src/content/blog/**/*.mdx', {
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: {
    stabilityThreshold: 500,
    pollInterval: 100
  }
});

function fixBrackets(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Fix escaped brackets in JSX
    content = content.replace(/\\\[/g, '[');
    content = content.replace(/\\\]/g, ']');
    
    // Only write if something changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Fixed brackets in: ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

watcher
  .on('add', fixBrackets)
  .on('change', fixBrackets)
  .on('ready', () => {
    console.log('✓ Watching for file changes...\n');
  });

process.on('SIGINT', () => {
  console.log('\n👋 Stopping file watcher...');
  watcher.close();
  process.exit(0);
});
