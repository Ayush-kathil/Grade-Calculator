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

export default function ImmersiveDashboard() {
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
    const savedHistory = localStorage.getItem("grade_history_immersive");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        localStorage.removeItem("grade_history_immersive");
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
    localStorage.setItem("grade_history_immersive", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("grade_history_immersive");
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
          breakdown = "High Standing target. Maintain top grade S (10) across remaining subjects.";
          conf = "Significant Effort Required";
        } else if (avgGradePointRequired >= 8.0) {
          breakdown = "Standard good performance needed. Aim for A (9) and B (8) grades.";
          conf = "Moderate Focus";
        } else {
          breakdown = "Maintain a steady C (7) or B (8) across your upcoming credits.";
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
      navigator.clipboard.writeText(`Academic Performance Outcome: ${result}`);
      alert("Performance result copied to clipboard!");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-start py-4 px-4 sm:px-10 smooth-entry select-none relative overflow-x-hidden font-sans">
      {/* Dynamic Sub-surface Ice Blue Radials */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-[-25%] left-[-20%] w-[600px] h-[600px] bg-indigo-400/5 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[450px] h-[450px] bg-cyan-400/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-5xl flex flex-col flex-1 gap-5 bg-transparent relative select-none">
        {/* Full-Width Non-card Immersive Banner Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200/60 pb-4 mb-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 border border-indigo-100/60">
              <svg className="w-5 h-5 stroke-current stroke-2" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-800 leading-tight">
                Academic Performance Dashboard
              </h1>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                Advanced performance analytics, SGPA modeler & prediction scenarios log
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFormula(!showFormula)}
              className="text-[10px] bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-xl transition-all h-[34px] flex items-center justify-center shadow-sm"
            >
              {showFormula ? "Hide Formula" : "View Computation Matrix"}
            </button>
          </div>
        </header>

        {/* Collapsible computation math insights panel */}
        {showFormula && (
          <div className="border border-slate-100 rounded-2xl p-4 bg-white/40 mb-3 text-xs text-slate-600 smooth-entry select-none">
            <h3 className="font-bold text-slate-700 uppercase tracking-wide text-[9px] mb-2 text-indigo-600">
              Calculation Matrix & Direct Math Insights
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

        {/* Edge-to-edge Mode Switcher tabs */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200/60 pb-3 select-none">
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
              className={`py-2 px-4 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center border border-slate-200/40 select-none ${
                mode === m
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10 border-indigo-600"
                  : "bg-white/40 text-slate-500 hover:bg-slate-50/60"
              }`}
            >
              {m === "WHAT_IF" ? "What-If Planner" : `${m} Modeler`}
            </button>
          ))}
        </div>

        {/* Dynamic Multi-Column Immersive Sizing workspace */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-[10px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-200/40 pb-1 mb-4 select-none">
                Data Context Balance
              </h2>

              {/* Advanced Overall Inputs (Context Balance) */}
              {(mode === "CGPA" || mode === "WHAT_IF") && (
                <div className="grid grid-cols-2 gap-4 border-b border-dashed border-slate-200/60 pb-4 mb-4 select-none">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
                      Current CGPA
                    </label>
                    <input
                      type="number"
                      value={prevCgpa}
                      onChange={(e) => setPrevCgpa(e.target.value)}
                      className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-200/60"
                      placeholder="e.g. 8.4"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
                      Current Credits
                    </label>
                    <input
                      type="number"
                      value={prevCredits}
                      onChange={(e) => setPrevCredits(e.target.value)}
                      className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-200/60"
                      placeholder="e.g. 72"
                    />
                  </div>
                </div>
              )}

              {/* WHAT-IF Specific goal entries */}
              {mode === "WHAT_IF" && (
                <div className="grid grid-cols-2 gap-4 border-b border-dashed border-slate-200/60 pb-4 mb-4 select-none">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
                      Target CGPA Goal
                    </label>
                    <input
                      type="number"
                      value={targetCgpa}
                      onChange={(e) => setTargetCgpa(e.target.value)}
                      className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-200/60"
                      placeholder="e.g. 9.0"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
                      Remaining Credits
                    </label>
                    <input
                      type="number"
                      value={remainingCredits}
                      onChange={(e) => setRemainingCredits(e.target.value)}
                      className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-200/60"
                      placeholder="e.g. 18"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Modules Table List */}
              {mode !== "WHAT_IF" && (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 select-none">
                  {subjects.map((sub, idx) => (
                    <div
                      key={sub.id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-b border-slate-100 pb-3"
                    >
                      <div className="flex-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
                          Course Module Name
                        </label>
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) =>
                            handleSubjectChange(sub.id, "name", e.target.value)
                          }
                          className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-200/60 select-none"
                        />
                      </div>

                      {mode === "PERCENTAGE" ? (
                        <div className="flex flex-col justify-end">
                          <label className="text-[9px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
                            Marks (/100)
                          </label>
                          <input
                            type="number"
                            value={sub.marks}
                            onChange={(e) =>
                              handleSubjectChange(sub.id, "marks", e.target.value)
                            }
                            className="w-full sm:w-20 text-sm font-semibold p-2 rounded-xl border border-slate-200/60 text-center"
                            placeholder="88"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col justify-end">
                            <label className="text-[9px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
                              Credits
                            </label>
                            <input
                              type="number"
                              value={sub.credits}
                              onChange={(e) =>
                                handleSubjectChange(sub.id, "credits", e.target.value)
                              }
                              className="w-full sm:w-16 text-sm font-semibold p-2 rounded-xl border border-slate-200/60 text-center"
                              placeholder="4"
                            />
                          </div>
                          <div className="flex flex-col justify-end">
                            <label className="text-[9px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
                              Grade
                            </label>
                            <select
                              value={sub.grade}
                              onChange={(e) =>
                                handleSubjectChange(sub.id, "grade", e.target.value)
                              }
                              className="w-full sm:w-24 text-sm font-semibold p-2 rounded-xl border border-slate-200 bg-white cursor-pointer select-none"
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
                          className="border border-slate-200/60 text-slate-400 hover:bg-slate-50 p-2 font-bold text-xs select-none h-[38px] transition-colors rounded-xl flex items-center justify-center bg-white"
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
                  className="w-full border border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50/40 p-2.5 font-bold tracking-wide text-[10px] uppercase text-indigo-600 transition-colors my-4"
                >
                  + Append Entry
                </button>
              )}
            </div>

            <div>
              <button
                onClick={calculateResult}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 p-3.5 font-bold rounded-xl tracking-wider uppercase transition-all text-xs border border-indigo-600 shadow-sm flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Executing Algorithms...
                  </>
                ) : (
                  "Calculate Performance"
                )}
              </button>

              {error && (
                <div className="border border-red-100 bg-red-50/50 rounded-xl p-3 mt-3 text-[11px] font-bold text-red-600">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Precision Analytics Column Workspace */}
          <div className="flex flex-col justify-between">
            <div>
              <h2 className="text-[10px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-200/40 pb-1 mb-4 select-none">
                Workspace Analytics
              </h2>

              {isProcessing ? (
                <div className="border border-slate-100 bg-white/60 p-5 text-center my-3 select-none rounded-2xl flex flex-col items-center justify-center min-h-[140px] smooth-entry">
                  <div className="w-8 h-8 border-4 border-slate-100 spinner-round rounded-full mb-3"></div>
                  <span className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">
                    Analyzing Scenario
                  </span>
                </div>
              ) : result ? (
                <div className="border border-indigo-50/60 bg-indigo-50/20 p-5 text-center my-3 select-none smooth-entry rounded-2xl flex flex-col justify-between min-h-[150px]">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">
                      Precision Calculation
                    </span>
                    <div className="text-3xl font-black text-indigo-600 tracking-tight mt-1 select-none">
                      {result}
                    </div>
                    {confidence && (
                      <div className="text-[9px] font-bold uppercase text-indigo-500 bg-indigo-50/50 px-2 py-0.5 mt-2 rounded-full border border-indigo-100/60 inline-block">
                        Confidence: {confidence}
                      </div>
                    )}
                    {whatIfBreakdown && (
                      <p className="text-[10px] font-semibold text-slate-500 leading-relaxed mt-3 border-t border-indigo-100/40 pt-2 border-dashed">
                        {whatIfBreakdown}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="text-[9px] border border-indigo-100/60 bg-white hover:bg-indigo-50/40 text-indigo-600 font-bold px-3 py-1.5 rounded-xl mt-3 transition-all self-center shadow-sm select-none"
                  >
                    Copy Output
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200/60 p-5 text-center text-slate-300 font-bold uppercase text-[9px] my-3 select-none flex flex-col items-center justify-center min-h-[140px] rounded-2xl">
                  <span>No computation outcome</span>
                  <span className="text-[8px] font-normal tracking-wide text-slate-400 mt-1">
                    Execute metrics above
                  </span>
                </div>
              )}

              {/* Persistence computational logs */}
              <div className="mt-4">
                <div className="flex justify-between items-center border-b border-slate-200/40 pb-1 mb-2.5">
                  <h3 className="text-[9px] font-bold uppercase tracking-wide text-slate-400 select-none">
                    Computation Session Log
                  </h3>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-[8px] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-xl font-bold text-slate-500 transition-colors"
                    >
                      Clear Log
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 select-none h-[110px] overflow-y-auto pr-0.5">
                  {history.length === 0 ? (
                    <span className="text-[9px] text-slate-400 italic">
                      No computational items logged.
                    </span>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="border border-slate-50/60 p-2 bg-white/60 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-[9px] uppercase text-slate-600">
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

            <footer className="text-[9px] border-t border-slate-200/60 pt-3 mt-4 text-center text-slate-400 font-bold tracking-widest uppercase select-none">
              Modern Performance Workspace Engine
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
