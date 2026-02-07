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
            const ind = document.getElementById('save-indicator');
            ind.classList.add('saving');
            ind.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i><span>Salvando...</span>';
            
            setTimeout(() => {
                ind.classList.remove('saving');
                ind.innerHTML = '<i class="fas fa-check"></i><span>Salvo</span>';
            }, 600);
        }
        
        // --- Lógica de Projetos ---
        function renderizarProjetos() {
            const container = document.getElementById('projects-list');
            if (!container) return;
            
            container.innerHTML = '';
            
            if(projetos.length === 0) {
                document.getElementById('empty-state').style.display = 'block';
                return;
            }
            document.getElementById('empty-state').style.display = 'none';

            projetos.forEach(p => {
                const contatosConcluidos = p.contatos.filter(c => c.timestamp && new Date(c.timestamp) <= new Date()).length;
                const contatosPendentes = p.contatos.length - contatosConcluidos;
                
                const div = document.createElement('div');
                div.className = 'project-card';
                div.onclick = () => irParaPlanilha(p.id);
                div.innerHTML = `
                    <div class="project-card-header">
                        <div>
                            <h3>${p.nome}</h3>
                            <p class="project-card-client">${p.cliente}</p>
                            <span class="tag">
                                <i class="fas ${p.plataforma === 'chatwoot' ? 'fa-comment' : 'fa-link'}"></i>
                                <span>${formatarPlataforma(p.plataforma)}</span>
                            </span>
                        </div>
                        <button class="delete-btn" onclick="event.stopPropagation(); excluirProjeto('${p.id}')" title="Excluir projeto">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="project-card-body">
                        <div class="project-stats">
                            <div class="project-stat">
                                <span class="stat-number">${p.contatos.length}</span>
                                <span class="stat-desc">Total</span>
                            </div>
                            <div class="project-stat">
                                <span class="stat-number">${contatosConcluidos}</span>
                                <span class="stat-desc">Concluídos</span>
                            </div>
                            <div class="project-stat">
                                <span class="stat-number">${contatosPendentes}</span>
                                <span class="stat-desc">Pendentes</span>
                            </div>
                        </div>
                    </div>
                    <div class="project-card-footer">
                        <span class="project-date">Criado em ${formatarData(p.dataCriacao || new Date().toISOString(), true)}</span>
                        <button class="btn btn-icon" onclick="event.stopPropagation(); editarProjeto('${p.id}')" title="Editar projeto">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                `;
                container.appendChild(div);
            });
        }
        
        function filtrarProjetos(termo) {
            const container = document.getElementById('projects-list');
            if (!container) return;
            
            if (!termo) {
                renderizarProjetos();
                return;
            }
            
            container.innerHTML = '';
            
            const projetosFiltrados = projetos.filter(p => 
                p.nome.toLowerCase().includes(termo.toLowerCase()) ||
                p.cliente.toLowerCase().includes(termo.toLowerCase()) ||
                p.plataforma.toLowerCase().includes(termo.toLowerCase())
            );
            
            if(projetosFiltrados.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><h3>Nenhum projeto encontrado</h3><p>Tente buscar por nome, cliente ou plataforma</p></div>';
                return;
            }
            
            projetosFiltrados.forEach(p => {
                const contatosConcluidos = p.contatos.filter(c => c.timestamp && new Date(c.timestamp) <= new Date()).length;
                const contatosPendentes = p.contatos.length - contatosConcluidos;
                
                const div = document.createElement('div');
                div.className = 'project-card';
                div.onclick = () => irParaPlanilha(p.id);
                div.innerHTML = `
                    <div class="project-card-header">
                        <div>
                            <h3>${p.nome}</h3>
                            <p class="project-card-client">${p.cliente}</p>
                            <span class="tag">
                                <i class="fas ${p.plataforma === 'chatwoot' ? 'fa-comment' : 'fa-link'}"></i>
                                <span>${formatarPlataforma(p.plataforma)}</span>
                            </span>
                        </div>
                        <button class="delete-btn" onclick="event.stopPropagation(); excluirProjeto('${p.id}')" title="Excluir projeto">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="project-card-body">
                        <div class="project-stats">
                            <div class="project-stat">
                                <span class="stat-number">${p.contatos.length}</span>
                                <span class="stat-desc">Total</span>
                            </div>
                            <div class="project-stat">
                                <span class="stat-number">${contatosConcluidos}</span>
                                <span class="stat-desc">Concluídos</span>
                            </div>
                            <div class="project-stat">
                                <span class="stat-number">${contatosPendentes}</span>
                                <span class="stat-desc">Pendentes</span>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
        }
        
        function salvarProjeto(e) {
            e.preventDefault();
            const novo = {
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
            projetos.push(novo);
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
        
        function executarTestes() {
            const projIndex = projetos.findIndex(p => p.id === projetoAtualId);
            const projeto = projetos[projIndex];
            
            if (projeto.contatos.length === 0) {
                mostrarToast('Adicione contatos antes de executar os testes', 'warning');
                return;
            }
            
            // Simulação de execução de testes
            mostrarToast('Iniciando execução dos testes...', 'success');
            
            setTimeout(() => {
                mostrarToast('Testes executados com sucesso!', 'success');
                // Atualizar status dos contatos
                projetos[projIndex].contatos.forEach(contato => {
                    if (!contato.timestamp) {
                        contato.timestamp = new Date().getTime();
                    }
                });
                salvarDados();
                renderizarTabela(projetos[projIndex].contatos);
            }, 2000);
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