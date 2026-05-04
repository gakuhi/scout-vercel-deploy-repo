import { describe, expect, it } from "vitest";

import {
  isTypeEnabled,
  shouldSendEmail,
  shouldSendLine,
} from "../settings";
import type {
  CompanyNotificationSettings,
  StudentNotificationSettings,
} from "../types";

const studentAllOn: StudentNotificationSettings = {
  id: "s-settings-id",
  student_id: "student-1",
  scout_received: true,
  chat_message: true,
  event_reminder: true,
  system_announcement: true,
  in_app_enabled: true,
  updated_at: null,
};

// 企業のマスタートグルは line_enabled カラム（命名は initial schema 由来）を
// メール送信用に流用する。詳細は settings.ts の shouldSendEmail() docstring を参照。
const companyAllOn: CompanyNotificationSettings = {
  id: "c-settings-id",
  company_member_id: "cm-1",
  scout_accepted: true,
  scout_declined: true,
  chat_message: true,
  event_reminder: true,
  system_announcement: true,
  line_enabled: true,
  in_app_enabled: true,
  updated_at: null,
};

describe("features/notification/lib/settings", () => {
  describe("isTypeEnabled", () => {
    it("学生: scout_received は scout_received カラムを参照", () => {
      expect(isTypeEnabled("student", "scout_received", studentAllOn)).toBe(
        true,
      );
      expect(
        isTypeEnabled("student", "scout_received", {
          ...studentAllOn,
          scout_received: false,
        }),
      ).toBe(false);
    });

    it("学生: scout_accepted / scout_declined は常に false（学生には来ない）", () => {
      expect(isTypeEnabled("student", "scout_accepted", studentAllOn)).toBe(
        false,
      );
      expect(isTypeEnabled("student", "scout_declined", studentAllOn)).toBe(
        false,
      );
    });

    it("企業担当者: scout_accepted は scout_accepted カラムで制御", () => {
      expect(
        isTypeEnabled("company_member", "scout_accepted", companyAllOn),
      ).toBe(true);
      expect(
        isTypeEnabled("company_member", "scout_accepted", {
          ...companyAllOn,
          scout_accepted: false,
        }),
      ).toBe(false);
    });

    it("企業担当者: scout_received は常に false（学生専用通知）", () => {
      expect(
        isTypeEnabled("company_member", "scout_received", companyAllOn),
      ).toBe(false);
    });

    it("企業担当者: event_reminder は event_reminder カラムで制御", () => {
      expect(
        isTypeEnabled("company_member", "event_reminder", companyAllOn),
      ).toBe(true);
      expect(
        isTypeEnabled("company_member", "event_reminder", {
          ...companyAllOn,
          event_reminder: false,
        }),
      ).toBe(false);
    });

    it("設定行が null の場合はデフォルト ON（true）", () => {
      expect(isTypeEnabled("student", "chat_new_message", null)).toBe(true);
      expect(
        isTypeEnabled("company_member", "chat_new_message", null),
      ).toBe(true);
    });

    it("企業担当者の scout_declined はプロダクト方針で外部チャネルでは通知しない（設定値に関わらず常に false）", () => {
      // 設定行が null
      expect(isTypeEnabled("company_member", "scout_declined", null)).toBe(
        false,
      );
      // 設定で scout_declined: true でも false（プロダクト方針が優先）
      expect(
        isTypeEnabled("company_member", "scout_declined", companyAllOn),
      ).toBe(false);
      // 設定で scout_declined: false でも当然 false
      expect(
        isTypeEnabled("company_member", "scout_declined", {
          ...companyAllOn,
          scout_declined: false,
        }),
      ).toBe(false);
    });
  });

  describe("shouldSendLine", () => {
    it("学生で種別 ON → true（学生はマスタートグル無し）", () => {
      expect(
        shouldSendLine("student", "chat_new_message", studentAllOn),
      ).toBe(true);
      expect(
        shouldSendLine("student", "scout_received", studentAllOn),
      ).toBe(true);
    });

    it("学生で種別 OFF → false", () => {
      expect(
        shouldSendLine("student", "chat_new_message", {
          ...studentAllOn,
          chat_message: false,
        }),
      ).toBe(false);
    });

    it("受信者 role と type の組み合わせ不整合なら false（学生に scout_accepted 等）", () => {
      expect(
        shouldSendLine("student", "scout_accepted", studentAllOn),
      ).toBe(false);
    });

    it("企業担当者は LINE 対象外なので常に false", () => {
      expect(
        shouldSendLine("company_member", "chat_new_message", companyAllOn),
      ).toBe(false);
      expect(
        shouldSendLine("company_member", "scout_accepted", companyAllOn),
      ).toBe(false);
    });

    it("学生で設定行が null の場合はデフォルト ON（true）", () => {
      expect(shouldSendLine("student", "chat_new_message", null)).toBe(true);
    });
  });

  describe("shouldSendEmail", () => {
    it("企業担当者で種別 ON かつマスター（line_enabled）ON → true", () => {
      expect(
        shouldSendEmail("company_member", "scout_accepted", companyAllOn),
      ).toBe(true);
      expect(
        shouldSendEmail("company_member", "chat_new_message", companyAllOn),
      ).toBe(true);
    });

    it("企業担当者でマスター（line_enabled）OFF → false", () => {
      expect(
        shouldSendEmail("company_member", "scout_accepted", {
          ...companyAllOn,
          line_enabled: false,
        }),
      ).toBe(false);
    });

    it("企業担当者で種別フラグ OFF → false（scout_accepted = false）", () => {
      expect(
        shouldSendEmail("company_member", "scout_accepted", {
          ...companyAllOn,
          scout_accepted: false,
        }),
      ).toBe(false);
    });

    it("企業担当者で event_reminder は event_reminder カラムで制御", () => {
      expect(
        shouldSendEmail("company_member", "event_reminder", companyAllOn),
      ).toBe(true);
      expect(
        shouldSendEmail("company_member", "event_reminder", {
          ...companyAllOn,
          event_reminder: false,
        }),
      ).toBe(false);
    });

    it("受信者 role と type の組み合わせ不整合なら false（企業に scout_received 等）", () => {
      expect(
        shouldSendEmail("company_member", "scout_received", companyAllOn),
      ).toBe(false);
    });

    it("学生はメール対象外なので常に false", () => {
      expect(
        shouldSendEmail("student", "chat_new_message", studentAllOn),
      ).toBe(false);
      expect(
        shouldSendEmail("student", "scout_received", studentAllOn),
      ).toBe(false);
    });

    it("企業担当者で設定行が null の場合はデフォルト ON（true）", () => {
      expect(shouldSendEmail("company_member", "chat_new_message", null)).toBe(
        true,
      );
    });
  });
});
