import { timingSafeEqual } from "node:crypto";
import type { VercelRequest } from "@vercel/node";
import {
  CompanyOpsHttpError,
  type CompanyOpsSession,
} from "./auth.ts";
import type { CompanyOpsConfig } from "./config.ts";

// Feishu's single-request upload API stops at 20 MiB. Larger files use its
// official multipart flow, while this application keeps an explicit upper
// bound so a single upload cannot monopolise the small production server.
export const FEISHU_SINGLE_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const MAX_COMPANY_OPS_ASSET_BYTES = 500 * 1024 * 1024;

const MAX_FILE_NAME_CHARACTERS = 240;
const UPLOAD_WINDOW_MS = 10 * 60_000;
const MAX_UPLOADS_PER_USER_PER_WINDOW = 12;
const MAX_CONCURRENT_UPLOADS = 1;

const MIME_BY_EXTENSION: Readonly<Record<string, ReadonlySet<string>>> = {
  ".mp4": new Set(["video/mp4", "application/octet-stream"]),
  ".mov": new Set(["video/quicktime", "application/octet-stream"]),
  ".m4v": new Set(["video/x-m4v", "video/mp4", "application/octet-stream"]),
  ".webm": new Set(["video/webm", "application/octet-stream"]),
  ".jpg": new Set(["image/jpeg", "application/octet-stream"]),
  ".jpeg": new Set(["image/jpeg", "application/octet-stream"]),
  ".png": new Set(["image/png", "application/octet-stream"]),
  ".webp": new Set(["image/webp", "application/octet-stream"]),
  ".heic": new Set(["image/heic", "image/heif", "application/octet-stream"]),
  ".heif": new Set(["image/heif", "image/heic", "application/octet-stream"]),
  ".pdf": new Set(["application/pdf", "application/octet-stream"]),
  ".docx": new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ]),
  ".xlsx": new Set([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
  ]),
  ".pptx": new Set([
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/octet-stream",
  ]),
  ".csv": new Set([
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
    "application/octet-stream",
  ]),
  ".txt": new Set(["text/plain", "application/octet-stream"]),
};

const headerText = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] || "" : value || "";

const safeEqualText = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
};

export function requireCompanyOpsAssetUploadCsrf(
  req: VercelRequest,
  session: CompanyOpsSession,
  config: CompanyOpsConfig
): void {
  const csrf = headerText(req.headers["x-csrf-token"]);
  if (!csrf || !safeEqualText(csrf, session.csrfToken)) {
    throw new CompanyOpsHttpError(403, "The request could not be verified");
  }

  const origin = headerText(req.headers.origin);
  if (origin) {
    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(config.oauthRedirectUri).origin;
    } catch {
      throw new CompanyOpsHttpError(503, "Company Operations is not configured");
    }
    if (origin !== expectedOrigin) {
      throw new CompanyOpsHttpError(
        403,
        "This request came from an invalid origin"
      );
    }
  }

  const fetchSite = headerText(req.headers["sec-fetch-site"]).toLowerCase();
  if (fetchSite === "cross-site") {
    throw new CompanyOpsHttpError(
      403,
      "This request came from an invalid origin"
    );
  }

  const contentEncoding = headerText(req.headers["content-encoding"])
    .trim()
    .toLowerCase();
  if (contentEncoding && contentEncoding !== "identity") {
    throw new CompanyOpsHttpError(415, "Encoded file uploads are not supported");
  }
}

export interface CompanyOpsAssetFile {
  fileName: string;
  extension: string;
  mimeType: string;
  bytes: Buffer;
}

export type CompanyOpsAssetMetadata = Omit<CompanyOpsAssetFile, "bytes"> & {
  size: number;
};

function normalizeFileName(value: unknown): string {
  if (typeof value !== "string") {
    throw new CompanyOpsHttpError(400, "fileName is required");
  }
  const fileName = value.normalize("NFC").trim();
  if (!fileName || fileName === "." || fileName === "..") {
    throw new CompanyOpsHttpError(400, "fileName is required");
  }
  if (
    Array.from(fileName).length > MAX_FILE_NAME_CHARACTERS ||
    Array.from(fileName).some((character) => {
      const code = character.codePointAt(0) || 0;
      return code <= 0x1f || code === 0x7f || character === "/" || character === "\\";
    }) ||
    /[\u202a-\u202e\u2066-\u2069]/u.test(fileName)
  ) {
    throw new CompanyOpsHttpError(400, "The file name is not allowed");
  }
  return fileName;
}

