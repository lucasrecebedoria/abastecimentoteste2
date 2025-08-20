// Firebase init (Compat SDK for simplicity on static hosting)
/* global firebase */
// Load scripts dynamically to keep HTML clean
(function inject(){
  const urls = [
    "https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics-compat.js"
  ];
  let i=0;
  function next(){
    if(i>=urls.length){init();return;}
    const s=document.createElement('script');s.src=urls[i++];s.onload=next;document.head.appendChild(s);
  }
  next();
})();

function init(){
  const firebaseConfig = {
    apiKey: "AIzaSyC9L4GAbCGX9ySB_SYUJYjTKLmaw8bEXBc",
    authDomain: "lancamentocaixas.firebaseapp.com",
    projectId: "lancamentocaixas",
    storageBucket: "lancamentocaixas.firebasestorage.app",
    messagingSenderId: "559411456318",
    appId: "1:559411456318:web:d0525546d96302e124e46f",
    measurementId: "G-3S6K5X5WYJ"
  };
  window.fb = firebase.initializeApp(firebaseConfig);
  try{firebase.analytics();}catch(e){}
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  // Ensure collections exist by performing no-op writes
  ["users","caixas","relatorios","abastecimentos","sangrias"].forEach(c=>{
    // create a placeholder doc only if collection empty (run once per project)
  });
}
