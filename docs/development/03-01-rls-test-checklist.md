# RLSテスト項目一覧

03-00-schema.md のRLSポリシー方針に基づき、ビジネス要件の観点からテストすべき項目を列挙する。

**レビュー観点:** 各項目が「ビジネスとして正しい要件か」を確認してください。テスト項目に過不足がないか、期待結果が意図通りかをチェックしてください。

---

## テストデータ前提

| ユーザー | ロール | 備考 |
|---|---|---|
| 学生A | student | プロフィール公開中 |
| 学生B | student | プロフィール非公開 |
| 審査済み企業 owner | company_owner | 審査済み(is_verified=true) + 公開中(is_public=true) |
| 審査済み企業 member | company_member | 同上の企業所属 |
| 未審査企業 owner | company_owner | 未審査(is_verified=false) + 非公開(is_public=false) |
| 未認証ユーザー | anon | ログインしていない状態 |

**データ間の関係:**
- 審査済み企業 → 学生Aにスカウト送信済み（status: accepted）
- 審査済み企業 → 学生Bにスカウト送信済み（status: sent）
- 学生Aと審査済み企業の間にチャットメッセージあり（スカウト承諾済みのため）
- 学生A・企業ownerそれぞれに通知あり
- 審査済み企業に公開求人1件・非公開求人1件あり
- 審査済み企業主催の公開イベント1件、運営主催の公開イベント1件あり
- 学生Aが審査済み企業イベントに参加申し込み済み

---

## 1. 学生の自分データ保護

> ビジネス要件: 学生は自分自身のデータのみ閲覧・編集できる。他の学生のデータは一切見えない

**なぜ重要:** 学生の個人情報（氏名・連絡先・学歴等）が他の学生に漏れると、プライバシー侵害になる。studentsテーブルのRLSが `auth.uid() = id` で正しく機能しているかを確認する。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 1-1 | 学生Aが自分のプロフィールを閲覧 | students SELECT | 自分のレコードのみ返る |
| 1-2 | 学生Aが学生Bのプロフィールを閲覧できない | students SELECT | 学生Bのレコードは返らない |
| 1-3 | 学生Aが自分のプロフィールを更新 | students UPDATE | 成功 |
| 1-4 | 学生Aが学生Bのプロフィールを更新できない | students UPDATE (学生BのID) | 失敗（0行更新） |

## 2. 連携データ・AIプロフィールの保護

> ビジネス要件: 連携データ（synced_*）やAIプロフィールは学生本人のみ閲覧可能。編集はシステム側が行う

