import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // proper folder
    const uploadDir = path.join(
      process.cwd(),
      "public/uploads/products"
    );

    await mkdir(uploadDir, { recursive: true });

    // UUID + timestamp filename
    const filename = `${Date.now()}-${crypto.randomUUID()}.webp`;

    const uploadPath = path.join(uploadDir, filename);

    // Sharp processing
    const processed = await sharp(buffer)
      .resize({ width: 800 })
      .webp({ quality: 80 })
      .toBuffer();

    await writeFile(uploadPath, processed);

    const metadata = await sharp(processed).metadata();

    // Save in DB
    const image = await prisma.image.create({
      data: {
        url: `/uploads/products/${filename}`,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: `${Math.round(processed.length / 1024)}KB`,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}




