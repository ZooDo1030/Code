(() => {
  const words = [
    ['阳光透过|阳光下|阳光','sunlit'],['玻璃杯','drinking glass'],['玻璃','glass'],['杯子|杯','cup'],['花瓶','vase'],['折射|焦散|光斑','caustics'],['光影','light and shadow'],['逆光','backlit'],['侧光','side lighting'],['静物','still life'],['水彩','watercolor'],['森林','forest'],['小屋','cottage'],['绘画参考|画画参考|绘画|画画','drawing'],['插画','illustration'],['真实照片|照片|真实','photo'],['手部|手','hand'],['人物|人体','human figure'],['姿势|动作','pose'],['结构','anatomy'],['不同角度|多角度','multiple angles'],['俯视','top view'],['仰视','low angle'],['透视','perspective'],['素描','pencil drawing'],['速写','sketch'],['油画','oil painting'],['厚涂','digital painting'],['线稿','line art'],['复古','vintage'],['奇幻|幻想','fantasy'],['植物','plant'],['花卉|花','flower'],['树','tree'],['动物','animal'],['猫','cat'],['狗','dog'],['鸟','bird'],['水果','fruit'],['苹果','apple'],['石头','rock'],['布料|褶皱','fabric folds'],['金属','metal'],['陶瓷','ceramic'],['木质','wooden'],['椅子','chair'],['建筑','architecture'],['风景','landscape'],['夜景|夜晚','night'],['雨天','rainy'],['眼睛','eyes'],['头发','hair'],['脚','feet'],['脸|面部','face'],['温暖|温馨','warm'],['极简','minimalist'],['可爱','cute']
  ];
  globalThis.xunciLocal = (input, direction) => {
    let remaining = input.trim();
    if (/不要|排除|不是|避免|除了/.test(remaining)) return {items: [], warning: '本地词库无法可靠理解排除条件，请启用 AI，或只输入你想要的对象。'};
    const found = [];
    for (const [pattern, word] of words) {
      const re = new RegExp(pattern, 'g');
      if (re.test(remaining)) { found.push(word); remaining = remaining.replace(re, ' '); }
    }
    const english = remaining.match(/[a-zA-Z][a-zA-Z0-9-]*/g) || [];
    const unknown = remaining.replace(/[a-zA-Z0-9\s\p{P}\p{S}]/gu, '').replace(/的|有|我想找|我想要|一些|一个|参考|适合|和|与/g, '');
    const base = [...new Set([...found, ...english])].join(' ');
    if (!base) return {items: [], warning: '这段描述超出了本地词库。请启用 AI，或试试“玻璃花瓶静物”“水彩森林小屋”。'};
    const suffixes = {drawing: ['drawing reference photo', 'painting light study', 'composition reference'], illustration: ['illustration inspiration', 'illustration composition', 'storybook illustration'], objects: ['object reference photo', 'still life reference', 'detail close up'], anatomy: ['anatomy reference', 'pose reference photo', 'drawing structure study']};
    return {items: (suffixes[direction] || suffixes.drawing).map((suffix, i) => ({query: base + ' ' + suffix, explanation: ['先找接近主题的参考。', '拓展光影、姿势或表现方式。', '进一步寻找构图与细节。'][i]})), warning: unknown ? '未识别的描述：' + unknown + '。请确认建议是否符合原意。' : ''};
  };
})();
