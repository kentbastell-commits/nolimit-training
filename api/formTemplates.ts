import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";

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
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");

  return "";
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function readField(fields: Record<string, any>, aliases: string[]) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(fields, alias)) {
      return fieldToText(fields[alias]);
    }
  }

  const normalizedAliases = aliases.map(normalizeFieldName);
  const matchingKey = Object.keys(fields).find((key) =>
    normalizedAliases.includes(normalizeFieldName(key))
  );

  return matchingKey ? fieldToText(fields[matchingKey]) : "";
}

function readBoolField(fields: Record<string, any>, aliases: string[]) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(fields, alias)) {
      const value = fields[alias];
      return value === true || fieldToText(value).toLowerCase() === "true";
    }
  }

  const normalizedAliases = aliases.map(normalizeFieldName);
  const matchingKey = Object.keys(fields).find((key) =>
    normalizedAliases.includes(normalizeFieldName(key))
  );

  if (!matchingKey) return false;

  const value = fields[matchingKey];
  return value === true || fieldToText(value).toLowerCase() === "true";
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
  return fetchAllBitableRecords(
    process.env.FEISHU_BASE_APP_TOKEN as string,
    tableId,
    token
  );
}

async function getTableFieldNames(tableId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/fields?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`Could not fetch table fields: ${JSON.stringify(data)}`);
  }

  return (data.data.items || [])
    .map((field: any) => field.field_name || field.name)
    .filter(Boolean);
}

function resolveFieldName(fieldNames: string[], aliases: string[]) {
  const exact = aliases.find((alias) => fieldNames.includes(alias));
  if (exact) return exact;

  const normalizedAliases = aliases.map(normalizeFieldName);
  return fieldNames.find((fieldName) =>
    normalizedAliases.includes(normalizeFieldName(fieldName))
  );
}

function buildFields(
  fieldNames: string[],
  specs: { aliases: string[]; value: any; required?: boolean }[]
) {
  const fields: Record<string, any> = {};
  const missingRequired: string[] = [];

  for (const spec of specs) {
    const fieldName = resolveFieldName(fieldNames, spec.aliases);

    if (!fieldName) {
      if (spec.required) missingRequired.push(spec.aliases[0]);
      continue;
    }

    fields[fieldName] = spec.value;
  }

  return { fields, missingRequired };
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

async function updateRecord(
  tableId: string,
  token: string,
  recordId: string,
  fields: Record<string, any>
) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  return response.json();
}

