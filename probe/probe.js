// Machbarkeitsprobe B1: prüft auf dem iPhone die Annahmen, auf denen die Übungs-App aufbaut.
import Anthropic from '../vendor/anthropic-sdk.mjs';

const sdk = window.SpeechSDK;
const $ = (id) => document.getElementById(id);
const BEFEHLE = ['again', 'next', 'pause', 'stop', 'explain'];
const STIMME_EN = 'en-US-AvaNeural';
const STIMME_MULTI = 'en-US-AvaMultilingualNeural';

// ---------- Protokoll ----------
const protokoll = [];
function notiere(probe, text, klasse = '') {
  const zeile = `[${new Date().toLocaleTimeString('de-DE')}] ${probe}: ${text}`;
  protokoll.push(zeile);
  $('protokoll').textContent = protokoll.join('\n');
  return klasse ? `<span class="${klasse}">${text}</span>` : text;
}
function zeige(id, text, klasse) {
  $(id).innerHTML = klasse ? `<span class="${klasse}">${text}</span>` : text;
}

const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
$('modus').textContent = standalone ? 'Läuft als Homescreen-App.' : 'Läuft im Browser, nicht als Homescreen-App – für die Probe bitte vom Homescreen öffnen.';
notiere('Start', `${standalone ? 'Homescreen-Modus' : 'Browser-Modus'}, ${navigator.userAgent}`);

// ---------- Schlüssel (nur lokal) ----------
const speicher = {
  lies(k) { try { return localStorage.getItem('probe.' + k) || ''; } catch { return ''; } },
  schreib(k, v) { try { localStorage.setItem('probe.' + k, v); return true; } catch { return false; } },
};
for (const k of ['azureKey', 'azureRegion', 'anthropicKey']) $(k).value = speicher.lies(k);
$('speichern').onclick = () => {
  const ok = ['azureKey', 'azureRegion', 'anthropicKey'].every((k) => speicher.schreib(k, $(k).value.trim()));
  notiere('Schlüssel', ok ? 'gespeichert' : 'Speichern nicht möglich');
};
const azure = () => {
  const key = $('azureKey').value.trim(), region = $('azureRegion').value.trim() || 'westeurope';
  if (!key) throw new Error('Azure-Schlüssel fehlt');
  const cfg = sdk.SpeechConfig.fromSubscription(key, region);
  cfg.speechRecognitionLanguage = 'en-US';
  return cfg;
};

// ---------- Audio-Wiedergabe über Web Audio ----------
let ctx;
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.onstatechange = () => notiere('11 Unterbrechung', `AudioContext: ${ctx.state}`);
  }
  if (ctx.state !== 'running') ctx.resume();
  return ctx;
}
function spiele(puffer) {
  return new Promise((fertig) => {
    const q = audio().createBufferSource();
    q.buffer = puffer; q.connect(ctx.destination); q.onended = fertig; q.start();
  });
}
function signalton() {
  const a = audio(), o = a.createOscillator(), g = a.createGain();
  o.frequency.value = 880; g.gain.value = 0.15; o.connect(g).connect(a.destination);
  o.start(); o.stop(a.currentTime + 0.15);
  return new Promise((r) => setTimeout(r, 250));
}
function synthetisiere(ssml) {
  return new Promise((ok, nein) => {
    const cfg = azure();
    cfg.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
    const s = new sdk.SpeechSynthesizer(cfg, null);
    s.speakSsmlAsync(ssml, (r) => {
      s.close();
      if (r.reason === sdk.ResultReason.SynthesizingAudioCompleted) audio().decodeAudioData(r.audioData.slice(0)).then(ok, nein);
      else nein(new Error(r.errorDetails || 'Sprachausgabe fehlgeschlagen'));
    }, (e) => { s.close(); nein(new Error(e)); });
  });
}
const ssmlEn = (text) => `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${STIMME_EN}">${esc(text)}</voice></speak>`;
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- Mikrofon-Bezeichnung ----------
async function mikrofonName() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    const name = s.getAudioTracks()[0]?.label || 'unbekannt';
    s.getTracks().forEach((t) => t.stop());
    return name;
  } catch { return 'kein Zugriff'; }
}

// ---------- 1 Mikrofon ----------
$('p1').onclick = async () => {
  audio();
  try {
    const name = await mikrofonName();
    zeige('o1', notiere('1 Mikrofon', `Zugriff ok: ${name}`), 'ok');
  } catch (e) {
    zeige('o1', notiere('1 Mikrofon', `kein Zugriff: ${e.message}`), 'fehler');
  }
};

