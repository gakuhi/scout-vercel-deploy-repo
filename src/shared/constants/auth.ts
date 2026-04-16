export const USER_ROLES = {
  STUDENT: "student",
  COMPANY_OWNER: "company_owner",
  COMPANY_ADMIN: "company_admin",
  COMPANY_MEMBER: "company_member",
} as const;

export const AUTH_ROUTES = {
  LOGIN: "/login",
  CALLBACK: "/auth/callback",
  LINE_CALLBACK: "/api/auth/callback/line",
} as const;

export const STUDENT_ROUTES = {
  DASHBOARD: "/student/dashboard",
} as const;
