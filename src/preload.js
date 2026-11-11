// Twitter (x.com) page cleanup: opens on Following, hides promoted posts, Grok,
// Premium upsells and "Who to follow", plus the shared Ranch parts
// (settings gear, green Update button, direct links).
const { ipcRenderer, contextBridge, webFrame } = require('electron');

let cfg = ipcRenderer.sendSync('rw:get-config');
const log = (m) => ipcRenderer.send('rw:log', m);

// ------------------------------------------------------------ page world: clean copied links
contextBridge.executeInMainWorld({
  func: () => {
    const clean = (text) => (typeof text !== 'string' ? text
      : text.replace(/https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/[^\s]*/g, (url) => {
        try { const u = new URL(url); ['s', 't', 'ref_src', 'ref_url'].forEach((k) => u.searchParams.delete(k)); return u.toString(); } catch { return url; }
      }));
    if (window.Clipboard && Clipboard.prototype.writeText) {
      const orig = Clipboard.prototype.writeText;
      Clipboard.prototype.writeText = function writeText(t) { return orig.call(this, clean(t)); };
    }
  },
});

// ------------------------------------------------------------ styles
const SHEETS = {
  hideGrok: `
    a[href="/i/grok"], a[href^="/i/grok?"], a[aria-label="Grok"], [data-testid="GrokDrawer"], [data-testid="grokImgGen"],
    button[aria-label="Grok actions"], button[aria-label*="Grok"] { display: none !important; }`,
  hidePremium: `
    a[href="/i/premium_sign_up"], a[href^="/i/premium"], a[href="/i/verified-orgs-signup"], a[href="/i/verified-choose"],
    [data-testid="super-upsell-UpsellCardRenderProperties"], aside[aria-label*="Premium"],
    div[data-testid="sidebarColumn"] div:has(> aside[aria-label*="Premium"]) { display: none !important; }`,
  hideTrends: `
    div[data-testid="sidebarColumn"] section:has([data-testid="trend"]),
    div[data-testid="sidebarColumn"] div:has(> section [data-testid="trend"]),
    div[aria-label="Timeline: Trending now"] { display: none !important; }`,
  hideWhoToFollow: `
    div[data-testid="sidebarColumn"] aside[aria-label="Who to follow"],
    div[data-testid="sidebarColumn"] div:has(> aside[aria-label="Who to follow"]) { display: none !important; }`,
};
const BASE_CSS = `
  .ranch-top-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 48px; border: 0;
    border-radius: 24px; cursor: pointer; font: 700 15px/1 "Segoe UI", system-ui, sans-serif; flex: none; }
  #ranch-settings-btn { width: 48px; padding: 0; margin: 4px 0 4px 2px; background: transparent; color: rgb(231, 233, 234); }
  #ranch-settings-btn:hover { background: rgba(231, 233, 234, .1); }
  #ranch-settings-btn.floating { position: fixed; left: 16px; bottom: 16px; z-index: 9999; background: #16181c; }
  #ranch-update-btn { padding: 0 16px; margin: 4px 0; background: #1ed760; color: #04210f; }
  #ranch-update-btn:hover:not(:disabled) { background: #1bc456; }
  @media (prefers-color-scheme: light) { #ranch-settings-btn { color: rgb(15, 20, 25); } }
`;
webFrame.insertCSS(BASE_CSS);
const sheetKeys = {};
function applyCss() {
  for (const [key, css] of Object.entries(SHEETS)) {
    if (cfg[key] && !sheetKeys[key]) sheetKeys[key] = webFrame.insertCSS(css);
    else if (!cfg[key] && sheetKeys[key]) { webFrame.removeInsertedCSS(sheetKeys[key]); delete sheetKeys[key]; }
  }
}
applyCss();

