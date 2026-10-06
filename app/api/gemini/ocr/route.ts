import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing from environment variables!");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const image = formData.get("image") as File | null;

        if (!image) {
            return NextResponse.json({ error: "No image provided." }, { status: 400 });
        }

        const bytes = await image.arrayBuffer();
        const base64Image = Buffer.from(bytes).toString("base64");
        const mimeType = image.type || "image/png";

        const prompt = `Extract all text and chess notation from this image with the following rules:
1. Preserve exact move numbers, layout, spaces, and punctuation (like +, #, -, x).
2. Replace every chess piece icon/symbol with its standard uppercase English letter:
   - King icon -> K
   - Queen icon -> Q
   - Rook icon -> R
   - Bishop icon -> B
   - Knight icon -> N
3. Do not add letter prefixes for pawn moves (keep standard algebraic notation, e.g., e4, d5, fxg6).
4. Output the result in JSON format under the "moves" key.`;

        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Image,
                    },
                },
                prompt,
            ],
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        moves: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                    },
                    required: ["moves"],
                },
            },
        });

        const resultText = response.text || "{}";
        const parsed = JSON.parse(resultText);

        return NextResponse.json(parsed);
    } catch (err: unknown) {
        console.error("[/api/gemini/ocr] Error:", err);
        return NextResponse.json(
            { error: "Failed to perform OCR on image" },
            { status: 500 }
        );
    }
}