# V0.2 程序调用接口

应用版本：`0.2.0`，接口版本：`1`。用于页面跳转和文字填写；AI 助手在此接口之上执行工具调用，仍由用户点击“完成”保存。更新日期：2026-11-16。

## 调用入口

应用加载后，在当前页面使用 `window.heliMa`；项目代码可用 `import { appApi } from './api'`（从 `src` 下导入）。两者是同一个对象。页面外的程序需通过浏览器自动化在该页面执行调用。

```js
const api = window.heliMa;
// 新会话中演示；已有其他类型草稿时会返回 UNSAVED_CHANGES。
const opened = await api.navigate('/input/fact');
if (opened.ok) {
  const filled = await api.fill({
    statement: '需要核查的说法',
    'cells.0.text': '过去的相关资料',
  });
  if (filled.ok) await api.navigate('/analysis');
}
```

## 方法与返回值

| 方法 | 作用 |
| --- | --- |
| `getState()` | 同步读取当前状态副本；应用尚未挂载时返回 `null` |
| `navigate(path, options?)` | 跳转页面，完成后返回实际状态 |
| `back()` | 按原有层级返回；优先关闭弹窗、侧栏或历史编辑模式 |
| `fill(values, options?)` | 批量替换指定文本字段；空字符串可清空文字 |
| `addItem(collection, options?)` | 新增空白理由、例外或来源，返回本地生成的 `itemId` |
| `removeItem(collection, id, options?)` | 删除当前草稿中的指定条目 |

除 `getState()` 外，方法均返回 Promise。请逐个 `await`，不要并发调用：

```js
{ ok: true, state: { /* 最新状态 */ }, itemId: '仅条目操作返回' }
{ ok: false, code: '错误代码', message: '原因' }
```

`state` 包含 `page`、`path`、`busy`、`overlayOpen`、`draft`、`draftToken`、`result`、`history`、`fields`、`collections` 和 `cacheError`。`history` 是最近一次打开历史页时载入的列表；需要刷新时重新 `navigate('/history')`。修改返回的副本不会改变应用。

`fields` 提供 `{ path, label, value, readOnly }`；`collections` 提供 `{ path, label, ids, minimum }`。优先从这里取得可用字段和条目 ID。`cacheError` 非空表示输入已更新到界面，但会话缓存写入失败，应保留页面并通过“完成”保存。

## 页面路径

以下是 `navigate()` 使用的应用内路径，不是 HTTP 地址，不修改地址栏。不能直接把它们拼在站点网址后打开。路径列表也可读取 `api.routes`。

| 路径 | 行为 |
| --- | --- |
| `/` | 首页 |
| `/input/fact` | 新建事实分析；已有同类型草稿时继续填写 |
| `/input/relation` | 新建因果分析；已有同类型草稿时继续填写 |
| `/input/claim` | 新建主张分析；已有同类型草稿时继续填写 |
| `/input` | 返回当前草稿的输入页，无草稿时失败 |
| `/analysis` | 进入当前草稿的分析页，检查原话或 A/B 必填；从已保存结果页调用则进入该记录编辑 |
| `/history` | 读取并显示本地历史列表 |
| `/history/:id` | 打开已保存记录；`id` 使用 `encodeURIComponent(id)` 编码 |
| `/settings/theme` | 主题设置 |
| `/settings/language` | 语言预留页 |
| `/settings/ai` | AI 开关、服务商、模型与形象大小 |
| `/tutorials` | 教程目录 |
| `/tutorials/fact`、`/tutorials/relation`、`/tutorials/claim` | 对应教程 |
| `/tutorials/ai` | AI 助手教程：DeepSeek 密钥创建、连接配置、辅助填写与手动保存 |

打开设置或教程保留草稿。教程从目录进入时，`back()` 先回目录，再回原页面。`back()` 如果需要离开未完成输入，会显示现有放弃确认框；此时 `ok: true` 表示返回动作已处理，`state.overlayOpen` 为 `true`，不代表已经离开。

