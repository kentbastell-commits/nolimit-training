import type { VercelRequest, VercelResponse } from "@vercel/node";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        if (item?.record_ids) return item.record_ids.join(", ");
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");

  return JSON.stringify(value);
}

function toLarkDate(value?: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T00:00:00`).getTime();
}

async function getTenantToken() {
  const response = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    }
  );
  const data = await response.json();

  if (!data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token;
}

async function getRecords(tableId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records?page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Could not fetch records: ${JSON.stringify(data)}`);
  }

  return data.data.items || [];
}

async function createRecord(tableId: string, token: string, fields: Record<string, any>) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const formTemplatesTableId =
    process.env.FEISHU_FORM_TEMPLATES_TABLE_ID || process.env.FORM_TEMPLATES;
  const formQuestionsTableId =
    process.env.FEISHU_FORM_QUESTIONS_TABLE_ID || process.env.FORM_QUESTIONS;

  if (!formTemplatesTableId) {
    return res.status(500).json({ error: "Missing FEISHU_FORM_TEMPLATES_TABLE_ID" });
  }

  if (!formQuestionsTableId) {
    return res.status(500).json({ error: "Missing FEISHU_FORM_QUESTIONS_TABLE_ID" });
  }

  try {
    const token = await getTenantToken();

    if (req.method === "GET") {
      const [templateRecords, questionRecords] = await Promise.all([
        getRecords(formTemplatesTableId, token),
        getRecords(formQuestionsTableId, token),
      ]);

      const questions = questionRecords.map((item: any) => {
        const fields = item.fields || {};

        return {
          recordId: item.record_id,
          questionId: fieldToText(fields.questionId),
          formId: fieldToText(fields.formId),
          order: fieldToText(fields.order),
          label: fieldToText(fields.label),
          questionType: fieldToText(fields.questionType),
          options: fieldToText(fields.options),
          required:
            fields.required === true ||
            fieldToText(fields.required).toLowerCase() === "true",
          helpText: fieldToText(fields.helpText),
        };
      });

      const forms = templateRecords.map((item: any) => {
        const fields = item.fields || {};
        const formId = fieldToText(fields.formId);

        return {
          recordId: item.record_id,
          formId,
          name: fieldToText(fields.name),
          type: fieldToText(fields.type),
          description: fieldToText(fields.description),
          status: fieldToText(fields.status),
          createdBy: fieldToText(fields.createdBy),
          createdAt: fieldToText(fields.createdAt),
          questions: questions
            .filter((question: any) => question.formId === formId)
            .sort((a: any, b: any) => Number(a.order) - Number(b.order)),
        };
      });

      return res.status(200).json({ forms });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { name, type, description, status, createdBy, questions } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing form name" });
    }

    const formId = `FORM-${Date.now()}`;
    const templateFields = {
      formId,
      name: String(name),
      type: String(type || "Questionnaire"),
      description: String(description || ""),
      status: String(status || "Active"),
      createdBy: String(createdBy || "Kent Bastell"),
      createdAt: toLarkDate(),
    };

    const templateData = await createRecord(
      formTemplatesTableId,
      token,
      templateFields
    );

    if (templateData.code !== 0) {
      return res.status(500).json({
        error: "Could not create form template",
        larkResponse: templateData,
        fieldsSent: templateFields,
      });
    }

    const questionItems = Array.isArray(questions) ? questions : [];
    const createdQuestions = [];

    for (const [index, question] of questionItems.entries()) {
      const questionFields = {
        questionId: `Q-${Date.now()}-${index + 1}`,
        formId,
        order: index + 1,
        label: String(question.label || ""),
        questionType: String(question.questionType || "Text"),
        options: String(question.options || ""),
        required: Boolean(question.required),
        helpText: String(question.helpText || ""),
      };

      const questionData = await createRecord(
        formQuestionsTableId,
        token,
        questionFields
      );

      if (questionData.code !== 0) {
        return res.status(500).json({
          error: "Could not create form question",
          larkResponse: questionData,
          fieldsSent: questionFields,
        });
      }

      createdQuestions.push(questionData.data.record.record_id);
    }

    return res.status(200).json({
      success: true,
      formId,
      formRecordId: templateData.data.record.record_id,
      questionRecordsCreated: createdQuestions.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
