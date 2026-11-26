import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const clientId = String(formData.get("clientId") || "general").replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    );

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || "";
    const safeBase = path
      .basename(file.name, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const uniqueName = `${Date.now()}_${crypto.randomBytes(3).toString("hex")}_${safeBase}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", clientId);
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, uniqueName), buffer);

    return NextResponse.json({
      url: `/uploads/${clientId}/${uniqueName}`,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "File upload failed" },
      { status: 500 }
    );
  }
}
