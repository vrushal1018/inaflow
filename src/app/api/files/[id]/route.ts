import { NextRequest, NextResponse } from "next/server";
import { getUploadedFile } from "@/lib/db";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteCtx) {
  const { id } = await context.params;
  const file = await getUploadedFile(id);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      "Content-Type": file.fileType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
