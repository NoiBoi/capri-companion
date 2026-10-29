import type { ContextPacket, ModelSession, ModelSessions } from '../../core/contracts';
import type { GenOptions, LLMProvider } from '../ai/providers';

/** Compatibility adapter: retains existing authentication/routing and sends the
 * supplied messages each turn. This is not a persistent provider session. */
export class LegacyModelSessions implements ModelSessions {
  private active = new Map<AbortController, string[]>();
  constructor(private provider: LLMProvider, private options: () => Omit<GenOptions,'signal'>) {}
  async *respond(session: ModelSession, context: ContextPacket, signal: AbortSignal) {
    const controller = new AbortController(), abort = () => controller.abort();
    if (signal.aborted) controller.abort();
    signal.addEventListener('abort', abort, {once:true});
    this.active.set(controller,[...session.dependencies]);
    try {
      if (controller.signal.aborted) return;
      yield* this.provider.stream(context.messages ?? [{role:'user',content:context.text}], {...this.options(),signal:controller.signal});
    } finally { signal.removeEventListener('abort',abort); this.active.delete(controller); }
  }
  invalidate(source: string) { for (const [controller,dependencies] of this.active) if (dependencies.includes(source)) controller.abort(); }
}
