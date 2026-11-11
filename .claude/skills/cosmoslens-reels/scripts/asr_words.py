import sys, json
from faster_whisper import WhisperModel
p, out, model = sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'small'
m = WhisperModel(model, device='cpu', compute_type='int8')
segs, info = m.transcribe(p, language='hi', word_timestamps=True, vad_filter=False, beam_size=5)
W = []
for s in segs:
    print(f'[{s.start:6.2f}-{s.end:6.2f}] {s.text}')
    for w in s.words: W.append([round(w.start, 3), round(w.end, 3), w.word.strip()])
json.dump(W, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
