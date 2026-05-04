"use client";

import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<Mode>("PERCENTAGE");
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: 1, name: "Mod 1", credits: "4", grade: "S", marks: "" },
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
    const savedHistory = localStorage.getItem("platform_history_m");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        localStorage.removeItem("platform_history_m");
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
    localStorage.setItem("platform_history_m", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("platform_history_m");
  };

  const addSubject = () => {
    const newId = subjects.length ? Math.max(...subjects.map((s) => s.id)) + 1 : 1;
    setSubjects([
      ...subjects,
      { id: newId, name: `Mod ${newId}`, credits: "4", grade: "A", marks: "" },
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
          breakdown = "Requires exceptional focus. Target S (10) grades across modules.";
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

  const generatePdf = async () => {
    if (!result) return;
    const doc = new jsPDF();

    const getBase64Image = (url: string): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } else {
            resolve("");
          }
        };
        img.onerror = () => resolve("");
      });
    };

    const logoBase64 = await getBase64Image("/Logo.png");

    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, 210, 16, "F");

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", 182, 3, 10, 10);
      } catch (e) {
        // Fallback for any image format handling
      }
    }
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("GetYourGrades - Ayush", 14, 11);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 14, 26);

    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text(`Performance Profile - ${mode} Analysis`, 14, 34);

    if (mode === "CGPA" || mode === "WHAT_IF") {
      doc.setFontSize(10);
      doc.text(`Prior Status Balance: ${prevCgpa || "N/A"} CGPA (${prevCredits || "0"} credits)`, 14, 42);
    }
    if (mode === "WHAT_IF") {
      doc.setFontSize(10);
      doc.text(`Goal Target: ${targetCgpa || "N/A"} CGPA (${remainingCredits || "0"} rem credits)`, 14, 48);
    }

    const tableRows: any[][] = [];
    if (mode !== "WHAT_IF") {
      subjects.forEach((s) => {
        if (mode === "PERCENTAGE") {
          tableRows.push([s.name, `${s.marks} / 100`]);
        } else {
          tableRows.push([s.name, s.credits, s.grade]);
        }
      });
      autoTable(doc, {
        head: [mode === "PERCENTAGE" ? ["Module Name", "Obtained Marks"] : ["Module Name", "Credits", "Obtained Grade"]],
        body: tableRows,
        startY: (mode === "CGPA") ? 52 : 38,
        theme: "striped",
        headStyles: { fillColor: [30, 30, 30] },
      });
    }

    const finalY = (mode === "WHAT_IF") ? 56 : (doc as any).lastAutoTable.finalY + 12;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Overall Calculated Outcome: ${result}`, 14, finalY);

    if (whatIfBreakdown) {
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Breakdown Target: ${whatIfBreakdown}`, 14, finalY + 7);
    }

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const formulaText = mode === "PERCENTAGE"
      ? "Formula Applied: Sum of Scores / Count"
      : mode === "SGPA"
      ? "Formula Applied: Σ(Credits × Points) / Σ(Credits)"
      : mode === "CGPA"
      ? "Formula Applied: (Prior Points Balance + Semester Points) / Net Total Credits"
      : "Formula Applied: Net Needed Balance / Remaining Module Base Sizing";
    doc.text(formulaText, 14, finalY + (whatIfBreakdown ? 16 : 9));

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, finalY + 44, 80, finalY + 44);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text("Verified Signature", 14, finalY + 49);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Developed by Ayush Kathil • Page 1 of 1", 14, 285);

    doc.save(`Performance_Report_${mode}.pdf`);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-start py-4 sm:py-6 px-3 sm:px-16 smooth-entry transition-colors duration-300 select-none font-normal ${
      isDark ? "bg-[#09090b] text-[#f4f4f5]" : "bg-[#fcfcfd] text-[#111111]"
    }`}>
      <div className="w-full max-w-6xl flex flex-col flex-1 gap-4 sm:gap-6 bg-transparent select-none font-normal">

        {/* Navigation Bar */}
        <nav className={`flex items-center justify-between border-b pb-3 gap-3 select-none ${
          isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
        }`}>
          <div className="flex items-center gap-3">
            <img src="/Logo.png" alt="Platform logo" className="h-10 w-10 sm:h-14 sm:w-14 object-contain flex-shrink-0" />
            <div>
              <h1 className="text-xl sm:text-3xl font-normal tracking-tight leading-none select-none">
                Academic Analytics
              </h1>
              <p className={`text-[10px] sm:text-xs font-normal mt-1 sm:mt-1.5 select-none ${
                isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
              }`}>
                Advanced planning metrics & dynamic performance scoring
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2.5">
              <button
                onClick={() => setShowFormula(!showFormula)}
                className={`text-xs sm:text-sm font-normal px-4 py-2.5 rounded-full border transition-all h-[40px] flex items-center justify-center select-none ${
                  isDark
                    ? "bg-[#18181b] border-[#27272a] text-[#f4f4f5] hover:bg-[#27272a]"
                    : "bg-white border-[#e4e4e7] text-[#1c1d20] hover:bg-[#f4f4f5]"
                }`}
              >
                {showFormula ? "Hide Formula" : "Formulas"}
              </button>
              <button
                onClick={() => setIsDark(!isDark)}
                className={`text-xs sm:text-sm font-normal px-4 py-2.5 rounded-full border transition-all h-[40px] flex items-center justify-center select-none ${
                  isDark
                    ? "bg-[#18181b] border-[#27272a] text-[#f4f4f5] hover:bg-[#27272a]"
                    : "bg-white border-[#e4e4e7] text-[#1c1d20] hover:bg-[#f4f4f5]"
                }`}
              >
                {isDark ? "Light theme" : "Dark theme"}
              </button>
            </div>

            {/* Mobile Sidebar Menu Hamburger */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`md:hidden p-2 font-normal text-xl h-[38px] w-[38px] border rounded-full transition-colors flex items-center justify-center select-none ${
                isDark ? "border-[#27272a] text-white hover:bg-[#18181b]" : "border-[#e4e4e7] text-black hover:bg-[#f4f4f5]"
              }`}
            >
              ☰
            </button>
          </div>
        </nav>

        {/* Sliding Sidebar Menu overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all smooth-entry select-none font-normal">
            <div className={`w-4/5 sm:w-2/3 h-full p-4 shadow-2xl flex flex-col justify-between border-l select-none font-normal ${
              isDark ? "bg-[#09090b] text-[#f4f4f5] border-[#27272a]" : "bg-[#fcfcfd] text-[#111111] border-[#e4e4e7]"
            }`}>
              <div className="flex flex-col gap-3 font-normal">
                <div className="flex items-center justify-between border-b pb-2.5 mb-1">
                  <h3 className="text-base font-normal tracking-tight">Navigation</h3>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className={`h-8 w-8 border rounded-full font-normal flex items-center justify-center ${
                      isDark ? "border-[#27272a] hover:bg-[#18181b]" : "border-[#e4e4e7] hover:bg-[#f4f4f5]"
                    }`}
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-1 font-normal">
                  {(["PERCENTAGE", "SGPA", "CGPA", "WHAT_IF"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        setResult(null);
                        setWhatIfBreakdown(null);
                        setConfidence(null);
                        setError(null);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-3 px-4 text-xs font-normal border rounded-full transition-all select-none ${
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

                <div className="flex flex-col gap-2 border-t pt-2.5 font-normal">
                  <button
                    onClick={() => {
                      setShowFormula(!showFormula);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full py-2.5 px-4 border text-xs font-normal rounded-full transition-colors text-center ${
                      isDark ? "border-[#27272a] bg-[#18181b]" : "border-[#e4e4e7] bg-white"
                    }`}
                  >
                    {showFormula ? "Hide Formulas" : "View Formulas"}
                  </button>
                  <button
                    onClick={() => {
                      setIsDark(!isDark);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full py-2.5 px-4 border text-xs font-normal rounded-full transition-colors text-center ${
                      isDark ? "border-[#27272a] bg-[#18181b]" : "border-[#e4e4e7] bg-white"
                    }`}
                  >
                    Set to {isDark ? "Light mode" : "Dark mode"}
                  </button>
                </div>
              </div>

              <div className="border-t pt-2.5 text-center font-normal">
                <span className="text-[10px] tracking-wider uppercase">Academic Hub</span>
              </div>
            </div>
          </div>
        )}

        {showFormula && (
          <div className={`border rounded-xl p-4 mb-2 text-xs sm:text-sm transition-colors smooth-entry select-none font-normal ${
            isDark ? "border-[#27272a] bg-[#18181b] text-[#f4f4f5]" : "border-[#e4e4e7] bg-white text-[#111111]"
          }`}>
            <h3 className="font-normal uppercase tracking-wide text-xs mb-2">
              Formula Reference
            </h3>
            <ul className="space-y-1 list-disc list-inside font-normal">
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

        {/* Tab Switcher */}
        <div className="hidden md:flex flex-wrap gap-2 border-b pb-3 select-none border-transparent font-normal">
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
              className={`py-3 px-6 rounded-full text-xs sm:text-base font-normal tracking-wide transition-all border select-none ${
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

        {/* Responsive columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 font-normal">
          <div className="md:col-span-2 flex flex-col justify-between font-normal">
            <div className="mb-3 font-normal">
              <h2 className={`text-[10px] sm:text-xs font-normal tracking-wider uppercase border-b pb-1 mb-4 select-none ${
                isDark ? "text-[#71717a] border-[#27272a]" : "text-[#a1a1aa] border-[#e4e4e7]"
              }`}>
                Entry Panel
              </h2>

              {/* Context inputs for specific modes */}
              {(mode === "CGPA" || mode === "WHAT_IF") && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 border-b border-dashed pb-3 sm:pb-4 mb-3 sm:mb-4 select-none ${
                  isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
                }`}>
                  <div>
                    <label className={`text-[10px] sm:text-xs font-normal uppercase tracking-wide block mb-1.5 ${
                      isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                    }`}>
                      Current CGPA
                    </label>
                    <input
                      type="number"
                      value={prevCgpa}
                      onChange={(e) => setPrevCgpa(e.target.value)}
                      className={`w-full text-xs sm:text-base font-normal p-3 rounded-full border transition-colors bg-transparent ${
                        isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                      }`}
                      placeholder="e.g. 8.4"
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] sm:text-xs font-normal uppercase tracking-wide block mb-1.5 ${
                      isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                    }`}>
                      Current Credits
                    </label>
                    <input
                      type="number"
                      value={prevCredits}
                      onChange={(e) => setPrevCredits(e.target.value)}
                      className={`w-full text-xs sm:text-base font-normal p-3 rounded-full border transition-colors bg-transparent ${
                        isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                      }`}
                      placeholder="e.g. 72"
                    />
                  </div>
                </div>
              )}

              {/* Goal metrics specifically for What-If planner */}
              {mode === "WHAT_IF" && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 border-b border-dashed pb-3 sm:pb-4 mb-3 sm:mb-4 select-none font-normal ${
                  isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
                }`}>
                  <div>
                    <label className={`text-[10px] sm:text-xs font-normal uppercase tracking-wide block mb-1.5 ${
                      isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                    }`}>
                      Target CGPA Goal
                    </label>
                    <input
                      type="number"
                      value={targetCgpa}
                      onChange={(e) => setTargetCgpa(e.target.value)}
                      className={`w-full text-xs sm:text-base font-normal p-3 rounded-full border transition-colors bg-transparent ${
                        isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                      }`}
                      placeholder="e.g. 9.0"
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] sm:text-xs font-normal uppercase tracking-wide block mb-1.5 ${
                      isDark ? "text-[#a1a1aa]" : "text-[#71717a]"
                    }`}>
                      Remaining Credits
                    </label>
                    <input
                      type="number"
                      value={remainingCredits}
                      onChange={(e) => setRemainingCredits(e.target.value)}
                      className={`w-full text-xs sm:text-base font-normal p-3 rounded-full border transition-colors bg-transparent ${
                        isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                      }`}
                      placeholder="e.g. 18"
                    />
                  </div>
                </div>
              )}

              {/* Scroll-isolated container */}
              {mode !== "WHAT_IF" && (
                <div className="space-y-2 max-h-[290px] sm:max-h-[320px] overflow-y-auto pr-1 select-none font-normal">
                  {subjects.map((sub) => (
                    <div
                      key={sub.id}
                      className={`flex items-center justify-between gap-2.5 sm:gap-4 border-b pb-2 ${
                        isDark ? "border-[#27272a]" : "border-[#f4f4f5]"
                      }`}
                    >
                      <div className="flex-1 font-normal">
                        <label className="sr-only font-normal">Module Title</label>
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) =>
                            handleSubjectChange(sub.id, "name", e.target.value)
                          }
                          placeholder="Module"
                          className={`w-full text-xs sm:text-base font-normal p-2.5 rounded-full border transition-colors bg-transparent select-none ${
                            isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                          }`}
                        />
                      </div>

                      {mode === "PERCENTAGE" ? (
                        <div className="w-16 sm:w-28 flex-shrink-0 font-normal">
                          <label className="sr-only">Marks (/100)</label>
                          <input
                            type="number"
                            value={sub.marks}
                            onChange={(e) =>
                              handleSubjectChange(sub.id, "marks", e.target.value)
                            }
                            className={`w-full text-xs sm:text-base font-normal p-2.5 rounded-full border transition-colors text-center bg-transparent ${
                              isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                            }`}
                            placeholder="88"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="w-14 sm:w-24 flex-shrink-0 font-normal">
                            <label className="sr-only">Credits</label>
                            <input
                              type="number"
                              value={sub.credits}
                              onChange={(e) =>
                                handleSubjectChange(sub.id, "credits", e.target.value)
                              }
                              className={`w-full text-xs sm:text-base font-normal p-2.5 rounded-full border transition-colors text-center bg-transparent ${
                                isDark ? "border-[#27272a] focus:border-[#f4f4f5]" : "border-[#e4e4e7] focus:border-[#111111]"
                              }`}
                              placeholder="4"
                            />
                          </div>
                          <div className="w-20 sm:w-32 flex-shrink-0 font-normal">
                            <label className="sr-only">Grade</label>
                            <select
                              value={sub.grade}
                              onChange={(e) =>
                                handleSubjectChange(sub.id, "grade", e.target.value)
                              }
                              className={`w-full text-xs sm:text-base font-normal p-2.5 rounded-full border transition-colors cursor-pointer select-none bg-transparent ${
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

                      <div className="flex-shrink-0 font-normal">
                        <button
                          onClick={() => removeSubject(sub.id)}
                          className={`border p-1.5 font-normal text-xs sm:text-base select-none h-[36px] w-[36px] sm:h-[48px] sm:w-[48px] transition-colors rounded-full flex items-center justify-center ${
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
                  className={`w-full border border-dashed rounded-full p-2.5 sm:p-3.5 font-normal tracking-wide text-[10px] sm:text-xs uppercase transition-colors my-2.5 select-none ${
                    isDark
                      ? "border-[#27272a] hover:bg-[#18181b] text-[#a1a1aa]"
                      : "border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#71717a]"
                  }`}
                >
                  + Add module entry
                </button>
              )}
            </div>

            <div className="font-normal">
              {/* Calculate Button is permanently visible */}
              <button
                onClick={calculateResult}
                className={`w-full p-3.5 font-normal rounded-full tracking-wider uppercase transition-all text-xs sm:text-sm border flex items-center justify-center select-none ${
                  isDark
                    ? "bg-[#f4f4f5] border-[#f4f4f5] text-[#09090b] hover:bg-white"
                    : "bg-[#111111] border-[#111111] text-[#fcfcfd] hover:bg-black"
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 mr-2.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Calculating insights...
                  </>
                ) : (
                  "Calculate"
                )}
              </button>

              {error && (
                <div className={`border rounded-full p-2.5 mt-3 text-center text-xs font-normal ${
                  isDark ? "border-[#27272a] bg-[#18181b] text-red-400" : "border-[#e4e4e7] bg-[#fdf2f2] text-red-600"
                }`}>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Output analytics columns */}
          <div className="flex flex-col justify-between select-none font-normal">
            <div>
              <h2 className={`text-[10px] sm:text-xs font-normal tracking-wider uppercase border-b pb-1 mb-4 select-none ${
                isDark ? "text-[#71717a] border-[#27272a]" : "text-[#a1a1aa] border-[#e4e4e7]"
              }`}>
                Analysis Result
              </h2>

              {isProcessing ? (
                <div className={`border p-5 text-center my-3 select-none rounded-2xl flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] smooth-entry ${
                  isDark ? "border-[#27272a] bg-[#18181b]" : "border-[#e4e4e7] bg-white"
                }`}>
                  <div className={`w-8 h-8 border-4 spinner-round rounded-full mb-3 ${
                    isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
                  }`}></div>
                  <span className="text-[10px] font-normal uppercase tracking-wide">
                    Calculating
                  </span>
                </div>
              ) : result ? (
                <div className={`border p-5 text-center my-3 select-none smooth-entry rounded-2xl flex flex-col justify-between min-h-[150px] sm:min-h-[170px] ${
                  isDark ? "border-[#27272a] bg-[#18181b]" : "border-[#e4e4e7] bg-white"
                }`}>
                  <div>
                    <span className="text-[10px] sm:text-xs font-normal uppercase tracking-widest">
                      Calculated Data
                    </span>
                    <div className={`text-4xl sm:text-5xl font-normal tracking-tight mt-1 select-none ${
                      isDark ? "text-white" : "text-[#111111]"
                    }`}>
                      {result}
                    </div>
                    {confidence && (
                      <div className={`text-[10px] font-normal uppercase px-3.5 py-1 mt-2.5 rounded-full border inline-block ${
                        isDark ? "border-[#27272a] bg-[#18181b] text-[#a1a1aa]" : "border-[#e4e4e7] bg-[#f4f4f5] text-[#71717a]"
                      }`}>
                        Difficulty: {confidence}
                      </div>
                    )}
                    {whatIfBreakdown && (
                      <p className={`text-[11px] sm:text-xs font-normal leading-relaxed mt-3 border-t pt-3 border-dashed select-none ${
                        isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
                      }`}>
                        {whatIfBreakdown}
                      </p>
                    )}
                  </div>
                  {/* Export to PDF Button directly replaces Copy button */}
                  <button
                    onClick={generatePdf}
                    className={`text-[10px] sm:text-xs border font-normal px-4 py-2 rounded-full mt-4 transition-all self-center select-none ${
                      isDark
                        ? "bg-[#18181b] border-[#27272a] text-[#f4f4f5] hover:bg-[#27272a]"
                        : "bg-white border-[#e4e4e7] text-[#111111] hover:bg-[#f4f4f5]"
                    }`}
                  >
                    Export to PDF
                  </button>
                </div>
              ) : (
                <div className={`border border-dashed p-5 text-center font-normal uppercase text-[10px] sm:text-xs my-3 select-none flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] rounded-2xl ${
                  isDark ? "border-[#27272a] text-[#71717a]" : "border-[#e4e4e7] text-[#a1a1aa]"
                }`}>
                  <span>No active metrics</span>
                </div>
              )}

              {/* Advanced History Logs */}
              <div className="mt-4">
                <div className={`flex justify-between items-center border-b pb-1 mb-2.5 ${
                  isDark ? "border-[#27272a]" : "border-[#e4e4e7]"
                }`}>
                  <h3 className={`text-[9px] sm:text-xs font-normal uppercase tracking-wide select-none ${
                    isDark ? "text-[#71717a]" : "text-[#a1a1aa]"
                  }`}>
                    Calculation Logs
                  </h3>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className={`text-[9px] sm:text-xs font-normal px-3 py-1 rounded-full border transition-all h-[26px] flex items-center justify-center select-none ${
                        isDark
                          ? "bg-[#18181b] border-[#27272a] text-[#f4f4f5] hover:bg-[#27272a]"
                          : "bg-white border-[#e4e4e7] text-[#1c1d20] hover:bg-[#f4f4f5]"
                      }`}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 select-none h-[110px] sm:h-[120px] overflow-y-auto pr-0.5 font-normal">
                  {history.length === 0 ? (
                    <span className={`text-[10px] sm:text-xs italic font-normal ${
                      isDark ? "text-[#71717a]" : "text-[#a1a1aa]"
                    }`}>
                      No recorded logs.
                    </span>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className={`border p-2.5 rounded-xl flex items-center justify-between text-xs transition-colors ${
                          isDark ? "border-[#27272a] bg-[#18181b]" : "border-[#f4f4f5] bg-white"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-normal text-[10px] sm:text-base uppercase ${
                            isDark ? "text-[#f4f4f5]" : "text-[#1c1d20]"
                          }`}>
                            {item.title}
                          </span>
                          <span className={`text-[8px] sm:text-xs ${
                            isDark ? "text-[#71717a]" : "text-[#a1a1aa]"
                          }`}>
                            {item.mode} • {item.date}
                          </span>
                        </div>
                        <span className={`font-normal text-xs sm:text-base ${
                          isDark ? "text-[#f4f4f5]" : "text-[#1c1d20]"
                        }`}>{item.result}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Ayush Kathil Branded Developer Footer with social links */}
            <footer className={`text-xs sm:text-sm border-t pt-4 sm:pt-6 mt-4 sm:mt-6 flex flex-col items-center justify-center gap-3 font-normal select-none ${
              isDark ? "border-[#27272a] text-[#71717a]" : "border-[#e4e4e7] text-[#a1a1aa]"
            }`}>
              <div className="text-center font-normal flex flex-col gap-1 leading-normal select-none">
                <span className={`${isDark ? "text-[#a1a1aa]" : "text-[#111111]"}`}>
                  Developed by Ayush Kathil
                </span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/Ayush-kathil"
                  target="_blank"
                  rel="noreferrer"
                  className={`text-[11px] sm:text-xs font-normal flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 border rounded-full transition-all select-none hover:opacity-90 ${
                    isDark
                      ? "bg-[#18181b] border-[#27272a] text-white hover:bg-[#27272a]"
                      : "bg-[#24292e] border-[#24292e] text-white"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12"/>
                  </svg>
                  <span>GitHub</span>
                </a>
                <a
                  href="https://www.linkedin.com/in/ayushkathil/"
                  target="_blank"
                  rel="noreferrer"
                  className={`text-[11px] sm:text-xs font-normal flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 border rounded-full transition-all select-none hover:opacity-90 ${
                    isDark
                      ? "bg-[#18181b] border-[#27272a] text-white hover:bg-[#27272a]"
                      : "bg-[#0077b5] border-[#0077b5] text-white"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  <span>LinkedIn</span>
                </a>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
