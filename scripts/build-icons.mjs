import fs from 'node:fs';
import {chromium} from '@playwright/test';
const source=fs.readFileSync('public/favicon.svg','utf8');
const browser=await chromium.launch({headless:true});
const images=new Map();
try{
 const page=await browser.newPage();
 for(const size of [16,32,48,64,128,180,192,256,512]){
  const data=await page.evaluate(async({source,size})=>{
   const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source);await img.decode();
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.getContext('2d').drawImage(img,0,0,size,size);return canvas.toDataURL('image/png').split(',')[1];
  },{source,size});
  images.set(size,Buffer.from(data,'base64'));
 }
 for(const [size,name] of [[32,'favicon-32.png'],[180,'apple-touch-icon.png'],[192,'icon-192.png'],[512,'icon-512.png']])fs.writeFileSync('public/'+name,images.get(size));
 const sizes=[16,32,48,64,128,256],header=Buffer.alloc(6+sizes.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
 sizes.forEach((size,i)=>{const data=images.get(size),entry=6+i*16;header[entry]=header[entry+1]=size===256?0:size;header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);header.writeUInt32LE(data.length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=data.length;});
 fs.writeFileSync('public/favicon.ico',Buffer.concat([header,...sizes.map(size=>images.get(size))]));
 console.log('Created local SVG, multi-size ICO and PNG icons.');
}finally{await browser.close();}
