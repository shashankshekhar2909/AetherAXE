import { useState } from "react";
import { 
  Terminal, 
  Sparkles, 
  HelpCircle, 
  Cpu, 
  ArrowRight, 
  FileText, 
  ShieldAlert,
  Layers,
  Database,
  Grid,
  Info,
  Youtube
} from "lucide-react";
import ExtractionControls from "./components/ExtractionControls";
import ResultViewer from "./components/ResultViewer";
import PipelineIntegrations from "./components/PipelineIntegrations";
import { AdvancedOptions, ExtractionResult, PipelineProgress } from "./types";

export default function App() {
  const [progress, setProgress] = useState<PipelineProgress>({
    step: "idle",
    message: "",
    percent: 0,
  });

  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [briefSummary, setBriefSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);

  const fetchBriefSummary = async (markdown: string) => {
    setIsSummarizing(true);
    setSummarizeError(null);
    try {
      const summaryRes = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markdown }),
      });
      if (!summaryRes.ok) {
        const errData = await summaryRes.json();
        throw new Error(errData.error || "Failed to generate brief AI summary.");
      }
      const summaryData = await summaryRes.json();
      setBriefSummary(summaryData.summary);
    } catch (err: any) {
      console.error(err);
      setSummarizeError(err.message || "Failed to generate brief summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const startExtraction = async (url: string, file: File | null, options: AdvancedOptions) => {
    setError(null);
    setResult(null);
    setBriefSummary(null);
    setSummarizeError(null);
    setProgress({ 
      step: "detect", 
      message: "Parsing configuration & mapping document signatures...", 
      percent: 15 
    });

    try {
      const formData = new FormData();
      if (url) {
        formData.append("url", url);
      }
      if (file) {
        formData.append("file", file);
      }
      formData.append("options", JSON.stringify(options));

      // Simulate logical pipeline timeline stages
      const detectTimeout = setTimeout(() => {
        setProgress({ 
          step: "scrape", 
          message: url ? "Establishing secure browser bridge and raw HTTP scrape..." : "Mapping binary stream & reading text attributes...", 
          percent: 45 
        });
      }, 1200);

      const refineTimeout = setTimeout(() => {
        setProgress({ 
          step: "ai_refine", 
          message: "Enabling semantic repairs & layout healing via Gemini 3.5...", 
          percent: 75 
        });
      }, 3200);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      clearTimeout(detectTimeout);
      clearTimeout(refineTimeout);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "The extraction core backend returned an error.");
      }

      const data: ExtractionResult = await response.json();
      
      setProgress({ step: "done", message: "Synthesizing multi-format schema completed!", percent: 100 });
      setResult(data);
      
      // Automatically request the brief AI summary after document extraction
      fetchBriefSummary(data.markdown);

      setTimeout(() => {
        setProgress({ step: "idle", message: "", percent: 0 });
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected pipeline execution error occurred.");
      setProgress({ step: "error", message: "Extraction pipeline failed", percent: 0 });
    }
  };

  const handleDownloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApplyTemplate = (demoUrl: string) => {
    const urlInput = document.getElementById("web-target-url-input") as HTMLInputElement;
    if (urlInput) {
      urlInput.value = demoUrl;
      // Trigger a synthetic state change
      const event = new Event('input', { bubbles: true });
      urlInput.dispatchEvent(event);
      // Simply tell users to trigger the Extract button
    }
  };

  return (
    <div id="content-extraction-root-app" className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-indigo-500/10 selection:text-indigo-800">
      
      {/* Prime Header Block */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-indigo-600 uppercase">A.I-Ready Core</span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-[10px] bg-slate-100 text-slate-500 font-mono border border-slate-200 px-1.5 py-0.2 rounded">v1.2.0</span>
              </div>
              <h1 className="text-xl font-bold text-slate-805 tracking-tight">AetherAXE Extraction Engine</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
            <span>Server Ingress: <strong className="text-emerald-600 font-semibold uppercase">Active</strong></span>
            <span className="hidden md:inline">| Mode: <strong className="text-indigo-600 font-semibold text-[10px] bg-indigo-50 px-2 py-0.5 rounded">FULLSTACK</strong></span>
          </div>

        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 space-y-6">
        
        {/* Error panel wrapper */}
        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-start gap-3 text-sm animate-fadeIn">
            <ShieldAlert className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-800">Pipeline Ingestion Exception</p>
              <p className="text-rose-700 font-medium leading-relaxed">{error}</p>
              <p className="text-xs text-slate-500 pt-1">
                Verify if your **Gemini API Key** is correctly loaded in the **Secrets** panel or check document formatting constraints.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column A: controls (Width 5) */}
          <div className="lg:col-span-5 space-y-6">
            <ExtractionControls 
              onStartExtraction={startExtraction} 
              progress={progress}
              onReset={() => {
                setResult(null);
                setError(null);
                setBriefSummary(null);
                setSummarizeError(null);
                setProgress({ step: "idle", message: "", percent: 0 });
              }}
            />

            {/* Target Template Presets to solve unrequested "playground" pages while ensuring absolute interactivity */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-indigo-500" /> Pipeline Validation Presets
              </h4>

              <p className="text-xs text-slate-500 leading-relaxed">
                Choose an external ingestion target, paste it above, or select a validation demo below to test our parsing and healing pipeline formats:
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={() => handleApplyTemplate("https://raw.githubusercontent.com/expressjs/express/master/README.md")}
                  className="w-full text-left p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg transition-all flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div>
                    <p className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">Express.js API Reference (Clean Web MD)</p>
                    <p className="text-slate-400 font-mono mt-0.5">github.com/expressjs/express...</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </button>

                <button
                  onClick={() => handleApplyTemplate("https://arxiv.org/pdf/1706.03762.pdf")}
                  className="w-full text-left p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg transition-all flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div>
                    <p className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">Attention Is All You Need (Complex Research PDF)</p>
                    <p className="text-slate-400 font-mono mt-0.5">arxiv.org/pdf/1706.03762.pdf</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </button>

                <button
                  onClick={() => handleApplyTemplate("https://www.youtube.com/watch?v=zjkBMFhNj_g")}
                  className="w-full text-left p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg transition-all flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div>
                    <p className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">Space Exploration Documentary (YouTube Transcriber)</p>
                    <p className="text-slate-400 font-mono mt-0.5">youtube.com/watch?v=zjkBMFhNj_g</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </button>
              </div>
            </div>
          </div>

          {/* Column B: result viewer or empty showcase (Width 7) */}
          <div className="lg:col-span-7 h-full">
            {result ? (
              <div className="space-y-6 animate-fadeIn">
                <ResultViewer 
                  result={result} 
                  onDownloadFile={handleDownloadFile}
                  briefSummary={briefSummary}
                  isSummarizing={isSummarizing}
                  summarizeError={summarizeError}
                  onReSummarize={() => fetchBriefSummary(result.markdown)}
                />
                <PipelineIntegrations result={result} />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-6 flex flex-col justify-center items-center h-full min-h-[500px] shadow-sm">
                
                <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 border border-indigo-100">
                  <Database className="w-10 h-10" />
                </div>

                <div className="space-y-2 max-w-md">
                  <h3 className="text-slate-800 font-bold text-lg">Ready to Extract</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Add a URL or upload a file to begin.
                  </p>
                </div>

              </div>
            )}
          </div>

        </div>

      </main>

      {/* Subtle footer */}
      <footer className="border-t border-slate-200 mt-12 py-4 text-center text-xs text-slate-400 font-mono">
        Buildwithshashank
      </footer>

    </div>
  );
}
