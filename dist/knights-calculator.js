// Alban Knights sub-skill training, from Mabinogi 奇幻世界 (mabinogi.fws.tw skills_sub_info ids 1-5 and 16-20), checked 2026-09-25.
export const MAX_LEVEL = 15;

// levels[n] is the training at Lv.n+1: [condition, % gained per success]. Lv.15 has no training.
export const MAIN_SKILLS = [
  {id:'shield-of-trust', name:'聖盾庇護', cooldown:20, subSkills:[
    {id:'range-bonus', name:'福音傳遞', levels:[
      ['成功保護 100cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 100],
      ['成功保護 110cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 50],
      ['成功保護 120cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 25],
      ['成功保護 130cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 20],
      ['成功保護 140cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 10],
      ['成功保護 150cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 6.25],
      ['成功保護 160cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 6.25],
      ['成功保護 170cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 5],
      ['成功保護 180cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 5],
      ['成功保護 200cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 4],
      ['成功保護 220cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 3.125],
      ['成功保護 240cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 2],
      ['成功保護 260cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 1],
      ['成功保護 280cm 距離以外的組隊成員，使其不會受到使者的殞石流星雨攻擊', 0.5],
    ]},
    {id:'recover-hp', name:'恢復祈禱', levels:[
      ['對生命低於 80% 的目標使用技能', 20],
      ['對生命低於 80% 的目標使用技能', 12.5],
      ['對生命低於 80% 的目標使用技能', 10],
      ['對生命低於 60% 的目標使用技能', 6.25],
      ['對生命低於 60% 的目標使用技能', 5],
      ['對生命低於 60% 的目標使用技能', 4],
      ['對生命低於 50% 的目標使用技能', 3.125],
      ['對生命低於 50% 的目標使用技能', 2.5],
      ['對生命低於 50% 的目標使用技能', 2],
      ['對生命低於 40% 的目標使用技能', 1],
      ['對生命低於 40% 的目標使用技能', 0.5],
      ['對生命低於 40% 的目標使用技能', 0.3125],
      ['對生命低於 30% 的目標使用技能', 0.2],
      ['對生命低於 30% 的目標使用技能', 0.1],
    ]},
    {id:'increase-magic-defense', name:'魔法反制', levels:[
      ['技能發動期間受到敵人攻擊', 20],
      ['技能發動期間受到敵人攻擊', 12.5],
      ['技能發動期間受到敵人攻擊', 10],
      ['技能發動期間受到敵人攻擊', 6.25],
      ['技能發動期間受到敵人攻擊', 5],
      ['技能發動期間受到敵人攻擊', 4],
      ['技能發動期間受到敵人攻擊', 3.125],
      ['技能發動期間受到敵人攻擊', 2.5],
      ['技能發動期間受到敵人攻擊', 2],
      ['技能發動期間受到敵人攻擊', 1],
      ['技能發動期間受到敵人攻擊', 0.5],
      ['技能發動期間受到敵人攻擊', 0.3125],
      ['技能發動期間受到敵人攻擊', 0.2],
      ['技能發動期間受到敵人攻擊', 0.1],
    ]},
    {id:'boost-movement-speed', name:'庇佑步伐', levels:[
      ['成功保護 100cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 100],
      ['成功保護 95cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 50],
      ['成功保護 90cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 25],
      ['成功保護 85cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 20],
      ['成功保護 80cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 10],
      ['成功保護 75cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 6.25],
      ['成功保護 70cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 6.25],
      ['成功保護 65cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 5],
      ['成功保護 60cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 5],
      ['成功保護 55cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 4],
      ['成功保護 50cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 3.125],
      ['成功保護 45cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 2],
      ['成功保護 40cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 1],
      ['成功保護 35cm 距離以內的組隊成員，使其不會受到使者的殞石流星雨攻擊', 0.5],
    ]},
    {id:'recover-wound', name:'復原祈禱', levels:[
      ['對負傷高於 30% 的目標使用技能', 100],
      ['對負傷高於 30% 的目標使用技能', 50],
      ['對負傷高於 30% 的目標使用技能', 50],
      ['對負傷高於 40% 的目標使用技能', 25],
      ['對負傷高於 40% 的目標使用技能', 25],
      ['對負傷高於 40% 的目標使用技能', 20],
      ['對負傷高於 50% 的目標使用技能', 20],
      ['對負傷高於 50% 的目標使用技能', 12.5],
      ['對負傷高於 50% 的目標使用技能', 10],
      ['對負傷高於 60% 的目標使用技能', 6.25],
      ['對負傷高於 60% 的目標使用技能', 5],
      ['對負傷高於 60% 的目標使用技能', 4],
      ['對負傷高於 70% 的目標使用技能', 3.125],
      ['對負傷高於 70% 的目標使用技能', 2.5],
    ]},
  ]},
  {id:'divine-link', name:'聖靈同步', cooldown:60, subSkills:[
    {id:'exp-bonus', name:'啟迪之光', levels:[
      ['靈魂連結狀態下獲得經驗值 5,000 以上', 10],
      ['靈魂連結狀態下獲得經驗值 8,000 以上', 10],
      ['靈魂連結狀態下獲得經驗值 10,000 以上', 5],
      ['靈魂連結狀態下獲得經驗值 10,000 以上', 5],
      ['靈魂連結狀態下獲得經驗值 10,000 以上', 4],
      ['靈魂連結狀態下獲得經驗值 13,000 以上', 3],
      ['靈魂連結狀態下獲得經驗值 13,000 以上', 2],
      ['靈魂連結狀態下獲得經驗值 13,000 以上', 1],
      ['靈魂連結狀態下獲得經驗值 15,000 以上', 0.8],
      ['靈魂連結狀態下獲得經驗值 15,000 以上', 0.8],
      ['靈魂連結狀態下獲得經驗值 15,000 以上', 0.5],
      ['靈魂連結狀態下獲得經驗值 18,000 以上', 0.5],
      ['靈魂連結狀態下獲得經驗值 18,000 以上', 0.2],
      ['靈魂連結狀態下獲得經驗值 20,000 以上', 0.2],
    ]},
    {id:'pet-damage-bonus', name:'聖光顯靈', levels:[
      ['靈魂連結狀態下寵物消滅敵人', 10],
      ['靈魂連結狀態下寵物消滅 2 名以上敵人', 10],
      ['靈魂連結狀態下寵物消滅 3 名以上敵人', 5],
      ['靈魂連結狀態下寵物消滅 4 名以上敵人', 5],
      ['靈魂連結狀態下寵物消滅 5 名以上敵人', 5],
      ['靈魂連結狀態下寵物消滅 6 名以上敵人', 4],
      ['靈魂連結狀態下寵物消滅 7 名以上敵人', 3],
      ['靈魂連結狀態下寵物消滅 8 名以上敵人', 2],
      ['靈魂連結狀態下寵物消滅 9 名以上敵人', 1.5],
      ['靈魂連結狀態下寵物消滅 10 名以上敵人', 1.5],
      ['靈魂連結狀態下寵物消滅 11 名以上敵人', 1],
      ['靈魂連結狀態下寵物消滅 12 名以上敵人', 1],
      ['靈魂連結狀態下寵物消滅 13 名以上敵人', 0.8],
      ['靈魂連結狀態下寵物消滅 14 名以上敵人', 0.5],
    ]},
    {id:'pet-no-hit-motion', name:'守護者的誓約', levels:[
      ['靈魂連結狀態下發動自動防禦', 10],
      ['靈魂連結狀態下發動自動防禦', 10],
      ['靈魂連結狀態下發動自動防禦', 5],
      ['靈魂連結狀態下發動自動防禦', 5],
      ['靈魂連結狀態下發動自動防禦', 4],
      ['靈魂連結狀態下發動自動防禦', 3],
      ['靈魂連結狀態下發動自動防禦 3 次以上', 3],
      ['靈魂連結狀態下發動自動防禦 3 次以上', 2],
      ['靈魂連結狀態下發動自動防禦 3 次以上', 1],
      ['靈魂連結狀態下發動自動防禦 3 次以上', 0.8],
      ['靈魂連結狀態下發動自動防禦 5 次以上', 0.8],
      ['靈魂連結狀態下發動自動防禦 5 次以上', 0.5],
      ['靈魂連結狀態下發動自動防禦 5 次以上', 0.4],
      ['靈魂連結狀態下發動自動防禦 5 次以上', 0.3],
    ]},
    {id:'pet-life-wound-recover', name:'復甦的靈魂', levels:[
      ['寵物生命值低於 50% 時使用技能', 20],
      ['寵物生命值低於 50% 時使用技能', 15],
      ['寵物生命值低於 50% 時使用技能', 10],
      ['寵物生命值低於 40% 時使用技能', 8],
      ['寵物生命值低於 40% 時使用技能', 5],
      ['寵物生命值低於 40% 時使用技能', 4],
      ['寵物生命值低於 30% 時使用技能', 3],
      ['寵物生命值低於 30% 時使用技能', 2],
      ['寵物生命值低於 30% 時使用技能', 2],
      ['寵物生命值低於 20% 時使用技能', 1.5],
      ['寵物生命值低於 20% 時使用技能', 1],
      ['寵物生命值低於 20% 時使用技能', 0.8],
      ['寵物生命值低於 10% 時使用技能', 0.8],
      ['寵物生命值低於 10% 時使用技能', 0.4],
    ]},
    {id:'pet-auto-revive', name:'復活的權杖', levels:[
      ['靈魂連結狀態下使寵物復活', 20],
      ['靈魂連結狀態下使寵物復活', 15],
      ['靈魂連結狀態下使寵物復活', 10],
      ['靈魂連結狀態下使寵物復活', 8],
      ['靈魂連結狀態下使寵物復活', 6],
      ['靈魂連結狀態下使寵物復活', 5],
      ['靈魂連結狀態下使寵物復活', 4],
      ['靈魂連結狀態下使寵物復活', 1.5],
      ['靈魂連結狀態下使寵物復活', 1],
      ['靈魂連結狀態下使寵物復活', 0.8],
      ['靈魂連結狀態下使寵物復活', 0.5],
      ['靈魂連結狀態下使寵物復活', 0.4],
      ['靈魂連結狀態下使寵物復活', 0.3],
      ['靈魂連結狀態下使寵物復活', 0.2],
    ]},
  ]},
];

export const SUB_SKILLS = MAIN_SKILLS.flatMap(main => main.subSkills.map(sub => ({...sub, main:main.id})));

function number(value, min, max, label, {integer = false, inclusiveMax = true} = {}) {
  const n = Number(value);
  if (value === '' || value == null || typeof value === 'boolean' || !Number.isFinite(n) || (integer && !Number.isInteger(n))
    || n < min || (inclusiveMax ? n > max : n >= max)) {
    throw new Error(`${label}須為 ${min} 至${inclusiveMax ? '' : '小於'} ${max} 的${integer ? '整數' : '數值'}。`);
  }
  return n;
}

// Successes needed to fill the rest of a level; the tiny tolerance absorbs floating-point noise at exact multiples.
export function successesNeeded(gain, progress = 0) {
  return Math.max(0, Math.ceil((100 - progress) / gain - 1e-9));
}

export function defaultKnightsPlan() {
  return {
    intervals:Object.fromEntries(MAIN_SKILLS.map(main => [main.id, main.cooldown])),
    subSkills:Object.fromEntries(SUB_SKILLS.map(sub => [sub.id, {level:1, progress:0}])),
  };
}

export function calculateKnights(plan) {
  const mains = MAIN_SKILLS.map(main => {
    const interval = number(plan?.intervals?.[main.id], 0.1, 86400, `${main.name}每次成功間隔（秒）`);
    const rows = main.subSkills.map(sub => {
      const choice = plan?.subSkills?.[sub.id];
      if (!choice || typeof choice !== 'object') throw new Error(`缺少${sub.name}的等級設定。`);
      const level = number(choice.level, 1, MAX_LEVEL, `${sub.name}目前等級`, {integer:true});
      if (level === MAX_LEVEL) return {...sub, level, progress:0, maxed:true, gain:null, condition:null, next:null, toMax:null};
      const progress = number(choice.progress ?? 0, 0, 100, `${sub.name}目前修練值`, {inclusiveMax:false});
      const [condition, gain] = sub.levels[level - 1];
      const nextSuccesses = successesNeeded(gain, progress);
      let maxSuccesses = nextSuccesses;
      for (let at = level + 1; at < MAX_LEVEL; at++) maxSuccesses += successesNeeded(sub.levels[at - 1][1]);
      return {...sub, level, progress, maxed:false, gain, condition,
        next:{successes:nextSuccesses, seconds:nextSuccesses * interval},
        toMax:{successes:maxSuccesses, seconds:maxSuccesses * interval}};
    });
    return {...main, interval, rows};
  });
  return {mains};
}

export function formatDuration(seconds) {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600), minutes = Math.floor(total % 3600 / 60), rest = total % 60;
  if (hours) return `${hours.toLocaleString('zh-TW')} 小時 ${minutes} 分 ${rest} 秒`;
  if (minutes) return `${minutes} 分 ${rest} 秒`;
  return `${rest} 秒`;
}
