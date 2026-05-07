/**
 * 株式会社SHiRO の会社情報。利用規約・プライバシーポリシー等の法的文書で参照する。
 * 変更があった場合はここを更新するだけで全ページに反映される。
 */
export const COMPANY_INFO = {
  name: "株式会社SHiRO",
  postalCode: "150-0002",
  address: "東京都渋谷区渋谷3丁目18番7号 渋谷東一号館ビル6階",
  tel: "03-6821-2072",
  established: "令和3年12月28日",
  capital: "5,000,000円",
  representative: "代表取締役 瀬川 祐輝",
  business: [
    "インターネットを活用した求人求職情報サービス業",
    "メディア事業",
  ],
  offices: [
    {
      name: "東京事業所",
      address: "東京都渋谷区桜丘17-6 協栄ビル6階",
    },
    {
      name: "大阪事業所",
      address: "大阪府大阪市北区芝田2-2-13 日生ビル東館2階",
    },
  ],
  employmentAgencyLicense: "13-ユ-315129",
  /** TODO: お問い合わせ・個人情報担当のメールアドレスが確定したら差し替え。確定までは TEL 案内 + 別途連絡 */
  contactEmail: "（メールアドレスは別途お知らせいたします）",
} as const;

export const SERVICE_INFO = {
  name: "ScoutLink",
  url: "https://scoutlink.jp", // TODO: 本番ドメイン確定後に差し替え
  partnerProducts: [
    "面接練習 AI",
    "スマート ES",
    "企業分析 AI",
    "すごい就活",
  ],
} as const;
