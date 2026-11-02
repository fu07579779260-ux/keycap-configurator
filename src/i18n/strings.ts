// UI strings. English is the source; every key must exist in both languages.
const en = {
  'app.title': 'Keycap Configurator',
  'app.skip': 'Skip to content',
  'nav.label': 'Main',
  'nav.home': 'Home',
  'nav.configure': 'Configure',
  'nav.compare': 'Compare',
  'nav.fingerFit': 'Finger fit',
  'nav.presets': 'Presets',
  'nav.settings': 'Settings',
  'lang.label': 'Language',

  'home.kicker': 'Configurable 3D-printed product · 03',
  'home.title': 'Design a keycap that fits your fingertip.',
  'home.lead':
    'Choose a top form, tune it to the millimetre, and export files a maker can print today.',
  'home.start': 'Start designing',
  'home.fingerFit': 'Measure my finger',
  'home.flow': 'Personalisation flow',
  'home.flow.1': 'Select a form',
  'home.flow.2': 'Adjust parameters',
  'home.flow.3': 'Preview the model',
  'home.flow.4': '3D print',
  'home.flow.5': 'Install and test',
  'home.forms': 'Five top forms',
  'form.flat': 'Flat',
  'form.concave': 'Concave',
  'form.convex': 'Convex',
  'form.angled': 'Angled',
  'form.tactile': 'Tactile',

  'page.configure.title': 'Configurator',
  'page.configure.summary': 'Wizard and expert modes with a live 3D preview.',
  'page.compare.title': 'Compare',
  'page.compare.summary': 'Several keycaps side by side; export them as a set.',
  'page.fingerFit.title': 'Finger fit',
  'page.fingerFit.summary':
    'Measure a fingertip from a photo or 3D scan and get a recommended shape.',
  'page.presets.title': 'Preset library',
  'page.presets.summary': 'Built-in examples and your saved designs.',
  'page.settings.title': 'Settings',
  'page.settings.summary':
    'Language, accessibility, voice feedback, printer presets and local data.',
  'page.pending': 'Coming in a later build step.',

  'footer.drawing': 'Drawing',
  'footer.sheet': 'Sheet',
  'footer.units': 'Units',
  'footer.pitch': 'Key pitch',
}

export type StringKey = keyof typeof en

const zh: Record<StringKey, string> = {
  'app.title': '键帽配置器',
  'app.skip': '跳到主要内容',
  'nav.label': '主导航',
  'nav.home': '首页',
  'nav.configure': '配置',
  'nav.compare': '对比',
  'nav.fingerFit': '手指推荐',
  'nav.presets': '预设库',
  'nav.settings': '设置',
  'lang.label': '语言',

  'home.kicker': '可配置 3D 打印产品 · 03',
  'home.title': '设计一颗贴合指尖的键帽。',
  'home.lead': '选择顶面形态，精确到毫米地调整参数，导出制作人员当天就能打印的文件。',
  'home.start': '开始设计',
  'home.fingerFit': '测量我的手指',
  'home.flow': '个性化流程',
  'home.flow.1': '选择形态',
  'home.flow.2': '调整参数',
  'home.flow.3': '模型预览',
  'home.flow.4': '3D 打印',
  'home.flow.5': '安装试用',
  'home.forms': '五种顶面形态',
  'form.flat': '平顶',
  'form.concave': '内凹',
  'form.convex': '凸顶',
  'form.angled': '倾斜',
  'form.tactile': '触觉标记',

  'page.configure.title': '配置器',
  'page.configure.summary': '向导模式与专家模式，配合实时 3D 预览。',
  'page.compare.title': '对比',
  'page.compare.summary': '多颗键帽并排比较，并可成套导出。',
  'page.fingerFit.title': '手指推荐',
  'page.fingerFit.summary': '通过照片或 3D 扫描测量指尖，获得推荐形态。',
  'page.presets.title': '预设库',
  'page.presets.summary': '内置示例与你保存的设计。',
  'page.settings.title': '设置',
  'page.settings.summary': '语言、无障碍、语音播报、打印机预设与本地数据。',
  'page.pending': '将在后续构建步骤中完成。',

  'footer.drawing': '图号',
  'footer.sheet': '页码',
  'footer.units': '单位',
  'footer.pitch': '键距',
}

export const LANGUAGES = ['en', 'zh'] as const
export type Language = (typeof LANGUAGES)[number]

export const STRINGS: Record<Language, Record<StringKey, string>> = { en, zh }
