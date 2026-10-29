/** Host-independent presentation policy. It requests existing animations, never
 * treats an animation request as a completed physical action. No model calls. */
export type SpeechOrigin = { kind:'authored'; lineId:string } | { kind:'generated-direct'|'generated-spontaneous'|'action-result'|'system-error' };
export type FeedbackKind = 'repetitive'|'generic'|'character'|'intrusive';
export type Reaction = 'happy'|'surprised'|'annoyed'|'curious'|'wave'|'nod';
export interface PerformanceInput {
  meaning?:string; attitude?:'curious'|'playful'|'defensive'|'sincere'|'settled';
  direct:boolean; quiet:boolean; available:boolean; held:boolean; moving:boolean;
  line?:string; origin:SpeechOrigin; reaction?:Reaction; availableReactions:readonly Reaction[];
  /** Completed host actions may support physical claims. Model intent cannot. */
  actionVerified?:boolean;
}
export interface PerformancePlan { speech?:string; origin:SpeechOrigin; reaction?:Reaction; reason:string }
export class PerformanceDirector {
  private feedback:{kind:FeedbackKind;at:number}[]=[];
  constructor(private now=Date.now) {}
  feedbackGiven(kind:FeedbackKind) { this.feedback.push({kind,at:this.now()});this.feedback=this.feedback.slice(-32); }
  context() {
    const kinds=new Set(this.feedback.filter(f=>this.now()-f.at<10*60000).map(f=>f.kind));
    const notes=[kinds.has('repetitive')?'Advance the thought or let it end; no callback to justify the criticism.':'',kinds.has('generic')?'Prefer one concrete judgment supported by the exchange; a plain answer is fine.':'',kinds.has('character')?'Use the established character guide and a fitting attitude, without forced wit or praise.':''].filter(Boolean);
    return notes.length?'\nTEMPORARY DELIVERY FEEDBACK: '+notes.join(' ')+'\n':'';
  }
  plan(i:PerformanceInput):PerformancePlan {
    const base={origin:i.origin};
    if(!i.direct && (i.quiet||!i.available))return {...base,reason:'quiet presence'};
    const line=i.line?.replace(/\s*[—–]\s*/g,', ').trim();
    // Physical actions execute through the capability host, never through prose.
    const claims=/\bI(?:['’]ve| have)? (?:teleported|moved|landed|read your document|inspected the geometry)\b/i;
    if(line && claims.test(line) && !i.actionVerified)return {...base,reason:'unverified physical claim'};
    const intrusive=this.feedback.some(f=>f.kind==='intrusive'&&this.now()-f.at<10*60000);
    if(!i.direct&&intrusive)return {...base,reason:'temporary feedback quiet'};
    const reaction=!i.held&&!i.moving&&i.reaction&&i.availableReactions.includes(i.reaction)?i.reaction:undefined;
    return {...base,speech:line||undefined,reaction,reason:line?'speak':reaction?'expression only':'silence'};
  }
}
