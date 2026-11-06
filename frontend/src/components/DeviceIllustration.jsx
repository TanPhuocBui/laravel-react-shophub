import { useId } from 'react';

// Code-native illustrations: no dependency on external image servers or brands.
export default function DeviceIllustration({ kind, accent = '#789baf', view = 'front', label, className = '' }) {
  const id = useId().replace(/:/g, '');
  const screen = <><rect x="54" y="45" width="212" height="133" rx="5" fill="#25303c" /><rect x="61" y="52" width="198" height="118" rx="2" fill={`url(#${id}-screen)`} /><path d="M61 134c40-76 92 65 198-42v78H61Z" fill="white" opacity=".23" /><path d="M61 152c68-62 119 34 198-21v39H61Z" fill="#172d46" opacity=".35" /><circle cx="159" cy="48" r="1" fill="#acb7c6" /></>;
  let device;
  switch (kind) {
    case 'laptop': device = <>{screen}<path d="m54 178-25 27q0 7 16 7h230q16 0 16-7l-25-27Z" fill={`url(#${id}-metal)`} /><path d="m63 183-12 15h217l-12-15Z" fill="#667180" /><path d="M135 201h50l5 5h-60Z" fill="#b6bec8" /><path d="M31 206h258" stroke="#7d8795" /></>; break;
    case 'monitor': device = <>{screen}<path d="M148 178h24v30h-24z" fill="#808c99" /><path d="m125 208-17 8h104l-17-8Z" fill="#596775" /></>; break;
    case 'ssd': case 'ram': device = <><rect x="39" y="98" width="242" height="65" rx="5" fill={kind === 'ssd' ? '#226956' : '#253d42'} /><path d="M60 111h195M60 151h195" stroke="#6eaf91" strokeWidth="2" />{[0, 1, 2, 3].map((n) => <rect key={n} x={60 + n * 50} y="115" width="38" height="28" rx="2" fill="#1a252c" />)}<path d="M57 163h203v10H57Z" fill="#d8b96e" /><path d="M158 161v14" stroke="#f5f5f0" strokeWidth="4" /><text x="160" y="90" textAnchor="middle" fontSize="13" fontFamily="monospace" fill="#4f5a67">{kind === 'ssd' ? 'NVMe · 1TB' : 'DDR4 · 16GB'}</text></>; break;
    case 'keyboard': device = <><rect x="25" y="80" width="270" height="107" rx="9" fill={accent} stroke="#a9adb2" />{Array.from({ length: 5 }, (_, row) => Array.from({ length: 13 }, (_, col) => <rect key={`${row}-${col}`} x={34 + col * 20} y={90 + row * 17} width="16" height="13" rx="2" fill={col < 2 ? '#607580' : '#f0ebe0'} />))}<rect x="99" y="158" width="101" height="13" rx="2" fill="#607580" /></>; break;
    case 'mouse': device = <><path d="M107 118c0-76 106-76 106 0v50c0 65-106 65-106 0Z" fill={`url(#${id}-metal)`} stroke="#9da7b2" /><path d="M160 67v72m-52 0h104" stroke="#8c98a5" strokeWidth="2" /><rect x="155" y="92" width="10" height="23" rx="5" fill="#46505b" /></>; break;
    case 'vacuum': device = <><ellipse cx="160" cy="153" rx="103" ry="60" fill="#8c979e" /><ellipse cx="160" cy="141" rx="103" ry="63" fill={`url(#${id}-metal)`} stroke="#b3b9bb" /><ellipse cx="160" cy="130" rx="84" ry="45" fill="#f5f3ec" stroke="#d7d8d5" /><ellipse cx="160" cy="115" rx="25" ry="14" fill="#d1d4cf" /><rect x="153" y="143" width="14" height="7" rx="3" fill="#526c60" /></>; break;
    case 'kettle': device = <><path d="M211 94q63-8 34 76l-30 13" fill="none" stroke="#46545e" strokeWidth="16" /><path d="m98 93-23-12 20 44" fill="#7f949d" /><path d="M106 83h98l20 113q-64 28-135 0Z" fill={`url(#${id}-metal)`} stroke="#9ba8ac" /><path d="M114 82q42-17 82 0" fill="#40545e" stroke="#40545e" strokeWidth="10" /><path d="M93 201h128" stroke="#3e505b" strokeWidth="9" /><path d="M157 104v71" stroke="white" strokeWidth="5" opacity=".5" /></>; break;
    case 'blender': device = <><path d="M207 55q49-1 21 80h-27" fill="none" stroke="#a8b9c0" strokeWidth="9" /><path d="m116 48 13 107h65l17-107Z" fill="#cbdedb" opacity=".8" stroke="#8aa3a2" strokeWidth="2" /><path d="M110 48h104" stroke="#4b6467" strokeWidth="10" /><path d="m128 157-15 53h100l-19-53Z" fill={accent} stroke="#8ca3a3" /><circle cx="161" cy="184" r="12" fill="#f1f4f2" /><path d="M143 102h37m-40 16h30" stroke="#8aa3a2" /></>; break;
    case 'lamp': device = <><path d="M104 210h120" stroke="#726b61" strokeWidth="12" strokeLinecap="round" /><path d="M161 209V133l51-64" fill="none" stroke={accent} strokeWidth="10" /><path d="m175 56 62 40 7-43-27-18Z" fill={accent} /><path d="m175 56 62 40" stroke="#f6e2ad" strokeWidth="7" /></>; break;
    default: device = <><rect x="101" y="49" width="118" height="164" rx="34" fill={`url(#${id}-dark)`} /><rect x="114" y="70" width="92" height="38" rx="12" fill="#17252b" /><circle cx="145" cy="88" r="10" fill="#7f8d93" /><circle cx="179" cy="88" r="10" fill="#7f8d93" /><path d="M114 120h92" stroke="#92a1a9" opacity=".5" /><path d="M143 139h34v44h-34" fill="#283941" /><path d="M159 146v29" stroke="#8f9ca3" strokeWidth="8" strokeLinecap="round" /></>;
  }
  return (
    <svg className={`device-illustration ${className}`} viewBox="0 0 320 250" role="img" aria-label={label || 'Hình minh họa sản phẩm'}>
      <defs>
        <linearGradient id={`${id}-screen`} x2="1" y2="1"><stop stopColor={accent} /><stop offset="1" stopColor="#26354c" /></linearGradient>
        <linearGradient id={`${id}-metal`}><stop stopColor="#d0d5da" /><stop offset=".5" stopColor="#f1f1ed" /><stop offset="1" stopColor="#a0aab4" /></linearGradient>
        <linearGradient id={`${id}-dark`}><stop stopColor="#657983" /><stop offset="1" stopColor="#253b45" /></linearGradient>
        <filter id={`${id}-shadow`} x="-30%" width="160%" y="-100%" height="300%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <ellipse cx="160" cy="220" rx="97" ry="7" opacity=".12" filter={`url(#${id}-shadow)`} />
      <g transform={view === 'angle' ? 'translate(26 8) skewX(-9) scale(.96)' : undefined}>{device}</g>
    </svg>
  );
}
