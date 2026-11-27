import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getClientBySlug, getCompanyProfile, updateClient } from "@/lib/db";
import { CommunicationEntry, ProposalStatus } from "@/lib/types";

type RouteCtx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, context: RouteCtx) {
  const { slug } = await context.params;
  const [client, company] = await Promise.all([
    getClientBySlug(slug),
    getCompanyProfile(),
  ]);
  if (!client) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  return NextResponse.json({ client, company });
}

export async function POST(req: NextRequest, context: RouteCtx) {
  try {
    const { slug } = await context.params;
    const client = await getClientBySlug(slug);
    if (!client) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const body = await req.json();
    const message = String(body.message || "").trim();
    const action = body.action as "message" | "approve" | "revision" | undefined;

    if (!message && action === "message") {
      return NextResponse.json(
        { error: "Please enter a message before sending." },
        { status: 400 }
      );
    }

    const entryText =
      action === "approve"
        ? message
          ? `[APPROVED] ${message}`
          : "[APPROVED] Client approved the proposal via the unique proposal portal."
        : action === "revision"
          ? message
            ? `[REVISION REQUESTED] ${message}`
            : "[REVISION REQUESTED] Client requested a revision via the unique proposal portal."
          : message;

    const entry: CommunicationEntry = {
      id: crypto.randomUUID(),
      sender: "Client",
      channel: "Portal",
      message: entryText,
      createdAt: new Date().toISOString(),
    };

    let nextStatus: ProposalStatus = client.status;
    let acceptance = client.acceptance;

    if (action === "approve") {
      nextStatus = "Approved";
      acceptance = {
        acceptedByName: String(body.acceptedByName || client.clientName).trim(),
        acceptedByMobile: String(body.acceptedByMobile || client.mobile || "").trim(),
        acceptedByEmail: String(body.acceptedByEmail || client.email || "").trim(),
        acceptedAt: new Date().toISOString(),
        selectedWorksTotal:
          body.selectedWorksTotal !== undefined
            ? Number(body.selectedWorksTotal)
            : undefined,
        notes: message || undefined,
      };
    } else if (action === "revision") nextStatus = "Revision Requested";
    else if (client.status === "Sent" || client.status === "Draft") {
      nextStatus = "In Discussion";
    }

    const updated = await updateClient(client.id, {
      status: nextStatus,
      acceptance,
      communications: [entry, ...(client.communications || [])],
    });

    return NextResponse.json({ client: updated, entry }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to submit client response" },
      { status: 500 }
    );
  }
}
