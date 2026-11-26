const fs = require('fs');
const { PNG } = require('pngjs');
const path = 'public/civilization/characters/gatherer-directions-32x48.png';
const p = PNG.sync.read(fs.readFileSync(path));
const O = [39,31,44,255], SK = [182,112,74,255], SKL = [218,154,99,255], H = [58,38,31,255], HL = [103,63,39,255];
function px(x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*p.width+xx)*4;for(let k=0;k<4;k++)p.data[i+k]=c[k];}}
function head(col,row,west){const ox=col*32,oy=row*48;px(ox+9,oy+6,15,20,[0,0,0,0]);px(ox+11,oy+7,11,4,H);px(ox+12,oy+10,8,3,HL);px(ox+10,oy+15,12,9,SK);px(ox+(west?11:18),oy+18,2,2,O);px(ox+(west?9:22),oy+20,3,2,SKL);}
for(const row of [2,3]) for(let col=0;col<10;col++) head(col,row,row===3);
fs.writeFileSync(path,PNG.sync.write(p));
const out=new PNG({width:p.width*4,height:p.height*4});for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){const s=(y*p.width+x)*4;for(let Y=0;Y<4;Y++)for(let X=0;X<4;X++){const d=((y*4+Y)*out.width+x*4+X)*4;for(let k=0;k<4;k++)out.data[d+k]=p.data[s+k];}}
fs.writeFileSync('public/civilization/characters/gatherer-directions-4x-preview.png',PNG.sync.write(out));
console.log('repaired gatherer side profiles and west work head');
