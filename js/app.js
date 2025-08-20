/* global auth, db, firebase */
const ADMIN_MATRICULAS = ["4144","70029","6266"];
let currentUser = null;
let currentUserProfile = null;
let caixaAtual = null; // doc snapshot of caixa aberto

const q = (id)=>document.getElementById(id);

function setBadge(){
  if(!currentUserProfile) return;
  const badge = q('userBadge');
  const isAdmin = currentUserProfile.role === 'admin';
  badge.textContent = `${currentUserProfile.nome} • ${currentUserProfile.matricula}`;
  if(isAdmin) badge.classList.add('gold');
}

function ensureAuth(){
  return new Promise(resolve=>{
    const off = auth.onAuthStateChanged(async (user)=>{
      if(!user){ window.location.href = "index.html"; return; }
      currentUser = user;
      // load profile
      const prof = await db.collection('users').doc(user.uid).get();
      currentUserProfile = prof.exists ? prof.data() : null;
      if(!currentUserProfile){
        // fallback create
        currentUserProfile = {
          uid:user.uid,
          matricula:user.email.split('@')[0],
          nome:"Usuário",
          role: ADMIN_MATRICULAS.includes(user.email.split('@')[0]) ? "admin" : "user"
        };
        await db.collection('users').doc(user.uid).set(currentUserProfile,{merge:true});
      }
      q('matRecebedor').value = currentUserProfile.matricula;
      setBadge();
      bindTopbar();
      await verificarCaixa();
      loadRelatorios(); // initial
      if(currentUserProfile.role !== 'admin'){
        document.querySelector('a[onclick*=\"admin\"]').style.display='none';
      } else {
        carregarPendSangrias();
      }
      off();
      resolve();
    });
  });
}

function bindTopbar(){
  q('btnLogout').onclick = async ()=>{ await auth.signOut(); };
  q('btnChangePass').onclick = async ()=>{
    const nova = prompt("Nova senha");
    if(!nova) return;
    try{ await currentUser.updatePassword(nova); alert("Senha alterada."); }
    catch(e){ alert("Erro: " + e.message); }
  };
}

