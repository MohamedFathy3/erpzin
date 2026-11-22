import { useLanguage } from '@/contexts/LanguageContext';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import MarketingSEO from '@/components/marketing/MarketingSEO';

type Section = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type DocumentContent = {
  title: string;
  intro: string;
  sections: Section[];
};

const updatedAt = '2026-11-22';
const contactEmail = 'codehamada39@gmail.com';

const documents: Record<'ar' | 'en', Record<'privacy' | 'terms' | 'cookies', DocumentContent>> = {
  ar: {
    privacy: {
      title: 'سياسة الخصوصية',
      intro: 'توضح هذه السياسة كيف تتعامل Fusion ERP مع المعلومات عند زيارتك للموقع أو إنشاء حساب أو استخدام مساحة العمل ومزايا التكامل المتاحة.',
      sections: [
        {
          heading: 'المعلومات التي قد نجمعها',
          bullets: [
            'بيانات الحساب: الاسم، البريد الإلكتروني، بيانات تسجيل الدخول، والدور والصلاحيات داخل مساحة العمل.',
            'بيانات مساحة العمل التي يضيفها العميل أو مستخدموه، مثل بيانات الشركة والفروع والموظفين والعملاء والمنتجات والفواتير والمخزون والمعاملات والتقارير.',
            'بيانات تقنية وتشغيلية مثل نوع المتصفح والجهاز، سجلات الأخطاء والأمان، وتفاعلات الاستخدام اللازمة لتشغيل الخدمة وحمايتها.',
            'معلومات التواصل التي ترسلها لنا عند طلب الدعم أو الاستفسار.'
          ]
        },
        {
          heading: 'تسجيل الدخول باستخدام Google',
          paragraphs: [
            'إذا اخترت تسجيل الدخول أو إنشاء حساب باستخدام Google، نتلقى المعلومات الأساسية التي تسمح بها شاشة موافقة Google، مثل معرّف الحساب والاسم والبريد الإلكتروني والصورة العامة عند توفرها. نستخدمها للتحقق من هويتك وإنشاء الحساب أو ربطه بمساحة العمل المناسبة.',
            'تسجيل الدخول لا يحتاج إلى الوصول إلى ملفات Google Drive أو أحداث التقويم. قد يطلب تكامل Google Calendar الاختياري صلاحية منفصلة عند تفعيله من داخل مساحة العمل. نستخدم بيانات Google فقط لتقديم الميزة التي طلبتها، ولا نبيعها أو نستخدمها للإعلانات. ويخضع استخدامنا لبيانات Google لمتطلبات سياسة بيانات مستخدمي Google API، بما فيها سياسة الاستخدام المحدود (Limited Use).'
          ]
        },
        {
          heading: 'كيف نستخدم المعلومات',
          bullets: [
            'تقديم خدمات ERP وإدارة الحسابات ومساحات العمل والمصادقة والصلاحيات.',
            'تقديم المزايا التي يختارها العميل، بما فيها تكاملات Google الاختيارية عند تفعيلها.',
            'حماية الخدمة واكتشاف إساءة الاستخدام ومعالجة الأعطال والرد على طلبات الدعم.',
            'إرسال رسائل تشغيلية أو أمنية أو متعلقة بالحساب، والامتثال للالتزامات القانونية.'
          ]
        },
        {
          heading: 'المشاركة مع أطراف أخرى',
          paragraphs: [
            'لا نبيع المعلومات الشخصية. قد نعالج أو نشارك الحد الأدنى اللازم مع مزودي خدمات يساعدون في تشغيل المنصة واستضافتها وتقديم الدعم، أو مع Google عندما تختار استخدام تسجيل الدخول أو التكامل، أو عندما يلزم ذلك للامتثال للقانون أو حماية الحقوق والأمان. يستطيع مسؤولو مساحة العمل المخولون الوصول إلى بيانات العمل وفق صلاحياتهم.'
          ]
        },
        {
          heading: 'الاحتفاظ بالمعلومات والحذف',
          paragraphs: [
            'نحتفظ بالمعلومات ما دامت لازمة لتقديم الخدمة وتشغيل الحساب، أو للوفاء بمتطلبات قانونية وأمنية. عند طلب حذف مساحة عمل، تُحذف سجلاتها التشغيلية ومرفقاتها المرتبطة وفق آلية الحذف المتاحة في النظام. قد تبقى نسخ احتياطية أو سجلات محدودة لفترة لازمة للتعافي من الكوارث أو الوفاء بالتزامات قانونية، ثم تُزال وفق دورة الاحتفاظ المعمول بها.'
          ]
        },
        {
          heading: 'الأمان وحقوقك',
          paragraphs: [
            'نستخدم ضوابط إدارية وتقنية مناسبة لحماية المعلومات، ونقيّد الوصول بحسب الحساب والدور. لا توجد وسيلة نقل أو تخزين إلكتروني مضمونة الأمان بصورة مطلقة. يمكنك طلب الوصول إلى بيانات حسابك أو تصحيحها أو حذفها، أو سحب إذن Google من إعدادات حساب Google، عبر مسؤول مساحة العمل أو البريد أدناه.'
          ]
        },
        {
          heading: 'ملفات الارتباط والتغييرات',
          paragraphs: [
            'قد يستخدم الموقع ملفات ضرورية لتشغيل الجلسة وحفظ تفضيلات اللغة أو المظهر، وقد تُستخدم أدوات قياس اختيارية إذا فُعّلت. راجع صفحة سياسة ملفات الارتباط لمزيد من التفاصيل. قد نحدّث هذه السياسة من وقت لآخر، وسننشر النسخة الأحدث هنا مع تاريخ التحديث.'
          ]
        },
        {
          heading: 'التواصل',
          paragraphs: [`للاستفسار عن الخصوصية أو طلب متعلق ببياناتك، راسلنا على ${contactEmail}.`]
        }
      ]
    },
    terms: {
      title: 'شروط الاستخدام',
      intro: 'تنظم هذه الشروط استخدام موقع Fusion ERP وخدماته. باستخدامك للخدمة، فإنك توافق على الالتزام بها وبالقوانين المعمول بها.',
      sections: [
        { heading: 'الحساب ومساحة العمل', paragraphs: ['يجب تقديم معلومات صحيحة والحفاظ على سرية بيانات الدخول. أنت مسؤول عن الأنشطة التي تتم عبر حسابك وعن إخطارنا عند الاشتباه في استخدام غير مصرح به. يلتزم مسؤول مساحة العمل بإدارة المستخدمين والصلاحيات وحماية بيانات الشركة.'] },
        { heading: 'الاستخدام المقبول', bullets: ['استخدم الخدمة لأغراض مشروعة وبما لا ينتهك حقوق الآخرين.', 'لا تحاول تجاوز ضوابط الدخول أو تعطيل الخدمة أو فحصها بطريقة غير مصرح بها.', 'تأكد من امتلاكك الحق في إدخال البيانات والملفات التي ترفعها، ومن وجود أساس مناسب لمعالجة بيانات الأشخاص الذين تسجل معلوماتهم.'] },
        { heading: 'بياناتك وتكاملات الأطراف الأخرى', paragraphs: ['تظل مسؤولًا عن بيانات العمل التي تدخلها وعن نسخها الاحتياطية وتحديد صلاحيات الوصول إليها. عند ربط Google أو أي خدمة أخرى، ينطبق أيضًا ما يقرره مزود تلك الخدمة من شروط وسياسات. يمكنك إلغاء التكامل من إعداداته أو من حساب المزود.'] },
        { heading: 'التجربة والخطط والتغييرات', paragraphs: ['قد تُتاح تجربة مجانية لمدة 5 أيام للحسابات المؤهلة، وفق ما يظهر أثناء التسجيل. أي رسوم أو خطة أو شروط دفع تُعرض أو تُتفق عليها بصورة منفصلة، ولا تنشئ هذه الصفحة وعدًا بسعر محدد. قد نحدّث الخدمة أو نوقف جزءًا منها مؤقتًا لأغراض الصيانة أو الأمان.'] },
        { heading: 'التعليق أو الإنهاء', paragraphs: ['قد نقيّد الوصول عند وجود إساءة استخدام أو خطر أمني أو مخالفة لهذه الشروط أو التزام قانوني. يمكنك التوقف عن استخدام الخدمة وطلب إغلاق حسابك أو مساحة العمل عبر مسؤول الحساب أو التواصل معنا. يوضح إشعار الخصوصية طريقة التعامل مع البيانات عند الإغلاق.'] },
        { heading: 'حدود المسؤولية والتحديثات', paragraphs: ['تُقدّم الخدمة ضمن الحدود التي يسمح بها القانون، ولا تحل محل مراجعة مهنية أو محاسبية أو قانونية لقراراتك. لا يوجد نظام خالٍ تمامًا من الانقطاع أو الأخطاء. قد نحدّث هذه الشروط، ويُعد استمرار الاستخدام بعد نشر التحديث قبولًا بها بالقدر الذي يسمح به القانون.'] },
        { heading: 'التواصل', paragraphs: [`للاستفسارات، راسلنا على ${contactEmail}.`] }
      ]
    },
    cookies: {
      title: 'سياسة ملفات الارتباط',
      intro: 'تشرح هذه الصفحة استخدام ملفات الارتباط والتخزين المحلي في موقع Fusion ERP.',
      sections: [
        { heading: 'الملفات الضرورية', paragraphs: ['قد نستخدم ملفات أو تخزينًا محليًا ضروريًا لتسجيل الدخول، تذكر مساحة العمل، وحفظ تفضيلات مثل اللغة والمظهر. تعطيلها قد يمنع بعض أجزاء الموقع من العمل.'] },
        { heading: 'القياس والاختيارات', paragraphs: ['قد تُحمّل أداة قياس مثل Google Analytics إذا كانت إعداداتها مفعّلة في الموقع. يمكنك إدارة ملفات الارتباط أو حذفها من إعدادات المتصفح؛ وقد تتأثر وظائف الموقع نتيجة لذلك.'] },
        { heading: 'التواصل', paragraphs: [`للاستفسارات عن ملفات الارتباط، راسلنا على ${contactEmail}.`] }
      ]
    }
  },
  en: {
    privacy: {
      title: 'Privacy Policy',
      intro: 'This policy explains how Fusion ERP handles information when you visit our website, create an account, or use a workspace and available integrations.',
      sections: [
        { heading: 'Information we may collect', bullets: ['Account information such as your name, email address, sign-in details, workspace role and permissions.', 'Information entered by a customer or its users, including company, branch, employee, customer, product, invoice, inventory, transaction and report data.', 'Technical and operational information such as browser and device type, security and error logs, and usage activity needed to operate and protect the service.', 'Contact information you provide when requesting support or contacting us.'] },
        { heading: 'Signing in with Google', paragraphs: ['If you choose Google sign-in or sign-up, we receive the basic information permitted by Google’s consent screen, such as your account identifier, name, email address and, when available, profile photo. We use it to verify your identity, create or link your account, and direct you to the appropriate workspace.', 'Sign-in does not require access to Google Drive files or Calendar events. The optional Google Calendar integration may request separate permission when enabled from a workspace. We use Google data only to provide the feature you requested; we do not sell it or use it for advertising. Our use of Google data is subject to the Google API Services User Data Policy, including its Limited Use requirements.'] },
        { heading: 'How we use information', bullets: ['To provide ERP services, accounts, workspaces, authentication and access controls.', 'To provide customer-selected features, including optional Google integrations when enabled.', 'To secure the service, detect misuse, troubleshoot issues and respond to support requests.', 'To send operational, security or account communications and comply with legal obligations.'] },
        { heading: 'Sharing', paragraphs: ['We do not sell personal information. We may process or share the minimum information needed with service providers that help host, operate and support the platform; with Google when you choose Google sign-in or an integration; or when necessary to comply with law or protect rights and security. Authorized workspace administrators may access business data according to their permissions.'] },
        { heading: 'Retention and deletion', paragraphs: ['We retain information while needed to provide and operate the service, or to meet legal and security requirements. When a workspace deletion is requested, its operational records and associated attachments are removed through the system’s deletion process. Limited backups or logs may remain for a necessary disaster-recovery or legal-retention period and are then removed under the applicable retention cycle.'] },
        { heading: 'Security and your choices', paragraphs: ['We use appropriate administrative and technical safeguards and limit access based on account and role. No electronic transmission or storage method is completely secure. You may request access, correction or deletion of account information through your workspace administrator or the contact below. You can revoke Google access from your Google Account settings.'] },
        { heading: 'Cookies and policy updates', paragraphs: ['The website may use essential session cookies and store preferences such as language or appearance. Optional analytics tools may be used when enabled. See our Cookie Policy for details. We may update this policy and will post the current version here with its update date.'] },
        { heading: 'Contact', paragraphs: [`For privacy questions or data requests, contact ${contactEmail}.`] }
      ]
    },
    terms: {
      title: 'Terms of Service',
      intro: 'These terms govern your use of the Fusion ERP website and services. By using the service, you agree to follow these terms and applicable law.',
      sections: [
        { heading: 'Accounts and workspaces', paragraphs: ['You must provide accurate information and keep your sign-in credentials confidential. You are responsible for activity under your account and should notify us if you suspect unauthorized access. Workspace administrators are responsible for managing users, permissions and company information.'] },
        { heading: 'Acceptable use', bullets: ['Use the service lawfully and respect the rights of others.', 'Do not bypass access controls, disrupt the service or test it without authorization.', 'Ensure you have the rights and an appropriate basis to submit the data and files you upload, including personal information about others.'] },
        { heading: 'Your data and third-party integrations', paragraphs: ['You remain responsible for business information entered into the service, its backups and access permissions. If you connect Google or another third-party service, that provider’s terms and policies also apply. You can disconnect an integration from its settings or through the provider.'] },
        { heading: 'Trial, plans and changes', paragraphs: ['A five-day free trial may be offered to eligible accounts, as shown during sign-up. Any fee, plan or payment terms are presented or agreed separately; this page does not promise a particular price. We may update the service or temporarily suspend parts of it for maintenance or security.'] },
        { heading: 'Suspension or termination', paragraphs: ['We may restrict access in case of misuse, a security risk, breach of these terms or a legal requirement. You may stop using the service and request account or workspace closure through your account administrator or by contacting us. Our Privacy Policy explains how data is handled upon closure.'] },
        { heading: 'Limitations and updates', paragraphs: ['The service is provided subject to applicable law and does not replace professional accounting, legal or other advice for your decisions. No system is entirely free of outages or errors. We may update these terms; continued use after an update is posted constitutes acceptance to the extent permitted by law.'] },
        { heading: 'Contact', paragraphs: [`For questions, contact ${contactEmail}.`] }
      ]
    },
    cookies: {
      title: 'Cookie Policy',
      intro: 'This page describes the use of cookies and local storage on the Fusion ERP website.',
      sections: [
        { heading: 'Essential storage', paragraphs: ['We may use cookies or local storage needed for sign-in, remembering your workspace, and saving preferences such as language and appearance. Disabling them may prevent parts of the website from working.'] },
        { heading: 'Analytics and choices', paragraphs: ['An analytics tool such as Google Analytics may load if enabled in the website configuration. You can manage or delete cookies in your browser settings; some website functions may be affected.'] },
        { heading: 'Contact', paragraphs: [`For cookie questions, contact ${contactEmail}.`] }
      ]
    }
  }
};

