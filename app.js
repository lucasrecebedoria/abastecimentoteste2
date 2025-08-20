import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9L4GAbCGX9ySB_SYUJYjTKLmaw8bEXBc",
  authDomain: "lancamentocaixas.firebaseapp.com",
  projectId: "lancamentocaixas",
  storageBucket: "lancamentocaixas.firebasestorage.app",
  messagingSenderId: "559411456318",
  appId: "1:559411456318:web:d0525546d96302e124e46f",
  measurementId: "G-3S6K5X5WYJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Registrar
document.getElementById("registerBtn").addEventListener("click", async () => {
  const matricula = document.getElementById("regMatricula").value;
  const nome = document.getElementById("regNome").value;
  const senha = document.getElementById("regSenha").value;
  const emailFake = matricula + "@movebuss.local";

  const cred = await createUserWithEmailAndPassword(auth, emailFake, senha);
  await updateProfile(cred.user, { displayName: matricula });

  await setDoc(doc(db, "usuarios", matricula), {
    matricula,
    nome,
    createdAt: serverTimestamp()
  });
});

// Login
document.getElementById("loginBtn").addEventListener("click", async () => {
  const matricula = document.getElementById("loginMatricula").value;
  const senha = document.getElementById("loginSenha").value;
  const emailFake = matricula + "@movebuss.local";
  await signInWithEmailAndPassword(auth, emailFake, senha);
});

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("register-section").style.display = "none";
    document.getElementById("caixa-section").style.display = "block";
    document.getElementById("logoutBtn").style.display = "block";

    const matricula = user.displayName;
    verificarCaixa(matricula);
  } else {
    document.getElementById("login-section").style.display = "block";
    document.getElementById("register-section").style.display = "block";
    document.getElementById("caixa-section").style.display = "none";
    document.getElementById("abastecimento-section").style.display = "none";
    document.getElementById("logoutBtn").style.display = "none";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
});

// Abrir caixa
document.getElementById("abrirCaixaBtn").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, "usuarios", user.displayName, "caixaAtual", "status"), {
    aberto: true,
    abertura: serverTimestamp()
  });
  verificarCaixa(user.displayName);
});

// Fechar caixa
document.getElementById("fecharCaixaBtn").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, "usuarios", user.displayName, "caixaAtual", "status"), {
    aberto: false,
    fechamento: serverTimestamp()
  });
  verificarCaixa(user.displayName);
});

// Verificar caixa
async function verificarCaixa(matricula) {
  const ref = doc(db, "usuarios", matricula, "caixaAtual", "status");
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().aberto) {
    document.getElementById("abastecimento-section").style.display = "block";
  } else {
    document.getElementById("abastecimento-section").style.display = "none";
  }
}

// Calcular valor automático
document.getElementById("bordos").addEventListener("input", () => {
  const qtd = parseInt(document.getElementById("bordos").value || 0);
  document.getElementById("valor").value = qtd * 5;
});

// Salvar abastecimento
document.getElementById("salvarAbastecimento").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const matricula = user.displayName;

  await addDoc(collection(db, "usuarios", matricula, "abastecimentos"), {
    tipoValidador: document.getElementById("tipoValidador").value,
    bordos: parseInt(document.getElementById("bordos").value),
    valor: parseInt(document.getElementById("valor").value),
    prefixo: "55" + document.getElementById("prefixo").value,
    data: document.getElementById("data").value,
    motorista: document.getElementById("matMotorista").value,
    recebedor: matricula,
    createdAt: serverTimestamp()
  });
  alert("Abastecimento registrado!");
});
