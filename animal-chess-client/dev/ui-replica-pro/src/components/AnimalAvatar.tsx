import React from 'react';
import { AnimalType } from '../types';

interface AnimalAvatarProps {
  type: AnimalType;
  owner: 'player1' | 'player2';
  size?: number | string;
  className?: string;
  showRank?: boolean;
}

export const AnimalAvatar: React.FC<AnimalAvatarProps> = ({
  type,
  owner,
  size = '100%',
  className = '',
  showRank = true,
}) => {
  // Configs
  const isP1 = owner === 'player1';
  
  // High-contrast leaf green gradients for P1, rich golden orange-red gradients for P2
  const bgGradient = isP1 
    ? 'from-[#e1f5fe] to-[#81c784] border-[#006e1c]' 
    : 'from-[#fff3e0] to-[#ffb74d] border-[#d32f2f]';

  const rankBadgeBg = isP1 ? 'bg-[#006e1c] text-white' : 'bg-[#d32f2f] text-white';

  const rankMap: Record<AnimalType, { name: string; num: number; emojiColor: string }> = {
    rat: { name: '鼠', num: 1, emojiColor: '#78909c' },
    cat: { name: '猫', num: 2, emojiColor: '#ffb74d' },
    dog: { name: '狗', num: 3, emojiColor: '#8d6e63' },
    wolf: { name: '狼', num: 4, emojiColor: '#90a4ae' },
    leopard: { name: '豹', num: 5, emojiColor: '#d4e157' },
    tiger: { name: '虎', num: 6, emojiColor: '#ff7043' },
    lion: { name: '狮', num: 7, emojiColor: '#ffa726' },
    elephant: { name: '象', num: 8, emojiColor: '#4f5b66' },
  };

  const current = rankMap[type];

  // Custom high-quality, polished SVGs for each animal:
  const renderAnimalSVG = () => {
    switch (type) {
      case 'rat':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Cute mouse body */}
            <circle cx="50" cy="55" r="28" fill="#cfd8dc" />
            <circle cx="50" cy="55" r="24" fill="#eceff1" />
            {/* Ears */}
            <circle cx="30" cy="30" r="14" fill="#b0bec5" />
            <circle cx="30" cy="30" r="8" fill="#ff8a80" opacity="0.7" />
            <circle cx="70" cy="30" r="14" fill="#b0bec5" />
            <circle cx="70" cy="30" r="8" fill="#ff8a80" opacity="0.7" />
            {/* Eyes */}
            <circle cx="42" cy="46" r="3.5" fill="#263238" />
            <circle cx="58" cy="46" r="3.5" fill="#263238" />
            <circle cx="44" cy="45" r="1.2" fill="#ffffff" />
            <circle cx="60" cy="45" r="1.2" fill="#ffffff" />
            {/* Nose */}
            <path d="M46 54 L54 54 L50 60 Z" fill="#ff8a80" />
            {/* Whiskers */}
            <line x1="22" y1="56" x2="38" y2="56" stroke="#546e7a" strokeWidth="2.5" />
            <line x1="24" y1="62" x2="38" y2="59" stroke="#546e7a" strokeWidth="2.5" />
            <line x1="78" y1="56" x2="62" y2="56" stroke="#546e7a" strokeWidth="2.5" />
            <line x1="76" y1="62" x2="62" y2="59" stroke="#546e7a" strokeWidth="2.5" />
            {/* Cheeks */}
            <circle cx="36" cy="53" r="5" fill="#ff8a80" opacity="0.3" />
            <circle cx="64" cy="53" r="5" fill="#ff8a80" opacity="0.3" />
          </svg>
        );
      case 'cat':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Cat body & ears */}
            <polygon points="24,20 38,40 20,44" fill="#ffb74d" />
            <polygon points="76,20 62,40 80,44" fill="#ffb74d" />
            <polygon points="26,24 35,37 23,40" fill="#ff8a80" />
            <polygon points="74,24 65,37 77,40" fill="#ff8a80" />
            <circle cx="50" cy="56" r="30" fill="#ffb74d" />
            <circle cx="50" cy="56" r="25" fill="#ffe082" />
            {/* Eyes */}
            <ellipse cx="40" cy="50" rx="4" ry="5.5" fill="#1b5e20" />
            <ellipse cx="60" cy="50" rx="4" ry="5.5" fill="#1b5e20" />
            <circle cx="38.5" cy="48" r="1.5" fill="#ffffff" />
            <circle cx="58.5" cy="48" r="1.5" fill="#ffffff" />
            {/* Nose & Mouth */}
            <polygon points="47,59 53,59 50,62" fill="#ff8a80" />
            <path d="M46,65 Q50,68 50,65 Q50,68 54,65" fill="none" stroke="#e65100" strokeWidth="3" strokeLinecap="round" />
            {/* Stripes */}
            <path d="M50,28 L50,38" stroke="#e65100" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M43,30 L45,36" stroke="#e65100" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M57,30 L55,36" stroke="#e65100" strokeWidth="3.5" strokeLinecap="round" />
            {/* Whiskers */}
            <line x1="20" y1="58" x2="33" y2="59" stroke="#e65100" strokeWidth="2.5" />
            <line x1="22" y1="64" x2="34" y2="62" stroke="#e65100" strokeWidth="2.5" />
            <line x1="80" y1="58" x2="67" y2="59" stroke="#e65100" strokeWidth="2.5" />
            <line x1="78" y1="64" x2="66" y2="62" stroke="#e65100" strokeWidth="2.5" />
          </svg>
        );
      case 'dog':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Dog ears & face */}
            <path d="M20,30 Q12,45 18,65 Q24,55 24,35 Z" fill="#8d6e63" />
            <path d="M80,30 Q88,45 82,65 Q76,55 76,35 Z" fill="#8d6e63" />
            <circle cx="50" cy="55" r="28" fill="#d7ccc8" />
            <ellipse cx="50" cy="62" rx="16" ry="12" fill="#efebe9" />
            {/* Eyes */}
            <circle cx="40" cy="46" r="4.5" fill="#3e2723" />
            <circle cx="60" cy="46" r="4.5" fill="#3e2723" />
            <circle cx="38.5" cy="44.5" r="1.5" fill="#ffffff" />
            <circle cx="58.5" cy="44.5" r="1.5" fill="#ffffff" />
            {/* Cute nose */}
            <ellipse cx="50" cy="56" rx="6.5" ry="4.5" fill="#3e2723" />
            {/* Mouth & Tongue */}
            <path d="M50,60 Q50,66 45,66 Q50,66 50,60" fill="none" stroke="#3e2723" strokeWidth="2.5" />
            <path d="M50,60 Q50,66 55,66 Q50,66 50,60" fill="none" stroke="#3e2723" strokeWidth="2.5" />
            <path d="M47,65 Q50,75 53,65 Z" fill="#ff8a80" />
          </svg>
        );
      case 'wolf':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Wolf Ears */}
            <polygon points="25,22 42,40 18,48" fill="#78909c" />
            <polygon points="75,22 58,40 82,48" fill="#78909c" />
            <polygon points="28,26 39,38 22,43" fill="#cfd8dc" />
            <polygon points="72,26 61,38 78,43" fill="#cfd8dc" />
            {/* Head */}
            <polygon points="50,22 80,56 50,86 20,56" fill="#78909c" />
            <polygon points="50,34 70,56 50,76 30,56" fill="#eceff1" />
            {/* Eyebrows & Eyes */}
            <path d="M32,46 L44,48" stroke="#37474f" strokeWidth="3" strokeLinecap="round" />
            <path d="M68,46 L56,48" stroke="#37474f" strokeWidth="3" strokeLinecap="round" />
            <circle cx="39" cy="52" r="3.5" fill="#fbc02d" />
            <circle cx="61" cy="52" r="3.5" fill="#fbc02d" />
            <circle cx="39.5" cy="51.5" r="1.2" fill="#000000" />
            <circle cx="60.5" cy="51.5" r="1.2" fill="#000000" />
            {/* Wolf snout */}
            <polygon points="46,72 54,72 50,82" fill="#37474f" />
          </svg>
        );
      case 'leopard':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Ears */}
            <circle cx="28" cy="28" r="12" fill="#afb42b" />
            <circle cx="28" cy="28" r="7" fill="#f0f4c3" />
            <circle cx="72" cy="28" r="12" fill="#afb42b" />
            <circle cx="72" cy="28" r="7" fill="#f0f4c3" />
            {/* Head */}
            <circle cx="50" cy="56" r="30" fill="#c0ca33" />
            <circle cx="50" cy="56" r="25" fill="#d4e157" />
            {/* Eyes */}
            <circle cx="40" cy="50" r="4.5" fill="#1a237e" />
            <circle cx="60" cy="50" r="4.5" fill="#1a237e" />
            <circle cx="38.5" cy="48.5" r="1.5" fill="#ffffff" />
            <circle cx="58.5" cy="48.5" r="1.5" fill="#ffffff" />
            {/* Cat Nose & Mouth */}
            <polygon points="47,59 53,59 50,63" fill="#ff8a80" />
            <path d="M46,65 Q50,69 54,65" fill="none" stroke="#558b2f" strokeWidth="2.5" />
            {/* Leopard Spots */}
            <circle cx="34" cy="40" r="3.5" fill="#33691e" />
            <circle cx="66" cy="40" r="3.5" fill="#33691e" />
            <circle cx="50" cy="35" r="2.5" fill="#33691e" />
            <circle cx="28" cy="54" r="3" fill="#33691e" />
            <circle cx="72" cy="54" r="3" fill="#33691e" />
            <circle cx="42" cy="72" r="2" fill="#33691e" />
            <circle cx="58" cy="72" r="2" fill="#33691e" />
          </svg>
        );
      case 'tiger':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Ears */}
            <circle cx="24" cy="26" r="12" fill="#e65100" />
            <circle cx="24" cy="26" r="7" fill="#ffffff" />
            <circle cx="76" cy="26" r="12" fill="#e65100" />
            <circle cx="76" cy="26" r="7" fill="#ffffff" />
            {/* Head */}
            <circle cx="50" cy="55" r="31" fill="#f57c00" />
            <circle cx="50" cy="55" r="26" fill="#ff9800" />
            {/* Eyes */}
            <circle cx="39" cy="48" r="5" fill="#ffffff" />
            <circle cx="61" cy="48" r="5" fill="#ffffff" />
            <circle cx="39" cy="48" r="3.5" fill="#212121" />
            <circle cx="61" cy="48" r="3.5" fill="#212121" />
            <circle cx="37" cy="46" r="1.5" fill="#ffffff" />
            <circle cx="59" cy="46" r="1.5" fill="#ffffff" />
            {/* Nose & Mouth */}
            <polygon points="46,58 54,58 50,62" fill="#212121" />
            <path d="M45,66 Q50,71 50,66 Q50,71 55,66" fill="none" stroke="#212121" strokeWidth="3" strokeLinecap="round" />
            {/* Tiger Stripes */}
            {/* Forehead */}
            <path d="M50,28 L50,38 M44,30 L45,35 M56,30 L55,35 M47,38 L53,38" stroke="#212121" strokeWidth="3" strokeLinecap="round" />
            {/* Side cheeks stripes */}
            <path d="M22,50 L32,52" stroke="#212121" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M20,58 L30,59" stroke="#212121" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M78,50 L68,52" stroke="#212121" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M80,58 L70,59" stroke="#212121" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        );
      case 'lion':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Lion Mane */}
            <circle cx="50" cy="52" r="38" fill="#d84315" />
            <path d="M50,11 Q65,11 65,22 Q78,16 78,32 Q91,34 85,50 Q90,66 78,74 Q70,88 50,85 Q30,88 22,74 Q10,66 15,50 Q9,34 22,32 Q22,16 50,11 Z" fill="#b71c1c" />
            {/* Ears */}
            <circle cx="32" cy="28" r="8" fill="#ffb74d" />
            <circle cx="68" cy="28" r="8" fill="#ffb74d" />
            {/* Lion Face */}
            <circle cx="50" cy="54" r="26" fill="#ffb74d" />
            <circle cx="50" cy="54" r="21" fill="#ffe082" />
            {/* Eyes */}
            <circle cx="40" cy="48" r="4" fill="#3e2723" />
            <circle cx="60" cy="48" r="4" fill="#3e2723" />
            <circle cx="38" cy="46" r="1.2" fill="#ffffff" />
            <circle cx="58" cy="46" r="1.2" fill="#ffffff" />
            {/* Majestic whiskers snout */}
            <polygon points="46,57 54,57 50,61" fill="#3e2723" />
            <path d="M46,65 Q50,68 50,65 Q50,68 54,65" fill="none" stroke="#212121" strokeWidth="3" />
            {/* Cheeks */}
            <circle cx="34" cy="56" r="3" fill="#ff8a80" opacity="0.4" />
            <circle cx="66" cy="56" r="3" fill="#ff8a80" opacity="0.4" />
          </svg>
        );
      case 'elephant':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Elephant Ears */}
            <ellipse cx="26" cy="46" rx="20" ry="24" fill="#90a4ae" />
            <ellipse cx="28" cy="46" rx="14" ry="18" fill="#ff8a80" opacity="0.3" />
            <ellipse cx="74" cy="46" rx="20" ry="24" fill="#90a4ae" />
            <ellipse cx="72" cy="46" rx="14" ry="18" fill="#ff8a80" opacity="0.3" />
            {/* Head & Body */}
            <circle cx="50" cy="50" r="28" fill="#b0bec5" />
            {/* Eyes */}
            <circle cx="38" cy="44" r="4" fill="#263238" />
            <circle cx="62" cy="44" r="4" fill="#263238" />
            <circle cx="36" cy="42" r="1.2" fill="#ffffff" />
            <circle cx="60" cy="42" r="1.2" fill="#ffffff" />
            {/* Ivory Tusks */}
            <path d="M33,56 Q28,66 22,60 Q28,56 33,56 Z" fill="#ffffff" stroke="#90a4ae" strokeWidth="1" />
            <path d="M67,56 Q72,66 78,60 Q72,56 67,56 Z" fill="#ffffff" stroke="#90a4ae" strokeWidth="1" />
            {/* Trunk */}
            <path d="M50,48 Q50,75 36,75" fill="none" stroke="#b0bec5" strokeWidth="10" strokeLinecap="round" />
            <path d="M50,48 Q50,75 36,75" fill="none" stroke="#90a4ae" strokeWidth="7" strokeLinecap="round" opacity="0.3" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={`relative rounded-full aspect-square border-4 flex flex-col items-center justify-center bg-gradient-to-b shadow-md overflow-hidden p-2 select-none ${bgGradient} transition-transform hover:scale-105 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* 3D Glass shine layer */}
      <div className="absolute top-0.5 left-0.5 right-0.5 h-1/3 bg-white/20 rounded-t-full pointer-events-none" />

      {/* Main vector graphic */}
      <div className="w-10/12 h-10/12 flex items-center justify-center p-0.5">
        {renderAnimalSVG()}
      </div>

      {/* Label and rank indicator */}
      {showRank ? (
        <div className={`absolute bottom-0 inset-x-0 ${isP1 ? 'bg-[#006e1c]' : 'bg-[#d32f2f]'} text-white/90 text-[10px] sm:text-xs font-bold leading-tight pb-0.5 text-center flex items-center justify-center gap-1 shadow-inner`}>
          <span>{current.name}</span>
          <span className="bg-white/90 font-mono text-[9px] px-1 rounded-sm text-gray-900 leading-none py-0.5">
            {current.num}
          </span>
        </div>
      ) : (
        <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white font-bold text-[10px] text-center">
          {current.name}
        </div>
      )}
    </div>
  );
};
