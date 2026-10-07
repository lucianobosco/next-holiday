import { useState } from "preact/hooks";

// The trailing slash is the canonical shape: /embed answers with a temporary redirect. The
// link under the iframe is what credits the site to anyone who embeds it; the iframe alone
// passes nothing.
const CODE = `<iframe src="https://elproximofestivo.es/embed/" width="340" height="200" style="border:0;border-radius:12px;max-width:100%" title="Próximo festivo en España" loading="lazy"></iframe>
<p style="margin:4px 0 0;font:12px sans-serif"><a href="https://elproximofestivo.es/">Próximo festivo en España</a></p>`;

export default function EmbedCopy() {
  const [copied, setCopied] = useState(false);
  return (
    <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
      <pre class="min-w-0 flex-1 overflow-x-auto rounded-md border border-line bg-paper px-3 py-2.5 font-mono text-xs leading-relaxed text-ink">
        <code>{CODE}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            ?.writeText(CODE)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {});
        }}
        class="min-h-11 shrink-0 rounded-md bg-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-deep"
      >
        {copied ? "¡Copiado!" : "Copiar código"}
      </button>
    </div>
  );
}
