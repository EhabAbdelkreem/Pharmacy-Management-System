import React, { useState } from 'react';
import { Download, Monitor, Smartphone, ExternalLink, X, CheckCircle2, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'prominent' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  const downloadDesktopShortcut = () => {
    try {
      const currentOrigin = window.location.origin;
      const posUrl = `${currentOrigin}/?tab=pos`;
      const shortcutContent = `[InternetShortcut]\r\nURL=${posUrl}\r\nIconIndex=0\r\nIconFile=${currentOrigin}/pwa-192x192.png\r\nHotKey=0\r\n[{000214A0-0000-0000-C000-000000000046}]\r\nProp3=19,11\r\n[InternetShortcut.W]\r\nURL=${posUrl}\r\n`;

      const blob = new Blob([shortcutContent], { type: 'application/x-mswinurl;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'PharmaCore-POS-نقطة-البيع.url';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Could not auto-download shortcut:', e);
    }
  };

  const handleClick = async () => {
    // 1. Immediately trigger download of Windows Desktop shortcut icon
    downloadDesktopShortcut();

    // 2. If browser supports direct install prompt, trigger it
    if (isInstallable || (typeof window !== 'undefined' && window.__deferredPwaPrompt)) {
      try {
        await install();
      } catch {
        // ignore
      }
    }
    // 3. Open instructional modal
    setShowModal(true);
  };

  const openInNewWindow = () => {
    const url = window.location.href;
    window.open(url, '_blank');
  };

  return (
    <>
      {variant === 'navbar' ? (
        <button
          onClick={handleClick}
          className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer border-2 border-amber-300 animate-pulse"
          title="تثبيت نقطة البيع كأيقونة على سطح المكتب للويندوز"
        >
          <Monitor className="w-3.5 h-3.5 text-slate-950" />
          <span>تثبيت نقطة البيع كأيقونة على سطح المكتب 🖥️</span>
        </button>
      ) : variant === 'card' ? (
        <div className="bg-gradient-to-br from-emerald-900/40 via-teal-900/30 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-xs sm:text-sm flex items-center gap-2">
                <span>تثبيت البرنامج على أجهزة الكاشير والصيدلية</span>
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  سطح المكتب & تابلت
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                تثبيت بنقرة واحدة ليعمل التطبيق بشاشة كاملة وسرعة فائقة دون شريط المتصفح وبدعم الأوفلاين.
              </p>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="w-full sm:w-auto shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تثبيت التطبيق الآن</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleClick}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>تثبيت البرنامج (Desktop / Mobile App)</span>
        </button>
      )}

      {/* Complete Installation Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black">
                    طريقة تثبيت PharmaCore كبرنامج على الكمبيوتر (App)
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    يعمل كبرنامج ديسك توب مستقل على ويندوز ويثبت على شريط المهام (Taskbar)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
              
              {/* Windows Desktop Icon Direct Download Alert */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-amber-950/50 dark:to-slate-900 border-2 border-amber-500 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                      <span>تم تنزيل أيقونة سطح المكتب فوراً!</span>
                      <span className="bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-bold">.url File</span>
                    </div>
                    <div className="text-[11px] text-amber-900 dark:text-amber-200 mt-0.5">
                      تفقد مجلد <strong>التنزيلات (Downloads)</strong> على جهازك، وانقل الملف (PharmaCore-POS.url) لسطح المكتب للفتح المباشر.
                    </div>
                  </div>
                </div>
                <button
                  onClick={downloadDesktopShortcut}
                  className="w-full sm:w-auto shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل الأيقونة مجدداً</span>
                </button>
              </div>

              {/* Native direct install trigger if ready */}
              {isInstallable && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                  <div>
                    <div className="font-extrabold text-sm text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                      <span>متصفحك جاهز للتثبيت التلقائي بنقرة واحدة!</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                      اضغط على الزر ليفتح لك نظام ويندوز نافذة تأكيد التثبيت فوراً.
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await install();
                      setShowModal(false);
                    }}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
                  >
                    تثبيت الآن
                  </button>
                </div>
              )}

              {/* Direct Microsoft Edge 3-step Instructions */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-800/80 dark:to-slate-800 border-2 border-emerald-600/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-xs sm:text-sm">
                  <Monitor className="w-4 h-4 text-emerald-600" />
                  <span>طريقة التثبيت المباشرة في متصفحك (Microsoft Edge / Chrome):</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-800 dark:text-slate-200">
                  <div className="flex items-start gap-2.5 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                    <span className="leading-relaxed">
                      في أعلى يمين المتصفح، اضغط على زر <strong>القائمة (الثلاث نقاط •••)</strong> بجوار شريط العنوان.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                    <span className="leading-relaxed">
                      قف بالماوس على خيار <strong>تطبيقات (Apps)</strong>.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 bg-emerald-100 dark:bg-emerald-950/80 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                    <span className="leading-relaxed">
                      اضغط على <strong>"تثبيت هذا الموقع كتطبيق" (Install this site as an app)</strong> أو <strong>"تثبيت PharmaCore"</strong>.
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-600/10 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    ستظهر لك رسالة من ويندوز: اضغط <strong>تثبيت (Install)</strong>، وسيتم وضع أيقونة البرنامج فوراً على الديسك توب وشريط المهام السفلي!
                  </span>
                </div>
              </div>

              {/* Refresh Notice */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3">
                <span className="text-[11px] leading-relaxed">
                  💡 <strong>ملاحظة:</strong> قم بعمل <strong>تحديث للصفحة (F5 أو Refresh)</strong> الآن لتفعيل ملفات التثبيت السحابية وشهادة الأوفلاين فوراً.
                </span>
                <button
                  onClick={() => window.location.reload()}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition cursor-pointer"
                >
                  تحديث الصفحة (F5)
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                يدعم العمل بالكامل دون إنترنت بعد التثبيت
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
