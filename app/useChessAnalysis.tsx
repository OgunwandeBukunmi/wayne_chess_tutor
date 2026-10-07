
"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";

type MoveClassification =
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "miss";

type Evaluation =
  | {
    type: "cp";
    value: number;
  }
  | {
    type: "mate";
    value: number;
  };

export type PositionAnalysis = {
  step: number;
  fen: string;
  evaluation: Evaluation | null;
  whitePerspectiveEvaluation: Evaluation | null;
  playerPerspectiveEvaluation: Evaluation | null;
  bestMove: string;
};

export type MoveAnalysis = {
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

type MoveStats = {
  averageGrade: number;
  best: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
  miss: number;
};

type Props = {
  moves: string[];
  playerColor: "w" | "b";
  enabled: boolean;
};

function parseEvaluation(line: string): Evaluation | null {
  const cpMatch = line.match(/score cp (-?\d+)/);

  if (cpMatch) {
    return {
      type: "cp",
      value: Number(cpMatch[1]),
    };
  }

  const mateMatch = line.match(/score mate (-?\d+)/);

  if (mateMatch) {
    return {
      type: "mate",
      value: Number(mateMatch[1]),
    };
  }

  return null;
}

function getWhitePerspectiveEvaluation(
  fen: string,
  evaluation: Evaluation
): Evaluation {
  const game = new Chess(fen);

  if (game.turn() === "w") {
    return evaluation;
  }

  if (evaluation.type === "cp") {
    return {
      type: "cp",
      value: -evaluation.value,
    };
  }

  return {
    type: "mate",
    value: -evaluation.value,
  };
}

function getPlayerEvaluation(
  whiteEvaluation: Evaluation,
  playerColor: "w" | "b"
): Evaluation {
  if (playerColor === "w") {
    return whiteEvaluation;
  }

  if (whiteEvaluation.type === "cp") {
    return {
      type: "cp",
      value: -whiteEvaluation.value,
    };
  }

  return {
    type: "mate",
    value: -whiteEvaluation.value,
  };
}

function getEvaluationValue(
  evaluation: Evaluation | null
): number | null {
  if (!evaluation) {
    return null;
  }

  if (evaluation.type === "cp") {
    return evaluation.value / 100;
  }

  return null;
}

function calculateEvaluationLoss(
  before: Evaluation | null,
  after: Evaluation | null
): number | null {
  const beforeValue = getEvaluationValue(before);
  const afterValue = getEvaluationValue(after);

  if (
    beforeValue === null ||
    afterValue === null
  ) {
    return null;
  }

  return Math.max(0, beforeValue - afterValue);
}

function getMoveColor(step: number): "w" | "b" {
  return step % 2 === 0 ? "w" : "b";
}

function getBestMoveSAN(
  fen: string,
  bestMove: string
): string {
  try {
    const game = new Chess(fen);

    const from = bestMove.slice(0, 2);
    const to = bestMove.slice(2, 4);

    const promotion = bestMove[4] as
      | "q"
      | "r"
      | "b"
      | "n"
      | undefined;

    const move = game.move({
      from,
      to,
      promotion,
    });

    return move.san;
  } catch {
    return bestMove;
  }
}

function classifyMove(
  evaluationLoss: number | null,
  actualMove: string,
  bestMove: string,
  fen: string
): MoveClassification {
  if (evaluationLoss === null) {
    return "good";
  }

  const bestMoveSAN = getBestMoveSAN(
    fen,
    bestMove
  );

  const playedBestMove =
    actualMove === bestMoveSAN;

  if (playedBestMove) {
    return "best";
  }

  if (evaluationLoss < 0.50) {
    return "miss";
  }

  if (evaluationLoss < 1.00) {
    return "inaccuracy";
  }

  if (evaluationLoss < 2.00) {
    return "mistake";
  }

  return "blunder";
}

function calculateGrade(
  evaluationLoss: number | null,
  classification: MoveClassification
): number {
  if (evaluationLoss === null) {
    return 0;
  }

  if (classification === "best") {
    return 100;
  }

  const grade = 100 - evaluationLoss * 30;

  return Math.max(
    0,
    Math.min(99, Math.round(grade))
  );
}

function flipEvaluation(
  evaluation: Evaluation | null
): Evaluation | null {
  if (!evaluation) {
    return null;
  }

  if (evaluation.type === "cp") {
    return {
      type: "cp",
      value: -evaluation.value,
    };
  }

  return {
    type: "mate",
    value: -evaluation.value,
  };
}

function calculateStats(
  moveAnalysis: MoveAnalysis[]
): MoveStats {
  if (moveAnalysis.length === 0) {
    return {
      averageGrade: 0,
      best: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      miss: 0,
    };
  }

  const stats: MoveStats = {
    averageGrade: 0,
    best: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    miss: 0,
  };

  let totalGrade = 0;

  for (const move of moveAnalysis) {
    totalGrade += move.grade;
    stats[move.classification]++;
  }

  stats.averageGrade = Math.round(
    totalGrade / moveAnalysis.length
  );

  return stats;
}

function analyzeMoves(
  analysis: PositionAnalysis[],
  moves: string[]
): MoveAnalysis[] {
  const results: MoveAnalysis[] = [];

  for (let i = 0; i < moves.length; i++) {
    const moveColor = getMoveColor(i);

    const before = analysis[i];
    const after = analysis[i + 1];

    if (!before || !after) {
      continue;
    }

    const beforeEvaluation =
      moveColor === "w"
        ? before.whitePerspectiveEvaluation
        : flipEvaluation(
          before.whitePerspectiveEvaluation
        );

    const afterEvaluation =
      moveColor === "w"
        ? after.whitePerspectiveEvaluation
        : flipEvaluation(
          after.whitePerspectiveEvaluation
        );

    const evaluationLoss =
      calculateEvaluationLoss(
        beforeEvaluation,
        afterEvaluation
      );

    const classification = classifyMove(
      evaluationLoss,
      moves[i],
      before.bestMove,
      before.fen
    );

    const grade = calculateGrade(
      evaluationLoss,
      classification
    );

    results.push({
      step: i,
      move: moves[i],
      player: moveColor,
      evaluationBefore: beforeEvaluation,
      evaluationAfter: afterEvaluation,
      evaluationLoss,
      bestMove: before.bestMove,
      classification,
      grade,
    });
  }

  return results;
}

export default function useChessAnalysis({
  moves,
  playerColor,
  enabled,
}: Props) {
  const workerRef =
    useRef<Worker | null>(null);

  const [status, setStatus] = useState(
    enabled
      ? "Loading Stockfish..."
      : "Idle"
  );

  const [shouldAnalyze, setShouldAnalyze] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [analysis, setAnalysis] =
    useState<PositionAnalysis[]>([]);

  /*
    Load cached Stockfish analysis.

    This hook owns the persistence of:
    game-analysis
  */
  useEffect(() => {
    if (!enabled) {
      setStatus("Idle");
      return;
    }

    const cachedAnalysis =
      sessionStorage.getItem(
        "game-analysis"
      );

    if (cachedAnalysis) {
      try {
        const parsedAnalysis =
          JSON.parse(
            cachedAnalysis
          ) as PositionAnalysis[];

        setAnalysis(parsedAnalysis);
        setStatus("Analysis complete");
        setShouldAnalyze(false);
        return;
      } catch {
        sessionStorage.removeItem(
          "game-analysis"
        );
      }
    }

    setShouldAnalyze(true);
  }, [enabled]);

  /*
    Save Stockfish analysis.

    moveAnalysis does not need to be saved because
    it is derived from analysis + moves.
  */
  useEffect(() => {
    if (
      status !== "Analysis complete" ||
      analysis.length === 0
    ) {
      return;
    }

    sessionStorage.setItem(
      "game-analysis",
      JSON.stringify(analysis)
    );
  }, [status, analysis]);

  /*
    Run Stockfish only when there is no cached
    analysis.
  */
  useEffect(() => {
    if (
      !enabled ||
      moves.length === 0 ||
      !shouldAnalyze
    ) {
      return;
    }

    const worker = new Worker(
      "/stockfish/stockfish-19-lite-single.js"
    );

    workerRef.current = worker;

    const results: PositionAnalysis[] = [];

    let currentAnalysisStep = 0;
    let currentFen = "";

    let currentEvaluation:
      Evaluation | null = null;

    let currentWhitePerspectiveEvaluation:
      Evaluation | null = null;

    let currentPlayerPerspectiveEvaluation:
      Evaluation | null = null;

    worker.onmessage = (event) => {
      const line = event.data;

      console.log(
        "STOCKFISH:",
        line
      );

      if (line === "uciok") {
        worker.postMessage("isready");
        return;
      }

      if (line === "readyok") {
        currentEvaluation = null;
        currentWhitePerspectiveEvaluation =
          null;
        currentPlayerPerspectiveEvaluation =
          null;

        setStatus(
          "Analyzing game..."
        );

        analyzeNextPosition();

        return;
      }

      const evaluation =
        parseEvaluation(line);

      if (evaluation) {
        currentEvaluation =
          evaluation;

        currentWhitePerspectiveEvaluation =
          getWhitePerspectiveEvaluation(
            currentFen,
            evaluation
          );

        currentPlayerPerspectiveEvaluation =
          getPlayerEvaluation(
            currentWhitePerspectiveEvaluation,
            playerColor
          );
      }

      const bestMoveMatch =
        line.match(
          /^bestmove\s+(\S+)/
        );

      if (bestMoveMatch) {
        const bestMove =
          bestMoveMatch[1];

        results.push({
          step: currentAnalysisStep,
          fen: currentFen,
          evaluation:
            currentEvaluation,
          whitePerspectiveEvaluation:
            currentWhitePerspectiveEvaluation,
          playerPerspectiveEvaluation:
            currentPlayerPerspectiveEvaluation,
          bestMove,
        });

        currentAnalysisStep++;

        if (
          currentAnalysisStep <=
          moves.length
        ) {
          currentEvaluation = null;
          currentWhitePerspectiveEvaluation =
            null;
          currentPlayerPerspectiveEvaluation =
            null;

          analyzeNextPosition();
        } else {
          console.log(
            "FULL POSITION ANALYSIS:",
            results
          );

          setAnalysis([
            ...results,
          ]);

          setShouldAnalyze(false);
          setStatus(
            "Analysis complete"
          );
        }
      }
    };

    function analyzeNextPosition() {
      currentFen =
        getPosition(
          currentAnalysisStep
        );

      console.log(
        `Analyzing step ${currentAnalysisStep}`,
        currentFen
      );

      worker.postMessage(
        `position fen ${currentFen}`
      );

      worker.postMessage(
        "go depth 15"
      );
    }

    function getPosition(
      step: number
    ) {
      const game = new Chess();

      for (
        let i = 0;
        i < step;
        i++
      ) {
        try {
          game.move(moves[i]);
        } catch {
          console.log(
            "Invalid move:",
            moves[i]
          );

          setStatus(
            "Invalid move"
          );

          setError(
            `Invalid move: ${moves[i]}`
          );

          break;
        }
      }

      return game.fen();
    }

    worker.onerror = (
      workerError: ErrorEvent
    ) => {
      console.error(
        "Stockfish worker error:",
        workerError
      );

      setStatus(
        "Stockfish error"
      );

      setError(
        workerError.message
      );
    };

    worker.postMessage("uci");

    return () => {
      worker.postMessage("quit");
      worker.terminate();

      workerRef.current = null;
    };
  }, [
    moves,
    playerColor,
    enabled,
    shouldAnalyze,
  ]);

  /*
    moveAnalysis is derived data.

    It does not need its own state.
    It is calculated from the Stockfish analysis
    and the original moves.
  */
  const moveAnalysis =
    analyzeMoves(
      analysis,
      moves
    );

  /*
    Stats are also derived data.
  */
  const stats =
    calculateStats(
      moveAnalysis
    );

  return {
    analysis,
    moveAnalysis,
    stats,
    stockFishStatus: status,
    stockFishError: error,
  };
}

