# Twitter Desktop

An unofficial Twitter (x.com) app for Windows, Android and iPhone, part of the Ranch apps. Install and update it yourself, or through the [Ranch Launcher](https://github.com/KingCreeper531/ranch-launcher).

## Features

- **No ads.** Hides promoted posts in your timeline, replies and search, promoted trends and promoted accounts, and blocks ad and tracker requests (EasyList and EasyPrivacy).
- **Classic Twitter.** The blue bird logo and the old words: Tweet, Retweet, Tweets and "What's happening?". Only buttons, menus and labels change, never what people write. Turn it off in settings.
- **Opens on Following** instead of For you.
- **Less clutter.** Hides Grok, Premium and verification upsells, and "Who to follow". Trends can be hidden too.
- **Direct links.** Links open straight in your browser instead of going through t.co, and copied links lose their share-tracking codes.
- **Desktop notifications and an unread badge** on the taskbar icon. Closing the window keeps it in the tray, so notifications keep coming.
- **Settings** from the gear button in the left menu or **Ctrl+,**. The Ranch Launcher can change the same settings.
- **Auto-update** with a green **Update** button.

## Download

Get the latest release from the [Releases page](https://github.com/KingCreeper531/twitter-desktop/releases/latest):

- `Twitter-Setup-x.y.z.exe`: Windows installer. It updates itself. Windows SmartScreen may warn because the app isn't code-signed: click **More info**, then **Run anyway**.
- `Twitter-Android-x.y.z.apk`: Android app (Android 8 or newer) with the same ad blocking and cleanup. Open it on your phone to install; it updates itself.
- `Twitter-iOS-x.y.z.ipa`: iPhone and iPad app with the same ad blocking, cleanup and classic look. It's unsigned, so install it with [AltStore](https://altstore.io) or [Sideloadly](https://sideloadly.io) using your Apple ID (a free one works).

## Build it yourself

```
npm install
npm start          # run it
npm run dist       # build the installer into dist/
npm run release    # build and publish a GitHub release (needs the GitHub CLI); GitHub then builds the .ipa
```

The page cleanup lives in `src/preload.js`. `scripts/make-ios-script.js` turns it into the iPhone app's `ios/Web/inject.js`.
