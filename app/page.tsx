"use client";

import React, { useState, useEffect } from "react";

type Mode = "PERCENTAGE" | "SGPA" | "CGPA" | "WHAT_IF";

interface Subject {
  id: number;
  name: string;
  credits: string;
  grade: string;
  marks: string;
}

interface HistoryItem {
  id: string;
  title: string;
  mode: Mode;
  date: string;
  result: string;
}

const gradePoints: { [key: string]: number } = {
  S: 10,
  A: 9,
  B: 8,
  C: 7,
  D: 6,
  E: 5,
  F: 0,
  N: 0,
};

export default function Platform() {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mode, setMode] = useState<Mode>("PERCENTAGE");
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: 1, name: "Module 1", credits: "4", grade: "S", marks: "" },
  ]);
  const [prevCgpa, setPrevCgpa] = useState<string>("");
  const [prevCredits, setPrevCredits] = useState<string>("");
  const [targetCgpa, setTargetCgpa] = useState<string>("");
  const [remainingCredits, setRemainingCredits] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);
  const [whatIfBreakdown, setWhatIfBreakdown] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showFormula, setShowFormula] = useState<boolean>(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem("platform_history_zoom");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        localStorage.removeItem("platform_history_zoom");
      }
    }
  }, []);

  const saveToHistory = (title: string, calcMode: Mode, res: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      title,
      mode: calcMode,
      date: new Date().toLocaleDateString(),
      result: res,
    };
    const updated = [newItem, ...history].slice(0, 4);
    setHistory(updated);
    localStorage.setItem("platform_history_zoom", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("platform_history_zoom");
  };

  const addSubject = () => {
    const newId = subjects.length ? Math.max(...subjects.map((s) => s.id)) + 1 : 1;
    setSubjects([
      ...subjects,
      { id: newId, name: `Module ${newId}`, credits: "4", grade: "A", marks: "" },
    ]);
  };

  const removeSubject = (id: number) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter((s) => s.id !== id));
    }
  };

  const handleSubjectChange = (id: number, field: keyof Subject, value: string) => {
    setSubjects(
      subjects.map((s) => {
        if (s.id === id) {
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  const calculateResult = () => {
    setError(null);
    setResult(null);
    setWhatIfBreakdown(null);
    setConfidence(null);

    if (mode === "PERCENTAGE") {
      let totalMarks = 0;
      let valid = true;

      for (const sub of subjects) {
        const val = parseFloat(sub.marks);
        if (isNaN(val) || val < 0 || val > 100) {
          valid = false;
          break;
        }
        totalMarks += val;
      }

      if (!valid) {
        setError("Please enter valid marks from 0 to 100.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const percent = (totalMarks / (subjects.length * 100)) * 100;
        const formatted = `${percent.toFixed(2)}%`;
        setResult(formatted);
        saveToHistory(`${subjects.length} Modules`, mode, formatted);
      }, 550);
    } else if (mode === "SGPA") {
      let totalGradePoints = 0;
      let totalCredits = 0;
      let valid = true;

      for (const sub of subjects) {
        const credits = parseFloat(sub.credits);
        if (isNaN(credits) || credits <= 0) {
          valid = false;
          break;
        }
        if (sub.grade === "P") continue;

        totalGradePoints += credits * (gradePoints[sub.grade] || 0);
        totalCredits += credits;
      }

      if (!valid || totalCredits === 0) {
        setError("Review course parameters.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const sgpa = totalGradePoints / totalCredits;
        const formatted = sgpa.toFixed(2);
        setResult(formatted);
        saveToHistory(`${subjects.length} Modules SGPA`, mode, formatted);
      }, 550);
    } else if (mode === "CGPA") {
      const pCgpa = parseFloat(prevCgpa);
      const pCredits = parseFloat(prevCredits);
      let totalSemGradePoints = 0;
      let totalSemCredits = 0;
      let valid = true;

      if (isNaN(pCgpa) || pCgpa < 0 || pCgpa > 10 || isNaN(pCredits) || pCredits < 0) {
        setError("Invalid initial values.");
        return;
      }

      for (const sub of subjects) {
        const credits = parseFloat(sub.credits);
        if (isNaN(credits) || credits <= 0) {
          valid = false;
          break;
        }
        if (sub.grade === "P") continue;

        totalSemGradePoints += credits * (gradePoints[sub.grade] || 0);
        totalSemCredits += credits;
      }

      if (!valid) {
        setError("Review course credits or grades.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const overallGradePoints = pCgpa * pCredits + totalSemGradePoints;
        const overallCredits = pCredits + totalSemCredits;

        if (overallCredits === 0) {
          setError("Total dynamic credits cannot be zero.");
          return;
        }

        const cgpa = overallGradePoints / overallCredits;
        const formatted = cgpa.toFixed(2);
        setResult(formatted);
        saveToHistory(`Semester Cumulative`, mode, formatted);
      }, 550);
    } else if (mode === "WHAT_IF") {
      const curCgpa = parseFloat(prevCgpa);
      const curCredits = parseFloat(prevCredits);
      const goalCgpa = parseFloat(targetCgpa);
      const remCredits = parseFloat(remainingCredits);

      if (
        isNaN(curCgpa) || curCgpa < 0 || curCgpa > 10 ||
        isNaN(curCredits) || curCredits < 0 ||
        isNaN(goalCgpa) || goalCgpa < 0 || goalCgpa > 10 ||
        isNaN(remCredits) || remCredits <= 0
      ) {
        setError("Check parameters.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const currentPoints = curCgpa * curCredits;
        const totalCreditsNeeded = curCredits + remCredits;
        const totalPointsNeeded = goalCgpa * totalCreditsNeeded;
        const pointsRequired = totalPointsNeeded - currentPoints;
        const avgGradePointRequired = pointsRequired / remCredits;

        if (avgGradePointRequired > 10) {
          setError("Goal over 10.00 average required.");
          return;
        }
        if (avgGradePointRequired < 0) {
          setResult("Goal Surpassed!");
          setConfidence("Zero Risk");
          setWhatIfBreakdown("Target achieved. Maintain any passing performance.");
          return;
        }

        const formatted = `Required Average: ${avgGradePointRequired.toFixed(2)}`;
        setResult(formatted);

        let breakdown = "";
        let conf = "Low Difficulty";

        if (avgGradePointRequired >= 9.0) {
          breakdown = "Requires high performance. Target S (10) grades across modules.";
          conf = "Significant";
        } else if (avgGradePointRequired >= 8.0) {
          breakdown = "Aim for high performance A (9) or B (8) grades.";
          conf = "Moderate";
        } else {
          breakdown = "Maintain steady B (8) or C (7) grades to stay aligned.";
          conf = "Standard";
        }

        setConfidence(conf);
        setWhatIfBreakdown(breakdown);
        saveToHistory(`Goal: ${goalCgpa} CGPA`, mode, formatted);
      }, 550);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(`Academic result: ${result}`);
      alert("Performance result copied!");
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-start py-8 px-6 sm:px-16 smooth-entry transition-colors duration-300 select-none ${
      isDark ? "bg-[#09090b] text-[#f4f4f5]" : "bg-[#fcfcfd] text-[#111111]"
    }`}>
      <div className="w-full max-w-5xl flex flex-col flex-1 gap-8 bg-transparent select-none">
        
        {/* Navigation Bar */}
        <nav className={`flex items-center justify-between border-b pb-6 gap-6 select-none ${
          isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
        }`}>
          <div className="flex items-center gap-4">
            <svg
              className={`w-10 h-10 stroke-current stroke-2 flex-shrink-0 transition-colors ${
                isDark ? "text-white" : "text-black"
              }`}
              viewBox="0 0 24 24"
              fill="none"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight leading-none">
                Academic Hub
              </h1>
              <p className={`text-xs font-normal mt-1.5 select-none ${
                isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
              }`}>
                Visual interface for metrics and predictions
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFormula(!showFormula)}
              className={`text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-full border transition-all h-[42px] flex items-center justify-center select-none ${
                isDark
                  ? "bg-[#18181b] border-[#27272a] text-[#f4f4f5] hover:bg-[#27272a]"
                  : "bg-white border-[#e4e4e7] text-[#1c1d20] hover:bg-[#f4f4f5]"
              }`}
            >
              {showFormula ? "Hide Formula" : "Formulas"}
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className={`text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-full border transition-all h-[42px] flex items-center justify-center select-none ${
                isDark
                  ? "bg-[#18181b] border-[#27272a] text-[#f4f4f5] hover:bg-[#27272a]"
                  : "bg-white border-[#e4e4e7] text-[#1c1d20] hover:bg-[#f4f4f5]"
              }`}
            >
              {isDark ? "Light theme" : "Dark theme"}
            </button>
          </div>
        </nav>

        {showFormula && (
          <div className={`border rounded-2xl p-5 mb-3 text-sm transition-colors smooth-entry select-none ${
            isDark ? "border-[#27272a] bg-[#18181b] text-[#f4f4f5]" : "border-[#e4e4e7] bg-white text-[#111111]"
          }`}>
            <h3 className="font-bold uppercase tracking-wide text-xs mb-3">
              Formula Reference
            </h3>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <strong>Percentage:</strong>{" "}
                <code>(Sum of Module Scores / Total Base Scores) × 100</code>
              </li>
              <li>
                <strong>SGPA:</strong>{" "}
                <code>Σ(Course Credits × Grade Points) / Σ(Total Module Credits)</code>
              </li>
              <li>
                <strong>CGPA:</strong>{" "}
                <code>(Prior CGPA × Prior Credits + Sem Grade points) / Overall Credits</code>
              </li>
              <li>
                <strong>What-If:</strong>{" "}
                <code>(Goal CGPA × Net Target Credits - Prior Points Balance) / Module Credits</code>
              </li>
            </ul>
          </div>
        )}

        {/* Dynamic Mode Switches Tabs */}
        <div className="flex flex-wrap gap-2.5 border-b pb-5 select-none border-transparent">
          {(["PERCENTAGE", "SGPA", "CGPA", "WHAT_IF"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setResult(null);
                setWhatIfBreakdown(null);
                setConfidence(null);
                setError(null);
              }}
              className={`py-3 px-6 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all border select-none ${
                mode === m
                  ? isDark
                    ? "bg-[#f4f4f5] text-[#09090b] border-[#f4f4f5]"
                    : "bg-[#111111] text-[#fcfcfd] border-[#111111]"
                  : isDark
                    ? "bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#f4f4f5]"
                    : "bg-[#f4f4f5] border-[#e4e4e7] text-[#71717a] hover:bg-[#e4e4e7] hover:text-[#111111]"
              }`}
            >
              {m === "WHAT_IF" ? "What-If Model" : `${m} Tracker`}
            </button>
          ))}
        </div>

        {/* Dual columns with larger elements */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 flex flex-col justify-between">
            <div className="mb-4">
              <h2 className={`text-xs font-bold tracking-wider uppercase border-b pb-1 mb-5 select-none ${
                isDark ? "text-[#71717a] border-[#27272a]" : "text-[#a1a1aa] border-[#e4e4e7]"
              }`}>
                Entry Panel
              </h2>

              {/* Context inputs */}
              {(mode === "CGPA" || mode === "WHAT_IF") && (
                <div className={`grid grid-cols-2 gap-5 border-b border-dashed pb-5 mb-5 select-none ${
                  isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
                }`}>
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wide block mb-2 ${
                      isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                    }`}>
                      Current CGPA
                    </label>
                    <input
                      type="number"
                      value={prevCgpa}
                      onChange={(e) => setPrevCgpa(e.target.value)}
                      className={`w-full text-base font-semibold p-4 rounded-full border transition-colors bg-transparent ${
                        isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                      }`}
                      placeholder="e.g. 8.4"
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wide block mb-2 ${
                      isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                    }`}>
                      Current Credits
                    </label>
                    <input
                      type="number"
                      value={prevCredits}
                      onChange={(e) => setPrevCredits(e.target.value)}
                      className={`w-full text-base font-semibold p-4 rounded-full border transition-colors bg-transparent ${
                        isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                      }`}
                      placeholder="e.g. 72"
                    />
                  </div>
                </div>
              )}

              {/* Goal metrics for What-If models */}
              {mode === "WHAT_IF" && (
                <div className={`grid grid-cols-2 gap-5 border-b border-dashed pb-5 mb-5 select-none ${
                  isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
                }`}>
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wide block mb-2 ${
                      isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                    }`}>
                      Target CGPA Goal
                    </label>
                    <input
                      type="number"
                      value={targetCgpa}
                      onChange={(e) => setTargetCgpa(e.target.value)}
                      className={`w-full text-base font-semibold p-4 rounded-full border transition-colors bg-transparent ${
                        isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                      }`}
                      placeholder="e.g. 9.0"
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wide block mb-2 ${
                      isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                    }`}>
                      Remaining Credits
                    </label>
                    <input
                      type="number"
                      value={remainingCredits}
                      onChange={(e) => setRemainingCredits(e.target.value)}
                      className={`w-full text-base font-semibold p-4 rounded-full border transition-colors bg-transparent ${
                        isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                      }`}
                      placeholder="e.g. 18"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Course table with zoomed inputs */}
              {mode !== "WHAT_IF" && (
                <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1 select-none">
                  {subjects.map((sub, idx) => (
                    <div
                      key={sub.id}
                      className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-4 border-b pb-4 ${
                        isDark ? "border-[#27272a]" : "border-[#f4f4f5]"
                      }`}
                    >
                      <div className="flex-1">
                        <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${
                          isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                        }`}>
                          Module Title
                        </label>
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) =>
                            handleSubjectChange(sub.id, "name", e.target.value)
                          }
                          className={`w-full text-base font-semibold p-4 rounded-full border transition-colors bg-transparent select-none ${
                            isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                          }`}
                        />
                      </div>

                      {mode === "PERCENTAGE" ? (
                        <div className="flex flex-col justify-end">
                          <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${
                            isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                          }`}>
                            Marks (/100)
                          </label>
                          <input
                            type="number"
                            value={sub.marks}
                            onChange={(e) =>
                              handleSubjectChange(sub.id, "marks", e.target.value)
                            }
                            className={`w-full sm:w-28 text-base font-semibold p-4 rounded-full border transition-colors text-center bg-transparent ${
                              isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                            }`}
                            placeholder="88"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col justify-end">
                            <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${
                              isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                            }`}>
                              Credits
                            </label>
                            <input
                              type="number"
                              value={sub.credits}
                              onChange={(e) =>
                                handleSubjectChange(sub.id, "credits", e.target.value)
                              }
                              className={`w-full sm:w-24 text-base font-semibold p-4 rounded-full border transition-colors text-center bg-transparent ${
                                isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                              }`}
                              placeholder="4"
                            />
                          </div>
                          <div className="flex flex-col justify-end">
                            <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${
                              isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                            }`}>
                              Grade
                            </label>
                            <select
                              value={sub.grade}
                              onChange={(e) =>
                                handleSubjectChange(sub.id, "grade", e.target.value)
                              }
                              className={`w-full sm:w-32 text-base font-semibold p-4 rounded-full border transition-colors cursor-pointer select-none bg-transparent ${
                                isDark ? "border-[#27272a] focus:border-[#f4f4f5] text-white bg-[#18181b]" : "border-[#e4e4e7] focus:border-[#111111] text-black bg-white"
                              }`}
                            >
                              <option value="S">S (10)</option>
                              <option value="A">A (9)</option>
                              <option value="B">B (8)</option>
                              <option value="C">C (7)</option>
                              <option value="D">D (6)</option>
                              <option value="E">E (5)</option>
                              <option value="F">F (0)</option>
                              <option value="P">P (Pass)</option>
                            </select>
                          </div>
                        </>
                      )}

                      <div className="flex items-end justify-end sm:pt-4">
                        <button
                          onClick={() => removeSubject(sub.id)}
                          className={`border p-2 font-bold text-base select-none h-[54px] w-[54px] transition-colors rounded-full flex items-center justify-center ${
                            isDark
                              ? "border-[#27272a] hover:bg-[#27272a] text-[#a1a1aa]"
                              : "border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#71717a]"
                          }`}
                          title="Remove Entry"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mode !== "WHAT_IF" && (
                <button
                  onClick={addSubject}
                  className={`w-full border border-dashed rounded-full p-3 font-bold tracking-wide text-xs uppercase transition-colors my-4 select-none ${
                    isDark
                      ? "border-[#27272a] hover:bg-[#18181b] text-[#a1a1aa]"
                      : "border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#71717a]"
                  }`}
                >
                  + Add Module Entry
                </button>
              )}
            </div>

            <div>
              <button
                onClick={calculateResult}
                className={`w-full p-4 font-bold rounded-full tracking-wider uppercase transition-all text-xs sm:text-sm border flex items-center justify-center select-none ${
                  isDark
                    ? "bg-[#f4f4f5] border-[#f4f4f5] text-[#09090b] hover:bg-white"
                    : "bg-[#111111] border-[#111111] text-[#fcfcfd] hover:bg-black"
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 mr-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Calculating insights...
                  </>
                ) : (
                  "Calculate"
                )}
              </button>

              {error && (
                <div className={`border rounded-full p-3 mt-4 text-center text-xs font-semibold ${
                  isDark ? "border-[#27272a] bg-[#18181b] text-red-400" : "border-[#e4e4e7] bg-[#fdf2f2] text-red-600"
                }`}>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Expanded Analytics Output columns */}
          <div className="flex flex-col justify-between select-none">
            <div>
              <h2 className={`text-xs font-bold tracking-wider uppercase border-b pb-1 mb-5 select-none ${
                isDark ? "text-[#71717a] border-[#27272a]" : "text-[#a1a1aa] border-[#e4e4e7]"
              }`}>
                Analysis Result
              </h2>

              {isProcessing ? (
                <div className={`border p-6 text-center my-4 select-none rounded-2xl flex flex-col items-center justify-center min-h-[160px] smooth-entry ${
                  isDark ? "border-[#27272a] bg-[#18181b]" : "border-[#e4e4e7] bg-white"
                }`}>
                  <div className={`w-9 h-9 border-4 spinner-round rounded-full mb-4 ${
                    isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
                  }`}></div>
                  <span className="text-xs font-bold uppercase tracking-wide">
                    Calculating
                  </span>
                </div>
              ) : result ? (
                <div className={`border p-6 text-center my-4 select-none smooth-entry rounded-2xl flex flex-col justify-between min-h-[170px] ${
                  isDark ? "border-[#27272a] bg-[#18181b]" : "border-[#e4e4e7] bg-white"
                }`}>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Calculated Data
                    </span>
                    <div className={`text-5xl font-extrabold tracking-tight mt-1.5 select-none ${
                      isDark ? "text-white" : "text-[#111111]"
                    }`}>
                      {result}
                    </div>
                    {confidence && (
                      <div className={`text-xs font-bold uppercase px-4 py-1 mt-3 rounded-full border inline-block ${
                        isDark ? "border-[#27272a] bg-[#18181b] text-[#a1a1aa]" : "border-[#e4e4e7] bg-[#f4f4f5] text-[#71717a]"
                      }`}>
                        Difficulty: {confidence}
                      </div>
                    )}
                    {whatIfBreakdown && (
                      <p className={`text-xs font-medium leading-relaxed mt-4 border-t pt-4 border-dashed select-none ${
                        isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
                      }`}>
                        {whatIfBreakdown}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className={`text-xs border font-bold px-5 py-2.5 rounded-full mt-5 transition-all self-center select-none ${
                      isDark
                        ? "bg-[#18181b] border-[#27272a] text-[#f4f4f5] hover:bg-[#27272a]"
                        : "bg-white border-[#e4e4e7] text-[#111111] hover:bg-[#f4f4f5]"
                    }`}
                  >
                    Copy performance
                  </button>
                </div>
              ) : (
                <div className={`border border-dashed p-6 text-center font-bold uppercase text-xs my-4 select-none flex flex-col items-center justify-center min-h-[150px] rounded-2xl ${
                  isDark ? "border-[#27272a] text-[#71717a]" : "border-[#e4e4e7] text-[#a1a1aa]"
                }`}>
                  <span>No active metrics</span>
                </div>
              )}

              {/* Advanced History log table */}
              <div className="mt-5">
                <div className={`flex justify-between items-center border-b pb-2 mb-3 ${
                  isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
                }`}>
                  <h3 className={`text-xs font-bold uppercase tracking-wide select-none ${
                    isDark ? "text-[#71717a]" : "text-[#a1a1aa]"
                  }`}>
                    Calculation Logs
                  </h3>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-all h-[32px] flex items-center justify-center select-none ${
                        isDark
                          ? "bg-[#18181b] border-[#27272a] text-[#f4f4f5] hover:bg-[#27272a]"
                          : "bg-white border-[#e4e4e7] text-[#1c1d20] hover:bg-[#f4f4f5]"
                      }`}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2 select-none h-[120px] overflow-y-auto pr-0.5">
                  {history.length === 0 ? (
                    <span className={`text-xs italic font-medium ${
                      isDark ? "text-[#71717a]" : "text-[#a1a1aa]"
                    }`}>
                      No recorded logs.
                    </span>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className={`border p-3 rounded-xl flex items-center justify-between text-xs transition-colors ${
                          isDark ? "border-[#27272a] bg-[#18181b]" : "border-[#f4f4f5] bg-white"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-bold text-xs uppercase ${
                            isDark ? "text-[#f4f4f5]" : "text-[#1c1d20]"
                          }`}>
                            {item.title}
                          </span>
                          <span className={`text-xs ${
                            isDark ? "text-[#71717a]" : "text-[#a1a1aa]"
                          }`}>
                            {item.mode} • {item.date}
                          </span>
                        </div>
                        <span className={`font-bold text-sm ${
                          isDark ? "text-[#f4f4f5]" : "text-[#1c1d20]"
                        }`}>{item.result}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <footer className={`text-xs border-t pt-4 mt-5 text-center font-bold tracking-widest uppercase ${
              isDark ? "border-[#27272a] text-[#71717a]" : "border-[#e4e4e7] text-[#a1a1aa]"
            }`}>
              Performance Analytics Platform
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
