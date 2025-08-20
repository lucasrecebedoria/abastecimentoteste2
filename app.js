import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const admins = ["4144","70029","6266"];

function getDataDia(dateObj=new Date()) {
  const ano = dateObj.getFullYear();
  const mes = String(dateObj.getMonth()+1).padStart(2,"0");
  const dia = String(dateObj.getDate()).padStart(2,"0");
  return `${ano}-${mes}-${dia}`;
}

async function cadastrar(){
  const matricula = document.getElementById("cadastro-matricula").value;
  const nome = document.getElementById("cadastro-nome").value;
  const senha = document.getElementById("cadastro-senha").value;
  const emailFake = matricula+"@movebuss.local";
  await createUserWithEmailAndPassword(auth, emailFake, senha);
  alert("Usuário cadastrado! Faça login.");
  mostrarLogin();
}

async function login(){
  const matricula = document.getElementById("login-matricula").value;
  const senha = document.getElementById("login-senha").value;
  const emailFake = matricula+"@movebuss.local";
  await signInWithEmailAndPassword(auth, emailFake, senha);
}

function logout(){
  signOut(auth);
}

onAuthStateChanged(auth, (user)=>{
  if(user){
    document.getElementById("login-section").style.display="none";
    document.getElementById("cadastro-section").style.display="none";
    document.getElementById("btn-logout").style.display="inline";
    document.getElementById("btn-alterar-senha").style.display="inline";
    mostrarTela('abastecimento');
    const matricula = user.email.split("@")[0];
    const badge = admins.includes(matricula) ? '<span style="background:gold;padding:5px;border-radius:5px">'+matricula+'</span>' : '<span style="background:green;padding:5px;border-radius:5px">'+matricula+'</span>';
    document.getElementById("user-badge").innerHTML = badge;
  } else {
    mostrarLogin();
  }
});

async function salvarAbastecimento(){
  const user = auth.currentUser;
  if(!user) return;
  const matriculaRecebedor = user.email.split("@")[0];
  const tipo = document.getElementById("tipo-validador").value;
  const qtd = parseInt(document.getElementById("qtd-bordos").value);
  const valor = qtd*5;
  const prefixo = "55"+document.getElementById("prefixo").value;
  const motorista = document.getElementById("matricula-motorista").value;
  const dataDia = getDataDia();
  await addDoc(collection(db,"relatorios"),{
    matriculaRecebedor: matriculaRecebedor,
    tipoValidador: tipo,
    qtdBordos: qtd,
    valor: valor,
    prefixo: prefixo,
    matriculaMotorista: motorista,
    dataDia: dataDia,
    criadoEm: new Date()
  });
  alert("Salvo no relatório diário!");
}

async function carregarRelatorios(){
  const user = auth.currentUser;
  if(!user) return;
  const matricula = user.email.split("@")[0];
  const filtroData = document.getElementById("filtro-data").value || getDataDia();
  let q;
  if(admins.includes(matricula)){
    q = query(collection(db,"relatorios"), where("dataDia","==",filtroData));
  } else {
    q = query(collection(db,"relatorios"), where("matriculaRecebedor","==",matricula), where("dataDia","==",filtroData));
  }
  const snap = await getDocs(q);
  let html="";
  let resumo={};
  snap.forEach(doc=>{
    const d=doc.data();
    html += `<div>${d.tipoValidador} | ${d.qtdBordos} bordos | R$${d.valor} | Motorista: ${d.matriculaMotorista}</div>`;
    if(!resumo[d.matriculaRecebedor]) resumo[d.matriculaRecebedor]=0;
    resumo[d.matriculaRecebedor]+=d.valor;
  });
  html+="<hr/><b>Resumo:</b><br/>";
  for(const mat in resumo){
    html+=mat+": R$"+resumo[mat]+"<br/>";
  }
  document.getElementById("relatorios-lista").innerHTML=html;
}

function mostrarTela(tela){
  document.getElementById("abastecimento-section").style.display="none";
  document.getElementById("relatorios-section").style.display="none";
  if(tela==='abastecimento') document.getElementById("abastecimento-section").style.display="block";
  if(tela==='relatorios') document.getElementById("relatorios-section").style.display="block";
}

function mostrarCadastro(){
  document.getElementById("login-section").style.display="none";
  document.getElementById("cadastro-section").style.display="block";
}
function mostrarLogin(){
  document.getElementById("login-section").style.display="block";
  document.getElementById("cadastro-section").style.display="none";
}
