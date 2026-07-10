importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

const CACHE='exchange-diary-v7';
const FIREBASE_CONFIG={
  apiKey:"AIzaSyCS5jVD_7h1hVUl7vTALZdqPFR4azXkghw",
  authDomain:"exchange-diary-3a750.firebaseapp.com",
  projectId:"exchange-diary-3a750",
  storageBucket:"exchange-diary-3a750.firebasestorage.app",
  messagingSenderId:"749042685880",
  appId:"1:749042685880:web:2dc8ed0d84f3fd0869a14d",
  measurementId:"G-0XT23WF0X5"
};

firebase.initializeApp(FIREBASE_CONFIG);
const messaging=firebase.messaging();

messaging.onBackgroundMessage(payload=>{
  const notification=payload.notification||{};
  self.registration.showNotification(notification.title||'교환일기', {
    body:notification.body||'새 알림이 도착했어요.',
    icon:'icons/icon-192.png',
    badge:'icons/icon-192.png',
    data:{url:'./'}
  });
});

self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','index.html','style.css','script.js','manifest.json']))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus' in client)return client.focus();}
    return clients.openWindow('./');
  }));
});
