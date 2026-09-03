const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const editorArea = document.getElementById('editorArea');
const imagePreview = document.getElementById('imagePreview');
const fileLabel = document.getElementById('fileLabel');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');

let originalBinaryData = null;
let currentFileName = 'meta_photo.jpg';

// Trigger file picker
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

// Drag and drop events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

// Read file as raw DataURL (Preserves original pixel encoding and blocks canvas loss)
function handleFile(file) {
    if (!file.type.match('image/jpeg')) {
        alert('Please provide a valid JPG or JPEG image.');
        return;
    }

    currentFileName = file.name;
    fileLabel.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        originalBinaryData = e.target.result;
        imagePreview.src = originalBinaryData;
        dropZone.style.display = 'none';
        editorArea.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Convert Base64 / DataURL to a binary Blob
function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Format timestamp to standard EXIF specification
function getExifDate() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Binary Patching and Native OS Share Trigger
exportBtn.addEventListener('click', async () => {
    if (!originalBinaryData) return;

    try {
        const timeNow = getExifDate();

        // 1. Primary Hardware Metadata (0th IFD)
        const zeroth = {};
        zeroth[piexif.ImageIFD.Make] = "Meta\u0000";
        zeroth[piexif.ImageIFD.Model] = "Ray-Ban Meta Smart Glasses\u0000";
        zeroth[piexif.ImageIFD.Software] = "Meta View 160.0.0\u0000";
        zeroth[piexif.ImageIFD.DateTime] = timeNow;
        zeroth[piexif.ImageIFD.Orientation] = 1;

        // 2. Exact Optical Sensor Parameters
        const exif = {};
        exif[piexif.ExifIFD.DateTimeOriginal] = timeNow;
        exif[piexif.ExifIFD.DateTimeDigitized] = timeNow;
        exif[piexif.ExifIFD.LensMake] = "Meta\u0000";
        exif[piexif.ExifIFD.LensModel] = "Ray-Ban Meta Ultra-wide Camera\u0000";
        exif[piexif.ExifIFD.FNumber] = [22, 10];               // f/2.2
        exif[piexif.ExifIFD.FocalLength] = [218, 100];           // 2.18mm
        exif[piexif.ExifIFD.FocalLengthIn35mmFilm] = 12;         // 12mm Equivalent
        exif[piexif.ExifIFD.ISOSpeedRatings] = 100;
        exif[piexif.ExifIFD.ExposureTime] = [1, 120];
        exif[piexif.ExifIFD.ExposureProgram] = 2;
        exif[piexif.ExifIFD.MeteringMode] = 5;
        exif[piexif.ExifIFD.ColorSpace] = 1;
        exif[piexif.ExifIFD.UserComment] = "Captured with Ray-Ban Meta Smart Glasses\u0000";
        exif[piexif.ExifIFD.BodySerialNumber] = "RBM-G2-W-01\u0000";

        const exifObj = { "0th": zeroth, "Exif": exif, "GPS": {} };
        const exifBytes = piexif.dump(exifObj);

        // Strip incoming conflicting markers and write genuine Meta headers
        const cleanBinary = piexif.remove(originalBinaryData);
        const patchedDataUrl = piexif.insert(exifBytes, cleanBinary);

        // 3. Create native File binary
        const blob = dataURLtoBlob(patchedDataUrl);
        const fileName = `meta-glasses-converted.jpg`;
        const shareFile = new File([blob], fileName, { type: 'image/jpeg' });

        // 4. Trigger Web Share API Level 2 (Windows Share contract or iOS/Android Drawer)
        if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
            await navigator.share({
                files: [shareFile]
            });
        } else {
            // Direct download fallback for unsupported environments
            const a = document.createElement('a');
            a.href = patchedDataUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Processing or share failed:', err);
            alert('Failed to patch or share the image. Ensure the file is a standard JPEG.');
        }
    }
});

// Reset State
resetBtn.addEventListener('click', () => {
    originalBinaryData = null;
    fileInput.value = '';
    editorArea.classList.add('hidden');
    dropZone.style.display = 'block';
});
