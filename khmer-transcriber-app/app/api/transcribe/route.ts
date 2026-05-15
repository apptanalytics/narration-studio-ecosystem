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

    // Generate Content
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Use flash for speed
    const prompt = `Transcribe this Khmer audio. Provide the full text in Khmer script. 
    Then, provide a professional English translation.
    Format your response EXACTLY as a JSON object with two fields: "khmer" and "english".
    Example: {"khmer": "សួស្តី...", "english": "Hello..."}`;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadedFile.mimeType,
          fileUri: uploadedFile.uri,
        },
      },
      { text: prompt },
    ]);

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
