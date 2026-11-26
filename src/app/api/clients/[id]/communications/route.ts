import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getClientById, updateClient } from "@/lib/db";
import { CommunicationEntry } from "@/lib/types";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteCtx) {
  try {
    const { id } = await context.params;
    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await req.json();
    const message = String(body.message || "").trim();
    if (!message) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    const entry: CommunicationEntry = {
      id: crypto.randomUUID(),
      sender: body.sender === "Client" ? "Client" : body.sender === "System" ? "System" : "Studio",
      channel: body.channel || "Note",
      message,
      createdAt: new Date().toISOString(),
    };

    const updated = await updateClient(id, {
      communications: [entry, ...(client.communications || [])],
    });

    return NextResponse.json({ client: updated, entry }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to add communication" },
      { status: 500 }
    );
  }
}
