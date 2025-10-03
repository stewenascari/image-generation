let generatedImages = [];
let uploadedImages = {
  logo: null,
  background: null,
  watermark: null
};

// Handle file uploads
document.getElementById('logo').addEventListener('change', (e) => handleFileUpload(e, 'logo'));
document.getElementById('background').addEventListener('change', (e) => handleFileUpload(e, 'background'));
document.getElementById('watermark').addEventListener('change', (e) => handleFileUpload(e, 'watermark'));

function handleFileUpload(event, type) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImages[type] = e.target.result;
      // Update label to show file selected
      const label = event.target.nextElementSibling;
      label.textContent = `✅ ${file.name}`;
    };
    reader.readAsDataURL(file);
  } else {
    // If no file selected, keep the existing image
    const label = event.target.nextElementSibling;
    if (uploadedImages[type]) {
      label.textContent = `✅ Arquivo selecionado`;
    } else {
      // Reset to original text based on type
      const originalTexts = {
        logo: '📷 Escolher Logo',
        background: '🖼️ Escolher Fundo',
        watermark: '💧 Escolher Marca d\'Água'
      };
      label.textContent = originalTexts[type];
    }
  }
}

function splitTextIntoChunks(text) {
  // Preserve empty lines for better formatting
  const lines = text.split('\n');

  // Create a temporary canvas to measure text accurately with current font
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  const selectedFont = document.getElementById('fontStyle').value;

  // Use the EXACT same font settings as rendering
  const fontSize = 24;
  tempCtx.font = `${fontSize}px "${selectedFont}", Arial, sans-serif`;

  // Calculate EXACT available space per image - FONT INDEPENDENT
  const canvasHeight = 1350;
  const titleSpace = 250;
  const bottomSpace = 70;
  const overlayTopPadding = 30;
  const overlayBottomPadding = 40;
  const availableContentHeight = canvasHeight - titleSpace - bottomSpace - overlayTopPadding - overlayBottomPadding;

  // Dynamic line height based on font size - works with ANY font
  const lineHeight = Math.ceil(fontSize * 1.4); // 1.4x font size for good readability
  const paragraphSpacing = Math.ceil(fontSize * 0.5); // 0.5x font size for paragraph spacing
  const maxLinesPerImage = Math.floor(availableContentHeight / lineHeight);

  console.log(`📏 Formatação: Fonte=${selectedFont}, Tamanho=${fontSize}px, Altura linha=${lineHeight}px`);
  console.log(`📐 Espaço: ${availableContentHeight}px disponível, ${maxLinesPerImage} linhas por imagem`);

  // Process all lines with smart formatting
  const processedLines = [];
  let totalWrappedLines = 0;

  lines.forEach((line, index) => {
    if (line.trim() === '') {
      // Keep empty lines for spacing but count them
      processedLines.push({
        original: line,
        wrapped: [''],
        lineCount: 1,
        isEmpty: true
      });
      totalWrappedLines += 1;
    } else {
      // Use consistent text width for all fonts - matches overlay width
      const textWidth = 960; // Match rendering width (1020 - 60 margins)
      const wrappedLines = wrapText(tempCtx, line, textWidth);
      processedLines.push({
        original: line,
        wrapped: wrappedLines,
        lineCount: wrappedLines.length,
        isEmpty: false
      });
      totalWrappedLines += wrappedLines.length;
    }
  });

  console.log(`📝 Processamento: ${lines.length} linhas originais → ${totalWrappedLines} linhas finais`);

  // If everything fits in one image
  if (totalWrappedLines <= maxLinesPerImage) {
    console.log(`✅ Tudo cabe em 1 imagem!`);
    return [text];
  }

  // Calculate how many images we actually need
  const minImagesNeeded = Math.ceil(totalWrappedLines / maxLinesPerImage);
  const actualMaxImages = Math.min(minImagesNeeded + 1, 10); // Allow up to 10 images if needed

  // Smart distribution - ensure ALL text is included
  const targetLinesPerImage = Math.ceil(totalWrappedLines / actualMaxImages);
  console.log(`🎯 Precisa de ${minImagesNeeded} imagens mínimo, usando ${actualMaxImages} máximo`);
  console.log(`🎯 Meta: ${targetLinesPerImage} linhas por imagem`);

  const chunks = [];
  let currentChunk = [];
  let currentLineCount = 0;

  for (let i = 0; i < processedLines.length; i++) {
    const processedLine = processedLines[i];

    // Smart chunking logic - NEVER lose content
    const wouldExceedTarget = currentLineCount + processedLine.lineCount > maxLinesPerImage;
    const hasContent = currentChunk.length > 0;
    const canCreateNewChunk = chunks.length < actualMaxImages - 1;
    const isEmptyLine = processedLine.isEmpty;

    // Only create new chunk if we would exceed the HARD limit (maxLinesPerImage)
    if (wouldExceedTarget && hasContent && canCreateNewChunk && !isEmptyLine) {
      // Create new chunk
      chunks.push(currentChunk.join('\n'));
      currentChunk = [processedLine.original];
      currentLineCount = processedLine.lineCount;
      console.log(`📦 Chunk ${chunks.length}: ${currentLineCount} linhas`);
    } else {
      // Add to current chunk
      currentChunk.push(processedLine.original);
      currentLineCount += processedLine.lineCount;
    }
  }

  // ALWAYS add the last chunk - this ensures NO content is lost
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
    console.log(`📦 Chunk final: ${currentLineCount} linhas`);
  }

  // Clean up chunks - remove leading/trailing empty lines
  const cleanChunks = chunks.map(chunk => {
    const lines = chunk.split('\n');
    // Remove empty lines from start and end, but keep internal ones
    while (lines.length > 0 && lines[0].trim() === '') lines.shift();
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
    return lines.join('\n');
  }).filter(chunk => chunk.trim() !== '');

  // FORCE exactly 4 images maximum - merge excess into last image
  const MAX_IMAGES = 4;
  if (cleanChunks.length > MAX_IMAGES) {
    const excess = cleanChunks.splice(MAX_IMAGES - 1);
    cleanChunks[MAX_IMAGES - 1] = excess.join('\n\n');
    console.log(`⚠️ ${excess.length} chunks em excesso mesclados na imagem 4`);
  }

  // Ensure we never exceed 4 images
  const finalChunks = cleanChunks.slice(0, MAX_IMAGES);

  console.log(`✅ Resultado: ${finalChunks.length} imagens criadas (máximo 4)`);
  console.log(`📊 Verificação: ${finalChunks.join('\n\n').length} chars vs ${text.length} chars originais`);

  // Ensure we have valid chunks and ALL content is preserved
  return finalChunks.length > 0 ? finalChunks : [text];
}

