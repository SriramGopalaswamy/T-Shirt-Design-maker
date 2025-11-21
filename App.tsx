
import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { DesignCard } from './components/DesignCard';
import { generateInitialDesigns, STYLES } from './services/genai';
import { GeneratedDesign, GeneratorStatus, DesignViews, ApparelType, LogoPlacement, LogoSize, LogoConfig } from './types';
import { Wand2, SprayCan, Loader2, Zap, Layers, Settings2, PaintBucket, Shirt, Upload, Trash2, Search } from 'lucide-react';

// Comprehensive dictionary for auto-suggestions
const CONCEPT_DICTIONARY = [
  "Neural Networks", "Gradient Descent", "Backpropagation", "Eigenvalues & Eigenvectors",
  "Fourier Transform", "Navier-Stokes Equations", "Schrödinger Equation", "Maxwell's Equations",
  "General Relativity", "Quantum Entanglement", "Chaos Theory", "Fractal Geometry",
  "Voronoi Tesselation", "Transformer Architecture", "Large Language Model",
  "Convolutional Network", "Recurrent Neural Network", "Fibonacci Sequence", "Golden Ratio",
  "Turing Machine", "Cellular Automata", "Conway's Game of Life", "Monte Carlo Simulation",
  "Bayesian Inference", "Markov Chains", "Entropy & Information Theory", "Fluid Dynamics",
  "String Theory", "Dark Matter Topology", "Riemann Hypothesis", "Euler's Identity",
  "Heisenberg Uncertainty Principle", "Tensor Calculus", "Graph Theory", "Double Slit Experiment",
  "Superposition", "Event Horizon", "Cybernetics", "Genetic Algorithms", "Reinforcement Learning"
];