function signatureMatches(extension: string, bytes: Buffer): boolean {
  const ascii = (start: number, end: number) =>
    bytes.subarray(start, end).toString("ascii");
  const starts = (...values: number[]) =>
    values.every((value, index) => bytes[index] === value);

  switch (extension) {
    case ".mp4":
    case ".mov":
    case ".m4v":
    case ".heic":
    case ".heif":
      return bytes.length >= 12 && ascii(4, 8) === "ftyp";
    case ".webm":
      return starts(0x1a, 0x45, 0xdf, 0xa3);
    case ".jpg":
    case ".jpeg":
      return starts(0xff, 0xd8, 0xff);
    case ".png":
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case ".webp":
      return bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case ".pdf":
      return ascii(0, 5) === "%PDF-";
    case ".docx":
    case ".xlsx":
    case ".pptx":
      return starts(0x50, 0x4b, 0x03, 0x04);
    case ".csv":
    case ".txt":
      return !bytes.includes(0);
    default:
      return false;
  }
}

export function validateCompanyOpsAssetMetadata(
  requestedFileName: unknown,
  requestedContentType: unknown,
  size: number
): CompanyOpsAssetMetadata {
  const fileName = normalizeFileName(requestedFileName);
  const extensionMatch = fileName.match(/(\.[a-z0-9]+)$/i);
  const extension = extensionMatch?.[1].toLowerCase() || "";
  const allowedMimeTypes = MIME_BY_EXTENSION[extension];
  if (!allowedMimeTypes) {
    throw new CompanyOpsHttpError(
      415,
      "Use an MP4, MOV, M4V, WebM, image, PDF, Office, CSV, or text file"
    );
  }

  const mimeType =
    typeof requestedContentType === "string"
      ? requestedContentType.split(";", 1)[0].trim().toLowerCase()
      : "";
  if (!mimeType || !allowedMimeTypes.has(mimeType)) {
    throw new CompanyOpsHttpError(
      415,
      "The file type does not match its file name"
    );
  }
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new CompanyOpsHttpError(400, "The uploaded file is empty");
  }
  if (size > MAX_COMPANY_OPS_ASSET_BYTES) {
    throw new CompanyOpsHttpError(
      413,
      "Company Operations accepts files up to 500 MB"
    );
  }
  return { fileName, extension, mimeType, size };
}

export function validateCompanyOpsAssetSignature(
  extension: string,
  bytes: Buffer
): void {
  if (!signatureMatches(extension, bytes)) {
    throw new CompanyOpsHttpError(
      415,
      "The file contents do not match the selected file type"
    );
  }
}

export function validateCompanyOpsAssetFile(
  requestedFileName: unknown,
  requestedContentType: unknown,
  bytes: Buffer
): CompanyOpsAssetFile {
  const metadata = validateCompanyOpsAssetMetadata(
    requestedFileName,
    requestedContentType,
    bytes.length
  );
  validateCompanyOpsAssetSignature(metadata.extension, bytes);
  return {
    fileName: metadata.fileName,
    extension: metadata.extension,
    mimeType: metadata.mimeType,
    bytes,
  };
}

function validateCompanyOpsUploadSize(size: number): number {
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new CompanyOpsHttpError(400, "The uploaded file is empty");
  }
  if (size > MAX_COMPANY_OPS_ASSET_BYTES) {
    throw new CompanyOpsHttpError(
      413,
      "Company Operations accepts files up to 500 MB"
    );
  }
  return size;
}

export function companyOpsAssetUploadSize(req: VercelRequest): number {
  if (Buffer.isBuffer(req.body)) {
    return validateCompanyOpsUploadSize(req.body.length);
  }
  const raw = headerText(req.headers["content-length"]).trim();
  if (!/^\d+$/.test(raw)) {
    throw new CompanyOpsHttpError(
      411,
      "A file size is required before this upload can start"
    );
  }
  return validateCompanyOpsUploadSize(Number(raw));
}

