import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const htmlLangByLanguage: Record<string, string> = {
  en: 'en',
  zh: 'zh-CN',
  ja: 'ja',
};
const LANGUAGE_STORAGE_KEY = 'vaid-language';

function normalizeLanguage(language?: string): 'en' | 'zh' | 'ja' {
  if (language?.startsWith('zh')) return 'zh';
  if (language?.startsWith('ja')) return 'ja';
  return 'en';
}

function getInitialLanguage(): 'en' | 'zh' | 'ja' {
  if (typeof window === 'undefined') return 'en';

  try {
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || undefined);
  } catch {
    return 'en';
  }
}

function persistLanguage(language: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguage(language));
  } catch {
    // Ignore storage failures so language switching still works in memory.
  }
}

function syncHtmlLang(language: string): void {
  if (typeof document === 'undefined') return;
  const normalizedLanguage = normalizeLanguage(language);
  document.documentElement.lang = htmlLangByLanguage[normalizedLanguage];
}

const resources = {
  en: {
    translation: {
      maintenance: {
        title: 'System Maintenance',
        message: 'The system is currently under maintenance and temporarily unavailable. We apologize for any inconvenience.',
        thank: 'Thank you for your patience.'
      },
      hero: {
        title: 'Your Digital Identity',
        titleHighlight: 'Permanently Documented',
        titleLines: ['Your Digital Identity', 'Permanently', 'Documented'],
        subtitle: 'VAID provides proof of existence for digital assets and virtual characters,\ncreating an immutable record from the moment they are created.',
        cta: 'Get Started'
      },
      auth: {
        loading: 'Loading',
        login: 'Login',
        account: 'Account',
        loginTitle: 'Login to VAID',
        loginSubtitle: 'Enter your email, then use the verification code from your inbox to continue.',
        accountSubtitle: 'Certificates, credits, and purchases are now tied to this account.',
        email: 'Email',
        emailPlaceholder: 'you@example.com',
        emailRequired: 'Please enter your email.',
        magicLinkSent: 'Verification email sent. Please check your inbox.',
        magicLinkInvalid: 'This sign-in code or link has expired. Please send yourself a new code.',
        otpSent: 'Verification code sent to {{email}}. Return here and enter the code to finish login.',
        codeSentTo: 'Verification code sent to',
        otpCode: 'Verification code',
        otpPlaceholder: 'Enter 6-digit code',
        otpRequired: 'Please enter the verification code.',
        otpInvalid: 'The verification code is invalid or expired. Please check it or request a new code.',
        sending: 'Sending...',
        sendMagicLink: 'Send Verification Code',
        sendCode: 'Send Verification Code',
        verifyCode: 'Verify and Login',
        verifyingCode: 'Verifying...',
        resendCode: 'Resend code',
        changeEmail: 'Change email',
        currentEmail: 'Current email',
        emailVerified: 'Email verified',
        emailNotVerified: 'Email not verified. Please verify your email before generating certificates.',
        signOut: 'Sign out',
        close: 'Close'
      },
      about: {
        title: 'About VAID Platform',
        description: 'A digital asset archival and identity recognition technology demonstration platform for developers.',
        purpose: 'This platform showcases digital identity sealing, trusted archival, and immutable record-keeping for educational and development purposes.'
      },
      process: {
        title: 'What VAID Does',
        step1: {
          title: 'Virtual Asset ID',
          desc: 'Register your virtual characters, digital props, or other virtual assets here, and establish a globally unique digital identity that confirms their independent existence online.'
        },
        step2: {
          title: 'Proof of Creation',
          desc: 'Use core technology to create a verifiable creation record for your work, preserving a digital fingerprint and timestamp for later checking.'
        },
        step3: {
          title: 'Original Character Archive',
          desc: 'Permanently preserve the full record of incubation, circulation, and commission delivery, building a transparent and long-term traceable digital asset archive for original characters.'
        },
        step4: {
          title: 'Global Verification',
          desc: 'Automatically generate public verification links and supporting records, so when image theft, content laundering, or disputes occur, you can present clear reference evidence.'
        }
      },
      form: {
        title: 'Create Your Certificate',
        remaining: 'Remaining uses: {{count}}',
        buyPlan: 'Buy Plan',
        activationPlaceholder: 'Enter activation code, e.g. VAID-ABCD-EFGH-IJKL',
        verifyActivation: 'Redeem Code',
        verifying: 'Redeeming...',
        privacyGuard: 'Privacy Guard:',
        privacyText: 'Your original file is temporarily uploaded for server-side verification, then scheduled for cleanup after the record is created.',
        dragDrop: 'Drag and drop your character image here',
        or: 'or',
        selectFile: 'Select File',
        changeImage: 'Change Image',
        characterName: 'Character Name',
        characterPlaceholder: 'e.g., Nova StarSeeker',
        creatorName: 'Creator Name',
        creatorPlaceholder: 'e.g., Alex Chen',
        countryRegion: 'Country / Region',
        countryRegionPlaceholder: 'Select a country or region',
        documentType: 'Document Type',
        documentTypeNationalId: 'National ID',
        documentTypePassport: 'Passport',
        documentTypeDriverLicense: 'Driver License',
        documentTypeOther: 'Other Government-Issued ID',
        documentNumber: 'Document Number',
        documentNumberPlaceholder: 'Enter document number',
        identityPrivacy: 'Stored privately in encrypted form and never shown on the public verification page.',
        termsPrefix: 'I have read and agree to the',
        terms: 'Terms of Service',
        and: 'and',
        privacy: 'Privacy Policy',
        termsSuffix: ', and understand my account is used for quota management, certificate registration, and payment record binding.',
        editInfo: 'Edit Info',
        dragAdjust: 'Drag the image to adjust its position',
        scaleHint: 'Use the slider below to scale the image',
        scale: 'Scale',
        resetImage: 'Reset position and scale',
        back: 'Back',
        next: 'Next',
        evidenceTitle: 'Upload creation proof materials',
        evidenceSubtitle: 'Optional materials can strengthen your private evidence package. They will not appear on the public verification page.',
        evidenceTips: 'Recommended: upload screenshots, screen recordings, or PDFs that show the platform name, prompt, creation time, and generated result. Keep your original proof files yourself.',
        evidenceSelect: 'Select proof materials',
        evidenceLimit: 'Video, image, or PDF. Up to {{count}} files, {{size}} each.',
        evidenceRemove: 'Remove proof material',
        evidenceSkip: 'Skip',
        evidenceSkipConfirm: 'If you skip proof materials, future disputes may have weaker supporting evidence. Continue without uploading?',
        evidenceContinue: 'Continue',
        evidenceUploading: 'Uploading...',
        evidenceUploadingProgress: 'Uploading {{current}} / {{total}}...',
        generateProof: 'Generate Certificate',
        processing: 'Preparing...',
        processingHint: 'Preparing the cropped image preview.',
        download: 'Download VAID Certificate',
        certificateDownloaded: 'Certificate Generated Successfully!',
        createAnother: 'Create Another Certificate'
      },
      errors: {
        enterActivationCode: 'Please enter an activation code',
        activationNotFound: 'Activation code not found. Please check and try again.',
        activationUnavailable: 'This activation code has been used up or is unavailable. Please use a new code.',
        fillNames: 'Please enter the character name and creator name first.',
        uploadImage: 'Please upload an image first.',
        returnFillNames: 'Please go back and enter the character name and creator name first.',
        activationRequired: 'Please enter an activation code before generating.',
        quotaConsumeFailed: 'Failed to deduct remaining uses. Please try again later.',
        generationCheckFailed: 'Generation check failed. Please try again later.',
        generationFlowFailed: 'Generation flow failed. Please try again later.',
        duplicateHashOwnedByAnotherUser: 'This work has already been registered by another account.',
        imageReadFailed: 'Image read failed. Please upload again.',
        unsupportedImageType: 'Please upload a JPG, PNG, WEBP, or GIF image.',
        imageTooLarge: 'Image is too large. Please upload an image smaller than {{size}}.',
        evidenceInvalidFile: 'Please upload video, image, or PDF proof materials smaller than {{size}} each.',
        evidenceRequired: 'Please upload platform creation proof materials, or click Skip.',
        evidenceUploadFailed: 'Proof material upload failed. Please try again or skip this step.',
        identitySaveFailed: 'Identity information could not be saved. Please try again.',
        invalidIdentityDocument: 'Please enter a document number that matches the selected country and document type.',
        fillArchiveDetails: 'Please complete the character, creator, country, and document information.',
        agreeToTerms: 'Please agree to the Terms of Service and Privacy Policy.',
        quotaStatusFailed: 'Failed to check remaining uses. Please try again later.',
        loginRequired: 'Please log in before generating a certificate.',
        emailNotConfirmed: 'Please verify your email before generating a certificate.'
      },
      progress: {
        reading: 'Reading file locally...',
        hashing: 'Generating Digital Seal...',
        ready: 'Ready for Registry.'
      },
      hash: {
        title: 'VAID Digital Seal',
        copy: 'Copy Seal',
        copied: 'Copied',
        verify: 'Proof Status',
        characterName: 'Character Name',
        creator: 'Creator'
      },
      paywall: {
        title: 'Unlock More Certificate Generations',
        subtitle: 'Choose your plan, secure payment via Alipay',
        pack1: '1x Plan',
        pack5: '5x Plan',
        pack10: '10x Plan',
        certificates: '{{count}} certificate generations',
        bestValue: 'Best Value',
        buyNow: 'Buy Now',
        iframeNotice: 'You are in a preview environment, so Alipay cannot open inside the embedded window. After purchase, the payment page will open in a new tab and return to the payment result page after success.',
        createOrderFailed: 'Failed to create order. Please try again later.',
        paymentUrlFailed: 'Failed to get payment link.',
        networkError: 'Network error. Please check your connection.',
        pendingPayment: 'If the Alipay page did not open automatically, click the button below.',
        openAlipay: 'Open Alipay in a new tab',
        securityNote: 'Payment is secured by Alipay • Credits are added directly to your VAID account after payment succeeds.'
      },
      paymentSuccess: {
        missingOrder: 'No order number was detected. Please return home and start the purchase again.',
        successStatus: 'Payment succeeded. Credits have been added to your VAID account. Returning you home.',
        authRequiredStatus: 'The payment page did not bring back your login session. Log in here with the same email, then confirm again.',
        errorStatus: 'Payment confirmation failed. Confirm again; your payment will not be lost.',
        pendingStatus: 'Alipay may still be syncing the result. Wait a few seconds and confirm again. Do not purchase again.',
        syncingStatus: 'Payment is complete. Syncing account credits, please wait.',
        checkingStatus: 'Confirming payment result, please wait.',
        successTitle: 'Purchase Successful',
        authRequiredTitle: 'Login Required',
        checkingTitle: 'Confirming Payment',
        orderNumber: 'Order number: {{orderNumber}}',
        packSize: 'Plan credits: {{count}}',
        orderStatus: 'Order status: {{status}}',
        statusPaid: 'Paid',
        statusPending: 'Pending',
        paidCredits: 'Current paid credits: {{count}}',
        confirmAfterLogin: 'Confirm after login',
        retry: 'Confirm again',
        backHome: 'Back home'
      },
      cardGenerator: {
        cannotContinue: 'Cannot Continue',
        backHome: 'Back Home',
        identityPreview: 'Digital ID Card',
        downloading: 'Downloading...',
        download: 'Download',
        recordedBy: 'Proof of identity recorded by VAID',
        errors: {
          missingData: 'Required certificate data is missing. Please return home and start again.',
          expiredSession: 'This generation link has expired. Please return home and start again.',
          missingRegisteredId: 'The registered certificate ID is missing. Please return home and start again.',
          initializationFailed: 'Certificate initialization failed. Please return home and try again.',
          downloadFailed: 'Download failed. Please try again.'
        }
      },
      notFound: {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist or has been moved.',
        backHome: 'Back Home'
      },
      footer: {
        disclaimer: 'Legal Disclaimer',
        disclaimerText: 'VAID is a digital archival platform for developers, not a legal title. We provide technical demonstration for digital asset management. This service creates digital identity proof of existence at a specific point in time but does not establish legal ownership or copyright. Consult with legal professionals for matters related to intellectual property rights.',
        manifesto: 'Privacy Manifesto',
        manifestoText: 'Digital sovereignty belongs to creators. No tracking. No emails. Only mathematical proof.',
        contact: 'Contact Us',
        contactTitle: 'Contact VAID',
        contactSubtitle: 'Send a message without exposing the VAID mailbox address.',
        contactName: 'Your name',
        contactEmail: 'Your reply email',
        contactMessage: 'How can we help?',
        contactSend: 'Send Message',
        contactSending: 'Sending...',
        contactSent: 'Message sent. We will reply if needed.',
        contactError: 'Message failed to send. Please try again later.',
        docs: 'Documentation',
        share: 'Share',
        shareText: 'VAID - digital identity proof for virtual assets',
        weibo: 'Weibo',
        xiaohongshu: 'Xiaohongshu',
        wechatMoments: 'WeChat Moments',
        shareCopied: '{{channel}} link copied. Open the app and paste it to share.',
        shareCopyFailed: 'Copy failed. Please copy the page link manually.',
        copyright: '© 2026 VAID Platform. All rights reserved.',
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
        title: '您的数字身份',
        titleHighlight: '永久存证',
        titleLines: ['将您的数字资产永久存证', '将数字灵魂锚定于', '物理世界'],
        mobileTitleLines: ['将您的数字资产永久存证', '将数字灵魂锚定于', '物理世界'],
        subtitle: 'VAID 为数字资产、虚拟角色与原创设定提供存在证明与时间锚点。\n从作品诞生的那一刻起，为创作留下一份可追溯、可验证、不可篡改的数字记录。',
        mobileSubtitleLines: ['VAID 为数字资产、虚拟角色与原创设定提供存在证明与时间锚点。', '从作品诞生的那一刻起，为创作留下一份可追溯、可验证、', '不可篡改的数字记录。'],
        cta: '立即开始'
      },
      auth: {
        loading: '加载中',
        login: '登录',
        account: '账户',
        loginTitle: '登录 VAID',
        loginSubtitle: '输入邮箱，收到验证码后回到这里完成登录。',
        accountSubtitle: '证书、额度和购买记录都会绑定到此账户。',
        email: '邮箱',
        emailPlaceholder: 'you@example.com',
        emailRequired: '请输入邮箱',
        magicLinkSent: '验证码邮件已发送，请检查邮箱。',
        magicLinkInvalid: '验证码或登录链接已经失效，请重新发送验证码。',
        otpSent: '验证码已发送至 {{email}}，请回到这里输入验证码完成登录。',
        codeSentTo: '验证码已发送至',
        otpCode: '验证码',
        otpPlaceholder: '输入 6 位验证码',
        otpRequired: '请输入验证码',
        otpInvalid: '验证码错误或已过期，请检查后重试，或重新发送验证码。',
        sending: '发送中...',
        sendMagicLink: '发送验证码',
        sendCode: '发送验证码',
        verifyCode: '验证并登录',
        verifyingCode: '验证中...',
        resendCode: '重新发送',
        changeEmail: '更换邮箱',
        currentEmail: '当前邮箱',
        emailVerified: '邮箱已验证',
        emailNotVerified: '邮箱未验证。生成证书前请先完成邮箱验证。',
        signOut: '退出登录',
        close: '关闭'
      },
      about: {
        title: '关于 VAID 平台',
        description: '面向开发者的数字资产存档与身份识别技术展示平台',
        purpose: '本平台展示数字指纹、加密散列和不可变记录保存技术，用于教育和开发目的。'
      },
      process: {
        title: 'VAID 的作用',
        step1: {
          title: '虚拟资产 ID',
          desc: '为您的虚拟角色、数字道具或各类虚拟资产登记，建立全球唯一的数字身份证，确信其在网络世界的独立存在。'
        },
        step2: {
          title: '创作证明',
          desc: '依托核心技术为作品生成可核验的创作记录，留存数字指纹与时间信息，便于后续核验和举证。'
        },
        step3: {
          title: '原创角色档案',
          desc: '永久留存作品在孵化、流转与约稿交付中的全过程记录，为原创角色构建一套透明、可长期追溯的数字化独立资产档案。'
        },
        step4: {
          title: '全球公开验证',
          desc: '自动生成全网公开的验证链接与可信凭证，在未来遭遇恶意盗图、洗稿或权属纠纷时，让您可以瞬间一键出示无争议铁证。'
        }
      },
      form: {
        title: '创建您的证书',
        remaining: '剩余次数：{{count}} 次',
        buyPlan: '购买套餐',
        activationPlaceholder: '输入激活码，例如 VAID-ABCD-EFGH-IJKL',
        verifyActivation: '兑换激活码',
        verifying: '兑换中...',
        privacyGuard: '隐私保护：',
        privacyText: '原始文件会临时上传用于服务端校验，记录创建后将按规则清理。',
        dragDrop: '将角色图片拖放到此处',
        or: '或',
        selectFile: '选择文件',
        changeImage: '更换图片',
        characterName: '角色名称',
        characterPlaceholder: '例如：星辰探索者诺娃',
        creatorName: '创作者姓名',
        creatorPlaceholder: '例如：陈亚历克斯',
        countryRegion: '国家 / 地区',
        countryRegionPlaceholder: '请选择国家或地区',
        documentType: '证件类型',
        documentTypeNationalId: '身份证件',
        documentTypePassport: '护照',
        documentTypeDriverLicense: '驾驶证',
        documentTypeOther: '其他政府签发证件',
        documentNumber: '证件号码',
        documentNumberPlaceholder: '请输入证件号码',
        identityPrivacy: '证件号码将加密私密保存，不会显示在公开验证页。',
        termsPrefix: '我已阅读并同意',
        terms: '用户协议',
        and: '和',
        privacy: '隐私政策',
        termsSuffix: '，了解账户将用于额度管理、证书注册和支付记录绑定',
        editInfo: '编辑信息',
        dragAdjust: '拖拽图片调整位置',
        scaleHint: '使用下方滑块缩放图片',
        scale: '缩放',
        resetImage: '重置位置和缩放',
        back: '返回',
        next: '下一步',
        evidenceTitle: '上传平台创作证明材料',
        evidenceSubtitle: '这一步是可选的，用于增强您的私有证据包。证明材料不会出现在公开验证页。',
        evidenceTips: '建议上传能看到平台名称、提示词、创作时间和生成结果的截图、录屏或 PDF。原始证明文件请您自己长期保存。',
        evidenceSelect: '选择证明材料',
        evidenceLimit: '支持视频、图片或 PDF。最多 {{count}} 个文件，每个不超过 {{size}}。',
        evidenceRemove: '移除证明材料',
        evidenceSkip: '跳过',
        evidenceSkipConfirm: '如果不上传证明材料，未来遇到法律问题时可能会出现证据不足。确认跳过吗？',
        evidenceContinue: '继续生成',
        evidenceUploading: '上传中...',
        evidenceUploadingProgress: '正在上传 {{current}} / {{total}}...',
        generateProof: '生成证书',
        processing: '准备中...',
        processingHint: '正在准备裁剪后的图片。',
        download: '下载 VAID 证书',
        certificateDownloaded: '证书生成成功！',
        createAnother: '创建另一个证书'
      },
      errors: {
        enterActivationCode: '请输入激活码',
        activationNotFound: '激活码不存在，请检查后重试',
        activationUnavailable: '这个激活码已用完或不可用，请更换新的激活码',
        fillNames: '请先填写角色名称和创作者名称',
        uploadImage: '请先上传图片',
        returnFillNames: '请先返回上一步填写角色名称和创作者名称',
        activationRequired: '请输入激活码后再生成',
        quotaConsumeFailed: '剩余次数扣减失败，请稍后重试',
        generationCheckFailed: '生成前校验失败，请稍后重试',
        generationFlowFailed: '生成流程异常，请稍后重试',
        duplicateHashOwnedByAnotherUser: '该作品已被其他账户注册。',
        imageReadFailed: '图片读取失败，请重新上传后重试',
        unsupportedImageType: '请上传 JPG、PNG、WEBP 或 GIF 图片',
        imageTooLarge: '图片过大，请上传小于 {{size}} 的图片',
        evidenceInvalidFile: '请上传视频、图片或 PDF 证明材料，每个文件不超过 {{size}}',
        evidenceRequired: '请先上传平台创作证明材料，或点击跳过。',
        evidenceUploadFailed: '证明材料上传失败，请重试，或跳过这一步',
        identitySaveFailed: '身份资料保存失败，请重试',
        invalidIdentityDocument: '请输入符合所选国家和证件类型格式的证件号码',
        fillArchiveDetails: '请完整填写角色、创作者、国家及证件信息',
        agreeToTerms: '请先同意用户协议和隐私政策',
        quotaStatusFailed: '次数状态校验失败，请稍后重试',
        loginRequired: '请先登录，再生成证书',
        emailNotConfirmed: '请先完成邮箱验证，再生成证书'
      },
      progress: {
        reading: '本地读取文件中...',
        hashing: '生成数字存证印记中...',
        ready: '已准备好注册。'
      },
      hash: {
        title: 'VAID 数字存证印记',
        copy: '复制印记',
        copied: '已复制',
        verify: '查看存证状态',
        characterName: '角色名称',
        creator: '创作者'
      },
      paywall: {
        title: '解锁更多证书生成次数',
        subtitle: '选择适合您的套餐，支付宝安全支付',
        pack1: '1次套餐',
        pack5: '5次套餐',
        pack10: '10次套餐',
        certificates: '{{count}} 次证书生成',
        bestValue: '最划算',
        buyNow: '立即购买',
        iframeNotice: '当前处于预览环境，支付宝无法在内嵌窗口中打开。点击购买后，支付页面会在新标签页中打开，支付成功后会返回支付结果页面。',
        createOrderFailed: '创建订单失败，请稍后重试',
        paymentUrlFailed: '获取支付链接失败',
        networkError: '网络错误，请检查连接',
        pendingPayment: '如果支付宝页面没有自动打开，请点击下面的按钮。',
        openAlipay: '在新标签页打开支付宝',
        securityNote: '支付由支付宝提供安全保障 • 支付成功后额度会直接充入您的 VAID 账户'
      },
      paymentSuccess: {
        missingOrder: '未检测到订单号，请返回首页重新发起购买。',
        successStatus: '支付成功，额度已充入您的 VAID 账户，正在为你返回主页。',
        authRequiredStatus: '支付页面没有带回登录状态。请在当前页面用同一个邮箱登录，再点重新确认。',
        errorStatus: '支付确认请求失败。请点重新确认，款项不会丢失。',
        pendingStatus: '支付宝可能还在同步结果。请稍等几秒后点重新确认，不要重复购买。',
        syncingStatus: '支付已完成，正在同步账户额度，请稍候。',
        checkingStatus: '正在确认支付结果，请稍候。',
        successTitle: '购买成功',
        authRequiredTitle: '需要重新登录',
        checkingTitle: '支付确认中',
        orderNumber: '订单号：{{orderNumber}}',
        packSize: '套餐次数：{{count}} 次',
        orderStatus: '订单状态：{{status}}',
        statusPaid: '已支付',
        statusPending: '待支付',
        paidCredits: '当前付费额度：{{count}} 次',
        confirmAfterLogin: '登录后确认到账',
        retry: '重新确认',
        backHome: '返回主页'
      },
      cardGenerator: {
        cannotContinue: '无法继续生成',
        backHome: '返回首页',
        identityPreview: '数字身份证',
        downloading: '下载中...',
        download: '下载',
        recordedBy: '身份记录已由 VAID 存证',
        errors: {
          missingData: '缺少生成证书所需的数据，请从首页重新开始。',
          expiredSession: '本次生成链接已失效，请返回首页重新发起生成。',
          missingRegisteredId: '缺少已注册的证书编号，请返回首页重新发起生成。',
          initializationFailed: '证书初始化过程中发生异常，请返回首页重试。',
          downloadFailed: '下载失败，请重试。'
        }
      },
      notFound: {
        title: '页面不存在',
        message: '您访问的页面不存在，或已被移动。',
        backHome: '返回首页'
      },
      footer: {
        disclaimer: '法律声明',
        disclaimerText: 'VAID 是面向开发者的数字存档平台，而非法律所有权凭证。我们为数字资产管理提供技术展示。此服务创建特定时间点的数字存在证明，但不建立法律所有权或版权。有关知识产权事宜，请咨询法律专业人士。',
        manifesto: '隐私宣言',
        manifestoText: '数字主权属于创作者。无追踪。无邮件。只有数学证明。',
        contact: '联系我们',
        contactTitle: '联系 VAID',
        contactSubtitle: '通过站内表单发送消息，用户不会看到 VAID 邮箱地址。',
        contactName: '您的称呼',
        contactEmail: '您的回复邮箱',
        contactMessage: '请输入您想咨询的内容',
        contactSend: '发送消息',
        contactSending: '发送中...',
        contactSent: '消息已发送，如有需要我们会回复。',
        contactError: '消息发送失败，请稍后重试。',
        docs: '说明文档',
        share: '分享',
        shareText: 'VAID - 为虚拟资产提供数字身份存证',
        weibo: '新浪微博',
        xiaohongshu: '小红书',
        wechatMoments: '微信朋友圈',
        shareCopied: '{{channel}} 分享链接已复制，请打开对应 App 粘贴发布。',
        shareCopyFailed: '复制失败，请手动复制当前页面链接。',
        copyright: '© 2026 VAID 平台. 保留所有权利。',
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
        titleLines: ['あなたのデジタル', 'アイデンティティを', '永久的に記録'],
        subtitle: 'VAIDは、デジタル資産とキャラクターの暗号的存在証明を提供し、\nデジタル創作物の誕生時から不変の記録を作成します。',
        cta: '今すぐ始める',
        carouselText: 'デジタル存在の最終証明：デジタル資産を物理世界に固定する。'
      },
      auth: {
        loading: '読込中',
        login: 'ログイン',
        account: 'アカウント',
        loginTitle: 'VAIDにログイン',
        loginSubtitle: 'メールアドレスを入力し、届いた認証コードをここに入力してログインします。',
        accountSubtitle: '証明書、クレジット、購入履歴はこのアカウントに紐づきます。',
        email: 'メール',
        emailPlaceholder: 'you@example.com',
        emailRequired: 'メールアドレスを入力してください。',
        magicLinkSent: '認証コードのメールを送信しました。メールを確認してください。',
        magicLinkInvalid: '認証コードまたはログインリンクの有効期限が切れています。新しいコードを送信してください。',
        otpSent: '認証コードを {{email}} に送信しました。ここに戻ってコードを入力してください。',
        codeSentTo: '認証コードの送信先',
        otpCode: '認証コード',
        otpPlaceholder: '6桁のコードを入力',
        otpRequired: '認証コードを入力してください。',
        otpInvalid: '認証コードが正しくないか、有効期限が切れています。確認するか、新しいコードを送信してください。',
        sending: '送信中...',
        sendMagicLink: '認証コードを送信',
        sendCode: '認証コードを送信',
        verifyCode: '確認してログイン',
        verifyingCode: '確認中...',
        resendCode: '再送信',
        changeEmail: 'メールを変更',
        currentEmail: '現在のメール',
        emailVerified: 'メール確認済み',
        emailNotVerified: 'メールが未確認です。証明書を生成する前に確認してください。',
        signOut: 'ログアウト',
        close: '閉じる'
      },
      about: {
        title: 'VAIDプラットフォームについて',
        description: '開発者向けのデジタル資産アーカイブおよびアイデンティティ認識技術デモンストレーションプラットフォーム',
        purpose: 'このプラットフォームは、教育および開発目的のためのデジタル指紋、暗号ハッシュ、および不変記録保管技術を展示します。'
      },
      process: {
        title: 'VAIDの役割',
        step1: {
          title: '仮想資産 ID',
          desc: '仮想キャラクター、デジタルアイテム、各種仮想資産を登録し、世界で一意のデジタル ID を構築して、ネットワーク上での独立した存在を明確にします。'
        },
        step2: {
          title: '創作証明',
          desc: '中核技術によって作品の初期帰属を正確に確立し、システム基盤であなたの創作主権を完全に固定し、技術的に作品があなた個人に属することを確保します。'
        },
        step3: {
          title: 'オリジナルキャラクターアーカイブ',
          desc: '作品の育成、流通、コミッション納品における全過程の記録を永続的に保存し、オリジナルキャラクターの透明で長期追跡可能なデジタル独立資産アーカイブを構築します。'
        },
        step4: {
          title: 'グローバル公開検証',
          desc: '公開検証リンクと補助記録を自動生成し、将来の盗用、模倣、紛争が発生した際に、明確な参考証拠を提示しやすくします。'
        }
      },
      form: {
        title: '証明書を作成',
        remaining: '残り回数：{{count}} 回',
        buyPlan: 'プランを購入',
        activationPlaceholder: 'アクティベーションコードを入力（例：VAID-ABCD-EFGH-IJKL）',
        verifyActivation: 'コードを引き換え',
        verifying: '引き換え中...',
        privacyGuard: 'プライバシーガード：',
        privacyText: '元のファイルはサーバー側の検証のため一時的にアップロードされ、記録作成後に削除または整理されます。',
        dragDrop: 'キャラクター画像をここにドラッグ＆ドロップ',
        or: 'または',
        selectFile: 'ファイルを選択',
        changeImage: '画像を変更',
        characterName: 'キャラクター名',
        characterPlaceholder: '例：ノヴァ・スターシーカー',
        creatorName: 'クリエイター名',
        creatorPlaceholder: '例：アレックス・チェン',
        countryRegion: '国 / 地域',
        countryRegionPlaceholder: '国または地域を選択',
        documentType: '本人確認書類の種類',
        documentTypeNationalId: '国民身分証明書',
        documentTypePassport: 'パスポート',
        documentTypeDriverLicense: '運転免許証',
        documentTypeOther: 'その他の政府発行証明書',
        documentNumber: '証明書番号',
        documentNumberPlaceholder: '証明書番号を入力',
        identityPrivacy: '証明書番号は暗号化して非公開で保存され、公開検証ページには表示されません。',
        termsPrefix: '私は',
        terms: '利用規約',
        and: 'および',
        privacy: 'プライバシーポリシー',
        termsSuffix: 'を読み同意し、アカウントがクレジット管理、証明書登録、購入履歴の紐づけに使用されることを理解しました。',
        editInfo: '情報を編集',
        dragAdjust: '画像をドラッグして位置を調整',
        scaleHint: '下のスライダーで画像を拡大縮小',
        scale: '拡大率',
        resetImage: '位置と拡大率をリセット',
        back: '戻る',
        next: '次へ',
        evidenceTitle: '制作証明資料をアップロード',
        evidenceSubtitle: '任意の資料として、非公開の証拠パッケージを強化できます。公開検証ページには表示されません。',
        evidenceTips: '推奨：プラットフォーム名、プロンプト、作成時刻、生成結果が分かるスクリーンショット、画面録画、PDF をアップロードしてください。元の証明ファイルはご自身で保管してください。',
        evidenceSelect: '証明資料を選択',
        evidenceLimit: '動画、画像、PDF に対応。最大 {{count}} ファイル、各 {{size}} まで。',
        evidenceRemove: '証明資料を削除',
        evidenceSkip: 'スキップ',
        evidenceSkipConfirm: '証明資料をアップロードしない場合、将来の紛争時に補助証拠が弱くなる可能性があります。このまま続行しますか？',
        evidenceContinue: '続行',
        evidenceUploading: 'アップロード中...',
        evidenceUploadingProgress: '{{current}} / {{total}} をアップロード中...',
        generateProof: '証明書を生成',
        processing: '準備中...',
        processingHint: '切り抜いた画像を準備しています。',
        download: 'VAID証明書をダウンロード',
        certificateDownloaded: '証明書が正常に生成されました！',
        createAnother: '別の証明書を作成'
      },
      errors: {
        enterActivationCode: 'アクティベーションコードを入力してください',
        activationNotFound: 'アクティベーションコードが見つかりません。確認して再試行してください。',
        activationUnavailable: 'このアクティベーションコードは使い切られたか利用できません。新しいコードを使用してください。',
        fillNames: '先にキャラクター名とクリエイター名を入力してください。',
        uploadImage: '先に画像をアップロードしてください。',
        returnFillNames: '前の手順に戻ってキャラクター名とクリエイター名を入力してください。',
        activationRequired: '生成前にアクティベーションコードを入力してください。',
        quotaConsumeFailed: '残り回数の消費に失敗しました。後でもう一度お試しください。',
        generationCheckFailed: '生成前の確認に失敗しました。後でもう一度お試しください。',
        generationFlowFailed: '生成処理でエラーが発生しました。後でもう一度お試しください。',
        duplicateHashOwnedByAnotherUser: 'この作品はすでに別のアカウントで登録されています。',
        imageReadFailed: '画像の読み込みに失敗しました。再度アップロードしてください。',
        unsupportedImageType: 'JPG、PNG、WEBP、GIF 画像をアップロードしてください。',
        imageTooLarge: '画像が大きすぎます。{{size}} 未満の画像をアップロードしてください。',
        evidenceInvalidFile: '動画、画像、PDF の証明資料をアップロードしてください。各ファイルは {{size}} 未満にしてください。',
        evidenceRequired: 'プラットフォーム上の制作証明資料をアップロードするか、「スキップ」をクリックしてください。',
        evidenceUploadFailed: '証明資料のアップロードに失敗しました。再試行するか、この手順をスキップしてください。',
        identitySaveFailed: '本人確認情報を保存できませんでした。再試行してください。',
        invalidIdentityDocument: '選択した国と証明書の種類に一致する番号を入力してください。',
        fillArchiveDetails: 'キャラクター、クリエイター、国、証明書情報をすべて入力してください。',
        agreeToTerms: '利用規約とプライバシーポリシーに同意してください。',
        quotaStatusFailed: '残り回数の確認に失敗しました。後でもう一度お試しください。',
        loginRequired: '証明書を生成する前にログインしてください。',
        emailNotConfirmed: '証明書を生成する前にメール確認を完了してください。'
      },
      progress: {
        reading: 'ファイルをローカルで読み込み中...',
        hashing: 'デジタル証明シールを生成中...',
        ready: '登録準備完了。'
      },
      hash: {
        title: 'VAID デジタル証明シール',
        copy: 'シールをコピー',
        copied: 'コピー済み',
        verify: '証明ステータス',
        characterName: 'キャラクター名',
        creator: 'クリエイター'
      },
      paywall: {
        title: '証明書生成回数を追加',
        subtitle: 'プランを選択し、Alipayで安全に決済',
        pack1: '1回プラン',
        pack5: '5回プラン',
        pack10: '10回プラン',
        certificates: '{{count}} 回の証明書生成',
        bestValue: '最もお得',
        buyNow: '今すぐ購入',
        iframeNotice: 'プレビュー環境では、Alipayを埋め込みウィンドウ内で開けません。購入後、決済ページは新しいタブで開き、成功後に決済結果ページへ戻ります。',
        createOrderFailed: '注文の作成に失敗しました。後でもう一度お試しください。',
        paymentUrlFailed: '決済リンクの取得に失敗しました。',
        networkError: 'ネットワークエラーです。接続を確認してください。',
        pendingPayment: 'Alipayページが自動で開かない場合は、下のボタンをクリックしてください。',
        openAlipay: '新しいタブでAlipayを開く',
        securityNote: '決済はAlipayにより保護されます • 決済成功後、クレジットはVAIDアカウントに直接追加されます'
      },
      paymentSuccess: {
        missingOrder: '注文番号が検出されませんでした。ホームに戻って購入をやり直してください。',
        successStatus: '決済が完了しました。クレジットはVAIDアカウントに追加されました。ホームに戻ります。',
        authRequiredStatus: '決済ページでログイン状態を確認できませんでした。同じメールアドレスでログインしてから、もう一度確認してください。',
        errorStatus: '決済確認に失敗しました。もう一度確認してください。お支払いは失われません。',
        pendingStatus: 'Alipayの結果同期に時間がかかっている可能性があります。数秒待ってからもう一度確認してください。重複購入しないでください。',
        syncingStatus: '決済は完了しています。アカウントのクレジットを同期しています。しばらくお待ちください。',
        checkingStatus: '決済結果を確認しています。しばらくお待ちください。',
        successTitle: '購入完了',
        authRequiredTitle: 'ログインが必要です',
        checkingTitle: '決済確認中',
        orderNumber: '注文番号：{{orderNumber}}',
        packSize: 'プラン回数：{{count}} 回',
        orderStatus: '注文ステータス：{{status}}',
        statusPaid: '支払い済み',
        statusPending: '未支払い',
        paidCredits: '現在の有料クレジット：{{count}} 回',
        confirmAfterLogin: 'ログイン後に確認',
        retry: 'もう一度確認',
        backHome: 'ホームに戻る'
      },
      cardGenerator: {
        cannotContinue: '生成を続行できません',
        backHome: 'ホームに戻る',
        identityPreview: 'デジタル身分証',
        downloading: 'ダウンロード中...',
        download: 'ダウンロード',
        recordedBy: 'VAID に記録されたアイデンティティ証明',
        errors: {
          missingData: '証明書生成に必要なデータが不足しています。ホームに戻ってやり直してください。',
          expiredSession: 'この生成リンクは期限切れです。ホームに戻ってやり直してください。',
          missingRegisteredId: '登録済みの証明書IDが見つかりません。ホームに戻ってやり直してください。',
          initializationFailed: '証明書の初期化中にエラーが発生しました。ホームに戻ってもう一度お試しください。',
          downloadFailed: 'ダウンロードに失敗しました。もう一度お試しください。'
        }
      },
      notFound: {
        title: 'ページが見つかりません',
        message: 'お探しのページは存在しないか、移動された可能性があります。',
        backHome: 'ホームに戻る'
      },
      footer: {
        disclaimer: '法的免責事項',
        disclaimerText: 'VAIDは開発者向けのデジタルアーカイブプラットフォームであり、法的権利ではありません。デジタル資産管理のための技術的デモンストレーションを提供します。このサービスは特定時点での暗号的存在証明を作成しますが、法的所有権や著作権を確立するものではありません。知的財産権に関する事項については、法律専門家にご相談ください。',
        manifesto: 'プライバシー宣言',
        manifestoText: 'デジタル主権はクリエイターに属します。トラッキングなし。メールなし。数学的証明のみ。',
        contact: 'お問い合わせ',
        contactTitle: 'VAIDに連絡',
        contactSubtitle: 'VAIDのメールアドレスを公開せずにメッセージを送信できます。',
        contactName: 'お名前',
        contactEmail: '返信先メール',
        contactMessage: 'お問い合わせ内容',
        contactSend: '送信',
        contactSending: '送信中...',
        contactSent: 'メッセージを送信しました。必要に応じて返信します。',
        contactError: '送信に失敗しました。後でもう一度お試しください。',
        docs: '説明ドキュメント',
        share: '共有',
        shareText: 'VAID - 仮想資産のデジタルID証明',
        weibo: 'Weibo',
        xiaohongshu: 'Xiaohongshu',
        wechatMoments: 'WeChat Moments',
        shareCopied: '{{channel}} の共有リンクをコピーしました。アプリで貼り付けて共有してください。',
        shareCopyFailed: 'コピーに失敗しました。ページリンクを手動でコピーしてください。',
        copyright: '© 2026 VAIDプラットフォーム. All rights reserved.',
        icp: 'ICP登録番号'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh', 'ja'],
    interpolation: {
      escapeValue: false
    }
  });

syncHtmlLang(i18n.language);
i18n.on('languageChanged', (language) => {
  syncHtmlLang(language);
  persistLanguage(language);
});

export default i18n;
