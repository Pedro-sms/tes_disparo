// Dados do sistema
let projetos = JSON.parse(localStorage.getItem('qa_projetos_v3')) || [];
let projetoAtualId = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    renderizarProjetos();
    atualizarEstatisticas();
    configurarEventos();
    
    // Atualizar contador de projetos na sidebar
    document.getElementById('project-count').textContent = projetos.length;
    
    // Configurar toggle do menu mobile
    document.getElementById('menu-toggle').addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
    });
    
    // Configurar busca
    document.getElementById('search-input').addEventListener('input', function(e) {
        filtrarProjetos(e.target.value);
    });
});

// Configuração de eventos
function configurarEventos() {
    // Fechar modal ao clicar fora
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal-projeto');
        if (event.target == modal) {
            fecharModal();
        }
    });
    
    // Toggle do tema escuro
    document.getElementById('dark-mode-toggle').addEventListener('change', function() {
        document.body.classList.toggle('dark-mode');
        mostrarToast('Tema alterado com sucesso!', 'success');
    });
}

// --- Navegação ---
function irParaHome(e) {
    if (e) e.preventDefault();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-dashboard').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.nav-item')[0].classList.add('active');
    renderizarProjetos();
    atualizarEstatisticas();
}

function irParaPlanilhaLista(e) {
    if (e) e.preventDefault();
    irParaHome();
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.nav-item')[1].classList.add('active');
}

function mostrarConfiguracoes(e) {
    if (e) e.preventDefault();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-settings').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.nav-item')[2].classList.add('active');
}

function irParaPlanilha(id) {
    projetoAtualId = id;
    const proj = projetos.find(p => p.id === id);
    
    document.getElementById('sheet-title').textContent = proj.nome;
    document.getElementById('sheet-client').textContent = proj.cliente;
    document.getElementById('sheet-platform').textContent = formatarPlataforma(proj.plataforma);
    document.getElementById('sheet-date').textContent = formatarData(proj.dataCriacao || new Date().toISOString());
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-details').classList.add('active');
    document.querySelector('.sidebar').classList.remove('active');
    
    renderizarTabela(proj.contatos);
}

