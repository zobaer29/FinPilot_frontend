"use client";

import { useEffect, useState } from "react";

interface ModelTrainingLoaderProps {
  title?: string;
  subtitle?: string;
  mode?: "training" | "inference" | "analyzing";
  modelName?: string;
}

export default function ModelTrainingLoader({
  title = "Training Self-Trained Machine Learning Pipeline",
  subtitle = "Optimizing scikit-learn models without 3rd-party LLMs",
  mode = "training",
  modelName = "SGDClassifier & LinearSVC",
}: ModelTrainingLoaderProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lossValue, setLossValue] = useState(0.842);
  const [accuracyValue, setAccuracyValue] = useState(72.5);
  const [epoch, setEpoch] = useState(1);

  const steps = [
    { name: "TF-IDF Vectorizer", detail: "Fitting n-gram vocabulary (1-3 words)", icon: "📊" },
    { name: "Loss Optimization", detail: "Minimizing log-loss with elastic-net penalty", icon: "⚡" },
    { name: "Hyperplane Tuning", detail: "Calibrating decision margins across classes", icon: "🎯" },
    { name: "Confidence Scoring", detail: "Computing Platt scaling probability vectors", icon: "📈" },
    { name: "Cross-Validation", detail: "Validating holdout test split metrics", icon: "✓" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      setEpoch((prev) => Math.min(prev + 1, 5));
      setLossValue((prev) => Math.max(0.084, +(prev * 0.65).toFixed(3)));
      setAccuracyValue((prev) => Math.min(96.8, +(prev + (96.8 - prev) * 0.45).toFixed(1)));
    }, 900);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-blue-200/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl animate-pulse-glow">
      {/* Background High-Tech Grid & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(21,94,239,0.35),rgba(255,255,255,0))]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#155eef] to-transparent" />

      {/* Header Info */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-300 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
          <span className="uppercase tracking-wider">
            {mode === "training" ? "Live ML Pipeline Active" : "Neural Tensor Inference"}
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-blue-400 font-mono">CPU Workers</span>
        </div>

        <h3 className="mt-4 text-xl sm:text-2xl font-black tracking-tight text-white">
          {title}
        </h3>
        <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-400">
          {subtitle}
        </p>
      </div>

      {/* Central Neural Visualizer & Orbit Animation */}
      <div className="relative my-8 flex items-center justify-center">
        {/* Outer Orbiting Ring */}
        <div className="absolute h-48 w-48 rounded-full border border-blue-500/20 border-dashed animate-orbit" />
        {/* Inner Counter-Orbiting Ring */}
        <div className="absolute h-36 w-36 rounded-full border border-purple-500/30 animate-orbit-reverse" />
        
        {/* Radar Pulse Effect */}
        <div className="absolute h-28 w-28 rounded-full bg-blue-500/10 animate-radar-wave" />

        {/* Central Model Core Node */}
        <div className="relative z-10 flex h-20 w-20 flex-col items-center justify-center rounded-2xl border border-blue-400/40 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-xl shadow-blue-500/30">
          <svg className="h-8 w-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-blue-100">AI Core</span>
        </div>

        {/* Left Synapse Node */}
        <div className="absolute left-4 sm:left-12 flex items-center gap-2 animate-float-node">
          <div className="h-3 w-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
          <span className="text-[11px] font-mono text-cyan-300 hidden sm:inline">Features [N=840]</span>
        </div>

        {/* Right Synapse Node */}
        <div className="absolute right-4 sm:right-12 flex items-center gap-2 animate-float-node" style={{ animationDelay: "1s" }}>
          <span className="text-[11px] font-mono text-purple-300 hidden sm:inline">Classes [K=6]</span>
          <div className="h-3 w-3 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50" />
        </div>
      </div>

      {/* Live Training Metrics Telemetry */}
      <div className="relative z-10 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4 backdrop-blur-md">
        <div className="text-center">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Epoch</p>
          <p className="mt-1 font-mono text-base sm:text-xl font-black text-blue-400">{epoch} / 5</p>
          <p className="text-[10px] text-slate-500">5-fold CV</p>
        </div>
        <div className="border-x border-white/10 text-center">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Training Loss</p>
          <p className="mt-1 font-mono text-base sm:text-xl font-black text-amber-400">{lossValue}</p>
          <p className="text-[10px] text-emerald-400">↓ Decreasing</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Accuracy</p>
          <p className="mt-1 font-mono text-base sm:text-xl font-black text-emerald-400">{accuracyValue}%</p>
          <p className="text-[10px] text-slate-500">Holdout split</p>
        </div>
      </div>

      {/* Pipeline Step Progress */}
      <div className="relative z-10 mt-6 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold text-slate-300">Pipeline Pipeline Progress</span>
          <span className="font-mono text-blue-400">{Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</span>
        </div>

        {/* Shimmer Progress Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Current Active Step Callout */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
          <span className="text-base">{steps[currentStepIndex].icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white">{steps[currentStepIndex].name}</p>
            <p className="text-[11px] text-slate-400 truncate">{steps[currentStepIndex].detail}</p>
          </div>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
      </div>

      {/* Model Metadata Tagline */}
      <div className="relative z-10 mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-slate-400">
        <span>Active Model: <strong className="text-white">{modelName}</strong></span>
        <span className="font-mono text-emerald-400">Zero Cloud LLMs</span>
      </div>
    </div>
  );
}
