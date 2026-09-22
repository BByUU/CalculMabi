export const BASE_REWARD = 2;
export const GRADES = ['E', 'D', 'C', 'B', 'A'];
export const MATERIAL_TIERS = ['最初級', '初級', '中級', '高級', '最高級'];
export const MAIN_STEPS = [
  [10,0,10], [15,0,15], [20,0,20], [25,1,20], [30,1,25],
  [35,1,30], [40,2,30], [45,2,35], [50,2,40], [55,3,40],
  [60,3,45], [65,3,50], [70,4,50], [80,4,60],
].map(([common,tier,quantity],i)=>({from:i+1,to:i+2,common,tier,quantity}));
export const SUPPORT_STEPS = [
  [1,0,1], [.9,0,1], [.8,1,1], [.7,1,1], [.6,2,2],
  [.5,2,2], [.4,3,2], [.3,3,2], [.2,4,2],
].map(([probability,tier,quantity],i)=>({from:i+1,to:i+2,probability,tier,quantity}));
export const SUPPORT_EFFECTS = ['', '智能', '動力'].flatMap((prefix,group)=>
  ['爆破','閃焰','疾風','追逐者','籠罩'].map((name,i)=>({id:`effect-${group*5+i+1}`,name:prefix+name,unlock:group*5+i+1,group,family:i})));
export const BONUS_KEYS = ['crystal','totem','potion','event'];

