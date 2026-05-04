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

export default function Dashboard() {
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
    const savedHistory = localStorage.getItem("app_history_performance");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        localStorage.removeItem("app_history_performance");
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
    localStorage.setItem("app_history_performance", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("app_history_performance");
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
        setError("Enter valid marks from 0 to 100.");
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const percent = (totalMarks / (subjects.length * 100)) * 100;
        const formatted = `${percent.toFixed(2)}%`;
        setResult(formatted);
        saveToHistory(`${subjects.length} Subjects`, mode, formatted);
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
          setError("Goal over 10.00 avg required. Impracticable goal.");
          return;
        }
        if (avgGradePointRequired < 0) {
          setResult("Goal Achieved!");
          setConfidence("Zero Risk");
          setWhatIfBreakdown("Goal achieved. Maintain any passing grades.");
          return;
        }

        const formatted = `Avg SGPA: ${avgGradePointRequired.toFixed(2)}`;
        setResult(formatted);

        let breakdown = "";
        let conf = "Low Difficulty";

        if (avgGradePointRequired >= 9.0) {
          breakdown = "Requires high performance. Target S (10) for upcoming courses.";
          conf = "High Difficulty";
        } else if (avgGradePointRequired >= 8.0) {
          breakdown = "Standard focus required. Target A (9) and B (8) grades.";
          conf = "Moderate";
        } else {
          breakdown = "Maintain C (7) or B (8) across your upcoming modules.";
          conf = "Easy";
        }

        setConfidence(conf);
        setWhatIfBreakdown(breakdown);
        saveToHistory(`Goal: ${goalCgpa} CGPA`, mode, formatted);
      }, 550);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(`Performance result: ${result}`);
      alert("Performance result copied!");
    }
  };

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center justify-start py-8 px-4 sm:px-16 smooth-entry select-none font-sans select-none">
      <div className="w-full max-w-5xl flex flex-col flex-1 gap-8 bg-transparent select-none">
        <header className="flex flex-col sm:flex-row items-center justify-between border-b-4 border-black pb-6 gap-4">
          <div className="flex items-center gap-4">
            <svg
              className="w-12 h-12 stroke-current stroke-[3] text-black flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black leading-none">
                Academic Performance
              </h1>
              <p className="text-sm font-medium text-black mt-1 uppercase tracking-wide">
                Track and plan academic calculations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFormula(!showFormula)}
              className="text-xs sm:text-sm bg-white border-2 border-black hover:bg-black hover:text-white text-black font-extrabold px-6 py-3 rounded-full transition-all h-[46px] flex items-center justify-center select-none"
            >
              {showFormula ? "Hide formulas" : "View formulas"}
            </button>
          </div>
        </header>

        {showFormula && (
          <div className="border-2 border-black rounded-3xl p-5 bg-white mb-2 text-sm text-black smooth-entry select-none">
            <h3 className="font-extrabold text-black uppercase tracking-wider text-xs mb-3">
              Formulas
            </h3>
            <ul className="space-y-1 list-disc list-inside font-bold">
              <li>
                <strong>Percentage:</strong>{" "}
                <code>(Sum of Subject Scores / Total Possible Base Scores) × 100</code>
              </li>
              <li>
                <strong>SGPA:</strong>{" "}
                <code>Σ(Course Credits × Grade Points) / Σ(Total Course Credits)</code>
              </li>
              <li>
                <strong>CGPA:</strong>{" "}
                <code>(Prior CGPA × Prior Credits + Sem Grade points) / Overall Credits</code>
              </li>
              <li>
                <strong>What-If:</strong>{" "}
                <code>(Goal CGPA × Net Credits - Prior Points) / Remaining Credits</code>
              </li>
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-b-4 border-black pb-6 select-none">
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
              className={`py-3 px-6 rounded-full text-xs sm:text-sm font-black tracking-wide uppercase transition-all flex items-center justify-center border-2 border-black select-none ${
                mode === m
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-black/5"
              }`}
            >
              {m === "WHAT_IF" ? "What-If" : m}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-black border-b-2 border-black pb-2 mb-5 select-none">
                Data input
              </h2>

              {(mode === "CGPA" || mode === "WHAT_IF") && (
                <div className="grid grid-cols-2 gap-5 border-b-2 border-dashed border-black pb-5 mb-5 select-none">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wide text-black block mb-2">
                      Current CGPA
                    </label>
                    <input
                      type="number"
                      value={prevCgpa}
                      onChange={(e) => setPrevCgpa(e.target.value)}
                      className="w-full text-base font-bold p-3.5 rounded-full border-2 border-black bg-white"
                      placeholder="e.g. 8.4"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wide text-black block mb-2">
                      Current Credits
                    </label>
                    <input
                      type="number"
                      value={prevCredits}
                      onChange={(e) => setPrevCredits(e.target.value)}
                      className="w-full text-base font-bold p-3.5 rounded-full border-2 border-black bg-white"
                      placeholder="e.g. 72"
                    />
                  </div>
                </div>
              )}

              {mode === "WHAT_IF" && (
                <div className="grid grid-cols-2 gap-5 border-b-2 border-dashed border-black pb-5 mb-5 select-none">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wide text-black block mb-2">
                      Target CGPA Goal
                    </label>
                    <input
                      type="number"
                      value={targetCgpa}
                      onChange={(e) => setTargetCgpa(e.target.value)}
                      className="w-full text-base font-bold p-3.5 rounded-full border-2 border-black bg-white"
                      placeholder="e.g. 9.0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wide text-black block mb-2">
                      Remaining Credits
                    </label>
                    <input
                      type="number"
                      value={remainingCredits}
                      onChange={(e) => setRemainingCredits(e.target.value)}
                      className="w-full text-base font-bold p-3.5 rounded-full border-2 border-black bg-white"
                      placeholder="e.g. 18"
                    />
                  </div>
                </div>
              )}

              {mode !== "WHAT_IF" && (
                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 select-none">
                  {subjects.map((sub, idx) => (
                    <div
                      key={sub.id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 border-b-2 border-black/10 pb-4"
                    >
                      <div className="flex-1">
                        <label className="text-xs font-black uppercase tracking-wider block mb-2 text-black">
                          Course name
                        </label>
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) =>
                            handleSubjectChange(sub.id, "name", e.target.value)
                          }
                          className="w-full text-base font-bold p-3.5 rounded-full border-2 border-black select-none bg-white"
                        />
                      </div>

                      {mode === "PERCENTAGE" ? (
                        <div className="flex flex-col justify-end">
                          <label className="text-xs font-black uppercase tracking-wider block mb-2 text-black">
                            Marks
                          </label>
                          <input
                            type="number"
                            value={sub.marks}
                            onChange={(e) =>
                              handleSubjectChange(sub.id, "marks", e.target.value)
                            }
                            className="w-full sm:w-28 text-base font-bold p-3.5 rounded-full border-2 border-black text-center bg-white"
                            placeholder="88"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col justify-end">
                            <label className="text-xs font-black uppercase tracking-wider block mb-2 text-black">
                              Credits
                            </label>
                            <input
                              type="number"
                              value={sub.credits}
                              onChange={(e) =>
                                handleSubjectChange(sub.id, "credits", e.target.value)
                              }
                              className="w-full sm:w-24 text-base font-bold p-3.5 rounded-full border-2 border-black text-center bg-white"
                              placeholder="4"
                            />
                          </div>
                          <div className="flex flex-col justify-end">
                            <label className="text-xs font-black uppercase tracking-wider block mb-2 text-black">
                              Grade
                            </label>
                            <select
                              value={sub.grade}
                              onChange={(e) =>
                                handleSubjectChange(sub.id, "grade", e.target.value)
                              }
                              className="w-full sm:w-32 text-base font-bold p-3.5 rounded-full border-2 border-black bg-white cursor-pointer select-none"
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
                          className="border-2 border-black hover:bg-black hover:text-white p-2 font-black text-base select-none h-[54px] w-[54px] transition-all rounded-full flex items-center justify-center bg-white text-black"
                          title="Remove course"
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
                  className="w-full border-2 border-dashed border-black rounded-full hover:bg-black/5 p-3.5 font-black text-xs uppercase text-black transition-colors my-5 select-none"
                >
                  + Add Course
                </button>
              )}
            </div>

            <div>
              <button
                onClick={calculateResult}
                className="w-full bg-black text-white hover:bg-black/90 p-4 font-black rounded-full tracking-wider uppercase transition-all text-sm border-2 border-black shadow flex items-center justify-center select-none"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 mr-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  "Calculate"
                )}
              </button>

              {error && (
                <div className="border-2 border-black bg-white rounded-full p-4 mt-4 text-center text-xs font-black text-black">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between select-none">
            <div>
              <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-black border-b-2 border-black pb-2 mb-5 select-none">
                Analytics
              </h2>

              {isProcessing ? (
                <div className="border-2 border-black bg-white p-6 text-center my-4 select-none rounded-3xl flex flex-col items-center justify-center min-h-[160px] smooth-entry">
                  <div className="w-9 h-9 border-4 border-black spinner-round rounded-full mb-4"></div>
                  <span className="text-xs font-black uppercase">
                    Analyzing
                  </span>
                </div>
              ) : result ? (
                <div className="border-2 border-black bg-white p-6 text-center my-4 select-none smooth-entry rounded-3xl flex flex-col justify-between min-h-[180px] shadow">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-black/60">
                      Outcome
                    </span>
                    <div className="text-4xl sm:text-5xl font-black text-black tracking-tight mt-2 select-none">
                      {result}
                    </div>
                    {confidence && (
                      <div className="text-xs font-black uppercase text-black bg-black/5 px-4 py-1.5 mt-3 rounded-full border-2 border-black inline-block">
                        Risk Level: {confidence}
                      </div>
                    )}
                    {whatIfBreakdown && (
                      <p className="text-xs font-bold text-black leading-relaxed mt-4 border-t-2 border-black pt-4 border-dashed select-none">
                        {whatIfBreakdown}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="text-xs border-2 border-black bg-white hover:bg-black/5 text-black font-black px-5 py-2.5 rounded-full mt-5 transition-all self-center select-none"
                  >
                    Copy output
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-black p-6 text-center text-black font-black uppercase text-xs my-4 select-none flex flex-col items-center justify-center min-h-[160px] rounded-3xl">
                  <span>No data</span>
                </div>
              )}

              <div className="mt-5">
                <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wide text-black select-none">
                    Session history
                  </h3>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-xs bg-white hover:bg-black/5 border-2 border-black px-4 py-1.5 rounded-full font-black text-black transition-all select-none h-[34px] flex items-center justify-center"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2 select-none h-[120px] overflow-y-auto pr-1">
                  {history.length === 0 ? (
                    <span className="text-xs text-black italic font-bold">
                      No records.
                    </span>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="border-2 border-black p-3 bg-white rounded-2xl flex items-center justify-between text-xs font-bold shadow"
                      >
                        <div className="flex flex-col">
                          <span className="font-black text-xs uppercase text-black">
                            {item.title}
                          </span>
                          <span className="text-xs text-black/60">
                            {item.mode} • {item.date}
                          </span>
                        </div>
                        <span className="font-extrabold text-black text-sm">{item.result}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <footer className="text-xs border-t-2 border-black pt-4 mt-5 text-center text-black font-black tracking-widest uppercase select-none">
              Performance Tracker
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
