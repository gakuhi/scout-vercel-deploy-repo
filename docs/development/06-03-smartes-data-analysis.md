# SmartES データ分析（2026-04-09 時点）

## 全体概要

| 項目 | 数値 |
|---|---|
| 全ユーザー数（user テーブル） | 75,833人 |
| email あり | 72,909人（96.1%） |
| email なし（LINE認証のみ、突合不可） | 2,924人（3.9%） |
| emailVerified 済み | 0人（SmartES側でメール認証未実装） |

## synced 対象テーブルのレコード数

| テーブル | 件数 |
|---|---|
| users_generated_es | 87,512件 |
| users_generated_applicant_motivations | 68,653件 |
| users_generated_gakuchika | 18,535件 |

## 卒年度別登録者数

集計元: `pre_registrations_users` INNER JOIN `pre_registrations_users_schools`（`graduation_year_month` の年部分で集約）

| 卒年度 | 登録者数 | 備考 |
|---|---|---|
| 2030年 | 53人 | |
| 2029年 | 1,185人 | |
| 2028年 | 5,359人 | |
| **2027年** | **24,012人** | **メインターゲット** |
| 2026年 | 26,800人 | |
| 2025年 | 3,569人 | |
| 2024年 | 420人 | |
| 2023年 | 287人 | |
| 2022年 | 230人 | |
| 2021年 | 185人 | |
| 2020年 | 143人 | |
| 2019年 | 121人 | |
| 2018年 | 362人 | |
| **合計** | **62,726人** | |

※ `user` テーブル（75,833人）との差分（約13,000人）は `pre_registrations_users_schools` に卒年度を登録していないユーザー

## 2027年卒ユーザーの生成数分布

- 集計元: `pre_registrations_users` INNER JOIN `pre_registrations_users_schools`（`graduation_year_month` 202700-202799）
- 集計日: 2026-04-09

### サマリー

| 区分 | 人数 | 割合 |
|---|---|---|
| 2027年卒 合計 | 24,012人 | 100% |
| 全機能未利用（ES=0, 志望動機=0, ガクチカ=0） | 10,726人 | 44.7% |
| いずれかを1回以上利用 | 13,286人 | 55.3% |

### 詳細分布（上位のみ抜粋）

| ES生成数 | 志望動機生成数 | ガクチカ生成数 | ユーザー数 |
|---|---|---|---|
| 0 | 0 | 0 | 10,726人 |
| 1 | 0 | 0 | 2,367人 |
| 0 | 0 | 1 | 1,225人 |
| 2 | 0 | 0 | 1,133人 |
| 0 | 1 | 0 | 1,118人 |
| 3 | 0 | 0 | 557人 |
| 1 | 1 | 0 | 397人 |
| 0 | 2 | 0 | 371人 |
| 4 | 0 | 0 | 345人 |
| 1 | 0 | 1 | 290人 |
| 0 | 0 | 2 | 288人 |
| 2 | 1 | 0 | 238人 |
| 5 | 0 | 0 | 237人 |
| 0 | 1 | 1 | 208人 |
| 3 | 1 | 0 | 165人 |
| 2 | 0 | 1 | 164人 |
| 0 | 3 | 0 | 162人 |
| 1 | 2 | 0 | 136人 |
| 2 | 2 | 0 | 118人 |
| 4 | 1 | 0 | 111人 |
| 1 | 1 | 1 | 101人 |

### 合計生成数の分布（機能を区別しない場合）

各ユーザーの合計生成数（ES + 志望動機 + ガクチカ）で集計。上記の詳細分布データから算出。

| 合計生成数 | ユーザー数 | 割合 | 累計 |
|---|---|---|---|
| 0件 | 10,726人 | 44.7% | 44.7% |
| 1件 | 4,710人 | 19.6% | 64.3% |
| 2件 | 2,687人 | 11.2% | 75.5% |
| 3件 | 1,659人 | 6.9% | 82.4% |
| 4件 | 1,224人 | 5.1% | 87.5% |
| 5件 | 975人 | 4.1% | 91.5% |
| 6件以上 | 2,031人 | 8.5% | 100% |
| **合計** | **24,012人** | | |

### アクティブ率（2027-2028年卒、生成機能の最終利用日基準）

各ユーザーの ES / 志望動機 / ガクチカ 生成テーブルの最新 `created_at` を「最終利用日」として代用。ログインのみのユーザーは含まれない。

| 卒年度 | 総数 | 3日以内 | 7日以内 | 30日以内 |
|---|---|---|---|---|
| 2028年卒 | 5,369人 | 64人（1.2%） | 101人（1.9%） | 254人（4.7%） |
| 2027年卒 | 24,012人 | 77人（0.3%） | 168人（0.7%） | 1,311人（5.5%） |

### 集計に使用したクエリ

```sql
SELECT
  sub.es_count,
  sub.motivation_count,
  sub.gakuchika_count,
  COUNT(*) AS user_count
FROM (
  SELECT
    pru.user_id,
    (SELECT COUNT(*) FROM users_generated_es e WHERE e.user_id = pru.user_id) AS es_count,
    (SELECT COUNT(*) FROM users_generated_applicant_motivations m WHERE m.user_id = pru.user_id) AS motivation_count,
    (SELECT COUNT(*) FROM users_generated_gakuchika g WHERE g.user_id = pru.user_id) AS gakuchika_count
  FROM
    pre_registrations_users AS pru
  INNER JOIN pre_registrations_users_schools AS prus ON pru.user_id = prus.user_id
  WHERE
    prus.graduation_year_month BETWEEN 202700 AND 202799
) AS sub
GROUP BY sub.es_count, sub.motivation_count, sub.gakuchika_count
ORDER BY user_count DESC
```
