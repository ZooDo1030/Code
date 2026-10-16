(() => {
  const words = [
    ['阳光透过|阳光下|阳光','sunlit'],['玻璃杯','drinking glass'],['玻璃','glass'],['杯子|杯','cup'],['花瓶','vase'],['折射|焦散|光斑','caustics'],['光影','light and shadow'],['逆光','backlit'],['侧光','side lighting'],['静物','still life'],['水彩','watercolor'],['森林','forest'],['小屋','cottage'],['绘画参考|画画参考|绘画|画画','drawing'],['插画','illustration'],['真实照片|照片|真实','photo'],['手部|手','hand'],['人物|人体','human figure'],['姿势|动作','pose'],['结构','anatomy'],['不同角度|多角度','multiple angles'],['俯视','top view'],['仰视','low angle'],['透视','perspective'],['素描','pencil drawing'],['速写','sketch'],['油画','oil painting'],['厚涂','digital painting'],['线稿','line art'],['复古','vintage'],['奇幻|幻想','fantasy'],['植物','plant'],['花卉|花','flower'],['树','tree'],['动物','animal'],['猫','cat'],['狗','dog'],['鸟','bird'],['水果','fruit'],['苹果','apple'],['石头','rock'],['布料|褶皱','fabric folds'],['金属','metal'],['陶瓷','ceramic'],['木质','wooden'],['椅子','chair'],['建筑','architecture'],['风景','landscape'],['夜景|夜晚','night'],['雨天','rainy'],['眼睛','eyes'],['头发','hair'],['脚','feet'],['脸|面部','face'],['温暖|温馨','warm'],['极简','minimalist'],['可爱','cute']
  ];
  const phrases = new Map([
    ['阳光透过玻璃杯的光影', 'Light and shadows from sunlight passing through a glass'],
    ['阳光下的玻璃花瓶静物', 'Still life of a glass vase in sunlight'],
    ['手部不同角度绘画参考', 'Drawing references of hands from different angles'],
    ['水彩森林小屋', 'A watercolor cottage in the forest'],
    ['水彩森林小屋插画', 'A watercolor illustration of a cottage in the forest']
  ]);
  globalThis.xunciLocal = input => {
    const text = input.trim();
    if (phrases.has(text)) return {mode: 'local', translation: phrases.get(text)};
    // Only translate whole dictionary entries; never silently drop unknown words.
    for (const [pattern, translation] of words) {
      if (new RegExp('^(?:' + pattern + ')$').test(text)) return {mode: 'local', translation};
    }
    return {error: '这句话超出本地词库，请在设置中启用 AI 翻译'};
  };
})();
