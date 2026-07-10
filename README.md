# CrossBorder Research

越境EC転売リサーチツール（React + Vite）

## 必要な環境

- Node.js 22.x（プロジェクトセットアップ時に `~/.local/node-v22.14.0-darwin-arm64` にインストール済み）

## セットアップ

```bash
export PATH="$HOME/.local/node-v22.14.0-darwin-arm64/bin:$PATH"
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開いてください。

## ビルド

```bash
npm run build
npm run preview
```

## 使い方

- **デモモード**: APIキーなしでサンプルデータを表示できます
- **設定**: 右上の「設定」から eBay / 楽天 などの API キーを入力できます
