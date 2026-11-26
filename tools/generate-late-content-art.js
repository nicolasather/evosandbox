const fs = require('fs');
const { PNG } = require('pngjs');

const root = 'public/civilization';
const C = {
  outline: [39, 31, 44, 255], skin: [182, 112, 74, 255], skinLight: [218, 154, 99, 255],
  hair: [58, 38, 31, 255], teal: [51, 111, 107, 255], tealLight: [108, 177, 155, 255],
  ochre: [212, 164, 67, 255], clay: [145, 83, 57, 255], earth: [126, 72, 42, 255],
  moss: [74, 112, 79, 255], cloud: [163, 171, 157, 170], rain: [96, 157, 174, 190], frost: [189, 210, 197, 210],
  sky: [83, 128, 135, 255], dusk: [61, 69, 83, 255], sand: [190, 158, 104, 255], berry: [139, 70, 79, 255]
};

function pixel(p, x, y, w, h, c) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    if (xx < 0 || yy < 0 || xx >= p.width || yy >= p.height) continue;
    const i = (yy * p.width + xx) * 4;
    for (let k = 0; k < 4; k++) p.data[i + k] = c[k];
  }
}
function scale4(src) {
  const out = new PNG({ width: src.width * 4, height: src.height * 4 });
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    const si = (y * src.width + x) * 4;
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) {
      const i = ((y * 4 + yy) * out.width + x * 4 + xx) * 4;
      for (let k = 0; k < 4; k++) out.data[i + k] = src.data[si + k];
    }
  }
  return out;
}
function write(name, png) { fs.mkdirSync(`${root}/${name.substring(0, name.lastIndexOf('/'))}`, { recursive: true }); fs.writeFileSync(`${root}/${name}`, PNG.sync.write(png)); }

// A small, readable visiting trader: four directional 32x48 frames, transparent background.
const trader = new PNG({ width: 128, height: 48 });
for (let f = 0; f < 4; f++) {
  const o = f * 32, R = (x, y, w, h, c) => pixel(trader, o + x, y, w, h, c);
  const side = f === 1 || f === 3;
  R(11, 10, 11, 8, C.hair); R(10, 17, 13, 12, C.skin); R(12, 20, 3, 3, C.skinLight); R(side ? 20 : 16, 21, 3, 3, C.outline);
  R(8, 8, 17, 3, C.ochre); R(10, 6, 14, 3, C.clay); R(6, 29, 20, 12, C.teal); R(9, 31, 5, 10, C.tealLight); R(18, 31, 6, 10, C.moss);
  R(5, 32, 5, 8, C.earth); R(22, 31, 6, 8, C.ochre); R(10, 41, 6, 6, C.outline); R(19, 41, 6, 6, C.outline);
  R(side ? 22 : 4, 25, 5, 15, C.earth); R(side ? 24 : 3, 23, 4, 4, C.ochre); R(2, 44, 8, 2, C.outline); R(18, 44, 9, 2, C.outline);
}
write('characters/trader-directions-32x48.png', trader); write('characters/trader-directions-4x-preview.png', scale4(trader));
const traderPortrait = new PNG({ width: 64, height: 64 });
const T = (x, y, w, h, c) => pixel(traderPortrait, x, y, w, h, c);
T(15, 10, 34, 7, C.clay); T(12, 16, 40, 7, C.ochre); T(16, 23, 32, 22, C.skin); T(20, 27, 7, 6, C.hair); T(39, 29, 5, 5, C.outline); T(25, 40, 18, 4, C.skinLight); T(8, 44, 48, 20, C.teal); T(14, 48, 36, 5, C.tealLight); T(5, 25, 9, 23, C.earth); T(48, 29, 10, 17, C.ochre);
write('characters/trader-portrait-64.png', traderPortrait); write('characters/trader-portrait-4x-preview.png', scale4(traderPortrait));

