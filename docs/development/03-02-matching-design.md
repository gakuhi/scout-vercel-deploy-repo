# マッチング設計書

## 概要

企業と学生のマッチングの仕組みを定義する。複雑な検索機能は設けず、4プロダクト（面接練習AI / 企業分析AI / スマートES / すごい就活）の行動データから学生プロフィールを自動生成し、スコアベースでマッチングを行う。

### 設計思想

- **学生の入力負荷を最小化する**: 他社が 20〜30 項目の入力を要求するところを、本サービスでは 5 項目 + データ連携同意のみで完結させる
- **行動データに基づく本質的マッチング**: 自己申告ではなく、実際の行動から志向・能力・熱量を推定する。「成長したい」と書いていても行動が安定志向なら、行動データがそれを示す
- **スコアで説明可能なマッチング**: embedding（意味ベクトル）は「なぜマッチしたか」を説明できない。0-100 のスコアなら企業が「なぜこの学生が推薦されたか」を理解でき、学生も自分のプロフィールを把握できる
- **複雑な検索インフラを不要にする**: 全文検索エンジンや Elasticsearch は使わない。スコアカラムへの素の SQL クエリで完結する

---

## 各プロダクトから取得できる生データ

### 面接練習AI（interviewai）

synced_interviewai_sessions / synced_interviewai_searches から取得。

| 情報 | 由来カラム | 何がわかるか |
|---|---|---|
| 志望企業リスト | sessions.company_name | どの企業を受ける気なのか（複数回） |
| 志望業界 | sessions.industry | 本人が選択した志望業界 |
| 就活フェーズ | sessions.phase | 今どの段階か（自己分析 / ES / 一次面接 / 最終面接 等） |
| 面接タイプ経験 | sessions.session_type | 個人 / 集団 / GD のどれを練習しているか |
| 面接スキルスコア | sessions.overall_score, skill_scores | 論理構造力・QA力・回答内容力（定量） |
| AI 評価の強み | sessions.strengths | AI が会話から抽出した強み |
| AI 評価の弱み | sessions.areas_for_improvement | 改善点 |
| 話し方・回答内容 | sessions.conversation_text | 生の会話ログ。人物像の一次情報 |
| 練習量・頻度 | sessions.started_at の集計 | 活動量・熱量 |
| 関心企業 | searches.company_name | 練習はしていないが気になっている企業 |

**このプロダクトから推定できること**: 志望業界、志望企業群、選考フェーズ、面接対応力（数値）、性格の片鱗（会話ログから）、就活への熱量（練習回数）

### 企業分析AI（compai）

synced_compai_researches / synced_compai_messages から取得。

| 情報 | 由来カラム | 何がわかるか |
|---|---|---|
| 調査対象企業 | researches.title, url | どの企業を調べているか（研究の深さ = 関心度） |
| ブックマーク企業 | researches.is_bookmarked | 特に気になっている第一志望群 |
| 質問内容 | messages.content（sender_type='user'） | 何を気にしているか（給与? 文化? 成長性?） |
| 調査の深さ | 企業あたりの messages 数 | 本気度・思考の深さ |
| 調査履歴のタイミング | original_created_at | 就活の進捗パターン |

**このプロダクトから推定できること**: 志望企業群の解像度、関心軸（給与志向 / 文化志向 / 成長志向等）、企業研究の深さ

特に messages.content は価値が高い。「○○社の若手の成長環境について教えて」と聞く学生と「○○社の平均年収は?」と聞く学生では、企業選びの軸が全く異なる。

### スマートES（smartes）

synced_smartes_motivations / synced_smartes_gakuchika / synced_smartes_generated_es から取得。

| 情報 | 由来カラム | 何がわかるか |
|---|---|---|
| ガクチカ本文 | gakuchika.generated_text | 学生時代に何をしてきたか（一次情報） |
| 志望動機本文 | motivations.generated_text | なぜその企業を志望するか |
| 志望企業リスト | motivations.generated_params, generated_es.generated_params（企業名） | ES 提出先 = 本気の志望先 |
| ES 設問と回答 | generated_es.generated_text, generated_params（設問） | 設問ごとの回答内容 |
| 推敲の深さ | regenerated_count | 本気度（何度も書き直しているか） |
| ES 作成ペース | generated_at の時系列 | 活動量・進捗 |

