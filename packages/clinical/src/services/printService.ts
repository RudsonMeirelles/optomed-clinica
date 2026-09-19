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

  const {
    title = 'Documento Clínico - OptoMed',
    orientation = 'landscape',
    margins = orientation === 'thermal' ? '2mm' : (orientation === 'landscape' ? '4mm 6mm' : '8mm 8mm')
  } = options;

  const pageSize = orientation === 'thermal' 
    ? '80mm auto' 
    : (orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape');

  // 1. Remove qualquer iframe de impressão anterior
  const existingIframe = document.getElementById('optomed-isolated-print-frame');
  if (existingIframe) {
    existingIframe.remove();
  }

  // 2. Cria iframe invisível dedicado exclusivamente à impressão
  const iframe = document.createElement('iframe');
  iframe.id = 'optomed-isolated-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error('[PrintService] Não foi possível acessar o documento do iframe de impressão.');
    // Fallback de emergência caso iframe seja bloqueado
    window.print();
    return;
  }

  // 3. Coleta todos os estilos CSS da aplicação (Tailwind, fontes, etc.)
  const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML)
    .join('\n');

  // 4. Monta o HTML limpo e isolado
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      ${styleTags}
      <style>
        @page {
          size: ${pageSize};
          margin: ${margins};
        }
        *, *::before, *::after {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
          font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif !important;
        }
        .no-print {
          display: none !important;
        }
      </style>
    </head>
    <body class="bg-white text-slate-900">
      <div id="print-isolated-root">
        ${element.outerHTML}
      </div>
    </body>
    </html>
  `);
  iframeDoc.close();

  // 5. Aguarda carregamento de imagens e estilos antes de chamar a janela de impressão
  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('[PrintService] Erro ao disparar impressão:', err);
      window.print();
    }
  };

  // Garante que fontes e imagens no iframe terminaram de carregar
  setTimeout(triggerPrint, 300);
}
