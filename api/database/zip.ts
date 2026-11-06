import path from 'path';
import fs from 'fs';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Check possible locations for jarves_public_html.zip
  const candidates = [
    path.join(process.cwd(), 'public', 'jarves_public_html.zip'),
    path.join(process.cwd(), 'dist', 'jarves_public_html.zip'),
    path.join(process.cwd(), 'jarves_public_html.zip'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate);
      if (stat.size > 1000) {
        res.setHeader('Content-Disposition', 'attachment; filename="jarves_public_html.zip"');
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Length', stat.size);
        const fileStream = fs.createReadStream(candidate);
        return fileStream.pipe(res);
      }
    }
  }

  // Fallback redirect to static file served at root /jarves_public_html.zip
  return res.redirect(302, '/jarves_public_html.zip');
}
