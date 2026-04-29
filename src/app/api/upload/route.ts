import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    // Strict file type check
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WEBP allowed" },
        { status: 400 }
      );
    }

   // File size check
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File must be < 5MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch {
      return NextResponse.json(
        { error: "Invalid image file" },
        { status: 400 }
      );
    }

    const { width, height } = metadata;

    if (!width || !height) {
      return NextResponse.json(
        { error: "Invalid image dimensions" },
        { status: 400 }
      );
    }

    // proper folder
    const uploadDir = path.join(
      process.cwd(),
      "public/uploads/products"
    );

    await mkdir(uploadDir, { recursive: true });

    // UUID + timestamp filename
    const filename = `${Date.now()}-${crypto.randomUUID()}.webp`;

    const uploadPath = path.join(uploadDir, filename);

    // Process image safely
    let processed: Buffer;
    try {
      processed = await sharp(buffer)
        .resize({ width: 800 })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      return NextResponse.json(
        { error: "Image processing failed" },
        { status: 400 }
      );
    }

    await writeFile(uploadPath, processed);

    const finalMeta = await sharp(processed).metadata();

    // Save in DB
    const image = await prisma.image.create({
      data: {
        url: `/uploads/products/${filename}`,
        width: finalMeta.width || 0,
        height: finalMeta.height || 0,
        size: processed.length.toString(),
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}









