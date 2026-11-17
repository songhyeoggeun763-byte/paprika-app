/* 오프라인용 서비스 워커. 한 번 연 뒤에는 인터넷 없이 앱을 연다.
 * __CACHE__ 는 빌드 때 앱 내용의 해시로 바뀐다. 새 버전을 올리면 이전 저장본을 지운다. */
var CACHE = 'paprika-c052c8e16d';
var CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
// 엑셀 읽기·쓰기에 쓰는 라이브러리. 앱(src/excel.js)이 같은 주소에서 불러온다.
var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(CORE).then(function () {
      // 다른 주소의 파일은 응답 내용을 볼 수 없어(opaque) add()가 거절하므로 put()으로 저장한다.
      // 실패해도 설치는 계속한다. 온라인에서 엑셀 기능을 처음 쓸 때 다시 저장한다.
      var req = new Request(XLSX_URL, { mode: 'no-cors' });
      return fetch(req).then(function (res) { return c.put(req, res); }).catch(function () {});
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function keep(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
  }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  // 앱 화면: 인터넷이 되면 새 버전, 안 되면 저장본
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) { return keep('./index.html', res); }).catch(function () {
      return caches.match('./index.html');
    }));
    return;
  }
  // 아이콘·엑셀 라이브러리·글꼴: 저장본 우선, 없으면 받아서 저장
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) { return keep(req, res); });
  }));
});
