#!/usr/bin/env python3
"""Pre-render every read-aloud English line to MP3 with local Piper TTS.

Used only as a fallback when the browser's speechSynthesis has no English
voice or fails. Output: public/assets/audio/<sha1-10>.mp3 and
src/data/audioManifest.json ({text: file}). Re-run after editing task JSON:
    npm run audio
Needs: pip install piper-tts; voice en_US-lessac-medium in $PIPER_VOICE_DIR; ffmpeg.
"""
import hashlib, json, os, subprocess, sys, tempfile, wave

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(APP, 'public/assets/audio')
MAN = os.path.join(APP, 'src/data/audioManifest.json')
VOICE_DIR = os.environ.get('PIPER_VOICE_DIR', '/workspace/anime-english/tts')
VOICE = os.environ.get('PIPER_VOICE', 'en_US-lessac-medium')

texts = json.loads(subprocess.check_output(['node', os.path.join(APP, 'tools/collect_texts.mjs')]))
os.makedirs(OUT, exist_ok=True)

from piper import PiperVoice
voice = PiperVoice.load(os.path.join(VOICE_DIR, VOICE + '.onnx'))

def spoken(t):
    # Ellipses make Piper pause oddly; use a comma. The manifest key stays the original text.
    return t.replace('...', ', ')

manifest, made = {}, 0
for t in texts:
    name = hashlib.sha1(t.encode()).hexdigest()[:10] + '.mp3'
    manifest[t] = name
    dst = os.path.join(OUT, name)
    if os.path.exists(dst):
        continue
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        with wave.open(tmp.name, 'wb') as w:
            voice.synthesize_wav(spoken(t), w)
        subprocess.check_call(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name,
                               '-af', 'apad=pad_dur=0.15', '-ac', '1', '-ar', '22050',
                               '-c:a', 'libmp3lame', '-b:a', '40k', dst])
    made += 1

keep = set(manifest.values()) | {'silent.mp3'}
for f in os.listdir(OUT):
    if f not in keep:
        os.remove(os.path.join(OUT, f))
json.dump(dict(sorted(manifest.items())), open(MAN, 'w'), ensure_ascii=False, indent=1)
size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print(f'{len(manifest)} lines, {made} new clips, {size // 1024} KB total')
