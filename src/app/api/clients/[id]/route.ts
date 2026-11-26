import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { deleteClient, getClientById, listClients, updateClient } from "@/lib/db";

type RouteCtx = { params: Promise<{ id: string }> };

function groupKey(c: { clientGroupId?: string; clientName: string }) {
  return (
    c.clientGroupId ||
    c.clientName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

export async function GET(_req: NextRequest, context: RouteCtx) {
  const { id } = await context.params;
  const client = await getClientById(id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  const all = await listClients();
  const key = groupKey(client);
  const relatedProposals = all.filter((c) => groupKey(c) === key);
  return NextResponse.json({ client, relatedProposals });
}

export async function PATCH(req: NextRequest, context: RouteCtx) {
  try {
    const { id } = await context.params;
    const existing = await getClientById(id);
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await req.json();
    const communications = [...(existing.communications || [])];

    if (body.status && body.status !== existing.status) {
      communications.unshift({
        id: crypto.randomUUID(),
        sender: "System",
        channel: "Status",
        message: `Proposal status changed from "${existing.status}" to "${body.status}".`,
        createdAt: new Date().toISOString(),
      });
    }

    const updated = await updateClient(id, {
      ...body,
      communications: body.communications ?? communications,
    });
    return NextResponse.json({ client: updated });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteCtx) {
  const { id } = await context.params;
  const removed = await deleteClient(id);
  if (!removed) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
