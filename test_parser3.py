"""
Test CV Parser 3 - ORIGINAL VERSION (Unoptimized)
This script uses the original Mistral AI configuration for comparison.
Supports images (PNG, JPG), PDF files, and Word documents (.docx, .doc).
Usage: python test_parser3.py [file_path]
"""

import sys
import json
import os
import re
import time
from pathlib import Path
from PIL import Image
import pytesseract
from datetime import datetime
import tempfile
import shutil

# Import PDF converter
try:
    from pdf_converter import convert_document_to_images
    HAS_PDF_CONVERTER = True
except ImportError:
    HAS_PDF_CONVERTER = False
    print("⚠️  Warning: pdf_converter module not found. PDF/Word conversion will not be available.")

# Try to import Ollama for Mistral
try:
    import ollama
    HAS_OLLAMA = True
except ImportError:
    HAS_OLLAMA = False
    print("❌ Error: ollama package is required. Install with: pip install ollama")
    sys.exit(1)


def sanitize_filename(name):
    """Convert a name to a safe filename
    
    Args:
        name: Person's name (string)
    
    Returns:
        Sanitized filename-safe string
    """
    if not name:
        return "unknown"
    
    # Remove special characters, keep only alphanumeric, spaces, hyphens, and underscores
    # Replace spaces with underscores
    sanitized = re.sub(r'[^\w\s-]', '', str(name))
    sanitized = re.sub(r'[-\s]+', '_', sanitized)
    sanitized = sanitized.strip('_')
    
    # Limit length
    if len(sanitized) > 50:
        sanitized = sanitized[:50]
    
    # If empty after sanitization, use default
    if not sanitized:
        return "unknown"
    
    return sanitized


def clean_json_string(json_str: str) -> str:
    """
    Clean JSON string by removing trailing commas and other common JSON issues.
    Handles trailing commas before closing braces/brackets in various formats.
    """
    # Remove trailing commas before closing braces and brackets
    # Handle: ,} , ] with any whitespace
    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
    
    # Remove trailing commas at end of lines before closing braces/brackets
    json_str = re.sub(r',\s*\n\s*([}\]])', r'\n\1', json_str)
    
    # Remove trailing commas in multiline objects/arrays
    json_str = re.sub(r',(\s*\n\s*[}\]])', r'\1', json_str)
    
    # Try to extract JSON object/array if there's extra text
    json_match = re.search(r'\{[\s\S]*\}|\[[\s\S]*\]', json_str)
    if json_match:
        json_str = json_match.group(0)
    
    return json_str.strip()

def get_cleaned_layout_text(image_path_or_image):
    """Extract cleaned layout-preserved OCR text from image
    
    Args:
        image_path_or_image: Path to image file (str) or PIL Image object
    """
    if isinstance(image_path_or_image, (str, Path)):
        img = Image.open(image_path_or_image)
    else:
        img = image_path_or_image
    
    # Get OCR text with layout preserved (default PSM, no config)
    layout_text = pytesseract.image_to_string(img, lang="fra+eng")
    # Clean the text (same cleaning as parse_cv_image.py)
    layout_text_clean = layout_text.replace("\\n", "\n").replace("\r", "")
    return layout_text_clean


