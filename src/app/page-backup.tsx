'use client';

import { useState } from 'react';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-6xl font-light tracking-tight">
            Engelbert Huber
          </h1>
          <p className="text-xl text-slate-300">
            AI Engineering
          </p>
          <div className="space-y-4 text-lg text-slate-400">
            <p>No soy programador.</p>
            <p>No soy marketero.</p>
            <p>No soy otro más hablando de IA.</p>
          </div>
          <div className="pt-8">
            <button 
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              onClick={() => {
                window.open('https://calendly.com/engelbert-huber', '_blank');
              }}
            >
              Inicia la conversación
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}