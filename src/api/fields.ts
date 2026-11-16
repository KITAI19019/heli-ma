import { newReason, type Analysis, type Cell } from '../model';

export interface TextField {
  path: string;
  label: string;
  value: string;
  readOnly: boolean;
}

export interface Collection {
  path: string;
  label: string;
  ids: string[];
  minimum: number;
}

interface FieldBinding extends TextField {
  set: (value: string) => void;
}

interface CollectionBinding extends Collection {
  add: () => string;
  remove: (id: string) => void;
}

// Enumerate allowed fields instead of interpreting arbitrary object paths.
function bindings(analysis: Analysis) {
  const fields = new Map<string, FieldBinding>();
  const collections = new Map<string, CollectionBinding>();
  function field(
    path: string,
    label: string,
    value: string,
    set: (value: string) => void,
    readOnly = false,
  ) {
    fields.set(path, { path, label, value, readOnly, set });
  }
  function cell(path: string, label: string, value: Cell, readOnly = false) {
    field(`${path}.text`, label, value.text, (text) => (value.text = text), readOnly);
    const sourcesPath = `${path}.sources`;
    collections.set(sourcesPath, {
      path: sourcesPath,
      label: `${label}来源`,
      ids: value.sources.map((source) => source.id),
      minimum: 0,
      add: () => {
        const id = crypto.randomUUID();
        value.sources.push({ id, text: '' });
        return id;
      },
      remove: (id) => {
        value.sources = value.sources.filter((source) => source.id !== id);
      },
    });
    value.sources.forEach((source, index) =>
      field(`${sourcesPath}.${source.id}.text`, `${label}来源${index + 1}`, source.text, (text) => {
        source.text = text;
      }),
    );
  }

  if (analysis.kind === 'relation') {
    field('a', 'A · 可能的原因', analysis.a, (text) => (analysis.a = text));
    field('b', 'B · 观察到的结果', analysis.b, (text) => (analysis.b = text));
  } else {
    field(
      'statement',
      analysis.kind === 'fact' ? '待核查的说法' : '待分析的主张',
      analysis.statement,
      (text) => {
        analysis.statement = text;
        if (analysis.kind === 'fact') analysis.cells[4].text = text;
      },
    );
  }

  if (analysis.kind === 'fact' || analysis.kind === 'relation') {
    const labels =
      analysis.kind === 'fact'
        ? ['上级', '同级', '下级'].flatMap((level) =>
            ['过去', '现在', '未来'].map((time) => `${level}·${time}`),
          )
        : ['A 发生，B 发生', 'A 未发生，B 发生', 'A 发生，B 未发生', 'A 未发生，B 未发生'];
    analysis.cells.forEach((value, index) =>
      cell(`cells.${index}`, labels[index], value, analysis.kind === 'fact' && index === 4),
    );
  } else {
    cell('evidence', '事实', analysis.evidence);
    analysis.reasons.forEach((reason, index) => {
      field(
        `reasons.${reason.id}.text`,
        `理由${index + 1}`,
        reason.text,
        (text) => (reason.text = text),
      );
      cell(`reasons.${reason.id}.backing`, `理由${index + 1}的依据`, reason.backing);
    });
    analysis.exceptions.forEach((exception, index) =>
      field(`exceptions.${exception.id}.text`, `例外${index + 1}`, exception.text, (text) => {
        exception.text = text;
      }),
    );
    collections.set('reasons', {
      path: 'reasons',
      label: '理由',
      ids: analysis.reasons.map((item) => item.id),
      minimum: 1,
      add: () => {
        const reason = newReason();
        analysis.reasons.push(reason);
        return reason.id;
      },
      remove: (id) => {
        analysis.reasons = analysis.reasons.filter((item) => item.id !== id);
      },
    });
    collections.set('exceptions', {
      path: 'exceptions',
      label: '例外',
      ids: analysis.exceptions.map((item) => item.id),
      minimum: 1,
      add: () => {
        const id = crypto.randomUUID();
        analysis.exceptions.push({ id, text: '' });
        return id;
      },
      remove: (id) => {
        analysis.exceptions = analysis.exceptions.filter((item) => item.id !== id);
      },
    });
  }
  return { fields, collections };
}

export function describeAnalysis(analysis: Analysis, readOnly: boolean) {
  const { fields, collections } = bindings(analysis);
  return {
    fields: [...fields.values()].map(({ path, label, value, readOnly: fixed }) => ({
      path,
      label,
      value,
      readOnly: readOnly || fixed,
    })),
    collections: [...collections.values()].map(({ path, label, ids, minimum }) => ({
      path,
      label,
      ids,
      minimum,
    })),
  };
}

export function fillText(analysis: Analysis, values: Record<string, string>): Analysis {
  if (!values || typeof values !== 'object' || Array.isArray(values))
    throw new Error('填写内容必须是字段路径与文字组成的对象。');
  const next = structuredClone(analysis);
  const { fields } = bindings(next);
  for (const [path, text] of Object.entries(values)) {
    const field = fields.get(path);
    if (!field) throw new Error(`没有可填写字段：${path}`);
    if (field.readOnly) throw new Error(`字段只读：${path}，请修改 statement。`);
    if (typeof text !== 'string') throw new Error(`字段必须填写文字：${path}`);
    field.set(text);
  }
  return next;
}

export function changeCollection(analysis: Analysis, path: string, removeId?: string) {
  const next = structuredClone(analysis);
  const collection = bindings(next).collections.get(path);
  if (!collection) throw new Error(`没有可修改集合：${path}`);
  if (removeId === undefined) return { analysis: next, itemId: collection.add() };
  if (!collection.ids.includes(removeId)) throw new Error('该项目已不存在，请重新读取当前状态。');
  if (collection.ids.length <= collection.minimum)
    throw new Error(`至少保留 ${collection.minimum} 条${collection.label}。`);
  collection.remove(removeId);
  return { analysis: next, itemId: removeId };
}
