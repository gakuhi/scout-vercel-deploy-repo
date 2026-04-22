-- =============================================================
-- synced_* 詳細テーブルに UNIQUE 制約を追加
--
-- sync UPSERT が `onConflict: external_*_id` で動くよう、
-- 詳細テーブルの external_{type}_id に UNIQUE 制約を付与する。
-- smartes のテーブルには元々 UNIQUE が付いていた（20260409122315）。
-- interviewai / compai / sugoshu は付け忘れていたので追加する。
--
-- sugoshu の resumes / diagnoses は external_id が nullable のままだが、
-- PostgreSQL の UNIQUE は複数 NULL を許容するので既存データに影響なし。
-- 実運用では Bubble の _id が入るため NULL になる想定はない。
-- =============================================================

-- interviewai
ALTER TABLE synced_interviewai_sessions
  ADD CONSTRAINT synced_interviewai_sessions_external_session_id_key
  UNIQUE (external_session_id);

ALTER TABLE synced_interviewai_searches
  ADD CONSTRAINT synced_interviewai_searches_external_search_id_key
  UNIQUE (external_search_id);

-- compai
ALTER TABLE synced_compai_researches
  ADD CONSTRAINT synced_compai_researches_external_research_id_key
  UNIQUE (external_research_id);

ALTER TABLE synced_compai_messages
  ADD CONSTRAINT synced_compai_messages_external_message_id_key
  UNIQUE (external_message_id);

-- sugoshu
ALTER TABLE synced_sugoshu_resumes
  ADD CONSTRAINT synced_sugoshu_resumes_external_resume_id_key
  UNIQUE (external_resume_id);

ALTER TABLE synced_sugoshu_diagnoses
  ADD CONSTRAINT synced_sugoshu_diagnoses_external_diagnosis_id_key
  UNIQUE (external_diagnosis_id);