**なぜ重要:** synced_*テーブルには他プロダクト（スマートES・企業分析AI等）から同期した学生の活動データが入っている。これは学生本人が確認するためのもので、他の学生や企業が直接見るものではない。企業にはAIが統合した `student_integrated_profiles` のデータを View 経由で提供する。また、学生やクライアントがデータを勝手に書き換えられないことも重要（ETLやAPIのみが書き込む）。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 2-1 | 学生Aが自分のESデータを閲覧 | synced_es_entries SELECT | 自分のデータのみ返る |
| 2-2 | 学生Bが学生AのESデータを閲覧できない | synced_es_entries SELECT | 0行 |
| 2-3 | 学生Aが自分の企業分析データを閲覧 | synced_researches SELECT | 自分のデータのみ返る |
| 2-4 | 学生Bが学生Aの企業分析データを閲覧できない | synced_researches SELECT | 0行 |
| 2-5 | 学生Aが自分の面接練習データを閲覧 | synced_interview_sessions SELECT | 自分のデータのみ返る |
| 2-6 | 学生Bが学生Aの面接練習データを閲覧できない | synced_interview_sessions SELECT | 0行 |
| 2-7 | 学生Aが自分の就活活動データを閲覧 | synced_activities SELECT | 自分のデータのみ返る |
| 2-8 | 学生Bが学生Aの就活活動データを閲覧できない | synced_activities SELECT | 0行 |
| 2-9 | 学生Aが自分のAIプロフィールを閲覧 | student_integrated_profiles SELECT | 自分のデータのみ返る |
| 2-10 | 学生AがESデータをINSERTできない | synced_es_entries INSERT | 失敗（ERROR） |
| 2-11 | 学生Aが企業分析データをINSERTできない | synced_researches INSERT | 失敗（ERROR） |
| 2-12 | 学生Aが面接練習データをINSERTできない | synced_interview_sessions INSERT | 失敗（ERROR） |
| 2-13 | 学生Aが就活活動データをINSERTできない | synced_activities INSERT | 失敗（ERROR） |
| 2-14 | 学生AがAIプロフィールをUPDATEできない | student_integrated_profiles UPDATE | 失敗（UPDATE 0） |
| 2-15 | 企業担当者が synced_es_entries に直接アクセスできない | synced_es_entries SELECT (企業ロール) | 0行 |
| 2-16 | 企業担当者が synced_researches に直接アクセスできない | synced_researches SELECT (企業ロール) | 0行 |
| 2-17 | 企業担当者が synced_interview_sessions に直接アクセスできない | synced_interview_sessions SELECT (企業ロール) | 0行 |
| 2-18 | 企業担当者が synced_activities に直接アクセスできない | synced_activities SELECT (企業ロール) | 0行 |
| 2-19 | 企業担当者が student_integrated_profiles に直接アクセスした場合、公開学生のAIプロフィールのみ返る | student_integrated_profiles SELECT (企業ロール) | 公開学生 or 承諾済みスカウトの学生のみ（searchable_students ViewのJOINで必要） |

## 2b. プロダクト紐付けの保護

> ビジネス要件: 学生本人のみ閲覧可能。作成・編集はシステム側が行う

**なぜ重要:** student_product_links は学生がどの既存プロダクトとアカウント連携しているかの情報。他の学生や企業に見えるべきではなく、学生自身もクライアントから直接操作するものではない（UIの連携フローを経由してサーバー側で作成）。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 2b-1 | 学生Aが自分のプロダクト紐付けを閲覧 | student_product_links SELECT | 自分のデータのみ返る |
| 2b-2 | 学生Bが学生Aのプロダクト紐付けを閲覧できない | student_product_links SELECT | 0行 |
| 2b-3 | 学生AがプロダクトリンクをINSERTできない | student_product_links INSERT | 失敗（ポリシーなし） |
| 2b-4 | 企業担当者がプロダクト紐付けを閲覧できない | student_product_links SELECT (企業) | 0行 |

## 3. 企業情報の公開制御

> ビジネス要件: 学生には is_public=true の企業のみ表示。企業担当者は自社のみ閲覧可能

**なぜ重要:** 非公開企業（プロフィール未完成、掲載停止中等）が学生に表示されるべきではない。また企業担当者が他社の情報（社名・業界・所在地等）を閲覧できると競合情報の漏洩になるため、自社のみに制限する。ownerのみが自社情報を編集でき、memberは閲覧のみ。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 3-1 | 学生Aが公開企業のみ閲覧できる | companies SELECT (学生) | is_public=true の企業のみ |
| 3-2 | 学生Aが非公開企業を閲覧できない | companies SELECT (学生) | is_public=false は含まれない |
| 3-3 | 企業担当者が自社のみ閲覧できる | companies SELECT (企業) | 自社のみ返る |
| 3-7 | 企業担当者が他社を閲覧できない | companies SELECT (企業) | 他社は含まれない |
| 3-4 | 企業ownerが自社情報を更新できる | companies UPDATE (owner) | 成功 |
| 3-5 | 企業memberが自社情報を更新できない | companies UPDATE (member) | 失敗（0行更新） |
| 3-6 | 企業ownerが他社情報を更新できない | companies UPDATE (他社のID) | 失敗（0行更新） |

## 4. 求人の公開制御

> ビジネス要件: 学生には公開求人（is_published=true）かつ公開企業（is_public=true）のみ表示

