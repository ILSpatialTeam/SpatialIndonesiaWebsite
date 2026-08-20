// Atom paling dasar: membuat elemen tanpa kerangka kerja.
//
// Semua lapisan di atas memakai satu-satunya cara ini untuk menyusun DOM, jadi
// tidak ada dua gaya penulisan yang bersaing di dalam berkas yang berbeda.
export const NS = 'http://www.w3.org/2000/svg';

export const el = (tag, attrs, kids) => {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'text') n.textContent = attrs[k];
    else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(c => c && n.appendChild(c));
  return n;
};

export const svg = (d, extra) => {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  (Array.isArray(d) ? d : [d]).forEach(spec => {
    const p = document.createElementNS(NS, typeof spec === 'string' ? 'path' : spec.t);
    if (typeof spec === 'string') p.setAttribute('d', spec);
    else for (const k in spec) if (k !== 't') p.setAttribute(k, spec[k]);
    s.appendChild(p);
  });
  if (extra) for (const k in extra) s.setAttribute(k, extra[k]);
  return s;
};
