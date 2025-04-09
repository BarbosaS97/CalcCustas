// Valores em reais conforme a tabela (UFIR convertida)
const valores = {
    'civil-geral': {
        percentual: 0.01,
        min: 10.64,
        max: 1915.38,
        min_50: 5.32,
        max_50: 957.69,
        descricao: 'Ação Civil Geral (1% do valor da causa, mínimo R$ 10,64, máximo R$ 1.915,38)'
    },
    'cautelar': {
        percentual: 0.0025, // 0.25%
        min: 2.66,
        max: 478.84,
        descricao: 'Processo Cautelar/Jurisdição Voluntária (0,25% do valor da causa, mínimo R$ 2,66, máximo R$ 478,84)'
    },
    'inestimavel': {
        fixo: 5.32,
        fixo_50: 5.32,
        descricao: 'Causa de Valor Inestimável - Valor fixo R$ 5,32'
    },
    'agravo': {
        fixo: 138.95,
        descricao: 'Agravo de Instrumento - Valor fixo R$ 138,95'
    },
    'penal-geral': {
        fixo: 297.95,
        descricao: 'Ação Penal Geral (pelo vencido) - Valor fixo R$ 297,95'
    },
    'penal-privada': {
        fixo: 106.41,
        descricao: 'Ação Penal Privada - Valor fixo R$ 106,41'
    },
    'notificacoes': {
        fixo: 53.20,
        descricao: 'Notificações/Interpelações/Procedimentos Cautelares - Valor fixo R$ 53,20'
    },
    'certidoes': {
        fixo: 21.73,
        descricao: 'Certidões diversas (inteiro teor, objeto e pé) - Valor fixo R$ 21,73'
    },
    'recurso-juizado': {
        percentual: 0.01, // 1%
        min: 10.64,
        max: 1915.38,
        descricao: 'Recurso no Juizado Especial Federal ou Execução Fiscal (1% do valor da causa, mínimo R$ 10,64, máximo R$ 1.915,38)'
    }
};

// Códigos de recolhimento
const codigosRecolhimento = {
    'primeiro-grau': '18740-2: STN Custas Judiciais',
    'segundo-grau': '18750-0: STN Custas Judiciais - 2ª Instância'
};

// Mapeamento completo de UGs
const unidadesGestoras = {
    '090024': 'Seção Judiciária do Acre',
    '090037': 'Seção Judiciária do Amapá',
    '090002': 'Seção Judiciária do Amazonas',
    '090012': 'Seção Judiciária da Bahia',
    '090023': 'Seção Judiciária do Distrito Federal',
    '090022': 'Seção Judiciária de Goiás',
    '090004': 'Seção Judiciária do Maranhão',
    '090021': 'Seção Judiciária do Mato Grosso',
    '090003': 'Seção Judiciária do Pará',
    '090005': 'Seção Judiciária do Piauí',
    '090025': 'Seção Judiciária de Rondônia',
    '090039': 'Seção Judiciária de Roraima',
    '090038': 'Seção Judiciária do Tocantins',
    '090027': 'TRF da 1ª Região'
};

// Funções auxiliares
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor).replace('R$', '').trim();
}

function parseMoeda(valor) {
    if (!valor) return 0;
    return parseFloat(valor.replace(/\./g, '').replace(',', '.'));
}

function validarDataMMAAAA(dataStr) {
    if (!/^\d{2}\/\d{4}$/.test(dataStr)) {
        return { valido: false, mensagem: 'Formato de data inválido. Use mm/aaaa' };
    }

    const [mesStr, anoStr] = dataStr.split('/');
    const mes = parseInt(mesStr);
    const ano = parseInt(anoStr);
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;

    if (mes < 1 || mes > 12 || ano < 1900 || ano > anoAtual) {
        return { 
            valido: false, 
            mensagem: `Data inválida. Use mm/aaaa entre 01/1900 e 12/${anoAtual}`
        };
    }

    if (ano > anoAtual || (ano === anoAtual && mes > mesAtual)) {
        return { 
            valido: false, 
            mensagem: 'A data deve ser anterior ou igual ao mês atual'
        };
    }

    return { valido: true, mes, ano };
}

function criarLink(texto, url) {
    const link = document.createElement('a');
    link.href = url;
    link.textContent = texto;
    link.target = '_blank';
    link.style.color = 'var(--secondary-color)';
    link.style.textDecoration = 'none';
    link.style.fontWeight = '500';
    link.style.margin = '0 5px';
    return link;
}