AI 教程共九步，前四步为可放大的 DeepSeek 官方平台截图；点击“关闭图片”、键盘 Escape 或 `back()` 可关闭图片，随后仍停留在当前步骤。图片随应用缓存，缓存完成后可离线阅读；官方平台链接及实际 AI 调用需要联网。教程示意不填写真实配置，也不发送 AI 请求。`ai` 仅为教程主题，不是分析类型，`/input/ai` 无效。

返回首页、打开历史或切换分析类型可能放弃草稿，默认返回 `UNSAVED_CHANGES`。确实需要放弃时显式传入：

```js
await api.navigate('/', { discardDraft: true });
```

这只放弃未完成草稿，不删除正式记录。打开不存在的记录失败时保留草稿。同类型 `/input/:kind` 始终继续当前草稿；需要新建同类型分析时，先显式回首页再进入。

## 文本字段

只允许当前分析类型的字段。`fill()` 一次提交整批更新，有任何无效字段或非字符串值时整批不执行；没有提供的字段保持原值。可在输入页或分析页填写，不必先打开来源弹窗或翻到对应条目。

| 分析类型 | 字段路径 |
| --- | --- |
| 事实、主张 | `statement` |
| 因果 | `a`、`b` |
| 事实 | `cells.0.text` 至 `cells.8.text`；中心 `cells.4.text` 只读，随 `statement` 同步 |
| 因果 | `cells.0.text` 至 `cells.3.text` |
| 主张 | `evidence.text`、`reasons.<id>.text`、`reasons.<id>.backing.text`、`exceptions.<id>.text` |
| 来源 | `<单元格路径>.sources.<id>.text` |

九宫格按行排列：`0–2` 上级、`3–5` 同级、`6–8` 下级；每行依次过去、现在、未来。因果四格依次为：`0` 有 A 有 B、`1` 无 A 有 B、`2` 有 A 无 B、`3` 无 A 无 B。

来源的单元格路径可以是 `cells.0` 等有效格子、`evidence` 或 `reasons.<id>.backing`。原因、例外及来源使用稳定 ID，不能用显示序号代替。等级、百分比、记录 ID、修订号和时间戳不属于本接口的文本字段。

## 增删理由、例外和来源

集合路径为 `reasons`、`exceptions` 或 `<单元格路径>.sources`。理由和例外至少各保留一条，来源可以为空。

```js
// 当前必须是主张草稿。
const added = await api.addItem('reasons');
if (added.ok) {
  const id = added.itemId;
  await api.fill({
    [`reasons.${id}.text`]: '补充理由',
    [`reasons.${id}.backing.text`]: '支持该理由的依据',
  });
  const source = await api.addItem(`reasons.${id}.backing.sources`);
  if (source.ok) {
    await api.fill({ [`reasons.${id}.backing.sources.${source.itemId}.text`]: '出处或链接' });
  }
  // 需要移除该理由时：await api.removeItem('reasons', id);
}
```

## 避免覆盖后来的输入

先读状态、稍后再填写时，带上读取时的 `draftToken`：

```js
const before = api.getState();
if (before?.draftToken) {
  await api.fill({ statement: '新的文字' }, { expectedDraft: before.draftToken });
}
```

`fill`、`addItem`、`removeItem`、`navigate` 均支持 `expectedDraft`。人工编辑、程序填写或草稿页面变更后，旧版本会返回 `STALE_DRAFT`；省略时作用于调用当下的草稿。刷新后重新读取 token，不跨页面生命周期复用。数据库正式记录的 `revision` 与这个草稿版本不同。

## 错误与维护

| 错误代码 | 含义 |
| --- | --- |
| `NOT_READY` | 应用尚未挂载或已经关闭 |
| `BUSY` | 操作进行中，或弹窗/侧栏未关闭；可先等待或调用 `back()` 关闭覆盖层 |
| `INVALID_ROUTE` | 不支持的路径 |
| `INVALID_ARGUMENT` | 字段、文字类型、条目或参数不合法；也包括进入分析前缺少必填内容 |
| `NO_DRAFT` | 没有可以填写或进入分析的草稿 |
| `READ_ONLY` | 当前是设置、教程等不能填写的页面 |
| `UNSAVED_CHANGES` | 跳转会放弃草稿，但未明确允许 |
| `STALE_DRAFT` | 草稿版本不匹配，或跳转/历史读取期间页面、草稿发生变化 |
| `FAILED` | 记录不存在、数据库读取失败等其他执行错误 |

