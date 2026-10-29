import type { Checkpoints } from '../../core/contracts';
import type { FeedbackKind } from '../../core/performance';
/** Counts and category only. No utterance, user identity, source or memory text. */
export class PerformanceFeedback {
  constructor(private store:Checkpoints,private now=Date.now){}
  record(kind:FeedbackKind) {
    const rows=this.store.load<{kind:FeedbackKind;at:number}[]>('performance-feedback')??[];
    rows.push({kind,at:this.now()});
    this.store.save('performance-feedback',rows.filter(r=>this.now()-r.at<30*86400000).slice(-128));
  }
  clear(){this.store.removeCheckpoint('performance-feedback');}
}