// ------------------------------------------------------------ timeline cleanup
function isPromoted(cell) {
  const article = cell.querySelector('article');
  if (!article) return false;
  for (const span of article.querySelectorAll('span')) {
    const t = (span.textContent || '').trim();
    if ((t === 'Ad' || t === 'Promoted') && !span.closest('[data-testid="tweetText"]') && span.children.length === 0) return true;
  }
  return false;
}
const hide = (el, why) => {
  if (el.dataset.ranchHidden === why) return false;
  el.dataset.ranchHidden = why;
  el.style.setProperty('display', 'none', 'important');
  return true;
};
const counts = {};
function cleanTimeline() {
  let inSuggestions = false;
  for (const cell of document.querySelectorAll('div[data-testid="cellInnerDiv"]')) {
    let why = null;
    const heading = cell.querySelector('h2');
    const title = heading ? (heading.textContent || '').trim() : '';
    if (cfg.hideWhoToFollow) {
      if (/^(Who to follow|You might like|Creators for you)$/i.test(title)) { inSuggestions = true; why = 'who-to-follow'; }
      else if (inSuggestions && cell.querySelector('[data-testid="UserCell"]')) why = 'who-to-follow';
      else if (inSuggestions && cell.querySelector('a[href^="/i/connect_people"], a[href*="/i/related_users"]')) { why = 'who-to-follow'; inSuggestions = false; }
      else if (inSuggestions && !cell.querySelector('[data-testid="UserCell"]') && cell.textContent.trim() === '') why = 'who-to-follow';
      else inSuggestions = false;
    }
    if (!why && cfg.hidePromoted && isPromoted(cell)) why = 'promoted';
    if (why) { if (hide(cell, why)) counts[why] = (counts[why] || 0) + 1; }
    else if (cell.dataset.ranchHidden) { delete cell.dataset.ranchHidden; cell.style.removeProperty('display'); }
  }
  // Promoted trends ("Promoted by …") and promoted accounts in suggestions
  if (cfg.hidePromoted) {
    for (const el of document.querySelectorAll('[data-testid="trend"], [data-testid="UserCell"]')) {
      if (el.dataset.ranchHidden) continue;
      const label = [...el.querySelectorAll('span')].some((s) => s.children.length === 0 && /^(Promoted|Promoted by .+|Ad)$/.test((s.textContent || '').trim()));
      if (label && hide(el, 'promoted')) counts.promoted = (counts.promoted || 0) + 1;
    }
  }
}
let pending = false;
const schedule = () => { if (!pending) { pending = true; setTimeout(() => { pending = false; cleanTimeline(); }, 200); } };
new MutationObserver(schedule).observe(document, { childList: true, subtree: true });
setInterval(cleanTimeline, 1500);
setInterval(() => {
  if (Object.keys(counts).length) { log(`Hidden so far: ${JSON.stringify(counts)}`); for (const k of Object.keys(counts)) delete counts[k]; }
}, 5 * 60 * 1000);

function unhideAll() {
  for (const el of document.querySelectorAll('[data-ranch-hidden]')) {
    delete el.dataset.ranchHidden;
    el.style.removeProperty('display');
  }
}

