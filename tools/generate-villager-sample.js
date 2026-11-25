const fs = require('fs');
const zlib = require('zlib');

function png(width, height, draw) {
  const pixels = Buffer.alloc(width * height * 4);
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2]; pixels[i + 3] = color[3] ?? 255;
  };
  const rect = (x, y, w, h, color) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, color); };
  draw({ set, rect });
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { rows[y * (width * 4 + 1)] = 0; pixels.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4); }
  const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4); data.copy(b, 8); b.writeUInt32BE(crc(Buffer.concat([Buffer.from(type), data])), data.length + 8); return b; };
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'binary'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function crc(buf) { let c = 0xffffffff; for (const n of buf) { c ^= n; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (c ^ 0xffffffff) >>> 0; }

const out = 'public/civilization/characters'; fs.mkdirSync(out, { recursive: true });
const ink = [39, 31, 44, 255], skin = [182, 112, 74, 255], lightSkin = [218, 154, 99, 255], shirt = [74, 112, 79, 255], shirtLight = [108, 145, 91, 255], pants = [63, 72, 89, 255], boot = [78, 49, 38, 255], hair = [58, 38, 31, 255], gold = [212, 164, 67, 255];
function villager({set, rect}, ox, oy, facing, frame, role = 'gatherer') {
  const step = frame % 2 ? 1 : 0, flip = facing === 'west' ? -1 : 1, x = ox + (flip === 1 ? 0 : 31);
  const p = (dx, dy, w, h, c) => rect(x + (flip === 1 ? dx : -dx - w + 1), oy + dy, w, h, c);
  p(11, 5, 9, 8, hair); p(10, 10, 11, 8, skin); p(12, 12, 2, 2, ink); p(18, 12, 2, 2, ink); p(13, 16, 6, 2, lightSkin);
  p(8, 18, 14, 10, shirt); p(10, 18, 10, 3, shirtLight); p(10, 27, 5, 4, pants); p(16, 27, 5, 4, pants);
  p(9 - step, 30, 5, 2, boot); p(17 + step, 30, 5, 2, boot); p(6, 20 + step, 3, 7, skin); p(21, 20 - step, 3, 7, skin);
  if (role === 'builder') { p(3, 19, 2, 9, boot); p(2, 17, 8, 2, gold); }
  if (role === 'hunter') { p(3, 18, 2, 12, boot); p(1, 16, 2, 15, gold); }
}
const sheet = png(256, 64, ctx => { for (let row = 0; row < 2; row++) for (let col = 0; col < 8; col++) villager(ctx, col * 32, row * 32, row ? 'west' : 'east', col % 4, row ? 'builder' : 'gatherer'); });
fs.writeFileSync(`${out}/villager-sample-32x32.png`, sheet);
const portraits = png(288, 48, ctx => { for (let i = 0; i < 6; i++) { const x = i * 48; ctx.rect(x + 12, 8, 24, 24, hair); ctx.rect(x + 14, 18, 20, 16, skin); ctx.rect(x + 17, 29, 14, 10, [74, 112, 79, 255]); ctx.rect(x + 18, 22, 3, 3, ink); ctx.rect(x + 28, 22, 3, 3, ink); ctx.rect(x + 19, 33, 10, 2, lightSkin); if (i === 1) ctx.rect(x + 8, 13, 32, 4, gold); if (i === 2) ctx.rect(x + 14, 8, 20, 4, [45, 87, 125, 255]); if (i === 3) ctx.rect(x + 10, 10, 28, 3, [121, 73, 41, 255]); if (i === 4) ctx.rect(x + 10, 8, 28, 4, [195, 195, 181, 255]); if (i === 5) { ctx.rect(x + 16, 8, 16, 3, hair); ctx.rect(x + 16, 35, 16, 4, shirtLight); } } });
fs.writeFileSync(`${out}/villager-portraits-sample-48x48.png`, portraits);
console.log('wrote character samples');