**このプロダクトから推定できること**: 学生時代の経験（ガクチカ）、志望企業、文章力、本気度（推敲回数）、アピールポイントの自己認識

ガクチカ本文は行動特性の推定に最も使える。「サークルのリーダーをやった」か「個人でプロダクトを作った」かで求められる学生像が変わる。

### すごい就活（sugoshu）

synced_sugoshu_resumes / synced_sugoshu_diagnoses から取得。

| 情報 | 由来カラム | 何がわかるか |
|---|---|---|
| 履歴書全文 | resumes.content | 学歴・職歴・スキル・資格などの静的情報 |
| 性格診断結果 | diagnoses.diagnosis_data | 性格タイプ・価値観・適性 |

スキーマ上のカラム数は少ないが、resumes.content には大量の構造化情報（大学・学部・インターン歴・資格・TOEIC・趣味等）が含まれる。Claude でパースする価値がある。

**このプロダクトから推定できること**: 学歴・経歴のフルセット、性格・価値観、適性

### 4プロダクト横断で信頼度が高い情報

複数プロダクトが重複して保持しているため、クロスチェックが効く。

| 情報 | 取得元 |
|---|---|
| 志望業界 | interviewai.sessions.industry + compai の調査企業の業界 + smartes の応募企業の業界 |
| 志望企業群 | 4プロダクト全てに出現 |
| 就活フェーズ | interviewai.sessions.phase + smartes の ES 作成時期 + compai の調査時期 |
| メールアドレス | 全プロダクト（突合キー） |
| アカウント作成日 | original_created_at（就活開始時期の推定） |

---

## スコアリング設計

4プロダクトの行動データから、学生ごとに 0-100 のスコアを算出し、興味タグを付与する。以下の 5 カテゴリで構成する。

### A. 志向・価値観スコア（スペクトラム型）

「高い / 低い」ではなく、0 と 100 の両端にそれぞれ意味がある。どちらが良い・悪いではない。

| 軸 | 0 側 | 100 側 | 推定元 |
|---|---|---|---|
| 成長-安定 | 安定・待遇重視 | 成長・挑戦重視 | compai の質問傾向、志望動機の内容 |
| 専門-汎用 | ゼネラリスト志向 | スペシャリスト志向 | 志望職種の一貫性、スキルの集中度 |
| 個人-チーム | 個人で成果を出す | チームで成果を出す | ガクチカのエピソード分析 |
| 裁量-指導 | 手厚い指導を求める | 裁量を求める | 面接回答、企業研究の質問パターン |

**企業側の使い方の例**: 「うちはベンチャーだから成長-安定スコアが 70 以上、裁量-指導スコアが 60 以上の学生が合う」

### B. 能力スコア（絶対スケール型）

素直に「高いほど能力が高い」を示す。

| 軸 | 推定元 | 備考 |
|---|---|---|
| 論理的思考力 | interviewai の logicalStructure スコア | 既にスコアが存在する |
| コミュニケーション力 | interviewai の qaSkill + 会話ログ分析 | 同上 |
| 文章表現力 | smartes の ES / ガクチカの Claude 評価 | Claude が 0-100 採点 |
| リーダーシップ | ガクチカ本文から Claude がエピソード抽出・評価 | 経験なし = 0 ではなく推定不能 = NULL |

### C. 活動量スコア（相対スケール型）

全学生の中での相対位置を 0-100 で表す。1軸に統合する。

| 軸 | 推定元 | 備考 |
|---|---|---|
| 活動量 | 4プロダクト横断の月間アクション数（ログイン・ES作成・面接練習・企業調査・履歴書編集等の合算） | 相対評価（全学生の中での位置） |

企業研究の深さや推敲回数は個別のプロダクト利用度に依存するため、独立したスコアにはせず活動量の算出要素として内包する。

### D. 興味タグ（行動データから自動抽出）

行動データから学生の興味を推定し、タグとして付与する。マッチング計算に使用する。

| タグ | 型 | 抽出ロジック | 備考 |
|---|---|---|---|
| 興味業界 Top5 | TEXT[]（最大5要素） | 面接練習の志望業界 + 企業分析の調査企業の業界 + ES/志望動機の提出先企業の業界を集計し、出現頻度順に上位5つ | 順序に意味がある（1位が最も関心が高い） |
| 興味職種 | TEXT[]（最大5要素） | ガクチカ・ES・面接回答・履歴書の内容から Claude が推定 | 複数可。行動データに明示的な職種選択がないため Claude 推定 |

