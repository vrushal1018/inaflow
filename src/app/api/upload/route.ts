import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { saveUploadedFile } from "@/lib/db";

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
    const id = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const fileType = file.type || "application/octet-stream";

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
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "File upload failed" },
      { status: 500 }
    );
  }
}
