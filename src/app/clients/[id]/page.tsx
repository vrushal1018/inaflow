"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Layers,
  MessageSquare,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  ClientProfile,
  CommunicationEntry,
  Design2DItem,
  Design3DItem,
  ProposalStatus,
  QuotationLineItem,
} from "@/lib/types";
import { parseQuotationWorkbook } from "@/lib/excelQuotation";

type TabKey = "2d" | "3d" | "quotation" | "invoice" | "details";

export default function ClientWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = params?.id;

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [relatedProposals, setRelatedProposals] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("2d");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string>("");

  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [creatingRevision, setCreatingRevision] = useState(false);
  const [revForm, setRevForm] = useState({
    versionLabel: "",
    projectName: "",
    cloneCurrent: true,
  });

  const [commMessage, setCommMessage] = useState("");
  const [commChannel, setCommChannel] =
    useState<CommunicationEntry["channel"]>("Note");
  const [sendingComm, setSendingComm] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    fetch(`/api/clients/${clientId}`)
      .then(async (res) => {
        if (res.ok && active) {
          const data = await res.json();
          setClient(data.client);
          setRelatedProposals(data.relatedProposals || [data.client]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Poll only status & communications so active uploads/edits are never overwritten
    const timer = setInterval(() => {
      fetch(`/api/clients/${clientId}`)
        .then(async (res) => {
          if (!res.ok || !active) return;
          const data = await res.json();
          setClient((prev) =>
            prev
              ? {
                  ...prev,
                  status: data.client.status,
                  communications: data.client.communications,
                }
              : data.client
          );
          if (data.relatedProposals) {
            setRelatedProposals(data.relatedProposals);
          }
        })
        .catch(() => {});
    }, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [clientId]);

  async function persistClient(patch: Partial<ClientProfile>) {
    if (!client) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
        setSavedBanner(true);
        setTimeout(() => setSavedBanner(false), 2000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setUploadError(
          errData.error || `Failed to save changes (${res.status})`
        );
      }
    } catch {
      setUploadError("Network error while saving changes.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(
    file: File,
    key: string
  ): Promise<{ url: string; fileName: string; fileType: string } | null> {
    if (!client) return null;
    setUploadingKey(key);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("clientId", client.id);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text();
        let msg = `Upload failed (${res.status})`;
        try {
          const parsed = JSON.parse(text);
          if (parsed.error) msg = parsed.error;
        } catch {
          if (res.status === 413) {
            msg = "File is too large for Vercel upload limit (max ~4.5 MB).";
          }
        }
        setUploadError(msg);
        return null;
      }
      return await res.json();
    } catch {
      setUploadError("Network error while uploading file.");
      return null;
    } finally {
      setUploadingKey(null);
    }
  }

  function copyUniqueUrl() {
    if (!client) return;
    const url = `${window.location.origin}/quotation/${client.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendToClient() {
    if (!client) return;
    copyUniqueUrl();
    if (client.status === "Draft") {
      await persistClient({ status: "Sent" });
    }
  }

  async function handleCreateRevision(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    setCreatingRevision(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: client.clientName,
          clientGroupId: client.clientGroupId,
          versionLabel:
            revForm.versionLabel.trim() ||
            `Proposal v${relatedProposals.length + 1}`,
          projectName: revForm.projectName.trim() || client.projectName,
          mobile: client.mobile,
          email: client.email,
          siteAddress: client.siteAddress,
          zone: client.zone,
          cloneFromId: revForm.cloneCurrent ? client.id : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowRevisionModal(false);
        router.push(`/clients/${data.client.id}`);
      }
    } finally {
      setCreatingRevision(false);
    }
  }

  async function handleAddCommunication(e: React.FormEvent) {
    e.preventDefault();
    if (!client || !commMessage.trim()) return;
    setSendingComm(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "Studio",
          channel: commChannel,
          message: commMessage.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
        setCommMessage("");
      }
    } finally {
      setSendingComm(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F2EE] text-sm text-[#5C6670]">
        Loading client workspace...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F2EE] p-6 text-center">
        <h1 className="text-xl font-medium">Client profile not found</h1>
        <Link
          href="/"
          className="mt-4 bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const grossAmount = (client.quotation?.items || []).reduce(
    (sum, item) => sum + (Number(item.totalPrice) || 0),
    0
  );
  const freight = Number(client.quotation?.freightAndInstallation || 0);
  const beforeTax = grossAmount + freight;
  const taxPct = Number(client.quotation?.taxPercent ?? 18);
  const taxAmount = (beforeTax * taxPct) / 100;
  const grandTotal = beforeTax + taxAmount;

  return (
    <div className="min-h-screen bg-[#F4F2EE] pb-16 text-[#111111]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#D9D4CA] bg-[#F4F2EE]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="border border-[#D9D4CA] bg-white p-2 text-[#111111] hover:border-[#111111]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold sm:text-lg">
                  {client.clientName}
                </h1>
                {savedBanner && (
                  <span className="inline-flex items-center gap-1 border border-[#2495D3]/30 bg-[#DCEBF5] px-2 py-0.5 text-[11px] font-medium text-[#1B7DB5]">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-[#5C6670]">
                {client.projectName || "Project Proposal"} &bull;{" "}
                <span className="font-mono text-[11px]">
                  /quotation/{client.slug}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={client.status}
              onChange={(e) =>
                persistClient({ status: e.target.value as ProposalStatus })
              }
              className="border border-[#D9D4CA] bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#2495D3]"
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="In Discussion">In Discussion</option>
              <option value="Approved">Approved</option>
              <option value="Revision Requested">Revision Requested</option>
            </select>

            <button
              onClick={handleSendToClient}
              className="inline-flex items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-3.5 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send &amp; Copy URL
                </>
              )}
            </button>

            <Link
              href={`/quotation/${client.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 border-[1.5px] border-[#111111] bg-transparent px-3.5 py-2 text-xs font-medium tracking-wider uppercase text-[#111111] hover:bg-[#111111] hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Preview Page
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-6 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-12">
        {/* Client Approval / Latest Client Message Banner */}
        {(() => {
          const clientEntries = (client.communications || []).filter(
            (c) => c.sender === "Client"
          );
          const latestClientMsg = clientEntries[0];
          if (!latestClientMsg && client.status !== "Approved") return null;
          return (
            <div
              className={`lg:col-span-12 border p-4 ${
                client.status === "Approved"
                  ? "border-[#2495D3] bg-[#DCEBF5]"
                  : "border-[#D9D4CA] bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-[#2495D3] px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-white">
                    {client.status === "Approved"
                      ? "Client Approved"
                      : "Client Feedback"}
                  </span>
                  <span className="text-xs font-semibold text-[#111111]">
                    {latestClientMsg
                      ? `Latest from ${client.clientName}:`
                      : `${client.clientName} approved this proposal`}
                  </span>
                </div>
                {latestClientMsg && (
                  <span className="text-[11px] text-[#5C6670]">
                    {new Date(latestClientMsg.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {latestClientMsg && (
                <p className="mt-2 text-sm text-[#111111]">
                  {latestClientMsg.message}
                </p>
              )}
            </div>
          );
        })()}

        {/* Client Space: All Proposals & Revisions for this Client */}
        <div className="lg:col-span-12 border border-[#D9D4CA] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D4CA] pb-3">
            <div>
              <p className="text-[11px] font-medium tracking-[0.22em] text-[#5C6670] uppercase">
                Client Space &bull; {client.clientName}
              </p>
              <p className="text-xs text-[#3E464F]">
                All proposals &amp; revisions sent to this client ({relatedProposals.length})
              </p>
            </div>
            <button
              onClick={() => {
                setRevForm({
                  versionLabel: `Revision ${relatedProposals.length + 1}`,
                  projectName: client.projectName,
                  cloneCurrent: true,
                });
                setShowRevisionModal(true);
              }}
              className="inline-flex items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-3.5 py-1.5 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Revision / Proposal
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {relatedProposals.map((p, i) => {
              const isCurrent = p.id === client.id;
              return (
                <Link
                  key={p.id}
                  href={`/clients/${p.id}`}
                  className={`flex items-center gap-2.5 border px-3 py-2 text-xs transition ${
                    isCurrent
                      ? "border-[#2495D3] bg-[#DCEBF5]/60 font-semibold text-[#111111]"
                      : "border-[#D9D4CA] bg-[#F4F2EE]/50 text-[#3E464F] hover:border-[#111111]"
                  }`}
                >
                  <span>
                    {p.versionLabel || `Proposal v${relatedProposals.length - i}`}
                    {p.projectName ? ` — ${p.projectName}` : ""}
                  </span>
                  <span
                    className={`border px-1.5 py-0.5 text-[10px] font-medium ${
                      p.status === "Approved"
                        ? "border-[#2495D3] bg-[#2495D3] text-white"
                        : "border-[#D9D4CA] bg-white text-[#5C6670]"
                    }`}
                  >
                    {p.status}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Left: Upload & Asset Tabs */}
        <div className="lg:col-span-8 space-y-5">
          {uploadError && (
            <div className="flex items-center justify-between border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
              <span>{uploadError}</span>
              <button
                onClick={() => setUploadError("")}
                className="ml-3 text-rose-500 hover:text-rose-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {/* Unique URL Banner */}
          <div className="flex flex-col gap-2 border border-[#D9D4CA] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-[0.22em] text-[#5C6670] uppercase">
                Unique Shareable Client URL
              </p>
              <p className="truncate font-mono text-xs text-[#111111]">
                /quotation/{client.slug}
              </p>
            </div>
            <button
              onClick={copyUniqueUrl}
              className="inline-flex shrink-0 items-center gap-1.5 border border-[#D9D4CA] px-3 py-1.5 text-xs font-medium text-[#111111] hover:border-[#111111] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#2495D3]" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy URL
                </>
              )}
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "2d", label: "2D Designs", icon: Layers },
                { key: "3d", label: "3D Designs", icon: Sparkles },
                { key: "quotation", label: "Quotation", icon: FileSpreadsheet },
                { key: "invoice", label: "Invoice", icon: FileText },
                { key: "details", label: "Client Details", icon: Save },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-2 border px-4 py-2 text-xs font-medium tracking-wider uppercase transition cursor-pointer ${
                  activeTab === key
                    ? "border-[#2495D3] bg-[#2495D3] text-white"
                    : "border-[#D9D4CA] bg-white text-[#3E464F] hover:border-[#111111]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* TAB: 2D DESIGNS */}
          {activeTab === "2d" && (
            <div className="border border-[#D9D4CA] bg-white p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium">2D Designs</h2>
                  <p className="text-xs text-[#5C6670]">
                    Upload Customer Layout and Proposed Layout for each space.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const nextItem: Design2DItem = {
                      id: crypto.randomUUID(),
                      spaceName: "Main Lobby",
                      designStyle: "Modern Minimal",
                      finish: "Warm Oak & Matte",
                    };
                    const next = [...(client.designs2D || []), nextItem];
                    setClient({ ...client, designs2D: next });
                    persistClient({ designs2D: next });
                  }}
                  className="inline-flex items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-3.5 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add 2D Space
                </button>
              </div>

              {(client.designs2D || []).length === 0 ? (
                <div className="border border-dashed border-[#D9D4CA] p-8 text-center text-xs text-[#5C6670]">
                  No 2D spaces added yet. Click &ldquo;Add 2D Space&rdquo; to upload
                  Customer Layout &amp; Proposed Layout drawings.
                </div>
              ) : (
                <div className="space-y-5">
                  {client.designs2D.map((item, idx) => (
                    <div
                      key={item.id}
                      className="border border-[#D9D4CA] bg-[#F4F2EE]/60 p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="grid flex-1 gap-3 sm:grid-cols-3">
                          <input
                            type="text"
                            value={item.spaceName}
                            placeholder="Space Name (e.g. Main Lobby)"
                            onChange={(e) => {
                              const next = [...client.designs2D];
                              next[idx] = { ...item, spaceName: e.target.value };
                              setClient({ ...client, designs2D: next });
                            }}
                            className="border border-[#D9D4CA] bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#2495D3]"
                          />
                          <input
                            type="text"
                            value={item.designStyle}
                            placeholder="Design Style"
                            onChange={(e) => {
                              const next = [...client.designs2D];
                              next[idx] = {
                                ...item,
                                designStyle: e.target.value,
                              };
                              setClient({ ...client, designs2D: next });
                            }}
                            className="border border-[#D9D4CA] bg-white px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                          />
                          <input
                            type="text"
                            value={item.finish}
                            placeholder="Finish"
                            onChange={(e) => {
                              const next = [...client.designs2D];
                              next[idx] = { ...item, finish: e.target.value };
                              setClient({ ...client, designs2D: next });
                            }}
                            className="border border-[#D9D4CA] bg-white px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const next = client.designs2D.filter(
                              (_, i) => i !== idx
                            );
                            setClient({ ...client, designs2D: next });
                            persistClient({ designs2D: next });
                          }}
                          className="p-2 text-[#5C6670] hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="border border-[#D9D4CA] bg-white p-3">
                          <p className="mb-2 text-xs font-semibold text-[#111111]">
                            Customer Layout
                          </p>
                          {item.customerLayoutUrl && (
                            <div className="mb-2 overflow-hidden border border-[#D9D4CA] bg-[#F4F2EE]">
                              <img
                                src={item.customerLayoutUrl}
                                alt="Customer Layout"
                                className="h-36 w-full object-contain"
                              />
                            </div>
                          )}
                          <label className="inline-flex cursor-pointer items-center gap-1.5 border border-[#D9D4CA] px-3 py-1.5 text-xs font-medium text-[#111111] hover:border-[#111111]">
                            <Upload className="h-3.5 w-3.5 text-[#2495D3]" />
                            {uploadingKey === `2d-cust-${item.id}`
                              ? "Uploading..."
                              : item.customerLayoutUrl
                                ? "Replace File"
                                : "Upload Layout"}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const uploaded = await uploadFile(
                                  file,
                                  `2d-cust-${item.id}`
                                );
                                if (uploaded) {
                                  const next = [...client.designs2D];
                                  next[idx] = {
                                    ...item,
                                    customerLayoutUrl: uploaded.url,
                                    customerLayoutName: uploaded.fileName,
                                  };
                                  setClient({ ...client, designs2D: next });
                                  persistClient({ designs2D: next });
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="border border-[#D9D4CA] bg-white p-3">
                          <p className="mb-2 text-xs font-semibold text-[#111111]">
                            Proposed Layout
                          </p>
                          {item.proposedLayoutUrl && (
                            <div className="mb-2 overflow-hidden border border-[#D9D4CA] bg-[#F4F2EE]">
                              <img
                                src={item.proposedLayoutUrl}
                                alt="Proposed Layout"
                                className="h-36 w-full object-contain"
                              />
                            </div>
                          )}
                          <label className="inline-flex cursor-pointer items-center gap-1.5 border border-[#D9D4CA] px-3 py-1.5 text-xs font-medium text-[#111111] hover:border-[#111111]">
                            <Upload className="h-3.5 w-3.5 text-[#2495D3]" />
                            {uploadingKey === `2d-prop-${item.id}`
                              ? "Uploading..."
                              : item.proposedLayoutUrl
                                ? "Replace File"
                                : "Upload Layout"}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const uploaded = await uploadFile(
                                  file,
                                  `2d-prop-${item.id}`
                                );
                                if (uploaded) {
                                  const next = [...client.designs2D];
                                  next[idx] = {
                                    ...item,
                                    proposedLayoutUrl: uploaded.url,
                                    proposedLayoutName: uploaded.fileName,
                                  };
                                  setClient({ ...client, designs2D: next });
                                  persistClient({ designs2D: next });
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <button
                      onClick={() =>
                        persistClient({ designs2D: client.designs2D })
                      }
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save 2D Metadata
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: 3D DESIGNS */}
          {activeTab === "3d" && (
            <div className="border border-[#D9D4CA] bg-white p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium">3D Designs</h2>
                  <p className="text-xs text-[#5C6670]">
                    Upload 3D renders or visualizations. Hidden automatically on
                    the client page if empty.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-3.5 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5]">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingKey === "3d-new" ? "Uploading..." : "Upload 3D Render"}
                  <input
                    type="file"
                    accept="image/*,video/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      const added: Design3DItem[] = [];
                      for (const file of files) {
                        const up = await uploadFile(file, "3d-new");
                        if (up) {
                          added.push({
                            id: crypto.randomUUID(),
                            title: file.name.replace(/\.[^.]+$/, ""),
                            caption: "",
                            fileUrl: up.url,
                            fileName: up.fileName,
                            fileType: up.fileType,
                          });
                        }
                      }
                      const next = [...(client.designs3D || []), ...added];
                      setClient({ ...client, designs3D: next });
                      await persistClient({ designs3D: next });
                    }}
                  />
                </label>
              </div>

              {(client.designs3D || []).length === 0 ? (
                <div className="border border-dashed border-[#D9D4CA] p-8 text-center text-xs text-[#5C6670]">
                  No 3D renders uploaded yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {client.designs3D.map((item, idx) => (
                    <div
                      key={item.id}
                      className="border border-[#D9D4CA] bg-[#F4F2EE] p-3 space-y-2"
                    >
                      <div className="overflow-hidden bg-white">
                        {item.fileType.startsWith("video/") ? (
                          <video
                            src={item.fileUrl}
                            controls
                            className="h-44 w-full object-cover"
                          />
                        ) : (
                          <img
                            src={item.fileUrl}
                            alt={item.title}
                            className="h-44 w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => {
                            const next = [...client.designs3D];
                            next[idx] = { ...item, title: e.target.value };
                            setClient({ ...client, designs3D: next });
                          }}
                          className="flex-1 border border-[#D9D4CA] bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-[#2495D3]"
                        />
                        <button
                          onClick={() => {
                            const next = client.designs3D.filter(
                              (_, i) => i !== idx
                            );
                            setClient({ ...client, designs3D: next });
                            persistClient({ designs3D: next });
                          }}
                          className="p-1.5 text-[#5C6670] hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(client.designs3D || []).length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() =>
                      persistClient({ designs3D: client.designs3D })
                    }
                    className="inline-flex items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save 3D Titles
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: QUOTATION */}
          {activeTab === "quotation" && (
            <div className="border border-[#D9D4CA] bg-white p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium">Quotation</h2>
                  <p className="text-xs text-[#5C6670]">
                    Import an Excel / CSV BOQ sheet to render an enhanced
                    interactive quotation, or upload a PNG/PDF.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-3.5 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5]">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Import Excel / CSV
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadError("");
                        try {
                          const buf = await file.arrayBuffer();
                          const parsed = parseQuotationWorkbook(buf);
                          if (!parsed.items.length) {
                            setUploadError(
                              "No quotation line items found in that Excel sheet. Ensure columns like Description/Particulars, Qty, Rate, or Amount are present."
                            );
                            return;
                          }
                          const nextQ = {
                            ...client.quotation,
                            excelFileName: file.name,
                            items: parsed.items,
                          };
                          setClient({ ...client, quotation: nextQ });
                          await persistClient({ quotation: nextQ });
                        } catch {
                          setUploadError(
                            "Could not parse Excel file. Please check the format (.xlsx, .xls, or .csv)."
                          );
                        } finally {
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 border border-[#D9D4CA] bg-[#F4F2EE] px-3.5 py-2 text-xs font-medium text-[#111111] hover:border-[#111111]">
                    <Upload className="h-3.5 w-3.5 text-[#2495D3]" />
                    {uploadingKey === "quotation-doc"
                      ? "Uploading..."
                      : client.quotation?.documentUrl
                        ? "Replace PDF/Image"
                        : "Upload PDF/Image"}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const up = await uploadFile(file, "quotation-doc");
                        if (up) {
                          const nextQ = {
                            ...client.quotation,
                            documentUrl: up.url,
                            documentName: up.fileName,
                            documentType: up.fileType,
                          };
                          setClient({ ...client, quotation: nextQ });
                          persistClient({ quotation: nextQ });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {client.quotation?.excelFileName && (
                <div className="flex items-center justify-between border border-[#2495D3]/30 bg-[#DCEBF5]/50 px-4 py-2.5 text-xs">
                  <span>
                    Imported from{" "}
                    <strong>{client.quotation.excelFileName}</strong> (
                    {client.quotation.items?.length || 0} line items)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextQ = {
                        ...client.quotation,
                        excelFileName: undefined,
                        items: [],
                      };
                      setClient({ ...client, quotation: nextQ });
                      persistClient({ quotation: nextQ });
                    }}
                    className="text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear items
                  </button>
                </div>
              )}

              {client.quotation?.documentUrl && (
                <div className="flex items-center justify-between border border-[#D9D4CA] bg-[#F4F2EE] p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet className="h-5 w-5 shrink-0 text-[#2495D3]" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {client.quotation.documentName}
                      </p>
                      <a
                        href={client.quotation.documentUrl}
                        target="_blank"
                        className="text-[11px] text-[#2495D3] hover:underline"
                      >
                        Open uploaded file &rarr;
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const nextQ = {
                        ...client.quotation,
                        documentUrl: undefined,
                        documentName: undefined,
                        documentType: undefined,
                      };
                      setClient({ ...client, quotation: nextQ });
                      persistClient({ quotation: nextQ });
                    }}
                    className="p-1.5 text-[#5C6670] hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Structured Line Items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-medium tracking-[0.2em] text-[#5C6670] uppercase">
                    Itemized Quotation Table
                  </h3>
                  <button
                    onClick={() => {
                      const items = client.quotation?.items || [];
                      const newRow: QuotationLineItem = {
                        sNo: items.length + 1,
                        designAndFinish: "Workstation & Acoustic Partition",
                        floor: "1st Floor",
                        area: "Open Office",
                        unitPrice: 45000,
                        qty: 1,
                        totalPrice: 45000,
                      };
                      setClient({
                        ...client,
                        quotation: {
                          ...client.quotation,
                          items: [...items, newRow],
                        },
                      });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#2495D3] hover:underline cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Line Item
                  </button>
                </div>

                {(client.quotation?.items || []).length > 0 && (
                  <div className="overflow-x-auto border border-[#D9D4CA]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#2495D3] text-white">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Scope / Item</th>
                          <th className="px-3 py-2">Floor</th>
                          <th className="px-3 py-2">Area</th>
                          <th className="px-3 py-2">Unit Price</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Total</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D9D4CA]">
                        {client.quotation.items.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-[#5C6670]">
                              {idx + 1}
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={row.designAndFinish}
                                onChange={(e) => {
                                  const next = [...client.quotation.items];
                                  next[idx] = {
                                    ...row,
                                    designAndFinish: e.target.value,
                                  };
                                  setClient({
                                    ...client,
                                    quotation: {
                                      ...client.quotation,
                                      items: next,
                                    },
                                  });
                                }}
                                className="w-40 border border-[#D9D4CA] px-2 py-1"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={row.floor}
                                onChange={(e) => {
                                  const next = [...client.quotation.items];
                                  next[idx] = { ...row, floor: e.target.value };
                                  setClient({
                                    ...client,
                                    quotation: {
                                      ...client.quotation,
                                      items: next,
                                    },
                                  });
                                }}
                                className="w-24 border border-[#D9D4CA] px-2 py-1"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={row.area}
                                onChange={(e) => {
                                  const next = [...client.quotation.items];
                                  next[idx] = { ...row, area: e.target.value };
                                  setClient({
                                    ...client,
                                    quotation: {
                                      ...client.quotation,
                                      items: next,
                                    },
                                  });
                                }}
                                className="w-24 border border-[#D9D4CA] px-2 py-1"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={row.unitPrice}
                                onChange={(e) => {
                                  const unitPrice = Number(e.target.value) || 0;
                                  const next = [...client.quotation.items];
                                  next[idx] = {
                                    ...row,
                                    unitPrice,
                                    totalPrice: unitPrice * row.qty,
                                  };
                                  setClient({
                                    ...client,
                                    quotation: {
                                      ...client.quotation,
                                      items: next,
                                    },
                                  });
                                }}
                                className="w-24 border border-[#D9D4CA] px-2 py-1"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={row.qty}
                                onChange={(e) => {
                                  const qty = Number(e.target.value) || 0;
                                  const next = [...client.quotation.items];
                                  next[idx] = {
                                    ...row,
                                    qty,
                                    totalPrice: row.unitPrice * qty,
                                  };
                                  setClient({
                                    ...client,
                                    quotation: {
                                      ...client.quotation,
                                      items: next,
                                    },
                                  });
                                }}
                                className="w-16 border border-[#D9D4CA] px-2 py-1"
                              />
                            </td>
                            <td className="px-3 py-2 font-medium">
                              {client.quotation.currencySymbol || "₹"}{" "}
                              {row.totalPrice.toLocaleString("en-IN")}
                            </td>
                            <td className="px-2 py-1.5">
                              <button
                                onClick={() => {
                                  const next = client.quotation.items.filter(
                                    (_, i) => i !== idx
                                  );
                                  setClient({
                                    ...client,
                                    quotation: {
                                      ...client.quotation,
                                      items: next,
                                    },
                                  });
                                }}
                                className="text-[#5C6670] hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                      Freight, Installation &amp; Handling
                    </label>
                    <input
                      type="number"
                      value={client.quotation?.freightAndInstallation || 0}
                      onChange={(e) =>
                        setClient({
                          ...client,
                          quotation: {
                            ...client.quotation,
                            freightAndInstallation: Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                      Tax (%)
                    </label>
                    <input
                      type="number"
                      value={client.quotation?.taxPercent ?? 18}
                      onChange={(e) =>
                        setClient({
                          ...client,
                          quotation: {
                            ...client.quotation,
                            taxPercent: Number(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                  </div>
                  <div className="border border-[#D9D4CA] bg-[#F4F2EE] p-3 text-right">
                    <p className="text-[11px] text-[#5C6670]">Grand Total</p>
                    <p className="text-base font-semibold text-[#111111]">
                      {client.quotation?.currencySymbol || "₹"}{" "}
                      {grandTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() =>
                      persistClient({ quotation: client.quotation })
                    }
                    className="inline-flex items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Quotation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: INVOICE */}
          {activeTab === "invoice" && (
            <div className="border border-[#D9D4CA] bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium">Invoice</h2>
                  <p className="text-xs text-[#5C6670]">
                    Upload the client&apos;s invoice PDF/image and track payment
                    status.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-3.5 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5]">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingKey === "invoice-doc"
                    ? "Uploading..."
                    : client.invoice?.documentUrl
                      ? "Replace Invoice File"
                      : "Upload Invoice File"}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const up = await uploadFile(file, "invoice-doc");
                      if (up) {
                        const nextInv = {
                          ...client.invoice,
                          documentUrl: up.url,
                          documentName: up.fileName,
                          documentType: up.fileType,
                        };
                        setClient({ ...client, invoice: nextInv });
                        persistClient({ invoice: nextInv });
                      }
                    }}
                  />
                </label>
              </div>

              {client.invoice?.documentUrl && (
                <div className="flex items-center justify-between border border-[#D9D4CA] bg-[#F4F2EE] p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 shrink-0 text-[#2495D3]" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {client.invoice.documentName}
                      </p>
                      <a
                        href={client.invoice.documentUrl}
                        target="_blank"
                        className="text-[11px] text-[#2495D3] hover:underline"
                      >
                        Open uploaded invoice &rarr;
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const nextInv = {
                        ...client.invoice,
                        documentUrl: undefined,
                        documentName: undefined,
                        documentType: undefined,
                      };
                      setClient({ ...client, invoice: nextInv });
                      persistClient({ invoice: nextInv });
                    }}
                    className="p-1.5 text-[#5C6670] hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={client.invoice?.invoiceNumber || ""}
                    onChange={(e) =>
                      setClient({
                        ...client,
                        invoice: {
                          ...client.invoice,
                          invoiceNumber: e.target.value,
                        },
                      })
                    }
                    placeholder="INA-INV-2026-001"
                    className="w-full border border-[#D9D4CA] px-3.5 py-2 text-xs outline-none focus:border-[#2495D3]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Invoice Date
                  </label>
                  <input
                    type="text"
                    value={client.invoice?.invoiceDate || ""}
                    onChange={(e) =>
                      setClient({
                        ...client,
                        invoice: {
                          ...client.invoice,
                          invoiceDate: e.target.value,
                        },
                      })
                    }
                    placeholder="25-Nov-26"
                    className="w-full border border-[#D9D4CA] px-3.5 py-2 text-xs outline-none focus:border-[#2495D3]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Invoice Amount
                  </label>
                  <input
                    type="number"
                    value={client.invoice?.amount || ""}
                    onChange={(e) =>
                      setClient({
                        ...client,
                        invoice: {
                          ...client.invoice,
                          amount: Number(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="719092"
                    className="w-full border border-[#D9D4CA] px-3.5 py-2 text-xs outline-none focus:border-[#2495D3]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Payment Status
                  </label>
                  <select
                    value={client.invoice?.paymentStatus || "Pending"}
                    onChange={(e) =>
                      setClient({
                        ...client,
                        invoice: {
                          ...client.invoice,
                          paymentStatus: e.target.value as
                            | "Pending"
                            | "Advance Paid"
                            | "Paid",
                        },
                      })
                    }
                    className="w-full border border-[#D9D4CA] bg-white px-3.5 py-2 text-xs outline-none focus:border-[#2495D3]"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Advance Paid">50% Advance Paid</option>
                    <option value="Paid">Paid in Full</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => persistClient({ invoice: client.invoice })}
                  className="inline-flex items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Invoice
                </button>
              </div>
            </div>
          )}

          {/* TAB: CLIENT DETAILS */}
          {activeTab === "details" && (
            <div className="border border-[#D9D4CA] bg-white p-6 space-y-4">
              <h2 className="text-base font-medium">Client Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={client.clientName}
                    onChange={(e) =>
                      setClient({ ...client, clientName: e.target.value })
                    }
                    className="w-full border border-[#D9D4CA] px-3.5 py-2 text-xs outline-none focus:border-[#2495D3]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={client.projectName}
                    onChange={(e) =>
                      setClient({ ...client, projectName: e.target.value })
                    }
                    className="w-full border border-[#D9D4CA] px-3.5 py-2 text-xs outline-none focus:border-[#2495D3]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Mobile
                  </label>
                  <input
                    type="text"
                    value={client.mobile}
                    onChange={(e) =>
                      setClient({ ...client, mobile: e.target.value })
                    }
                    className="w-full border border-[#D9D4CA] px-3.5 py-2 text-xs outline-none focus:border-[#2495D3]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Email
                  </label>
                  <input
                    type="email"
                    value={client.email}
                    onChange={(e) =>
                      setClient({ ...client, email: e.target.value })
                    }
                    className="w-full border border-[#D9D4CA] px-3.5 py-2 text-xs outline-none focus:border-[#2495D3]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Site Address
                  </label>
                  <input
                    type="text"
                    value={client.siteAddress}
                    onChange={(e) =>
                      setClient({ ...client, siteAddress: e.target.value })
                    }
                    className="w-full border border-[#D9D4CA] px-3.5 py-2 text-xs outline-none focus:border-[#2495D3]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Zone &amp; Date
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={client.zone}
                      placeholder="Zone"
                      onChange={(e) =>
                        setClient({ ...client, zone: e.target.value })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                    <input
                      type="text"
                      value={client.proposalDate}
                      placeholder="Date"
                      onChange={(e) =>
                        setClient({ ...client, proposalDate: e.target.value })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Proposal Ref &amp; Validity
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={client.proposalRef || ""}
                      placeholder="ISW/PR/26-27/001"
                      onChange={(e) =>
                        setClient({ ...client, proposalRef: e.target.value })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                    <input
                      type="text"
                      value={client.validDays || ""}
                      placeholder="30 days"
                      onChange={(e) =>
                        setClient({ ...client, validDays: e.target.value })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Engagement Type &amp; Journey Step (1-6)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={client.engagementType || ""}
                      placeholder="Design & Build"
                      onChange={(e) =>
                        setClient({ ...client, engagementType: e.target.value })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={client.currentJourneyStep ?? 2}
                      onChange={(e) =>
                        setClient({
                          ...client,
                          currentJourneyStep: Number(e.target.value) || 2,
                        })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Contract Target Budget &amp; Consultancy Fee
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={client.contractTarget ?? ""}
                      placeholder="Target e.g. 1900000"
                      onChange={(e) =>
                        setClient({
                          ...client,
                          contractTarget: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                    <input
                      type="number"
                      value={client.consultancyFee ?? ""}
                      placeholder="Fee e.g. 100000"
                      onChange={(e) =>
                        setClient({
                          ...client,
                          consultancyFee: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                    Carpet Area &amp; Time on Site
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={client.carpetArea || ""}
                      placeholder="About 1,000 sq.ft"
                      onChange={(e) =>
                        setClient({ ...client, carpetArea: e.target.value })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                    <input
                      type="text"
                      value={client.timeOnSite || ""}
                      placeholder="About 3 months"
                      onChange={(e) =>
                        setClient({ ...client, timeOnSite: e.target.value })
                      }
                      className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                    />
                  </div>
                </div>
              </div>

              {/* Client Brief Summary Cards */}
              <div className="border-t border-[#D9D4CA] pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5C6670]">
                      Your Brief Summary Cards
                    </h3>
                    <p className="text-[11px] text-[#5C6670]">
                      Key requirements captured from the client (e.g. Height, Storage, Bedroom).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setClient({
                        ...client,
                        briefItems: [
                          ...(client.briefItems || []),
                          {
                            id: crypto.randomUUID(),
                            title: "",
                            detail: "",
                          },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#2495D3] hover:underline cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Brief Card
                  </button>
                </div>
                <div className="space-y-2.5">
                  {(client.briefItems || []).map((item, idx) => (
                    <div key={item.id} className="flex gap-2">
                      <input
                        type="text"
                        value={item.title}
                        placeholder="Title (e.g. Storage)"
                        onChange={(e) => {
                          const next = [...(client.briefItems || [])];
                          next[idx] = { ...item, title: e.target.value };
                          setClient({ ...client, briefItems: next });
                        }}
                        className="w-1/3 border border-[#D9D4CA] px-3 py-2 text-xs font-medium outline-none focus:border-[#2495D3]"
                      />
                      <input
                        type="text"
                        value={item.detail}
                        placeholder="Details (e.g. Full-height wardrobes + lofts)"
                        onChange={(e) => {
                          const next = [...(client.briefItems || [])];
                          next[idx] = { ...item, detail: e.target.value };
                          setClient({ ...client, briefItems: next });
                        }}
                        className="flex-1 border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = (client.briefItems || []).filter(
                            (_, i) => i !== idx
                          );
                          setClient({ ...client, briefItems: next });
                        }}
                        className="p-2 text-[#5C6670] hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() =>
                    persistClient({
                      clientName: client.clientName,
                      projectName: client.projectName,
                      mobile: client.mobile,
                      email: client.email,
                      siteAddress: client.siteAddress,
                      zone: client.zone,
                      proposalDate: client.proposalDate,
                      proposalRef: client.proposalRef,
                      validDays: client.validDays,
                      engagementType: client.engagementType,
                      contractTarget: client.contractTarget,
                      consultancyFee: client.consultancyFee,
                      carpetArea: client.carpetArea,
                      timeOnSite: client.timeOnSite,
                      currentJourneyStep: client.currentJourneyStep,
                      briefItems: client.briefItems,
                    })
                  }
                  className="inline-flex items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Details
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Client Communication Log */}
        <aside className="lg:col-span-4">
          <div className="sticky top-24 border border-[#D9D4CA] bg-white p-5">
            <div className="flex items-center justify-between border-b border-[#D9D4CA] pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#2495D3]" />
                <h2 className="text-xs font-semibold tracking-[0.18em] uppercase">
                  Communication Log
                </h2>
              </div>
              <span className="border border-[#D9D4CA] bg-[#F4F2EE] px-2 py-0.5 text-[11px] font-medium text-[#5C6670]">
                {client.communications?.length || 0}
              </span>
            </div>

            <form onSubmit={handleAddCommunication} className="mt-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <select
                  value={commChannel}
                  onChange={(e) =>
                    setCommChannel(
                      e.target.value as CommunicationEntry["channel"]
                    )
                  }
                  className="border border-[#D9D4CA] bg-[#F4F2EE] px-2.5 py-1.5 text-xs font-medium outline-none focus:border-[#2495D3]"
                >
                  <option value="Note">Internal Note</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Call">Phone Call</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting</option>
                </select>
              </div>
              <textarea
                rows={3}
                value={commMessage}
                onChange={(e) => setCommMessage(e.target.value)}
                placeholder="Log a call, WhatsApp update, revision note, or follow-up..."
                className="w-full border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
              />
              <button
                type="submit"
                disabled={sendingComm || !commMessage.trim()}
                className="w-full border-[1.5px] border-[#2495D3] bg-[#2495D3] py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] disabled:opacity-40 cursor-pointer"
              >
                {sendingComm ? "Saving..." : "Save to Client Profile"}
              </button>
            </form>

            <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {(client.communications || []).map((entry) => (
                <div
                  key={entry.id}
                  className={`border p-3 text-xs ${
                    entry.sender === "Client"
                      ? "border-[#2495D3]/40 bg-[#DCEBF5]/50"
                      : entry.sender === "System"
                        ? "border-[#D9D4CA] bg-[#F4F2EE] text-[#5C6670]"
                        : "border-[#D9D4CA] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#111111]">
                      {entry.sender} &bull; {entry.channel}
                    </span>
                    <span className="text-[#5C6670]">
                      {new Date(entry.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[#3E464F]">
                    {entry.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* New Revision / Additional Proposal Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md border border-[#D9D4CA] bg-white p-6">
            <div className="flex items-center justify-between border-b border-[#D9D4CA] pb-3">
              <div>
                <h2 className="text-base font-medium">
                  New Proposal for {client.clientName}
                </h2>
                <p className="text-xs text-[#5C6670]">
                  Creates a new unique URL inside this client&apos;s space.
                </p>
              </div>
              <button
                onClick={() => setShowRevisionModal(false)}
                className="p-1 text-[#5C6670] hover:text-[#111111] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRevision} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#111111]">
                  Version / Label
                </label>
                <input
                  type="text"
                  required
                  value={revForm.versionLabel}
                  onChange={(e) =>
                    setRevForm({ ...revForm, versionLabel: e.target.value })
                  }
                  placeholder="e.g. Revision 2 or Option B"
                  className="w-full border border-[#D9D4CA] px-3 py-2 text-sm outline-none focus:border-[#2495D3]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#111111]">
                  Project / Space Name
                </label>
                <input
                  type="text"
                  value={revForm.projectName}
                  onChange={(e) =>
                    setRevForm({ ...revForm, projectName: e.target.value })
                  }
                  placeholder="e.g. Main Lobby - Revised"
                  className="w-full border border-[#D9D4CA] px-3 py-2 text-sm outline-none focus:border-[#2495D3]"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[#3E464F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={revForm.cloneCurrent}
                  onChange={(e) =>
                    setRevForm({ ...revForm, cloneCurrent: e.target.checked })
                  }
                  className="accent-[#2495D3]"
                />
                Copy 2D/3D designs &amp; quotation from current proposal
              </label>

              <div className="flex justify-end gap-2 border-t border-[#D9D4CA] pt-4">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="border-[1.5px] border-[#111111] px-4 py-2 text-xs font-medium uppercase text-[#111111] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingRevision}
                  className="border-[1.5px] border-[#2495D3] bg-[#2495D3] px-4 py-2 text-xs font-medium uppercase text-white hover:bg-[#1B7DB5] disabled:opacity-50 cursor-pointer"
                >
                  {creatingRevision ? "Creating..." : "Create Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
