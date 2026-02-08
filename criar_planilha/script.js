// ====================================
// DADOS DO SISTEMA
// ====================================
let projetos = JSON.parse(localStorage.getItem('qa_projetos_v4')) || [];
let historico = JSON.parse(localStorage.getItem('qa_historico')) || [];
let templates = JSON.parse(localStorage.getItem('qa_templates')) || [];
let configuracoes = JSON.parse(localStorage.getItem('qa_configuracoes')) || {
    emailNotifications: true,
    testAlerts: true,
    errorNotifications: true,
    animations: true,
    confirmDispatch: true,
    dispatchDelay: 500
};

let projetoAtualId = null;
let modoEdicao = false;
let filtroAtual = 'all';

// ====================================
// INICIALIZAÇÃO
// ====================================
document.addEventListener('DOMContentLoaded', function() {
    carregarConfiguracoes();
    renderizarProjetos();
    atualizarEstatisticas();
    configurarEventos();
    atualizarContadorNotificacoes();
    
    // Atualizar contador de projetos na sidebar
    document.getElementById('project-count').textContent = projetos.length;
    
    // Menu mobile
    document.getElementById('menu-toggle').addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
    });
    
    // Busca com debounce
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filtrarProjetos(e.target.value);
        }, 300);
    });
});

// ====================================
// CONFIGURAÇÃO DE EVENTOS
// ====================================
function configurarEventos() {
    // Fechar modal ao clicar fora
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal-overlay')) {
            fecharTodosModais();
        }
    });
    
    // Fechar sidebar mobile ao clicar no conteúdo
    document.querySelector('.main-content').addEventListener('click', function() {
        if (window.innerWidth <= 1024) {
            document.querySelector('.sidebar').classList.remove('active');
        }
    });
}

function carregarConfiguracoes() {
    document.getElementById('email-notifications').checked = configuracoes.emailNotifications;
    document.getElementById('test-alerts').checked = configuracoes.testAlerts;
    document.getElementById('error-notifications').checked = configuracoes.errorNotifications;
    document.getElementById('animations-toggle').checked = configuracoes.animations;
    document.getElementById('confirm-dispatch').checked = configuracoes.confirmDispatch;
    document.getElementById('dispatch-delay').value = configuracoes.dispatchDelay;
    
    // Aplicar tema escuro se salvo
    if (localStorage.getItem('dark-mode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').checked = true;
    }
}

function salvarConfiguracoes() {
    configuracoes = {
        emailNotifications: document.getElementById('email-notifications').checked,
        testAlerts: document.getElementById('test-alerts').checked,
        errorNotifications: document.getElementById('error-notifications').checked,
        animations: document.getElementById('animations-toggle').checked,
        confirmDispatch: document.getElementById('confirm-dispatch').checked,
        dispatchDelay: parseInt(document.getElementById('dispatch-delay').value)
    };
    
    localStorage.setItem('qa_configuracoes', JSON.stringify(configuracoes));
    mostrarToast('Configurações salvas com sucesso!', 'success');
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('dark-mode', isDark);
    mostrarToast(`Tema ${isDark ? 'escuro' : 'claro'} ativado`, 'success');
}

// ====================================
// NAVEGAÇÃO
// ====================================
function irParaHome(e) {
    if (e) e.preventDefault();
    mostrarTela('screen-dashboard');
    ativarNavItem(0);
    renderizarProjetos();
    atualizarEstatisticas();
}

function irParaPlanilhaLista(e) {
    if (e) e.preventDefault();
    irParaHome();
    ativarNavItem(1);
}

function mostrarHistorico(e) {
    if (e) e.preventDefault();
    mostrarTela('screen-history');
    ativarNavItem(2);
    renderizarHistorico();
}

function mostrarRelatorios(e) {
    if (e) e.preventDefault();
    mostrarTela('screen-reports');
    ativarNavItem(3);
    renderizarRelatorios();
}

function mostrarTemplates(e) {
    if (e) e.preventDefault();
    mostrarTela('screen-templates');
    ativarNavItem(4);
    renderizarTemplates();
}

function mostrarConfiguracoes(e) {
    if (e) e.preventDefault();
    mostrarTela('screen-settings');
    ativarNavItem(5);
}

function mostrarTela(telaId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(telaId).classList.add('active');
}

function ativarNavItem(index) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.nav-item')[index].classList.add('active');
}

function irParaPlanilha(id) {
    projetoAtualId = id;
    const proj = projetos.find(p => p.id === id);
    
    if (!proj) {
        mostrarToast('Projeto não encontrado', 'error');
        return;
    }
    
    document.getElementById('sheet-title').textContent = proj.nome;
    document.getElementById('sheet-client').textContent = proj.cliente;
    document.getElementById('sheet-platform').textContent = formatarPlataforma(proj.plataforma);
    document.getElementById('sheet-date').textContent = formatarData(proj.dataCriacao || new Date().toISOString(), true);
    document.getElementById('breadcrumb-project').textContent = proj.nome;
    
    mostrarTela('screen-details');
    document.querySelector('.sidebar').classList.remove('active');
    
    renderizarTabela(proj.contatos || []);
}

