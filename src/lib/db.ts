import mongoose, { Schema, Model } from "mongoose";
import fs from "fs/promises";
import path from "path";
import { ClientProfile, CompanyProfile } from "./types";
import { DEFAULT_COMPANY_PROFILE } from "./defaults";

const MONGODB_URI = process.env.MONGODB_URI || "";
const IS_VERCEL = Boolean(process.env.VERCEL);
const LOCAL_DB_PATH = IS_VERCEL
  ? path.join("/tmp", "inaflow-db.json")
  : path.join(process.cwd(), "data", "inaflow-db.json");
const LOCAL_UPLOAD_DIR = IS_VERCEL
  ? path.join("/tmp", "inaflow-uploads")
  : path.join(process.cwd(), "public", "uploads");

interface LocalStore {
  company: CompanyProfile;
  clients: ClientProfile[];
}

interface StoredFileDoc {
  id: string;
  clientId: string;
  fileName: string;
  fileType: string;
  data: Buffer;
  createdAt: string;
}

declare global {
  var _mongoosePromise: Promise<typeof mongoose> | undefined;
}

async function connectMongo(): Promise<boolean> {
  if (!MONGODB_URI) return false;
  try {
    if (mongoose.connection.readyState === 1) return true;
    if (!global._mongoosePromise) {
      global._mongoosePromise = mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
    }
    await global._mongoosePromise;
    return true;
  } catch (err) {
    console.warn(
      "[inaflow] MongoDB unavailable, using fallback store:",
      (err as Error).message
    );
    global._mongoosePromise = undefined;
    return false;
  }
}

const CompanySchema = new Schema<CompanyProfile>(
  {
    companyName: String,
    tagline: String,
    aboutTitle: String,
    aboutParagraphs: [String],
    brandOriginTop: String,
    brandOriginBottom: String,
    benefitsHeading: String,
    benefits: [
      {
        title: String,
        description: String,
        icon: String,
      },
    ],
    guaranteeTitle: String,
    guaranteeDescription: String,
    guaranteeItems: [String],
    buyingJourneyTitle: String,
    buyingJourney: [
      {
        step: Number,
        title: String,
        subtitle: String,
      },
    ],
    termsTitle: String,
    termsAndConditions: [String],
    contact: {
      phone: String,
      email: String,
      address: String,
      website: String,
      instagram: String,
      youtube: String,
      linkedin: String,
    },
    updatedAt: String,
  },
  { timestamps: false, strict: false }
);

const ClientSchema = new Schema<ClientProfile>(
  {
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true },
    clientGroupId: { type: String, index: true },
    versionLabel: { type: String, default: "Proposal v1" },
    clientName: { type: String, required: true },
    projectName: { type: String, default: "" },
    mobile: { type: String, default: "" },
    email: { type: String, default: "" },
    siteAddress: { type: String, default: "" },
    zone: { type: String, default: "" },
    proposalDate: { type: String, default: "" },
    status: { type: String, default: "Draft" },
    designs2D: { type: Schema.Types.Mixed, default: [] },
    designs3D: { type: Schema.Types.Mixed, default: [] },
    quotation: { type: Schema.Types.Mixed, default: {} },
    invoice: { type: Schema.Types.Mixed, default: {} },
    communications: { type: Schema.Types.Mixed, default: [] },
    createdAt: String,
    updatedAt: String,
  },
  { timestamps: false, strict: false }
);

const UploadedFileSchema = new Schema<StoredFileDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    data: { type: Buffer, required: true },
    createdAt: String,
  },
  { timestamps: false }
);

const CompanyModel: Model<CompanyProfile> =
  mongoose.models.CompanyProfile ||
  mongoose.model<CompanyProfile>("CompanyProfile", CompanySchema);

const ClientModel: Model<ClientProfile> =
  mongoose.models.ClientProfile ||
  mongoose.model<ClientProfile>("ClientProfile", ClientSchema);

