import * as XLSX from "xlsx";
import type { QuotationLineItem } from "./types";

function cleanNumber(val: unknown): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val !== "string") return 0;
  // Strip currency symbols, Rs., INR, commas, /- and spaces
  const cleaned = val
    .replace(/rs\.?|inr|₹|\$|\/-|,|\s/gi, "")
    .trim();
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normHeader(val: unknown): string {
  return String(val ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseSheetRows(rows: unknown[][]): {
  items: QuotationLineItem[];
  categoriesCount: number;
  detectedTaxPercent: number;
} {
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

  for (let r = 0; r < Math.min(rows.length, 35); r++) {
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
        (h === "s no" ||
          h === "sno" ||
          h === "sr no" ||
          h === "sr" ||
          h === "no" ||
          h === "sl no" ||
          h === "item no")
      ) {
        candidate.sNo = c;
      } else if (
        candidate.category === -1 &&
        (h === "category" ||
          h === "section" ||
          h === "head" ||
          h === "group" ||
          h === "trade")
      ) {
        candidate.category = c;
      } else if (
        candidate.desc === -1 &&
        (h.includes("particular") ||
          h.includes("description") ||
          h === "scope" ||
          h === "item" ||
          h === "items" ||
          h.includes("item name") ||
          h.includes("design and finish") ||
          h.includes("work description"))
      ) {
        candidate.desc = c;
      } else if (candidate.floor === -1 && (h === "floor" || h === "level")) {
        candidate.floor = c;
      } else if (
        candidate.area === -1 &&
        (h === "area" || h === "room" || h === "location" || h === "space")
      ) {
        candidate.area = c;
      } else if (
        candidate.unit === -1 &&
        (h === "unit" || h === "uom" || h === "units")
      ) {
        candidate.unit = c;
      } else if (
        candidate.qty === -1 &&
        (h === "qty" || h === "quantity" || h === "qnty" || h === "nos")
      ) {
        candidate.qty = c;
      } else if (
        candidate.rate === -1 &&
        (h === "rate" ||
          h === "unit rate" ||
          h === "unit price" ||
          h === "price" ||
          h.includes("rate per"))
      ) {
        candidate.rate = c;
      } else if (
        candidate.total === -1 &&
        (h === "amount" ||
          h === "total" ||
          h === "total amount" ||
          h === "total price" ||
          h === "net amount" ||
          h === "value")
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

  if (headerIdx === -1) {
    return { items: [], categoriesCount: 0, detectedTaxPercent: 0 };
  }

  const items: QuotationLineItem[] = [];
  let currentCategory = "General";
  const categorySet = new Set<string>();
  let detectedTaxPercent = 0;

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const descRaw = String(row[colMap.desc] ?? "").trim();
    if (!descRaw) continue;

    const lowerDesc = descRaw.toLowerCase();

    // Detect explicit GST percentage if a GST row exists
    if (lowerDesc.includes("gst") || lowerDesc.includes("tax")) {
      const pctMatch = descRaw.match(/(\d+(?:\.\d+)?)\s*%/);
      if (pctMatch) {
        detectedTaxPercent = Number(pctMatch[1]) || 0;
      }
      continue;
    }

    const qty = colMap.qty >= 0 ? cleanNumber(row[colMap.qty]) : 0;
    const rate = colMap.rate >= 0 ? cleanNumber(row[colMap.rate]) : 0;
    const total = colMap.total >= 0 ? cleanNumber(row[colMap.total]) : 0;
    const unitRaw =
      colMap.unit >= 0 ? String(row[colMap.unit] ?? "").trim() : "";
    const isLumpSumUnit = /^(ls|l\.s\.?|lumpsum|lump\s*sum|lot|job)$/i.test(
      unitRaw
    );

    // Skip summary / subtotal / grand total / head-of-work summary rows so they are never double-counted
    if (
      /^(total|sub\s*-?\s*total|grand\s*total|net\s*total|net\s*amount|summary|abstract)/i.test(
        lowerDesc
      ) ||
      ((qty === 0 || rate === 0) &&
        /\b(total|subtotal|sub-total|abstract|summary|carried\s*forward|brought\s*forward)\b/i.test(
          lowerDesc
        ))
    ) {
      continue;
    }

    // Section / category header row (no numeric qty/rate; even if Excel puts a section subtotal in Total column)
    if (qty === 0 && rate === 0 && !isLumpSumUnit) {
      currentCategory = descRaw;
      continue;
    }

    const rowCategory =
      colMap.category >= 0 && String(row[colMap.category] ?? "").trim()
        ? String(row[colMap.category]).trim()
        : currentCategory;

    const resolvedQty = qty > 0 ? qty : 1;
    // Prefer exact Excel total when present; otherwise compute rate * qty
    const resolvedTotal = total > 0 ? total : rate * resolvedQty;
    const resolvedRate =
      rate > 0 ? rate : resolvedQty > 0 ? resolvedTotal / resolvedQty : 0;

    categorySet.add(rowCategory);

    items.push({
      sNo: items.length + 1,
      category: rowCategory,
      designAndFinish: descRaw,
      floor:
        colMap.floor >= 0 ? String(row[colMap.floor] ?? "").trim() : "",
      area: colMap.area >= 0 ? String(row[colMap.area] ?? "").trim() : "",
      unit: unitRaw,
      unitPrice: Math.round(resolvedRate * 100) / 100,
      qty: resolvedQty,
      totalPrice: Math.round(resolvedTotal * 100) / 100,
    });
  }

  return {
    items,
    categoriesCount: categorySet.size,
    detectedTaxPercent,
  };
}

export function parseQuotationWorkbook(buffer: ArrayBuffer): {
  items: QuotationLineItem[];
  sheetName: string;
  categoriesCount: number;
  detectedTaxPercent: number;
} {
  const wb = XLSX.read(buffer, { type: "array" });
  let best: {
    items: QuotationLineItem[];
    sheetName: string;
    categoriesCount: number;
    detectedTaxPercent: number;
  } = {
    items: [],
    sheetName: wb.SheetNames[0] || "",
    categoriesCount: 0,
    detectedTaxPercent: 0,
  };

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });
    const parsed = parseSheetRows(rows);
    if (parsed.items.length > best.items.length) {
      best = {
        ...parsed,
        sheetName: name,
      };
    }
  }

  return best;
}
