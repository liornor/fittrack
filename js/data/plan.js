// The training plan ("Calisthenics Plan: Handstand, Core, Glutes & Legs") as data,
// plus the date logic that decides which day and week you are in. No DOM here.
//
// To change the plan, edit DAYS / WARMUPS / WEEKS below. Exercise fields:
//   name, sets, reps: [low, high] (null = "near max"), unit: 'reps' | 'sec',
//   per: 'leg' | 'side' | null, kind: 'block' for a timed block (reps = minutes), how: instructions.
(function (FT) {
  'use strict';

  const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const CYCLE_WEEKS = 4;
  const DELOAD_WEEK = 4;
  const DELOAD_FACTOR = 0.6;

  const GUIDELINES = [
    'Sessions run 45–60 minutes: about 10 min warm-up, 40 min main work, 10 min core or mobility.',
    'Rest 2–3 minutes between hard sets (pistols, pike push-ups, pull-ups) and 60–90 seconds between accessory sets.',
    'Leave 1–2 reps in reserve on strength sets. Skill work (handstand, pistol) is done fresh and never to failure.',
    'Kick-ups are not part of this plan. Every handstand entry comes from wall walks, tripod and pressing.'
  ];

  const PROGRESSION =
    'Add 1–2 reps per set each week, or slow the lowering phase by a second. When you hit the top of the rep range on every set, move to the next harder version. Every 4th week, cut volume by about 40% to recover.';

  const TEST_WEEK = 'Test at the end of week 4: left pistol with the lowest heel lift you can manage, chest-to-wall handstand hold time, wall HSPU negative control, and L-sit hold time on parallettes.';

  const WEEKS = [
    { n: 1, focus: 'Learn the movements', todo: 'Bottom of each rep range. Stop 2 reps before failure. Keep heel lift for left pistol at 2–3 cm.' },
    { n: 2, focus: 'Add reps', todo: 'Add 1–2 reps per set. Raise feet slightly on pike push-ups.' },
    { n: 3, focus: 'Add difficulty', todo: 'Reach the top of each range. Slow pistol lowers to 5 seconds. Lower heel lift by 1 cm.' },
    { n: 4, focus: 'Deload', todo: 'Do about 60% of normal sets, keep the same exercises, and test your progress at the end of the week.' }
  ];

  const NOTES = {
    equipment: 'Pull-up bar, wall space, a chair or bench, a small plank or book for heel lift, a folded towel for wall HSPU negatives, and parallettes when they arrive (floor L-sits until then).',
    backOff: [
      'You feel sharp pain in your wrists, shoulders or knees (muscle burn is normal, joint pain is not).',
      'Your form breaks down, such as your back arching in a handstand or your knee caving in on a pistol.',
      'You feel unusually tired for several days in a row. Take an extra rest day.'
    ],
    handstand: 'Keep fingers spread and pressing into the floor, push tall through your shoulders, squeeze your glutes and keep a hollow body shape. Consistent short practice beats long sessions.'
  };

  const WARMUPS = {
    ankle: {
      name: 'Ankle mobility',
      time: '5 min',
      why: 'Limited ankle mobility is the most likely reason your left pistol stalls at the bottom, so this is worth doing every time.',
      days: ['mon', 'thu', 'sat'],
      steps: [
        { name: 'Knee-to-wall drill', target: '2 × 10 per side', how: 'Stand facing a wall with your foot about a hand’s width away. Drive your knee forward to touch the wall without lifting your heel. Move the foot back an inch at a time as it gets easy. This opens the ankle so your knee can travel over your toes in a deep squat.' },
        { name: 'Deep squat hold with heel support', target: '30–60 seconds', how: 'Squat as low as you can with a small book or plate under your heels and your toes pointing slightly out. Press your elbows into your knees and keep your chest up. This teaches your body to be comfortable at the bottom of a pistol.' }
      ]
    },
    wrist: {
      name: 'Wrist warm-up',
      time: '2 min',
      days: ['tue', 'fri'],
      steps: [
        { name: 'Wrist rocks and circles', target: '2 minutes', how: 'Kneel with your palms flat, fingers forward, then rotate to fingers pointing sideways and backward, rocking gently back and forth. Add circles with your hands on the floor. This prepares your wrists for weight bearing in handstand work.' }
      ]
    },
    shoulder: {
      name: 'Shoulder warm-up',
      time: '2 min',
      days: ['tue', 'wed', 'fri'],
      steps: [
        { name: 'Scapular push-ups and arm circles', target: '10 + 10 each direction', how: 'Do 10 scapular push-ups (in a plank, push your shoulder blades apart and together without bending your elbows) and 10 arm circles each direction. This wakes up the muscles that stabilise your shoulders overhead.' }
      ]
    }
  };

  const DAYS = {
    mon: {
      focus: 'Legs and glutes', type: 'Strength', targets: 'Quads, glutes, hamstrings, calves',
      intro: 'This day builds single-leg strength, which carries over to your left pistol. Start every set with your weaker (left) leg and match the reps on the right.',
      exercises: [
        { name: 'Bulgarian split squats', sets: 4, reps: [8, 10], per: 'leg', how: 'Stand a step ahead of a chair or bench and rest the top of your back foot on it. Lower straight down until your front thigh is parallel to the floor or deeper, then drive up through the front heel. Keep your torso upright and your front knee tracking over your toes. This works quads and glutes and builds the balance you need for pistols.' },
        { name: 'Single-leg hip thrust', sets: 3, reps: [12, 12], per: 'leg', how: 'Sit with your upper back against a couch or bench, one foot flat on the floor and the other leg lifted. Drive your hips up until your body is level from shoulders to knee, squeeze your glute at the top for a second, then lower slowly. This isolates the glute of each leg and exposes any left-right imbalance.' },
        { name: 'Nordic curl negatives', sets: 3, reps: [5, 5], how: 'Kneel with your ankles anchored (under a sofa or held by a partner). Keep your body straight from knees to head and lower yourself toward the floor as slowly as you can, catching yourself with your hands. Push back up with your hands to repeat. This strengthens the hamstrings, which protect your knees and help in single-leg work.' },
        { name: 'Calf raises', sets: 3, reps: [15, 15], how: 'Stand on the edge of a step on one or both feet and rise onto your toes as high as you can, pause, then lower below the step level. The calves and Achilles tendon take load in pistols and handstand balance, and strong ankles help with the mobility work above.' }
      ]
    },
    tue: {
      focus: 'Handstand and core', type: 'Skill', targets: 'Balance, tripod, forearm stand, hollow body',
      intro: 'This is a skill day, so work fresh and stop each set while form is still clean. No kick-ups; you enter every position by walking or pressing.',
      exercises: [
        { name: 'Wall walk to chest-to-wall hold', sets: 5, reps: [30, 30], unit: 'sec', how: 'Lie on your stomach with your toes touching the wall, push up into a plank, then walk your feet up the wall while your hands walk toward it. Stop when your chest is close to the wall. Push the floor away through your shoulders, squeeze your glutes and keep your ribs pulled in. This builds the handstand line and shoulder endurance without any balance risk.' },
        { name: 'Wall shoulder taps', sets: 3, reps: [6, 6], per: 'side', how: 'From the chest-to-wall hold, shift your weight onto one hand and lightly tap that shoulder with the other, then switch. Keep your hips still. This trains weight shifting over the hands, the same skill you need for freestanding balance.' },
        { name: 'Tripod tuck hold', sets: 5, reps: [15, 20], unit: 'sec', how: 'Place your hands shoulder-width apart and the top of your forehead on the floor to form a triangle. Bend your elbows to about 90 degrees, rest your knees on your upper arms, then lift your feet off the floor. Keep most of the weight in your hands and only light contact on your head. This teaches you to shift your hips over your hands, which is the key movement in a press.' },
        { name: 'Forearm stand at the wall', sets: 4, reps: [15, 20], unit: 'sec', how: 'Kneel facing the wall with your forearms flat on the floor, elbows under shoulders, then press your hips up into a pike and walk or lift your feet to the wall. Push your forearms down and keep your body long. This builds balance and shoulder endurance with less wrist load. Enter by pressing up from a pike, not by kicking.' },
        { name: 'Hollow body hold', sets: 3, reps: [45, 60], unit: 'sec', how: 'Lie on your back, press your lower back into the floor, then lift your shoulders and legs a few inches off the ground with your arms overhead. Keep your ribs down and your lower back flat. The hollow shape is the same body line you hold in a handstand, so this builds the core control for it.' },
        { name: 'Hanging leg raises', sets: 3, reps: [8, 10], how: 'Hang from the pull-up bar with a firm grip. Keeping your legs straight (bend the knees if you must), raise them to hip height or higher, then lower slowly without swinging. This trains the lower abs and hip flexors, which also help your L-sit and press.' }
      ]
    },
    wed: {
      focus: 'Pull and push', type: 'Strength', targets: 'Back, biceps, chest, triceps',
      intro: 'This is general upper-body strength. A strong back and chest keep your shoulders healthy and support the pressing work on Friday.',
      exercises: [
        { name: 'Pull-ups', sets: 4, reps: [8, 10], how: 'Hang with an overhand grip slightly wider than your shoulders. Pull until your chin clears the bar, keeping your shoulders down and away from your ears, then lower with control. You’re already at 10–15, so stop each set 1–2 reps before failure.' },
        { name: 'Rows', sets: 3, reps: [10, 10], how: 'Lie under a sturdy table, low bar or rings and hold the edge. Keep your body straight and pull your chest to your hands, squeezing your shoulder blades together. Lower slowly. This balances all the pushing you do and protects your shoulders.' },
        { name: 'Dips', sets: 3, reps: [8, 12], how: 'Hold yourself up on parallettes, parallel bars or two sturdy chairs with your arms straight. Lower until your upper arms are about parallel to the floor, then press back up. Lean slightly forward. Dips build the triceps and chest and the straight-arm support strength you need for presses and L-sits.' },
        { name: 'Push-ups', sets: 2, reps: null, how: 'Hands under your shoulders, body in a straight line, chest to the floor, then press up. Stop 1–2 reps before failing so your form stays strict. These add volume for your chest, shoulders and triceps without more equipment.' }
      ]
    },
    thu: {
      focus: 'Pistol and L-sit', type: 'Skill', targets: 'Left pistol, ankles, compression',
      intro: 'Do 5 minutes of ankle mobility first. The aim is to fix the left pistol (you can lower down but can’t stand back up) and build compression for the L-sit and press.',
      exercises: [
        { name: 'Left pistol, heel elevated', sets: 4, reps: [4, 4], how: 'Stand on your left foot with the heel on a 2–3 cm plank or book, holding a doorframe or pole for balance. Lower for 3–5 seconds, pause for a second at the bottom, then drive up through the whole foot. The heel lift gives your ankle extra room, so you can reach depth with less strain and push up from a stronger position. Lower the lift over the weeks until you’re flat.' },
        { name: 'Right pistol', sets: 2, reps: [3, 3], how: 'Do these free-standing with the same slow lower. Two light sets keep the right leg sharp without letting it pull further ahead of the left.' },
        { name: 'L-sit', sets: 5, reps: [10, 10], unit: 'sec', how: 'Sit between two parallettes (or on the floor with your hands beside your hips), press down until your hips lift, then extend your legs straight in front of you. Push your shoulders down, lock your elbows and point your toes. Use the floor until your parallettes arrive, and bend your knees if you can’t hold straight legs. This builds compression and shoulder depression, both of which help your handstand press.' },
        { name: 'Compression lifts', sets: 3, reps: [8, 8], how: 'Sit with your legs straight and your hands flat beside your hips. Press down, lift your hips, then try to raise one or both legs a few centimetres off the floor and hold for a second. This is active hip flexor strength, the missing piece for lifting your legs in a press.' }
      ]
    },
    fri: {
      focus: 'Shoulder strength', type: 'Strength and skill', targets: 'Pike push-ups, HSPU negatives, tripod press',
      intro: 'This is the most important day for your main goal. It builds the pressing strength that gets you up into a handstand.',
      exercises: [
        { name: 'Feet-elevated pike push-ups', sets: 4, reps: [6, 8], how: 'Start in a downward-dog shape with your feet on a chair or step and your hips high over your hands. Bend your elbows and lower the top of your head toward the floor between your hands, then press back up. The higher your feet, the closer this gets to a handstand push-up. Raise the feet gradually over the weeks.' },
        { name: 'Wall handstand push-up negatives', sets: 3, reps: [3, 5], how: 'Wall walk into a chest-to-wall handstand, then lower yourself slowly to the floor over 3–5 seconds until your head touches a folded towel or mat. Step down and reset. Negatives build the strength for the pressing phase without needing to push all the way back up yet.' },
        { name: 'Wall walks', sets: 3, reps: [5, 5], how: 'From a plank with your feet at the wall, walk up as high as you can, hold for a few seconds, then walk back down slowly. This loads your shoulders and builds comfort with being upside down.' },
        { name: 'Tripod to straddle press attempts', sets: 1, reps: [8, 10], kind: 'block', how: 'From the tripod tuck hold, shift your weight forward over your hands and slowly extend your legs into a straddle shape, keeping your hips high. Stop when it breaks down. Use a light head touch only and let your arms do the work. Over time your hips rise higher until you press all the way into a handstand.' }
      ]
    },
    sat: {
      focus: 'Glutes and core', type: 'Strength', targets: 'Single-leg hinge, shrimp squat, dragon flag',
      intro: 'Do 5 minutes of ankle mobility first. This day finishes the week with single-leg hinge work and harder core moves.',
      exercises: [
        { name: 'Single-leg Romanian deadlift', sets: 3, reps: [10, 10], per: 'leg', how: 'Stand on one leg with a slight knee bend. Hinge at the hips, sending your free leg straight back and your chest forward until your torso is near parallel to the floor, then squeeze your glute to stand tall. Keep your hips square to the floor. This builds glute and hamstring strength and the balance that helps pistols and handstands.' },
        { name: 'Shrimp squats or step-ups', sets: 3, reps: [8, 8], per: 'leg', how: 'For shrimp squats, stand on one leg, hold the other foot behind you and lower your back knee gently to the floor, then stand up. If that’s too hard, do step-ups onto a knee-high bench, driving through the heel of the top foot. Both train single-leg quad and glute strength and bridge the gap toward a left pistol.' },
        { name: 'Hollow rocks', sets: 3, reps: [20, 20], how: 'From a hollow body hold, rock back and forth like a rocking chair while keeping your lower back pressed down and your shape rigid. This builds core tension and trunk stiffness, which carry over directly to a straight handstand line.' },
        { name: 'Dragon flag negatives', sets: 3, reps: [5, 5], how: 'Lie on a bench or floor holding something fixed behind your head. Raise your body into a straight line on your shoulders, then lower slowly with your body rigid and without bending at the hips. Go only as low as you can control. This is a very strong core move that builds front-body core strength for advanced skills.' }
      ]
    },
    sun: {
      focus: 'Rest', type: 'Recovery', targets: 'Walk or light stretching only',
      intro: 'Strength and skill days alternate, with Sunday off. A walk or some light stretching is all you need.',
      exercises: []
    }
  };

  // ---------- Dates ----------

  function dayKey(dateString) {
    return DAY_KEYS[(FT.dates.parse(dateString).getDay() + 6) % 7]; // JS: 0 = Sunday
  }

  function addDays(dateString, n) {
    const d = FT.dates.parse(dateString);
    d.setDate(d.getDate() + n);
    return FT.dates.toLocalDate(d);
  }

  // The Monday on or before a date: weeks of the plan always start on Monday.
  function mondayOf(dateString) {
    return addDays(dateString, -DAY_KEYS.indexOf(dayKey(dateString)));
  }

  // Where a date falls in the 4-week cycle, given the plan's start date.
  // Returns null if no start is set; { upcoming: true, daysUntil } before the start.
  function weekInfo(planStart, dateString) {
    if (!planStart || !FT.dates.isValid(planStart)) return null;
    const days = FT.dates.daysBetween(mondayOf(planStart), dateString);
    if (days < 0) return { upcoming: true, daysUntil: -days };
    const weekIndex = Math.floor(days / 7);
    const week = WEEKS[weekIndex % CYCLE_WEEKS];
    return { upcoming: false, n: week.n, focus: week.focus, todo: week.todo, block: Math.floor(weekIndex / CYCLE_WEEKS) + 1, deload: week.n === DELOAD_WEEK };
  }

  // ---------- Exercises ----------

  function warmupsFor(key) {
    return Object.values(WARMUPS).filter(w => w.days.includes(key));
  }

  // Sets for an exercise this week (deload weeks cut volume; timed blocks stay as they are).
  function setsFor(ex, week) {
    if (ex.kind === 'block' || !week || !week.deload) return ex.sets;
    return Math.max(1, Math.round(ex.sets * DELOAD_FACTOR));
  }

  function range(reps) { return reps[0] === reps[1] ? String(reps[0]) : `${reps[0]}–${reps[1]}`; }

  function targetText(ex, week) {
    if (ex.kind === 'block') return `${range(ex.reps)} minutes`;
    const sets = setsFor(ex, week);
    if (!ex.reps) return `${sets} ${sets === 1 ? 'set' : 'sets'}, near max`;
    return `${sets} × ${range(ex.reps)}${ex.unit === 'sec' ? ' sec' : ''}${ex.per ? ' per ' + ex.per : ''}`;
  }

  // A workout-log entry for a day, ready to save: planned sets with the low end of each rep range.
  // Timed exercises log seconds (or minutes) in the reps column, so their names say so.
  function toWorkout(key, dateString, week) {
    const day = DAYS[key];
    return {
      date: dateString,
      title: day.focus,
      notes: '',
      exercises: day.exercises.map(ex => {
        const unitLabel = ex.kind === 'block' ? ' (min)' : ex.unit === 'sec' ? ' (sec)' : '';
        const reps = ex.reps ? ex.reps[0] : null;
        return {
          name: ex.name + unitLabel,
          sets: Array.from({ length: setsFor(ex, week) }, () => ({ reps, weight: null, done: false }))
        };
      })
    };
  }

  FT.plan = {
    DAY_KEYS, DAY_NAMES, DAYS, WARMUPS, WEEKS, GUIDELINES, PROGRESSION, TEST_WEEK, NOTES, CYCLE_WEEKS,
    dayKey, addDays, mondayOf, weekInfo, warmupsFor, setsFor, targetText, toWorkout
  };
})(window.FitTrack = window.FitTrack || {});
