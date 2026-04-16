import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      maintenance: {
        title: 'System Maintenance',
        message: 'The system is currently under maintenance and temporarily unavailable. We apologize for any inconvenience.',
        thank: 'Thank you for your patience.'
      },
      hero: {
        title: 'Your Digital Identity,',
        titleHighlight: 'Permanently Documented',
        subtitle: 'V-ID provides digital identity proof of existence for digital assets and characters, creating an immutable record of your digital creations from the moment they are born.',
        cta: 'Get Started'
      },
      about: {
        title: 'About V-ID Platform',
        description: 'A digital asset archival and identity recognition technology demonstration platform for developers.',
        purpose: 'This platform showcases digital fingerprinting, cryptographic hashing, and immutable record-keeping technologies for educational and development purposes.'
      },
      process: {
        title: 'How It Works',
        step1: {
          title: '01. Upload',
          desc: 'Upload your character files and provide essential details about your creation.'
        },
        step2: {
          title: '02. Generate',
          desc: 'Our system generates a unique Digital Fingerprint using SHA-256 cryptographic hashing.'
        },
        step3: {
          title: '03. Receive',
          desc: 'Receive an Immutable Certificate with permanent proof of your creation existence.'
        },
        step4: {
          title: '04. Verify',
          desc: 'Universal Verification: Anyone can verify the authenticity of your ID through the public digital ledger.'
        }
      },
      form: {
        title: 'Create Your Certificate',
        privacyGuard: 'Privacy Guard:',
        privacyText: 'Your original file stays on your device. We only generate a digital fingerprint.',
        dragDrop: 'Drag and drop your character image here',
        or: 'or',
        selectFile: 'Select File for Local Hashing',
        changeImage: 'Change Image',
        characterName: 'Character Name',
        characterPlaceholder: 'e.g., Nova StarSeeker',
        creatorName: 'Creator Name',
        creatorPlaceholder: 'e.g., Alex Chen',
        generateProof: 'Generate Certificate',
        processing: 'Processing...',
        download: 'Download V-ID Certificate',
        certificateDownloaded: 'Certificate Generated Successfully!',
        createAnother: 'Create Another Certificate'
      },
      progress: {
        reading: 'Reading file locally...',
        hashing: 'Calculating SHA-256 Fingerprint...',
        ready: 'Ready for Registry.'
      },
      hash: {
        title: 'Digital Fingerprint (SHA-256)',
        copy: 'Copy Hash',
        copied: 'Copied',
        verify: 'Verify Identity',
        characterName: 'Character Name',
        creator: 'Creator'
      },
      paywall: {
        title: 'Unlock More Certificate Generations',
        subtitle: 'Choose your plan, secure payment via Alipay',
        pack10: '10x Plan',
        pack50: '50x Plan',
        pack100: '100x Plan'
      },
      footer: {
        disclaimer: 'Legal Disclaimer',
        disclaimerText: 'V-ID is a digital archival platform for developers, not a legal title. We provide technical demonstration for digital asset management. This service creates digital identity proof of existence at a specific point in time but does not establish legal ownership or copyright. Consult with legal professionals for matters related to intellectual property rights.',
        manifesto: 'Privacy Manifesto',
        manifestoText: 'Digital sovereignty belongs to creators. No tracking. No emails. Only mathematical proof.',
        copyright: '© 2026 V-ID Platform. All rights reserved.',
        icp: 'ICP Filing Number'
      }
    }
  },
  zh: {
    translation: {
      maintenance: {
        title: '系统维护中',
        message: '系统目前正在维护，暂时无法使用。给您带来不便，敬请谅解。',
        thank: '感谢您的耐心等待。'
      },
      hero: {
        title: '您的数字身份，',
        titleHighlight: '永久记录',
        subtitle: 'V-ID 为数字资产和角色提供数字存在证明，从诞生之刻起为您的数字创作建立不可篡改的记录。',
        cta: '立即开始'
      },
      about: {
        title: '关于 V-ID 平台',
        description: '面向开发者的数字资产存档与身份识别技术展示平台',
        purpose: '本平台展示数字指纹、加密散列和不可变记录保存技术，用于教育和开发目的。'
      },
      process: {
        title: '工作原理',
        step1: {
          title: '01. 上传',
          desc: '上传您的角色文件并提供创作的基本信息。'
        },
        step2: {
          title: '02. 生成',
          desc: '系统使用 SHA-256 加密散列生成唯一的数字指纹。'
        },
        step3: {
          title: '03. 接收',
          desc: '获得永久存在证明的不可篡改证书。'
        },
        step4: {
          title: '04. 验证',
          desc: '通用验证：任何人都可以通过公共数字账本验证您 ID 的真实性。'
        }
      },
      form: {
        title: '创建您的证书',
        privacyGuard: '隐私保护：',
        privacyText: '您的原始文件保留在您的设备上。我们只生成数字指纹。',
        dragDrop: '将角色图片拖放到此处',
        or: '或',
        selectFile: '选择文件进行本地哈希',
        changeImage: '更换图片',
        characterName: '角色名称',
        characterPlaceholder: '例如：星辰探索者诺娃',
        creatorName: '创作者姓名',
        creatorPlaceholder: '例如：陈亚历克斯',
        generateProof: '生成证书',
        processing: '处理中...',
        download: '下载 V-ID 证书',
        certificateDownloaded: '证书生成成功！',
        createAnother: '创建另一个证书'
      },
      progress: {
        reading: '本地读取文件中...',
        hashing: '计算 SHA-256 指纹中...',
        ready: '已准备好注册。'
      },
      hash: {
        title: '数字指纹 (SHA-256)',
        copy: '复制哈希',
        copied: '已复制',
        verify: '验证身份',
        characterName: '角色名称',
        creator: '创作者'
      },
      paywall: {
        title: '解锁更多证书生成次数',
        subtitle: '选择适合您的套餐，支付宝安全支付',
        pack10: '10次套餐',
        pack50: '50次套餐',
        pack100: '100次套餐'
      },
      footer: {
        disclaimer: '法律声明',
        disclaimerText: 'V-ID 是面向开发者的数字存档平台，而非法律所有权凭证。我们为数字资产管理提供技术展示。此服务创建特定时间点的数字存在证明，但不建立法律所有权或版权。有关知识产权事宜，请咨询法律专业人士。',
        manifesto: '隐私宣言',
        manifestoText: '数字主权属于创作者。无追踪。无邮件。只有数学证明。',
        copyright: '© 2026 V-ID 平台. 保留所有权利。',
        icp: 'ICP 备案号'
      }
    }
  },
  ja: {
    translation: {
      maintenance: {
        title: 'システムメンテナンス中',
        message: 'システムは現在メンテナンス中で、一時的にご利用いただけません。ご不便をおかけして申し訳ございません。',
        thank: 'ご理解とご協力をお願いいたします。'
      },
      hero: {
        title: 'あなたのデジタルアイデンティティを',
        titleHighlight: '永久的に記録',
        subtitle: 'V-IDは、デジタル資産とキャラクターの暗号的存在証明を提供し、デジタル創作物の誕生時から不変の記録を作成します。',
        cta: '今すぐ始める',
        carouselText: 'デジタル存在の最終証明：デジタル資産を物理世界に固定する。'
      },
      about: {
        title: 'V-IDプラットフォームについて',
        description: '開発者向けのデジタル資産アーカイブおよびアイデンティティ認識技術デモンストレーションプラットフォーム',
        purpose: 'このプラットフォームは、教育および開発目的のためのデジタル指紋、暗号ハッシュ、および不変記録保管技術を展示します。'
      },
      process: {
        title: '仕組み',
        step1: {
          title: '01. アップロード',
          desc: 'キャラクターファイルをアップロードし、創作物の詳細情報を提供します。'
        },
        step2: {
          title: '02. 生成',
          desc: 'SHA-256暗号ハッシュを使用してユニークなデジタル指紋を生成します。'
        },
        step3: {
          title: '03. 受け取り',
          desc: '創作物の永続的な存在証明を持つ不変の証明書を受け取ります。'
        },
        step4: {
          title: '04. 検証',
          desc: 'ユニバーサル検証：誰でも公開デジタル台帳を通じてIDの真正性を確認できます。'
        }
      },
      form: {
        title: '証明書を作成',
        privacyGuard: 'プライバシーガード：',
        privacyText: '元のファイルはあなたのデバイスに残ります。デジタル指紋のみを生成します。',
        dragDrop: 'キャラクター画像をここにドラッグ＆ドロップ',
        or: 'または',
        selectFile: 'ローカルハッシュ用ファイル選択',
        changeImage: '画像を変更',
        characterName: 'キャラクター名',
        characterPlaceholder: '例：ノヴァ・スターシーカー',
        creatorName: 'クリエイター名',
        creatorPlaceholder: '例：アレックス・チェン',
        generateProof: '証明書を生成',
        processing: '処理中...',
        download: 'V-ID証明書をダウンロード',
        certificateDownloaded: '証明書が正常に生成されました！',
        createAnother: '別の証明書を作成'
      },
      progress: {
        reading: 'ファイルをローカルで読み込み中...',
        hashing: 'SHA-256指紋を計算中...',
        ready: '登録準備完了。'
      },
      hash: {
        title: 'デジタル指紋 (SHA-256)',
        copy: 'ハッシュをコピー',
        copied: 'コピー済み',
        verify: 'アイデンティティを検証',
        characterName: 'キャラクター名',
        creator: 'クリエイター'
      },
      footer: {
        disclaimer: '法的免責事項',
        disclaimerText: 'V-IDは開発者向けのデジタルアーカイブプラットフォームであり、法的権利ではありません。デジタル資産管理のための技術的デモンストレーションを提供します。このサービスは特定時点での暗号的存在証明を作成しますが、法的所有権や著作権を確立するものではありません。知的財産権に関する事項については、法律専門家にご相談ください。',
        manifesto: 'プライバシー宣言',
        manifestoText: 'デジタル主権はクリエイターに属します。トラッキングなし。メールなし。数学的証明のみ。',
        copyright: '© 2026 V-IDプラットフォーム. All rights reserved.',
        icp: 'ICP登録番号'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
