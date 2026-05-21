import React, { useState } from "react";
import Markdown from "react-markdown";
import { 
  FileText, 
  Eye, 
  Layers, 
  Settings, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  Bookmark, 
  ExternalLink,
  ChevronDown,
  Info,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { ExtractionResult } from "../types";

interface ResultViewerProps {
  result: ExtractionResult;
  onDownloadFile: (content: string, filename: string, type: string) => void;
  briefSummary: string | null;
  isSummarizing: boolean;
  summarizeError: string | null;
  onReSummarize: () => void;
}

export default function ResultViewer({ 
  result, 
  onDownloadFile,
  briefSummary,
  isSummarizing,
  summarizeError,
  onReSummarize
}: ResultViewerProps) {
  const [activeTab, setActiveTab] = useState<"markdown" | "preview" | "chunks" | "metadata">("markdown");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleExportMarkdown = () => {
    const filename = `${result.metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-clean.md`;
    onDownloadFile(result.markdown, filename, "text/markdown");
  };

  const handleExportJSON = () => {
    const filename = `${result.metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-metadata.json`;
    onDownloadFile(JSON.stringify(result, null, 2), filename, "application/json");
  };

  return (
    <div id="results-display-viewer" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
      
      {/* Dynamic Summary bar representing Document health and status details */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
            {result.metadata.contentType} Resource
          </span>
          <h3 className="text-base font-bold text-slate-800 mt-1 line-clamp-1">{result.metadata.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Confidence: <span className="text-emerald-600 font-semibold font-mono">{(result.metadata.confidenceScore * 100).toFixed(0)}%</span> | 
            Words: <span className="text-slate-705 font-semibold font-mono">{result.metadata.wordCount}</span> | 
            Chunks: <span className="text-slate-705 font-semibold font-mono">{result.chunks.length}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>MD</span>
          </button>
          
          <button 
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>JSON</span>
          </button>

          <button 
            onClick={() => copyToClipboard(result.markdown, "full_md")}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
          >
            {copiedText === "full_md" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy MD</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Structured tab controls */}
      <div className="bg-slate-50 px-6 border-b border-slate-200 flex overflow-x-auto text-sm">
        <button
          onClick={() => setActiveTab("markdown")}
          className={`py-3 px-4 border-b-2 font-semibold flex items-center gap-2 flex-shrink-0 transition-all ${
            activeTab === "markdown" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Clean Markdown</span>
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`py-3 px-4 border-b-2 font-semibold flex items-center gap-2 flex-shrink-0 transition-all ${
            activeTab === "preview" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Live Reader Preview</span>
        </button>

        <button
          onClick={() => setActiveTab("chunks")}
          className={`py-3 px-4 border-b-2 font-semibold flex items-center gap-2 flex-shrink-0 transition-all ${
            activeTab === "chunks" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>RAG Assets & Chunks</span>
        </button>

        <button
          onClick={() => setActiveTab("metadata")}
          className={`py-3 px-4 border-b-2 font-semibold flex items-center gap-2 flex-shrink-0 transition-all ${
            activeTab === "metadata" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>JSON Metadata</span>
        </button>
      </div>

      {/* Split layout: active tab main panel + brief summary alongside */}
      <div id="results-split-inner-layout" className="flex-1 flex flex-col lg:flex-row min-h-0 min-h-[500px]">
        
        {/* Left / Main interactive content */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[1600px] bg-white border-b lg:border-b-0 lg:border-r border-slate-150">
        
        {/* Tab 1: Raw Markdown Editor/Viewer */}
        {activeTab === "markdown" && (
          <div className="relative h-full animate-fadeIn">
            <pre className="p-4 bg-[#0f172a] border border-slate-800 rounded-lg text-xs leading-relaxed font-mono overflow-auto text-slate-200 max-h-[800px]">
              {result.markdown}
            </pre>
          </div>
        )}

        {/* Tab 2: Standard Reader View */}
        {activeTab === "preview" && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 max-h-[820px] overflow-auto animate-fadeIn select-text shadow-inner">
            
            {/* Header section representing nice reader formatting */}
            <div className="pb-6 border-b border-slate-200 mb-6">
              <h1 className="text-3xl font-bold font-sans text-slate-900 tracking-tight leading-tight">{result.metadata.title}</h1>
              <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-3 font-mono">
                {result.metadata.author !== "Unknown" && (
                  <span>By: <span className="text-slate-750 font-bold">{result.metadata.author}</span></span>
                )}
                {result.metadata.date !== "Unknown" && (
                  <span>Published: <span className="text-slate-755 font-bold">{result.metadata.date}</span></span>
                )}
                {result.metadata.sourceUrl && (
                  <a 
                    href={result.metadata.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                  >
                    <span>View original source</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Custom styled markdown-body using index.css GFM guidelines */}
            <div className="markdown-body">
              <Markdown>{result.markdown}</Markdown>
            </div>
          </div>
        )}

        {/* Tab 3: RAG Semantic Chunker details */}
        {activeTab === "chunks" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-indigo-50/60 border border-indigo-150 p-3.5 rounded-lg leading-relaxed">
              <Info className="w-4.5 h-4.5 text-indigo-600 flex-shrink-0" />
              <span>
                These **Hierarchical Headings Chunks** were generated semantically. Parent breadcrumbs track each section to prevent context degradation in vector searches!
              </span>
            </div>

            <div className="space-y-4">
              {result.chunks.map((ch, idx) => (
                <div key={ch.id} className="bg-slate-50 border border-slate-200 rounded-lg p-5 hover:bg-slate-50/50 hover:border-slate-300 transition-colors">
                  <div className="flex flex-wrap gap-2 items-center justify-between border-b border-slate-200 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-200 text-slate-750 font-mono font-bold px-2 py-0.5 rounded">
                        CHUNK #{idx + 1}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Words: {ch.content.split(/\s+/).length} | Tokens: {ch.tokenCount}
                      </span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(ch.content, `chunk_${ch.id}`)}
                      className="text-xs hover:text-indigo-600 text-slate-500 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedText === `chunk_${ch.id}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Chunk</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Hierarchical Breadcrumbs representing prompt alignment map */}
                  {ch.headingContext && ch.headingContext.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-600 mb-2 font-mono truncate">
                      {ch.headingContext.map((head, hIdx) => (
                        <React.Fragment key={hIdx}>
                          {hIdx > 0 && <span className="text-slate-400">&gt;</span>}
                          <span className="truncate max-w-[124px]">{head}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-slate-700 leading-relaxed font-sans">{ch.content}</p>

                  {/* Embedding Vector visualize bar */}
                  {ch.embedding && (
                    <div className="mt-3.5 pt-3 border-t border-slate-205">
                      <p className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5 text-indigo-600" /> Embedded Vector Map (32 Dimensions Preview)
                      </p>
                      <div className="flex flex-wrap gap-1 font-mono text-[9px]">
                        {ch.embedding.map((v, vIdx) => (
                          <span key={vIdx} className="bg-slate-100 border border-slate-200 text-slate-600 px-1 py-0.5 rounded">
                            {v.toFixed(3)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Metadata output Inspector */}
        {activeTab === "metadata" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            
            {/* Metadata table of details */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Executive Summary</h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 border border-slate-200 rounded-lg italic">
                  "{result.metadata.summary}"
                </p>
              </div>

              {/* Entity extraction tags visualizer */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Core Entities Spotted</h4>
                <div className="flex flex-wrap gap-2">
                  {result.metadata.entities.map((ent, idx) => (
                    <span key={idx} className="bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                      {ent}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tags panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Classified Subject Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {result.metadata.tags.map((tag, idx) => (
                    <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-650 text-xs px-2.5 py-1 rounded font-bold">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Raw JSON Schema payload</h4>
                <pre className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono overflow-auto text-slate-200 max-h-[300px]">
                  {JSON.stringify(result.metadata, null, 2)}
                </pre>
              </div>
            </div>

            {/* Logical Table of contents layout representation */}
            <div className="bg-slate-50 border border-slate-205 rounded-xl p-5 space-y-4 h-fit">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-200 pb-3">
                <Bookmark className="w-3.5 h-3.5 text-indigo-600" /> Structural Sections (TOC)
              </h4>
              <nav className="space-y-2 max-h-[400px] overflow-auto">
                {result.metadata.toc.length > 0 ? (
                  result.metadata.toc.map((entry, idx) => (
                    <div 
                      key={idx} 
                      style={{ paddingLeft: `${(entry.level - 1) * 12}px` }}
                      className="text-xs transition-colors"
                    >
                      <span className="text-indigo-600 font-bold mr-1.5">
                        {"#".repeat(entry.level)}
                      </span>
                      <span className="text-slate-700 font-semibold">
                        {entry.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No logical sections generated</p>
                )}
              </nav>
            </div>

          </div>
        )}

      </div>

      {/* Alongside brief AI Summary column (Right Sidebar) */}
      <div id="aside-brief-summary" className="w-full lg:w-[280px] xl:w-[320px] bg-slate-50 p-6 flex flex-col gap-4 overflow-y-auto border-t lg:border-t-0 border-slate-200">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 select-none">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-650 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Brief AI Summary</h4>
          </div>
          {onReSummarize && !isSummarizing && (
            <button 
              onClick={onReSummarize}
              className="p-1 hover:bg-slate-200 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
              title="Regenerate brief summary"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-start min-h-0">
          {isSummarizing ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-3 select-none">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
              <div>
                <p className="text-xs font-semibold text-slate-700">Generating Summary...</p>
                <p className="text-[10px] text-slate-400 mt-1">Analyzing cleaned markdown with LLM</p>
              </div>
            </div>
          ) : summarizeError ? (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-xs space-y-2 select-none">
              <p className="font-semibold text-rose-800">Summarization Failed</p>
              <p className="text-rose-600 leading-relaxed font-medium">{summarizeError}</p>
              <button 
                onClick={onReSummarize}
                className="px-2.5 py-1 bg-white hover:bg-slate-55 border border-rose-250 text-[10px] font-semibold text-rose-700 rounded transition-colors cursor-pointer shadow-sm w-full"
              >
                Retry Summary
              </button>
            </div>
          ) : briefSummary ? (
            <div className="text-xs text-slate-650 leading-relaxed animate-fadeIn select-text space-y-3">
              <div className="markdown-style prose-sm max-h-[800px] overflow-y-auto">
                <Markdown>{briefSummary}</Markdown>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400 font-mono select-none">
              No summary generated yet.
            </div>
          )}
        </div>
        
        {/* Subtle runtime indicator at the bottom */}
        <div className="mt-auto pt-4 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 uppercase font-mono font-bold tracking-wider select-none">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span>gemini-3.5-flash</span>
          </span>
          <span>A.I. Engine</span>
        </div>
      </div>

    </div>

  </div>
  );
}
