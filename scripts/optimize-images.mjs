import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const jobs = [
  { directory: path.resolve('public/hero'), requestedWidths: [640, 1024] },
  { directory: path.resolve('public/images'), requestedWidths: [640, 1200, 1920] },
];

let generated = 0;
for (const job of jobs) {
  const outputDirectory = path.join(job.directory, 'optimized');
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  const files = (await readdir(job.directory)).filter(file => /\.(jpe?g|png)$/i.test(file));

  for (const file of files) {
    const source = path.join(job.directory, file);
    const basename = path.parse(file).name;
    const metadata = await sharp(source).metadata();
    const sourceWidth = metadata.width || Math.max(...job.requestedWidths);
    const widths = [...new Set(job.requestedWidths.map(width => Math.min(width, sourceWidth)))];
    for (const width of widths) {
      const pipeline = sharp(source).rotate().resize({ width });
      await pipeline.clone().webp({ quality: 78, effort: 5 }).toFile(path.join(outputDirectory, `${basename}-${width}.webp`));
      await pipeline.clone().avif({ quality: 52, effort: 5 }).toFile(path.join(outputDirectory, `${basename}-${width}.avif`));
      generated += 2;
    }
  }
}

console.log(`Imagens otimizadas: ${generated} variantes geradas.`);
