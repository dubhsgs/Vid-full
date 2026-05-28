import { ArrowLeft, ArrowRight, BadgeCheck, ChevronDown, FileImage, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type DocsLanguage = 'en' | 'zh' | 'ja';

type DocsSection = {
  title: string;
  description: string;
  audience: string;
  example: string;
  trust: string;
};

type DocsContent = {
  back: string;
  kicker: string;
  title: string;
  intro: string;
  cta: string;
  labels: {
    audience: string;
    creates: string;
    helps: string;
  };
  metaTitle: string;
  metaDescription: string;
  sections: DocsSection[];
};

type Scenario = {
  title: string;
  description: string;
  columns: {
    title: string;
    content: string;
  }[];
};

type TechCard = {
  title: string;
  content: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

const zhScenarios: Scenario[] = [
  {
    title: 'AI 时代艺术创作者的版权辅助盾牌',
    description: '在生成式 AI 爆发的时代，创作者往往面临“无法证明原创首发”和“被恶意洗稿后反咬”的痛点。VAID 为 AI 作品锁定不可篡改的初始哈希。在您公开分享前，为您的创意心血盖上第一道时间戳。',
    columns: [
      {
        title: '抢占首次发表节点',
        content: '全网公开的验证页面能够精确精确锁定作品的诞生时刻，在遭遇洗稿争议或恶意抢注时，为您提供强有力的首次发布时间辅助证明。'
      },
      {
        title: '独家作品确权',
        content: '将饱含调优心血的生成作品与核心资产信息进行链上绑定，证明您对该技术产物的先发创作优势，让 AI 创意不再是无主之地。'
      }
    ]
  },
  {
    title: '原创角色 (OC) 与约稿交付的数字化存证',
    description: '针对独立画师、动漫创作者及独立 IP 运营方，VAID 是连接虚拟创作与权属交易的数字桥梁。它让数字画作、原创角色（Original Character）的每一次流转都有据可查。',
    columns: [
      {
        title: '约稿安全交付凭证',
        content: '在画师与买家（金主）交付时，随作品一同附带这枚全球可验证的数字存证，作为虚拟所有权正式、干净地转移给买家的可信留存依据。'
      },
      {
        title: '跨平台防盗用追溯',
        content: '为您的原创 OC 角色建立永久的数字档案。无论是用于后续的商业授权、周边制作还是跨平台联名合作，都能一键出示权属源头，斩断伸手党与恶意盗图。'
      }
    ]
  },
  {
    title: '虚拟资产权属档案锚定',
    description: '针对虚拟世界中的车辆、建筑、服装及数字道具。',
    columns: [
      {
        title: '资产身份化档案',
        content: '赋予虚拟资产唯一的识别代码，让它们如同现实中的资产一样，拥有可追溯、可核验的“初始电子档案”，明确资产的技术归属。'
      }
    ]
  }
];

const zhTechCards: TechCard[] = [
  {
    title: '高级加密技术',
    content: '利用先进的加密技术提取作品的“数字指纹”。任何微小的篡改都会导致指纹失效，确保记录的唯一性、真实性与跨时间的可信度。'
  },
  {
    title: '分布式账本锚定',
    content: '将指纹数据永久写入可验证的分布式账本。数据一旦生成，便不可逆转、不可被任何人（包括我们平台自身）抹除或篡改。'
  }
];

const zhFaqs: FaqItem[] = [
  {
    question: '生成的证书真的具有法律或实际保护作用吗？',
    answer: '不可篡改的分布式账本存证在当今的司法与行业实践中，正被越来越广泛地接受为“首次发布与确权”的强有力电子数据。在商业合作、授权展示或版权纠纷中，它能作为具备行业公信力的重要电子证据与辅助证明材料，但其最终法律效力需结合具体司法判定。'
  },
  {
    question: '我需要理解复杂的加密算法才能使用吗？',
    answer: '完全不需要。我们已经将底层的复杂技术无感封装。您只需像平时一样“上传作品、一键生成”，就能直接获得设计精美、全球可验证且具备辅助版权保护作用的电子存证证书。'
  }
];

const localizedScenarios: Record<DocsLanguage, Scenario[]> = {
  en: [
    {
      title: 'A Copyright Support Shield for AI-Era Creators',
      description: 'In the age of generative AI, creators often face the pain points of being unable to prove first publication or being challenged after their ideas are copied. VAID locks an immutable initial hash for AI works, giving your creative effort a first timestamp before public sharing.',
      columns: [
        {
          title: 'Secure the First Publication Point',
          content: 'A public verification page can accurately record the creation moment of a work. When plagiarism disputes or malicious claims appear, it provides strong supporting proof of first publication.'
        },
        {
          title: 'Anchor Exclusive Creative Work',
          content: 'Bind generated works and core asset information on-chain to show your first-mover creative advantage over the technical output, so AI creativity is no longer treated as ownerless.'
        }
      ]
    },
    {
      title: 'Digital Proof for Original Characters and Commission Delivery',
      description: 'For independent artists, animation creators, and IP operators, VAID acts as a digital bridge between virtual creation and ownership transfer. It makes every handoff of digital artwork and original characters traceable.',
      columns: [
        {
          title: 'Safer Commission Delivery',
          content: 'When an artist delivers work to a buyer, the globally verifiable digital record can be attached with the artwork as a trusted reference that the virtual ownership has been transferred cleanly.'
        },
        {
          title: 'Cross-Platform Misuse Tracing',
          content: 'Create a permanent digital archive for original characters. For commercial licensing, merchandise, or cross-platform collaborations, the ownership source can be shown clearly and quickly.'
        }
      ]
    },
    {
      title: 'Virtual Asset Ownership Archive Anchoring',
      description: 'For vehicles, buildings, clothing, and digital props in virtual worlds.',
      columns: [
        {
          title: 'Asset Identity Archive',
          content: 'Assign a unique identification code to each virtual asset, giving it a traceable and verifiable initial electronic archive, similar to real-world assets with clear technical ownership records.'
        }
      ]
    }
  ],
  zh: zhScenarios,
  ja: [
    {
      title: 'AI 時代のクリエイターを支える著作権補助シールド',
      description: '生成 AI が急速に広がる時代、クリエイターは「最初に公開したことを証明できない」「作品を模倣された後に逆に主張される」といった課題に直面します。VAID は AI 作品の改ざん困難な初期ハッシュを固定し、公開前の創作に最初のタイムスタンプを付与します。',
      columns: [
        {
          title: '初回公開時点の確保',
          content: '公開検証ページにより作品の誕生時点を記録できます。模倣や悪意ある主張が発生した際、初回公開時刻を示す強い補助証明になります。'
        },
        {
          title: '独自作品の権利主張を補助',
          content: '調整を重ねた生成作品と中核資産情報をオンチェーンで紐づけ、技術的成果物に対する先行創作の優位性を示します。'
        }
      ]
    },
    {
      title: 'オリジナルキャラクターとコミッション納品のデジタル証跡',
      description: '独立系イラストレーター、アニメーション制作者、IP 運営者にとって、VAID は仮想創作と権利移転をつなぐデジタルな橋渡しです。デジタル作品やオリジナルキャラクターの流通履歴を追跡しやすくします。',
      columns: [
        {
          title: '安全なコミッション納品記録',
          content: '制作者から購入者へ納品する際、作品と一緒に世界中で検証可能なデジタル証跡を添付し、仮想所有権が明確に移転したことの参考記録にできます。'
        },
        {
          title: 'クロスプラットフォームでの盗用追跡',
          content: 'オリジナルキャラクターに永続的なデジタルアーカイブを作成します。商用ライセンス、グッズ制作、他プラットフォーム連携でも権利の起点を提示しやすくなります。'
        }
      ]
    },
    {
      title: '仮想資産の権利アーカイブ固定',
      description: '仮想世界における車両、建築物、衣装、デジタルアイテム向けです。',
      columns: [
        {
          title: '資産 ID アーカイブ',
          content: '仮想資産に一意の識別コードを付与し、現実の資産と同じように追跡・検証できる初期電子アーカイブを持たせ、技術的な帰属を明確にします。'
        }
      ]
    }
  ]
};

const localizedTechCopy: Record<DocsLanguage, { title: string; subtitle: string; cards: TechCard[] }> = {
  en: {
    title: 'What ensures that it truly belongs to you?',
    subtitle: 'We do not rely on verbal promises. The underlying technical certainty provides the evidence.',
    cards: [
      {
        title: 'Advanced Encryption Technology',
        content: 'Advanced cryptographic techniques extract a digital fingerprint from the work. Even a tiny modification changes the fingerprint, helping preserve uniqueness, authenticity, and long-term trust.'
      },
      {
        title: 'Distributed Ledger Anchoring',
        content: 'Fingerprint data is permanently written to a verifiable distributed ledger. Once generated, it cannot be reversed, erased, or modified by anyone, including our own platform.'
      }
    ]
  },
  zh: {
    title: '凭什么，确保它确确实实属于您？',
    subtitle: '我们不作口头承诺，一切交由底层的技术确定性来裁决。',
    cards: zhTechCards
  },
  ja: {
    title: 'なぜ、それが確かにあなたのものだと言えるのか？',
    subtitle: '私たちは口約束に頼りません。すべては基盤技術の確実性によって示されます。',
    cards: [
      {
        title: '高度な暗号化技術',
        content: '高度な暗号技術によって作品のデジタル指紋を抽出します。わずかな改変でも指紋が変化するため、記録の一意性、真正性、時間を超えた信頼性を保ちやすくなります。'
      },
      {
        title: '分散型台帳への固定',
        content: '指紋データを検証可能な分散型台帳へ永続的に記録します。一度生成されたデータは、私たちのプラットフォーム自身を含め、誰も消去や改ざんができません。'
      }
    ]
  }
};

const localizedFaqCopy: Record<DocsLanguage, { title: string; items: FaqItem[] }> = {
  en: {
    title: 'FAQ',
    items: [
      {
        question: 'Does the generated certificate provide legal or practical protection?',
        answer: 'Immutable distributed-ledger records are increasingly accepted in judicial and industry practice as strong electronic data for first publication and ownership evidence. In commercial cooperation, licensing, or copyright disputes, they can serve as important electronic evidence and supporting proof, while final legal effect depends on the specific judicial decision.'
      },
      {
        question: 'Do I need to understand complex cryptographic algorithms to use it?',
        answer: 'No. The underlying technical complexity is wrapped into a simple workflow. You only need to upload the work and generate the record to receive a polished, globally verifiable electronic certificate that can support copyright protection.'
      }
    ]
  },
  zh: {
    title: '常见问题 / FAQ',
    items: zhFaqs
  },
  ja: {
    title: 'よくある質問 / FAQ',
    items: [
      {
        question: '生成された証明書には法的または実務上の保護効果がありますか？',
        answer: '改ざん困難な分散型台帳の証跡は、現在の司法および業界実務において、初回公開や権利主張を示す有力な電子データとして受け入れられる場面が増えています。商用提携、ライセンス表示、著作権紛争では重要な電子証拠や補助資料になり得ますが、最終的な法的効力は個別の司法判断によります。'
      },
      {
        question: '複雑な暗号アルゴリズムを理解する必要がありますか？',
        answer: '必要ありません。基盤技術の複雑さは見えない形で封装されています。普段どおり作品をアップロードして生成するだけで、美しく、世界中で検証可能な電子証跡証明書を取得できます。'
      }
    ]
  }
};

const docsContent: Record<DocsLanguage, DocsContent> = {
  en: {
    back: 'Back to Home',
    kicker: 'VAID Technical Docs',
    title: 'Documentation',
    intro: 'A practical guide to how VAID creates verifiable digital identity records for virtual assets, AI works, original characters, and technical proof.',
    cta: 'Create a VAID Record',
    labels: {
      audience: 'Who it is for',
      creates: 'What it creates',
      helps: 'Why it helps'
    },
    metaTitle: 'Documentation | VAID',
    metaDescription: 'Learn how VAID creates verifiable digital identity records for virtual assets, AI works, original characters, and technical proof.',
    sections: [
      {
        title: 'Virtual Asset ID',
        description: 'Build a permanent, cross-platform verifiable digital identity for virtual characters, virtual assets, and digital creators.',
        audience: 'For artists, independent designers, AI creators, IP operators, game, film, and animation teams, and any individual or organization that wants to establish a copyright-protection foundation for virtual identities or digital works.',
        example: 'VAID generates a globally verifiable digital identity archive with a unique digital fingerprint and creator signature, plus a polished electronic certificate that can be initialized, embedded, and used across online and offline scenarios.',
        trust: ''
      },
      {
        title: 'AI Art Proof',
        description: 'Create a lightweight proof-of-existence record for AI artwork before you publish or share it.',
        audience: 'For AI artists, prompt creators, digital collectors, and teams releasing generated visual work.',
        example: 'A VAID certificate gives the artwork a shareable record with creator information and a verification QR code.',
        trust: 'The public verification page helps others check that the record exists and matches the displayed certificate.'
      },
      {
        title: 'Original Character Certificate',
        description: 'Give an original character or digital IP a clean certificate page that is easy to share.',
        audience: 'For illustrators, game creators, commission artists, and independent IP builders.',
        example: 'The certificate can travel with a character sheet, portfolio post, commission delivery, or launch announcement.',
        trust: 'VAID keeps the record simple: a visible certificate, public verification link, and creator-readable metadata.'
      }
    ]
  },
  zh: {
    back: '返回首页',
    kicker: '',
    title: '说明文档',
    intro: '',
    cta: '创建 VAID 记录',
    labels: {
      audience: '适合谁',
      creates: '生成什么',
      helps: '有什么用'
    },
    metaTitle: '说明文档 | VAID',
    metaDescription: '了解 VAID 如何为虚拟资产、AI 作品、原创角色与技术存证建立可验证的数字身份记录。',
    sections: [
      {
        title: '虚拟资产 ID',
        description: '为虚拟角色、虚拟资产及数字创作者，构建一份可永久留存、跨平台验证的数字身份证。',
        audience: '适合艺术家、独立设计师、AI 创作者、IP 运营方、游戏及影视动画制作团队，以及所有希望为虚拟形象、数字作品建立版权保护基础的独立个人与机构。',
        example: '为您生成一套全球可验证的数字身份档案（包含独一无二的数字指纹与创作者专属签名），并附带一张设计精美、支持在线上线下多种场景中直接初始化和嵌入调用的电子证书。',
        trust: '确立绝对的作品所有权归属。确保生成出来的虚拟资产在数字世界中只属于你。同时，不可篡改的存证证书为你提供强有力的数字版权保护。在作品首次发布、商业授权、合作沟通或版权纠纷中，它都将作为具备法律效力与行业公信力的终极原始依据。'
      },
      {
        title: 'AI 作品证明',
        description: '在发布或分享 AI 作品前，创建一份轻量的存在证明记录。',
        audience: '适合 AI 艺术创作者、提示词创作者、数字收藏者和生成式视觉团队。',
        example: 'VAID 证书可以给作品附上创作者信息、证书图和验证二维码。',
        trust: '公开验证页可以帮助他人确认这份记录存在，并和展示的证书对应。'
      },
      {
        title: '原创角色证书',
        description: '给原创角色或数字 IP 一个清晰、方便分享的证书页面。',
        audience: '适合插画师、游戏创作者、约稿画师和独立 IP 创作者。',
        example: '证书可以跟随角色设定页、作品集、约稿交付或发布公告一起使用。',
        trust: 'VAID 保持记录简单：可见证书、公开验证链接和创作者可读的元数据。'
      }
    ]
  },
  ja: {
    back: 'ホームに戻る',
    kicker: 'VAID 技術ドキュメント',
    title: '説明ドキュメント',
    intro: 'VAID が仮想資産、AI 作品、オリジナルキャラクター、技術的証跡のために検証可能なデジタル ID 記録を作る方法をまとめたページです。',
    cta: 'VAID レコードを作成',
    labels: {
      audience: '対象',
      creates: '作成されるもの',
      helps: '役立つ理由'
    },
    metaTitle: '説明ドキュメント | VAID',
    metaDescription: 'VAID が仮想資産、AI 作品、オリジナルキャラクター、技術的証跡のために検証可能なデジタル ID 記録を作る方法を紹介します。',
    sections: [
      {
        title: '仮想資産 ID',
        description: '仮想キャラクター、仮想資産、デジタルクリエイターのために、永続的に保存でき、プラットフォームをまたいで検証可能なデジタル ID を構築します。',
        audience: 'アーティスト、独立系デザイナー、AI クリエイター、IP 運営者、ゲーム・映画・アニメ制作チーム、そして仮想イメージやデジタル作品に著作権保護の基盤を作りたい個人や組織向けです。',
        example: '一意のデジタル指紋とクリエイター署名を含む、世界中で検証可能なデジタル ID アーカイブを生成し、オンライン・オフラインのさまざまな場面で初期化や埋め込みに使える電子証明書を付与します。',
        trust: ''
      },
      {
        title: 'AI 作品証明',
        description: 'AI 作品を公開または共有する前に、軽量な存在証明レコードを作成します。',
        audience: 'AI アーティスト、プロンプト制作者、デジタルコレクター、生成ビジュアルチーム向けです。',
        example: 'VAID 証明書は、作品に制作者情報、証明書画像、検証 QR コードを添えられます。',
        trust: '公開検証ページにより、記録の存在と証明書との対応を確認しやすくなります。'
      },
      {
        title: 'オリジナルキャラクター証明書',
        description: 'オリジナルキャラクターやデジタル IP に、共有しやすい証明書ページを付与します。',
        audience: 'イラストレーター、ゲーム制作者、コミッション作家、独立 IP 制作者向けです。',
        example: '証明書は、キャラクター設定資料、ポートフォリオ、納品物、発表告知と一緒に使えます。',
        trust: 'VAID は、見える証明書、公開検証リンク、読みやすいメタデータをシンプルにまとめます。'
      }
    ]
  }
};

function getDocsLanguage(language: string | undefined): DocsLanguage {
  if (language?.startsWith('ja')) return 'ja';
  if (language?.startsWith('zh')) return 'zh';
  return 'en';
}

function setMetaDescription(content: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
  }

  meta.content = content;
}

function syncFaqSchema(faqs: FaqItem[] | null) {
  const id = 'vaid-docs-faq-schema';
  document.getElementById(id)?.remove();

  if (!faqs) return;

  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  });
  document.head.appendChild(script);
}