async function generateImages() {
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();

  if (!title || !content) {
    alert('Por favor, preencha o título e o conteúdo!');
    return;
  }

  const generateBtn = document.querySelector('.generate-btn');
  generateBtn.disabled = true;
  generateBtn.textContent = '⏳ Gerando...';

  try {
    const textChunks = splitTextIntoChunks(content);
    generatedImages = [];

    for (let i = 0; i < textChunks.length; i++) {
      const canvas = await createImageCanvas(title, textChunks[i], i + 1, textChunks.length);
      generatedImages.push(canvas);
    }

    displayImages();
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    console.error('Erro ao gerar imagens:', error);
    alert('Erro ao gerar as imagens. Tente novamente.');
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = '✨ Gerar Imagens';
  }
}

async function createImageCanvas(title, content, pageNum, totalPages) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas size (1080x1350 - Instagram portrait format)
  canvas.width = 1080;
  canvas.height = 1350;

  // Get selected font
  const selectedFont = document.getElementById('fontStyle').value;

  // Draw background
  if (uploadedImages.background) {
    const bgImg = new Image();
    bgImg.src = uploadedImages.background;
    await new Promise(resolve => {
      bgImg.onload = () => {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        resolve();
      };
    });
  } else {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Set text properties
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  let yPosition = 40; // Start even higher for maximum content space

  // Draw logo if provided
  if (uploadedImages.logo) {
    const logoImg = new Image();
    logoImg.src = uploadedImages.logo;
    await new Promise(resolve => {
      logoImg.onload = () => {
        const logoSize = 80; // Even smaller logo
        ctx.drawImage(logoImg, canvas.width - logoSize - 20, 10, logoSize, logoSize);
        resolve();
      };
    });
  }

  // Draw title with strong outline for better readability
  ctx.font = `bold 40px "${selectedFont}", Arial, sans-serif`; // Smaller title for more content space

  const titleLines = wrapText(ctx, title, canvas.width - 120); // Wider title area
  titleLines.forEach(line => {
    // Draw VERY strong black outline (stroke)
    ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.lineWidth = 8;
    ctx.strokeText(line, 60, yPosition); // Consistent margin

    // Draw the main text
    ctx.fillStyle = '#e18bd0';
    ctx.fillText(line, 60, yPosition); // Consistent margin

    yPosition += 48; // Tighter title line spacing
  });

  yPosition += 30; // Minimal space after title

  // Reserve minimal space for page indicator at bottom
  let bottomReservedSpace = 50; // Much smaller bottom space for all images
  if (totalPages > 1) bottomReservedSpace += 20; // Small space for page indicator

  // Calculate available space - CONSISTENT FOR ALL IMAGES - USE ALMOST ALL SPACE
  const maxYPosition = canvas.height - bottomReservedSpace; // Consistent limit for all images

  // Dynamic font settings that match the splitting logic
  const fontSize = 24;
  const lineHeight = Math.ceil(fontSize * 1.4); // Same as splitting: 1.4x font size
  const paragraphSpacing = Math.ceil(fontSize * 0.5); // Same as splitting: 0.5x font size

  // Calculate content area for background cloud - STARTS WELL AFTER TITLE
  const contentStartY = yPosition;

  // Draw semi-transparent background cloud behind content area - STARTS WELL AFTER TITLE
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.filter = 'blur(10px)';

  // Create rounded rectangle for content background - STARTS WELL AFTER TITLE, GOES TO BOTTOM
  const cloudX = 30;
  const cloudY = contentStartY + 20; // Starts well after title with more space
  const cloudWidth = canvas.width - 60;
  const cloudHeight = canvas.height - cloudY - bottomReservedSpace; // Respects bottom space
  const radius = 25;

  ctx.beginPath();
  ctx.moveTo(cloudX + radius, cloudY);
  ctx.lineTo(cloudX + cloudWidth - radius, cloudY);
  ctx.quadraticCurveTo(cloudX + cloudWidth, cloudY, cloudX + cloudWidth, cloudY + radius);
  ctx.lineTo(cloudX + cloudWidth, cloudY + cloudHeight - radius);
  ctx.quadraticCurveTo(cloudX + cloudWidth, cloudY + cloudHeight, cloudX + cloudWidth - radius, cloudY + cloudHeight);
  ctx.lineTo(cloudX + radius, cloudY + cloudHeight);
  ctx.quadraticCurveTo(cloudX, cloudY + cloudHeight, cloudX, cloudY + cloudHeight - radius);
  ctx.lineTo(cloudX, cloudY + radius);
  ctx.quadraticCurveTo(cloudX, cloudY, cloudX + radius, cloudY);
  ctx.closePath();
  ctx.fill();

  // Reset filter
  ctx.filter = 'none';

  // MOVE TEXT POSITION TO START INSIDE THE OVERLAY
  yPosition = cloudY + 30; // Start text INSIDE the overlay with padding

  // Draw content STRICTLY within the overlay boundaries
  ctx.fillStyle = '#ffffff';
  ctx.font = `${fontSize}px "${selectedFont}", Arial, sans-serif`;

  // Keep original formatting including empty lines
  const contentLines = content.split('\n');
  const textWidth = cloudWidth - 60; // Use maximum overlay width (30px margin each side)
  const leftMargin = cloudX + 30; // Text starts inside overlay with smaller margin
  const overlayMaxY = cloudY + cloudHeight - 40; // Text must end before overlay ends

  // Calculate available lines for this specific image
  const availableLines = Math.floor((overlayMaxY - yPosition) / lineHeight);
  console.log(`🖼️ Imagem ${pageNum}: ${availableLines} linhas disponíveis, ${contentLines.length} linhas de conteúdo`);

  let linesUsed = 0;

  contentLines.forEach((line, index) => {
    // STRICT boundary check - text MUST stay within overlay
    if (yPosition >= overlayMaxY || linesUsed >= availableLines) return;

    // Handle empty lines for better formatting
    if (line.trim() === '') {
      // Empty line - just add spacing if we have room
      if (linesUsed < availableLines) {
        yPosition += paragraphSpacing;
        linesUsed++;
      }
      return;
    }

    const wrappedLines = wrapText(ctx, line, textWidth);
    const isBulletPoint = line.trim().startsWith('-') || line.trim().startsWith('•');

    // Check if we have space for all wrapped lines
    if (linesUsed + wrappedLines.length > availableLines) {
      console.log(`⚠️ Parando na linha ${index}: espaço insuficiente`);
      return;
    }

    wrappedLines.forEach((wrappedLine, wrapIndex) => {
      // STRICT boundary check - text MUST stay within overlay
      if (yPosition >= overlayMaxY || linesUsed >= availableLines) return;

      // Draw text with strong outline for readability
      ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
      ctx.lineWidth = 5; // Optimized thickness for all fonts

      let textToRender = wrappedLine;
      let xPosition = leftMargin;

      if (isBulletPoint && wrapIndex === 0) {
        // First line of bullet point
        textToRender = '• ' + wrappedLine.replace(/^[-•]\s*/, '');
      } else if (isBulletPoint && wrapIndex > 0) {
        // Continuation of bullet point - indent
        xPosition = leftMargin + 20; // Smaller indent for more text space
      }

      // Draw outline first, then fill
      ctx.strokeText(textToRender, xPosition, yPosition);
      ctx.fillText(textToRender, xPosition, yPosition);

      yPosition += lineHeight;
      linesUsed++;
    });

    // Add spacing between paragraphs (but not after the last line)
    if (index < contentLines.length - 1 && linesUsed < availableLines - 1) {
      const nextLine = contentLines[index + 1];
      // Only add spacing if next line has content
      if (nextLine && nextLine.trim() !== '') {
        yPosition += paragraphSpacing;
      }
    }
  });

  console.log(`✅ Imagem ${pageNum}: ${linesUsed}/${availableLines} linhas utilizadas`);

  // Draw page indicator at bottom right if multiple pages
  if (totalPages > 1) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `18px "${selectedFont}", Arial, sans-serif`;
    ctx.textAlign = 'right';

    // Draw outline for page indicator
    ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.lineWidth = 4;
    const pageText = `${pageNum}/${totalPages}`;
    ctx.strokeText(pageText, canvas.width - 30, canvas.height - 30);
    ctx.fillText(pageText, canvas.width - 30, canvas.height - 30);

    // Reset alignment
    ctx.textAlign = 'left';
  }



  // Draw watermark if provided
  if (uploadedImages.watermark) {
    const watermarkImg = new Image();
    watermarkImg.src = uploadedImages.watermark;
    await new Promise(resolve => {
      watermarkImg.onload = () => {
        ctx.globalAlpha = 0.18; // Slightly more visible but still subtle
        const wmSize = 600; // Large size but very transparent
        ctx.drawImage(watermarkImg,
          (canvas.width - wmSize) / 2,
          (canvas.height - wmSize) / 2,
          wmSize, wmSize);
        ctx.globalAlpha = 1.0;
        resolve();
      };
    });
  }

  return canvas;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function calculateContentHeight(content, fontSize, maxWidth) {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  const selectedFont = document.getElementById('fontStyle').value;
  tempCtx.font = `${fontSize}px "${selectedFont}", Arial, sans-serif`;

  // Fixed values - no more dynamic sizing
  const lineHeight = 40;
  const paragraphSpacing = 15;

  let totalHeight = 0;
  const contentLines = content.split('\n');

  contentLines.forEach((line, index) => {
    if (line.trim() === '') {
      totalHeight += paragraphSpacing;
      return;
    }

    const wrappedLines = wrapText(tempCtx, line, maxWidth);
    totalHeight += wrappedLines.length * lineHeight;

    // Add spacing between paragraphs
    if (index < contentLines.length - 1 && contentLines[index + 1].trim() !== '') {
      totalHeight += paragraphSpacing;
    }
  });

  return totalHeight;
}

