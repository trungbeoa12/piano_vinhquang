/* Mini piano preview — tách từ template gốc, dùng PVQ_DEMO_SONGS */

class PianoAudio {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.volume = 0.7;
  }

  init() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = this.volume * 0.6;
    this.masterGain.connect(this.audioCtx.destination);
  }

  setVolume(value) {
    this.volume = value;
    if (this.masterGain) {
      this.masterGain.gain.value = value * 0.6;
    }
  }

  noteToFreq(note) {
    var notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var noteName = note.slice(0, -1);
    var octave = parseInt(note.slice(-1), 10);
    var semitone = notes.indexOf(noteName);
    var midiNote = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  playNote(note, duration) {
    duration = duration || 0.5;
    this.init();
    var freq = this.noteToFreq(note);
    var now = this.audioCtx.currentTime;

    var osc1 = this.audioCtx.createOscillator();
    var osc2 = this.audioCtx.createOscillator();
    var gainNode = this.audioCtx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.value = freq;
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    var oscGain1 = this.audioCtx.createGain();
    var oscGain2 = this.audioCtx.createGain();
    oscGain1.gain.value = 0.6;
    oscGain2.gain.value = 0.15;

    osc1.connect(oscGain1);
    osc2.connect(oscGain2);
    oscGain1.connect(gainNode);
    oscGain2.connect(gainNode);
    gainNode.connect(this.masterGain);

    var attackTime = 0.04;
    var releaseTime = 0.15;
    var noteDuration = duration * 1.1;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.7, now + attackTime);
    gainNode.gain.setValueAtTime(0.7, now + noteDuration - releaseTime);
    gainNode.gain.linearRampToValueAtTime(0, now + noteDuration);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + noteDuration + 0.1);
    osc2.stop(now + noteDuration + 0.1);
  }
}

class PianoStudioPlayer {
  constructor() {
    this.audio = new PianoAudio();
    this.currentSong = 0;
    this.isPlaying = false;
    this.currentNoteIndex = 0;
    this.speed = 1;
    this.volume = 0.7;
    this.repeat = false;
    this.timeoutId = null;

    this.initElements();
    this.buildPiano();
    this.bindEvents();
    this.updateSongInfo();
    this.audio.setVolume(this.volume);
  }

  songs() {
    return window.PVQ_DEMO_SONGS;
  }

