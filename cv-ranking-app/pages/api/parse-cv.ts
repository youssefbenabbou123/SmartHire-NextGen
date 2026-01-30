import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import formidable from 'formidable';

const execAsync = promisify(exec);

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers if needed
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the incoming form data
    const form = formidable({
      uploadDir: tmpdir(),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: false,
    });

    const [fields, files] = await form.parse(req);
    
    // Debug logging (remove in production)
    console.log('Form fields:', Object.keys(fields));
    console.log('Form files:', Object.keys(files));
    
    // Handle both 'file' and 'files' field names
    let fileArray: any[] = [];
    if (files.file) {
      fileArray = Array.isArray(files.file) ? files.file : [files.file];
    } else if (files.files) {
      fileArray = Array.isArray(files.files) ? files.files : [files.files];
    }

    if (fileArray.length === 0) {
      return res.status(400).json({ error: 'No file uploaded. Please select a file.' });
    }

    const uploadedFile = fileArray[0];
    if (!uploadedFile || !uploadedFile.filepath) {
      return res.status(400).json({ error: 'Invalid file upload' });
    }

    const filePath = uploadedFile.filepath;
    const originalName = uploadedFile.originalFilename || 'file';
    const fileExtension = path.extname(originalName).toLowerCase();

    let parsedCv: any = null;

    // Handle different file types
    if (fileExtension === '.json') {
      // JSON file - just read and parse
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      parsedCv = JSON.parse(fileContent);
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.pdf', '.docx', '.doc'].includes(fileExtension)) {
      // Use test_parser3.py to parse the file
      parsedCv = await parseWithTestParser3(filePath);
    } else {
      // Clean up temp file
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: `Unsupported file type: ${fileExtension}` });
    }

    // Clean up temp file
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Error deleting temp file:', e);
    }

    return res.status(200).json(parsedCv);
  } catch (error: any) {
    console.error('Parsing error:', error);
    
    // Ensure we always return JSON, not HTML
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Failed to parse CV',
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
}