export function defaultStardustPlan() {
  return {currentRank:1,targetRank:15,mode:'confidence',confidence:.99,bonuses:{crystal:false,totem:false,potion:false,event:false},
    effects:SUPPORT_EFFECTS.map(e=>({id:e.id,enabled:true,current:1,target:10}))};
}
export function toggleStardustBonus(bonuses,key,enabled) {
  if (!BONUS_KEYS.includes(key)) throw new Error('未知的加倍項目');
  const result={...bonuses,[key]:Boolean(enabled)};
  if (enabled && key==='totem') result.potion=false;
  if (enabled && key==='potion') result.totem=false;
  return result;
}
export function stardustMultiplier(bonuses={}) {
  if (bonuses.totem && bonuses.potion) throw new Error('圖騰與藥水不能同時使用');
  return BONUS_KEYS.reduce((value,key)=>value*(bonuses[key]?2:1),1);
}
function integer(value,min,max,name) {
  if (value==='' || value==null || !Number.isSafeInteger(Number(value)) || value<min || value>max)
    throw new Error(`${name}須為 ${min}–${max} 的整數`);
  return Number(value);
}
const gcd=(a,b)=>b?gcd(b,a%b):a;
function convolveModulo(a,b) {
  const out=Array(a.length).fill(0);
  for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) out[(i+j)%out.length]+=a[i]*b[j];
  return out;
}
function convolve(a,b) {
  const out=Array(a.length+b.length-1).fill(0);
  for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) out[i+j]+=a[i]*b[j];
  return out;
}
// Exact residue distribution of cost * N, N ~ Geometric(p), N >= 1.
// A finite geometric series accounts for the entire infinite failure tail.
function geometricResidues(p,cost,reward) {
  const period=reward/gcd(cost,reward), q=1-p;
  const out=Array(reward).fill(0), denominator=1-q**period;
  for(let n=1;n<=period;n++) out[(n*cost)%reward]+=p*q**(n-1)/denominator;
  return out;
}
export function calculateStardust(plan) {
  if(!['expectation','confidence'].includes(plan.mode)) throw new Error('請選擇期望值或目標累積成功率');
  // Percentage inputs such as 99.9 / 100 may land just above .999 in binary.
  const confidence=Number(Number(plan.confidence).toPrecision(14));
  if(plan.mode==='confidence' && (plan.confidence==null || plan.confidence==='' || !Number.isFinite(confidence) || confidence<.001 || confidence>.999))
    throw new Error('目標累積成功率須為 0.1%–99.9%');
  const currentRank=integer(plan.currentRank,1,15,'目前 Rank');
  const targetRank=integer(plan.targetRank,1,15,'目標 Rank');
  if(targetRank<currentRank) throw new Error('目標 Rank 不能低於目前 Rank');
  const multiplier=stardustMultiplier(plan.bonuses);
  const reward=BASE_REWARD*multiplier;
  const main=Array(5).fill(0), support=Array(5).fill(0);
  let mainCommon=0, attempts=0, activeEffects=0;
  for(const step of MAIN_STEPS.filter(s=>s.from>=currentRank && s.to<=targetRank)) {
    main[step.tier]+=step.quantity; mainCommon+=step.common;
  }
  let residues=main.map(n=>{const p=Array(reward).fill(0);p[n%reward]=1;return p;});
  const ids=new Set();
  for(const choice of plan.effects || []) {
    const effect=SUPPORT_EFFECTS.find(e=>e.id===choice.id);
    if(!effect || ids.has(choice.id)) throw new Error('支援效果項目無效或重複');
    ids.add(choice.id);
    if(!choice.enabled || effect.unlock>targetRank) continue;
    const start=integer(choice.current,1,10,`${effect.name}目前等級`);
    const end=integer(choice.target,1,10,`${effect.name}目標等級`);
    if(end<start) throw new Error(`${effect.name}的目標等級不能低於目前等級`);
    if(end>start) activeEffects++;
    for(const step of SUPPORT_STEPS.filter(s=>s.from>=start && s.to<=end)) {
      const quotient=step.probability===1?1:Math.log1p(-confidence)/Math.log1p(-step.probability);
      const mean=plan.mode==='expectation'?1/step.probability:Math.max(1,Math.ceil(quotient-8*Number.EPSILON*Math.max(1,quotient)));
      attempts+=mean;
      support[step.tier]+=step.quantity*mean;
      if(plan.mode==='expectation') residues[step.tier]=convolveModulo(residues[step.tier],geometricResidues(step.probability,step.quantity,reward));
      else {
        const fixed=Array(reward).fill(0);fixed[(mean*step.quantity)%reward]=1;
        residues[step.tier]=convolveModulo(residues[step.tier],fixed);
      }
    }
  }
  let surplusDistribution=[1];
  const rows=GRADES.map((grade,tier)=>{
    const surplus=Array(reward).fill(0);
    residues[tier].forEach((probability,remainder)=>{surplus[(reward-remainder)%reward]+=probability;});
    const meanSurplus=surplus.reduce((sum,p,n)=>sum+p*n,0);
    surplusDistribution=convolve(surplusDistribution,surplus);
    const total=main[tier]+support[tier];
    return {grade,tier:MATERIAL_TIERS[tier],main:main[tier],support:support[tier],total,tasks:(total+meanSurplus)/reward};
  });
  // Every graded quest already supplies common material. Only the deficit needs
  // additional quests; use E quests and reuse all rounding leftovers across goals.
  const commonGap=mainCommon-main.reduce((a,b)=>a+b,0);
  const commonDeficit=surplusDistribution.reduce((sum,p,surplus)=>sum+p*Math.max(0,commonGap-surplus),0);
  const extraTasks=surplusDistribution.reduce((sum,p,surplus)=>sum+p*Math.ceil(Math.max(0,commonGap-surplus)/reward),0);
  const gradedTasks=rows.reduce((sum,row)=>sum+row.tasks,0);
  const perType=gradedTasks+extraTasks;
  const supportCommon=support.reduce((a,b)=>a+b,0);
  return {rows,mainCommon,supportCommon,commonTotal:mainCommon+supportCommon,
    commonFromGradedTasks:gradedTasks*reward,commonDeficit,
    extraTasks,lifeTasks:perType,combatTasks:perType,totalTasks:perType*2,reward,multiplier,activeEffects,attempts,mode:plan.mode,confidence};
}
