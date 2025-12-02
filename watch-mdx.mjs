import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';

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
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

watcher
  .on('add', fixBrackets)
  .on('change', fixBrackets)
  .on('ready', () => {
  });

process.on('SIGINT', () => {
  watcher.close();
  process.exit(0);
});