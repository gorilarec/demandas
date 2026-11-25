import { html, useState, useEffect, useRef } from '../../vendor/preact-htm.js';
import { api, action, toast, navigate, setState } from '../store.js';
import { Icon } from '../icons.js';
import { Sheet } from '../components/sheet.js';
import { Chip } from '../components/chip.js';
import { Field, Submit } from '../components/fields.js';
import { number, date, readLocal, writeLocal } from '../util.js';

// Teleprompter de um bloco de gravação (cliente + dia). Dois modos por aparelho:
//  - "tela": mostra o texto rolando (fica na frente da câmera);
//  - "controle": só manda comandos para a tela aberta em outro aparelho (tp_sessions).
const LINE = 1.35; // altura da linha em relação à letra
const GUIDE = 0.36; // altura da linha de leitura (fração da tela)
const limits = { font: [24, 200], speed: [1, 40], width: [40, 100] };
const clamp = (v, [a, b]) => Math.min(b, Math.max(a, v));
const defaults = () => ({
  font: Math.round(clamp(window.innerWidth / 16, [30, 92])),
  speed: 10,
  width: 88,
  mirror: false,
  flip: false,
  countdown: true,
  guide: true,
});
const shared = ['font', 'speed', 'width', 'mirror', 'flip']; // ajustes que o controle remoto enxerga e muda
const loadSettings = () => ({ ...defaults(), ...readLocal('gd-tp-settings', {}) });
export const words = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
// Fala em ritmo de vídeo: perto de 150 palavras por minuto.
export const estimate = (text) => clock(Math.round((words(text) / 150) * 60));
export const tpCacheKey = (clientId, day) => `gd-tp-${clientId}-${day}`;
const send = (clientId, day, patch) =>
  api.tpSet(clientId, day, patch).catch((e) => {
    if (e.code === 'network') setState({ offline: true });
    return null;
  });

// Parágrafos do roteiro; o que vem entre [colchetes] é marcação (não é para ler em voz alta).
function Script({ text }) {
  return (text || '')
    .split(/\n\s*\n/)
    .filter((block) => block.trim())
    .map(
      (block) =>
        html`<p>${block.split('\n').map((line, i) => [i > 0 && html`<br/>`, ...line.split(/(\[[^\]\n]{1,80}\])/g).map((part, j) => (j % 2 ? html`<span class="tp-cue">${part}</span>` : part))])}</p>`,
    );
}
function Stepper({ label, value, onStep, step = 1, name }) {
  return html`<div class="tp-stepper" data-tp=${name}><span>${label}</span><div><button type="button" aria-label=${`${label}: menos`} onClick=${() => onStep(-step)}><${Icon} name="minus" size=${22}/></button><output>${value}</output><button type="button" aria-label=${`${label}: mais`} onClick=${() => onStep(step)}><${Icon} name="plus" size=${22}/></button></div></div>`;
}

