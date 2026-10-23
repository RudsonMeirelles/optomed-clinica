/**
 * Serviço de Impressão Isolada Profissional para OptoMed Clínica
 * 
 * Garante que APENAS o documento/folha desejada seja impressa,
 * eliminando 100% o risco de imprimir a interface da aplicação,
 * cabeçalhos, botões, trilhas de exame ou menus laterais.
 */

export interface PrintOptions {
  title?: string;
  orientation?: 'landscape' | 'portrait' | 'thermal';
  margins?: string;
}

export function printIsolatedElement(element: HTMLElement | null, options: PrintOptions = {}) {
  if (!element) {
    console.error('[PrintService] Elemento para impressão não encontrado.');
    return;
  }

  // 1. Prepara estilos exclusivos para impressão
  const style = document.createElement('style');
  style.id = 'optomed-print-styles';
  
  // Dependendo da orientação, podemos aplicar regras de página
  const orientationRule = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  
  style.innerHTML = `
    @media screen {
      #optomed-isolated-print-container {
        display: none !important;
      }
    }
    @media print {
      @page {
        size: auto ${orientationRule};
        margin: ${options.margins || '10mm'};
      }
      body > *:not(#optomed-isolated-print-container) {
        display: none !important;
      }
      #optomed-isolated-print-container {
        display: block !important;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        background: white;
      }
      /* Força cores exatas e fundos */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;
  document.head.appendChild(style);

  // 2. Cria container e anexa o elemento clonado
  const printContainer = document.createElement('div');
  printContainer.id = 'optomed-isolated-print-container';
  const clone = element.cloneNode(true) as HTMLElement;
  printContainer.appendChild(clone);
  document.body.appendChild(printContainer);

  // 3. Função de limpeza após a impressão
  const cleanup = () => {
    if (document.body.contains(printContainer)) {
      document.body.removeChild(printContainer);
    }
    if (document.head.contains(style)) {
      document.head.removeChild(style);
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Fallback de limpeza caso o evento afterprint falhe ou o usuário cancele
  // 1 minuto é mais que suficiente para o usuário imprimir
  setTimeout(() => cleanup(), 60000);

  // 4. Aguarda o DOM atualizar os estilos e dispara a impressão
  setTimeout(() => {
    try {
      window.print();
    } catch (err) {
      console.error('[PrintService] Erro ao imprimir:', err);
      cleanup();
    }
  }, 250);
}
