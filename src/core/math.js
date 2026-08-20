// Dua fungsi yang dipakai hampir semua sistem. Ditaruh sekali di sini supaya
// tidak ada tiga salinan yang perlahan berbeda satu sama lain.
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
