# Claude Code ルール

## Git ルール
- main / staging ブランチに直接 push しない。必ず feature ブランチから **staging** に PR を出すこと（main への直接 PR は禁止。staging → main の昇格は別途行う）
- コミット前に `npm run lint` を実行すること
- 機密情報（.env.local、APIキー等）をコミットに含めないこと
- `git push` や PR 作成はユーザーが明示的に指示した場合のみ行うこと（自動で push/PR しない）
- 1 Issue = 1 PR。1つの PR に複数 Issue の変更を混ぜない
- コミットは機能の論理単位で分ける（例:「認証API追加」「認証テスト追加」）

## ブランチ命名規則
- `feat/xxx` — 新機能
- `fix/xxx` — バグ修正
- `docs/xxx` — ドキュメント更新

## ビルド・型チェックのルール
- `vitest.config.ts` を変更した場合は `next build` で型チェックが通ることを確認すること（`next build` は独自の TypeScript 設定で型チェックするため、`tsc --noEmit` と結果が異なる場合がある）
- カバレッジ設定の `all` や `include` は Vitest v4 の型定義に存在しないため `@ts-ignore` を使用している。Vitest のメジャーアップデート時に不要になれば削除すること

## ドキュメント・コード説明のルール
- コード例を書く時は `import` 文も必ず含めること
- 架空の関数や存在しないコードを例に使う場合は、その旨を明記すること
- 例で使うURLやキーがダミー値の場合は、実在しないことを明記すること
- 説明は「何が起きているか」だけでなく「どこから来ているか（import元）」も書くこと
