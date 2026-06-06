import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    
    res.status(200).json({ 
      country_code: data.country_code,
      country_name: data.country_name
    });
  } catch (error) {
    console.error('Geolocation error:', error);
    res.status(200).json({ country_code: 'GLOBAL' });
  }
}