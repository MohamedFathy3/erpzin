import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import puppeteer from 'puppeteer';
const routes=['/','/about','/services','/pricing','/contact','/signup','/privacy','/terms','/cookies'];
const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4173'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
  await wait(2500);
  let browser;
  try {
    browser = await puppeteer.launch({headless:'new', args:['--no-sandbox','--disable-setuid-sandbox']});
  } catch (error) {
    console.warn('Pre-render skipped: Chrome could not start. The Vite build is still valid. Install the Puppeteer Linux dependencies to enable SEO snapshots.');
    console.warn(error?.message || error);
    process.exitCode = 0;
  }
  if (browser) {
    const page = await browser.newPage();
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:4173${route}`, {waitUntil:'networkidle0'});
      const html = await page.content();
      const dir = route === '/' ? 'dist' : join('dist', route);
      mkdirSync(dir, {recursive:true});
      writeFileSync(join(dir, 'index.html'), `<!doctype html>${html.slice(html.indexOf('<html'))}`);
    }
    await browser.close();
    console.log(`Pre-rendered ${routes.length} marketing routes`);
  }
} finally {
  server.kill('SIGTERM');
}
