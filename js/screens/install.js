import { html, useEffect } from '../../vendor/preact-htm.js';
import { PageHead } from '../components/common.js';
import { Icon } from '../icons.js';
import { isIOS, standalone, readLocal } from '../util.js';
import { toast, setState } from '../store.js';
export default function Install({ state }) {
  const ios = isIOS();
  const installed = standalone();
  const saved = readLocal('gd-profile', {});
  useEffect(() => {
    if (ios && !installed && saved.code) {
      history.replaceState(null, '', `${location.pathname}${location.search}#/entrar/${saved.code}`);
      document.querySelector('link[rel="manifest"]')?.remove();
    }
  }, []);
  const steps = ios
    ? [
        ['share', 'Toque em Compartilhar', 'No Safari, abra o menu de compartilhamento.'],
        ['plus', 'Adicionar à Tela de Início', 'Role as opções e encontre esse botão.'],
        ['check', 'Toque em Adicionar', 'Seu painel vai ficar na tela inicial.'],
      ]
    : [
        ['more', 'Abra o menu do navegador', 'Toque nos três pontos no canto do Chrome.'],
        ['download', 'Instalar aplicativo', 'Também pode aparecer como “Adicionar à tela inicial”.'],
        ['check', 'Confirme a instalação', 'O painel fica a um toque de distância.'],
      ];
  return html`<section class="narrow-page install-page"><${PageHead} eyebrow="SEU PAINEL SEMPRE À MÃO" title="Pôr na tela inicial" description=${installed ? 'O painel já está instalado neste aparelho.' : 'Mais rápido para anotar no set e acompanhar suas entregas.'}/><div class="install-brand"><img src="icons/icon.svg" alt="Marca GORILAREC"/><div><b>GORILAREC Demandas</b><span>Seu estúdio em movimento.</span></div></div>${
    !installed &&
    html`${
      !ios &&
      state.installPrompt &&
      html`<button class="button primary" onClick=${async () => {
        await state.installPrompt.prompt();
        const choice = await state.installPrompt.userChoice;
        if (choice.outcome === 'accepted') toast('Instalação solicitada');
        setState({ installPrompt: null });
      }}><${Icon} name="download"/>Instalar aplicativo</button>`
    }<ol class="install-steps">${steps.map(([icon, title, description], i) => html`<li><div class="install-illustration"><${Icon} name=${icon} size=${32}/><span>${i + 1}</span></div><div><h2>${title}</h2><p>${description}</p></div></li>`)}</ol>${ios && !saved.code && html`<div class="notice">Abra seu link de acesso no Safari antes de adicionar à tela inicial. O atalho precisa guardar esse link para você entrar.</div>`}${ios && saved.code && html`<p class="form-hint">Seu link de acesso já está na URL do atalho. Ao abrir pela primeira vez, basta informar seu nome se for solicitado.</p>`}`
  }</section>`;
}
