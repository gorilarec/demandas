import { html } from '../../vendor/preact-htm.js';
import { Icon } from '../icons.js';
import { dayName, today } from '../util.js';
// Faixa "gravação marcada": o caminho mais curto até o teleprompter. `shoot` vem de nextShoot().
// `named` mostra o nome do cliente (visão do estúdio); `tour` marca a faixa como alvo do tutorial.
export function ShootBanner({ client, shoot, named = false, tour = false }) {
  const now = shoot.day === today();
  const count = `${shoot.todo} ${shoot.todo === 1 ? 'roteiro' : 'roteiros'} para gravar`;
  const when = now ? 'GRAVAÇÃO HOJE' : 'PRÓXIMA GRAVAÇÃO';
  return html`<a class=${`shoot-banner ${now ? 'today' : ''}`} data-tour=${tour ? 'tp' : undefined} href=${`#/c/${client.id}/tp/${shoot.day}`}><span class="shoot-banner-icon"><${Icon} name="prompter"/></span><span class="shoot-banner-text"><small>${named ? `${client.name} · ${now ? 'HOJE' : dayName(shoot.day)}` : when}</small><b>${named || now ? count : `${dayName(shoot.day)} · ${count}`}</b></span><span class="shoot-banner-go">Abrir teleprompter<${Icon} name="arrow" size=${18}/></span></a>`;
}
