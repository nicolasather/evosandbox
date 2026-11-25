const fs = require('fs');
const zlib = require('zlib');
function crc(buf) { let c = 0xffffffff; for (const n of buf) { c ^= n; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (c ^ 0xffffffff) >>> 0; }
function png(width, height, draw) {
  const px = Buffer.alloc(width * height * 4); const set = (x, y, c) => { if (x < 0 || y < 0 || x >= width || y >= height) return; const i=(y*width+x)*4; px[i]=c[0]; px[i+1]=c[1]; px[i+2]=c[2]; px[i+3]=c[3] ?? 255; }; const rect=(x,y,w,h,c)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)set(x+xx-x,y+yy-y,c);};
  draw({set,rect}); const rows=Buffer.alloc((width*4+1)*height); for(let y=0;y<height;y++){rows[y*(width*4+1)]=0;px.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);}
  const chunk=(type,data)=>{const b=Buffer.alloc(12+data.length);b.writeUInt32BE(data.length,0);b.write(type,4);data.copy(b,8);b.writeUInt32BE(crc(Buffer.concat([Buffer.from(type),data])),data.length+8);return b;}; const ih=Buffer.alloc(13);ih.writeUInt32BE(width,0);ih.writeUInt32BE(height,4);ih[8]=8;ih[9]=6;
  return Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n','binary'),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
const out='public/civilization/effects'; fs.mkdirSync(out,{recursive:true});
const outline=[39,31,44,255], ash=[103,79,61,255], stone=[116,112,104,255], stoneHi=[171,156,126,255], log=[103,55,38,255], logHi=[167,87,48,255], ember=[214,81,38,255], orange=[244,133,39,255], gold=[255,202,59,255], cream=[255,232,129,255], smoke=[146,154,139,150];
function fire(ctx,ox,oy,frame,scale=1){const {rect}=ctx; const R=(x,y,w,h,c)=>rect(ox+x*scale,oy+y*scale,w*scale,h*scale,c); const sway=[0,1,-1,1,0,-1][frame];
  R(5,27,22,3,outline);R(7,25,18,3,ash);R(8,27,16,2,log);R(6,26,5,2,logHi);R(20,26,5,2,logHi);R(9,24,14,2,outline);R(10,23,12,2,log);R(11,23,4,1,logHi);R(17,23,4,1,logHi);
  R(10+sway,20,12,5,ember);R(8+sway,22,4,4,orange);R(20+sway,22,4,4,orange);R(12+sway,16,9,8,orange);R(14+sway,12,6,10,gold);R(16+sway,9+(frame%3),3,8,cream);R(13+sway,18,3,4,gold);R(19+sway,18,3,5,gold);
  if(frame%2===0){R(10,11,2,4,smoke);R(12,7,2,3,smoke);R(22,13,2,4,smoke);}else{R(22,10,2,4,smoke);R(20,6,2,3,smoke);R(11,14,2,3,smoke);}
  R(5,28,2,1,stoneHi);R(25,28,2,1,stoneHi);
}
const sheet=png(192,32,c=>{for(let i=0;i<6;i++)fire(c,i*32,0,i);}); fs.writeFileSync(`${out}/campfire-sheet.png`,sheet);
const staticFire=png(32,32,c=>fire(c,0,0,0)); fs.writeFileSync(`${out}/campfire-static.png`,staticFire);
const preview=png(768,128,c=>{for(let i=0;i<6;i++)fire(c,i*128,0,i,4);}); fs.writeFileSync(`${out}/campfire-4x-preview.png`,preview);
fs.writeFileSync(`${out}/campfire-sheet.metadata.json`,JSON.stringify({assetId:'fx_campfire_sheet',frameWidth:32,frameHeight:32,columns:6,frames:6,fps:8,loop:true,anchor:{x:16,y:31},background:'transparent',palette:['#271f2c','#674f3d','#747068','#ab9c7e','#673726','#a75730','#d65126','#f48527','#ffca3b','#ffe881'],license:'Original project asset; © Evolution Sandbox contributors'},null,2)+'\n');
console.log('wrote detailed campfire assets');
