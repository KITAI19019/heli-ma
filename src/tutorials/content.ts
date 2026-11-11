import type { Kind } from '../model';

export type TutorialIllustration =
  | 'input'
  | 'fact-grid'
  | 'fact-source'
  | 'relation-grid'
  | 'relation-notes'
  | 'claim-reason'
  | 'claim-backing'
  | 'judgment';

export interface TutorialStep {
  title: string;
  instruction: string;
  illustration: TutorialIllustration;
  caption: string;
}

interface Tutorial {
  title: string;
  description: string;
  steps: readonly TutorialStep[];
}

export const tutorialKinds: readonly Kind[] = ['fact', 'relation', 'claim'];

export const tutorialExamples = {
  fact: {
    statement: '动物园里的狮子跑出来了。',
    cells: [
      '其他笼子和建筑也损坏了？',
      '还有其他动物跑出来了？',
      '政府和警察会通知附近居民？',
      '地震导致笼子损坏了？',
      '动物园里的狮子跑出来了。',
      '狮子在街道上徘徊？',
      '狮子受伤了？',
      '',
      '狮子会找地方养伤？',
    ],
    notes: {
      label: '上级·未来',
      paragraphs: ['推想：政府和警察会通知附近居民。', '查证：目前没有接到这类通知。'],
      source: '当地政府或警方通知的标题、日期或链接',
    },
  },
  relation: {
    a: '求雨',
    b: '下雨',
    notes: {
      label: 'A 未发生，B 发生',
      paragraphs: [
        '案例：没有举行求雨仪式，也下雨了。',
        '补充：按天记录同一地区是否求雨、是否下雨。',
      ],
      source: '同一地区、同一时段的求雨与降雨记录',
    },
  },
  claim: {
    statement: '学校食堂应该提供小份菜。',
    fact: '午饭后，不少同学的餐盘里还有剩菜。',
    reason: '小份菜能让饭量小的同学按需点餐，减少剩菜。',
    backing: '试供小份菜后，同一批同学的剩菜量减少了。',
    exception: '如果剩菜主要因为口味不合，而不是分量太多。',
  },
} as const;

export const tutorials: Record<Kind, Tutorial> = {
  fact: {
    title: '事实教程',
    description: '写下说法，填九宫格，再查证。',
    steps: [
      {
        title: '写下想核查的那句话',
        instruction:
          '在首页点「事实」，填入想核查的说法，再点「进入分析」。这里以地震后「狮子逃出动物园」的传言为例。',
        illustration: 'input',
        caption: '输入具体说法，再进入分析。',
      },
      {
        title: '从中间一格，向周围想',
        instruction:
          '原话位于中间。点周围格子，写下狮子逃出前后、动物园和狮子自身要核查的情况。想不到可留空；改原话点「修改输入」。',
        illustration: 'fact-grid',
        caption: '先想前后，再看周围与细节。',
      },
      {
        title: '把查到的内容补回格子',
        instruction:
          '查公告、问工作人员，再分开记录「推想」与「查证」，未核实写「待查」。点「＋ 来源」记下出处，填好后点「完成输入」。',
        illustration: 'fact-source',
        caption: '内容写在格子里，出处记在来源里。',
      },
      {
        title: '选一个判断，点「完成」',
        instruction:
          '看完各格，在底部选择合理度，再点「完成」保存。信息不足可选「不清楚」；之后能从历史记录点「继续编辑」补充。',
        illustration: 'judgment',
        caption: '判断由你选择，点「完成」才正式保存。',
      },
    ],
  },
  relation: {
    title: '因果关系教程',
    description: '填入 A 和 B，对照四种情况。',
    steps: [
      {
        title: '把原因和结果分开填',
        instruction:
          '在首页点「因果关系分析」。A 填可能的原因，B 填观察到的结果，再点「进入分析」。',
        illustration: 'input',
        caption: 'A 写做了什么，B 写发生了什么。',
      },
      {
        title: '四种情况，都找一找',
        instruction:
          '点四个格子填写案例，尤其找找「求雨却没下雨」和「没求雨却下雨」的情况。没查到的格子先留空。',
        illustration: 'relation-grid',
        caption: '按 A、B 是否发生，把案例放到对应格子。',
      },
      {
        title: '补上比较时需要的信息',
        instruction:
          '选同一地区、同一时段，按天记录求雨与降雨，别漏掉没求雨的日子。点「＋ 来源」记下出处，再点「完成输入」。',
        illustration: 'relation-notes',
        caption: '把比较条件记下来，方便回头核对。',
      },
      {
        title: '对照四格，再保存判断',
        instruction:
          '一起看四格内容，在底部选择合理度，再点「完成」。还不能判断时，保留「不清楚」也能保存。',
        illustration: 'judgment',
        caption: '选择当前判断，之后还能在历史记录里继续编辑。',
      },
    ],
  },
  claim: {
    title: '主张教程',
    description: '写清事实、理由、依据和例外。',
    steps: [
      {
        title: '先写下要分析的主张',
        instruction:
          '在首页点「主张」，填入一句想分析的观点，再点「进入分析」。下面用校园食堂的假设情境演示。',
        illustration: 'input',
        caption: '把主张写成一句完整的话。',
      },
      {
        title: '先填事实，再写理由',
        instruction:
          '在「事实」里填观察到的情况，在「理由 1」里写清它为什么能支持主张。还有别的理由，就点「＋ 添加理由」。',
        illustration: 'claim-reason',
        caption: '事实写观察，理由写为什么能支持主张。',
      },
      {
        title: '补依据，也想想例外',
        instruction:
          '填「理由1的依据」，点「＋ 来源」记出处，再填「例外 1」。有更多情况可点「＋ 添加例外」，用左右箭头翻页。',
        illustration: 'claim-backing',
        caption: '依据支持理由，例外提醒你检查适用条件。',
      },
      {
        title: '拖动滑杆，记录你的判断',
        instruction:
          '看完事实、理由和例外，拖动滑杆记录自己的判断。没把握点「设为不清楚」，再点「完成」保存；之后可从历史记录继续编辑。',
        illustration: 'judgment',
        caption: '拖动后显示百分比，也可以保留「不清楚」。',
      },
    ],
  },
};
