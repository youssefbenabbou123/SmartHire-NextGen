"""
PDF and Word Document to Image Converter
Converts PDF and Word documents to images for OCR processing
"""

import os
import sys
from pathlib import Path
from PIL import Image
import io

# Try to import PyMuPDF for PDF conversion
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

# Try to import pdf2image as alternative
try:
    from pdf2image import convert_from_path
    HAS_PDF2IMAGE = True
except ImportError:
    HAS_PDF2IMAGE = False

# Try to import python-docx for Word documents
try:
    from docx import Document
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

# Try to import docx2pdf for Word to PDF conversion
try:
    from docx2pdf import convert as docx2pdf_convert
    HAS_DOCX2PDF = True
except ImportError:
    HAS_DOCX2PDF = False


def pdf_to_images_pymupdf(pdf_path, dpi=300):
    """
    Convert PDF to images using PyMuPDF (fitz)
    
    Args:
        pdf_path: Path to PDF file
        dpi: Resolution for output images (default: 300)
    
    Returns:
        List of PIL Image objects
    """
    if not HAS_PYMUPDF:
        raise ImportError("PyMuPDF (fitz) is required. Install with: pip install pymupdf")
    
    images = []
    pdf_document = fitz.open(pdf_path)
    
    # Calculate zoom factor for desired DPI (default PDF is 72 DPI)
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    
    for page_num in range(len(pdf_document)):
        page = pdf_document[page_num]
        # Render page to image
        pix = page.get_pixmap(matrix=mat)
        # Convert to PIL Image
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        images.append(img)
    
    pdf_document.close()
    return images


def pdf_to_images_pdf2image(pdf_path, dpi=300):
    """
    Convert PDF to images using pdf2image (requires poppler)
    
    Args:
        pdf_path: Path to PDF file
        dpi: Resolution for output images (default: 300)
    
    Returns:
        List of PIL Image objects
    """
    if not HAS_PDF2IMAGE:
        raise ImportError("pdf2image is required. Install with: pip install pdf2image")
    
    try:
        images = convert_from_path(pdf_path, dpi=dpi)
        return images
    except Exception as e:
        raise RuntimeError(f"Failed to convert PDF with pdf2image. Make sure poppler is installed. Error: {e}")


def pdf_to_images(pdf_path, dpi=300, output_dir=None):
    """
    Convert PDF to images (tries PyMuPDF first, falls back to pdf2image)
    
    Args:
        pdf_path: Path to PDF file
        dpi: Resolution for output images (default: 300)
        output_dir: Optional directory to save images. If None, returns PIL Images only.
    
    Returns:
        List of PIL Image objects, or list of saved image paths if output_dir is provided
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    # Try PyMuPDF first (preferred, no external dependencies)
    if HAS_PYMUPDF:
        try:
            print(f"📄 Converting PDF to images using PyMuPDF (DPI: {dpi})...")
            images = pdf_to_images_pymupdf(str(pdf_path), dpi=dpi)
            print(f"✅ Converted {len(images)} page(s) from PDF")
        except Exception as e:
            print(f"⚠️  PyMuPDF conversion failed: {e}")
            images = None
    else:
        images = None
    
    # Fall back to pdf2image if PyMuPDF failed or not available
    if images is None and HAS_PDF2IMAGE:
        try:
            print(f"📄 Converting PDF to images using pdf2image (DPI: {dpi})...")
            images = pdf_to_images_pdf2image(str(pdf_path), dpi=dpi)
            print(f"✅ Converted {len(images)} page(s) from PDF")
        except Exception as e:
            print(f"⚠️  pdf2image conversion failed: {e}")
            images = None
    
    if images is None:
        raise RuntimeError(
            "Failed to convert PDF. Install one of:\n"
            "  - pip install pymupdf (recommended)\n"
            "  - pip install pdf2image (requires poppler)"
        )
    
    # Save images if output_dir is provided
    if output_dir:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        saved_paths = []
        
        pdf_name = pdf_path.stem
        for i, img in enumerate(images):
            output_path = output_dir / f"{pdf_name}_page_{i+1}.png"
            img.save(output_path, "PNG")
            saved_paths.append(str(output_path))
        
        return saved_paths
    
    return images


def docx_to_images(docx_path, dpi=300, output_dir=None):
    """
    Convert Word document to images
    First converts to PDF, then to images
    
    Args:
        docx_path: Path to Word document (.docx)
        dpi: Resolution for output images (default: 300)
        output_dir: Optional directory to save images
    
    Returns:
        List of PIL Image objects, or list of saved image paths if output_dir is provided
    """
    docx_path = Path(docx_path)
    if not docx_path.exists():
        raise FileNotFoundError(f"Word document not found: {docx_path}")
    
    # Strategy: Convert DOCX to PDF first, then PDF to images
    if HAS_DOCX2PDF:
        try:
            # Create temporary PDF
            temp_pdf = docx_path.with_suffix('.temp.pdf')
            print(f"📄 Converting Word document to PDF...")
            docx2pdf_convert(str(docx_path), str(temp_pdf))
            print(f"✅ Word document converted to PDF")
            
            # Convert PDF to images
            images = pdf_to_images(str(temp_pdf), dpi=dpi, output_dir=output_dir)
            
            # Clean up temporary PDF
            if temp_pdf.exists():
                temp_pdf.unlink()
            
            return images
        except Exception as e:
            raise RuntimeError(f"Failed to convert Word document: {e}")
    else:
        raise RuntimeError(
            "docx2pdf is required for Word document conversion.\n"
            "Install with: pip install docx2pdf\n"
            "Note: On Windows, this requires Microsoft Word to be installed."
        )


def convert_document_to_images(file_path, dpi=300, output_dir=None, save_first_page_only=False):
    """
    Convert a document (PDF or Word) to images
    
    Args:
        file_path: Path to PDF or Word document
        dpi: Resolution for output images (default: 300)
        output_dir: Optional directory to save images. If None, returns PIL Images.
        save_first_page_only: If True, only process the first page
    
    Returns:
        List of PIL Image objects, or list of saved image paths if output_dir is provided
        If save_first_page_only=True, returns single image or single path
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    file_ext = file_path.suffix.lower()
    
    if file_ext == '.pdf':
        images = pdf_to_images(str(file_path), dpi=dpi, output_dir=output_dir)
    elif file_ext in ['.docx', '.doc']:
        images = docx_to_images(str(file_path), dpi=dpi, output_dir=output_dir)
    else:
        raise ValueError(f"Unsupported file format: {file_ext}. Supported: .pdf, .docx, .doc")
    
    if save_first_page_only:
        return images[0] if images else None
    
    return images


def main():
    """CLI for document conversion"""
    if len(sys.argv) < 2:
        print("Usage: python pdf_converter.py <document_path> [output_dir] [--dpi DPI]")
        print("Example: python pdf_converter.py cv.pdf output_images --dpi 300")
        sys.exit(1)
    
    file_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "converted_images"
    dpi = 300
    
    # Parse DPI if provided
    if '--dpi' in sys.argv:
        dpi_idx = sys.argv.index('--dpi')
        if dpi_idx + 1 < len(sys.argv):
            dpi = int(sys.argv[dpi_idx + 1])
    
    try:
        print(f"🔄 Converting {file_path} to images...")
        saved_paths = convert_document_to_images(file_path, dpi=dpi, output_dir=output_dir)
        print(f"✅ Conversion complete! Saved {len(saved_paths)} image(s) to {output_dir}")
        for path in saved_paths:
            print(f"  - {path}")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
