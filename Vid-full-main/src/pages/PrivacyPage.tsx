import { Shield, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type LegalLanguage = 'en' | 'zh' | 'ja';

type LegalSection = {
  title?: string;
  paragraphs?: string[];
  subsections?: Array<{ title: string; items?: string[]; paragraphs?: string[] }>;
  items?: string[];
};

const privacyContent: Record<LegalLanguage, {
  back: string;
  title: string;
  effectiveDate: string;
  sections: LegalSection[];
  operator: string;
  siteName: string;
}> = {
  en: {
    back: 'Back to Home',
    title: 'Privacy Policy',
    effectiveDate: 'Effective date: March 31, 2026',
    operator: 'Operator: VAID Company',
    siteName: 'Website name: VAID',
    sections: [
      { paragraphs: ['VAID (“we”, “us”, or “our”) respects your privacy and personal information. Please read this Privacy Policy before using the service. By using VAID, you agree that we may process relevant information as described here.'] },
      {
        title: '1. Information We Collect',
        paragraphs: ['To provide the service, we may collect the following information:'],
        subsections: [
          { title: '1.1 Information you provide', items: ['Images or files you upload.', 'Character names, creator names, or other display information you submit.', 'Order information you submit.', 'Messages or feedback you send through contact forms.'] },
          { title: '1.2 Information generated or collected by the service', items: ['Verification records, certificate records, order records, and usage records related to service results.', 'Device environment, identifiers, or local state needed for access control, security, and service management.', 'Access logs, error logs, IP address, browser type, device type, access time, and request records.'] },
          { title: '1.3 Payment-related information', paragraphs: ['If you use paid services, we may collect or process:'], items: ['Order number.', 'Payment status.', 'Plan information.', 'Payment time.', 'Necessary identifiers associated with an order.'] }
        ]
      },
      { title: '2. How We Use Information', paragraphs: ['We use the information mainly for the following purposes:'], items: ['Generate digital certificates, verification information, and related service results.', 'Provide verification, download, and display services.', 'Process payments, orders, and usage credits.', 'Prevent fraud, abuse, and malicious access.', 'Handle complaints, disputes, and security incidents.', 'Improve performance, troubleshoot issues, and maintain the service.', 'Comply with applicable laws and regulatory requirements.'] },
      { title: '3. Image and Content Processing', paragraphs: ['Images you upload may be used to generate certificate previews, display content, verification information, and supporting materials.', 'We follow the principle of minimum necessity and keep relevant content only within the scope required to provide the service.'] },
      { title: '4. Device Environment and Identifiers', paragraphs: ['For service management, access control, security, and abuse prevention, we may use device environment information, browser local state, or similar identifiers.', 'You understand and agree that:'], items: ['Such information is used only for service management and security control.', 'It is not used for unrelated advertising or cross-service profiling.', 'If you clear browser data, change devices, or change browsers, the identification result may change.'] },
      { title: '5. Data Storage', paragraphs: ['We store your information for the period necessary to provide the service, unless laws require otherwise or you request deletion.', 'Different types of information may have different retention periods, for example:'], items: ['Order and payment records: retained as required for legal, accounting, and risk-control needs.', 'Certificate and verification records: retained as needed for service display and verification.', 'Log information: retained for security audit and troubleshooting.', 'Temporary files: cleaned up according to service rules after processing.'], },
      { paragraphs: ['After the retention period expires, we will delete or anonymize relevant information unless laws require continued retention.'] },
      { title: '6. Information Sharing', paragraphs: ['We do not sell your personal information to unrelated third parties.', 'To provide the service, we may share necessary information with the following categories of third parties or partners:'], items: ['Payment service providers.', 'Cloud infrastructure and technical service providers.', 'Data processing and storage providers.', 'Government, judicial, or regulatory authorities lawfully entitled to request disclosure.'] },
      { paragraphs: ['These third parties may process information only within the scope necessary to provide the service and should follow applicable security and confidentiality obligations.'] },
      { title: '7. Cross-Border Transfer', paragraphs: ['If the service uses cloud services, databases, or infrastructure deployed outside your jurisdiction, some information may be stored or processed cross-border.', 'Where legal requirements apply, we will provide notices, assessments, and safeguards as required by applicable laws.'] },
      { title: '8. Information Security', paragraphs: ['We take reasonable technical and organizational measures to protect information security, including:'], items: ['Transmission encryption.', 'Access control.', 'Permission isolation.', 'Necessary security checks.', 'Storage permission management.', 'Log auditing.', 'Least-privilege principles.'] },
      { paragraphs: ['However, no system can be absolutely secure. If an incident may affect your personal information security, we will notify you and take remedial measures as required by law.'] },
      { title: '9. Your Rights', paragraphs: ['Subject to applicable laws, you may have the following rights:'], items: ['Access your personal information.', 'Correct your personal information.', 'Delete your personal information.', 'Withdraw consent.', 'Obtain a copy or export of personal information.', 'Cancel or delete relevant service records.'] },
      { paragraphs: ['To exercise these rights, please contact us through the “Contact Us” entry on the website. We will process requests within a reasonable period unless laws provide otherwise or immediate completion is technically impossible.'] },
      { title: '10. Protection of Minors', paragraphs: ['This service is not directed to children under the age of 14. If you are a minor, please use the service under the guidance of your guardian and ensure guardian consent.', 'If we discover unauthorized collection of minors’ personal information, we will delete, anonymize, or take other necessary measures according to law.'] },
      { title: '11. Cookies and Similar Technologies', paragraphs: ['To improve experience, remember preferences, maintain access status, or perform security controls, we may use cookies, local storage, or similar technologies.', 'You may manage cookies through browser settings, but some service features may not work properly if certain functions are disabled.'] },
      { title: '12. Third-Party Services', paragraphs: ['The service may integrate third-party payment, cloud infrastructure, data processing, and storage services. Third-party providers process information under their own privacy policies, which you should also review.'] },
      { title: '13. Policy Updates', paragraphs: ['We may update this Privacy Policy due to changes in laws, business adjustments, or service upgrades.', 'If material changes occur, we will notify you through page notices, in-service prompts, or other appropriate means. Continued use of the service means you agree to the updated policy.'] }
    ]
  },
  zh: {
    back: '返回首页',
    title: '隐私政策',
    effectiveDate: '生效日期：2026年3月31日',
    operator: '运营方：VAID Company',
    siteName: '网站名称：VAID',
    sections: [
      { paragraphs: ['VAID（以下简称“我们”）非常重视您的隐私与个人信息保护。请您在使用本服务前阅读并理解本隐私政策。您使用本服务，即表示您同意我们按照本隐私政策处理您的相关信息。'] },
      {
        title: '1. 我们收集的信息',
        paragraphs: ['为向您提供服务，我们可能收集以下信息：'],
        subsections: [
          { title: '1.1 您主动提供的信息', items: ['您上传的图片或文件；', '您填写的角色名称、创作者名称或其他展示信息；', '您提交的订单信息；', '您主动联系我们时提供的反馈或咨询内容。'] },
          { title: '1.2 服务自动生成或收集的信息', items: ['与服务结果相关的验证信息、记录信息、订单信息及使用记录；', '为实现访问控制、安全保障和服务管理所需的设备环境信息、识别信息或本地状态信息；', '访问日志、错误日志、IP 地址、浏览器类型、设备类型、访问时间及请求记录。'] },
          { title: '1.3 支付相关信息', paragraphs: ['如您使用付费服务，我们可能收集或处理：'], items: ['订单号；', '支付状态；', '套餐信息；', '支付时间；', '与订单关联的必要识别信息。'] }
        ]
      },
      { title: '2. 我们如何使用信息', paragraphs: ['我们收集和使用上述信息，主要用于以下目的：'], items: ['为您生成数字证书、验证信息及相关服务结果；', '为您提供验证、下载和展示服务；', '完成支付、订单管理与购买次数管理；', '防止欺诈、滥用和恶意访问；', '处理投诉、纠纷和安全事件；', '优化产品性能、故障排查与服务维护；', '满足适用法律法规和监管要求。'] },
      { title: '3. 图片与相关内容处理', paragraphs: ['您上传的图片可能会被用于生成数字证书展示内容、预览内容、验证信息及相关辅助材料。', '我们会遵循最小必要原则处理您的信息，并尽量仅在实现服务所必需的范围内保存相关内容。'] },
      { title: '4. 设备环境与识别信息', paragraphs: ['为实现服务管理、访问控制、安全保障和防止滥用，我们可能使用设备环境信息、浏览器本地状态信息或类似识别技术。', '您理解并同意：'], items: ['该类信息仅用于服务管理和安全控制；', '该类信息不会用于与本服务无关的广告投放或跨服务画像；', '如您清除浏览器数据、更换设备或更换浏览器，相关识别结果可能发生变化。'] },
      { title: '5. 信息存储', paragraphs: ['我们会在实现服务所必需的期限内存储您的信息，除非法律法规另有要求或您提出删除请求。', '不同信息的保存期限可能不同，例如：'], items: ['订单与支付记录：按法律、财务和风控需要保存；', '数字证书与验证记录：按服务展示与验证需要保存；', '日志信息：按安全审计和故障排查需要保存；', '临时文件：在服务完成后按规则清理。'] },
      { paragraphs: ['当保存期限届满后，我们会删除或匿名化处理相关信息，除非法律法规要求继续保存。'] },
      { title: '6. 信息共享', paragraphs: ['我们不会向无关第三方出售您的个人信息。', '为实现服务，我们可能将必要信息提供给以下类型的第三方或合作方：'], items: ['支付服务提供方；', '云基础设施与技术服务提供方；', '数据处理与存储服务提供方；', '依法有权要求披露信息的政府部门、司法机关或监管机构。'] },
      { paragraphs: ['上述第三方仅在实现服务所必需的范围内处理信息，并应遵守相应安全与保密义务。'] },
      { title: '7. 跨境传输', paragraphs: ['如本服务使用境外部署的云服务、数据库或其他基础设施，您的部分信息可能存在跨境存储或跨境处理的情形。', '如涉及法律要求的跨境传输，我们将按照适用法律法规进行告知、评估并采取相应保护措施。'] },
      { title: '8. 信息安全', paragraphs: ['我们会采取合理的技术与管理措施保护您的信息安全，包括但不限于：'], items: ['传输加密；', '访问控制；', '权限隔离；', '必要的安全校验措施；', '存储权限管理；', '日志审计；', '最小权限原则。'] },
      { paragraphs: ['但请您理解，任何系统都无法做到绝对安全。如发生可能影响您个人信息安全的事件，我们将按照法律法规要求及时通知您并采取补救措施。'] },
      { title: '9. 您的权利', paragraphs: ['按照适用法律法规，您可能享有以下权利：'], items: ['查询您的个人信息；', '更正您的个人信息；', '删除您的个人信息；', '撤回同意；', '获取个人信息副本或导出；', '注销或删除相关服务记录。'] },
      { paragraphs: ['如您希望行使上述权利，请通过网站页面公布的“联系我们”方式与我们联系。我们将在合理期限内处理您的请求，但法律法规另有规定或技术上无法立即完成的除外。'] },
      { title: '10. 未成年人保护', paragraphs: ['本服务不面向未满 14 周岁的儿童。如果您是未成年人，请在监护人指导下使用本服务，并确保已取得监护人同意。', '如果我们发现未经授权收集了未成年人个人信息，我们将依法采取删除、匿名化或其他必要措施。'] },
      { title: '11. Cookie 与类似技术', paragraphs: ['为提升使用体验、记住您的偏好、维护访问状态或进行安全控制，我们可能使用 Cookie、本地存储或类似技术。', '您可以通过浏览器设置管理 Cookie，但关闭某些功能后，部分服务可能无法正常使用。'] },
      { title: '12. 第三方服务', paragraphs: ['本服务可能集成第三方支付、云基础设施、数据处理与存储等第三方服务。第三方服务提供方会按照其自身隐私政策处理信息。建议您同时阅读相关第三方服务的隐私政策。'] },
      { title: '13. 政策更新', paragraphs: ['我们可能根据法律法规变化、业务调整或服务升级更新本隐私政策。', '如本隐私政策发生重大变更，我们将通过页面公告、站内提示或其他适当方式通知您。继续使用本服务，即表示您同意更新后的隐私政策。'] }
    ]
  },
  ja: {
    back: 'ホームへ戻る',
    title: 'プライバシーポリシー',
    effectiveDate: '施行日：2026年3月31日',
    operator: '運営者：VAID Company',
    siteName: 'サイト名：VAID',
    sections: [
      { paragraphs: ['VAID（以下「当社」）は、お客様のプライバシーおよび個人情報の保護を重視します。本サービスをご利用になる前に、本プライバシーポリシーをお読みください。本サービスを利用することにより、お客様は本ポリシーに従った情報処理に同意したものとみなされます。'] },
      {
        title: '1. 収集する情報',
        paragraphs: ['サービス提供のため、当社は以下の情報を収集する場合があります。'],
        subsections: [
          { title: '1.1 お客様が提供する情報', items: ['アップロードされた画像またはファイル。', 'キャラクター名、作成者名、その他表示情報。', '注文情報。', 'お問い合わせやフィードバックの内容。'] },
          { title: '1.2 サービスにより生成または収集される情報', items: ['検証情報、記録情報、注文情報、利用記録。', 'アクセス制御、セキュリティ、サービス管理に必要なデバイス環境情報、識別情報、ローカル状態。', 'アクセスログ、エラーログ、IPアドレス、ブラウザ種別、デバイス種別、アクセス時刻、リクエスト記録。'] },
          { title: '1.3 支払い関連情報', paragraphs: ['有料サービスを利用する場合、当社は以下を収集または処理する場合があります。'], items: ['注文番号。', '支払い状態。', 'プラン情報。', '支払い時刻。', '注文に関連する必要な識別情報。'] }
        ]
      },
      { title: '2. 情報の利用目的', paragraphs: ['当社は主に以下の目的で情報を利用します。'], items: ['デジタル証明書、検証情報、関連サービス結果の生成。', '検証、ダウンロード、表示サービスの提供。', '支払い、注文、利用回数の管理。', '不正、濫用、悪意あるアクセスの防止。', '苦情、紛争、セキュリティ事案への対応。', '性能改善、障害調査、サービス保守。', '適用法令および規制上の要件への対応。'] },
      { title: '3. 画像および関連コンテンツの処理', paragraphs: ['アップロードされた画像は、証明書表示、プレビュー、検証情報、補助資料の生成に利用される場合があります。', '当社は必要最小限の原則に従い、サービス提供に必要な範囲でのみ関連情報を保存します。'] },
      { title: '4. デバイス環境および識別情報', paragraphs: ['サービス管理、アクセス制御、セキュリティ、不正利用防止のため、デバイス環境情報、ブラウザのローカル状態、または類似の識別技術を利用する場合があります。', 'お客様は以下を理解し同意するものとします。'], items: ['これらの情報はサービス管理およびセキュリティ管理にのみ利用されます。', '本サービスと無関係な広告配信や横断的なプロファイリングには利用しません。', 'ブラウザデータの削除、端末変更、ブラウザ変更により識別結果が変わる場合があります。'] },
      { title: '5. 情報の保存', paragraphs: ['当社は、法令上別段の定めがある場合または削除依頼がある場合を除き、サービス提供に必要な期間、情報を保存します。', '情報の種類により保存期間は異なる場合があります。例：'], items: ['注文・支払い記録：法務、会計、リスク管理上必要な期間。', '証明書・検証記録：表示および検証に必要な期間。', 'ログ情報：セキュリティ監査および障害調査に必要な期間。', '一時ファイル：処理完了後、規則に従い削除。'] },
      { paragraphs: ['保存期間が満了した後、法令により保存が必要な場合を除き、当社は関連情報を削除または匿名化します。'] },
      { title: '6. 情報の共有', paragraphs: ['当社は、無関係な第三者に個人情報を販売しません。', 'サービス提供のため、必要な情報を以下の第三者またはパートナーに提供する場合があります。'], items: ['決済サービス提供者。', 'クラウドインフラおよび技術サービス提供者。', 'データ処理および保存サービス提供者。', '法令に基づき開示を求める政府機関、司法機関、規制機関。'] },
      { paragraphs: ['これらの第三者は、サービス提供に必要な範囲でのみ情報を処理し、適切な安全管理および秘密保持義務を遵守する必要があります。'] },
      { title: '7. 越境移転', paragraphs: ['本サービスが国外に配置されたクラウドサービス、データベース、インフラを利用する場合、一部情報が越境して保存または処理される可能性があります。', '法令上の要件がある場合、当社は適用法令に従い通知、評価、保護措置を実施します。'] },
      { title: '8. 情報セキュリティ', paragraphs: ['当社は情報保護のため、合理的な技術的および組織的措置を講じます。例：'], items: ['通信の暗号化。', 'アクセス制御。', '権限分離。', '必要なセキュリティ検証。', '保存権限の管理。', 'ログ監査。', '最小権限の原則。'] },
      { paragraphs: ['ただし、いかなるシステムも絶対的な安全を保証するものではありません。個人情報の安全に影響する可能性のある事案が発生した場合、当社は法令に従って通知し、是正措置を講じます。'] },
      { title: '9. お客様の権利', paragraphs: ['適用法令に基づき、お客様は以下の権利を有する場合があります。'], items: ['個人情報へのアクセス。', '個人情報の訂正。', '個人情報の削除。', '同意の撤回。', '個人情報のコピー取得またはエクスポート。', '関連サービス記録の解約または削除。'] },
      { paragraphs: ['これらの権利を行使する場合は、ウェブサイトの「お問い合わせ」からご連絡ください。当社は合理的な期間内に対応します。ただし、法令上別段の定めがある場合または技術的に直ちに対応できない場合を除きます。'] },
      { title: '10. 未成年者の保護', paragraphs: ['本サービスは14歳未満の児童を対象としていません。未成年者は保護者の指導のもとで利用し、保護者の同意を得てください。', '未成年者の個人情報が無断で収集されたことを確認した場合、当社は削除、匿名化、その他必要な措置を講じます。'] },
      { title: '11. Cookieおよび類似技術', paragraphs: ['利用体験の向上、設定の保存、アクセス状態の維持、セキュリティ管理のため、Cookie、ローカルストレージ、または類似技術を利用する場合があります。', 'ブラウザ設定によりCookieを管理できますが、一部機能を無効にするとサービスが正常に動作しない場合があります。'] },
      { title: '12. 第三者サービス', paragraphs: ['本サービスは第三者の決済、クラウドインフラ、データ処理、保存サービスを統合する場合があります。第三者サービス提供者は各自のプライバシーポリシーに従って情報を処理します。関連する第三者ポリシーもご確認ください。'] },
      { title: '13. ポリシーの更新', paragraphs: ['法令変更、事業調整、サービス改善により、本プライバシーポリシーを更新する場合があります。', '重大な変更がある場合、ページ告知、サービス内通知、その他適切な方法で通知します。サービスの継続利用は、更新後のポリシーへの同意を意味します。'] }
    ]
  }
};

function getLegalLanguage(language: string | undefined): LegalLanguage {
  if (language?.startsWith('ja')) return 'ja';
  if (language?.startsWith('zh')) return 'zh';
  return 'en';
}

export function PrivacyPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const content = privacyContent[getLegalLanguage(i18n.resolvedLanguage ?? i18n.language)];

  return (
    <div className="min-h-screen bg-[#171717] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" />
          {content.back}
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold">{content.title}</h1>
        </div>

        <p className="text-slate-400 text-sm mb-10">{content.effectiveDate}</p>

        <div className="space-y-10 text-slate-300 leading-relaxed">
          {content.sections.map((section, index) => (
            <section key={index}>
              {section.title && <h2 className="text-xl font-semibold text-white mb-4">{section.title}</h2>}
              {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mb-3 last:mb-0">{paragraph}</p>)}
              {section.subsections?.map((subsection) => (
                <div key={subsection.title} className="mt-6 first:mt-0">
                  <h3 className="text-base font-semibold text-slate-200 mb-2">{subsection.title}</h3>
                  {subsection.paragraphs?.map((paragraph) => <p key={paragraph} className="mb-3">{paragraph}</p>)}
                  {subsection.items && (
                    <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
                      {subsection.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                </div>
              ))}
              {section.items && (
                <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2 mt-2">
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-600 text-sm">
          <p>{content.operator}</p>
          <p className="mt-2">{content.siteName}</p>
        </div>
      </div>
    </div>
  );
}
