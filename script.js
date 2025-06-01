// script.js
let net = null;
const imageUpload = document.getElementById('imageUpload');
const dropArea = document.getElementById('dropArea');
const browseBtn = document.getElementById('browseBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const downloadBtn = document.getElementById('downloadBtn');
const newImageBtn = document.getElementById('newImageBtn');
const progressBar = document.querySelector('.progress-bar');
const progress = document.querySelector('.progress');
const resultsSection = document.querySelector('.results-section');

// Initialize BodyPix model
async function loadBodyPix() {
    try {
        net = await bodyPix.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            multiplier: 0.75,
            quantBytes: 2
        });
    } catch (error) {
        alert('Failed to load the AI model. Please try again.');
        console.error('Error loading BodyPix:', error);
    }
}

// Handle file processing
async function handleImage(file) {
    if (!file || !file.type.match('image.*')) {
        alert('Please select a valid image file (JPG, PNG or WebP)');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
    }
    
    showLoading(true);
    
    try {
        const img = await createImageBitmap(file);
        const { width, height } = img;
        
        // Setup canvases
        originalCanvas.width = resultCanvas.width = width;
        originalCanvas.height = resultCanvas.height = height;
        
        // Draw original image
        const originalCtx = originalCanvas.getContext('2d');
        originalCtx.drawImage(img, 0, 0, width, height);
        
        // Process and remove background
        await removeBackground(img);
        
        // Show results
        showResults(true);
        downloadBtn.disabled = false;
    } catch (error) {
        alert('Error processing image: ' + error.message);
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// Background removal using BodyPix
async function removeBackground(img) {
    if (!net) await loadBodyPix();
    
    const segmentation = await net.segmentPerson(img, {
        flipHorizontal: false,
        internalResolution: 'medium',
        segmentationThreshold: 0.7
    });
    
    const { width, height } = img;
    const resultCtx = resultCanvas.getContext('2d');
    
    // Draw original image to result
    resultCtx.drawImage(img, 0, 0, width, height);
    
    // Get image data to modify
    const imageData = resultCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const backgroundTransparent = true;
    
    // Apply mask to remove background
    for (let i = 0; i < data.length; i += 4) {
        const idx = i / 4;
        const pixY = Math.floor(idx / width);
        const pixX = idx % width;
        
        // Check if pixel is part of the person
        if (segmentation.data[idx] === 0) {
            if (backgroundTransparent) {
                // Set alpha to 0 for transparent background
                data[i + 3] = 0;
            }
        }
    }
    
    resultCtx.putImageData(imageData, 0, 0);
}

// Handle file drop
dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('drag-over');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('drag-over');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
        handleImage(e.dataTransfer.files[0]);
    }
});

// Open file dialog when browse text is clicked
browseBtn.addEventListener('click', () => {
    imageUpload.click();
});

// Handle manual file selection
imageUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleImage(e.target.files[0]);
    }
});

// Download result image
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'background-removed.png';
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
});

// Reset for new image
newImageBtn.addEventListener('click', () => {
    showResults(false);
    imageUpload.value = '';
    originalCanvas.getContext('2d').clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    resultCanvas.getContext('2d').clearRect(0, 0, resultCanvas.width, resultCanvas.height);
});

// Show loading state
function showLoading(show) {
    if (show) {
        progress.style.display = 'block';
        let progress = 0;
        const interval = setInterval(() => {
            progress = Math.min(progress + Math.random() * 10, 90);
            progressBar.style.width = `${progress}%`;
        }, 200);
        
        return () => {
            clearInterval(interval);
            progressBar.style.width = '100%';
            setTimeout(() => {
                progress.style.display = 'none';
                progressBar.style.width = '0';
            }, 300);
        };
    } else {
        progress.style.display = 'none';
        progressBar.style.width = '0';
    }
}

// Toggle results section
function showResults(show) {
    if (show) {
        resultsSection.classList.add('active');
    } else {
        resultsSection.classList.remove('active');
    }
}

// Initialize loading model when page starts
loadBodyPix().catch(console.error);

// User feedback for drag area
dropArea.addEventListener('click', () => {
    imageUpload.click();
});
