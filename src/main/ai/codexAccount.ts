import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ProviderError, type GenOptions, type LLMMessage, type LLMProvider } from './providers';

/** Use the installed CLI's own sign-in; never read or copy its credentials. */
export function findCodex(): string | null {
  const name = process.platform === 'win32' ? 'codex.exe' : 'codex';
  const candidates = [process.env.CAPRI_CODEX_PATH];
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) candidates.push(path.join(dir, name));
  if (process.platform === 'win32') {
    const base = path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'OpenAI', 'Codex', 'bin');
    try { for (const d of fs.readdirSync(base)) candidates.push(path.join(base, d, name)); } catch { /* optional installation */ }
  }
  return candidates.find((p): p is string => !!p && fs.existsSync(p)) ?? null;
}

export function codexEventText(line: string): { text?: string; error?: string } {
  try {
    const e = JSON.parse(line) as { type?: string; message?: string; error?: { message?: string }; item?: { type?: string; text?: string } };
    if (e.type === 'item.completed' && e.item?.type === 'agent_message') return { text: e.item.text };
    if (e.type === 'turn.failed' || e.type === 'error') return { error: e.error?.message ?? e.message ?? 'Codex could not complete the reply.' };
  } catch { /* non-protocol diagnostics are not chat */ }
  return {};
}

export async function runCodex(prompt: string, opts: { signal: AbortSignal; timeoutMs: number; jpegBase64?: string; outputSchema?: object }): Promise<string> {
  const exe = findCodex();
  if (!exe) throw new ProviderError('Codex CLI was not found. Install/sign in to Codex, or choose another provider.', 'config');
  if (opts.signal.aborted) throw new ProviderError('Stopped.', 'aborted');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-codex-'));
  // Empty working folder, no user config, no shell, no persistent Codex chat. All desktop tools
  // are requested as data and executed only by Capri's existing action/approval layer.
  const args = ['exec', '--ignore-user-config', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only', '--json', '--color', 'never', '-c', 'features.shell_tool=false', '-c', 'model_reasoning_effort="low"'];
  if (opts.jpegBase64) {
    const file = path.join(dir, 'screen.jpg');
    fs.writeFileSync(file, Buffer.from(opts.jpegBase64, 'base64'));
    args.push('--image', file);
  }
  if (opts.outputSchema) { const schemaFile = path.join(dir, 'output-schema.json'); fs.writeFileSync(schemaFile, JSON.stringify(opts.outputSchema)); args.push('--output-schema', schemaFile); }
  args.push('-');
  try {
    return await new Promise<string>((resolve, reject) => {
      const child = spawn(exe, args, { cwd: dir, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let buf = '', text = '', failure = '', timedOut = false;
      const stop = () => child.kill();
      const timer = setTimeout(() => { timedOut = true; stop(); }, opts.timeoutMs);
      opts.signal.addEventListener('abort', stop, { once: true });
      const consume = (line: string) => { const e = codexEventText(line); if (e.text) text += (text ? '\n' : '') + e.text; if (e.error) failure = e.error; };
      child.stdout.on('data', (b: Buffer) => { buf += b.toString('utf8'); let i; while ((i = buf.indexOf('\n')) >= 0) { consume(buf.slice(0, i)); buf = buf.slice(i + 1); } });
      // Drain diagnostics without exposing local paths, account data, or auth messages in chat.
      child.stderr.on('data', () => {});
      child.stdin.on('error', () => {});
      child.once('error', () => reject(new ProviderError('Could not start Codex CLI.', 'config')));
      child.once('close', (code) => {
        clearTimeout(timer); opts.signal.removeEventListener('abort', stop);
        if (buf.trim()) consume(buf);
        if (opts.signal.aborted) reject(new ProviderError('Stopped.', 'aborted'));
        else if (timedOut) reject(new ProviderError('Codex reply timed out.', 'timeout'));
        else if (failure || code !== 0 || !text) reject(new ProviderError(failure || `Codex exited without a reply (${code}). Check Codex sign-in.`, 'server'));
        else resolve(text);
      });
      child.stdin.end(prompt);
    });
  } finally {
    // This directory is created above by mkdtemp with a fixed prefix and contains only this request.
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
  }
}

export class CodexAccountProvider implements LLMProvider {
  readonly name = 'codex';
  readonly local = false;
  async *stream(messages: LLMMessage[], o: GenOptions): AsyncGenerator<string> {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const turns = messages.filter((m) => m.role !== 'system').map((m) => `${m.role === 'user' ? 'User' : 'Capri'}: ${m.content}`).join('\n\n');
    if (o.purpose === 'memory') {
      const outputSchema = { type: 'object', additionalProperties: false, properties: { changes: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { op: { type: 'string', enum: ['add', 'update', 'forget'] }, id: { type: 'string' }, text: { type: 'string' }, kind: { type: 'string', enum: ['fact', 'preference'] }, evidence: { type: 'string' } }, required: ['op', 'id', 'text', 'kind', 'evidence'] } } }, required: ['changes'] };
      yield await runCodex(`${system}\nUse an empty id for additions. Return only the required JSON.\n\nINPUT DATA:\n${messages.filter(m => m.role === 'user').map(m => m.content).join('\n')}`, { ...o, outputSchema });
      return;
    }
    yield await runCodex(`You are the conversation engine for a desktop character. Follow the character instructions below. Do not use any CLI tools, inspect files, or perform tasks yourself. Desktop actions must be emitted only using the character's action protocol. Reply only with Capri's reply to the final turn, with no analysis or preface.\n\nCHARACTER INSTRUCTIONS:\n${system}\n\nCONVERSATION:\n${turns}`, o);
  }
  async test(): Promise<{ ok: boolean; detail: string; latencyMs?: number }> {
    const exe = findCodex();
    if (!exe) return { ok: false, detail: 'Codex CLI not found.' };
    const start = Date.now();
    return new Promise((resolve) => execFile(exe, ['login', 'status'], { timeout: 15_000, windowsHide: true }, (error, stdout, stderr) => {
      const signedIn = !error && /logged in|signed in/i.test(stdout + stderr);
      resolve({ ok: signedIn, detail: signedIn ? 'Codex is signed in with your existing account. Replies use your Codex usage.' : 'Codex is installed but not signed in. Sign in with the Codex app or CLI.', latencyMs: Date.now() - start });
    }));
  }
  async listModels() { return []; } // Use the installed CLI's supported default.
}
