const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const workspace = document.getElementById('workspace');
const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const fileNameLabel = document.getElementById('fileName');
const outputSizeLabel = document.getElementById('outputSize');
const resolutionTag = document.getElementById('resolutionTag');

let sourceImage = null;
let currentFileName = 'converted.jpg';

// Meta Ray-Ban glasses strictly output 3024 x 4032 portrait captures
const TARGET_WIDTH = 3024;
const TARGET_HEIGHT = 4032;

browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) processFile(e.target.files[0]);
});

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
});

function processFile(file) {
    if (!file.type.match('image/jpeg')) {
        alert('Please upload a valid JPG/JPEG file.');
        return;
    }

    currentFileName = file.name;
    fileNameLabel.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            sourceImage = img;
            workspace.classList.remove('hidden');
            dropZone.style.display = 'none';
            renderCanvas();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function renderCanvas() {
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    resolutionTag.textContent = `${TARGET_WIDTH} × ${TARGET_HEIGHT}`;

    // Fill black canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    // Smart Fill / Cover scaling
    const hRatio = TARGET_WIDTH / sourceImage.width;
    const vRatio = TARGET_HEIGHT / sourceImage.height;
    const ratio = Math.max(hRatio, vRatio);

    const renderW = sourceImage.width * ratio;
    const renderH = sourceImage.height * ratio;
    const offsetX = (TARGET_WIDTH - renderW) / 2;
    const offsetY = (TARGET_HEIGHT - renderH) / 2;

    ctx.drawImage(sourceImage, 0, 0, sourceImage.width, sourceImage.height, offsetX, offsetY, renderW, renderH);
    outputSizeLabel.textContent = "~2.8 MB";
}

// Download Handler: Strips generated header and injects complete Meta binary tags
downloadBtn.addEventListener('click', () => {
    if (!sourceImage) return;

    // Export raw base64 JPEG from Canvas (Quality 0.95 matches Meta View app default)
    const base64Data = canvas.toDataURL('image/jpeg', 0.95);

    if (typeof piexif === 'undefined') {
        alert('piexifjs library missing!');
        return;
    }

    try {
        const zeroth = {};
        const exif = {};
        const gps = {};

        // Accurate Meta Ray-Ban Gen 2 Specs required by Instagram's parser
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}:${pad(now.getMonth()+1)}:${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        zeroth[piexif.ImageIFD.Make] = "Meta\u0000";
        zeroth[piexif.ImageIFD.Model] = "Ray-Ban Meta Smart Glasses\u0000";
        zeroth[piexif.ImageIFD.Software] = "Meta View\u0000";
        zeroth[piexif.ImageIFD.Orientation] = 1;
        zeroth[piexif.ImageIFD.DateTime] = dateStr;
        zeroth[piexif.ImageIFD.XResolution] = [72, 1];
        zeroth[piexif.ImageIFD.YResolution] = [72, 1];
        zeroth[piexif.ImageIFD.ResolutionUnit] = 2;

        exif[piexif.ExifIFD.DateTimeOriginal] = dateStr;
        exif[piexif.ExifIFD.DateTimeDigitized] = dateStr;
        exif[piexif.ExifIFD.LensMake] = "Meta\u0000";
        exif[piexif.ExifIFD.LensModel] = "Ray-Ban Meta Camera\u0000";
        exif[piexif.ExifIFD.FNumber] = [22, 10]; // f/2.2
        exif[piexif.ExifIFD.FocalLength] = [218, 100]; // 2.18mm
        exif[piexif.ExifIFD.FocalLengthIn35mmFilm] = 12;
        exif[piexif.ExifIFD.ISOSpeedRatings] = 100;
        exif[piexif.ExifIFD.PixelXDimension] = TARGET_WIDTH;
        exif[piexif.ExifIFD.PixelYDimension] = TARGET_HEIGHT;
        exif[piexif.ExifIFD.ColorSpace] = 1;

        const exifObj = { "0th": zeroth, "Exif": exif, "GPS": gps };
        const exifBytes = piexif.dump(exifObj);
        
        // Inject into binary stream
        const finalData = piexif.insert(exifBytes, base64Data);

        const a = document.createElement('a');
        a.href = finalData;
        a.download = `meta_glasses_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (err) {
        console.error('Failed to convert:', err);
    }
});

resetBtn.addEventListener('click', () => {
    sourceImage = null;
    fileInput.value = '';
    workspace.classList.add('hidden');
    dropZone.style.display = 'block';
});
