import React, { useEffect, useState } from 'react';
import { Snowflake, Sparkles } from 'lucide-react';

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
    const holdTimer = window.setTimeout(() => setStage('hold'), 80);
    const exitTimer = window.setTimeout(() => setStage('exit'), 2100);
    const doneTimer = window.setTimeout(() => onComplete(), 2550);
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
      aria-label="OC20 Utility — Infinity Sheets Intro"
      className={`fixed inset-0 z-[80] flex flex-col items-center justify-center cursor-pointer select-none transition-opacity duration-500 ${
        stage === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 38%, rgba(56, 189, 248, 0.16) 0%, rgba(14, 28, 48, 0.96) 52%, rgba(7, 13, 24, 0.99) 100%)',
        backdropFilter: 'blur(28px)',
      }}
    >
      {/* Subtle Ambient Winter Frost Orbs */}
      <div className="pointer-events-none absolute -top-20 left-1/4 w-80 h-80 rounded-full bg-sky-400/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" />

      {/* Center Minimal Apple-Style Animated Brand Card */}
      <div
        className={`relative flex flex-col items-center text-center px-8 py-7 rounded-3xl lavish-glass-dark transition-all duration-700 ${
          stage === 'enter'
            ? 'scale-95 opacity-0 translate-y-3'
            : stage === 'hold'
              ? 'scale-100 opacity-100 translate-y-0'
              : 'scale-105 opacity-0 -translate-y-2'
        }`}
      >
        {/* Top Subtle Winter Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-400/10 border border-sky-300/25 text-sky-200 text-[10px] font-semibold tracking-widest uppercase mb-4">
          <Snowflake size={11} className="text-sky-300 animate-spin" style={{ animationDuration: '9s' }} />
          <span>OC20 Utility Tools</span>
        </div>

        {/* Glowing OC20 Logo Pill */}
        <div className="relative group mb-4">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-sky-400/30 via-blue-500/25 to-amber-400/30 blur-xl opacity-80" />
          <div className="relative flex items-center justify-center px-6 py-3.5 rounded-2xl bg-white shadow-[0_12px_36px_rgba(14,165,233,0.35)] ring-1 ring-white/80">
            <img
              src="./brand-logo.png"
              alt="OC20 Logo"
              className="h-11 sm:h-12 w-auto object-contain block"
            />
          </div>
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
          OC2O UTILITY — INFINITY SHEETS
        </h1>
        <p className="mt-1 text-xs text-sky-200/80 font-medium">
          Infinite Canvas · Visio Flows · Interactive Math · LLM Code Studio
        </p>

        {/* Animated Progress Shimmer Line */}
        <div className="mt-5 w-44 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-teal-300 transition-all duration-[2000ms] ease-out"
            style={{ width: stage === 'enter' ? '12%' : '100%' }}
          />
        </div>

        {/* Official Website Attribution Footer */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-300">
          <Sparkles size={11} className="text-sky-300" />
          <span>From</span>
          <span className="font-semibold text-white">OC20 UTILITY TOOLS</span>
          <span className="opacity-40">·</span>
          <a
            href="https://oc2o.co"
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-4"
          >
            OC2O.CO
          </a>
        </div>
      </div>
    </div>
  );
};
