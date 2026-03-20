import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      hero: {
        title: 'Your Virtual Identity,',
        titleHighlight: 'Permanently Documented',
        subtitle: 'V-ID provides cryptographic proof of existence for virtual IPs and characters, creating an immutable record of your digital creations from the moment they are born.',
        cta: 'Get Started',
        carouselText: 'The Final Proof of Virtual Existence: Anchoring Digital Souls in the Physical World.'
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
          desc: 'Receive an Immutable Birth Certificate with permanent proof of your creation existence.'
        },
        step4: {
          title: '04. Verify',
          desc: 'Universal Verification: Anyone can verify the authenticity of your ID through the public blockchain ledger.'
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
        createAnother: 'Create Another Certificate',
        freeRemaining: 'Free certificates remaining: {{count}}'
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
        verify: 'Verify on Blockchain',
        characterName: 'Character Name',
        creator: 'Creator'
      },
      paywall: {
        title: 'Unlock Unlimited Certificates',
        subtitle: 'You\'ve used your free certificates. Choose a plan to continue:',
        single: 'Single Certificate',
        pack5: '5 Certificates',
        pack10: '10 Certificates',
        enterKey: 'Or enter an activation key:',
        keyPlaceholder: 'Enter your license key',
        activate: 'Activate',
        activating: 'Activating...',
        cancel: 'Cancel'
      },
      footer: {
        disclaimer: 'Legal Disclaimer',
        disclaimerText: 'V-ID is a digital notary service, not a legal title. We provide technical evidence for future IP disputes. This service creates cryptographic proof of existence at a specific point in time but does not establish legal ownership or copyright. Consult with legal professionals for matters related to intellectual property rights.',
        manifesto: 'Privacy Manifesto',
        manifestoText: 'Digital sovereignty belongs to creators. No tracking. No emails. Only mathematical proof.',
        copyright: '© 2026 V-ID. All rights reserved.'
      }
    }
  },
  zh: {
    translation: {
      hero: {
        title: '您的虚拟身份，',
        titleHighlight: '永久记录',
        subtitle: 'V-ID 为虚拟知识产权和角色提供加密存在证明，从诞生之刻起为您的数字创作建立不可篡改的记录。',
        cta: '立即开始',
        carouselText: '虚拟存在的终极证明：将数字灵魂锚定于现实世界。'
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
          desc: '获得永久存在证明的不可篡改出生证书。'
        },
        step4: {
          title: '04. 验证',
          desc: '通用验证：任何人都可以通过公共区块链账本验证您 ID 的真实性。'
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
        createAnother: '创建另一个证书',
        freeRemaining: '剩余免费证书：{{count}} 张'
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
        verify: '在区块链上验证',
        characterName: '角色名称',
        creator: '创作者'
      },
      paywall: {
        title: '解锁无限证书',
        subtitle: '您已用完免费证书。选择一个方案以继续：',
        single: '单个证书',
        pack5: '5 张证书',
        pack10: '10 张证书',
        enterKey: '或输入激活密钥：',
        keyPlaceholder: '输入您的许可证密钥',
        activate: '激活',
        activating: '激活中...',
        cancel: '取消'
      },
      footer: {
        disclaimer: '法律声明',
        disclaimerText: 'V-ID 是数字公证服务，而非法律所有权。我们为未来的知识产权纠纷提供技术证据。此服务创建特定时间点的加密存在证明，但不建立法律所有权或版权。有关知识产权事宜，请咨询法律专业人士。',
        manifesto: '隐私宣言',
        manifestoText: '数字主权属于创作者。无追踪。无邮件。只有数学证明。',
        copyright: '© 2026 V-ID. 保留所有权利。'
      }
    }
  },
  ja: {
    translation: {
      hero: {
        title: 'あなたのバーチャルアイデンティティを',
        titleHighlight: '永久的に記録',
        subtitle: 'V-IDは、バーチャルIPとキャラクターの暗号的存在証明を提供し、デジタル創作物の誕生時から不変の記録を作成します。',
        cta: '今すぐ始める',
        carouselText: 'バーチャル存在の最終証明：デジタルソウルを物理世界に固定する。'
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
          desc: '創作物の永続的な存在証明を持つ不変の誕生証明書を受け取ります。'
        },
        step4: {
          title: '04. 検証',
          desc: 'ユニバーサル検証：誰でも公開ブロックチェーン台帳を通じてIDの真正性を確認できます。'
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
        createAnother: '別の証明書を作成',
        freeRemaining: '残りの無料証明書：{{count}}枚'
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
        verify: 'ブロックチェーンで検証',
        characterName: 'キャラクター名',
        creator: 'クリエイター'
      },
      paywall: {
        title: '無制限証明書をアンロック',
        subtitle: '無料証明書を使い切りました。プランを選択して続行してください：',
        single: '単一証明書',
        pack5: '5証明書',
        pack10: '10証明書',
        enterKey: 'またはアクティベーションキーを入力：',
        keyPlaceholder: 'ライセンスキーを入力',
        activate: 'アクティベート',
        activating: 'アクティベート中...',
        cancel: 'キャンセル'
      },
      footer: {
        disclaimer: '法的免責事項',
        disclaimerText: 'V-IDはデジタル公証サービスであり、法的権利ではありません。将来のIP紛争のための技術的証拠を提供します。このサービスは特定時点での暗号的存在証明を作成しますが、法的所有権や著作権を確立するものではありません。知的財産権に関する事項については、法律専門家にご相談ください。',
        manifesto: 'プライバシー宣言',
        manifestoText: 'デジタル主権はクリエイターに属します。トラッキングなし。メールなし。数学的証明のみ。',
        copyright: '© 2026 V-ID. All rights reserved.'
      }
    }
  },
  fr: {
    translation: {
      hero: {
        title: 'Votre Identité Virtuelle,',
        titleHighlight: 'Documentée en Permanence',
        subtitle: 'V-ID fournit une preuve cryptographique d\'existence pour les PI virtuelles et les personnages, créant un enregistrement immuable de vos créations numériques dès leur naissance.',
        cta: 'Commencer',
        carouselText: 'La Preuve Ultime de l\'Existence Virtuelle : Ancrer les Âmes Numériques dans le Monde Physique.'
      },
      process: {
        title: 'Comment Ça Marche',
        step1: {
          title: '01. Télécharger',
          desc: 'Téléchargez vos fichiers de personnage et fournissez les détails essentiels de votre création.'
        },
        step2: {
          title: '02. Générer',
          desc: 'Notre système génère une empreinte digitale unique en utilisant le hachage cryptographique SHA-256.'
        },
        step3: {
          title: '03. Recevoir',
          desc: 'Recevez un certificat de naissance immuable avec preuve permanente de l\'existence de votre création.'
        },
        step4: {
          title: '04. Vérifier',
          desc: 'Vérification universelle : Tout le monde peut vérifier l\'authenticité de votre ID via le registre blockchain public.'
        }
      },
      form: {
        title: 'Créer Votre Certificat',
        privacyGuard: 'Protection de la Vie Privée :',
        privacyText: 'Votre fichier original reste sur votre appareil. Nous générons uniquement une empreinte digitale.',
        dragDrop: 'Glissez et déposez votre image de personnage ici',
        or: 'ou',
        selectFile: 'Sélectionner un Fichier pour Hachage Local',
        changeImage: 'Changer l\'image',
        characterName: 'Nom du Personnage',
        characterPlaceholder: 'ex. Nova StarSeeker',
        creatorName: 'Nom du Créateur',
        creatorPlaceholder: 'ex. Alex Chen',
        generateProof: 'Générer le Certificat',
        processing: 'Traitement...',
        download: 'Télécharger le Certificat V-ID',
        certificateDownloaded: 'Certificat Généré avec Succès!',
        createAnother: 'Créer un Autre Certificat',
        freeRemaining: 'Certificats gratuits restants : {{count}}'
      },
      progress: {
        reading: 'Lecture du fichier localement...',
        hashing: 'Calcul de l\'empreinte SHA-256...',
        ready: 'Prêt pour l\'enregistrement.'
      },
      hash: {
        title: 'Empreinte Digitale (SHA-256)',
        copy: 'Copier le Hash',
        copied: 'Copié',
        verify: 'Vérifier sur la Blockchain',
        characterName: 'Nom du Personnage',
        creator: 'Créateur'
      },
      paywall: {
        title: 'Débloquer Certificats Illimités',
        subtitle: 'Vous avez utilisé vos certificats gratuits. Choisissez un plan pour continuer :',
        single: 'Certificat Unique',
        pack5: '5 Certificats',
        pack10: '10 Certificats',
        enterKey: 'Ou entrez une clé d\'activation :',
        keyPlaceholder: 'Entrez votre clé de licence',
        activate: 'Activer',
        activating: 'Activation...',
        cancel: 'Annuler'
      },
      footer: {
        disclaimer: 'Avis de Non-Responsabilité',
        disclaimerText: 'V-ID est un service de notarisation numérique, pas un titre légal. Nous fournissons des preuves techniques pour les futurs litiges de PI. Ce service crée une preuve cryptographique d\'existence à un moment précis, mais n\'établit pas la propriété légale ou le droit d\'auteur. Consultez des professionnels du droit pour les questions de propriété intellectuelle.',
        manifesto: 'Manifeste de Confidentialité',
        manifestoText: 'La souveraineté numérique appartient aux créateurs. Pas de suivi. Pas d\'emails. Seulement des preuves mathématiques.',
        copyright: '© 2026 V-ID. Tous droits réservés.'
      }
    }
  },
  es: {
    translation: {
      hero: {
        title: 'Tu Identidad Virtual,',
        titleHighlight: 'Documentada Permanentemente',
        subtitle: 'V-ID proporciona prueba criptográfica de existencia para IPs virtuales y personajes, creando un registro inmutable de tus creaciones digitales desde el momento en que nacen.',
        cta: 'Comenzar',
        carouselText: 'La Prueba Final de la Existencia Virtual: Anclando Almas Digitales en el Mundo Físico.'
      },
      process: {
        title: 'Cómo Funciona',
        step1: {
          title: '01. Subir',
          desc: 'Sube tus archivos de personaje y proporciona detalles esenciales sobre tu creación.'
        },
        step2: {
          title: '02. Generar',
          desc: 'Nuestro sistema genera una Huella Digital única usando hash criptográfico SHA-256.'
        },
        step3: {
          title: '03. Recibir',
          desc: 'Recibe un Certificado de Nacimiento Inmutable con prueba permanente de la existencia de tu creación.'
        },
        step4: {
          title: '04. Verificar',
          desc: 'Verificación Universal: Cualquiera puede verificar la autenticidad de tu ID a través del registro público blockchain.'
        }
      },
      form: {
        title: 'Crear Tu Certificado',
        privacyGuard: 'Guardia de Privacidad:',
        privacyText: 'Tu archivo original permanece en tu dispositivo. Solo generamos una huella digital.',
        dragDrop: 'Arrastra y suelta tu imagen de personaje aquí',
        or: 'o',
        selectFile: 'Seleccionar Archivo para Hash Local',
        changeImage: 'Cambiar Imagen',
        characterName: 'Nombre del Personaje',
        characterPlaceholder: 'ej. Nova StarSeeker',
        creatorName: 'Nombre del Creador',
        creatorPlaceholder: 'ej. Alex Chen',
        generateProof: 'Generar Certificado',
        processing: 'Procesando...',
        download: 'Descargar Certificado V-ID',
        certificateDownloaded: '¡Certificado Generado con Éxito!',
        createAnother: 'Crear Otro Certificado',
        freeRemaining: 'Certificados gratuitos restantes: {{count}}'
      },
      progress: {
        reading: 'Leyendo archivo localmente...',
        hashing: 'Calculando Huella SHA-256...',
        ready: 'Listo para Registro.'
      },
      hash: {
        title: 'Huella Digital (SHA-256)',
        copy: 'Copiar Hash',
        copied: 'Copiado',
        verify: 'Verificar en Blockchain',
        characterName: 'Nombre del Personaje',
        creator: 'Creador'
      },
      paywall: {
        title: 'Desbloquear Certificados Ilimitados',
        subtitle: 'Has usado tus certificados gratuitos. Elige un plan para continuar:',
        single: 'Certificado Individual',
        pack5: '5 Certificados',
        pack10: '10 Certificados',
        enterKey: 'O ingresa una clave de activación:',
        keyPlaceholder: 'Ingresa tu clave de licencia',
        activate: 'Activar',
        activating: 'Activando...',
        cancel: 'Cancelar'
      },
      footer: {
        disclaimer: 'Descargo de Responsabilidad Legal',
        disclaimerText: 'V-ID es un servicio de notarización digital, no un título legal. Proporcionamos evidencia técnica para futuras disputas de PI. Este servicio crea prueba criptográfica de existencia en un momento específico, pero no establece propiedad legal o derechos de autor. Consulte a profesionales legales para asuntos de propiedad intelectual.',
        manifesto: 'Manifiesto de Privacidad',
        manifestoText: 'La soberanía digital pertenece a los creadores. Sin rastreo. Sin correos. Solo prueba matemática.',
        copyright: '© 2026 V-ID. Todos los derechos reservados.'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
