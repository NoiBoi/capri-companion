// Google Gemini via the official @google/genai SDK, Interactions API
// (https://ai.google.dev/gemini-api/docs/interactions — verified 2026-10-24).
// Runs only in the main process; the key never reaches a renderer.
import { GoogleGenAI } from '@google/genai';
import { ProviderError, type GenOptions, type LLMMessage, type LLMProvider } from './providers';

export const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash-lite';
export const GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

export interface GeminiConfig {
  apiKey: string | undefined;
  model: string;
  fallbackModel: string; // '' = no fallback
  thinkingLevel: 'minimal' | 'low' | 'medium' | 'high';
  serverUrl?: string; // tests / proxies only
  onModelUsed?: (model: string, fallback: boolean) => void;
}

interface ApiErrorLike { status?: number; statusCode?: number; body?: unknown; message?: string; name?: string; headers?: { get?(k: string): string | null } }

/** Map SDK errors to provider errors. Messages are taken from the API body; keys are never included. */
export function classifyGeminiError(e: unknown, key?: string): ProviderError {
  if (e instanceof ProviderError) return e;
  const err = (e ?? {}) as ApiErrorLike;
  const scrub = (s: string) => (key ? s.split(key).join('[REDACTED]') : s).replace(/AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z_-]{20,}/g, '[REDACTED]');
  if (err.name === 'AbortError' || /aborted|abort/i.test(String(err.message))) return new ProviderError('aborted', 'aborted');
  const status = err.statusCode ?? err.status;
  let msg = '', reason = '', rpcStatus = '', retryMs: number | undefined;
  try {
    const parsed = typeof err.body === 'string' ? JSON.parse(err.body) : err.body ?? JSON.parse(String(err.message));
    const body = Array.isArray(parsed) ? parsed[0] : parsed;
    msg = body?.error?.message ?? '';
    rpcStatus = body?.error?.status ?? '';
    for (const d of body?.error?.details ?? []) {
      if (d.reason) reason = d.reason;
      if (d.retryDelay) retryMs = Math.min(60_000, parseFloat(d.retryDelay) * 1000);
    }
  } catch { /* not JSON */ }
  const text = scrub(msg || String(err.message ?? 'unknown error')).slice(0, 300);
  if (!status) {
    if (/timed? ?out|timeout/i.test(String(err.message))) return new ProviderError('Gemini request timed out', 'timeout');
    return new ProviderError(`Network error reaching Gemini: ${text}`, 'network');
  }
  if (reason === 'API_KEY_INVALID' || status === 401 || status === 403 || rpcStatus === 'PERMISSION_DENIED' || rpcStatus === 'UNAUTHENTICATED') {
    return new ProviderError(reason === 'API_KEY_INVALID' ? 'Gemini rejected the API key (API_KEY_INVALID).' : `Gemini denied access: ${text}`, 'auth', status);
  }
  if (status === 404 || rpcStatus === 'NOT_FOUND') return new ProviderError(`Gemini model not available: ${text}`, 'model', status);
  if (status === 429 || rpcStatus === 'RESOURCE_EXHAUSTED') return new ProviderError(`Gemini rate limit / quota: ${text}`, 'rate_limit', status, retryMs);
  if (status >= 500) return new ProviderError(`Gemini server error ${status}: ${text}`, 'server', status);
  return new ProviderError(`Gemini request rejected (${status}): ${text}`, 'bad_request', status);
}

