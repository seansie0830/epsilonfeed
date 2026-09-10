import { Request, Response } from "express";
import { normalizeAndSaveImage } from "../service/image.service.js";
import { prisma } from "../db.js";

export async function uploadImage(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const { originalname, buffer } = req.file;
    const normalized = await normalizeAndSaveImage(buffer, originalname);

    // Save record to Media database table
    const media = await prisma.media.create({
      data: {
        url: normalized.url,
        filename: normalized.filename,
        mimeType: normalized.mimeType,
        width: normalized.width,
        height: normalized.height,
        size: normalized.size
      }
    });

    res.status(201).json({
      success: true,
      media: {
        ...media,
        markdown: `![${originalname || "image"}](${normalized.url})`
      }
    });
  } catch (err: any) {
    console.error("Image upload error:", err);
    res.status(500).json({ error: err.message || "Failed to process and normalize image" });
  }
}
