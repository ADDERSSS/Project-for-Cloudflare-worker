export const CUSTOM_CSS = `
  /* === Core keyframes === */
  @keyframes slide-up {
    from { transform: translateY(24px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slide-down {
    from { transform: translateY(-12px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scale-in {
    from { transform: scale(0.92); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes scale-bounce {
    0% { transform: scale(0.9); opacity: 0; }
    60% { transform: scale(1.02); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes toast-in {
    from { transform: translateX(120%) scale(0.9); opacity: 0; }
    to { transform: translateX(0) scale(1); opacity: 1; }
  }
  @keyframes toast-out {
    from { transform: translateX(0) scale(1); opacity: 1; }
    to { transform: translateX(120%) scale(0.9); opacity: 0; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.5; }
    80%, 100% { transform: scale(2); opacity: 0; }
  }
  @keyframes gradient-shift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  @keyframes count-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* === Animation utilities === */
  .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-slide-down { animation: slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-fade-in { animation: fade-in 0.4s ease-out both; }
  .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-scale-bounce { animation: scale-bounce 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-toast-in { animation: toast-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-toast-out { animation: toast-out 0.3s ease-in both; }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-count-up { animation: count-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .animate-gradient { background-size: 200% 200%; animation: gradient-shift 6s ease infinite; }

  /* === Skeleton loading === */
  .skeleton {
    background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 8px;
  }
  .dark .skeleton {
    background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
    background-size: 200% 100%;
  }

  /* === Stagger delays (spring-based feel) === */
  .stagger-1 { animation-delay: 0.04s; }
  .stagger-2 { animation-delay: 0.08s; }
  .stagger-3 { animation-delay: 0.12s; }
  .stagger-4 { animation-delay: 0.16s; }
  .stagger-5 { animation-delay: 0.2s; }
  .stagger-6 { animation-delay: 0.24s; }
  .stagger-7 { animation-delay: 0.28s; }
  .stagger-8 { animation-delay: 0.32s; }

  /* === Glass morphism === */
  .glass {
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
  }

  /* === Card interactions === */
  .card-hover {
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px -12px rgba(0,0,0,0.1);
  }
  .dark .card-hover:hover {
    box-shadow: 0 20px 40px -12px rgba(0,0,0,0.4);
  }

  /* === Focus visible ring === */
  .focus-ring:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.4);
  }

  /* === Smooth scrollbar === */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
  .dark ::-webkit-scrollbar-thumb { background: #4b5563; }
  .dark ::-webkit-scrollbar-thumb:hover { background: #6b7280; }

  /* === Line clamp === */
  .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

  /* === Gradient text === */
  .gradient-text {
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* === Subtle mesh background for hero areas === */
  .mesh-bg {
    background-image:
      radial-gradient(at 27% 37%, rgba(99,102,241,0.08) 0, transparent 50%),
      radial-gradient(at 97% 21%, rgba(139,92,246,0.06) 0, transparent 50%),
      radial-gradient(at 52% 99%, rgba(168,85,247,0.05) 0, transparent 50%),
      radial-gradient(at 10% 29%, rgba(59,130,246,0.05) 0, transparent 50%);
  }
  .dark .mesh-bg {
    background-image:
      radial-gradient(at 27% 37%, rgba(99,102,241,0.12) 0, transparent 50%),
      radial-gradient(at 97% 21%, rgba(139,92,246,0.08) 0, transparent 50%),
      radial-gradient(at 52% 99%, rgba(168,85,247,0.06) 0, transparent 50%),
      radial-gradient(at 10% 29%, rgba(59,130,246,0.06) 0, transparent 50%);
  }

  [x-cloak] { display: none !important; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;