function JustifiedText({ children, className = '' }: { children: string; className?: string }) {
  return (
    <p className={className} style={{ textAlign: 'justify' }}>
      {children}
    </p>
  );
}

const contentBoxClass = 'rounded-lg border border-slate-800 bg-slate-900/45 p-5';

export function DocsPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const language = getDocsLanguage(i18n.resolvedLanguage ?? i18n.language);
  const content = docsContent[language];
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const coreSection = content.sections[0];
  const scenarios = localizedScenarios[language];
  const techCopy = localizedTechCopy[language];
  const faqCopy = localizedFaqCopy[language];

  useEffect(() => {
    document.title = content.metaTitle;
    setMetaDescription(content.metaDescription);
    syncFaqSchema(faqCopy.items);
  }, [content, faqCopy.items]);

  return (
    <div className="min-h-screen bg-[#171717] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" />
          {content.back}
        </button>

        <section className="space-y-6">
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{content.title}</h1>
          <button
            type="button"
            onClick={() => navigate('/card-generator')}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
          >
            {content.cta}
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>

        <section className="mt-14 space-y-6">
          <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 shadow-2xl shadow-cyan-950/10 backdrop-blur sm:p-6">
            <h2 className="text-2xl font-semibold">{coreSection.title}</h2>
            <JustifiedText className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{coreSection.description}</JustifiedText>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className={contentBoxClass}>
                <FileImage className="mb-3 h-5 w-5 text-cyan-300" />
                <h3 className="mb-2 text-sm font-semibold">{content.labels.audience}</h3>
                <JustifiedText className="text-sm leading-6 text-slate-400">{coreSection.audience}</JustifiedText>
              </div>
              <div className={contentBoxClass}>
                <BadgeCheck className="mb-3 h-5 w-5 text-cyan-300" />
                <h3 className="mb-2 text-sm font-semibold">{content.labels.creates}</h3>
                <JustifiedText className="text-sm leading-6 text-slate-400">{coreSection.example}</JustifiedText>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 space-y-6">
          {scenarios.map((scenario) => (
            <article key={scenario.title} className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 shadow-2xl shadow-cyan-950/10 backdrop-blur sm:p-6">
              <h2 className="text-2xl font-semibold">{scenario.title}</h2>
              <JustifiedText className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{scenario.description}</JustifiedText>
              <div className={`mt-6 grid gap-4 ${scenario.columns.length === 1 ? '' : 'md:grid-cols-2'}`}>
                {scenario.columns.map((column) => (
                  <div key={column.title} className={contentBoxClass}>
                    <ShieldCheck className="mb-3 h-5 w-5 text-cyan-300" />
                    <h3 className="mb-2 text-sm font-semibold">{column.title}</h3>
                    <JustifiedText className="text-sm leading-6 text-slate-400">{column.content}</JustifiedText>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-lg border border-slate-800 bg-slate-950/60 p-5 shadow-2xl shadow-cyan-950/10 backdrop-blur sm:p-6">
          <h2 className="text-2xl font-semibold">{techCopy.title}</h2>
          <JustifiedText className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{techCopy.subtitle}</JustifiedText>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {techCopy.cards.map((card) => (
              <div key={card.title} className={contentBoxClass}>
                <BadgeCheck className="mb-3 h-5 w-5 text-cyan-300" />
                <h3 className="mb-2 text-sm font-semibold">{card.title}</h3>
                <JustifiedText className="text-sm leading-6 text-slate-400">{card.content}</JustifiedText>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-800 bg-slate-950/60 p-5 shadow-2xl shadow-cyan-950/10 backdrop-blur sm:p-6">
          <h2 className="text-2xl font-semibold">{faqCopy.title}</h2>
          <div className="mt-6 space-y-3">
            {faqCopy.items.map((faq, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <article key={faq.question} className="rounded-lg border border-slate-800 bg-slate-900/45">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-100">{faq.question}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-cyan-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <JustifiedText className="border-t border-slate-800 px-4 py-4 text-sm leading-7 text-slate-300">{faq.answer}</JustifiedText>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
