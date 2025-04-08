// Verifica se o Firebase já foi inicializado
if (typeof firebase === 'undefined') {
    // Carrega o Firebase se ainda não estiver disponível
    const firebaseScript = document.createElement('script');
    firebaseScript.src = 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js';
    firebaseScript.onload = () => {
        const firestoreScript = document.createElement('script');
        firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore-compat.js';
        document.head.appendChild(firestoreScript);
    };
    document.head.appendChild(firebaseScript);
}

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCfuB7wfMOXajWuAV1cS2xPsp-3Hx9Upk4",
    authDomain: "calccustas.firebaseapp.com",
    projectId: "calccustas",
    storageBucket: "calccustas.appspot.com",
    messagingSenderId: "912892414256",
    appId: "1:912892414256:web:b56f75b3a4441a1696e0f5",
    measurementId: "G-3Y1SZK94DT"
};

// Inicializa o Firebase apenas uma vez
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Exporta a instância do Firestore
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;