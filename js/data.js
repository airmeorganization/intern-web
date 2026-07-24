import { supabase } from "./config.js";

export const KEYWORDS = [
  "javascript",
  "python",
  "react",
  "node.js",
  "sql",
  "marketing",
  "sales",
  "design",
  "ui",
  "ux",
  "agile",
  "aws",
  "docker",
  "machine learning",
  "data analysis",
  "vue",
  "angular",
  "svelte",
  "typescript",
  "html5",
  "css3",
  "tailwindcss",
  "sass",
  "django",
  "flask",
  "fastapi",
  "java",
  "spring boot",
  "c++",
  "c#",
  ".net",
  "ruby",
  "rails",
  "go",
  "rust",
  "php",
  "laravel",
  "swift",
  "kotlin",
  "react native",
  "flutter",
  "postgresql",
  "mysql",
  "mongodb",
  "nosql",
  "redis",
  "graphql",
  "rest api",
  "kubernetes",
  "azure",
  "gcp",
  "firebase",
  "supabase",
  "git",
  "ci/cd",
  "linux",
  "bash",
  "devops",
  "sre",
  "ui design",
  "ux design",
  "figma",
  "adobe xd",
  "sketch",
  "prototyping",
  "wireframing",
  "product management",
  "scrum",
  "kanban",
  "jira",
  "ai",
  "deep learning",
  "data science",
  "nlp",
  "llm",
  "prompt engineering",
  "tensorflow",
  "pytorch",
  "pandas",
  "numpy",
  "cybersecurity",
  "pen testing",
  "ethical hacking",
  "blockchain",
  "web3",
  "solidity",
  "smart contracts",
  "ethereum",
  "gamedev",
  "unity",
  "unreal engine",
  "ar/vr",
  "3d modeling",
  "blender",
  "qa testing",
  "jest",
  "cypress",
  "selenium",
  "hardware",
  "iot",
  "robotics",
  "seo",
  "growth hacking",
  "content creation",
  "b2b",
  "b2c",
  "finance",
  "hr",
  "operations",
];

export async function loadFeed() {
  const container = document.getElementById("feed-container");
  if (!container) return;

  container.innerHTML = '<div class="text-center p-4">Loading posts...</div>';

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, profiles(full_name, username), likes(count), comments(count)")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML =
      '<div class="text-center p-4 text-red-500">Error loading feed.</div>';
    console.error("Feed error:", error);
    return;
  }

  if (!posts || posts.length === 0) {
    container.innerHTML = '<div class="text-center p-4">No posts yet.</div>';
    return;
  }

  container.innerHTML = posts
    .map(
      (post) => `
    <div class="bg-white p-4 mb-4 border-b">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold">
          ${post.profiles?.full_name ? post.profiles.full_name.charAt(0) : "U"}
        </div>
        <div>
          <h4 class="font-bold">${post.profiles?.full_name || "Unknown"}</h4>
          <p class="text-xs text-gray-500">@${post.profiles?.username || "unknown"}</p>
        </div>
      </div>
      <p class="mb-3">${escapeHtml(post.content)}</p>
      <div class="flex gap-4 text-gray-500 text-sm">
        <span>❤️ ${post.likes[0]?.count || 0}</span>
        <span>💬 ${post.comments[0]?.count || 0}</span>
      </div>
    </div>
  `,
    )
    .join("");
}

export async function publishPost(
  userId,
  content,
  isJob = false,
  jobTitle = null,
  keywords = [],
) {
  const { data, error } = await supabase.from("posts").insert([
    {
      user_id: userId,
      content,
      is_job: isJob,
      job_title: jobTitle,
      keywords: keywords,
    },
  ]);

  if (!error && !isJob) {
    await loadFeed();
  }
  return { data, error };
}

export async function parseResumeLocally(file) {
  if (!file) return null;

  let text = "";

  try {
    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item) => item.str).join(" ");
      }
      text = fullText;
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx") ||
      file.name.endsWith(".doc")
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else {
      throw new Error("Unsupported file format");
    }

    text = text.toLowerCase();
    const matchedKeywords = KEYWORDS.filter((kw) => text.includes(kw));
    return matchedKeywords;
  } catch (err) {
    console.error("Error parsing resume:", err);
    return null;
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
