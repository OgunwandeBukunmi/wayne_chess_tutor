import { error } from "console";
import { RequestErrorContext } from "next/dist/server/instrumentation/types";
import { useEffect, useState } from "react";

type Evaluation =
    | { type: "cp"; value: number }
    | { type: "mate"; value: number };

type MoveClassification =
    | "best"
    | "good"
    | "inaccuracy"
    | "mistake"
    | "blunder"
    | "miss";

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

export function useMoveExplanations(
    moveAnalysis: MoveAnalysis[],
    analysisComplete: string,
    stockFishError: string | null,
    allow: boolean,
) {
    const [explanations, setExplanations] = useState<
        Record<number, string>
    >({});
    const [shouldGenerate, setShouldGenerate] = useState<boolean>(true);

    const [status, setStatus] = useState<
        "idle" | "generating" | "complete" | "error" | "idle"
    >("idle");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status != "complete") return;

        sessionStorage.setItem("ai-explanations", JSON.stringify(explanations));

    }, [status])

    useEffect(() => {
        const storedExplanations = sessionStorage.getItem("ai-explanations");

        if (storedExplanations) {
            const parsed = JSON.parse(storedExplanations);
            setExplanations(parsed);
            setStatus("complete");
            setShouldGenerate(false);
            return;
        }

        if (!allow || stockFishError || stockFishError?.length > 0 || !shouldGenerate) {
            console.log("NO EXPLANATIONS GENERATED (1)", stockFishError, allow, shouldGenerate);
            setStatus("idle");
            setError(null);
            return;
        }

        if (!analysisComplete) {
            console.log("NO EXPLANATIONS GENERATED (2)", analysisComplete);
            return;
        }

        if (moveAnalysis.length === 0) {
            console.log("NO EXPLANATIONS GENERATED (3)", moveAnalysis.length);
            return;
        }

        let cancelled = false;

        async function generateExplanations() {
            console.log(
                "STARTING EXPLANATION GENERATION",
                moveAnalysis.length
            );

            setStatus("generating");

            for (const move of moveAnalysis) {
                if (cancelled) {
                    console.log("GENERATION CANCELLED");
                    return;
                }

                console.log(
                    `STARTING: ${move.step} ${move.move}`
                );

                try {
                    const response = await fetch("/api/groq/chess", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            moveAnalysis: move,
                        }),
                    });

                    if (!response.ok) {
                        const errorBody = await response.text();
                        setStatus("error");
                        setError(errorBody);

                        throw new Error(
                            `Request failed: ${response.status} ${errorBody}`
                        );
                    }

                    if (!response.body) {
                        const errorBody = await response.text();
                        setStatus("error");
                        setError(errorBody);
                        throw new Error("No response body");
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();

                    let explanation = "";

                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) {
                            break;
                        }

                        if (cancelled) {
                            await reader.cancel();
                            return;
                        }

                        const chunk = decoder.decode(value, {
                            stream: true,
                        });

                        explanation += chunk;

                        setExplanations((previous) => ({
                            ...previous,
                            [move.step]: explanation,
                        }));
                    }

                    const remaining = decoder.decode();

                    if (remaining) {
                        explanation += remaining;
                    }

                    if (cancelled) {
                        return;
                    }

                    setExplanations((previous) => ({
                        ...previous,
                        [move.step]: explanation,
                    }));

                    console.log(
                        `FINISHED: ${move.step} ${move.move}`,
                        explanation
                    );
                } catch (error: any) {
                    setError(error.message);
                    setStatus("error");
                    console.error(
                        `ERROR: ${move.step} ${move.move}`,
                        error
                    );

                    if (cancelled) {
                        return;
                    }

                    setExplanations((previous) => ({
                        ...previous,
                        [move.step]:
                            "Unable to generate an explanation.",
                    }));
                }

                if (cancelled) {
                    return;
                }

                await new Promise<void>((resolve) => {
                    setTimeout(resolve, 3000);
                });
            }

            if (!cancelled) {
                console.log("ALL EXPLANATIONS COMPLETE");
                setStatus("complete");
            }
        }

        generateExplanations();

        return () => {
            cancelled = true;
        };
    }, [analysisComplete, allow, stockFishError]);

    return {
        explanations,
        explanationStatus: status,
        explanationError: error,
    };
}