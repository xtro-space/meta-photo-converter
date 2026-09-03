const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const editorArea = document.getElementById('editorArea');
const imagePreview = document.getElementById('imagePreview');
const fileLabel = document.getElementById('fileLabel');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');

let originalBinaryData = null;
let currentFileName = 'meta_photo.jpg';

// File Pickers
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

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

function handleFile(file) {
    if (!file.type.match('image/jpeg')) {
        alert('Please provide a valid JPG or JPEG image.');
        return;
    }

    currentFileName = file.name;
    fileLabel.textContent = file.name.length > 22 ? file.name.substring(0, 19) + '...' : file.name;

    // Read directly as DataURL for lossless binary extraction (No Canvas re-rendering)
    const reader = new FileReader();
    reader.onload = (e) => {
        originalBinaryData = e.target.result;
        imagePreview.src = originalBinaryData;
        dropZone.style.display = 'none';
        editorArea.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Generate valid EXIF timestamp
function getExifDate() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Binary Metadata Patching for Ray-Ban Meta Wearables
exportBtn.addEventListener('click', () => {
    if (!originalBinaryData) return;

    try {
        const timeNow = getExifDate();

        // 1. Primary IFD (Zero IFD) tags
        const zeroth = {};
        zeroth[piexif.ImageIFD.Make] = "Meta\u0000";
        zeroth[piexif.ImageIFD.Model] = "Ray-Ban Meta Smart Glasses\u0000";
        zeroth[piexif.ImageIFD.Software] = "Meta View 160.0.0\u0000";
        zeroth[piexif.ImageIFD.DateTime] = timeNow;
        zeroth[piexif.ImageIFD.Orientation] = 1;

        // 2. Hardware Sensor Sub-IFD (Exact Ray-Ban 12MP Ultra-Wide configuration)
        const exif = {};
        exif[piexif.ExifIFD.DateTimeOriginal] = timeNow;
        exif[piexif.ExifIFD.DateTimeDigitized] = timeNow;
        exif[piexif.ExifIFD.LensMake] = "Meta\u0000";
        exif[piexif.ExifIFD.LensModel] = "Ray-Ban Meta Ultra-wide Camera\u0000";
        exif[piexif.ExifIFD.FNumber] = [22, 10]; // f/2.2 fixed aperture
        exif[piexif.ExifIFD.FocalLength] = [218, 100]; // 2.18mm fixed focal length
        exif[piexif.ExifIFD.FocalLengthIn35mmFilm] = 12; // 12mm equivalent
        exif[piexif.ExifIFD.ISOSpeedRatings] = 100;
        exif[piexif.ExifIFD.ExposureTime] = [1, 120];
        exif[piexif.ExifIFD.ExposureProgram] = 2; // Normal program
        exif[piexif.ExifIFD.MeteringMode] = 5; // Multi-segment
        exif[piexif.ExifIFD.ColorSpace] = 1; // sRGB

        // 3. Maker Tag & UserComment (Crucial signature checked by Instagram filters)
        exif[piexif.ExifIFD.UserComment] = "Captured with Ray-Ban Meta Smart Glasses\u0000";
        exif[piexif.ExifIFD.BodySerialNumber] = "RBM-G2-W-01\u0000";

        const exifObj = {
            "0th": zeroth,
            "Exif": exif,
            "GPS": {}
        };

        // Binary dump & strip any preexisting conflict headers
        const exifBytes = piexif.dump(exifObj);
        
        // Remove old headers and insert new Meta Ray-Ban payload directly
        const cleanBinary = piexif.remove(originalBinaryData);
        const patchedJpeg = piexif.insert(exifBytes, cleanBinary);

        // Download processed file
        const a = document.createElement('a');
        const baseName = currentFileName.replace(/\.[^/.]+$/, "");
        a.href = patchedJpeg;
        a.download = `RayBan_Meta_${baseName}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

    } catch (err) {
        console.error('Patching error:', err);
        alert('Failed to patch JPEG metadata. Make sure the file is a standard JPG.');
    }
});

resetBtn.addEventListener('click', () => {
    originalBinaryData = null;
    fileInput.value = '';
    editorArea.classList.add('hidden');
    dropZone.style.display = 'block';
});
