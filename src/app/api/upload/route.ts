import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { saveUploadedFile } from "@/lib/db";

const IMGBB_API_KEY = process.env.IMGBB_API_KEY || "";

async function uploadToImgBB(
  buffer: Buffer,
  fileName: string
): Promise<string | null> {
  if (!IMGBB_API_KEY) return null;
  try {
    const form = new FormData();
    form.append("key", IMGBB_API_KEY);
    form.append("image", buffer.toString("base64"));
    form.append("name", fileName.replace(/\.[^.]+$/, ""));

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: form,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      success?: boolean;
      data?: { url?: string; display_url?: string };
    };
    if (json.success && (json.data?.url || json.data?.display_url)) {
      return json.data.url || json.data.display_url || null;
    }
    return null;
  } catch {
    return null;
  }
}

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
    const fileType = file.type || "application/octet-stream";

    // Use ImgBB for images when IMGBB_API_KEY is configured
    if (IMGBB_API_KEY && fileType.startsWith("image/")) {
      const imgbbUrl = await uploadToImgBB(buffer, file.name);
      if (imgbbUrl) {
        return NextResponse.json({
          url: imgbbUrl,
          fileName: file.name,
          fileType,
          provider: "imgbb",
        });
      }
    }

    const id = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    await saveUploadedFile({
      id,
      clientId: clientId || "general",
      fileName: file.name,
      fileType,
      buffer,
    });

    return NextResponse.json({
      url: `/api/files/${id}`,
      fileName: file.name,
      fileType,
      provider: "database",
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "File upload failed" },
      { status: 500 }
    );
  }
}
