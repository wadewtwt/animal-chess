import React from 'react';

export const ProductEmblem: React.FC = () => {
  return (
    <div className="relative w-76 h-76 sm:w-85 sm:h-85 flex items-center justify-center animate-fade-in select-none">
      {/* 1. Tropical Jungle Floating Leaves & Vines Backdrop wrapping the frame */}
      <div className="absolute inset-0 pointer-events-none scale-105 z-0">
        {/* Top-left lush overhead palm leaf */}
        <div className="absolute top-0 -left-6 w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-700 rounded-full opacity-40 blur-sm transform rotate-45" />
        <div className="absolute -top-4 left-6 w-14 h-14 bg-gradient-to-br from-emerald-300 to-green-800 rounded-full opacity-35 blur-sm" />
        
        {/* Bottom-left surrounding tropical foliage leaves */}
        <div className="absolute -bottom-2 -left-4 w-18 h-18 bg-green-500 rounded-tr-[3.5rem] transform -rotate-12 opacity-80" />
        <div className="absolute -bottom-4 left-4 w-12 h-12 bg-green-700 rounded-tr-[2.5rem] transform rotate-12 opacity-85" />
        
        {/* Bottom-right surrounding tropical foliage leaves */}
        <div className="absolute -bottom-2 -right-4 w-18 h-18 bg-emerald-500 rounded-tl-[3.5rem] transform rotate-12 opacity-80" />
        <div className="absolute -bottom-4 right-4 w-12 h-12 bg-emerald-700 rounded-tl-[2.5rem] transform -rotate-12 opacity-85" />
        
        {/* Side decorative leaf layers */}
        <div className="absolute top-1/4 -left-6 w-8 h-16 bg-green-600 rounded-r-full transform -rotate-45 opacity-70" />
        <div className="absolute top-1/4 -right-6 w-8 h-16 bg-emerald-600 rounded-l-full transform rotate-45 opacity-70" />
        <div className="absolute top-1/2 -right-6 w-10 h-14 bg-green-500 rounded-l-full transform rotate-12 opacity-60" />
      </div>

      {/* 2. Medallion Outer Carved Wooden/Golden Frame */}
      <div 
        className="w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-[#0a3520] relative flex items-center justify-center p-2 z-10"
        style={{
          boxShadow: '0 20px 45px rgba(0,0,0,0.65), inset 0 2px 20px rgba(255,255,255,0.15)',
          border: '8px solid rgb(212, 140, 4)', // Beautiful golden-brown wood border
        }}
      >
        {/* Golden Inner Ring Lining */}
        <div className="absolute inset-0 rounded-full border-3 border-yellow-400 opacity-90 pointer-events-none z-10" />
        <div className="absolute inset-1 rounded-full border border-dashed border-yellow-300/30 pointer-events-none z-10" />

        {/* 3. Medallion Inner Background (Lush jungle landscape, stream & bridge) */}
        <div className="absolute inset-1.5 rounded-full overflow-hidden bg-gradient-to-b from-[#1b5e3a] via-[#093c20] to-[#041e11] z-0">
          {/* Diagnostic high-contrast sun rays shining down */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-grid-pattern">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-300 via-transparent to-transparent mix-blend-overlay rotate-12 origin-top-left" />
          </div>

          {/* Magical forest fog/light beams overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 via-transparent to-emerald-400/10 pointer-events-none" />

          {/* Deep Forest Canopy Shadow top edge */}
          <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-[#02140b] to-transparent opacity-80" />

          {/* Visual Blue Stream winding through from center-back to center-front */}
          <svg className="absolute inset-0 w-full h-full opacity-70 z-0 scale-102" viewBox="0 0 200 200" fill="none">
            {/* Stream outer banks shadow */}
            <path 
              d="M100 70 Q115 105 85 130 T105 200" 
              stroke="#031e13" 
              strokeWidth="20" 
              strokeLinecap="round" 
            />
            {/* Dark Water flow layer */}
            <path 
              d="M100 70 Q115 105 85 130 T105 200" 
              stroke="#01579b" 
              strokeWidth="14" 
              strokeLinecap="round" 
            />
            {/* Bright Cyan Water highlights and ripples */}
            <path 
              d="M100 71 Q115 104 85 129 T105 200" 
              stroke="#00e5ff" 
              strokeWidth="6" 
              strokeLinecap="round" 
              strokeDasharray="14, 25"
              className="animate-pulse"
            />
            {/* Shimmer line */}
            <path 
              d="M100 71 Q115 104 85 129 T105 200" 
              stroke="#ffffff" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeDasharray="4, 16"
            />
          </svg>

          {/* Tiny wooden bridge spanning over the stream in the core center */}
          <div className="absolute top-[110px] left-1/2 -translate-x-1/2 w-14 h-5 bg-[#795548] border-2 border-[#3e2723] rounded-md shadow-md z-1">
            {/* Planks styling lines */}
            <div className="flex h-full w-full justify-around items-center px-1">
              <div className="h-full w-0.5 bg-[#3e2723]" />
              <div className="h-full w-0.5 bg-[#3e2723]" />
              <div className="h-full w-0.5 bg-[#3e2723]" />
              <div className="h-full w-0.5 bg-[#3e2723]" />
              <div className="h-full w-0.5 bg-[#3e2723]" />
            </div>
            {/* Bridge handrail dots */}
            <div className="absolute -top-1.5 left-0.5 w-1 h-1.5 bg-[#5d4037] border border-black rounded-sm" />
            <div className="absolute -top-1.5 right-0.5 w-1 h-1.5 bg-[#5d4037] border border-black rounded-sm" />
            <div className="absolute -bottom-1.5 left-0.5 w-1 h-1.5 bg-[#5d4037] border border-black rounded-sm" />
            <div className="absolute -bottom-1.5 right-0.5 w-1 h-1.5 bg-[#5d4037] border border-black rounded-sm" />
          </div>

          {/* 4. Peripheral Arenas: Animal Clay/Stone Pedestals & Label Seals */}
          
          {/* LION (狮) — TOP CENTER */}
          <div className="absolute top-[8px] left-[106px] flex flex-col items-center group z-10">
            {/* Cylindrical Cracked Stone Base */}
            <div className="w-13 h-11 bg-gradient-to-b from-[#e3dac9] to-[#bfb49e] border border-[#a69a84] rounded-full shadow-md flex flex-col justify-between items-center overflow-hidden py-1 relative">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-white/40 rounded-full" />
              <span className="text-xl leading-none z-10 drop-shadow-md">🦁</span>
            </div>
            {/* Circular Name Plate Seal attached over pedestal */}
            <span className="text-[7.5px] font-black text-amber-100 bg-[#795548] border border-amber-300/40 px-2 py-0.5 rounded-full -mt-2 z-20 shadow-sm leading-none flex items-center justify-center">
              狮
            </span>
          </div>

          {/* TIGER (虎) — TOP LEFT */}
          <div className="absolute top-[18px] left-[32px] flex flex-col items-center z-10">
            <div className="w-12 h-10 bg-gradient-to-b from-[#e8e0cc] to-[#c2b59b] border border-[#a89b83] rounded-full shadow-md flex flex-col justify-between items-center py-1 relative">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-white/45 rounded-full" />
              <span className="text-lg leading-none z-10">🐯</span>
            </div>
            <span className="text-[7.5px] font-black text-amber-100 bg-[#795548] border border-amber-300/40 px-1.5 py-0.5 rounded-full -mt-2.5 z-20 shadow-sm leading-none flex items-center justify-center">
              虎
            </span>
          </div>

          {/* WOLF (狼) — TOP RIGHT */}
          <div className="absolute top-[18px] right-[32px] flex flex-col items-center z-10">
            <div className="w-12 h-10 bg-gradient-to-b from-[#e8e0cc] to-[#c2b59b] border border-[#a89b83] rounded-full shadow-md flex flex-col justify-between items-center py-1 relative">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-white/45 rounded-full" />
              <span className="text-lg leading-none z-10">🐺</span>
            </div>
            <span className="text-[7.5px] font-black text-amber-100 bg-[#795548] border border-amber-300/40 px-1.5 py-0.5 rounded-full -mt-2.5 z-20 shadow-sm leading-none flex items-center justify-center">
              狼
            </span>
          </div>

          {/* DOG (狗) — MIDDLE LEFT */}
          <div className="absolute top-[68px] left-[6px] flex flex-col items-center z-10">
            <div className="w-12 h-10 bg-gradient-to-b from-[#e8e0cc] to-[#c2b59b] border border-[#a89b83] rounded-full shadow-md flex flex-col justify-between items-center py-1 relative">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-white/45 rounded-full" />
              <span className="text-lg leading-none z-10">🐶</span>
            </div>
            <span className="text-[7.5px] font-black text-amber-100 bg-[#795548] border border-amber-300/40 px-1.5 py-0.5 rounded-full -mt-2.5 z-20 shadow-sm leading-none">
              狗
            </span>
          </div>

          {/* CAT (猫) — MIDDLE RIGHT */}
          <div className="absolute top-[68px] right-[6px] flex flex-col items-center z-10">
            <div className="w-12 h-10 bg-gradient-to-b from-[#e8e0cc] to-[#c2b59b] border border-[#a89b83] rounded-full shadow-md flex flex-col justify-between items-center py-1 relative">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-white/45 rounded-full" />
              <span className="text-lg leading-none z-10">🐱</span>
            </div>
            <span className="text-[7.5px] font-black text-amber-100 bg-[#795548] border border-amber-300/40 px-1.5 py-0.5 rounded-full -mt-2.5 z-20 shadow-sm leading-none">
              猫
            </span>
          </div>

          {/* LEOPARD (豹) — BOTTOM LEFT */}
          <div className="absolute bottom-[44px] left-[20px] flex flex-col items-center z-10">
            <div className="w-12 h-10 bg-gradient-to-b from-[#e8e0cc] to-[#c2b59b] border border-[#a89b83] rounded-full shadow-md flex flex-col justify-between items-center py-1 relative">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-white/45 rounded-full" />
              <span className="text-lg leading-none z-10">🐆</span>
            </div>
            <span className="text-[7.5px] font-black text-amber-100 bg-[#795548] border border-amber-300/40 px-1.5 py-0.5 rounded-full -mt-2.5 z-20 shadow-sm leading-none">
              豹
            </span>
          </div>

          {/* 5. Center Core Battle Match-up Characters (Elephant VS Mouse) */}

          {/* GIANT BLUE ELEPHANT (象) — CENTER LEFT STAR */}
          <div className="absolute left-[36px] top-[110px] flex flex-col items-center z-20 transform animate-bounce [animation-duration:3.2s]">
            {/* Special Large Pedestal Base */}
            <div className="w-18 h-12 bg-gradient-to-b from-[#e8dfc7] to-[#bfb297] border-2 border-[#948770] rounded-full shadow-lg flex flex-col justify-center items-center py-1 relative">
              <div className="absolute top-0 inset-x-1.5 h-1.5 bg-white/40 rounded-full" />
              
              {/* Cute 3D styled elephant layout */}
              <span className="text-4xl leading-none select-none z-10 drop-shadow-xl transform -scale-x-100 rotate-3">
                🐘
              </span>
            </div>

            {/* Blue character stamp badge with "象" label */}
            <div className="absolute -bottom-2 -right-1.5 bg-[#0d47a1] text-white border-2 border-[#90caf9] font-black text-[9px] rounded-full w-5 h-5 flex items-center justify-center shadow-md animate-pulse">
              象
            </div>
          </div>

          {/* INTELLIGENT ORANGE MOUSE (鼠) — CENTER RIGHT STAR */}
          <div className="absolute right-[36px] top-[110px] flex flex-col items-center z-20 transform animate-bounce [animation-duration:2.7s]">
            {/* Special Large Pedestal Base */}
            <div className="w-18 h-12 bg-gradient-to-b from-[#e8dfc7] to-[#bfb297] border-2 border-[#948770] rounded-full shadow-lg flex flex-col justify-center items-center py-1 relative">
              <div className="absolute top-0 inset-x-1.5 h-1.5 bg-white/40 rounded-full" />
              
              {/* Clever mouse model */}
              <span className="text-4xl leading-none select-none z-10 drop-shadow-xl transform rotate-3">
                🐭
              </span>
            </div>

            {/* Red character stamp badge with "鼠" label */}
            <div className="absolute -bottom-2 -left-1.5 bg-[#b71c1c] text-white border-2 border-[#ffab91] font-black text-[9px] rounded-full w-5 h-5 flex items-center justify-center shadow-md">
              鼠
            </div>
          </div>
        </div>

        {/* 6. Grand 3D Wood Plaque & Curved Green Ribbon text overlay (Crucial elements from screenshot) */}
        <div className="absolute -bottom-6 inset-x-0 flex flex-col items-center z-30 transform hover:scale-105 transition-all">
          
          {/* A. Thick 3D Polished Wooden shield plate */}
          <div 
            className="bg-gradient-to-r from-[#9e5d24] via-[#bd834c] to-[#804c1c] border-3 border-yellow-400 text-[#fff8b3] font-black px-7 py-2.5 rounded-2xl flex items-center justify-center gap-2 relative shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
            style={{
              textShadow: '3.5px 3.5px 0px #4d2300, -1px -1px 0px #4d2300, 1px -1px 0px #4d2300, -1px 1px 0px #4d2300, 1px 1px 0px #4d2300',
              boxShadow: '0 10px 24px rgba(0,0,0,0.65), inset 0 3px 5px rgba(255,255,255,0.3)',
            }}
          >
            {/* Left/Right metallic nail pins */}
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-300 border border-zinc-700 shadow-sm" />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-300 border border-zinc-700 shadow-sm" />

            <span className="text-3xl tracking-[0.25em] select-none font-sans font-black ml-1">斗兽棋</span>
            
            {/* Flat VS circle decoration */}
            <span className="absolute -top-3.5 right-6 w-7 h-7 bg-red-600 outline-none border-2 border-white rounded-full text-white font-serif text-[10px] font-black flex items-center justify-center rotate-12 shadow-md italic">
              VS
            </span>
          </div>

          {/* B. Green Curved Banner/Ribbon waving beneath */}
          <div 
            className="bg-[#1b5e20] text-yellow-300 border-2 border-[#81c784] font-black font-mono text-[9px] uppercase tracking-widest px-5 py-1 rounded-full shadow-lg mt-1.5 scale-95 flex items-center gap-1"
            style={{
              boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
              textShadow: '1px 1px 0px #0c2e10'
            }}
          >
            <span>★</span>
            <span>DOU SHOU QI</span>
            <span>★</span>
          </div>
        </div>
      </div>
    </div>
  );
};
