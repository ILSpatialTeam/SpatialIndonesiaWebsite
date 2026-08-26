// Konten planet Insight. Artikel = bulan yang mengorbit planet, sparing = satelit
// yang mengorbit bulan. Semua metadata di sini dipakai dua kali: sekali untuk
// teks yang dibaca, sekali untuk memilih orbit/warna/ukuran bulannya di scene.

export const CATEGORIES = {
  teknis: { label: 'Technical', color: '#9E94F9' },
  desain: { label: 'Design', color: '#a99bf2' },
  industri: { label: 'Industry', color: '#5ad1c0' },
  cerita: { label: 'Member story', color: '#f3f2f8' }
};

// Empat frekuensi sinyal. Memaksa orang memilih jenis kontribusinya sebelum
// menulis — supaya kolomnya tidak berubah jadi tumpukan "keren nih".
export const FREQ = {
  sinyal: {
    id: 'sinyal', label: 'Signal', glyph: '▲', color: '#9E94F9',
    hint: 'Adding information, references, or data not yet in the article.'
  },
  observasi: {
    id: 'observasi', label: 'Observation', glyph: '◆', color: '#5ad1c0',
    hint: 'First-hand experience or case study from your own work.'
  },
  sonde: {
    id: 'sonde', label: 'Probe', glyph: '●', color: '#f3f2f8',
    hint: 'A question for the author or for other readers.'
  },
  anomali: {
    id: 'anomali', label: 'Anomaly', glyph: '✦', color: '#f2a65a',
    hint: 'A different perspective or rebuttal. Its orbit is intentionally tilted.'
  }
};

