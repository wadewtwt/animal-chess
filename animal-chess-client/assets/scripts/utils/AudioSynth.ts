import { sys } from 'cc';
import { AnimalType } from '../engine/LocalEngine';

export class AudioSynth {
    private static ctx: AudioContext | null = null;
    private static isInitialized = false;

    /**
     * 1. 普通/次要按钮点击音效 (Soft Pop Click)
     */
    public static playClick() {
        const soundEnabled = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        if (!soundEnabled) return;

        if (!this.ctx) this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const startTime = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        // A satisfying premium soft pop/click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, startTime);
        osc.frequency.exponentialRampToValueAtTime(200, startTime + 0.08); // frequency sweep down
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
        
        osc.start(startTime);
        osc.stop(startTime + 0.09);
    }

    /**
     * 2. 主要动作 / 确认 / 开始按钮音效 (Upbeat Crisp Confirm)
     * 频率从 520Hz 快速上升至 880Hz，具有正向推进感和清脆的确认回馈
     */
    public static playPrimaryClick() {
        const soundEnabled = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        if (!soundEnabled) return;

        if (!this.ctx) this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const startTime = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, startTime);
        osc.frequency.exponentialRampToValueAtTime(880, startTime + 0.07);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.22, startTime + 0.004);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

        osc.start(startTime);
        osc.stop(startTime + 0.1);
    }

    /**
     * 3. 返回 / 关闭 / 取消按钮音效 (Warm Downward Pop)
     * 柔和的三角形波下行滑音 450Hz -> 260Hz，告知玩家界面已关回/取消
     */
    public static playBackClick() {
        const soundEnabled = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        if (!soundEnabled) return;

        if (!this.ctx) this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const startTime = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, startTime);
        osc.frequency.exponentialRampToValueAtTime(260, startTime + 0.07);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

        osc.start(startTime);
        osc.stop(startTime + 0.09);
    }

    /**
     * 4. 警告 / 认输 / 高风险按钮音效 (Low Caution Double Knock)
     * 低沉的两连击警示音，传递二次确认与风险防护心理预期
     */
    public static playWarningClick() {
        const soundEnabled = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        if (!soundEnabled) return;

        if (!this.ctx) this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const startTime = this.ctx.currentTime;

        const playKnock = (offset: number, freq: number) => {
            const osc = this.ctx!.createOscillator();
            const gainNode = this.ctx!.createGain();
            const filter = this.ctx!.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, startTime + offset);
            osc.frequency.exponentialRampToValueAtTime(100, startTime + offset + 0.06);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, startTime + offset);

            gainNode.gain.setValueAtTime(0, startTime + offset);
            gainNode.gain.linearRampToValueAtTime(0.18, startTime + offset + 0.004);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + offset + 0.06);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.ctx!.destination);

            osc.start(startTime + offset);
            osc.stop(startTime + offset + 0.07);
        };

        playKnock(0.0, 220);
        playKnock(0.06, 180);
    }

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

    public static playLoseSound() {
        const soundEnabled = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        if (!soundEnabled) return;

        if (!this.ctx) this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const startTime = this.ctx.currentTime;
        
        // 播放 3 个连续的悲凉小调下行音符：A3 (220Hz), F3 (174.6Hz), D3 (146.8Hz)
        // 形成落寞的小三和弦分解音符，用柔和的 triangle 波表现
        const notes = [
            { freq: 220, time: 0 },
            { freq: 174.6, time: 0.25 },
            { freq: 146.8, time: 0.5 }
        ];

        notes.forEach(note => {
            const osc = this.ctx!.createOscillator();
            const gainNode = this.ctx!.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(this.ctx!.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.freq, startTime + note.time);
            
            gainNode.gain.setValueAtTime(0, startTime + note.time);
            gainNode.gain.linearRampToValueAtTime(0.18, startTime + note.time + 0.04);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + note.time + 0.45);
            
            osc.start(startTime + note.time);
            osc.stop(startTime + note.time + 0.5);
        });
    }

    public static playJoyfulClick() {
        const soundEnabled = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        if (!soundEnabled) return;

        if (!this.ctx) this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const startTime = this.ctx.currentTime;

        // 播放一段经典的大调上行 Chiptune 欢快音符序列，总长约 1s
        // 音符：C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50), E6 (1318.51), G6 (1567.98)
        const notes = [
            { freq: 523.25, time: 0.0, dur: 0.12 },
            { freq: 659.25, time: 0.08, dur: 0.12 },
            { freq: 783.99, time: 0.16, dur: 0.12 },
            { freq: 1046.50, time: 0.24, dur: 0.15 },
            { freq: 1318.51, time: 0.32, dur: 0.15 },
            { freq: 1567.98, time: 0.40, dur: 0.55 } // 最后一个音符拉长，形成欢快收尾
        ];

        notes.forEach(note => {
            const osc = this.ctx!.createOscillator();
            const gainNode = this.ctx!.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(this.ctx!.destination);
            
            // 使用 triangle 波产生类似 8-bit 红白机游戏的清脆复古感，非常欢快
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.freq, startTime + note.time);
            
            gainNode.gain.setValueAtTime(0, startTime + note.time);
            gainNode.gain.linearRampToValueAtTime(0.12, startTime + note.time + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + note.time + note.dur);
            
            osc.start(startTime + note.time);
            osc.stop(startTime + note.time + note.dur);
        });
    }

    public static playStartTransitionSound() {
        const soundEnabled = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        if (!soundEnabled) return;

        if (!this.ctx) this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const startTime = this.ctx.currentTime;

        // 1. 低音升调气流感 (Sub/Mid Warm Swell)
        const swellOsc = this.ctx.createOscillator();
        const swellGain = this.ctx.createGain();
        const swellFilter = this.ctx.createBiquadFilter();

        swellOsc.type = 'triangle';
        swellOsc.frequency.setValueAtTime(180, startTime);
        swellOsc.frequency.exponentialRampToValueAtTime(450, startTime + 0.4);

        swellFilter.type = 'lowpass';
        swellFilter.frequency.setValueAtTime(400, startTime);
        swellFilter.frequency.exponentialRampToValueAtTime(1200, startTime + 0.35);

        swellGain.gain.setValueAtTime(0, startTime);
        swellGain.gain.linearRampToValueAtTime(0.18, startTime + 0.1);
        swellGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        swellOsc.connect(swellFilter);
        swellFilter.connect(swellGain);
        swellGain.connect(this.ctx.destination);

        swellOsc.start(startTime);
        swellOsc.stop(startTime + 0.55);

        // 2. 森林风铃上行和弦音符 (Chime Sparkle Arpeggio)
        // G4 (392Hz), C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
        const chimes = [
            { freq: 392.00, time: 0.02, dur: 0.25 },
            { freq: 523.25, time: 0.08, dur: 0.30 },
            { freq: 659.25, time: 0.14, dur: 0.35 },
            { freq: 783.99, time: 0.20, dur: 0.40 },
            { freq: 1046.50, time: 0.28, dur: 0.50 }
        ];

        chimes.forEach(chime => {
            const osc = this.ctx!.createOscillator();
            const gainNode = this.ctx!.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(chime.freq, startTime + chime.time);

            gainNode.gain.setValueAtTime(0, startTime + chime.time);
            gainNode.gain.linearRampToValueAtTime(0.15, startTime + chime.time + 0.03);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + chime.time + chime.dur);

            osc.connect(gainNode);
            gainNode.connect(this.ctx!.destination);

            osc.start(startTime + chime.time);
            osc.stop(startTime + chime.time + chime.dur);
        });
    }

    /**
     * 5. 轮到我方下棋的清脆小铃铛提醒音效 (Crisp Bell Chime)
     * 极清脆的小铃铛双音阶叮铛摇铃声 (C6 1046.5Hz -> G6 1567.98Hz)，灵动而醒目
     */
    public static playTurnBellChime() {
        const soundEnabled = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        if (!soundEnabled) return;

        if (!this.ctx) this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const startTime = this.ctx.currentTime;

        // 模拟清脆小风铃/金属铃铛的叮铛双击声音
        const bellNotes = [
            { freq: 1046.50, time: 0.0, dur: 0.28 },  // C6 (叮)
            { freq: 1567.98, time: 0.09, dur: 0.45 }  // G6 (铛~)
        ];

        bellNotes.forEach(note => {
            const osc = this.ctx!.createOscillator();
            const gainNode = this.ctx!.createGain();

            osc.connect(gainNode);
            gainNode.connect(this.ctx!.destination);

            osc.type = 'sine'; // 纯净的清脆正弦波
            osc.frequency.setValueAtTime(note.freq, startTime + note.time);

            gainNode.gain.setValueAtTime(0, startTime + note.time);
            gainNode.gain.linearRampToValueAtTime(0.25, startTime + note.time + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + note.time + note.dur);

            osc.start(startTime + note.time);
            osc.stop(startTime + note.time + note.dur);
        });
    }
}

