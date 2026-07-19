// Season 1 climbing products — full seed per docs/season1-climbing-blueprint.md.
//   node scripts/seed-season1.mjs          (dry: validate + counts, no writes)
//   node scripts/seed-season1.mjs --apply  (create programs + sessions on PROD)
//
// Idempotent: programs are matched by exact name and reused; sessions are
// skipped when (programId, week, day) already exists. Products are created
// publicStoreVisible=false / productStatus=Draft — nothing appears in the
// store until Kent reviews and flips them. Old SKUs are not touched.
const BASE = process.env.SEED_BASE || "https://trainnolimit.com";
const APPLY = process.argv.includes("--apply");

/* ------------------------------- helpers --------------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(BASE + path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        // Feishu throttling after heavy writes — wait and retry.
        if (String(JSON.stringify(data)).includes("1254607") && attempt < 2) {
          console.log("   throttled (1254607) — waiting 20s…");
          await sleep(20000);
          continue;
        }
        throw new Error(`${path}: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
      }
      return data;
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(5000);
    }
  }
}

/* ------------------------- content definitions ---------------------------- */
// ex(name, sets, repsPerWeek, rest, section, tracking, cueEn, cueCn)
// repsPerWeek: string OR [w1,w2,w3,w4]; sets: number OR [w1..w4]

const ex = (name, sets, reps, rest, section, tracking, cueEn, cueCn) => ({
  name, sets, reps, rest, section, tracking, cueEn, cueCn,
});

const WARMUP_EN =
  "Warm-up: 8-10 min — easy cardio 3 min, then hips/shoulders/wrists circles, 2 light ramp-up sets of the first exercise.";
const WARMUP_CN =
  "热身：8-10分钟——3分钟轻有氧，髋/肩/腕关节环绕，第一个动作做2组轻重量适应组。";

const CARDIO_SESSION = {
  name: "Optional · Steady Cardio 30min",
  nameCn: "可选 · 稳态有氧 30分钟",
  type: "Cardio",
  goal: "Aerobic base without interfering with climbing days",
  exercises: [
    ex(
      "Bike", 1, "30 min @ 130-150 bpm", "", "Conditioning", "Time",
      "ANY machine works (bike/row/ski/elliptical/stairs) or a brisk incline walk. Keep heart rate 130-150 — conversational effort. Optional: skip if you climbed hard today.",
      "任选器械（单车/划船/滑雪机/椭圆机/爬楼）或快走坡度均可。心率保持130-150，能说话的强度。可选项：当天攀爬强度大可跳过。"
    ),
  ],
};

// weekly set bump for weeks 2-3, consolidation week 4
const s334 = [3, 4, 4, 3];
const s445 = [4, 4, 5, 4];

