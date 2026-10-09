import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractPdfText(buffer) {
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false
  });

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

  const cleaned = lines
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return {
    pageCount: pdf.numPages,
    lines: cleaned,
    extractedText: cleaned.join("\n").slice(0, 100000)
  };
}

export async function extractQuestions(buffer) {
  const { pageCount, lines, extractedText } =
    await extractPdfText(buffer);

  const questions = [];
  let current = null;

  const questionStart =
    /^(?:Q(?:uestion)?\s*)?\d{1,3}\s*[.)\-:]\s*(.+)$/i;

  const optionStart = /^([A-Fa-f])[).]\s*(.+)$/;

  for (const line of lines) {
    const optionMatch = line.match(optionStart);
    const questionMatch = line.match(questionStart);

    if (optionMatch && current) {
      current.options.push(optionMatch[2].trim());
    } else if (questionMatch && !optionMatch) {
      if (current && current.text.trim()) {
        questions.push(current);
      }

      current = {
        text: questionMatch[1].trim(),
        options: [],
        correctIndex: null,
        explanation: ""
      };
    } else if (current) {
      current.text += ` ${line}`;
    }
  }

  if (current && current.text.trim()) {
    questions.push(current);
  }

  return {
    pageCount,
    extractedText,
    questions: questions
      .filter(question => question.options.length >= 2)
      .map(question => ({
        ...question,
        options: question.options.slice(0, 6)
      }))
      .slice(0, 300)
  };
}

export async function extractAnswerKey(buffer) {
  const { pageCount, lines, extractedText } =
    await extractPdfText(buffer);

  const answers = new Map();

  const patterns = [
    /(?:^|[\s,;|])(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[.)\-:=]\s*([A-F])(?=$|[\s,;|.)])/gi,
    /(?:^|[\s,;|])(?:Q(?:uestion)?\s*)(\d{1,3})\s+([A-F])(?=$|[\s,;|.)])/gi,
    /(?:^|[\s,;|])(?<![A-Za-z])(\d{1,3})\s+([A-F])(?=$|[\s,;|.)])/gi
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;

      let match;

      while ((match = pattern.exec(line)) !== null) {
        const questionNumber = Number(match[1]);
        const letter = match[2].toUpperCase();

        if (questionNumber >= 1 && questionNumber <= 300) {
          answers.set(
            questionNumber,
            letter.charCodeAt(0) - 65
          );
        }
      }
    }
  }

  return {
    pageCount,
    extractedText,
    answers: [...answers.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([questionNumber, correctIndex]) => ({
        questionNumber,
        correctIndex,
        letter: String.fromCharCode(65 + correctIndex)
      }))
  };
}