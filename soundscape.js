// Original, synthesized soundscape. No third-party recordings or copyrighted melodies.
export function createSoundscape() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const settings = {music: true, ambience: true, effects: true, musicVolume: .38, ambienceVolume: .48, effectsVolume: .58};
  let scene = {season: 'spring', time: 58, weather: 'clear', open: false, store: null, screens: true};
  let ctx, master, musicBus, ambienceBus, effectsBus, recordOutput, musicFilter, interval;
  let rainGain, windGain, cityGain, indoorGain, electronicsGain;
  let nextNoteTime = 0, step = 0, nextNatureTime = 0;
  const active = () => !!ctx && ctx.state === 'running';
  const smooth = (node, value, seconds = .3) => {
    if (!node || !ctx) return;
    node.gain.setTargetAtTime(value, ctx.currentTime, seconds);
  };
  const midi = n => 440 * 2 ** ((n - 69) / 12);

  function noiseBed(filterType, cutoff) {
    const length = Math.round(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer; source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType; filter.frequency.value = cutoff;
    const gain = ctx.createGain(); gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(ambienceBus);
    source.start();
    return gain;
  }

  function oscillatorNote(frequency, when, duration, volume, type, destination, attack = .03, release = .6) {
    const oscillator = ctx.createOscillator(), envelope = ctx.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, when);
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(volume, when + attack);
    envelope.gain.setTargetAtTime(.0001, when + Math.max(attack, duration - release), Math.max(.05, release / 4));
    oscillator.connect(envelope).connect(destination);
    oscillator.start(when); oscillator.stop(when + duration + .25);
  }

  function scheduleMusic(when) {
    // Four original ambient chords, with an intentionally sparse music-box figure.
    const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]];
    const beat = .8, bar = Math.floor(step / 4) % chords.length, within = step % 4;
    const chord = chords[bar];
    if (within === 0) {
      for (const note of chord.slice(0, 3)) {
        oscillatorNote(midi(note - 12), when, beat * 4.35, .036, 'sine', musicFilter, .35, 1.6);
        oscillatorNote(midi(note), when, beat * 4.1, .011, 'triangle', musicFilter, .55, 1.7);
      }
    }
    const note = chord[[0, 2, 1, 3][within]] + 12;
    oscillatorNote(midi(note), when + .02, beat * 1.8, .027, 'sine', musicFilter, .012, .8);
    if (within === 2) oscillatorNote(midi(chord[3] + 24), when + beat * .48, beat * .95, .012, 'sine', musicFilter, .012, .32);
  }

  function natureChirp(when, night) {
    if (!settings.ambience || scene.open || scene.weather === 'rain' || scene.weather === 'snow') return;
    const oscillator = ctx.createOscillator(), envelope = ctx.createGain();
    oscillator.type = 'sine';
    const base = night ? 2200 : 1600;
    oscillator.frequency.setValueAtTime(base, when);
    oscillator.frequency.exponentialRampToValueAtTime(night ? 2800 : 2350, when + .13);
    oscillator.frequency.exponentialRampToValueAtTime(base * .9, when + .27);
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(night ? .014 : .022, when + .025);
    envelope.gain.exponentialRampToValueAtTime(.0001, when + .3);
    oscillator.connect(envelope).connect(ambienceBus);
    oscillator.start(when); oscillator.stop(when + .31);
  }

  function tick() {
    if (!active()) return;
    const now = ctx.currentTime;
    if (settings.music) {
      if (nextNoteTime < now - .5) nextNoteTime = now + .08;
      while (nextNoteTime < now + .4) {
        scheduleMusic(nextNoteTime);
        nextNoteTime += .8;
        step++;
      }
    } else nextNoteTime = now + .08;
    if (settings.ambience && now >= nextNatureTime) {
      const night = scene.time >= 78;
      if ((scene.weather === 'clear' || scene.weather === 'cloudy') && !scene.open && scene.season !== 'winter') {
        natureChirp(now + .1, night);
        if (night && scene.season === 'summer') natureChirp(now + .43, true);
      }
      nextNatureTime = now + (night ? 3.9 : 6.2);
    }
  }

  function refresh() {
    if (!ctx) return;
    smooth(musicBus, settings.music ? settings.musicVolume : 0);
    smooth(ambienceBus, settings.ambience ? settings.ambienceVolume : 0);
    smooth(effectsBus, settings.effects ? settings.effectsVolume : 0);
    const outdoor = !scene.open;
    const rain = scene.weather === 'rain', snow = scene.weather === 'snow', night = scene.time >= 78;
    smooth(rainGain, outdoor && rain ? .085 : .003, .55);
    smooth(windGain, outdoor ? (snow ? .075 : scene.weather === 'cloudy' ? .035 : .012) : .003, .7);
    smooth(cityGain, outdoor ? (night ? .012 : .024) : .004, .7);
    smooth(indoorGain, outdoor ? 0 : .014, .4);
    smooth(electronicsGain, !outdoor && scene.screens && ['bookshop', 'cyber'].includes(scene.store) ? .012 : 0, .4);
    musicFilter.frequency.setTargetAtTime(night ? 1050 : 1850, ctx.currentTime, .8);
  }

  function init() {
    if (!AudioContextClass || ctx) return;
    ctx = new AudioContextClass();
    master = ctx.createGain(); master.gain.value = .62;
    musicBus = ctx.createGain(); ambienceBus = ctx.createGain(); effectsBus = ctx.createGain();
    musicBus.connect(master); ambienceBus.connect(master); effectsBus.connect(master);
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12; limiter.knee.value = 12; limiter.ratio.value = 3;
    master.connect(limiter).connect(ctx.destination);
    recordOutput = ctx.createMediaStreamDestination(); limiter.connect(recordOutput);
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 1500;
    musicFilter.connect(musicBus);
    rainGain = noiseBed('highpass', 450);
    windGain = noiseBed('lowpass', 520);
    cityGain = noiseBed('lowpass', 180);
    indoorGain = noiseBed('lowpass', 100);
    const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 98;
    electronicsGain = ctx.createGain(); electronicsGain.gain.value = 0;
    hum.connect(electronicsGain).connect(ambienceBus); hum.start();
    nextNoteTime = ctx.currentTime + .12;
    nextNatureTime = ctx.currentTime + 2;
    interval = setInterval(tick, 160);
    refresh();
  }

  async function start() {
    if (!AudioContextClass) return false;
    init();
    try { await ctx.resume(); tick(); return active(); }
    catch { return false; }
  }
  async function pause() { if (ctx) await ctx.suspend(); }
  function setOptions(values) { Object.assign(settings, values); refresh(); }
  function setScene(values) { scene = {...scene, ...values}; refresh(); }
  function playEffect(kind = 'tap') {
    if (!active() || !settings.effects) return;
    const when = ctx.currentTime + .008;
    if (kind === 'door') {
      oscillatorNote(660, when, .53, .045, 'sine', effectsBus, .005, .35);
      oscillatorNote(990, when + .1, .6, .027, 'sine', effectsBus, .005, .4);
    } else if (kind === 'screen') {
      oscillatorNote(185, when, .13, .065, 'triangle', effectsBus, .003, .07);
      oscillatorNote(840, when + .035, .09, .018, 'sine', effectsBus, .003, .05);
    } else if (kind === 'shutter') {
      oscillatorNote(520, when, .09, .035, 'square', effectsBus, .002, .055);
      oscillatorNote(270, when + .035, .1, .025, 'triangle', effectsBus, .002, .06);
    } else oscillatorNote(420, when, .09, .018, 'sine', effectsBus, .003, .05);
  }
  return {
    available: !!AudioContextClass, start, pause, isPlaying: active,
    setOptions, setScene, playEffect,
    getRecordStream: () => active() ? recordOutput.stream : null,
    debugState: () => ({available: !!AudioContextClass, status: ctx?.state || 'not-started', settings: {...settings}, scene: {...scene}})
  };
}