export const ARTICLES = [
  {
    slug: 'frame-budget-vr',
    no: '001',
    cat: 'teknis',
    title: 'Why 72 FPS Is the Lifeline in VR',
    lead: 'On a regular screen, frame drops cause stuttering animations. In a headset, frame drops make people sick. Here is what fills those 13.8 milliseconds.',
    author: 'Spatial Indonesia Team',
    date: '2026-07-28',
    read: 6,
    fresh: true,
    body: [
      {
        h: 'Your budget is 13.8 milliseconds, not 16',
        p: [
          'At 72 Hz, one frame must finish within 13.8 ms. That number is not an average target but a hard ceiling: miss a single frame and the headset will re-display the previous one, and the user feels it as a jolt across the entire world — not just on the moving object.',
          'And that 13.8 ms is not entirely yours. The compositor, reprojection, and sensor reads already take their share first. Assume you have about 10 ms for logic, animation, and rendering both eyes at once.'
        ]
      },
      {
        h: 'Bad graphics are not what causes nausea',
        p: [
          'Motion sickness in VR almost always comes from a mismatch between what the eyes see and what the inner ear feels. Late frames increase head-motion latency, and the brain reads that as poison.',
          'The consequence is clear and often ignored: lowering texture quality, disabling real-time shadows, or simplifying models is always a better choice than maintaining beautiful visuals at 55 FPS. Work that is stunning but nauseating will not be watched to the end.'
        ],
        q: 'No artistic decision is worth paying for with frame rate.'
      },
      {
        h: 'The four most common frame killers',
        p: [
          'First, draw calls. Every unique material forces one draw call, and two eyes means nearly double. Merge materials, use texture atlases, and use instancing for repeated objects.',
          'Second, overdraw from transparency. Particles, fog, and stacked glass panels force the GPU to draw the same pixels multiple times. This is the number one cause that is invisible in the profiler if you only look at triangle counts.',
          'Third, per-frame memory allocations inside the update loop. A garbage collector running mid-session produces hitches that feel exactly like a jolt. Pool objects — do not create new ones every frame.',
          'Fourth, mismatched render resolution. Many people forget that headsets render larger than the panel resolution to compensate for lens distortion. Lower the render scale slightly and you often gain 20% free performance without anyone noticing.'
        ]
      },
      {
        h: 'Measure first, do not guess',
        p: [
          'Before optimizing anything, determine whether you are CPU-bound or GPU-bound. If lowering render resolution does not change frame time, your problem is on the CPU and shrinking textures will not help at all.',
          'In WebXR, start with `renderer.info` for draw call and triangle counts, then move up to GPU timers via the disjoint timer query extension if available. On Quest, use OVR Metrics Tool to see stale frames directly in the headset — those numbers are far more honest than average FPS.'
        ]
      },
      {
        h: 'When it is still not enough',
        p: [
          'There are two legitimate exits. Foveated rendering lowers resolution at the edges of vision where the eye is not sharp anyway, and is almost always perceptually free. Fixed foveation level 2 is the first button you should press.',
          'The second exit is reducing scene ambition. Smaller spaces, fewer objects, and baked lighting from the start are not signs of giving up — they are design decisions acknowledging that the medium has physical limits.'
        ]
      }
    ]
  },
  {
    slug: 'antarmuka-tanpa-sentuh',
    no: '002',
    cat: 'desain',
    title: 'Interfaces You Can\'t Touch',
    lead: 'Every screen design habit breaks the moment the button floats in mid-air. Notes on comfort zones, target sizes, and feedback without a surface.',
    author: 'Spatial Indonesia Team',
    date: '2026-07-19',
    read: 7,
    fresh: true,
    body: [
      {
        h: 'The comfort zone is far narrower than you think',
        p: [
          'The human field of view is wide, but the area where people can read and press things without turning their head is much smaller: roughly 60 degrees horizontal and 40 degrees vertical from neutral gaze.',
          'For hands, the limit is even tighter. Anything that requires arms raised above the shoulders for more than a few seconds will produce gorilla arm. Place primary controls at chest height, slightly below eye level, within 0.5 to 0.8 meters.'
        ]
      },
      {
        h: 'Fitts\' Law still applies, with extra cost',
        p: [
          'The time to point at something is still determined by distance and target size. The difference is that in three-dimensional space your hand has no table to rest on, so every movement carries natural tremor.',
          'The practical rule that holds: interactive targets at minimum 2 degrees of visual angle, ideally 3. At 1 meter distance that means buttons roughly 3.5 to 5 cm wide. Space between targets at least half the target width — a wrong press in mid-air is far more frustrating than a wrong tap on a phone.'
        ]
      },
      {
        h: 'Text has its own rules',
        p: [
          'Text in a headset is limited by angular resolution, not pixel size. What you need to maintain is letter height in degrees: below 0.4 degrees, text starts to shimmer and becomes hard to read even on a large panel.',
          'Safe practice: place text panels at a fixed distance of 1 to 2 meters, no closer than 0.5 meters because the eyes have to work hard for convergence, and avoid thin text. Medium font weight reads much better than light across all current headsets.'
        ]
      },
      {
        h: 'Without a surface, feedback becomes mandatory',
        p: [
          'A finger pressing a real button meets resistance. In mid-air, there is nothing. If you do not replace it, people will press twice, hesitate, then blame themselves.',
          'Replace it with three layers at once: a visual change when the pointer enters the area, a brief vibration of 10 to 20 ms on press, and a short click sound. All three must happen within 50 ms of the action, or the cause-and-effect link is lost.'
        ],
        q: 'If the user presses twice, it is not their fault. It is a sign your feedback was late.'
      },
      {
        h: 'Quick checklist',
        p: [
          'Are all primary controls reachable without raising arms above the shoulders? Is your smallest target still 2 degrees at the farthest possible distance? Does every action have visual, haptic, and audio feedback? Is your text readable by someone wearing glasses inside the headset?',
          'If even one answer is no, fix that before adding new features. Spatial interfaces rarely fail because they lack features; almost always because they are exhausting to use for more than ten minutes.'
        ]
      }
    ]
  },
  {
    slug: 'webxr-jalan-tercepat',
    no: '003',
    cat: 'industri',
    title: 'WebXR: The Fastest Way Into Spatial from Indonesia',
    lead: 'The biggest barrier is not headset price, but the distance between your work and the people who want to see it. The browser cuts that distance to a single link.',
    author: 'Spatial Indonesia Team',
    date: '2026-07-05',
    read: 5,
    fresh: false,
    body: [
      {
        h: 'The problem is distribution, not devices',
        p: [
          'Building a native VR app means asking people to create a store account, download several hundred megabytes, and wait for review before anyone can see your work. For a growing community, those are three layers of friction that kill momentum.',
          'WebXR cuts all of that down to a single link you can send via WhatsApp. People open it on a phone and instantly get the AR version; open it on a headset and immediately enter immersive mode. No installation, no review.'
        ]
      },
      {
        h: 'What is already possible today',
        p: [
          'Immersive VR and AR sessions, six degrees of freedom tracking, controllers and hand tracking, hit test for placing objects on real floors, anchors, depth sensing on some devices, and light estimation. For most community work, this is more than enough.',
          'The library ecosystem is also mature. three.js handles WebXR well, and if you want something more declarative there are several layers on top. The key point: you are using web skills that many people in Indonesia already have, not starting from scratch.'
        ]
      },
      {
        h: 'What is still missing',
        p: [
          'Peak performance remains below native, especially for large scenes with many materials. Safari support on iOS still lags behind, so the AR path for iPhone users usually goes through Quick Look with USDZ format, not WebXR.',
          'Access to high-end device features — full eye tracking, raw camera passthrough — is also still limited for privacy reasons. If your work depends on those, the web is not yet its home.'
        ]
      },
      {
        h: 'Why this matters for us',
        p: [
          'Most potential users of spatial work in Indonesia do not own a headset and will not buy one this year. But nearly all of them have an Android phone capable of running AR in a browser.',
          'That means work built on the web can be enjoyed now by teachers, museum curators, students, and potential clients — not just by fellow headset owners. That is the difference between a community that talks inward and a community that grows.'
        ]
      }
    ]
  },
  {
    slug: 'occlusion-ar-palsu',
    no: '004',
    cat: 'teknis',
    title: 'Occlusion: Why Your AR Feels Fake',
    lead: 'A virtual object that remains visible when behind a table instantly breaks the illusion. Here are the options you have, with their respective costs.',
    author: 'Spatial Indonesia Team',
    date: '2026-06-22',
    read: 8,
    fresh: false,
    body: [
      {
        h: 'The brain checks occlusion first',
        p: [
          'Of all the depth cues humans use — shadows, perspective, relative size, parallax — occlusion is the strongest and fastest to process. If an object covers another, the brain concludes it is in front. No other cue can override it.',
          'Because of that, a detailed AR model with perfect lighting will still feel like a sticker if it clips through a chair. Conversely, a simple model that occludes correctly immediately feels present in the room.'
        ]
      },
      {
        h: 'Three ways to get it',
        p: [
          'First, proxy geometry. You create rough shapes for real objects — a floor plane, a box for a table — then render them only to the depth buffer without color. Cheap, stable, and suitable for spaces you control like exhibition stages.',
          'Second, room mesh reconstruction. The device scans the environment and gives you a mesh usable as an occluder. Accurate for large stationary objects, but requires scanning time and does not follow objects that move.',
          'Third, per-frame depth maps from sensors or estimation. The most dynamic, and the only one that can handle hands and people walking past.'
        ]
      },
      {
        h: 'The Depth API and its limits',
        p: [
          'The depth map you receive is usually far coarser than camera resolution, often around 160 by 90, and comes with noise at object edges. If used raw, virtual object silhouettes will jitter every frame.',
          'The fix is not raising resolution, but smoothing the decision: create a soft transition around the depth threshold instead of a hard cutoff, and filter depth values between frames to prevent jumping. A little blur at the edges is far less distracting than flickering edges.'
        ]
      },
      {
        h: 'Shadows do half of the rest',
        p: [
          'After occlusion is correct, the next most noticeable thing is contact shadow — a small dark shadow right at the point where the object touches the surface. Without it, objects appear to float a few centimeters above the floor.',
          'Contact shadows do not need to be physically accurate. A dark circle with soft edges, scaled by the object\'s distance to the surface, already produces ninety percent of the effect at nearly zero cost.'
        ]
      },
      {
        h: 'Compromises worth making',
        p: [
          'If your target device lacks a depth sensor, do not force a heavy estimation that eats into frame budget. Choose the proxy approach, limit the placement area to detected flat surfaces, and design the scene so virtual objects rarely end up behind real ones.',
          'Constraining the problem space is a legitimate technique. The best AR work I have seen in the field was not the most technically advanced, but the one that knew where to stop.'
        ]
      }
    ]
  },
  {
    slug: 'skala-borobudur-vr',
    no: '005',
    cat: 'cerita',
    title: 'Maintaining Scale: Notes from Building a Temple in VR',
    lead: 'The model was correct from the start. What was wrong was its size — and it took three test rounds before I realized it was not about the numbers.',
    author: 'Community member',
    date: '2026-06-08',
    read: 9,
    fresh: false,
    body: [
      {
        h: 'First mistake: the model was not in meters',
        p: [
          'I received assets from a photogrammetry scan with unclear units. In the viewport everything looked reasonable, so I moved on. The moment I entered the headset, a three-meter stupa felt like a knee-high toy.',
          'The lesson that is now a habit: the first thing I do with a new asset is place a 1.7-meter cylinder next to it. If the proportions are wrong, I will know in three seconds, not three days.'
        ]
      },
      {
        h: 'Humans are the unit of measure',
        p: [
          'On screen, scale is relative and the brain accepts anything. In VR, your body becomes a ruler that cannot be fooled. Eye height, arm reach, and shoulder width all participate in the judgment.',
          'Since then, every scene I build always has one human-sized reference object visible from the start — a stair step, a door, a railing. Not for decoration, but to give the eyes an anchor point.'
        ]
      },
      {
        h: 'When the real space is bigger than a living room',
        p: [
          'A temple complex spanning hundreds of meters cannot be explored on foot in a 3 by 3 meter room. I tried teleportation, and lost all sense of distance — people arrived at the top without feeling they had traveled anything.',
          'What eventually worked was a combination: real walking for small detail-rich areas, plus transitions between terraces that intentionally include a pause and sound change. The feeling of "going up" turned out to be carried more by audio and wait time than by distance traveled.'
        ],
        q: 'People do not remember how many meters they traveled. They remember how long it felt.'
      },
      {
        h: 'What changed the most after testing',
        p: [
          'We tested with twelve people, half of whom had never used a headset. Three findings fundamentally changed the design: reliefs needed to be lit brighter than realistic because the eyes do not have time to adapt; explanatory text had to appear attached near the object, not on a floating panel; and almost everyone wanted to touch, even knowing they could not.',
          'The third finding was the most expensive to address, and the most impactful. We added a gentle glow when a hand approaches a relief. There is no function behind it, but the sense of presence jumped dramatically.'
        ]
      },
      {
        h: 'What I would do differently',
        p: [
          'Set units and scale on day one, before a single texture is made. Test in a headset every day, not every milestone. And budget time for audio from the beginning, not tack it on at the end as garnish.',
          'If there is one sentence I want to pass on to anyone just starting: spatial work is not judged by how realistic it looks, but by how convinced your body is that it is there.'
        ]
      }
    ]
  },
  {
    slug: 'spatial-anchor-catatan',
    no: '006',
    cat: 'teknis',
    title: 'Spatial Anchors: Early Notes',
    lead: 'Why objects you place on a table slowly drift, and what an anchor actually stores.',
    author: 'Spatial Indonesia Team',
    date: '2026-04-14',
    read: 4,
    fresh: false,
    archived: true,
    body: [
      {
        h: 'An anchor is not a coordinate',
        p: [
          'Everyone\'s first temptation is to save object position as three numbers relative to the session start point. This works for a few minutes, then stops working.',
          'An anchor is a different promise: you ask the tracking system to remember a point relative to real-world features it recognizes. When the system\'s understanding of the room updates, the numerical coordinates may change — what is preserved is the relationship with the world.'
        ]
      },
      {
        h: 'Why objects drift',
        p: [
          'Inside-out tracking builds a room map while moving, and that map is continuously corrected. When the system realizes that two parts of the room it thought were separate are actually the same, the entire map shifts slightly. Objects attached to raw coordinates will drift; objects attached to anchors get corrected along with it.',
          'The second, more boring cause: textureless surfaces. A plain white table and blank walls give very few features to recognize. Changing lighting also degrades tracking quality drastically.'
        ]
      },
      {
        h: 'Practices that help',
        p: [
          'Create anchors per object or per small group of nearby objects, not one anchor for the entire scene. Update object transforms from the anchor every frame instead of copying it once at creation.',
          'And the most often forgotten: give the user a way to fix it themselves. A small button to reposition an object saves more complaints than any tracking accuracy improvement.'
        ]
      }
    ]
  }
];

