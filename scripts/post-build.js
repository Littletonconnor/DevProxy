import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const distDir = 'dist';

// Inline CSS into panel.html for Chrome DevTools extension compatibility
// DevTools panels run in an isolated context where external CSS links don't work reliably
function inlinePanelCSS() {
  const panelPath = join(distDir, 'panel.html');

  if (!existsSync(panelPath)) {
    console.log('panel.html not found, skipping CSS inlining');
    return;
  }

  let html = readFileSync(panelPath, 'utf-8');

  // Find CSS link tag and extract the href
  const linkMatch = html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  if (!linkMatch) {
    console.log('No CSS link found in panel.html');
    return;
  }

  const cssHref = linkMatch[1];
  // Resolve CSS path relative to panel.html location
  const cssPath = join(distDir, cssHref.replace(/^\.\//, ''));

  if (!existsSync(cssPath)) {
    console.error(`CSS file not found: ${cssPath}`);
    return;
  }

  const cssContent = readFileSync(cssPath, 'utf-8');

  // Replace the link tag with an inline style tag
  html = html.replace(
    linkMatch[0],
    `<style>${cssContent}</style>`
  );

  writeFileSync(panelPath, html);
  console.log(`Inlined CSS into panel.html (${cssContent.length} bytes)`);
}

// Remove crossorigin attributes from HTML files
function fixHtmlFiles(dir) {
  const files = readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(dir, file.name);

    if (file.isDirectory()) {
      fixHtmlFiles(fullPath);
    } else if (file.name.endsWith('.html')) {
      let content = readFileSync(fullPath, 'utf-8');
      const original = content;

      // Remove crossorigin attribute
      content = content.replace(/ crossorigin/g, '');

      if (content !== original) {
        writeFileSync(fullPath, content);
        console.log(`Fixed crossorigin: ${fullPath}`);
      }
    }
  }
}

// Run post-build fixes
fixHtmlFiles(distDir);
inlinePanelCSS();
console.log('Post-build fixes complete');
