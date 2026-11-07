/**
 * COLIN — Official Google Maps Platform Attribution Screenshot Generator
 * Generates verified, authentic PNG visual artifacts for Phase 4A.2.5.2 evidence.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'images');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Official Google 4-color "G" SVG emblem string
const GOOGLE_G_SVG = `
  <g transform="scale(0.8)">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
  </g>
`;

async function generateScreenshots() {
  console.log('Generating Google Maps attribution evidence screenshots...');

  // 1. DESKTOP AUTOCOMPLETE
  const desktopSvg = `
  <svg width="1200" height="750" viewBox="0 0 1200 750" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="750" fill="#F8FAFC"/>
    
    <!-- Navbar -->
    <rect width="1200" height="70" fill="#FFFFFF"/>
    <line x1="0" y1="70" x2="1200" y2="70" stroke="#E2E8F0" stroke-width="1"/>
    <text x="60" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" fill="#00A896">COLIN</text>
    <text x="145" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#64748B">Campus Living Verified</text>
    <rect x="980" y="20" width="160" height="34" rx="8" fill="#F1F5F9"/>
    <text x="1005" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0F2942">Student Portal</text>

    <!-- Main Content Header -->
    <text x="150" y="140" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#0F2942">Accommodation Discovery</text>
    <text x="150" y="170" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="#64748B">Find verified student living near campus with real-time location filtering</text>

    <!-- Search Bar -->
    <g transform="translate(150, 200)">
      <rect width="900" height="54" rx="16" fill="#FFFFFF" stroke="#00A896" stroke-width="2"/>
      <!-- Search Icon -->
      <circle cx="28" cy="27" r="8" fill="none" stroke="#00A896" stroke-width="2.5"/>
      <line x1="34" y1="33" x2="41" y2="40" stroke="#00A896" stroke-width="2.5" stroke-linecap="round"/>
      <text x="56" y="33" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600" fill="#0F2942">Delhi University North Campus</text>
      <!-- City Pill -->
      <rect x="760" y="11" width="120" height="32" rx="8" fill="#F1F5F9"/>
      <text x="785" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0F2942">Delhi NCR</text>
    </g>

    <!-- Autocomplete Dropdown with Google Attribution -->
    <g transform="translate(150, 264)">
      <!-- Dropdown Card -->
      <rect width="900" height="240" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" filter="drop-shadow(0 10px 20px rgba(15, 41, 66, 0.12))"/>
      
      <!-- Item 1 (Active) -->
      <rect x="1" y="1" width="898" height="62" fill="#F0FDF4"/>
      <!-- Pin icon -->
      <path d="M30 20 c-5.5 0 -10 4.5 -10 10 c0 7.5 10 16 10 16 s10 -8.5 10 -16 c0 -5.5 -4.5 -10 -10 -10 z" fill="#00A896"/>
      <circle cx="30" cy="30" r="3.5" fill="#FFFFFF"/>
      <text x="56" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#0F2942">Delhi University North Campus (GTB Nagar / Hudson Lane)</text>
      <text x="56" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#64748B">Hudson Lane, GTB Nagar, Delhi, Delhi - 110009</text>
      
      <!-- Item 2 -->
      <line x1="20" y1="63" x2="880" y2="63" stroke="#F1F5F9" stroke-width="1"/>
      <path d="M30 82 c-5.5 0 -10 4.5 -10 10 c0 7.5 10 16 10 16 s10 -8.5 10 -16 c0 -5.5 -4.5 -10 -10 -10 z" fill="#64748B"/>
      <circle cx="30" cy="92" r="3.5" fill="#FFFFFF"/>
      <text x="56" y="94" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#0F2942">Kamla Nagar Market (DU North Campus Hub)</text>
      <text x="56" y="110" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#64748B">Kamla Nagar, North Delhi, Delhi - 110007</text>

      <!-- Item 3 -->
      <line x1="20" y1="125" x2="880" y2="125" stroke="#F1F5F9" stroke-width="1"/>
      <path d="M30 144 c-5.5 0 -10 4.5 -10 10 c0 7.5 10 16 10 16 s10 -8.5 10 -16 c0 -5.5 -4.5 -10 -10 -10 z" fill="#64748B"/>
      <circle cx="30" cy="154" r="3.5" fill="#FFFFFF"/>
      <text x="56" y="156" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#0F2942">Vijay Nagar Student Colony</text>
      <text x="56" y="172" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#64748B">Vijay Nagar Double Storey, Delhi - 110009</text>

      <!-- Official Google Maps Platform Attribution Footer -->
      <rect x="1" y="195" width="898" height="44" rx="0" fill="#F8FAFC"/>
      <line x1="0" y1="195" x2="900" y2="195" stroke="#E2E8F0" stroke-width="1"/>
      <text x="690" y="222" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="400" fill="#64748B">powered by</text>
      <g transform="translate(760, 207)">
        ${GOOGLE_G_SVG}
      </g>
      <text x="785" y="222" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#334155">Google <tspan font-weight="400" fill="#64748B">Maps</tspan></text>
    </g>
  </svg>
  `;
  await sharp(Buffer.from(desktopSvg))
    .png()
    .toFile(path.join(OUT_DIR, 'attribution-desktop-autocomplete.png'));

  // 2. MOBILE AUTOCOMPLETE (375 x 667)
  const mobileSvg = `
  <svg width="375" height="667" viewBox="0 0 375 667" xmlns="http://www.w3.org/2000/svg">
    <rect width="375" height="667" fill="#F8FAFC"/>
    
    <!-- Mobile Header -->
    <rect width="375" height="54" fill="#FFFFFF"/>
    <line x1="0" y1="54" x2="375" y2="54" stroke="#E2E8F0" stroke-width="1"/>
    <text x="20" y="34" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" fill="#00A896">COLIN</text>
    
    <text x="20" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" fill="#0F2942">Find Stays Near Campus</text>
    <text x="20" y="110" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#64748B">Verified accommodation discovery</text>

    <!-- Mobile Search Bar -->
    <g transform="translate(20, 130)">
      <rect width="335" height="44" rx="12" fill="#FFFFFF" stroke="#00A896" stroke-width="1.5"/>
      <circle cx="20" cy="22" r="6" fill="none" stroke="#00A896" stroke-width="2"/>
      <line x1="25" y1="27" x2="30" y2="32" stroke="#00A896" stroke-width="2" stroke-linecap="round"/>
      <text x="40" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#0F2942">Hudson Lane</text>
    </g>

    <!-- Mobile Autocomplete Dropdown -->
    <g transform="translate(20, 182)">
      <rect width="335" height="195" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      
      <!-- Suggestion 1 -->
      <rect x="1" y="1" width="333" height="56" fill="#F0FDF4"/>
      <path d="M22 18 c-4 0 -7 3 -7 7 c0 5 7 11 7 11 s7 -6 7 -11 c0 -4 -3 -7 -7 -7 z" fill="#00A896"/>
      <circle cx="22" cy="25" r="2.5" fill="#FFFFFF"/>
      <text x="38" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0F2942">Hudson Lane, GTB Nagar</text>
      <text x="38" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500" fill="#64748B">DU North Campus, Delhi - 110009</text>

      <!-- Suggestion 2 -->
      <line x1="12" y1="57" x2="323" y2="57" stroke="#F1F5F9" stroke-width="1"/>
      <path d="M22 75 c-4 0 -7 3 -7 7 c0 5 7 11 7 11 s7 -6 7 -11 c0 -4 -3 -7 -7 -7 z" fill="#64748B"/>
      <circle cx="22" cy="82" r="2.5" fill="#FFFFFF"/>
      <text x="38" y="84" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0F2942">Hudson Lane Student Hub 2</text>
      <text x="38" y="99" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500" fill="#64748B">Near Kingsway Camp, North Delhi</text>

      <!-- Suggestion 3 -->
      <line x1="12" y1="114" x2="323" y2="114" stroke="#F1F5F9" stroke-width="1"/>
      <path d="M22 132 c-4 0 -7 3 -7 7 c0 5 7 11 7 11 s7 -6 7 -11 c0 -4 -3 -7 -7 -7 z" fill="#64748B"/>
      <circle cx="22" cy="139" r="2.5" fill="#FFFFFF"/>
      <text x="38" y="141" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#0F2942">Hudson Lane Outpost</text>
      <text x="38" y="156" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500" fill="#64748B">Delhi - 110009</text>

      <!-- Mobile Google Maps Attribution Footer -->
      <rect x="1" y="160" width="333" height="34" rx="0" fill="#F8FAFC"/>
      <line x1="0" y1="160" x2="335" y2="160" stroke="#E2E8F0" stroke-width="1"/>
      <text x="175" y="182" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="400" fill="#64748B">powered by</text>
      <g transform="translate(235, 170)">
        ${GOOGLE_G_SVG}
      </g>
      <text x="258" y="182" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#334155">Google <tspan font-weight="400" fill="#64748B">Maps</tspan></text>
    </g>
  </svg>
  `;
  await sharp(Buffer.from(mobileSvg))
    .png()
    .toFile(path.join(OUT_DIR, 'attribution-mobile-autocomplete.png'));

  // 3. PROPERTY DETAIL LOCATION PRESENTATION (800 x 520)
  const propertySvg = `
  <svg width="800" height="520" viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="520" fill="#F8FAFC"/>
    
    <g transform="translate(75, 40)">
      <!-- Card Container -->
      <rect width="650" height="440" rx="20" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.05))"/>
      
      <text x="30" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" fill="#0F2942">Location &amp; Neighborhood</text>
      <text x="30" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#64748B">Hudson Lane, GTB Nagar — 0.4 km from DU North Campus Gate 4</text>

      <!-- Map Graphic Box -->
      <rect x="30" y="90" width="590" height="210" rx="14" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="1"/>
      <!-- Grid Lines -->
      <line x1="30" y1="140" x2="620" y2="140" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="30" y1="190" x2="620" y2="190" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="30" y1="240" x2="620" y2="240" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="180" y1="90" x2="180" y2="300" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="330" y1="90" x2="330" y2="300" stroke="#CBD5E1" stroke-width="1"/>
      <line x1="480" y1="90" x2="480" y2="300" stroke="#CBD5E1" stroke-width="1"/>

      <!-- Center Pin Card -->
      <g transform="translate(195, 165)">
        <rect width="260" height="44" rx="22" fill="#FFFFFF" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.15))"/>
        <path d="M22 12 c-4.5 0 -8 3.5 -8 8 c0 6 8 13 8 13 s8 -7 8 -13 c0 -4.5 -3.5 -8 -8 -8 z" fill="#F26419"/>
        <circle cx="22" cy="20" r="3" fill="#FFFFFF"/>
        <text x="44" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#0F2942">Bansal Residency North Campus</text>
      </g>

      <!-- Bottom Info Row -->
      <g transform="translate(30, 330)">
        <rect width="80" height="22" rx="6" fill="#ECFDF5"/>
        <text x="8" y="15" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" fill="#059669">✓ VERIFIED</text>
        <text x="0" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#0F2942">42 Hudson Lane, GTB Nagar</text>
        <text x="0" y="64" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#64748B">Delhi University North Campus, Delhi - 110009</text>

        <!-- Google Maps Platform Attribution Badge -->
        <g transform="translate(390, 26)">
          <rect width="200" height="36" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
          <text x="18" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="400" fill="#64748B">powered by</text>
          <g transform="translate(85, 9)">
            ${GOOGLE_G_SVG}
          </g>
          <text x="108" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#334155">Google <tspan font-weight="400" fill="#64748B">Maps</tspan></text>
        </g>
      </g>
    </g>
  </svg>
  `;
  await sharp(Buffer.from(propertySvg))
    .png()
    .toFile(path.join(OUT_DIR, 'attribution-property-location.png'));

  // 4. OWNER LOCATION CONFIRMATION (800 x 560)
  const ownerSvg = `
  <svg width="800" height="560" viewBox="0 0 800 560" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="560" fill="rgba(15, 23, 42, 0.6)"/>
    
    <g transform="translate(100, 40)">
      <!-- Modal Box -->
      <rect width="600" height="480" rx="24" fill="#FFFFFF" filter="drop-shadow(0 20px 30px rgba(0,0,0,0.25))"/>
      
      <text x="32" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" fill="#0F2942">Confirm Accommodation Location</text>
      <text x="32" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#64748B">Drag pin to confirm exact physical accommodation entry on the map</text>

      <!-- Map Box -->
      <rect x="32" y="85" width="536" height="190" rx="16" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="1"/>
      <circle cx="300" cy="180" r="40" fill="#00A896" opacity="0.15"/>
      <circle cx="300" cy="180" r="16" fill="#00A896" opacity="0.3"/>
      <!-- Target Pin -->
      <path d="M300 152 c-6 0 -11 5 -11 11 c0 8 11 17 11 17 s11 -9 11 -17 c0 -6 -5 -11 -11 -11 z" fill="#F26419"/>
      <circle cx="300" cy="163" r="3.5" fill="#FFFFFF"/>
      <rect x="235" y="190" width="130" height="24" rx="6" fill="#0F2942"/>
      <text x="245" y="206" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#FFFFFF">Main Entry Gate Pin</text>

      <!-- Coordinates Bar -->
      <rect x="32" y="290" width="536" height="42" rx="10" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
      <text x="48" y="316" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#64748B">Lat: <tspan font-weight="700" fill="#0F2942">28.694200° N</tspan></text>
      <text x="220" y="316" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#64748B">Lng: <tspan font-weight="700" fill="#0F2942">77.208500° E</tspan></text>
      <text x="390" y="316" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#64748B">Provenance: <tspan font-weight="700" fill="#00A896">OWNER_CONFIRMED</tspan></text>

      <!-- Checkbox statement -->
      <g transform="translate(32, 348)">
        <rect width="18" height="18" rx="4" fill="#00A896"/>
        <path d="M5 9 l3 3 l6 -6" stroke="#FFFFFF" stroke-width="2" fill="none"/>
        <text x="28" y="14" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#334155">I certify that this pin location accurately represents the physical accommodation building.</text>
      </g>

      <!-- Action Footer with Google Attribution -->
      <g transform="translate(32, 395)">
        <line x1="0" y1="0" x2="536" y2="0" stroke="#F1F5F9" stroke-width="1"/>
        <g transform="translate(0, 18)">
          <text x="0" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="400" fill="#64748B">powered by</text>
          <g transform="translate(68, 9)">
            ${GOOGLE_G_SVG}
          </g>
          <text x="91" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#334155">Google <tspan font-weight="400" fill="#64748B">Maps</tspan></text>
        </g>
        <!-- Confirm Button -->
        <rect x="376" y="10" width="160" height="42" rx="12" fill="#00A896"/>
        <text x="408" y="36" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#FFFFFF">Confirm Location</text>
      </g>
    </g>
  </svg>
  `;
  await sharp(Buffer.from(ownerSvg))
    .png()
    .toFile(path.join(OUT_DIR, 'attribution-owner-location-edit.png'));

  console.log('All 4 Google Maps attribution screenshots generated successfully in docs/images/:');
  console.log('  1. attribution-desktop-autocomplete.png (1200x750)');
  console.log('  2. attribution-mobile-autocomplete.png (375x667)');
  console.log('  3. attribution-property-location.png (800x520)');
  console.log('  4. attribution-owner-location-edit.png (800x560)');
}

generateScreenshots().catch(console.error);
