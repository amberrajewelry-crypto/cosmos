import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
import { analyze } from './src/bazi/calc';
const G='甲乙丙丁戊己庚辛壬癸',Z='子丑寅卯辰巳午未申酉戌亥';
const gold=JSON.parse(readFileSync('/home/claudebot/projects/бацзы/bench/gold.json','utf8'));
const isHold=(p:string[])=>createHash('sha1').update(p.join('')).digest()[0]%10<3;
const pil=(s:string,pos:string)=>{const st=G.indexOf(s[0]),br=Z.indexOf(s[1]);let idx=0;for(let i=0;i<60;i++) if(i%10===st&&i%12===br) idx=i;return{pos,idx,stem:st,branch:br}};
const rows=gold.map((c:any)=>({c,hold:isHold(c.pillars),a:analyze({pillars:[pil(c.pillars[3],'hour'),pil(c.pillars[2],'day'),pil(c.pillars[1],'month'),pil(c.pillars[0],'year')],luck:[]} as any)}));
const run=(name:string,f:(a:any)=>number|null)=>{const r={dev:[0,0],hold:[0,0],fired:0,odd:[0,0],even:[0,0]} as any;
 for(const {c,hold,a} of rows){const y=f(a);if(y!==null)r.fired++;const v=(y??a.brain.yong)===c.yong?1:0;const k=hold?'hold':'dev';r[k][0]+=v;r[k][1]++; if(!hold){const q=c.id%2?'odd':'even';r[q][0]+=v;r[q][1]++;}}
 const p=(x:number[])=>`${x[0]}/${x[1]}`;console.log(name,'fired',r.fired,'DEV',p(r.dev),'odd',p(r.odd),'even',p(r.even),'HOLD',p(r.hold));};
run('base',()=>null);
for(const t of [0.3,0.35,0.4,0.45]) run(`weak&res>=${t}→wealth`,a=>{const d=a.dmEl,res=(d+4)%5;return a.brain.frame.kind==='normal'&&a.brain.power.key==='weak'&&a.pct[res]>=t?(d+2)%5:null;});
for(const t of [0.3,0.35,0.4]) run(`strong&officer>=${t}→res`,a=>{const d=a.dmEl;return a.brain.frame.kind==='normal'&&a.brain.power.key==='strong'&&a.pct[(d+3)%5]>=t?(d+4)%5:null;});
process.exit(0);
