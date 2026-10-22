/* The scripted scenes behind each card preview. Read by build/record_previews.js.
 *
 * One object per card, keyed by the card's preview.slug in index.html. Each scene shows the
 * project doing the one thing that explains it, with the sound off, in 3 seconds:
 *   prepare(page)  reach the starting state; this part is cut from the clip
 *   act(page)      the visible action; the clip is the 3.3 s from its start
 *   serve          optional: start the app locally first, for an app whose host is down
 *   speed          optional, default 1: play faster when the one real action outlasts 3 s
 * Selectors come from each app's own source. If an app changes, its scene fails loudly
 * (a selector times out) and the old clip is kept. */
const fs = require('fs'), path = require('path');
const { pathToFileURL } = require('url');

const PROJECTS = path.join(__dirname, '..', '..');
const wait = ms => new Promise(r => setTimeout(r, ms));
const imagesLoaded = page => page.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 20000 });

/* Guardian Chess's host stopped answering on 2026-10-22, so its scene runs the app from its
   own folder. The folder may lose its space in a rename; accept either name. */
const GC_DIR = ['Guardian Chess', 'guardian-chess'].map(d => path.join(PROJECTS, d)).find(d => fs.existsSync(d));
const GC_PORT = 3917;

module.exports = [
  {
    slug: 'abra',
    url: 'https://willhoop.github.io/abra/app/',
    speed: 1.6,                         // the 400-game playout takes about 4 s
    async prepare(page) {
      await page.click('#nav button.tab[data-id="medicham"]');
      const btn = page.locator('button.battlebtn', { hasText: 'Play it out' });
      await btn.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 160));
      await imagesLoaded(page);
    },
    async act(page) {
      await wait(250);
      await page.locator('button.battlebtn', { hasText: 'Play it out' }).click();
      await page.waitForFunction(() => /Grounded win rate/.test(document.querySelector('#mcRoomOut')?.textContent || ''));
    }
  },
  {
    slug: 'chomp',
    url: pathToFileURL(path.join(__dirname, 'scenes', 'chomp.html')).href,
    async prepare(page) {
      const solve = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'chomp-preview-solve.json'), 'utf8'));
      await page.evaluate(d => draw(d), solve);
      await imagesLoaded(page);
    },
    async act(page) { await wait(250); await page.evaluate(() => play()); }
  },
  {
    slug: 'event-desks',
    url: 'https://elitefourcapital.com/',
    async prepare(page) {
      await page.waitForFunction(() => !/CONNECTING TO THE MARKETS/i.test(document.body.innerText), null, { timeout: 30000 });
      await page.waitForSelector('svg[viewBox="0 0 340 178"]', { timeout: 30000 }).catch(() => {});
      await page.mouse.move(1270, 790);   // the ticker pauses under the pointer
    },
    async act(page) {
      await wait(500);
      await page.evaluate(() => window.scrollTo({ top: 260, behavior: 'smooth' }));
    }
  },
  {
    slug: 'hoopadex',
    url: 'https://willhoop.github.io/hoopadex/app/',
    async prepare(page) {
      await page.waitForSelector('#pokemon-grid .card', { timeout: 60000 });
      await imagesLoaded(page);
    },
    async act(page) {
      await wait(200);
      // the app's own demo: types "dark", then "prankster", then "rain dance" as filter chips
      await page.click('#dex-search-hint a');
    }
  },
  {
    slug: 'guardian-chess',
    // 127.0.0.1, not localhost: the server binds IPv4 and localhost can resolve to ::1 first
    url: `http://127.0.0.1:${GC_PORT}/`,
    serve: GC_DIR && { cmd: process.execPath, args: ['server/index.js'], cwd: GC_DIR,
                       env: { PORT: String(GC_PORT), HOST: '127.0.0.1' }, ready: `http://127.0.0.1:${GC_PORT}/` },
    async prepare(page) {
      await page.click('#btn-bot');
      await page.waitForSelector('#board .sq[data-r="6"][data-c="4"]');
    },
    async act(page) {
      const sq = (r, c) => page.click(`#board .sq[data-r="${r}"][data-c="${c}"]`);
      await wait(150);
      await sq(6, 4); await wait(250); await sq(4, 4);       // a pawn two squares
      await wait(700);                                         // the computer replies
      await sq(7, 6); await wait(450);                         // pick up the Guardian: its leaps light up
      // the hint dot takes no pointer events; the square under it does
      await page.click('#board .sq:has(.hint) >> nth=0', { timeout: 5000 });
    }
  },
  {
    slug: 'jeopardy-wagering',
    url: 'https://willhoop.github.io/jeopardy-wagering/app/',
    // Final Jeopardy, on the app's default scores (12,000 / 9,000 / 6,000). The Daily Double
    // tab is the more famous decision but its simulation freezes the page for about 7 s.
    async prepare(page) {
      await page.click('nav button[data-tab="fj"]');
      await page.locator('button', { hasText: 'Get my wagers' }).scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 200));
    },
    async act(page) {
      await wait(300);
      await page.locator('button', { hasText: 'Get my wagers' }).click();
      await page.waitForSelector('#fj-results:not(.hidden)');
    }
  },
  {
    slug: 'fourth-down',
    url: 'https://willhoop.github.io/fourth-down/',
    async prepare(page) {
      await page.fill('#togo', '1');
      await page.fill('#yd', '35');
      await page.locator('#go').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 120));
    },
    async act(page) {
      await wait(300);
      await page.click('#go');
      await page.waitForSelector('#view-result:not([hidden])');
    }
  }
];
