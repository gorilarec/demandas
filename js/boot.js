// Roda antes de tudo (script clássico, fora dos módulos), para a página não precisar de script embutido no HTML.
(function () {
  // Página aberta dentro de moldura de outro site: não mostra nada (contra clique enganado).
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none';
    try {
      window.top.location = window.self.location.href;
    } catch (e) {
      /* moldura de outra origem: a página fica escondida */
    }
    return;
  }
  // iPhone/iPad: sem manifest, o atalho da tela inicial guarda a URL atual.
  var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var manifest = document.querySelector('link[rel="manifest"]');
  if (ios && manifest) manifest.remove();
})();