// ---------- 2 Wake Lock ----------
let sperre = null;
async function wachHalten() {
  if (!('wakeLock' in navigator)) return zeige('o2', notiere('2 Wake Lock', 'nicht unterstützt'), 'fehler');
  try {
    sperre = await navigator.wakeLock.request('screen');
    sperre.onrelease = () => notiere('2 Wake Lock', 'freigegeben');
    zeige('o2', notiere('2 Wake Lock', 'aktiv'), 'ok');
  } catch (e) { zeige('o2', notiere('2 Wake Lock', `abgelehnt: ${e.name}`), 'fehler'); }
}
$('p2').onclick = wachHalten;

// ---------- 11 Sichtbarkeit und Unterbrechungen ----------
const ereignisse = [];
function ereignis(text) { ereignisse.push(`${new Date().toLocaleTimeString('de-DE')} ${text}`); $('o11').textContent = ereignisse.join('\n'); notiere('11 Unterbrechung', text); }
document.addEventListener('visibilitychange', () => {
  ereignis(`Seite ${document.visibilityState === 'visible' ? 'wieder sichtbar' : 'verborgen'}`);
  if (document.visibilityState === 'visible' && sperre) wachHalten();
});
window.addEventListener('pagehide', () => ereignis('pagehide'));
window.addEventListener('pageshow', (e) => ereignis(`pageshow${e.persisted ? ' (aus Cache)' : ''}`));

// ---------- 3 Aussprache ----------
function bewerte(zielsatz, { mitGegenprobe = false } = {}) {
  return new Promise((ok, nein) => {
    const cfg = azure();
    const reco = new sdk.SpeechRecognizer(cfg, sdk.AudioConfig.fromDefaultMicrophoneInput());
    const pa = sdk.PronunciationAssessmentConfig.fromJSON(JSON.stringify({
      referenceText: zielsatz, gradingSystem: 'HundredMark', granularity: 'Phoneme', phonemeAlphabet: 'IPA', nBestPhonemeCount: 5,
    }));
    pa.enableProsodyAssessment = true;
    pa.applyTo(reco);
    reco.recognizeOnceAsync((r) => {
      const ende = performance.now();
      reco.close();
      if (r.reason !== sdk.ResultReason.RecognizedSpeech) return nein(new Error(r.reason === sdk.ResultReason.NoMatch ? 'nichts erkannt' : (r.errorDetails || 'Erkennung fehlgeschlagen')));
      const json = JSON.parse(r.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult));
      ok({ text: r.text, json, ende, mitGegenprobe });
    }, (e) => { reco.close(); nein(new Error(e)); });
  });
}
function auswerten(json) {
  const best = json.NBest?.[0] ?? {};
  const pa = best.PronunciationAssessment ?? {};
  const woerter = (best.Words ?? []).map((w) => {
    const laute = (w.Phonemes ?? []).map((p) => {
      const kandidat = p.PronunciationAssessment?.NBestPhonemes?.[0];
      return { soll: p.Phoneme, ist: kandidat?.Phoneme, wert: p.PronunciationAssessment?.AccuracyScore };
    });
    const schlecht = laute.filter((l) => l.ist && l.ist !== l.soll);
    return { wort: w.Word, wert: w.PronunciationAssessment?.AccuracyScore, fehler: w.PronunciationAssessment?.ErrorType, schlecht };
  });
  const auffaellig = woerter.filter((w) => w.wert < 80 || (w.fehler && w.fehler !== 'None'));
  return { gesamt: pa.PronScore, genau: pa.AccuracyScore, fluess: pa.FluencyScore, prosodie: pa.ProsodyScore, konfidenz: best.Confidence, woerter, auffaellig };
}
function beschreibe(a) {
  const teile = a.auffaellig.map((w) => {
    const l = w.schlecht[0];
    return `${w.wort} (${Math.round(w.wert ?? 0)}${l ? `, /${l.soll}/ klang wie /${l.ist}/` : ''}${w.fehler && w.fehler !== 'None' ? `, ${w.fehler}` : ''})`;
  });
  return teile.length ? teile.join('; ') : '–';
}
$('p3').onclick = async () => {
  audio();
  const zielsatz = $('zielsatz').value.trim();
  zeige('o3', 'Sprich jetzt …');
  try {
    const mikro = await mikrofonName();
    const r = await bewerte(zielsatz);
    const a = auswerten(r.json);
    const art = $('art').value;
    zeige('o3', notiere('3 Aussprache', `${art}, ${zielsatz ? 'mit' : 'ohne'} Zielsatz, ${mikro}: erkannt „${r.text}“ · Gesamt ${Math.round(a.gesamt ?? 0)} · Genauigkeit ${Math.round(a.genau ?? 0)} · Flüssigkeit ${Math.round(a.fluess ?? 0)} · Prosodie ${Math.round(a.prosodie ?? 0)} · Konfidenz ${(a.konfidenz ?? 0).toFixed(2)} · auffällig: ${beschreibe(a)}`));
    const zeile = document.createElement('tr');
    for (const wert of [art, mikro, Math.round(a.gesamt ?? 0), Math.round(a.genau ?? 0), beschreibe(a)]) {
      const td = document.createElement('td'); td.textContent = wert; zeile.append(td);
    }
    $('t3').tBodies[0].append(zeile);
  } catch (e) { zeige('o3', notiere('3 Aussprache', `Fehler: ${e.message}`), 'fehler'); }
};

