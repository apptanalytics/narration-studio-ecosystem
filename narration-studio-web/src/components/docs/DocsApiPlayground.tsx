"use client";

import { useMemo, useState } from "react";
import { Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { AudioStatePlayer } from "@/components/AudioStatePlayer";

type Language = "JavaScript" | "Python" | "cURL";

const voices = ["Maly", "Rithy", "Chanda", "Bora", "Neary"];

export function DocsApiPlayground() {
  const [language, setLanguage] = useState<Language>("JavaScript");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("narration-tts");
  const [script, setScript] = useState("Hello, world! This is a test of the Narration Studio text-to-speech API.");
  const [voice, setVoice] = useState("Maly");
  const [format, setFormat] = useState("mp3");
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const code = useMemo(() => {
    const escapedScript = script.replaceAll('"', '\\"');
    if (language === "Python") {
      return `import requests\n\nresponse = requests.post(\n    "http://localhost:8080/v1/speech",\n    headers={\n        "Authorization": "Bearer nstudio_live_YOUR_KEY",\n        "Content-Type": "application/json",\n    },\n    json={\n        "model": "${model}",\n        "input": "${escapedScript}",\n        "voice": "${voice}",\n        "format": "${format}",\n    },\n)\n\nprint(response.json())`;
    }
    if (language === "cURL") {
      return `curl -X POST http://localhost:8080/v1/speech \\\n  -H "Authorization: Bearer nstudio_live_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "${model}",\n    "input": "${escapedScript}",\n    "voice": "${voice}",\n    "format": "${format}"\n  }'`;
    }
    return `const response = await fetch("http://localhost:8080/v1/speech", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer nstudio_live_YOUR_KEY",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    model: "${model}",\n    input: "${escapedScript}",\n    voice: "${voice}",\n    format: "${format}"\n  })\n});\n\nconst result = await response.json();\nconsole.log(result);`;
  }, [format, language, model, script, voice]);

  async function testApi() {
    if (!apiKey.trim()) {
      toast.error("Enter an API key first.");
      return;
    }
    setLoading(true);
    setResponseText("");
    setAudioUrl("");
    try {
      const response = await fetch("/api/proxy/v1/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: script,
          text: script,
          voice,
          format,
          response_format: format,
        }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) throw new Error(await response.text());
      if (contentType.includes("audio/")) {
        setAudioUrl(URL.createObjectURL(await response.blob()));
      } else {
        setResponseText(JSON.stringify(await response.json(), null, 2));
      }
      toast.success("API test completed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "API request failed.";
      setResponseText(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="playground" className="scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">API Playground</p>
          <h2 className="mt-2 text-2xl font-black">Test with JavaScript, Python, or cURL</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Enter an API key, change the script, then run a live request through the same-origin proxy.</p>
        </div>
        <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {(["JavaScript", "Python", "cURL"] as Language[]).map((item) => (
            <button
              key={item}
              className={`rounded-md px-3 py-2 text-sm font-bold ${language === item ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950" : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"}`}
              onClick={() => setLanguage(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-4">
          <label className="block space-y-2 text-sm font-bold">
            <span>API Key</span>
            <input className="field dark:border-neutral-800 dark:bg-neutral-900" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="nstudio_live_..." />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-bold">
              <span>Model</span>
              <input className="field dark:border-neutral-800 dark:bg-neutral-900" value={model} onChange={(event) => setModel(event.target.value)} />
            </label>
            <label className="block space-y-2 text-sm font-bold">
              <span>Format</span>
              <select className="field dark:border-neutral-800 dark:bg-neutral-900" value={format} onChange={(event) => setFormat(event.target.value)}>
                <option value="mp3">mp3</option>
                <option value="wav">wav</option>
              </select>
            </label>
          </div>
          <label className="block space-y-2 text-sm font-bold">
            <span>Voice</span>
            <select className="field dark:border-neutral-800 dark:bg-neutral-900" value={voice} onChange={(event) => setVoice(event.target.value)}>
              {voices.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block space-y-2 text-sm font-bold">
            <span>Script</span>
            <textarea className="field min-h-32 dark:border-neutral-800 dark:bg-neutral-900" value={script} onChange={(event) => setScript(event.target.value)} />
          </label>
          <button className="btn w-full" onClick={testApi} disabled={loading} type="button">
            <Play className="h-4 w-4" />
            {loading ? "Testing..." : "Test API"}
          </button>
          {audioUrl ? <AudioStatePlayer src={audioUrl} title="Generated audio" downloadable /> : null}
          {responseText ? <pre className="max-h-64 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">{responseText}</pre> : null}
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black">{language} request</p>
            <button className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-bold hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900" onClick={() => void navigator.clipboard.writeText(code)} type="button">
              <Copy className="mr-2 inline h-4 w-4" />
              Copy
            </button>
          </div>
          <pre className="min-h-[460px] overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm leading-6 text-neutral-950 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50"><code>{code}</code></pre>
        </div>
      </div>
    </section>
  );
}
