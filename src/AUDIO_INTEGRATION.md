# Wiring `src/audio_juice.js` — 5-line patch (index.html is NOT edited)

```js
import { createAudioJuice } from './src/audio_juice.js';                                  // :314 beside service.js import
const AJ = (juice => () => juice || (juice = createAudioJuice(audio())))(null);            // after audio() :1628 — lazy, ctx exists only after first gesture
AJ().coinStreak(combo.count); AJ().levelUp(state.levels[i]);                               // serveAt() :2004, upgradeAt() :2070
{ const c = combo.count; combo.update(dt); if (c && !combo.count) AJ().comboBreak(c); AJ().update(dt); } // tick() :3691, replaces bare combo.update(dt)
if (vip) AJ().vipArrive(); if (info && info.patience - info.wait < 2.5) AJ().patienceWarn(); // :2001 VIP served; :3630 pads loop
```

Remaining hooks, one call each inside the existing success blocks: `AJ().rebirth();` at `doRebirth` :2492 (`sfxBig()`); `AJ().achievement();` at quest `onComplete` :1893 and in `checkAchievements` :2902. `comboBreak` also fires from `onLost` at `startNpcs` :1267. `npcs.js:34` already supports `onArrive`, so `onArrive: (i, n) => n.vip && AJ().vipArrive()` at :1258 is the cleaner VIP trigger if the pad-loop one is dropped.

No mute control exists in index.html; call `setMuted(localStorage.getItem('tatli_music') === '0')` once a toggle is added. `patienceWarn` self-throttles to 250 ms, so per-frame calls are safe.
