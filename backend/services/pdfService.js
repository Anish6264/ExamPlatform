import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractQuestions(buffer) {
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false });
  const pdf = await task.promise;
  const lines = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    let currentY = null;
    let line = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = Math.round(item.transform?.[5] ?? 0);
      if (currentY !== null && Math.abs(y - currentY) > 3) {
        if (line.trim()) lines.push(line.trim());
        line = "";
      }
      line += `${item.str} `;
      currentY = y;
    }
    if (line.trim()) lines.push(line.trim());
  }

  const cleaned = lines.map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  const questions = [];
  let current = null;
  const qStart = /^(?:Q(?:uestion)?\s*)?\d{1,3}\s*[.)\-:]\s*(.+)$/i;
  const optionStart = /^([A-Da-d])[).]\s*(.+)$/;
  for (const line of cleaned) {
    const om = line.match(optionStart);
    const qm = line.match(qStart);
    if (om && current) {
      current.options.push(om[2].trim());
    } else if (qm && !om) {
      if (current && current.text.trim()) questions.push(current);
      current = { text: qm[1].trim(), options: [], correctIndex: null, explanation: "" };
    } else if (current) {
      current.text += ` ${line}`;
    }
  }
  if (current && current.text.trim()) questions.push(current);

  return {
    pageCount: pdf.numPages,
    extractedText: cleaned.join("\n").slice(0, 100000),
    questions: questions
      .filter(q => q.options.length >= 2)
      .map(q => ({ ...q, options: q.options.slice(0, 6) }))
      .slice(0, 300)
  };
}
