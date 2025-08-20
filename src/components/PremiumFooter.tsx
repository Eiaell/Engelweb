'use client';

export const PremiumFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-20 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
          
          {/* Left: Brand */}
          <div className="space-y-4">
            <div className="text-display gradient-crimson-text text-2xl">
              EH
            </div>
            <p className="text-body text-white/60">
              AI Engineering
            </p>
            <div className="eh-monogram">
              Engelbert Huber Quequejana
            </div>
          </div>

          {/* Center: Navigation */}
          <div className="space-y-4">
            <h3 className="text-caption text-white/80">NAVEGACIÓN</h3>
            <ul className="space-y-2 text-body text-white/60">
              <li><a href="#identity" className="hover:eh-crimson transition-colors">Identidad</a></li>
              <li><a href="#origin" className="hover:eh-crimson transition-colors">Origen</a></li>
              <li><a href="#mission" className="hover:eh-crimson transition-colors">Misión</a></li>
              <li><a href="#present" className="hover:eh-crimson transition-colors">Presente</a></li>
              <li><a href="#vision" className="hover:eh-crimson transition-colors">Visión</a></li>
              <li><a href="#connect" className="hover:eh-crimson transition-colors">Conectar</a></li>
            </ul>
          </div>

          {/* Right: Contact */}
          <div className="space-y-4">
            <h3 className="text-caption text-white/80">CONECTAR</h3>
            <div className="space-y-2 text-body text-white/60">
              <p>Puno, Perú</p>
              <p>Appenweier, Alemania</p>
              <p className="eh-gold">Digital, En todas partes</p>
            </div>
            <button className="btn-premium mt-4">
              Iniciar conversación
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-white/40 text-sm">
          <p>© {currentYear} Engelbert Huber. Todos los derechos reservados.</p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="eh-monogram">EH—{String(currentYear).slice(-2)}</span>
            <div className="w-1 h-1 bg-white/20 rounded-full" />
            <span>Hecho con sistemas invisibles</span>
          </div>
        </div>
      </div>

      {/* Subtle background pattern */}
      <div className="absolute inset-0 eh-pattern opacity-20 pointer-events-none" />
    </footer>
  );
};