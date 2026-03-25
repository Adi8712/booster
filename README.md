# Booster

**Simple. Local. Actually private.**

A no-frills audio booster that lets you crank the volume past 100% on any website(YouTube, Netflix, Twitch, Spotify, random web videos, you name it) without sending a single byte of your data anywhere.

[![MIT LICENSE](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Adi8712/booster/blob/main/LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/Adi8712/booster)](https://github.com/Adi8712/booster/releases/latest)
[![Mozilla Add-ons](https://img.shields.io/badge/Firefox-GET_THE_ADD--ON-orange?logo=firefox)](https://addons.mozilla.org/en-US/firefox/addon/booster-local/)

### Why I built it

My old favourite audio booster was simple and did exactly what it promised. Then Mozilla removed it stating privacy concerns. That was the moment I lost all trust in "simple" extensions.

So I made Booster myself. Every bit of audio processing happens right in your browser using clean math and the Web Audio API. No tracking, no data collection, no cloud nonsense. Just louder sound, zero latency, and peace of mind.

### Features

- Math-based adaptive boosting up to 1000% with minimal distortion
- Near-zero latency thanks to AudioWorklet
- Works on every audio/video element
- Per-tab settings - your boost level stays exactly where you left it for that tab
- Clean popup with slider
- Works on Firefox and Chromium based browsers from the same codebase

### How to install

**Firefox (recommended & official)**
- Install directly from [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/booster-local/)

**Firefox (sideloading for testing)**
1. Get the latest `booster-firefox.xpi` from the [Releases tab](https://github.com/Adi8712/booster/releases)
2. Go to `about:debugging#/runtime/this-firefox` and load it temporarily

**Chrome / Edge / Brave**
1. Download `booster-chromium.zip` from the [Releases tab](https://github.com/Adi8712/booster/releases)  
2. Unzip it anywhere
3. Open `chrome://extensions/` (or equivalent)
4. Enable Developer mode &rarr; “Load unpacked” &rarr; select the folder

### How to use

1. Click the Booster icon in your toolbar
2. Drag the slider (100% = normal, 1000% = maximum)
3. Done. Every sound on the current tab instantly gets the boost

That’s it. No menus, no accounts, no surprises.

### A quick note on privacy

This extension asks for the absolute minimum permissions needed to boost audio. It does not collect, store, or transmit any personal or browsing data - ever. You can check the code yourself;)

Made for anyone who just wants their videos/music louder without the weird stuff.