  initElements() {
    this.playBtn = document.getElementById('playBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.progressFill = document.getElementById('progressFill');
    this.currentTimeEl = document.getElementById('currentTime');
    this.totalTimeEl = document.getElementById('totalTime');
    this.songTitleEl = document.getElementById('currentSongTitle');
    this.speedSlider = document.getElementById('speedSlider');
    this.speedValue = document.getElementById('speedValue');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.volumeValue = document.getElementById('volumeValue');
    this.repeatToggle = document.getElementById('repeatToggle');
    this.repeatSwitch = document.getElementById('repeatSwitch');
    this.songTabs = document.querySelectorAll('.song-tab');
  }

  buildPiano() {
    var piano = document.getElementById('miniPiano');
    if (!piano) {
      this.keys = [];
      return;
    }
    piano.innerHTML = '';

    var whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    var blackNotes = { C: 'C#', D: 'D#', F: 'F#', G: 'G#', A: 'A#' };
    var octaves = [4, 5];
    var whiteKeyIndex = 0;

    var self = this;
    octaves.forEach(function (octave) {
      whiteNotes.forEach(function (note) {
        var whiteKey = document.createElement('div');
        whiteKey.className = 'mini-key white';
        whiteKey.dataset.note = note + octave;
        piano.appendChild(whiteKey);

        if (blackNotes[note]) {
          var blackKey = document.createElement('div');
          blackKey.className = 'mini-key black';
          blackKey.dataset.note = blackNotes[note] + octave;
          var offset = whiteKeyIndex * 30 + 20;
          blackKey.style.left = offset + 'px';
          piano.appendChild(blackKey);
        }

        whiteKeyIndex++;
      });
    });

    this.keys = document.querySelectorAll('.mini-key');
  }

  bindEvents() {
    var self = this;
    if (!this.playBtn) return;

    this.playBtn.addEventListener('click', function () {
      self.togglePlay();
    });
    this.prevBtn.addEventListener('click', function () {
      self.prevSong();
    });
    this.nextBtn.addEventListener('click', function () {
      self.nextSong();
    });

    this.speedSlider.addEventListener('input', function (e) {
      self.speed = parseFloat(e.target.value);
      self.speedValue.textContent = self.speed.toFixed(1) + 'x';
    });

    this.volumeSlider.addEventListener('input', function (e) {
      self.volume = parseFloat(e.target.value);
      self.volumeValue.textContent = Math.round(self.volume * 100) + '%';
      self.audio.setVolume(self.volume);
    });

    this.repeatToggle.addEventListener('click', function () {
      self.repeat = !self.repeat;
      self.repeatToggle.classList.toggle('active', self.repeat);
      self.repeatSwitch.classList.toggle('active', self.repeat);
    });

    this.songTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var songIndex = parseInt(tab.dataset.song, 10);
        self.selectSong(songIndex);
      });
    });

    if (this.keys && this.keys.length) {
      this.keys.forEach(function (key) {
        key.addEventListener('click', function () {
          self.audio.playNote(key.dataset.note, 0.3);
          self.highlightKey(key.dataset.note);
        });
      });
    }

    this.setupKeyboardPlay();
  }

  selectSong(index) {
    var wasPlaying = this.isPlaying;
    this.stop();
    this.currentSong = index;
    this.currentNoteIndex = 0;
    this.updateSongInfo();
    this.updateTabs();
    this.updateProgress(0);
    if (wasPlaying) {
      this.play();
    }
  }

  updateTabs() {
    var self = this;
    this.songTabs.forEach(function (tab, i) {
      tab.classList.toggle('active', i === self.currentSong);
    });
  }

  updateSongInfo() {
    var list = this.songs();
    var song = list[this.currentSong];
    if (!this.songTitleEl) return;
    this.songTitleEl.textContent = song.title;

    var totalDuration = song.notes.reduce(function (sum, n) {
      return sum + n.duration;
    }, 0);
    this.totalTimeEl.textContent = this.formatTime(totalDuration);
    this.currentTimeEl.textContent = '0:00';
  }

  formatTime(seconds) {
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return mins + ':' + secs.toString().padStart(2, '0');
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.isPlaying = true;
    this.playBtn.textContent = '❚❚';
    this.playNextNote();
  }

  pause() {
    this.isPlaying = false;
    this.playBtn.textContent = '▶';
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  stop() {
    this.pause();
    this.currentNoteIndex = 0;
    this.updateProgress(0);
    this.clearAllKeys();
  }

  playNextNote() {
    var self = this;
    if (!this.isPlaying) return;

    var list = this.songs();
    var song = list[this.currentSong];
    if (this.currentNoteIndex >= song.notes.length) {
      if (this.repeat) {
        this.currentNoteIndex = 0;
        this.updateProgress(0);
        this.currentTimeEl.textContent = '0:00';
        this.playNextNote();
        return;
      }
      this.stop();
      return;
    }

    var noteData = song.notes[this.currentNoteIndex];
    var adjustedDuration = noteData.duration / this.speed;

    this.audio.playNote(noteData.note, adjustedDuration);
    this.highlightKey(noteData.note);

    var totalNotes = song.notes.length;
    var progress = ((this.currentNoteIndex + 1) / totalNotes) * 100;
    this.updateProgress(progress);

    var elapsed = 0;
    for (var i = 0; i <= this.currentNoteIndex; i++) {
      elapsed += song.notes[i].duration;
    }
    this.currentTimeEl.textContent = this.formatTime(elapsed / this.speed);

    this.currentNoteIndex++;

    this.timeoutId = setTimeout(function () {
      self.playNextNote();
    }, adjustedDuration * 1000);
  }

  highlightKey(note) {
    this.clearAllKeys();
    var key = document.querySelector('.mini-key[data-note="' + note + '"]');
    if (key) {
      key.classList.add('active');
      setTimeout(function () {
        key.classList.remove('active');
      }, 200);
    }
  }

  clearAllKeys() {
    if (!this.keys) return;
    this.keys.forEach(function (k) {
      k.classList.remove('active');
    });
  }

  updateProgress(percent) {
    if (this.progressFill) this.progressFill.style.width = percent + '%';
  }

  prevSong() {
    var list = this.songs();
    var newIndex = this.currentSong === 0 ? list.length - 1 : this.currentSong - 1;
    this.selectSong(newIndex);
  }

  nextSong() {
    var list = this.songs();
    var newIndex = (this.currentSong + 1) % list.length;
    this.selectSong(newIndex);
  }

  getKeyboardMapping() {
    return {
      KeyZ: 'C4',
      KeyS: 'C#4',
      KeyX: 'D4',
      KeyD: 'D#4',
      KeyC: 'E4',
      KeyV: 'F4',
      KeyG: 'F#4',
      KeyB: 'G4',
      KeyH: 'G#4',
      KeyN: 'A4',
      KeyJ: 'A#4',
      KeyM: 'B4',
      KeyQ: 'C5',
      Digit2: 'C#5',
      KeyW: 'D5',
      Digit3: 'D#5',
      KeyE: 'E5',
      KeyR: 'F5',
      Digit5: 'F#5',
      KeyT: 'G5',
      Digit6: 'G#5',
      KeyY: 'A5',
      Digit7: 'A#5',
      KeyU: 'B5',
    };
  }

  setupKeyboardPlay() {
    var keyMap = this.getKeyboardMapping();
    var activeKeys = new Set();
    var self = this;

    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        self.togglePlay();
        return;
      }

      var note = keyMap[e.code];
      if (note && !activeKeys.has(e.code)) {
        e.preventDefault();
        activeKeys.add(e.code);
        self.audio.playNote(note, 0.4);
        self.highlightKey(note);
      }
    });

    document.addEventListener('keyup', function (e) {
      if (keyMap[e.code]) {
        activeKeys.delete(e.code);
      }
    });
  }
}

window.PVQ_PianoStudioPlayer = PianoStudioPlayer;
