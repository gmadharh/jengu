import fs from 'fs';
import path from 'path';

// Use a file-based store instead of in-memory, because Next.js dev mode 
// often isolates the memory scope of different API routes (webpack chunks),
// meaning the agent route and ui-data route don't share `latestUiPayload`.
const PAYLOAD_FILE = path.join(process.cwd(), '.ui-payload.json');

export function setUiPayload(type: string, data: any) {
  try {
    const payload = { type, data, timestamp: Date.now() };
    fs.writeFileSync(PAYLOAD_FILE, JSON.stringify(payload));
    console.log(`UI payload written to file: type=${type}, items=${data.length}`);
  } catch (err) {
    console.error("Failed to write UI payload to file", err);
  }
}

export function getUiPayload() {
  try {
    if (fs.existsSync(PAYLOAD_FILE)) {
      const content = fs.readFileSync(PAYLOAD_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to read UI payload from file", err);
  }
  return null;
}

export async function GET() {
  const payload = getUiPayload();
  
  if (!payload || !payload.type) {
    return Response.json({ type: null, data: null });
  }

  // Clear it so it's only consumed once
  try {
    fs.unlinkSync(PAYLOAD_FILE);
  } catch (err) {
    // Ignore deletion errors
  }
  
  return Response.json(payload);
}
