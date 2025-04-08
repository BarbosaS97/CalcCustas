// Verifica se estamos na página de índices
if (document.getElementById('ipca-table')) {
    // Objeto global para armazenar os índices
    let ipcaIndices = {};
    let tiposIndices = ['IPCA-E'];
    let indiceAtual = 'IPCA-E';
    let hasUnsavedChanges = false;

    // Função para carregar índices do Firestore
    function carregarIndices() {
        if (!db) {
            console.error('Firestore não está disponível');
            return;
        }

        db.collection("indices").doc("dados_indices").get()
            .then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    ipcaIndices = data.ipcaIndices || {};
                    tiposIndices = data.tiposIndices || ['IPCA-E'];
                    console.log("Índices carregados com sucesso");
                    atualizarSelectTipos();
                    carregarTabela();
                } else {
                    console.log("Nenhum dado encontrado, usando padrão");
                    ipcaIndices = {'IPCA-E': {}};
                    tiposIndices = ['IPCA-E'];
                    atualizarSelectTipos();
                    carregarTabela();
                }
            })
            .catch((error) => {
                console.error("Erro ao carregar índices:", error);
                ipcaIndices = {'IPCA-E': {}};
                tiposIndices = ['IPCA-E'];
                atualizarSelectTipos();
                carregarTabela();
            });
    }

    // Função para salvar índices no Firestore
    function salvarIndices() {
        if (!db) {
            console.error('Firestore não está disponível');
            return Promise.resolve(false);
        }

        return db.collection("indices").doc("dados_indices").set({
            ipcaIndices: ipcaIndices,
            tiposIndices: tiposIndices
        })
        .then(() => {
            console.log("Índices salvos com sucesso");
            hasUnsavedChanges = false;
            return true;
        })
        .catch((error) => {
            console.error("Erro ao salvar índices:", error);
            return false;
        });
    }

    // Atualizar select de tipos de índices
    function atualizarSelectTipos() {
        const tipoIndiceSelect = document.getElementById('tipo-indice');
        if (!tipoIndiceSelect) return;

        tipoIndiceSelect.innerHTML = '';
        tiposIndices.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo;
            option.textContent = tipo;
            tipoIndiceSelect.appendChild(option);
        });
        
        // Atualizar visibilidade do botão de excluir
        const deleteBtn = document.getElementById('delete-tipo');
        if (deleteBtn) deleteBtn.style.display = tiposIndices.length > 1 ? 'inline-block' : 'none';
    }

    // Adicionar novo tipo de índice
    function adicionarNovoTipo() {
        const novoTipoInput = document.getElementById('novo-tipo-indice');
        if (!novoTipoInput) return;

        const novoTipo = novoTipoInput.value.trim();
        if (!novoTipo) {
            alert('Digite um nome para o novo tipo de índice');
            return;
        }
        
        if (tiposIndices.includes(novoTipo)) {
            alert('Este tipo de índice já existe');
            return;
        }
        
        tiposIndices.push(novoTipo);
        ipcaIndices[novoTipo] = {};
        
        salvarIndices().then((salvou) => {
            if (salvou) {
                atualizarSelectTipos();
                const tipoIndiceSelect = document.getElementById('tipo-indice');
                if (tipoIndiceSelect) tipoIndiceSelect.value = novoTipo;
                indiceAtual = novoTipo;
                novoTipoInput.value = '';
                limparTabela();
                hasUnsavedChanges = true;
                alert(`Tipo de índice "${novoTipo}" adicionado com sucesso!`);
            } else {
                alert('Erro ao salvar o novo tipo de índice');
            }
        });
    }

    // Excluir tipo de índice atual
    function excluirTipoAtual() {
        if (tiposIndices.length <= 1) {
            alert('Não é possível excluir o único tipo de índice disponível');
            return;
        }
        
        showConfirmation(`Tem certeza que deseja excluir o tipo de índice "${indiceAtual}"? Esta ação não pode ser desfeita.`, function() {
            // Encontrar um novo índice para selecionar
            const novoIndice = tiposIndices.find(tipo => tipo !== indiceAtual);
            
            // Remover da lista e dos dados
            tiposIndices = tiposIndices.filter(tipo => tipo !== indiceAtual);
            delete ipcaIndices[indiceAtual];
            
            // Salvar e atualizar
            salvarIndices().then((salvou) => {
                if (salvou) {
                    indiceAtual = novoIndice;
                    const tipoIndiceSelect = document.getElementById('tipo-indice');
                    if (tipoIndiceSelect) tipoIndiceSelect.value = novoIndice;
                    atualizarSelectTipos();
                    carregarTabela();
                    hasUnsavedChanges = true;
                    alert(`Tipo de índice excluído com sucesso!`);
                } else {
                    alert('Erro ao excluir o tipo de índice');
                }
            });
        });
    }

    // Limpar tabela
    function limparTabela() {
        const tableBody = document.getElementById('table-body');
        if (tableBody) tableBody.innerHTML = '';
    }

    // Carregar tabela com dados do índice atual
    function carregarTabela() {
        limparTabela();
        const tableBody = document.getElementById('table-body');
        if (!tableBody) return;

        const indices = ipcaIndices[indiceAtual] || {};
        
        for (const year in indices) {
            adicionarLinhaAno(year, indices[year]);
        }
    }

    // Adicionar linha de ano na tabela
    function adicionarLinhaAno(year, monthsData) {
        const tableBody = document.getElementById('table-body');
        if (!tableBody) return;

        const row = document.createElement('tr');
        row.id = `year-${year}`;
        
        const yearCell = document.createElement('td');
        yearCell.textContent = year;
        yearCell.contentEditable = true; // Permite editar o ano
        yearCell.addEventListener('blur', function() {
            const novoAno = this.textContent.trim();
            if (!novoAno || isNaN(novoAno)) {
                this.textContent = year;
                alert('Digite um ano válido');
                return;
            }
            
            if (novoAno !== year) {
                if (ipcaIndices[indiceAtual][novoAno]) {
                    this.textContent = year;
                    alert('Este ano já existe na tabela');
                    return;
                }
                
                ipcaIndices[indiceAtual][novoAno] = ipcaIndices[indiceAtual][year];
                delete ipcaIndices[indiceAtual][year];
                row.id = `year-${novoAno}`;
                hasUnsavedChanges = true;
            }
        });
        row.appendChild(yearCell);
        
        for (let month = 1; month <= 12; month++) {
            const monthCell = document.createElement('td');
            monthCell.contentEditable = true;
            monthCell.textContent = (monthsData[month] || 0).toFixed(2).replace('.', ',');
            monthCell.addEventListener('blur', validateCell);
            row.appendChild(monthCell);
        }
        
        const actionCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Excluir';
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.addEventListener('click', () => {
            showConfirmation(`Tem certeza que deseja excluir o ano ${year}?`, function() {
                row.remove();
                delete ipcaIndices[indiceAtual][year];
                hasUnsavedChanges = true;
            });
        });
        actionCell.appendChild(deleteBtn);
        row.appendChild(actionCell);
        
        tableBody.appendChild(row);
    }

    // Adicionar novo ano
    function addNewYear() {
        const currentYear = new Date().getFullYear();
        let newYear = currentYear;
        
        // Encontrar o primeiro ano disponível (para trás)
        while (ipcaIndices[indiceAtual] && ipcaIndices[indiceAtual][newYear]) {
            newYear--;
        }
        
        // Verificar se o ano já existe
        if (ipcaIndices[indiceAtual] && ipcaIndices[indiceAtual][newYear]) {
            alert('O ano ' + newYear + ' já existe na tabela');
            return;
        }
        
        // Inicializar se não existir
        if (!ipcaIndices[indiceAtual]) {
            ipcaIndices[indiceAtual] = {};
        }
        
        // Criar estrutura para o novo ano
        ipcaIndices[indiceAtual][newYear] = {};
        for (let i = 1; i <= 12; i++) {
            ipcaIndices[indiceAtual][newYear][i] = 0;
        }
        
        adicionarLinhaAno(newYear, ipcaIndices[indiceAtual][newYear]);
        hasUnsavedChanges = true;
    }

    // Validar célula editada
    function validateCell(e) {
        const value = e.target.textContent.replace(',', '.');
        if (isNaN(value)) {
            e.target.textContent = '0,00';
            alert('Digite um valor numérico válido');
        } else {
            e.target.textContent = parseFloat(value).toFixed(2).replace('.', ',');
            hasUnsavedChanges = true;
            
            // Atualizar dados na memória
            const row = e.target.parentElement;
            const year = row.cells[0].textContent;
            const monthIndex = Array.from(row.cells).indexOf(e.target);
            const month = monthIndex; // A primeira célula é o ano
            
            if (!ipcaIndices[indiceAtual][year]) {
                ipcaIndices[indiceAtual][year] = {};
            }
            ipcaIndices[indiceAtual][year][month] = parseFloat(value);
        }
    }

    // Mostrar confirmação
    function showConfirmation(message, callback) {
        const confirmMessage = document.getElementById('confirm-message');
        const confirmModal = document.getElementById('confirm-modal');
        if (!confirmMessage || !confirmModal) return;

        confirmMessage.textContent = message;
        
        const confirmAction = document.getElementById('confirm-action');
        const confirmCancel = document.getElementById('confirm-cancel');
        
        if (confirmAction) {
            confirmAction.onclick = function() {
                callback();
                confirmModal.style.display = 'none';
            };
        }
        
        if (confirmCancel) {
            confirmCancel.onclick = function() {
                confirmModal.style.display = 'none';
            };
        }
        
        confirmModal.style.display = 'block';
    }

    // Importar dados do Excel
    function importData() {
        const excelData = prompt('Cole aqui os dados copiados do Excel (formato: Ano;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez)');
        if (!excelData) return;
        
        try {
            const lines = excelData.split('\n');
            const newData = {};
            
            // Pula o cabeçalho se existir
            const startLine = lines[0].startsWith('Ano') ? 1 : 0;
            
            for (let i = startLine; i < lines.length; i++) {
                const cells = lines[i].split(';');
                if (cells.length >= 13) {
                    const year = cells[0].trim();
                    newData[year] = {};
                    
                    for (let month = 1; month <= 12; month++) {
                        const value = parseFloat(cells[month].replace(',', '.'));
                        newData[year][month] = isNaN(value) ? 0 : value;
                    }
                }
            }
            
            // Atualiza a tabela com os novos dados
            ipcaIndices[indiceAtual] = newData;
            limparTabela();
            carregarTabela();
            hasUnsavedChanges = true;
            alert('Dados importados com sucesso!');
        } catch (e) {
            alert('Erro ao importar dados. Verifique o formato e tente novamente.');
            console.error(e);
        }
    }

    // Exportar dados para Excel
    function exportData() {
        let csvContent = "Ano;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez\n";
        
        const tableBody = document.getElementById('table-body');
        if (!tableBody) return;

        tableBody.querySelectorAll('tr').forEach(row => {
            const rowData = [row.cells[0].textContent];
            for (let i = 1; i <= 12; i++) {
                rowData.push(row.cells[i].textContent);
            }
            csvContent += rowData.join(';') + "\n";
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `indices_${indiceAtual}.csv`;
        link.click();
    }

    // Event Listeners
    document.addEventListener('DOMContentLoaded', function() {
        // Verifica se os elementos existem antes de adicionar listeners
        const tipoIndiceSelect = document.getElementById('tipo-indice');
        if (!tipoIndiceSelect) return;

        // Carrega os índices ao iniciar
        carregarIndices();
        
        // Configura os event listeners
        const addYearBtn = document.getElementById('add-year');
        if (addYearBtn) addYearBtn.addEventListener('click', addNewYear);
        
        const saveDataBtn = document.getElementById('save-data');
        if (saveDataBtn) saveDataBtn.addEventListener('click', function() {
            salvarIndices().then((salvou) => {
                if (salvou) {
                    hasUnsavedChanges = false;
                    alert('Dados salvos com sucesso!');
                } else {
                    alert('Erro ao salvar os dados. Tente novamente.');
                }
            });
        });
        
        const importDataBtn = document.getElementById('import-data');
        if (importDataBtn) importDataBtn.addEventListener('click', importData);
        
        const exportDataBtn = document.getElementById('export-data');
        if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);
        
        const addTipoIndiceBtn = document.getElementById('add-tipo-indice');
        if (addTipoIndiceBtn) addTipoIndiceBtn.addEventListener('click', adicionarNovoTipo);
        
        const deleteTipoBtn = document.getElementById('delete-tipo');
        if (deleteTipoBtn) deleteTipoBtn.addEventListener('click', excluirTipoAtual);
        
        if (tipoIndiceSelect) tipoIndiceSelect.addEventListener('change', function() {
            indiceAtual = this.value;
            carregarTabela();
        });
        
        const backBtn = document.getElementById('back-btn');
        if (backBtn) backBtn.addEventListener('click', function() {
            if (hasUnsavedChanges) {
                showConfirmation('Você tem alterações não salvas. Deseja realmente sair?', function() {
                    window.location.href = 'index.html';
                });
            } else {
                window.location.href = 'index.html';
            }
        });

        // Verificar se há alterações não salvas ao sair da página
        window.addEventListener('beforeunload', function(e) {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
            }
        });
    });
}