/** Optional OpenRouter fallback for PDF layouts the deterministic parser cannot read. */
export async function structureQuestionsWithAI(extractedText) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  if (!extractedText?.trim()) return null;

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
      messages: [
        { role: "system", content: "Convert exam-paper text into JSON only. Do not invent missing text or answers. Return {questions:[{questionNumber:number,text:string,type:'mcq'|'integer',options:string[],correctAnswer:string|null,explanation:string}]} . For MCQs, preserve option text and use correctAnswer only if the source explicitly includes it. For integer/numerical questions, use type integer and options []." },
        { role: "user", content: extractedText.slice(0, 45000) }
      ]
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty parsing response.");
  let parsed;
  try { parsed = JSON.parse(content); } catch { throw new Error("OpenRouter returned invalid JSON for question parsing."); }
  if (!Array.isArray(parsed.questions)) throw new Error("OpenRouter response did not contain a questions array.");
  return parsed.questions.slice(0, 300).map((q, i) => ({
    questionNumber: Number.isInteger(Number(q.questionNumber)) ? Number(q.questionNumber) : i + 1,
    text: String(q.text || "").trim(),
    type: q.type === "integer" ? "integer" : "mcq",
    options: Array.isArray(q.options) ? q.options.map(v => String(v || "").trim()).filter(Boolean).slice(0, 6) : [],
    correctAnswer: q.correctAnswer == null ? null : String(q.correctAnswer).trim(),
    correctIndex: null,
    explanation: String(q.explanation || "").trim()
  })).filter(q => q.text && (q.type === "integer" || q.options.length >= 2));
}

export async function extractAnswerKeyWithAI(extractedText) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !extractedText?.trim()) return null;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": process.env.OPENROUTER_APP_NAME || "PrepSpace" },
    body: JSON.stringify({ model, temperature: 0, response_format: { type: "json_object" }, messages: [
      { role: "system", content: "Extract only answers explicitly present in the answer-key text. Return JSON {answers:[{questionNumber:number,answer:string}]}. Preserve letters or numerical answers as written. Never infer missing answers." },
      { role: "user", content: extractedText.slice(0, 30000) }
    ] })
  });
  if (!response.ok) throw new Error(`OpenRouter answer-key parsing failed (${response.status}).`);
  const payload = await response.json();
  const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
  return Array.isArray(parsed.answers) ? parsed.answers.filter(a => Number.isInteger(Number(a.questionNumber)) && Number(a.questionNumber) > 0).map(a => ({ questionNumber: Number(a.questionNumber), answer: String(a.answer ?? "").trim() })) : null;
}
