import { useState } from "preact/hooks";

// The trailing slash is the canonical shape: /embed answers with a temporary redirect. The
// link under the iframe is what credits the site to anyone who embeds it; the iframe alone
// passes nothing.
const CODE = `<iframe src="https://elproximofestivo.es/embed/" width="340" height="200" style="border:0;border-radius:12px;max-width:100%" title="Próximo festivo en España" loading="lazy"></iframe>
<p style="margin:4px 0 0;font:12px sans-serif"><a href="https://elproximofestivo.es/">Próximo festivo en España</a></p>`;

export default function EmbedCopy() {
  const [copied, setCopied] = useState(false);
  return (
    <div class="mt-4 overflow-hidden rounded-xl border border-line bg-paper-card">
      <pre class="overflow-x-auto p-4 text-xs leading-relaxed text-ink-soft">
        <code>{CODE}</code>
      </pre>
      <div class="flex justify-end border-t border-line px-4 py-2">
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
          class="rounded-lg bg-terracotta px-4 py-1.5 text-xs font-semibold text-cream transition hover:brightness-110"
        >
          {copied ? "¡Copiado!" : "Copiar código"}
        </button>
      </div>
    </div>
  );
}
