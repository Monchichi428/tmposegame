/**
 * soundManager.js
 * Web Audio API를 사용하여 효과음을 생성하고 재생하는 클래스
 */
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.isMuted = false;
    }

    /**
     * 오디오 컨텍스트 초기화 (사용자 인터랙션 필요)
     */
    init() {
        if (!this.audioContext) {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        }

        // Resume context if suspended (common in browsers)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * 간단한 톤 재생
     * @param {number} frequency - 주파수 (Hz)
     * @param {string} type - 파형 타입 ('sine', 'square', 'sawtooth', 'triangle')
     * @param {number} duration - 지속 시간 (초)
     */
    playTone(frequency, type, duration, volume = 0.1) {
        if (!this.audioContext || this.isMuted) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        // Envelope for smoother sound
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    /**
     * 과일 획득 효과음 (띵!)
     */
    playFruitCollect() {
        // High pitched sine wave sequence
        this.playTone(880, 'sine', 0.1, 0.1); // A5
        setTimeout(() => this.playTone(1174.66, 'sine', 0.2, 0.1), 100); // D6
    }

    /**
     * 시간 보너스 효과음 (띠로링!)
     */
    playTimeBonus() {
        // Ascending arpeggio
        this.playTone(523.25, 'triangle', 0.1, 0.1); // C5
        setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.1), 80); // E5
        setTimeout(() => this.playTone(783.99, 'triangle', 0.1, 0.1), 160); // G5
        setTimeout(() => this.playTone(1046.50, 'triangle', 0.3, 0.1), 240); // C6
    }

    /**
     * 폭탄/게임오버 효과음 (뿌아앙)
     */
    playBombExplosion() {
        if (!this.audioContext || this.isMuted) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }

    playGameOver() {
        // Sad melody
        this.playTone(523.25, 'sine', 0.3, 0.2); // C5
        setTimeout(() => this.playTone(493.88, 'sine', 0.3, 0.2), 300); // B4
        setTimeout(() => this.playTone(466.16, 'sine', 0.8, 0.2), 600); // Bb4
    }
}

// 전역 인스턴스 생성
window.soundManager = new SoundManager();
