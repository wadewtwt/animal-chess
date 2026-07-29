import React from 'react';

// Monkey explorer character with a safari hat (Screen 4)
export const MonkeyExplorer: React.FC<{ className?: string; size?: number | string }> = ({ 
  className = '', 
  size = 120 
}) => {
  return (
    <svg 
      viewBox="0 0 120 120" 
      className={className} 
      style={{ width: size, height: size }}
    >
      <defs>
        <radialGradient id="monkeyFaceGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3e0" />
          <stop offset="100%" stopColor="#ffe0b2" />
        </radialGradient>
        <linearGradient id="monkeyFurGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8d6e63" />
          <stop offset="100%" stopColor="#5d4037" />
        </linearGradient>
        <linearGradient id="hatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c5e1a5" />
          <stop offset="100%" stopColor="#9ccc65" />
        </linearGradient>
      </defs>

      {/* Jungle Backdrop Circle */}
      <circle cx="60" cy="60" r="56" fill="#a5d6a7" />
      <path d="M10,80 Q30,60 60,82 Q90,60 110,84 L110,120 L10,120 Z" fill="#81c784" />

      {/* Monkey Ears */}
      <circle cx="28" cy="62" r="15" fill="url(#monkeyFurGrad)" />
      <circle cx="28" cy="62" r="9" fill="url(#monkeyFaceGrad)" />
      <circle cx="92" cy="62" r="15" fill="url(#monkeyFurGrad)" />
      <circle cx="92" cy="62" r="9" fill="url(#monkeyFaceGrad)" />

      {/* Monkey Head Fur */}
      <circle cx="60" cy="64" r="32" fill="url(#monkeyFurGrad)" />

      {/* Monkey Face (Heart shaped) */}
      <path d="M38,62 C34,50 50,48 60,57 C70,48 86,50 82,62 C78,74 65,82 60,82 C55,82 42,74 38,62 Z" fill="url(#monkeyFaceGrad)" />

      {/* Eyes */}
      <circle cx="48" cy="58" r="4.5" fill="#2d1d11" />
      <circle cx="48" cy="56" r="1.5" fill="#ffffff" />
      <circle cx="72" cy="58" r="4.5" fill="#2d1d11" />
      <circle cx="72" cy="56" r="1.5" fill="#ffffff" />

      {/* Muzzle & Smile */}
      <ellipse cx="60" cy="69" rx="13" ry="9" fill="#ffecb3" />
      <ellipse cx="60" cy="68" rx="3.5" ry="2" fill="#5d4037" />
      <path d="M51,70 Q60,78 69,70" fill="none" stroke="#5d4037" strokeWidth="2.5" strokeLinecap="round" />

      {/* Friendly Rosy Cheeks */}
      <circle cx="42" cy="68" r="4" fill="#ff8a80" opacity="0.6" />
      <circle cx="78" cy="68" r="4" fill="#ff8a80" opacity="0.6" />

      {/* Safari Ranger Hat */}
      <ellipse cx="60" cy="38" rx="34" ry="14" fill="url(#hatGrad)" stroke="#558b2f" strokeWidth="2" />
      <path d="M36,38 C36,18 84,18 84,38 Z" fill="url(#hatGrad)" stroke="#558b2f" strokeWidth="2" />
      <path d="M36,38 L84,38" stroke="#7cb342" strokeWidth="3" />
      <path d="M42,34 L78,34" stroke="#d32f2f" strokeWidth="3.5" /> {/* Red hat band */}

      {/* Tiny Explorer Scarf */}
      <polygon points="52,94 60,102 68,94" fill="#d32f2f" />
      <circle cx="60" cy="94" r="3" fill="#ffe082" />
    </svg>
  );
};

