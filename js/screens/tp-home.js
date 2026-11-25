import { html, useState } from '../../vendor/preact-htm.js';
import { PageHead } from '../components/common.js';
import { Icon } from '../icons.js';
import { scriptDays, dayName, date, today, number } from '../util.js';
import { words } from './teleprompter.js';

// Entrada do teleprompter: as gravações que têm roteiro, com um botão grande para abrir cada uma.
// `sources` = [{ client, bundle }]. No painel de um cliente vem um só; na visão do estúdio vêm todos (`all`).
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Day({ item, main, all }) {
  const { client, day, scripts, todo } = item;
  const name = dayName(day);
  const done = scripts.length - todo;
  const minutes = Math.max(1, Math.round(scripts.reduce((n, d) => n + words(d.script), 0) / 150));
  return html`<article class=${`tp-day ${main ? 'main' : ''}`}>
${all && html`<div class="tp-day-client"><i class="client-dot" style=${`background:${client.accent}`}></i>${client.name}</div>`}
<div class="tp-day-head"><span class="tp-day-when"><b>${name}</b>${!name.includes('/') && html`<small>${date(day)}</small>`}</span><span class="tp-day-count">${plural(scripts.length, 'roteiro', 'roteiros')}</span></div>
<ul class="tp-day-list">${scripts.slice(0, 4).map(
    (d) =>
      html`<li class=${d.status === 'requested' ? '' : 'done'}><span class="mono">${number(d.number)}</span><span class="tp-day-title">${d.title}</span>${d.status !== 'requested' && html`<${Icon} name="check" size=${14}/>`}</li>`,
  )}${scripts.length > 4 && html`<li class="done">e mais ${scripts.length - 4}</li>`}</ul>
<p class="tp-day-meta">≈ ${minutes} min de leitura${done > 0 ? ` · ${done === scripts.length ? 'todos já gravados' : plural(done, 'já gravado', 'já gravados')}` : ''}</p>
<a class=${`button ${main ? 'primary' : 'secondary'} tp-day-open`} href=${`#/c/${client.id}/tp/${day}`}><${Icon} name="play"/>Abrir teleprompter</a>
<a class="text-button tp-day-add" href=${`#/c/${client.id}/gravacao/${day}/roteiro`}><${Icon} name="plus" size=${15}/>Adicionar roteiro neste dia</a>
</article>`;
}

export default function TpHome({ sources, all = false }) {
  const [older, setOlder] = useState(false);
  const t = today();
  const items = sources
    .flatMap(({ client, bundle }) => scriptDays(bundle).map((x) => ({ ...x, client })))
    .sort((a, b) => a.day.localeCompare(b.day) || a.client.name.localeCompare(b.client.name));
  const now = items.filter((x) => x.day === t);
  const next = items.filter((x) => x.day > t);
  const late = items.filter((x) => x.day < t && x.todo > 0).reverse();
  const done = items.filter((x) => x.day < t && x.todo === 0).reverse();
  // O botão em destaque é o da gravação que vem agora: a de hoje ou a próxima com roteiro por gravar.
  const first = [...now, ...next].find((x) => x.todo > 0) || now[0] || null;
  const group = (title, list) =>
    list.length > 0 &&
    html`<h2 class="eyebrow">${title}</h2>${list.map((x) => html`<${Day} key=${`${x.client.id}-${x.day}`} item=${x} main=${x === first} all=${all}/>`)}`;
  const mark = (client, label, kind = 'secondary') =>
    html`<a class=${`button ${kind}`} href=${`#/c/${client.id}/gravacao/roteiro`}><${Icon} name="calendar"/>${label}</a>`;
  return html`<section class="tp-home"><${PageHead} eyebrow=${all ? 'ESTÚDIO / NO SET' : 'NO SET / LEITURA'} title="Teleprompter" description="Escolha a gravação e leia os roteiros na tela."/>
${group('HOJE', now)}${group('PRÓXIMAS GRAVAÇÕES', next)}${group('FALTOU GRAVAR', late)}
${
  !items.length &&
  html`<div class="tp-how"><h2>Nenhum roteiro por aqui ainda</h2><ol><li><span><b>Marque o dia</b> da gravação.</span></li><li><span><b>Cole o texto</b> de cada roteiro.</span></li><li><span><b>No dia, toque em Teleprompter</b> e leia na tela.</span></li></ol></div>`
}
<div class="tp-home-mark">${
    all
      ? html`<h2 class="eyebrow">MARCAR GRAVAÇÃO E MANDAR ROTEIROS</h2><div class="tp-home-clients">${sources.map(({ client }) => html`<a key=${client.id} class="button secondary" href=${`#/c/${client.id}/gravacao/roteiro`}><i class="client-dot" style=${`background:${client.accent}`}></i>${client.name}</a>`)}</div>`
      : mark(sources[0].client, items.length ? 'Marcar outra gravação' : 'Marcar gravação e mandar roteiros', items.length ? 'secondary' : 'primary')
  }</div>
${done.length > 0 && html`<h2 class="eyebrow">JÁ GRAVADAS</h2>${done.slice(0, older ? 40 : 2).map((x) => html`<${Day} key=${`${x.client.id}-${x.day}`} item=${x} all=${all}/>`)}${done.length > 2 && !older && html`<button type="button" class="more-button" onClick=${() => setOlder(true)}>Ver mais ${done.length - 2} ${done.length - 2 === 1 ? 'gravação' : 'gravações'}</button>`}`}
</section>`;
}