// Sparing bawaan supaya cincinnya tidak kosong saat pertama dibuka.
export const SEED_SPARING = {
  'frame-budget-vr': [
    { id: 's1', anchor: [2, 1], freq: 'observasi', name: 'Rian', at: '2026-07-29', boost: 6,
      text: 'We got hit exactly on the overdraw point. Four semi-transparent glass panels stacked on top of each other in the lobby — frame time jumped 4 ms even though the triangle count was low. Replaced with a single panel with a fake texture, problem solved.' },
    { id: 's2', anchor: [4, 0], freq: 'sinyal', name: 'Dewi', at: '2026-07-30', boost: 4,
      text: 'Addition: on Quest, fixed foveated rendering level 2 is barely noticeable if your scene has no small text at the edge of vision. If it does, drop to level 1 because letters at the periphery get ghosting.' },
    { id: 's3', anchor: [1, 1], freq: 'anomali', name: 'Bagas', at: '2026-08-02', boost: 3,
      text: 'I disagree that visuals should always be sacrificed. For art pieces or cultural archives, degrading quality until the object loses its meaning is also a failure. Sometimes the answer is reducing scene extent, not lowering quality.' },
    { id: 's4', anchor: [3, 1], freq: 'sonde', name: 'Nadia', at: '2026-08-05', boost: 1,
      text: 'For WebXR, is there a reliable way to read stale frames from within the browser, or do you still need the headset\'s built-in tools?' }
  ],
  'antarmuka-tanpa-sentuh': [
    { id: 's5', anchor: [2, 1], freq: 'sinyal', name: 'Yoga', at: '2026-07-21', boost: 5,
      text: 'On panel distance, 1.2 to 1.5 meters turned out to be the sweet spot in almost all our tests. Below 0.8 meters people started complaining of eye fatigue after ten minutes, even with large text.' },
    { id: 's6', anchor: [3, 1], freq: 'observasi', name: 'Sekar', at: '2026-07-24', boost: 2,
      text: 'We added a 15 ms vibration when the pointer enters the button area, not just on press. Mispress rate dropped significantly, and nobody noticed why. Feedback before the action turned out to be just as important.' },
    { id: 's7', anchor: [1, 1], freq: 'sonde', name: 'Fajar', at: '2026-08-08', boost: 0,
      text: 'How do these target size rules change if the input is hand tracking without a controller? My feeling is they need to be even larger.' }
  ],
  'webxr-jalan-tercepat': [
    { id: 's8', anchor: [0, 1], freq: 'anomali', name: 'Hendra', at: '2026-07-08', boost: 4,
      text: 'The distribution argument is strong, but don\'t underestimate the performance cost. For client projects with large scenes, I still choose native and provide a web link as a lightweight version. Both, not either-or.' },
    { id: 's9', anchor: [3, 1], freq: 'observasi', name: 'Maya', at: '2026-07-12', boost: 3,
      text: 'Field experience: of 40 teachers we invited, 38 successfully opened the AR link on their own phones without help. That number would never have been achievable with an app that needs to be installed.' }
  ],
  'occlusion-ar-palsu': [
    { id: 's10', anchor: [3, 1], freq: 'sinyal', name: 'Arif', at: '2026-06-25', boost: 3,
      text: 'The contact shadow point is often underestimated. We used a single blurred circle texture scaled by object height — one draw call — and the result was more convincing than the real-time shadows we used before.' },
    { id: 's11', anchor: [2, 1], freq: 'sonde', name: 'Tika', at: '2026-07-02', boost: 1,
      text: 'For the soft transition at the depth threshold, roughly how wide can it be while still looking natural? We tried several values and the result was always either too blurry or still flickering.' }
  ],
  'skala-borobudur-vr': [
    { id: 's12', anchor: [0, 1], freq: 'observasi', name: 'Putri', at: '2026-06-11', boost: 7,
      text: 'The 1.7-meter cylinder is the same trick we use, and I\'m surprised it never shows up in any tutorial. We saved it as a prefab and drag it into every new scene before anything else.' },
    { id: 's13', anchor: [2, 1], freq: 'sinyal', name: 'Galih', at: '2026-06-19', boost: 2,
      text: 'On the sense of ascent carried by audio: adding reverb that changes per terrace helps a lot. Open space above sounds different from corridors below, and the body immediately reads that as elevation.' }
  ],
  'spatial-anchor-catatan': [
    { id: 's14', anchor: [1, 1], freq: 'sinyal', name: 'Bimo', at: '2026-04-18', boost: 2,
      text: 'Small addition: if the room has plain walls, stick up posters or place textured objects at a few points before the session. Sounds silly, but tracking quality improves noticeably.' }
  ]
};
