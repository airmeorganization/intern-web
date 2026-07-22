import { RECRUITABLE_KEYWORDS } from './constants/keywords.js';
import { supabase } from './supabase.js';

export async function parseResumeAndUpload(file, userId) {
    if (!file) return null;

    let text = '';

    if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ');
        }
        text = fullText;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
    } else {
        alert("Unsupported file format. Please upload PDF or DOCX.");
        return null;
    }

    // Call Gemini API
    const GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY') || 'NO_KEY_PROVIDED'; // In a real app this would be secure
    let extractedKeywords = [];

    if(GEMINI_API_KEY !== 'NO_KEY_PROVIDED') {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Analyze the following resume text and return a JSON array containing ONLY top matching skill keywords from our canonical list: ${JSON.stringify(RECRUITABLE_KEYWORDS)}. Resume text: ${text}`
                        }]
                    }]
                })
            });
            const data = await response.json();
            const responseText = data.candidates[0].content.parts[0].text;

            // Extract JSON array from response
            const match = responseText.match(/\[.*\]/s);
            if (match) {
                extractedKeywords = JSON.parse(match[0]);
            }
        } catch (e) {
            console.error("Gemini API Error:", e);
        }
    } else {
        console.warn("No Gemini API Key found. Skipping skill extraction.");
    }

    // Upload to Supabase Storage
    const filePath = `${userId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

    if (uploadError) {
        console.error("Upload error", uploadError);
        return null;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

    // Update profile
    const updateData = { resume_url: publicUrl };
    if (extractedKeywords.length > 0) {
        updateData.parsed_keywords = extractedKeywords;
    }

    await supabase.from('profiles').update(updateData).eq('id', userId);

    return { publicUrl, extractedKeywords };
}
