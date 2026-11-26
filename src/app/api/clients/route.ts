import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, getClientById, getDbMode, listClients } from "@/lib/db";
import { ClientProfile } from "@/lib/types";

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const token = crypto.randomBytes(4).toString("hex");
  return `${base || "client"}-${token}`;
}

function makeGroupKey(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "client"
  );
}

export async function GET() {
  try {
    const [clients, dbMode] = await Promise.all([listClients(), getDbMode()]);
    return NextResponse.json({ clients, dbMode });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientName = String(body.clientName || "").trim();
    if (!clientName) {
      return NextResponse.json(
        { error: "Client name is required before creating a proposal." },
        { status: 400 }
      );
    }

    const source = body.cloneFromId
      ? await getClientById(String(body.cloneFromId))
      : null;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const projectName = String(
      body.projectName ?? source?.projectName ?? ""
    ).trim();
    const versionLabel = String(
      body.versionLabel || (source ? "Revised Proposal" : "Proposal v1")
    ).trim();
    const clientGroupId = String(
      body.clientGroupId || source?.clientGroupId || makeGroupKey(clientName)
    );

    const slug = makeSlug(
      projectName ? `${clientName}-${projectName}` : clientName
    );

    const formattedDate = new Date()
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
      .replace(/ /g, "-");

    const client: ClientProfile = {
      id,
      slug,
      clientGroupId,
      versionLabel,
      clientName,
      projectName,
      mobile: String(body.mobile ?? source?.mobile ?? "").trim(),
      email: String(body.email ?? source?.email ?? "").trim(),
      siteAddress: String(body.siteAddress ?? source?.siteAddress ?? "").trim(),
      zone: String(body.zone ?? source?.zone ?? "").trim(),
      proposalDate: String(body.proposalDate || formattedDate),
      status: "Draft",
      designs2D: source ? source.designs2D || [] : [],
      designs3D: source ? source.designs3D || [] : [],
      quotation: source
        ? source.quotation
        : {
            items: [],
            raftersDelivery: "Within 60 days from Order Booking",
            consolesDelivery:
              "Within 10 days after site dust free confirmation",
            freightAndInstallation: 0,
            taxPercent: 18,
            currencySymbol: "₹",
          },
      invoice: {
        paymentStatus: "Pending",
      },
      communications: [
        {
          id: crypto.randomUUID(),
          sender: "System",
          channel: "Status",
          message: source
            ? `Created "${versionLabel}" from previous proposal (${source.versionLabel || source.projectName || source.slug}).`
            : `Client profile created for ${clientName}${
                projectName ? ` (${projectName})` : ""
              }. Unique proposal URL generated.`,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const created = await createClient(client);
    return NextResponse.json({ client: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to create client" },
      { status: 500 }
    );
  }
}
