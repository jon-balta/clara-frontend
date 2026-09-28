'use strict';

// API local. O frontend abre por file:// e não requer servidor ou build.
const API = 'http://127.0.0.1:5001';
const ETAPAS = {novo: 'Novo interesse', em_contato: 'Em contato', avaliacao_marcada: 'Avaliação marcada', convertido: 'Convertido', encerrado: 'Encerrado'};
const ATIVAS = ['novo', 'em_contato', 'avaliacao_marcada'];
const $ = (seletor) => document.querySelector(seletor);
const formulario = $('#formulario');
const editor = $('#editor');
let registros = [];
let idAtual = null;
let ocupado = false;
let carregado = false;
let requisicaoLista = 0;

function hoje() {
  // Datas de retorno são dias civis locais, não instantes UTC.
  const data = new Date();
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}
function formatarData(valor) {
  if (!valor) return 'Sem retorno pendente';
  return new Date(`${valor}T12:00:00`).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'});
}
function ativo(item) { return ATIVAS.includes(item.etapa); }
function atrasado(item) { return ativo(item) && item.proximo_retorno && item.proximo_retorno < hoje(); }
function noDia(item) { return ativo(item) && item.proximo_retorno === hoje(); }
function normalizar(valor) { return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function avisar(texto, erro = false, alvo = $('#status')) {
  alvo.textContent = texto;
  alvo.classList.toggle('error', erro);
  alvo.hidden = !texto;
}
async function api(caminho, opcoes = {}) {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 10000);
  try {
    const resposta = await fetch(`${API}${caminho}`, {...opcoes, signal: controle.signal});
    if (resposta.status === 204) return null;
    const dados = await resposta.json();
    if (!resposta.ok) {
      const detalhes = dados.campos ? Object.values(dados.campos).join(' ') : '';
      throw new Error(`${dados.mensagem || 'Não foi possível concluir a operação.'} ${detalhes}`.trim());
    }
    return dados;
  } catch (erro) {
    if (erro.name === 'AbortError' || erro instanceof TypeError) {
      throw new Error('Não foi possível confirmar a operação. Verifique se a API está ligada e atualize a lista antes de tentar novamente.');
    }
    throw erro;
  } finally {
    clearTimeout(limite);
  }
}
function elemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}
function card(item) {
  const artigo = elemento('article', 'card');
  const topo = elemento('div', 'card-top');
  const iniciais = item.nome.split(/\s+/).slice(0, 2).map(parte => parte[0]).join('').toUpperCase();
  const avatar = elemento('span', 'avatar', iniciais);
  avatar.setAttribute('aria-hidden', 'true');
  topo.append(avatar, elemento('span', `badge ${item.etapa}`, ETAPAS[item.etapa]));
  const base = elemento('div', 'card-bottom');
  const retorno = elemento('div', `return ${atrasado(item) ? 'overdue' : noDia(item) ? 'today' : ''}`);
  let legenda = 'Próximo retorno';
  let data = formatarData(item.proximo_retorno);
  if (!ativo(item)) { legenda = 'Acompanhamento finalizado'; data = 'Sem retorno pendente'; }
  else if (atrasado(item)) legenda = 'Retorno atrasado';
  else if (noDia(item)) legenda = 'Retornar hoje';
  retorno.append(elemento('small', '', legenda), elemento('span', '', data));
  const botao = elemento('button', 'card-button', 'Ver detalhes →');
  botao.type = 'button';
  botao.setAttribute('aria-label', `Abrir acompanhamento de ${item.nome}`);
  botao.addEventListener('click', () => abrir(item.id, botao));
  base.append(retorno, botao);
  artigo.append(topo, elemento('h3', '', item.nome), elemento('p', 'service', `${item.servico} · ${item.origem}`), base);
  return artigo;
}
function renderizar() {
  const busca = normalizar($('#busca').value.trim());
  const etapa = $('#filtro-etapa').value;
  const retorno = $('#filtro-retorno').value;
  const filtrados = registros.filter(item => {
    if (busca && !normalizar(`${item.nome} ${item.servico}`).includes(busca)) return false;
    if (etapa && item.etapa !== etapa) return false;
    if (retorno === 'atrasados' && !atrasado(item)) return false;
    if (retorno === 'hoje' && !noDia(item)) return false;
    if (retorno === 'proximos' && !(ativo(item) && item.proximo_retorno > hoje())) return false;
    return true;
  });
  // Retornos urgentes primeiro; etapas finalizadas ficam ao fim.
  filtrados.sort((a, b) => Number(ativo(b)) - Number(ativo(a)) || (a.proximo_retorno || '9999').localeCompare(b.proximo_retorno || '9999') || b.id - a.id);
  $('#lista').replaceChildren(...filtrados.map(card));
  $('#contador').textContent = carregado ? `(${filtrados.length} de ${registros.length})` : '';
  $('#total-ativos').textContent = carregado ? registros.filter(ativo).length : '—';
  $('#total-atrasados').textContent = carregado ? registros.filter(atrasado).length : '—';
  $('#total-hoje').textContent = carregado ? registros.filter(noDia).length : '—';
  $('#vazio').hidden = filtrados.length > 0;
  const filtrando = Boolean(busca || etapa || retorno);
  $('#vazio-titulo').textContent = !carregado ? 'Sua área de acompanhamento está pronta' : filtrando ? 'Nenhum contato por aqui' : 'Vamos começar uma conversa?';
  $('#vazio-texto').textContent = !carregado ? 'Ligue a API local e clique em Atualizar lista para carregar os cadastros.' : filtrando ? 'Experimente outro nome, etapa ou período de retorno.' : 'Adicione seu primeiro interessado para acompanhar os próximos passos.';
}
async function carregar(mensagem = '') {
  const numero = ++requisicaoLista;
  $('#atualizar').disabled = true;
  $('#lista').setAttribute('aria-busy', 'true');
  try {
    const dados = await api('/interessados');
    if (numero !== requisicaoLista) return;
    registros = dados.interessados;
    carregado = true;
    renderizar();
    avisar(mensagem);
  } catch (erro) {
    if (numero !== requisicaoLista) return;
    avisar(`${mensagem ? mensagem + ' ' : ''}${erro.message}${carregado ? ' Os dados exibidos podem estar desatualizados.' : ''}`, true);
    renderizar();
  } finally {
    if (numero === requisicaoLista) {
      $('#atualizar').disabled = false;
      $('#lista').setAttribute('aria-busy', 'false');
    }
  }
}
function regraRetorno() {
  formulario.elements.proximo_retorno.required = ATIVAS.includes(formulario.elements.etapa.value);
}
async function abrir(id = null, botao = null) {
  if (ocupado || editor.open) return;
  ocupado = true;
  if (botao) botao.disabled = true;
  try {
    const item = id === null ? null : await api(`/interessados/${id}`);
    idAtual = id;
    formulario.reset();
    if (item) {
      for (const campo of ['nome', 'servico', 'origem', 'etapa', 'proximo_retorno', 'observacao']) {
        formulario.elements[campo].value = item[campo] || '';
      }
    }
    $('#editor-titulo').textContent = item ? 'Detalhes do acompanhamento' : 'Novo interessado';
    $('#salvar').textContent = item ? 'Salvar alterações' : 'Salvar interessado';
    $('#excluir').hidden = !item;
    $('#registro-info').textContent = item ? `Cadastro #${item.id} · Atualizado em ${new Date(item.atualizado_em).toLocaleString('pt-BR')}` : 'Campos com * são obrigatórios. Use dados fictícios na demonstração.';
    avisar('', false, $('#erro-formulario'));
    regraRetorno();
    editor.showModal();
    formulario.elements.nome.focus();
  } catch (erro) {
    avisar(erro.message, true);
  } finally {
    ocupado = false;
    if (botao) botao.disabled = false;
  }
}
function bloquear(valor) {
  ocupado = valor;
  for (const campo of formulario.elements) campo.disabled = valor;
}
formulario.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (ocupado || !formulario.reportValidity()) return;
  const dados = Object.fromEntries(new FormData(formulario));
  dados.proximo_retorno = dados.proximo_retorno || null;
  bloquear(true);
  avisar('', false, $('#erro-formulario'));
  try {
    const editando = idAtual !== null;
    await api(editando ? `/interessados/${idAtual}` : '/interessados', {
      method: editando ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(dados)
    });
    editor.close();
    await carregar(editando ? 'Acompanhamento atualizado.' : 'Interessado cadastrado. Próximo passo registrado.');
  } catch (erro) {
    avisar(erro.message, true, $('#erro-formulario'));
  } finally { bloquear(false); }
});
$('#excluir').addEventListener('click', async () => {
  if (ocupado || idAtual === null) return;
  if (!confirm(`Excluir o cadastro de ${formulario.elements.nome.value}? Esta ação não pode ser desfeita.`)) return;
  bloquear(true);
  try {
    await api(`/interessados/${idAtual}`, {method: 'DELETE'});
    editor.close();
    await carregar('Cadastro excluído.');
  } catch (erro) { avisar(erro.message, true, $('#erro-formulario')); }
  finally { bloquear(false); }
});
$('#fechar').addEventListener('click', () => { if (!ocupado) editor.close(); });
editor.addEventListener('cancel', evento => { if (ocupado) evento.preventDefault(); });
$('#novo').addEventListener('click', () => abrir());
$('#atualizar').addEventListener('click', () => carregar('Lista atualizada.'));
$('#busca').addEventListener('input', renderizar);
$('#filtro-etapa').addEventListener('change', renderizar);
$('#filtro-retorno').addEventListener('change', renderizar);
formulario.elements.etapa.addEventListener('change', regraRetorno);
$('#data-atual').textContent = new Date().toLocaleDateString('pt-BR', {day: 'numeric', month: 'long'});
$('#data-atual').dateTime = hoje();
renderizar();
carregar();