const PROGRAMS = [
  {
    key: "c1",
    programName: "Climbing 1 – Foundation",
    programNameCn: "攀岩 1 · 基础",
    level: "Beginner",
    price: 299,
    goal: "Build the base: movement quality, pulling strength, and safe finger introduction.",
    goalCn: "打好基础：动作质量、拉力力量与安全的指力入门。",
    salesDescription:
      "Season 1, phase 1 — foundation strength, open-hand finger intro and movement quality. 4 weeks, 4 training days + optional aerobic days.",
    salesDescriptionCn:
      "第一季第一阶段——基础力量、开放式抓握指力入门与动作质量。4周，每周4个训练日+可选有氧日。",
    listingType: "Main",
    category: "Rock Climbing",
    categoryCn: "攀岩",
    sessions: {
      1: {
        name: "Lower Foundation", nameCn: "下肢基础", type: "Strength",
        goal: "Leg strength base for footwork and landings",
        exercises: [
          ex("Goblet Squat", s334, ["8", "8", "10", "8"], "90 sec", "Main", "Weight x Reps",
            "3-second lowering, chest tall. Add load only when all reps feel crisp.",
            "下蹲3秒控制，挺胸。所有次数都轻松完成后再加重量。"),
          ex("Dumbbell Romanian Deadlift", s334, ["8", "8", "10", "8"], "90 sec", "Main", "Weight x Reps",
            "Push hips back, soft knees, feel the hamstrings load.",
            "髋部后推，膝盖微屈，感受腘绳肌受力。"),
          ex("Dumbbell Reverse Lunge", 3, ["8/leg", "8/leg", "10/leg", "8/leg"], "75 sec", "Main", "Weight x Reps",
            "Knee tracks over toes; drive through the front heel.",
            "膝盖对准脚尖方向，前脚脚跟发力站起。"),
          ex("Standing Calf Raise", 3, "12", "60 sec", "Accessory", "Weight x Reps",
            "Full stretch at the bottom, 2-second pause on the toes.",
            "底部充分拉伸，脚尖顶端停顿2秒。"),
          ex("Front Plank", 3, ["30s", "40s", "45s", "30s"], "60 sec", "Core", "Time",
            "Squeeze glutes, ribs down — a straight line you could rest a bar on.",
            "夹紧臀部，肋骨下沉——身体成一条直线。"),
        ],
      },
      2: {
        name: "Pull + Finger Intro", nameCn: "拉力+指力入门", type: "Strength",
        goal: "Pulling strength and gentle finger loading",
        exercises: [
          ex("Pull-Up", s445, "5", "2 min", "Main", "Reps",
            "Use Assisted Pull-Up (band or machine) if needed — full hang to chin over bar, no kipping.",
            "做不了可用辅助引体（弹力带/器械）——从直臂悬挂拉到下巴过杆，不借力。"),
          ex("Dumbbell Row", 3, ["10/side", "10/side", "12/side", "10/side"], "75 sec", "Main", "Weight x Reps",
            "Pull the elbow to the hip, pause 1s at the top.",
            "手肘向髋部方向拉，顶端停顿1秒。"),
          ex("Open-Hand Hang", 3, ["10s", "15s", "20s", "15s"], "2 min", "Fingers", "Time",
            "LARGE edge, open-hand grip, feet on a box taking weight. Any finger pain = stop the set.",
            "大点/开放式抓握，双脚踩箱分担体重。手指出现疼痛立即停止该组。"),
          ex("Scapular Pull-Up", 3, "5", "90 sec", "Fingers", "Reps",
            "Arms straight — lift and lower with the shoulder blades only.",
            "手臂伸直——只用肩胛骨发力上提与下沉。"),
          ex("Face Pull", 3, "15", "60 sec", "Shoulder Care", "Weight x Reps",
            "Pull to the bridge of the nose, thumbs back, squeeze 1s.",
            "拉向鼻梁，拇指向后，收缩停顿1秒。"),
        ],
      },
      4: {
        name: "Push + Shoulder Care", nameCn: "推力+肩部养护", type: "Strength",
        goal: "Antagonist push strength and cuff/wrist resilience",
        exercises: [
          ex("Dumbbell Bench Press", s334, "8", "90 sec", "Main", "Weight x Reps",
            "Elbows ~45°, full range under control.",
            "手肘约45°，全程控制。"),
          ex("Half-Kneeling Press", 3, "8/side", "75 sec", "Main", "Weight x Reps",
            "Glute of the down knee tight — press without leaning.",
            "跪侧臀部收紧——垂直上推不侧倾。"),
          ex("Push-Up", 3, "AMRAP-2", "90 sec", "Main", "Reps",
            "Stop 2 reps before failure each set.",
            "每组留2次余量（不做到力竭）。"),
          ex("Wrist Pronation", 2, "15/side", "45 sec", "Wrist Care", "Reps",
            "Light weight, slow rotation, no wrist pain.",
            "轻重量慢速旋转，无腕部疼痛。"),
          ex("Wrist Supination", 2, "15/side", "45 sec", "Wrist Care", "Reps",
            "Same control back the other way.",
            "反方向同样控制。"),
          ex("Dumbbell Shoulder External Rotation", 3, "12/side", "60 sec", "Shoulder Care", "Weight x Reps",
            "Elbow pinned to your side, light and strict.",
            "手肘贴紧体侧，轻重量严格完成。"),
        ],
      },
      6: {
        name: "Skills + Core Tension", nameCn: "技术+核心张力", type: "Skill",
        goal: "Climbing-specific body tension and hip mobility",
        exercises: [
          ex("Core Tension Drill", s445, "5", "90 sec", "Tension", "Reps",
            "On the wall or bar: create full-body tension, hold 3s per rep.",
            "在墙上或单杠上建立全身张力，每次保持3秒。"),
          ex("Toe Hook Raise", 3, "8", "75 sec", "Tension", "Reps",
            "Slow up, slower down — toes actively hooked.",
            "上抬慢、下放更慢——脚尖主动勾住。"),
          ex("Sloper Hold", 3, ["15s", "20s", "25s", "20s"], "90 sec", "Grip", "Time",
            "Big sloper or flat edge, body tight beneath it.",
            "大斜面点或平面点，身体收紧在支点下方。"),
          ex("Heel Hook Hamstring Curl", 3, "8/side", "75 sec", "Tension", "Reps",
            "Drive the heel down and through like a real heel hook.",
            "脚跟向下向后发力，模拟真实挂脚跟。"),
          ex("World's Greatest Stretch", 2, "5/side", "45 sec", "Mobility", "Reps",
            "Slow flow — hips, thoracic, shoulders.",
            "缓慢流动——髋、胸椎、肩依次打开。"),
        ],
      },
    },
  },
  {
    key: "c2",
    programName: "Climbing 2 – Base Strength",
    programNameCn: "攀岩 2 · 基础力量",
    level: "Intermediate",
    price: 299,
    goal: "First structured hangboard block plus heavier pulling and leg strength.",
    goalCn: "第一个系统指力板周期，加上更大重量的拉力与下肢力量。",
    salesDescription:
      "Season 1, phase 2 — max hangs, repeaters, weighted pulls and antagonist balance. 4 weeks, 4 training days + optional aerobic days.",
    salesDescriptionCn:
      "第一季第二阶段——最大悬挂、间歇指力、负重引体与拮抗平衡。4周，每周4个训练日+可选有氧日。",
    listingType: "Main",
    category: "Rock Climbing",
    categoryCn: "攀岩",
    sessions: {
      1: {
        name: "Max Hangs + Pull Strength", nameCn: "最大悬挂+拉力", type: "Strength",
        goal: "Maximal finger strength and heavy pulling",
        exercises: [
          ex("Standard Max Hang", [4, 5, 6, 4], "7s", "3 min", "Fingers", "Time",
            "20mm edge, half-crimp, add weight only if 7s feels solid. Fully rested between sets — this is strength, not endurance.",
            "20mm指条，半扣抓握，7秒轻松才加重量。组间充分休息——练的是力量不是耐力。"),
          ex("Weighted Pull-Up", 4, "5", "2.5 min", "Main", "Weight x Reps",
            "Add small load; last rep should be strong, not a grind.",
            "小幅加重；最后一次仍应有力，不硬磨。"),
          ex("Lock-Off Hold", 3, "10s/side", "2 min", "Main", "Time",
            "Chin over bar or 90° — no shaking through the shoulder blade.",
            "下巴过杆或90°锁定——肩胛稳定不抖动。"),
          ex("Chest-Supported Row", 3, "8", "90 sec", "Main", "Weight x Reps",
            "Strict — chest stays on the pad.",
            "严格完成——胸口不离垫。"),
        ],
      },
      2: {
        name: "Lower Strength", nameCn: "下肢力量", type: "Strength",
        goal: "Heavier squat and hinge for compression and steep climbing",
        exercises: [
          ex("Barbell Back Squat", [4, 4, 5, 3], "5", "2.5 min", "Main", "Weight x Reps",
            "Leave 2 reps in reserve; depth before load.",
            "保留2次余量；先保证深度再谈重量。"),
          ex("Trap Bar Deadlift", 3, "5", "2.5 min", "Main", "Weight x Reps",
            "Brace hard, push the floor away.",
            "充分绷紧核心，把地板\"推开\"。"),
          ex("Bulgarian Split Squat", 3, "8/leg", "90 sec", "Main", "Weight x Reps",
            "Torso tall, back knee brushes the floor.",
            "躯干直立，后膝轻触地面。"),
          ex("Hanging Knee Raise", 3, "10", "75 sec", "Core", "Reps",
            "No swing — control the lower.",
            "不摆动——控制下放。"),
        ],
      },
      4: {
        name: "Antagonist + Press", nameCn: "拮抗+推举", type: "Strength",
        goal: "Push strength, pinch grip and wrist balance",
        exercises: [
          ex("Barbell Bench Press", [4, 4, 5, 3], "6", "2 min", "Main", "Weight x Reps",
            "Feet planted, controlled touch, strong lockout.",
            "双脚踩实，控制触胸，有力锁定。"),
          ex("Pike Push-Up", 3, "8", "90 sec", "Main", "Reps",
            "Hips high, head travels between the hands.",
            "臀部抬高，头部落于双手之间。"),
          ex("Pinch Block Lift", 4, "10s/side", "90 sec", "Grip", "Time",
            "Thumb does the work — squeeze, lift, hold.",
            "拇指主导——捏紧、提起、保持。"),
          ex("Face Pull", 3, "15", "60 sec", "Shoulder Care", "Weight x Reps",
            "High elbows, thumbs back.",
            "手肘抬高，拇指向后。"),
          ex("Wrist Pronation", 2, "15/side", "45 sec", "Wrist Care", "Reps",
            "Light and smooth.",
            "轻重量、匀速。"),
        ],
      },
      6: {
        name: "Repeaters + Tension", nameCn: "间歇指力+张力", type: "Climbing",
        goal: "Finger work capacity and full-body tension",
        exercises: [
          ex("Hangboard Repeaters", [4, 5, 6, 4], "6 x (7s on / 3s off)", "3 min", "Fingers", "Time",
            "Comfortable edge, open or half-crimp. One 'rep' = 6 hangs of 7s with 3s rests. Stop the set if form breaks.",
            "舒适指条，开放或半扣。每组=7秒悬挂/3秒休息×6次。动作变形立即结束该组。"),
          ex("Tension Board Row", 3, "8", "2 min", "Tension", "Reps",
            "Feet on, body locked — row without sagging.",
            "脚踩点，身体张紧——划船时躯干不塌。"),
          ex("Single-Arm Core Tension Drill", 3, "5/side", "90 sec", "Tension", "Reps",
            "One hand off — keep the hips from rotating.",
            "单手脱点——髋部不翻转。"),
          ex("Copenhagen Plank", 3, "20s/side", "60 sec", "Core", "Time",
            "Top leg on a bench; hips in line.",
            "上腿放凳上，髋部保持直线。"),
        ],
      },
    },
  },
  {
    key: "c3",
    programName: "Climbing 3 – Power",
    programNameCn: "攀岩 3 · 爆发力",
    level: "Advanced",
    price: 349,
    goal: "Explosive contact strength: campus work, dynamic pulls and contrast lifting.",
    goalCn: "爆发性接触力量：校园板、动态拉力与对比训练。",
    salesDescription:
      "Season 1, phase 3 — campus progressions, explosive pulling, contrast lower-body pairs and power endurance. 4 weeks, 4 training days + optional aerobic days.",
    salesDescriptionCn:
      "第一季第三阶段——校园板进阶、爆发拉力、下肢对比组与力量耐力。4周，每周4个训练日+可选有氧日。",
    listingType: "Main",
    category: "Rock Climbing",
    categoryCn: "攀岩",
    sessions: {
      1: {
        name: "Campus + Explosive Pull", nameCn: "校园板+爆发拉力", type: "Power",
        goal: "Contact strength and explosive pulling",
        exercises: [
          ex("Foot-On Campus", [4, 5, 5, 4], "3 moves/side", "2.5 min", "Campus", "Reps",
            "Weeks 1-2 feet on. Weeks 3-4 switch to Campus Board Ladder if elbows/fingers feel great. Quality over quantity — stop while explosive.",
            "第1-2周脚踩点。第3-4周若手肘/手指状态好可换成标准校园板梯。质量优先——保持爆发力时就结束。"),
          ex("Offset Pull-Up", 4, "3/side", "2.5 min", "Main", "Reps",
            "Towel or lower grip offset; drive hard with the high arm.",
            "毛巾或低把位错位；高位手全力上拉。"),
          ex("Kettlebell Swing", 4, "8", "90 sec", "Power", "Weight x Reps",
            "Snap the hips — the bell floats, arms relaxed.",
            "髋部爆发——壶铃\"漂浮\"，手臂放松。"),
          ex("Scapular Lock-Off", 3, "8s", "90 sec", "Shoulder Care", "Time",
            "Straight-arm scap hold — shoulder packed.",
            "直臂肩胛锁定——肩部收紧。"),
        ],
      },
      2: {
        name: "Contrast Lower", nameCn: "下肢对比", type: "Strength",
        goal: "Heavy + explosive pairing for leg power",
        exercises: [
          ex("Explosive Back Squat", 4, "3", "20 sec to jumps", "Contrast", "Weight x Reps",
            "~60% load moved FAST. Pairs with the box jumps that follow.",
            "约60%重量，全速上举。与下一动作跳箱配对。"),
          ex("Box Jump", 4, "4", "2.5 min", "Contrast", "Reps",
            "Right after the squats — land quiet, step down.",
            "紧接深蹲后进行——落地轻，走下箱。"),
          ex("Single-Leg RDL", 3, "6/leg", "90 sec", "Main", "Weight x Reps",
            "Square hips, slow lower.",
            "髋部摆正，缓慢下放。"),
          ex("Broad Jump", 3, "3", "2 min", "Power", "Reps",
            "Full arm swing, stick the landing 2s.",
            "充分摆臂，落地稳定保持2秒。"),
        ],
      },
      4: {
        name: "Power Endurance", nameCn: "力量耐力", type: "Conditioning",
        goal: "Repeated high-intensity efforts with grip under fatigue",
        exercises: [
          ex("High-Intensity Hangboard Repeaters", [4, 5, 5, 4], "6 x (7s on / 3s off)", "2.5 min", "Fingers", "Time",
            "Smaller edge or added load vs phase 2 — but never through pain.",
            "相比第二阶段用更小指条或加重——但绝不带痛训练。"),
          ex("Assault Bike", 6, "30s hard / 90s easy", "0", "Conditioning", "Time",
            "Hard = 8/10 effort. Keep the easy spins truly easy.",
            "冲刺=8/10强度。恢复段务必放松。"),
          ex("Ring Row", 3, "10", "75 sec", "Main", "Reps",
            "Body rigid, pull to the sternum.",
            "身体刚性，拉至胸骨。"),
          ex("Hollow Hold", 3, "30s", "60 sec", "Core", "Time",
            "Lower back pressed down the whole time.",
            "下背全程贴地。"),
        ],
      },
      6: {
        name: "Dynamic Control + Antagonist", nameCn: "动态控制+拮抗", type: "Skill",
        goal: "Absorb and redirect force; keep shoulders bulletproof",
        exercises: [
          ex("Ring Lock-Off", 4, "8s/side", "2 min", "Main", "Time",
            "Rings turn stability up — stay square.",
            "吊环增加稳定需求——身体保持正对。"),
          ex("Band-Assisted Plyometric Push-Up", 4, "5", "90 sec", "Power", "Reps",
            "Explode off the floor, soft catch.",
            "爆发推离地面，柔和接住。"),
          ex("Control Sloper Hold", 3, "12s", "90 sec", "Grip", "Time",
            "Slightly worse sloper than phase 1 — tension from the toes up.",
            "比第一阶段更难的斜面点——从脚尖到指尖全身张力。"),
          ex("Dumbbell Scaption Raise", 3, "12", "60 sec", "Shoulder Care", "Weight x Reps",
            "Thumbs up, 30° forward of sideways.",
            "拇指朝上，位于侧平举前方30°。"),
          ex("Hip Airplane", 2, "6/side", "60 sec", "Mobility", "Reps",
            "Slow rotation over the standing hip.",
            "以支撑髋为轴缓慢旋转。"),
        ],
      },
    },
  },
  {
    key: "c4",
    programName: "Climbing 4 – Performance",
    programNameCn: "攀岩 4 · 巅峰表现",
    level: "Advanced",
    price: 349,
    goal: "Peak: keep intensity, cut volume, arrive fresh to send.",
    goalCn: "巅峰期：保持强度、降低训练量，以最佳状态完成目标线路。",
    salesDescription:
      "Season 1, phase 4 — max-strength maintenance, power sharpening, performance circuits and a real taper. 4 weeks, 4 training days + optional aerobic days.",
    salesDescriptionCn:
      "第一季第四阶段——最大力量维持、爆发打磨、表现循环与真正的减量周。4周，每周4个训练日+可选有氧日。",
    listingType: "Main",
    category: "Rock Climbing",
    categoryCn: "攀岩",
    sessions: {
      1: {
        name: "Max Strength Maintenance", nameCn: "最大力量维持", type: "Strength",
        goal: "Touch maximal strength with minimal fatigue",
        exercises: [
          ex("Max Hang", [4, 4, 3, 2], "5s", "3 min", "Fingers", "Time",
            "Heavier or smaller than phase 2, but LOW volume. Week 4 is a taper — two crisp sets only.",
            "比第二阶段更重或更小指条，但量要低。第4周减量——只做两组高质量。"),
          ex("Weighted Pull-Up", [3, 3, 3, 2], "3", "3 min", "Main", "Weight x Reps",
            "Heavy triples, bar speed stays sharp.",
            "大重量3次组，杆速保持轻快。"),
          ex("Crimp Isometric", 3, "8s", "2.5 min", "Fingers", "Time",
            "Half-crimp position, controlled load, zero pain tolerance.",
            "半扣位等长发力，控制负荷，绝不带痛。"),
          ex("Barbell Back Squat", [3, 3, 3, 2], "3", "2.5 min", "Main", "Weight x Reps",
            "Heavy but crisp — 2+ reps in reserve.",
            "重但干脆——保留2次以上余量。"),
        ],
      },
      2: {
        name: "Power Sharpening", nameCn: "爆发打磨", type: "Power",
        goal: "Fast, fresh, explosive — never fatigued",
        exercises: [
          ex("Campus Board Ladder", [4, 4, 3, 2], "2 moves/side", "3 min", "Campus", "Reps",
            "Biggest moves you can hit crisply. Done while still fast.",
            "做能干脆完成的最大间距。保持速度时就收。"),
          ex("Countermovement Jump", 4, "3", "2 min", "Power", "Reps",
            "Max intent every jump — measure them in Jump Lab!",
            "每一跳全力以赴——可以用 Jump Lab 测量！"),
          ex("Medicine Ball Slam", 3, "5", "90 sec", "Power", "Reps",
            "Whole-body whip, full exhale.",
            "全身鞭打发力，完全呼气。"),
          ex("Pogo Jump", 3, "10", "90 sec", "Power", "Reps",
            "Stiff ankles, minimal ground time.",
            "踝关节刚性，触地时间最短。"),
        ],
      },
      4: {
        name: "Performance Circuits", nameCn: "表现循环", type: "Conditioning",
        goal: "Send-day energy systems without junk volume",
        exercises: [
          ex("Hangboard Repeaters", [4, 4, 3, 2], "4 x (7s on / 3s off)", "2 min", "Fingers", "Time",
            "Shorter sets than phase 3 — quality contacts only.",
            "比第三阶段组数短——只要高质量接触。"),
          ex("Cluster Lock-Off Hold", 3, "3 x 5s", "2 min", "Main", "Time",
            "Three 5s locks per set with 10s between — like resting mid-crux.",
            "每组3次5秒锁定，间隔10秒——模拟难点中间的小休息。"),
          ex("Burpee", [3, 3, 3, 0], "10", "90 sec", "Conditioning", "Reps",
            "Smooth pace. Week 4: skip entirely — taper.",
            "匀速完成。第4周整组跳过——减量。"),
          ex("Suitcase Carry", 3, "30m/side", "75 sec", "Core", "Reps",
            "Heavy on one side, tall posture.",
            "单侧负重，躯干挺拔。"),
        ],
      },
      6: {
        name: "Recovery + Mobility", nameCn: "恢复+灵活性", type: "Mobility",
        goal: "Restore tissues and range for send day",
        exercises: [
          ex("World's Greatest Stretch", 2, "5/side", "45 sec", "Mobility", "Reps",
            "Slow breathing through each position.",
            "每个位置配合缓慢呼吸。"),
          ex("Banded Lat Stretch", 2, "45s/side", "30 sec", "Mobility", "Time",
            "Relax into it — lats and shoulders.",
            "放松沉入拉伸——背阔肌与肩部。"),
          ex("Couch Stretch", 2, "45s/side", "30 sec", "Mobility", "Time",
            "Glute of the stretched leg tight to protect the low back.",
            "被拉伸腿臀部收紧，保护下背。"),
          ex("Deep Squat Breathing", 2, "8 breaths", "30 sec", "Mobility", "Time",
            "Full deep squat, long exhales, elbows pry the knees.",
            "全深蹲位长呼气，手肘轻撑膝盖。"),
          ex("Shoulder CARS", 2, "5/side", "30 sec", "Mobility", "Reps",
            "Biggest pain-free circles you own.",
            "在无痛范围内画最大的圈。"),
        ],
      },
    },
  },
  {
    key: "fingers",
    programName: "Climber's Fingers",
    programNameCn: "攀岩者指力",
    level: "All levels",
    price: 99,
    compareAtPrice: 149,
    goal: "Finger and wrist resilience to run alongside any climbing plan.",
    goalCn: "手指与手腕的强韧训练，可与任何攀岩计划同步进行。",
    salesDescription:
      "2 short sessions/week for 4 weeks: density hangs, pinch, crimp isometrics and wrist care. Pairs with any Season 1 phase.",
    salesDescriptionCn:
      "每周2次短课×4周：密度悬挂、捏握、半扣等长与腕部养护。可搭配第一季任何阶段。",
    listingType: "Add-on",
    category: "Joint Add-Ons",
    categoryCn: "关节加购",
    sessionsPerWeek: 2,
    sessions: {
      2: {
        name: "Finger Base", nameCn: "指力基础", type: "Climbing",
        goal: "Gentle high-frequency finger loading",
        exercises: [
          ex("Density Hang", 3, ["20s", "25s", "30s", "25s"], "90 sec", "Fingers", "Time",
            "Large edge, ~50-70% bodyweight (feet assisted). Mild effort — this is tissue conditioning, not max work.",
            "大指条，约50-70%体重（脚辅助）。中低强度——目的是组织适应，不是极限。"),
          ex("Finger Curl Isometric", 3, "10s", "75 sec", "Fingers", "Time",
            "Light bar or dumbbell, fingers half-open, hold.",
            "轻杠铃/哑铃，手指半开位保持。"),
          ex("Wrist Pronation", 2, "15/side", "45 sec", "Wrist Care", "Reps",
            "Slow, controlled.",
            "缓慢受控。"),
          ex("Wrist Supination", 2, "15/side", "45 sec", "Wrist Care", "Reps",
            "Same the other way.",
            "反方向同样完成。"),
        ],
      },
      5: {
        name: "Finger Progression", nameCn: "指力进阶", type: "Climbing",
        goal: "Grip variety: open, pinch and early crimp",
        exercises: [
          ex("Open-Hand Hang", 3, ["15s", "20s", "20s", "15s"], "2 min", "Fingers", "Time",
            "Weeks 3-4: switch to Control Crimp Isometric if everything feels great.",
            "第3-4周若状态好，可换成受控半扣等长。"),
          ex("Pinch Block Lift", 3, "10s/side", "90 sec", "Grip", "Time",
            "Thumb strength = sloper strength.",
            "拇指力量=斜面点力量。"),
          ex("Control Wrist Pronation", 2, "12/side", "45 sec", "Wrist Care", "Reps",
            "Slower tempo than the base day.",
            "比基础日更慢的节奏。"),
          ex("Regression Wrist Supination", 2, "12/side", "45 sec", "Wrist Care", "Reps",
            "Light — finish feeling fresh.",
            "轻负荷——结束时应feel轻松。"),
        ],
      },
    },
  },
  {
    key: "shoulders",
    programName: "Climber's Shoulders",
    programNameCn: "攀岩者肩部",
    level: "All levels",
    price: 99,
    compareAtPrice: 149,
    goal: "Cuff, scapula and overhead stability for injury-proof shoulders.",
    goalCn: "肩袖、肩胛与头顶稳定性——远离肩伤。",
    salesDescription:
      "2 short sessions/week for 4 weeks: cuff strength, scapular control and overhead stability. Pairs with any Season 1 phase.",
    salesDescriptionCn:
      "每周2次短课×4周：肩袖力量、肩胛控制与头顶稳定。可搭配第一季任何阶段。",
    listingType: "Add-on",
    category: "Joint Add-Ons",
    categoryCn: "关节加购",
    sessionsPerWeek: 2,
    sessions: {
      2: {
        name: "Cuff + Scap Control", nameCn: "肩袖+肩胛控制", type: "Strength",
        goal: "Rotator cuff strength and scapular mechanics",
        exercises: [
          ex("Face Pull", 3, "15", "60 sec", "Cuff", "Weight x Reps",
            "High elbows, thumbs back, 1s squeeze.",
            "手肘抬高，拇指向后，收缩1秒。"),
          ex("Dumbbell Shoulder External Rotation", 3, "12/side", "60 sec", "Cuff", "Weight x Reps",
            "Elbow pinned, light and strict.",
            "手肘固定体侧，轻重量严格。"),
          ex("Scapular Pull-Up", 3, "6", "75 sec", "Scap", "Reps",
            "Straight arms — shoulder blades only.",
            "直臂——只动肩胛骨。"),
          ex("Wall Slide", 2, "10", "45 sec", "Mobility", "Reps",
            "Forearms on the wall, ribs down, slide tall.",
            "前臂贴墙，肋骨下沉，向上滑动。"),
        ],
      },
      5: {
        name: "Overhead Stability", nameCn: "头顶稳定", type: "Strength",
        goal: "Own the overhead position under load",
        exercises: [
          ex("Half-Kneeling Press", 3, "8/side", "90 sec", "Main", "Weight x Reps",
            "Vertical press, no side lean.",
            "垂直上推，不侧倾。"),
          ex("Cable Shoulder Y-Raise", 3, "12", "60 sec", "Cuff", "Weight x Reps",
            "Thumbs up into a Y — lower traps do the work.",
            "拇指朝上呈Y形——下斜方肌发力。"),
          ex("Scapular Lock-Off", 3, ["8s", "8s", "10s", "10s"], "90 sec", "Scap", "Time",
            "Weeks 3-4: switch to Ring Lock-Off if solid.",
            "第3-4周稳定后可换成吊环锁定。"),
          ex("Banded Cobra", 2, "10", "45 sec", "Cuff", "Reps",
            "Squeeze the band apart behind you, chest proud.",
            "身后拉开弹力带，挺胸。"),
        ],
      },
    },
  },
];

