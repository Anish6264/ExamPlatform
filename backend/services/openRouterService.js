/** OpenRouter helpers for structuring PDF text in bounded chunks. */
function splitText(text, maxChars = 12000) {
  const lines = String(text || "").split(/\r?\n/);
  const chunks = [];
  let current = "";
  for (const line of lines) {
    if (current && current.length + line.length + 1 > maxChars) {
      chunks.push(current);
      current = "";
    }
    // A single exceptionally long line is split instead of discarded.
    if (line.length > maxChars) {
      if (current) chunks.push(current);
      for (let i = 0; i < line.length; i += maxChars) {
        chunks.push(line.slice(i, i + maxChars));
      }
      current = "";
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function askOpenRouter(messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
      "X-Title": process.env.OPENROUTER_APP_NAME || "PrepSpace"
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty parsing response.");
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenRouter returned invalid JSON.");
  }
}

export async function structureQuestionsWithAI(extractedText) {
  if (!process.env.OPENROUTER_API_KEY || !extractedText?.trim()) return null;

  // Chunking prevents the model context/output limit from silently dropping
  // later pages/questions. Merge results by printed question number.
  const chunks = splitText(extractedText, 12000);
  const all = [];
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const parsed = await askOpenRouter([
      {
        role: "system",
        content: "Extract EVERY complete exam question present in this text chunk. Do not stop after 10 questions. Return JSON only: {questions:[{questionNumber:number|null,text:string,type:'mcq'|'integer'|'numeric',options:string[],correctAnswer:string|null,explanation:string}]}. Preserve printed question numbers. Do not invent omitted text or answers. If a question continues from a prior chunk and is incomplete, omit it; include only complete questions. MCQ options should contain option text without the A./B. label where possible. Numeric/integer questions have options []. correctAnswer must be null unless explicitly printed in this question-paper text."
      },
      {
        role: "user",
        content: `Text chunk ${chunkIndex + 1} of ${chunks.length}. Extract all complete questions in this chunk:\\n${chunks[chunkIndex]}`
      }
    ]);
    if (Array.isArray(parsed?.questions)) {
      all.push(...parsed.questions);
    }
  }

  const normalized = all.map((q, i) => ({
    questionNumber: Number.isInteger(Number(q.questionNumber)) && Number(q.questionNumber) > 0 ? Number(q.questionNumber) : null,
    text: String(q.text || "").trim(),
    type: ["integer", "numeric"].includes(String(q.type || "").toLowerCase()) ? String(q.type).toLowerCase() : "mcq",
    options: Array.isArray(q.options) ? q.options.map(v => String(v || "").trim()).filter(Boolean).slice(0, 8) : [],
    correctAnswer: q.correctAnswer == null ? null : String(q.correctAnswer).trim(),
    correctIndex: null,
    explanation: String(q.explanation || "").trim()
  })).filter(q => q.text && (q.type !== "mcq" || q.options.length >= 2));

  // De-duplicate overlaps caused by a question crossing a chunk boundary.
  const seen = new Set();
  return normalized.filter((q, i) => {
    const key = q.questionNumber != null
      ? `n:${q.questionNumber}`
      : `t:${q.text.toLowerCase().replace(/\\W+/g, " ").slice(0, 160)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((q, i) => ({ ...q, questionNumber: q.questionNumber ?? i + 1 }));
}

export async function extractAnswerKeyWithAI(extractedText) {
  if (!process.env.OPENROUTER_API_KEY || !extractedText?.trim()) return null;
  const chunks = splitText(extractedText, 12000);
  const all = [];
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const parsed = await askOpenRouter([
      {
        role: "system",
        content: "Extract EVERY answer-key entry in this text chunk, not just the first 10. Return JSON {answers:[{questionNumber:number,answer:string}]}. Preserve question numbers exactly and preserve answers as written (A-F, option text, integer or decimal). Do not infer missing answers. Ignore page numbers, marks and unrelated numbers."
      },
      {
        role: "user",
        content: `Answer-key text chunk ${chunkIndex + 1} of ${chunks.length}:\\n${chunks[chunkIndex]}`
      }
    ]);
    if (Array.isArray(parsed?.answers)) all.push(...parsed.answers);
  }
  const byNumber = new Map();
  for (const item of all) {
    const questionNumber = Number(item.questionNumber);
    const answer = String(item.answer ?? "").trim();
    if (Number.isInteger(questionNumber) && questionNumber > 0 && answer) {
      byNumber.set(questionNumber, { questionNumber, answer });
    }
  }
  return [...byNumber.values()].sort((a, b) => a.questionNumber - b.questionNumber);
}
