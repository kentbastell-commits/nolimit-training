// The article builder — long-form posts for WeChat OA / the website, composed
// as stacked blocks (text, headings, photos, videos, quotes, dividers), saved
// to the growth Base, and exported as a Word document (.doc, MHTML with the
// images embedded) or copied as rich HTML straight into the WeChat editor.
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Eye,
  FileDown,
  Heading2,
  ImagePlus,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Quote,
  Trash2,
  Type,
  Upload,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TonePill } from "./components";
import type { CompanyOpsLanguage, OpsArticleItem } from "./types";

function text(language: CompanyOpsLanguage, en: string, zh: string) {
  return language === "zh" ? zh : en;
}

export interface ArticleBlock {
  type: "heading" | "text" | "image" | "video" | "quote" | "divider";
  text?: string;
  url?: string;
  caption?: string;
}

function parseBlocks(raw?: string): ArticleBlock[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is ArticleBlock =>
        !!entry &&
        typeof entry === "object" &&
        ["heading", "text", "image", "video", "quote", "divider"].includes(
          (entry as ArticleBlock).type,
        ),
    );
  } catch {
    return [];
  }
}

async function uploadAsset(file: File): Promise<string> {
  const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(file.name);
  const kind = isVideo ? "exercise" : "coach";
  const response = await fetch(
    `/api/uploadFormVideoFile?kind=${kind}&name=${encodeURIComponent(file.name)}`,
    { method: "POST", body: file },
  );
  const body = (await response.json().catch(() => null)) as
    | { url?: string; error?: string }
    | null;
  if (!response.ok || !body?.url) {
    throw new Error(body?.error || "Upload failed");
  }
  return `${window.location.origin}${body.url}`;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const paragraphs = (value: string): string =>
  value
    .split(/\n{2,}/)
    .map(
      (part) =>
        `<p style="margin:0 0 14px;line-height:1.8;font-size:15px;color:#222;">${escapeHtml(part).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

// Builds the article body HTML shared by the Word export and the
// copy-for-WeChat path. Image sources are substituted per output target.
function buildArticleHtml(
  title: string,
  summary: string,
  blocks: ArticleBlock[],
  imageSrc: (block: ArticleBlock, index: number) => string,
): string {
  const parts: string[] = [];
  parts.push(
    `<h1 style="margin:0 0 10px;font-size:26px;line-height:1.3;color:#111;">${escapeHtml(title)}</h1>`,
  );
  if (summary) {
    parts.push(
      `<p style="margin:0 0 22px;color:#666;font-size:14px;line-height:1.7;">${escapeHtml(summary)}</p>`,
    );
  }
  blocks.forEach((block, index) => {
    if (block.type === "heading") {
      parts.push(
        `<h2 style="margin:26px 0 12px;font-size:20px;line-height:1.4;color:#111;">${escapeHtml(block.text || "")}</h2>`,
      );
    } else if (block.type === "text") {
      parts.push(paragraphs(block.text || ""));
    } else if (block.type === "quote") {
      parts.push(
        `<blockquote style="margin:18px 0;padding:10px 18px;border-left:4px solid #c9a84c;background:#faf7ef;color:#444;font-size:15px;line-height:1.7;">${escapeHtml(block.text || "").replace(/\n/g, "<br />")}</blockquote>`,
      );
    } else if (block.type === "divider") {
      parts.push('<hr style="margin:26px 0;border:0;border-top:1px solid #ddd;" />');
    } else if (block.type === "image" && block.url) {
      parts.push(
        `<p style="margin:18px 0 6px;text-align:center;"><img src="${escapeHtml(imageSrc(block, index))}" style="max-width:100%;width:620px;" /></p>`,
      );
      if (block.caption) {
        parts.push(
          `<p style="margin:0 0 18px;text-align:center;color:#888;font-size:12px;">${escapeHtml(block.caption)}</p>`,
        );
      }
    } else if (block.type === "video" && block.url) {
      parts.push(
        `<p style="margin:18px 0;padding:14px 18px;border:1px solid #ddd;background:#f7f7f5;font-size:14px;">▶ ${escapeHtml(block.caption || "Video")}: <a href="${escapeHtml(block.url)}">${escapeHtml(block.url)}</a></p>`,
      );
    }
  });
  return parts.join("\n");
}

const chunkBase64 = (value: string): string =>
  value.replace(/(.{76})/g, "$1\r\n");

async function fetchAsBase64(
  url: string,
): Promise<{ base64: string; mime: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(blob);
    });
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) return null;
    return { mime: match[1], base64: match[2] };
  } catch {
    return null;
  }
}

// Word opens MHTML (multipart/related) with embedded images reliably — the
// classic "save as .doc" trick. Everything is inlined so the file travels.
async function exportWordDoc(
  title: string,
  summary: string,
  blocks: ArticleBlock[],
): Promise<void> {
  const images = new Map<number, { location: string; mime: string; base64: string }>();
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.type !== "image" || !block.url) continue;
    const fetched = await fetchAsBase64(block.url);
    if (!fetched) continue;
    const extension = fetched.mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    images.set(index, {
      location: `image${index}.${extension}`,
      mime: fetched.mime,
      base64: fetched.base64,
    });
  }

  const html = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">',
    '<head><meta charset="utf-8" /><title>' + escapeHtml(title) + "</title></head>",
    '<body style="font-family:\'Segoe UI\',\'Microsoft YaHei\',sans-serif;max-width:680px;margin:0 auto;padding:24px;">',
    buildArticleHtml(title, summary, blocks, (block, index) =>
      images.get(index)?.location || block.url || "",
    ),
    "</body></html>",
  ].join("\n");

  const boundary = "----=_NextPart_NXLIMIT_ARTICLE";
  const lines: string[] = [
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "Content-Location: article.html",
    "",
    chunkBase64(btoa(unescape(encodeURIComponent(html)))),
  ];
  for (const image of images.values()) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${image.mime}`,
      "Content-Transfer-Encoding: base64",
      `Content-Location: ${image.location}`,
      "",
      chunkBase64(image.base64),
    );
  }
  lines.push(`--${boundary}--`, "");

  const blob = new Blob([lines.join("\r\n")], { type: "application/msword" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "article"}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 5_000);
}

