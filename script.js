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
  const lines = text.split('\n').filter(line => line.trim() !== '');

  // Create a temporary canvas to measure text accurately with proper font
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  const selectedFont = document.getElementById('fontStyle').value;
  tempCtx.font = `28px "${selectedFont}", Arial, sans-serif`;

  // Calculate available space per image (considering title, margins, signature, etc.)
  const canvasHeight = 1350;
  const titleSpace = 200; // Space for title and margins
  const bottomSpace = 120; // Space for signature and page indicator
  const availableContentHeight = canvasHeight - titleSpace - bottomSpace;
  const lineHeight = 40;
  const paragraphSpacing = 15;
  const maxLinesPerImage = Math.floor(availableContentHeight / lineHeight) - 2; // Safety margin

  // Calculate actual lines needed for each paragraph
  const paragraphData = [];
  let totalLinesNeeded = 0;

  lines.forEach(line => {
    if (line.trim() === '') {
      paragraphData.push({ content: '', lines: 0.5 }); // Empty line spacing
      totalLinesNeeded += 0.5;
    } else {
      const wrappedLines = wrapText(tempCtx, line, 960); // 1080 - 120 margin
      const linesCount = wrappedLines.length;
      paragraphData.push({ content: line, lines: linesCount });
      totalLinesNeeded += linesCount;

      // Add paragraph spacing (except for last line)
      if (lines.indexOf(line) < lines.length - 1) {
        totalLinesNeeded += 0.4; // Paragraph spacing equivalent
      }
    }
  });

  // Determine how many images we need
  let imagesNeeded = Math.ceil(totalLinesNeeded / maxLinesPerImage);
  imagesNeeded = Math.min(4, Math.max(1, imagesNeeded)); // Between 1 and 4 images

  // If everything fits in one image, return as single chunk
  if (imagesNeeded === 1) {
    return [text];
  }

  // Distribute content across multiple images
  const chunks = [];
  const targetLinesPerImage = totalLinesNeeded / imagesNeeded;

  let currentChunk = [];
  let currentLinesCount = 0;
  let currentImageIndex = 0;

  for (let i = 0; i < paragraphData.length; i++) {
    const paragraph = paragraphData[i];
    const isLastParagraph = i === paragraphData.length - 1;
    const isLastImage = currentImageIndex === imagesNeeded - 1;

    // Check if adding this paragraph would exceed the target
    const wouldExceedTarget = currentLinesCount + paragraph.lines > targetLinesPerImage;
    const hasContent = currentChunk.length > 0;
    const shouldStartNewImage = wouldExceedTarget && hasContent && !isLastImage;

    if (shouldStartNewImage) {
      // Start new image
      chunks.push(currentChunk.join('\n'));
      currentChunk = paragraph.content ? [paragraph.content] : [];
      currentLinesCount = paragraph.lines;
      currentImageIndex++;
    } else {
      // Add to current image
      if (paragraph.content) {
        currentChunk.push(paragraph.content);
      }
      currentLinesCount += paragraph.lines;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  // Ensure we don't have empty chunks and don't exceed 4 images
  const validChunks = chunks.filter(chunk => chunk.trim() !== '');

  if (validChunks.length > 4) {
    // Merge excess chunks into the last one
    const excess = validChunks.splice(3);
    validChunks[3] = validChunks[3] + '\n\n' + excess.join('\n\n');
  }

  return validChunks.length > 0 ? validChunks : [text];
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

  let yPosition = 80;

  // Draw logo if provided
  if (uploadedImages.logo) {
    const logoImg = new Image();
    logoImg.src = uploadedImages.logo;
    await new Promise(resolve => {
      logoImg.onload = () => {
        const logoSize = 120;
        ctx.drawImage(logoImg, canvas.width - logoSize - 40, 20, logoSize, logoSize);
        resolve();
      };
    });
  }

  // Draw title with strong outline for better readability
  ctx.font = `bold 48px "${selectedFont}", Arial, sans-serif`;

  const titleLines = wrapText(ctx, title, canvas.width - 120); // Match content width
  titleLines.forEach(line => {
    // Draw black outline (stroke)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText(line, 60, yPosition);

    // Draw the main text
    ctx.fillStyle = '#e18bd0';
    ctx.fillText(line, 60, yPosition);

    yPosition += 60;
  });

  yPosition += 50; // More space after title for better alignment

  // Reserve space for page indicator at bottom
  let bottomReservedSpace = 60; // Base space
  if (totalPages > 1) bottomReservedSpace += 40; // Add space for page indicator

  // Calculate available space - fixed font size, no auto-resizing
  const maxYPosition = canvas.height - bottomReservedSpace;

  // Fixed font settings - consistent across all fonts
  const fontSize = 28;
  const lineHeight = 40;
  const paragraphSpacing = 15;

  // Calculate content area for background cloud
  const contentStartY = yPosition;
  const contentHeight = maxYPosition - yPosition;

  // Draw semi-transparent background cloud behind content area
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.filter = 'blur(8px)';

  // Create rounded rectangle for content background
  const cloudX = 40;
  const cloudY = contentStartY - 20;
  const cloudWidth = canvas.width - 80;
  const cloudHeight = contentHeight + 40;
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

  // Draw content with optimized formatting and better readability
  ctx.fillStyle = '#ffffff';
  ctx.font = `${fontSize}px "${selectedFont}", Arial, sans-serif`;

  const contentLines = content.split('\n');
  const textWidth = canvas.width - 120; // Match title width (60px margin on each side)

  contentLines.forEach((line, index) => {
    if (yPosition >= maxYPosition) return;

    if (line.trim() === '') {
      yPosition += paragraphSpacing;
      return;
    }

    const wrappedLines = wrapText(ctx, line, textWidth);
    const isBulletPoint = line.trim().startsWith('-') || line.trim().startsWith('•');

    wrappedLines.forEach((wrappedLine, wrapIndex) => {
      if (yPosition >= maxYPosition) return;

      // Add text shadow for better readability over backgrounds
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      if (isBulletPoint && wrapIndex === 0) {
        // First line of bullet point
        ctx.fillText('• ' + wrappedLine.replace(/^[-•]\s*/, ''), 60, yPosition);
      } else if (isBulletPoint && wrapIndex > 0) {
        // Continuation of bullet point - indent
        ctx.fillText(wrappedLine, 80, yPosition);
      } else {
        // Regular text
        ctx.fillText(wrappedLine, 60, yPosition);
      }

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      yPosition += lineHeight;
    });

    // Add spacing between different paragraphs/bullet points
    if (index < contentLines.length - 1 && contentLines[index + 1].trim() !== '') {
      yPosition += paragraphSpacing;
    }
  });

  // Draw page indicator at bottom right if multiple pages
  if (totalPages > 1) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `20px "${selectedFont}", Arial, sans-serif`;
    ctx.textAlign = 'right';

    // Add shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillText(`${pageNum}/${totalPages}`, canvas.width - 60, canvas.height - 60);

    // Reset shadow and alignment
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
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