function Reader({ client, day, demand, list, admin, settings, change, row, remote, offline, goTo, exit }) {
  const [playing, setPlaying] = useState(false);
  const [count, setCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const text = useRef();
  const bar = useRef();
  const pos = useRef(0);
  const frac = useRef(0);
  const spent = useRef(0);
  const seen = useRef(null);
  const drag = useRef(null);
  const alive = useRef(true); // falso depois que este leitor fecha: nada que termine de salvar depois mexe na tela
  const scripted = list.filter((d) => d.script?.trim());
  const at = scripted.findIndex((d) => d.id === demand.id);
  const line = settings.font * LINE;
  const max = () => Math.max(0, (text.current?.offsetHeight || 0) - line * 0.6);
  const paint = () => {
    const m = max();
    pos.current = clamp(pos.current, [0, m]);
    frac.current = m ? pos.current / m : 0;
    if (text.current) text.current.style.transform = `translate3d(0, ${-pos.current}px, 0)`;
    if (bar.current) bar.current.style.transform = `scaleX(${frac.current})`;
  };
  // Só a tela que mostra o texto publica o que acontece nela.
  const publish = (patch) => {
    if (!remote) return;
    send(client.id, day, patch).then((r) => {
      if (r) seen.current = Math.max(seen.current ?? 0, r.seq);
    });
  };
  const stop = () => {
    setCount(0);
    setPlaying(false);
  };
  const start = () => {
    // Tocar com o texto já no fim recomeça do início.
    if (max() > 0 && pos.current >= max() - 1) {
      pos.current = 0;
      spent.current = 0;
      setElapsed(0);
      paint();
    }
    if (settings.countdown && pos.current < 4) setCount(3);
    else setPlaying(true);
  };
  function toggle(local = true) {
    const going = playing || count > 0;
    if (going) stop();
    else start();
    if (local) publish({ playing: !going });
  }
  function jump(lines) {
    if (lines === 'top') {
      pos.current = 0;
      spent.current = 0;
      setElapsed(0);
    } else pos.current += lines * line;
    paint();
  }
  const step = (key, delta) => change({ [key]: clamp(settings[key] + delta, limits[key]) }, true);

  useEffect(() => {
    document.body.classList.add('tp-open');
    let lock;
    const keep = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen');
      } catch {
        /* Sem trava de tela: o aviso fica nos ajustes. */
      }
    };
    keep();
    const visible = () => {
      if (document.visibilityState === 'visible') keep();
      else stop();
    };
    document.addEventListener('visibilitychange', visible);
    // A tela avisa que está aberta (e com quais ajustes) e repete o aviso para o controle saber que ela continua lá.
    publish({ screen: true, demand: demand.id, playing: false, ...Object.fromEntries(shared.map((k) => [k, settings[k]])) });
    const beat = setInterval(() => publish({ screen: true }), 25000);
    return () => {
      alive.current = false;
      document.body.classList.remove('tp-open');
      document.removeEventListener('visibilitychange', visible);
      clearInterval(beat);
      lock?.release?.().catch(() => {});
    };
  }, []);
  // Rolagem: a velocidade vale em linhas por minuto (nível 20 = 1 linha por segundo), então não muda com o tamanho da letra.
  useEffect(() => {
    if (!playing) return;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!drag.current?.moved) pos.current += ((settings.speed * line) / 20) * dt;
      spent.current += dt;
      const end = pos.current >= max();
      paint();
      if (end) {
        setPlaying(false);
        publish({ playing: false });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timer = setInterval(() => setElapsed(spent.current), 500);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      setElapsed(spent.current);
    };
  }, [playing, settings.speed, settings.font]);
  useEffect(() => {
    if (!count) return;
    const timer = setTimeout(() => {
      if (count === 1) {
        setCount(0);
        setPlaying(true);
      } else setCount(count - 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [count]);
  // Letra ou largura mudou: o texto se rearruma e a leitura continua no mesmo ponto.
  useEffect(() => {
    const keepAt = frac.current;
    const raf = requestAnimationFrame(() => {
      pos.current = keepAt * max();
      paint();
    });
    return () => cancelAnimationFrame(raf);
  }, [settings.font, settings.width, demand.script]);
  // Comando vindo de outro aparelho. O primeiro retrato só marca de onde começar; comando velho não é repetido.
  useEffect(() => {
    if (!row || !remote) return;
    if (seen.current == null) {
      seen.current = row.seq;
      return;
    }
    if (row.seq <= seen.current) return;
    seen.current = row.seq;
    const s = row.state || {};
    const next = {};
    for (const k of shared) if (s[k] != null && s[k] !== settings[k]) next[k] = s[k];
    if (Object.keys(next).length) change(next, false);
    if (s.cmd === 'top') jump('top');
    else if (s.cmd === 'back') jump(-3);
    else if (s.cmd === 'forward') jump(3);
    if (typeof s.playing === 'boolean' && s.playing !== (playing || count > 0)) toggle(false);
  }, [row?.seq]);
  useEffect(() => {
    const key = (e) => {
      if (sheet || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const k = e.key;
      const onButton = !!e.target.closest?.('button, a');
      if (k === ' ' || k === 'Enter') {
        if (onButton) return;
        e.preventDefault();
        toggle();
      } else if (k === 'PageDown') {
        e.preventDefault();
        toggle();
      } else if (k === 'ArrowUp') {
        e.preventDefault();
        step('speed', 1);
      } else if (k === 'ArrowDown') {
        e.preventDefault();
        step('speed', -1);
      } else if (k === 'ArrowLeft' || k === 'PageUp') {
        e.preventDefault();
        jump(-3);
      } else if (k === 'ArrowRight') {
        e.preventDefault();
        jump(3);
      } else if (k === '+' || k === '=') step('font', 4);
      else if (k === '-' || k === '_') step('font', -4);
      else if (k === 'Home') jump('top');
      else if (k === 'm' || k === 'M') change({ mirror: !settings.mirror }, true);
      else if (k === 'Escape') exit();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  });
  const down = (e) => {
    drag.current = { y: e.clientY, pos: pos.current, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const g = drag.current;
    if (!g) return;
    const dy = e.clientY - g.y;
    if (Math.abs(dy) > 8) g.moved = true;
    if (g.moved) {
      pos.current = g.pos - dy * (settings.flip ? -1 : 1);
      paint();
    }
  };
  const up = () => {
    const g = drag.current;
    drag.current = null;
    if (g && !g.moved) toggle();
  };
  async function markDone(e) {
    e.preventDefault();
    setBusy(true);
    const r = await action(() => api.setStatus(demand.id, 'recorded', null, day), `${number(demand.number)} gravado`);
    if (r.ok && draft.trim()) await action(() => api.updateDemand(demand.id, { camera_clips: draft.trim() }));
    // Se a pessoa já saiu deste roteiro enquanto salvava, não puxa ela de volta.
    if (!alive.current) return;
    setBusy(false);
    if (!r.ok) return;
    setSheet(null);
    const next = scripted.find((d, i) => i > at && d.status === 'requested') || scripted.find((d) => d.id !== demand.id && d.status === 'requested');
    goTo(next || null);
  }
  async function saveText(e) {
    e.preventDefault();
    setBusy(true);
    const r = await action(() => api.updateDemand(demand.id, { script: draft }), 'Roteiro atualizado');
    if (!alive.current) return;
    setBusy(false);
    if (r.ok) setSheet(null);
  }
  const going = playing || count > 0;
  const canEdit = !offline && (admin || ['requested', 'recorded'].includes(demand.status));
  const flips = `${settings.mirror ? ' mirror' : ''}${settings.flip ? ' flip' : ''}`;
  return html`<div class=${`tp ${going ? 'playing' : 'paused'}`} style=${`--tp-font:${settings.font}px;--tp-line:${line}px;--tp-width:${settings.width}%;--tp-guide:${GUIDE * 100}%`}>
<div class=${`tp-view${flips}`} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${() => (drag.current = null)} onWheel=${(e) => {
    pos.current += e.deltaY;
    paint();
  }}><div class="tp-column"><div class="tp-text" ref=${text}><${Script} text=${demand.script}/><p class="tp-end">· fim ·</p></div></div>${settings.guide && html`<div class="tp-guide" aria-hidden="true"><i></i><i></i></div>`}</div>
<div class="tp-progress" aria-hidden="true"><i ref=${bar}></i></div>
${count > 0 && html`<div class="tp-count" aria-live="assertive">${count}</div>`}
<header class="tp-top"><button class="icon-button" aria-label="Voltar aos roteiros" onClick=${() => goTo(null)}><${Icon} name="back"/></button><div class="tp-title"><b>${number(demand.number)} · ${demand.title}</b><small>${at + 1} de ${scripted.length} · ${words(demand.script)} palavras · ≈ ${estimate(demand.script)}</small></div><span class="tp-clock mono" data-tp="clock">${clock(elapsed)}</span>${demand.status === 'requested' && !offline && html`<button class="button primary tp-done" onClick=${() => {
    stop();
    setDraft(demand.camera_clips || '');
    setSheet('done');
  }}><${Icon} name="check" size=${18}/>Gravado</button>`}<button class="icon-button" aria-label="Ajustes do teleprompter" onClick=${() => {
    stop();
    setSheet('settings');
  }}><${Icon} name="settings"/></button></header>
<footer class="tp-bottom"><div class="tp-transport"><button type="button" class="tp-key" aria-label="Voltar ao começo" onClick=${() => jump('top')}><${Icon} name="restart" size=${24}/><span>Começo</span></button><button type="button" class="tp-key" aria-label="Voltar um pouco" onClick=${() => jump(-3)}><${Icon} name="rewind" size=${24}/><span>Voltar</span></button><button type="button" class="tp-play" data-tp="play" aria-label=${going ? 'Pausar' : 'Tocar'} onClick=${() => toggle()}><${Icon} name=${going ? 'pause' : 'play'} size=${30}/><span>${going ? 'Pausar' : 'Tocar'}</span></button><button type="button" class="tp-key" aria-label="Avançar um pouco" onClick=${() => jump(3)}><${Icon} name="forward" size=${24}/><span>Avançar</span></button><button type="button" class="tp-key" aria-label="Próximo roteiro" disabled=${at < 0 || at >= scripted.length - 1} onClick=${() => goTo(scripted[at + 1])}><${Icon} name="next" size=${24}/><span>Próximo</span></button></div><div class="tp-steppers"><${Stepper} name="speed" label="Velocidade" value=${settings.speed} onStep=${(d) => step('speed', d)}/><${Stepper} name="font" label="Letra" value=${settings.font} step=${4} onStep=${(d) => step('font', d)}/></div></footer>
${
  sheet === 'settings' &&
  html`<${Sheet} title="Ajustes do teleprompter" onClose=${() => setSheet(null)}><label class="field"><span>Largura do texto: ${settings.width}%</span><input type="range" min="40" max="100" step="2" value=${settings.width} onInput=${(e) => change({ width: Number(e.target.value) }, true)}/></label>${[
    ['mirror', 'Espelhar', 'Para usar com vidro de teleprompter'],
    ['flip', 'Virar de cabeça para baixo', 'Para aparelho montado ao contrário'],
    ['countdown', 'Contagem 3, 2, 1', 'Antes de começar a rolar'],
    ['guide', 'Linha de leitura', 'Marca a altura para onde olhar'],
  ].map(
    ([key, label, hint]) =>
      html`<label class="switch-field"><span>${label}<small>${hint}</small></span><input type="checkbox" role="switch" checked=${settings[key]} onChange=${(e) => change({ [key]: e.target.checked }, true)}/></label>`,
  )}<div class="button-row">${canEdit && html`<button class="button secondary" onClick=${() => {
    setDraft(demand.script || '');
    setSheet('edit');
  }}><${Icon} name="edit"/>Corrigir o texto</button>`}${document.documentElement.requestFullscreen && html`<button class="button secondary" onClick=${() => {
    (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
    setSheet(null);
  }}><${Icon} name="screen"/>Tela cheia</button>`}</div>${!('wakeLock' in navigator) && html`<p class="notice">Este aparelho pode apagar a tela sozinho. Aumente o tempo de bloqueio nos ajustes do aparelho antes de gravar.</p>`}<p class="muted tp-keys">Teclado ou controle Bluetooth: espaço toca e pausa · setas para cima e para baixo mudam a velocidade · seta para a esquerda volta um pouco · + e − mudam a letra · M espelha.</p><//>`
}
${
  sheet === 'edit' &&
  html`<${Sheet} title="Corrigir o texto" onClose=${() => setSheet(null)}><form onSubmit=${saveText}><label class="field"><span>Roteiro</span><textarea rows="12" maxlength="20000" value=${draft} onInput=${(e) => setDraft(e.target.value)}/><small>Use [colchetes] para marcações que não são lidas, como [pausa] ou [gancho 2].</small></label><${Submit} busy=${busy}>Salvar roteiro<//></form><//>`
}
${
  sheet === 'done' &&
  html`<${Sheet} title=${`Gravou ${number(demand.number)}?`} onClose=${() => setSheet(null)}><form onSubmit=${markDone}><${Field} label="Clipes da câmera (opcional)" value=${draft} onInput=${(e) => setDraft(e.target.value)} maxlength="200" placeholder="ex.: C4116 a C4119" class="mono"/><${Submit} busy=${busy}>Marcar como gravado e ir para o próximo<//></form><//>`
}
</div>`;
}

function Controller({ demand, list, row, connected, push: sendTo, goTo, offline, onDone }) {
  const s = { speed: 10, font: 64, mirror: false, playing: false, ...(row?.state || {}) };
  // Todo comando leva o roteiro deste controle: se a tela estiver na lista (ou em outro roteiro), ela abre este.
  const push = (patch) => sendTo({ demand: demand.id, ...patch });
  const scripted = list.filter((d) => d.script?.trim());
  const at = scripted.findIndex((d) => d.id === demand.id);
  const stepTo = (key, delta) => push({ [key]: clamp(s[key] + delta, limits[key]) });
  return html`<div class="tp tp-remote"><header class="tp-top"><button class="icon-button" aria-label="Voltar aos roteiros" onClick=${() => goTo(null)}><${Icon} name="back"/></button><div class="tp-title"><b>${number(demand.number)} · ${demand.title}</b><small>Controle · ${at + 1} de ${scripted.length} · ≈ ${estimate(demand.script)}</small></div></header>
<div class="tp-remote-body"><p class=${`tp-link ${connected ? 'on' : 'off'}`} role="status"><i></i>${connected ? 'Tela conectada' : 'Nenhuma tela aberta. No aparelho da câmera, abra este teleprompter e escolha "Ler neste aparelho".'}</p>
<button type="button" class="tp-big" data-tp="remote-play" onClick=${() => push({ playing: !s.playing })}><${Icon} name=${s.playing ? 'pause' : 'play'} size=${40}/>${s.playing ? 'Pausar' : 'Tocar'}</button>
<div class="tp-remote-row"><button type="button" class="tp-key" onClick=${() => push({ cmd: 'top', playing: false })}><${Icon} name="restart" size=${24}/><span>Começo</span></button><button type="button" class="tp-key" onClick=${() => push({ cmd: 'back' })}><${Icon} name="rewind" size=${24}/><span>Voltar</span></button><button type="button" class="tp-key" onClick=${() => push({ cmd: 'forward' })}><${Icon} name="forward" size=${24}/><span>Avançar</span></button></div>
<div class="tp-steppers"><${Stepper} name="speed" label="Velocidade" value=${s.speed} onStep=${(d) => stepTo('speed', d)}/><${Stepper} name="font" label="Letra" value=${s.font} step=${4} onStep=${(d) => stepTo('font', d)}/></div>
<label class="switch-field"><span>Espelhar<small>Para usar com vidro de teleprompter</small></span><input type="checkbox" role="switch" checked=${!!s.mirror} onChange=${(e) => push({ mirror: e.target.checked })}/></label>
<div class="tp-remote-row tp-nav"><button type="button" class="tp-key" disabled=${at <= 0} onClick=${() => goTo(scripted[at - 1])}><${Icon} name="back" size=${22}/><span>Roteiro anterior</span></button><button type="button" class="tp-key" disabled=${at < 0 || at >= scripted.length - 1} onClick=${() => goTo(scripted[at + 1])}><span>Próximo roteiro</span><${Icon} name="arrow" size=${22}/></button></div>
${demand.status === 'requested' && !offline && html`<button type="button" class="button primary tp-remote-done" onClick=${onDone}><${Icon} name="check"/>Marcar como gravado</button>`}
<details class="tp-peek"><summary>Ver o texto deste roteiro</summary><div class="tp-peek-text"><${Script} text=${demand.script}/></div></details></div></div>`;
}

export default function Teleprompter({ client, bundle, admin, day, demandId, offline = false }) {
  const [savedMode, setMode] = useState(() => (readLocal('gd-tp-mode', 'tela') === 'controle' ? 'controle' : 'tela'));
  // Sem sinal não há o que controlar: o aparelho vira leitor.
  const mode = offline ? 'tela' : savedMode;
  const [settings, setSettings] = useState(loadSettings);
  const [row, setRow] = useState(null);
  const [seenScreen, setSeenScreen] = useState(0);
  const [, setTick] = useState(0);
  const base = useRef(null); // seq do primeiro retrato: só o que vier depois dele é comando ao vivo
  const shoot = bundle.shoots.find((s) => s.shot_on === day);
  const list = bundle.demands.filter((d) => shoot && d.shoot_id === shoot.id).sort((a, b) => a.number - b.number);
  const scripted = list.filter((d) => d.script?.trim());
  const demand = scripted.find((d) => d.id === demandId) || null;
  const here = `/c/${client.id}/tp/${day}`;
  const remote = !offline;
  // Roteiro aberto agora; vira null quando o teleprompter fecha. Quem termina de salvar depois confere antes de navegar.
  const where = useRef(demandId);
  where.current = demandId;
  useEffect(
    () => () => {
      where.current = undefined;
    },
    [],
  );
  const accept = (r, first = false) => {
    if (!r) return;
    if (first && base.current == null) base.current = r.seq;
    setRow((old) => (!old || r.seq >= old.seq ? r : old));
  };
  const push = async (patch) => {
    const r = await send(client.id, day, patch);
    if (r) accept(r);
    else toast('Sem sinal: o comando não chegou na outra tela', 'error');
    return r;
  };
  const goTo = (d) => {
    if (d && mode === 'controle' && remote) push({ demand: d.id, playing: false, cmd: 'top' });
    navigate(d ? `${here}/${d.id}` : here);
  };
  function change(patch, local) {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      writeLocal('gd-tp-settings', next);
    } catch {
      /* Sem espaço no aparelho: os ajustes valem até fechar. */
    }
    const out = Object.fromEntries(Object.entries(patch).filter(([k]) => shared.includes(k)));
    if (local && remote && mode === 'tela' && Object.keys(out).length) send(client.id, day, out).then((r) => accept(r));
  }
  function pickMode(next) {
    setMode(next);
    try {
      writeLocal('gd-tp-mode', next);
    } catch {}
  }
  // Roteiros do dia ficam guardados no aparelho: sem sinal no set, o teleprompter abre do mesmo jeito.
  useEffect(() => {
    if (offline || !list.length) return;
    try {
      writeLocal(tpCacheKey(client.id, day), {
        client: { id: client.id, name: client.name, accent: client.accent },
        day,
        demands: list.map(({ id, number, title, script, status, camera_clips }) => ({ id, number, title, script, status, camera_clips, client_id: client.id })),
      });
    } catch {}
  }, [list.map((d) => `${d.id}${d.status}${(d.script || '').length}`).join()]);
  useEffect(() => {
    if (!remote) return;
    let alive = true;
    api
      .tpGet(client.id, day)
      .then((r) => {
        if (!alive) return;
        if (!r) base.current = 0;
        accept(r, true);
      })
      .catch(() => {
        base.current ??= 0;
      });
    const off = api.subscribeTp(client.id, day, (r) => alive && accept(r));
    const timer = setInterval(() => setTick((n) => n + 1), 5000);
    return () => {
      alive = false;
      // Na demonstração a função de desligar chega como promessa.
      Promise.resolve(off).then((fn) => fn?.());
      clearInterval(timer);
    };
  }, [client.id, day]);
  // A tela avisou que está aberta (a hora é a do servidor; aqui só conta quando o aviso chegou).
  useEffect(() => {
    if (!row?.screen_at) return;
    const age = Date.now() - Date.parse(row.screen_at);
    setSeenScreen(base.current === row.seq && age > 60000 ? 0 : Date.now());
  }, [row?.screen_at]);
  // Na lista, a tela que vai mostrar o texto também avisa que está aberta (o controle enxerga "Tela conectada").
  useEffect(() => {
    if (!remote || mode !== 'tela' || demand) return;
    const beat = () => send(client.id, day, { screen: true, demand: null }).then((r) => accept(r));
    beat();
    const timer = setInterval(beat, 25000);
    return () => clearInterval(timer);
  }, [mode, !!demand, client.id, day]);
  // Outro aparelho trocou de roteiro: este acompanha. Só vale quando o roteiro MUDA; o mesmo valor repetido
  // (um aviso de "tela aberta", por exemplo) não puxa ninguém de volta.
  const lastDemand = useRef(undefined);
  useEffect(() => {
    if (!row) return;
    const target = row.state?.demand ?? null;
    const changed = lastDemand.current !== undefined && target !== lastDemand.current;
    lastDemand.current = target;
    if (!changed || base.current == null || row.seq <= base.current || !target || target === demandId) return;
    if (scripted.some((d) => d.id === target)) navigate(`${here}/${target}`);
  }, [row?.seq]);
  const connected = Date.now() - seenScreen < 60000;
  if (demand && mode === 'controle')
    return html`<${Controller} key=${demand.id} demand=${demand} list=${list} row=${row} connected=${connected} push=${push} goTo=${goTo} offline=${offline} onDone=${async () => {
      const r = await action(() => api.setStatus(demand.id, 'recorded', null, day), `${number(demand.number)} gravado`);
      if (!r.ok || where.current !== demand.id) return;
      const at = scripted.findIndex((d) => d.id === demand.id);
      goTo(scripted.find((d, i) => i > at && d.status === 'requested') || null);
    }}/>`;
  if (demand)
    return html`<${Reader} key=${demand.id} client=${client} day=${day} demand=${demand} list=${list} admin=${admin} settings=${settings} change=${change} row=${row} remote=${remote} offline=${offline} goTo=${goTo} exit=${() => navigate(here)}/>`;
  return html`<div class="tp tp-list"><header class="tp-top"><a class="icon-button" href=${`#/c/${client.id}/gravacao`} aria-label="Voltar à gravação"><${Icon} name="back"/></a><div class="tp-title"><b>Teleprompter</b><small>${client.name} · gravação de ${date(day)}</small></div></header>
<div class="tp-list-body">${offline && html`<p class="notice">Sem sinal. Estes são os roteiros guardados neste aparelho; dá para ler normalmente.</p>`}
${remote && html`<div class="choice-row tp-mode" role="group" aria-label="O que este aparelho faz"><button type="button" aria-pressed=${mode === 'tela'} class=${mode === 'tela' ? 'selected' : ''} onClick=${() => pickMode('tela')}><${Icon} name="screen" size=${18}/>Ler neste aparelho</button><button type="button" aria-pressed=${mode === 'controle'} class=${mode === 'controle' ? 'selected' : ''} onClick=${() => pickMode('controle')}><${Icon} name="remote" size=${18}/>Controlar outra tela</button></div><p class="muted tp-mode-hint">${mode === 'tela' ? 'O texto rola aqui. Quem estiver com o controle em outro aparelho toca, pausa e troca de roteiro.' : html`Este aparelho vira o controle. ${connected ? html`<b class="tp-on">Tela conectada.</b>` : 'No aparelho da câmera, abra este teleprompter e escolha "Ler neste aparelho".'}`}</p>`}
<h2 class="eyebrow">ROTEIROS DESTE DIA (${scripted.length})</h2>
${scripted.map((d) => html`<button type="button" key=${d.id} class="tp-item" onClick=${() => goTo(d)}><span class="mono accent">${number(d.number)}</span><span class="tp-item-main"><b>${d.title}</b><small>${words(d.script)} palavras · ≈ ${estimate(d.script)}</small></span><${Chip} status=${d.status}/><${Icon} name="chevron" size=${16}/></button>`)}
${!scripted.length && html`<p class="muted">Nenhum roteiro em texto neste dia. Em Gravação, escolha o dia e adicione os roteiros que vão ser gravados.</p>`}
${list.length > scripted.length && html`<p class="muted tp-missing">${list.length - scripted.length} ${list.length - scripted.length === 1 ? 'vídeo deste dia está' : 'vídeos deste dia estão'} sem roteiro em texto: ${list.filter((d) => !d.script?.trim()).map((d) => `${number(d.number)} ${d.title}`).join(' · ')}. Abra o vídeo em Demandas e cole o roteiro em Editar.</p>`}</div></div>`;
}