async function copyRichHtml(
  title: string,
  summary: string,
  blocks: ArticleBlock[],
): Promise<boolean> {
  const html = buildArticleHtml(title, summary, blocks, (block) => block.url || "");
  const plain = blocks
    .map((block) => block.text || block.caption || block.url || "")
    .filter(Boolean)
    .join("\n\n");
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([`${title}\n\n${plain}`], { type: "text/plain" }),
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

function BlockEditor({
  block,
  index,
  total,
  language,
  onChange,
  onMove,
  onRemove,
}: {
  block: ArticleBlock;
  index: number;
  total: number;
  language: CompanyOpsLanguage;
  onChange: (index: number, next: ArticleBlock) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const set = (patch: Partial<ArticleBlock>) => onChange(index, { ...block, ...patch });

  const typeLabel: Record<ArticleBlock["type"], [string, string]> = {
    heading: ["Heading", "小标题"],
    text: ["Text", "正文"],
    image: ["Photo", "图片"],
    video: ["Video", "视频"],
    quote: ["Quote", "引用"],
    divider: ["Divider", "分割线"],
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      set({ url: await uploadAsset(file) });
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : text(language, "Upload failed", "上传失败"),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fopsArtBlock">
      <header>
        <span className="fopsArtBlockType">
          {text(language, ...typeLabel[block.type])}
        </span>
        <div className="fopsArtBlockTools">
          <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={text(language, "Move up", "上移")}>
            <ArrowUp size={14} />
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(index, 1)} aria-label={text(language, "Move down", "下移")}>
            <ArrowDown size={14} />
          </button>
          <button type="button" className="is-danger" onClick={() => onRemove(index)} aria-label={text(language, "Remove block", "删除区块")}>
            <Trash2 size={14} />
          </button>
        </div>
      </header>
      {block.type === "heading" ? (
        <input
          type="text"
          className="fopsArtHeadingInput"
          value={block.text || ""}
          placeholder={text(language, "Section heading…", "小标题…")}
          onChange={(event) => set({ text: event.target.value })}
        />
      ) : null}
      {block.type === "text" || block.type === "quote" ? (
        <textarea
          rows={block.type === "quote" ? 3 : 6}
          value={block.text || ""}
          placeholder={
            block.type === "quote"
              ? text(language, "Quote or highlight…", "引用或金句…")
              : text(language, "Write the paragraph… blank line = new paragraph.", "写正文……空一行等于分段。")
          }
          onChange={(event) => set({ text: event.target.value })}
        />
      ) : null}
      {block.type === "image" || block.type === "video" ? (
        <>
          {block.type === "image" && block.url ? (
            <img className="fopsArtImagePreview" src={block.url} alt={block.caption || ""} />
          ) : null}
          {block.type === "video" && block.url ? (
            <video className="fopsArtImagePreview" src={block.url} controls preload="metadata" />
          ) : null}
          <div className="fopsArtMediaRow">
            <input
              type="text"
              value={block.url || ""}
              placeholder={text(language, "Paste a link, or upload →", "粘贴链接，或点右侧上传 →")}
              onChange={(event) => set({ url: event.target.value })}
            />
            <button
              type="button"
              className="fopsButton fopsButton--ghost fopsButton--compact"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 size={14} className="fopsSpin" /> : <Upload size={14} />}
              {uploading
                ? text(language, "Uploading…", "上传中…")
                : text(language, "Upload", "上传")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={block.type === "image" ? "image/*" : "video/*"}
              hidden
              onChange={(event) => {
                void handleUpload(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
          {uploadError ? <p className="fopsArtUploadError">{uploadError}</p> : null}
          <input
            type="text"
            value={block.caption || ""}
            placeholder={text(language, "Caption (optional)", "图注（可选）")}
            onChange={(event) => set({ caption: event.target.value })}
          />
        </>
      ) : null}
    </div>
  );
}

export default function ArticleBuilderPage({
  articles,
  language,
  onCreate,
  onSave,
  onDelete,
  onDirtyChange,
}: {
  articles: OpsArticleItem[];
  language: CompanyOpsLanguage;
  onCreate: (title: string) => Promise<void>;
  onSave: (
    articleId: string,
    patch: { title?: string; summary?: string; blocks?: string; status?: string },
  ) => Promise<void>;
  onDelete: (articleId: string) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [blocks, setBlocks] = useState<ArticleBlock[]>([]);
  const [dirty, setDirty] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState<null | boolean>(null);
  const [preview, setPreview] = useState(false);

  const open = useMemo(
    () => articles.find((article) => article.id === openId) || null,
    [articles, openId],
  );

  const draftKey = (articleId: string) => `nl_ops_article_draft_${articleId}`;

  // Wifi-drop protection: mirror the in-progress draft to localStorage on
  // every edit (debounced) and restore it on reopen. Only the WRITER's input
  // is mirrored; the article list itself always comes fresh from the server.
  useEffect(() => {
    if (!openId || !dirty) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          draftKey(openId),
          JSON.stringify({ title, summary, blocks, at: Date.now() }),
        );
      } catch {
        // Storage full/blocked - the exit prompt still protects the draft.
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [openId, dirty, title, summary, blocks]);

  // Let the app shell guard in-app navigation + tab close while dirty.
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const openArticle = (article: OpsArticleItem) => {
    setOpenId(article.id);
    setPreview(false);
    setCopied(null);
    try {
      const saved = window.localStorage.getItem(draftKey(article.id));
      if (saved) {
        const parsed = JSON.parse(saved);
        setTitle(String(parsed.title ?? article.title));
        setSummary(String(parsed.summary ?? article.summary ?? ""));
        setBlocks(Array.isArray(parsed.blocks) ? parsed.blocks : parseBlocks(article.blocks));
        setDirty(true);
        setRestoredDraft(true);
        return;
      }
    } catch {
      // Corrupt local draft - fall through to the server copy.
    }
    setTitle(article.title);
    setSummary(article.summary || "");
    setBlocks(parseBlocks(article.blocks));
    setDirty(false);
    setRestoredDraft(false);
  };

  const discardLocalDraft = () => {
    if (!open) return;
    try {
      window.localStorage.removeItem(draftKey(open.id));
    } catch {
      // Non-fatal.
    }
    setTitle(open.title);
    setSummary(open.summary || "");
    setBlocks(parseBlocks(open.blocks));
    setDirty(false);
    setRestoredDraft(false);
  };

  const closeEditor = () => {
    if (dirty && !window.confirm(text(language, "Discard unsaved changes?", "放弃未保存的修改？"))) {
      return;
    }
    setOpenId(null);
    setDirty(false);
  };

  const mutateBlocks = (updater: (current: ArticleBlock[]) => ArticleBlock[]) => {
    setBlocks(updater);
    setDirty(true);
  };

  const addBlock = (type: ArticleBlock["type"]) =>
    mutateBlocks((current) => [...current, { type }]);

  const saveArticle = async (statusOverride?: string) => {
    if (!open) return;
    setSaving(true);
    try {
      await onSave(open.id, {
        title: title.trim() || "Untitled",
        summary,
        blocks: JSON.stringify(blocks),
        ...(statusOverride ? { status: statusOverride } : {}),
      });
      setDirty(false);
      setRestoredDraft(false);
      try {
        window.localStorage.removeItem(draftKey(open.id));
      } catch {
        // Non-fatal.
      }
    } catch {
      // The app shell already showed the failure toast; stay dirty.
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async () => {
    if (!open) return;
    if (
      !window.confirm(
        text(
          language,
          `Delete "${open.title}"? This cannot be undone.`,
          `删除「${open.title}」？删除后无法恢复。`,
        ),
      )
    ) {
      return;
    }
    try {
      window.localStorage.removeItem(draftKey(open.id));
    } catch {
      // Non-fatal.
    }
    await onDelete(open.id);
    setOpenId(null);
  };

  const runExport = async () => {
    setExporting(true);
    try {
      await exportWordDoc(title.trim() || "Untitled", summary, blocks);
    } finally {
      setExporting(false);
    }
  };

  const runCopy = async () => {
    const ok = await copyRichHtml(title.trim() || "Untitled", summary, blocks);
    setCopied(ok);
    setTimeout(() => setCopied(null), 3_000);
  };

  const addButtons: Array<{
    type: ArticleBlock["type"];
    icon: typeof Type;
    en: string;
    zh: string;
  }> = [
    { type: "text", icon: Type, en: "Text", zh: "正文" },
    { type: "heading", icon: Heading2, en: "Heading", zh: "小标题" },
    { type: "image", icon: ImagePlus, en: "Photo", zh: "图片" },
    { type: "video", icon: Video, en: "Video", zh: "视频" },
    { type: "quote", icon: Quote, en: "Quote", zh: "引用" },
    { type: "divider", icon: Minus, en: "Divider", zh: "分割线" },
  ];

  if (open) {
    return (
      <div className="fopsPage fopsArticlePage">
        <header className="fopsPageHeader fopsPageHeader--actions fopsArtEditorHeader">
          <div>
            <button type="button" className="fopsTextButton" onClick={closeEditor}>
              <ChevronLeft size={14} />
              {text(language, "All articles", "全部文章")}
            </button>
            <h1>{title.trim() || text(language, "Untitled article", "未命名文章")}</h1>
            <p>
              {open.status ? <TonePill tone={open.status === "Published" ? "success" : "gold"}>{open.status === "Published" ? text(language, "Published", "已发布") : open.status === "Archived" ? text(language, "Archived", "已归档") : text(language, "Draft", "草稿")}</TonePill> : null}
              {dirty ? (
                <span className="fopsArtDirty">{text(language, "Unsaved changes", "有未保存修改")}</span>
              ) : null}
            </p>
          </div>
          <div className="fopsArtHeaderActions">
            <button type="button" className="fopsButton fopsButton--ghost" onClick={() => setPreview((current) => !current)}>
              {preview ? <Pencil size={15} /> : <Eye size={15} />}
              {preview ? text(language, "Edit", "编辑") : text(language, "Preview", "预览")}
            </button>
            <button type="button" className="fopsButton fopsButton--ghost" disabled={exporting} onClick={() => void runExport()}>
              {exporting ? <Loader2 size={15} className="fopsSpin" /> : <FileDown size={15} />}
              {text(language, "Export Word", "导出 Word")}
            </button>
            <button type="button" className="fopsButton fopsButton--ghost" onClick={() => void runCopy()}>
              {copied === true
                ? text(language, "Copied!", "已复制！")
                : copied === false
                  ? text(language, "Copy failed", "复制失败")
                  : text(language, "Copy for WeChat", "复制到公众号")}
            </button>
            <button
              type="button"
              className="fopsButton fopsButton--primary"
              disabled={!dirty || saving}
              onClick={() => void saveArticle()}
            >
              {saving ? text(language, "Saving…", "保存中…") : text(language, "Save", "保存")}
            </button>
          </div>
        </header>

        {preview ? (
          <article className="fopsArtPreview">
            <h1>{title.trim() || text(language, "Untitled article", "未命名文章")}</h1>
            {summary ? <p className="fopsArtPreviewSummary">{summary}</p> : null}
            {blocks.map((block, index) => {
              if (block.type === "heading") return <h2 key={index}>{block.text}</h2>;
              if (block.type === "divider") return <hr key={index} />;
              if (block.type === "quote") return <blockquote key={index}>{block.text}</blockquote>;
              if (block.type === "image" && block.url) {
                return (
                  <figure key={index}>
                    <img src={block.url} alt={block.caption || ""} />
                    {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                  </figure>
                );
              }
              if (block.type === "video" && block.url) {
                return (
                  <figure key={index}>
                    <video src={block.url} controls preload="metadata" />
                    {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                  </figure>
                );
              }
              return (block.text || "").split(/\n{2,}/).map((part, partIndex) => (
                <p key={`${index}-${partIndex}`}>{part}</p>
              ));
            })}
          </article>
        ) : (
          <div className="fopsArtEditor">
            {restoredDraft ? (
              <div className="fopsArtRestored" role="status">
                <span>
                  {text(
                    language,
                    "Restored your unsaved draft from this device.",
                    "已恢复此设备上未保存的草稿。",
                  )}
                </span>
                <button type="button" onClick={discardLocalDraft}>
                  {text(language, "Discard it", "丢弃草稿")}
                </button>
              </div>
            ) : null}
            <label className="fopsCalField">
              <span>{text(language, "Title", "标题")}</span>
              <input
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setDirty(true);
                }}
              />
            </label>
            <label className="fopsCalField">
              <span>{text(language, "Summary / subtitle (optional)", "摘要/副标题（可选）")}</span>
              <input
                type="text"
                value={summary}
                onChange={(event) => {
                  setSummary(event.target.value);
                  setDirty(true);
                }}
              />
            </label>

            {blocks.map((block, index) => (
              <BlockEditor
                key={index}
                block={block}
                index={index}
                total={blocks.length}
                language={language}
                onChange={(blockIndex, next) =>
                  mutateBlocks((current) =>
                    current.map((entry, entryIndex) => (entryIndex === blockIndex ? next : entry)),
                  )
                }
                onMove={(blockIndex, direction) =>
                  mutateBlocks((current) => {
                    const next = [...current];
                    const target = blockIndex + direction;
                    if (target < 0 || target >= next.length) return current;
                    [next[blockIndex], next[target]] = [next[target], next[blockIndex]];
                    return next;
                  })
                }
                onRemove={(blockIndex) =>
                  mutateBlocks((current) => current.filter((_, entryIndex) => entryIndex !== blockIndex))
                }
              />
            ))}

            <div className="fopsArtAddRow">
              <span>{text(language, "Add a block:", "添加区块：")}</span>
              {addButtons.map(({ type, icon: Icon, en, zh }) => (
                <button type="button" key={type} onClick={() => addBlock(type)}>
                  <Icon size={14} />
                  {text(language, en, zh)}
                </button>
              ))}
            </div>

            <div className="fopsArtFooterActions">
              {open.status !== "Published" ? (
                <button
                  type="button"
                  className="fopsButton fopsButton--ghost"
                  disabled={saving}
                  onClick={() => void saveArticle("Published")}
                >
                  {text(language, "Save & mark published", "保存并标记为已发布")}
                </button>
              ) : null}
              <button type="button" className="fopsButton fopsButton--ghost fopsArtDelete" onClick={() => void deleteArticle()}>
                <Trash2 size={15} />
                {text(language, "Delete article", "删除文章")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fopsPage fopsArticlePage">
      <header className="fopsPageHeader">
        <div>
          <span className="fopsEyebrow">{text(language, "Long-form content", "长文内容")}</span>
          <h1>{text(language, "Article builder", "文章创作")}</h1>
          <p>
            {text(
              language,
              "Stack text, photos and videos into an article, then export it as a Word document or copy it straight into the WeChat editor.",
              "用文字、图片、视频拼装一篇文章，可导出 Word 文档，或一键复制粘贴到公众号编辑器。",
            )}
          </p>
        </div>
      </header>

      <div className="fopsArtNewRow">
        <input
          type="text"
          value={newTitle}
          placeholder={text(language, "New article title…", "新文章标题…")}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && newTitle.trim() && !creating) {
              setCreating(true);
              void onCreate(newTitle.trim())
                .then(() => setNewTitle(""))
                .finally(() => setCreating(false));
            }
          }}
        />
        <button
          type="button"
          className="fopsButton fopsButton--primary"
          disabled={!newTitle.trim() || creating}
          onClick={() => {
            setCreating(true);
            void onCreate(newTitle.trim())
              .then(() => setNewTitle(""))
              .finally(() => setCreating(false));
          }}
        >
          <Plus size={15} />
          {creating ? text(language, "Creating…", "创建中…") : text(language, "New article", "新建文章")}
        </button>
      </div>

      {articles.length ? (
        <div className="fopsArtList">
          {articles.map((article) => {
            const blockCount = parseBlocks(article.blocks).length;
            return (
              <button type="button" className="fopsArtCard" key={article.id} onClick={() => openArticle(article)}>
                <div className="fopsArtCardTop">
                  <strong>{article.title}</strong>
                  <TonePill tone={article.status === "Published" ? "success" : "gold"}>
                    {article.status === "Published"
                      ? text(language, "Published", "已发布")
                      : article.status === "Archived"
                        ? text(language, "Archived", "已归档")
                        : text(language, "Draft", "草稿")}
                  </TonePill>
                </div>
                {article.summary ? <p>{article.summary}</p> : null}
                <footer>
                  <span>
                    {blockCount} {text(language, "blocks", "个区块")}
                  </span>
                  {article.updatedAt ? (
                    <span>
                      {new Date(article.updatedAt).toLocaleDateString(
                        language === "zh" ? "zh-CN" : "en-GB",
                        { month: "short", day: "numeric" },
                      )}
                    </span>
                  ) : null}
                  {article.author ? <span>{article.author}</span> : null}
                </footer>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="fopsQuietText">
          {text(
            language,
            "No articles yet — give the first one a title above.",
            "还没有文章——在上面输入标题创建第一篇。",
          )}
        </p>
      )}
    </div>
  );
}