**なぜ重要:** 下書き中の求人や非公開企業の求人が学生に表示されると、企業の採用戦略が漏れる。企業担当者は自社の求人のみ管理でき、他社の求人にはアクセスできない。未審査企業が求人を作成できてしまうと、信頼性の担保ができない。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 4-1 | 学生が公開求人を閲覧できる | job_postings SELECT (学生) | 公開 + 公開企業の求人のみ |
| 4-2 | 学生が非公開求人を閲覧できない | job_postings SELECT (学生) | 非公開求人は含まれない |
| 4-3 | 学生が非公開企業の求人を閲覧できない | job_postings SELECT (学生) | 非公開企業の求人は含まれない |
| 4-4 | 企業担当者が自社の全求人（非公開含む）を閲覧できる | job_postings SELECT (企業) | 自社の全求人 |
| 4-5 | 企業担当者が他社の求人を閲覧できない | job_postings SELECT (企業) | 他社の求人は含まれない |
| 4-6 | 審査済み企業のみ求人を作成できる | job_postings INSERT | 審査済み: 成功、未審査: 失敗 |

## 5. スカウトの送信・閲覧制御

> ビジネス要件: 学生は自分宛のスカウトのみ。企業は自社のスカウトのみ。審査済み企業のみ送信可能

**なぜ重要:** スカウトメッセージには企業の採用意図や学生への評価が含まれる。他の学生のスカウト内容が見えたり、未審査企業がスカウトを送れてしまうと信頼性が崩壊する。また学生がスカウトの本文(subject/message)を改ざんできないよう、GRANTでstatus/read_at/responded_atのみ更新可能に制限している。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 5-1 | 学生Aが自分宛のスカウトを閲覧 | scouts SELECT (学生A) | 自分宛のみ |
| 5-2 | 学生Aが学生B宛のスカウトを閲覧できない | scouts SELECT (学生A) | 学生B宛は含まれない |
| 5-3 | 学生Aがスカウトのstatus/read_at/responded_atを更新できる | scouts UPDATE | 成功 |
| 5-4 | 学生Aがスカウトのsubject/messageを更新できない | scouts UPDATE (subject変更) | 失敗（GRANT制限） |
| 5-5 | 審査済み企業がスカウトを送信できる | scouts INSERT (審査済み) | 成功 |
| 5-6 | 未審査企業がスカウトを送信できない | scouts INSERT (未審査) | 失敗 |
| 5-7 | 企業担当者が自社のスカウトのみ閲覧 | scouts SELECT (企業) | 自社のスカウトのみ |

## 6. チャットの制御

> ビジネス要件: スカウト承諾(accepted)後のみチャット可能。当事者のみ閲覧・送信可能

**なぜ重要:** チャットはスカウト承諾後の学生-企業間コミュニケーション。承諾前にメッセージを送れてしまうとスカウトの承諾フローが無意味になる。また当事者以外がチャット内容を見れると、採用プロセスの秘匿性が保てない。既読(read_at)は相手側のみが更新できる（自分で自分のメッセージを既読にする操作はおかしい）。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 6-1 | 学生Aが承諾済みスカウトのチャットを閲覧 | chat_messages SELECT (学生A) | 当事者のスカウトのチャットのみ |
| 6-2 | 学生Bが学生Aのチャットを閲覧できない | chat_messages SELECT (学生B) | 0行 |
| 6-3 | 学生Aが承諾済みスカウトにメッセージを送信できる | chat_messages INSERT (accepted) | 成功 |
| 6-4 | 学生Bが未承諾スカウトにメッセージを送信できない | chat_messages INSERT (sent) | 失敗 |
| 6-5 | 企業担当者が自社スカウトのチャットを閲覧 | chat_messages SELECT (企業) | 自社のスカウトのチャットのみ |
| 6-6 | 未審査企業がチャットを閲覧できない | chat_messages SELECT (未審査) | 0行 |
| 6-7 | 相手のメッセージのread_atを更新できる | chat_messages UPDATE (相手側) | 成功 |
| 6-8 | 自分のメッセージのread_atは更新できない | chat_messages UPDATE (自分側) | 失敗 |

