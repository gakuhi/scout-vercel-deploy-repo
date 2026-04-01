# Claude Code ルール

## Git ルール
- main ブランチに直接 push しない。必ず feature ブランチから PR を出すこと
- コミット前に `npm run lint` を実行すること
- 機密情報（.env.local、APIキー等）をコミットに含めないこと

## ブランチ命名規則
- `feat/xxx` — 新機能
- `fix/xxx` — バグ修正
- `docs/xxx` — ドキュメント更新
