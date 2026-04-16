/** LINE token endpoint のレスポンス */
export type LineTokenResponse = {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
  scope: string;
  token_type: "Bearer";
};

/** LINE Profile API のレスポンス */
export type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

/** LINE id_token (OIDC) のペイロード */
export type LineIdTokenPayload = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nonce: string;
  name?: string;
  picture?: string;
  email?: string;
};

/** 認証アクションの結果 */
export type AuthResult = {
  success: boolean;
  error?: string;
  redirectTo?: string;
};
