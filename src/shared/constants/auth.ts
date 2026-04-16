export const USER_ROLES = {
  STUDENT: "student",
  COMPANY_OWNER: "company_owner",
  COMPANY_MEMBER: "company_member",
} as const;

export const AUTH_ROUTES = {
  STUDENT_LOGIN: "/student/login",
  COMPANY_LOGIN: "/company/login",
  /** LINE 認証開始（直接ログイン / 同時登録 共通） */
  LINE_AUTH: "/api/student/auth/line",
  /** LINE callback */
  LINE_CALLBACK: "/api/student/auth/callback/line",
} as const;

export const STUDENT_ROUTES = {
  DASHBOARD: "/student/dashboard",
} as const;
