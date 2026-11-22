import React, { useEffect, useState } from 'react';

interface OC20IntroAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const OC20IntroAnimation: React.FC<OC20IntroAnimationProps> = ({
  isVisible,
  onComplete,
}) => {
  const [stage, setStage] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    if (!isVisible) return;
    setStage('enter');
    const holdTimer = window.setTimeout(() => setStage('hold'), 60);
    const exitTimer = window.setTimeout(() => setStage('exit'), 1150);
    const doneTimer = window.setTimeout(() => onComplete(), 1500);
    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      onClick={onComplete}
      role="dialog"
      aria-label="OC20 Utility — Infinity Sheets"
      className={`fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#141921] cursor-pointer select-none transition-opacity duration-300 ${
        stage === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div
        className={`flex flex-col items-center text-center px-6 transition-all duration-500 ${
          stage === 'enter'
            ? 'opacity-0 translate-y-1.5'
            : stage === 'hold'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-1'
        }`}
      >
        <div className="px-4 py-2 rounded-lg bg-white border border-black/5 mb-4">
          <img
            src="./brand-logo.png"
            alt="OC20"
            className="h-9 w-auto object-contain block"
          />
        </div>

        <h1 className="text-sm font-semibold tracking-wide text-[#f2f2f7]">
          OC2O UTILITY · INFINITY SHEETS
        </h1>

        <div className="w-12 h-px bg-white/15 my-3" />

        <div className="flex items-center gap-2 text-[11px] text-[#98a2b3]">
          <span>OC20 Utility Tools</span>
          <span className="opacity-40">·</span>
          <a
            href="https://oc2o.co"
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[#cbd5e1] hover:text-white underline underline-offset-4"
          >
            oc2o.co
          </a>
        </div>
      </div>
    </div>
  );
};
