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
- Engine best move: ${m.bestMove}

Write a very short sentence(within 8 words) teaching comment. Tone: warm, direct, educational. Do NOT use markdown formatting or bullet points — plain prose only. Do not add the number before the move
${praise
            ? "Praise the move briefly and explain why it was strong."
            : `Explain what went wrong with ${m.move} and what ${m.bestMove} would have achieved instead.`
        }`;
}

// ── Ollama config ─────────────────────────────────────────────────────────────

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1";

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    let body: { moveAnalysis: MoveAnalysis };

    try {
        body = await req.json();
    } catch (err) {
        console.error("[/api/ollama] Failed to parse request body:", err);
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { moveAnalysis } = body;

    if (!moveAnalysis) {
        console.error("[/api/ollama] Request body is missing moveAnalysis field.");
        return NextResponse.json(
            { error: "Missing moveAnalysis in request body." },
            { status: 400 }
        );
    }

    const prompt = buildPrompt(moveAnalysis);

    // Call the local Ollama API — catch connection/HTTP errors before streaming
    // so we can return a proper HTTP status to the client.
    let ollamaResponse: Response;
    try {
        ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt,
                stream: true,
                options: {
                    num_predict: 256,
                    temperature: 0.7,
                },
            }),
        });
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Failed to reach Ollama server";
        console.error(
            `[/api/ollama] Could not connect to Ollama at ${OLLAMA_BASE_URL}:`,
            err
        );
        return NextResponse.json(
            { error: `Ollama connection error: ${message}` },
            { status: 503 }
        );
    }

    if (!ollamaResponse.ok) {
        const text = await ollamaResponse.text().catch(() => "");
        console.error(
            `[/api/ollama] Ollama HTTP ${ollamaResponse.status} for move ${moveAnalysis.step} (${moveAnalysis.move}):`,
            text
        );
        const friendly: Record<number, string> = {
            404: `Model "${OLLAMA_MODEL}" not found — run: ollama pull ${OLLAMA_MODEL}`,
            500: "Ollama internal error — check the Ollama server logs.",
        };
        return NextResponse.json(
            { error: friendly[ollamaResponse.status] ?? (text || "Ollama error") },
            { status: ollamaResponse.status }
        );
    }

    // Ollama streams NDJSON: each line is { "response": "...", "done": bool }
    // We decode each line and forward just the token text to the client.
    const stream = new ReadableStream({
        async start(controller) {
            const reader = ollamaResponse.body?.getReader();
            if (!reader) {
                controller.close();
                return;
            }

            const decoder = new TextDecoder();
            let buffer = "";

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Ollama sends one JSON object per newline
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? ""; // keep any incomplete trailing line

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const json = JSON.parse(line) as {
                                response?: string;
                                done?: boolean;
                            };
                            if (json.response) {
                                controller.enqueue(
                                    new TextEncoder().encode(json.response)
                                );
                            }
                            if (json.done) break;
                        } catch {
                            // Ignore malformed lines
                        }
                    }
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Unknown stream error";
                console.error(
                    `[/api/ollama] Stream error for move ${moveAnalysis.step} (${moveAnalysis.move}):`,
                    err
                );
                controller.enqueue(new TextEncoder().encode(`[Error: ${message}]`));
            } finally {
                reader.releaseLock();
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
