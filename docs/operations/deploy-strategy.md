# デプロイ・ブランチ戦略

## デプロイ構成

org リポ（kokoshiro-dev）→ GitHub Actions で個人リポに main のみ同期 → Vercel で自動デプロイ

※ Vercel の無料プラン（Hobby）は org リポに対応していないため、個人リポを経由する構成

## 環境

| 環境 | ブランチ | 用途 |
|---|---|---|
| **Production** | `main` | 本番環境。main にマージされると自動デプロイ |
| **Preview** | - | 現状は未使用（個人リポへの同期が main のみのため） |
| **ローカル開発** | `feat/*` 等 | 各開発者がローカルの Supabase（Docker）で開発・確認 |

## 開発フロー

1. `feat/xxx` ブランチで開発（ローカル Supabase + `npm run dev` で確認）
2. PR を出してレビュー
3. `main` にマージ → 自動で本番デプロイ

## 環境変数の運用

- **Vercel**: 本番用の Supabase Key を設定済み
- **ローカル**: 各開発者が `npx supabase start` でローカル Supabase を起動し、発行される Key を `.env.local` に設定
- リモートの Supabase Key は共有しない（セキュリティ考慮）

## 備考

- Vercel Hobby プランのデプロイ上限: 1日100回
- Preview 環境は必要になった段階で全ブランチ同期に切り替えを検討
