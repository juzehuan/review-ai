import { parse } from "csv-parse/sync";

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

export interface ParseStats {
  totalParsed: number;
  droppedEmpty: number;
}

export interface ParsedCsvResult {
  rows: ParsedReviewInput[];
  stats: ParseStats;
}

export function parseShopeeCsv(csvContent: string): ParsedCsvResult {
  const rawRows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    bom: true
  }) as Array<Record<string, string>>;

  let droppedEmpty = 0;

  const rows = rawRows
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
        droppedEmpty += 1;
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

  return {
    rows,
    stats: {
      totalParsed: rawRows.length,
      droppedEmpty
    }
  };
}