## 7. 通知の制御

> ビジネス要件: 自分宛の通知のみ閲覧可能。通知の作成はサーバーサイドのみ

**なぜ重要:** 通知には「誰にスカウトが届いた」「誰がスカウトを承諾した」等の情報が含まれる。他人の通知が見えるとプライバシー侵害。クライアントからの通知INSERT を禁止することで、偽の通知を作成する攻撃を防ぐ。また通知のタイトルや本文をユーザーが改ざんできないよう、GRANTでis_read/read_atのみ更新可能に制限している。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 7-1 | 学生Aが自分の通知のみ閲覧 | notifications SELECT | 自分宛のみ |
| 7-2 | 企業ownerが自分の通知のみ閲覧 | notifications SELECT | 自分宛のみ |
| 7-3 | クライアントから通知をINSERTできない | notifications INSERT | 失敗（ポリシーなし） |
| 7-4 | is_read/read_atのみ更新可能 | notifications UPDATE | is_read/read_at: 成功、title変更: 失敗（GRANT制限） |

## 8. 学生データの閲覧制御（View経由）

> ビジネス要件: 企業担当者は審査済み企業のみ、個人特定情報を除いたView経由で学生データを閲覧。スカウト承諾後に実名・連絡先が開示される

**なぜ重要:** スカウトサービスの核心部分。企業が学生を検索する段階では匿名（大学・学部・AI要約のみ）で、スカウトを承諾して初めて実名・連絡先が開示される。この二段階の情報開示をDB層で強制している。

- **View（public_students / searchable_students）**: カラム制限。実名(last_name/first_name)、連絡先(email/phone)、住所詳細を除外
- **RLS（students_select_company）**: 行制限。公開プロフィール or 承諾済みスカウトの学生のみ
- **直接アクセス（students テーブル）**: 承諾済みの学生のみ全カラム（実名・連絡先含む）が見える

未審査企業はViewでもstudents直接でも0行になる。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 8-1 | 審査済み企業がpublic_studentsで公開学生を閲覧 | public_students SELECT | プロフィール公開中の学生のみ（実名・連絡先なし） |
| 8-2 | 審査済み企業がsearchable_studentsでAI情報付きで閲覧 | searchable_students SELECT | 公開学生 + AI統合プロフィール情報 |
| 8-3 | 未審査企業がpublic_studentsを閲覧できない | public_students SELECT (未審査) | 0行 |
| 8-4 | 未審査企業がsearchable_studentsを閲覧できない | searchable_students SELECT (未審査) | 0行 |
| 8-5 | 企業担当者がstudentsテーブルに直接アクセスした場合、公開学生 + 承諾済みスカウトの学生が返る | students SELECT (企業ロール) | 公開学生 or 承諾済みスカウトの学生のみ |
| 8-6 | public_studentsに実名(last_name/first_name)が含まれない | public_students のカラム確認 | 実名カラムが存在しない |
| 8-7 | public_studentsに連絡先(email/phone)が含まれない | public_students のカラム確認 | 連絡先カラムが存在しない |
| 8-8 | 非公開(is_profile_public=false)の学生がViewに含まれない | public_students SELECT | 学生Bは含まれない |
| 8-9 | スカウト承諾後、企業がstudents直接アクセスで実名・連絡先を閲覧できる | students SELECT WHERE accepted | 承諾済み学生の全カラム（last_name, email等）が見える |
| 8-10 | スカウト未承諾(sent)の学生の実名・連絡先は見えない | students SELECT WHERE sent | 非公開学生の場合は0行 |

## 8b. 検索条件保存

> ビジネス要件: 自分の保存した検索条件のみCRUD可能

