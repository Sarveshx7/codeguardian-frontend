import { useEffect, useState } from "react";
import axios from "axios";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// ✅ Your deployed backend base URL
const API_BASE = "https://codeguardian-backend-p3fg.onrender.com/api";

function App() {
  const [name, setName] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [contractType, setContractType] = useState("erc20");
  const [generating, setGenerating] = useState(false);

  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("editor"); // 'editor' | 'analysis' | 'contracts'

  // splash / intro animation
  const [showSplash, setShowSplash] = useState(true);

  // chart data for security score
  const score = analysis?.securityScore ?? 0;
  const scoreData = [
    { name: "Score", value: score, fill: "#22c55e" },
    { name: "Remaining", value: 100 - score, fill: "#1f2937" },
  ];

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/contracts`);
      setContracts(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  // hide splash after ~2.2s
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !sourceCode.trim()) {
      alert("Please enter both name and source code");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const res = await axios.post(`${API_BASE}/contracts`, {
        name,
        sourceCode,
      });
      setContracts((prev) => [...prev, res.data]);
      setName("");
      setSourceCode("");
      setAiDescription("");
      setAnalysis(null);
    } catch (err) {
      console.error(err);
      setError("Failed to save contract");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateFromTemplate = async () => {
    try {
      setGenerating(true);
      setError("");
      setAnalysis(null);
      const res = await axios.get(`${API_BASE}/templates`, {
        params: { type: contractType },
      });

      if (!name.trim()) {
        if (contractType === "erc20") setName("MyToken.sol");
        else if (contractType === "nft") setName("MyNFT.sol");
        else setName("MyContract.sol");
      }

      setSourceCode(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to generate template");
    } finally {
      setGenerating(false);
    }
  };

  const handleAiRefine = async () => {
    if (!sourceCode.trim()) {
      alert("Please generate or paste some Solidity code first.");
      return;
    }

    try {
      setAiLoading(true);
      setError("");
      const res = await axios.post(`${API_BASE}/ai/refine`, {
        sourceCode,
        description: aiDescription,
      });

      setSourceCode(res.data);
      setAnalysis(null); // analysis is now outdated
    } catch (err) {
      console.error(err);
      setError("AI refinement failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!sourceCode.trim()) {
      alert("Please generate or paste some Solidity code first.");
      return;
    }

    try {
      setAnalysisLoading(true);
      setError("");
      const res = await axios.post(`${API_BASE}/analyze`, {
        sourceCode,
      });
      setAnalysis(res.data);
      setActiveTab("analysis"); // jump to analysis view
    } catch (err) {
      console.error(err);
      setError("Failed to analyze contract.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Export Solidity file from current editor
  const handleExport = () => {
    if (!sourceCode.trim()) {
      alert("No contract code to export. Generate or paste code first.");
      return;
    }

    let fileName = name.trim() || "MyContract.sol";
    if (!fileName.toLowerCase().endsWith(".sol")) {
      fileName = fileName + ".sol";
    }

    const blob = new Blob([sourceCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // delete saved contract
  const handleDeleteContract = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to permanently delete this contract?"
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE}/contracts/${id}`);
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Delete error:", err.response || err);
      alert(
        "Failed to delete contract. Status: " +
          (err.response?.status || "unknown")
      );
    }
  };

  const tabButtonClass = (tab) =>
    [
      "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs md:text-sm transition",
      activeTab === tab
        ? "bg-sky-500/90 text-slate-50 shadow-lg shadow-sky-500/40 border border-sky-400/80"
        : "bg-slate-900/60 text-slate-300 border border-slate-700 hover:border-sky-500/60 hover:text-sky-100",
    ].join(" ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-50">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-sky-500 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-purple-600 blur-3xl" />
      </div>

      {/* Splash intro overlay */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -40 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >
              <motion.span
                layoutId="codeguardian-logo"
                className="text-3xl md:text-5xl font-semibold bg-gradient-to-r from-sky-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent tracking-tight"
              >
                CodeGuardian
              </motion.span>
              <p className="mt-3 text-xs md:text-sm text-slate-400">
                AI Smart Contract Auditor
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 md:px-6 lg:px-0">
        {/* Header */}
        <header className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              <motion.span
                layoutId="codeguardian-logo"
                className="bg-gradient-to-r from-sky-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent"
              >
                CodeGuardian
              </motion.span>
              <span className="ml-2 text-slate-200 hidden sm:inline">
                – AI Smart Contract Studio
              </span>
            </h1>
            <p className="mt-1 text-xs text-slate-400 md:text-sm">
              Design, refine and audit Solidity contracts with AI assistance.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 shadow-lg shadow-sky-500/10 backdrop-blur md:flex">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 mr-1" />
              Backend:
              <span className="ml-1 font-semibold text-emerald-300">
                Connected
              </span>
            </div>
          </div>
        </header>

        {/* Top nav tabs */}
        <nav className="mb-4 flex flex-wrap items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-2 py-2 shadow-[0_16px_50px_rgba(15,23,42,0.9)] backdrop-blur">
          <button
            className={tabButtonClass("editor")}
            onClick={() => setActiveTab("editor")}
          >
            <span>✏️</span>
            <span>Editor</span>
          </button>
          <button
            className={tabButtonClass("analysis")}
            onClick={() => setActiveTab("analysis")}
          >
            <span>🧪</span>
            <span>Analysis</span>
          </button>
          <button
            className={tabButtonClass("contracts")}
            onClick={() => setActiveTab("contracts")}
          >
            <span>📂</span>
            <span>Saved Contracts</span>
          </button>

          <div className="ml-auto hidden items-center gap-2 text-[11px] text-slate-500 md:flex">
            <span className="h-1 w-1 rounded-full bg-sky-400" />
            <span>Built with Spring Boot · React · Groq LLM</span>
          </div>
        </nav>

        {/* Global error */}
        {error && (
          <div className="mb-3 rounded-xl border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            ⚠ {error}
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 pb-4">
          {/* EDITOR TAB */}
          {activeTab === "editor" && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.9)] backdrop-blur">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-50">
                    Contract Editor
                  </h2>
                  <p className="text-xs text-slate-400 md:text-[13px]">
                    Start from a template, refine with AI, then analyze and
                    save.
                  </p>
                </div>

                {/* Template selector + generate */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40"
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                  >
                    <option value="erc20">ERC-20 Token</option>
                    <option value="nft">NFT Contract</option>
                    <option value="custom">Custom (empty)</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleGenerateFromTemplate}
                    disabled={generating}
                    className="inline-flex items-center gap-1 rounded-full border border-sky-600/70 bg-sky-600/20 px-3 py-1 text-xs font-medium text-sky-200 hover:border-sky-400 hover:text-sky-100 transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generating ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-200 border-t-transparent" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <span className="text-sky-300">⚡</span>
                        Template
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Name */}
              <label className="mb-3 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Contract Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="MyToken.sol"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                />
              </label>

              {/* AI hint */}
              <label className="mb-3 block text-xs font-medium uppercase tracking-wide text-slate-400">
                AI Hint (optional)
                <textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="e.g. Add onlyOwner to mint, emit events on transfers, improve comments..."
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                />
              </label>

              {/* Code */}
              <label className="mb-3 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Solidity Source Code
                <textarea
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  placeholder={`pragma solidity ^0.8.20;\n\ncontract MyContract {\n    // your code\n}`}
                  rows={14}
                  className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs font-mono text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                />
              </label>

              {/* Buttons row */}
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-[11px] text-slate-500">
                  <p>
                    Pipeline:{" "}
                    <span className="text-sky-300">
                      Template → AI refine → Analyze → Save → Export
                    </span>
                  </p>
                  <p className="text-slate-600">
                    Powered by Groq Llama 3 for refinement and custom static
                    checks for analysis.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAiRefine}
                    disabled={aiLoading || !sourceCode.trim()}
                    className="inline-flex items-center gap-2 rounded-full border border-purple-500/70 bg-purple-600/20 px-4 py-2 text-xs font-semibold text-purple-100 hover:border-purple-400 hover:text-purple-50 transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiLoading ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-purple-200 border-t-transparent" />
                        AI Improving…
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        AI Improve
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={analysisLoading || !sourceCode.trim()}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/70 bg-emerald-600/20 px-4 py-2 text-xs font-semibold text-emerald-100 hover:border-emerald-400 hover:text-emerald-50 transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {analysisLoading ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-200 border-t-transparent" />
                        Analyzing…
                      </>
                    ) : (
                      <>
                        <span>🧪</span>
                        Analyze
                      </>
                    )}
                  </button>

                  {/* Export button */}
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={!sourceCode.trim()}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-sky-400 hover:text-sky-100 transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>⬇</span>
                    <span>Export .sol</span>
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-purple-500 px-5 py-2 text-xs md:text-sm font-semibold text-slate-50 shadow-lg shadow-sky-500/40 transition hover:from-sky-400 hover:to-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-100 border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-emerald-300" />
                        Save Contract
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Compact security summary under editor */}
              {analysis && (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1">
                      <span className="text-[11px] text-slate-400">
                        Security score
                      </span>
                      <span className="text-[13px] font-semibold text-emerald-300">
                        {score}/100
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-1 text-[11px]">
                        <span
                          className={
                            "h-2 w-2 rounded-full " +
                            (analysis.hasOnlyOwner
                              ? "bg-emerald-400"
                              : "bg-rose-500")
                          }
                        />
                        {analysis.hasOnlyOwner
                          ? "onlyOwner present"
                          : "no onlyOwner"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-1 text-[11px]">
                        <span
                          className={
                            "h-2 w-2 rounded-full " +
                            (analysis.usesRequire
                              ? "bg-emerald-400"
                              : "bg-rose-500")
                          }
                        />
                        {analysis.usesRequire
                          ? "uses require(...)"
                          : "no require()"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-1 text-[11px]">
                        <span
                          className={
                            "h-2 w-2 rounded-full " +
                            (analysis.hasEvents
                              ? "bg-emerald-400"
                              : "bg-amber-400")
                          }
                        />
                        {analysis.hasEvents ? "events declared" : "no events"}
                      </span>
                    </div>
                  </div>

                  {analysis.warnings && analysis.warnings.length > 0 && (
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-200/90">
                      <span>⚠</span>
                      <span>{analysis.warnings[0]}</span>
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ANALYSIS TAB */}
          {activeTab === "analysis" && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.9)] backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-50">
                Analysis Report
              </h2>
              <p className="mb-3 text-xs text-slate-400 md:text-[13px]">
                Static heuristics over your current editor code. Re-run analyze
                from the Editor tab to refresh.
              </p>

              {!analysis ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-6 text-center text-xs text-slate-500">
                  <p>🧪 No analysis yet.</p>
                  <p className="mt-1">
                    Go to the <span className="text-sky-300">Editor</span> tab
                    and click <span className="text-emerald-300">Analyze</span>.
                  </p>
                </div>
              ) : (
                <div className="mt-2 space-y-4 text-xs">
                  {/* Chart + score */}
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                    <div className="h-28 w-28 md:h-32 md:w-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          innerRadius="70%"
                          outerRadius="100%"
                          data={scoreData}
                          startAngle={180}
                          endAngle={-180}
                        >
                          <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            dataKey="value"
                            tick={false}
                          />
                          <RadialBar
                            dataKey="value"
                            cornerRadius={10}
                            clockWise
                            background
                          />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p className="text-slate-300">Security score</p>
                      <p className="text-[11px] text-slate-500 mb-1">
                        Higher is better. This is a simple heuristic, not a
                        formal audit.
                      </p>
                      <p className="text-sm font-semibold text-emerald-300">
                        {score}/100
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Based on patterns like access control usage, require
                        checks, events and revert handling.
                      </p>
                    </div>
                  </div>

                  {/* Flags */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-2 rounded-lg bg-slate-950/70 px-2 py-2">
                      <span
                        className={
                          "h-2 w-2 rounded-full " +
                          (analysis.hasOnlyOwner
                            ? "bg-emerald-400"
                            : "bg-rose-500")
                        }
                      />
                      <div>
                        <p className="text-slate-200">Access control</p>
                        <p className="text-[10px] text-slate-500">
                          {analysis.hasOnlyOwner
                            ? "onlyOwner-like guard detected"
                            : "No onlyOwner modifier detected"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg bg-slate-950/70 px-2 py-2">
                      <span
                        className={
                          "h-2 w-2 rounded-full " +
                          (analysis.usesRequire
                            ? "bg-emerald-400"
                            : "bg-rose-500")
                        }
                      />
                      <div>
                        <p className="text-slate-200">Input checks</p>
                        <p className="text-[10px] text-slate-500">
                          {analysis.usesRequire
                            ? "require(...) checks present"
                            : "No require(...) checks found"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg bg-slate-950/70 px-2 py-2">
                      <span
                        className={
                          "h-2 w-2 rounded-full " +
                          (analysis.hasEvents
                            ? "bg-emerald-400"
                            : "bg-amber-400")
                        }
                      />
                      <div>
                        <p className="text-slate-200">Events</p>
                        <p className="text-[10px] text-slate-500">
                          {analysis.hasEvents
                            ? "Events declared"
                            : "No events declared"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg bg-slate-950/70 px-2 py-2">
                      <span
                        className={
                          "h-2 w-2 rounded-full " +
                          (analysis.usesRevert
                            ? "bg-emerald-400"
                            : "bg-slate-500")
                        }
                      />
                      <div>
                        <p className="text-slate-200">Failure handling</p>
                        <p className="text-[10px] text-slate-500">
                          {analysis.usesRevert
                            ? "Uses revert/custom errors"
                            : "No explicit revert usage detected"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  <div>
                    <h3 className="mb-1 text-[11px] font-semibold text-slate-300">
                      Warnings
                    </h3>
                    <ul className="space-y-1">
                      {analysis.warnings?.map((w, idx) => (
                        <li
                          key={idx}
                          className="rounded-md bg-slate-950/80 px-2 py-1 text-[11px] text-amber-200/90"
                        >
                          ⚠ {w}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggestions */}
                  <div>
                    <h3 className="mb-1 text-[11px] font-semibold text-slate-300">
                      Suggestions
                    </h3>
                    <ul className="space-y-1">
                      {analysis.suggestions?.map((s, idx) => (
                        <li
                          key={idx}
                          className="rounded-md bg-slate-950/80 px-2 py-1 text-[11px] text-slate-200"
                        >
                          • {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* CONTRACTS TAB */}
          {activeTab === "contracts" && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.9)] backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-50">
                    Saved Contracts
                  </h2>
                  <p className="text-xs text-slate-400 md:text-[13px]">
                    All contracts stored via your Spring Boot + MySQL backend.
                  </p>
                </div>
                <button
                  onClick={fetchContracts}
                  className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300 hover:border-sky-500/70 hover:text-sky-300 transition"
                >
                  Refresh
                </button>
              </div>

              <div className="h-[420px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Loading contracts…
                  </div>
                ) : contracts.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center text-xs text-slate-500">
                    <span className="text-lg">📂</span>
                    <p>No contracts saved yet.</p>
                    <p>Create one in the Editor tab and click Save.</p>
                  </div>
                ) : (
                  <ul className="h-full space-y-2 overflow-auto p-3 text-xs">
                    {contracts.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-3 shadow-sm hover:border-sky-500/60 hover:shadow-sky-500/20 transition"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="truncate text-[13px] font-semibold text-slate-50">
                            {c.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                              id: {c.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteContract(c.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-rose-500/70 bg-rose-600/10 px-2 py-0.5 text-[10px] font-semibold text-rose-200 hover:border-rose-400 hover:text-rose-50 transition"
                            >
                              <span>🗑</span>
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                        <pre className="max-h-40 overflow-auto rounded-md bg-slate-950/80 p-2 text-[11px] leading-snug text-slate-200">
                          {c.sourceCode}
                        </pre>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            Created:{" "}
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleString()
                              : "—"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