export async function readCompanyOpsAssetBody(
  req: VercelRequest,
  expectedSize?: number
): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) {
    validateCompanyOpsUploadSize(req.body.length);
    if (expectedSize !== undefined && req.body.length !== expectedSize) {
      throw new CompanyOpsHttpError(
        400,
        "The uploaded file size changed during transfer"
      );
    }
    return req.body;
  }

  const contentLength = Number(headerText(req.headers["content-length"]));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_COMPANY_OPS_ASSET_BYTES
  ) {
    req.resume();
    throw new CompanyOpsHttpError(
      413,
      "Company Operations accepts files up to 500 MB"
    );
  }

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    let settled = false;
    const fail = (error: CompanyOpsHttpError) => {
      if (settled) return;
      settled = true;
      chunks.length = 0;
      reject(error);
    };
    req.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const bytes = Buffer.from(chunk);
      received += bytes.length;
      if (received > MAX_COMPANY_OPS_ASSET_BYTES) {
        fail(
          new CompanyOpsHttpError(
            413,
            "Company Operations accepts files up to 500 MB"
          )
        );
        req.resume();
        return;
      }
      chunks.push(bytes);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      if (expectedSize !== undefined && received !== expectedSize) {
        reject(
          new CompanyOpsHttpError(
            400,
            "The uploaded file size changed during transfer"
          )
        );
        return;
      }
      resolve(Buffer.concat(chunks, received));
    });
    req.on("aborted", () =>
      fail(new CompanyOpsHttpError(400, "The file upload was interrupted"))
    );
    req.on("error", () =>
      fail(new CompanyOpsHttpError(400, "The file upload could not be read"))
    );
  });
}

export async function* readCompanyOpsAssetChunks(
  req: VercelRequest,
  expectedSize: number,
  blockSize: number
): AsyncGenerator<Buffer> {
  validateCompanyOpsUploadSize(expectedSize);
  if (
    !Number.isSafeInteger(blockSize) ||
    blockSize <= 0 ||
    blockSize > FEISHU_SINGLE_UPLOAD_MAX_BYTES
  ) {
    throw new CompanyOpsHttpError(
      502,
      "Feishu returned an invalid upload block size"
    );
  }

  let received = 0;
  let pending = Buffer.alloc(0);
  const source: AsyncIterable<Buffer | string> = Buffer.isBuffer(req.body)
    ? (async function* () {
        yield req.body as Buffer;
      })()
    : (req as unknown as AsyncIterable<Buffer | string>);

  try {
    for await (const chunk of source) {
      const bytes = Buffer.from(chunk);
      received += bytes.length;
      if (received > expectedSize || received > MAX_COMPANY_OPS_ASSET_BYTES) {
        throw new CompanyOpsHttpError(
          400,
          "The uploaded file size changed during transfer"
        );
      }
      pending = pending.length ? Buffer.concat([pending, bytes]) : bytes;
      while (pending.length >= blockSize) {
        yield pending.subarray(0, blockSize);
        pending = pending.subarray(blockSize);
      }
    }
  } catch (error) {
    if (error instanceof CompanyOpsHttpError) throw error;
    throw new CompanyOpsHttpError(400, "The file upload could not be read");
  }

  if (received !== expectedSize) {
    throw new CompanyOpsHttpError(
      400,
      "The uploaded file size changed during transfer"
    );
  }
  if (pending.length) yield pending;
}

const uploadAttempts = new Map<string, number[]>();
let concurrentUploads = 0;

export async function withCompanyOpsUploadSlot<T>(
  actorId: string,
  operation: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const recent = (uploadAttempts.get(actorId) || []).filter(
    (timestamp) => timestamp > now - UPLOAD_WINDOW_MS
  );
  if (recent.length >= MAX_UPLOADS_PER_USER_PER_WINDOW) {
    throw new CompanyOpsHttpError(
      429,
      "Too many uploads. Please wait a few minutes and try again"
    );
  }
  if (concurrentUploads >= MAX_CONCURRENT_UPLOADS) {
    throw new CompanyOpsHttpError(
      429,
      "The upload service is busy. Please try again shortly"
    );
  }
  uploadAttempts.set(actorId, [...recent, now]);
  if (uploadAttempts.size > 1_000) {
    for (const [key, timestamps] of uploadAttempts) {
      if (!timestamps.some((timestamp) => timestamp > now - UPLOAD_WINDOW_MS)) {
        uploadAttempts.delete(key);
      }
    }
  }

  concurrentUploads += 1;
  try {
    return await operation();
  } finally {
    concurrentUploads -= 1;
  }
}

export function buildFeishuFileLink(
  sharedAssetsFolderUrl: string | undefined,
  fileToken: string
): string | undefined {
  if (!sharedAssetsFolderUrl) return undefined;
  try {
    const folder = new URL(sharedAssetsFolderUrl);
    if (folder.protocol !== "https:") return undefined;
    folder.pathname = `/file/${encodeURIComponent(fileToken)}`;
    folder.search = "";
    folder.hash = "";
    return folder.toString();
  } catch {
    return undefined;
  }
}
