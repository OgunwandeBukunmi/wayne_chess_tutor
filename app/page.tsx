"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { basic } from "./fonts";

export default function ChessOCRPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState("");
    const [movesText, setMovesText] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [playerColor, setPlayerColor] = useState<"w" | "b">("w");

    useEffect(() => {
        if (!file) {
            setPreview("");
            return;
        }

        const url = URL.createObjectURL(file);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    function handleFile(selectedFile?: File) {
        if (!selectedFile) return;

        if (!selectedFile.type.startsWith("image/")) {
            alert("Please select an image file.");
            return;
        }

        setFile(selectedFile);
        setMovesText("");
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files[0]);
    }

    async function handleExtract() {
        if (!file) return;

        // OCR API integration will go here.
        setIsExtracting(true);

        try {
            const formData = new FormData();
            formData.append("image", file);
            const response = await fetch("/api/groq/ocr", {
                method: "POST",
                body: formData,
            });
            const result = await response.json();

            if (!response.ok) {
                alert("Error: " + result.error);
                return;
            }

            console.log("Moves:", result.moves);
            setMovesText(result.moves.join(" "));

        } catch (e) {
            console.log(e);
        }
        finally {
            setIsExtracting(false);
        }
    }

    function continueToAnalysis() {
        sessionStorage.removeItem("chess-game");
        sessionStorage.removeItem("player-color");
        sessionStorage.removeItem("game-move-analysis");
        sessionStorage.removeItem("game-analysis");
        sessionStorage.removeItem("ai-explanations");
        sessionStorage.removeItem("game-stats");

        const moves = movesText
            .replace(/\d+\.\s*/g, "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (!moves.length) return;
        // console.log(moves)
        sessionStorage.setItem("chess-game", JSON.stringify(moves));
        sessionStorage.setItem("player-color", playerColor);
        router.push("/game");
    }

    const moves = movesText.trim()
        ? movesText.trim().split(/\s+/).filter(Boolean)
        : [];

    return (
        <section className="min-h-screen bg-slate-950 text-slate-100 px-5 py-8 lg:px-12">

            {/* Header */}
            <header className="max-w-7xl mx-auto flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center">
                        <span className="text-indigo-400 text-xl">♞</span>
                    </div>

                    <div>
                        <h1 className="font-bold text-lg tracking-wide">WAYNE CHESS</h1>
                        <p className="text-xs text-slate-500">Game importer</p>
                    </div>
                </div>

                <button
                    onClick={() => router.push("/chess")}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                    Back to analysis
                </button>
            </header>

            <main className="max-w-7xl mx-auto">

                {/* Page heading */}
                <div className="mb-10">
                    <p className="text-indigo-400 text-xs font-bold tracking-[0.2em] uppercase mb-3">
                        Chess game import
                    </p>

                    <h2 className={`${basic.className} text-4xl lg:text-5xl text-white mb-3`}>
                        Bring your game to life.
                    </h2>

                    <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
                        Upload a screenshot of your Chess.com game. We'll extract the moves
                        so you can review and analyze every decision.
                    </p>
                </div>

                {/* Main content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Upload panel */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 lg:p-7 shadow-2xl">

                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-semibold text-white">Screenshot</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Upload your Chess.com game image
                                </p>
                            </div>

                            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded-full">
                                JPG / PNG
                            </span>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFile(e.target.files?.[0])}
                        />

                        {!preview ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                className={`min-h-[380px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-8 cursor-pointer transition-all ${isDragging
                                    ? "border-indigo-400 bg-indigo-500/10"
                                    : "border-slate-700 hover:border-indigo-400/60 hover:bg-slate-800/40"
                                    }`}
                            >
                                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-5">
                                    <svg
                                        width="30"
                                        height="30"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        className="text-indigo-400"
                                    >
                                        <path d="M12 16V4m0 0L7 9m5-5 5 5" />
                                        <path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
                                    </svg>
                                </div>

                                <h4 className="font-semibold text-white mb-2">
                                    Drop your screenshot here
                                </h4>

                                <p className="text-sm text-slate-500 mb-6">
                                    Or click to browse your files
                                </p>

                                <span className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-colors">
                                    Choose image
                                </span>

                                <p className="text-xs text-slate-600 mt-5">
                                    Upload a clear screenshot showing the game moves
                                </p>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="relative min-h-[380px] max-h-[520px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                                    <img
                                        src={preview}
                                        alt="Uploaded chess screenshot"
                                        className="max-h-[520px] max-w-full object-contain"
                                    />
                                </div>

                                <div className="mt-4 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm text-white truncate">{file?.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {file ? (file.size / 1024 / 1024).toFixed(2) + " MB" : ""}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setFile(null);
                                            setMovesText("");
                                        }}
                                        className="shrink-0 px-3 py-2 text-xs text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                                    >
                                        Remove image
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            disabled={!file || isExtracting}
                            onClick={handleExtract}
                            className="w-full mt-6 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-sm transition-all"
                        >
                            {isExtracting ? "Extracting moves..." : "Extract moves"}
                        </button>

                    </div>

                    {/* OCR results panel */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 lg:p-7 shadow-2xl flex flex-col">

                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-semibold text-white">Extracted moves</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    Review and correct the detected moves
                                </p>
                            </div>

                            <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/10 px-3 py-1.5 rounded-full">
                                Manual review
                            </span>
                        </div>

                        <div className="flex-1 min-h-[380px] flex flex-col">

                            {!movesText ? (
                                <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/60 flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-4">
                                        <span className="text-2xl text-slate-500">♟</span>
                                    </div>

                                    <h4 className="text-sm font-medium text-slate-300 mb-2">
                                        Nothing here yet
                                    </h4>

                                    <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                                        Your extracted moves will appear here once the screenshot
                                        has been processed.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs text-slate-500">
                                            Detected sequence
                                        </span>
                                        <span className="text-xs text-emerald-400">
                                            {moves.length} tokens
                                        </span>
                                    </div>

                                    <textarea
                                        value={movesText}
                                        onChange={(e) => setMovesText(e.target.value)}
                                        spellCheck={false}
                                        className="flex-1 w-full min-h-[340px] resize-none rounded-2xl bg-slate-950 border border-slate-800 p-5 text-sm leading-8 font-mono text-slate-300 outline-none focus:border-indigo-400/60 transition-colors"
                                        placeholder="1. e4 Nf6 2. f3 Nc6..."
                                    />
                                </>
                            )}

                        </div>

                        <div className="mt-6 pt-5 border-t border-slate-800">

                            <div className="mb-4">
                                <p className="text-sm font-semibold text-white">
                                    Which side did you play?
                                </p>

                                <p className="text-xs text-slate-500 mt-1">
                                    This helps us analyze your moves separately from your opponent's.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-5">

                                <button
                                    type="button"
                                    onClick={() => setPlayerColor("w")}
                                    className={`relative p-4 rounded-xl border transition-all text-left ${playerColor === "w"
                                        ? "border-indigo-400 bg-indigo-500/10"
                                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">

                                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-900 text-2xl">
                                            ♔
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                White
                                            </p>

                                            <p className="text-xs text-slate-500">
                                                I played White
                                            </p>
                                        </div>

                                    </div>

                                    {playerColor === "w" && (
                                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-400" />
                                    )}
                                </button>


                                <button
                                    type="button"
                                    onClick={() => setPlayerColor("b")}
                                    className={`relative p-4 rounded-xl border transition-all text-left ${playerColor === "b"
                                        ? "border-indigo-400 bg-indigo-500/10"
                                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">

                                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white text-2xl">
                                            ♚
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                Black
                                            </p>

                                            <p className="text-xs text-slate-500">
                                                I played Black
                                            </p>
                                        </div>

                                    </div>

                                    {playerColor === "b" && (
                                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-400" />
                                    )}
                                </button>

                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                                <span className="text-indigo-400">✦</span>
                                You can edit the extracted moves before analysis.
                            </div>

                            <button
                                onClick={continueToAnalysis}
                                disabled={!movesText.trim()}
                                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                Continue to analysis
                                <span>→</span>
                            </button>

                        </div>

                    </div>
                </div>

                {/* Bottom note */}
                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
                    <span>♞</span>
                    <span>Your game. Your decisions. Better chess.</span>
                </div>

            </main>
        </section>
    );
}