// ------------------------------------------------------------ classic Twitter look
// The blue bird instead of the X, and the old words (Tweet, Retweet…) in buttons,
// menus and labels. Tweets themselves are never changed.
const BIRD = 'M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.850 2.313 3.198 4.352 3.234-1.595 1.250-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.510 2.093 7.140 2.093 8.570 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.910-.658 1.700-1.477 2.323-2.410z';
const WORDS = new Map([
  ['Post', 'Tweet'], ['Posts', 'Tweets'], ['Post all', 'Tweet all'], ['Repost', 'Retweet'], ['Reposts', 'Retweets'],
  ['Reposted', 'Retweeted'], ['Undo repost', 'Undo Retweet'], ['Quote', 'Quote Tweet'], ['Quotes', 'Quote Tweets'],
  ['Post your reply', 'Tweet your reply'], ['Post your reply!', 'Tweet your reply'], ['What is happening?!', "What's happening?"],
  ['What’s happening?', "What's happening?"], ['Reply', 'Reply'], ['Posts & replies', 'Tweets & replies'],
  ['Your post was sent.', 'Your Tweet was sent.'], ['Delete post?', 'Delete Tweet?'], ['Pin to your profile', 'Pin to your profile'],
]);
const PATTERNS = [
  [/^(.+) reposted$/, '$1 Retweeted'],
  [/^You reposted$/, 'You Retweeted'],
  [/^([\d.,]+[KMB]?) posts?$/i, (_m, n) => `${n} ${n === '1' ? 'Tweet' : 'Tweets'}`],
  [/^Show (\d+) posts?$/, (_m, n) => `Show ${n} ${n === '1' ? 'Tweet' : 'Tweets'}`],
];
// Where the words appear: buttons, menus, tabs, labels and the compose box hint
const CLASSIC_SPOTS = [
  'nav span', '[role="menu"] span', '[role="menuitem"] span', '[role="tab"] span', '[role="button"] span', 'button span',
  '[data-testid="socialContext"] span', '[data-testid="socialContext"]', 'h2 span', 'div[dir="ltr"] > span',
  '.public-DraftEditorPlaceholder-inner', '[data-testid="toast"] span', '[role="alert"] span',
].join(', ');
function classicText() {
  for (const el of document.querySelectorAll(CLASSIC_SPOTS)) {
    if (el.children.length || el.closest('[data-testid="tweetText"], [data-testid="UserDescription"], [data-testid="User-Name"], [contenteditable="true"] [data-text]')) continue;
    const t = el.textContent;
    if (!t || t.length > 40) continue;
    let next = WORDS.get(t.trim());
    if (!next) for (const [re, rep] of PATTERNS) { if (re.test(t.trim())) { next = t.trim().replace(re, rep); break; } }
    if (next && next !== t) {
      if (el.dataset.ranchOrig === undefined) el.dataset.ranchOrig = t;
      el.textContent = next;
    }
  }
}
function classicLogo(on) {
  for (const path of document.querySelectorAll('header[role="banner"] h1 svg path, div[aria-label="Loading…"] svg path, div[aria-label="Loading"] svg path, a[aria-label="X"] svg path')) {
    const svg = path.closest('svg');
    if (on && !path.dataset.ranchOrig) {
      path.dataset.ranchOrig = path.getAttribute('d');
      path.setAttribute('d', BIRD);
      svg.style.color = '#1d9bf0';
      svg.style.fill = '#1d9bf0';
    } else if (!on && path.dataset.ranchOrig) {
      path.setAttribute('d', path.dataset.ranchOrig);
      delete path.dataset.ranchOrig;
      svg.style.removeProperty('color');
      svg.style.removeProperty('fill');
    }
  }
}
function classicPass() {
  if (!cfg.classicTwitter) return;
  classicLogo(true);
  classicText();
  if (document.title.includes(' / X')) document.title = document.title.replace(/ \/ X$/, ' / Twitter');
}
function classicUndo() {
  classicLogo(false);
  for (const el of document.querySelectorAll('[data-ranch-orig]')) {
    if (el.tagName !== 'path') el.textContent = el.dataset.ranchOrig;
    delete el.dataset.ranchOrig;
  }
}
let classicPending = false;
new MutationObserver(() => {
  if (classicPending || !cfg.classicTwitter) return;
  classicPending = true;
  requestAnimationFrame(() => { classicPending = false; classicPass(); });
}).observe(document, { childList: true, subtree: true, characterData: true });
setInterval(classicPass, 2000);

