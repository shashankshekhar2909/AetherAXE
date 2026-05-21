import React, { useState } from "react";
import { 
  Share2, 
  Database, 
  Bookmark, 
  Terminal, 
  Check, 
  Send,
  Building2,
  ExternalLink,
  BookOpen
} from "lucide-react";
import { ExtractionResult, IntegrationsConfig } from "../types";

interface PipelineIntegrationsProps {
  result: ExtractionResult;
}

export default function PipelineIntegrations({ result }: PipelineIntegrationsProps) {
  const [config, setConfig] = useState<IntegrationsConfig>({
    notionToken: "",
    notionPageId: "",
    webhookUrl: "https://api.my-rag-pipeline.com/ingest",
    webhookAuthHeader: "Bearer sk_extraction_test_token_123"
  });

  const [deliveryStatus, setDeliveryStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [deliveryLog, setDeliveryLog] = useState<string>("");
  const [obsidianVault, setObsidianVault] = useState("Research");

  // Format Obsidian Deep Link URI matching standard Obsidian settings
  const encodedName = encodeURIComponent(result.metadata.title);
  const encodedContent = encodeURIComponent(
    `# ${result.metadata.title}\n\n` +
    `---\n` +
    `Source: ${result.metadata.sourceUrl || "Uploaded File"}\n` +
    `Date Extracted: ${new Date().toISOString().slice(0,10)}\n` +
    `Tags: ${result.metadata.tags.map(t => `#${t}`).join(" ")}\n` +
    `---\n\n` +
    `> ${result.metadata.summary}\n\n` +
    result.markdown
  );
  
  const obsidianUri = `obsidian://new?vault=${encodeURIComponent(obsidianVault)}&name=${encodedName}&content=${encodedContent}`;

  const triggerWebhookDelivery = async () => {
    if (!config.webhookUrl) return;
    setDeliveryStatus("sending");
    setDeliveryLog(`[${new Date().toLocaleTimeString()}] Establishing target delivery connection...\n`);

    try {
      const response = await fetch("/api/export/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: config.webhookUrl,
          authHeader: config.webhookAuthHeader,
          result: result
        })
      });

      const data = await response.json();

      if (response.ok) {
        setDeliveryStatus("success");
        setDeliveryLog(prev => prev + 
          `[${new Date().toLocaleTimeString()}] Pipeline server handshake received.\n` +
          `[${new Date().toLocaleTimeString()}] Payload size: ${(JSON.stringify(result).length / 1024).toFixed(2)} KB.\n` +
          `[${new Date().toLocaleTimeString()}] Server response: ${data.message || "OK 200"}\n` +
          `[${new Date().toLocaleTimeString()}] Release state: SUCCESS. Metadata + ${result.chunks.length} chunks mapped.\n`
        );
      } else {
        throw new Error(data.error || "Connection refused");
      }
    } catch (err: any) {
      setDeliveryStatus("error");
      setDeliveryLog(prev => prev + 
        `[${new Date().toLocaleTimeString()}] Release state: COMPLETED WITH ERRORS.\n` +
        `[${new Date().toLocaleTimeString()}] Transmission failure: ${err.message || "Endpoint connection refused"}\n` +
        `ℹ️ (Diagnostic Note: You can customize the Webhook URL field to connect to your active local or remote RAG database endpoints!)`
      );
    }
  };

  return (
    <div id="pipeline-integrations-panel" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* Target heading */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Share2 className="w-5 h-5 text-indigo-600" />
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Sync Target releasing pipeline</h3>
          <p className="text-xs text-slate-505">Pipeline direct exports to Obsidian, Notion, or RAG Vector Ingestion points</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Release Module A: Vector Webhooks / RAG Ingestions */}
        <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <h4 className="text-xs font-bold text-slate-705 flex items-center gap-2 uppercase tracking-wider">
            <Database className="w-4 h-4 text-indigo-600" /> Custom RAG / Vector Webhook Target
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Target Webhook Ingestion API</label>
              <input
                type="text"
                value={config.webhookUrl}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                placeholder="https://api.yourdomain.com/v1/ingest"
                className="w-full bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 rounded text-xs px-3 py-2 text-slate-800 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Custom Authorization Header</label>
              <input
                type="text"
                value={config.webhookAuthHeader}
                onChange={(e) => setConfig({ ...config, webhookAuthHeader: e.target.value })}
                placeholder="Bearer your-secret-token"
                className="w-full bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 rounded text-xs px-3 py-2 text-slate-800 outline-none font-mono"
              />
            </div>

            <button
              onClick={triggerWebhookDelivery}
              disabled={deliveryStatus === "sending" || !config.webhookUrl}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 font-semibold text-xs text-white rounded flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-100"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{deliveryStatus === "sending" ? "Ingesting..." : "Trigger Ingest Delivery Test"}</span>
            </button>
          </div>

          {/* Diagnostic status Log output */}
          {deliveryLog && (
            <div className="pt-3 border-t border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1 mb-1.5 font-mono">
                <Terminal className="w-3.5 h-3.5 text-indigo-600" /> Handshake diagnostics log
              </span>
              <pre className="p-3 bg-slate-900 rounded text-[10px] leading-relaxed font-mono text-slate-200 overflow-auto max-h-[140px] whitespace-pre-wrap select-text border border-slate-850">
                {deliveryLog}
              </pre>
            </div>
          )}
        </div>

        {/* Release Module B: Obsidian Deep Linking Ecosystem */}
        <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-705 flex items-center gap-2 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-indigo-600" /> Obsidian Workspace Sync
            </h4>

            <p className="text-xs text-slate-500 leading-relaxed">
              Instantly push clean Markdown, breadcrumb structures, and metadata tags straight into your local Obsidian App vault via secure native URI schemas.
            </p>

            <div>
              <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Target Obsidian Vault name</label>
              <input
                type="text"
                value={obsidianVault}
                onChange={(e) => setObsidianVault(e.target.value)}
                placeholder="Personal Research"
                className="w-full bg-white border border-slate-202 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 rounded text-xs px-3 py-2 text-slate-800 outline-none"
              />
            </div>
          </div>

          <a
            href={obsidianUri}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs text-white rounded flex items-center justify-center gap-2 cursor-pointer text-center transition-all shadow-md shadow-indigo-100 mt-4"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Launch Sync to Obsidian</span>
          </a>
        </div>

      </div>

      {/* Notion Blueprint Help */}
      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
        <h4 className="text-xs font-bold text-slate-705 flex items-center gap-2 uppercase tracking-wider">
          <Building2 className="w-4 h-4 text-indigo-600" /> Enterprise Workspace Pipelines (Notion / Airtable integrations)
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          For secure databases like Notion, Airtable, or Confluence: We support outbound schema pipelines. Configure a standard Webhook target to receive full metadata structures. Alternatively, the copyable Clean JSON payload can be pasted into any standard custom automation integrations (such as Make / Zapier) to map document tags, titles, summaries, and Markdown body sections directly.
        </p>
      </div>

    </div>
  );
}