function App() {
  const [concept, setConcept] = useState('Neural Networks');
  const [variationCount, setVariationCount] = useState(3);
  const [selectedStyle, setSelectedStyle] = useState<string>('NEURAL_GRAFFITI');
  
  // Suggestion State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // New State Controls
  const [apparelType, setApparelType] = useState<ApparelType>('TSHIRT');
  const [logoData, setLogoData] = useState<string | null>(null);
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>('LEFT_CHEST');
  const [logoSize, setLogoSize] = useState<LogoSize>('MEDIUM');

  const [designs, setDesigns] = useState<GeneratedDesign[]>([]);
  const [status, setStatus] = useState<GeneratorStatus>(GeneratorStatus.IDLE);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConcept(value);

    if (value.length > 1) {
      const filtered = CONCEPT_DICTIONARY.filter(term => 
        term.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 6); // Limit to 6 suggestions
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (term: string) => {
    setConcept(term);
    setShowSuggestions(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Max 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    setLogoData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!concept.trim()) return;
    setShowSuggestions(false);
    
    setStatus(GeneratorStatus.GENERATING);
    
    const logoConfig: LogoConfig | null = logoData ? {
      data: logoData,
      placement: logoPlacement,
      size: logoSize
    } : null;

    try {
      // Generate initial front views with selected style
      const results = await generateInitialDesigns(
        concept, 
        variationCount, 
        selectedStyle,
        apparelType,
        logoConfig
      );
      
      if (results.length === 0) {
        setStatus(GeneratorStatus.ERROR);
        return;
      }

      const newDesigns: GeneratedDesign[] = results.map((item) => ({
        id: Math.random().toString(36).substring(7),
        concept: item.concept,
        style: item.style,
        apparel: apparelType,
        logo: logoConfig,
        views: {
          front: item.frontUrl,
          right: null,
          back: null,
          left: null,
          flatFront: null,
          flatBack: null
        },
        timestamp: Date.now(),
        modelGender: item.modelGender
      }));

      setDesigns(prev => [...newDesigns, ...prev]);
      setStatus(GeneratorStatus.SUCCESS);
      
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (error) {
      console.error(error);
      setStatus(GeneratorStatus.ERROR);
    }
  };

  const handleUpdateDesign = (id: string, updates: Partial<GeneratedDesign>) => {
    setDesigns(prev => prev.map(d => {
      if (d.id === id) {
        const updatedViews = updates.views 
          ? { ...d.views, ...updates.views } 
          : d.views;

        return {
          ...d,
          ...updates,
          views: updatedViews
        };
      }
      return d;
    }));
  };

  const predefinedConcepts = [
    "Gradient Descent",
    "Transformers & Attention",
    "Backpropagation",
    "Eigenvectors"
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
      
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12 z-10">
        
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 font-code text-sm mb-4">
            <Zap className="w-4 h-4" />
            <span>POWERED BY NANOBANANA (GEMINI 2.5 FLASH IMAGE)</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            Wear the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Mathematics</span> of the Future.
          </h2>
          
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Synthesize mathematical concepts into premium streetwear. 
            Configure apparel, upload your brand, and let AI generate the art.
          </p>
        </section>

        {/* Controls Section */}
        <section className="max-w-5xl mx-auto w-full bg-gray-900/60 p-6 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-sm">
          
          <div className="flex flex-col gap-8">
            
            {/* Main Input with Suggestions */}
            <div className="relative" ref={suggestionsRef}>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <SprayCan className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                value={concept}
                onChange={handleInputChange}
                onFocus={() => {
                  if (suggestions.length > 0 && concept.length > 1) setShowSuggestions(true);
                }}
                placeholder="Enter Concept: e.g. 'Maxwell Equations in Neon'"
                className="block w-full pl-12 pr-4 py-4 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-code text-lg shadow-inner"
                disabled={status === GeneratorStatus.GENERATING}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                autoComplete="off"
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 text-[10px] text-gray-400 font-code uppercase tracking-wider flex items-center gap-2">
                    <Search className="w-3 h-3" /> Suggested Concepts
                  </div>
                  {suggestions.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSuggestion(term)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-purple-900/20 hover:text-white font-code transition-colors border-b border-gray-800 last:border-0 flex items-center justify-between group"
                    >
                      <span>{term}</span>
                      <span className="opacity-0 group-hover:opacity-100 text-xs text-purple-400 transform translate-x-2 group-hover:translate-x-0 transition-all">
                        SELECT
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Style & Apparel */}
              <div className="space-y-6">
                
                {/* Style Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <PaintBucket className="w-4 h-4" />
                    <span className="text-xs font-code uppercase">Aesthetic Style</span>
                  </div>
                  <select 
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-3 font-code"
                  >
                    {Object.entries(STYLES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                {/* Apparel Selection */}
                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-gray-400">
                    <Shirt className="w-4 h-4" />
                    <span className="text-xs font-code uppercase">Garment Type</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['TSHIRT', 'POLO', 'HOODIE'] as ApparelType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setApparelType(type)}
                        className={`py-3 px-2 rounded-lg font-code text-xs font-bold transition-all border ${
                          apparelType === type 
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.3)]' 
                          : 'bg-gray-950 border-gray-700 text-gray-500 hover:bg-gray-800'
                        }`}
                      >
                        {type === 'TSHIRT' ? 'TEE' : type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count Selection */}
                 <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Settings2 className="w-4 h-4" />
                    <span className="text-xs font-code uppercase">Variations (Default: 3)</span>
                  </div>
                  <div className="flex items-center gap-2 h-[46px]">
                    {[1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        onClick={() => setVariationCount(num)}
                        className={`flex-1 h-full rounded-lg font-code text-sm font-bold transition-all border ${
                          variationCount === num 
                          ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]' 
                          : 'bg-gray-950 border-gray-700 text-gray-500 hover:bg-gray-800 hover:border-gray-600'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Branding */}
              <div className="bg-gray-950/50 p-5 rounded-xl border border-gray-800 flex flex-col gap-4">
                 <div className="flex items-center justify-between text-gray-400">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span className="text-xs font-code uppercase">Brand Logo (Optional)</span>
                    </div>
                    {logoData && (
                      <button onClick={clearLogo} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>

                  {!logoData ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-700 hover:border-cyan-500 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                    >
                      <Upload className="w-8 h-8 text-gray-600 group-hover:text-cyan-500 mb-2 transition-colors" />
                      <span className="text-xs text-gray-500 group-hover:text-gray-300 font-code">Click to upload logo (PNG/JPG)</span>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleLogoUpload}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-gray-800 rounded p-2 flex items-center justify-center border border-gray-700">
                        <img src={logoData} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                           <label className="text-[10px] text-gray-500 font-code block mb-1">PLACEMENT</label>
                           <select 
                              value={logoPlacement}
                              onChange={(e) => setLogoPlacement(e.target.value as LogoPlacement)}
                              className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded p-2 font-code"
                            >
                              <option value="LEFT_CHEST">Left Chest</option>
                              <option value="RIGHT_CHEST">Right Chest</option>
                              <option value="CENTER_CHEST">Center Chest</option>
                              <option value="LEFT_SLEEVE">Left Sleeve</option>
                              <option value="RIGHT_SLEEVE">Right Sleeve</option>
                              <option value="BACK_NECK">Back Neck</option>
                              <option value="CENTER_BACK">Center Back</option>
                            </select>
                        </div>
                         <div>
                           <label className="text-[10px] text-gray-500 font-code block mb-1">SIZE</label>
                           <select 
                              value={logoSize}
                              onChange={(e) => setLogoSize(e.target.value as LogoSize)}
                              className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded p-2 font-code"
                            >
                              <option value="SMALL">Small (Subtle)</option>
                              <option value="MEDIUM">Medium (Standard)</option>
                              <option value="LARGE">Large (Bold)</option>
                            </select>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500 leading-relaxed">
                    Uploading a logo will instruct the AI to integrate your brand mark into the generated design at the specified location.
                  </div>
              </div>

            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={status === GeneratorStatus.GENERATING || !concept.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-4 rounded-xl font-bold transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-4"
            >
              {status === GeneratorStatus.GENERATING ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Synthesizing {variationCount} Designs...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>Generate {variationCount} Variations</span>
                </>
              )}
            </button>

          </div>

          {/* Suggestions */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center sm:justify-start items-center">
            <span className="text-xs text-gray-500 font-code mr-2">TRY:</span>
            {predefinedConcepts.map((item) => (
              <button
                key={item}
                onClick={() => setConcept(item)}
                className="px-3 py-1 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500/50 text-xs font-code text-cyan-400 transition-all"
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {/* Results Grid */}
        <section ref={bottomRef} className="w-full pb-20">
           {designs.length > 0 && (
             <div className="flex items-center gap-4 mb-8">
               <div className="h-px bg-gray-800 flex-1"></div>
               <div className="flex items-center gap-2 text-gray-400">
                 <Layers className="w-4 h-4" />
                 <h3 className="text-xl font-graffiti">GENERATED COLLECTION</h3>
               </div>
               <div className="h-px bg-gray-800 flex-1"></div>
             </div>
           )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {designs.map((design) => (
              <DesignCard 
                key={design.id} 
                design={design} 
                onUpdateDesign={handleUpdateDesign}
              />
            ))}
          </div>
          
          {status === GeneratorStatus.ERROR && (
            <div className="text-center p-8 bg-red-900/10 border border-red-900/50 rounded-xl mt-8">
              <p className="text-red-400 font-code">ERROR: SYSTEM OVERLOAD. PLEASE RETRY.</p>
            </div>
          )}
        </section>
      </main>
      
      <footer className="border-t border-gray-900 py-8 text-center">
        <p className="text-gray-600 text-sm font-code">
          &copy; 2025 NeuralGraffiti. Generated with Gemini 2.5 Flash.
        </p>
      </footer>
    </div>
  );
}

export default App;
