"use client";

import { useMemo, useState } from "react";
import { Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { AudioStatePlayer } from "@/components/AudioStatePlayer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tab = "speech" | "transcriptions" | "models" | "voices";
type Lang = "JavaScript" | "Python" | "cURL";

export function ApiPlayground() {
  const [tab, setTab] = useState<Tab>("speech");
  const [lang, setLang] = useState<Lang>("JavaScript");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("narration-tts");
  const [script, setScript] = useState("Hello from Narration Studio");
  const [voice, setVoice] = useState("Maly");
  const [format, setFormat] = useState("mp3");
  const [instructions, setInstructions] = useState("warm, calm, clear pronunciation");
  const [language, setLanguage] = useState("km");
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [responseText, setResponseText] = useState("");

  const code = useMemo(() => {
    if (tab === "speech") {
      if (lang === "Python") return `from openai import OpenAI\n\nclient = OpenAI(api_key="YOUR_API_KEY", base_url="https://api.narrationstudio.com/v1")\n\nresponse = client.audio.speech.create(\n    model="${model}",\n    voice="${voice}",\n    input="${script.replaceAll('"', '\\"')}",\n    response_format="${format}",\n)\nresponse.stream_to_file("output.${format}")`;
      if (lang === "cURL") return `curl https://api.narrationstudio.com/v1/audio/speech \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"${model}","voice":"${voice}","input":"${script.replaceAll("'", "\\'")}","response_format":"${format}"}' \\\n  --output output.${format}`;
      return `import OpenAI from 'openai';\n\nconst client = new OpenAI({\n  apiKey: process.env.NARRATION_API_KEY,\n  baseURL: 'https://api.narrationstudio.com/v1'\n});\n\nconst response = await client.audio.speech.create({\n  model: '${model}',\n  voice: '${voice}',\n  input: '${script.replaceAll("'", "\\'")}',\n  response_format: '${format}'\n});`;
    }
    if (tab === "transcriptions") return `curl https://api.narrationstudio.com/v1/audio/transcriptions \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -F file=@audio.mp3 \\\n  -F model=narration-stt \\\n  -F response_format=json`;
    return `curl https://api.narrationstudio.com/v1/${tab === "models" ? "models" : "audio/voices"} \\\n  -H "Authorization: Bearer YOUR_API_KEY"`;
  }, [format, lang, model, script, tab, voice]);

  async function testApi() {
    setLoading(true);
    setResponseText("");
    setAudioUrl("");
    try {
      if (tab === "speech") {
        const response = await fetch("/api/proxy/v1/speech", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, text: script, voice, response_format: format, instructions }),
        });
        if (!response.ok) throw new Error(await response.text());
        setAudioUrl(URL.createObjectURL(await response.blob()));
      } else if (tab === "transcriptions") {
        setResponseText(JSON.stringify({
          error: "Backend endpoint missing: POST /api/v1/audio/transcriptions",
          file: file?.name || null,
          language,
          prompt,
        }, null, 2));
      } else {
        const path = tab === "models" ? "/health" : "/voices";
        const response = await fetch(`/api/proxy${path}`, { headers: { Authorization: `Bearer ${apiKey}` } });
        setResponseText(await response.text());
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "API request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_520px]">
      <div className="card p-5">
        <div className="flex flex-wrap gap-2">
          {(["speech", "transcriptions", "models", "voices"] as Tab[]).map((item) => (
            <button key={item} className={`rounded-xl px-3 py-2 text-sm font-bold ${tab === item ? "bg-neutral-950 text-white" : "bg-neutral-100"}`} onClick={() => setTab(item)}>{item === "speech" ? "Generate Speech" : item === "transcriptions" ? "Transcriptions" : item === "models" ? "List Models" : "List Voices"}</button>
          ))}
        </div>
        <div className="mt-5 space-y-4">
          <div className="space-y-2"><Label>API Key</Label><Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="ns_..." /></div>
          {tab === "speech" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label>Model</Label><Input value={model} onChange={(e) => setModel(e.target.value)} /></div>
                <div className="space-y-2"><Label>Voice</Label><Input value={voice} onChange={(e) => setVoice(e.target.value)} /></div>
                <div className="space-y-2"><Label>Format</Label><select className="field" value={format} onChange={(e) => setFormat(e.target.value)}><option>mp3</option><option>wav</option></select></div>
              </div>
              <div className="space-y-2"><Label>Script</Label><textarea className="field min-h-32" value={script} onChange={(e) => setScript(e.target.value)} /></div>
              <div className="space-y-2"><Label>Instructions</Label><textarea className="field min-h-24" value={instructions} onChange={(e) => setInstructions(e.target.value)} /></div>
            </>
          ) : null}
          {tab === "transcriptions" ? (
            <>
              <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.item(0) || null)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Language</Label><Input value={language} onChange={(e) => setLanguage(e.target.value)} /></div>
                <div className="space-y-2"><Label>Prompt</Label><Input value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>
              </div>
            </>
          ) : null}
          <button className="btn" onClick={testApi} disabled={loading || !apiKey}><Play className="h-4 w-4" /> {loading ? "Testing..." : "Test API"}</button>
          {audioUrl ? <AudioStatePlayer src={audioUrl} title="Generated audio" downloadable /> : null}
          {responseText ? <pre className="overflow-auto rounded-xl bg-neutral-100 p-4 text-xs">{responseText}</pre> : null}
        </div>
      </div>
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <select className="field max-w-44" value={lang} onChange={(e) => setLang(e.target.value as Lang)}><option>JavaScript</option><option>Python</option><option>cURL</option></select>
          <button className="btn secondary" onClick={() => navigator.clipboard.writeText(code)}><Copy className="h-4 w-4" /> Copy</button>
        </div>
        <pre className="min-h-96 overflow-auto rounded-xl bg-neutral-950 p-4 text-xs text-white">{code}</pre>
      </div>
    </div>
  );
}