// Função para calcular o coeficiente de atualização monetária
function calcularCoeficiente(anoInicial, mesInicial, anoFinal, mesFinal) {
    return new Promise((resolve, reject) => {
        if (!db) {
            console.error('Firestore não está disponível');
            resolve(null);
            return;
        }

        db.collection("indices").doc("dados_indices").get()
            .then((doc) => {
                if (!doc.exists) {
                    console.error('Dados de índices não encontrados no Firebase');
                    resolve(null);
                    return;
                }
                
                const data = doc.data();
                const ipcaIndices = data.ipcaIndices || {};
                const indicesAtual = ipcaIndices['IPCA-E'] || {};
                let coeficiente = 1;
                
                for (let ano = anoInicial; ano <= anoFinal; ano++) {
                    const mesStart = (ano === anoInicial) ? mesInicial : 1;
                    const mesEnd = (ano === anoFinal) ? mesFinal : 12;
                    
                    if (!indicesAtual[ano]) {
                        console.error(`Dados IPCA-E não encontrados para o ano ${ano}`);
                        resolve(null);
                        return;
                    }
                    
                    for (let mes = mesStart; mes <= mesEnd; mes++) {
                        if (indicesAtual[ano][mes] === undefined) {
                            console.error(`Dados IPCA-E não encontrados para ${mes}/${ano}`);
                            resolve(null);
                            return;
                        }
                        
                        coeficiente *= (1 + indicesAtual[ano][mes] / 100);
                    }
                }
                
                resolve(coeficiente);
            })
            .catch((error) => {
                console.error("Erro ao calcular coeficiente:", error);
                resolve(null);
            });
    });
}

