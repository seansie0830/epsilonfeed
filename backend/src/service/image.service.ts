import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");

export interface NormalizedImageResult {
  url: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
}

export interface NormalizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Normalizes an image:
 * 1. Auto-rotates using EXIF orientation
 * 2. Bounds dimensions within maxWidth x maxHeight (default 1920x1920)
 * 3. Strips EXIF/metadata for privacy
 * 4. Converts to WebP format with 85% quality
 * 5. Writes to upload storage and returns metadata
 */
export async function normalizeAndSaveImage(
  buffer: Buffer,
  originalFilename = "image.png",
  options: NormalizeOptions = {}
): Promise<NormalizedImageResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 85
  } = options;

  // Ensure uploads directory exists
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const imageId = randomUUID();
  const outputFilename = `${imageId}.webp`;
  const outputPath = path.join(UPLOAD_DIR, outputFilename);

  // Process image with Sharp
  const processedBuffer = await sharp(buffer)
    .rotate() // Auto-orient based on EXIF
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({
      quality,
      effort: 4
    })
    .toBuffer();

  const metadata = await sharp(processedBuffer).metadata();

  await fs.writeFile(outputPath, processedBuffer);

  return {
    url: `/uploads/${outputFilename}`,
    filename: outputFilename,
    mimeType: "image/webp",
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: processedBuffer.length
  };
}
