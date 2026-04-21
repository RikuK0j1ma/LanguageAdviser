# Language Adviser for Even G2

**[English](README.md)** | **[日本語](README.ja.md)** | **[Deutsch](README.de.md)** | **中文** | **[Suomi](README.fi.md)**

---

面向 Even G2 智能眼镜的口语辅导应用。
分析用户用目标语言说出的内容，判断表达对母语者是否自然，并用所选的解说语言给出改进建议。

## 目标用户

已掌握目标语言基本语法与词汇，能够进行会话，但在表达自然度上仍有提升空间（CEFR B1 水平）。

## 支持语言

学习语言与解说语言均可从下列列表中任选。组合不限，可选同一语言。

- English
- Japanese (日本語)
- German (Deutsch)
- Chinese (中文)
- Finnish (suomi)

## 功能

- **语音识别**：通过 G2 眼镜麦克风采集音频，使用 OpenAI Whisper (`gpt-4o-mini-transcribe`) 转写
- **自然度判定**：由 `gpt-4o-mini` 以母语者视角分析
- **改写建议**：将不自然的表达改写为自然的目标语言说法
- **多语种解说**：为何不自然、如何修改，用所选解说语言返回
- **眼镜显示**：在 Even G2 上显示修正句与简短提示
- **语言对设置**：学习语言与解说语言可独立选择，随时在 Settings 界面更改
- **历史持久化**：将发言、修正、解说、提示、语言对、时间戳保存到 LocalStorage（最新 200 条）
- **导出**：将历史下载为 JSON 或 CSV（带 BOM 的 UTF-8，可直接在 Excel 打开）
- **清空历史**：一键删除全部已保存条目

## 依赖

- [Node.js](https://nodejs.org/) v18+
- [OpenAI API Key](https://platform.openai.com/api-keys)
- Even G2 智能眼镜 + Even Hub 应用（必需 — 应用使用眼镜麦克风）

## 安装

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5174`。

### 在真实 G2 硬件上运行

```bash
npm run qr
```

用手机扫描 QR 码，然后从 Even Hub 应用连接。

> 若需 HTTPS：在 `vite.config.ts` 中添加 SSL 证书配置。

## 使用方法

1. 首次启动：输入 OpenAI API Key，选择学习语言（I want to practice）与解说语言（Explain to me in），点击 `Save`
2. 点击 `Tap to Speak`，通过 G2 麦克风用目标语言说话
3. 点击 `Stop` → 转写 → 分析
4. 结果同时显示在手机屏幕与 G2 眼镜上
5. 底部列出最近 5 条，使用 Export 获取全部历史

### 更改语言对

主界面底部 `Settings` → 修改下拉框 → `Save`。
已有历史保留；仅后续分析使用新的语言对。

### 结果解读

- **Natural!**（绿色）：表达自然 — 放心使用
- **More natural way:**（红色）：显示修正句、解说与提示

### 导出格式

- **JSON**：保留全部字段（timestamp, targetLang, nativeLang, original, result{isNatural, corrected, explanation, tip}）
- **CSV**：8 列 — `timestamp, target, native, isNatural, original, corrected, explanation, tip`。ISO8601 时间戳。带 BOM 的 UTF-8

## 构建

```bash
npm run build       # 生产构建
npm run preview     # 预览构建结果
```

输出目录：`dist/`

## 数据存储位置

全部在浏览器 LocalStorage。无跨设备同步。键列表：

| 键 | 内容 |
|----|------|
| `openai_api_key` | OpenAI API Key |
| `target_lang` | 学习语言代码 (en/ja/de/zh/fi) |
| `native_lang` | 解说语言代码 |
| `history` | 发言记录 JSON 数组（最新 200 条） |

`Reset API key & languages` 按钮可删除全部数据。

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript |
| 构建 | Vite |
| 分析 | OpenAI `gpt-4o-mini` |
| 语音转写 | OpenAI `gpt-4o-mini-transcribe` (Whisper 系列) |
| 音频采集 | Even G2 麦克风 (16 kHz / 16-bit PCM) |
| 眼镜 SDK | `@evenrealities/even_hub_sdk` |
| 持久化 | LocalStorage |

## 文件结构

```
src/
  main.ts        UI、状态管理、导出
  openai.ts      chat completions / 转写
  speech.ts      G2 麦克风控制、WAV 生成
  languages.ts   支持语言定义
  style.css      样式
```