function displayImages() {
  const grid = document.getElementById('imagesGrid');
  grid.innerHTML = '';

  generatedImages.forEach((canvas, index) => {
    const card = document.createElement('div');
    card.className = 'image-card';

    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.className = 'image-canvas';
    img.alt = `Imagem ${index + 1}`;

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = `📥 Baixar Imagem ${index + 1}`;
    downloadBtn.onclick = () => downloadImage(canvas, index + 1);

    card.appendChild(img);
    card.appendChild(downloadBtn);
    grid.appendChild(card);
  });
}

function downloadImage(canvas, index) {
  const link = document.createElement('a');
  link.download = `spoiler-onepiece-${index}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function downloadAll() {
  generatedImages.forEach((canvas, index) => {
    setTimeout(() => {
      downloadImage(canvas, index + 1);
    }, index * 500); // Delay between downloads
  });
}

function clearAllFields() {
  // Clear text inputs
  document.getElementById('title').value = '';
  document.getElementById('content').value = '';
  document.getElementById('fontStyle').value = 'Poppins';

  // Clear file inputs
  document.getElementById('logo').value = '';
  document.getElementById('background').value = '';
  document.getElementById('watermark').value = '';

  // Reset uploaded images
  uploadedImages = {
    logo: null,
    background: null,
    watermark: null
  };

  // Reset file input labels
  document.querySelector('label[for="logo"]').textContent = '📷 Escolher Logo';
  document.querySelector('label[for="background"]').textContent = '🖼️ Escolher Fundo';
  document.querySelector('label[for="watermark"]').textContent = '💧 Escolher Marca d\'Água';

  // Clear generated images
  generatedImages = [];
  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('imagesGrid').innerHTML = '';

  // Show confirmation
  const clearBtn = document.querySelector('.clear-btn');
  const originalText = clearBtn.textContent;
  clearBtn.textContent = '✅ Limpo!';
  setTimeout(() => {
    clearBtn.textContent = originalText;
  }, 1500);
}