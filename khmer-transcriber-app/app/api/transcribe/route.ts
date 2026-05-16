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

    // Generate Content - Using your exact model ID: gemini-3.1-flash-lite
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.1-flash-lite',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.1,
      }
    }); 

    const prompt = `Transcribe this 30-minute Khmer audio with synchronized timestamps. 
    Format your response EXACTLY as a JSON array of arrays for maximum density. 
    Each inner array must be: [time_in_seconds, "khmer_transcript", "english_translation"]
    
    COMPRESSION RULES:
    1. Provide a new segment every 20-30 seconds.
    2. Use the array format: [[0, "...", "..."], [25, "...", "..."]]
    3. Do not use objects/keys like "time" or "khmer" to save space.
    4. Maintain the timeline until the end.`;

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

    let responseText = result.response.text();
    
    // JSON HEALER: If truncated, try to close it
    let jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!jsonStr.endsWith(']')) {
      // Find the last completed segment [time, "...", "..."]
      const lastBracket = jsonStr.lastIndexOf(']');
      if (lastBracket !== -1) {
        jsonStr = jsonStr.substring(0, lastBracket + 1) + ']';
      } else {
        jsonStr += ']]'; // Emergency close
      }
    }

    try {
      const rawData = JSON.parse(jsonStr);
      // Map back to our object format for the frontend
      const data = rawData.map((item: any) => ({
        time: item[0],
        khmer: item[1],
        english: item[2]
      }));
      
      await fs.unlink(tempPath);
      await fileManager.deleteFile(uploadedFile.name);
      return NextResponse.json(data);
    } catch (parseError) {
      console.error('JSON Repair Failed:', jsonStr);
      throw new Error('Failed to parse transcription. The file might be too long.');
    }
  } catch (error: any) {
    console.error('Transcription Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
