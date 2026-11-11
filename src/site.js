// Everything that makes this app Twitter (x.com). The rest of src/ is the shared Ranch web-app core.
module.exports = {
  name: 'Twitter',
  appId: 'local.ranch.twitter',
  repo: 'KingCreeper531/twitter-desktop',
  home: 'https://x.com/home',
  partition: 'persist:twitter',
  envPrefix: 'RANCHTW',
  background: '#000000',
  // Sites that stay inside the app; everything else opens in your browser
  hosts: ['x.com', 'twitter.com', 'twimg.com', 'pscp.tv', 'periscope.tv'],

  isRedirect: () => false,

  /** Removes share-tracking codes from x.com links. */
  cleanOutbound(url) {
    try {
      const u = new URL(url);
      for (const k of ['s', 't', 'ref_src', 'ref_url']) u.searchParams.delete(k);
      return u.toString();
    } catch { return url; }
  },

  /** t.co links only forward you; look up where they go and open that directly. */
  async resolveRedirect(url, net) {
    if (!/^https:\/\/t\.co\/\w+/.test(url)) return url;
    return new Promise((resolve) => {
      const req = net.request({ url, method: 'HEAD', redirect: 'manual' });
      const done = (v) => { try { req.abort(); } catch { /* ignore */ } resolve(v); };
      const timer = setTimeout(() => done(url), 4000);
      req.on('redirect', (_status, _method, location) => { clearTimeout(timer); done(location || url); });
      req.on('response', () => { clearTimeout(timer); done(url); });
      req.on('error', () => { clearTimeout(timer); done(url); });
      req.end();
    });
  },

  // Settings: shown in the app's settings window and in the Ranch Launcher
  settings: [
    { group: 'Ad blocking' },
    { key: 'hidePromoted', type: 'toggle', default: true, label: 'Hide promoted posts', help: 'Ads in your timeline, replies, search, trends and suggested accounts' },
    { key: 'networkBlocking', type: 'toggle', default: true, label: 'Block ad and tracker requests', help: 'EasyList and EasyPrivacy filter lists' },
    { group: 'Look' },
    { key: 'classicTwitter', type: 'toggle', default: true, label: 'Classic Twitter', help: 'The blue bird logo and the old words: Tweet, Retweet, Tweets and "What\'s happening?"' },
    { group: 'Timeline' },
    { key: 'followingByDefault', type: 'toggle', default: true, label: 'Open on Following', help: 'Starts on the people you follow instead of For you' },
    { key: 'hideWhoToFollow', type: 'toggle', default: true, label: 'Hide "Who to follow"', help: 'Account suggestions in your timeline and the sidebar' },
    { key: 'hideTrends', type: 'toggle', default: false, label: 'Hide trends', help: 'The "What\'s happening" box in the sidebar' },
    { group: 'Clutter' },
    { key: 'hideGrok', type: 'toggle', default: true, label: 'Hide Grok', help: 'Grok in the menu and the Grok buttons on posts' },
    { key: 'hidePremium', type: 'toggle', default: true, label: 'Hide Premium upsells', help: 'Subscribe and verification prompts' },
    { group: 'Privacy' },
    { key: 'skipLinkTracking', type: 'toggle', default: true, label: 'Open links directly', help: 'Skips t.co and removes share-tracking codes' },
    { group: 'App' },
    { key: 'notifications', type: 'toggle', default: true, label: 'Desktop notifications', help: 'Mentions, replies and messages show up in Windows' },
    { key: 'unreadBadge', type: 'toggle', default: true, label: 'Unread badge', help: 'A red dot on the taskbar icon when something is new' },
    { key: 'closeToTray', type: 'toggle', default: true, label: 'Close to tray', help: 'The X button hides the window so notifications keep coming' },
  ],
};
