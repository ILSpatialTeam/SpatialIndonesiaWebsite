// Atom: satu kosakata ikon garis untuk seluruh antarmuka.
//
// Semuanya digambar dengan `currentColor`, jadi warnanya selalu datang dari
// komponen yang memakainya — bukan dipatok di sini.
import { svg } from './el.js';

export const ICON = {
  // kacamata VR, bukan kotak membulat yang tidak berarti apa-apa
  vr: ['M2.6 9.4h18.8c.7 0 1.2.5 1.2 1.2v3.6c0 1.5-1.2 2.7-2.7 2.7h-2.8c-.7 0-1.4-.4-1.8-1l-1-1.5c-.6-.9-2-.9-2.6 0l-1 1.5c-.4.6-1 1-1.8 1H6.1c-1.5 0-2.7-1.2-2.7-2.7v-3.6c0-.7.5-1.2 1.2-1.2Z'],
  // permukaan ruangan dengan objek yang ditempatkan di atasnya
  ar: ['M3 16.5 12 21l9-4.5', 'M12 3 5.5 6.6 12 10.2l6.5-3.6L12 3Z', 'M5.5 6.6v5.2L12 15.4l6.5-3.6V6.6', 'M12 10.2v5.2'],
  meteor: [{ t: 'circle', cx: 15.5, cy: 8.5, r: 3.4 }, 'M11 12.6 3.5 20.5', 'M13.6 14.4 8.8 19.6', 'M8.6 10.9 3.9 16'],
  sky: [{ t: 'circle', cx: 5, cy: 7, r: 1.3 }, { t: 'circle', cx: 12, cy: 4.5, r: 1.3 }, { t: 'circle', cx: 18.5, cy: 9, r: 1.3 }, { t: 'circle', cx: 9, cy: 13.5, r: 1.3 }, { t: 'circle', cx: 15, cy: 19, r: 1.3 }, 'M5 7 12 4.5l6.5 4.5M12 4.5 9 13.5l6 5.5 3.5-10'],
  info: [{ t: 'circle', cx: 12, cy: 12, r: 9 }, 'M12 11v5.5', { t: 'circle', cx: 12, cy: 7.8, r: 1 }],
  focus: ['M4 9V5.5C4 4.7 4.7 4 5.5 4H9', 'M15 4h3.5c.8 0 1.5.7 1.5 1.5V9', 'M20 15v3.5c0 .8-.7 1.5-1.5 1.5H15', 'M9 20H5.5C4.7 20 4 19.3 4 18.5V15', { t: 'circle', cx: 12, cy: 12, r: 2.6 }],
  full: ['M9 4H5.5C4.7 4 4 4.7 4 5.5V9', 'M15 4h3.5c.8 0 1.5.7 1.5 1.5V9', 'M20 15v3.5c0 .8-.7 1.5-1.5 1.5H15', 'M9 20H5.5C4.7 20 4 19.3 4 18.5V15'],
  trails: ['M3 19c4.5 0 6.5-3 9-7.5S17.5 4 21 4', 'M3 13.5c3 0 4.6-2 6.4-5', { t: 'circle', cx: 21, cy: 4, r: 1.6 }, { t: 'circle', cx: 9.4, cy: 8.5, r: 1.2 }],
  audio: ['M4 9.5h3.2L12 5.5v13l-4.8-4H4z', 'M16.2 9.2a4 4 0 0 1 0 5.6', 'M18.8 6.6a7.6 7.6 0 0 1 0 10.8'],
  card: [{ t: 'rect', x: 2.6, y: 5, width: 18.8, height: 14, rx: 2.2 }, 'M2.6 15.4 8 10.6l4.2 3.6 3.2-2.6 6 5', { t: 'circle', cx: 8.6, cy: 9.2, r: 1.3 }],
  aurora: ['M3.5 20.5c1.8-4.4 1.6-9.4-.6-13.4', 'M9 21c2.3-5.2 2-11-.4-15.4', 'M14.8 20.6c2.4-5 2.1-10.8-.2-15', 'M20.4 19.6c1.6-3.9 1.4-8.3-.4-11.8'],
  board: [{ t: 'circle', cx: 12, cy: 12, r: 2 }, 'M7.6 7.6a6.2 6.2 0 0 0 0 8.8M16.4 16.4a6.2 6.2 0 0 0 0-8.8', 'M4.7 4.7a10 10 0 0 0 0 14.6M19.3 19.3a10 10 0 0 0 0-14.6'],
  chevL: ['M14.5 6 9 12l5.5 6'],
  chevR: ['M9.5 6 15 12l-5.5 6']
};
export const icon = name => svg(ICON[name], {
  'stroke': 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
});
