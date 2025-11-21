
import React, { useState, useEffect, useRef } from 'react';
import { Download, ZoomIn, X, Rotate3D, Loader2, Image as ImageIcon, Printer, Shirt, Tag, Sparkles, Type, Layers, Zap, Ban, ArrowLeft, MoveHorizontal, Move, Plus, Minus, Users } from 'lucide-react';
import { GeneratedDesign, DesignViews, TextEffect } from '../types';
import { generateSpecificView, STYLES } from '../services/genai';

interface DesignCardProps {
  design: GeneratedDesign;
  onUpdateDesign: (id: string, updates: Partial<GeneratedDesign>) => void;
}

export const DesignCard: React.FC<DesignCardProps> = ({ design, onUpdateDesign }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [is360Loading, setIs360Loading] = useState(false);
  const [loadingEffect, setLoadingEffect] = useState(false);
  const [activeEffect, setActiveEffect] = useState<TextEffect>('NONE');
  
  // Rotation State
  const [rotationIndex, setRotationIndex] = useState(0); // 0=Front, 1=Right, 2=Back, 3=Left
  const [isDragging, setIsDragging] = useState(false);
  
  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const rotationOrder: (keyof DesignViews)[] = ['front', 'right', 'back', 'left'];
  const currentViewKey = rotationOrder[rotationIndex];
  const currentImage = design.views[currentViewKey];
  const hasPrintFiles = design.views.flatFront || design.views.flatBack;

  // Check if all rotation frames are available
  const is360Ready = rotationOrder.every(view => !!design.views[view]);

  // Zoom Handlers
  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel(prev => {
       const newLevel = prev - 0.5;
       if (newLevel <= 1) {
         setPanOffset({ x: 0, y: 0 }); // Reset pan when zooming out completely
         return 1;
       }
       return newLevel;
    });
  };

  // Handle Keyboard Shortcuts
  useEffect(() => {
    if (!isZoomed) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'Escape':
          setIsZoomed(false);
          break;
        case 'ArrowRight':
          if (zoomLevel === 1 && is360Ready) {
             setRotationIndex(prev => (prev + 1) % 4);
          }
          break;
        case 'ArrowLeft':
          if (zoomLevel === 1 && is360Ready) {
             setRotationIndex(prev => (prev - 1 + 4) % 4);
          }
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed, zoomLevel, is360Ready]);

  const handleGenerate360 = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Immediately open full screen mode for the experience
    setIsZoomed(true);

    if (is360Loading || is360Ready) return;

    setIs360Loading(true);
    try {
      const missingViews = rotationOrder.filter(view => !design.views[view]);
      // Use front view as reference for consistency. If front is missing (edge case), use current.
      const referenceView = design.views.front || currentImage; 

      // Create a copy of the current views to update incrementally
      const updatedViews: Partial<DesignViews> = {};

      await Promise.all(missingViews.map(async (view) => {
        const url = await generateSpecificView(
          design.concept,
          design.style,
          view,
          design.apparel,
          design.logo,
          activeEffect,
          design.modelGender,
          referenceView // Pass Reference
        );
        if (url) {
          updatedViews[view] = url;
        }
      }));

      onUpdateDesign(design.id, { views: { ...design.views, ...updatedViews } as DesignViews });
    } catch (e) {
      console.error("Failed to generate 360 views", e);
    } finally {
      setIs360Loading(false);
    }
  };

  const handleGeneratePrints = async () => {
    if (hasPrintFiles) return;
    
    setLoadingEffect(true);
    try {
      const [frontUrl, backUrl] = await Promise.all([
        generateSpecificView(
          design.concept,
          design.style,
          'flatFront',
          design.apparel,
          design.logo,
          activeEffect,
          design.modelGender
        ),
        generateSpecificView(
          design.concept,
          design.style,
          'flatBack',
          design.apparel,
          design.logo,
          activeEffect,
          design.modelGender
        )
      ]);

      onUpdateDesign(design.id, { 
        views: {
          ...design.views,
          flatFront: frontUrl,
          flatBack: backUrl
        }
      });
    } finally {
      setLoadingEffect(false);
    }
  };

  const handleEffectApply = async (effect: TextEffect) => {
    if (loadingEffect || is360Loading) return;
    setActiveEffect(effect);
    setLoadingEffect(true);
    
    try {
      const url = await generateSpecificView(
        design.concept, 
        design.style, 
        currentViewKey,
        design.apparel,
        design.logo,
        effect,
        design.modelGender,
        currentViewKey !== 'front' ? design.views.front : null
      );
      if (url) {
        onUpdateDesign(design.id, { views: { ...design.views, [currentViewKey]: url } as DesignViews });
      }
    } catch (e) {
       console.error("Failed to apply effect", e);
    } finally {
      setLoadingEffect(false);
    }
  };

  const handleToggleGender = async () => {
    if (loadingEffect || is360Loading) return;
    
    const newGender = design.modelGender === 'MALE' ? 'FEMALE' : 'MALE';
    setLoadingEffect(true);

    try {
      // Regenerate current view with new gender, using current image as reference design
      // This prompts the AI to "Swap body, keep shirt"
      const url = await generateSpecificView(
        design.concept,
        design.style,
        currentViewKey,
        design.apparel,
        design.logo,
        activeEffect,
        newGender,
        currentImage // Use current image as reference to keep design
      );

      if (url) {
        // We must reset other rotation views because they have the old model
        // Keep prints as they are independent of model
        const resetViews: DesignViews = {
          front: null,
          right: null,
          back: null,
          left: null,
          flatFront: design.views.flatFront,
          flatBack: design.views.flatBack,
          [currentViewKey]: url // Set the newly generated one
        };

        onUpdateDesign(design.id, { 
          modelGender: newGender, 
          views: resetViews 
        });
      }
    } catch (e) {
      console.error("Failed to toggle gender", e);
    } finally {
      setLoadingEffect(false);
    }
  };

  const handleDownload = (url: string | null, suffix: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `neural-graffiti-${design.id}-${suffix}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPackage = () => {
    if (design.views.flatFront) {
      handleDownload(design.views.flatFront, 'print-front');
    }
    if (design.views.flatBack) {
      setTimeout(() => {
        handleDownload(design.views.flatBack!, 'print-back');
      }, 500);
    }
  };

  // Drag Logic
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!is360Ready && zoomLevel === 1) return;
    setIsDragging(true);
    startX.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (zoomLevel > 1) {
      const dx = clientX - startX.current;
      const dy = clientY - startY.current;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      startX.current = clientX;
      startY.current = clientY;
    } else {
      if (!is360Ready) return;
      const diff = startX.current - clientX;
      const sensitivity = 50;
      if (Math.abs(diff) > sensitivity) {
        if (diff > 0) setRotationIndex((prev) => (prev + 1) % 4);
        else setRotationIndex((prev) => (prev - 1 + 4) % 4);
        startX.current = clientX;
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const textEffects: { id: TextEffect; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'NONE', label: 'Raw', icon: Ban, color: 'text-gray-400' },
    { id: 'HEAVY_OUTLINE', label: 'Outline', icon: Type, color: 'text-white' },
    { id: 'NEON_GLOW', label: 'Glow', icon: Sparkles, color: 'text-cyan-400' },
    { id: 'DROP_SHADOW', label: 'Shadow', icon: Layers, color: 'text-indigo-400' },
    { id: 'GLITCH', label: 'Glitch', icon: Zap, color: 'text-pink-500' },
  ];

  const styleLabel = STYLES[design.style]?.label || design.style;

  return (
    <>
      <div className="group relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-purple-500 transition-all duration-300 shadow-lg hover:shadow-purple-500/20 flex flex-col">
        
        <div 
          ref={containerRef}
          className={`aspect-square w-full overflow-hidden bg-gray-800 relative ${is360Ready ? 'cursor-ew-resize touch-none' : ''}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {(is360Loading || loadingEffect) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-900/80 z-30 backdrop-blur-sm">
              <Loader2 className="w-10 h-10 animate-spin mb-2 text-cyan-400" />
              <span className="font-code text-xs tracking-widest text-cyan-400 animate-pulse">
                {loadingEffect ? 'UPDATING MODEL...' : 'GENERATING 360° ANGLES...'}
              </span>
            </div>
          )}

          {currentImage ? (
             <img 
              src={currentImage} 
              alt={`${design.concept} - ${currentViewKey}`}
              className="w-full h-full object-cover pointer-events-none select-none"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
              <span className="font-code text-xs">RENDERING VIEW...</span>
            </div>
          )}

          {/* GPU Heatmap / Processing Unit Texture Overlay - Enhanced High Frequency */}
          {currentImage && !is360Loading && !loadingEffect && (
            <div className="absolute inset-0 pointer-events-none z-10 rounded-xl overflow-hidden">
               {/* Micro-Architecture Grid (High Frequency) */}
               <div className="absolute inset-0 opacity-30 mix-blend-color-dodge" 
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(56, 189, 248, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(56, 189, 248, 0.3) 1px, transparent 1px)
                      `,
                      backgroundSize: '4px 4px'
                    }} 
               />
               
               {/* Data Bus Lines */}
               <div className="absolute inset-0 opacity-20 mix-blend-overlay" 
                    style={{
                      backgroundImage: `
                        repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(236, 72, 153, 0.4) 49px, rgba(236, 72, 153, 0.4) 50px),
                        repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(236, 72, 153, 0.4) 49px, rgba(236, 72, 153, 0.4) 50px)
                      `,
                      backgroundSize: '50px 50px'
                    }} 
               />

               {/* Thermal Zones (Heat Map) */}
               <div className="absolute inset-0 opacity-40 mix-blend-soft-light"
                    style={{
                      background: `
                        radial-gradient(circle at 30% 20%, rgba(255, 50, 50, 0.6), transparent 40%),
                        radial-gradient(circle at 70% 80%, rgba(50, 100, 255, 0.6), transparent 40%),
                        radial-gradient(circle at 50% 50%, rgba(50, 255, 100, 0.4), transparent 50%)
                      `
                    }}
               />
               
               {/* Silicon Noise / Grain */}
               <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-screen"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
               />
            </div>
          )}

          {!is360Ready && !is360Loading && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
               <button className="pointer-events-none"></button>
            </div>
          )}

          <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 pointer-events-none">
            <div className="flex justify-between items-start">
              <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-code text-cyan-400 border border-cyan-900/50 shadow-lg">
                ANGLE: {rotationIndex * 90}° ({currentViewKey.toUpperCase()})
              </div>
              <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-code text-purple-400 border border-purple-900/50 flex items-center gap-1 shadow-lg">
                <Shirt className="w-3 h-3" />
                {design.apparel}
              </div>
            </div>

            {!is360Ready && !is360Loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleGenerate360}
                  className="bg-cyan-500/90 hover:bg-cyan-400 text-black font-bold py-3 px-6 rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.5)] transform hover:scale-105 transition-all backdrop-blur-sm"
                >
                  <Rotate3D className="w-5 h-5" />
                  <span>Generate 360° View</span>
                </button>
              </div>
            )}

            <div className="flex justify-between items-end pointer-events-auto">
               <div className="flex gap-2">
                 <button 
                  onClick={() => setIsZoomed(true)}
                  className="p-2 bg-gray-800/80 hover:bg-cyan-500 text-white rounded-lg transition-colors border border-gray-700 backdrop-blur-sm"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
               </div>

               {is360Ready && (
                 <div className="flex items-center gap-2 text-cyan-400/70 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-cyan-900/30">
                   <MoveHorizontal className="w-4 h-4 animate-pulse" />
                   <span className="text-[10px] font-code">DRAG TO ROTATE</span>
                 </div>
               )}
               
               <div className="w-8"></div>
            </div>
          </div>
        </div>
        
        <div className="w-full flex items-center px-2 py-2 bg-gray-950 border-b border-gray-800">
           <span className="text-[9px] font-code text-gray-500 uppercase whitespace-nowrap mr-2 flex-shrink-0">Text FX:</span>
           <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1">
             {textEffects.map((effect) => {
               const isActive = activeEffect === effect.id;
               const Icon = effect.icon;
               return (
                 <button
                    key={effect.id}
                    onClick={() => handleEffectApply(effect.id)}
                    disabled={loadingEffect}
                    className={`
                      flex-shrink-0 px-2 py-1 rounded flex items-center gap-1 text-[9px] font-code border transition-all whitespace-nowrap
                      ${isActive 
                        ? 'bg-gray-800 border-gray-600 text-white shadow-sm' 
                        : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'
                      }
                    `}
                    title={`Apply ${effect.label}`}
                 >
                   <Icon className={`w-3 h-3 ${isActive ? effect.color : ''}`} />
                   {effect.label}
                 </button>
               );
             })}
           </div>
        </div>

        <div className="p-4 bg-gray-950/50 flex-grow flex flex-col justify-end">
           <div className="flex justify-between items-end">
             <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-code text-purple-400 bg-purple-900/20 px-1.5 rounded border border-purple-900/50">
                    {styleLabel.toUpperCase()}
                  </span>
                  {design.logo && (
                     <span className="text-[10px] font-code text-yellow-400 bg-yellow-900/20 px-1.5 rounded border border-yellow-900/50 flex items-center gap-1">
                       <Tag className="w-3 h-3" /> BRANDED
                     </span>
                  )}
                </div>
                <p className="text-sm text-gray-200 font-medium truncate max-w-[180px]" title={design.concept}>
                  {design.concept}
                </p>
             </div>
           </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {isZoomed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
          
          <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
            <button
              onClick={() => setIsZoomed(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors border border-gray-700 font-code text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Gallery</span>
            </button>
            
            <button 
              onClick={() => setIsZoomed(false)}
              className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-red-500/20 transition-colors border border-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div 
            className={`w-full h-full flex flex-col items-center justify-center relative p-8 overflow-hidden ${zoomLevel > 1 ? 'cursor-move' : (is360Ready ? 'cursor-ew-resize' : '')}`}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
             {(is360Loading || loadingEffect) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-50 pointer-events-none">
                   <Loader2 className="w-16 h-16 animate-spin mb-4 text-cyan-400" />
                   <span className="font-code text-sm tracking-widest text-cyan-400 animate-pulse">
                      {loadingEffect ? 'UPDATING DESIGN...' : 'SYNTHESIZING 360° REALITY...'}
                   </span>
                </div>
             )}

             {currentImage && (
               <img 
                src={currentImage} 
                alt="Zoomed Design" 
                className={`max-w-full max-h-[80vh] object-contain rounded shadow-2xl border border-gray-800 select-none pointer-events-none transition-transform duration-100 ease-out ${is360Loading ? 'opacity-30' : ''}`}
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`
                }}
              />
             )}

            <div className="absolute bottom-8 w-full flex flex-col items-center pointer-events-none">
              <div className="flex items-center gap-4 mb-4 pointer-events-auto">
                 <h3 className="font-graffiti text-3xl text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500 drop-shadow-lg">
                  {currentViewKey.toUpperCase()} VIEW
                </h3>
                {/* Gender Toggle */}
                <button
                  onClick={handleToggleGender}
                  disabled={loadingEffect || is360Loading}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800/80 border border-gray-700 hover:bg-gray-700 transition-colors text-xs font-code text-white shadow-lg"
                  title={`Current Model: ${design.modelGender}`}
                >
                  <Users className="w-3 h-3 text-purple-400" />
                  <span>SWITCH MODEL ({design.modelGender === 'MALE' ? 'M' : 'F'})</span>
                </button>
              </div>

              <p className="font-code text-gray-400 text-sm mb-4 flex items-center justify-center gap-2 bg-black/50 px-3 py-1 rounded-full">
                 <Rotate3D className="w-4 h-4" />
                 Angle: {rotationIndex * 90}°
              </p>
              
              <div className="pointer-events-auto flex items-center gap-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-gray-800 mb-6 shadow-xl">
                <button 
                  onClick={handleZoomOut}
                  className={`p-2 rounded-full transition-colors ${zoomLevel <= 1 ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-gray-700'}`}
                  disabled={zoomLevel <= 1}
                  title="Zoom Out"
                >
                  <Minus className="w-5 h-5" />
                </button>
                
                <span className="font-code text-sm min-w-[4ch] text-center text-cyan-400 font-bold">{zoomLevel}x</span>
                
                <button 
                  onClick={handleZoomIn}
                  className={`p-2 rounded-full transition-colors ${zoomLevel >= 3 ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-gray-700'}`}
                  disabled={zoomLevel >= 3}
                  title="Zoom In"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {is360Ready && zoomLevel === 1 && (
                 <div className="text-cyan-500/70 text-[10px] font-code animate-pulse mb-4 flex items-center gap-2">
                   <MoveHorizontal className="w-3 h-3" /> DRAG TO ROTATE • ARROWS TO SPIN
                 </div>
              )}

               {zoomLevel > 1 && (
                 <div className="text-pink-500/70 text-[10px] font-code animate-pulse mb-4 flex items-center gap-2">
                   <Move className="w-3 h-3" /> DRAG TO PAN
                 </div>
              )}

              <div className="pointer-events-auto flex gap-4 flex-wrap justify-center">
                {!hasPrintFiles && (
                  <button 
                    onClick={handleGeneratePrints}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-code text-xs flex items-center gap-2 shadow-lg hover:shadow-purple-500/50 transition-all"
                  >
                    {loadingEffect ? <Loader2 className="w-3 h-3 animate-spin"/> : <Printer className="w-3 h-3"/>}
                    GENERATE HIGH-RES PRINT FILES
                  </button>
                )}
                
                {hasPrintFiles && (
                  <button 
                    onClick={handleDownloadPackage}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-code text-xs flex items-center gap-2 shadow-lg hover:shadow-green-500/50 transition-all"
                  >
                    <Download className="w-3 h-3"/>
                    DOWNLOAD PRINT PACKAGE (FRONT & BACK)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
