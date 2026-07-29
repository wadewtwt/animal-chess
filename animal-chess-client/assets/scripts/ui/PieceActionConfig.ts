import type { AnimalType } from '../engine/LocalEngine';

export const ACTION_FRAME_COUNT = 10;
export const ACTION_FRAME_DURATION = 0.06;

export type PieceShowMotionKind = 'scurry' | 'stretch' | 'hop' | 'howl' | 'pounce' | 'roar' | 'trumpet';

export interface FallbackMotionFrame {
    readonly x: number;
    readonly y: number;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly angle: number;
}

export interface AnimalActionConfig {
    readonly type: AnimalType;
    readonly name: string;
    readonly frameDuration: number;
    readonly motionKind: PieceShowMotionKind;
    readonly fallbackMotion: readonly FallbackMotionFrame[];
}

const baseMotion: readonly FallbackMotionFrame[] = [
    { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
    { x: 0, y: 6, scaleX: 1.04, scaleY: 0.98, angle: -3 },
    { x: 2, y: 11, scaleX: 1.08, scaleY: 0.94, angle: 4 },
    { x: -2, y: 8, scaleX: 1.02, scaleY: 1.04, angle: -5 },
    { x: 0, y: 2, scaleX: 1.12, scaleY: 0.90, angle: 3 },
    { x: 0, y: 8, scaleX: 0.96, scaleY: 1.08, angle: 0 },
    { x: 0, y: 3, scaleX: 1.03, scaleY: 1.00, angle: -2 },
    { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
];

function createMotion(kind: PieceShowMotionKind): readonly FallbackMotionFrame[] {
    switch (kind) {
        case 'scurry':
            return [
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
                { x: -8, y: 2, scaleX: 1.08, scaleY: 0.92, angle: -8 },
                { x: 9, y: 4, scaleX: 1.10, scaleY: 0.90, angle: 8 },
                { x: -6, y: 2, scaleX: 0.96, scaleY: 1.06, angle: -6 },
                { x: 7, y: 5, scaleX: 1.12, scaleY: 0.88, angle: 7 },
                { x: -3, y: 3, scaleX: 0.98, scaleY: 1.04, angle: -4 },
                { x: 2, y: 1, scaleX: 1.03, scaleY: 0.98, angle: 2 },
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
            ];
        case 'stretch':
            return [
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
                { x: 0, y: 4, scaleX: 0.94, scaleY: 1.12, angle: -4 },
                { x: 0, y: 10, scaleX: 0.90, scaleY: 1.20, angle: 4 },
                { x: 4, y: 9, scaleX: 1.08, scaleY: 0.95, angle: 7 },
                { x: -4, y: 6, scaleX: 1.10, scaleY: 0.92, angle: -7 },
                { x: 0, y: 5, scaleX: 0.98, scaleY: 1.06, angle: 0 },
                { x: 0, y: 2, scaleX: 1.03, scaleY: 0.98, angle: 2 },
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
            ];
        case 'hop':
            return [
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
                { x: 0, y: 4, scaleX: 1.12, scaleY: 0.86, angle: 0 },
                { x: 0, y: 22, scaleX: 0.90, scaleY: 1.16, angle: -8 },
                { x: 0, y: 34, scaleX: 0.95, scaleY: 1.10, angle: 7 },
                { x: 0, y: 18, scaleX: 1.02, scaleY: 0.98, angle: -4 },
                { x: 0, y: 0, scaleX: 1.20, scaleY: 0.82, angle: 0 },
                { x: 0, y: 4, scaleX: 0.96, scaleY: 1.08, angle: 0 },
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
            ];
        case 'howl':
            return [
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
                { x: 0, y: 4, scaleX: 0.98, scaleY: 1.06, angle: -5 },
                { x: 0, y: 9, scaleX: 0.96, scaleY: 1.12, angle: -12 },
                { x: 0, y: 10, scaleX: 0.96, scaleY: 1.14, angle: -16 },
                { x: 1, y: 8, scaleX: 1.04, scaleY: 1.04, angle: -12 },
                { x: -1, y: 6, scaleX: 1.07, scaleY: 0.96, angle: -6 },
                { x: 0, y: 3, scaleX: 1.02, scaleY: 1.00, angle: -2 },
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
            ];
        case 'pounce':
            return [
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
                { x: -5, y: 0, scaleX: 0.94, scaleY: 1.06, angle: -4 },
                { x: -10, y: -2, scaleX: 0.90, scaleY: 1.10, angle: -7 },
                { x: 16, y: 8, scaleX: 1.20, scaleY: 0.84, angle: 9 },
                { x: 8, y: 5, scaleX: 1.12, scaleY: 0.90, angle: 5 },
                { x: 0, y: 1, scaleX: 1.16, scaleY: 0.86, angle: 0 },
                { x: 0, y: 4, scaleX: 0.98, scaleY: 1.05, angle: -2 },
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
            ];
        case 'roar':
            return [
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
                { x: 0, y: 5, scaleX: 0.98, scaleY: 1.08, angle: -3 },
                { x: 0, y: 12, scaleX: 1.08, scaleY: 1.08, angle: 4 },
                { x: -3, y: 13, scaleX: 1.16, scaleY: 1.00, angle: -5 },
                { x: 3, y: 12, scaleX: 1.18, scaleY: 0.98, angle: 5 },
                { x: -2, y: 8, scaleX: 1.12, scaleY: 0.96, angle: -3 },
                { x: 0, y: 3, scaleX: 1.04, scaleY: 1.00, angle: 0 },
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
            ];
        case 'trumpet':
            return [
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
                { x: 0, y: 4, scaleX: 0.96, scaleY: 1.08, angle: 3 },
                { x: 0, y: 11, scaleX: 0.94, scaleY: 1.16, angle: 7 },
                { x: 3, y: 16, scaleX: 0.98, scaleY: 1.20, angle: 10 },
                { x: -3, y: 14, scaleX: 1.08, scaleY: 1.02, angle: -9 },
                { x: 0, y: 7, scaleX: 1.14, scaleY: 0.92, angle: 0 },
                { x: 0, y: 3, scaleX: 1.05, scaleY: 0.98, angle: 2 },
                { x: 0, y: 0, scaleX: 1.00, scaleY: 1.00, angle: 0 },
            ];
        default:
            return baseMotion;
    }
}

function expandMotionToActionFrames(motion: readonly FallbackMotionFrame[]): readonly FallbackMotionFrame[] {
    return Array.from({ length: ACTION_FRAME_COUNT }, (_, index) => {
        const sourceIndex = Math.round(index * (motion.length - 1) / (ACTION_FRAME_COUNT - 1));
        return motion[sourceIndex];
    });
}

export const ANIMAL_ACTION_CONFIGS: readonly AnimalActionConfig[] = [
    { type: 1 as AnimalType, name: 'rat', frameDuration: ACTION_FRAME_DURATION, motionKind: 'scurry', fallbackMotion: expandMotionToActionFrames(createMotion('scurry')) },
    { type: 2 as AnimalType, name: 'cat', frameDuration: ACTION_FRAME_DURATION, motionKind: 'stretch', fallbackMotion: expandMotionToActionFrames(createMotion('stretch')) },
    { type: 3 as AnimalType, name: 'dog', frameDuration: ACTION_FRAME_DURATION, motionKind: 'hop', fallbackMotion: expandMotionToActionFrames(createMotion('hop')) },
    { type: 4 as AnimalType, name: 'wolf', frameDuration: ACTION_FRAME_DURATION, motionKind: 'howl', fallbackMotion: expandMotionToActionFrames(createMotion('howl')) },
    { type: 5 as AnimalType, name: 'leopard', frameDuration: ACTION_FRAME_DURATION, motionKind: 'pounce', fallbackMotion: expandMotionToActionFrames(createMotion('pounce')) },
    { type: 6 as AnimalType, name: 'tiger', frameDuration: ACTION_FRAME_DURATION, motionKind: 'pounce', fallbackMotion: expandMotionToActionFrames(createMotion('pounce')) },
    { type: 7 as AnimalType, name: 'lion', frameDuration: ACTION_FRAME_DURATION, motionKind: 'roar', fallbackMotion: expandMotionToActionFrames(createMotion('roar')) },
    { type: 8 as AnimalType, name: 'elephant', frameDuration: ACTION_FRAME_DURATION, motionKind: 'trumpet', fallbackMotion: expandMotionToActionFrames(createMotion('trumpet')) },
];

export function getAnimalActionConfig(type: AnimalType): AnimalActionConfig | null {
    return ANIMAL_ACTION_CONFIGS.find((config) => config.type === type) ?? null;
}

export function getActionFramePaths(animalName: string): string[] {
    return Array.from({ length: ACTION_FRAME_COUNT }, (_, index) => {
        const frameId = index < 10 ? `0${index}` : `${index}`;
        return `animal_actions/${animalName}/roar_${frameId}/spriteFrame`;
    });
}

export function hasCompleteActionFrameSet(frameCount: number): boolean {
    return frameCount === ACTION_FRAME_COUNT;
}