/* ------------------------------ build plan -------------------------------- */

const wk = (v, w) => (Array.isArray(v) ? v[w - 1] : v);

function buildSessions(program) {
  const out = [];
  const isAddon = program.listingType === "Add-on";
  for (let week = 1; week <= 4; week++) {
    for (const [dayStr, def] of Object.entries(program.sessions)) {
      const day = Number(dayStr);
      out.push({ week, day, def, week4: week === 4 });
    }
    if (!isAddon) {
      for (const day of [3, 5, 7]) {
        out.push({ week, day, def: CARDIO_SESSION, cardio: true });
      }
    }
  }
  return out;
}

function buildExercises(def, week, exIndex) {
  return def.exercises
    .map((e, i) => {
      const sets = Number(wk(e.sets, week));
      if (!sets) return null; // e.g. taper week drops an exercise
      const reps = String(wk(e.reps, week));
      const notes = [
        `Section: ${e.section}`,
        `Tracking: ${e.tracking}`,
        ...(i === 0 ? [WARMUP_EN, WARMUP_CN] : []),
        e.cueEn,
        e.cueCn,
      ].join("\n");
      const lib = exIndex.get(e.name.toLowerCase());
      return {
        exerciseRecordId: lib.id,
        exerciseId: lib.exerciseId,
        exerciseName: e.name,
        order: i + 1,
        sets,
        reps,
        tempo: "",
        rest: e.rest,
        coachingNotes: notes,
      };
    })
    .filter(Boolean);
}

