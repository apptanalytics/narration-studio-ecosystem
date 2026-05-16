import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    // Save file temporarily
    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, `upload_${Date.now()}_${file.name}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempPath, buffer);

    console.log(`Uploading to Gemini: ${tempPath}`);

    // Upload to Gemini
    const uploadResult = await fileManager.uploadFile(tempPath, {
      mimeType: file.type || 'audio/mpeg',
      displayName: file.name,
    });

    // Wait for processing
    let uploadedFile = await fileManager.getFile(uploadResult.file.name);
    while (uploadedFile.state === 'PROCESSING') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      uploadedFile = await fileManager.getFile(uploadResult.file.name);
    }

    if (uploadedFile.state === 'FAILED') {
      throw new Error('Audio processing failed in Gemini');
    }

    // Generate Content - Using 3.1 Flash Latest
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.1,
      }
    }); 

    const prompt = `Transcribe this Khmer audio with precise, continuous timestamps. 
    Format your response EXACTLY as a JSON array of objects. 
    Each object must have: "time" (number in seconds), "khmer" (transcript), and "english" (translation).
    
    STRICT RULES:
    1. Provide a new segment at least every 10-15 seconds.
    2. The "time" must be the exact start of that segment.
    3. Maintain a perfectly valid JSON array until the very end.
    4. Do not skip any dialogue.`;

    // Generate Content with Retry Logic for 429s
    const generateWithRetry = async (retries = 3, delay = 2000) => {
      try {
        return await model.generateContent([
          {
            fileData: {
              mimeType: uploadedFile.mimeType,
              fileUri: uploadedFile.uri,
            },
          },
          { text: prompt },
        ]);
      } catch (err: any) {
        if (err.status === 429 && retries > 0) {
          console.log(`Rate limited. Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          return generateWithRetry(retries - 1, delay * 2);
        }
        throw err;
      }
    };

    const result = await generateWithRetry();

    const responseText = result.response.text();
    
    // Clean up JSON response (Gemini sometimes adds markdown blocks)
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    // Clean up temp file
    await fs.unlink(tempPath);
    // Note: Gemini files are auto-deleted after 48 hours or we could delete them manually here
    await fileManager.deleteFile(uploadedFile.name);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Transcription Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
