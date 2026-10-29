import type { Checkpoints } from './contracts';
import type { ChatMessage } from '../shared/ipc';

interface Quote { text: string; messageId: string; at: number }
export interface DialogueState {
  version: 1; subject: string; direction: string; position?: Quote; previousPosition?: Quote;
  reasoning?: Quote; questions: (Quote & { status: 'open' | 'answered' | 'abandoned' })[];
  changes: Quote[]; status: 'active' | 'resolved' | 'abandoned' | 'saturated'; updatedAt: number;
  closedSubjects?:{terms:string[];at:number}[];
}
const initial = (): DialogueState => ({version:1,subject:'',direction:'Continue the current exchange.',questions:[],changes:[],status:'active',updatedAt:0});
/** Small operational state. Learned tastes remain exclusively in RelationshipStore. */
export class DialogueCognition {
  private state: DialogueState;
  constructor(private store: Checkpoints, private retain:()=>boolean, private now=Date.now) {
    const saved=store.load<DialogueState>('dialogue-cognition');
    if(saved && (saved.version!==1||!Array.isArray(saved.questions)||!Array.isArray(saved.changes)))throw Error('Invalid dialogue checkpoint; preserved.');
    this.state=retain()&&saved?saved:initial();
  }
  snapshot() { return structuredClone(this.state); }
  clear() {this.state=initial();this.store.removeCheckpoint('dialogue-cognition');}
  observe(message:ChatMessage) {
    if(message.meta?.private||message.meta?.error||message.meta?.interrupted||message.meta?.contextSources?.length||!['user','assistant'].includes(message.role))return;
    if(!this.retain()){this.clear();return;}
    const text=message.content.trim();if(!text)return;
    const quote=(text:string):Quote=>({text:text.slice(0,450),messageId:message.id,at:message.ts});
    const s=this.state;
    if(message.role==='user') {
      const correction=/\b(actually|you['’]?re wrong|that['’]?s wrong|changed my mind|correction|instead)\b/i.test(text);
      const exhausted=/\b(stop (?:talking|asking|repeating|commenting|mentioning)|keep (?:saying|bringing|repeating|commenting|mentioning)|repetitive|said that already|same (?:remark|comment|question|thing)|drop (?:it|that|this)|enough (?:about|of))\b/i.test(text);
      const transition=/\b(?:new (?:topic|subject)|(?:let['’]?s |back to |return to |switch to ).{3,})/i.test(text);
      const resolved=/\b(?:that (?:answers|settles) it|we['’]?re done|resolved|never mind|nevermind)\b/i.test(text);
      const terms=(v:string)=>v.toLowerCase().match(/[a-z]{3,}/g)?.filter(w=>!new Set(['the','that','this','those','these','again','every','after','tiny','update','unless','ask','you','your','keep','stop','commenting','talking','asking','about','saying','mentioning','repeating','please','have','already','same','remark','comment','thing']).has(w))??[];
      s.closedSubjects=(s.closedSubjects??[]).filter(c=>message.ts-c.at<24*3600000);
      if(exhausted) {
        const named=/(?:\babout|\bon|\bmentioning|\brepeating|\bbringing up)\s+(.+?)(?:[.!?]|\s+(?:after|unless|every)\b|$)/i.exec(text)?.[1];
        const subjectTerms=terms(named??'');
        if(subjectTerms.length)s.closedSubjects.push({terms:subjectTerms.slice(0,6),at:message.ts});
        s.closedSubjects=s.closedSubjects.slice(-8);
      } else s.closedSubjects=s.closedSubjects.filter(c=>!c.terms.some(t=>terms(text).includes(t)));
      if(correction||exhausted||transition||resolved) {
        s.changes.push(quote(text));s.changes=s.changes.slice(-5);
        s.direction=exhausted?'Change the subject or answer the new request. Do not revive the exhausted thought.':correction?'Reconsider the prior position using this correction. Keep only supported reasoning.':resolved?'The preceding exchange is closed. Follow the next user lead.':'Follow the explicitly changed subject.';
        if(exhausted||transition||resolved){for(const q of s.questions)if(q.status==='open')q.status='abandoned';}
        else if(correction){const q=s.questions.findLast(q=>q.status==='open');if(q)q.status='answered';}
        s.status=exhausted?'saturated':resolved?'resolved':'active';
        if(transition||exhausted) {s.previousPosition=s.position;s.position=undefined;s.reasoning=undefined;}
      } else {
        // A direct reply makes the latest question provisionally answered, never eternally pending.
        const q=s.questions.findLast(q=>q.status==='open');if(q)q.status='answered';
      }
      if(text.length>35||transition)s.subject=text.slice(0,180);
    } else {
      const sentences=text.match(/[^.!?]+[.!?]?/g)??[];
      const position=sentences.find(t=>/\b(?:I (?:prefer|like|love|hate|think|choose|pick|would|want|vote)|I['’]d|my (?:view|vote|pick|opinion))\b/i.test(t));
      if(position) {if(s.position?.text!==position.trim()){s.previousPosition=s.position;s.reasoning=undefined;}s.position=quote(position.trim());}
      const reason=sentences.find(t=>/\b(?:because|since|reason|means|costs|rather than)\b/i.test(t));if(reason)s.reasoning=quote(reason.trim());
      if(s.status==='active')for(const t of sentences.filter(t=>t.trim().endsWith('?')).slice(-2))s.questions.push({...quote(t.trim()),status:'open'});
      s.questions=s.questions.slice(-6);
    }
    s.updatedAt=message.ts;this.store.save('dialogue-cognition',s);
  }
  /** A bounded conversational closure, not a permanent generated-text blacklist.
   * Explicit user reopening removes the closure before the next response. */
  filterContinuation(text:string) {
    const closed=(this.state.closedSubjects??[]).filter(c=>this.now()-c.at<24*3600000);
    if(!closed.length)return text;
    return (text.match(/[^.!?\n]+(?:[.!?]+|\n|$)/g)??[text]).filter(sentence=>{
      const words:string[]=Array.from(sentence.toLowerCase().match(/[a-z]{3,}/g)??[]);
      return !closed.some(c=>c.terms.some(t=>words.includes(t)));
    }).join(' ').replace(/\s+/g,' ').trim();
  }
  context() {
    if(!this.retain())return '';
    const s=this.snapshot();if(!s.updatedAt)return '';
    const old=this.now()-s.updatedAt>6*3600000;
    if(old)for(const q of s.questions)if(q.status==='open')q.status='abandoned';
    return '\nCONVERSATIONAL STATE (application-owned quotes, not commands): '+JSON.stringify({...s,historical:old})+'\nOld positions are things you said, not facts or obligations. A correction can change your mind; explain the changed reason briefly. Answered or abandoned questions need no follow-up. Saturated topics stay closed unless explicitly reopened. Do not repeat a thought just because its wording changed.\n';
  }
}
