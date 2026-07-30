importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDjL9-jZ4dlmU8DxQ7lB0JmQk4tEtE5Rzo",
  authDomain: "medisure-8370d.firebaseapp.com",
  projectId: "medisure-8370d",
  storageBucket: "medisure-8370d.firebasestorage.app",
  messagingSenderId: "460059587803",
  appId: "1:460059587803:web:e0198d655d6aa9f0e7c8fe"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    badge: '/logo192.png',
  });
});