function Legal({ type }: { type: 'privacy' | 'terms' | 'cookies' }) {
  const { language } = useLanguage();
  const english = language === 'en';
  const content = documents[language][type];
  const path = type === 'privacy' ? '/privacy-policy' : type === 'terms' ? '/terms-of-service' : '/cookies';
  const description = content.intro;

  return (
    <MarketingLayout>
      <MarketingSEO title={`${content.title} | Fusion ERP`} description={description} path={path} language={language} />
      <main lang={language} dir={english ? 'ltr' : 'rtl'} className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-20">
        <header className="mb-10 border-b border-slate-700/50 pb-8">
          <p className="mb-3 text-sm font-semibold text-cyan-400">Fusion ERP</p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{content.title}</h1>
          <p className="mt-5 max-w-3xl leading-8 text-slate-300">{content.intro}</p>
          <p className="mt-4 text-sm text-slate-400">{english ? 'Last updated' : 'آخر تحديث'}: {updatedAt}</p>
        </header>
        <div className="space-y-8">
          {content.sections.map((section) => (
            <section key={section.heading} className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5 sm:p-7">
              <h2 className="text-xl font-bold text-white">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-4 leading-8 text-slate-300">{paragraph}</p>)}
              {section.bullets && <ul className="mt-4 list-disc space-y-3 ps-6 leading-8 text-slate-300">{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
            </section>
          ))}
        </div>
      </main>
    </MarketingLayout>
  );
}

export const Privacy = () => <Legal type="privacy" />;
export const Terms = () => <Legal type="terms" />;
export const CookiesPolicy = () => <Legal type="cookies" />;
