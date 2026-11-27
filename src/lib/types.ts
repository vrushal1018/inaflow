export type ProposalStatus =
  | "Draft"
  | "Sent"
  | "In Discussion"
  | "Approved"
  | "Revision Requested";

export interface BenefitItem {
  title: string;
  description: string;
  icon: "mood" | "courtyard" | "focus" | "innovation";
}

export interface BuyingJourneyStep {
  step: number;
  title: string;
  subtitle: string;
}

export interface PaymentMilestone {
  percent: string;
  label: string;
}

export interface CompanyProfile {
  companyName: string;
  tagline: string;
  aboutTitle: string;
  aboutParagraphs: string[];
  brandOriginTop: string;
  brandOriginBottom: string;
  benefitsHeading: string;
  benefits: BenefitItem[];
  guaranteeTitle: string;
  guaranteeDescription: string;
  guaranteeItems: string[];
  buyingJourneyTitle: string;
  buyingJourney: BuyingJourneyStep[];
  termsTitle: string;
  termsAndConditions: string[];
  paymentMilestones?: PaymentMilestone[];
  includedItems?: string[];
  notIncludedItems?: string[];
  contact: {
    phone: string;
    email: string;
    address: string;
    website: string;
    instagram: string;
    youtube: string;
    linkedin: string;
  };
  updatedAt: string;
}

export interface Design2DItem {
  id: string;
  spaceName: string;
  designStyle: string;
  finish: string;
  customerLayoutUrl?: string;
  customerLayoutName?: string;
  proposedLayoutUrl?: string;
  proposedLayoutName?: string;
}

export interface Design3DItem {
  id: string;
  title: string;
  caption?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

export interface QuotationLineItem {
  sNo: number;
  category?: string;
  designAndFinish: string;
  floor: string;
  area: string;
  unit?: string;
  unitPrice: number;
  qty: number;
  totalPrice: number;
}

export interface QuotationData {
  documentUrl?: string;
  documentName?: string;
  documentType?: string;
  excelFileName?: string;
  items: QuotationLineItem[];
  raftersDelivery: string;
  consolesDelivery: string;
  freightAndInstallation: number;
  taxPercent: number;
  currencySymbol: string;
  notes?: string;
}

export interface InvoiceData {
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentStatus: "Pending" | "Advance Paid" | "Paid";
  amount?: number;
  documentUrl?: string;
  documentName?: string;
  documentType?: string;
  notes?: string;
}

export interface CommunicationEntry {
  id: string;
  sender: "Studio" | "Client" | "System";
  channel: "Note" | "Call" | "WhatsApp" | "Email" | "Meeting" | "Portal" | "Status";
  message: string;
  createdAt: string;
}

export interface BriefItem {
  id: string;
  title: string;
  detail: string;
}

export interface AcceptanceRecord {
  acceptedByName: string;
  acceptedByMobile?: string;
  acceptedByEmail?: string;
  acceptedAt: string;
  selectedWorksTotal?: number;
  notes?: string;
}

export interface ClientProfile {
  id: string;
  slug: string;
  clientGroupId?: string;
  versionLabel?: string;
  proposalRef?: string;
  validDays?: string;
  engagementType?: string;
  contractTarget?: number;
  consultancyFee?: number;
  carpetArea?: string;
  timeOnSite?: string;
  currentJourneyStep?: number;
  clientName: string;
  projectName: string;
  mobile: string;
  email: string;
  siteAddress: string;
  zone: string;
  proposalDate: string;
  status: ProposalStatus;
  briefItems?: BriefItem[];
  designs2D: Design2DItem[];
  designs3D: Design3DItem[];
  quotation: QuotationData;
  invoice: InvoiceData;
  acceptance?: AcceptanceRecord;
  communications: CommunicationEntry[];
  createdAt: string;
  updatedAt: string;
}
