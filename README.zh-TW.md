<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Japanese Reading Space

一個日文閱讀學習工具的展示專案，展示創意概念、使用者介面設計和功能實現。

[English README](README.md) | [中文版 README](README.zh-TW.md)

---

## 🌸 Japanese Reading Space — Showcase

Japanese Reading Space 是一個以 AI 為核心的日文閱讀輔助工具。
本儲存庫用於展示本工具的**產品概念、介面設計與互動原型**。

此版本為**展示專案（Showcase）**，內容僅供觀賞與參考，並非可使用或修改的開源版本。

## ⚠️ Showcase 說明

本儲存庫呈現的是本產品的：
- **概念設計**
- **使用者介面**
- **互動流程與功能原型**

內容包括畫面、流程與部分程式碼，以展示產品整體體驗。

本展示版：
- **不接受 PR / 不開放修改**
- **不提供程式碼授權**
- **不作為可重用的開源專案**

如需可研究、可 fork、具正式授權的版本，請參考開發版（dev repository）。

## ✨ 展示功能

- **智能文本分析**：分詞、詞性、JLPT 等級、自動翻譯
- **假名切換**：平假名／漢字動態切換
- **單詞卡片**：互動式字詞卡片、收藏機制
- **AI 聽力測驗**：自動生成與播放的語音測驗
- **句子收藏**：收集與整理有興趣的句子
- **統計視覺化**：詞性、JLPT 等級統計
- **圖片 OCR**：上傳日文圖片並轉換文字
- **直排／橫排閱讀**
- **AI 語音播放**

以上皆為產品概念與原型展示，並非最終產品版本。

## 🎨 設計亮點

- 以學習者需求為核心的介面設計
- 直觀、順暢的互動流程
- 簡潔清晰的視覺層次
- 良好的響應式體驗
- 適合延伸、可擴充的模組化概念

## 🛠️ 原型技術

展示原型採用：
- **React 19**（搭配 TypeScript）
- **Vite**
- **Google Gemini API**
- **Tailwind CSS**

此技術資訊僅用於說明原型的構建方式，並非授權使用之基礎。

## 🚀 如何運行（測試用）

要測試並在本地運行此展示專案：

### 前置需求
- Node.js（v18 或更高版本）
- npm 或 yarn
- Google Gemini API 金鑰（[在此取得](https://ai.google.dev/)）

### 安裝步驟

1. **複製儲存庫**
   ```bash
   git clone https://github.com/sijane/japanese-reading-space-showcase.git
   cd japanese-reading-space-showcase
   ```

2. **安裝依賴套件**
   ```bash
   npm install
   ```

3. **設置環境變數**
   
   在根目錄創建 `.env.local` 檔案：
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
   
   將 `your_api_key_here` 替換為你的 Google Gemini API 金鑰。

4. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

5. **開啟瀏覽器**
   
   前往 `http://localhost:3000` 查看應用程式。

### 測試檢查清單

- [ ] 應用程式可以正常啟動，沒有錯誤
- [ ] 可以貼上日文文字並進行分析
- [ ] 可以上傳日文圖片並提取文字
- [ ] 單詞卡片正確顯示
- [ ] 可以將單詞儲存到字彙庫
- [ ] 音頻測驗功能正常運作
- [ ] 直排和橫排閱讀模式正常運作
- [ ] 統計資料正確顯示

**注意**：部分功能需要有效的 Gemini API 金鑰且配額充足。

## 🔒 使用與版權

此展示版的內容（含程式碼片段、介面設計、文字、流程等）皆為原創作品，僅提供觀看與參考。

**All rights reserved.**

未經授權不得使用、修改、複製或再散布展示內容。商業用途亦需取得作者正式授權。

如需合法使用本專案之程式碼或進行開發合作，請參考下方開發庫。

## 🤝 合作與開發

若您有興趣，歡迎透過 Issues 或 Email 聯絡。

## 📦 開發儲存庫（Open Source / 可使用版本）

若您希望：
- 查看可執行程式碼
- fork 或研究技術實作
- 參與開發
- 使用已授權的版本

請前往：
👉 [Development Repository](https://github.com/sijane/japanese-reading-space-dev)

---

**Japanese Reading Space Showcase**  
© 2025 — All rights reserved.

本展示庫的內容僅用於呈現設計與概念，並非開源版本。
