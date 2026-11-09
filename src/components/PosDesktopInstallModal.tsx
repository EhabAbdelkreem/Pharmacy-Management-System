import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Download, 
  ExternalLink, 
  X, 
  Check, 
  Sparkles, 
  Laptop, 
  Smartphone, 
  HelpCircle,
  Copy,
  FolderDown,
  Layers,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface PosDesktopInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const PosDesktopInstallModal: React.FC<PosDesktopInstallModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isNativeInstallable, setIsNativeInstallable] = useState(false);
  const [downloadedShortcut, setDownloadedShortcut] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsNativeInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // 1. Native PWA Install
  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsNativeInstallable(false);
        setDeferredPrompt(null);
        onClose();
      }
    } else {
      // If inside iframe or prompt unavailable, open standalone URL in new window
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  // 2. Generate and download real Windows .url Desktop Shortcut
  const handleDownloadWindowsShortcut = () => {
    const currentUrl = window.location.href;
    const shortcutContent = `[InternetShortcut]\r\nURL=${currentUrl}\r\nIconIndex=0\r\nIconFile=${window.location.origin}/icon-192.png\r\nHotKey=0\r\nIDList=\r\n[{000214A0-0000-0000-C000-000000000046}]\r\nProp3=19,11\r\n[InternetShortcut.W]\r\nURL=${currentUrl}\r\n`;

    const blob = new Blob([shortcutContent], { type: 'application/x-mswinurl;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'PharmaCore-POS-نقطة-البيع.url';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadedShortcut(true);
    setTimeout(() => setDownloadedShortcut(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base">
                  {isAr ? 'تثبيت نقطة البيع (POS) كأيقونة على سطح المكتب' : 'Install POS as Desktop Icon'}
                </h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {isAr ? 'سريع وبشاشة كاملة' : 'Fullscreen App'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAr
                  ? 'يعمل كبرنامج ديسك توب مستقل بدون أشرطة المتصفح، وبسرعة استجابة فائقة'
                  : 'Works as a standalone desktop app without browser toolbars'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {/* Method 1: Instant Windows Desktop Shortcut (.url File) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-indigo-50/40 dark:from-teal-950/40 dark:to-slate-900 border-2 border-teal-500/40 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white text-sm">
                <FolderDown className="w-5 h-5 text-teal-600" />
                <span>{isAr ? 'الخيار 1: تنزيل ملف أيقونة سطح المكتب فوراً للويندوز' : 'Option 1: Instant Windows Desktop Shortcut (.url)'}</span>
              </div>
              <span className="bg-teal-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                {isAr ? 'الأسرع والأسهل' : 'Fastest'}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'اضغط الزر أدناه لتنزيل ملف الأيقونة (PharmaCore-POS.url) وضعه على سطح المكتب. عند النقر المزدوج عليه سيفتح لك نقطة البيع فوراً بشاشة كاملة وبأعلى سرعة.'
                : 'Click below to download the shortcut file directly. Double-clicking it opens POS instantly in fullscreen.'}
            </p>

            <button
              type="button"
              onClick={handleDownloadWindowsShortcut}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {downloadedShortcut ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>{isAr ? 'تم تنزيل أيقونة سطح المكتب بنجاح! تفقد التنزيلات' : 'Shortcut Downloaded! Check Downloads'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{isAr ? 'تحميل أيقونة سطح المكتب للويندوز (.url)' : 'Download Windows Desktop Shortcut'}</span>
                </>
              )}
            </button>
          </div>

          {/* Method 2: Browser Native PWA Install */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white text-sm">
                <Monitor className="w-5 h-5 text-indigo-600" />
                <span>{isAr ? 'الخيار 2: تثبيت التطبيق الرسمي (Install Web App)' : 'Option 2: Install Web App (Chrome / Edge)'}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'إذا كنت تستخدم متصفح Google Chrome أو Microsoft Edge، اضغط الزر أدناه لإظهار نافذة التثبيت الرسمية وإضافة التطبيق لقائمة ابدأ وسطح المكتب.'
                : 'Install as an official PWA directly from Chrome or Edge.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleNativeInstall}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isAr ? 'تثبيت البرنامج الآن' : 'Install App Now'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
                className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-slate-500" />
                <span>{isAr ? 'فتح في نافذة مستقلة' : 'Open Standalone Window'}</span>
              </button>
            </div>
          </div>

          {/* Step by Step Guide for Edge & Chrome */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'خطوات التثبيت اليدوي من شريط المتصفح (10 ثوانٍ):' : 'Manual Install Steps (10 Seconds):'}</span>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center shrink-0">1</span>
                <span>{isAr ? 'اضغط على أيقونة التثبيت 🖥️ الموجودة في شريط عنوان المتصفح (أعلى اليمين في Edge و Chrome).' : 'Click the install icon 🖥️ in browser address bar.'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center shrink-0">2</span>
                <span>{isAr ? 'أو افتح قائمة المتصفح (الثلاث نقاط ⋮) ثم اختر "تطبيقات Apps" ← "تثبيت PharmaCore كتطبيق".' : 'Or open menu (⋮) → Apps → Install PharmaCore as app.'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center shrink-0">3</span>
                <span>{isAr ? 'اختر "إنشاء اختصار على سطح المكتب (Create Desktop Shortcut)" وستظهر الأيقونة فوراً على جهازك.' : 'Check "Create Desktop Shortcut" to pin to desktop.'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
