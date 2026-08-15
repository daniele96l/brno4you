import { formatStudentValidationError } from "./student-schema";

const MESSAGE_HINTS: Array<{ test: RegExp; text: string }> = [
  {
    test: /^unauthorized$/i,
    text: "You don’t have access. Open your invite link again, or sign in as admin.",
  },
  {
    test: /^not found$/i,
    text: "We couldn’t find that record. Check the link or refresh the page.",
  },
  {
    test: /student not found/i,
    text: "We couldn’t find this participant. Check the link or refresh.",
  },
  {
    test: /project not found/i,
    text: "We couldn’t find this project. Go back to the project list and open it again.",
  },
  {
    test: /missing id front|id front image is required/i,
    text: "Upload a clear photo of the front of your ID, then try again.",
  },
  {
    test: /id card back|id back/i,
    text: "For an ID card, upload a clear photo of the back as well.",
  },
  {
    test: /studentid required|missing data/i,
    text: "Something went wrong sending the form. Refresh the page and try again.",
  },
  {
    test: /openai_api_key|not configured/i,
    text: "ID verification isn’t set up on the server yet. Contact the organisers.",
  },
  {
    test: /file not found/i,
    text: "The uploaded file is missing. Please upload the ID photo again.",
  },
  {
    test: /complete id verification/i,
    text: "Finish ID verification first (fix mismatches or choose “Ignore and continue anyway”).",
  },
  {
    test: /already signed/i,
    text: "This document is already signed. Open the next one in the list.",
  },
  {
    test: /typed full name/i,
    text: "Type your full name in the name field before confirming the signature.",
  },
  {
    test: /signature drawing|invalid signature/i,
    text: "Draw your signature in the white box, then confirm.",
  },
  {
    test: /document already signed/i,
    text: "This document was already signed and can’t be regenerated.",
  },
  {
    test: /unknown template/i,
    text: "That document template doesn’t exist. Pick another template or refresh templates.",
  },
  {
    test: /requires a student/i,
    text: "This document needs a participant selected.",
  },
  {
    test: /name and type required/i,
    text: "Enter a project name and choose Youth Exchange or Training Course.",
  },
  {
    test: /invalid type/i,
    text: "Choose a valid project type: Youth Exchange or Training Course.",
  },
  {
    test: /invalid password/i,
    text: "Wrong admin password. Try again.",
  },
  {
    test: /project_id required|invite link/i,
    text: "Open your project invite link to apply (the link from the organisers).",
  },
  {
    test: /templateid required/i,
    text: "Choose which document template to generate.",
  },
  {
    test: /select a partner|partner/i,
    text: "Select a partner organisation first, then generate.",
  },
  {
    test: /failed to fetch|networkerror|load failed/i,
    text: "Network error — check your connection and try again.",
  },
];

function humanizeMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  for (const { test, text } of MESSAGE_HINTS) {
    if (test.test(trimmed)) return text;
  }
  return trimmed;
}

/**
 * Turn any API `error` field (string, Zod flatten, or odd object) into a clear
 * message the user can act on. Never returns an empty string.
 */
export function explainApiError(
  error: unknown,
  fallback: string,
): string {
  if (error == null || error === "") {
    return fallback;
  }

  if (typeof error === "string") {
    if (
      /did not match the expected pattern|match the expected pattern|must match pattern|invalid string/i.test(
        error,
      )
    ) {
      // Let the form resolve the concrete field — never return a vague format banner.
      return "";
    }
    const fromZodJson = formatStudentValidationError(error);
    if (
      fromZodJson &&
      (fromZodJson.includes("You entered:") ||
        fromZodJson.includes("Expected instead:"))
    ) {
      return fromZodJson;
    }
    if (fromZodJson) return fromZodJson;
    return humanizeMessage(error) || fallback;
  }

  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;

    if (obj.fieldErrors || obj.formErrors) {
      return formatStudentValidationError(error);
    }

    if (typeof obj.error === "string") {
      return humanizeMessage(obj.error) || fallback;
    }

    if (typeof obj.message === "string") {
      return humanizeMessage(obj.message) || fallback;
    }

    try {
      const raw = JSON.stringify(error);
      if (raw && raw !== "{}" && raw !== "[]") {
        return `${fallback} (details: ${raw})`;
      }
    } catch {
      /* ignore */
    }
  }

  return fallback;
}

/** Prefer response JSON error; fall back if body isn’t JSON. */
export async function explainResponseError(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const json = (await res.json()) as { error?: unknown };
    return explainApiError(json.error, fallback);
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}
