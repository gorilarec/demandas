// Roteiros do tutorial. Cada passo aponta para o primeiro elemento VISÍVEL do seletor
// (o mesmo passo serve para celular e computador: a lista traz as duas opções).
const pedir = {
  target: '[data-tour="pedir"], .bottom-nav a[href$="/pedir"], .side-nav a[href$="/pedir"]',
  title: 'Peça um vídeo novo',
  text: 'Toque aqui, conte a ideia e mande links ou arquivos de referência. O pedido chega na hora para o GORILAREC.',
};
const gravar = {
  target: '[data-tour="gravar"], .bottom-nav a[href$="/gravacao"], .side-nav a[href$="/gravacao"]',
  title: 'Gravou? Anote aqui',
  text: 'No dia da gravação, abra o bloco: a data, um link só com os roteiros e o nome de cada vídeo gravado. Assim nada se perde na hora de editar.',
};
const resumo = {
  target: '.stats',
  title: 'Seu resumo',
  text: 'Quantos vídeos estão na fila, quantos estão em edição e quantos foram entregues neste mês.',
};
const lista = {
  target: '.mobile-cards .demand-card, .demand-board .demand-card, .filters',
  title: 'Acompanhe cada vídeo',
  text: 'Cada cartão é um vídeo e a cor mostra a etapa: Pedido, Gravado, Editando, Entregue. Quando ficar pronto, abra o cartão para assistir, aprovar ou pedir ajuste.',
};
const perfil = {
  target: '.topbar .avatar',
  title: 'Deixe o painel à mão',
  text: 'Toque na sua inicial para pôr o app na tela inicial do celular. Este tutorial também fica guardado ali.',
};

export function tourSteps(name, role) {
  if (name === 'cliente')
    return role === 'social' ? [gravar, pedir, resumo, lista, perfil] : [pedir, gravar, resumo, lista, perfil];
  if (name === 'admin-inicio')
    return [
      {
        target: '.page-head a[href="#/clientes/novo"], a[href="#/clientes/novo"]',
        title: 'Um painel para cada cliente',
        text: 'Crie o cliente aqui. O painel dele já nasce com um link de acesso próprio.',
      },
      {
        target: '.client-card',
        title: 'Abra o cliente',
        text: 'Dentro estão as demandas, a gravação, o Drive e os Ajustes, onde fica o link para mandar no WhatsApp.',
      },
      {
        target: '.bottom-nav a[href="#/fila"], .side-nav a[href="#/fila"]',
        title: 'Sua fila de edição',
        text: 'Tudo que está gravado, em edição ou com ajuste pedido, de todos os clientes, em uma lista só.',
      },
    ];
  if (name === 'admin-cliente')
    return [
      {
        target: '.bottom-nav a[href$="/ajustes"], .side-nav a[href$="/ajustes"]',
        title: 'Link de acesso do cliente',
        text: 'Em Ajustes você copia o link deste cliente ou manda direto no WhatsApp. Também vê quem entrou.',
      },
      {
        target: '.bottom-nav a[href$="/drive"], .side-nav a[href$="/drive"]',
        title: 'Entrega pelo Drive',
        text: 'Vídeo com o número da demanda no nome marca como entregue sozinho. O que não casar aparece aqui para você ligar.',
      },
      { ...lista, text: 'Cada cartão é um vídeo. Abra para ver roteiro, clipes e referências, e mude a etapa com um toque.' },
    ];
  return [];
}
