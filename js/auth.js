/* global auth, db */
const ADMIN_MATRICULAS = ["4144","70029","6266"];

// Keep session: local persistence
const waitForFb = () => new Promise(res => {
  if(window.auth) return res();
  const iv = setInterval(()=>{ if(window.auth){clearInterval(iv); res();}}, 50);
});

async function register(){
  await waitForFb();
  const matricula = document.getElementById('matricula').value.trim();
  const nome = document.getElementById('nome').value.trim();
  const senha = document.getElementById('senha').value;
  const senha2 = document.getElementById('senha2').value;

  if(!matricula || !nome || !senha) return alert("Preencha todos os campos.");
  if(senha !== senha2) return alert("As senhas não coincidem.");

  const email = `${matricula}@movebuss.local`; // email derivado
  try{
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    const cred = await auth.createUserWithEmailAndPassword(email, senha);
    const uid = cred.user.uid;
    const role = ADMIN_MATRICULAS.includes(matricula) ? "admin" : "user";
    await db.collection('users').doc(uid).set({ uid, matricula, nome, role, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    alert("Cadastro realizado com sucesso. Faça login.");
    window.location.href = "index.html";
  }catch(e){
    alert("Erro ao cadastrar: " + e.message);
  }
}

async function login(){
  await waitForFb();
  const matricula = document.getElementById('matricula').value.trim();
  const senha = document.getElementById('senha').value;
  if(!matricula || !senha) return alert("Informe matrícula e senha.");
  const email = `${matricula}@movebuss.local`;
  try{
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    await auth.signInWithEmailAndPassword(email, senha);
    window.location.href = "app.html";
  }catch(e){
    alert("Falha no login: " + e.message);
  }
}

// If called on index/register, no-op