// --- Renderização da Tabela ---
function renderizarTabela(contatos) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    contatos.forEach((contato) => {
        const tr = document.createElement('tr');
        
        let dataValue = '';
        if(contato.timestamp) {
            const date = new Date(contato.timestamp);
            const offset = date.getTimezoneOffset() * 60000;
            dataValue = new Date(date.getTime() - offset).toISOString().slice(0, 16);
        }
        
        // Determinar status
        let status = '';
        let statusClass = '';
        if (contato.timestamp) {
            const dataDisparo = new Date(contato.timestamp);
            const agora = new Date();
            
            if (dataDisparo > agora) {
                status = 'Agendado';
                statusClass = 'warning';
            } else {
                status = 'Concluído';
                statusClass = 'success';
            }
        } else {
            status = 'Pendente';
            statusClass = 'secondary';
        }

        tr.innerHTML = `
            <td>
                <input type="text" class="cell-input" 
                    value="${contato.numero || ''}" 
                    placeholder="Ex: 5511999..."
                    onblur="atualizarCelula('${contato.id}', 'numero', this.value)"
                >
            </td>
            <td>
                <input type="text" class="cell-input" 
                    value="${contato.nome || ''}" 
                    placeholder="Nome do contato"
                    onblur="atualizarCelula('${contato.id}', 'nome', this.value)"
                >
            </td>
            <td>
                <input type="datetime-local" class="date-input" 
                    value="${dataValue}"
                    onchange="atualizarData('${contato.id}', this.value)"
                >
            </td>
            <td>
                <span class="tag ${statusClass}">${status}</span>
            </td>
            <td style="text-align:center;">
                <button class="row-action" title="Excluir linha" onclick="excluirLinha('${contato.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Lógica de Edição ---
function adicionarLinhaVazia() {
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    const novoContato = {
        id: Date.now().toString(),
        numero: '',
        nome: '',
        timestamp: null
    };
    
    projetos[projIndex].contatos.push(novoContato);
    salvarDados();
    renderizarTabela(projetos[projIndex].contatos);
    mostrarToast('Nova linha adicionada', 'success');
}

function adicionarMultiplasLinhas() {
    const quantidade = prompt('Quantas linhas deseja adicionar?', '5');
    if (!quantidade || isNaN(quantidade) || quantidade < 1) return;
    
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    
    for (let i = 0; i < quantidade; i++) {
        const novoContato = {
            id: Date.now().toString() + i,
            numero: '',
            nome: '',
            timestamp: null
        };
        projetos[projIndex].contatos.push(novoContato);
    }
    
    salvarDados();
    renderizarTabela(projetos[projIndex].contatos);
    mostrarToast(`${quantidade} linhas adicionadas`, 'success');
}

function atualizarCelula(contatoId, campo, valor) {
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    const contatoIndex = projetos[projIndex].contatos.findIndex(c => c.id === contatoId);
    
    if(projetos[projIndex].contatos[contatoIndex][campo] !== valor) {
        projetos[projIndex].contatos[contatoIndex][campo] = valor;
        salvarDados();
        mostrarIndicadorSalvo();
    }
}

function atualizarData(contatoId, valorDateInput) {
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    const contatoIndex = projetos[projIndex].contatos.findIndex(c => c.id === contatoId);
    
    const timestamp = valorDateInput ? new Date(valorDateInput).getTime() : null;
    
    projetos[projIndex].contatos[contatoIndex].timestamp = timestamp;
    salvarDados();
    mostrarIndicadorSalvo();
}

function excluirLinha(contatoId) {
    if (!confirm('Tem certeza que deseja excluir esta linha?')) {
        return;
    }
    
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    projetos[projIndex].contatos = projetos[projIndex].contatos.filter(c => c.id !== contatoId);
    salvarDados();
    renderizarTabela(projetos[projIndex].contatos);
    mostrarToast('Linha excluída', 'success');
}

function mostrarIndicadorSalvo() {
    const indicator = document.createElement('div');
    indicator.className = 'save-indicator';
    indicator.innerHTML = '<i class="fas fa-check"></i> Salvo';
    indicator.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--success); color: white; padding: 8px 16px; border-radius: 8px; z-index: 9999;';
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.remove();
    }, 1500);
}

function filtrarProjetos(termo) {
    const projsFiltrados = termo ? 
        projetos.filter(p => 
            p.nome.toLowerCase().includes(termo.toLowerCase()) || 
            p.cliente.toLowerCase().includes(termo.toLowerCase())
        ) : projetos;
    
    renderizarProjetos(projsFiltrados);
}

// --- Renderização de Projetos ---
function renderizarProjetos(listaProjs = projetos) {
    const container = document.getElementById('projects-list');
    container.innerHTML = '';
    
    if (listaProjs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <i class="fas fa-folder-open" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p style="font-size: 16px;">Nenhum projeto encontrado</p>
                <p style="font-size: 14px; margin-top: 8px;">Clique em "Novo Projeto" para começar</p>
            </div>
        `;
        return;
    }
    
    listaProjs.forEach((proj) => {
        const totalContatos = proj.contatos.length;
        const contatosPendentes = proj.contatos.filter(c => !c.timestamp || new Date(c.timestamp) > new Date()).length;
        
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="project-card-header">
                <div>
                    <h3 class="project-card-title">${proj.nome}</h3>
                    <p class="project-card-subtitle">${proj.cliente}</p>
                </div>
                <div class="project-card-actions">
                    <button class="btn-icon" onclick="editarProjeto('${proj.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="excluirProjeto('${proj.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="project-card-info">
                <div class="info-item">
                    <i class="fas fa-server"></i>
                    <span>${formatarPlataforma(proj.plataforma)}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-users"></i>
                    <span>${totalContatos} contato${totalContatos !== 1 ? 's' : ''}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>${contatosPendentes} pendente${contatosPendentes !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="project-card-footer">
                <button class="btn btn-primary" onclick="irParaPlanilha('${proj.id}')">
                    <i class="fas fa-arrow-right"></i>
                    <span>Abrir Projeto</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Gestão de Projetos ---
function salvarProjeto(e) {
    e.preventDefault();
    
    const novoProjeto = {
        id: Date.now().toString(),
        nome: document.getElementById('p-nome').value,
        cliente: document.getElementById('p-cliente').value,
        plataforma: document.getElementById('p-plataforma').value,
        accountId: document.getElementById('p-account').value,
        inboxId: document.getElementById('p-inbox').value,
        webhookUrl: document.getElementById('p-webhook').value,
        descricao: document.getElementById('p-descricao').value,
        dataCriacao: new Date().toISOString(),
        contatos: []
    };
    
    projetos.push(novoProjeto);
    salvarDados();
    fecharModal();
    renderizarProjetos();
    atualizarEstatisticas();
    document.getElementById('project-count').textContent = projetos.length;
    mostrarToast('Projeto criado com sucesso!', 'success');
}

function editarProjeto(id) {
    const proj = projetos.find(p => p.id === id);
    if (!proj) return;
    
    document.getElementById('p-nome').value = proj.nome;
    document.getElementById('p-cliente').value = proj.cliente;
    document.getElementById('p-plataforma').value = proj.plataforma;
    document.getElementById('p-account').value = proj.accountId;
    document.getElementById('p-inbox').value = proj.inboxId;
    document.getElementById('p-webhook').value = proj.webhookUrl;
    document.getElementById('p-descricao').value = proj.descricao || '';
    
    // Alterar comportamento do formulário para edição
    const form = document.querySelector('form');
    form.onsubmit = function(e) {
        e.preventDefault();
        proj.nome = document.getElementById('p-nome').value;
        proj.cliente = document.getElementById('p-cliente').value;
        proj.plataforma = document.getElementById('p-plataforma').value;
        proj.accountId = document.getElementById('p-account').value;
        proj.inboxId = document.getElementById('p-inbox').value;
        proj.webhookUrl = document.getElementById('p-webhook').value;
        proj.descricao = document.getElementById('p-descricao').value;
        
        salvarDados();
        fecharModal();
        renderizarProjetos();
        mostrarToast('Projeto atualizado com sucesso!', 'success');
    };
    
    abrirModalProjeto();
}

function excluirProjeto(id) {
    if(!confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) {
        return;
    }
    projetos = projetos.filter(p => p.id !== id);
    salvarDados();
    renderizarProjetos();
    atualizarEstatisticas();
    document.getElementById('project-count').textContent = projetos.length;
    mostrarToast('Projeto excluído', 'error');
}

function salvarDados() {
    localStorage.setItem('qa_projetos_v3', JSON.stringify(projetos));
    console.log('📦 Dados salvos no localStorage:', projetos);
}

function abrirModalProjeto() {
    document.getElementById('modal-projeto').classList.add('active');
    document.querySelector('.sidebar').classList.remove('active');
}

function fecharModal() {
    document.getElementById('modal-projeto').classList.remove('active');
    const form = document.querySelector('form');
    form.reset();
    // Restaurar comportamento padrão do formulário
    form.onsubmit = salvarProjeto;
}

// --- Funcionalidades Adicionais ---
function atualizarEstatisticas() {
    const totalProjetos = projetos.length;
    const totalContatos = projetos.reduce((acc, proj) => acc + proj.contatos.length, 0);
    const totalPendentes = projetos.reduce((acc, proj) => {
        return acc + proj.contatos.filter(c => !c.timestamp || new Date(c.timestamp) > new Date()).length;
    }, 0);
    
    const totalConcluidos = totalContatos - totalPendentes;
    const taxaSucesso = totalContatos > 0 ? Math.round((totalConcluidos / totalContatos) * 100) : 0;
    
    document.getElementById('total-projects').textContent = totalProjetos;
    document.getElementById('total-contacts').textContent = totalContatos;
    document.getElementById('pending-tests').textContent = totalPendentes;
    document.getElementById('success-rate').textContent = taxaSucesso + '%';
}

async function executarTestes() {
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    const projeto = projetos[projIndex];
    
    console.log('🚀 === INICIANDO EXECUÇÃO DE TESTES ===');
    console.log('📋 Projeto:', projeto.nome);
    console.log('🔗 Webhook:', projeto.webhookUrl);
    console.log('👥 Total de contatos no projeto:', projeto.contatos.length);
    console.log('📊 Dados dos contatos:', projeto.contatos);
    
    // Validações iniciais
    if (projeto.contatos.length === 0) {
        mostrarToast('Adicione contatos antes de executar os testes', 'warning');
        return;
    }
    
    if (!projeto.webhookUrl) {
        mostrarToast('Webhook URL não configurada para este projeto', 'error');
        return;
    }
    
    // Filtrar apenas contatos com dados válidos
    const contatosValidos = projeto.contatos.filter(c => c.numero && c.nome);
    
    console.log('✅ Contatos válidos (com número e nome):', contatosValidos.length);
    console.log('📋 Lista de contatos válidos:', contatosValidos);
    
    if (contatosValidos.length === 0) {
        mostrarToast('Nenhum contato válido encontrado. Preencha número e nome.', 'warning');
        console.warn('⚠️ Nenhum contato tem número E nome preenchidos');
        return;
    }
    
    mostrarToast(`Iniciando envio de ${contatosValidos.length} disparo(s)...`, 'success');
    
    let sucessos = 0;
    let erros = 0;
    const resultados = [];
    
    // Processar cada contato
    for (let i = 0; i < contatosValidos.length; i++) {
        const contato = contatosValidos[i];
        
        console.log(`\n📤 Enviando contato ${i + 1}/${contatosValidos.length}:`);
        console.log('   Nome:', contato.nome);
        console.log('   Número:', contato.numero);
        console.log('   Data:', contato.timestamp);
        
        try {
            // Preparar payload para enviar ao webhook
            const payload = {
                // Informações do projeto
                projeto: {
                    id: projeto.id,
                    nome: projeto.nome,
                    cliente: projeto.cliente,
                    plataforma: projeto.plataforma,
                    accountId: projeto.accountId,
                    inboxId: projeto.inboxId
                },
                // Informações do contato
                contato: {
                    id: contato.id,
                    numero: contato.numero,
                    nome: contato.nome,
                    dataAgendada: contato.timestamp ? new Date(contato.timestamp).toISOString() : null
                },
                // Metadados
                metadata: {
                    dataEnvio: new Date().toISOString(),
                    origem: 'QAManager',
                    versao: '1.0'
                }
            };
            
            console.log('📦 Payload enviado:', JSON.stringify(payload, null, 2));
            
            // Fazer requisição para o webhook
            const response = await fetch(projeto.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            console.log('📨 Status da resposta:', response.status, response.statusText);
            
            if (response.ok) {
                sucessos++;
                
                const responseData = await response.text();
                console.log('✅ Resposta do webhook:', responseData);
                
                // Atualizar status do contato
                const contatoIndex = projeto.contatos.findIndex(c => c.id === contato.id);
                if (contatoIndex !== -1) {
                    projeto.contatos[contatoIndex].ultimoEnvio = new Date().toISOString();
                    projeto.contatos[contatoIndex].statusEnvio = 'sucesso';
                    projeto.contatos[contatoIndex].mensagemRetorno = 'Enviado com sucesso';
                }
                
                resultados.push({
                    contato: contato.nome,
                    numero: contato.numero,
                    status: 'sucesso',
                    mensagem: 'Enviado com sucesso'
                });
                
            } else {
                erros++;
                const errorText = await response.text();
                
                console.error('❌ Erro na resposta:', errorText);
                
                // Registrar erro
                const contatoIndex = projeto.contatos.findIndex(c => c.id === contato.id);
                if (contatoIndex !== -1) {
                    projeto.contatos[contatoIndex].ultimoEnvio = new Date().toISOString();
                    projeto.contatos[contatoIndex].statusEnvio = 'erro';
                    projeto.contatos[contatoIndex].mensagemRetorno = `Erro ${response.status}: ${errorText}`;
                }
                
                resultados.push({
                    contato: contato.nome,
                    numero: contato.numero,
                    status: 'erro',
                    mensagem: `Erro ${response.status}`
                });
            }
            
        } catch (error) {
            erros++;
            console.error('❌ Erro ao enviar para webhook:', error);
            
            // Registrar erro de conexão
            const contatoIndex = projeto.contatos.findIndex(c => c.id === contato.id);
            if (contatoIndex !== -1) {
                projeto.contatos[contatoIndex].ultimoEnvio = new Date().toISOString();
                projeto.contatos[contatoIndex].statusEnvio = 'erro';
                projeto.contatos[contatoIndex].mensagemRetorno = `Erro de conexão: ${error.message}`;
            }
            
            resultados.push({
                contato: contato.nome,
                numero: contato.numero,
                status: 'erro',
                mensagem: error.message
            });
        }
        
        // Pequeno delay entre requisições para não sobrecarregar
        if (i < contatosValidos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // Salvar alterações
    projetos[projIndex] = projeto;
    salvarDados();
    renderizarTabela(projeto.contatos);
    
    // Mostrar resultado final
    if (erros === 0) {
        mostrarToast(`✅ Todos os ${sucessos} disparos foram enviados com sucesso!`, 'success');
    } else if (sucessos === 0) {
        mostrarToast(`❌ Todos os ${erros} disparos falharam. Verifique a URL do webhook.`, 'error');
    } else {
        mostrarToast(`⚠️ Concluído: ${sucessos} sucesso(s), ${erros} erro(s)`, 'warning');
    }
    
    // Log detalhado no console para debug
    console.log('\n🏁 === RESULTADO DA EXECUÇÃO ===');
    console.log('📊 Total de contatos:', contatosValidos.length);
    console.log('✅ Sucessos:', sucessos);
    console.log('❌ Erros:', erros);
    console.log('📋 Detalhes completos:', resultados);
}

function exportarProjetos() {
    const dataStr = JSON.stringify(projetos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'qa-projetos-' + new Date().toISOString().slice(0,10) + '.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    mostrarToast('Projetos exportados com sucesso!', 'success');
}

function importarContatos() {
    mostrarToast('Funcionalidade de importação em desenvolvimento', 'warning');
}

// --- Utilitários ---
function formatarPlataforma(plataforma) {
    const plataformas = {
        'chatwoot': 'Chatwoot',
        'huggy': 'Huggy',
        'zenvia': 'Zenvia',
        'takeblip': 'Take Blip'
    };
    return plataformas[plataforma] || plataforma;
}

function formatarData(dataString, apenasData = false) {
    const data = new Date(dataString);
    if (apenasData) {
        return data.toLocaleDateString('pt-BR');
    }
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
}

function mostrarToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${icons[tipo] || 'fas fa-info-circle'}"></i>
        </div>
        <div class="toast-content">
            <h4>${tipo === 'success' ? 'Sucesso' : tipo === 'error' ? 'Erro' : 'Aviso'}</h4>
            <p>${mensagem}</p>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}
