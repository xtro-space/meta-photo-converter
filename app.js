// DOM Element References
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const workspace = document.getElementById('workspace');
const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');

const aspectRatioSelect = document.getElementById('aspectRatio');
const fitModeRadios = document.getElementsByName('fitMode');
const qualitySlider = document.getElementById('qualitySlider');
const qualityVal = document.getElementById('qualityVal');

const resolutionTag = document.getElementById('resolutionTag');
const fileNameLabel = document.getElementById('fileName');
const outputSizeLabel = document.getElementById('outputSize');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

let sourceImage = null;
let currentFileName = 'converted.jpg';

// File Input Triggers
browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) processFile(e.target.files[0]);
});

// Drag & Drop Handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
});

// File Loader
function processFile(file) {
    if (!file.type.match('image/jpeg')) {
        alert('Please select a valid JPG or JPEG image.');
        return;
    }

    currentFileName = file.name;
    fileNameLabel.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            sourceImage = img;
            workspace.classList.remove('hidden');
            dropZone.style.display = 'none';
            renderCanvas();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Preset Targets (Wearable Configurations)
function getTargetDimensions() {
    const mode = aspectRatioSelect.value;

    switch (mode) {
        case '3:4':
            return { width: 2272, height: 3024 }; // Ray-Ban Meta Native Capture spec
        case '1:1':
            return { width: 2048, height: 2048 }; // Square import spec
        case '9:16':
            return { width: 1080, height: 1920 }; // Standard vertical story format
        case 'original':
        default:
            return { width: sourceImage.width, height: sourceImage.height };
    }
}

function getFitMode() {
    for (const radio of fitModeRadios) {
        if (radio.checked) return radio.value;
    }
    return 'cover';
}

// Core Image Transformation
function renderCanvas() {
    if (!sourceImage) return;

    const { width: targetW, height: targetH } = getTargetDimensions();
    const fitMode = getFitMode();

    canvas.width = targetW;
    canvas.height = targetH;
    resolutionTag.textContent = `${targetW} × ${targetH}`;

    // Fill background with black (standard letterboxing for wearables)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetW, targetH);

    let renderW, renderH, offsetX, offsetY;

    if (aspectRatioSelect.value === 'original') {
        ctx.drawImage(sourceImage, 0, 0);
    } else {
        const hRatio = targetW / sourceImage.width;
        const vRatio = targetH / sourceImage.height;
        const ratio = (fitMode === 'cover') ? Math.max(hRatio, vRatio) : Math.min(hRatio, vRatio);

        renderW = sourceImage.width * ratio;
        renderH = sourceImage.height * ratio;
        offsetX = (targetW - renderW) / 2;
        offsetY = (targetH - renderH) / 2;

        ctx.drawImage(sourceImage, 0, 0, sourceImage.width, sourceImage.height, offsetX, offsetY, renderW, renderH);
    }

    updateEstimatedSize();
}

// Estimate Output Payload Size
function updateEstimatedSize() {
    const quality = qualitySlider.value / 100;
    canvas.toBlob((blob) => {
        if (blob) {
            const sizeInMb = (blob.size / (1024 * 1024)).toFixed(2);
            outputSizeLabel.textContent = `${sizeInMb} MB`;
        }
    }, 'image/jpeg', quality);
}

// UI Event Listeners
aspectRatioSelect.addEventListener('change', renderCanvas);
fitModeRadios.forEach(r => r.addEventListener('change', renderCanvas));

qualitySlider.addEventListener('input', (e) => {
    qualityVal.textContent = `${e.target.value}%`;
    updateEstimatedSize();
});

// Download & File Export
downloadBtn.addEventListener('click', () => {
    if (!sourceImage) return;

    const quality = qualitySlider.value / 100;
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cleanName = currentFileName.replace(/\.[^/.]+$/, "");
        a.href = url;
        a.download = `meta_ready_${cleanName}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/jpeg', quality);
});

// Reset State
resetBtn.addEventListener('click', () => {
    sourceImage = null;
    fileInput.value = '';
    workspace.classList.add('hidden');
    dropZone.style.display = 'block';
});