async function deleteRecord(tableId: string, token: string, recordId: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
          questionId: readField(fields, ["questionId", "Question ID"]),
          formId: readField(fields, ["formId", "Form ID", "Template ID"]),
          order: readField(fields, ["order", "Order"]),
          label: readField(fields, ["label", "Label", "Question", "Question Text"]),
          labelCn: readField(fields, [
            "Label CN",
            "Question CN",
            "Question Text CN",
            "Name CN",
          ]),
          questionType: readField(fields, [
            "questionType",
            "Question Type",
            "Type",
          ]),
          options: readField(fields, ["options", "Options"]),
          optionsCn: readField(fields, ["Options CN"]),
          required: readBoolField(fields, ["required", "Required"]),
          helpText: readField(fields, ["helpText", "Help Text", "Helper Text"]),
          helpTextCn: readField(fields, [
            "Help Text CN",
            "Helper Text CN",
            "Description CN",
          ]),
        };
      });

      const forms = templateRecords.map((item: any) => {
        const fields = item.fields || {};
        const formId =
          readField(fields, ["formId", "Form ID", "Template ID"]) || item.record_id;

        return {
          recordId: item.record_id,
          formId,
          name: readField(fields, [
            "name",
            "Name",
            "Form Name",
            "Template Name",
            "Title",
          ]),
          nameCn: readField(fields, [
            "Name CN",
            "Form Name CN",
            "Template Name CN",
            "Title CN",
          ]),
          type: readField(fields, ["type", "Type", "Form Type"]),
          description: readField(fields, ["description", "Description"]),
          descriptionCn: readField(fields, ["Description CN"]),
          status: readField(fields, ["status", "Status"]),
          createdBy: readField(fields, ["createdBy", "Created By"]),
          createdAt: readField(fields, ["createdAt", "Created At"]),
          questions: questions
            .filter((question: any) => question.formId && question.formId === formId)
            .sort((a: any, b: any) => Number(a.order) - Number(b.order)),
        };
      });

      return res.status(200).json({ forms });
    }

    if (req.method === "DELETE") {
      const { recordId, formId } = req.body || {};

      if (!recordId) {
        return res.status(400).json({ error: "Missing form template record ID" });
      }

      const questionRecords = await getRecords(formQuestionsTableId, token);
      const childQuestions = questionRecords.filter((item: any) => {
        const fields = item.fields || {};
        return (
          formId &&
          readField(fields, ["formId", "Form ID", "Template ID"]) === String(formId)
        );
      });

      const deletedQuestions = [];

      for (const question of childQuestions) {
        const data = await deleteRecord(
          formQuestionsTableId,
          token,
          question.record_id
        );

        if (data.code !== 0) {
          return res.status(500).json({
            error: "Could not delete form question",
            larkResponse: data,
          });
        }

        deletedQuestions.push(question.record_id);
      }

      const templateData = await deleteRecord(
        formTemplatesTableId,
        token,
        String(recordId)
      );

      if (templateData.code !== 0) {
        return res.status(500).json({
          error: "Could not delete form template",
          larkResponse: templateData,
        });
      }

      return res.status(200).json({
        success: true,
        deletedQuestions: deletedQuestions.length,
      });
    }

    if (req.method === "PUT") {
      const [formTemplateFieldNames, formQuestionFieldNames] = await Promise.all([
        getTableFieldNames(formTemplatesTableId, token),
        getTableFieldNames(formQuestionsTableId, token),
      ]);

      const {
        recordId,
        formId,
        name,
        type,
        description,
        status,
        createdBy,
        questions,
      } = req.body || {};

      if (!recordId || !formId) {
        return res.status(400).json({ error: "Missing form template IDs" });
      }

      if (!name) {
        return res.status(400).json({ error: "Missing form name" });
      }

      const { fields: templateFields, missingRequired } = buildFields(
        formTemplateFieldNames,
        [
          {
            aliases: ["Form ID", "formId", "Template ID"],
            value: String(formId),
            required: true,
          },
          {
            aliases: ["Form Name", "name", "Name", "Template Name", "Title"],
            value: String(name),
            required: true,
          },
          {
            aliases: ["Type", "type", "Form Type"],
            value: String(type || "Questionnaire"),
          },
          {
            aliases: ["Description", "description"],
            value: String(description || ""),
          },
          {
            aliases: ["Status", "status"],
            value: String(status || "Active"),
          },
          {
            aliases: ["Created By", "createdBy"],
            value: String(createdBy || "Kent Bastell"),
          },
        ]
      );

      if (missingRequired.length > 0) {
        return res.status(400).json({
          error: "Missing required Feishu columns",
          missingRequired,
          availableFields: formTemplateFieldNames,
        });
      }

      const templateData = await updateRecord(
        formTemplatesTableId,
        token,
        String(recordId),
        templateFields
      );

      if (templateData.code !== 0) {
        return res.status(500).json({
          error: "Could not update form template",
          larkResponse: templateData,
          fieldsSent: templateFields,
        });
      }

      const existingQuestions = await getRecords(formQuestionsTableId, token);
      const childQuestions = existingQuestions.filter((item: any) => {
        const fields = item.fields || {};
        return (
          readField(fields, ["formId", "Form ID", "Template ID"]) === String(formId)
        );
      });

      for (const question of childQuestions) {
        const data = await deleteRecord(
          formQuestionsTableId,
          token,
          question.record_id
        );

        if (data.code !== 0) {
          return res.status(500).json({
            error: "Could not replace form questions",
            larkResponse: data,
          });
        }
      }

      const questionItems = Array.isArray(questions) ? questions : [];
      const createdQuestions = [];

      for (const [index, question] of questionItems.entries()) {
        const { fields: questionFields, missingRequired: missingQuestionFields } =
          buildFields(formQuestionFieldNames, [
            {
              aliases: ["Question ID", "questionId"],
              value: `Q-${Date.now()}-${index + 1}`,
              required: true,
            },
            {
              aliases: ["Form ID", "formId", "Template ID"],
              value: String(formId),
              required: true,
            },
            { aliases: ["Order", "order"], value: index + 1 },
            {
              aliases: ["Label", "label", "Question", "Question Text"],
              value: String(question.label || ""),
              required: true,
            },
            {
              aliases: ["Question Type", "questionType", "Type"],
              value: String(question.questionType || "Text"),
            },
            { aliases: ["Options", "options"], value: String(question.options || "") },
            { aliases: ["Required", "required"], value: Boolean(question.required) },
            {
              aliases: ["Help Text", "helpText", "Helper Text"],
              value: String(question.helpText || ""),
            },
          ]);

        if (missingQuestionFields.length > 0) {
          return res.status(400).json({
            error: "Missing required Feishu question columns",
            missingRequired: missingQuestionFields,
            availableFields: formQuestionFieldNames,
          });
        }

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
        formId: String(formId),
        formRecordId: String(recordId),
        questionRecordsCreated: createdQuestions.length,
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { name, type, description, status, createdBy, questions } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing form name" });
    }

    const formId = `FORM-${Date.now()}`;
    const [formTemplateFieldNames, formQuestionFieldNames] = await Promise.all([
      getTableFieldNames(formTemplatesTableId, token),
      getTableFieldNames(formQuestionsTableId, token),
    ]);

    const { fields: templateFields, missingRequired } = buildFields(
      formTemplateFieldNames,
      [
        { aliases: ["Form ID", "formId", "Template ID"], value: formId, required: true },
        {
          aliases: ["Form Name", "name", "Name", "Template Name", "Title"],
          value: String(name),
          required: true,
        },
        {
          aliases: ["Type", "type", "Form Type"],
          value: String(type || "Questionnaire"),
        },
        { aliases: ["Description", "description"], value: String(description || "") },
        { aliases: ["Status", "status"], value: String(status || "Active") },
        {
          aliases: ["Created By", "createdBy"],
          value: String(createdBy || "Kent Bastell"),
        },
        { aliases: ["Created At", "createdAt"], value: toLarkDate() },
      ]
    );

    if (missingRequired.length > 0) {
      return res.status(400).json({
        error: "Missing required Feishu columns",
        missingRequired,
        availableFields: formTemplateFieldNames,
      });
    }

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
      const { fields: questionFields, missingRequired: missingQuestionFields } =
        buildFields(formQuestionFieldNames, [
          {
            aliases: ["Question ID", "questionId"],
            value: `Q-${Date.now()}-${index + 1}`,
            required: true,
          },
          {
            aliases: ["Form ID", "formId", "Template ID"],
            value: formId,
            required: true,
          },
          { aliases: ["Order", "order"], value: index + 1 },
          {
            aliases: ["Label", "label", "Question", "Question Text"],
            value: String(question.label || ""),
            required: true,
          },
          {
            aliases: ["Question Type", "questionType", "Type"],
            value: String(question.questionType || "Text"),
          },
          { aliases: ["Options", "options"], value: String(question.options || "") },
          { aliases: ["Required", "required"], value: Boolean(question.required) },
          {
            aliases: ["Help Text", "helpText", "Helper Text"],
            value: String(question.helpText || ""),
          },
        ]);

      if (missingQuestionFields.length > 0) {
        return res.status(400).json({
          error: "Missing required Feishu question columns",
          missingRequired: missingQuestionFields,
          availableFields: formQuestionFieldNames,
        });
      }

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