def parse_with_mistral_raw(ocr_text: str, model_name: str = "mistral") -> dict:
    """
    Parse CV text using Mistral AI directly - ORIGINAL VERSION (unoptimized)
    
    Args:
        ocr_text: Raw OCR text from CV image
        model_name: Ollama model name (default: "mistral")
    
    Returns:
        Dictionary with parsed CV data directly from Mistral
    """
    
    # Truncate text if too long (keep within token limits) - ORIGINAL VERSION
    max_length = 8000  # Original value
    if len(ocr_text) > max_length:
        ocr_text = ocr_text[:max_length] + "..."
    
    # ORIGINAL full prompt (unoptimized)
    prompt = f"""You are a CV parser assistant. Extract structured data from the following OCR-extracted CV text.

The OCR text may contain typos and formatting issues. Correct them and extract the following information:

1. **Personal Info**: full_name, location, emails (array), phone, social_handles (array)
2. **Education**: array of objects with degree, institution, location, period, field (optional), option (optional), year (optional)
3. **Experience**: array of objects with period, duration, company, role, description, technologies (array)
4. **Projects**: array of objects with title, type (optional), description, technologies (array)
5. **Skills**: object with arrays: programming_languages, frameworks, web_technologies, mobile_technologies, databases, devops_tools, data_science, modeling_design, soft_skills
6. **Languages**: array of objects with language and level
7. **Certifications**: array of strings
8. **Interests**: array of strings (hobbies/interests)

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting, no code fences
- Fix OCR typos (e.g., "Frangais" → "Français", "Anglai" → "Anglais", "Node,js" → "Node.js", "C+4" → "C++")
- Use null for missing fields, empty arrays [] for missing lists
- Be accurate - if information is not clearly present, use null or empty arrays
- WARNING: MAKE SURE THAT IF I GIVE U SAME CV TWICE, YOU SHOULD RETURN THE SAME JSON OUTPUT, LITERALLY THE SAME , THE OCR TEXT IS THE SAME, THE JSON OUTPUT SHOULD BE THE SAME, THE ONLY DIFFERENCE IS THE TIME OF THE PARSING, BUT THE JSON OUTPUT SHOULD BE THE SAME.

OCR Text:
{ocr_text}

Return valid JSON matching this structure:
{{
  "personal_info": {{"full_name": null, "location": null, "emails": [], "phone": null, "social_handles": []}},
  "education": [],
  "experience": [],
  "projects": [],
  "skills": {{
    "programming_languages": [],
    "frameworks": [],
    "web_technologies": [],
    "mobile_technologies": [],
    "databases": [],
    "devops_tools": [],
    "data_science": [],
    "modeling_design": [],
    "soft_skills": []
  }},
  "languages_spoken": [],
  "certifications": [],
  "interests": []
}}
"""
    
    try:
        # Call Ollama API - ORIGINAL VERSION (unoptimized)
        print("⏳ Calling Mistral AI...")
        response = ollama.chat(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are a JSON extraction assistant. Always return valid JSON only, no explanations, no markdown."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            options={
                "temperature": 0.1,  # Low temperature for more consistent output
                "num_predict": 2000,  # Optimized: 2000 tokens is sufficient for CV parsing (reduces time from 55s to ~25s)
                "top_p": 0.9,  # Nucleus sampling for faster inference
            }
        )
        
        # Extract JSON from response
        response_text = response['message']['content'].strip()
        
        # Remove markdown code fences if present
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Clean up JSON - remove trailing commas
        response_text = clean_json_string(response_text)
        
        # Parse JSON
        result = json.loads(response_text)
        
        return result
        
    except json.JSONDecodeError as e:
        print(f"❌ Error: Failed to parse JSON from Mistral response: {e}", file=sys.stderr)
        print(f"Response was: {response_text[:500]}...", file=sys.stderr)
        raise
    except Exception as e:
        print(f"❌ Error calling Ollama/Mistral: {e}", file=sys.stderr)
        raise


