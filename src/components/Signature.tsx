'use client';

export const Signature = () => {
  return (
    <div className="fixed bottom-6 left-6 z-50 opacity-60 hover:opacity-100 transition-opacity duration-300">
      <div className="flex items-center space-x-3">
        {/* EH Logo */}
        <div className="w-8 h-8 border border-white/20 rounded-sm flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <span className="text-xs font-light text-white/80 font-mono">EH</span>
        </div>
        
        {/* Signature Text */}
        <div className="text-xs text-white/60 font-light tracking-wide">
          <div>Designed by</div>
          <div className="gradient-crimson-text font-medium">Engelbert Huber</div>
        </div>
      </div>
    </div>
  );
};