**学生入力との関係**: 学生がオンボーディングで「希望業界・職種の微調整」を行った場合、本人申告を優先しつつ行動データとの乖離がある旨を企業に表示する（例:「本人希望: IT / 行動データ: 金融・コンサル」）。

### E. 人物要約（テキスト。マッチング補助）

スコア・タグでは表現しきれない人物像をテキストで保持する。

| 情報 | 推定元 | 格納先 |
|---|---|---|
| AI 人物要約 | 全データの統合分析 | summary（TEXT） |
| 強み・特性 | ガクチカ + 面接評価 + 診断結果 | strengths（JSONB） |
| スキル | 履歴書 + ガクチカ + ES から抽出 | skills（JSONB） |

---

## スコアの信頼度（confidence）

学生ごとにデータの充実度が異なるため、スコアに信頼度を付与する。

| 条件 | confidence 目安 | 企業への表示 |
|---|---|---|
| 1 プロダクトのみ利用 | 20-30 | 「参考値」 |
| 2 プロダクト利用 | 40-50 | 「推定値」 |
| 3 プロダクト以上利用 | 60-80 | 「信頼度高」 |
| 4 プロダクト全て + データ豊富 | 80-100 | 通常表示 |

企業側 UI では confidence が低い学生のスコアにはラベルを付け、「データが限られています」と表示する。

### スコアの安定性対策

| 懸念 | 対策 |
|---|---|
| Claude のスコアリングのブレ | プロンプトに評価基準（ルーブリック）を明文化 + few-shot で安定させる |
| 時間経過でスコアが変わる | generated_at で鮮度管理 + 定期再計算（週次バッチ） |
| スコアの意味がユーザーに伝わるか | 企業向け UI で「70 = 上位 30% 程度」のような目安を表示 |

---

## データ構造

student_integrated_profiles テーブルにスコアカラムを追加する。

```sql
-- E. 人物要約（テキスト）
summary                     TEXT      -- AI 人物要約
strengths                   JSONB     -- 強み・特性
skills                      JSONB     -- スキル評価

-- A. 志向スコア（スペクトラム: 0-100）
growth_stability_score      SMALLINT  -- 0=安定重視, 100=成長重視
specialist_generalist_score SMALLINT  -- 0=汎用志向, 100=専門志向
individual_team_score       SMALLINT  -- 0=個人型, 100=チーム型
autonomy_guidance_score     SMALLINT  -- 0=指導希望, 100=裁量希望

-- B. 能力スコア（絶対: 0-100）
logical_thinking_score      SMALLINT  -- 論理的思考力
communication_score         SMALLINT  -- コミュニケーション力
writing_skill_score         SMALLINT  -- 文章表現力
leadership_score            SMALLINT  -- リーダーシップ（NULL=推定不能）

-- C. 活動量スコア（相対: 0-100）
activity_volume_score       SMALLINT  -- 就活活動量（4プロダクト横断）

-- D. 興味タグ（行動データから自動抽出）。配列長は 5 以内、許容値はサーバ層で検証
interested_industries       TEXT[]    -- 興味業界 Top5（順序 = 関心度順、最大 5 要素）
interested_job_types        TEXT[]    -- 興味職種（Claude 推定、最大 5 要素）

-- メタ
score_confidence            SMALLINT  -- 0-100: 元データの充実度
```

> **カテゴリ列を enum にしない理由**: MVP 期に語彙が揺れる前提のため、PostgreSQL enum
> （`ADD VALUE` のみで rename / remove が実質不可）ではなく `TEXT[]` で持つ。
> 許容値の単一ソースは `src/shared/constants/industries.ts` / `src/shared/constants/job-categories.ts`
> の `INDUSTRY_CATEGORIES` / `JOB_CATEGORIES`（`as const`）と対応する `industrySchema` / `jobCategorySchema`。
> 読込時は `schema.safeParse` で filter、書込時は `z.array(schema).max(5)` でサーバ層に集約する。

### Claude が生成する統合プロフィールの出力例

