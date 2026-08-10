import { describe, expect, it, vi } from "vitest";
import {
  buildFeishuFileLink,
  readCompanyOpsAssetChunks,
  validateCompanyOpsAssetFile,
  validateCompanyOpsAssetMetadata,
} from "../../../server/companyOps/assetUpload.ts";
import type { VercelRequest } from "@vercel/node";
import {
  FeishuClient,
  resetCompanyOpsFeishuTokenCacheForTests,
} from "../../../server/companyOps/feishuClient.ts";
import { getCompanyOpsConfig } from "../../../server/companyOps/config.ts";

const validMp4 = () => {
  const bytes = Buffer.alloc(16);
  bytes.write("ftyp", 4, "ascii");
  bytes.write("isom", 8, "ascii");
  return bytes;
};

describe("Company Ops asset uploads", () => {
  it("accepts a safe video whose MIME and signature match", () => {
    const result = validateCompanyOpsAssetFile(
      "Yumei August recap.mp4",
      "video/mp4",
      validMp4()
    );
    expect(result.fileName).toBe("Yumei August recap.mp4");
    expect(result.mimeType).toBe("video/mp4");
  });

  it("rejects path-like names and disguised content", () => {
    expect(() =>
      validateCompanyOpsAssetFile("../recap.mp4", "video/mp4", validMp4())
    ).toThrow("file name is not allowed");
    expect(() =>
      validateCompanyOpsAssetFile(
        "recap.mp4",
        "video/mp4",
        Buffer.from("not a video")
      )
    ).toThrow("contents do not match");
  });

  it("allows multipart-sized videos while retaining a 500 MB safety cap", () => {
    expect(
      validateCompanyOpsAssetMetadata(
        "campaign-cut.mp4",
        "video/mp4",
        24 * 1024 * 1024
      ).size
    ).toBe(24 * 1024 * 1024);
    expect(() =>
      validateCompanyOpsAssetMetadata(
        "too-large.mp4",
        "video/mp4",
        500 * 1024 * 1024 + 1
      )
    ).toThrow("up to 500 MB");
  });

  it("streams exact Feishu-sized blocks without buffering the whole file", async () => {
    const request = { body: Buffer.from("abcdefghij") } as VercelRequest;
    const parts: string[] = [];
    for await (const part of readCompanyOpsAssetChunks(request, 10, 4)) {
      parts.push(part.toString("utf8"));
    }
    expect(parts).toEqual(["abcd", "efgh", "ij"]);
  });

  it("derives file links only from the configured tenant origin", () => {
    expect(
      buildFeishuFileLink(
        "https://acn3vin1oszp.feishu.cn/drive/folder/fld_123?from=share",
        "boxcn_file123"
      )
    ).toBe("https://acn3vin1oszp.feishu.cn/file/boxcn_file123");
    expect(buildFeishuFileLink(undefined, "boxcn_file123")).toBeUndefined();
  });

  it("uploads multipart bytes without putting credentials in the form", async () => {
    resetCompanyOpsFeishuTokenCacheForTests();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            tenant_access_token: "tenant-token",
            expire: 7200,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockImplementationOnce(async (_input, init) => {
        expect(init?.headers).toEqual({ Authorization: "Bearer tenant-token" });
        expect(init?.body).toBeInstanceOf(FormData);
        const form = init?.body as FormData;
        expect(form.get("file_name")).toBe("recap.mp4");
        expect(form.get("parent_type")).toBe("explorer");
        expect(form.get("parent_node")).toBe("fld_shared");
        expect(form.get("size")).toBe("16");
        expect(form.has("app_secret")).toBe(false);
        return new Response(
          JSON.stringify({ code: 0, data: { file_token: "boxcn_uploaded" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });
    const config = getCompanyOpsConfig({
      FEISHU_ADMIN_APP_ID: "cli_test",
      FEISHU_ADMIN_APP_SECRET: "test-secret",
      FEISHU_ADMIN_SESSION_SECRET: "s".repeat(32),
      FEISHU_ADMIN_OAUTH_REDIRECT_URI:
        "https://trainnolimit.cn/api/companyOpsAuthCallback",
    });

    await expect(
      new FeishuClient(config, fetcher).uploadDriveFile({
        fileName: "recap.mp4",
        parentNode: "fld_shared",
        bytes: validMp4(),
        mimeType: "video/mp4",
      })
    ).resolves.toEqual({ fileToken: "boxcn_uploaded" });
  });

  it("uses Feishu prepare, part and finish APIs for larger files", async () => {
    resetCompanyOpsFeishuTokenCacheForTests();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            tenant_access_token: "tenant-token",
            expire: 7200,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockImplementationOnce(async (input, init) => {
        expect(String(input)).toContain("/files/upload_prepare");
        expect(JSON.parse(String(init?.body))).toEqual({
          file_name: "large.mp4",
          parent_type: "explorer",
          parent_node: "fld_shared",
          size: 10,
        });
        return new Response(
          JSON.stringify({
            code: 0,
            data: { upload_id: "upload-1", block_size: 4, block_num: 3 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
      .mockImplementationOnce(async (input, init) => {
        expect(String(input)).toContain("/files/upload_part");
        const form = init?.body as FormData;
        expect(form.get("upload_id")).toBe("upload-1");
        expect(form.get("seq")).toBe("0");
        expect(form.get("size")).toBe("4");
        return new Response(JSON.stringify({ code: 0, data: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      })
      .mockImplementationOnce(async (input, init) => {
        expect(String(input)).toContain("/files/upload_finish");
        expect(JSON.parse(String(init?.body))).toEqual({
          upload_id: "upload-1",
          block_num: 3,
        });
        return new Response(
          JSON.stringify({ code: 0, data: { file_token: "boxcn_large" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });
    const config = getCompanyOpsConfig({
      FEISHU_ADMIN_APP_ID: "cli_multipart",
      FEISHU_ADMIN_APP_SECRET: "test-secret",
      FEISHU_ADMIN_SESSION_SECRET: "s".repeat(32),
      FEISHU_ADMIN_OAUTH_REDIRECT_URI:
        "https://trainnolimit.cn/api/companyOpsAuthCallback",
    });
    const client = new FeishuClient(config, fetcher);

    await expect(
      client.prepareDriveFileUpload({
        fileName: "large.mp4",
        parentNode: "fld_shared",
        size: 10,
      })
    ).resolves.toEqual({ uploadId: "upload-1", blockSize: 4, blockCount: 3 });
    await expect(
      client.uploadDriveFilePart({
        uploadId: "upload-1",
        sequence: 0,
        bytes: Buffer.from("abcd"),
        mimeType: "video/mp4",
      })
    ).resolves.toBeUndefined();
    await expect(
      client.finishDriveFileUpload({ uploadId: "upload-1", blockCount: 3 })
    ).resolves.toEqual({ fileToken: "boxcn_large" });
  });
});
