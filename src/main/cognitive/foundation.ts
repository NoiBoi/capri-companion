import path from 'node:path';
import type { ExecutionReceipt, ModelSession } from '../../core/contracts';
import { RequestEvidence, revokeDependencies } from '../../core/provenance';
import { CognitiveSqlite } from '../store/cognitiveSqlite';
import { ConversationScene } from '../store/conversationScene';

/** Composition boundary for the migrated slices. Native lifecycle and UI stay
 * in Electron; state initialization and source invalidation live here. */
export class CognitiveFoundation {
  readonly store: CognitiveSqlite;
  readonly scene: ConversationScene;
  constructor(dir: string, enabled: () => boolean, private persistent: () => boolean) {
    this.store = new CognitiveSqlite(path.join(dir,'cognitive.sqlite'));
    try { this.scene = this.store.transaction(() => new ConversationScene(dir,enabled,persistent,Date.now,this.store)); }
    catch (error) { this.store.close(); throw error; }
  }
  revoke(source: string | undefined, cancel: () => void, clearLegacyCache: () => void, requests: RequestEvidence[]) {
    revokeDependencies(source, { cancel, invalidate: id => {
      clearLegacyCache();
      this.store.transaction(() => {
        this.scene.invalidateContext(id);
        if (id) this.store.invalidate(id);
        else this.store.remove('session','current-chat');
      });
      for (const request of requests) request.reset();
    } });
  }
  session(session: ModelSession) {
    if (!this.persistent()) { this.clearSession(); return; }
    const prior = this.store.get('session','current-chat');
    this.store.put({kind:'session',id:'current-chat',revision:(prior?.revision ?? -1)+1,at:Date.now(),value:session,dependencies:session.dependencies});
  }
  clearSession() { this.store.remove('session','current-chat'); }
  receipt(receipt: ExecutionReceipt) {
    if (!this.persistent()) return;
    // One latest receipt, with tool ID and outcome only. Never action payloads.
    const prior=this.store.get('receipt','latest');
    this.store.put({kind:'receipt',id:'latest',revision:(prior?.revision??-1)+1,at:receipt.at,value:receipt,dependencies:receipt.dependencies});
  }
  clearActivity() { this.clearSession(); this.store.remove('receipt','latest'); }
}
