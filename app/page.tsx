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

export default function AntigravityDashboard() {
  const [mode, setMode] = useState<Mode>("PERCENTAGE");
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: 1, name: "Course 1", credits: "4", grade: "S", marks: "" },
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
    const savedHistory = localStorage.getItem("grade_history_antigravity");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        localStorage.removeItem("grade_history_antigravity");
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
    localStorage.setItem("grade_history_antigravity", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("grade_history_antigravity");
  };

  const addSubject = () => {
    const newId = subjects.length ? Math.max(...subjects.map((s) => s.id)) + 1 : 1;
    setSubjects([
      ...subjects,
      { id: newId, name: `Course ${newId}`, credits: "4", grade: "A", marks: "" },
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
        setError("Please enter valid marks between 0 and 100.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const percent = (totalMarks / (subjects.length * 100)) * 100;
        const formatted = `${percent.toFixed(2)}%`;
        setResult(formatted);
        saveToHistory(`${subjects.length} Subjects`, mode, formatted);
      }, 600);
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
        setError("Invalid inputs. Review credits and grades.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const sgpa = totalGradePoints / totalCredits;
        const formatted = sgpa.toFixed(2);
        setResult(formatted);
        saveToHistory(`${subjects.length} Courses SGPA`, mode, formatted);
      }, 600);
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
        setError("Invalid grades or credits entered.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const overallGradePoints = pCgpa * pCredits + totalSemGradePoints;
        const overallCredits = pCredits + totalSemCredits;

        if (overallCredits === 0) {
          setError("Credits accumulated cannot be zero.");
          return;
        }

        const cgpa = overallGradePoints / overallCredits;
        const formatted = cgpa.toFixed(2);
        setResult(formatted);
        saveToHistory(`Semester Cumulative`, mode, formatted);
      }, 600);
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
        setError("Check parameter values.");
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
          setError("Goal over 10.00 avg required. Impracticable goal.");
          return;
        }
        if (avgGradePointRequired < 0) {
          setResult("Goal Achieved!");
          setConfidence("Zero Risk");
          setWhatIfBreakdown("Goal already accomplished. Aim for passing grades.");
          return;
        }

        const formatted = `Avg SGPA Needed: ${avgGradePointRequired.toFixed(2)}`;
        setResult(formatted);

        let breakdown = "";
        let conf = "Low Difficulty";

        if (avgGradePointRequired >= 9.0) {
          breakdown = "High Standing target. Focus primarily on top grade S (10) for future courses.";
          conf = "Significant Effort";
        } else if (avgGradePointRequired >= 8.0) {
          breakdown = "Aim for A (9) and B (8) across your upcoming modules.";
          conf = "Moderate Focus";
        } else {
          breakdown = "Maintain a steady C (7) or B (8) across remaining credits.";
          conf = "Easily Attainable";
        }

        setConfidence(conf);
        setWhatIfBreakdown(breakdown);
        saveToHistory(`Goal: ${goalCgpa} CGPA`, mode, formatted);
      }, 600);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(`Academic Performance Engine Result: ${result}`);
      alert("Performance result copied to clipboard!");
    }
  };

  return (
    <main className="min-h-screen bg-[#fbfbfb] text-[#111827] flex flex-col items-center justify-start py-5 px-4 sm:px-12 smooth-entry select-none relative overflow-x-hidden font-sans">
      <div className="w-full max-w-5xl flex flex-col flex-1 gap-6 bg-transparent relative select-none">
        {/* Antigravity Elegant Clean Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200/50 pb-5 gap-4 select-none">
          <div className="flex items-center gap-3.5">
            {/* Soft SVG Google Antigravity Style Logo */}
            <svg
              className="w-10 h-10 stroke-current stroke-2 text-[#4b5563] flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] leading-tight flex items-center gap-2">
                Academic Performance Engine
              </h1>
              <p className="text-xs font-normal text-slate-500 mt-1 select-none">
                Experience liftoff with the next-gen academic insights platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFormula(!showFormula)}
              className="text-xs bg-white border border-slate-200 hover:bg-slate-50 text-[#4b5563] font-semibold px-4 py-2 rounded-full transition-all h-[38px] flex items-center justify-center shadow-sm select-none"
            >
              {showFormula ? "Hide Logic" : "Explore use cases / Matrix"}
            </button>
          </div>
        </header>

        {/* Collapsible computation math insights panel */}
        {showFormula && (
          <div className="border border-slate-100 rounded-2xl p-4 bg-white/40 mb-2 text-xs text-slate-600 smooth-entry select-none">
            <h3 className="font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-2">
              Computation Matrix & Core Insights
            </h3>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <strong>Percentage Calculations:</strong>{" "}
                <code>(Sum of Subject Scores / Total Possible Base Scores) × 100</code>
              </li>
              <li>
                <strong>SGPA Formula:</strong>{" "}
                <code>Σ(Course Credits × Grade Points) / Σ(Total Course Credits)</code>
              </li>
              <li>
                <strong>CGPA Continuity:</strong>{" "}
                <code>(Prior CGPA × Prior Credits + Sem Grade points) / Overall Accumulated Credits</code>
              </li>
              <li>
                <strong>What-If Objective Model:</strong>{" "}
                <code>(Goal CGPA × Net Target Credits - Prior Points Balance) / Academic Course Credits</code>
              </li>
            </ul>
          </div>
        )}

        {/* Custom rounded-full modes Switcher */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200/50 pb-4 select-none">
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
              className={`py-2.5 px-5 rounded-full text-xs font-semibold tracking-wide uppercase transition-all flex items-center justify-center border border-slate-200/40 select-none ${
                mode === m
                  ? "bg-[#374151] text-white shadow-md border-[#374151]"
                  : "bg-white/50 text-slate-600 hover:bg-slate-50/80"
              }`}
            >
              {m === "WHAT_IF" ? "What-If" : m}
            </button>
          ))}
        </div>

        {/* Dynamic Multi-Column Immersive workspace */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-[11px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-200/40 pb-1 mb-4 select-none">
                Data Profile
              </h2>

              {/* Advanced Overall Inputs (Context Balance) */}
              {(mode === "CGPA" || mode === "WHAT_IF") && (
                <div className="grid grid-cols-2 gap-4 border-b border-dashed border-slate-200/50 pb-4 mb-4 select-none">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
                      Current CGPA
                    </label>
                    <input
                      type="number"
                      value={prevCgpa}
                      onChange={(e) => setPrevCgpa(e.target.value)}
                      className="w-full text-sm font-semibold p-2.5 rounded-full border border-slate-200/60"
                      placeholder="e.g. 8.4"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
                      Current Credits
                    </label>
                    <input
                      type="number"
                      value={prevCredits}
                      onChange={(e) => setPrevCredits(e.target.value)}
                      className="w-full text-sm font-semibold p-2.5 rounded-full border border-slate-200/60"
                      placeholder="e.g. 72"
                    />
                  </div>
                </div>
              )}

              {/* WHAT-IF Specific goal entries */}
              {mode === "WHAT_IF" && (
                <div className="grid grid-cols-2 gap-4 border-b border-dashed border-slate-200/50 pb-4 mb-4 select-none">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
                      Target CGPA Goal
                    </label>
                    <input
                      type="number"
                      value={targetCgpa}
                      onChange={(e) => setTargetCgpa(e.target.value)}
                      className="w-full text-sm font-semibold p-2.5 rounded-full border border-slate-200/60"
                      placeholder="e.g. 9.0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
                      Remaining Credits
                    </label>
                    <input
                      type="number"
                      value={remainingCredits}
                      onChange={(e) => setRemainingCredits(e.target.value)}
                      className="w-full text-sm font-semibold p-2.5 rounded-full border border-slate-200/60"
                      placeholder="e.g. 18"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Modules Table List */}
              {mode !== "WHAT_IF" && (
                <div className="space-y-3 max-h-[310px] overflow-y-auto pr-1 select-none">
                  {subjects.map((sub, idx) => (
                    <div
                      key={sub.id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-b border-slate-100 pb-3"
                    >
                      <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
                          Course Name
                        </label>
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) =>
                            handleSubjectChange(sub.id, "name", e.target.value)
                          }
                          className="w-full text-sm font-semibold p-2.5 rounded-full border border-slate-200/60 select-none"
                        />
                      </div>

                      {mode === "PERCENTAGE" ? (
                        <div className="flex flex-col justify-end">
                          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
                            Marks (/100)
                          </label>
                          <input
                            type="number"
                            value={sub.marks}
                            onChange={(e) =>
                              handleSubjectChange(sub.id, "marks", e.target.value)
                            }
                            className="w-full sm:w-24 text-sm font-semibold p-2.5 rounded-full border border-slate-200/60 text-center"
                            placeholder="88"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col justify-end">
                            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
                              Credits
                            </label>
                            <input
                              type="number"
                              value={sub.credits}
                              onChange={(e) =>
                                handleSubjectChange(sub.id, "credits", e.target.value)
                              }
                              className="w-full sm:w-20 text-sm font-semibold p-2.5 rounded-full border border-slate-200/60 text-center"
                              placeholder="4"
                            />
                          </div>
                          <div className="flex flex-col justify-end">
                            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
                              Grade
                            </label>
                            <select
                              value={sub.grade}
                              onChange={(e) =>
                                handleSubjectChange(sub.id, "grade", e.target.value)
                              }
                              className="w-full sm:w-28 text-sm font-semibold p-2.5 rounded-full border border-slate-200/60 bg-white cursor-pointer select-none"
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
                          className="border border-slate-200/60 text-slate-400 hover:bg-slate-50 p-2 font-bold text-xs select-none h-[42px] w-[42px] transition-colors rounded-full flex items-center justify-center bg-white"
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
                  className="w-full border border-dashed border-slate-200 rounded-full hover:bg-slate-50/60 p-2.5 font-bold tracking-wide text-xs uppercase text-slate-500 transition-colors my-4 select-none"
                >
                  + Add Course Module
                </button>
              )}
            </div>

            <div>
              <button
                onClick={calculateResult}
                className="w-full bg-[#374151] text-white hover:bg-[#1f2937] p-3.5 font-bold rounded-full tracking-wider uppercase transition-all text-xs border border-[#374151] shadow-md flex items-center justify-center select-none"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Calculating insights...
                  </>
                ) : (
                  "Calculate Performance"
                )}
              </button>

              {error && (
                <div className="border border-red-100 bg-red-50/50 rounded-full p-3 mt-3 text-center text-xs font-bold text-red-600">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Precision Analytics Column Workspace */}
          <div className="flex flex-col justify-between select-none">
            <div>
              <h2 className="text-[11px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-200/40 pb-1 mb-4 select-none">
                Direct Analytics
              </h2>

              {isProcessing ? (
                <div className="border border-slate-100 bg-white/60 p-5 text-center my-3 select-none rounded-2xl flex flex-col items-center justify-center min-h-[140px] smooth-entry">
                  <div className="w-8 h-8 border-4 border-slate-100 spinner-round rounded-full mb-3"></div>
                  <span className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">
                    Analyzing Results
                  </span>
                </div>
              ) : result ? (
                <div className="border border-slate-200/40 bg-white p-5 text-center my-3 select-none smooth-entry rounded-2xl flex flex-col justify-between min-h-[150px] shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#4b5563]">
                      Calculation Result
                    </span>
                    <div className="text-4xl font-black text-[#111827] tracking-tight mt-1">
                      {result}
                    </div>
                    {confidence && (
                      <div className="text-[9px] font-bold uppercase text-slate-600 bg-slate-50 px-3 py-1 mt-2.5 rounded-full border border-slate-200/60 inline-block">
                        Confidence: {confidence}
                      </div>
                    )}
                    {whatIfBreakdown && (
                      <p className="text-[11px] font-normal text-slate-500 leading-relaxed mt-3 border-t border-slate-100 pt-3 border-dashed select-none">
                        {whatIfBreakdown}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="text-[10px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold px-4 py-2 rounded-full mt-4 transition-all self-center shadow-sm select-none"
                  >
                    Copy result
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200/60 p-5 text-center text-slate-300 font-bold uppercase text-[10px] my-3 select-none flex flex-col items-center justify-center min-h-[140px] rounded-2xl">
                  <span>No computation outcome</span>
                  <span className="text-[9px] font-normal tracking-wide text-slate-400 mt-1">
                    Execute metrics above
                  </span>
                </div>
              )}

              {/* Saved computation logs */}
              <div className="mt-4">
                <div className="flex justify-between items-center border-b border-slate-200/40 pb-1 mb-2.5">
                  <h3 className="text-[9px] font-bold uppercase tracking-wide text-slate-400 select-none">
                    Performance Log
                  </h3>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-[9px] bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1 rounded-full font-bold text-slate-500 transition-all select-none h-[28px] flex items-center justify-center"
                    >
                      Clear Log
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 select-none h-[110px] overflow-y-auto pr-0.5">
                  {history.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic font-medium">
                      No computational items saved.
                    </span>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="border border-slate-100 p-2.5 bg-white rounded-2xl flex items-center justify-between text-xs shadow-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-[10px] uppercase text-slate-600">
                            {item.title}
                          </span>
                          <span className="text-[8px] text-slate-400">
                            {item.mode} • {item.date}
                          </span>
                        </div>
                        <span className="font-bold text-slate-800">{item.result}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <footer className="text-[9px] border-t border-slate-200/50 pt-3 mt-4 text-center text-slate-400 font-bold tracking-widest uppercase">
              Academic Performance Analytics
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
