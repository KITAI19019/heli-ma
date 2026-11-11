import { kindNames, type Kind } from './model';

export type WorkflowPage = 'home' | 'input' | 'analysis' | 'history' | 'result';
export type UtilityPage = 'tutorial' | 'language' | 'theme';
export type Page = WorkflowPage | UtilityPage;

export const utilityPages: readonly UtilityPage[] = ['tutorial', 'language', 'theme'];
export const utilityLabels: Record<UtilityPage, string> = {
  tutorial: '教程',
  language: '语言',
  theme: '主题',
};

export function isUtilityPage(page: Page): page is UtilityPage {
  return page === 'tutorial' || page === 'language' || page === 'theme';
}
export const workflowReturnLabels: Record<WorkflowPage, string> = {
  home: '返回首页',
  input: '返回输入',
  analysis: '返回分析',
  history: '返回历史记录',
  result: '返回结果',
};

export function workflowHeading(page: WorkflowPage, kind: Kind = 'fact'): string {
  switch (page) {
    case 'home':
      return '这件事，合理吗？';
    case 'history':
      return '历史记录';
    case 'result':
      return '我的分析结果';
    case 'input':
      return `输入${kind === 'relation' ? ' A 和 B' : kindNames[kind]}`;
    case 'analysis':
      return kind === 'relation' ? kindNames.relation : `${kindNames[kind]}分析`;
  }
}
