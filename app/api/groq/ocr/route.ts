import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const image = formData.get("image") as File | null;

        if (!image) {
            return NextResponse.json({ error: "No image provided." }, { status: 400 });
        }

        const bytes = await image.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        const mimeType = image.type || "image/png";
        const dataUrl = `data:${mimeType};base64,${base64}`;
        const prompt = `Extract all text and chess notation from this image and return the result in a JSON object.

Rules:
1. Preserve exact move numbers, layout, spaces, and punctuation (like +, #, -, x).
2. Replace every chess piece icon/symbol with its standard uppercase English letter:
   - King icon -> K
   - Queen icon -> Q
   - Rook icon -> R
   - Bishop icon -> B
   - Knight icon -> N
3. Do not add letter prefixes for pawn moves (keep standard algebraic notation, e.g., e4, d5, fxg6).
4. Return a valid JSON object containing a "moves" array of strings, like this:
{
  "moves": ["1. e4", "e5", "2. Nf3", "Nc6"]
}`;
        const completion = await groq.chat.completions.create({
            model: "qwen/qwen3.8-27b",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: { url: dataUrl },
                        },
                    ],
                },
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const rawContent = completion.choices[0]?.message?.content || "{}";

        let parsed: { moves?: string[] };
        try {
            parsed = JSON.parse(rawContent);
        } catch {
            const cleaned = rawContent.replace(/```json|```/g, "").trim();
            parsed = JSON.parse(cleaned);
            console.log("Parsed: ", parsed)
        }

        if (!parsed.moves || !Array.isArray(parsed.moves)) {
            const textMoves = typeof rawContent === "string" ? rawContent.trim().split(/\s+/) : [];
            console.log("Parsed: ", textMoves)
            return NextResponse.json({ moves: textMoves });
        }

        return NextResponse.json(parsed);
    } catch (err: unknown) {
        console.error("[/api/groq/ocr] Error processing OCR request:", err);
        const status = (err as { status?: number }).status ?? 500;
        const message = (err as { message?: string }).message ?? "Failed to perform OCR on image";
        return NextResponse.json({ error: message }, { status });
    }
}