// ====================================
// RENDERIZAÇÃO DE PROJETOS
// ====================================
function renderizarProjetos() {
    const container = document.getElementById('projects-list');
    const emptyState = document.getElementById('empty-state');
    
    let projetosFiltrados = projetos;
    
    // Aplicar filtro de plataforma
    if (filtroAtual !== 'all') {
        projetosFiltrados = projetos.filter(p => p.plataforma === filtroAtual);
    }
    
    if (projetosFiltrados.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    container.innerHTML = '';
    
    projetosFiltrados.forEach(projeto => {
        const card = criarCardProjeto(projeto);
        container.appendChild(card);
    });
}

function criarCardProjeto(projeto) {
    const div = document.createElement('div');
    div.className = 'project-card';
    
    const totalContatos = projeto.contatos ? projeto.contatos.length : 0;
    const contatosValidos = projeto.contatos ? projeto.contatos.filter(c => c.numero && c.nome).length : 0;
    const taxaSucesso = calcularTaxaSucesso(projeto);
    
    // Tags
    const tagsHtml = projeto.tags ? projeto.tags.split(',').map(tag => 
        `<span class="project-tag">${tag.trim()}</span>`
    ).join('') : '';
    
    div.innerHTML = `
        <div class="project-card-header">
            <div class="project-icon ${projeto.plataforma}">
                <i class="fas fa-${getIconePlataforma(projeto.plataforma)}"></i>
            </div>
            <div class="project-info">
                <h3>${projeto.nome}</h3>
                <p>${projeto.cliente}</p>
            </div>
        </div>
        <div class="project-card-body">
            ${projeto.descricao ? `<p class="project-description">${projeto.descricao}</p>` : ''}
            <div class="project-tags">
                ${tagsHtml}
            </div>
        </div>
        <div class="project-card-stats">
            <div class="stat">
                <span class="stat-label">Contatos</span>
                <span class="stat-value">${totalContatos}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Válidos</span>
                <span class="stat-value">${contatosValidos}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Sucesso</span>
                <span class="stat-value">${taxaSucesso}%</span>
            </div>
        </div>
        <div class="project-card-footer">
            <button class="btn btn-primary" onclick="irParaPlanilha('${projeto.id}')">
                <i class="fas fa-arrow-right"></i>
                <span>Abrir</span>
            </button>
            <button class="btn btn-outline btn-icon" onclick="duplicarProjeto('${projeto.id}')" title="Duplicar">
                <i class="fas fa-copy"></i>
            </button>
            <button class="btn btn-outline btn-icon" onclick="confirmarExclusaoProjeto('${projeto.id}')" title="Excluir">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return div;
}

function getIconePlataforma(plataforma) {
    const icones = {
        'chatwoot': 'comments',
        'huggy': 'robot',
        'zenvia': 'paper-plane',
        'takeblip': 'cloud'
    };
    return icones[plataforma] || 'server';
}

function calcularTaxaSucesso(projeto) {
    if (!projeto.contatos || projeto.contatos.length === 0) return 0;
    
    const sucessos = projeto.contatos.filter(c => c.statusEnvio === 'sucesso').length;
    const total = projeto.contatos.filter(c => c.statusEnvio).length;
    
    if (total === 0) return 0;
    return Math.round((sucessos / total) * 100);
}

// ====================================
// FILTROS
// ====================================
function aplicarFiltro(filtro) {
    filtroAtual = filtro;
    
    // Atualizar chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
        if (chip.dataset.filter === filtro) {
            chip.classList.add('active');
        }
    });
    
    renderizarProjetos();
}

function filtrarProjetos(termo) {
    if (!termo) {
        renderizarProjetos();
        return;
    }
    
    termo = termo.toLowerCase();
    const container = document.getElementById('projects-list');
    const emptyState = document.getElementById('empty-state');
    
    const projetosFiltrados = projetos.filter(p => 
        p.nome.toLowerCase().includes(termo) ||
        p.cliente.toLowerCase().includes(termo) ||
        p.plataforma.toLowerCase().includes(termo) ||
        (p.descricao && p.descricao.toLowerCase().includes(termo))
    );
    
    if (projetosFiltrados.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    container.innerHTML = '';
    
    projetosFiltrados.forEach(projeto => {
        const card = criarCardProjeto(projeto);
        container.appendChild(card);
    });
}

// ====================================
// ESTATÍSTICAS
// ====================================
function atualizarEstatisticas() {
    const totalProjetos = projetos.length;
    const totalContatos = projetos.reduce((sum, p) => sum + (p.contatos ? p.contatos.length : 0), 0);
    const contatosPendentes = projetos.reduce((sum, p) => {
        if (!p.contatos) return sum;
        return sum + p.contatos.filter(c => !c.statusEnvio).length;
    }, 0);
    
    let totalEnvios = 0;
    let totalSucessos = 0;
    
    projetos.forEach(p => {
        if (p.contatos) {
            p.contatos.forEach(c => {
                if (c.statusEnvio) {
                    totalEnvios++;
                    if (c.statusEnvio === 'sucesso') totalSucessos++;
                }
            });
        }
    });
    
    const taxaSucesso = totalEnvios > 0 ? Math.round((totalSucessos / totalEnvios) * 100) : 0;
    
    document.getElementById('total-projects').textContent = totalProjetos;
    document.getElementById('total-contacts').textContent = totalContatos;
    document.getElementById('pending-tests').textContent = contatosPendentes;
    document.getElementById('success-rate').textContent = taxaSucesso + '%';
}

// ====================================
// GERENCIAMENTO DE PROJETOS
// ====================================
function abrirModalProjeto() {
    modoEdicao = false;
    document.getElementById('modal-projeto-titulo').textContent = 'Configurar Novo Projeto';
    document.getElementById('btn-salvar-projeto').innerHTML = '<i class="fas fa-check"></i><span>Criar Projeto</span>';
    
    // Limpar formulário
    document.getElementById('p-nome').value = '';
    document.getElementById('p-cliente').value = '';
    document.getElementById('p-plataforma').value = '';
    document.getElementById('p-account').value = '';
    document.getElementById('p-inbox').value = '';
    document.getElementById('p-webhook').value = '';
    document.getElementById('p-tags').value = '';
    document.getElementById('p-descricao').value = '';
    
    document.getElementById('modal-projeto').classList.add('active');
}

function abrirModalEditarProjeto() {
    if (!projetoAtualId) return;
    
    const projeto = projetos.find(p => p.id === projetoAtualId);
    if (!projeto) return;
    
    modoEdicao = true;
    document.getElementById('modal-projeto-titulo').textContent = 'Editar Projeto';
    document.getElementById('btn-salvar-projeto').innerHTML = '<i class="fas fa-save"></i><span>Salvar Alterações</span>';
    
    // Preencher formulário
    document.getElementById('p-nome').value = projeto.nome;
    document.getElementById('p-cliente').value = projeto.cliente;
    document.getElementById('p-plataforma').value = projeto.plataforma;
    document.getElementById('p-account').value = projeto.accountId;
    document.getElementById('p-inbox').value = projeto.inboxId;
    document.getElementById('p-webhook').value = projeto.webhookUrl;
    document.getElementById('p-tags').value = projeto.tags || '';
    document.getElementById('p-descricao').value = projeto.descricao || '';
    
    document.getElementById('modal-projeto').classList.add('active');
}

function salvarProjeto(event) {
    event.preventDefault();
    
    const nome = document.getElementById('p-nome').value.trim();
    const cliente = document.getElementById('p-cliente').value.trim();
    const plataforma = document.getElementById('p-plataforma').value;
    const accountId = document.getElementById('p-account').value.trim();
    const inboxId = document.getElementById('p-inbox').value.trim();
    const webhookUrl = document.getElementById('p-webhook').value.trim();
    const tags = document.getElementById('p-tags').value.trim();
    const descricao = document.getElementById('p-descricao').value.trim();
    
    // Validação de URL
    if (!webhookUrl.startsWith('https://')) {
        mostrarToast('A URL do webhook deve começar com https://', 'error');
        return;
    }
    
    if (modoEdicao && projetoAtualId) {
        // Modo edição
        const projetoIndex = projetos.findIndex(p => p.id === projetoAtualId);
        if (projetoIndex !== -1) {
            projetos[projetoIndex] = {
                ...projetos[projetoIndex],
                nome,
                cliente,
                plataforma,
                accountId,
                inboxId,
                webhookUrl,
                tags,
                descricao,
                dataModificacao: new Date().toISOString()
            };
            
            // Atualizar informações na tela de detalhes
            document.getElementById('sheet-title').textContent = nome;
            document.getElementById('sheet-client').textContent = cliente;
            document.getElementById('sheet-platform').textContent = formatarPlataforma(plataforma);
            document.getElementById('breadcrumb-project').textContent = nome;
            
            mostrarToast('Projeto atualizado com sucesso!', 'success');
        }
    } else {
        // Modo criação
        const novoProjeto = {
            id: Date.now().toString(),
            nome,
            cliente,
            plataforma,
            accountId,
            inboxId,
            webhookUrl,
            tags,
            descricao,
            contatos: [],
            dataCriacao: new Date().toISOString()
        };
        
        projetos.push(novoProjeto);
        mostrarToast('Projeto criado com sucesso!', 'success');
    }
    
    salvarDados();
    fecharModal();
    renderizarProjetos();
    atualizarEstatisticas();
    document.getElementById('project-count').textContent = projetos.length;
}

function duplicarProjeto(id) {
    const projeto = projetos.find(p => p.id === id);
    if (!projeto) return;
    
    const novoProjeto = {
        ...projeto,
        id: Date.now().toString(),
        nome: projeto.nome + ' (Cópia)',
        contatos: projeto.contatos.map(c => ({...c, id: Date.now().toString() + Math.random()})),
        dataCriacao: new Date().toISOString()
    };
    
    projetos.push(novoProjeto);
    salvarDados();
    renderizarProjetos();
    atualizarEstatisticas();
    mostrarToast('Projeto duplicado com sucesso!', 'success');
}

function confirmarExclusaoProjeto(id) {
    if (confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) {
        excluirProjeto(id);
    }
}

function excluirProjeto(id) {
    const index = projetos.findIndex(p => p.id === id);
    if (index !== -1) {
        projetos.splice(index, 1);
        salvarDados();
        renderizarProjetos();
        atualizarEstatisticas();
        document.getElementById('project-count').textContent = projetos.length;
        mostrarToast('Projeto excluído com sucesso', 'success');
    }
}

function excluirProjetoAtual() {
    if (!projetoAtualId) return;
    
    if (confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) {
        excluirProjeto(projetoAtualId);
        irParaHome();
    }
}

// ====================================
// RENDERIZAÇÃO DA TABELA
// ====================================
function renderizarTabela(contatos) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (!contatos || contatos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-light);">Nenhum contato adicionado. Clique em "Adicionar nova linha" para começar.</td></tr>';
        return;
    }

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
        if (contato.statusEnvio) {
            if (contato.statusEnvio === 'sucesso') {
                status = 'Enviado';
                statusClass = 'success';
            } else {
                status = 'Erro';
                statusClass = 'danger';
            }
        } else if (contato.timestamp) {
            const dataDisparo = new Date(contato.timestamp);
            const agora = new Date();
            
            if (dataDisparo > agora) {
                status = 'Agendado';
                statusClass = 'warning';
            } else {
                status = 'Pendente';
                statusClass = 'secondary';
            }
        } else {
            status = 'Pendente';
            statusClass = 'secondary';
        }
        
        // Último envio
        const ultimoEnvio = contato.ultimoEnvio ? 
            `<small>${formatarData(contato.ultimoEnvio)}</small>` : 
            '<small style="color: var(--text-light);">-</small>';

        tr.innerHTML = `
            <td>
                <input type="text" class="cell-input" 
                    value="${contato.numero || ''}" 
                    placeholder="Ex: 5511999999999"
                    onblur="atualizarCelula('${contato.id}', 'numero', this.value)"
                    pattern="[0-9]{10,15}"
                    title="Digite apenas números (10-15 dígitos)"
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
                <span class="tag ${statusClass}" title="${contato.mensagemRetorno || ''}">${status}</span>
            </td>
            <td>
                ${ultimoEnvio}
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

// ====================================
// LÓGICA DE EDIÇÃO DA TABELA
// ====================================
function adicionarLinhaVazia() {
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    if (projIndex === -1) return;
    
    const novoContato = {
        id: Date.now().toString(),
        numero: '',
        nome: '',
        timestamp: null
    };
    
    if (!projetos[projIndex].contatos) {
        projetos[projIndex].contatos = [];
    }
    
    projetos[projIndex].contatos.push(novoContato);
    salvarDados();
    renderizarTabela(projetos[projIndex].contatos);
    mostrarToast('Nova linha adicionada', 'success');
}

function adicionarMultiplasLinhas() {
    const quantidade = prompt('Quantas linhas deseja adicionar?', '5');
    if (!quantidade || isNaN(quantidade) || quantidade < 1) return;
    
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    if (projIndex === -1) return;
    
    if (!projetos[projIndex].contatos) {
        projetos[projIndex].contatos = [];
    }
    
    for (let i = 0; i < parseInt(quantidade); i++) {
        const novoContato = {
            id: Date.now().toString() + '_' + i,
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
    if (projIndex === -1) return;
    
    const contatoIndex = projetos[projIndex].contatos.findIndex(c => c.id === contatoId);
    if (contatoIndex === -1) return;
    
    // Validação de número de WhatsApp
    if (campo === 'numero') {
        valor = valor.replace(/\D/g, ''); // Remove não-números
        if (valor && (valor.length < 10 || valor.length > 15)) {
            mostrarToast('Número deve ter entre 10 e 15 dígitos', 'warning');
            return;
        }
    }
    
    if(projetos[projIndex].contatos[contatoIndex][campo] !== valor) {
        projetos[projIndex].contatos[contatoIndex][campo] = valor;
        salvarDados();
        mostrarIndicadorSalvo();
    }
}

function atualizarData(contatoId, valorDateInput) {
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    if (projIndex === -1) return;
    
    const contatoIndex = projetos[projIndex].contatos.findIndex(c => c.id === contatoId);
    if (contatoIndex === -1) return;
    
    const timestamp = valorDateInput ? new Date(valorDateInput).getTime() : null;
    
    projetos[projIndex].contatos[contatoIndex].timestamp = timestamp;
    salvarDados();
    renderizarTabela(projetos[projIndex].contatos);
    mostrarIndicadorSalvo();
}

function excluirLinha(contatoId) {
    if (!confirm('Tem certeza que deseja excluir esta linha?')) {
        return;
    }
    
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    if (projIndex === -1) return;
    
    const contatoIndex = projetos[projIndex].contatos.findIndex(c => c.id === contatoId);
    if (contatoIndex === -1) return;
    
    projetos[projIndex].contatos.splice(contatoIndex, 1);
    salvarDados();
    renderizarTabela(projetos[projIndex].contatos);
    mostrarToast('Linha excluída', 'success');
}

function mostrarIndicadorSalvo() {
    // Feedback visual discreto
    const btn = document.querySelector('.add-row-btn');
    if (btn) {
        btn.style.background = 'var(--success)';
        btn.style.color = 'white';
        setTimeout(() => {
            btn.style.background = '';
            btn.style.color = '';
        }, 500);
    }
}

// ====================================
// IMPORTAÇÃO/EXPORTAÇÃO DE CONTATOS
// ====================================
function importarContatos() {
    document.getElementById('import-file').click();
}

function processarImportacao(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            if (jsonData.length === 0) {
                mostrarToast('Arquivo vazio ou formato inválido', 'error');
                return;
            }
            
            const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
            if (projIndex === -1) return;
            
            if (!projetos[projIndex].contatos) {
                projetos[projIndex].contatos = [];
            }
            
            let importados = 0;
            jsonData.forEach(row => {
                // Aceita variações de nomes de colunas
                const numero = row.numero || row.Numero || row.telefone || row.Telefone || row.phone || '';
                const nome = row.nome || row.Nome || row.name || row.Name || '';
                
                if (numero && nome) {
                    projetos[projIndex].contatos.push({
                        id: Date.now().toString() + '_' + Math.random(),
                        numero: numero.toString().replace(/\D/g, ''),
                        nome: nome.toString(),
                        timestamp: null
                    });
                    importados++;
                }
            });
            
            salvarDados();
            renderizarTabela(projetos[projIndex].contatos);
            mostrarToast(`${importados} contatos importados com sucesso!`, 'success');
            
        } catch (error) {
            console.error('Erro ao importar:', error);
            mostrarToast('Erro ao processar arquivo. Verifique o formato.', 'error');
        }
    };
    
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Limpar input
}

function exportarContatos() {
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    if (projIndex === -1) return;
    
    const contatos = projetos[projIndex].contatos || [];
    if (contatos.length === 0) {
        mostrarToast('Nenhum contato para exportar', 'warning');
        return;
    }
    
    const dadosExportacao = contatos.map(c => ({
        numero: c.numero,
        nome: c.nome,
        dataDisparo: c.timestamp ? new Date(c.timestamp).toLocaleString('pt-BR') : '',
        status: c.statusEnvio || 'pendente',
        ultimoEnvio: c.ultimoEnvio ? new Date(c.ultimoEnvio).toLocaleString('pt-BR') : ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(dadosExportacao);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contatos');
    
    const projeto = projetos[projIndex];
    const filename = `contatos_${projeto.nome.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    mostrarToast('Contatos exportados com sucesso!', 'success');
}

// ====================================
// EXECUÇÃO DE TESTES
// ====================================
async function executarTestes() {
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    if (projIndex === -1) {
        mostrarToast('Projeto não encontrado', 'error');
        return;
    }
    
    const projeto = projetos[projIndex];
    const contatos = projeto.contatos || [];
    
    // Validar contatos
    const contatosValidos = contatos.filter(c => 
        c.numero && c.numero.trim() !== '' && 
        c.nome && c.nome.trim() !== ''
    );
    
    if (contatosValidos.length === 0) {
        mostrarToast('Nenhum contato válido para enviar. Preencha número e nome.', 'warning');
        return;
    }
    
    // Mostrar modal de confirmação se configurado
    if (configuracoes.confirmDispatch) {
        document.getElementById('confirm-total').textContent = contatos.length;
        document.getElementById('confirm-valid').textContent = contatosValidos.length;
        document.getElementById('modal-confirmar').classList.add('active');
    } else {
        executarDisparos(contatosValidos, projeto, projIndex);
    }
}

function fecharModalConfirmar() {
    document.getElementById('modal-confirmar').classList.remove('active');
}

function confirmarExecucao() {
    fecharModalConfirmar();
    
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    if (projIndex === -1) return;
    
    const projeto = projetos[projIndex];
    const contatos = projeto.contatos || [];
    const contatosValidos = contatos.filter(c => 
        c.numero && c.numero.trim() !== '' && 
        c.nome && c.nome.trim() !== ''
    );
    
    executarDisparos(contatosValidos, projeto, projIndex);
}

async function executarDisparos(contatosValidos, projeto, projIndex) {
    // Mostrar modal de progresso
    document.getElementById('modal-progress').classList.add('active');
    document.getElementById('progress-total').textContent = contatosValidos.length;
    document.getElementById('progress-current').textContent = '0';
    document.getElementById('progress-success').textContent = '0';
    document.getElementById('progress-errors').textContent = '0';
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-log').innerHTML = '';
    document.getElementById('btn-close-progress').style.display = 'none';
    
    let sucessos = 0;
    let erros = 0;
    const delay = configuracoes.dispatchDelay || 500;
    
    for (let i = 0; i < contatosValidos.length; i++) {
        const contato = contatosValidos[i];
        
        try {
            const payload = {
                projeto: {
                    id: projeto.id,
                    nome: projeto.nome,
                    cliente: projeto.cliente,
                    plataforma: projeto.plataforma,
                    accountId: projeto.accountId,
                    inboxId: projeto.inboxId
                },
                contato: {
                    id: contato.id,
                    numero: contato.numero,
                    nome: contato.nome,
                    dataAgendada: contato.timestamp ? new Date(contato.timestamp).toISOString() : null
                },
                metadata: {
                    dataEnvio: new Date().toISOString(),
                    origem: 'QAManager',
                    versao: '2.0'
                }
            };
            
            const response = await fetch(projeto.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                sucessos++;
                
                const contatoIndex = projeto.contatos.findIndex(c => c.id === contato.id);
                if (contatoIndex !== -1) {
                    projeto.contatos[contatoIndex].ultimoEnvio = new Date().toISOString();
                    projeto.contatos[contatoIndex].statusEnvio = 'sucesso';
                    projeto.contatos[contatoIndex].mensagemRetorno = 'Enviado com sucesso';
                }
                
                adicionarAoHistorico(projeto, contato, 'sucesso', 'Enviado com sucesso');
                adicionarLogProgresso(`✓ ${contato.nome}: Enviado com sucesso`, 'success');
                
            } else {
                erros++;
                const errorText = await response.text();
                
                const contatoIndex = projeto.contatos.findIndex(c => c.id === contato.id);
                if (contatoIndex !== -1) {
                    projeto.contatos[contatoIndex].ultimoEnvio = new Date().toISOString();
                    projeto.contatos[contatoIndex].statusEnvio = 'erro';
                    projeto.contatos[contatoIndex].mensagemRetorno = `Erro ${response.status}: ${errorText}`;
                }
                
                adicionarAoHistorico(projeto, contato, 'erro', `Erro ${response.status}`);
                adicionarLogProgresso(`✗ ${contato.nome}: Erro ${response.status}`, 'error');
            }
            
        } catch (error) {
            erros++;
            
            const contatoIndex = projeto.contatos.findIndex(c => c.id === contato.id);
            if (contatoIndex !== -1) {
                projeto.contatos[contatoIndex].ultimoEnvio = new Date().toISOString();
                projeto.contatos[contatoIndex].statusEnvio = 'erro';
                projeto.contatos[contatoIndex].mensagemRetorno = `Erro de conexão: ${error.message}`;
            }
            
            adicionarAoHistorico(projeto, contato, 'erro', error.message);
            adicionarLogProgresso(`✗ ${contato.nome}: ${error.message}`, 'error');
        }
        
        // Atualizar progresso
        const progresso = Math.round(((i + 1) / contatosValidos.length) * 100);
        document.getElementById('progress-fill').style.width = progresso + '%';
        document.getElementById('progress-current').textContent = i + 1;
        document.getElementById('progress-success').textContent = sucessos;
        document.getElementById('progress-errors').textContent = erros;
        
        // Delay entre requisições
        if (i < contatosValidos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // Salvar alterações
    projetos[projIndex] = projeto;
    salvarDados();
    salvarHistorico();
    renderizarTabela(projeto.contatos);
    
    // Mostrar resultado final
    document.getElementById('btn-close-progress').style.display = 'block';
    
    if (erros === 0) {
        adicionarLogProgresso(`\n🎉 Concluído! Todos os ${sucessos} disparos foram enviados com sucesso!`, 'success');
        if (configuracoes.testAlerts) {
            mostrarToast(`✅ ${sucessos} disparos enviados com sucesso!`, 'success');
        }
    } else if (sucessos === 0) {
        adicionarLogProgresso(`\n❌ Todos os ${erros} disparos falharam.`, 'error');
        if (configuracoes.errorNotifications) {
            mostrarToast(`❌ Todos os disparos falharam`, 'error');
        }
    } else {
        adicionarLogProgresso(`\n⚠️ Concluído: ${sucessos} sucesso(s), ${erros} erro(s)`, 'warning');
        mostrarToast(`⚠️ ${sucessos} sucessos, ${erros} erros`, 'warning');
    }
}

function adicionarLogProgresso(mensagem, tipo) {
    const log = document.getElementById('progress-log');
    const p = document.createElement('p');
    p.className = tipo;
    p.textContent = mensagem;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
}

function fecharModalProgress() {
    document.getElementById('modal-progress').classList.remove('active');
    atualizarEstatisticas();
}

// ====================================
// TESTE DE WEBHOOK
// ====================================
async function testarWebhook() {
    const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
    if (projIndex === -1) return;
    
    const projeto = projetos[projIndex];
    
    const payloadTeste = {
        projeto: {
            id: projeto.id,
            nome: projeto.nome,
            cliente: projeto.cliente
        },
        contato: {
            numero: '5511999999999',
            nome: 'Teste de Conexão'
        },
        metadata: {
            teste: true,
            dataEnvio: new Date().toISOString()
        }
    };
    
    try {
        mostrarToast('Testando webhook...', 'warning');
        
        const response = await fetch(projeto.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payloadTeste)
        });
        
        if (response.ok) {
            const data = await response.text();
            mostrarToast('✅ Webhook testado com sucesso!', 'success');
            console.log('Resposta do webhook:', data);
        } else {
            mostrarToast(`❌ Erro ${response.status}: ${response.statusText}`, 'error');
        }
    } catch (error) {
        mostrarToast(`❌ Erro de conexão: ${error.message}`, 'error');
    }
}

// ====================================
// HISTÓRICO
// ====================================
function adicionarAoHistorico(projeto, contato, status, mensagem) {
    const registro = {
        id: Date.now().toString() + Math.random(),
        projetoId: projeto.id,
        projetoNome: projeto.nome,
        cliente: projeto.cliente,
        plataforma: projeto.plataforma,
        contatoNumero: contato.numero,
        contatoNome: contato.nome,
        status: status,
        mensagem: mensagem,
        dataHora: new Date().toISOString()
    };
    
    historico.unshift(registro); // Adicionar no início
    
    // Limitar histórico a 1000 registros
    if (historico.length > 1000) {
        historico = historico.slice(0, 1000);
    }
}

function salvarHistorico() {
    localStorage.setItem('qa_historico', JSON.stringify(historico));
}

function renderizarHistorico() {
    const container = document.getElementById('history-list');
    const emptyState = document.getElementById('history-empty');
    
    // Preencher filtro de projetos
    const filterSelect = document.getElementById('history-project-filter');
    const projetosUnicos = [...new Set(historico.map(h => h.projetoNome))];
    filterSelect.innerHTML = '<option value="">Todos os projetos</option>';
    projetosUnicos.forEach(nome => {
        const option = document.createElement('option');
        option.value = nome;
        option.textContent = nome;
        filterSelect.appendChild(option);
    });
    
    filtrarHistorico();
}

function filtrarHistorico() {
    const container = document.getElementById('history-list');
    const emptyState = document.getElementById('history-empty');
    
    const projetoFiltro = document.getElementById('history-project-filter').value;
    const statusFiltro = document.getElementById('history-status-filter').value;
    const dataFiltro = document.getElementById('history-date-filter').value;
    
    let historicoFiltrado = historico;
    
    if (projetoFiltro) {
        historicoFiltrado = historicoFiltrado.filter(h => h.projetoNome === projetoFiltro);
    }
    
    if (statusFiltro) {
        historicoFiltrado = historicoFiltrado.filter(h => h.status === statusFiltro);
    }
    
    if (dataFiltro) {
        const dataFiltroDate = new Date(dataFiltro);
        historicoFiltrado = historicoFiltrado.filter(h => {
            const dataRegistro = new Date(h.dataHora);
            return dataRegistro.toDateString() === dataFiltroDate.toDateString();
        });
    }
    
    if (historicoFiltrado.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    container.innerHTML = '';
    
    historicoFiltrado.forEach(registro => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const statusClass = registro.status === 'sucesso' ? 'success' : 'danger';
        const statusIcon = registro.status === 'sucesso' ? 'check-circle' : 'times-circle';
        
        item.innerHTML = `
            <div class="history-icon ${statusClass}">
                <i class="fas fa-${statusIcon}"></i>
            </div>
            <div class="history-content">
                <div class="history-header">
                    <h4>${registro.contatoNome}</h4>
                    <span class="tag ${statusClass}">${registro.status}</span>
                </div>
                <p class="history-details">
                    <strong>${registro.projetoNome}</strong> · ${registro.cliente} · ${formatarPlataforma(registro.plataforma)}
                </p>
                <p class="history-number">${registro.contatoNumero}</p>
                ${registro.mensagem ? `<p class="history-message">${registro.mensagem}</p>` : ''}
                <p class="history-date">${formatarData(registro.dataHora)}</p>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// ====================================
// RELATÓRIOS
// ====================================
function renderizarRelatorios() {
    renderizarGraficoPlatformas();
    renderizarGraficoSucesso();
    renderizarTabelaResumo();
}

function renderizarGraficoPlatformas() {
    const container = document.getElementById('platform-chart');
    
    const plataformas = {};
    projetos.forEach(p => {
        plataformas[p.plataforma] = (plataformas[p.plataforma] || 0) + 1;
    });
    
    const cores = {
        'chatwoot': '#6366f1',
        'huggy': '#10b981',
        'zenvia': '#f59e0b',
        'takeblip': '#ef4444'
    };
    
    let html = '<div class="simple-chart">';
    
    Object.entries(plataformas).forEach(([plat, count]) => {
        const porcentagem = Math.round((count / projetos.length) * 100);
        html += `
            <div class="chart-item">
                <div class="chart-label">
                    <span>${formatarPlataforma(plat)}</span>
                    <strong>${count} projeto${count > 1 ? 's' : ''}</strong>
                </div>
                <div class="chart-bar">
                    <div class="chart-bar-fill" style="width: ${porcentagem}%; background: ${cores[plat] || '#6366f1'}"></div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderizarGraficoSucesso() {
    const container = document.getElementById('success-chart');
    
    let totalEnvios = 0;
    let totalSucessos = 0;
    let totalErros = 0;
    
    projetos.forEach(p => {
        if (p.contatos) {
            p.contatos.forEach(c => {
                if (c.statusEnvio === 'sucesso') {
                    totalSucessos++;
                    totalEnvios++;
                } else if (c.statusEnvio === 'erro') {
                    totalErros++;
                    totalEnvios++;
                }
            });
        }
    });
    
    const porcentagemSucesso = totalEnvios > 0 ? Math.round((totalSucessos / totalEnvios) * 100) : 0;
    const porcentagemErro = totalEnvios > 0 ? Math.round((totalErros / totalEnvios) * 100) : 0;
    
    container.innerHTML = `
        <div class="simple-chart">
            <div class="chart-item">
                <div class="chart-label">
                    <span>Sucessos</span>
                    <strong>${totalSucessos} (${porcentagemSucesso}%)</strong>
                </div>
                <div class="chart-bar">
                    <div class="chart-bar-fill" style="width: ${porcentagemSucesso}%; background: var(--success)"></div>
                </div>
            </div>
            <div class="chart-item">
                <div class="chart-label">
                    <span>Erros</span>
                    <strong>${totalErros} (${porcentagemErro}%)</strong>
                </div>
                <div class="chart-bar">
                    <div class="chart-bar-fill" style="width: ${porcentagemErro}%; background: var(--danger)"></div>
                </div>
            </div>
        </div>
    `;
}

function renderizarTabelaResumo() {
    const container = document.getElementById('summary-table');
    
    let html = `
        <table class="modern-table">
            <thead>
                <tr>
                    <th>Projeto</th>
                    <th>Cliente</th>
                    <th>Plataforma</th>
                    <th>Total Contatos</th>
                    <th>Enviados</th>
                    <th>Taxa Sucesso</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    projetos.forEach(p => {
        const totalContatos = p.contatos ? p.contatos.length : 0;
        const totalEnviados = p.contatos ? p.contatos.filter(c => c.statusEnvio).length : 0;
        const taxaSucesso = calcularTaxaSucesso(p);
        
        html += `
            <tr>
                <td><strong>${p.nome}</strong></td>
                <td>${p.cliente}</td>
                <td>${formatarPlataforma(p.plataforma)}</td>
                <td>${totalContatos}</td>
                <td>${totalEnviados}</td>
                <td><span class="tag ${taxaSucesso >= 80 ? 'success' : taxaSucesso >= 50 ? 'warning' : 'danger'}">${taxaSucesso}%</span></td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// ====================================
// TEMPLATES
// ====================================
function abrirModalTemplate() {
    document.getElementById('t-nome').value = '';
    document.getElementById('t-descricao').value = '';
    document.getElementById('t-config').value = '';
    document.getElementById('modal-template').classList.add('active');
}

function fecharModalTemplate() {
    document.getElementById('modal-template').classList.remove('active');
}

function salvarTemplate(event) {
    event.preventDefault();
    
    const nome = document.getElementById('t-nome').value.trim();
    const descricao = document.getElementById('t-descricao').value.trim();
    const config = document.getElementById('t-config').value.trim();
    
    // Validar JSON
    try {
        JSON.parse(config);
    } catch (error) {
        mostrarToast('JSON inválido. Verifique a sintaxe.', 'error');
        return;
    }
    
    const novoTemplate = {
        id: Date.now().toString(),
        nome,
        descricao,
        config,
        dataCriacao: new Date().toISOString()
    };
    
    templates.push(novoTemplate);
    localStorage.setItem('qa_templates', JSON.stringify(templates));
    
    fecharModalTemplate();
    renderizarTemplates();
    mostrarToast('Template salvo com sucesso!', 'success');
}

function renderizarTemplates() {
    const container = document.getElementById('templates-list');
    const emptyState = document.getElementById('templates-empty');
    
    if (templates.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    container.innerHTML = '';
    
    templates.forEach(template => {
        const card = document.createElement('div');
        card.className = 'template-card';
        
        card.innerHTML = `
            <div class="template-header">
                <h3><i class="fas fa-file-code"></i> ${template.nome}</h3>
            </div>
            <div class="template-body">
                ${template.descricao ? `<p>${template.descricao}</p>` : ''}
                <pre class="template-preview">${template.config.substring(0, 100)}${template.config.length > 100 ? '...' : ''}</pre>
            </div>
            <div class="template-footer">
                <button class="btn btn-outline" onclick="copiarTemplate('${template.id}')">
                    <i class="fas fa-copy"></i>
                    Copiar
                </button>
                <button class="btn btn-outline" onclick="visualizarTemplate('${template.id}')">
                    <i class="fas fa-eye"></i>
                    Ver
                </button>
                <button class="btn btn-outline" onclick="excluirTemplate('${template.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function copiarTemplate(id) {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    
    navigator.clipboard.writeText(template.config);
    mostrarToast('Template copiado para a área de transferência!', 'success');
}

function visualizarTemplate(id) {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    
    alert(`Nome: ${template.nome}\n\nConfiguração:\n${template.config}`);
}

function excluirTemplate(id) {
    if (!confirm('Deseja excluir este template?')) return;
    
    const index = templates.findIndex(t => t.id === id);
    if (index !== -1) {
        templates.splice(index, 1);
        localStorage.setItem('qa_templates', JSON.stringify(templates));
        renderizarTemplates();
        mostrarToast('Template excluído', 'success');
    }
}

// ====================================
// EXPORTAÇÃO/IMPORTAÇÃO DE DADOS
// ====================================
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

function exportarTodosDados() {
    const dados = {
        projetos,
        historico,
        templates,
        configuracoes,
        versao: '2.0',
        dataExportacao: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(dados, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'qa-manager-backup-' + new Date().toISOString().slice(0,10) + '.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    mostrarToast('Backup completo exportado!', 'success');
}

function importarDados() {
    document.getElementById('import-data-file').click();
}

function processarImportacaoDados(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            
            if (!confirm('Isso irá substituir todos os dados atuais. Deseja continuar?')) {
                return;
            }
            
            if (dados.projetos) projetos = dados.projetos;
            if (dados.historico) historico = dados.historico;
            if (dados.templates) templates = dados.templates;
            if (dados.configuracoes) configuracoes = dados.configuracoes;
            
            salvarDados();
            salvarHistorico();
            localStorage.setItem('qa_templates', JSON.stringify(templates));
            localStorage.setItem('qa_configuracoes', JSON.stringify(configuracoes));
            
            location.reload();
            
        } catch (error) {
            console.error('Erro ao importar:', error);
            mostrarToast('Erro ao processar arquivo de backup', 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

function limparTodosDados() {
    if (!confirm('ATENÇÃO: Isso irá apagar TODOS os dados do sistema permanentemente. Esta ação não pode ser desfeita. Deseja continuar?')) {
        return;
    }
    
    if (!confirm('Última confirmação: Tem CERTEZA que deseja apagar todos os dados?')) {
        return;
    }
    
    projetos = [];
    historico = [];
    templates = [];
    
    localStorage.removeItem('qa_projetos_v4');
    localStorage.removeItem('qa_historico');
    localStorage.removeItem('qa_templates');
    
    location.reload();
}

// ====================================
// NOTIFICAÇÕES
// ====================================
function atualizarContadorNotificacoes() {
    // Calcular notificações pendentes
    let count = 0;
    
    // Testes pendentes
    projetos.forEach(p => {
        if (p.contatos) {
            count += p.contatos.filter(c => !c.statusEnvio && c.timestamp).length;
        }
    });
    
    document.getElementById('notification-count').textContent = count;
    
    if (count === 0) {
        document.getElementById('notification-count').style.display = 'none';
    } else {
        document.getElementById('notification-count').style.display = 'flex';
    }
}

function mostrarNotificacoes() {
    mostrarToast('Painel de notificações em desenvolvimento', 'warning');
}

// ====================================
// UTILITÁRIOS
// ====================================
function salvarDados() {
    localStorage.setItem('qa_projetos_v4', JSON.stringify(projetos));
}

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

function fecharModal() {
    document.getElementById('modal-projeto').classList.remove('active');
}

function fecharTodosModais() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
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
