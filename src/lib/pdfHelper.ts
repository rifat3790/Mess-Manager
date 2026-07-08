export function oklchToRgb(l: number, c: number, h: number, a: number = 1): string {
  // Convert h to radians
  const hr = (h * Math.PI) / 180;
  const a_ = c * Math.cos(hr);
  const b_ = c * Math.sin(hr);
  
  // OKLAB to LMS
  const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = l - 0.0894841775 * a_ - 1.2914855480 * b_;
  
  // LMS to XYZ (non-linear step)
  const l_cube = l_ * l_ * l_;
  const m_cube = m_ * m_ * m_;
  const s_cube = s_ * s_ * s_;
  
  // Linear RGB from LMS cubes
  let r_lin = +4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.2309699292 * s_cube;
  let g_lin = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
  let b_lin = -0.0041960863 * l_cube - 0.7034186147 * m_cube + 1.7076147010 * s_cube;
  
  // Clamp linear RGB
  r_lin = Math.max(0, Math.min(1, r_lin));
  g_lin = Math.max(0, Math.min(1, g_lin));
  b_lin = Math.max(0, Math.min(1, b_lin));

  // Linear to sRGB
  const r = r_lin <= 0.0031308 ? 12.92 * r_lin : 1.055 * Math.pow(r_lin, 1 / 2.4) - 0.055;
  const g = g_lin <= 0.0031308 ? 12.92 * g_lin : 1.055 * Math.pow(g_lin, 1 / 2.4) - 0.055;
  const b = b_lin <= 0.0031308 ? 12.92 * b_lin : 1.055 * Math.pow(b_lin, 1 / 2.4) - 0.055;
  
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val * 255)));
  
  if (a < 1) {
    return `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${a})`;
  }
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
}

export function replaceOklchInString(cssString: string): string {
  // Regex to match oklch(L C H) or oklch(L C H / A)
  // Supports percent for L and A
  return cssString.replace(/oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+%?))?\s*\)/gi, (match, lStr, cStr, hStr, aStr) => {
    let l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
    let c = parseFloat(cStr);
    let h = parseFloat(hStr);
    let a = aStr ? (aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr)) : 1;
    
    // Fallback if NaN
    if (isNaN(l) || isNaN(c) || isNaN(h)) return match;
    if (isNaN(a)) a = 1;
    
    return oklchToRgb(l, c, h, a);
  });
}