```json
{
  "summary": "論理性が高く、長期的な成長を重視する学生。ガクチカでデータ分析サークルのリーダー経験があり、IT業界の大手3社を集中的に研究している。",
  "strengths": ["論理的思考", "リーダーシップ", "データ分析"],
  "skills": ["Python", "データ分析", "プレゼンテーション"],
  "scores": {
    "growth_stability": 82,
    "specialist_generalist": 65,
    "individual_team": 45,
    "autonomy_guidance": 70,
    "logical_thinking": 75,
    "communication": 68,
    "writing_skill": 72,
    "leadership": 60,
    "activity_volume": 85
  },
  "interested_industries": ["it_software", "consulting", "finance", "advertising_media", "manufacturing"],
  "interested_job_types": ["engineer_it", "planning"],
  "score_confidence": 75
}
```

---

## マッチングの計算方法

### 基本: 構造化フィルタ + 興味タグマッチ + スコア距離

3層で絞り込む。

```
Layer 1: 構造化フィルタ（足切り）
  卒業年度、文理区分、希望勤務地 → WHERE 句

Layer 2: 興味タグマッチ（業界・職種の重なり）
  企業の業界/職種と学生の interested_industries / interested_job_types の重なり

Layer 3: スコア距離（並べ替え）
  企業が設定した理想スコアとの距離で順位付け
```

```sql
SELECT
  p.student_id,
  -- 興味タグの重なり度（業界 Top5 の順位も加味）
  (
    CASE WHEN p.interested_industries[1] = :company_industry THEN 5
         WHEN p.interested_industries[2] = :company_industry THEN 4
         WHEN p.interested_industries[3] = :company_industry THEN 3
         WHEN p.interested_industries[4] = :company_industry THEN 2
         WHEN p.interested_industries[5] = :company_industry THEN 1
         ELSE 0
    END
    + CASE WHEN :job_category = ANY(p.interested_job_types) THEN 3 ELSE 0 END
  ) AS tag_match_score,
  -- スコア距離（企業が重視する軸のみ）
  (
    ABS(p.growth_stability_score - :want_growth) * :w1 +
    ABS(p.logical_thinking_score - :want_logical) * :w2 +
    ABS(p.communication_score - :want_comm) * :w3
  ) AS score_distance
FROM student_integrated_profiles p
JOIN students s ON s.id = p.student_id
WHERE s.graduation_year = :year
  AND s.academic_type = ANY(:academic_types)
  AND p.score_confidence >= 30
ORDER BY tag_match_score DESC, score_distance ASC
LIMIT 50;
```

全文検索エンジンも embedding も不要。素の SQL で完結する。

**興味タグの順位が効くポイント**: interested_industries[1]（最も関心が高い業界）に企業の業界が入っている学生は、[5]に入っている学生よりマッチ度が高い。Top5 の順序を活用することで、単純な「含まれるか否か」より精度が上がる。

### 将来拡張: 企業ごとの重み学習

企業がスカウトを送った学生・承諾された学生のスコア傾向をフィードバックとして、重み（w1, w2, w3...）を自動調整する。ただし MVP では固定重みで十分。

### 学生申告（desired_*）と行動推定（interested_*）の組み合わせ — TODO

#207-209 で `students.desired_industries / desired_job_types / desired_locations` が追加された後、
上記 SQL は「`desired_*` で足切り → `interested_*` でスコア加点」の 2 段構成に拡張する。
具体的なクエリと重み付けは別途まとめる（実装中）。

---

## 学生の入力項目

### 入力不要（4プロダクトから自動生成）

- 志望業界
- 志望企業群
- ガクチカ
- 自己 PR 素材
- 強み・弱み
- 性格・価値観
- スキル
- 就活フェーズ
- 活動量
- 学歴・学部
- 企業選びの軸

### 学生に聞くもの（行動データから推定不可能）

| 項目 | 理由 |
|---|---|
| 卒業年度 | 誕生日からは推定できるが誤差がある |
| 氏名・連絡先 | 法的に必須 |
| 希望勤務地 | 行動データに現れにくい |
| 公開設定 | 同意プロセスとして必須 |
| 希望業界・職種の微調整 | 行動データと本人の希望がずれることへの救済弁 |

---

## 学生申告 vs 行動推定 — 命名と推定軸