// Frog scout character with wide eyes and a helpful face (Screen 5)
export const FrogExplorer: React.FC<{ className?: string; size?: number | string }> = ({ 
  className = '', 
  size = 120 
}) => {
  return (
    <svg 
      viewBox="0 0 120 120" 
      className={className} 
      style={{ width: size, height: size }}
    >
      <defs>
        <radialGradient id="frogFaceGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c8e6c9" />
          <stop offset="100%" stopColor="#81c784" />
        </radialGradient>
        <linearGradient id="frogHatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe082" />
          <stop offset="100%" stopColor="#ffb300" />
        </linearGradient>
      </defs>

      {/* Cream background circle */}
      <circle cx="60" cy="60" r="56" fill="#f0f4c3" />

      {/* Wide Frog Eyes at the top */}
      <circle cx="42" cy="46" r="15" fill="#4caf50" stroke="#2e7d32" strokeWidth="1.5" />
      <circle cx="42" cy="46" r="11" fill="#ffffff" />
      <circle cx="42" cy="46" r="5" fill="#1b5e20" />
      <circle cx="44" cy="43" r="2" fill="#ffffff" />

      <circle cx="78" cy="46" r="15" fill="#4caf50" stroke="#2e7d32" strokeWidth="1.5" />
      <circle cx="78" cy="46" r="11" fill="#ffffff" />
      <circle cx="78" cy="46" r="5" fill="#1b5e20" />
      <circle cx="74" cy="43" r="2" fill="#ffffff" />

      {/* Frog Face body */}
      <ellipse cx="60" cy="68" rx="36" ry="26" fill="url(#frogFaceGrad)" stroke="#2e7d32" strokeWidth="2" />
      <ellipse cx="60" cy="74" rx="22" ry="14" fill="#ffffff" opacity="0.6" />

      {/* Frog Smile */}
      <path d="M44,68 Q60,82 76,68" fill="none" stroke="#1b5e20" strokeWidth="3" strokeLinecap="round" />
      {/* Tongue tip */}
      <path d="M57,75 Q60,80 63,75 Z" fill="#ff8a80" />

      {/* Blush cheeks */}
      <circle cx="34" cy="68" r="4.5" fill="#ff8a80" opacity="0.7" />
      <circle cx="86" cy="68" r="4.5" fill="#ff8a80" opacity="0.7" />

      {/* Ranger / Explorer hat sitting on top of the head */}
      <path d="M30,38 Q60,34 90,38" stroke="#b59000" strokeWidth="4" strokeLinecap="round" />
      <path d="M42,36 C42,16 78,16 78,36 Z" fill="url(#frogHatGrad)" stroke="#b59000" strokeWidth="2" />
      <rect x="42" y="31" width="36" height="5" fill="#2d1d11" /> {/* Hat belt */}

      {/* Little green bowtie */}
      <polygon points="50,96 60,92 50,88" fill="#1b5e20" />
      <polygon points="70,96 60,92 70,88" fill="#1b5e20" />
      <circle cx="60" cy="92" r="3" fill="#ff7043" />
    </svg>
  );
};

// Tim Explorer: Player avatar at top (Screen 6)
export const TimExplorer: React.FC<{ className?: string; size?: number | string }> = ({ 
  className = '', 
  size = 120 
}) => {
  return (
    <svg 
      viewBox="0 0 120 120" 
      className={className} 
      style={{ width: size, height: size }}
    >
      <defs>
        <radialGradient id="skinGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffebd6" />
          <stop offset="100%" stopColor="#f3c6a4" />
        </radialGradient>
        <linearGradient id="explorerHatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5d4037" />
          <stop offset="100%" stopColor="#3e2723" />
        </linearGradient>
      </defs>

      {/* Dark green circle frame */}
      <circle cx="60" cy="60" r="56" fill="#1e3f20" />

      {/* Face */}
      <circle cx="60" cy="64" r="24" fill="url(#skinGrad)" />

      {/* Eyes */}
      <circle cx="51" cy="60" r="3" fill="#263238" />
      <circle cx="50" cy="59" r="1" fill="#ffffff" />
      <circle cx="69" cy="60" r="3" fill="#263238" />
      <circle cx="68" cy="59" r="1" fill="#ffffff" />

      {/* Eyebrows */}
      <path d="M45,53 Q51,51 55,55" fill="none" stroke="#263238" strokeWidth="1.8" />
      <path d="M75,53 Q69,51 65,55" fill="none" stroke="#263238" strokeWidth="1.8" />

      {/* Nose and Smile */}
      <path d="M57,64 Q60,67 63,64" fill="none" stroke="#d84315" strokeWidth="1.5" />
      <path d="M52,70 Q60,78 68,70" fill="none" stroke="#263238" strokeWidth="2.5" strokeLinecap="round" />

      {/* Hair lock under hat */}
      <path d="M42,47 Q48,51 52,48" stroke="#3e2723" strokeWidth="4" strokeLinecap="round" />
      <path d="M78,47 Q72,51 68,48" stroke="#3e2723" strokeWidth="4" strokeLinecap="round" />

      {/* Explorer Wide Ranger Hat (Green/Brown) */}
      <ellipse cx="60" cy="42" rx="38" ry="11" fill="url(#explorerHatGrad)" stroke="#26120c" strokeWidth="1.5" />
      <path d="M36,41 C36,21 84,21 84,41 Z" fill="url(#explorerHatGrad)" stroke="#26120c" strokeWidth="1.5" />
      <path d="M36,41 L84,41" stroke="#3e2723" strokeWidth="2.5" />
      <path d="M42,38 L78,38" fill="none" stroke="#fbc02d" strokeWidth="3" /> {/* Yellow band */}

      {/* Explorer shirt collar */}
      <path d="M42,88 L60,105 L78,88 Z" fill="#efebe9" />
      <path d="M42,88 L60,98 L78,88" stroke="#bcaaa4" strokeWidth="1.5" />
      <circle cx="60" cy="93" r="2.5" fill="#212121" />

      {/* Green jacket */}
      <path d="M34,92 C34,84 40,84 46,88 L46,120 L30,120 Z" fill="#2e7d32" />
      <path d="M86,92 C86,84 80,84 74,88 L74,120 L90,120 Z" fill="#2e7d32" />
    </svg>
  );
};
