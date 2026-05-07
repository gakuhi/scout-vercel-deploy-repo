import type { Metadata } from "next";
import {
  LegalLayout,
  OrderedList,
  Section,
  UnorderedList,
} from "@/features/legal/components/legal-layout";
import { COMPANY_INFO, SERVICE_INFO } from "@/features/legal/company-info";

export const metadata: Metadata = {
  title: `プライバシーポリシー | ${SERVICE_INFO.name}`,
  description: `${SERVICE_INFO.name}（${COMPANY_INFO.name}運営）のプライバシーポリシー。個人情報の取得・利用目的・第三者提供・委託先・国外移転・開示請求等を定めます。`,
  robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = "2026年5月1日";

export default function PrivacyPage() {
  return (
    <LegalLayout title="プライバシーポリシー" effectiveDate={EFFECTIVE_DATE}>
      <p>
        {COMPANY_INFO.name}
        （以下「当社」といいます。）は、当社が運営する就活スカウトサービス「
        {SERVICE_INFO.name}
        」（以下「本サービス」といいます。）における利用者の個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。当社は、個人情報の保護に関する法律（以下「個人情報保護法」といいます。）その他関係法令を遵守し、適切な取扱いに努めます。
      </p>

      <Section title="1. 事業者情報">
        <div className="rounded-2xl bg-surface-container-low p-6 text-sm leading-relaxed">
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2">
            <dt className="font-bold">商号</dt>
            <dd>{COMPANY_INFO.name}</dd>
            <dt className="font-bold">所在地</dt>
            <dd>
              〒{COMPANY_INFO.postalCode} {COMPANY_INFO.address}
            </dd>
            <dt className="font-bold">代表者</dt>
            <dd>{COMPANY_INFO.representative}</dd>
            <dt className="font-bold">設立</dt>
            <dd>{COMPANY_INFO.established}</dd>
            <dt className="font-bold">資本金</dt>
            <dd>{COMPANY_INFO.capital}</dd>
            <dt className="font-bold">事業内容</dt>
            <dd>{COMPANY_INFO.business.join("、")}</dd>
            <dt className="font-bold">許認可</dt>
            <dd>有料職業紹介事業許可番号 {COMPANY_INFO.employmentAgencyLicense}</dd>
          </dl>
        </div>
      </Section>

      <Section title="2. 取得する個人情報">
        <p>
          当社は、本サービスの提供にあたり、以下の個人情報を取得することがあります。
        </p>
        <h3 className="mt-4 text-base font-bold">(1) 学生ユーザーに関する情報</h3>
        <UnorderedList
          items={[
            "氏名、フリガナ、性別、生年月日、住所、電話番号、メールアドレス",
            "在籍する学校名・学部・学科・卒業予定年月、研究内容、語学・資格等",
            "プロフィール文、希望業界・職種、自己 PR、ガクチカ等の本人作成コンテンツ",
            "顔写真等のプロフィール画像",
            "LINE アカウント識別子（LINE ユーザー ID）、表示名、プロフィール画像 URL",
            "本サービス上での操作履歴、閲覧履歴、スカウトの送受信履歴、メッセージの内容",
            "本人の同意に基づき連携プロダクトから取得する利用履歴・成果物（後述「6. 連携プロダクトとの共同利用」参照）",
            "Cookie、IP アドレス、デバイス情報、ブラウザ情報、アクセス日時等の技術情報",
          ]}
        />
        <h3 className="mt-4 text-base font-bold">(2) 企業ユーザーに関する情報</h3>
        <UnorderedList
          items={[
            "法人名、所在地、業種、企業情報",
            "担当者の氏名、所属部署、役職、メールアドレス、電話番号",
            "ログイン情報、本サービス上での操作履歴、スカウト送信履歴、メッセージ内容",
            "請求先情報、支払履歴",
            "Cookie、IP アドレス、デバイス情報、ブラウザ情報、アクセス日時等の技術情報",
          ]}
        />
      </Section>

      <Section title="3. 個人情報の利用目的">
        <p>当社は、取得した個人情報を以下の目的で利用します。</p>
        <OrderedList
          items={[
            "本サービスの提供、運営、維持、改善のため",
            "学生ユーザーと企業ユーザーとのマッチング、スカウトの送受信、メッセージの送受信のため",
            "本サービスのプロフィール生成、レコメンド、検索結果表示のため（連携プロダクトから取得する情報の解析を含みます）",
            "利用者からのお問い合わせへの回答および本人確認のため",
            "本サービスに関する重要な通知、利用規約の変更、新機能・キャンペーン等のお知らせのため",
            "本サービスの利用状況の分析、新サービスの開発、品質向上のための統計データの作成（個人を特定できない形に加工した上で利用します）",
            "利用料金の請求、債権管理のため（企業ユーザー）",
            "本規約その他の規約・ポリシーに違反した利用者の特定および利用停止等の措置のため",
            "前各号に付随または関連する目的のため",
          ]}
        />
      </Section>

      <Section title="4. 第三者提供">
        <OrderedList
          items={[
            "当社は、以下の場合を除いて、あらかじめ本人の同意を得ることなく、個人データを第三者に提供しません。" +
              "(1) 法令に基づく場合 " +
              "(2) 人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき " +
              "(3) 公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき " +
              "(4) 国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき",
            "学生ユーザーがスカウトに対して応諾の意思表示を行った場合、当該学生ユーザーのプロフィール情報、連絡先情報、本サービス上のメッセージ内容等は、当該スカウトを送信した企業ユーザーに対して提供されます。これは本人の同意に基づく第三者提供として行われます。",
            "前項の提供にあたって、企業ユーザーは本サービスの利用規約に基づき、当該情報を本サービスの利用目的（採用選考、職業紹介、これに付随する連絡）の範囲内でのみ利用する義務を負います。",
          ]}
        />
      </Section>

      <Section title="5. 個人情報取扱いの委託">
        <p>
          当社は、利用目的の達成に必要な範囲内において、個人情報の取扱いの全部または一部を第三者に委託することがあります。委託にあたっては、委託先における個人情報の安全管理が図られるよう、適切な監督を行います。主な委託先は以下のとおりです。
        </p>
        <UnorderedList
          items={[
            "クラウドインフラ事業者（Vercel Inc.、Supabase Inc. 等。データは主に米国およびシンガポール所在のデータセンターで保管されます）",
            "AI 解析事業者（Anthropic, PBC 等。プロフィール生成・要約等の処理に利用します）",
            "メッセージング事業者（LINE ヤフー株式会社。LINE 経由の通知に利用します）",
            "決済代行事業者（企業ユーザーの利用料金収納に利用します）",
            "メール配信事業者",
            "顧客管理／カスタマーサポートツールの提供事業者",
          ]}
        />
      </Section>

      <Section title="6. 連携プロダクトとの共同利用">
        <p>
          当社は、本サービスと以下の連携プロダクトとの間で、利用者の利便性向上およびマッチング精度向上のため、個人情報を共同利用することがあります。
        </p>
        <div className="rounded-2xl bg-surface-container-low p-6 text-sm leading-relaxed">
          <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-3">
            <dt className="font-bold">共同利用される個人データの項目</dt>
            <dd>
              氏名、メールアドレス、所属、就活活動履歴（面接練習履歴、ES 推敲履歴、企業分析履歴、コンテンツ閲覧履歴等）、AI による解析結果
            </dd>
            <dt className="font-bold">共同利用者の範囲</dt>
            <dd>
              {SERVICE_INFO.partnerProducts
                .map((p) => `「${p}」`)
                .join("、")}
              の各サービスの運営者
            </dd>
            <dt className="font-bold">共同利用の目的</dt>
            <dd>
              本サービスにおけるプロフィール生成、スカウトのマッチング、各連携プロダクト間でのシングルサインオンおよびユーザー体験の最適化
            </dd>
            <dt className="font-bold">管理責任者</dt>
            <dd>
              {COMPANY_INFO.name}（住所・代表者は「1. 事業者情報」に記載）
            </dd>
          </dl>
        </div>
      </Section>

      <Section title="7. 外国にある第三者への提供">
        <p>
          当社は、第5条に定める委託先のうち、Vercel Inc.、Supabase Inc. および
          Anthropic, PBC（いずれも米国法人）等、外国にある第三者に個人データの取扱いを委託する場合があります。
        </p>
        <p>
          これらの国における個人情報保護に関する制度の概要および当該事業者が講じている個人情報保護のための措置については、個人情報保護委員会のウェブサイトおよび当該事業者の公表する情報をご参照ください。当社は、これらの委託先との間で、個人情報の安全管理が図られるための必要かつ適切な措置を講じています。
        </p>
      </Section>

      <Section title="8. Cookie 等の利用">
        <OrderedList
          items={[
            "本サービスは、利用者の利便性向上、利用状況の分析、広告配信等の目的で、Cookie、ローカルストレージ、その他類似の技術を使用することがあります。",
            "本サービスは、Google Analytics 等のアクセス解析ツールを使用することがあります。これらのツールは Cookie を利用して匿名のトラフィックデータを収集します。収集されたデータは各ツール提供事業者のプライバシーポリシーに基づいて管理されます。",
            "利用者は、ブラウザの設定により Cookie の受け入れを拒否することができますが、その場合、本サービスの一部機能が利用できなくなる可能性があります。",
          ]}
        />
      </Section>

      <Section title="9. 個人情報の安全管理措置">
        <p>
          当社は、取扱う個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために、以下を含む必要かつ適切な措置を講じます。
        </p>
        <UnorderedList
          items={[
            "個人情報保護に関する社内規程の整備、従業者への教育の実施",
            "個人情報を取扱う区域の管理、機器・電子媒体・書類等の盗難または紛失等の防止のための物理的安全管理措置",
            "アクセス制御、不正ソフトウェア対策、情報システムの監視等の技術的安全管理措置",
            "委託先における個人情報の取扱状況の定期的な監督",
          ]}
        />
      </Section>

      <Section title="10. 開示等のご請求">
        <OrderedList
          items={[
            "利用者は、当社に対し、個人情報保護法の定めに基づき、保有個人データの利用目的の通知、開示、訂正、追加、削除、利用停止、消去、第三者提供の停止（以下「開示等」といいます。）を請求することができます。",
            "開示等の請求は、本ポリシー末尾に記載のお問い合わせ窓口までご連絡ください。当社は、ご本人であることを確認のうえ、合理的な範囲で速やかに対応いたします。",
            "本サービスの設定画面から退会手続きを行うことにより、本サービス上の個人データの削除を請求することもできます。退会後の保管期間は次条に定めるとおりとします。",
          ]}
        />
      </Section>

      <Section title="11. 個人情報の保管期間">
        <OrderedList
          items={[
            "当社は、個人情報を利用目的の達成に必要な期間に限り保管します。",
            "退会後の個人情報については、不正利用の防止、紛争対応、法令上の保存義務の履行等のため、退会から相当期間（原則として 5 年間）を上限として保管し、その後速やかに削除または匿名化します。ただし、法令により保管が義務付けられている場合は、当該法令の定める期間に従います。",
            "統計目的のために匿名化された情報は、特定の個人を識別できない形に加工したうえで、期間の制限なく利用することがあります。",
          ]}
        />
      </Section>

      <Section title="12. 未成年者の個人情報">
        <p>
          未成年者が本サービスを利用する場合は、親権者等の法定代理人の同意を得たうえで、本ポリシーをご確認のうえ、ご利用ください。
        </p>
      </Section>

      <Section title="13. 本ポリシーの変更">
        <p>
          当社は、法令の改正、本サービスの内容変更等に伴い、本ポリシーを変更することがあります。本ポリシーを変更する場合は、変更後のポリシーを本サービス上に掲示するとともに、必要に応じて利用者に通知します。
        </p>
      </Section>

      <Section title="14. お問い合わせ窓口">
        <p>
          本ポリシーに関するお問い合わせ、個人情報の開示等のご請求は、下記までお願いいたします。
        </p>
        <div className="rounded-2xl bg-surface-container-low p-6 text-sm leading-relaxed">
          <p className="font-bold text-base">
            {COMPANY_INFO.name} 個人情報お問い合わせ窓口
          </p>
          <p className="mt-2">
            〒{COMPANY_INFO.postalCode} {COMPANY_INFO.address}
          </p>
          <p className="mt-1">TEL: {COMPANY_INFO.tel}</p>
          <p className="mt-3">お問い合わせ: {COMPANY_INFO.contactEmail}</p>
        </div>
        <p className="text-xs text-on-surface-variant">
          施行日: {EFFECTIVE_DATE}
        </p>
      </Section>
    </LegalLayout>
  );
}