def main():
    # Start timing
    start_time = time.time()
    
    # Get file path from command line or use default
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        # Default to image.png if it exists, or try PDF files
        if os.path.exists("image2.png"):
            file_path = "image2.png"
        elif os.path.exists("image.png"):
            file_path = "image.png"
        elif os.path.exists("cv1.pdf"):
            file_path = "cv1.pdf"
        elif os.path.exists("cv2.pdf"):
            file_path = "cv2.pdf"
        elif os.path.exists("cv3.pdf"):
            file_path = "cv3.pdf"
        else:
            print("❌ Error: No file specified and no default file found.")
            print("Usage: python test_parser3.py [file_path]")
            print("Example: python test_parser3.py image.png")
            print("Example: python test_parser3.py cv.pdf")
            print("Example: python test_parser3.py cv.docx")
            sys.exit(1)
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"❌ Error: File not found: {file_path}")
        sys.exit(1)
    
    file_path = Path(file_path)
    file_ext = file_path.suffix.lower()
    
    print("=" * 70)
    print("CV Parser Test 3 - ORIGINAL VERSION (Unoptimized)")
    print("=" * 70)
    print(f"📄 Input file: {file_path}")
    print()
    
    # Temporary directory for converted images (if needed)
    temp_dir = None
    image_to_process = None
    
    # Initialize timing variables
    conversion_time = 0
    ocr_time = 0
    mistral_time = 0
    
    try:
        # Step 0: Convert PDF/Word to image if needed
        if file_ext in ['.pdf', '.docx', '.doc']:
            if not HAS_PDF_CONVERTER:
                print("❌ Error: PDF/Word conversion requires pdf_converter module.")
                print("Make sure pdf_converter.py is in the same directory.")
                sys.exit(1)
            
            print(f"📄 Detected {file_ext.upper()} file. Converting to image...")
            conversion_start = time.time()
            temp_dir = tempfile.mkdtemp(prefix="cv_parser_")
            
            # Convert document to images (get first page only for CVs)
            images = convert_document_to_images(
                str(file_path), 
                dpi=300, 
                output_dir=temp_dir,
                save_first_page_only=False
            )
            
            if not images:
                print("❌ Error: Failed to convert document to images.")
                sys.exit(1)
            
            # Use first page for CV parsing (most CVs are single page)
            if isinstance(images, list):
                if len(images) > 0:
                    image_to_process = images[0]
                    if len(images) > 1:
                        print(f"ℹ️  Document has {len(images)} pages. Processing first page only.")
                else:
                    print("❌ Error: No pages found in document.")
                    sys.exit(1)
            else:
                image_to_process = images
            
            conversion_time = time.time() - conversion_start
            print(f"✅ Converted to image: {image_to_process if isinstance(image_to_process, str) else 'PIL Image'} ({conversion_time:.2f}s)")
            print()
        elif file_ext in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.gif']:
            # Direct image file
            image_to_process = str(file_path)
        else:
            print(f"❌ Error: Unsupported file format: {file_ext}")
            print("Supported formats: .png, .jpg, .jpeg, .pdf, .docx, .doc")
            sys.exit(1)
        
        # Step 1: Extract cleaned layout-preserved OCR text
        print("⏳ Extracting cleaned layout-preserved OCR text...")
        ocr_start = time.time()
        cleaned_layout_text = get_cleaned_layout_text(image_to_process)
        ocr_time = time.time() - ocr_start
        print(f"✅ OCR extracted: {len(cleaned_layout_text)} characters ({ocr_time:.2f}s)")
        print()
        
        # Step 2: Send cleaned layout text directly to Mistral
        print("⏳ Parsing with Mistral AI (cleaned layout text)...")
        mistral_start = time.time()
        mistral_result = parse_with_mistral_raw(cleaned_layout_text, model_name="mistral")
        mistral_time = time.time() - mistral_start
        print(f"✅ Mistral parsing complete! ({mistral_time:.2f}s)")
        print()
        
        # Extract person's name for filename and directory
        personal_info = mistral_result.get('personal_info', {})
        person_name = personal_info.get('full_name', None)
        safe_name = sanitize_filename(person_name)
        
        # Create directory for this person's CV files
        person_dir = Path(safe_name)
        person_dir.mkdir(exist_ok=True)
        
        # Generate output filename with person's name and timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = person_dir / f"{safe_name}_cv_parsed_{timestamp}.json"
        raw_text_file = person_dir / f"{safe_name}_cv_text_{timestamp}.txt"
        
        # Save Mistral result (pure output, no transformation)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(mistral_result, f, indent=2, ensure_ascii=False)
        
        # Save cleaned layout text for reference
        with open(raw_text_file, "w", encoding="utf-8") as f:
            f.write("=" * 70 + "\n")
            f.write("CLEANED LAYOUT TEXT SENT TO MISTRAL\n")
            f.write("=" * 70 + "\n\n")
            f.write(cleaned_layout_text)
        
        print("=" * 70)
        print("📊 MISTRAL PARSING RESULTS (PURE OUTPUT)")
        print("=" * 70)
        
        # Display summary
        personal_info = mistral_result.get('personal_info', {})
        print(f"Name: {personal_info.get('full_name', 'Not found')}")
        print(f"Email: {', '.join(personal_info.get('emails', [])) or 'Not found'}")
        print(f"Phone: {personal_info.get('phone', 'Not found')}")
        print(f"Location: {personal_info.get('location', 'Not found')}")
        
        education = mistral_result.get('education', [])
        experience = mistral_result.get('experience', [])
        projects = mistral_result.get('projects', [])
        skills = mistral_result.get('skills', {})
        languages = mistral_result.get('languages_spoken', [])
        certifications = mistral_result.get('certifications', [])
        
        print(f"Education: {len(education)} entries")
        print(f"Experience: {len(experience)} entries")
        print(f"Projects: {len(projects)} entries")
        print(f"Languages: {len(languages)} entries")
        print(f"Certifications: {len(certifications)} entries")
        
        # Show technical skills count
        total_tech_skills = (
            len(skills.get('programming_languages', [])) +
            len(skills.get('frameworks', [])) +
            len(skills.get('web_technologies', [])) +
            len(skills.get('mobile_technologies', [])) +
            len(skills.get('databases', [])) +
            len(skills.get('devops_tools', [])) +
            len(skills.get('data_science', [])) +
            len(skills.get('modeling_design', []))
        )
        print(f"Technical Skills: {total_tech_skills} total")
        print(f"Soft Skills: {len(skills.get('soft_skills', []))} total")
        print()
        
        # Show some programming languages if available
        prog_langs = skills.get('programming_languages', [])
        if prog_langs:
            print("Programming Languages:")
            for skill in prog_langs[:10]:
                print(f"  • {skill}")
            if len(prog_langs) > 10:
                print(f"  ... and {len(prog_langs) - 10} more")
            print()
        
        print("=" * 70)
        print(f"💾 Mistral output saved to: {output_file}")
        print(f"📄 Cleaned layout text saved to: {raw_text_file}")
        print("=" * 70)
        
        # Also save to standard filename with person's name for easy access (in same directory)
        standard_output_file = person_dir / f"{safe_name}_cv_output.json"
        standard_text_file = person_dir / f"{safe_name}_cv_text.txt"
        
        with open(standard_output_file, "w", encoding="utf-8") as f:
            json.dump(mistral_result, f, indent=2, ensure_ascii=False)
        print(f"📋 Also saved to: {standard_output_file}")
        
        with open(standard_text_file, "w", encoding="utf-8") as f:
            f.write("=" * 70 + "\n")
            f.write("CLEANED LAYOUT TEXT SENT TO MISTRAL\n")
            f.write("=" * 70 + "\n\n")
            f.write(cleaned_layout_text)
        print(f"📄 Cleaned layout text also saved to: {standard_text_file}")
        print(f"📁 All files saved in directory: {person_dir}")
        print()
        
        # Calculate and display total processing time
        total_time = time.time() - start_time
        print("=" * 70)
        print("⏱️  PROCESSING TIME SUMMARY")
        print("=" * 70)
        if conversion_time > 0:
            print(f"📄 Document conversion: {conversion_time:.2f}s")
        print(f"🔍 OCR extraction: {ocr_time:.2f}s")
        print(f"🤖 Mistral AI parsing: {mistral_time:.2f}s")
        print(f"💾 File saving: {total_time - conversion_time - ocr_time - mistral_time:.2f}s")
        print("-" * 70)
        print(f"⏱️  Total processing time: {total_time:.2f}s ({total_time/60:.2f} minutes)")
        print("=" * 70)
        print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Clean up temporary directory
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except Exception as e:
                print(f"⚠️  Warning: Could not clean up temp directory {temp_dir}: {e}")


if __name__ == "__main__":
    main()
