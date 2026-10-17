/**
 * Small procedural rain bed built from filtered noise. No files, no network.
 * It only ever starts from a user gesture (the sound toggle).
 */
class RainAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private hissGain: GainNode | null = null
  private rumbleGain: GainNode | null = null
  private gust: OscillatorNode | null = null
  private running = false
  private intensity = 0.78

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
      this.build()
    }
    return this.ctx
  }

  private build() {
    const ctx = this.ctx
    if (!ctx || this.master) return

    const length = Math.floor(ctx.sampleRate * 3)
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let last = 0
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1
        // Cheap pink-ish shaping: softens the top end and adds body.
        last = last * 0.965 + white * 0.035
        data[i] = white * 0.6 + last * 3.2
      }
    }

    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    const hiss = ctx.createBufferSource()
    hiss.buffer = buffer
    hiss.loop = true
    const hissFilter = ctx.createBiquadFilter()
    hissFilter.type = 'bandpass'
    hissFilter.frequency.value = 1400
    hissFilter.Q.value = 0.35
    const hissGain = ctx.createGain()
    hissGain.gain.value = 0.05
    hiss.connect(hissFilter).connect(hissGain).connect(master)

    const rumble = ctx.createBufferSource()
    rumble.buffer = buffer
    rumble.loop = true
    const rumbleFilter = ctx.createBiquadFilter()
    rumbleFilter.type = 'lowpass'
    rumbleFilter.frequency.value = 320
    const rumbleGain = ctx.createGain()
    rumbleGain.gain.value = 0.22
    rumble.connect(rumbleFilter).connect(rumbleGain).connect(master)

    // Slow gust modulation so the bed never feels like a static loop.
    const gust = ctx.createOscillator()
    gust.frequency.value = 0.047
    const gustDepth = ctx.createGain()
    gustDepth.gain.value = 90
    gust.connect(gustDepth).connect(hissFilter.frequency)

    hiss.start()
    rumble.start()
    gust.start()

    this.master = master
    this.hissGain = hissGain
    this.rumbleGain = rumbleGain
    this.gust = gust
    this.applyIntensity()
  }

  private applyIntensity() {
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    const level = this.intensity
    this.master.gain.setTargetAtTime(0.24 + level * 0.42, t, 0.4)
    this.hissGain?.gain.setTargetAtTime(0.025 + level * 0.075, t, 0.5)
    this.rumbleGain?.gain.setTargetAtTime(0.10 + level * 0.26, t, 0.5)
  }

  async start() {
    const ctx = this.ensureContext()
    if (!ctx) return
    if (ctx.state === 'suspended') await ctx.resume()
    this.running = true
    this.applyIntensity()
  }

  stop() {
    this.running = false
    if (!this.ctx || !this.master) return
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25)
  }

  setIntensity(value: number) {
    this.intensity = Math.min(1, Math.max(0, value))
    if (this.running) this.applyIntensity()
  }

  dispose() {
    this.stop()
    this.gust?.stop()
    this.ctx?.close()
    this.ctx = null
    this.master = null
    this.hissGain = null
    this.rumbleGain = null
  }
}

export const rainAudio = new RainAudio()
