// Service Worker do Ecossistema Raiz
// Estratégia: rede primeiro, cache como reserva (offline/rede instável).
// Isso garante que você sempre veja a versão mais recente do sistema quando
// estiver online, e ainda consegue abrir o app (mesmo que sem dados atualizados)
// se ficar sem internet por um momento.

var CACHE_NAME = 'ecossistema-raiz-v1';
var ARQUIVOS_ESSENCIAIS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ARQUIVOS_ESSENCIAIS).catch(function() {
        // Se algum arquivo falhar (ex: ainda não existe), não trava a instalação.
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(nomes) {
      return Promise.all(
        nomes.filter(function(nome) { return nome !== CACHE_NAME; })
             .map(function(nome) { return caches.delete(nome); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Só tratamos requisições GET da própria origem (não mexe em chamadas pro Supabase/Google Fonts etc).
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(function(resposta) {
        // Deu certo online: atualiza o cache com a versão mais nova.
        var respostaClone = resposta.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, respostaClone);
        });
        return resposta;
      })
      .catch(function() {
        // Sem internet: tenta servir do cache.
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
