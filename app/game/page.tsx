"use client";

import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { useEffect, useState, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PreviousIcon,
  NextIcon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  CardExchange01Icon,
} from "@hugeicons/core-free-icons";
import Image from "next/image";
import { basic } from "../fonts";
import analyzeGame from "../useChessAnalysis";
import { useMoveExplanations } from "../useMoveExplanation";
import UseStatusModal from "@/app/useStatusModal";

export default function Page() {
  const [rawMovesString, setRawMovesString] = useState<string>("[]");
  const [player, setPlayer] = useState<"w" | "b">("b");
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [boardOrientation, setBoardOrientation] =
    useState<"white" | "black">("white");

  const moveRefs = useRef<Record<number, HTMLSpanElement | null>>({});

  const movesContainerRef = useRef<HTMLDivElement | null>(null);

  const classificationColor: Record<string, string> = {
    miss: "text-red-200",
    blunder: "text-red-900",
    mistake: "text-orange-400",
    inaccuracy: "text-yellow-200",
    good: "text-emerald-400",
    best: "text-green-400",
  };

  useEffect(() => {
    const storedGame = sessionStorage.getItem("chess-game");

    if (!storedGame) return;

    setRawMovesString(storedGame);

    try {
      const parsed = JSON.parse(storedGame);

      if (Array.isArray(parsed)) {
        setPlayer("b");
      } else {
        setPlayer(parsed.playerColor ?? "b");
      }
    } catch {
      setRawMovesString("[]");
    }
  }, []);

  const moves = useMemo(() => {
    try {
      const parsed = JSON.parse(rawMovesString);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      return parsed.moves ?? [];
    } catch {
      return [];
    }
  }, [rawMovesString]);

  const {
    analysis,
    moveAnalysis,
    stockFishStatus,
    stockFishError
  } = analyzeGame({
    moves,
    playerColor: player,
  });

  const allow = true;
  const {
    explanations,
    explanationStatus,
    explanationError
  } = useMoveExplanations(
    moveAnalysis,
    stockFishStatus,
    stockFishError,
    allow
  );

  function getPosition(step: number) {
    const game = new Chess();

    for (let i = 0; i < step; i++) {
      try {
        game.move(moves[i]);
      } catch {
        setError(`Invalid move: ${moves[i]}`);
      }
    }

    return game.fen();
  }

  const position = useMemo(() => {
    return getPosition(currentStep);
  }, [currentStep, moves]);


  const moveClassMap = new Map(
    moveAnalysis.map((m) => [m.step, m.classification])
  );


  const toggleBoardOrientation = () => {
    setBoardOrientation((prev) =>
      prev === "white" ? "black" : "white"
    );
  };


  function Previous() {
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  function Next() {
    setCurrentStep((step) =>
      Math.min(moves.length, step + 1)
    );
  }

  function Start() {
    setCurrentStep(0);
  }

  function End() {
    setCurrentStep(moves.length);
  }

  // useEffect(() => {
  //   if (!moves.length) return;

  //   let isMounted = true;

  //   const delay = (ms: number) =>
  //     new Promise((resolve) => setTimeout(resolve, ms));

  //   const playGame = async () => {
  //     for (let i = 0; i <= moves.length; i++) {
  //       if (!isMounted) return;

  //       setCurrentStep(i);

  //       await delay(40);
  //     }

  //     await delay(1000);

  //     for (let i = moves.length; i >= 0; i--) {
  //       if (!isMounted) return;

  //       setCurrentStep(i);

  //       await delay(40);
  //     }
  //   };

  //   playGame();

  //   return () => {
  //     isMounted = false;
  //   };
  // }, [moves]);

  /*
   * Automatically move the active move into view.
   *
   * On mobile this creates the effect of:
   *
   * page.right += gameMoveWidth
   *
   * without manually calculating widths.
   */
  useEffect(() => {
    if (currentStep === 0) return;

    const activeMove = moveRefs.current[currentStep - 1];

    if (!activeMove) return;

    activeMove.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentStep]);

  const arrows = useMemo(() => {
    const currentAnalysis = analysis[currentStep - 1];

    if (!currentAnalysis?.bestMove) {
      return [];
    }

    const bestMove = currentAnalysis.bestMove;

    if (bestMove.length < 4) {
      return [];
    }

    const from = bestMove.substring(0, 2) as Square;
    const to = bestMove.substring(2, 4) as Square;

    return [
      {
        startSquare: from,
        endSquare: to,
        color: "rgb(0, 128, 0)",
      },
    ];
  }, [analysis, currentStep]);

  function getPlayedMoveSquares(
    fen: string,
    move: string
  ): {
    from: Square;
    to: Square;
  } | null {
    try {
      const game = new Chess(fen);

      const playedMove = game.move(move);

      return {
        from: playedMove.from as Square,
        to: playedMove.to as Square,
      };
    } catch {
      return null;
    }
  }

  const playedMoveMap = useMemo(() => {

    const map = new Map<
      number,
      {
        from: Square;
        to: Square;
      }
    >();

    for (const move of moveAnalysis) {
      const squares = getPlayedMoveSquares(
        analysis[move.step]?.fen,
        move.move
      );

      if (squares) {
        map.set(move.step, squares);
      }
    }



    return map;
  }, [moveAnalysis, analysis]);


  const moveHighlight = useMemo(() => {
    if (currentStep === 0) {
      return {};
    }

    const moveIndex = currentStep - 1;

    const playedMove = playedMoveMap.get(moveIndex);

    if (!playedMove) {
      return {};
    }

    const classification = moveClassMap.get(moveIndex);

    const highlightColors: Record<string, string> = {
      best: "rgba(34, 197, 94, 0.65)",
      good: "rgba(34, 197, 94, 0.50)",
      inaccuracy: "rgba(234, 179, 8, 0.65)",
      mistake: "rgba(249, 115, 22, 0.65)",
      blunder: "rgba(239, 68, 68, 0.70)",
      miss: "rgba(239, 68, 68, 0.55)",
    };

    const color =
      highlightColors[classification ?? ""] ??
      "rgba(99, 102, 241, 0.55)";

    return {
      [playedMove.from]: {
        backgroundColor: color,
      },

      [playedMove.to]: {
        backgroundColor: color,
      },
    };
  }, [
    currentStep,
    playedMoveMap,
    moveClassMap,
  ]);

  const chessOptions = useMemo(() => {
    return {
      position,
      id: "chess_tutor",
      arrows,
      boardOrientation,
      squareStyles: moveHighlight,
      customDarkSquareStyle: {
        backgroundColor: "#779952",
      },
      customLightSquareStyle: {
        backgroundColor: "#edeed1",
      },
      customBoardStyle: {
        borderRadius: "8px",
        boxShadow:
          "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
      },
    };
  }, [position, arrows, boardOrientation]);

  const analysisFinished =
    stockFishStatus === "Analysis complete" &&
    explanationStatus === "complete";

  const hasAnalysisError =
    Boolean(stockFishError) ||
    Boolean(explanationError);

  const showAnalysisModal =
    !analysisFinished || hasAnalysisError;

  return (
    <section className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row justify-center p-3 sm:p-4 lg:p-12 gap-4 lg:gap-8">

      <UseStatusModal
        stockfishStatus={stockFishStatus}
        stockfishError={stockFishError}
        aiStatus={explanationStatus}
        aiError={explanationError}
        visible={showAnalysisModal}
        error={error}
      />

      {/* TUTOR + BOARD AREA */}

      <main className="flex flex-col w-full lg:w-auto lg:max-w-lg">

        {/* TUTOR
            Mobile: first
            Desktop: right side */}
        <div
          id="avatar_tutor"
          className="flex items-center gap-3 p-2 lg:hidden order-1"
        >
          <div className="w-16 h-16 flex justify-center items-center shrink-0">
            <Image
              src="/chessavatar.png"
              width={60}
              height={60}
              alt="avatar"
              className="object-cover"
            />
          </div>

          <div
            id="chatbox"
            className="bg-slate-800/90 backdrop-blur border border-slate-700/50 rounded-2xl px-4 py-3 shadow-lg flex flex-col gap-1 flex-1 min-w-0"
          >
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
              WAYNE
            </span>

            <p
              className={`${basic.className} text-slate-400 text-sm leading-relaxed`}
            >
              {stockFishStatus === "Analysis complete"
                ? (() => {
                  const cls = moveClassMap.get(currentStep - 1);

                  return cls ? (
                    <span className="text-slate-300">
                      {explanations[currentStep - 1] ||
                        "Generating explanation..."}
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Navigate to a move to see its classification.
                    </span>
                  );
                })()
                : stockFishStatus}
            </p>
          </div>
        </div>

        {/* BOARD */}

        <div className="flex flex-col items-center justify-center w-full order-2 lg:order-1">
          <div className="relative w-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-2 sm:p-4 shadow-2xl flex flex-col gap-1">

            <button
              className="absolute right-3 top-3 sm:right-10 sm:-top-10 z-20 p-2 hover:scale-120 cursor-pointer"
              onClick={toggleBoardOrientation}
            >
              <HugeiconsIcon
                icon={CardExchange01Icon}
                size={25}
                className="text-white"
              />
            </button>

            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center justify-between px-2">
              <span>
                {(boardOrientation === "white"
                  ? player !== "w"
                  : player === "w")
                  ? "Opponent"
                  : "You"}
              </span>
            </p>

            <div className="w-full aspect-square rounded-xl overflow-hidden shadow-inner border border-slate-800 bg-slate-950 p-1">
              <Chessboard options={chessOptions} />
            </div>

            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-2">
              {(boardOrientation === "white"
                ? player === "w"
                : player !== "w")
                ? "Opponent"
                : "You"}
            </p>
          </div>
        </div>

        {/* DESKTOP TUTOR */}

        <div
          id="desktop_avatar_tutor"
          className="hidden lg:flex items-center gap-4 p-4"
        >
          <div className="p-1 w-20 h-20 flex justify-center items-center shrink-0">
            <Image
              src="/chessavatar.png"
              width={75}
              height={75}
              alt="avatar"
              className="object-cover"
            />
          </div>

          <div
            id="desktop_chatbox"
            className="bg-slate-800/90 backdrop-blur border border-slate-700/50 rounded-2xl p-5 shadow-lg flex flex-col gap-1 w-full relative"
          >
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              WAYNE
            </span>

            <p
              className={`${basic.className} text-slate-400 text-lg leading-relaxed`}
            >
              {status === "Analysis complete"
                ? (() => {
                  const cls = moveClassMap.get(currentStep - 1);

                  return cls ? (
                    <span className="text-slate-300">
                      {explanations[currentStep - 1] ||
                        "Generating explanation..."}
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Navigate to a move to see its classification.
                    </span>
                  );
                })()
                : status}
            </p>
          </div>
        </div>
      </main>

      {/* RIGHT SIDE ON DESKTOP
          MOVES + CONTROLS */}

      <main className="flex flex-col w-full max-w-xl gap-3 lg:gap-4">

        {/* MOVES */}

        <div
          id="moves_section"
          className="p-0 order-3 lg:order-1"
        >
          <div
            ref={movesContainerRef}
            id="move_text"
            className="
              w-full
              bg-slate-900/90
              backdrop-blur
              border border-slate-800
              rounded-2xl
              shadow-xl

              px-4 py-3

              lg:h-[260px]
              lg:p-6
              lg:overflow-y-auto

              overflow-x-auto
              overflow-y-hidden

              scrollbar-thin
              scrollbar-thumb-slate-700
            "
          >
            <div
              className={`
                ${basic.className}
                flex
                flex-nowrap
                items-center
                whitespace-nowrap
                text-slate-300
                text-sm
                tracking-wide

                lg:flex-wrap
                lg:whitespace-normal
                lg:leading-loose
              `}
            >
              {moves.map((move: any, i: number) => {
                const isActive = currentStep === i + 1;
                const isWhiteMove = i % 2 === 0;
                const moveNumber = Math.floor(i / 2) + 1;

                const cls = moveClassMap.get(i);

                const colorClass = cls
                  ? classificationColor[cls] ?? "text-slate-300"
                  : "text-slate-300";

                return (
                  <span
                    key={i}
                    ref={(element) => {
                      moveRefs.current[i] = element;
                    }}
                    className="inline-flex items-center shrink-0"
                  >
                    {isWhiteMove && (
                      <span className="text-slate-500 select-none mr-1">
                        {moveNumber}.
                      </span>
                    )}

                    <span
                      className={`
                        ${colorClass}
                        font-semibold
                        transition-all
                        duration-150

                        ${isActive
                          ? "bg-slate-600 text-white ring-1 ring-slate-400 rounded px-1.5 py-0.5 shadow-md"
                          : ""
                        }
                      `}
                      title={cls ?? undefined}
                    >
                      {move}
                    </span>

                    <span className="mx-1.5 text-slate-700">
                      {" "}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* CONTROLS */}

        <div
          id="controls"
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-lg order-4 lg:order-2"
        >
          <div className="flex flex-row w-full justify-center items-center gap-4 p-2 text-slate-400">

            <button
              type="button"
              onClick={Start}
              className="p-2 hover:bg-slate-800 hover:text-white rounded-xl transition-all active:scale-95"
            >
              <HugeiconsIcon
                icon={PreviousIcon}
                stroke={"2"}
              />
            </button>

            <button
              type="button"
              onClick={Previous}
              className="p-2 hover:bg-slate-800 hover:text-white rounded-xl transition-all active:scale-95"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                stroke={"2"}
              />
            </button>

            <button
              type="button"
              onClick={Next}
              className="p-2 hover:bg-slate-800 hover:text-white rounded-xl transition-all active:scale-95"
            >
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                stroke={"2"}
              />
            </button>

            <button
              type="button"
              onClick={End}
              className="p-2 hover:bg-slate-800 hover:text-white rounded-xl transition-all active:scale-95"
            >
              <HugeiconsIcon
                icon={NextIcon}
                stroke={"2"}
              />
            </button>

          </div>
        </div>
      </main>
    </section>
  );
}