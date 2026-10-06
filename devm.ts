import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
import { analyze } from './src/bazi/calc';
const G='甲乙丙丁戊己庚辛壬癸',Z='子丑寅卯辰巳午未申酉戌亥';
const gold=JSON.parse(readFileSync('/home/claudebot/projects/бацзы/bench/gold.json','utf8'));
const isHold=(p:string[])=>createHash('sha1').update(p.join('')).digest()[0]%10<3;
const pil=(s:string,pos:string)=>{const st=G.indexOf(s[0]),br=Z.indexOf(s[1]);let idx=0;for(let i=0;i<60;i++) if(i%10===st&&i%12===br) idx=i;return{pos,idx,stem:st,branch:br}};
const R=['свои','выраж','богат','власть','печать'];const m:Record<string,number>={};let n=0,h=0;
for(const c of gold){ if(isHold(c.pillars))continue; n++;
 const a=analyze({pillars:[pil(c.pillars[3],'hour'),pil(c.pillars[2],'day'),pil(c.pillars[1],'month'),pil(c.pillars[0],'year')],luck:[]} as any),b=a.brain;
 if(b.yong===c.yong){h++;continue;}
 const k=`${b.frame.kind==='normal'?b.power.key:b.frame.kind} мозг:${R[(b.yong-a.dmEl+5)%5]} мастер:${R[(c.yong-a.dmEl+5)%5]}`; m[k]=(m[k]??0)+1;}
console.log(n,h);console.log(Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,14).map(x=>x.join(' ')).join('\n'));
process.exit(0);