const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms);
  signal.addEventListener('abort', () => { clearTimeout(t); rej(new ProviderError('aborted', 'aborted')); }, { once: true });
});

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly local = false;
  constructor(private c: GeminiConfig) {}

  private client(timeoutMs: number) {
    if (!this.c.apiKey) throw new ProviderError('No Gemini API key. Add one in Model, or set the GEMINI_API_KEY environment variable.', 'config');
    return new GoogleGenAI({ apiKey: this.c.apiKey, httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 }, ...(this.c.serverUrl ? { baseUrl: this.c.serverUrl } : {}) } });
  }

  /** Stateless conversation: history sent as user_input / model_output steps; nothing stored server-side. */
  private request(model: string, messages: LLMMessage[], o: GenOptions) {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const input = messages.filter((m) => m.role !== 'system').map((m) => ({
      type: m.role === 'user' ? 'user_input' : 'model_output',
      content: [{ type: 'text', text: m.content }],
    }));
    return this.client(o.timeoutMs).interactions.create(
      {
        model, input, stream: true, store: false,
        ...(system ? { system_instruction: system } : {}),
        // Gemini 3.6+ ignore temperature; still sent for models that honour it
        generation_config: { max_output_tokens: o.maxTokens, temperature: o.temperature, thinking_level: this.c.thinkingLevel },
      } as never,
      { timeout_ms: o.timeoutMs, retries: { strategy: 'none' }, fetch_options: { signal: o.signal }, ...(this.c.serverUrl ? { server_url: this.c.serverUrl } : {}) },
    ) as unknown as Promise<AsyncIterable<{ event_type: string; delta?: { type: string; text?: string }; error?: { code?: string; message?: string } }>>;
  }

  async *stream(messages: LLMMessage[], o: GenOptions): AsyncGenerator<string> {
    const models = [this.c.model, ...(this.c.fallbackModel && this.c.fallbackModel !== this.c.model ? [this.c.fallbackModel] : [])];
    let lastErr: ProviderError | null = null;
    for (let mi = 0; mi < models.length; mi++) {
      const model = models[mi];
      for (let attempt = 0; attempt < 3; attempt++) {
        let yielded = false;
        try {
          const stream = await this.request(model, messages, o);
          this.c.onModelUsed?.(model, mi > 0);
          for await (const ev of stream) {
            if (o.signal.aborted) throw new ProviderError('aborted', 'aborted');
            if (ev.event_type === 'step.delta' && ev.delta?.type === 'text' && ev.delta.text) { yielded = true; yield ev.delta.text; }
            else if (ev.event_type === 'error') throw new ProviderError(`Gemini stream error: ${ev.error?.message ?? ev.error?.code ?? 'unknown'}`, 'server');
          }
          return;
        } catch (e) {
          const pe = o.signal.aborted ? new ProviderError('aborted', 'aborted') : classifyGeminiError(e, this.c.apiKey);
          if (pe.kind === 'aborted' || pe.kind === 'auth' || pe.kind === 'config' || yielded) throw pe; // never duplicate partial output
          lastErr = pe;
          if (pe.kind === 'model') break; // try the fallback model
          // one policy for retries (the SDK's own are disabled): rate limits/overload up to 2×, dead network once
          const maxRetry = pe.kind === 'network' || pe.kind === 'timeout' ? 1 : 2;
          if ((pe.kind === 'rate_limit' || pe.kind === 'server' || pe.kind === 'network' || pe.kind === 'timeout') && attempt < maxRetry) {
            await sleep(pe.retryAfterMs ?? 800 * 2 ** attempt, o.signal);
            continue;
          }
          if (pe.kind === 'server' || pe.kind === 'rate_limit') break; // persistent → fallback model
          throw pe;
        }
      }
    }
    throw lastErr ?? new ProviderError('Gemini request failed', 'server');
  }

  async listModels(): Promise<string[]> {
    const pager = await this.client(15_000).models.list({ config: { pageSize: 200 } });
    const out: string[] = [];
    for await (const m of pager) {
      const name = (m.name ?? '').replace(/^models\//, '');
      if (/^gemini-/.test(name) && !/(tts|image|embedding|live|robotics|transcribe|omni|lyria)/.test(name)) out.push(name);
    }
    return out.sort();
  }

  /** Auth + model availability check (no tokens generated). */
  async test(): Promise<{ ok: boolean; detail: string; latencyMs?: number }> {
    const t0 = Date.now();
    try {
      const models = await this.listModels();
      const has = models.includes(this.c.model);
      const fb = this.c.fallbackModel && models.includes(this.c.fallbackModel);
      if (!has) return { ok: false, detail: `Key accepted, but model "${this.c.model}" isn't available to it${fb ? ` (fallback "${this.c.fallbackModel}" is)` : ''}.`, latencyMs: Date.now() - t0 };
      return { ok: true, detail: `Connected to Gemini · ${this.c.model}${this.c.fallbackModel ? ` (fallback ${this.c.fallbackModel}${fb ? '' : ' unavailable'})` : ''}`, latencyMs: Date.now() - t0 };
    } catch (e) {
      const pe = classifyGeminiError(e, this.c.apiKey);
      return { ok: false, detail: pe.message };
    }
  }
}
