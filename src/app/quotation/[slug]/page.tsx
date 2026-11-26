"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowUp,
  CheckCircle2,
  Download,
  Menu,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { InaLogo } from "@/components/InaLogo";
import type { ClientProfile, CompanyProfile } from "@/lib/types";

export default function ClientProposalPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [portalMessage, setPortalMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");

  useEffect(() => {
    if (!slug) return;
    let active = true;
    fetch(`/api/quotation/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && active) {
          setClient(data.client);
          setCompany(data.company);
          document.title = `Proposal for ${data.client.clientName} — INA SpaceWorks`;
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  async function submitPortalAction(action: "message" | "approve" | "revision") {
    if (!slug) return;
    if (action === "message" && !portalMessage.trim()) return;
    setSubmitting(true);
    setFeedbackNotice("");
    setErrorNotice("");
    try {
      const res = await fetch(`/api/quotation/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message: portalMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorNotice(data.error || "Could not submit your response.");
        return;
      }
      setClient(data.client);
      setPortalMessage("");
      setFeedbackNotice(
        action === "approve"
          ? "Thank you! Your proposal approval has been recorded."
          : action === "revision"
            ? "Your revision request has been sent to the INA SpaceWorks team."
            : "Your message has been saved to your project profile."
      );
    } catch {
      setErrorNotice("Network error while submitting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F2EE] text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
        Loading Proposal...
      </div>
    );
  }

  if (!client || !company) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F2EE] px-6 text-center text-[#111111]">
        <h1 className="text-3xl font-light">Proposal Not Found</h1>
        <p className="mt-2 text-sm text-[#5C6670]">
          This proposal link may have expired or is incorrect.
        </p>
      </div>
    );
  }

  const has2D = (client.designs2D || []).length > 0;
  const has3D = (client.designs3D || []).length > 0;
  const hasQuotation =
    Boolean(client.quotation?.documentUrl) ||
    (client.quotation?.items || []).length > 0;
  const hasInvoice =
    Boolean(client.invoice?.documentUrl) ||
    Boolean(client.invoice?.invoiceNumber);

  const grossAmount = (client.quotation?.items || []).reduce(
    (sum, item) => sum + (Number(item.totalPrice) || 0),
    0
  );
  const freight = Number(client.quotation?.freightAndInstallation || 0);
  const beforeTax = grossAmount + freight;
  const taxPct = Number(client.quotation?.taxPercent ?? 18);
  const taxAmount = (beforeTax * taxPct) / 100;
  const grandTotal = beforeTax + taxAmount;
  const currency = client.quotation?.currencySymbol || "₹";

  const navLinks = [
    { label: "About", href: "#about" },
    { label: "Ecosystem", href: "#benefits" },
    ...(has2D ? [{ label: "2D Designs", href: "#designs-2d" }] : []),
    ...(has3D ? [{ label: "3D Designs", href: "#designs-3d" }] : []),
    ...(hasQuotation ? [{ label: "Quotation", href: "#quotation" }] : []),
    ...(hasInvoice ? [{ label: "Invoice", href: "#invoice" }] : []),
    { label: "Terms & Conditions", href: "#terms" },
    { label: company.guaranteeTitle || "Quality Assurance", href: "#guarantee" },
    { label: company.buyingJourneyTitle || "Project Journey", href: "#journey" },
    { label: "Respond / Message", href: "#respond" },
  ];

  return (
    <div id="top" className="min-h-screen bg-[#F4F2EE] text-[#111111]">
      {/* Sticky Header Bar (matches inaspaceworks.com header.bar) */}
      <header className="sticky top-0 z-40 h-[72px] border-b border-[#D9D4CA] bg-[#F4F2EE]/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <InaLogo variant="dark" />
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="inline-flex items-center gap-2.5 text-[13px] font-medium tracking-[0.2em] uppercase text-[#111111] hover:text-[#2495D3] cursor-pointer"
          >
            <span>Menu</span>
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="flex h-full w-80 flex-col justify-between border-l border-[#D9D4CA] bg-[#F4F2EE] p-7 text-[#111111]">
            <div>
              <div className="flex items-center justify-between border-b border-[#D9D4CA] pb-4">
                <span className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#2495D3]">
                  Proposal Index
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 text-[#5C6670] hover:text-[#111111] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-6 flex flex-col divide-y divide-[#D9D4CA]">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className="py-3 text-sm font-normal text-[#111111] transition hover:text-[#2495D3]"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
            <div className="border-t border-[#D9D4CA] pt-4 text-xs text-[#5C6670]">
              <p className="font-medium text-[#111111]">{company.contact.phone}</p>
              <p className="mt-0.5">{company.contact.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Hero / Intro Banner (#F4F2EE warm surface) */}
      <section className="bg-[#F4F2EE] px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
              01 &bull; EXCLUSIVE PROPOSAL FOR
            </p>
            {client.status === "Approved" && (
              <span className="inline-flex items-center gap-1.5 border border-[#2495D3] bg-[#2495D3] px-3 py-1 text-[11px] font-medium tracking-[0.2em] uppercase text-white">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Proposal Approved
              </span>
            )}
            {client.status === "Revision Requested" && (
              <span className="inline-flex items-center gap-1.5 border border-rose-300 bg-rose-50 px-3 py-1 text-[11px] font-medium tracking-[0.2em] uppercase text-rose-700">
                Revision Requested
              </span>
            )}
          </div>
          <h1 className="mt-4 text-4xl font-light leading-[1.06] tracking-[-0.02em] text-[#111111] sm:text-6xl">
            Prepared for{" "}
            <strong className="font-semibold">{client.clientName}</strong>
          </h1>
          {client.projectName && (
            <p className="mt-4 text-base font-light text-[#3E464F] sm:text-lg">
              {client.projectName}
              {client.siteAddress ? ` — ${client.siteAddress}` : ""}
            </p>
          )}
          <div className="mt-10 flex flex-wrap gap-3">
            {hasQuotation && (
              <a
                href="#quotation"
                className="border-[1.5px] border-[#2495D3] bg-[#2495D3] px-6 py-3 text-sm font-medium text-white transition hover:border-[#1B7DB5] hover:bg-[#1B7DB5]"
              >
                View Quotation
              </a>
            )}
            <a
              href="#respond"
              className="border-[1.5px] border-[#111111] bg-transparent px-6 py-3 text-sm font-medium text-[#111111] transition hover:bg-[#111111] hover:text-white"
            >
              Respond or Approve
            </a>
          </div>
        </div>
      </section>

      {/* 2. About Company (#FFFFFF paper surface) */}
      <section id="about" className="border-t border-[#D9D4CA] bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
            02 &bull; ABOUT THE STUDIO
          </p>
          <div className="mt-6 grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="text-3xl font-light leading-[1.08] tracking-[-0.02em] sm:text-4xl">
                {company.aboutTitle}
              </h2>
            </div>
            <div className="space-y-4 text-base leading-[1.6] text-[#3E464F] lg:col-span-7">
              {company.aboutParagraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. The Whole Life of a Space — Editorial List Rows (#FFFFFF) */}
      <section id="benefits" className="border-t border-[#D9D4CA] bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
            03 &bull; THE WHOLE LIFE OF A SPACE
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] sm:text-5xl">
            {company.benefitsHeading}
          </h2>

          <div className="mt-10 border-t border-[#D9D4CA]">
            {company.benefits.map((b, i) => {
              const lower = b.title.toLowerCase();
              const hasWorks = lower.endsWith("works");
              const prefix = hasWorks ? b.title.slice(0, -5) : b.title;
              return (
                <div
                  key={i}
                  className="grid gap-4 border-b border-[#D9D4CA] py-7 sm:grid-cols-12 sm:items-baseline sm:gap-8"
                >
                  <div className="text-xs font-medium tracking-[0.22em] text-[#2495D3] sm:col-span-2">
                    0{i + 1}
                  </div>
                  <div className="text-2xl tracking-[-0.01em] sm:col-span-4">
                    {hasWorks ? (
                      <>
                        <span className="font-light">{prefix}</span>
                        <strong className="font-semibold">works</strong>
                      </>
                    ) : (
                      <strong className="font-semibold">{b.title}</strong>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-[#3E464F] sm:col-span-6">
                    {b.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Cerulean Blue Brand Statement Band (#2495D3) */}
      <section className="bg-[#2495D3] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-xs font-medium tracking-[0.28em] text-[#DCEBF5] uppercase">
            {company.brandOriginTop}
          </p>
          <p className="mt-3 text-3xl font-light leading-[1.08] tracking-[-0.02em] sm:text-5xl">
            {company.brandOriginBottom}
          </p>
        </div>
      </section>

      {/* 5. 2D Designs (#F4F2EE warm surface) */}
      {has2D && (
        <section id="designs-2d" className="bg-[#F4F2EE] px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[1200px]">
            <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
              04 &bull; 2D DESIGNS
            </p>
            <div className="mt-8 space-y-14">
              {client.designs2D.map((space) => (
                <div key={space.id}>
                  <h3 className="mb-6 text-2xl font-light tracking-[-0.02em] sm:text-3xl">
                    {space.spaceName}
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    {space.customerLayoutUrl && (
                      <div
                        onClick={() =>
                          setLightboxUrl(space.customerLayoutUrl || null)
                        }
                        className="cursor-zoom-in border border-[#D9D4CA] bg-white p-5 transition hover:border-[#2495D3]"
                      >
                        <p className="mb-3 text-[11px] font-medium tracking-[0.22em] text-[#5C6670] uppercase">
                          Customer Layout
                        </p>
                        <img
                          src={space.customerLayoutUrl}
                          alt="Customer Layout"
                          className="h-72 w-full object-contain"
                        />
                      </div>
                    )}
                    {space.proposedLayoutUrl && (
                      <div
                        onClick={() =>
                          setLightboxUrl(space.proposedLayoutUrl || null)
                        }
                        className="cursor-zoom-in border border-[#D9D4CA] bg-white p-5 transition hover:border-[#2495D3]"
                      >
                        <p className="mb-3 text-[11px] font-medium tracking-[0.22em] text-[#2495D3] uppercase">
                          Proposed Layout
                        </p>
                        <img
                          src={space.proposedLayoutUrl}
                          alt="Proposed Layout"
                          className="h-72 w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-6 text-xs text-[#3E464F]">
                    <span>
                      <strong>Design :</strong> {space.designStyle}
                    </span>
                    <span>
                      <strong>Finish :</strong> {space.finish}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. 3D Designs (Conditional — #FFFFFF) */}
      {has3D && (
        <section id="designs-3d" className="border-t border-[#D9D4CA] bg-white px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[1200px]">
            <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
              05 &bull; 3D DESIGNS
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {client.designs3D.map((item) => (
                <div
                  key={item.id}
                  className="border border-[#D9D4CA] bg-[#F4F2EE]"
                >
                  {item.fileType.startsWith("video/") ? (
                    <video
                      src={item.fileUrl}
                      controls
                      className="h-60 w-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.fileUrl}
                      alt={item.title}
                      onClick={() => setLightboxUrl(item.fileUrl)}
                      className="h-60 w-full cursor-zoom-in object-cover"
                    />
                  )}
                  <div className="p-4">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.caption && (
                      <p className="mt-1 text-xs text-[#5C6670]">
                        {item.caption}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. Quotation (#FFFFFF paper surface) */}
      {hasQuotation && (
        <section id="quotation" className="border-t border-[#D9D4CA] bg-white px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[1200px]">
            <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
              COMMERCIAL QUOTATION
            </p>
            <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] sm:text-4xl">
              Project Estimate &amp; Scope
            </h2>

            {/* Client Metadata Header */}
            <div className="mt-8 grid gap-4 border border-[#D9D4CA] bg-[#F4F2EE] p-6 text-xs sm:grid-cols-2">
              <div className="space-y-1.5 text-[#3E464F]">
                <p>
                  <span className="text-[#5C6670]">Client Name:</span>{" "}
                  <strong className="text-[#111111]">{client.clientName}</strong>
                </p>
                {client.mobile && (
                  <p>
                    <span className="text-[#5C6670]">Mobile No.:</span>{" "}
                    {client.mobile}
                  </p>
                )}
                {client.email && (
                  <p>
                    <span className="text-[#5C6670]">Email:</span>{" "}
                    {client.email}
                  </p>
                )}
                {client.siteAddress && (
                  <p>
                    <span className="text-[#5C6670]">Site Address:</span>{" "}
                    {client.siteAddress}
                  </p>
                )}
                {client.zone && (
                  <p>
                    <span className="text-[#5C6670]">Zone:</span> {client.zone}
                  </p>
                )}
              </div>
              <div className="sm:text-right">
                <p>
                  <span className="text-[#5C6670]">Date:</span>{" "}
                  <strong className="text-[#111111]">{client.proposalDate}</strong>
                </p>
              </div>
            </div>

            {/* Uploaded Quotation File */}
            {client.quotation?.documentUrl && (
              <div className="mt-6 border border-[#D9D4CA] bg-white p-4">
                {client.quotation.documentType?.includes("pdf") ? (
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm font-medium">
                      {client.quotation.documentName}
                    </span>
                    <a
                      href={client.quotation.documentUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5]"
                    >
                      <Download className="h-3.5 w-3.5" /> View Quotation PDF
                    </a>
                  </div>
                ) : (
                  <img
                    src={client.quotation.documentUrl}
                    alt="Quotation Document"
                    onClick={() =>
                      setLightboxUrl(client.quotation.documentUrl || null)
                    }
                    className="mx-auto max-h-[600px] cursor-zoom-in object-contain"
                  />
                )}
              </div>
            )}

            {/* Structured Quotation Table */}
            {(client.quotation?.items || []).length > 0 && (
              <div className="mt-6 border border-[#D9D4CA]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#2495D3] text-white">
                      <tr>
                        <th className="px-4 py-3 font-medium">S.NO</th>
                        <th className="px-4 py-3 font-medium">Scope / Item</th>
                        <th className="px-4 py-3 font-medium">Floor</th>
                        <th className="px-4 py-3 font-medium">Area</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Total Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9D4CA] bg-white">
                      {client.quotation.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-[#5C6670]">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 font-medium text-[#111111]">
                            {item.designAndFinish}
                          </td>
                          <td className="px-4 py-3 text-[#3E464F]">
                            {item.floor}
                          </td>
                          <td className="px-4 py-3 text-[#3E464F]">
                            {item.area}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {currency} {item.unitPrice.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-right">{item.qty}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {currency}{" "}
                            {item.totalPrice.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 border-t border-[#D9D4CA] bg-[#F4F2EE] p-5 text-xs sm:grid-cols-2">
                  <div className="space-y-1 text-[#3E464F]">
                    <p>
                      <strong>Timeline / Delivery:</strong>{" "}
                      {client.quotation.raftersDelivery}
                    </p>
                    <p>
                      <strong>Handover:</strong>{" "}
                      {client.quotation.consolesDelivery}
                    </p>
                  </div>
                  <div className="space-y-1.5 sm:text-right">
                    <p>
                      Gross Amount:{" "}
                      <strong>
                        {currency} {grossAmount.toLocaleString("en-IN")}
                      </strong>
                    </p>
                    <p>
                      Freight, Installation &amp; Handling:{" "}
                      <strong>
                        {currency}{" "}
                        {freight.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </p>
                    <p>
                      Total before Tax:{" "}
                      <strong>
                        {currency}{" "}
                        {beforeTax.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </p>
                    <p>
                      TAX @ {taxPct}%:{" "}
                      <strong>
                        {currency}{" "}
                        {taxAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </p>
                    <p className="pt-1 text-base font-semibold text-[#111111]">
                      Grand Total: {currency}{" "}
                      {grandTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 8. Invoice (Conditional — #F4F2EE) */}
      {hasInvoice && (
        <section id="invoice" className="border-t border-[#D9D4CA] bg-[#F4F2EE] px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-[1200px] border border-[#D9D4CA] bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
                  INVOICE
                </p>
                <h3 className="mt-1 text-xl font-medium">
                  {client.invoice.invoiceNumber || "Project Invoice"}
                </h3>
                {client.invoice.invoiceDate && (
                  <p className="text-xs text-[#5C6670]">
                    Date: {client.invoice.invoiceDate}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="border border-[#2495D3] bg-[#DCEBF5] px-3 py-1 text-xs font-medium text-[#1B7DB5]">
                  {client.invoice.paymentStatus}
                </span>
                {client.invoice.amount ? (
                  <span className="text-lg font-semibold">
                    {currency} {client.invoice.amount.toLocaleString("en-IN")}
                  </span>
                ) : null}
              </div>
            </div>
            {client.invoice.documentUrl && (
              <div className="mt-5">
                {client.invoice.documentType?.includes("pdf") ? (
                  <a
                    href={client.invoice.documentUrl}
                    target="_blank"
                    className="inline-flex items-center gap-2 bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5]"
                  >
                    <Download className="h-4 w-4" />
                    Download Invoice ({client.invoice.documentName})
                  </a>
                ) : (
                  <img
                    src={client.invoice.documentUrl}
                    alt="Invoice"
                    onClick={() =>
                      setLightboxUrl(client.invoice.documentUrl || null)
                    }
                    className="max-h-96 cursor-zoom-in border border-[#D9D4CA] object-contain"
                  />
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 9. Terms & Conditions (#FFFFFF) */}
      <section id="terms" className="border-t border-[#D9D4CA] bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
            COMMERCIAL &amp; EXECUTION TERMS
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] sm:text-4xl">
            {company.termsTitle}
          </h2>
          <ol className="mt-8 list-decimal divide-y divide-[#D9D4CA] border-y border-[#D9D4CA] pl-5 text-sm leading-relaxed text-[#3E464F]">
            {company.termsAndConditions.map((term, idx) => (
              <li key={idx} className="py-3.5 pl-2">
                {term}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 10. Quality Assurance / Guarantee (#F4F2EE) */}
      <section id="guarantee" className="border-t border-[#D9D4CA] bg-[#F4F2EE] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-[#2495D3]" />
            <h2 className="text-3xl font-light tracking-[-0.02em]">
              {company.guaranteeTitle}
            </h2>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#3E464F]">
            {company.guaranteeDescription}
          </p>
          <div className="mt-6 divide-y divide-[#D9D4CA] border-y border-[#D9D4CA]">
            {company.guaranteeItems.map((item, i) => (
              <div key={i} className="py-3.5 text-sm font-medium text-[#111111]">
                <span className="mr-3 text-xs font-medium text-[#2495D3]">
                  0{i + 1}
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Project Journey (#2495D3 Cerulean Blue Band) */}
      <section id="journey" className="bg-[#2495D3] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-xs font-medium tracking-[0.28em] text-[#DCEBF5] uppercase">
            EXECUTION ROADMAP
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] sm:text-4xl">
            {company.buyingJourneyTitle}
          </h2>
          <div className="mt-10 grid gap-6 border-t border-white/25 pt-8 sm:grid-cols-2 lg:grid-cols-6">
            {company.buyingJourney.map((step) => (
              <div key={step.step} className="space-y-2">
                <span className="text-xs font-medium tracking-[0.22em] text-[#DCEBF5]">
                  0{step.step}
                </span>
                <h3 className="text-base font-medium">{step.title}</h3>
                <p className="text-xs leading-relaxed text-[#DCEBF5]">
                  {step.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. Client Response & Communication Box (#F4F2EE) */}
      <section id="respond" className="bg-[#F4F2EE] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl border border-[#D9D4CA] bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#2495D3]" />
            <h2 className="text-xl font-light tracking-[-0.01em]">
              Questions, Revisions, or <strong className="font-semibold">Approval</strong>
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#5C6670]">
            All messages submitted here are saved directly to your project
            profile with {company.companyName}.
          </p>

          {client.status === "Approved" && (
            <div className="mt-4 flex items-center gap-2 border border-[#2495D3] bg-[#DCEBF5] px-4 py-3 text-xs font-medium text-[#1B7DB5]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2495D3]" />
              <span>
                This proposal has been <strong>Approved</strong>. You can still
                send any follow-up notes below.
              </span>
            </div>
          )}

          {feedbackNotice && (
            <div className="mt-4 border border-[#2495D3]/30 bg-[#DCEBF5] px-4 py-3 text-xs font-medium text-[#1B7DB5]">
              {feedbackNotice}
            </div>
          )}

          {errorNotice && (
            <div className="mt-4 border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
              {errorNotice}
            </div>
          )}

          <textarea
            rows={3}
            value={portalMessage}
            onChange={(e) => setPortalMessage(e.target.value)}
            placeholder="Write a message, ask a question, or mention any layout changes..."
            className="mt-4 w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => submitPortalAction("approve")}
                disabled={submitting || client.status === "Approved"}
                className="inline-flex items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {client.status === "Approved"
                  ? "Proposal Approved"
                  : "Approve Proposal"}
              </button>
              <button
                type="button"
                onClick={() => submitPortalAction("revision")}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 border-[1.5px] border-[#111111] bg-transparent px-4 py-2 text-xs font-medium tracking-wider uppercase text-[#111111] hover:bg-[#111111] hover:text-white cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Request Revision
              </button>
            </div>
            <button
              type="button"
              onClick={() => submitPortalAction("message")}
              disabled={submitting || !portalMessage.trim()}
              className="inline-flex items-center gap-1.5 border-[1.5px] border-[#111111] bg-[#111111] px-5 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#2495D3] hover:border-[#2495D3] disabled:opacity-40 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Send Message
            </button>
          </div>

          {(client.communications || []).filter(
            (c) => c.sender === "Client" || c.channel === "Portal"
          ).length > 0 && (
            <div className="mt-6 border-t border-[#D9D4CA] pt-5">
              <p className="mb-3 text-[11px] font-medium tracking-[0.22em] text-[#5C6670] uppercase">
                Your Recent Activity
              </p>
              <div className="space-y-2.5">
                {client.communications
                  .filter((c) => c.sender === "Client" || c.channel === "Portal")
                  .slice(0, 5)
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="border border-[#D9D4CA] bg-[#F4F2EE] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#5C6670]">
                        <span className="font-medium text-[#111111]">
                          {entry.sender}
                        </span>
                        <span>
                          {new Date(entry.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-[#3E464F]">{entry.message}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 13. Footer (matches inaspaceworks.com #2495D3 footer) */}
      <footer className="bg-[#2495D3] px-4 py-14 text-white sm:px-6">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-10 sm:grid-cols-3">
            <div>
              <InaLogo variant="light" stacked />
              <p className="mt-3 text-xs text-[#DCEBF5]">
                An interior vertical of Ina TechFM
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-[11px] font-medium tracking-[0.24em] text-[#DCEBF5] uppercase">
                Offerings
              </p>
              <p><span className="font-light">design</span><strong>works</strong></p>
              <p><span className="font-light">build</span><strong>works</strong></p>
              <p><span className="font-light">manage</span><strong>works</strong></p>
              <p><span className="font-light">care</span><strong>works</strong></p>
            </div>
            <div className="space-y-2 text-xs text-[#DCEBF5]">
              <p className="text-[11px] font-medium tracking-[0.24em] uppercase">
                Contact
              </p>
              <p className="text-white font-medium">{company.contact.phone}</p>
              <p className="text-white">{company.contact.email}</p>
              <p className="leading-relaxed">{company.contact.address}</p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/25 pt-6 text-xs text-[#DCEBF5]">
            <p>
              &copy; {new Date().getFullYear()} {company.companyName} &middot;
              Design &bull; Build &bull; Evolve
            </p>
            <a
              href="#top"
              className="inline-flex items-center gap-1.5 border border-white/40 px-4 py-1.5 text-xs text-white transition hover:bg-white hover:text-[#2495D3]"
            >
              <ArrowUp className="h-3.5 w-3.5" /> Back to Top
            </a>
          </div>
        </div>
      </footer>

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[92vw] object-contain"
          />
        </div>
      )}
    </div>
  );
}