function formatBRL(v){ return (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

async function verificarCaixa(){
  // find open caixa for user
  const snap = await db.collection('caixas')
    .where('matRecebedor','==', currentUserProfile.matricula)
    .where('status','==','aberto').limit(1).get();
  caixaAtual = snap.empty? null : snap.docs[0];
  q('statusCaixa').textContent = caixaAtual
    ? `Caixa ABERTO desde ${new Date(caixaAtual.data().abertura.toDate()).toLocaleString('pt-BR')}`
    : 'Nenhum caixa aberto.';
}

function prefixoFull(){ return "55" + (q('prefixo3').value || ""); }

function computeValor(){
  const qtd = parseInt(q('qtdBordos').value || "0", 10);
  const valor = qtd * 5; // R$5 por bordo
  q('valor').value = valor ? valor.toFixed(2) : "";
}
q('qtdBordos').addEventListener('input', computeValor);

q('btnAbrir').onclick = async ()=>{
  await ensureAuth();
  if(caixaAtual){ alert("Já existe um caixa aberto."); return; }
  const ref = await db.collection('caixas').add({
    matRecebedor: currentUserProfile.matricula,
    nomeRecebedor: currentUserProfile.nome,
    status:'aberto',
    abertura: firebase.firestore.FieldValue.serverTimestamp(),
    totalAbastecido:0,
    totalSangria:0
  });
  caixaAtual = await ref.get();
  await verificarCaixa();
  alert("Caixa aberto.");
};

q('btnFechar').onclick = async ()=>{
  await ensureAuth();
  if(!caixaAtual){ alert("Nenhum caixa aberto."); return; }
  await caixaAtual.ref.update({ status:'fechado', fechamento: firebase.firestore.FieldValue.serverTimestamp() });
  // Gera resumo final (relatório)
  await gerarRelatorioFinal(caixaAtual.id);
  caixaAtual = null;
  await verificarCaixa();
  alert("Caixa fechado.");
};

q('btnSalvarAbast').onclick = async ()=>{
  await ensureAuth();
  if(!caixaAtual){ alert("Abra um caixa para registrar."); return; }
  const dados = {
    caixaId: caixaAtual.id,
    tipoValidador: q('tipoValidador').value,
    qtdBordos: parseInt(q('qtdBordos').value||"0",10),
    valor: parseFloat(q('valor').value||"0"),
    prefixo: prefixoFull(),
    data: q('data').value || new Date().toISOString().slice(0,10),
    matMotorista: q('matMotorista').value.trim(),
    matRecebedor: currentUserProfile.matricula,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: currentUser.uid
  };
  if(!dados.qtdBordos || !dados.valor || !dados.matMotorista || (q('prefixo3').value||'').length!==3){
    alert("Preencha os campos corretamente (bordos, valor auto, motorista, prefixo 3 dígitos).");
    return;
  }
  const ref = await db.collection('abastecimentos').add(dados);
  // update caixa total
  await caixaAtual.ref.update({
    totalAbastecido: firebase.firestore.FieldValue.increment(dados.valor)
  });
  // espelho para relatórios (por data)
  await db.collection('relatorios').add({
    caixaId: caixaAtual.id,
    data: dados.data,
    resumo: `Validador ${dados.tipoValidador} • Prefixo ${dados.prefixo} • Bordos ${dados.qtdBordos} • ${formatBRL(dados.valor)}`,
    valor: dados.valor,
    matRecebedor: dados.matRecebedor,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  abrirRecibo(dados);
  limparFormAbast();
  loadRelatorios();
  alert("Abastecimento registrado.");
};

function limparFormAbast(){
  q('qtdBordos').value = "";
  q('valor').value = "";
  q('prefixo3').value = "";
  q('matMotorista').value = "";
}

function abrirRecibo(dados){
  const w = window.open("", "_blank", "width=400,height=600");
  const html = `
  <html><head><title>Recibo</title>
  <style>
    body{font-family:monospace}
    .receipt{width:80mm;padding:6mm;margin:auto}
    .center{text-align:center}
    .row{display:flex;justify-content:space-between}
    hr{border:none;border-top:1px dashed #000;margin:8px 0}
  </style>
  </head><body onload="window.print();">
    <div class="receipt">
      <div class="center"><b>RECIBO DE PAGAMENTO MANUAL</b></div>
      <hr/>
      <div>Tipo de validador: <b>${dados.tipoValidador}</b></div>
      <div>PREFIXO: <b>${dados.prefixo}</b></div>
      <div>QUANTIDADE BORDOS: <b>${dados.qtdBordos}</b></div>
      <div>VALOR: <b>R$ ${dados.valor.toFixed(2)}</b></div>
      <div>MATRICULA MOTORISTA: <b>${dados.matMotorista}</b></div>
      <div>MATRICULA RECEBEDOR: <b>${dados.matRecebedor}</b></div>
      <br/>
      <div>ASSINATURA RECEBEDOR: _____________________</div>
      <hr/>
      <div class="center">${new Date().toLocaleString('pt-BR')}</div>
    </div>
  </body></html>`;
  w.document.write(html);
  w.document.close();
}

q('btnSolicitarSangria').onclick = async ()=>{
  await ensureAuth();
  if(!caixaAtual){ alert("Abra o caixa primeiro."); return; }
  const valor = parseFloat(q('valorSangria').value||"0");
  const motivo = q('motivoSangria').value.trim();
  if(!valor || valor<=0 || !motivo) return alert("Informe valor e motivo.");
  await db.collection('sangrias').add({
    caixaId: caixaAtual.id, valor, motivo,
    status:'pendente', solicitadoPor: currentUserProfile.matricula,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  q('sangriaStatus').textContent = "Solicitação de sangria enviada. Aguarde aprovação do admin.";
  q('valorSangria').value=""; q('motivoSangria').value="";
};

async function carregarPendSangrias(){
  // Admin only
  const cont = document.getElementById('pendSangrias');
  if(!cont) return;
  const snap = await db.collection('sangrias').where('status','==','pendente').orderBy('createdAt','desc').get();
  if(snap.empty){ cont.innerHTML = '<p class="footer-note">Sem solicitações pendentes.</p>'; return; }
  let html = '<table class="table"><tr><th>Data</th><th>Caixa</th><th>Valor</th><th>Motivo</th><th>Ações</th></tr>';
  snap.forEach(doc=>{
    const d = doc.data();
    html += `<tr>
      <td>${d.createdAt? d.createdAt.toDate().toLocaleString('pt-BR'):''}</td>
      <td>${d.caixaId}</td>
      <td>${formatBRL(d.valor)}</td>
      <td>${d.motivo}</td>
      <td>
        <button class="btn" onclick="aprovarSangria('${doc.id}', '${d.caixaId}', ${d.valor})">Aprovar</button>
        <button class="btn secondary" onclick="reprovarSangria('${doc.id}')">Reprovar</button>
      </td>
    </tr>`;
  });
  html += '</table>';
  cont.innerHTML = html;
}

async function aprovarSangria(id, caixaId, valor){
  await db.collection('sangrias').doc(id).update({status:'aprovada', aprovadaEm: firebase.firestore.FieldValue.serverTimestamp()});
  await db.collection('caixas').doc(caixaId).update({
    totalSangria: firebase.firestore.FieldValue.increment(valor)
  });
  alert("Sangria aprovada.");
  carregarPendSangrias();
  loadRelatorios();
}
async function reprovarSangria(id){
  await db.collection('sangrias').doc(id).update({status:'reprovada'});
  alert("Sangria reprovada.");
  carregarPendSangrias();
}

async function gerarRelatorioFinal(caixaId){
  const c = await db.collection('caixas').doc(caixaId).get();
  const cd = c.data();
  const total = cd.totalAbastecido || 0;
  const sang = cd.totalSangria || 0;
  const pos = total - sang;
  await db.collection('relatorios').add({
    caixaId, data: new Date().toISOString().slice(0,10),
    resumo:`RESUMO FINAL • Valor lançado ${formatBRL(total)} • Sangrias ${formatBRL(sang)} • Valor pós sangria ${formatBRL(pos)}`,
    valor: pos,
    final:true,
    matRecebedor: cd.matRecebedor,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function loadRelatorios(){
  await ensureAuth();
  const filtro = q('filtroData').value;
  const list = q('listaRelatorios');
  list.innerHTML = 'Carregando...';
  let ref = db.collection('relatorios');
  if(currentUserProfile.role !== 'admin'){
    ref = ref.where('matRecebedor','==', currentUserProfile.matricula);
  }
  if(filtro){
    ref = ref.where('data','==', filtro);
  }
  const snap = await ref.orderBy('createdAt','desc').get();
  if(snap.empty){ list.innerHTML = '<p class="footer-note">Sem lançamentos.</p>'; return; }
  // Agrupar por caixa e data
  const byCaixa = {};
  snap.forEach(doc=>{
    const d = doc.data();
    const key = `${d.data}__${d.caixaId}`;
    byCaixa[key] = byCaixa[key] || {data:d.data, caixaId:d.caixaId, itens:[], total:0};
    byCaixa[key].itens.push(d);
    byCaixa[key].total += (d.valor||0);
  });
  let html = '';
  Object.values(byCaixa).forEach(gr=>{
    const fechado = gr.itens.some(i=>i.final);
    html += `<details ${fechado?'':'open'} style="margin-bottom:10px">
      <summary><b>Data:</b> ${gr.data} • <b>Caixa:</b> ${gr.caixaId}</summary>
      <div class="card">
        <ul>`;
    gr.itens.forEach(it=>{
      html += `<li style="margin:6px 0">${it.resumo} ${it.final?'<span class="chip">Final</span>':''}</li>`;
    });
    html += `</ul>
        <div style="margin-top:10px"><b>Valor recebido:</b> ${formatBRL(gr.total)}</div>
      </div>
    </details>`;
  });
  list.innerHTML = html;
}

q('btnAplicarFiltro').onclick = ()=> loadRelatorios();

window.addEventListener('DOMContentLoaded', ensureAuth);
