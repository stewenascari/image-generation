const textInput = document.getElementById('textInput');
const logoInput = document.getElementById('logoInput');
const generateBtn = document.getElementById('generateBtn');
const formatBtn = document.getElementById('formatBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const downloadSection = document.getElementById('downloadSection');
const individualDownloads = document.getElementById('individualDownloads');
const previewArea = document.getElementById('previewArea');
const backgroundInput = document.getElementById('backgroundInput');

let backgroundImage = null;
backgroundInput.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        backgroundImage = img;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});


let generatedCanvases = [];
let logoImage = null;

logoInput.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        logoImage = img;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});

formatBtn.addEventListener('click', function () {
  const text = textInput.value.trim();
  if (!text) {
    alert('Por favor, digite algum texto primeiro!');
    return;
  }
  let formattedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[ \t]+/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/^\s*$/gm, '')
    .split(/\n\n+/)
    .map(section => {
      const lines = section.split('\n').filter(line => line.trim());
      let result = '';
      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        if (!currentLine) continue;
        if (result) {
          const lastChar = result.slice(-1);
          const firstChar = currentLine.charAt(0);
          if ((!/[.!?:]$/.test(lastChar) && !/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(firstChar)) || lastChar === ',' || lastChar === ';') {
            result += ' ' + currentLine;
          } else {
            result += '\n' + currentLine;
          }
        } else {
          result = currentLine;
        }
      }
      return result;
    })
    .filter(section => section.trim())
    .join('\n\n')
    .trim();

  textInput.value = formattedText;
});

generateBtn.addEventListener('click', function () {
  const text = textInput.value.trim();
  if (!text) {
    alert('Por favor, digite algum texto!');
    return;
  }
  generateImage(text);
});

downloadAllBtn.addEventListener('click', function () {
  generatedCanvases.forEach((canvas, index) => {
    const link = document.createElement('a');
    link.download = `texto-formatado-parte-${index + 1}.png`;
    link.href = canvas.toDataURL();
    link.click();
    setTimeout(() => { }, 100 * index);
  });
});

