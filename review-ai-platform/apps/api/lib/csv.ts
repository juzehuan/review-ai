import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

export interface ParsedReviewInput {
  cmtId: string;
  shopId: string;
  itemId: string;
  ratingStar: number;
  comment: string;
  commentTr: string | null;
  modelName: string | null;
  hasMedia: boolean;
  commentTime: Date | null;
  rawJson: Record<string, unknown>;
}

function parseBoolean(value: unknown) {
  return String(value ?? "").toLowerCase() === "true";
}

function parseDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseShopeeCsv(csvContent: string) {
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    bom: true
  }) as Array<Record<string, string>>;

  return normalizeReviewRows(rows);
}

export function parseReviewFile(filename: string, content: Buffer) {
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith(".csv")) {
    return parseShopeeCsv(content.toString("utf8"));
  }

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const workbook = XLSX.read(content, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("Excel 文件没有可读取的工作表");
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false
    });
    return normalizeReviewRows(rows);
  }

  throw new Error("仅支持 CSV、XLS、XLSX 文件");
}

function normalizeReviewRows(rows: Array<Record<string, unknown>>) {
  const normalized = rows
    .map<ParsedReviewInput | null>((row) => {
    const cmtId = String(row.cmtid || "").trim();
    const ratingStar = Number(row.rating_star || 0);
    const comment = String(row.comment || "").trim();
    const commentTr = String(row.comment_tr || "").trim() || null;

    if (!cmtId) {
      throw new Error("CSV 缺少 cmtid");
    }

    if (!ratingStar) {
      throw new Error(`评论 ${cmtId} 缺少 rating_star`);
    }

    if (!comment && !commentTr) {
      return null;
    }

    return {
      cmtId,
      shopId: String(row.shopid || "").trim(),
      itemId: String(row.itemid || "").trim(),
      ratingStar,
      comment,
      commentTr,
      modelName: String(row.model_name || "").trim() || null,
      hasMedia: parseBoolean(row.has_media),
      commentTime: parseDate(row.ctime_iso),
      rawJson: row
    };
    })
    .filter((row): row is ParsedReviewInput => Boolean(row));

  return normalized;
}
