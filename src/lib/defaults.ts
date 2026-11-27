import { CompanyProfile } from "./types";

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: "INA SpaceWorks",
  tagline: "Design leads. Everything else works. • An Ina TechFM Vertical",
  aboutTitle: "About INA SpaceWorks",
  aboutParagraphs: [
    "INA SpaceWorks is an interior design and turnkey execution firm specializing in workplaces and commercial spaces. Operating as the dedicated interior vertical of Ina TechFM, we bring together architectural design, precision engineering, and long-term facility care under one roof.",
    "The whole life of a space — one team, from the first sketch to the years after. From space planning and 3D conceptualization to turnkey build, project management, and ongoing care, we design, build, and evolve spaces built to perform.",
  ],
  brandOriginTop: "Design • Build • Evolve",
  brandOriginBottom: "Design leads. Everything else works.",
  benefitsHeading: "The INA SpaceWorks Ecosystem",
  benefits: [
    {
      title: "Designworks",
      description:
        "Space planning, layout configurations, and 3D design conceptualization tailored around your workflows.",
      icon: "courtyard",
    },
    {
      title: "Buildworks",
      description:
        "Turnkey execution covering modular & custom furniture, civil work, ceilings, partitions, and MEPF.",
      icon: "innovation",
    },
    {
      title: "Manageworks",
      description:
        "Project Management Consultancy ensuring brief adherence, budgeting, vendor selection, and QA.",
      icon: "focus",
    },
    {
      title: "Careworks",
      description:
        "Ongoing facility upkeep, retrofits, MEPF maintenance, and interior touch-ups by on-site engineers.",
      icon: "mood",
    },
  ],
  guaranteeTitle: "Execution & Quality Assurance",
  guaranteeDescription:
    "Every INA SpaceWorks project is delivered with end-to-end engineering accountability and post-handover Careworks support across core deliverables:",
  guaranteeItems: [
    "Civil, Ceilings & Partitions",
    "Modular & Custom Furniture",
    "MEPF & Lighting Systems",
    "Post-Handover Careworks Support",
  ],
  buyingJourneyTitle: "Project Journey",
  buyingJourney: [
    { step: 1, title: "Discovery & Brief", subtitle: "Site & workflow study" },
    { step: 2, title: "Designworks", subtitle: "2D layouts & 3D concepts" },
    { step: 3, title: "Commercials", subtitle: "BOQ & quotation sign-off" },
    { step: 4, title: "Buildworks", subtitle: "Turnkey execution & MEPF" },
    { step: 5, title: "Manageworks QA", subtitle: "Snag-free handover" },
    { step: 6, title: "Careworks", subtitle: "Ongoing upkeep & support" },
  ],
  termsTitle: "Terms & Conditions",
  termsAndConditions: [
    "50% advance payment is required to confirm the order and mobilize site measurement and engineering teams.",
    "This quotation is valid for 30 days from the date of issue.",
    "Signed 2D/3D production drawings and material finishes are mandatory before fabrication commences.",
    "Any site layout or scope modifications must be approved in writing prior to execution.",
    "Work schedule and milestone timelines take effect upon receipt of advance payment and clear site handover.",
    "Freight, installation, and handling charges are itemized separately unless explicitly stated as inclusive.",
    "All applicable government taxes (GST) are extra as per prevailing statutory rates.",
    "Custom-fabricated furniture and ordered materials cannot be cancelled or refunded once production begins.",
    "All deliverables undergo Manageworks quality checks prior to final handover.",
    "This proposal supersedes all prior verbal or written estimates for the specified scope.",
  ],
  paymentMilestones: [
    { percent: "50%", label: "Advance on proposal acceptance" },
    { percent: "25%", label: "Mid-execution milestone" },
    { percent: "25%", label: "Prior to final handover" },
  ],
  includedItems: [
    "2D space planning & working drawings",
    "3D interior views & material selection",
    "Turnkey execution & MEPF supervision",
    "Joint measurement & quality checks",
    "Post-handover Careworks support",
  ],
  notIncludedItems: [
    "Applicable GST & statutory taxes",
    "Society permissions & refundable deposits",
    "Loose appliances & personal decor items",
    "Structural alterations beyond approved scope",
  ],
  contact: {
    phone: "+91 9156 802 555",
    email: "evolve@inaspaceworks.com",
    address:
      "1st Floor, C-Wing, MBC Park, G.B. Road, Kasarvadavli, Thane West, Maharashtra 400615, India",
    website: "www.inaspaceworks.com",
    instagram: "https://inaspaceworks.com",
    youtube: "https://inaspaceworks.com",
    linkedin: "https://inaspaceworks.com",
  },
  updatedAt: new Date().toISOString(),
};