const UploadedFileModel: Model<StoredFileDoc> =
  mongoose.models.UploadedFile ||
  mongoose.model<StoredFileDoc>("UploadedFile", UploadedFileSchema);

async function readLocalStore(): Promise<LocalStore> {
  try {
    const raw = await fs.readFile(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(raw) as LocalStore;
  } catch {
    const initial: LocalStore = {
      company: DEFAULT_COMPANY_PROFILE,
      clients: [],
    };
    await writeLocalStore(initial);
    return initial;
  }
}

async function writeLocalStore(store: LocalStore): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function getDbMode(): Promise<"mongodb" | "local"> {
  return (await connectMongo()) ? "mongodb" : "local";
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  if (await connectMongo()) {
    const doc = await CompanyModel.findOne().lean();
    if (!doc) {
      await CompanyModel.create(DEFAULT_COMPANY_PROFILE);
      return DEFAULT_COMPANY_PROFILE;
    }
    const { _id, __v, ...rest } = doc as CompanyProfile & {
      _id?: unknown;
      __v?: unknown;
    };
    void _id;
    void __v;
    if (rest.companyName === "SUNROOOF") {
      await CompanyModel.findOneAndUpdate({}, DEFAULT_COMPANY_PROFILE, {
        upsert: true,
        new: true,
      });
      return DEFAULT_COMPANY_PROFILE;
    }
    return {
      ...DEFAULT_COMPANY_PROFILE,
      ...rest,
      paymentMilestones:
        rest.paymentMilestones?.length
          ? rest.paymentMilestones
          : DEFAULT_COMPANY_PROFILE.paymentMilestones,
      includedItems:
        rest.includedItems?.length
          ? rest.includedItems
          : DEFAULT_COMPANY_PROFILE.includedItems,
      notIncludedItems:
        rest.notIncludedItems?.length
          ? rest.notIncludedItems
          : DEFAULT_COMPANY_PROFILE.notIncludedItems,
    };
  }
  const store = await readLocalStore();
  if (store.company?.companyName === "SUNROOOF") {
    store.company = DEFAULT_COMPANY_PROFILE;
    await writeLocalStore(store);
  }
  return {
    ...DEFAULT_COMPANY_PROFILE,
    ...(store.company || {}),
  };
}

export async function resetCompanyProfile(): Promise<CompanyProfile> {
  const fresh: CompanyProfile = {
    ...DEFAULT_COMPANY_PROFILE,
    updatedAt: new Date().toISOString(),
  };
  if (await connectMongo()) {
    await CompanyModel.findOneAndUpdate({}, fresh, { upsert: true, new: true });
    return fresh;
  }
  const store = await readLocalStore();
  store.company = fresh;
  await writeLocalStore(store);
  return fresh;
}

export async function saveCompanyProfile(
  profile: Partial<CompanyProfile>
): Promise<CompanyProfile> {
  const current = await getCompanyProfile();
  const updated: CompanyProfile = {
    ...current,
    ...profile,
    contact: {
      ...current.contact,
      ...(profile.contact || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  if (await connectMongo()) {
    await CompanyModel.findOneAndUpdate({}, updated, {
      upsert: true,
      new: true,
    });
    return updated;
  }
  const store = await readLocalStore();
  store.company = updated;
  await writeLocalStore(store);
  return updated;
}

export async function listClients(): Promise<ClientProfile[]> {
  if (await connectMongo()) {
    const docs = await ClientModel.find().sort({ updatedAt: -1 }).lean();
    return docs.map((d) => {
      const { _id, __v, ...rest } = d as ClientProfile & {
        _id?: unknown;
        __v?: unknown;
      };
      void _id;
      void __v;
      return rest;
    });
  }
  const store = await readLocalStore();
  return [...store.clients].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getClientById(id: string): Promise<ClientProfile | null> {
  if (await connectMongo()) {
    const doc = await ClientModel.findOne({ id }).lean();
    if (!doc) return null;
    const { _id, __v, ...rest } = doc as ClientProfile & {
      _id?: unknown;
      __v?: unknown;
    };
    void _id;
    void __v;
    return rest;
  }
  const store = await readLocalStore();
  return store.clients.find((c) => c.id === id) || null;
}

export async function getClientBySlug(
  slug: string
): Promise<ClientProfile | null> {
  if (await connectMongo()) {
    const doc = await ClientModel.findOne({ slug }).lean();
    if (!doc) return null;
    const { _id, __v, ...rest } = doc as ClientProfile & {
      _id?: unknown;
      __v?: unknown;
    };
    void _id;
    void __v;
    return rest;
  }
  const store = await readLocalStore();
  return store.clients.find((c) => c.slug === slug) || null;
}

export async function createClient(
  client: ClientProfile
): Promise<ClientProfile> {
  if (await connectMongo()) {
    await ClientModel.create(client);
    return client;
  }
  const store = await readLocalStore();
  store.clients.unshift(client);
  await writeLocalStore(store);
  return client;
}

export async function updateClient(
  id: string,
  patch: Partial<ClientProfile>
): Promise<ClientProfile | null> {
  const existing = await getClientById(id);
  if (!existing) return null;
  const updated: ClientProfile = {
    ...existing,
    ...patch,
    id: existing.id,
    slug: existing.slug,
    updatedAt: new Date().toISOString(),
  };

  if (await connectMongo()) {
    await ClientModel.findOneAndUpdate({ id }, updated, { new: true });
    return updated;
  }
  const store = await readLocalStore();
  const idx = store.clients.findIndex((c) => c.id === id);
  if (idx >= 0) {
    store.clients[idx] = updated;
    await writeLocalStore(store);
  }
  return updated;
}

export async function deleteClient(id: string): Promise<boolean> {
  if (await connectMongo()) {
    const res = await ClientModel.deleteOne({ id });
    return res.deletedCount > 0;
  }
  const store = await readLocalStore();
  const before = store.clients.length;
  store.clients = store.clients.filter((c) => c.id !== id);
  await writeLocalStore(store);
  return store.clients.length < before;
}

export async function saveUploadedFile(file: {
  id: string;
  clientId: string;
  fileName: string;
  fileType: string;
  buffer: Buffer;
}): Promise<void> {
  if (await connectMongo()) {
    await UploadedFileModel.create({
      id: file.id,
      clientId: file.clientId,
      fileName: file.fileName,
      fileType: file.fileType,
      data: file.buffer,
      createdAt: new Date().toISOString(),
    });
    return;
  }
  const dir = path.join(LOCAL_UPLOAD_DIR, file.clientId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${file.id}.meta.json`),
    JSON.stringify({ fileName: file.fileName, fileType: file.fileType })
  );
  await fs.writeFile(path.join(dir, file.id), file.buffer);
}

export async function getUploadedFile(id: string): Promise<{
  fileName: string;
  fileType: string;
  buffer: Buffer;
} | null> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (await connectMongo()) {
    const doc = await UploadedFileModel.findOne({ id: safeId }).lean();
    if (!doc) return null;
    const raw = doc.data as unknown;
    const buffer = Buffer.isBuffer(raw)
      ? raw
      : Buffer.from((raw as { buffer: Uint8Array }).buffer || (raw as Uint8Array));
    return {
      fileName: doc.fileName,
      fileType: doc.fileType,
      buffer,
    };
  }
  try {
    const entries = await fs.readdir(LOCAL_UPLOAD_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(LOCAL_UPLOAD_DIR, entry.name, safeId);
      try {
        const buffer = await fs.readFile(candidate);
        const metaRaw = await fs.readFile(`${candidate}.meta.json`, "utf-8");
        const meta = JSON.parse(metaRaw) as {
          fileName: string;
          fileType: string;
        };
        return {
          fileName: meta.fileName,
          fileType: meta.fileType,
          buffer,
        };
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }
  return null;
}
