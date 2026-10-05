"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    CheckmarkCircle02Icon,
    Alert02Icon,
    Loading03Icon,
    ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";

type AnalysisStatus =
    | "idle"
    | "loading"
    | "complete"
    | "error";

type Props = {
    stockfishStatus: string;
    stockfishError: string | null;

    aiStatus: string;
    aiError: string | null;

    visible: boolean;

    error: string | null;
};

export default function UseStatusModal({
    stockfishStatus,
    stockfishError,
    aiStatus,
    aiError,
    visible,
    error,
}: Props) {
    if (!visible) {
        return null;
    }

    const hasError = Boolean(stockfishError || aiError || error);

    const stockfishComplete =
        stockfishStatus === "Analysis complete";

    const aiComplete =
        aiStatus === "complete";

    const allComplete =
        stockfishComplete && aiComplete;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6">

                {/* HEADER */}

                <div className="flex items-center gap-3 mb-6">

                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        {hasError ? (
                            <HugeiconsIcon
                                icon={Alert02Icon}
                                size={22}
                                className="text-red-400"
                            />
                        ) : allComplete ? (
                            <HugeiconsIcon
                                icon={CheckmarkCircle02Icon}
                                size={22}
                                className="text-emerald-400"
                            />
                        ) : (
                            <HugeiconsIcon
                                icon={Loading03Icon}
                                size={22}
                                className="text-indigo-400 animate-spin"
                            />
                        )}
                    </div>

                    <div>
                        <h2 className="text-white font-semibold text-lg">
                            {hasError
                                ? "Something went wrong"
                                : allComplete
                                    ? "Analysis complete"
                                    : "Analyzing your game"}
                        </h2>

                        <p className="text-slate-500 text-xs mt-1">
                            {hasError
                                ? "You can retry or go back to home."
                                : allComplete
                                    ? "Your game is ready."
                                    : "Please wait while we analyze your game."}
                        </p>
                    </div>
                </div>

                {/* STOCKFISH */}

                <StatusItem
                    title="Chess analysis"
                    status={stockfishStatus}
                    error={stockfishError}
                    complete={stockfishComplete}
                />

                {/* AI */}

                <StatusItem
                    title="AI explanations"
                    status={aiStatus}
                    error={
                        aiError ||
                        (stockfishError || error
                            ? "Chess analysis required"
                            : null)
                    }
                    complete={aiComplete}
                />

                {/* ERROR */}

                {hasError && (
                    <div className="mt-5 rounded-2xl border border-red-900/50 bg-red-950/30 p-4">
                        <p className="text-red-300 text-sm font-medium">
                            Analysis could not be completed.
                        </p>

                        <p className="text-red-400/70 text-xs mt-2 leading-relaxed">
                            {stockfishError || aiError || error}
                        </p>
                    </div>
                )}

                {/* LOADING */}

                {!hasError && !allComplete && (
                    <div className="mt-5 flex items-center gap-2 text-slate-500 text-xs">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        This may take a little while...
                    </div>
                )}

                {/* BACK TO HOME */}

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-3.5 py-2 rounded-xl transition-colors border border-slate-700/50"
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                        Back to Home
                    </Link>
                </div>

            </div>
        </div>
    );
}

function StatusItem({
    title,
    status,
    error,
    complete,
}: {
    title: string;
    status: string;
    error: string | null;
    complete: boolean;
}) {
    const hasError = Boolean(error);

    return (
        <div className="flex items-center justify-between py-4 border-b border-slate-800 last:border-0">

            <div className="flex items-center gap-3">

                <div
                    className={`
            w-8 h-8
            rounded-lg
            flex
            items-center
            justify-center

            ${hasError
                            ? "bg-red-500/10"
                            : complete
                                ? "bg-emerald-500/10"
                                : "bg-indigo-500/10"
                        }
          `}
                >
                    {hasError ? (
                        <HugeiconsIcon
                            icon={Alert02Icon}
                            size={17}
                            className="text-red-400"
                        />
                    ) : complete ? (
                        <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            size={17}
                            className="text-emerald-400"
                        />
                    ) : (
                        <HugeiconsIcon
                            icon={Loading03Icon}
                            size={17}
                            className="text-indigo-400 animate-spin"
                        />
                    )}
                </div>

                <div>
                    <p className="text-sm text-slate-200">
                        {title}
                    </p>

                    <p className="text-xs text-slate-500 mt-0.5">
                        {error || status}
                    </p>
                </div>

            </div>

            {hasError ? (
                <span className="text-xs text-red-400">
                    Error
                </span>
            ) : complete ? (
                <span className="text-xs text-emerald-400">
                    Done
                </span>
            ) : (
                <span className="text-xs text-indigo-400">
                    Working
                </span>
            )}

        </div>
    );
}