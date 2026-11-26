"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Plus, Save, Trash2 } from "lucide-react";
import type { CompanyProfile } from "@/lib/types";

export default function CompanySettingsPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    fetch("/api/company")
      .then((r) => r.json())
      .then((d) => setCompany(d.company));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      const data = await res.json();
      setCompany(data.company);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefaults() {
    if (!confirm("Reset company profile to INA SpaceWorks defaults?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      setCompany(data.company);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F2EE] text-sm text-[#5C6670]">
        Loading company defaults...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F2EE] pb-16 text-[#111111]">
      <header className="sticky top-0 z-30 border-b border-[#D9D4CA] bg-[#F4F2EE]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="border border-[#D9D4CA] bg-white p-2 text-[#111111] hover:border-[#111111]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                Company Profile &amp; Preset Defaults
              </h1>
              <p className="text-xs text-[#5C6670]">
                Pre-filled on every client proposal URL you generate.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={saving}
              className="border-[1.5px] border-[#111111] bg-transparent px-3.5 py-2 text-xs font-medium tracking-wider uppercase text-[#111111] hover:bg-[#111111] hover:text-white disabled:opacity-50 cursor-pointer"
            >
              Reset to INA Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 border-[1.5px] border-[#2495D3] bg-[#2495D3] px-4 py-2 text-xs font-medium tracking-wider uppercase text-white hover:bg-[#1B7DB5] disabled:opacity-50 cursor-pointer"
            >
              {savedToast ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Defaults"}
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSave}
        className="mx-auto mt-8 max-w-5xl space-y-6 px-4 sm:px-6"
      >
        {/* Brand Identity */}
        <section className="border border-[#D9D4CA] bg-white p-6">
          <h2 className="text-xs font-medium tracking-[0.24em] text-[#5C6670] uppercase">
            01 &bull; Brand Identity
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                Company Name
              </label>
              <input
                type="text"
                value={company.companyName}
                onChange={(e) =>
                  setCompany({ ...company, companyName: e.target.value })
                }
                className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={company.tagline}
                onChange={(e) =>
                  setCompany({ ...company, tagline: e.target.value })
                }
                className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                Statement Banner Top Line
              </label>
              <input
                type="text"
                value={company.brandOriginTop}
                onChange={(e) =>
                  setCompany({ ...company, brandOriginTop: e.target.value })
                }
                className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                Statement Banner Bottom Line
              </label>
              <input
                type="text"
                value={company.brandOriginBottom}
                onChange={(e) =>
                  setCompany({ ...company, brandOriginBottom: e.target.value })
                }
                className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
              />
            </div>
          </div>
        </section>

        {/* About Company */}
        <section className="border border-[#D9D4CA] bg-white p-6">
          <h2 className="text-xs font-medium tracking-[0.24em] text-[#5C6670] uppercase">
            02 &bull; About Company
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                Section Heading
              </label>
              <input
                type="text"
                value={company.aboutTitle}
                onChange={(e) =>
                  setCompany({ ...company, aboutTitle: e.target.value })
                }
                className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
              />
            </div>
            {company.aboutParagraphs.map((para, idx) => (
              <div key={idx} className="flex gap-2">
                <textarea
                  rows={3}
                  value={para}
                  onChange={(e) => {
                    const next = [...company.aboutParagraphs];
                    next[idx] = e.target.value;
                    setCompany({ ...company, aboutParagraphs: next });
                  }}
                  className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
                />
                {company.aboutParagraphs.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCompany({
                        ...company,
                        aboutParagraphs: company.aboutParagraphs.filter(
                          (_, i) => i !== idx
                        ),
                      })
                    }
                    className="self-start p-2 text-[#5C6670] hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setCompany({
                  ...company,
                  aboutParagraphs: [...company.aboutParagraphs, ""],
                })
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2495D3] hover:underline cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Paragraph
            </button>
          </div>
        </section>

        {/* Terms & Conditions */}
        <section className="border border-[#D9D4CA] bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium tracking-[0.24em] text-[#5C6670] uppercase">
              03 &bull; Terms &amp; Conditions
            </h2>
            <button
              type="button"
              onClick={() =>
                setCompany({
                  ...company,
                  termsAndConditions: [...company.termsAndConditions, ""],
                })
              }
              className="inline-flex items-center gap-1 text-xs font-medium text-[#2495D3] hover:underline cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Term
            </button>
          </div>
          <div className="mt-4 space-y-2.5">
            {company.termsAndConditions.map((term, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 text-right text-xs font-medium text-[#5C6670]">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => {
                    const next = [...company.termsAndConditions];
                    next[idx] = e.target.value;
                    setCompany({ ...company, termsAndConditions: next });
                  }}
                  className="flex-1 border border-[#D9D4CA] px-3.5 py-2 text-sm outline-none focus:border-[#2495D3]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setCompany({
                      ...company,
                      termsAndConditions: company.termsAndConditions.filter(
                        (_, i) => i !== idx
                      ),
                    })
                  }
                  className="p-2 text-[#5C6670] hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Info */}
        <section className="border border-[#D9D4CA] bg-white p-6">
          <h2 className="text-xs font-medium tracking-[0.24em] text-[#5C6670] uppercase">
            04 &bull; Contact &amp; Footer
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                Phone
              </label>
              <input
                type="text"
                value={company.contact.phone}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    contact: { ...company.contact, phone: e.target.value },
                  })
                }
                className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                Email
              </label>
              <input
                type="email"
                value={company.contact.email}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    contact: { ...company.contact, email: e.target.value },
                  })
                }
                className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                Website
              </label>
              <input
                type="text"
                value={company.contact.website}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    contact: { ...company.contact, website: e.target.value },
                  })
                }
                className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3E464F]">
                Address
              </label>
              <input
                type="text"
                value={company.contact.address}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    contact: { ...company.contact, address: e.target.value },
                  })
                }
                className="w-full border border-[#D9D4CA] px-3.5 py-2.5 text-sm outline-none focus:border-[#2495D3]"
              />
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
