document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('imageViewerModal');
    const modalImg = document.getElementById('modalImage') as HTMLImageElement;
    const closeBtn = document.getElementById('closeImageViewer');

    // Function to open modal
    function openModal(imgSrc: string, altText: string) {
        if (modal && modalImg) {
            // Get the high-resolution version by removing size constraints
            const fullSizeImg = imgSrc.replace('&w=800', '');
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            modalImg.src = fullSizeImg;
            modalImg.alt = altText;
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        }
    }

    // Function to close modal
    function closeModal() {
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    // Add click event to all images with image-viewer class
    document.querySelectorAll<HTMLImageElement>('img.image-viewer').forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', function() {
            openModal(this.src, this.alt);
        });
    });

    // Close modal when clicking close button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Close modal when clicking outside the image
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Close modal with escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}); 