接口填写只更新界面及会话草稿；点击原有“完成”按钮才正式保存。接口不提供自动保存、删除历史或修改设置值的能力。

源码入口为 `src/api/index.ts`，路径映射在 `src/api/routes.ts`，字段白名单在 `src/api/fields.ts`，页面桥接在 `src/App.tsx`。新增页面、字段或改变返回语义时，同步更新本文件及 `tests/browser-api.cjs`；不兼容改动需提升 `appApi.version`。

## AI 配置与调用

在侧栏打开“AI 配置”，通过胶囊开关启用助手，填写服务商密钥，等待自动获取模型列表后选择支持工具调用的聊天模型。开关开启时使用主题朱红色，支持鼠标、触摸和键盘操作。配置自动保留，不影响分析的手动保存流程。点击小球输入要求；拖动调整位置，设置中可缩放至 75%–150%。小球与聊天界面沿用 App 主题色，自动跟随浅色／深色模式。

BaseURL 输入框仅在“自定义”服务商下显示。模型列表仍自动获取，加载状态显示在模型选择框内；平时不显示提示行或重新拉取按钮，仅在失败时显示具体错误。“在此设备记住密钥”右侧的问号在点击或键盘聚焦时显示说明 2 秒；鼠标悬停期间持续显示，移开立即收起。悬停时点击也保持显示，按 Esc 可立即关闭。

助手保持主题配色，悬停、按压和松开通过球面挤压与弹性回弹反馈，不再悬停变色。眼睛以形象中心为基准，在半径 `3.5 × 形象直径` 内跟踪鼠标；位移经过指数压缩，越靠近活动边缘变化越小，再平滑移动至目标位置，最大水平/垂直位移为直径的 14%/10%。离开范围或窗口后回正；非跟踪状态每隔随机 2.8–7 秒眨眼一次。触摸不触发光标跟踪，拖动与点击交流沿用原流程。设置预览和聊天头像复用同一形象；形象不可见或页面在后台时暂停动画，系统“减少动态效果”下关闭眨眼和形变、直接更新视线。参数集中在 `src/ai/useOrbFace.ts` 的 `orbMotion`。

| 服务商 | 默认 BaseURL |
| --- | --- |
| DeepSeek | `https://api.deepseek.com` |
| OpenAI | `https://api.openai.com/v1` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` |
| 自定义 | 手动填写，例如 `https://example.com/v1` |

统一使用 OpenAI 兼容协议：`GET {BaseURL}/models` 读取 `data[].id`；`POST {BaseURL}/chat/completions` 发送 `model`、`messages`、`tools`、`tool_choice: "auto"`、`stream: false`。鉴权为 `Authorization: Bearer <API Key>`。不使用各家的原生 SDK，未提供 Anthropic 选项。

BaseURL 填写接口根路径，不包含 `/models` 或 `/chat/completions`。使用 HTTPS；本机 localhost/127.0.0.1 可用 HTTP。更改密钥会重新获取列表并清除旧模型选择；更换自定义地址同时清空密钥，重新填写后才请求新地址，避免把旧密钥送到新服务。更换服务商时各自的配置独立保留。列表请求去重、去空值，700ms 防抖，20 秒超时；聊天单次请求 90 秒超时，旧连接请求会取消。

