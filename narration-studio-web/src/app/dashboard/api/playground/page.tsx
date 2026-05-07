import { Shell } from "@/components/Shell";
import { ApiPlayground } from "@/components/ApiPlayground";

export default function ApiPlaygroundPage() {
  return (
    <Shell>
      <h1 className="text-3xl font-black">API Playground</h1>
      <p className="mt-2 text-neutral-600">Test speech, transcription, model, and voice endpoints with generated code.</p>
      <div className="mt-6"><ApiPlayground /></div>
    </Shell>
  );
}
