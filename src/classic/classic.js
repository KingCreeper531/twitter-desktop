// Classic Twitter: Twitter as it looked around 2018, drawn by the app on top of x.com.
// Runs in the page itself (so requests carry your sign-in, like X's own site), and
// loads data from the same web API X's site uses. Pages it doesn't draw (Messages,
// Search, Settings, Lists…) are X's own. window.ranchTwitter is provided by preload.js.
(function () {
  'use strict';
  if (window.__ranchClassic) return;
  window.__ranchClassic = true;
  const bridge = window.ranchTwitter || {};

  // ==================================================================== helpers
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const decodeEntities = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const cookie = (name) => { const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; };
  const signedIn = () => !!cookie('ct0') && !!cookie('twid');
  const compact = (n) => {
    n = Number(n) || 0;
    if (n < 1000) return n ? String(n) : '';
    if (n < 1e6) return (n / 1e3).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, '') + 'K';
    return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  };
  const full = (n) => (Number(n) || 0).toLocaleString('en-US');
  function ago(d) {
    const t = new Date(d);
    const s = (Date.now() - t) / 1000;
    if (s < 60) return Math.max(1, Math.floor(s)) + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    const sameYear = t.getFullYear() === new Date().getFullYear();
    return t.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const longDate = (d) => {
    const t = new Date(d);
    return t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' - ' + t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ==================================================================== icons (2018 style)
  const ICON = {
    bird: 'M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.850 2.313 3.198 4.352 3.234-1.595 1.250-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.510 2.093 7.140 2.093 8.570 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.910-.658 1.700-1.477 2.323-2.410z',
    home: 'M12 3.2 2.5 11.3l1.3 1.5L5 11.8V20a1 1 0 0 0 1 1h4.5v-6h3v6H18a1 1 0 0 0 1-1v-8.2l1.2 1 1.3-1.5L12 3.2Zm5 15.8h-1.5v-6h-7v6H7v-8.9l5-4.3 5 4.3V19Z',
    bell: 'M19.6 16.2 18 14.4V10a6 6 0 0 0-4.8-5.9V3.2a1.2 1.2 0 0 0-2.4 0v.9A6 6 0 0 0 6 10v4.4l-1.6 1.8a.8.8 0 0 0 .6 1.3h14a.8.8 0 0 0 .6-1.3ZM8 15.5V10a4 4 0 0 1 8 0v5.5H8Zm4 5.3a2.3 2.3 0 0 0 2.2-1.8H9.8a2.3 2.3 0 0 0 2.2 1.8Z',
    mail: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 2v.5l-8 5.2-8-5.2V6h16ZM4 18V8.9l7.5 4.9a1 1 0 0 0 1 0L20 8.9V18H4Z',
    reply: 'M14.05 6.2h-4.1C6.3 6.2 3.4 9.1 3.4 12.75c0 3.4 2.6 6.2 5.9 6.5v2.65c0 .5.55.8.95.5l4.15-2.85c2.6-1.8 4.2-4.75 4.2-7.85v-.05c0-3.1-2.5-5.45-5.55-5.45Zm3.55 5.5c0 2.45-1.25 4.75-3.3 6.15l-2.95 2.05V19a.75.75 0 0 0-.75-.75h-.65c-2.75 0-5.05-2.25-5.05-5.5 0-2.8 2.25-5.05 5.05-5.05h4.1c2.15 0 3.55 1.55 3.55 3.95v.05Z',
    retweet: 'm23.77 15.67a.75.75 0 0 0-1.06 0l-2.22 2.22V7.65a3.76 3.76 0 0 0-3.75-3.75h-5.85a.75.75 0 0 0 0 1.5h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0 0-1.06ZM12.94 18.6H7.1c-1.24 0-2.25-1.01-2.25-2.25V6.1l2.22 2.23a.75.75 0 0 0 1.06-1.06l-3.5-3.5a.75.75 0 0 0-1.06 0l-3.5 3.5a.75.75 0 0 0 1.06 1.06L3.35 6.1v10.25a3.76 3.76 0 0 0 3.75 3.75h5.84a.75.75 0 0 0 0-1.5Z',
    heart: 'M12 21.64c-.15 0-.3-.04-.43-.13C11.1 21.2 2 15.35 2 8.65 2 5.92 4.24 3.7 7 3.7c1.92 0 3.66 1.08 5 2.92 1.34-1.84 3.08-2.92 5-2.92 2.76 0 5 2.22 5 4.95 0 6.7-9.1 12.55-9.57 12.86a.77.77 0 0 1-.43.13ZM7 5.2c-1.93 0-3.5 1.55-3.5 3.45 0 5.1 6.86 10.03 8.5 11.16 1.64-1.13 8.5-6.06 8.5-11.16 0-1.9-1.57-3.45-3.5-3.45-1.74 0-3.2 1.27-4.3 3.5a.75.75 0 0 1-1.4 0C10.2 6.47 8.74 5.2 7 5.2Z',
    heartFull: 'M12 21.64c-.15 0-.3-.04-.43-.13C11.1 21.2 2 15.35 2 8.65 2 5.92 4.24 3.7 7 3.7c1.92 0 3.66 1.08 5 2.92 1.34-1.84 3.08-2.92 5-2.92 2.76 0 5 2.22 5 4.95 0 6.7-9.1 12.55-9.57 12.86a.77.77 0 0 1-.43.13Z',
    search: 'M21.53 20.47 16.8 15.75a8 8 0 1 0-1.06 1.06l4.72 4.73a.75.75 0 1 0 1.07-1.07ZM3.5 10.5a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z',
    check: 'M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484Zm-6.616-3.334-4.334 6.5a.75.75 0 0 1-1.04.207l-.115-.094-2.415-2.415a.75.75 0 1 1 1.06-1.06l1.77 1.767 3.825-5.74a.75.75 0 0 1 1.25.833Z',
    pin: 'M12 2.5a7 7 0 0 0-7 7c0 5.2 6.3 11.6 6.5 11.9a.75.75 0 0 0 1 0c.3-.3 6.5-6.7 6.5-11.9a7 7 0 0 0-7-7Zm0 17.2c-1.5-1.6-5.5-6.3-5.5-10.2a5.5 5.5 0 0 1 11 0c0 3.9-4 8.6-5.5 10.2ZM12 6.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
    link: 'M11.96 14.95a.75.75 0 0 1 0 1.06l-1.4 1.4a4.4 4.4 0 0 1-6.22-6.22l2.63-2.62a4.4 4.4 0 0 1 6.22 0 .75.75 0 1 1-1.06 1.06 2.9 2.9 0 0 0-4.1 0L5.4 12.25a2.9 2.9 0 0 0 4.1 4.1l1.4-1.4a.75.75 0 0 1 1.06 0Zm7.7-10.6a4.4 4.4 0 0 0-6.22 0l-1.4 1.4a.75.75 0 1 0 1.06 1.06l1.4-1.4a2.9 2.9 0 0 1 4.1 4.1l-2.63 2.63a2.9 2.9 0 0 1-4.1 0 .75.75 0 0 0-1.06 1.06 4.4 4.4 0 0 0 6.22 0l2.63-2.63a4.4 4.4 0 0 0 0-6.22Z',
    calendar: 'M19.7 4.5h-2.2v-1a.75.75 0 0 0-1.5 0v1H8v-1a.75.75 0 0 0-1.5 0v1H4.3A1.8 1.8 0 0 0 2.5 6.3v13.4c0 1 .8 1.8 1.8 1.8h15.4c1 0 1.8-.8 1.8-1.8V6.3c0-1-.8-1.8-1.8-1.8ZM4.3 6h2.2v1a.75.75 0 0 0 1.5 0V6h8v1a.75.75 0 0 0 1.5 0V6h2.2c.17 0 .3.13.3.3V9H4V6.3c0-.17.13-.3.3-.3Zm15.4 14H4.3a.3.3 0 0 1-.3-.3v-9.2h16v9.2a.3.3 0 0 1-.3.3Z',
    person: 'M12 11.8a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8Zm0-7.3a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8Zm0 9c-4.6 0-8.5 2.9-8.5 6.7 0 .4.3.8.8.8h15.4c.4 0 .8-.4.8-.8 0-3.8-3.9-6.7-8.5-6.7Zm-6.9 6c.5-2.5 3.4-4.5 6.9-4.5s6.4 2 6.9 4.5H5.1Z',
    moon: 'M20.4 14.3a.75.75 0 0 0-.9-.2 7.5 7.5 0 0 1-9.6-9.6.75.75 0 0 0-1-.9 9 9 0 1 0 11.7 11.7.75.75 0 0 0-.2-1ZM12 19.5A7.5 7.5 0 0 1 8 5.7a9 9 0 0 0 10.3 10.3 7.5 7.5 0 0 1-6.3 3.5Z',
  };
  const svg = (name, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[name]}"/></svg>`;

  // ==================================================================== X's web API
  // The same requests X's own site makes. The operation IDs and feature flags change
  // with every X release, so they're read from X's own script bundle at runtime.
  const api = { ops: {}, bearer: null, ready: null };
  function parseBundle(text) {
    const re = /queryId:\s*"([^"]+)",\s*operationName:\s*"([^"]+)",\s*operationType:\s*"([^"]+)",\s*metadata:\s*\{\s*featureSwitches:\s*\[([^\]]*)\],\s*fieldToggles:\s*\[([^\]]*)\]/g;
    let m;
    while ((m = re.exec(text))) {
      const list = (s) => (s.match(/"([^"]+)"/g) || []).map((x) => x.slice(1, -1));
      api.ops[m[2]] = { id: m[1], type: m[3], features: list(m[4]), toggles: list(m[5]) };
    }
    if (!api.bearer) { const b = text.match(/"(AAAAAAAAAAAAAAAAAAAAA[A-Za-z0-9%]{40,})"/); if (b) api.bearer = b[1]; }
  }
  function bundleUrls() {
    const urls = new Set();
    for (const s of document.querySelectorAll('script[src]')) if (/abs\.twimg\.com\/responsive-web\/client-web[^"]*\.js/.test(s.src)) urls.add(s.src);
    for (const e of performance.getEntriesByType('resource')) if (/abs\.twimg\.com\/responsive-web\/client-web[^?]*\.js$/.test(e.name)) urls.add(e.name);
    return [...urls].sort((a, b) => (/\/main\./.test(b) ? 1 : 0) - (/\/main\./.test(a) ? 1 : 0));
  }
  function ensureApi() {
    if (api.ready) return api.ready;
    api.ready = (async () => {
      for (let attempt = 0; attempt < 20 && !bundleUrls().length; attempt++) await new Promise((r) => setTimeout(r, 300));
      for (const url of bundleUrls()) {
        try { parseBundle(await bridge.getText(url)); } catch { /* next */ }
        if (api.bearer && api.ops.HomeLatestTimeline && api.ops.UserByScreenName && api.ops.TweetDetail) break;
      }
      if (!api.bearer) throw new Error('Couldn\'t read X\'s site setup');
    })();
    api.ready.catch(() => { api.ready = null; });
    return api.ready;
  }
  function featureValues(names) {
    const fs = (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.featureSwitch) || {};
    const user = (fs.user && fs.user.config) || {};
    const def = fs.defaultConfig || {};
    const out = {};
    for (const n of names) {
      const v = (user[n] && user[n].value) !== undefined ? user[n].value : (def[n] && def[n].value);
      out[n] = typeof v === 'boolean' ? v : v === undefined ? true : !!v;
    }
    return out;
  }
  function headers(json) {
    const h = {
      authorization: 'Bearer ' + api.bearer,
      'x-csrf-token': cookie('ct0') || '',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': (document.documentElement.lang || 'en').slice(0, 2),
    };
    if (json) h['content-type'] = 'application/json';
    return h;
  }
  async function gql(name, variables, opts = {}) {
    await ensureApi();
    const op = api.ops[name];
    if (!op) throw new Error(`X's site doesn't offer ${name} right now`);
    const features = featureValues(op.features);
    const fieldToggles = Object.fromEntries(op.toggles.map((t) => [t, false]));
    const base = `/i/api/graphql/${op.id}/${name}`;
    const post = () => fetch(base, { method: 'POST', credentials: 'include', headers: headers(true), body: JSON.stringify({ variables, features, fieldToggles, queryId: op.id }) });
    let res;
    if (op.type === 'mutation' || opts.post) res = await post();
    else {
      const qs = new URLSearchParams({ variables: JSON.stringify(variables), features: JSON.stringify(features), fieldToggles: JSON.stringify(fieldToggles) });
      res = await fetch(`${base}?${qs}`, { credentials: 'include', headers: headers(false) });
      if (!res.ok && res.status !== 429 && res.status !== 401) res = await post();
    }
    if (res.status === 429) throw new Error('X says to slow down. Try again in a minute.');
    if (!res.ok) throw new Error(`X returned an error (${res.status})`);
    const j = await res.json();
    if (j.errors && !j.data) throw new Error(j.errors[0].message || 'X returned an error');
    return j.data || {};
  }
  async function rest(path, { method = 'GET', form } = {}) {
    await ensureApi();
    const h = headers(false);
    let body;
    if (form) { h['content-type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(form).toString(); }
    const res = await fetch(`/i/api/${path}`, { method, credentials: 'include', headers: h, body });
    if (!res.ok) throw new Error(`X returned an error (${res.status})`);
    return res.json();
  }

  // ==================================================================== data shapes
  function normUser(u) {
    u = u && (u.result || u);
    if (!u || u.__typename === 'UserUnavailable') return null;
    const l = u.legacy || {};
    const core = u.core || {};
    return {
      id: u.rest_id || l.id_str,
      name: core.name || l.name || '',
      screen: core.screen_name || l.screen_name || '',
      avatar: ((u.avatar && u.avatar.image_url) || l.profile_image_url_https || '').replace('_normal.', '_bigger.'),
      verified: !!(u.is_blue_verified || l.verified || (u.verification && u.verification.verified)),
      locked: !!(l.protected || (u.privacy && u.privacy.protected)),
      bio: l.description || (u.profile_bio && u.profile_bio.description) || '',
      bioEntities: (l.entities && l.entities.description) || {},
      location: (u.location && u.location.location) || l.location || '',
      url: (l.entities && l.entities.url && l.entities.url.urls && l.entities.url.urls[0]) || null,
      banner: l.profile_banner_url || (u.banner && u.banner.image_url) || '',
      followers: l.followers_count, following: l.friends_count, tweets: l.statuses_count, likes: l.favourites_count,
      created: core.created_at || l.created_at,
      followed: !!(l.following || (u.relationship_perspectives && u.relationship_perspectives.following)),
    };
  }
  function unwrap(r) {
    if (!r) return null;
    if (r.__typename === 'TweetWithVisibilityResults') r = r.tweet;
    if (!r || !r.legacy) return null;
    return r;
  }
  function normTweet(r) {
    r = unwrap(r);
    if (!r) return null;
    const l = r.legacy;
    const note = r.note_tweet && r.note_tweet.note_tweet_results && r.note_tweet.note_tweet_results.result;
    return {
      id: r.rest_id || l.id_str,
      user: normUser(r.core && r.core.user_results),
      text: note ? note.text : l.full_text || '',
      entities: note ? (note.entity_set || {}) : (l.entities || {}),
      range: note ? null : l.display_text_range,
      media: (l.extended_entities && l.extended_entities.media) || [],
      created: l.created_at,
      replies: l.reply_count, retweets: l.retweet_count, likes: l.favorite_count,
      liked: !!l.favorited, retweeted: !!l.retweeted,
      replyTo: l.in_reply_to_screen_name, replyToId: l.in_reply_to_status_id_str,
      quote: r.quoted_status_result ? normTweet(r.quoted_status_result.result) : null,
      rt: l.retweeted_status_result ? normTweet(l.retweeted_status_result.result) : null,
      card: r.card && r.card.legacy ? r.card.legacy : null,
    };
  }
  // REST (v1.1 / v2) shapes, used by notifications
  function legacyTweet(t, users, tweets) {
    if (!t) return null;
    const u = users[t.user_id_str];
    return {
      id: t.id_str, user: u ? normUser({ legacy: u, rest_id: u.id_str }) : null,
      text: t.full_text || t.text || '', entities: t.entities || {}, range: t.display_text_range,
      media: (t.extended_entities && t.extended_entities.media) || [], created: t.created_at,
      replies: t.reply_count, retweets: t.retweet_count, likes: t.favorite_count, liked: !!t.favorited, retweeted: !!t.retweeted,
      replyTo: t.in_reply_to_screen_name, replyToId: t.in_reply_to_status_id_str,
      quote: t.quoted_status_id_str && tweets[t.quoted_status_id_str] ? legacyTweet(tweets[t.quoted_status_id_str], users, {}) : null,
      rt: t.retweeted_status_id_str && tweets[t.retweeted_status_id_str] ? legacyTweet(tweets[t.retweeted_status_id_str], users, tweets) : null,
    };
  }
  function readTimeline(instructions) {
    const items = [];
    let bottom = null;
    for (const ins of instructions || []) {
      const entries = ins.entries || (ins.entry ? [ins.entry] : []);
      for (const e of entries) {
        const c = e.content || {};
        if (c.cursorType === 'Bottom') { bottom = c.value; continue; }
        const push = (ic, extra) => {
          if (!ic || ic.promotedMetadata) return;
          if (ic.tweet_results) { const t = normTweet(ic.tweet_results.result); if (t) items.push({ kind: 'tweet', tweet: t, ...extra }); }
          else if (ic.__typename === 'TimelineNotification') items.push({ kind: 'notification', n: ic });
        };
        if (c.itemContent) push(c.itemContent, { pinned: ins.type === 'TimelinePinEntry' || (c.itemContent.socialContext && c.itemContent.socialContext.contextType === 'Pin') });
        else if (c.items) {
          const thread = c.items.map((it) => it.item && it.item.itemContent).filter(Boolean);
          thread.forEach((ic, i) => push(ic, { threadPart: thread.length > 1, threadEnd: i === thread.length - 1 }));
        }
      }
    }
    return { items, bottom };
  }

  // ==================================================================== text with links
  function renderText(text, ents, range, opts = {}) {
    const cps = Array.from(text || '');
    const from = range ? range[0] : 0;
    const to = range ? range[1] : cps.length;
    const marks = [];
    const add = (ix, html) => { if (ix && ix[0] >= from && ix[1] <= to) marks.push({ s: ix[0], e: ix[1], html }); };
    for (const u of ents.urls || []) {
      const href = u.expanded_url || u.url;
      add(u.indices, `<a href="${esc(href)}" class="ext" data-outside title="${esc(href)}">${esc(u.display_url || href)}</a>`);
    }
    for (const m of ents.user_mentions || []) add(m.indices, `<a href="/${esc(m.screen_name)}" data-route>@${esc(m.screen_name)}</a>`);
    for (const h of ents.hashtags || []) add(h.indices, `<a href="/hashtag/${encodeURIComponent(h.text)}" data-x>#${esc(h.text)}</a>`);
    for (const s of ents.symbols || []) add(s.indices, `<a href="/search?q=%24${encodeURIComponent(s.text)}" data-x>$${esc(s.text)}</a>`);
    if (!opts.keepMediaLinks) for (const m of ents.media || []) add(m.indices, '');
    marks.sort((a, b) => a.s - b.s);
    let out = '';
    let pos = from;
    const plain = (a, b) => esc(decodeEntities(cps.slice(a, b).join(''))).replace(/\n/g, '<br>');
    for (const m of marks) {
      if (m.s < pos) continue;
      out += plain(pos, m.s) + m.html;
      pos = m.e;
    }
    out += plain(pos, to);
    return out.replace(/(<br>\s*)+$/, '');
  }

  // ==================================================================== state
  const state = {
    me: null, // viewer
    active: false,
    night: (() => { try { return localStorage.getItem('ranch-classic-night') === '1'; } catch { return false; } })(),
    cache: new Map(), // tweet id -> tweet
    renderToken: 0,
  };

  // ==================================================================== the shell
  let host, root, main, toastEl;
  const RESERVED = new Set(['i', 'home', 'explore', 'search', 'messages', 'settings', 'notifications', 'compose', 'login', 'logout',
    'signup', 'account', 'tos', 'privacy', 'hashtag', 'jobs', 'premium', 'bookmarks', 'lists', 'communities', 'intent', 'share',
    'download', 'about', 'verified-choose', 'display', 'keyboard_shortcuts', 'sw.js', 'manifest.json', 'grok', 'jf', 'oauth', 'x']);
  function routeOf(pathname) {
    const p = pathname.replace(/\/+$/, '') || '/';
    if (p === '/' || p === '/home') return { page: 'home' };
    if (p === '/notifications') return { page: 'notifications', tab: 'all' };
    if (p === '/notifications/mentions') return { page: 'notifications', tab: 'mentions' };
    let m = p.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)$/);
    if (m && !RESERVED.has(m[1].toLowerCase())) return { page: 'tweet', screen: m[1], id: m[2] };
    m = p.match(/^\/([A-Za-z0-9_]{1,15})(?:\/(with_replies|media))?$/);
    if (m && !RESERVED.has(m[1].toLowerCase())) return { page: 'profile', screen: m[1], tab: m[2] || 'tweets' };
    return null;
  }

  function mountShell() {
    if (host) return;
    host = document.createElement('div');
    host.id = 'ranch-classic-host';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CSS}</style><div class="app ${state.night ? 'night' : ''}">
      <header class="top"><div class="top-in">
        <nav class="left">
          <a href="/home" data-route class="nav" data-nav="home">${svg('home')}<span>Home</span></a>
          <a href="/notifications" data-route class="nav" data-nav="notifications">${svg('bell')}<span>Notifications</span><b class="badge" hidden></b></a>
          <a href="/messages" data-x class="nav" data-nav="messages">${svg('mail')}<span>Messages</span><b class="badge dm" hidden></b></a>
        </nav>
        <a href="/home" data-route class="bird" title="Home">${svg('bird')}</a>
        <div class="right">
          <form class="search"><input type="search" placeholder="Search Twitter" aria-label="Search Twitter"><button type="submit" aria-label="Search">${svg('search')}</button></form>
          <button class="me" type="button" aria-label="Profile and settings"><img alt=""></button>
          <button class="tweet-btn" type="button">Tweet</button>
        </div>
      </div></header>
      <div class="menu" hidden></div>
      <main class="page"></main>
      <div class="toast" hidden></div>
      <div class="modal-wrap" hidden></div>
    </div>`;
    root = shadow.querySelector('.app');
    main = shadow.querySelector('main');
    toastEl = shadow.querySelector('.toast');
    (document.body || document.documentElement).appendChild(host);
    wireShell(shadow);
  }
  function setActive(on) {
    state.active = on;
    document.documentElement.classList.toggle('ranch-classic-on', on);
    if (host) host.style.display = on ? '' : 'none';
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { toastEl.hidden = true; }, 3500);
  }

  // ==================================================================== navigation
  const nativePush = history.pushState.bind(history);
  function go(url, replace) {
    const u = new URL(url, location.href);
    if (u.origin !== location.origin) { bridge.openOutside && bridge.openOutside(u.href); return; }
    if (!routeOf(u.pathname)) { location.assign(u.href); return; } // X's own page
    if (replace) history.replaceState(null, '', u.href); else nativePush(null, '', u.href);
    route();
  }
  function route() {
    const r = signedIn() ? routeOf(location.pathname) : null;
    if (!r) { setActive(false); return; }
    mountShell();
    setActive(true);
    for (const a of root.querySelectorAll('.nav')) a.classList.toggle('on', a.dataset.nav === r.page);
    const token = ++state.renderToken;
    root.scrollTop = 0;
    viewer().catch(() => {});
    main.innerHTML = '<div class="loading"><span></span></div>';
    const done = (p) => p.catch((e) => { if (token === state.renderToken) showError(e); });
    if (r.page === 'home') done(pageHome(token));
    else if (r.page === 'profile') done(pageProfile(r, token));
    else if (r.page === 'tweet') done(pageTweet(r, token));
    else if (r.page === 'notifications') done(pageNotifications(r, token));
  }
  function showError(e) {
    main.innerHTML = `<div class="wide"><div class="card error"><h3>Couldn't load this page</h3><p>${esc(e.message || e)}</p>
      <p><button type="button" class="btn" data-act="retry">Try again</button> <button type="button" class="btn ghost" data-act="new-ui">Open it in the new Twitter</button></p></div></div>`;
  }
  // X's own navigation (e.g. from its Messages page) can land on a page we draw
  for (const k of ['pushState', 'replaceState']) {
    const orig = history[k];
    history[k] = function (...args) {
      const before = location.pathname;
      const r = orig.apply(this, args);
      if (location.pathname !== before) setTimeout(() => { const rt = signedIn() && routeOf(location.pathname); if (rt || state.active) route(); }, 0);
      return r;
    };
  }
  window.addEventListener('popstate', () => route());

  // ==================================================================== rendering pieces
  const avatar = (u, size, cls) => `<img class="av ${cls || ''}" src="${esc(u && u.avatar)}" alt="" width="${size}" height="${size}" loading="lazy">`;
  const badge = (u) => (u && u.verified ? `<span class="verified" title="Verified account">${svg('check')}</span>` : '') + (u && u.locked ? '<span class="lock" title="Protected Tweets">🔒</span>' : '');
  function mediaHtml(media) {
    if (!media || !media.length) return '';
    const photos = media.filter((m) => m.type === 'photo');
    const video = media.find((m) => m.type === 'video' || m.type === 'animated_gif');
    if (video) {
      const variants = ((video.video_info && video.video_info.variants) || []).filter((v) => v.content_type === 'video/mp4').sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const src = variants[0] && variants[0].url;
      const gif = video.type === 'animated_gif';
      return `<div class="media one"><video src="${esc(src)}" poster="${esc(video.media_url_https)}" ${gif ? 'autoplay loop muted playsinline' : 'controls preload="none"'}></video>${gif ? '<span class="gif">GIF</span>' : ''}</div>`;
    }
    const n = Math.min(photos.length, 4);
    return `<div class="media n${n}">${photos.slice(0, 4).map((p) => `<a href="${esc(p.media_url_https)}?name=large" data-photo><img src="${esc(p.media_url_https)}?name=small" alt="${esc(p.ext_alt_text || '')}" loading="lazy"></a>`).join('')}</div>`;
  }
  function cardHtml(card) {
    if (!card || !card.binding_values) return '';
    const v = {};
    for (const b of card.binding_values) v[b.key] = b.value;
    const title = v.title && v.title.string_value;
    if (!title) return '';
    const url = (v.card_url && v.card_url.string_value) || card.url;
    const img = (v.thumbnail_image_large || v.thumbnail_image || v.summary_photo_image || {}).image_value;
    const domain = (v.vanity_url && v.vanity_url.string_value) || (v.domain && v.domain.string_value) || '';
    return `<a class="link-card" href="${esc(url)}" data-outside>${img ? `<img src="${esc(img.url)}" alt="" loading="lazy">` : ''}<div><b>${esc(title)}</b>${v.description ? `<p>${esc(v.description.string_value)}</p>` : ''}<span>${esc(domain)}</span></div></a>`;
  }
  function quoteHtml(q) {
    if (!q) return '';
    return `<div class="quote" data-open="/${esc(q.user && q.user.screen)}/status/${q.id}">
      <div class="q-head"><b>${esc(q.user && q.user.name)}</b>${badge(q.user)} <span class="dim">@${esc(q.user && q.user.screen)}</span></div>
      <div class="q-text">${renderText(q.text, q.entities, q.range)}</div>${mediaHtml(q.media)}</div>`;
  }
  function actionsHtml(t) {
    return `<div class="actions">
      <button type="button" data-act="reply" title="Reply">${svg('reply')}<span>${compact(t.replies)}</span></button>
      <button type="button" data-act="retweet" class="${t.retweeted ? 'rt-on' : ''}" title="Retweet">${svg('retweet')}<span>${compact(t.retweets)}</span></button>
      <button type="button" data-act="like" class="${t.liked ? 'like-on' : ''}" title="Like">${svg(t.liked ? 'heartFull' : 'heart')}<span>${compact(t.likes)}</span></button>
      <button type="button" data-act="copy" title="Copy link to Tweet">${svg('link')}</button>
    </div>`;
  }
  function tweetHtml(item) {
    let t = item.tweet;
    let context = '';
    if (item.pinned) context = `<div class="context">📌 Pinned Tweet</div>`;
    if (t.rt) {
      context = `<div class="context">${svg('retweet')}<a href="/${esc(t.user.screen)}" data-route>${esc(t.user.name)}</a> Retweeted</div>`;
      t = t.rt;
    }
    state.cache.set(t.id, t);
    const u = t.user || {};
    const replying = t.replyTo && item.showReplying !== false && !(item.threadPart && item.threadIndex) ? `<div class="replying">Replying to <a href="/${esc(t.replyTo)}" data-route>@${esc(t.replyTo)}</a></div>` : '';
    return `<article class="tweet ${item.threadPart && !item.threadEnd ? 'thread' : ''}" data-id="${t.id}" data-open="/${esc(u.screen)}/status/${t.id}">
      ${context}
      <a href="/${esc(u.screen)}" data-route class="t-av">${avatar(u, 48)}</a>
      <div class="t-body">
        <div class="t-head"><a href="/${esc(u.screen)}" data-route class="who"><b>${esc(u.name)}</b>${badge(u)} <span class="dim">@${esc(u.screen)}</span></a>
          <span class="dim">·</span> <a href="/${esc(u.screen)}/status/${t.id}" data-route class="dim time" title="${esc(longDate(t.created))}">${esc(ago(t.created))}</a></div>
        ${replying}
        <div class="t-text">${renderText(t.text, t.entities, t.range)}</div>
        ${mediaHtml(t.media)}${t.quote ? quoteHtml(t.quote) : cardHtml(t.card)}
        ${actionsHtml(t)}
      </div>
    </article>`;
  }
  function focalHtml(t) {
    state.cache.set(t.id, t);
    const u = t.user || {};
    return `<article class="tweet focal" data-id="${t.id}">
      <div class="f-head"><a href="/${esc(u.screen)}" data-route>${avatar(u, 48)}</a>
        <a href="/${esc(u.screen)}" data-route class="who col"><b>${esc(u.name)}</b>${badge(u)}<span class="dim">@${esc(u.screen)}</span></a></div>
      ${t.replyTo ? `<div class="replying">Replying to <a href="/${esc(t.replyTo)}" data-route>@${esc(t.replyTo)}</a></div>` : ''}
      <div class="f-text">${renderText(t.text, t.entities, t.range)}</div>
      ${mediaHtml(t.media)}${t.quote ? quoteHtml(t.quote) : cardHtml(t.card)}
      <div class="f-time dim">${esc(longDate(t.created))}</div>
      <div class="f-stats"><span><b>${full(t.retweets)}</b> Retweets</span><span><b>${full(t.likes)}</b> Likes</span></div>
      ${actionsHtml(t)}
    </article>`;
  }
  function streamHtml(items) {
    return items.map((it) => (it.kind === 'tweet' ? tweetHtml(it) : '')).join('');
  }
  function footerHtml() {
    const y = new Date().getFullYear();
    return `<div class="card footer">© ${y} Twitter <a href="https://x.com/tos" data-x>Terms</a> <a href="https://x.com/privacy" data-x>Privacy policy</a> <a href="https://help.x.com" data-outside>Help Center</a> <span class="dim">· Classic layout by the Ranch Twitter app</span></div>`;
  }

  // Infinite scroll: load the next page when the bottom comes into view
  function moreLoader(container, loadMore) {
    const sentinel = document.createElement('div');
    sentinel.className = 'more';
    container.appendChild(sentinel);
    let busy = false;
    const io = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting || busy) return;
      busy = true;
      sentinel.innerHTML = '<div class="loading small"><span></span></div>';
      try {
        const res = await loadMore();
        sentinel.innerHTML = '';
        if (!res) { io.disconnect(); sentinel.remove(); return; }
      } catch (e) {
        sentinel.innerHTML = `<p class="dim center">${esc(e.message)}</p>`;
      }
      busy = false;
    }, { root: null, rootMargin: '600px' });
    io.observe(sentinel);
  }

  // ==================================================================== viewer
  async function viewer() {
    if (state.me) return state.me;
    const st = window.__INITIAL_STATE__ || {};
    const id = (st.session && st.session.user_id) || (cookie('twid') || '').replace(/^u=/, '');
    let screen = st.entities && st.entities.users && st.entities.users.entities && st.entities.users.entities[id] && st.entities.users.entities[id].screen_name;
    let u = null;
    try {
      if (screen) u = normUser((await gql('UserByScreenName', { screen_name: screen, withGrokTranslatedBio: false })).user);
      else if (id && api.ops.UserByRestId !== undefined) u = normUser((await gql('UserByRestId', { userId: id, withSafetyModeUserFields: true })).user);
    } catch { /* show what we have */ }
    state.me = u || { id, screen: screen || '', name: screen || '', avatar: '' };
    const img = root.querySelector('.me img');
    if (img) img.src = state.me.avatar || '';
    return state.me;
  }

  // ==================================================================== pages
  async function pageHome(token) {
    const me = await viewer();
    main.innerHTML = `<div class="cols">
      <aside class="side">
        <div class="card dash">
          <a href="/${esc(me.screen)}" data-route class="dash-banner" style="${me.banner ? `background-image:url('${esc(me.banner)}/600x200')` : ''}"></a>
          <div class="dash-body">
            <a href="/${esc(me.screen)}" data-route>${avatar(me, 72, 'dash-av')}</a>
            <a href="/${esc(me.screen)}" data-route class="dash-name"><b>${esc(me.name)}</b><span class="dim">@${esc(me.screen)}</span></a>
            <div class="dash-stats">
              <a href="/${esc(me.screen)}" data-route><span class="dim">Tweets</span><b>${compact(me.tweets) || 0}</b></a>
              <a href="/${esc(me.screen)}/following" data-x><span class="dim">Following</span><b>${compact(me.following) || 0}</b></a>
              <a href="/${esc(me.screen)}/followers" data-x><span class="dim">Followers</span><b>${compact(me.followers) || 0}</b></a>
            </div>
          </div>
        </div>
      </aside>
      <section class="center">
        <div class="card composer-inline">${avatar(me, 32)}<button type="button" class="fake-input" data-act="compose">What's happening?</button></div>
        <div class="card stream"></div>
      </section>
      <aside class="side right">${footerHtml()}</aside>
    </div>`;
    const stream = main.querySelector('.stream');
    let cursor = null;
    const load = async () => {
      const vars = { count: 20, includePromotedContent: false, latestControlAvailable: true, requestContext: 'launch' };
      if (cursor) vars.cursor = cursor;
      const data = await gql('HomeLatestTimeline', vars, { post: true });
      if (token !== state.renderToken) return false;
      const tl = data.home && data.home.home_timeline_urt;
      const { items, bottom } = readTimeline(tl && tl.instructions);
      stream.querySelector('.more')?.insertAdjacentHTML('beforebegin', streamHtml(items));
      const added = items.length > 0 && bottom && bottom !== cursor;
      cursor = bottom;
      return added;
    };
    stream.innerHTML = '';
    moreLoader(stream, load);
  }

  async function pageProfile(r, token) {
    const data = await gql('UserByScreenName', { screen_name: r.screen, withGrokTranslatedBio: false });
    if (token !== state.renderToken) return;
    const u = normUser(data.user);
    if (!u) { main.innerHTML = `<div class="wide"><div class="card error"><h3>Sorry, that page doesn't exist!</h3><p>@${esc(r.screen)} isn't available.</p></div></div>`; return; }
    const me = await viewer();
    const isMe = me && me.id === u.id;
    const joined = u.created ? new Date(u.created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
    const url = u.url ? `<div class="p-line">${svg('link')}<a href="${esc(u.url.expanded_url)}" data-outside>${esc(u.url.display_url)}</a></div>` : '';
    main.innerHTML = `<div class="profile">
      <div class="p-banner" style="${u.banner ? `background-image:url('${esc(u.banner)}/1500x500')` : ''}"></div>
      <div class="p-nav"><div class="p-nav-in">
        <div class="p-av-wrap">${avatar({ avatar: u.avatar.replace('_bigger.', '_400x400.') }, 200, 'p-av')}</div>
        <div class="p-counts">
          <a href="/${esc(u.screen)}" data-route class="${r.tab !== 'likes' ? 'on' : ''}"><span>Tweets</span><b>${full(u.tweets)}</b></a>
          <a href="/${esc(u.screen)}/following" data-x><span>Following</span><b>${full(u.following)}</b></a>
          <a href="/${esc(u.screen)}/followers" data-x><span>Followers</span><b>${full(u.followers)}</b></a>
          <a href="/${esc(u.screen)}/likes" data-x><span>Likes</span><b>${full(u.likes)}</b></a>
        </div>
        <div class="p-actions">${isMe ? '<a href="/settings/profile" data-x class="btn ghost">Edit profile</a>'
          : `<button type="button" class="btn ${u.followed ? 'following' : 'ghost'}" data-act="follow" data-user="${esc(u.id)}" data-on="${u.followed ? 1 : 0}">${u.followed ? 'Following' : 'Follow'}</button>`}</div>
      </div></div>
      <div class="cols">
        <aside class="side p-info">
          <h1>${esc(u.name)}${badge(u)}</h1>
          <div class="dim">@${esc(u.screen)}</div>
          ${u.bio ? `<p class="bio">${renderText(u.bio, u.bioEntities || {}, null)}</p>` : ''}
          ${u.location ? `<div class="p-line">${svg('pin')}<span>${esc(u.location)}</span></div>` : ''}
          ${url}
          ${joined ? `<div class="p-line">${svg('calendar')}<span>Joined ${esc(joined)}</span></div>` : ''}
        </aside>
        <section class="center">
          <div class="card">
            <nav class="tabs">
              <a href="/${esc(u.screen)}" data-route class="${r.tab === 'tweets' ? 'on' : ''}">Tweets</a>
              <a href="/${esc(u.screen)}/with_replies" data-route class="${r.tab === 'with_replies' ? 'on' : ''}">Tweets &amp; replies</a>
              <a href="/${esc(u.screen)}/media" data-route class="${r.tab === 'media' ? 'on' : ''}">Media</a>
            </nav>
            <div class="stream"></div>
          </div>
        </section>
        <aside class="side right">${footerHtml()}</aside>
      </div>
    </div>`;
    const stream = main.querySelector('.stream');
    if (u.locked && !u.followed && !isMe) { stream.innerHTML = `<div class="empty"><h3>This account's Tweets are protected.</h3><p class="dim">Only confirmed followers have access to @${esc(u.screen)}'s Tweets.</p></div>`; return; }
    const op = r.tab === 'with_replies' ? 'UserTweetsAndReplies' : r.tab === 'media' ? 'UserMedia' : 'UserTweets';
    let cursor = null;
    const load = async () => {
      const vars = { userId: u.id, count: 20, includePromotedContent: false, withQuickPromoteEligibilityTweetFields: false, withVoice: true, withCommunity: true, withClientEventToken: false, withBirdwatchNotes: false, withV2Timeline: true };
      if (cursor) vars.cursor = cursor;
      const d = await gql(op, vars);
      if (token !== state.renderToken) return false;
      const res = d.user && d.user.result;
      const tl = res && ((res.timeline_v2 && res.timeline_v2.timeline) || (res.timeline && res.timeline.timeline));
      let { items, bottom } = readTimeline(tl && tl.instructions);
      // Media tab: also read the grid module
      if (op === 'UserMedia' && tl) {
        for (const ins of tl.instructions || []) for (const it of ins.moduleItems || []) {
          const t = it.item && it.item.itemContent && it.item.itemContent.tweet_results && normTweet(it.item.itemContent.tweet_results.result);
          if (t) items.push({ kind: 'tweet', tweet: t });
        }
      }
      stream.querySelector('.more')?.insertAdjacentHTML('beforebegin', streamHtml(items.map((i) => ({ ...i, showReplying: true }))));
      const added = items.length > 0 && bottom && bottom !== cursor;
      cursor = bottom;
      return added;
    };
    moreLoader(stream, load);
  }

  async function pageTweet(r, token) {
    const vars = { focalTweetId: r.id, with_rux_injections: false, rankingMode: 'Relevance', includePromotedContent: false, withCommunity: true, withQuickPromoteEligibilityTweetFields: false, withBirdwatchNotes: false, withVoice: true };
    const data = await gql('TweetDetail', vars);
    if (token !== state.renderToken) return;
    const tl = data.threaded_conversation_with_injections_v2;
    const { items, bottom } = readTimeline(tl && tl.instructions);
    const ix = items.findIndex((i) => i.tweet && i.tweet.id === r.id);
    const before = ix > 0 ? items.slice(0, ix) : [];
    const focal = ix >= 0 ? items[ix].tweet : null;
    const after = ix >= 0 ? items.slice(ix + 1) : items;
    if (!focal) throw new Error('This Tweet is unavailable.');
    main.innerHTML = `<div class="wide"><div class="card conv">
      <div class="ancestors">${before.map((i) => tweetHtml({ ...i, threadPart: true, threadEnd: false })).join('')}</div>
      ${focalHtml(focal)}
      <div class="card composer-inline reply-box">${avatar(state.me || {}, 32)}<button type="button" class="fake-input" data-act="reply" data-id="${focal.id}">Tweet your reply</button></div>
      <div class="stream">${streamHtml(after)}</div>
    </div></div>`;
    document.title = `${focal.user ? focal.user.name : ''} on Twitter`;
    let cursor = bottom;
    if (cursor) {
      moreLoader(main.querySelector('.stream'), async () => {
        const d = await gql('TweetDetail', { ...vars, cursor, referrer: 'tweet' });
        if (token !== state.renderToken) return false;
        const t2 = d.threaded_conversation_with_injections_v2;
        const res = readTimeline(t2 && t2.instructions);
        main.querySelector('.stream .more')?.insertAdjacentHTML('beforebegin', streamHtml(res.items.filter((i) => i.tweet.id !== r.id)));
        const added = res.items.length > 0 && res.bottom && res.bottom !== cursor;
        cursor = res.bottom;
        return added;
      });
    }
  }

  const NOTIF_ICON = { heart_icon: 'heart', retweet_icon: 'retweet', person_icon: 'person', bird_icon: 'bird', reply_icon: 'reply', bell_icon: 'bell' };
  async function pageNotifications(r, token) {
    main.innerHTML = `<div class="wide"><div class="card">
      <h2 class="card-title">Notifications</h2>
      <nav class="tabs"><a href="/notifications" data-route class="${r.tab === 'all' ? 'on' : ''}">All</a><a href="/notifications/mentions" data-route class="${r.tab === 'mentions' ? 'on' : ''}">Mentions</a></nav>
      <div class="stream"></div></div></div>`;
    const stream = main.querySelector('.stream');
    let cursor = null;
    let useGraphql = false;
    const loadRest = async () => {
      const qs = new URLSearchParams({ include_profile_interstitial_type: '1', include_blocking: '1', include_blocked_by: '1', include_followed_by: '1',
        include_want_retweets: '1', include_mute_edge: '1', include_can_dm: '1', skip_status: '1', cards_platform: 'Web-12', include_cards: '1',
        include_ext_alt_text: 'true', include_quote_count: 'true', include_reply_count: '1', tweet_mode: 'extended', include_entities: 'true',
        include_user_entities: 'true', send_error_codes: 'true', simple_quoted_tweet: 'true', count: '20' });
      if (cursor) qs.set('cursor', cursor);
      const d = await rest(`2/notifications/${r.tab === 'mentions' ? 'mentions' : 'all'}.json?${qs}`);
      const g = d.globalObjects || {};
      const users = g.users || {};
      const tweets = g.tweets || {};
      const notes = g.notifications || {};
      let html = '';
      let bottom = null;
      for (const ins of (d.timeline && d.timeline.instructions) || []) {
        for (const e of (ins.addEntries && ins.addEntries.entries) || []) {
          const c = e.content || {};
          if (c.operation && c.operation.cursor) { if (c.operation.cursor.cursorType === 'Bottom') bottom = c.operation.cursor.value; continue; }
          const item = c.item && c.item.content;
          if (!item) continue;
          if (item.tweet && tweets[item.tweet.id]) html += tweetHtml({ kind: 'tweet', tweet: legacyTweet(tweets[item.tweet.id], users, tweets) });
          else if (item.notification && notes[item.notification.id]) {
            const n = notes[item.notification.id];
            const tpl = (n.template && n.template.aggregateUserActionsV1) || {};
            const from = (tpl.fromUsers || []).map((x) => users[x.user && x.user.id]).filter(Boolean).slice(0, 8);
            const target = (tpl.targetObjects || []).map((x) => x.tweet && tweets[x.tweet.id]).filter(Boolean)[0];
            html += notificationHtml(NOTIF_ICON[n.icon && n.icon.id] || 'bell', n.message && n.message.text, from.map((x) => normUser({ legacy: x, rest_id: x.id_str })),
              target ? legacyTweet(target, users, tweets) : null, n.timestampMs);
          }
        }
      }
      return { html, bottom };
    };
    const loadGraphql = async () => {
      const vars = { timeline_type: r.tab === 'mentions' ? 'Mentions' : 'All', count: 20 };
      if (cursor) vars.cursor = cursor;
      const d = await gql('NotificationsTimeline', vars);
      const tl = d.viewer_v2 && d.viewer_v2.user_results && d.viewer_v2.user_results.result && d.viewer_v2.user_results.result.notification_timeline && d.viewer_v2.user_results.result.notification_timeline.timeline;
      const { items, bottom } = readTimeline(tl && tl.instructions);
      let html = '';
      for (const it of items) {
        if (it.kind === 'tweet') html += tweetHtml(it);
        else {
          const n = it.n;
          const tpl = n.template || {};
          const from = (tpl.from_users || []).map((x) => normUser(x.user_results)).filter(Boolean);
          const target = (tpl.target_objects || []).map((x) => x.tweet_results && normTweet(x.tweet_results.result)).filter(Boolean)[0];
          html += notificationHtml(NOTIF_ICON[n.notification_icon] || 'bell', n.rich_message && n.rich_message.text, from, target, n.timestamp_ms);
        }
      }
      return { html, bottom };
    };
    moreLoader(stream, async () => {
      let res;
      if (!useGraphql) { try { res = await loadRest(); } catch (e) { if (!api.ops.NotificationsTimeline) throw e; useGraphql = true; } }
      if (useGraphql) res = await loadGraphql();
      if (token !== state.renderToken) return false;
      stream.querySelector('.more')?.insertAdjacentHTML('beforebegin', res.html || (cursor ? '' : '<div class="empty"><p class="dim">Nothing to see here yet.</p></div>'));
      const added = !!res.html && res.bottom && res.bottom !== cursor;
      cursor = res.bottom;
      return added;
    });
  }
  function notificationHtml(icon, text, users, target, ts) {
    return `<div class="notif" ${target ? `data-open="/${esc(target.user && target.user.screen)}/status/${target.id}"` : ''}>
      <div class="n-icon ${icon}">${svg(icon === 'heart' ? 'heartFull' : icon)}</div>
      <div class="n-body">
        <div class="n-avs">${users.map((u) => `<a href="/${esc(u.screen)}" data-route title="${esc(u.name)}">${avatar(u, 32)}</a>`).join('')}</div>
        <div class="n-text">${esc(text || '')}${ts ? ` <span class="dim">· ${esc(ago(Number(ts)))}</span>` : ''}</div>
        ${target ? `<div class="n-target dim">${renderText(target.text, target.entities, target.range)}</div>` : ''}
      </div></div>`;
  }

  // ==================================================================== actions
  async function toggleLike(btn, t) {
    const on = !t.liked;
    t.liked = on;
    t.likes = (t.likes || 0) + (on ? 1 : -1);
    paintActions(t);
    try { await gql(on ? 'FavoriteTweet' : 'UnfavoriteTweet', { tweet_id: t.id }); }
    catch (e) { t.liked = !on; t.likes += on ? -1 : 1; paintActions(t); toast(`Couldn't ${on ? 'like' : 'unlike'}: ${e.message}`); }
  }
  async function toggleRetweet(t) {
    const on = !t.retweeted;
    t.retweeted = on;
    t.retweets = (t.retweets || 0) + (on ? 1 : -1);
    paintActions(t);
    try {
      if (on) await gql('CreateRetweet', { tweet_id: t.id, dark_request: false });
      else await gql('DeleteRetweet', { source_tweet_id: t.id, dark_request: false });
      toast(on ? 'Retweeted' : 'Retweet removed');
    } catch (e) { t.retweeted = !on; t.retweets += on ? -1 : 1; paintActions(t); toast(`Couldn't retweet: ${e.message}`); }
  }
  function paintActions(t) {
    for (const art of root.querySelectorAll(`article[data-id="${t.id}"]`)) {
      const acts = art.querySelector(':scope > .t-body > .actions, :scope > .actions');
      if (acts) acts.outerHTML = actionsHtml(t);
      const stats = art.querySelector('.f-stats');
      if (stats) stats.innerHTML = `<span><b>${full(t.retweets)}</b> Retweets</span><span><b>${full(t.likes)}</b> Likes</span>`;
    }
  }
  function retweetMenu(btn, t) {
    showMenu(btn, [
      [t.retweeted ? 'Undo Retweet' : 'Retweet', () => toggleRetweet(t)],
      ['Quote Tweet', () => openComposer({ quote: t })],
    ]);
  }
  async function follow(btn) {
    const on = btn.dataset.on !== '1';
    btn.disabled = true;
    try {
      await rest(`1.1/friendships/${on ? 'create' : 'destroy'}.json`, { method: 'POST', form: { user_id: btn.dataset.user, include_profile_interstitial_type: '1' } });
      btn.dataset.on = on ? '1' : '0';
      btn.textContent = on ? 'Following' : 'Follow';
      btn.className = `btn ${on ? 'following' : 'ghost'}`;
    } catch (e) { toast(`Couldn't ${on ? 'follow' : 'unfollow'}: ${e.message}`); }
    btn.disabled = false;
  }

  // ==================================================================== composer
  function openComposer({ replyTo, quote } = {}) {
    const wrap = root.querySelector('.modal-wrap');
    const me = state.me || {};
    const title = replyTo ? `Reply to ${esc(replyTo.user ? replyTo.user.name : '')}` : quote ? 'Quote Tweet' : 'Compose new Tweet';
    wrap.innerHTML = `<div class="modal" role="dialog" aria-label="${title}">
      <div class="m-head"><h3>${title}</h3><button type="button" class="x" data-act="close" aria-label="Close">×</button></div>
      ${replyTo ? `<div class="m-context">${tweetHtml({ kind: 'tweet', tweet: replyTo })}</div>` : ''}
      <div class="m-body">${avatar(me, 32)}<textarea maxlength="4000" placeholder="${replyTo ? 'Tweet your reply' : quote ? 'Add a comment' : 'What\'s happening?'}"></textarea></div>
      ${quote ? `<div class="m-quote">${quoteHtml(quote)}</div>` : ''}
      <div class="m-foot"><span class="count dim">280</span><button type="button" class="btn tweet-send" disabled>${replyTo ? 'Reply' : 'Tweet'}</button></div>
    </div>`;
    wrap.hidden = false;
    const ta = wrap.querySelector('textarea');
    const send = wrap.querySelector('.tweet-send');
    const count = wrap.querySelector('.count');
    ta.focus();
    ta.addEventListener('input', () => {
      const left = 280 - Array.from(ta.value).length;
      count.textContent = String(left);
      count.classList.toggle('over', left < 0);
      send.disabled = !ta.value.trim() || left < 0;
    });
    send.addEventListener('click', async () => {
      send.disabled = true;
      send.textContent = 'Sending…';
      const vars = { tweet_text: ta.value, dark_request: false, media: { media_entities: [], possibly_sensitive: false }, semantic_annotation_ids: [] };
      if (replyTo) vars.reply = { in_reply_to_tweet_id: replyTo.id, exclude_reply_user_ids: [] };
      if (quote) vars.attachment_url = `https://x.com/${quote.user ? quote.user.screen : 'i'}/status/${quote.id}`;
      try {
        const d = await gql('CreateTweet', vars);
        const t = d.create_tweet && d.create_tweet.tweet_results && normTweet(d.create_tweet.tweet_results.result);
        closeModal();
        toast('Your Tweet was sent.');
        const stream = main.querySelector('.center .stream, .conv .stream');
        if (t && stream) stream.insertAdjacentHTML('afterbegin', tweetHtml({ kind: 'tweet', tweet: t }));
      } catch (e) {
        send.disabled = false;
        send.textContent = replyTo ? 'Reply' : 'Tweet';
        toast(`Couldn't send: ${e.message}`);
      }
    });
  }
  function closeModal() {
    const wrap = root.querySelector('.modal-wrap');
    wrap.hidden = true;
    wrap.innerHTML = '';
  }
  function openPhoto(href) {
    const wrap = root.querySelector('.modal-wrap');
    wrap.innerHTML = `<div class="photo-view" data-act="close"><img src="${esc(href)}" alt=""></div>`;
    wrap.hidden = false;
  }

  // ==================================================================== menus
  function showMenu(anchor, entries) {
    const menu = root.querySelector('.menu');
    menu.innerHTML = entries.map(([label], i) => (label === '-' ? '<hr>' : `<button type="button" data-i="${i}">${esc(label)}</button>`)).join('');
    const r = anchor.getBoundingClientRect();
    menu.style.top = `${r.bottom + 6}px`;
    menu.style.left = `${Math.min(window.innerWidth - 230, Math.max(8, r.left - 80))}px`;
    menu.hidden = false;
    menu.onclick = (e) => {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      menu.hidden = true;
      entries[Number(b.dataset.i)][1]();
    };
  }
  function meMenu(btn) {
    const me = state.me || {};
    showMenu(btn, [
      [`${me.name || 'Profile'}  @${me.screen || ''}`, () => go(`/${me.screen}`)],
      ['-'],
      ['Lists', () => location.assign(`/${me.screen}/lists`)],
      ['Bookmarks', () => location.assign('/i/bookmarks')],
      ['Settings and privacy', () => location.assign('/settings')],
      ['App settings', () => bridge.openSettings && bridge.openSettings()],
      ['-'],
      [state.night ? 'Night mode: on' : 'Night mode: off', () => {
        state.night = !state.night;
        try { localStorage.setItem('ranch-classic-night', state.night ? '1' : '0'); } catch { /* ignore */ }
        root.classList.toggle('night', state.night);
      }],
      ['Use the new Twitter', () => bridge.setClassic && bridge.setClassic(false)],
      ['-'],
      ['Log out', () => location.assign('/logout')],
    ]);
  }

  // ==================================================================== events
  function wireShell(shadow) {
    shadow.addEventListener('click', (e) => {
      const menu = root.querySelector('.menu');
      if (!menu.hidden && !e.target.closest('.menu')) menu.hidden = true;
      const el = e.target;
      const act = el.closest('[data-act]');
      if (act) {
        e.preventDefault();
        e.stopPropagation();
        const art = act.closest('article[data-id]');
        const t = art ? state.cache.get(art.dataset.id) : (act.dataset.id ? state.cache.get(act.dataset.id) : null);
        switch (act.dataset.act) {
          case 'like': if (t) toggleLike(act, t); break;
          case 'retweet': if (t) retweetMenu(act, t); break;
          case 'reply': if (t) openComposer({ replyTo: t }); break;
          case 'compose': openComposer(); break;
          case 'copy': if (t) { navigator.clipboard.writeText(`https://x.com/${t.user ? t.user.screen : 'i'}/status/${t.id}`).then(() => toast('Link copied')); } break;
          case 'follow': follow(act); break;
          case 'close': closeModal(); break;
          case 'retry': route(); break;
          case 'new-ui': setActive(false); location.reload(); break;
          default: break;
        }
        return;
      }
      const photo = el.closest('a[data-photo]');
      if (photo) { e.preventDefault(); openPhoto(photo.getAttribute('href')); return; }
      const a = el.closest('a[href]');
      if (a) {
        if (e.ctrlKey || e.metaKey || e.button !== 0) return;
        e.preventDefault();
        const href = a.getAttribute('href');
        if (a.hasAttribute('data-outside')) { bridge.openOutside && bridge.openOutside(new URL(href, location.href).href); return; }
        if (a.hasAttribute('data-x')) { location.assign(new URL(href, location.href).href); return; }
        go(href);
        return;
      }
      if (el.closest('video, button, textarea, input')) return;
      const open = el.closest('[data-open]');
      if (open && !getSelection().toString()) go(open.dataset.open);
    });
    shadow.querySelector('.me').addEventListener('click', (e) => { e.stopPropagation(); meMenu(e.currentTarget); });
    shadow.querySelector('.tweet-btn').addEventListener('click', () => openComposer());
    shadow.querySelector('.search').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = shadow.querySelector('.search input').value.trim();
      if (q) location.assign(`/search?q=${encodeURIComponent(q)}&src=typed_query`);
    });
    shadow.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); root.querySelector('.menu').hidden = true; } });
    pollBadges();
    setInterval(pollBadges, 60000);
  }
  async function pollBadges() {
    if (!state.active) return;
    try {
      const b = await rest('2/badge_count/badge_count.json?supports_ntab_urt=1');
      const set = (sel, n) => { const el = root.querySelector(sel); if (!el) return; el.hidden = !n; el.textContent = n > 9 ? '9+' : String(n || ''); };
      set('[data-nav="notifications"] .badge', b.ntab_unread_count);
      set('[data-nav="messages"] .badge', b.dm_unread_count);
    } catch { /* ignore */ }
  }

  // ==================================================================== styles
  const CSS = `
  :host { all: initial; }
  .app { --bg: #e6ecf0; --card: #fff; --line: #e6ecf0; --text: #14171a; --dim: #657786; --blue: #1da1f2; --blue-dark: #1991da;
    --hover: #f5f8fa; --like: #e0245e; --rt: #17bf63;
    position: fixed; inset: 0; overflow-y: auto; background: var(--bg); color: var(--text);
    font: 14px/1.3125 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; z-index: 1; }
  .app.night { --bg: #10171e; --card: #15202b; --line: #38444d; --text: #fff; --dim: #8899a6; --hover: #192734; }
  * { box-sizing: border-box; }
  a { color: var(--blue); text-decoration: none; }
  a:hover { text-decoration: underline; }
  button { font: inherit; color: inherit; cursor: pointer; }
  .ic { width: 1.25em; height: 1.25em; fill: currentColor; vertical-align: -0.25em; flex: none; }
  .dim { color: var(--dim); font-weight: normal; }
  .center { text-align: initial; }
  p.center { text-align: center; }
  .top { position: sticky; top: 0; z-index: 10; height: 46px; background: var(--card); border-bottom: 1px solid var(--line); }
  .top-in { max-width: 1190px; height: 100%; margin: 0 auto; padding: 0 10px; display: flex; align-items: center; position: relative; }
  .left { display: flex; height: 100%; }
  .nav { display: flex; align-items: center; gap: 6px; padding: 0 10px; height: 100%; color: var(--dim); font-weight: bold; font-size: 13px;
    border-bottom: 2px solid transparent; position: relative; }
  .nav .ic { width: 22px; height: 22px; }
  .nav:hover, .nav.on { color: var(--blue); text-decoration: none; border-bottom-color: var(--blue); }
  .badge { position: absolute; top: 6px; left: 22px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; border: 2px solid var(--card);
    background: var(--blue); color: #fff; font-size: 11px; line-height: 14px; text-align: center; }
  .bird { position: absolute; left: 50%; transform: translateX(-50%); color: var(--blue); }
  .bird .ic { width: 24px; height: 24px; }
  .right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
  .search { position: relative; }
  .search input { width: 220px; height: 32px; padding: 0 32px 0 12px; border-radius: 21px; border: 1px solid var(--line); background: var(--hover);
    color: var(--text); font: inherit; font-size: 12px; outline: none; }
  .search input:focus { background: var(--card); border-color: var(--blue); }
  .search button { position: absolute; right: 4px; top: 4px; width: 24px; height: 24px; border: 0; background: none; color: var(--dim); padding: 0; }
  .me { width: 32px; height: 32px; border-radius: 50%; border: 0; padding: 0; overflow: hidden; background: var(--line); }
  .me img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .tweet-btn, .btn { border: 1px solid var(--blue); background: var(--blue); color: #fff; border-radius: 100px; padding: 6px 16px; font-weight: bold; font-size: 14px; }
  .tweet-btn:hover, .btn:hover { background: var(--blue-dark); text-decoration: none; }
  .btn:disabled { opacity: .5; cursor: default; }
  .btn.ghost { background: transparent; color: var(--blue); }
  .btn.ghost:hover { background: rgba(29,161,242,.1); }
  .btn.following { background: var(--blue); color: #fff; }
  .btn.following:hover { background: var(--like); border-color: var(--like); }
  .page { padding: 10px 0 40px; }
  .cols { max-width: 1190px; margin: 0 auto; padding: 0 10px; display: grid; grid-template-columns: 290px minmax(0, 1fr) 290px; gap: 10px; align-items: start; }
  .wide { max-width: 600px; margin: 0 auto; }
  @media (max-width: 1000px) { .cols { grid-template-columns: 290px minmax(0, 1fr); } .side.right { display: none; } }
  @media (max-width: 700px) { .cols { grid-template-columns: minmax(0, 1fr); } .side { display: none; } .search input { width: 140px; } .nav span { display: none; } }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
  .card + .card { margin-top: 10px; }
  .card-title { margin: 0; padding: 12px 15px; font-size: 19px; border-bottom: 1px solid var(--line); }
  .dash-banner { display: block; height: 95px; background: var(--blue) center / cover; }
  .dash-body { position: relative; padding: 0 12px 12px 90px; min-height: 60px; }
  .dash-av { position: absolute; left: 8px; top: -36px; border: 2px solid var(--card); border-radius: 50%; width: 72px; height: 72px; }
  .dash-name { display: flex; flex-direction: column; padding-top: 6px; color: var(--text); font-size: 18px; }
  .dash-name .dim { font-size: 13px; }
  .dash-stats { display: flex; gap: 16px; margin: 10px 0 0 -78px; }
  .dash-stats a { display: flex; flex-direction: column; font-size: 11px; font-weight: bold; }
  .dash-stats a b { font-size: 18px; color: var(--blue); }
  .dash-stats a:hover { text-decoration: none; }
  .composer-inline { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #e8f5fd; }
  .night .composer-inline { background: #1c2938; }
  .composer-inline .av { border-radius: 50%; }
  .fake-input { flex: 1; text-align: left; border: 1px solid #a4d9f9; background: var(--card); color: var(--dim); border-radius: 8px; padding: 9px 12px; }
  .fake-input:hover { border-color: var(--blue); }
  .footer { padding: 12px 15px; font-size: 13px; color: var(--dim); line-height: 1.8; }
  .footer a { margin-right: 6px; color: var(--dim); }
  .tweet { position: relative; display: block; padding: 9px 12px 9px 72px; border-bottom: 1px solid var(--line); cursor: pointer; min-height: 70px; }
  .tweet:hover { background: var(--hover); }
  .tweet.thread::before { content: ""; position: absolute; left: 35px; top: 58px; bottom: -10px; width: 2px; background: var(--line); }
  .context { font-size: 12px; color: var(--dim); margin: 0 0 4px; display: flex; align-items: center; gap: 4px; }
  .context a { color: var(--dim); font-weight: normal; }
  .context .ic { width: 14px; height: 14px; margin-left: -22px; margin-right: 6px; }
  .t-av { position: absolute; left: 12px; top: 10px; }
  .t-av .av, .av { border-radius: 50%; object-fit: cover; background: var(--line); display: block; }
  .t-head { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .who { color: var(--text); }
  .who:hover { text-decoration: none; }
  .who:hover b { text-decoration: underline; color: var(--blue); }
  .time:hover { text-decoration: underline; }
  .verified { display: inline-block; color: var(--blue); margin-left: 2px; }
  .verified .ic { width: 15px; height: 15px; vertical-align: -0.2em; }
  .lock { font-size: 11px; margin-left: 2px; }
  .replying { font-size: 13px; color: var(--dim); margin-top: 2px; }
  .t-text { font-size: 14px; line-height: 20px; margin: 2px 0 4px; white-space: normal; word-wrap: break-word; }
  .media { margin-top: 8px; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); display: grid; gap: 2px; position: relative; max-height: 290px; }
  .media.n2 { grid-template-columns: 1fr 1fr; height: 250px; }
  .media.n3, .media.n4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; height: 290px; }
  .media.n3 a:first-child { grid-row: span 2; }
  .media a, .media img, .media video { display: block; width: 100%; height: 100%; object-fit: cover; }
  .media.n1 img { max-height: 290px; height: auto; }
  .media.one { max-height: 330px; background: #000; }
  .media.one video { max-height: 330px; object-fit: contain; }
  .gif { position: absolute; left: 8px; bottom: 8px; background: rgba(0,0,0,.7); color: #fff; font-size: 11px; font-weight: bold; padding: 1px 5px; border-radius: 3px; }
  .quote { margin-top: 8px; border: 1px solid var(--line); border-radius: 12px; padding: 8px 10px; }
  .quote:hover { background: var(--card); border-color: #ccd6dd; }
  .q-head { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
  .q-text { margin-top: 2px; }
  .quote .media { max-height: 160px; }
  .link-card { margin-top: 8px; display: flex; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; color: var(--text); }
  .link-card:hover { text-decoration: none; background: var(--card); }
  .link-card img { width: 125px; height: 125px; object-fit: cover; flex: none; }
  .link-card div { padding: 8px 12px; min-width: 0; }
  .link-card p { margin: 4px 0; color: var(--dim); font-size: 13px; max-height: 3.9em; overflow: hidden; }
  .link-card span { color: var(--dim); font-size: 13px; }
  .actions { display: flex; gap: 0; margin-top: 8px; max-width: 425px; }
  .actions button { flex: 1; display: flex; align-items: center; gap: 4px; border: 0; background: none; color: var(--dim); padding: 0; font-size: 12px; font-weight: bold; text-align: left; }
  .actions button .ic { width: 18px; height: 18px; }
  .actions [data-act="reply"]:hover { color: var(--blue); }
  .actions [data-act="retweet"]:hover, .actions .rt-on { color: var(--rt); }
  .actions [data-act="like"]:hover, .actions .like-on { color: var(--like); }
  .actions [data-act="copy"]:hover { color: var(--blue); }
  .focal { padding: 12px 15px; cursor: default; }
  .focal:hover { background: var(--card); }
  .f-head { display: flex; gap: 10px; align-items: center; }
  .col { display: flex; flex-direction: column; }
  .f-text { font-size: 27px; line-height: 32px; margin: 12px 0 8px; letter-spacing: .01em; word-wrap: break-word; }
  .f-time { margin: 12px 0; font-size: 13px; }
  .f-stats { display: flex; gap: 18px; padding: 10px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font-size: 12px; color: var(--dim); text-transform: uppercase; letter-spacing: .02em; }
  .f-stats b { display: block; font-size: 18px; color: var(--text); letter-spacing: 0; }
  .conv .stream { border-top: 1px solid var(--line); }
  .reply-box { border: 0; border-radius: 0; }
  .tabs { display: flex; border-bottom: 1px solid var(--line); padding: 0 6px; }
  .tabs a { padding: 12px 10px 10px; font-weight: bold; font-size: 18px; color: var(--text); border-bottom: 2px solid transparent; }
  .tabs a.on { color: var(--text); border-bottom-color: var(--blue); }
  .tabs a:hover { text-decoration: none; color: var(--blue); }
  .profile .cols { margin-top: 10px; }
  .p-banner { height: min(380px, 33vw); background: var(--blue) center / cover; }
  .p-nav { background: var(--card); border-bottom: 1px solid var(--line); box-shadow: 0 1px 3px rgba(0,0,0,.08); position: sticky; top: 46px; z-index: 5; }
  .p-nav-in { max-width: 1190px; margin: 0 auto; padding: 0 10px; display: flex; align-items: center; height: 60px; position: relative; }
  .p-av-wrap { width: 290px; flex: none; position: relative; height: 100%; }
  .p-av { position: absolute; left: 10px; top: -150px; width: 200px; height: 200px; border: 4px solid var(--card); border-radius: 50%; }
  .p-counts { display: flex; height: 100%; }
  .p-counts a { display: flex; flex-direction: column; justify-content: center; padding: 0 14px; border-bottom: 3px solid transparent; color: var(--dim); font-size: 12px; font-weight: bold; }
  .p-counts a b { font-size: 18px; color: var(--blue); }
  .p-counts a.on, .p-counts a:hover { border-bottom-color: var(--blue); text-decoration: none; }
  .p-counts a.on span { color: var(--blue); }
  .p-actions { margin-left: auto; }
  .p-info { padding: 40px 0 0 10px; }
  .p-info h1 { margin: 0; font-size: 22px; color: var(--text); }
  .p-info .bio { margin: 10px 0; font-size: 14px; line-height: 20px; }
  .p-line { display: flex; align-items: center; gap: 6px; color: var(--dim); margin: 6px 0; }
  .p-line .ic { width: 16px; height: 16px; }
  .empty { padding: 30px 20px; text-align: center; }
  .empty h3 { margin: 0 0 6px; }
  .notif { display: flex; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--line); cursor: pointer; }
  .notif:hover { background: var(--hover); }
  .n-icon { width: 48px; text-align: right; flex: none; color: var(--blue); }
  .n-icon .ic { width: 26px; height: 26px; }
  .n-icon.heart { color: var(--like); }
  .n-icon.retweet { color: var(--rt); }
  .n-avs { display: flex; gap: 4px; margin-bottom: 6px; }
  .n-avs .av { width: 32px; height: 32px; }
  .n-target { margin-top: 4px; }
  .error { padding: 20px; }
  .error h3 { margin-top: 0; }
  .loading { padding: 30px; display: flex; justify-content: center; }
  .loading span { width: 26px; height: 26px; border-radius: 50%; border: 3px solid var(--line); border-top-color: var(--blue); animation: spin .8s linear infinite; }
  .loading.small { padding: 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .more { min-height: 4px; }
  .menu { position: fixed; z-index: 30; min-width: 220px; background: var(--card); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 3px 12px rgba(0,0,0,.18); padding: 6px 0; }
  .menu button { display: block; width: 100%; text-align: left; border: 0; background: none; padding: 8px 16px; color: var(--text); }
  .menu button:hover { background: var(--blue); color: #fff; }
  .menu hr { border: 0; border-top: 1px solid var(--line); margin: 5px 0; }
  .toast { position: fixed; left: 50%; bottom: 30px; transform: translateX(-50%); z-index: 40; background: var(--blue); color: #fff; padding: 10px 18px; border-radius: 6px; font-weight: bold; box-shadow: 0 3px 12px rgba(0,0,0,.2); }
  .modal-wrap { position: fixed; inset: 0; z-index: 35; background: rgba(0,0,0,.6); display: flex; align-items: flex-start; justify-content: center; padding-top: 60px; overflow-y: auto; }
  .modal-wrap[hidden] { display: none; }
  .modal { width: min(600px, 94vw); background: var(--card); border-radius: 6px; overflow: hidden; }
  .m-head { display: flex; align-items: center; justify-content: center; position: relative; padding: 14px; border-bottom: 1px solid var(--line); background: var(--hover); }
  .m-head h3 { margin: 0; font-size: 15px; }
  .m-head .x { position: absolute; right: 10px; top: 6px; border: 0; background: none; font-size: 26px; color: var(--dim); }
  .m-context .tweet { cursor: default; }
  .m-context .actions { display: none; }
  .m-body { display: flex; gap: 10px; padding: 12px; }
  .m-body .av { border-radius: 50%; }
  .m-body textarea { flex: 1; min-height: 110px; resize: vertical; border: 1px solid #a4d9f9; border-radius: 8px; padding: 10px; font: inherit; font-size: 16px; background: var(--card); color: var(--text); outline: none; }
  .m-body textarea:focus { border-color: var(--blue); }
  .m-quote { padding: 0 12px 12px 54px; }
  .m-foot { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 0 12px 12px; }
  .count.over { color: var(--like); }
  .photo-view { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
  .photo-view img { max-width: 92vw; max-height: 92vh; }
  `;

  // ==================================================================== start
  const hideX = document.createElement('style');
  hideX.textContent = 'html.ranch-classic-on, html.ranch-classic-on body { overflow: hidden !important; } html.ranch-classic-on #react-root { visibility: hidden !important; }';
  (document.head || document.documentElement).appendChild(hideX);
  // Cover X's page right away on pages we draw, so it doesn't flash first
  if (signedIn() && routeOf(location.pathname)) document.documentElement.classList.add('ranch-classic-on');
  const start = () => route();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