浏览器直接连接所选服务，服务端需允许跨域请求并支持工具调用；仅有 OpenAI 风格地址不保证全部模型兼容。连接、鉴权、额度、格式错误会在页面提示，不展示服务端原始错误正文。未接入代理服务器。官方协议参考：[OpenAI](https://developers.openai.com/api/reference/resources/chat)、[DeepSeek](https://api-docs.deepseek.com/)、[Gemini](https://aistudio.google.com/docs/openai)。

## AI 工具约定

模型只获得以下四个工具；调用由 `src/ai/tools.ts` 校验后转交 `appApi`，不能执行任意 JavaScript。

| 工具 | 参数 | 行为 |
| --- | --- | --- |
| `get_current_page` | `{}` | 返回当前路径、可用路径、当前分析的字段与集合 |
| `navigate_page` | `{ "path": "/input/claim" }` | 跳转任意已登记路径；放弃草稿前由界面确认 |
| `fill_fields` | `{ "fields": [{ "path": "statement", "value": "主张原话" }] }` | 批量填写当前可写字段；覆盖或清空非空文字前展示原文与改后文字 |
| `add_item` | `{ "collection": "reasons" }` | 新增理由、例外或来源，返回真实 `itemId` 及字段路径 |

工具成功返回 `{ ok: true, page, itemId?, cacheError? }`；失败返回 `{ ok: false, code, message }`。`page` 含 `path`、`routes`、`hasDraft`、`kind`、`fields`、`collections`；在设置、教程及历史列表页不附带分析正文。工具不暴露 API 配置、密钥或完整历史库，也不提供保存、删除条目/记录、修改结论等级及设置的能力。

主张填写流程：跳转 `/input/claim` → 根据返回字段填写主张、事实、理由、依据与例外 → 必要时 `add_item` 后使用返回 ID 继续填写 → 跳转 `/analysis` → 用户检查、修改并手动点击“完成”。事实与因果页也可使用同一套已有字段接口。

每次发送最多 6 次模型请求、24 次工具调用，每次模型回复最多 8 个工具；一次填 1–30 个字段，每字段及用户单次输入不超过 20,000 字符，每集合最多支持 30 个条目。工具依次执行；同一调用 ID 不重复执行。用户拒绝修改后不会自动重试同一参数。用户改动页面或草稿、关闭 AI、切换连接或点击“停止”后，旧回复不能继续写入；已经执行的填写保留在草稿中。

助手聊天面板不阻塞页面接口。浏览器返回优先关闭聊天，`appApi.back()` 仍按原有页面层级返回。关闭聊天窗口只收起面板，停止请求请点击“停止”。

## 预设与数据范围

约束文档为 [`src/ai/agent-preset.md`](src/ai/agent-preset.md)，构建时作为系统提示加载。修改它后重新构建即可生效。预设要求区分事实、推断和待核查内容，禁止编造来源、替用户决定可信度或声称自动保存；工具白名单、字段校验、覆盖确认与过期请求保护同时由代码执行。

开启 AI 不会自动发送分析正文。用户发送消息后，当前分析的文本字段与本轮工具结果、最近 6 轮成功对话会发送至所选服务。对话只在内存中，刷新、清空对话、切换连接或关闭 AI 后清除；完整历史记录不会整库发送。AI 配置及小球位置存于 `localStorage`；密钥默认仅存 `sessionStorage`，勾选“在此设备记住密钥”后才存于 `localStorage`。两者均是当前浏览器中的可读存储，不是加密保险箱。离线缓存跳过带鉴权或 `no-store` 的请求；联网 AI 不可离线运行，原有手动分析和保存仍可离线使用。

代码分区：`settings.ts` 管理配置，`useAiSettings.ts` 管理配置界面状态及模型列表，`client.ts` 处理兼容协议，`agent.ts` 控制工具往返，`tools.ts` 执行受限工具，`useAssistant.ts` 管理对话与取消，`Assistant.tsx`/`useOrb.ts` 负责聊天与拖动，`AiSettingsPage.tsx`/`ai.css` 负责配置样式。浏览器验证脚本为 `tests/browser-ai.cjs` 和 `tests/browser-ai-guards.cjs`，使用模拟服务，不需要真实密钥。

2026-11-16 使用用户提供的临时密钥实测 DeepSeek：模型列表与浏览器跨域连接成功，`deepseek-flash` 完成新建主张、填写 5 个字段、跳转分析页，随后由测试者点击“完成”保存。该轮包含 1 次模型列表请求、4 次聊天请求。密钥已从隔离测试会话清除，未写入项目或报告；OpenAI、Gemini 尚未使用真实密钥实测。
