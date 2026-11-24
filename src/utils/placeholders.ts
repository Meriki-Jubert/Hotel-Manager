function encodeSvg(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function createRoomPlaceholderSvg(code: string, label?: string): string {
  const safeCode = escapeXml((code || 'RM').slice(0, 6).toUpperCase());
  const safeLabel = escapeXml((label || '').slice(0, 26));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" width="400" height="160">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#064e3b"/>
        <stop offset="55%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#022c22"/>
      </linearGradient>
    </defs>
    <rect width="400" height="160" fill="url(#bg)"/>
    <circle cx="340" cy="24" r="78" fill="#10b981" fill-opacity="0.10"/>
    <circle cx="52" cy="142" r="64" fill="#c5a059" fill-opacity="0.08"/>
    <path d="M96 106h208v16H96zM112 78h176a10 10 0 0 1 10 10v18H102V88a10 10 0 0 1 10-10zM126 56h62a6 6 0 0 1 6 6v16h-74V62a6 6 0 0 1 6-6zM212 56h62a6 6 0 0 1 6 6v16h-74V62a6 6 0 0 1 6-6z" fill="#e2e8f0" fill-opacity="0.14"/>
    <text x="200" y="92" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="22" letter-spacing="4" fill="#a7f3d0" fill-opacity="0.85">${safeCode}</text>
    ${safeLabel ? `<text x="200" y="118" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="600" font-size="11" fill="#cbd5e1" fill-opacity="0.72">${safeLabel}</text>` : ''}
  </svg>`;
  return encodeSvg(svg);
}

export function createMenuPlaceholderSvg(category: string, name?: string): string {
  const safeCat = escapeXml((category || 'MENU').slice(0, 18).toUpperCase());
  const safeInitials = escapeXml(
    (name || category || 'M')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('') || 'M'
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 140" width="400" height="140">
    <defs>
      <linearGradient id="mbg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="50%" stop-color="#065f46"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="400" height="140" fill="url(#mbg)"/>
    <circle cx="330" cy="110" r="68" fill="#34d399" fill-opacity="0.10"/>
    <circle cx="200" cy="64" r="32" fill="#0f172a" fill-opacity="0.55" stroke="#10b981" stroke-opacity="0.45" stroke-width="2"/>
    <text x="200" y="72" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="20" fill="#ecfdf5">${safeInitials}</text>
    <text x="200" y="118" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="600" font-size="11" letter-spacing="2" fill="#94a3b8">${safeCat}</text>
  </svg>`;
  return encodeSvg(svg);
}

export function createAvatarPlaceholderSvg(name: string, accentHex = '#10b981'): string {
  const initials = escapeXml(
    (name || 'ST')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('') || 'ST'
  );
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(accentHex) ? accentHex : '#10b981';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
    <defs>
      <linearGradient id="abg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#064e3b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="80" height="80" rx="40" fill="url(#abg)"/>
    <circle cx="40" cy="40" r="37" fill="none" stroke="${safeColor}" stroke-opacity="0.55" stroke-width="2.5"/>
    <text x="40" y="48" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="24" fill="#f8fafc">${initials}</text>
  </svg>`;
  return encodeSvg(svg);
}
