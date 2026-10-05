import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

// ── Types (mirrors useChessAnalysis.tsx) ─────────────────────────────────────

type MoveClassification =
    | "best"
    | "good"
    | "inaccuracy"
    | "mistake"
    | "blunder"
    | "miss";

type Evaluation =
    | { type: "cp"; value: number }
    | { type: "mate"; value: number };

type MoveAnalysis = {
    step: number;
    move: string;
    player: "w" | "b";
    evaluationBefore: Evaluation | null;
    evaluationAfter: Evaluation | null;
    evaluationLoss: number | null;
    bestMove: string;
    classification: MoveClassification;
    grade: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEval(ev: Evaluation | null): string {
    if (!ev) return "unknown";
    if (ev.type === "mate") return `mate in ${Math.abs(ev.value)}`;
    const pawns = (ev.value / 100).toFixed(2);
    return `${Number(pawns) >= 0 ? "+" : ""}${pawns} pawns`;
}

function buildPrompt(m: MoveAnalysis): string {
    const side = m.player === "w" ? "White" : "Black";
    const moveNum = Math.floor(m.step / 2) + 1;
    const evalBefore = formatEval(m.evaluationBefore);
    const evalAfter = formatEval(m.evaluationAfter);
    const loss =
        m.evaluationLoss !== null
            ? `${(m.evaluationLoss / 100).toFixed(2)} pawns`
            : "unknown";

    const praise = m.classification === "best" || m.classification === "good";

    return `You are Wayne, a friendly and encouraging chess tutor. A student just played a move and you need to give them a short, clear teaching moment.

Move data:
- Side to move: ${side}
- Move number: ${moveNum}
- Move played: ${m.move}
- Classification: ${m.classification}
- Evaluation before the move: ${evalBefore}
- Evaluation after the move: ${evalAfter}
- Evaluation loss: ${loss}
- Engine's best move: ${m.bestMove}

Write a very short sentence (within 8 words) teaching comment. Tone: warm, direct, educational. Do NOT use markdown formatting or bullet points — plain prose only. Do not add the number before the move
${praise
            ? "Praise the move briefly and explain why it was strong."
            : `Explain what went wrong with ${m.move} and what ${m.bestMove} would have achieved instead.`
        }`;
}

// ── Groq client ───────────────────────────────────────────────────────────────

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    let body: { moveAnalysis: MoveAnalysis };

    try {
        body = await req.json();
    } catch (err) {
        console.error("[/api/groq] Failed to parse request body:", err);
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { moveAnalysis } = body;

    if (!moveAnalysis) {
        console.error("[/api/groq] Request body is missing moveAnalysis field.");
        return NextResponse.json(
            { error: "Missing moveAnalysis in request body." },
            { status: 400 }
        );
    }

    const prompt = buildPrompt(moveAnalysis);

    // Catch Groq API-level errors (4xx/5xx) before opening the stream so we
    // can return a proper HTTP status code the client can act on (e.g. 429).
    let completion: Awaited<ReturnType<typeof groq.chat.completions.create>>;
    try {
        completion = await groq.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1024,
            temperature: 0.7,
            stream: true,
        });
    } catch (err: unknown) {
        // Groq SDK surfaces HTTP errors as objects with a `status` field
        const status = (err as { status?: number }).status ?? 500;
        const message = (err as { message?: string }).message ?? "Unknown Groq error";

        console.error(
            `[/api/groq] Groq API error (HTTP ${status}) for move ${moveAnalysis.step
            } (${moveAnalysis.move}):`,
            err
        );

        const friendly: Record<number, string> = {
            429: "Rate limit reached — please wait a moment and try again.",
            401: "Invalid Groq API key.",
            503: "Groq service unavailable — try again later.",
        };

        return NextResponse.json(
            { error: friendly[status] ?? message },
            { status }
        );
    }

    // Stream tokens back so the UI can render progressively
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of completion) {

                    const text = chunk.choices[0]?.delta?.content ?? "";

                    console.log("TEXT:", JSON.stringify(text));

                    if (text) {
                        controller.enqueue(
                            new TextEncoder().encode(text)
                        );
                    }
                }
            } catch (err) {
                // Mid-stream error (network drop, etc.)
                const message =
                    err instanceof Error ? err.message : "Unknown stream error";
                console.error(
                    `[/api/groq] Stream error for move ${moveAnalysis.step
                    } (${moveAnalysis.move}):`,
                    err
                );
                controller.enqueue(new TextEncoder().encode(`[Error: ${message}]`));
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
        },
    });
}

