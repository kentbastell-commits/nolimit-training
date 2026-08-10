import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  assertCompanyOpsAuthConfigured,
  getCompanyOpsConfig,
} from "../server/companyOps/config.ts";
import {
  noStore,
  queryText,
  requireRequestSession,
} from "../server/companyOps/auth.ts";
import {
  buildFeishuFileLink,
  companyOpsAssetUploadSize,
  FEISHU_SINGLE_UPLOAD_MAX_BYTES,
  readCompanyOpsAssetChunks,
  readCompanyOpsAssetBody,
  requireCompanyOpsAssetUploadCsrf,
  validateCompanyOpsAssetFile,
  validateCompanyOpsAssetMetadata,
  validateCompanyOpsAssetSignature,
  withCompanyOpsUploadSlot,
} from "../server/companyOps/assetUpload.ts";
import {
  createCompanyOpsRepository,
  publicCompanyOpsError,
} from "../server/companyOps/repository.ts";
import { FeishuClient } from "../server/companyOps/feishuClient.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let auditActor: { openId: string; staffRecordId?: string; role: string } | undefined;
  try {
    const config = getCompanyOpsConfig();
    assertCompanyOpsAuthConfigured(config);
    if (!config.sharedAssetsFolderToken) {
      return res.status(503).json({
        error: "The Company Shared Assets folder is not configured",
      });
    }

    const session = requireRequestSession(req, config);
    requireCompanyOpsAssetUploadCsrf(req, session, config);
    const uploadSize = companyOpsAssetUploadSize(req);
    const requestedContentType = Array.isArray(req.headers["content-type"])
      ? req.headers["content-type"][0]
      : req.headers["content-type"];
    const metadata = validateCompanyOpsAssetMetadata(
      queryText(req.query.fileName),
      requestedContentType,
      uploadSize
    );

    const repository = createCompanyOpsRepository(config);
    const principal = await repository.resolvePrincipal(session);
    auditActor = {
      openId: principal.openId,
      staffRecordId: principal.staffRecordId,
      role: principal.role,
    };
    if (principal.role !== "founder" && principal.role !== "growth") {
      return res.status(403).json({
        error: "Only Growth staff and founders can upload shared assets",
      });
    }

    const result = await withCompanyOpsUploadSlot(principal.openId, async () => {
      const client = new FeishuClient(config);
      if (uploadSize <= FEISHU_SINGLE_UPLOAD_MAX_BYTES) {
        const bytes = await readCompanyOpsAssetBody(req, uploadSize);
        const file = validateCompanyOpsAssetFile(
          metadata.fileName,
          metadata.mimeType,
          bytes
        );
        const uploaded = await client.uploadDriveFile({
          fileName: file.fileName,
          parentNode: config.sharedAssetsFolderToken as string,
          bytes: file.bytes,
          mimeType: file.mimeType,
          signal: AbortSignal.timeout(120_000),
        });
        return { file: metadata, uploaded, multipart: false };
      }

      const plan = await client.prepareDriveFileUpload({
        fileName: metadata.fileName,
        parentNode: config.sharedAssetsFolderToken as string,
        size: metadata.size,
        signal: AbortSignal.timeout(120_000),
      });
      const expectedBlocks = Math.ceil(metadata.size / plan.blockSize);
      if (plan.blockCount !== expectedBlocks) {
        throw new Error("Feishu returned an inconsistent multipart upload plan");
      }
      let sequence = 0;
      for await (const part of readCompanyOpsAssetChunks(
        req,
        metadata.size,
        plan.blockSize
      )) {
        if (sequence === 0) {
          validateCompanyOpsAssetSignature(metadata.extension, part);
        }
        await client.uploadDriveFilePart({
          uploadId: plan.uploadId,
          sequence,
          bytes: part,
          mimeType: metadata.mimeType,
          signal: AbortSignal.timeout(120_000),
        });
        sequence += 1;
        // Feishu documents a 5 QPS ceiling and no concurrent calls for this
        // multipart family. Keep the single active upload below that ceiling.
        await new Promise((resolve) => setTimeout(resolve, 210));
      }
      if (sequence !== plan.blockCount) {
        throw new Error("The multipart upload did not produce every expected block");
      }
      const uploaded = await client.finishDriveFileUpload({
        uploadId: plan.uploadId,
        blockCount: plan.blockCount,
        signal: AbortSignal.timeout(120_000),
      });
      return { file: metadata, uploaded, multipart: true };
    });

    const link = buildFeishuFileLink(
      config.links.sharedAssets,
      result.uploaded.fileToken
    );
    console.info("Company Ops shared asset uploaded", {
      at: new Date().toISOString(),
      actorOpenId: principal.openId,
      staffRecordId: principal.staffRecordId,
      role: principal.role,
      fileToken: result.uploaded.fileToken,
      fileName: result.file.fileName,
      mimeType: result.file.mimeType,
      size: result.file.size,
      multipart: result.multipart,
    });
    return res.status(201).json({
      success: true,
      fileToken: result.uploaded.fileToken,
      fileName: result.file.fileName,
      mimeType: result.file.mimeType,
      size: result.file.size,
      link,
      url: link,
      folderLink: config.links.sharedAssets,
      folderUrl: config.links.sharedAssets,
    });
  } catch (error) {
    const safe = publicCompanyOpsError(error);
    console.warn("Company Ops shared asset upload failed", {
      at: new Date().toISOString(),
      actorOpenId: auditActor?.openId,
      staffRecordId: auditActor?.staffRecordId,
      role: auditActor?.role,
      status: safe.status,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return res.status(safe.status).json({
      error: safe.message,
      message: safe.message,
    });
  }
}
