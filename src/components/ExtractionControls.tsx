import React, { useState, useRef } from "react";
import { 
  Globe, 
  Upload, 
  Settings2, 
  Sparkles, 
  Cpu, 
  Terminal, 
  Layers, 
  Sliders, 
  Trash2,
  FileText,
  Youtube
} from "lucide-react";
import { AdvancedOptions, PipelineProgress } from "../types";

interface ExtractionControlsProps {
  onStartExtraction: (url: string, file: File | null, options: AdvancedOptions) => void;
  progress: PipelineProgress;
  onReset: () => void;
}

export default function ExtractionControls({ onStartExtraction, progress, onReset }: ExtractionControlsProps) {
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default parameters adhering to "RAG ingestion and document normalization" requirements
  const [options, setOptions] = useState<AdvancedOptions>({
    preserveTables: true,
    aiCleanupLevel: "standard",
    ocrFallback: true,
    simulateJsRendering: false,
    excludeNavAndFooters: true,
    generateEmbeddings: true,
    chunkingStrategy: "semantic",
    chunkSize: 500,
    chunkOverlap: 50,
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setUrl(""); // clear url if file is dropped
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUrl(""); // clear url if file selected
    }
  };

  const executeExtraction = () => {
    if (!url && !selectedFile) return;
    onStartExtraction(url, selectedFile, options);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isUrlYoutube = url.toLowerCase().includes("youtube.com") || url.toLowerCase().includes("youtu.be");

  return (
    <div id="extraction-controls-container" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* Target input dispatcher */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
          Source Input
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-440">
              {isUrlYoutube ? (
                <Youtube className="w-5 h-5 text-red-500" />
              ) : (
                <Globe className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <input
              id="web-target-url-input"
              type="text"
              placeholder="https://example.com/blog-post or YouTube URL"
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none transition-all"
              value={url}
              disabled={progress.step !== "idle"}
              onChange={(e) => {
                setUrl(e.target.value);
                if (e.target.value) setSelectedFile(null);
              }}
            />
          </div>

          <button
            id="trigger-extraction-button"
            disabled={(!url && !selectedFile) || progress.step !== "idle"}
            onClick={executeExtraction}
            className="sm:w-36 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none font-bold text-sm text-white rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-100"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>EXTRACT</span>
          </button>
        </div>
      </div>

      {/* File Dropzone */}
      {progress.step === "idle" && (
        <div
          id="document-drag-dropcone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer text-center ${
            isDragOver 
              ? "border-indigo-500 bg-indigo-50/40" 
              : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-305"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.docx,.xlsx,.xls,.csv,.zip,.txt,.md,.jpg,.jpeg,.png"
          />

          {selectedFile ? (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg max-w-lg mx-auto">
              <div className="flex items-center gap-3 text-left">
                <FileText className="w-8 h-8 text-indigo-500 flex-shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); removeFile(); }}
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-rose-500"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="inline-flex p-3 bg-indigo-50 rounded-full text-indigo-600 mb-1">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Drag & Drop file here, or <span className="text-indigo-600">browse local files</span>
              </p>
              <p className="text-xs text-slate-400">
                Supports PDF, Word (DOCX), Excel Sheets, CSV, ZIP bundles, Images, TXT, or MD (Max 30MB)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Advanced pipeline configure toggler */}
      <div className="pt-2 border-t border-slate-100">
        <button
          id="configure-options-toggle-button"
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest cursor-pointer"
        >
          <Settings2 className="w-4 h-4 text-slate-400" />
          <span>Advanced Pipeline Configurations</span>
          <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded ml-1">
            {showConfig ? "Collapse" : "Expand Options"}
          </span>
        </button>

        {showConfig && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-5 bg-slate-50 rounded-xl border border-slate-200 animate-fadeIn">
            
            {/* Options Set A */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" /> Normalization Layers
              </h4>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.preserveTables}
                  onChange={(e) => setOptions({ ...options, preserveTables: e.target.checked })}
                  className="rounded bg-white border-slate-200 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4"
                />
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                  Preserve table structures as formatted GFM tables
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.excludeNavAndFooters}
                  onChange={(e) => setOptions({ ...options, excludeNavAndFooters: e.target.checked })}
                  className="rounded bg-white border-slate-200 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4"
                />
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                  Prune web headers, footers, and banner ads
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={options.ocrFallback}
                  onChange={(e) => setOptions({ ...options, ocrFallback: e.target.checked })}
                  className="rounded bg-white border-slate-200 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4"
                />
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                  Enable Multimodal OCR fallback for scanned figures
                </span>
              </label>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">AI Cleanup Severity Level</label>
                <select
                  value={options.aiCleanupLevel}
                  onChange={(e) => setOptions({ ...options, aiCleanupLevel: e.target.value as any })}
                  className="w-full bg-white border border-slate-200 text-xs py-2 px-3 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                >
                  <option value="none">Raw parsing (No AI cleaning)</option>
                  <option value="conservative">Conservative formatting alignment</option>
                  <option value="standard">Standard healing & structured TOC</option>
                  <option value="aggressive">Aggressive summarization & pruning</option>
                </select>
              </div>
            </div>

            {/* Options Set B */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Chunking Parameters
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Semantic Chunking Setup</label>
                  <select
                    value={options.chunkingStrategy}
                    onChange={(e) => setOptions({ ...options, chunkingStrategy: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 text-xs py-2 px-3 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  >
                    <option value="none">No chunking (Single raw block)</option>
                    <option value="semantic">Semantic flow analysis (Hierarchical)</option>
                    <option value="heading">Heading-oriented split mapping</option>
                    <option value="token">Maximum sliding token size split</option>
                  </select>
                </div>

                {options.chunkingStrategy !== "none" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Size (Words)</label>
                      <input
                        type="number"
                        min="50"
                        max="2000"
                        value={options.chunkSize}
                        onChange={(e) => setOptions({ ...options, chunkSize: parseInt(e.target.value) || 500 })}
                        className="w-full bg-white border border-slate-200 text-xs py-1.5 px-3 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Overlap (Words)</label>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={options.chunkOverlap}
                        onChange={(e) => setOptions({ ...options, chunkOverlap: parseInt(e.target.value) || 50 })}
                        className="w-full bg-white border border-slate-200 text-xs py-1.5 px-3 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer group pt-1">
                  <input
                    type="checkbox"
                    checked={options.generateEmbeddings}
                    onChange={(e) => setOptions({ ...options, generateEmbeddings: e.target.checked })}
                    className="rounded bg-white border-slate-200 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4"
                  />
                  <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                    Pre-compute high-contrast semantic vector embeddings (32d)
                  </span>
                </label>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Progress execution flow timeline */}
      {progress.step !== "idle" && (
        <div className="mt-4 p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Ingestion Pipeline: <span className="text-indigo-600">{progress.message}</span>
            </span>
            <span className="text-slate-500 font-mono">{progress.percent}%</span>
          </div>

          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          {/* Core architecture execution sequence status visualization */}
          <div className="grid grid-cols-5 text-[10px] uppercase font-bold text-slate-400">
            <div className={`text-center ${progress.percent >= 20 ? "text-indigo-600 font-black" : ""}`}>Scrape</div>
            <div className={`text-center ${progress.percent >= 40 ? "text-indigo-600 font-black" : ""}`}>Clean</div>
            <div className={`text-center ${progress.percent >= 60 ? "text-indigo-600 font-black" : ""}`}>Heal</div>
            <div className={`text-center ${progress.percent >= 80 ? "text-indigo-600 font-black" : ""}`}>Enrich</div>
            <div className={`text-center ${progress.percent >= 100 ? "text-emerald-650 font-black" : ""}`}>Synth</div>
          </div>
        </div>
      )}

    </div>
  );
}
