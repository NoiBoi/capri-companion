import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { LifeContext, ContextAssembler } from './context';
import { ChromeBridge } from './chrome';
import { ProjectAdapter } from './projects';
import { LifeSource, safePage } from '../../shared/lifeContext';
import type { SecretStore } from '../store/secrets';
export class LifeService {
  readonly ledger: LifeContext; readonly assembler: ContextAssembler; readonly chrome: ChromeBridge;
  private projects = new Map<string,ProjectAdapter>();
  private generation = 0;
  constructor(dir: string, private secrets: SecretStore, invalidated: () => void, private enabled: () => boolean, persist: () => boolean) {
    this.ledger=new LifeContext(dir,Date.now,invalidated,persist); this.assembler=new ContextAssembler(this.ledger);
    this.chrome=new ChromeBridge(this.ledger,()=>{try {return JSON.parse(secrets.get('lifeBridge')??'{}');}catch{return {token:'',extensionId:''};}});
  }
  async start() {
    const generation = ++this.generation;
    for(const p of this.projects.values())p.stop(); this.projects.clear(); this.chrome.stop();
    if(!this.enabled()) {this.ledger.bridge.state='disabled by memory or local-context controls';return;}
    const chrome=this.ledger.source('chrome'); if(chrome?.permissions.collect&&!chrome.paused)await this.chrome.start();
    if(generation!==this.generation)return;
    for(const source of this.ledger.view().sources)if(source.kind==='project'&&source.permissions.collect&&!source.paused){const adapter=new ProjectAdapter(this.ledger,source);this.projects.set(source.id,adapter);void adapter.start();}
  }
  configure(raw: unknown) {
    const config=LifeSource.parse(raw), old=this.ledger.source(config.id);
    if(!old)throw Error('Use Add project folder to authorize a new source.');
    if(config.kind!==old.kind||config.folder!==old.folder)throw Error('Re-select folders through the folder picker.');
    config.sites=config.sites.map(site=>{const u=safePage(site);if(!u||new URL(site).origin!==site)throw Error('Use exact http(s) site origins, without paths.');return site;});
    this.ledger.configure(config);this.ledger.clearDraft(config.id);void this.start();return this.ledger.view();
  }
  addProject(folder: string) {
    const full=fs.realpathSync(folder), forbidden=[path.parse(full).root,os.homedir(),process.env.APPDATA,process.env.LOCALAPPDATA,process.env.WINDIR].filter(Boolean).map(s=>path.resolve(s!).toLowerCase());
    if(forbidden.includes(full.toLowerCase())||!fs.statSync(full).isDirectory())throw Error('Select a specific project folder.');
    if(this.ledger.view().sources.some(s=>s.kind==='project'&&s.folder?.toLowerCase()===full.toLowerCase()))return this.ledger.view();
    const id='project:'+randomBytes(8).toString('hex'), entityId='project:'+randomBytes(8).toString('hex');
    const source=this.ledger.configure({id,kind:'project',name:path.basename(full),folder:full,entityId,sites:[],retentionDays:7,paused:false,permissions:{collect:true,live:true,retain:false,content:false,learn:false}});
    this.ledger.associate({id:entityId,name:source.name,aliases:[full],evidence:'Explicitly selected project folder',source:id,certainty:'explicit'});
    void this.start();return this.ledger.view();
  }
  pair(extensionId: string) {if(!/^[a-p]{32}$/.test(extensionId))throw Error('Copy the 32-letter extension ID from chrome://extensions.');const token=randomBytes(32).toString('hex');this.secrets.set('lifeBridge',JSON.stringify({extensionId,token}));void this.start();return {token,port:43129,persistent:this.secrets.persistent};}
  forget(id: string, remove=false) {this.ledger.forget(id,remove);if(id==='chrome')this.secrets.delete('lifeBridge');void this.start();}
  clear(){this.ledger.clear();this.secrets.delete('lifeBridge');void this.start();}
  stop(){this.generation++;for(const p of this.projects.values())p.stop();this.projects.clear();this.chrome.stop();this.ledger.flush();}
}
