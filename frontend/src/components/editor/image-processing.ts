export const IMAGE_FILE_LIMIT = 10 * 1024 * 1024;
export const IMAGE_OUTPUT_LIMIT = 1536 * 1024;
export const IMAGE_PIXEL_LIMIT = 32_000_000;
export type ImageCrop = { left: number; top: number; right: number; bottom: number };

export async function imageBlobData(blob: Blob): Promise<string> {
  if (!['image/png','image/jpeg','image/webp'].includes(blob.type) || blob.size > IMAGE_FILE_LIMIT) throw new Error('Gunakan gambar PNG/JPG/WebP maksimum 10 MB.');
  return new Promise((resolve,reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gambar tidak dapat dibaca.')); reader.readAsDataURL(blob);
  });
}

export async function decodeImage(source: string): Promise<HTMLImageElement> {
  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(source)) throw new Error('Muat gambar PNG/JPG/WebP terlebih dahulu.');
  if (source.length > IMAGE_FILE_LIMIT * 1.4) throw new Error('Ukuran gambar melebihi 10 MB.');
  const image = new Image(); image.src = source;
  try { await image.decode(); } catch { throw new Error('Berkas gambar rusak atau tidak terbaca.'); }
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > IMAGE_PIXEL_LIMIT) throw new Error('Resolusi gambar terlalu besar (maksimum 32 megapiksel).');
  return image;
}

export function cropRectangle(image: HTMLImageElement, crop: ImageCrop) {
  for (const value of Object.values(crop)) if (!Number.isFinite(value) || value < 0 || value > 90) throw new Error('Pangkas tiap sisi antara 0 dan 90 persen.');
  if (crop.left + crop.right >= 95 || crop.top + crop.bottom >= 95) throw new Error('Sisakan sedikitnya 5 persen lebar dan tinggi gambar.');
  return { x:image.naturalWidth*crop.left/100,y:image.naturalHeight*crop.top/100,width:image.naturalWidth*(100-crop.left-crop.right)/100,height:image.naturalHeight*(100-crop.top-crop.bottom)/100 };
}

export function drawImagePreview(image: HTMLImageElement, crop: ImageCrop, canvas: HTMLCanvasElement, maxSide=600) {
  const rect = cropRectangle(image,crop), scale = Math.min(1,maxSide/Math.max(rect.width,rect.height));
  canvas.width = Math.max(1,Math.round(rect.width*scale));canvas.height = Math.max(1,Math.round(rect.height*scale));
  const context = canvas.getContext('2d');if (!context) throw new Error('Pratinjau gambar tidak tersedia pada perangkat ini.');
  context.drawImage(image,rect.x,rect.y,rect.width,rect.height,0,0,canvas.width,canvas.height);
}

export async function processImage(source: string, crop: ImageCrop) {
  const image = await decodeImage(source),canvas = document.createElement('canvas');
  const inputBytes = Math.ceil((source.length-source.indexOf(',')-1)*3/4);
  if (Object.values(crop).every(value=>value===0) && Math.max(image.naturalWidth,image.naturalHeight)<=2400 && inputBytes<=IMAGE_OUTPUT_LIMIT) {
    return {data:source,width:image.naturalWidth,height:image.naturalHeight,inputBytes,outputBytes:inputBytes};
  }
  let maxSide=2400,quality=0.88,blob:Blob|null=null;
  for (let attempt=0;attempt<8;attempt++) {
    drawImagePreview(image,crop,canvas,maxSide);
    blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));
    if(!blob)throw new Error('Gambar tidak dapat dikompresi.');
    if(blob.size<=IMAGE_OUTPUT_LIMIT)break;
    quality=Math.max(0.55,quality-0.08);maxSide=Math.round(maxSide*0.8);
  }
  if(!blob || blob.size>IMAGE_OUTPUT_LIMIT)throw new Error('Gambar masih terlalu besar setelah kompresi. Pilih berkas yang lebih kecil.');
  const data=await imageBlobData(blob);
  return {data,width:canvas.width,height:canvas.height,inputBytes,outputBytes:blob.size};
}
