import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { safePage, cleanEvidence } from '../../shared/lifeContext';
import { LifeContext } from './context';
const Page = z.object({ recordId:z.string().min(1).max(100), revision:z.number().int().nonnegative(), occurredAt:z.number().finite(), url:z.string().max(2000), title:z.string().max(300), headings:z.array(z.string().max(200)).max(8), description:z.string().max(500).default(''), selection:z.string().max(1500).default(''), excerpt:z.string().max(1500).default(''), mode:z.enum(['metadata','selection','excerpt']).default('metadata'), incognito:z.literal(false), focused:z.literal(true), visible:z.literal(true), operation:z.enum(['upsert','delete']).default('upsert') }).strict();
export const ChromePage = Page;
/** Authenticated loopback, fixed Host and exact extension Origin. No browser CORS wildcard. */
export class ChromeBridge {
  private server?: http.Server; private last = 0; private serial = 0;
  constructor(private life: LifeContext, private credentials: () => { token: string; extensionId: string }, private port = 43129) {}
  async start() {
    this.stop(); const serial = ++this.serial;
    const {token='',extensionId=''} = this.credentials();
    const credentials = {token,extensionId};
    if (!/^[a-p]{32}$/.test(credentials.extensionId) || credentials.token.length < 32) { this.life.bridge = {state:'Pair extension in Connections',port:this.port,extensionId:credentials.extensionId}; return; }
    this.life.bridge = {state:'starting',port:this.port,extensionId:credentials.extensionId};
    const server = this.server = http.createServer((req,res) => {
      const origin = `chrome-extension://${credentials.extensionId}`;
      const reject = (code:number) => { res.writeHead(code); res.end(); };
      if (req.headers.host !== `127.0.0.1:${this.port}` || req.headers.origin !== origin || req.url !== '/v1/page') return reject(403);
      res.setHeader('Access-Control-Allow-Origin',origin); res.setHeader('Vary','Origin');
      if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods','POST'); res.setHeader('Access-Control-Allow-Headers','authorization,content-type'); return reject(204); }
      const provided = Buffer.from(req.headers.authorization ?? ''), expected = Buffer.from('Bearer '+credentials.token);
      if (req.method !== 'POST' || provided.length !== expected.length || !timingSafeEqual(provided,expected) || !req.headers['content-type']?.startsWith('application/json')) return reject(401);
      if (Date.now()-this.last < 200) return reject(429); this.last = Date.now();
      let size = 0, body = ''; req.setTimeout(3000,()=>req.destroy());
      req.on('data', chunk => { size += chunk.length; if (size>16000) { req.destroy(); return; } body += chunk.toString(); });
      req.on('end',()=>{ try { const data=Page.parse(JSON.parse(body)); const accepted=this.accept(data); res.writeHead(accepted?202:204); res.end(); } catch { reject(400); } });
    });
    server.maxConnections = 4; server.headersTimeout = 4000; server.requestTimeout = 4000;
    await new Promise<void>(resolve => { server.once('error',()=>{if(serial===this.serial)this.life.bridge.state='unavailable: loopback port in use';resolve();}); server.listen(this.port,'127.0.0.1',()=>{if(serial===this.serial)this.life.bridge.state='listening';resolve();}); });
  }
  accept(input: z.infer<typeof Page>) {
    const page = Page.parse(input), s=this.life.source('chrome'); if (!s?.permissions.collect || s.paused) return false;
    const url=safePage(page.url); if (!url || !s.sites.includes(new URL(url).origin)) return false;
    const now=Date.now(); if (Math.abs(now-page.occurredAt)>120000) return false;
    const body = s.permissions.content ? (page.mode==='selection'?page.selection:page.mode==='excerpt'?page.excerpt:'') : '';
    return this.life.ingest({source:'chrome',recordId:page.recordId,revision:page.revision,type:'displayed-page',occurredAt:page.occurredAt,receivedAt:now,expiresAt:now+90000,entities:this.life.resolve(url+' '+page.title),quality:'observed',permissions:s.permissions,summary:cleanEvidence(`${page.title} (${url})`,600),detail:page.operation==='delete'?'Page no longer active or authorized.':cleanEvidence(JSON.stringify({url,title:page.title,headings:page.headings,description:page.description,approvedContent:body,meaning:'Displayed in the focused Chrome tab, not proof of reading.'}),2400),operation:page.operation,importance:body.length? .65 : .4});
  }
  stop() { this.serial++; this.server?.closeAllConnections(); this.server?.close(); this.server=undefined; }
}
