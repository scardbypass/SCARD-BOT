import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const exec = promisify(execFile);
export async function convertSoundSticker(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new Error('Media tidak valid');
  if (buffer.length > 25 * 1024 * 1024) throw new Error('Maksimal media 25 MB');
  const dir = await mkdtemp(join(tmpdir(),'scard-sa-'));
  const input = join(dir,'input.mp4');
  const sticker = join(dir,'sticker.webp');
  const audio = join(dir,'audio.ogg');
  try {
    await writeFile(input,buffer);
    await exec('ffmpeg',['-y','-i',input,'-t','10','-vf','fps=12,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0','-an','-c:v','libwebp_anim','-quality','55','-loop','0',sticker],{timeout:60000});
    await exec('ffmpeg',['-y','-i',input,'-t','10','-vn','-c:a','libopus','-b:a','32k','-ac','1','-ar','48000',audio],{timeout:60000});
    return {sticker:await readFile(sticker),audio:await readFile(audio)};
  } finally { await rm(dir,{recursive:true,force:true}); }
}