// ------------------------------------------------------------ open on Following
// Once per start: if Home opens on "For you", switch to "Following".
let followingDone = false;
const startedAt = Date.now();
setInterval(() => {
  if (followingDone || !cfg.followingByDefault || Date.now() - startedAt > 60000) return;
  if (location.pathname !== '/home') return;
  const tabs = [...document.querySelectorAll('[role="tablist"] [role="tab"]')];
  const following = tabs.find((t) => /^Following$/i.test((t.textContent || '').trim()));
  if (!following) return;
  followingDone = true;
  if (following.getAttribute('aria-selected') !== 'true') { following.click(); log('Switched Home to Following'); }
}, 500);

// ------------------------------------------------------------ links open directly
document.addEventListener('click', (e) => {
  if (e.button !== 0 || !cfg.skipLinkTracking) return;
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  let url;
  try { url = new URL(a.href, location.href); } catch { return; }
  if (url.hostname !== 't.co') return;
  e.preventDefault();
  e.stopImmediatePropagation();
  ipcRenderer.send('rw:open-outside', url.toString());
}, true);

// ------------------------------------------------------------ settings gear + Update button
const NS = 'http://www.w3.org/2000/svg';
function icon(d, size) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'currentColor');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  svg.appendChild(p);
  return svg;
}
const GEAR = 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z';
const DOWNLOAD = 'M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z';
let updateState = null;
function updateLabel(s) {
  if (!s) return null;
  if (s.status === 'available') return { text: 'Update', busy: false };
  if (s.status === 'downloading') return { text: `Updating… ${s.percent || 0}%`, busy: true };
  if (s.status === 'ready') return { text: 'Restart to update', busy: false };
  if (s.status === 'error' && s.version) return { text: 'Retry update', busy: false };
  return null;
}
function renderButtons() {
  if (!document.body) return;
  // At the bottom of the left menu, under Twitter's own links
  const host = document.querySelector('header[role="banner"] nav[role="navigation"]');
  let gear = document.getElementById('ranch-settings-btn');
  if (!gear) {
    gear = document.createElement('button');
    gear.id = 'ranch-settings-btn';
    gear.type = 'button';
    gear.className = 'ranch-top-btn';
    gear.title = 'App settings: promoted posts, Following tab and more (Ctrl+,)';
    gear.setAttribute('aria-label', 'App settings');
    gear.appendChild(icon(GEAR, 20));
    gear.addEventListener('click', () => ipcRenderer.send('rw:open-settings'));
  }
  if (host) {
    gear.classList.remove('floating');
    if (gear.parentElement !== host || host.lastChild !== gear) host.appendChild(gear);
  } else {
    gear.classList.add('floating');
    if (gear.parentElement !== document.body) document.body.appendChild(gear);
  }
  const want = updateLabel(updateState);
  let upd = document.getElementById('ranch-update-btn');
  if (!want) { if (upd) upd.remove(); return; }
  if (!upd) {
    upd = document.createElement('button');
    upd.id = 'ranch-update-btn';
    upd.type = 'button';
    upd.className = 'ranch-top-btn';
    upd.addEventListener('click', () => ipcRenderer.send('tb:update-install'));
  }
  if (gear.parentElement && upd.nextSibling !== gear) gear.parentElement.insertBefore(upd, gear);
  if (upd.dataset.key !== want.text) {
    upd.dataset.key = want.text;
    upd.replaceChildren();
    if (!want.busy) upd.appendChild(icon(DOWNLOAD, 18));
    const span = document.createElement('span');
    span.textContent = want.text;
    upd.appendChild(span);
  }
  upd.disabled = want.busy;
}
ipcRenderer.on('tb:update', (_e, s) => { updateState = s; renderButtons(); });
ipcRenderer.invoke('tb:update-get').then((s) => { updateState = s; renderButtons(); }).catch(() => {});
setInterval(renderButtons, 1000);

ipcRenderer.on('rw:config', (_e, next) => {
  cfg = next;
  applyCss();
  unhideAll();
  cleanTimeline();
  if (cfg.classicTwitter) classicPass(); else classicUndo();
});
