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

export default function GradeTerminal() {
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
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showFormula, setShowFormula] = useState<boolean>(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("grade_history_google");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        localStorage.removeItem("grade_history_google");
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
    const updated = [newItem, ...history].slice(0, 5);
    setHistory(updated);
    localStorage.setItem("grade_history_google", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("grade_history_google");
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
        setError("Invalid marks. Please input valid marks between 0 and 100.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const percent = (totalMarks / (subjects.length * 100)) * 100;
        const formatted = `${percent.toFixed(2)}%`;
        setResult(formatted);
        saveToHistory(`${subjects.length} Course Percentages`, mode, formatted);
      }, 650);
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
        setError("Invalid entries. Check course credits or select valid grades.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const sgpa = totalGradePoints / totalCredits;
        const formatted = sgpa.toFixed(2);
        setResult(formatted);
        saveToHistory(`${subjects.length} Courses SGPA`, mode, formatted);
      }, 650);
    } else if (mode === "CGPA") {
      const pCgpa = parseFloat(prevCgpa);
      const pCredits = parseFloat(prevCredits);
      let totalSemGradePoints = 0;
      let totalSemCredits = 0;
      let valid = true;

      if (isNaN(pCgpa) || pCgpa < 0 || pCgpa > 10 || isNaN(pCredits) || pCredits < 0) {
        setError("Invalid previous semester data.");
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
        setError("Invalid input data in your courses list.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const overallGradePoints = pCgpa * pCredits + totalSemGradePoints;
        const overallCredits = pCredits + totalSemCredits;

        if (overallCredits === 0) {
          setError("Total accumulated academic credits cannot be zero.");
          return;
        }

        const cgpa = overallGradePoints / overallCredits;
        const formatted = cgpa.toFixed(2);
        setResult(formatted);
        saveToHistory(`Semester Cumulative Result`, mode, formatted);
      }, 650);
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
        setError("Invalid parameters. Enter valid numbers.");
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
          setError("Mathematically impossible goal. Requires over a 10.00 avg.");
          return;
        }
        if (avgGradePointRequired < 0) {
          setResult("Goal Achieved!");
          setWhatIfBreakdown("Goal already surpassed! Maintain any passing score.");
          return;
        }

        const formatted = `Required Avg SGPA: ${avgGradePointRequired.toFixed(2)}`;
        setResult(formatted);

        // Compute predicted optimal grade combinations for recruiter-wowing effect
        // S = 10, A = 9, B = 8, C = 7, D = 6, E = 5
        let distribution = "Target grade distribution for remaining courses:";
        if (avgGradePointRequired >= 9.0) {
          distribution = "Top-tier standing. Aim primarily for S (10) and A (9) grades across remaining courses.";
        } else if (avgGradePointRequired >= 8.0) {
          distribution = "Solid performance needed. Focus on securing A (9) and B (8) grades.";
        } else if (avgGradePointRequired >= 7.0) {
          distribution = "Aim for a steady B (8) or C (7) grade average across courses.";
        } else {
          distribution = "Secure C (7) or D (6) grades to stay perfectly on track with your objective.";
        }

        setWhatIfBreakdown(distribution);
        saveToHistory(`Goal: ${goalCgpa} CGPA`, mode, formatted);
      }, 650);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(`Academic Insights Engine Result: ${result}`);
      alert("Result copied to clipboard!");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-3 sm:p-6 smooth-entry relative overflow-x-hidden font-sans select-none">
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[110px]"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[450px] h-[450px] bg-cyan-400/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-4xl glass-panel p-5 sm:p-8 bg-white/80 relative select-none">
        {/* Authoritative Clean Minimal Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100 shadow-sm">
              <svg className="w-5 h-5 stroke-current stroke-2" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800 leading-tight">
                Academic Performance Engine
              </h1>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                Modern Academic Performance Insights, Target Modeler & Scenarios Log
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="text-[10px] bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm"
          >
            {showFormula ? "Hide Formula" : "View Computation Logic"}
          </button>
        </header>

        {/* Collapsible computation math insights panel */}
        {showFormula && (
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 mb-5 text-xs text-slate-600 smooth-entry select-none">
            <h3 className="font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-3">
              Precision Formula & Computation Matrix
            </h3>
            <ul className="space-y-1.5 list-disc list-inside">
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

        {/* Dynamic Nav Switchers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
          {(["PERCENTAGE", "SGPA", "CGPA", "WHAT_IF"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setResult(null);
                setWhatIfBreakdown(null);
                setError(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex flex-col items-center justify-center gap-1 border border-slate-100 ${
                mode === m
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/10 border-blue-600"
                  : "bg-white/60 text-slate-500 hover:bg-slate-50/80"
              }`}
            >
              {m === "WHAT_IF" ? "What-If" : m}
            </button>
          ))}
        </div>

        {/* Flexible Working Interface Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 bg-white/40 border border-slate-100 rounded-3xl p-4 sm:p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-[10px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-100 pb-2 mb-3">
                {mode === "PERCENTAGE" && "Entry: Courses Marks"}
                {mode === "SGPA" && "Entry: Term Modules"}
                {mode === "CGPA" && "Context Balance"}
                {mode === "WHAT_IF" && "Predict Goal Distribution"}
              </h2>

              {/* Advanced dynamic subfields for overall continuity and planners */}
              {(mode === "CGPA" || mode === "WHAT_IF") && (
                <div className="grid grid-cols-2 gap-3 border-b border-dashed border-slate-100 pb-4 mb-4 select-none">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
                      Current CGPA
                    </label>
                    <input
                      type="number"
                      value={prevCgpa}
                      onChange={(e) => setPrevCgpa(e.target.value)}
                      className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-200"
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
                      className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-200"
                      placeholder="e.g. 72"
                    />
                  </div>
                </div>
              )}

              {/* Unique Target & Goals Inputs for What-If Goal distributions */}
              {mode === "WHAT_IF" && (
                <div className="grid grid-cols-2 gap-3 border-b border-dashed border-slate-100 pb-4 mb-4 select-none">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
                      Target CGPA Goal
                    </label>
                    <input
                      type="number"
                      value={targetCgpa}
                      onChange={(e) => setTargetCgpa(e.target.value)}
                      className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-200"
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
                      className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-200"
                      placeholder="e.g. 18"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic list of inputs for term results */}
              {mode !== "WHAT_IF" && (
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 mb-3 select-none">
                  {subjects.map((sub, idx) => (
                    <div
                      key={sub.id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-b border-slate-100 pb-3"
                    >
                      <div className="flex-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
                          Course Name
                        </label>
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) =>
                            handleSubjectChange(sub.id, "name", e.target.value)
                          }
                          className="w-full text-sm font-semibold p-2 rounded-xl border border-slate-200 select-none"
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
                            className="w-full sm:w-20 text-sm font-semibold p-2 rounded-xl border border-slate-200 text-center"
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
                              className="w-full sm:w-16 text-sm font-semibold p-2 rounded-xl border border-slate-200 text-center"
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
                          className="border border-slate-200 text-slate-400 hover:bg-slate-50 p-2 font-bold text-xs select-none h-[38px] transition-colors rounded-xl flex items-center justify-center bg-white"
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
                  className="w-full border border-dashed border-blue-200 rounded-xl hover:bg-blue-50/40 p-2.5 font-bold tracking-wide text-[10px] uppercase text-blue-600 transition-colors mb-4"
                >
                  + Add Entry
                </button>
              )}
            </div>

            <div>
              <button
                onClick={calculateResult}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 p-3.5 font-bold rounded-xl tracking-wider uppercase transition-all text-xs border border-blue-600 shadow-md shadow-blue-500/10 flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Processing Matrix...
                  </>
                ) : (
                  "Execute Calculation"
                )}
              </button>

              {error && (
                <div className="border border-red-100 bg-red-50/50 rounded-xl p-3 mt-3 text-[11px] font-bold text-red-600">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Premium Academic Predictions Board */}
          <div className="bg-white/40 border border-slate-100 rounded-3xl p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-[10px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-100 pb-2 mb-3">
                Insights Dashboard
              </h2>

              {isProcessing ? (
                <div className="border border-slate-100 bg-white/60 p-5 text-center my-3 select-none rounded-2xl flex flex-col items-center justify-center min-h-[140px] smooth-entry">
                  <div className="w-8 h-8 border-4 border-slate-100 spinner-round rounded-full mb-3"></div>
                  <span className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">
                    Analyzing Parameters
                  </span>
                </div>
              ) : result ? (
                <div className="border border-blue-50 bg-blue-50/30 p-4 text-center my-3 select-none smooth-entry rounded-2xl flex flex-col justify-between min-h-[140px]">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">
                      Calculated Outcome
                    </span>
                    <div className="text-2xl font-black text-blue-600 tracking-tight mt-1">
                      {result}
                    </div>
                    {whatIfBreakdown && (
                      <p className="text-[10px] font-semibold text-slate-500 leading-normal mt-2 border-t border-blue-50 pt-2 border-dashed">
                        {whatIfBreakdown}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="text-[9px] border border-blue-100 bg-white hover:bg-blue-50/40 text-blue-600 font-bold px-3 py-1.5 rounded-xl mt-3 transition-all self-center shadow-sm select-none"
                  >
                    Copy Result
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-slate-100 p-5 text-center text-slate-300 font-bold uppercase text-[10px] my-3 select-none flex flex-col items-center justify-center min-h-[140px] rounded-2xl">
                  <span>No computational output</span>
                  <span className="text-[8px] font-normal tracking-wide text-slate-400 mt-1">
                    Execute metrics above
                  </span>
                </div>
              )}

              {/* Computations History */}
              <div className="mt-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-2.5">
                  <h3 className="text-[9px] font-bold uppercase tracking-wide text-slate-400 select-none">
                    Session Log
                  </h3>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-[8px] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-lg font-bold text-slate-500 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 select-none h-[130px] overflow-y-auto pr-0.5">
                  {history.length === 0 ? (
                    <span className="text-[9px] text-slate-400 italic">
                      No computational items saved.
                    </span>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="border border-slate-50 p-2 bg-white/60 rounded-xl flex items-center justify-between text-xs"
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

            <footer className="text-[9px] border-t border-slate-100 pt-3 mt-3 text-center text-slate-400 font-bold tracking-widest uppercase">
              Insights Workspace Engine
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