/* --------------------------------- main ----------------------------------- */

console.log(`Season 1 seed vs ${BASE}  ${APPLY ? "(APPLY)" : "(dry run)"}\n`);

const exData = await api("GET", "/api/exercises");
const exIndex = new Map(
  (exData.exercises || []).map((e) => [e.exerciseName.toLowerCase(), e])
);
console.log(`library: ${exIndex.size} exercises`);

// Validate every referenced exercise name.
const missing = new Set();
for (const p of PROGRAMS) {
  for (const def of Object.values(p.sessions)) {
    for (const e of def.exercises) {
      if (!exIndex.has(e.name.toLowerCase())) missing.add(e.name);
    }
  }
}
for (const e of CARDIO_SESSION.exercises) {
  if (!exIndex.has(e.name.toLowerCase())) missing.add(e.name);
}
if (missing.size) {
  console.log("\nMISSING EXERCISES — fix before seeding:");
  for (const name of missing) console.log("  -", name);
  process.exit(1);
}
console.log("exercise validation: all names found ✓\n");

const progData = await api("GET", "/api/programs");
const byName = new Map((progData.programs || []).map((p) => [p.programName, p]));

let createdPrograms = 0;
let createdSessions = 0;
let skippedSessions = 0;

for (const program of PROGRAMS) {
  const sessions = buildSessions(program);
  let live = byName.get(program.programName);

  if (!live) {
    console.log(`CREATE program: ${program.programName} (${sessions.length} sessions planned)`);
    if (APPLY) {
      const res = await api("POST", "/api/createProgram", {
        programName: program.programName,
        programNameCn: program.programNameCn,
        goal: program.goal,
        goalCn: program.goalCn,
        sport: "Climbing",
        level: program.level,
        durationWeeks: 4,
        season: 1,
        sessionsPerWeek: program.sessionsPerWeek || 4,
        status: "Active",
        productType: "Digital Program",
        price: program.price,
        compareAtPrice: program.compareAtPrice ?? "",
        currency: "CNY",
        publicStoreVisible: false,
        productStatus: "Draft",
        salesDescription: program.salesDescription,
        salesDescriptionCn: program.salesDescriptionCn,
        storeCategory: program.category,
        storeCategoryCn: program.categoryCn,
        storeListingType: program.listingType,
      });
      live = { programId: res.programId, recordId: res.recordId || res.programRecordId };
      createdPrograms++;
      await sleep(600);
    }
  } else {
    console.log(`reuse program: ${program.programName} → ${live.programId}`);
  }

  // Existing sessions (idempotent re-runs).
  const existing = new Set();
  if (live?.programId) {
    const t = await api(
      "GET",
      `/api/programTemplates?programId=${encodeURIComponent(live.programId)}`
    );
    for (const row of t.templates || []) existing.add(`${row.week}-${row.day}`);
  }

  for (const s of sessions) {
    const key = `${s.week}-${s.day}`;
    if (existing.has(key)) {
      skippedSessions++;
      continue;
    }
    if (!APPLY) {
      createdSessions++;
      continue;
    }
    const exercises = buildExercises(s.def, s.week, exIndex);
    const body = {
      programId: live.programId,
      programRecordId: live.recordId || live.programId,
      week: s.week,
      day: s.day,
      sessionName: s.def.name,
      sessionNameCn: s.def.nameCn,
      sessionType: s.def.type,
      sessionGoal: s.def.goal || "",
      estimatedDuration: s.cardio ? 30 : 60,
      exercises,
    };
    const res = await api("POST", "/api/createWorkoutTemplate", body);
    if (!res.success && !res.templateId && !res.recordId) {
      console.log(`  !! W${s.week}D${s.day} unexpected:`, JSON.stringify(res).slice(0, 120));
    }
    createdSessions++;
    if (createdSessions % 10 === 0) console.log(`  …${createdSessions} sessions written`);
    await sleep(450);
  }
  console.log(`  ${program.programName}: planned ${sessions.length}, existing ${existing.size}`);
}

console.log(
  `\n${APPLY ? "DONE" : "DRY RUN"}: programs created ${createdPrograms}, sessions ${APPLY ? "written" : "to write"} ${createdSessions}, skipped existing ${skippedSessions}`
);