// Weather loops are transparent overlays: rain is blue-grey, frost is pale green-white.
for (const [kind, tint] of [['rain', C.rain], ['frost', C.frost]]) {
  const sheet = new PNG({ width: 192, height: 32 });
  for (let f = 0; f < 6; f++) {
    const o = f * 32, R = (x, y, w, h) => pixel(sheet, o + x, y, w, h, tint);
    if (kind === 'rain') { R((f * 5) % 8, 4, 2, 8); R(12 + ((f * 3) % 9), 14, 2, 10); R(25 - ((f * 2) % 7), 2, 2, 8); R(20, 24, 2, 6); R(5 + f, 27, 7, 1); }
    else { R(2, 27, 28, 2); R((f * 5) % 16, 23, 3, 2); R(12 + f, 20, 2, 3); R(24 - f, 25, 3, 2); R(8 + ((f * 2) % 12), 28, 2, 2); }
  }
  write(`effects/weather-${kind}-sheet.png`, sheet); write(`effects/weather-${kind}-4x-preview.png`, scale4(sheet));
  fs.writeFileSync(`${root}/effects/weather-${kind}.metadata.json`, JSON.stringify({ assetId: `fx_weather_${kind}`, frameWidth: 32, frameHeight: 32, frames: 6, fps: 8, loop: true, anchor: { x: 16, y: 31 }, background: 'transparent', provenance: 'Original hand-authored pixel clusters matching ART_DIRECTION.md', license: 'Original project asset; © Evolution Sandbox contributors' }, null, 2) + '\n');
}

// Four opaque event illustrations, designed as compact timeline cards.
const events = new PNG({ width: 384, height: 96 });
for (let n = 0; n < 4; n++) {
  const o = n * 96, R = (x, y, w, h, c) => pixel(events, o + x, y, w, h, c);
  R(0, 0, 96, 96, n === 1 ? C.sky : n === 2 ? C.dusk : [151, 124, 87, 255]);
  R(0, 68, 96, 28, n === 1 ? C.teal : n === 2 ? C.earth : C.moss);
  if (n === 0) { R(18, 51, 60, 14, C.clay); R(22, 42, 52, 12, C.ochre); R(30, 26, 7, 28, C.earth); R(59, 31, 7, 23, C.earth); R(40, 54, 15, 14, C.berry); R(44, 47, 7, 7, C.ochre); }
  if (n === 1) { R(12, 26, 5, 34, C.rain); R(31, 13, 5, 43, C.rain); R(51, 21, 5, 38, C.rain); R(72, 9, 5, 51, C.rain); R(19, 57, 58, 8, C.foam || C.frost); R(27, 67, 42, 3, C.tealLight); }
  if (n === 2) { R(15, 60, 66, 8, C.earth); R(30, 38, 8, 30, C.clay); R(58, 34, 8, 34, C.clay); R(23, 33, 50, 8, C.ochre); R(38, 22, 20, 12, C.ochre); R(43, 40, 9, 25, C.tealLight); }
  if (n === 3) { R(17, 52, 62, 15, C.earth); R(27, 34, 11, 30, C.ochre); R(45, 28, 11, 36, C.ochre); R(63, 39, 11, 25, C.moss); R(23, 27, 12, 8, C.berry); R(58, 20, 12, 8, C.berry); }
}
write('events/event-cards.png', events); write('events/event-cards-4x-preview.png', scale4(events));
fs.writeFileSync(`${root}/events/event-cards.metadata.json`, JSON.stringify({ assetId: 'event_timeline_cards', frameWidth: 96, frameHeight: 96, frames: 4, order: ['first_harvest', 'heavy_rain', 'trader_arrival', 'food_shortage'], background: 'opaque', palette: 'shared warm earth / teal', provenance: 'Original hand-authored pixel clusters matching ART_DIRECTION.md', license: 'Original project asset; © Evolution Sandbox contributors' }, null, 2) + '\n');
console.log('wrote trader, weather, and event art');
