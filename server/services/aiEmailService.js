import axios from "axios";

const EMAIL_TYPE_PROMPTS = {
  feature_update:
    "Write a professional product update email announcing new features in CineCircle.",
  maintenance_notice:
    "Write a professional maintenance notice email for CineCircle users including a concise maintenance window note.",
  offer_announcement:
    "Write a professional promotional email announcing a special offer for CineCircle users.",
  general_update:
    "Write a professional general update email for CineCircle users.",
};

const EMAIL_TYPE_TITLES = {
  feature_update: "Feature Update",
  maintenance_notice: "Maintenance Notice",
  offer_announcement: "Offer Announcement",
  general_update: "General Update",
};

const normalizeType = (emailType) => {
  const key = String(emailType || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return EMAIL_TYPE_PROMPTS[key] ? key : "general_update";
};

const parseModelJson = (rawText = "") => {
  const trimmed = String(rawText || "").trim();
  if (!trimmed) return null;

  const fenced =
    trimmed.match(/```json\s*([\s\S]*?)\s*```/i)?.[1] ||
    trimmed.match(/```\s*([\s\S]*?)\s*```/i)?.[1] ||
    trimmed;

  try {
    const parsed = JSON.parse(fenced);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // ignore parse error and fallback below
  }

  return null;
};

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const normalizeModelName = (modelName) =>
  String(modelName || "")
    .trim()
    .replace(/^models\//i, "");

const fallbackFromText = (rawText, emailType) => {
  const title = EMAIL_TYPE_TITLES[emailType] || "General Update";
  const defaultSubject = `CineCircle ${title}`;
  const text = String(rawText || "").trim();
  if (!text) {
    return {
      subject: defaultSubject,
      body:
        title === "Maintenance Notice"
          ? "Hello CineCircle users,\n\nWe are scheduling a short maintenance window to improve stability and performance. Some features may be temporarily unavailable during this time. We appreciate your patience and will restore full service as quickly as possible.\n\nThank you,\nCineCircle Team"
          : title === "Offer Announcement"
            ? "Hello CineCircle users,\n\nWe are excited to share a new offer from CineCircle. Log in to your account to explore the latest benefits and enjoy a better movie discovery experience.\n\nBest regards,\nCineCircle Team"
            : "Hello CineCircle users,\n\nHere is an important update from our team. We are continuously improving CineCircle to make your movie discovery and social experience better.\n\nBest regards,\nCineCircle Team",
    };
  }

  const subjectMatch = text.match(/subject\s*:\s*(.+)/i);
  const bodyMatch = text.match(/body\s*:\s*([\s\S]+)/i);

  return {
    subject: (subjectMatch?.[1] || defaultSubject).trim(),
    body: (bodyMatch?.[1] || text).trim(),
  };
};

export const generateAIEmail = async (emailTypeInput) => {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const emailType = normalizeType(emailTypeInput);
  if (!apiKey) {
    return fallbackFromText("", emailType);
  }

  const preferredModel = normalizeModelName(process.env.GEMINI_MODEL || "gemini-2.5-flash");
  const modelCandidates = [...new Set([
    preferredModel,
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
  ])];

  const instruction = `
You are an email copywriter for CineCircle.
${EMAIL_TYPE_PROMPTS[emailType]}

Respond with STRICT JSON only and no markdown:
{
  "subject": "string",
  "body": "string"
}

Rules:
- Subject: professional and concise.
- Body: polished and user-friendly.
- Do not include placeholders like [Name].
  `.trim();

  let lastError = null;
  let lastErrorDetail = "";

  for (const model of modelCandidates) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: instruction }],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 900,
          },
        },
        { timeout: 30000 }
      );

      const rawText =
        response?.data?.candidates?.[0]?.content?.parts
          ?.map((part) => part?.text || "")
          .join("\n")
          .trim() || "";

      const parsed = parseModelJson(rawText);
      const parsedSubject = String(parsed?.subject || "").trim();
      const parsedBody = String(parsed?.body || "").trim();
      if (isNonEmptyString(parsedSubject) && isNonEmptyString(parsedBody)) {
        return {
          subject: parsedSubject,
          body: parsedBody,
        };
      }

      return fallbackFromText(rawText, emailType);
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const apiMessage = error?.response?.data?.error?.message;
      lastErrorDetail = `model=${model} status=${status || "n/a"} message=${apiMessage || error.message}`;
      // Retry next model on API/model issues; otherwise continue to fallback after loop.
      if (status === 404 || status === 400 || status === 429 || status === 403) {
        continue;
      }
    }
  }

  if (lastError) {
    console.error("Gemini generation failed, using fallback:", lastErrorDetail || lastError.message);
  }
  return fallbackFromText("", emailType);
};