// Função para exportar índices para Excel
function exportarIndices() {
    if (!db) {
        console.error('Firestore não está disponível');
        return;
    }

    // Mostrar loading
    const btnExport = document.getElementById('export-indices');
    if (btnExport) {
        btnExport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';
        btnExport.disabled = true;
    }

    db.collection("indices").doc("dados_indices").get()
        .then((doc) => {
            if (!doc.exists) {
                alert('Nenhum dado de índices encontrado para exportar!');
                return;
            }

            const data = doc.data();
            const ipcaIndices = data.ipcaIndices || {};
            const indicesAtual = ipcaIndices['IPCA-E'] || {};

            if (Object.keys(indicesAtual).length === 0) {
                alert('Não há dados de IPCA-E para exportar!');
                return;
            }

            // Cria o cabeçalho do CSV
            let csvContent = "Ano;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez\n";
            
            // Ordena os anos em ordem decrescente
            const anos = Object.keys(indicesAtual).sort((a, b) => b - a);
            
            // Adiciona os dados de cada ano
            anos.forEach(ano => {
                const meses = indicesAtual[ano];
                const linha = [
                    ano,
                    meses[1] ? meses[1].toFixed(2).replace('.', ',') : '0,00',
                    meses[2] ? meses[2].toFixed(2).replace('.', ',') : '0,00',
                    meses[3] ? meses[3].toFixed(2).replace('.', ',') : '0,00',
                    meses[4] ? meses[4].toFixed(2).replace('.', ',') : '0,00',
                    meses[5] ? meses[5].toFixed(2).replace('.', ',') : '0,00',
                    meses[6] ? meses[6].toFixed(2).replace('.', ',') : '0,00',
                    meses[7] ? meses[7].toFixed(2).replace('.', ',') : '0,00',
                    meses[8] ? meses[8].toFixed(2).replace('.', ',') : '0,00',
                    meses[9] ? meses[9].toFixed(2).replace('.', ',') : '0,00',
                    meses[10] ? meses[10].toFixed(2).replace('.', ',') : '0,00',
                    meses[11] ? meses[11].toFixed(2).replace('.', ',') : '0,00',
                    meses[12] ? meses[12].toFixed(2).replace('.', ',') : '0,00'
                ].join(';');
                
                csvContent += linha + '\n';
            });

            // Cria o arquivo e inicia o download
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.href = url;
            link.download = `indices_ipca_${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(link);
            link.click();
            
            // Limpa o objeto URL após o download
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
        })
        .catch((error) => {
            console.error("Erro ao exportar índices:", error);
            alert('Erro ao exportar os índices. Tente novamente.');
        })
        .finally(() => {
            if (btnExport) {
                btnExport.innerHTML = '<i class="fas fa-file-excel"></i> Exportar';
                btnExport.disabled = false;
            }
        });
}

// Função para obter índices mensais
async function obterIndicesMensais(anoInicial, mesInicial, anoFinal, mesFinal) {
    if (!db) {
        console.error('Firestore não está disponível');
        return null;
    }

    try {
        const doc = await db.collection("indices").doc("dados_indices").get();
        if (!doc.exists) {
            console.error('Dados de índices não encontrados no Firebase');
            return null;
        }
        
        const data = doc.data();
        const ipcaIndices = data.ipcaIndices || {};
        const indicesAtual = ipcaIndices['IPCA-E'] || {};
        const resultado = [];
        let coeficienteAcumulado = 1;
        
        for (let ano = anoInicial; ano <= anoFinal; ano++) {
            const mesStart = (ano === anoInicial) ? mesInicial : 1;
            const mesEnd = (ano === anoFinal) ? mesFinal : 12;
            
            if (!indicesAtual[ano]) {
                console.error(`Dados IPCA-E não encontrados para o ano ${ano}`);
                return null;
            }
            
            for (let mes = mesStart; mes <= mesEnd; mes++) {
                if (indicesAtual[ano][mes] === undefined) {
                    console.error(`Dados IPCA-E não encontrados para ${mes}/${ano}`);
                    return null;
                }
                
                const indice = indicesAtual[ano][mes];
                coeficienteAcumulado *= (1 + indice / 100);
                
                resultado.push({
                    ano,
                    mes,
                    indice,
                    coeficienteAcumulado
                });
            }
        }
        
        return resultado;
    } catch (error) {
        console.error("Erro ao obter índices mensais:", error);
        return null;
    }
}

// Função para gerar PDF com os resultados
async function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configurações do documento
    doc.setFont('helvetica');
    doc.setFontSize(12);
    
    // Solicitar informações adicionais
    const parteExequente = prompt('Nome da parte exequente (opcional):');
    const parteExecutada = prompt('Nome da parte executada (opcional):');
    const numeroProcesso = prompt('Número do processo (opcional):');
    
    // Título
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Relatório de Cálculo de Custas Processuais', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: 'center' });
    
    // Adicionar informações adicionais se fornecidas
    let yPosition = 36;
    if (parteExequente || parteExecutada || numeroProcesso) {
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text('Informações Adicionais', 20, yPosition);
        yPosition += 8;
        
        const infoAdicional = [];
        if (parteExequente) infoAdicional.push(['Parte Exequente', parteExequente]);
        if (parteExecutada) infoAdicional.push(['Parte Executada', parteExecutada]);
        if (numeroProcesso) infoAdicional.push(['Número do Processo', numeroProcesso]);
        
        doc.autoTable({
            startY: yPosition,
            head: [['Item', 'Valor']],
            body: infoAdicional,
            theme: 'grid',
            headStyles: {
                fillColor: [44, 62, 80],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: {
                cellPadding: 4,
                fontSize: 10,
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 60, fontStyle: 'bold' },
                1: { cellWidth: 'auto' }
            }
        });
        
        yPosition = doc.lastAutoTable.finalY + 10;
    }
    
    // Linha divisória
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;
    
    // Dados do cálculo
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Dados do Cálculo', 20, yPosition);
    yPosition += 8;
    
    // Tabela de resultados
    const resultadoData = [
        ['Tipo de Custa', document.getElementById('tipo-custa').textContent],
        ['Valor Base', document.getElementById('valor-base').textContent],
        ['Fase do Processo', document.getElementById('fase-resultado').textContent || 'N/A'],
        ['Instância', document.getElementById('instancia-resultado').textContent],
        ['Unidade Gestora', document.getElementById('ug-resultado').textContent],
        ['Código de Recolhimento', document.getElementById('codigo-recolhimento').textContent],
        ['Valor Total', document.getElementById('valor-total').textContent]
    ];
    
    doc.autoTable({
        startY: yPosition,
        head: [['Item', 'Valor']],
        body: resultadoData,
        theme: 'grid',
        headStyles: {
            fillColor: [44, 62, 80],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: {
            cellPadding: 4,
            fontSize: 10,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' },
            1: { cellWidth: 'auto' }
        }
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
    
    // Adicionar detalhes da atualização monetária se existir
    const valorAtualizado = document.getElementById('valor-atualizado').value;
    if (valorAtualizado) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text('Detalhes da Atualização Monetária', 20, 20);
        
        const atualizacaoData = [
            ['Valor Original', document.getElementById('valor-original').value],
            ['Valor Atualizado', valorAtualizado],
            ['Coeficiente de Correção', document.getElementById('indice-acumulado').value],
            ['Período de Atualização', document.getElementById('periodo-atualizacao').value]
        ];
        
        doc.autoTable({
            startY: 28,
            head: [['Item', 'Valor']],
            body: atualizacaoData,
            theme: 'grid',
            headStyles: {
                fillColor: [44, 62, 80],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: {
                cellPadding: 4,
                fontSize: 10,
                valign: 'middle'
            }
        });
        
        yPosition = doc.lastAutoTable.finalY + 10;
        
        // Adicionar tabela com evolução mensal se existir
        const dataAjuizamento = document.getElementById('data-ajuizamento').value;
        if (dataAjuizamento) {
            doc.addPage();
            doc.setFontSize(12);
            doc.text('Evolução da Correção Monetária', 20, 20);
            
            const validacaoData = validarDataMMAAAA(dataAjuizamento);
            if (validacaoData.valido) {
                const { mes, ano } = validacaoData;
                const hoje = new Date();
                const anoAtual = hoje.getFullYear();
                const mesAtual = hoje.getMonth() + 1;
                const valorOriginal = parseMoeda(document.getElementById('valor-original').value);
                
                const indices = await obterIndicesMensais(ano, mes, anoAtual, mesAtual);
                if (indices) {
                    const evolucaoData = indices.map((item, index) => {
                        const valorAcumulado = valorOriginal * item.coeficienteAcumulado;
                        return [
                            `${item.mes.toString().padStart(2, '0')}/${item.ano}`,
                            `${item.indice.toFixed(2)}%`,
                            `${item.coeficienteAcumulado.toFixed(6)}`,
                            formatarMoeda(valorAcumulado)
                        ];
                    });
                    
                    doc.autoTable({
                        startY: 28,
                        head: [['Mês', 'Índice Mensal', 'Coeficiente Acumulado', 'Valor Atualizado']],
                        body: evolucaoData,
                        theme: 'grid',
                        headStyles: {
                            fillColor: [44, 62, 80],
                            textColor: [255, 255, 255],
                            fontStyle: 'bold'
                        },
                        styles: {
                            cellPadding: 4,
                            fontSize: 9,
                            valign: 'middle'
                        }
                    });
                }
            }
        }
    }
    
    // Salvar o PDF
    const nomeArquivo = `custas_processuais_${numeroProcesso ? numeroProcesso.replace(/\D/g, '') : new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(nomeArquivo);
}

// Configuração inicial quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const form = document.getElementById('form-custas');
    if (!form) return;

    const tipoProcessoSelect = document.getElementById('tipo-processo');
    const valorCausaInput = document.getElementById('valor-causa');
    const valorCausaGroup = document.getElementById('valor-causa-group');
    const dataAjuizamentoInput = document.getElementById('data-ajuizamento');
    const dataAjuizamentoGroup = document.getElementById('data-ajuizamento-group');
    const faseProcessoSelect = document.getElementById('fase-processo');
    const faseProcessoGroup = document.getElementById('fase-processo-group');
    const instanciaSelect = document.getElementById('instancia');
    const unidadeGestoraSelect = document.getElementById('unidade-gestora');
    const resultadoDiv = document.getElementById('resultado');
    const dataCalculoSpan = document.getElementById('data-calculo');
    const atualizacaoDiv = document.getElementById('atualizacao-monetaria');
    const valorOriginalInput = document.getElementById('valor-original');
    const valorAtualizadoInput = document.getElementById('valor-atualizado');
    const indiceAcumuladoInput = document.getElementById('indice-acumulado');
    const periodoAtualizacaoInput = document.getElementById('periodo-atualizacao');
    const limparBtn = document.getElementById('limpar-btn');
    const ajudaBtn = document.getElementById('ajuda-btn');
    const btnInfo = document.getElementById('info-atualizacao');
    const btnExport = document.getElementById('export-indices');
    const modal = document.getElementById('info-modal');
    const spanClose = document.querySelector('#info-modal .close');
    const faseResultadoContainer = document.getElementById('fase-resultado-container');
    const dobroResultado = document.getElementById('dobro-resultado');
    const downloadPdfBtn = document.getElementById('download-pdf');

    // Elementos para custas complementares
    const custasComplementaresGroup = document.getElementById('custas-complementares-group');
    const complementarOption = document.getElementById('complementar-option');
    const custasComplementaresFields = document.getElementById('custas-complementares-fields');
    const valorComplementarInput = document.getElementById('valor-complementar');
    const dataComplementarInput = document.getElementById('data-complementar');
    const descricaoComplementarInput = document.getElementById('descricao-complementar');
    const infoComplementarBtn = document.getElementById('info-complementar');
    const infoComplementarModal = document.getElementById('info-complementar-modal');
    const spanCloseComplementar = document.querySelector('#info-complementar-modal .close');
    const complementarResultado = document.getElementById('complementar-resultado');
    const valorComplementarResultado = document.getElementById('valor-complementar-resultado');

    // Elementos para custas em dobro
    const custasDobroSelect = document.getElementById('custas-dobro');
    const custasDobroGroup = document.getElementById('custas-dobro-group');
    const infoDobroBtn = document.getElementById('info-dobro');
    const infoDobroModal = document.getElementById('info-dobro-modal');
    const spanCloseDobro = document.querySelector('#info-dobro-modal .close');

    // Máscaras para os campos
    if (valorCausaInput) {
        valorCausaInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = (value / 100).toFixed(2) + '';
            value = value.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
            e.target.value = value;
        });
    }

    if (dataAjuizamentoInput) {
        dataAjuizamentoInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 6);
            }
            e.target.value = value;
        });
    }

    if (valorComplementarInput) {
        valorComplementarInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = (value / 100).toFixed(2) + '';
            value = value.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
            e.target.value = value;
        });
    }

    if (dataComplementarInput) {
        dataComplementarInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 6);
            }
            e.target.value = value;
        });
    }

    // Atualizar campos visíveis conforme seleções
    function atualizarCamposVisiveis() {
    const tipoProcesso = tipoProcessoSelect.value;
    const showValorCausa = ['civil-geral', 'cautelar', 'recurso-juizado'].includes(tipoProcesso);
    if (valorCausaGroup) valorCausaGroup.style.display = showValorCausa ? 'block' : 'none';
    
    // Mostrar data de ajuizamento apenas para ação civil geral na fase recursal
    const showDataAjuizamento = tipoProcesso === 'civil-geral' && faseProcessoSelect && faseProcessoSelect.value === 'recursal';
    if (dataAjuizamentoGroup) {
        dataAjuizamentoGroup.style.display = showDataAjuizamento ? 'block' : 'none';
        if (!showDataAjuizamento && dataAjuizamentoInput) {
            dataAjuizamentoInput.value = '';
        }
    }
    
    const showComplementar = ['civil-geral', 'cautelar', 'inestimavel', 'agravo', 'certidoes'].includes(tipoProcesso);
    if (custasComplementaresGroup) custasComplementaresGroup.style.display = showComplementar ? 'block' : 'none';
    
    const showFaseProcesso = !['penal-geral', 'penal-privada', 'notificacoes', 'agravo', 'certidoes'].includes(tipoProcesso);
    if (faseProcessoGroup) faseProcessoGroup.style.display = showFaseProcesso ? 'block' : 'none';
    
    const showCustasDobro = !['penal-geral', 'penal-privada', 'notificacoes', 'certidoes'].includes(tipoProcesso);
    if (custasDobroGroup) custasDobroGroup.style.display = showCustasDobro ? 'block' : 'none';
    
    if (atualizacaoDiv) atualizacaoDiv.style.display = 'none';
    if (resultadoDiv) resultadoDiv.style.display = 'none';
}

    // Modal de informações
    if (btnInfo && modal && spanClose) {
        btnInfo.onclick = function() {
            modal.style.display = 'block';
        };

        spanClose.onclick = function() {
            modal.style.display = 'none';
        };
    }

    // Configurar o botão de exportação
    if (btnExport) {
        btnExport.addEventListener('click', exportarIndices);
    }

    // Configurar o botão de download PDF
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', gerarPDF);
    }

    // Modal de informações sobre custas complementares
    if (infoComplementarBtn && infoComplementarModal && spanCloseComplementar) {
        infoComplementarBtn.onclick = function() {
            infoComplementarModal.style.display = 'block';
        };

        spanCloseComplementar.onclick = function() {
            infoComplementarModal.style.display = 'none';
        };
    }

    // Modal de informações sobre custas em dobro
    if (infoDobroBtn && infoDobroModal && spanCloseDobro) {
        infoDobroBtn.onclick = function() {
            infoDobroModal.style.display = 'block';
        };

        spanCloseDobro.onclick = function() {
            infoDobroModal.style.display = 'none';
        };
    }

    window.onclick = function(event) {
        if (modal && event.target == modal) {
            modal.style.display = 'none';
        }
        if (infoComplementarModal && event.target == infoComplementarModal) {
            infoComplementarModal.style.display = 'none';
        }
        if (infoDobroModal && event.target == infoDobroModal) {
            infoDobroModal.style.display = 'none';
        }
    };

    // Calcular atualização monetária
    async function calcularAtualizacaoMonetaria(valorOriginal, dataStr) {
        if (isNaN(valorOriginal)) {
            return { erro: 'Informe um valor válido para a causa' };
        }

        const validacaoData = validarDataMMAAAA(dataStr);
        if (!validacaoData.valido) {
            return { erro: validacaoData.mensagem };
        }

        const { mes, ano } = validacaoData;
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;

        const coeficiente = await calcularCoeficiente(ano, mes, anoAtual, mesAtual);
        if (coeficiente === null) {
            return { erro: 'Índices IPCA-E não disponíveis para o período informado' };
        }

        const valorAtualizado = valorOriginal * coeficiente;

        return {
            valorOriginal: valorOriginal,
            valorAtualizado: valorAtualizado,
            coeficiente: coeficiente,
            periodo: `${mes.toString().padStart(2, '0')}/${ano} a ${mesAtual.toString().padStart(2, '0')}/${anoAtual}`
        };
    }

    // Calcular custas quando o formulário for submetido
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const tipoProcesso = tipoProcessoSelect.value;
        const faseProcesso = faseProcessoSelect ? faseProcessoSelect.value : null;
        const instancia = instanciaSelect.value;
        const ugCodigo = unidadeGestoraSelect.value;
        
        // Validações básicas
        if (!tipoProcesso || !ugCodigo) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Validar valor da causa quando necessário
        let valorUsado = 0;
        if (['civil-geral', 'cautelar'].includes(tipoProcesso)) {
            valorUsado = parseMoeda(valorCausaInput.value);
            if (isNaN(valorUsado) || valorUsado <= 0) {
                alert('Informe um valor válido para a causa');
                return;
            }
        }

        // Validar data de ajuizamento para apelações
        let resultadoAtualizacao = null;
        if (tipoProcesso === 'civil-geral' && faseProcesso === 'recursal') {
            if (!dataAjuizamentoInput.value) {
                alert('Informe a data de ajuizamento para cálculo de apelação');
                return;
            }

            resultadoAtualizacao = await calcularAtualizacaoMonetaria(valorUsado, dataAjuizamentoInput.value);
            if (resultadoAtualizacao.erro) {
                alert(resultadoAtualizacao.erro);
                return;
            }

            if (valorOriginalInput) valorOriginalInput.value = formatarMoeda(resultadoAtualizacao.valorOriginal);
            if (valorAtualizadoInput) valorAtualizadoInput.value = formatarMoeda(resultadoAtualizacao.valorAtualizado);
            if (indiceAcumuladoInput) indiceAcumuladoInput.value = resultadoAtualizacao.coeficiente.toFixed(6);
            if (periodoAtualizacaoInput) periodoAtualizacaoInput.value = resultadoAtualizacao.periodo;
            if (atualizacaoDiv) atualizacaoDiv.style.display = 'block';
            
            valorUsado = resultadoAtualizacao.valorAtualizado;
        }

        // Calcular valor base
        let valorBase = 0;
        let valorTotal = 0;
        let descricaoTipo = valores[tipoProcesso].descricao;

        if (tipoProcesso === 'civil-geral') {
            valorBase = valorUsado * valores[tipoProcesso].percentual;
            valorBase = Math.max(valores[tipoProcesso].min, Math.min(valores[tipoProcesso].max, valorBase));
            
            if (faseProcesso === 'inicial' || faseProcesso === 'recursal') {
                valorTotal = valorBase * 0.5;
                valorTotal = Math.max(valores[tipoProcesso].min_50, Math.min(valores[tipoProcesso].max_50, valorTotal));
                descricaoTipo = 'Ação Civil Geral (0,5% do valor da causa, mínimo R$ 5,32, máximo R$ 957,69)';
            } else {
                valorTotal = valorBase;
            }
        } 