| 由来 | 業界 | 職種 | 勤務地 |
|---|---|---|---|
| 行動データ（Claude 推定） | `interested_industries` | `interested_job_types` | — |
| 学生申告（オンボーディング） | `desired_industries` (#208) | `desired_job_types` (#209) | `desired_locations` (#207) |

- **行動データから推定するのは業界・職種のみ**。勤務地は行動データに現れにくいため
  `desired_locations` のみを持ち、`interested_locations` は作らない
- `desired_*` は NULL = 全業界 / 全職種 / 全エリア OK（足切りしない）。
  オンボーディングで未入力でも候補から除外しない
- カラムはいずれも `TEXT[]`（理由はデータ構造節の補注を参照）。
  許容値・配列長（最大 5）はサーバ層で検証する

---

## 企業側フィルタ項目（検索 UI）

### 構造化フィルタ（WHERE 句）

| 項目 | 型 | 備考 |
|---|---|---|
| 卒業年度 | graduation_year INT | 既存カラム |
| 文理区分 | academic_type ENUM | 既存カラム |
| 希望業界 | desired_industries TEXT[] | 学生入力。NULL = 全業界 OK（#208 で追加予定） |
| 希望職種 | desired_job_types TEXT[] | 同上（#209 で追加予定） |
| 希望勤務地 | desired_locations TEXT[] | 学生入力（#207 で追加予定） |

### 興味タグフィルタ

| 項目 | 使い方の例 |
|---|---|
| 興味業界 | 企業の業界が学生の Top5 に含まれる学生を優先表示 |
| 興味職種 | 企業の募集職種が学生の興味職種に含まれる学生を優先表示 |

### スコアフィルタ（範囲指定）

| 項目 | 使い方の例 |
|---|---|
| 成長-安定スコア | 「70 以上」= 成長志向が強い学生に絞る |
| 論理的思考力 | 「60 以上」= コンサル・エンジニア職向け |
| 就活活動量 | 「50 以上」= アクティブな学生に絞る |
| 信頼度 | 「30 以上」= データが極端に少ない学生を除外 |

企業は全スコアを指定する必要はない。重視する軸だけを設定し、残りはマッチ距離の計算から除外する。

---

## カテゴリの語彙管理

DB は `TEXT[]` のため語彙制約がない。許容値の単一ソースは TypeScript 側に置き、
読込時のフィルタと書込時のバリデーションでサーバ層が責任を持つ。

- **業界（11 カテゴリ）** [`INDUSTRY_CATEGORIES`](../../src/shared/constants/industries.ts) /
  [`industrySchema`](../../src/shared/constants/industries.ts):
  `it_software` / `consulting` / `finance` / `trading_company` / `manufacturing` /
  `advertising_media` / `retail_service` / `real_estate` / `infrastructure` /
  `public_sector` / `other`
- **職種（10 カテゴリ）** [`JOB_CATEGORIES`](../../src/shared/constants/job-categories.ts) /
  [`jobCategorySchema`](../../src/shared/constants/job-categories.ts):
  `engineer_it` / `engineer_other` / `designer` / `sales` / `marketing` /
  `planning` / `corporate` / `consultant` / `research` / `other`
- **勤務地（9 カテゴリ）** #207 で導入予定:
  `tokyo` / `kanto_except_tokyo` / `kansai` / `chubu_tokai` / `hokkaido_tohoku` /
  `chugoku_shikoku` / `kyushu_okinawa` / `overseas` / `remote_ok`

語彙を変更する場合: `shared/constants/industries.ts` または `job-categories.ts` の
配列を更新するだけ（zod schema は `as const` 配列から自動的に追従する）。
DB マイグレーションは不要（既存データとの整合は migration runtime で別途処理する）。

---

## 未決事項

| 項目 | 論点 | 決定時期 |
|---|---|---|
| スコアリングのルーブリック詳細 | Claude に渡す評価基準の具体的な定義 | Phase 1 設計時 |
| 再計算頻度 | 日次 / 週次バッチのどちらにするか | Phase 1 設計時 |
| 企業側のスコア設定 UI | 自然文入力 → スコア自動変換 or スライダー直接操作 | Phase 1 設計時 |
| 大学群フィルタの扱い | 大学名は表示するが絞り込みには使わせない方針でよいか | Phase 0 で方針決定 |
| 行動データと本人希望の乖離 | 行動では金融を調べているが本人は IT 志望と言う場合の扱い | Phase 1 設計時 |
| 学生へのスコア開示範囲 | 全スコアを見せるか、一部のみか、見せないか | Phase 0 で方針決定 |
