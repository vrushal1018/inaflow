"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Menu,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { BrandSymbols, InaDivider, InaLogo } from "@/components/InaLogo";
import type { ClientProfile, CompanyProfile } from "@/lib/types";

export default function ClientProposalPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // 3D Carousel state
  const [active3DIndex, setActive3DIndex] = useState(0);

  // Interactive Quotation state (tick/untick + editable client price + section override + category accordions)
  const [excludedIndices, setExcludedIndices] = useState<Record<number, boolean>>({});
  const [customPrices, setCustomPrices] = useState<Record<number, string>>({});
  const [sectionPrices, setSectionPrices] = useState<Record<string, string>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Acceptance & Portal Communication state
  const [signerName, setSignerName] = useState("");
  const [signerMobile, setSignerMobile] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
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
          setSignerName(data.client.clientName || "");
          setSignerMobile(data.client.mobile || "");
          setSignerEmail(data.client.email || "");
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

  const items = useMemo(() => client?.quotation?.items || [], [client]);

  const groupedCategories = useMemo(() => {
    const map = new Map<string, { item: (typeof items)[number]; origIdx: number }[]>();
    items.forEach((item, origIdx) => {
      const cat = item.category?.trim() || "Scope & Items";
      const list = map.get(cat) || [];
      list.push({ item, origIdx });
      map.set(cat, list);
    });
    return Array.from(map.entries()).map(([category, rows]) => ({
      category,
      rows,
    }));
  }, [items]);

  const selectedWorksTotal = useMemo(() => {
    return groupedCategories.reduce((acc, { category, rows }) => {
      const secOverride = sectionPrices[category];
      if (secOverride !== undefined && secOverride !== "") {
        return acc + (Number(secOverride) || 0);
      }
      const rowSum = rows.reduce((sum, { item, origIdx }) => {
        if (excludedIndices[origIdx]) return sum;
        const override = customPrices[origIdx];
        const val =
          override !== undefined && override !== ""
            ? Number(override) || 0
            : Number(item.totalPrice) || 0;
        return sum + val;
      }, 0);
      return acc + rowSum;
    }, 0);
  }, [groupedCategories, excludedIndices, customPrices, sectionPrices]);

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
        body: JSON.stringify({
          action,
          message: portalMessage.trim(),
          acceptedByName: signerName.trim() || client?.clientName,
          acceptedByMobile: signerMobile.trim() || client?.mobile,
          acceptedByEmail: signerEmail.trim() || client?.email,
          selectedWorksTotal:
            items.length > 0 ? selectedWorksTotal : undefined,
        }),
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
          ? "Thank you! Your proposal acceptance has been recorded."
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

  const hasBrief = (client.briefItems || []).length > 0;
  const has2D = (client.designs2D || []).length > 0;
  const has3D = (client.designs3D || []).length > 0;
  const hasQuotation =
    Boolean(client.quotation?.documentUrl) || items.length > 0;
  const hasInvoice =
    Boolean(client.invoice?.documentUrl) ||
    Boolean(client.invoice?.invoiceNumber);

  const freight = Number(client.quotation?.freightAndInstallation || 0);
  const beforeTax = selectedWorksTotal + freight;
  const taxPct = Number(client.quotation?.taxPercent ?? 18);
  const taxAmount = (beforeTax * taxPct) / 100;
  const grandTotal = beforeTax + taxAmount;
  const currency = client.quotation?.currencySymbol || "₹";

  const targetBudget = client.contractTarget || 0;
  const deltaFromTarget = targetBudget ? selectedWorksTotal - targetBudget : 0;
  const progressPct = targetBudget
    ? Math.min(100, Math.round((selectedWorksTotal / targetBudget) * 100))
    : 0;

  const waDigits = (company.contact.phone || "").replace(/\D/g, "");
  const buildSelectionSummary = () => {
    const lines = [
      `Proposal: ${client.proposalRef || client.slug}`,
      `Client: ${client.acceptance?.acceptedByName || signerName || client.clientName}`,
      client.siteAddress ? `Site: ${client.siteAddress}` : "",
      items.length > 0
        ? `Selected Works: ${currency} ${selectedWorksTotal.toLocaleString("en-IN")}`
        : "",
      client.consultancyFee
        ? `Our Fee: ${currency} ${client.consultancyFee.toLocaleString("en-IN")}`
        : "",
    ].filter(Boolean);

    const dropped = items
      .filter((_, idx) => excludedIndices[idx])
      .map((i) => `- Dropped: ${i.designAndFinish}`);
    if (dropped.length) {
      lines.push("Scope adjustments:", ...dropped);
    }
    return lines.join("\n");
  };

  const whatsappUrl = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(buildSelectionSummary())}`
    : undefined;

  const navLinks = [
    { label: "01 About us", href: "#about" },
    ...(hasBrief ? [{ label: "02 Your brief", href: "#brief" }] : []),
    ...(has2D ? [{ label: "03 2D designs", href: "#designs-2d" }] : []),
    ...(has3D ? [{ label: "04 3D views", href: "#designs-3d" }] : []),
    ...(hasQuotation ? [{ label: "05 Quotation", href: "#quotation" }] : []),
    ...(hasInvoice ? [{ label: "Invoice", href: "#invoice" }] : []),
    { label: "Terms & payment", href: "#terms" },
    { label: "Your journey", href: "#journey" },
    { label: "Accept", href: "#accept" },
  ];

  const activeStep = client.currentJourneyStep ?? 2;

  return (
    <div id="top" className="min-h-screen bg-[#F4F2EE] text-[#111111]">
      <BrandSymbols />
      {/* Sticky Header Bar */}
      <header className="sticky top-0 z-40 h-[72px] border-b border-[#D9D4CA] bg-[#F4F2EE]/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <a href="#top">
            <InaLogo variant="dark" />
          </a>
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

      {/* Sticky Live Budget Bar (when Target Budget & Line Items are present) */}
      {targetBudget > 0 && items.length > 0 && (
        <div className="sticky top-[72px] z-30 border-b border-[#222] bg-[#111111] px-4 py-2.5 text-white sm:px-6">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-stone-400 uppercase tracking-wider text-[11px]">
                Works as selected:
              </span>
              <strong className="text-sm font-semibold">
                {currency} {selectedWorksTotal.toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="flex flex-1 max-w-md items-center gap-3">
              <div className="relative h-2 flex-1 bg-white/15 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    deltaFromTarget > 0 ? "bg-amber-500" : "bg-[#2495D3]"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span
                className={`shrink-0 text-[11px] font-medium ${
                  deltaFromTarget > 0 ? "text-amber-400" : "text-[#DCEBF5]"
                }`}
              >
                {deltaFromTarget === 0
                  ? `On target (${currency} ${targetBudget.toLocaleString("en-IN")})`
                  : deltaFromTarget > 0
                    ? `${currency} ${deltaFromTarget.toLocaleString("en-IN")} above target`
                    : `${currency} ${Math.abs(deltaFromTarget).toLocaleString("en-IN")} under target`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="flex h-full w-80 flex-col justify-between border-l border-[#D9D4CA] bg-[#F4F2EE] p-7 text-[#111111]">
            <div>
              <div className="flex items-center justify-between border-b border-[#D9D4CA] pb-4">
                <span className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#2495D3]">
                  Proposal sections
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

      {/* 1. Hero / Intro Banner */}
      <section className="bg-[#F4F2EE] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium tracking-[0.28em] text-[#2495D3] uppercase">
              EXCLUSIVE PROPOSAL FOR
            </p>
            {client.status === "Approved" && (
              <span className="inline-flex items-center gap-1.5 border border-[#2495D3] bg-[#2495D3] px-3 py-1 text-[11px] font-medium tracking-[0.2em] uppercase text-white">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Proposal Accepted
              </span>
            )}
            {client.status === "Revision Requested" && (
              <span className="inline-flex items-center gap-1.5 border border-rose-300 bg-rose-50 px-3 py-1 text-[11px] font-medium tracking-[0.2em] uppercase text-rose-700">
                Revision Requested
              </span>
            )}
          </div>

          <h1 className="mt-4 text-4xl font-light leading-[1.06] tracking-[-0.02em] text-[#111111] sm:text-6xl">
            {client.clientName}
            {client.projectName && (
              <>
                {" "}
                <br className="hidden sm:inline" />
                <strong className="font-semibold">{client.projectName}.</strong>
              </>
            )}
          </h1>

          <p className="mt-4 max-w-2xl text-base font-light text-[#3E464F] sm:text-lg">
            {client.siteAddress
              ? `${client.siteAddress}. `
              : ""}
            {client.engagementType || "Design and turnkey execution"}, from layout
            to handover.
          </p>

          {/* Key Metadata Grid */}
          <div className="mt-10 grid grid-cols-2 gap-4 border-y border-[#D9D4CA] py-5 text-xs sm:grid-cols-3 lg:grid-cols-6">
            {targetBudget > 0 && (
              <div>
                <p className="text-[#5C6670] uppercase tracking-wider text-[10px]">
                  Contract value
                </p>
                <p className="mt-1 font-semibold text-[#111111]">
                  {currency} {targetBudget.toLocaleString("en-IN")}
                </p>
              </div>
            )}
            {client.consultancyFee ? (
              <div>
                <p className="text-[#5C6670] uppercase tracking-wider text-[10px]">
                  Our fee
                </p>
                <p className="mt-1 font-semibold text-[#111111]">
                  {currency} {client.consultancyFee.toLocaleString("en-IN")}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-[#5C6670] uppercase tracking-wider text-[10px]">
                Ref
              </p>
              <p className="mt-1 font-medium text-[#111111]">
                {client.proposalRef || client.slug.slice(0, 14).toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-[#5C6670] uppercase tracking-wider text-[10px]">
                Date
              </p>
              <p className="mt-1 font-medium text-[#111111]">
                {client.proposalDate}
              </p>
            </div>
            <div>
              <p className="text-[#5C6670] uppercase tracking-wider text-[10px]">
                Valid
              </p>
              <p className="mt-1 font-medium text-[#111111]">
                {client.validDays || "30 days"}
              </p>
            </div>
            <div>
              <p className="text-[#5C6670] uppercase tracking-wider text-[10px]">
                Backed by
              </p>
              <p className="mt-1 font-medium text-[#2495D3]">
                Ina TechFM &bull; 12 cities
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {hasQuotation && (
              <a
                href="#quotation"
                className="border-[1.5px] border-[#2495D3] bg-[#2495D3] px-6 py-3 text-sm font-medium text-white transition hover:border-[#1B7DB5] hover:bg-[#1B7DB5]"
              >
                Review Quotation
              </a>
            )}
            <a
              href="#accept"
              className="border-[1.5px] border-[#111111] bg-transparent px-6 py-3 text-sm font-medium text-[#111111] transition hover:bg-[#111111] hover:text-white"
            >
              Accept or Respond
            </a>
          </div>
        </div>
      </section>

      {/* 2. About Company & Ecosystem */}
      <section id="about" className="border-t border-[#D9D4CA] bg-white px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
            01 &bull; ABOUT INA SPACEWORKS
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

          <div className="mt-12 border-t border-[#D9D4CA]">
            {company.benefits.map((b, i) => {
              const lower = b.title.toLowerCase();
              const hasWorks = lower.endsWith("works");
              const prefix = hasWorks ? b.title.slice(0, -5) : b.title;
              return (
                <div
                  key={i}
                  className="grid gap-4 border-b border-[#D9D4CA] py-6 sm:grid-cols-12 sm:items-baseline sm:gap-8"
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

      {/* 3. Your Brief (Conditional — renders when briefItems exist) */}
      {hasBrief && (
        <section id="brief" className="border-t border-[#D9D4CA] bg-[#F4F2EE] px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[1200px]">
            <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
              02 &bull; YOUR BRIEF
            </p>
            <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] sm:text-4xl">
              Your space, <strong className="font-semibold">as you described it.</strong>
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(client.briefItems || []).map((item) => (
                <div
                  key={item.id}
                  className="border border-[#D9D4CA] bg-white p-6"
                >
                  <h3 className="text-xs font-semibold tracking-[0.2em] text-[#2495D3] uppercase">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#3E464F]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Cerulean Blue Brand Statement Band */}
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

      {/* 5. 2D Designs */}
      {has2D && (
        <section id="designs-2d" className="bg-[#F4F2EE] px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[1200px]">
            <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
              03 &bull; 2D DESIGNS
            </p>
            <p className="mt-2 text-xs text-[#5C6670]">
              Tap any drawing sheet to open it full size.
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

      {/* 6. 3D Views Carousel + Lightbox */}
      {has3D && (
        <section id="designs-3d" className="border-t border-[#D9D4CA] bg-white px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[1200px]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
                  04 &bull; 3D VIEWS
                </p>
                <h2 className="mt-2 text-3xl font-light tracking-[-0.02em] sm:text-4xl">
                  See it <strong className="font-semibold">before it&apos;s built</strong>
                </h2>
              </div>

              {client.designs3D.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActive3DIndex((prev) =>
                        prev === 0 ? client.designs3D.length - 1 : prev - 1
                      )
                    }
                    className="border border-[#D9D4CA] p-2 hover:border-[#111111] cursor-pointer"
                    aria-label="Previous view"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-xs font-medium text-[#5C6670]">
                    {active3DIndex + 1} / {client.designs3D.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActive3DIndex((prev) =>
                        prev === client.designs3D.length - 1 ? 0 : prev + 1
                      )
                    }
                    className="border border-[#D9D4CA] p-2 hover:border-[#111111] cursor-pointer"
                    aria-label="Next view"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Active 3D Spotlight */}
            {client.designs3D[active3DIndex] && (
              <div className="mt-8 border border-[#D9D4CA] bg-[#F4F2EE]">
                {client.designs3D[active3DIndex].fileType.startsWith("video/") ? (
                  <video
                    src={client.designs3D[active3DIndex].fileUrl}
                    controls
                    className="max-h-[520px] w-full object-contain bg-black"
                  />
                ) : (
                  <img
                    src={client.designs3D[active3DIndex].fileUrl}
                    alt={client.designs3D[active3DIndex].title}
                    onClick={() =>
                      setLightboxUrl(client.designs3D[active3DIndex].fileUrl)
                    }
                    className="max-h-[520px] w-full cursor-zoom-in object-contain bg-black/5"
                  />
                )}
                <div className="flex items-center justify-between border-t border-[#D9D4CA] bg-white px-5 py-3 text-xs">
                  <span className="font-medium">
                    {client.designs3D[active3DIndex].title}
                  </span>
                  <span className="text-[#5C6670]">
                    Colours and finishes are indicative, for layout review.
                  </span>
                </div>
              </div>
            )}

            {/* Thumbnail Strip */}
            {client.designs3D.length > 1 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {client.designs3D.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive3DIndex(idx)}
                    className={`border p-1 text-left transition cursor-pointer ${
                      idx === active3DIndex
                        ? "border-[#2495D3] bg-[#DCEBF5]/40"
                        : "border-[#D9D4CA] bg-white hover:border-[#111111]"
                    }`}
                  >
                    {!item.fileType.startsWith("video/") && (
                      <img
                        src={item.fileUrl}
                        alt={item.title}
                        className="h-16 w-full object-cover"
                      />
                    )}
                    <p className="mt-1 truncate text-[11px] font-medium">
                      {item.title}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 7. Interactive Quotation */}
      {hasQuotation && (
        <section id="quotation" className="border-t border-[#D9D4CA] bg-white px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-[1200px]">
            <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
              05 &bull; COMMERCIAL QUOTATION
            </p>
            <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] sm:text-4xl">
              Project Estimate &amp; <strong className="font-semibold">Interactive Scope</strong>
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
              <div className="space-y-1.5 sm:text-right text-[#3E464F]">
                <p>
                  <span className="text-[#5C6670]">Date:</span>{" "}
                  <strong className="text-[#111111]">{client.proposalDate}</strong>
                </p>
                {client.carpetArea && (
                  <p>
                    <span className="text-[#5C6670]">Carpet area:</span>{" "}
                    {client.carpetArea}
                  </p>
                )}
                {client.timeOnSite && (
                  <p>
                    <span className="text-[#5C6670]">Time on site:</span>{" "}
                    {client.timeOnSite}
                  </p>
                )}
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

            {/* Interactive Quotation Table (Grouped by Category) */}
            {items.length > 0 && (
              <div className="mt-6 border border-[#D9D4CA]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9D4CA] bg-[#F4F2EE] px-4 py-2.5 text-xs text-[#5C6670]">
                  <span>
                    Tick or untick items, or enter your own target price per row.
                  </span>
                  <div className="flex items-center gap-4">
                    {groupedCategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const allCollapsed = groupedCategories.every(
                            (g) => collapsedCategories[g.category]
                          );
                          const next: Record<string, boolean> = {};
                          if (!allCollapsed) {
                            groupedCategories.forEach((g) => {
                              next[g.category] = true;
                            });
                          }
                          setCollapsedCategories(next);
                        }}
                        className="font-medium text-[#111111] hover:underline cursor-pointer"
                      >
                        {groupedCategories.every(
                          (g) => collapsedCategories[g.category]
                        )
                          ? "Expand all"
                          : "Collapse all"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setExcludedIndices({});
                        setCustomPrices({});
                        setSectionPrices({});
                      }}
                      className="font-medium text-[#2495D3] hover:underline cursor-pointer"
                    >
                      Reset to full scope
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#2495D3] text-white">
                      <tr>
                        <th className="px-3 py-3 font-medium">Include</th>
                        <th className="px-3 py-3 font-medium">S.NO</th>
                        <th className="px-4 py-3 font-medium">Scope / Item</th>
                        <th className="px-3 py-3 font-medium">Floor</th>
                        <th className="px-3 py-3 font-medium">Area</th>
                        <th className="px-3 py-3 font-medium">Unit</th>
                        <th className="px-3 py-3 text-right font-medium">
                          Unit Price
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Total Price
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Your Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9D4CA] bg-white">
                      {groupedCategories.map(({ category, rows }) => {
                        const isCollapsed = Boolean(collapsedCategories[category]);
                        const lineCatTotal = rows.reduce((sum, { item, origIdx }) => {
                          if (excludedIndices[origIdx]) return sum;
                          const override = customPrices[origIdx];
                          const val =
                            override !== undefined && override !== ""
                              ? Number(override) || 0
                              : Number(item.totalPrice) || 0;
                          return sum + val;
                        }, 0);
                        const secOverride = sectionPrices[category];
                        const catTotal =
                          secOverride !== undefined && secOverride !== ""
                            ? Number(secOverride) || 0
                            : lineCatTotal;

                        return (
                          <React.Fragment key={category}>
                            <tr
                              onClick={() =>
                                setCollapsedCategories((prev) => ({
                                  ...prev,
                                  [category]: !prev[category],
                                }))
                              }
                              className="cursor-pointer bg-[#F4F2EE] hover:bg-[#DCEBF5]/40"
                            >
                              <td colSpan={8} className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold tracking-wider uppercase text-[#111111]">
                                    {isCollapsed ? "+" : "−"} {category}
                                  </span>
                                  <span className="border border-[#D9D4CA] bg-white px-2 py-0.5 text-[10px] font-medium text-[#5C6670]">
                                    {rows.length} items
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right text-xs font-semibold text-[#2495D3]">
                                {currency}{" "}
                                {catTotal.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td
                                className="px-4 py-2 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="number"
                                  placeholder="Section price"
                                  value={sectionPrices[category] ?? ""}
                                  onChange={(e) =>
                                    setSectionPrices((prev) => ({
                                      ...prev,
                                      [category]: e.target.value,
                                    }))
                                  }
                                  className="w-28 border border-[#D9D4CA] bg-white px-2 py-1 text-right text-xs outline-none focus:border-[#2495D3]"
                                />
                              </td>
                            </tr>
                            {!isCollapsed &&
                              rows.map(({ item, origIdx }) => {
                                const dropped = Boolean(excludedIndices[origIdx]);
                                return (
                                  <tr
                                    key={origIdx}
                                    className={
                                      dropped ? "opacity-45 bg-[#F4F2EE]/50" : ""
                                    }
                                  >
                                    <td className="px-3 py-3">
                                      <input
                                        type="checkbox"
                                        checked={!dropped}
                                        onChange={(e) =>
                                          setExcludedIndices((prev) => ({
                                            ...prev,
                                            [origIdx]: !e.target.checked,
                                          }))
                                        }
                                        className="h-4 w-4 accent-[#2495D3] cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-3 py-3 text-[#5C6670]">
                                      {origIdx + 1}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-[#111111]">
                                      {item.designAndFinish}
                                    </td>
                                    <td className="px-3 py-3 text-[#3E464F]">
                                      {item.floor || "—"}
                                    </td>
                                    <td className="px-3 py-3 text-[#3E464F]">
                                      {item.area || "—"}
                                    </td>
                                    <td className="px-3 py-3 text-[#5C6670]">
                                      {item.unit || "—"}
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                      {currency}{" "}
                                      {item.unitPrice.toLocaleString("en-IN")}
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                      {item.qty}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">
                                      {currency}{" "}
                                      {item.totalPrice.toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                      })}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <input
                                        type="number"
                                        disabled={dropped}
                                        placeholder={String(item.totalPrice)}
                                        value={customPrices[origIdx] ?? ""}
                                        onChange={(e) =>
                                          setCustomPrices((prev) => ({
                                            ...prev,
                                            [origIdx]: e.target.value,
                                          }))
                                        }
                                        className="w-28 border border-[#D9D4CA] px-2 py-1 text-right text-xs outline-none focus:border-[#2495D3]"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 border-t border-[#D9D4CA] bg-[#F4F2EE] p-5 text-xs sm:grid-cols-2">
                  <div className="space-y-3 text-[#3E464F]">
                    <div className="space-y-1">
                      <p>
                        <strong>Timeline / Delivery:</strong>{" "}
                        {client.quotation.raftersDelivery}
                      </p>
                      <p>
                        <strong>Handover:</strong>{" "}
                        {client.quotation.consolesDelivery}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-3 py-1.5 text-[11px] font-medium uppercase text-white hover:bg-[#1B7DB5]"
                        >
                          Send my changes on WhatsApp
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(buildSelectionSummary());
                          setCopiedSummary(true);
                          setTimeout(() => setCopiedSummary(false), 2000);
                        }}
                        className="inline-flex items-center gap-1.5 border border-[#111111] bg-white px-3 py-1.5 text-[11px] font-medium uppercase text-[#111111] cursor-pointer"
                      >
                        {copiedSummary ? (
                          <>
                            <Check className="h-3 w-3 text-[#2495D3]" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy summary
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:text-right">
                    <p>
                      Works as selected:{" "}
                      <strong>
                        {currency} {selectedWorksTotal.toLocaleString("en-IN")}
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
                    {taxPct > 0 ? (
                      <p>
                        TAX @ {taxPct}%:{" "}
                        <strong>
                          {currency}{" "}
                          {taxAmount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </strong>
                      </p>
                    ) : (
                      <p className="text-[#5C6670]">
                        GST: Extra, if applicable
                      </p>
                    )}
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

      {/* 8. Invoice (Conditional) */}
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

      {/* 9. Terms, Payment Schedule & Included/Not Included */}
      <section id="terms" className="border-t border-[#D9D4CA] bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-[1200px] space-y-12">
          <div>
            <p className="text-xs font-medium tracking-[0.28em] text-[#5C6670] uppercase">
              06 &bull; COMMERCIAL &amp; EXECUTION TERMS
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

          {/* Payment Schedule */}
          {(company.paymentMilestones || []).length > 0 && (
            <div>
              <h3 className="text-xs font-medium tracking-[0.24em] text-[#5C6670] uppercase">
                Payment Schedule
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {(company.paymentMilestones || []).map((m, idx) => (
                  <div
                    key={idx}
                    className="border border-[#D9D4CA] bg-[#F4F2EE] p-5"
                  >
                    <p className="text-2xl font-light text-[#2495D3]">
                      {m.percent}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#111111]">
                      {m.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Included vs Not Included */}
          {((company.includedItems || []).length > 0 ||
            (company.notIncludedItems || []).length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border border-[#D9D4CA] bg-[#F4F2EE]/60 p-6">
                <h3 className="text-xs font-semibold tracking-[0.2em] text-[#2495D3] uppercase">
                  Included
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-[#3E464F]">
                  {(company.includedItems || []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2495D3]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border border-[#D9D4CA] bg-white p-6">
                <h3 className="text-xs font-semibold tracking-[0.2em] text-[#5C6670] uppercase">
                  Not Included
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-[#3E464F]">
                  {(company.notIncludedItems || []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#5C6670]">&mdash;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 10. Quality Assurance / Warranty */}
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

      {/* 11. Project Journey with Active Step Highlight */}
      <section id="journey" className="bg-[#2495D3] px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-xs font-medium tracking-[0.28em] text-[#DCEBF5] uppercase">
            07 &bull; EXECUTION ROADMAP
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] sm:text-4xl">
            {company.buyingJourneyTitle}
          </h2>
          <div className="mt-10 grid gap-6 border-t border-white/25 pt-8 sm:grid-cols-2 lg:grid-cols-6">
            {company.buyingJourney.map((step) => {
              const isCurrent = step.step === activeStep;
              return (
                <div
                  key={step.step}
                  className={`space-y-2 p-3 ${
                    isCurrent ? "border border-white bg-white/10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium tracking-[0.22em] text-[#DCEBF5]">
                      0{step.step}
                    </span>
                    {isCurrent && (
                      <span className="bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[#2495D3]">
                        You are here
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-medium">{step.title}</h3>
                  <p className="text-xs leading-relaxed text-[#DCEBF5]">
                    {step.subtitle}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 12. Acceptance / Sign-Off & Communication (#accept) */}
      <section id="accept" className="bg-[#F4F2EE] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl border border-[#D9D4CA] bg-white p-6 sm:p-8">
          <InaDivider />
          <div className="mt-4 flex items-center gap-3">
            <img
              src={
                client.status === "Approved"
                  ? "/img/dot-done-blue.svg"
                  : "/img/dot-hello-blue.svg"
              }
              alt="Dot, the Ina SpaceWorks assistant"
              className="h-12 w-12 shrink-0"
            />
            <div>
              <h2 className="text-2xl font-light tracking-[-0.01em]">
                Ready to <strong className="font-semibold">begin?</strong>
              </h2>
              <p className="mt-0.5 text-xs text-[#5C6670]">
                Accept the proposal below or send questions/revision notes
                directly to {company.companyName}.
              </p>
            </div>
          </div>

          {/* Accepted Confirmation Card */}
          {client.status === "Approved" && (
            <div className="mt-6 border-2 border-[#2495D3] bg-[#DCEBF5]/45 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="bg-[#2495D3] px-2.5 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-white">
                  PROPOSAL ACCEPTED
                </span>
                {client.acceptance?.acceptedAt && (
                  <span className="text-xs text-[#5C6670]">
                    {new Date(client.acceptance.acceptedAt).toLocaleString([], {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              <div className="text-sm font-semibold text-[#111111]">
                {client.acceptance?.acceptedByName || client.clientName}
              </div>

              <div className="text-xs text-[#3E464F] space-y-1">
                {items.length > 0 && (
                  <p>
                    Works {currency}{" "}
                    {(
                      client.acceptance?.selectedWorksTotal ?? selectedWorksTotal
                    ).toLocaleString("en-IN")}
                    {client.consultancyFee
                      ? ` · Fee ${currency} ${client.consultancyFee.toLocaleString("en-IN")}`
                      : ""}{" "}
                    · GST extra if applicable
                  </p>
                )}
                {client.siteAddress && <p>{client.siteAddress}</p>}
                {(client.acceptance?.acceptedByMobile || client.mobile) && (
                  <p>
                    {client.acceptance?.acceptedByMobile || client.mobile}
                    {(client.acceptance?.acceptedByEmail || client.email) &&
                      ` · ${client.acceptance?.acceptedByEmail || client.email}`}
                  </p>
                )}
              </div>

              {whatsappUrl && (
                <div className="pt-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    className="inline-flex items-center gap-2 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5]"
                  >
                    Send acceptance to ISW
                  </a>
                  <p className="mt-2 text-[11px] text-[#5C6670]">
                    Tap Send acceptance so we receive your final selection. We will
                    send you the signed copy on Ina SpaceWorks letterhead.
                  </p>
                </div>
              )}
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

          {client.status !== "Approved" && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Your Full Name"
                className="border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
              />
              <input
                type="text"
                value={signerMobile}
                onChange={(e) => setSignerMobile(e.target.value)}
                placeholder="Mobile Number"
                className="border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
              />
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="Email Address"
                className="border border-[#D9D4CA] px-3 py-2 text-xs outline-none focus:border-[#2495D3]"
              />
            </div>
          )}

          <textarea
            rows={3}
            value={portalMessage}
            onChange={(e) => setPortalMessage(e.target.value)}
            placeholder="Write a message, ask a question, or mention any layout/scope notes..."
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
                  ? "Proposal Accepted"
                  : "Approve & Accept"}
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

      {/* 13. Footer */}
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