else if (tipoProcesso === 'cautelar') {
    valorBase = valorUsado * 0.0025; // 0.25% do valor da causa
    valorTotal = Math.max(valores[tipoProcesso].min, Math.min(valores[tipoProcesso].max, valorBase));
    
    // Apenas para fase recursal (apelação) aplicamos 50%
    if (faseProcesso === 'recursal') {
        valorTotal = valorTotal * 0.5;
        descricaoTipo = 'Processo Cautelar/Jurisdição Voluntária (0,125% do valor da causa, mínimo R$ 1,33, máximo R$ 239,42)';
    } else {
        descricaoTipo = valores[tipoProcesso].descricao;
    }
} 
// INSIRA AQUI O NOVO BLOCO PARA RECURSO NO JUIZADO
else if (tipoProcesso === 'recurso-juizado') {
    // Garantir que o valor da causa está sendo capturado corretamente
    valorUsado = parseMoeda(valorCausaInput.value);
    
    if (isNaN(valorUsado) || valorUsado <= 0) {
        alert('Informe um valor válido para a causa');
        return;
    }

    valorBase = valorUsado * valores[tipoProcesso].percentual;
    valorTotal = Math.max(valores[tipoProcesso].min, Math.min(valores[tipoProcesso].max, valorBase));
    descricaoTipo = valores[tipoProcesso].descricao;
    
    // Mostra o valor base calculado antes de aplicar mínimo/máximo
    if (document.getElementById('valor-base')) {
        document.getElementById('valor-base').textContent = 
            `R$ ${valorBase.toFixed(2).replace('.', ',')} (1% de R$ ${valorUsado.toFixed(2).replace('.', ',')})`;
    }
    
    // Não aplica redução para fase recursal
    if (faseProcesso === 'recursal') {
        descricaoTipo += ' (Valor integral para recurso)';
    }
}
// E continua com o código existente
else if (valores[tipoProcesso].fixo !== undefined) {
    valorBase = valores[tipoProcesso].fixo;
    valorTotal = valores[tipoProcesso].fixo;
}

        // Processar custas complementares se selecionado
        let valorComplementarAtualizado = 0;
        let descricaoComplementar = '';
        
        if (complementarOption && complementarOption.value === 'sim' && ['civil-geral', 'cautelar', 'inestimavel', 'agravo'].includes(tipoProcesso)) {
            const valorComplementar = parseMoeda(valorComplementarInput.value);
            const dataComplementar = dataComplementarInput.value;
            descricaoComplementar = descricaoComplementarInput.value || 'Custas complementares';

            if (isNaN(valorComplementar) || valorComplementar <= 0) {
                alert('Informe um valor válido para as custas complementares');
                return;
            }

            if (!dataComplementar) {
                alert('Informe a data de pagamento das custas complementares');
                return;
            }

            const resultadoComplementar = await calcularAtualizacaoMonetaria(valorComplementar, dataComplementar);
            if (resultadoComplementar.erro) {
                alert(resultadoComplementar.erro);
                return;
            }

            valorComplementarAtualizado = resultadoComplementar.valorAtualizado;
            valorTotal = Math.max(0, valorTotal - valorComplementarAtualizado);

            // Mostrar informações das custas complementares no resultado
            if (complementarResultado) complementarResultado.style.display = 'flex';
            if (valorComplementarResultado) valorComplementarResultado.textContent = `${descricaoComplementar}: R$ ${valorComplementarAtualizado.toFixed(2).replace('.', ',')} (valor atualizado)`;
        } else {
            if (complementarResultado) complementarResultado.style.display = 'none';
        }

        // Aplicar custas em dobro se selecionado (exceto para processos criminais)
        if (custasDobroSelect && custasDobroSelect.value === 'sim' && !['penal-geral', 'penal-privada', 'notificacoes'].includes(tipoProcesso)) {
            valorTotal *= 2;
            if (dobroResultado) dobroResultado.style.display = 'flex';
            descricaoTipo += ' (Custas em dobro - §4º art. 1.007 CPC)';
        } else {
            if (dobroResultado) dobroResultado.style.display = 'none';
        }

        // Descrição da fase (apenas para tipos que mostram a fase)
        let descricaoFase = '';
        if (['civil-geral', 'cautelar', 'inestimavel'].includes(tipoProcesso)) {
            descricaoFase = faseProcesso === 'inicial' ? 
                'Inicial (50% da tabela)' : 
                (faseProcesso === 'recursal' ? 'Apelação (50% da tabela)' : 'Final (100% da tabela)');
            if (faseResultadoContainer) faseResultadoContainer.style.display = 'flex';
        } else {
            if (faseResultadoContainer) faseResultadoContainer.style.display = 'none';
        }

        // Descrição da instância
        const descricaoInstancia = instancia === 'primeiro-grau' ? 
            '1ª Instância (Justiça Federal de Primeiro Grau)' : 
            '2ª Instância (Justiça Federal de Segundo Grau)';

        // Obter UG selecionada
        const ugDescricao = unidadesGestoras[ugCodigo] || 'Não especificada';
        const ugCompleta = `${ugCodigo} - ${ugDescricao}`;

        // Atualizar resultados na tela
        if (document.getElementById('tipo-custa')) document.getElementById('tipo-custa').textContent = descricaoTipo;
        if (document.getElementById('valor-base')) document.getElementById('valor-base').textContent = `R$ ${valorBase.toFixed(2).replace('.', ',')}`;
        if (document.getElementById('fase-resultado')) document.getElementById('fase-resultado').textContent = descricaoFase;
        if (document.getElementById('instancia-resultado')) document.getElementById('instancia-resultado').textContent = descricaoInstancia;
        if (document.getElementById('ug-resultado')) document.getElementById('ug-resultado').textContent = ugCompleta;
        if (document.getElementById('codigo-recolhimento')) document.getElementById('codigo-recolhimento').textContent = codigosRecolhimento[instancia];
        if (document.getElementById('valor-total')) document.getElementById('valor-total').textContent = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;

        // Atualizar data do cálculo
        if (dataCalculoSpan) dataCalculoSpan.textContent = `Calculado em: ${new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;

        // Mostrar resultados
        if (resultadoDiv) resultadoDiv.style.display = 'block';

        // Adicionar aviso e links (apenas se não existir)
        if (resultadoDiv && !document.getElementById('aviso-links')) {
            const avisoDiv = document.createElement('div');
            avisoDiv.id = 'aviso-links';
            avisoDiv.style.marginTop = '20px';
            avisoDiv.style.padding = '15px';
            avisoDiv.style.backgroundColor = '#fff8e1';
            avisoDiv.style.borderLeft = '4px solid #ffc107';
            avisoDiv.style.borderRadius = '4px';

            const avisoTexto = document.createElement('p');
            avisoTexto.textContent = 'Este sistema é somente para fins de cálculo, não gera a GRU automaticamente. ';
            avisoTexto.style.marginBottom = '10px';

            const linkGru = criarLink('Emitir GRU no PagTesouro', 'https://pagtesouro.tesouro.gov.br/portal-gru/#/emissao-gru');
            const linkManual = criarLink('Manual de Orientação (2022)', 'https://sicom.cjf.jus.br/arquivos/pdf/manual_de_calculos_revisado_ultima_versao_com_resolucao_e_apresentacao.pdf');

            const linksDiv = document.createElement('div');
            linksDiv.style.marginTop = '10px';
            linksDiv.appendChild(document.createTextNode('Acesse: '));
            linksDiv.appendChild(linkGru);
            linksDiv.appendChild(document.createTextNode(' | '));
            linksDiv.appendChild(linkManual);

            avisoDiv.appendChild(avisoTexto);
            avisoDiv.appendChild(linksDiv);

            resultadoDiv.appendChild(avisoDiv);
        }

        if (resultadoDiv) resultadoDiv.scrollIntoView({ behavior: 'smooth' });
    });

    // Limpar formulário
    if (limparBtn) {
        limparBtn.addEventListener('click', function() {
            form.reset();
            if (resultadoDiv) resultadoDiv.style.display = 'none';
            if (atualizacaoDiv) atualizacaoDiv.style.display = 'none';
            if (custasComplementaresFields) custasComplementaresFields.style.display = 'none';
            if (complementarResultado) complementarResultado.style.display = 'none';
            if (dobroResultado) dobroResultado.style.display = 'none';
            if (custasDobroSelect) custasDobroSelect.value = 'nao';
            atualizarCamposVisiveis();
        });
    }

    // Botão de ajuda
    if (ajudaBtn) {
        ajudaBtn.addEventListener('click', function() {
            alert('Sistema de Cálculo de Custas Processuais\n\n' +
                  '1. Selecione o tipo de processo\n' +
                  '2. Informe o valor da causa (se aplicável)\n' +
                  '3. Para apelações, informe a data de ajuizamento\n' +
                  '4. Selecione a fase (quando aplicável), instância e unidade gestora\n' +
                  '5. Clique em "Calcular Custas"\n\n' +
                  'Custas Complementares:\n' +
                  '- Informe valores já pagos para abatimento\n' +
                  '- O sistema atualiza o valor para a data atual\n' +
                  '- O valor atualizado é subtraído do total\n\n' +
                  'Custas em Dobro:\n' +
                  '- Aplica o dobro do valor calculado conforme §4º do art. 1.007 do CPC\n' +
                  '- "§4º O recorrente que não comprovar, no ato de interposição do recurso, o recolhimento do preparo, inclusive porte de remessa e de retorno, será intimado, na pessoa de seu advogado, para realizar o recolhimento em dobro, sob pena de deserção."\n' +
                  '- Disponível apenas para processos não criminais');
        });
    }

    // Mostrar/ocultar campos de custas complementares
    if (complementarOption) {
        complementarOption.addEventListener('change', function() {
            if (custasComplementaresFields) custasComplementaresFields.style.display = this.value === 'sim' ? 'block' : 'none';
        });
    }

    // Atualizar campos visíveis quando mudar seleções
    if (tipoProcessoSelect) tipoProcessoSelect.addEventListener('change', atualizarCamposVisiveis);
    if (faseProcessoSelect) faseProcessoSelect.addEventListener('change', atualizarCamposVisiveis);

    // Inicializar campos visíveis
    atualizarCamposVisiveis();

    // Ajustar o padding do formulário para o novo layout
    if (form) {
        form.style.padding = '30px 40px';
    }

    // Ajustar o padding dos resultados para o novo layout
    if (resultadoDiv) {
        resultadoDiv.style.padding = '0 40px 40px';
    }
});