// ---------- 4 Sprachbefehle ----------
function befehl(text) {
  const w = text.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean);
  return w.length === 1 && BEFEHLE.includes(w[0]) ? w[0] : null;
}
function hoereBefehle(sekunden, beiBefehl) {
  return new Promise((fertig, nein) => {
    let reco;
    try { reco = new sdk.SpeechRecognizer(azure(), sdk.AudioConfig.fromDefaultMicrophoneInput()); } catch (e) { return nein(e); }
    let ende = false;
    const stopp = () => { if (ende) return; ende = true; reco.stopContinuousRecognitionAsync(() => { reco.close(); fertig(); }, () => { reco.close(); fertig(); }); };
    reco.recognized = (_, e) => {
      if (e.result.reason !== sdk.ResultReason.RecognizedSpeech || !e.result.text) return;
      const b = befehl(e.result.text);
      if (beiBefehl(e.result.text, b) === 'ende') stopp();
    };
    reco.startContinuousRecognitionAsync(() => setTimeout(stopp, sekunden * 1000), (e) => nein(new Error(e)));
  });
}
$('p4').onclick = async () => {
  audio();
  const zeilen = [];
  zeige('o4', 'Höre 20 Sekunden zu …');
  try {
    await hoereBefehle(20, (text, b) => {
      zeilen.push(`„${text}“ → ${b ? 'Befehl ' + b : 'kein Befehl'}`);
      $('o4').textContent = zeilen.join('\n');
    });
    notiere('4 Sprachbefehle', zeilen.join(' | ') || 'nichts erkannt');
    $('o4').textContent = (zeilen.join('\n') || 'nichts erkannt') + '\nfertig';
  } catch (e) { zeige('o4', notiere('4 Sprachbefehle', `Fehler: ${e.message}`), 'fehler'); }
};

// ---------- 5 Claude Haiku ----------
let claude;
function haiku(system, frage) {
  const apiKey = $('anthropicKey').value.trim();
  if (!apiKey) throw new Error('Anthropic-Schlüssel fehlt');
  claude ??= new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  return claude.messages.create({
    model: 'claude-haiku-5-5',
    max_tokens: 1024,
    output_config: { effort: 'low' },
    system,
    messages: [{ role: 'user', content: frage }],
  });
}
const text = (antwort) => antwort.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
function claudeFehler(e) {
  if (e instanceof Anthropic.AuthenticationError) return 'Anthropic-Schlüssel ungültig oder abgelaufen';
  if (e instanceof Anthropic.NotFoundError) return 'Modell nicht gefunden';
  if (e instanceof Anthropic.RateLimitError) return 'Zu viele Anfragen oder Ausgabenlimit erreicht';
  if (e instanceof Anthropic.APIConnectionError) return `Keine Verbindung (${e.message})`;
  if (e instanceof Anthropic.APIError) return `API-Fehler ${e.status}: ${e.message}`;
  return e.message;
}
const SYSTEM_TIPP = 'Du bist ein knapper Aussprache-Coach für einen deutschen Manager. Antworte auf Deutsch in höchstens zwei kurzen Sätzen, die vorgelesen werden. Keine Formatierung, keine Aufzählungen. Englische Wörter darfst du verwenden.';
$('p5').onclick = async () => {
  zeige('o5', 'Sende …');
  const t0 = performance.now();
  try {
    const a = await haiku(SYSTEM_TIPP, 'Im Satz "I think that is right" klang "think" wie "sink". Gib einen kurzen Tipp.');
    const ms = Math.round(performance.now() - t0);
    zeige('o5', notiere('5 Claude', `ok in ${ms} ms (${a.model}, stop: ${a.stop_reason}): ${text(a)}`), 'ok');
  } catch (e) { zeige('o5', notiere('5 Claude', `Fehler: ${claudeFehler(e)}`), 'fehler'); }
};