function generateImage(text) {
  generatedCanvases = [];
  previewArea.innerHTML = '';
  individualDownloads.innerHTML = '';
  downloadSection.style.display = 'none';

  previewArea.innerHTML = '<div class="text-center"><div class="text-2xl">⏳</div><p>Gerando imagens...</p></div>';

  const canvasWidth = 1080;
  const canvasHeight = 1350;
  const margin = 60;
  const lineHeight = 30; // mais espaçado para melhor leitura
  const paragraphSpacing = 50;
  const maxWidth = canvasWidth - margin * 2;

  const logoSize = 100;
  const logoTopMargin = 20;
  const headerSpace = logoImage ? logoSize + logoTopMargin * 2 : 120;

  const footerSpace = 80;
  const availableHeight = canvasHeight - headerSpace - footerSpace;

  const paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n/);
  let allLines = [];

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = '24px Inter, Arial, sans-serif'; // fonte maior para medida

  paragraphs.forEach((paragraph, pIndex) => {
    if (paragraph.trim()) {
      const paragraphLines = paragraph.trim().split('\n').filter(line => line.trim());
      paragraphLines.forEach((paragraphLine, lineIndex) => {
        const wrappedLines = wrapText(tempCtx, paragraphLine.trim(), maxWidth);
        wrappedLines.forEach((line, wIndex) => {
          allLines.push({
            text: line,
            isParagraphStart: lineIndex === 0 && wIndex === 0,
            isParagraphEnd: lineIndex === paragraphLines.length - 1 && wIndex === wrappedLines.length - 1,
            isLastParagraph: pIndex === paragraphs.length - 1,
            isLineBreak: lineIndex > 0 && wIndex === 0
          });
        });
      });
    }
  });

  // Distribuir linhas por página
  const pages = [];
  let currentPage = [];
  let currentHeight = 0;

  for (let i = 0; i < allLines.length; i++) {
    let extraSpace = 0;
    if (allLines[i].isParagraphStart && currentPage.length > 0) extraSpace += paragraphSpacing;
    if (allLines[i].isLineBreak) extraSpace += 10;
    if (allLines[i].isParagraphEnd && !allLines[i].isLastParagraph) extraSpace += 25;

    if (currentHeight + lineHeight + extraSpace > availableHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }

    if (allLines[i].isParagraphStart && currentPage.length > 0) currentHeight += paragraphSpacing;
    if (allLines[i].isLineBreak) currentHeight += 10;

    currentPage.push(allLines[i]);
    currentHeight += lineHeight;

    if (allLines[i].isParagraphEnd && !allLines[i].isLastParagraph) currentHeight += 25;
  }
  if (currentPage.length > 0) pages.push(currentPage);

  // Limitar máximo a 4 páginas e redistribuir se precisar
  const maxPages = 4;
  if (pages.length > maxPages) {
    const allLinesFlat = pages.flat();
    const linesPerPageForced = Math.ceil(allLinesFlat.length / maxPages);
    const redistributedPages = [];
    for (let i = 0; i < maxPages; i++) {
      const start = i * linesPerPageForced;
      const end = Math.min(start + linesPerPageForced, allLinesFlat.length);
      redistributedPages.push(allLinesFlat.slice(start, end));
    }
    pages.length = 0;
    pages.push(...redistributedPages);
  }

  pages.forEach((pageLines, pageIndex) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fundo com blur + camada escura
    if (backgroundImage && backgroundImage.complete) {
      ctx.filter = 'blur(8px)';
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // Fundo preto básico se não tiver imagem
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Inter, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Logo em todas as páginas, mesma posição e tamanho
    let currentY;
    if (logoImage) {
      const logoX = (canvas.width - logoSize) / 2;
      const logoY = logoTopMargin;
      ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
      currentY = logoY + logoSize + logoTopMargin;
    } else {
      currentY = headerSpace;
    }

    // Caixa branca semi-transparente atrás do texto
    const textBlockHeight = availableHeight;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(margin - 20, headerSpace - 10, maxWidth + 40, textBlockHeight + 20);

    ctx.fillStyle = '#FFFFFF';

    pageLines.forEach((line, lineIndex) => {
      if (line.isParagraphStart && lineIndex > 0) currentY += paragraphSpacing;
      if (line.isLineBreak) currentY += 10;

      ctx.fillText(line.text, margin, currentY);
      currentY += lineHeight;

      if (line.isParagraphEnd && !line.isLastParagraph && lineIndex < pageLines.length - 1) currentY += 25;
    });

    // Número da página no rodapé
    if (pages.length > 1) {
      ctx.font = '18px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`${pageIndex + 1} / ${pages.length}`, canvas.width / 2, canvas.height - 40);
    }

    ctx.shadowColor = 'transparent';

    generatedCanvases.push(canvas);
  });

  const previewContainer = document.createElement('div');
  previewContainer.className = 'space-y-6';

  generatedCanvases.forEach((canvas, index) => {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'text-center';

    const label = document.createElement('p');
    label.textContent = `Imagem ${index + 1}${generatedCanvases.length > 1 ? ` de ${generatedCanvases.length}` : ''}`;
    label.className = 'text-sm font-medium text-gray-300 mb-3';

    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    img.className = 'max-w-full h-auto rounded-lg shadow-lg mx-auto border border-white/20';

    imageContainer.appendChild(label);
    imageContainer.appendChild(img);
    previewContainer.appendChild(imageContainer);

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = `📥 Imagem ${index + 1}`;
    downloadBtn.className = 'bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors mt-2';
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.download = `texto-formatado-parte-${index + 1}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    individualDownloads.appendChild(downloadBtn);
  });

  previewArea.innerHTML = '';
  previewArea.appendChild(previewContainer);
  downloadSection.style.display = 'block';
}


function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + words[i] + ' ';
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && i > 0) {
      lines.push(currentLine.trim());
      currentLine = words[i] + ' ';
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines;
}
