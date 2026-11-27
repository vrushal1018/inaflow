"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Layers,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { BrandSymbols, InaLogo } from "@/components/InaLogo";
import type { ClientProfile, CompanyProfile, ProposalStatus } from "@/lib/types";

const STATUS_COLORS: Record<ProposalStatus, string> = {
  Draft: "bg-[#F4F2EE] text-[#5C6670] border-[#D9D4CA]",
  Sent: "bg-[#DCEBF5] text-[#1B7DB5] border-[#2495D3]/30",
  "In Discussion": "bg-[#DCEBF5] text-[#111111] border-[#2495D3]/40",
  Approved: "bg-[#2495D3] text-white border-[#2495D3]",
  "Revision Requested": "bg-rose-50 text-rose-700 border-rose-200",
};

export default function StudioDashboard() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [dbMode, setDbMode] = useState<"mongodb" | "local">("local");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [newClient, setNewClient] = useState({
    clientName: "",
    projectName: "",
    mobile: "",
    email: "",
    siteAddress: "",
    zone: "",
  });

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/clients"), fetch("/api/company")])
      .then(async ([clientsRes, companyRes]) => {
        const clientsJson = await clientsRes.json();
        const companyJson = await companyRes.json();
        if (!active) return;
        setClients(clientsJson.clients || []);
        setDbMode(clientsJson.dbMode || companyJson.dbMode || "local");
        setCompany(companyJson.company || null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesStatus =
        statusFilter === "All" || c.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.clientName.toLowerCase().includes(q) ||
        c.projectName.toLowerCase().includes(q) ||
        c.siteAddress.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [clients, search, statusFilter]);

  const groupedSpaces = useMemo(() => {
    const map = new Map<string, ClientProfile[]>();
    for (const c of filteredClients) {
      const key =
        c.clientGroupId ||
        c.clientName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      const arr = map.get(key) || [];
      arr.push(c);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, proposals]) => ({
      key,
      primary: proposals[0],
      proposals,
    }));
  }, [filteredClients]);

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newClient.clientName.trim()) {
      setFormError("Please enter the client name before proceeding.");
      return;
    }
    setCreating(true);
    setFormError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create client profile");
        return;
      }
      setShowNewModal(false);
      router.push(`/clients/${data.client.id}`);
    } catch {
      setFormError("Network error while creating client profile.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteClient(id: string, name: string) {
    if (!confirm(`Delete client profile "${name}" and all its logs?`)) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  function copyProposalUrl(client: ClientProfile) {
    const url = `${window.location.origin}/quotation/${client.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(client.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="min-h-screen bg-[#F4F2EE] text-[#111111]">
      <BrandSymbols />
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#D9D4CA] bg-[#F4F2EE]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <InaLogo variant="dark" />
            <span className="hidden h-4 w-px bg-[#D9D4CA] sm:inline-block" />
            <span
              className={`border px-2.5 py-0.5 text-[11px] font-medium tracking-wider uppercase ${
                dbMode === "mongodb"
                  ? "border-[#2495D3]/40 bg-[#DCEBF5] text-[#1B7DB5]"
                  : "border-[#D9D4CA] bg-white text-[#5C6670]"
              }`}
            >
              {dbMode === "mongodb" ? "MongoDB" : "Local Store"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 border-[1.5px] border-[#111111] bg-transparent px-4 py-2 text-xs font-medium tracking-wider uppercase text-[#111111] transition hover:bg-[#111111] hover:text-white"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Company Defaults</span>
            </Link>
            <button
              onClick={() => {
                setNewClient({
                  clientName: "",
                  projectName: "",
                  mobile: "",
                  email: "",
                  siteAddress: "",
                  zone: "",
                });
                setFormError("");
                setShowNewModal(true);
              }}
              className="inline-flex items-center gap-2 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white transition hover:border-[#1B7DB5] hover:bg-[#1B7DB5] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Client Proposal
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Editorial Page Title */}
        <div className="mb-8 border-b border-[#D9D4CA] pb-6">
          <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
            01 &bull; PROPOSAL &amp; CLIENT WORKSPACE
          </p>
          <h1 className="mt-2 text-3xl font-light tracking-[-0.02em] sm:text-4xl">
            Design leads. <strong className="font-semibold">Everything else works.</strong>
          </h1>
        </div>

        {/* Stats Row */}
        <div className="mb-8 grid grid-cols-2 border border-[#D9D4CA] bg-white lg:grid-cols-4">
          <div className="border-b border-r border-[#D9D4CA] p-5 lg:border-b-0">
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#5C6670] uppercase">
              Total Clients
            </p>
            <p className="mt-2 text-3xl font-light">{clients.length}</p>
          </div>
          <div className="border-b border-[#D9D4CA] p-5 lg:border-b-0 lg:border-r">
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#5C6670] uppercase">
              Sent / Active
            </p>
            <p className="mt-2 text-3xl font-light text-[#2495D3]">
              {
                clients.filter(
                  (c) => c.status === "Sent" || c.status === "In Discussion"
                ).length
              }
            </p>
          </div>
          <div className="border-r border-[#D9D4CA] p-5">
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#5C6670] uppercase">
              Approved
            </p>
            <p className="mt-2 text-3xl font-light text-[#111111]">
              {clients.filter((c) => c.status === "Approved").length}
            </p>
          </div>
          <div className="p-5">
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#5C6670] uppercase">
              Preset Profile
            </p>
            <p className="mt-2 truncate text-sm font-medium text-[#111111]">
              {company?.companyName || "INA SpaceWorks"} &bull;{" "}
              {company?.termsAndConditions?.length || 0} Terms
            </p>
            <Link
              href="/settings"
              className="mt-1 inline-block text-xs font-medium text-[#2495D3] hover:text-[#1B7DB5] hover:underline"
            >
              Edit preset company info &rarr;
            </Link>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6670]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name, project, city, or mobile..."
              className="w-full border border-[#D9D4CA] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#2495D3]"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                "All",
                "Draft",
                "Sent",
                "In Discussion",
                "Approved",
                "Revision Requested",
              ] as const
            ).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  statusFilter === status
                    ? "border-[#2495D3] bg-[#2495D3] text-white"
                    : "border-[#D9D4CA] bg-white text-[#3E464F] hover:border-[#111111]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Client Profiles Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-56 animate-pulse border border-[#D9D4CA] bg-white"
              />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="border border-dashed border-[#D9D4CA] bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-[#DCEBF5] text-[#2495D3]">
              <FolderKanban className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-medium">
              {clients.length === 0
                ? "Create your first client proposal"
                : "No matching client profiles"}
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-[#5C6670]">
              {clients.length === 0
                ? "Your INA SpaceWorks intro, services, quality assurance, project journey, and terms are already pre-set. Enter a client name to generate their unique URL and upload 2D/3D designs, quotations, and invoices."
                : "Try clearing your search or status filter."}
            </p>
            {clients.length === 0 && (
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-5 inline-flex items-center gap-2 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-5 py-2.5 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Client &amp; Create Proposal
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {groupedSpaces.map(({ key, primary: client, proposals }) => {
              const allComms = proposals.flatMap((p) => p.communications || []);
              allComms.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              );
              const latestComm = allComms[0];
              const hasQuotation =
                Boolean(client.quotation?.documentUrl) ||
                (client.quotation?.items?.length || 0) > 0;
              const hasInvoice =
                Boolean(client.invoice?.documentUrl) ||
                Boolean(client.invoice?.invoiceNumber);

              return (
                <div
                  key={key}
                  className="flex flex-col justify-between border border-[#D9D4CA] bg-white p-5 transition hover:border-[#2495D3]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/clients/${client.id}`}
                          className="block truncate text-base font-semibold text-[#111111] hover:text-[#2495D3]"
                        >
                          {client.clientName}
                        </Link>
                        <p className="truncate text-xs text-[#5C6670]">
                          {proposals.length} Proposal
                          {proposals.length > 1 ? "s" : ""}
                          {client.siteAddress ? ` • ${client.siteAddress}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 border px-2.5 py-0.5 text-[11px] font-medium ${
                          STATUS_COLORS[client.status]
                        }`}
                      >
                        {client.status}
                      </span>
                    </div>

                    {/* Proposals / Revisions in this Client Space */}
                    <div className="mt-3 space-y-1.5 border-t border-[#D9D4CA] pt-3">
                      {proposals.slice(0, 3).map((p, idx) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-2 bg-[#F4F2EE]/60 px-2.5 py-1.5 text-xs"
                        >
                          <Link
                            href={`/clients/${p.id}`}
                            className="min-w-0 flex-1 truncate font-medium text-[#111111] hover:text-[#2495D3]"
                          >
                            {p.versionLabel || `v${proposals.length - idx}`}
                            {p.projectName ? ` • ${p.projectName}` : ""}
                          </Link>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span
                              className={`border px-1.5 py-0.5 text-[10px] font-medium ${
                                STATUS_COLORS[p.status]
                              }`}
                            >
                              {p.status}
                            </span>
                            <button
                              onClick={() => copyProposalUrl(p)}
                              title="Copy unique URL"
                              className="text-[#5C6670] hover:text-[#2495D3] cursor-pointer"
                            >
                              {copiedId === p.id ? (
                                <Check className="h-3 w-3 text-[#2495D3]" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                            <Link
                              href={`/quotation/${p.slug}`}
                              target="_blank"
                              title="Open proposal"
                              className="text-[#5C6670] hover:text-[#2495D3]"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                      {proposals.length > 3 && (
                        <p className="text-[11px] text-[#5C6670]">
                          +{proposals.length - 3} more in client space
                        </p>
                      )}
                    </div>

                    {/* Asset Pills (Latest Proposal) */}
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 border px-2 py-1 font-medium ${
                          client.designs2D?.length
                            ? "border-[#111111] bg-[#111111] text-white"
                            : "border-[#D9D4CA] bg-[#F4F2EE] text-[#5C6670]"
                        }`}
                      >
                        <Layers className="h-3 w-3" />
                        2D ({client.designs2D?.length || 0})
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 border px-2 py-1 font-medium ${
                          client.designs3D?.length
                            ? "border-[#111111] bg-[#111111] text-white"
                            : "border-[#D9D4CA] bg-[#F4F2EE] text-[#5C6670]"
                        }`}
                      >
                        <Sparkles className="h-3 w-3" />
                        3D ({client.designs3D?.length || 0})
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 border px-2 py-1 font-medium ${
                          hasQuotation
                            ? "border-[#2495D3]/40 bg-[#DCEBF5] text-[#1B7DB5]"
                            : "border-[#D9D4CA] bg-[#F4F2EE] text-[#5C6670]"
                        }`}
                      >
                        <FileSpreadsheet className="h-3 w-3" />
                        Quotation
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 border px-2 py-1 font-medium ${
                          hasInvoice
                            ? "border-[#2495D3] bg-[#2495D3] text-white"
                            : "border-[#D9D4CA] bg-[#F4F2EE] text-[#5C6670]"
                        }`}
                      >
                        <FileText className="h-3 w-3" />
                        Invoice
                      </span>
                    </div>

                    {/* Latest Communication */}
                    <div className="mt-4 border-t border-[#D9D4CA] pt-3">
                      <div className="flex items-center justify-between text-[11px] text-[#5C6670]">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <MessageSquare className="h-3 w-3 text-[#2495D3]" />
                          {allComms.length} log entries
                        </span>
                        {latestComm && (
                          <span>
                            {new Date(latestComm.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {latestComm && (
                        <p className="mt-1 line-clamp-2 text-xs text-[#3E464F]">
                          <span className="font-medium text-[#111111]">
                            {latestComm.sender}:
                          </span>{" "}
                          {latestComm.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#D9D4CA] pt-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyProposalUrl(client)}
                        title="Copy latest proposal URL"
                        className="inline-flex items-center gap-1 border border-[#D9D4CA] px-2.5 py-1.5 text-xs font-medium text-[#111111] hover:border-[#111111] cursor-pointer"
                      >
                        {copiedId === client.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-[#2495D3]" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy URL
                          </>
                        )}
                      </button>
                      <Link
                        href={`/quotation/${client.slug}`}
                        target="_blank"
                        title="Open latest proposal page"
                        className="inline-flex items-center gap-1 border border-[#D9D4CA] px-2.5 py-1.5 text-xs font-medium text-[#111111] hover:border-[#111111]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          handleDeleteClient(client.id, client.clientName)
                        }
                        title="Delete latest proposal"
                        className="p-1.5 text-[#5C6670] hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/clients/${client.id}`}
                        className="bg-[#2495D3] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1B7DB5]"
                      >
                        Open Space
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Client Modal — asks for Client Name & Project before uploading */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg border border-[#D9D4CA] bg-white p-6">
            <div className="flex items-center justify-between border-b border-[#D9D4CA] pb-4">
              <div>
                <h2 className="text-lg font-medium">New Client Proposal</h2>
                <p className="text-xs text-[#5C6670]">
                  Enter the client &amp; project details first to create their
                  profile and unique URL.
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-[#5C6670] hover:text-[#111111] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="mt-5 space-y-4">
              {formError && (
                <div className="border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-[#111111]">
                  Client Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newClient.clientName}
                  onChange={(e) =>
                    setNewClient({ ...newClient, clientName: e.target.value })
                  }
                  placeholder="e.g. Mr. Jaisalil Shilewant (Option 1)"
                  className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#111111]">
                  Project / Space Name
                </label>
                <input
                  type="text"
                  value={newClient.projectName}
                  onChange={(e) =>
                    setNewClient({ ...newClient, projectName: e.target.value })
                  }
                  placeholder="e.g. Main Lobby Corporate Office"
                  className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#111111]">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={newClient.mobile}
                    onChange={(e) =>
                      setNewClient({ ...newClient, mobile: e.target.value })
                    }
                    placeholder="+91 9156 802 555"
                    className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#111111]">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                    placeholder="client@company.com"
                    className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#111111]">
                    Site Address / City
                  </label>
                  <input
                    type="text"
                    value={newClient.siteAddress}
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        siteAddress: e.target.value,
                      })
                    }
                    placeholder="Mumbai / Thane West"
                    className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#111111]">
                    Zone / Region
                  </label>
                  <input
                    type="text"
                    value={newClient.zone}
                    onChange={(e) =>
                      setNewClient({ ...newClient, zone: e.target.value })
                    }
                    placeholder="West India"
                    className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#D9D4CA] pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="border-[1.5px] border-[#111111] px-4 py-2 text-xs font-medium tracking-wider uppercase text-[#111111] hover:bg-[#111111] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="border-[1.5px] border-[#2495D3] bg-[#2495D3] px-5 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] disabled:opacity-50 cursor-pointer"
                >
                  {creating
                    ? "Creating..."
                    : "Create Profile & Upload Files"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