// ---------- 6 Mehrsprachige Stimme ----------
$('p6').onclick = async () => {
  audio();
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="de-DE"><voice name="${STIMME_MULTI}"><lang xml:lang="de-DE">Achte bei </lang><lang xml:lang="en-US">think</lang><lang xml:lang="de-DE"> auf die Zunge zwischen den Zähnen, nicht </lang><lang xml:lang="en-US">sink</lang><lang xml:lang="de-DE">.</lang></voice></speak>`;
  try {
    const t0 = performance.now();
    const p = await synthetisiere(ssml);
    notiere('6 Stimme', `erzeugt in ${Math.round(performance.now() - t0)} ms, spiele ab`);
    await spiele(p);
    zeige('o6', notiere('6 Stimme', 'abgespielt – klang der Satz deutsch und „think“ englisch?'), 'ok');
  } catch (e) { zeige('o6', notiere('6 Stimme', `Fehler: ${e.message}`), 'fehler'); }
};

// ---------- 7–10 Ablauf ----------
const MUSTER = ['Thank you, I think that\'s the right thing to do.', 'We worked very well together last week.'];
async function ablauf() {
  audio();
  if (sperre === null) await wachHalten();
  const gegenprobe = $('gegenprobe').checked;
  const puffer = [];
  zeige('o7', 'Erzeuge Mustersätze vorab …');
  for (const s of MUSTER) puffer.push(await synthetisiere(ssmlEn(s)));
  let i = 0;
  while (i < MUSTER.length) {
    zeige('o7', `Satz ${i + 1}: Mustersatz …`);
    let mithoeren = null;
    if (gegenprobe) mithoeren = hoereBefehle(6, (t) => { notiere('7 Selbst-Hören', `während Wiedergabe erkannt: „${t}“`, 'warn'); });
    await spiele(puffer[i]);
    if (mithoeren) await mithoeren;
    await signalton();
    zeige('o7', `Satz ${i + 1}: Du bist dran`);
    const r = await bewerte(MUSTER[i]);
    const a = auswerten(r.json);
    const mikro = await mikrofonName();
    notiere('8 Mikrofon', `${mikro}: Gesamt ${Math.round(a.gesamt ?? 0)}, auffällig ${beschreibe(a)}`);
    let tippText = 'Sauber.';
    const schlimm = a.auffaellig[0];
    if (schlimm) {
      const l = schlimm.schlecht[0];
      const frage = `Zielsatz: "${MUSTER[i]}". Schwächstes Wort: "${schlimm.wort}" (Genauigkeit ${Math.round(schlimm.wert ?? 0)} von 100)${l ? `, erwarteter Laut /${l.soll}/, gehört wurde eher /${l.ist}/` : ''}. Gib einen kurzen Tipp.`;
      try { tippText = text(await haiku(SYSTEM_TIPP, frage)); } catch (e) { tippText = 'Fast. Noch einmal genau hinhören.'; notiere('5 Claude', `im Ablauf: ${claudeFehler(e)}`, 'fehler'); }
    }
    const tipp = await synthetisiere(`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="de-DE"><voice name="${STIMME_MULTI}">${esc(tippText)}</voice></speak>`);
    const warte = Math.round(performance.now() - r.ende);
    notiere('9 Wartezeit', `${warte} ms vom Sprechende bis zum Tipp${schlimm ? ' (mit Claude)' : ' (ohne Claude)'}`, warte < 2000 ? 'ok' : 'warn');
    await spiele(tipp);
    zeige('o7', `Satz ${i + 1}: „${tippText}“\nJetzt „again“ oder „next“ sagen (ohne zu tippen) …`);
    let wahl = null;
    await hoereBefehle(8, (_, b) => { if (b === 'again' || b === 'next' || b === 'stop') { wahl = b; return 'ende'; } });
    notiere('10 Ohne Tippen', wahl ? `Befehl ${wahl} erkannt, geht weiter` : 'kein Befehl, weiter');
    if (wahl === 'stop') break;
    if (wahl !== 'again') i++;
  }
  zeige('o7', notiere('7–10 Ablauf', 'Ablauf beendet. Lief alles ohne weiteren Tipp auf den Bildschirm?'), 'ok');
}
$('p7').onclick = () => ablauf().catch((e) => zeige('o7', notiere('7–10 Ablauf', `Fehler: ${e.message}`), 'fehler'));

// ---------- Ergebnis kopieren ----------
$('kopieren').onclick = async () => {
  const inhalt = protokoll.join('\n');
  try { await navigator.clipboard.writeText(inhalt); notiere('Ergebnis', 'in die Zwischenablage kopiert'); }
  catch { notiere('Ergebnis', 'Kopieren nicht möglich – Text unten markieren'); }
};
