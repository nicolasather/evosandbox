const fs = require('fs');
const { PNG } = require('pngjs');
const src = PNG.sync.read(fs.readFileSync('public/civilization/ui/building-thumbnails-16.png'));
const hi = [212, 164, 67, 255];
for (let n = 0; n < 16; n++) for (let i = 0; i < 4; i++) {
  const k = ((2 + (n % 4)) * src.width + n * 16 + 2 + i * 3) * 4;
  for (let c = 0; c < 4; c++) src.data[k + c] = hi[c];
}
function scale4(p) {
  const out = new PNG({ width: p.width * 4, height: p.height * 4 });
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const s = (y * p.width + x) * 4;
    for (let Y = 0; Y < 4; Y++) for (let X = 0; X < 4; X++) {
      const d = ((y * 4 + Y) * out.width + x * 4 + X) * 4;
      for (let c = 0; c < 4; c++) out.data[d + c] = p.data[s + c];
    }
  }
  return out;
}
fs.writeFileSync('public/civilization/ui/building-thumbnails-16-v2.png', PNG.sync.write(src));
fs.writeFileSync('public/civilization/ui/building-thumbnails-16-v2-4x-preview.png', PNG.sync.write(scale4(src)));
console.log('wrote refreshed v2 thumbnail strip');
