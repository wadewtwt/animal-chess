import { AnimalType } from '../engine/LocalEngine';

export class AudioSynth {
    private static ctx: AudioContext | null = null;
    private static isInitialized = false;

    public static init() {
        if (this.isInitialized) return;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.isInitialized = true;
            }
        } catch (e) {
            console.warn("Web Audio API not supported");
        }
    }

    public static playAnimalSound(type: AnimalType) {
        if (!this.ctx) this.init();
        if (!this.ctx) return;

        // Ensure context is running (browsers block audio until user interaction, 
        // but this will be called on touch_end so it's fine)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // The user asked for "叫两声" (call twice)
        this.playSingleCall(type, this.ctx.currentTime);
        this.playSingleCall(type, this.ctx.currentTime + 0.35); // Second call slightly later
    }

    private static playSingleCall(type: AnimalType, startTime: number) {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        switch (type) {
            case AnimalType.RAT: // 老鼠：高频急促的短促吱吱声
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1500, startTime);
                osc.frequency.exponentialRampToValueAtTime(2500, startTime + 0.05);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
                gainNode.gain.linearRampToValueAtTime(0, startTime + 0.08);
                osc.start(startTime);
                osc.stop(startTime + 0.1);
                break;
                
            case AnimalType.CAT: // 猫：平滑下行的滑音 (喵)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(900, startTime);
                osc.frequency.exponentialRampToValueAtTime(400, startTime + 0.25);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
                osc.start(startTime);
                osc.stop(startTime + 0.26);
                break;

            case AnimalType.DOG: // 狗：短促有力的锯齿波 (汪)
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, startTime);
                osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.15);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
                
                // Add a simple lowpass filter for dog bark
                const dogFilter = ctx.createBiquadFilter();
                dogFilter.type = 'lowpass';
                dogFilter.frequency.setValueAtTime(1000, startTime);
                dogFilter.frequency.exponentialRampToValueAtTime(200, startTime + 0.15);
                
                osc.disconnect();
                osc.connect(dogFilter);
                dogFilter.connect(gainNode);
                
                osc.start(startTime);
                osc.stop(startTime + 0.16);
                break;

            case AnimalType.WOLF: // 狼：较长的上扬后平缓的声音 (嗷~)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, startTime);
                osc.frequency.linearRampToValueAtTime(450, startTime + 0.1);
                osc.frequency.linearRampToValueAtTime(400, startTime + 0.3);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, startTime + 0.3);
                osc.start(startTime);
                osc.stop(startTime + 0.35);
                break;

            case AnimalType.LEOPARD: // 豹：急促稍微低沉的短吼
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, startTime);
                osc.frequency.exponentialRampToValueAtTime(80, startTime + 0.1);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
                
                const leoFilter = ctx.createBiquadFilter();
                leoFilter.type = 'lowpass';
                leoFilter.frequency.setValueAtTime(800, startTime);
                leoFilter.frequency.exponentialRampToValueAtTime(100, startTime + 0.1);
                
                osc.disconnect();
                osc.connect(leoFilter);
                leoFilter.connect(gainNode);
                
                osc.start(startTime);
                osc.stop(startTime + 0.15);
                break;

            case AnimalType.TIGER: // 老虎：低频震颤吼叫
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, startTime);
                osc.frequency.exponentialRampToValueAtTime(50, startTime + 0.25);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
                
                const tigerFilter = ctx.createBiquadFilter();
                tigerFilter.type = 'lowpass';
                tigerFilter.frequency.setValueAtTime(600, startTime);
                tigerFilter.frequency.exponentialRampToValueAtTime(100, startTime + 0.25);
                
                osc.disconnect();
                osc.connect(tigerFilter);
                tigerFilter.connect(gainNode);
                
                osc.start(startTime);
                osc.stop(startTime + 0.3);
                break;

            case AnimalType.LION: // 狮子：非常低沉宽广的咆哮
                osc.type = 'square';
                osc.frequency.setValueAtTime(80, startTime);
                osc.frequency.linearRampToValueAtTime(40, startTime + 0.3);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
                
                const lionFilter = ctx.createBiquadFilter();
                lionFilter.type = 'lowpass';
                lionFilter.frequency.setValueAtTime(500, startTime);
                lionFilter.frequency.linearRampToValueAtTime(80, startTime + 0.3);
                
                osc.disconnect();
                osc.connect(lionFilter);
                lionFilter.connect(gainNode);
                
                osc.start(startTime);
                osc.stop(startTime + 0.35);
                break;

            case AnimalType.ELEPHANT: // 大象：类似铜管乐器的高频共鸣啸叫
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(600, startTime);
                osc.frequency.exponentialRampToValueAtTime(300, startTime + 0.3);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0.01, startTime + 0.3);
                
                const fmOsc = ctx.createOscillator();
                fmOsc.type = 'sine';
                fmOsc.frequency.value = 50; // 低频调制产生类似大象叫声的粗糙感
                const fmGain = ctx.createGain();
                fmGain.gain.value = 200;
                
                fmOsc.connect(fmGain);
                fmGain.connect(osc.frequency);
                
                fmOsc.start(startTime);
                fmOsc.stop(startTime + 0.35);
                
                osc.start(startTime);
                osc.stop(startTime + 0.35);
                break;
        }
    }
}