async function parseWithTestParser3(filePath: string): Promise<any> {
  // Use test_parser3.py to parse the file
  const testParserPath = path.join(process.cwd(), '..', 'test_parser3.py');
  const parentDir = path.join(process.cwd(), '..');
  
  try {
    console.log(`Parsing file: ${filePath}`);
    
    // Get the original filename to check if we already have parsed data for this person
    const originalFilename = path.basename(filePath);
    
    // Run test_parser3.py with the file path
    const { stdout, stderr } = await execAsync(
      `python "${testParserPath}" "${filePath}"`,
      {
        cwd: parentDir,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      }
    );
    
    console.log('test_parser3.py output:', stdout.slice(-500));

    // test_parser3.py prints the output path like:
    // "📋 Also saved to: PersonName/PersonName_cv_output.json"
    // "📁 All files saved in directory: PersonName"
    // Parse stdout to find the exact output file
    
    let outputFile: string | null = null;
    
    // Look for the output file path in stdout
    // Pattern: "Also saved to: folder/name_cv_output.json" or similar
    const savedToMatch = stdout.match(/Also saved to:\s*(.+_cv_output\.json)/);
    if (savedToMatch) {
      const relativePath = savedToMatch[1].trim();
      outputFile = path.join(parentDir, relativePath);
    }
    
    // Fallback: look for "All files saved in directory:" and construct the path
    if (!outputFile || !fs.existsSync(outputFile)) {
      const dirMatch = stdout.match(/All files saved in directory:\s*(\S+)/);
      if (dirMatch) {
        const folderName = dirMatch[1].trim();
        outputFile = path.join(parentDir, folderName, `${folderName}_cv_output.json`);
      }
    }
    
    // Final fallback: find the most recently modified _cv_output.json
    if (!outputFile || !fs.existsSync(outputFile)) {
      console.log('Warning: Could not parse output path from stdout, searching for most recent file...');
      
      // Wait a bit for file system to sync
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const outputFiles = fs.readdirSync(parentDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.') && dirent.name !== 'node_modules' && dirent.name !== 'venv' && dirent.name !== '__pycache__' && dirent.name !== 'cv-ranking-app')
        .map(dirent => {
          const dirPath = path.join(parentDir, dirent.name);
          const possibleOutput = path.join(dirPath, `${dirent.name}_cv_output.json`);
          if (fs.existsSync(possibleOutput)) {
            return { path: possibleOutput, mtime: fs.statSync(possibleOutput).mtime };
          }
          return null;
        })
        .filter((f): f is { path: string; mtime: Date } => f !== null)
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      if (outputFiles.length > 0) {
        outputFile = outputFiles[0].path;
      }
    }
    
    if (!outputFile || !fs.existsSync(outputFile)) {
      throw new Error('No output JSON file found. test_parser3.py may have failed.');
    }
    
    console.log(`Reading output from: ${outputFile}`);
    
    // Read the output file
    const fileContent = fs.readFileSync(outputFile, 'utf-8');
    const parsedData = JSON.parse(fileContent);
    
    return parsedData;
  } catch (error: any) {
    throw new Error(`Failed to parse with test_parser3: ${error.message}`);
  }
}

async function parseImageFile(imagePath: string): Promise<any> {
  // Create a Python script that imports and uses parse_cv_image
  const parentDir = path.join(process.cwd(), '..');
  const parseScript = `
import sys
import json
import os
import io

# Set UTF-8 encoding for stdout/stderr to avoid Windows encoding issues
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add parent directory to Python path
parent_dir = r"${parentDir.replace(/\\/g, '/')}"
sys.path.insert(0, parent_dir)

from parse_cv_image import parse_cv_image

image_path = r"${imagePath.replace(/\\/g, '/').replace(/"/g, '\\"')}"

try:
    result = parse_cv_image(image_path)
    print(json.dumps(result, ensure_ascii=False))
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
`;

  const scriptPath = path.join(tmpdir(), `parse_image_${Date.now()}.py`);
  fs.writeFileSync(scriptPath, parseScript);

  try {
    // Set UTF-8 encoding for Python to avoid Windows encoding issues
    const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
    const { stdout, stderr } = await execAsync(
      `python "${scriptPath}"`,
      {
        cwd: path.join(process.cwd(), '..'),
        maxBuffer: 10 * 1024 * 1024,
        env: env,
      }
    );

    // Clean up script
    try {
      fs.unlinkSync(scriptPath);
    } catch (e) {
      console.error('Error deleting script:', e);
    }

    if (stderr && !stdout) {
      throw new Error(`Python script error: ${stderr}`);
    }

    // Parse JSON output
    try {
      return JSON.parse(stdout.trim());
    } catch (e) {
      throw new Error('Could not parse Python script output as JSON');
    }
  } catch (error: any) {
    // Clean up script on error
    try {
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    } catch (e) {
      // Ignore
    }
    throw new Error(`Failed to parse image: ${error.message}`);
  }
}

async function parsePdfFile(pdfPath: string): Promise<any> {
  // Convert PDF to image first, then parse
  const parentDir = path.join(process.cwd(), '..');
  const outputDir = tmpdir();
  const outputImagePath = path.join(outputDir, `pdf_page_${Date.now()}.png`);
  
  // Create a Python script to convert PDF to image
  const convertScript = `
import sys
import os
import io

# Set UTF-8 encoding for stdout/stderr to avoid Windows encoding issues
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add parent directory to Python path
parent_dir = r"${parentDir.replace(/\\/g, '/')}"
sys.path.insert(0, parent_dir)

# Suppress print statements from pdf_converter to avoid encoding issues
# Redirect stdout temporarily when importing and using
with open(os.devnull, 'w', encoding='utf-8') as devnull:
    old_stdout = sys.stdout
    sys.stdout = devnull
    try:
        from pdf_converter import convert_document_to_images
        from PIL import Image
    finally:
        sys.stdout = old_stdout

pdf_path = r"${pdfPath.replace(/\\/g, '/').replace(/"/g, '\\"')}"
output_path = r"${outputImagePath.replace(/\\/g, '/').replace(/"/g, '\\"')}"
output_dir = r"${outputDir.replace(/\\/g, '/').replace(/"/g, '\\"')}"

try:
    # Suppress print output during conversion
    with open(os.devnull, 'w', encoding='utf-8') as devnull:
        old_stdout = sys.stdout
        sys.stdout = devnull
        try:
            # When output_dir is provided, convert_document_to_images returns file paths (strings)
            # When output_dir is None, it returns PIL Image objects
            # With save_first_page_only=True, it returns a single path string (not a list)
            result = convert_document_to_images(pdf_path, dpi=300, output_dir=output_dir, save_first_page_only=True)
        finally:
            sys.stdout = old_stdout
    
    if result:
        # result is a string (file path) when save_first_page_only=True and output_dir is provided
        if isinstance(result, str):
            # Single file path - copy to our desired output path
            import shutil
            if os.path.exists(result):
                shutil.copy2(result, output_path)
                print(output_path)
            else:
                print(f"ERROR: Generated image file not found: {result}", file=sys.stderr)
                sys.exit(1)
        elif isinstance(result, list) and len(result) > 0:
            # List of file paths - use first one (shouldn't happen with save_first_page_only=True, but handle it)
            import shutil
            if os.path.exists(result[0]):
                shutil.copy2(result[0], output_path)
                print(output_path)
            else:
                print(f"ERROR: Generated image file not found: {result[0]}", file=sys.stderr)
                sys.exit(1)
        elif hasattr(result, 'save'):
            # It's a PIL Image object (shouldn't happen with output_dir, but handle it)
            result.save(output_path, 'PNG')
            print(output_path)
        else:
            print(f"ERROR: Unexpected result type from convert_document_to_images: {type(result)}", file=sys.stderr)
            sys.exit(1)
    else:
        print("ERROR: No images generated", file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
`;

  const scriptPath = path.join(tmpdir(), `convert_pdf_${Date.now()}.py`);
  fs.writeFileSync(scriptPath, convertScript);

  try {
    // Set UTF-8 encoding for Python to avoid Windows encoding issues
    const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
    const { stdout, stderr } = await execAsync(
      `python "${scriptPath}"`,
      {
        cwd: path.join(process.cwd(), '..'),
        maxBuffer: 10 * 1024 * 1024,
        env: env,
      }
    );

    // Clean up script
    try {
      fs.unlinkSync(scriptPath);
    } catch (e) {
      console.error('Error deleting script:', e);
    }

    if (stderr || !stdout.trim()) {
      throw new Error(`PDF conversion failed: ${stderr || 'No output'}`);
    }

    // Check if image was created
    if (fs.existsSync(outputImagePath)) {
      try {
        return await parseImageFile(outputImagePath);
      } finally {
        // Clean up converted image
        try {
          fs.unlinkSync(outputImagePath);
        } catch (e) {
          console.error('Error deleting converted image:', e);
        }
      }
    } else {
      throw new Error('PDF conversion did not produce an image file');
    }
  } catch (error: any) {
    // Clean up script on error
    try {
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    } catch (e) {
      // Ignore
    }
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
}
