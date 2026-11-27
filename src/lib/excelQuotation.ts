import * as XLSX from "xlsx";
import type { QuotationLineItem } from "./types";

function cleanNumber(val: unknown): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val !== "string") return 0;
  const cleaned = val.replace(/[₹$,\s]/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normHeader(val: unknown): string {
  return String(val ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseQuotationWorkbook(buffer: ArrayBuffer): {
  items: QuotationLineItem[];
  sheetName: string;
  categoriesCount: number;
} {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { items: [], sheetName: "", categoriesCount: 0 };
  }

  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  // Locate header row by matching common BOQ / Quotation column names
  let headerIdx = -1;
  let colMap = {
    sNo: -1,
    category: -1,
    desc: -1,
    floor: -1,
    area: -1,
    unit: -1,
    rate: -1,
    qty: -1,
    total: -1,
  };

  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r] || [];
    const candidate = {
      sNo: -1,
      category: -1,
      desc: -1,
      floor: -1,
      area: -1,
      unit: -1,
      rate: -1,
      qty: -1,
      total: -1,
    };

    row.forEach((cell, c) => {
      const h = normHeader(cell);
      if (!h) return;
      if (
        candidate.sNo === -1 &&
        (h === "s no" || h === "sno" || h === "sr no" || h === "no" || h === "item no")
      ) {
        candidate.sNo = c;
      } else if (
        candidate.category === -1 &&
        (h.includes("category") || h.includes("section") || h.includes("group"))
      ) {
        candidate.category = c;
      } else if (
        candidate.desc === -1 &&
        (h.includes("particular") ||
          h.includes("description") ||
          h.includes("scope") ||
          h.includes("item") ||
          h.includes("design") ||
          h.includes("work"))
      ) {
        candidate.desc = c;
      } else if (candidate.floor === -1 && h.includes("floor")) {
        candidate.floor = c;
      } else if (
        candidate.area === -1 &&
        (h.includes("area") || h.includes("room") || h.includes("location"))
      ) {
        candidate.area = c;
      } else if (
        candidate.unit === -1 &&
        (h === "unit" || h === "uom" || h === "units")
      ) {
        candidate.unit = c;
      } else if (
        candidate.rate === -1 &&
        (h.includes("rate") || h.includes("unit price") || h === "price")
      ) {
        candidate.rate = c;
      } else if (
        candidate.qty === -1 &&
        (h === "qty" || h.includes("quantity"))
      ) {
        candidate.qty = c;
      } else if (
        candidate.total === -1 &&
        (h.includes("amount") || h.includes("total"))
      ) {
        candidate.total = c;
      }
    });

    const matchedCols = Object.values(candidate).filter((v) => v >= 0).length;
    if (candidate.desc >= 0 && matchedCols >= 2) {
      headerIdx = r;
      colMap = candidate;
      break;
    }
  }

  // Fallback: if no explicit header matched, assume [S.No, Description, Qty, Rate, Total]
  if (headerIdx === -1) {
    headerIdx = 0;
    colMap = {
      sNo: 0,
      category: -1,
      desc: 1,
      floor: -1,
      area: -1,
      unit: -1,
      qty: 2,
      rate: 3,
      total: 4,
    };
  }

  const items: QuotationLineItem[] = [];
  let currentCategory = "General";
  const categorySet = new Set<string>();

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const descRaw = String(row[colMap.desc] ?? "").trim();
    if (!descRaw) continue;

    const lowerDesc = descRaw.toLowerCase();
    if (
      lowerDesc.startsWith("total") ||
      lowerDesc.startsWith("sub total") ||
      lowerDesc.startsWith("subtotal") ||
      lowerDesc.startsWith("grand total") ||
      lowerDesc.startsWith("gst") ||
      lowerDesc.startsWith("tax")
    ) {
      continue;
    }

    const qty = colMap.qty >= 0 ? cleanNumber(row[colMap.qty]) : 0;
    const rate = colMap.rate >= 0 ? cleanNumber(row[colMap.rate]) : 0;
    const total = colMap.total >= 0 ? cleanNumber(row[colMap.total]) : 0;

    // Detect section/category header rows (text in description, no numeric qty/rate/total)
    if (qty === 0 && rate === 0 && total === 0) {
      currentCategory = descRaw;
      continue;
    }

    const rowCategory =
      colMap.category >= 0 && String(row[colMap.category] ?? "").trim()
        ? String(row[colMap.category]).trim()
        : currentCategory;

    const resolvedQty = qty || 1;
    const resolvedTotal = total || rate * resolvedQty;
    const resolvedRate = rate || (resolvedQty ? resolvedTotal / resolvedQty : 0);

    categorySet.add(rowCategory);

    items.push({
      sNo: items.length + 1,
      category: rowCategory,
      designAndFinish: descRaw,
      floor:
        colMap.floor >= 0 ? String(row[colMap.floor] ?? "").trim() : "",
      area: colMap.area >= 0 ? String(row[colMap.area] ?? "").trim() : "",
      unit: colMap.unit >= 0 ? String(row[colMap.unit] ?? "").trim() : "",
      unitPrice: Math.round(resolvedRate * 100) / 100,
      qty: resolvedQty,
      totalPrice: Math.round(resolvedTotal * 100) / 100,
    });
  }

  return {
    items,
    sheetName,
    categoriesCount: categorySet.size,
  };
}