**なぜ重要:** saved_searches は企業担当者がよく使うマッチング条件を保存する機能。他の担当者の検索条件が見えると採用戦略が漏れる。自分のものだけ操作できる。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 8b-1 | 企業担当者が自分の保存検索を閲覧 | saved_searches SELECT | 自分のもののみ |
| 8b-2 | 企業担当者が他人の保存検索を閲覧できない | saved_searches SELECT (他のmember) | 0行 |
| 8b-3 | 企業担当者が検索条件を作成できる | saved_searches INSERT | 成功 |
| 8b-4 | 企業担当者が自分の検索条件を更新できる | saved_searches UPDATE | 成功 |
| 8b-5 | 企業担当者が自分の検索条件を削除できる | saved_searches DELETE | 成功 |
| 8b-6 | 学生が保存検索にアクセスできない | saved_searches SELECT (学生) | 0行 |

## 8c. 課金プラン

> ビジネス要件: 企業担当者は自社のプランのみ閲覧可能。変更はサーバーサイドのみ

**なぜ重要:** company_plans には Stripe の顧客ID・サブスクリプションID等の課金情報が含まれる。他社のプラン情報や課金状況が見えてはいけない。プランの変更はStripe Webhook経由でサーバー側が行うため、クライアントからのINSERT/UPDATEは不可。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 8c-1 | 企業担当者が自社のプランを閲覧 | company_plans SELECT | 自社のプランのみ |
| 8c-2 | 企業担当者が他社のプランを閲覧できない | company_plans SELECT (他社) | 0行 |
| 8c-3 | 企業担当者がプランをINSERTできない | company_plans INSERT | 失敗（ポリシーなし） |
| 8c-4 | 企業担当者がプランをUPDATEできない | company_plans UPDATE | 失敗（ポリシーなし） |
| 8c-5 | 学生がプランにアクセスできない | company_plans SELECT (学生) | 0行 |

## 9. 企業メンバー管理

> ビジネス要件: ownerのみメンバーの追加・更新・削除が可能

**なぜ重要:** 企業のメンバー管理はowner（契約者）のみが行う。memberが勝手に他のメンバーを追加・削除できると組織管理が破綻する。また他社のメンバー情報（氏名・メールアドレス）が見えると個人情報漏洩になる。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 9-1 | 企業担当者が自社メンバーを閲覧 | company_members SELECT | 自社メンバーのみ |
| 9-2 | 企業担当者が他社メンバーを閲覧できない | company_members SELECT | 他社メンバーは含まれない |
| 9-3 | ownerがメンバーを追加できる | company_members INSERT (owner) | 成功 |
| 9-4 | memberがメンバーを追加できない | company_members INSERT (member) | 失敗 |
| 9-5 | ownerがメンバーを削除できる | company_members DELETE (owner) | 成功 |
| 9-6 | memberがメンバーを削除できない | company_members DELETE (member) | 失敗 |
| 9-7 | ownerが他社にメンバーを追加できない | company_members INSERT (他社company_id) | 失敗 |
| 9-8 | ownerが他社メンバーを更新できない | company_members UPDATE (他社メンバー) | 失敗（0行更新） |
| 9-9 | ownerが他社メンバーを削除できない | company_members DELETE (他社メンバー) | 失敗（0行削除） |

## 10. イベントの公開制御

> ビジネス要件: 学生には公開イベント（企業主催の場合はis_public=trueの企業のみ）。企業は自社+運営イベント

**なぜ重要:** 非公開企業のイベントが学生に見えると、その企業が採用活動中であることが漏れる。企業は自社のイベントのみ管理でき、他社のイベントを編集・閲覧できてはいけない。運営主催イベント（合同説明会等）は全企業・全学生に公開。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 10-1 | 学生が公開イベント（公開企業主催）を閲覧 | events SELECT (学生) | 公開かつ公開企業のイベントのみ |
| 10-2 | 学生が運営主催の公開イベントを閲覧 | events SELECT (学生) | 運営主催イベントも含まれる |
| 10-3 | 学生が非公開企業のイベントを閲覧できない | events SELECT (学生) | 非公開企業のイベントは含まれない |
| 10-4 | 企業担当者が自社イベント+運営イベントを閲覧 | events SELECT (企業) | 自社の全イベント + 公開中の運営イベント |
| 10-5 | 審査済み企業のみイベントを作成できる | events INSERT | 審査済み: 成功、未審査: 失敗 |
| 10-6 | 企業担当者が他社のイベントを閲覧できない | events SELECT (企業) | 他社のイベントは含まれない |
| 10-7 | 企業担当者が他社のイベントを更新できない | events UPDATE (他社イベント) | 失敗（0行更新） |

## 11. イベント参加申し込み

> ビジネス要件: 学生は自分の申し込みのみ。企業は自社イベントの申し込み一覧を閲覧・ステータス更新（確認・出席記録）可能

**なぜ重要:** 学生のイベント参加状況は個人の就活行動であり、他の学生に見えてはいけない。企業は自社イベントの参加者管理（出席確認等）が必要だが、他社イベントの参加者情報にアクセスできてはいけない。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 11-1 | 学生が自分の申し込みのみ閲覧 | event_registrations SELECT (学生) | 自分の申し込みのみ |
| 11-2 | 学生が公開イベントに申し込みできる | event_registrations INSERT | 成功 |
| 11-3 | 学生が申し込みをキャンセルできる | event_registrations UPDATE (status) | 成功 |
| 11-4 | 企業が自社イベントの申し込み一覧を閲覧 | event_registrations SELECT (企業) | 自社イベントの申し込みのみ |
| 11-5 | 企業が他社イベントの申し込みを閲覧できない | event_registrations SELECT (企業) | 他社分は含まれない |
| 11-6 | 企業が自社イベントの申し込みステータスを更新できる（確認・出席記録） | event_registrations UPDATE (status, 企業) | 成功 |
| 11-7 | 企業が他社イベントの申し込みステータスを更新できない | event_registrations UPDATE (他社イベント) | 失敗（0行更新） |

## 12. Service Role 専用テーブル

> ビジネス要件: anonymous_visits はクライアントから一切アクセス不可

**なぜ重要:** anonymous_visits は流入経路トラッキング用で、IPアドレスやUser-Agent等のセンシティブな情報を含む。ユーザーが自分や他人のトラッキングデータを閲覧・操作できてはいけない。全操作をService Role Key経由（サーバーサイド）に限定する。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 12-1 | 学生がanonymous_visitsを閲覧できない | anonymous_visits SELECT (学生) | 0行 |
| 12-2 | 企業がanonymous_visitsを閲覧できない | anonymous_visits SELECT (企業) | 0行 |
| 12-3 | クライアントからanonymous_visitsにINSERTできない | anonymous_visits INSERT | 失敗 |

## 13. 通知設定

> ビジネス要件: 自分の設定のみ閲覧・作成・更新可能

**なぜ重要:** 通知設定は個人の好み（LINE通知ON/OFF、メール通知ON/OFF等）であり、他人の設定が見えたり変更できたりするべきではない。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 13-1 | 学生が自分の通知設定のみ閲覧 | student_notification_settings SELECT | 自分のレコードのみ |
| 13-2 | 企業担当者が自分の通知設定のみ閲覧 | company_notification_settings SELECT | 自分のレコードのみ |
| 13-3 | 学生が他人の通知設定を閲覧できない | student_notification_settings SELECT | 他人分は含まれない |

## 14. 未認証ユーザー（anon）の全拒否

> ビジネス要件: ログインしていないユーザーは全てのデータにアクセスできない

**なぜ重要:** 本サービスは認証必須。未認証ユーザーがAPIを叩いてデータを取得できてしまうと、ログイン機能が無意味になる。`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;` で anon ロールの全権限を剥がしている。将来的に未認証向け公開コンテンツ（求人一覧等）を提供する場合は、個別に権限を開放する。

| # | テスト内容 | 操作 | 期待結果 |
|---|---|---|---|
| 14-1 | 未認証ユーザーが全publicテーブルにアクセスできない | 全テーブル SELECT (anon) | 全てERROR（permission denied） |
| 14-2 | 未認証ユーザーがViewにアクセスできない | public_students / searchable_students SELECT (anon) | 全てERROR（permission denied） |

---

**合計: 104項目**
