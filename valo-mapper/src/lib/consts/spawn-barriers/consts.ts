import { MapSpawnBarrierData } from "@/lib/types";

export const MAP_SPAWN_BARRIERS: Record<string, MapSpawnBarrierData> = {
  ascent: {
    barriers: [
      { startX: 676, startY: 660, endX: 715, endY: 660, isAlly: true },
      { startX: 276, startY: 585, endX: 305, endY: 585, isAlly: true },
      { startX: 36, startY: 565, endX: 83, endY: 565, isAlly: true },
      { startX: 460, startY: 660, endX: 524, endY: 660, isAlly: true },
      { startX: 330, startY: 263, endX: 330, endY: 327, isAlly: false },
      { startX: 800, startY: 520, endX: 837, endY: 520, isAlly: false },
      { startX: 670, startY: 455, endX: 670, endY: 493, isAlly: false },
      { startX: 159, startY: 390, endX: 252, endY: 390, isAlly: false },
    ],
  },
  corrode: {
    barriers: [
      { startX: 855, startY: 532, endX: 913, endY: 532, isAlly: true },
      { startX: 480, startY: 706, endX: 520, endY: 706, isAlly: true },
      { startX: 87, startY: 463, endX: 145, endY: 463, isAlly: true },
      { startX: 307, startY: 552, endX: 307, endY: 592, isAlly: true },
      { startX: 692, startY: 605, endX: 692, endY: 644, isAlly: true },
      { startX: 602, startY: 260, endX: 602, endY: 220, isAlly: false },
      { startX: 706, startY: 365, endX: 782, endY: 365, isAlly: false },
      { startX: 412, startY: 331, endX: 412, endY: 291, isAlly: false },
      { startX: 183, startY: 293, endX: 294, endY: 293, isAlly: false },
    ],
  },
  split: {
    barriers: [
      { startX: 119, startY: 603, endX: 163, endY: 603, isAlly: true },
      { startX: 264, startY: 600, endX: 360, endY: 600, isAlly: true },
      { startX: 506, startY: 578, endX: 535, endY: 578, isAlly: true },
      { startX: 675, startY: 505, endX: 675, endY: 549, isAlly: true },
      { startX: 990, startY: 564, endX: 1050, endY: 564, isAlly: true },
      { startX: 400, startY: 345, endX: 400, endY: 387, isAlly: false },
      { startX: 13, startY: 410, endX: 85, endY: 410, isAlly: false },
      { startX: 715, startY: 306, endX: 715, endY: 386, isAlly: false },
      { startX: 803, startY: 341, endX: 925, endY: 341, isAlly: false },
    ],
  },
  haven: {
    barriers: [
      { startX: 900, startY: 482, endX: 954, endY: 482, isAlly: true },
      { startX: 609, startY: 500, endX: 717, endY: 500, isAlly: true },
      { startX: 487, startY: 533, endX: 531, endY: 533, isAlly: true },
      { startX: 185, startY: 549, endX: 185, endY: 507, isAlly: true },
      { startX: 23, startY: 482, endX: 69, endY: 482, isAlly: true },
      { startX: 832, startY: 225, endX: 832, endY: 268, isAlly: false },
      { startX: 580, startY: 232, endX: 629, endY: 232, isAlly: false },
      { startX: 462, startY: 308, endX: 462, endY: 263, isAlly: false },
      { startX: 300, startY: 242, endX: 407, endY: 242, isAlly: false },
    ],
  },
  bind: {
    barriers: [
      { startX: 152, startY: 621, endX: 181, endY: 621, isAlly: true },
      { startX: 695, startY: 556, endX: 695, endY: 592, isAlly: true },
      { startX: 802, startY: 637, endX: 838, endY: 637, isAlly: true },
      { startX: 321, startY: 580, endX: 369, endY: 580, isAlly: true },
      { startX: 371, startY: 597, endX: 371, endY: 632, isAlly: true },
      { startX: 413, startY: 467, endX: 413, endY: 488, isAlly: false },
      { startX: 614, startY: 415, endX: 644, endY: 415, isAlly: false },
      { startX: 740, startY: 325, endX: 740, endY: 275, isAlly: false },
      { startX: 152, startY: 394, endX: 152, endY: 325, isAlly: false },
    ],
  },
  breeze: {
    barriers: [
      { startX: 200, startY: 300, endX: 350, endY: 300, isAlly: false },
      { startX: 800, startY: 700, endX: 950, endY: 700, isAlly: true },
    ],
  },
  fracture: {
    barriers: [
      { startX: 944, startY: 642, endX: 944, endY: 682, isAlly: true },
      { startX: 926, startY: 351, endX: 987, endY: 351, isAlly: true },
      { startX: 807, startY: 548, endX: 859, endY: 548, isAlly: true },
      { startX: 46, startY: 282, endX: 130, endY: 282, isAlly: true },
      { startX: 384, startY: 346, endX: 384, endY: 307, isAlly: true },
      { startX: 107, startY: 674, endX: 177, endY: 674, isAlly: true },
      { startX: 286, startY: 460, endX: 286, endY: 390, isAlly: true },
      { startX: 380, startY: -30, endX: 380, endY: 59, isAlly: false },
      { startX: 696, startY: 67, endX: 696, endY: 120, isAlly: false },
      { startX: 358, startY: 925, endX: 358, endY: 1012, isAlly: false },
      { startX: 658, startY: 918, endX: 749, endY: 1013, isAlly: false },
    ],
  },
  pearl: {
    barriers: [
      { startX: 60, startY: 596, endX: 118, endY: 596, isAlly: true },
      { startX: 217, startY: 517, endX: 301, endY: 517, isAlly: true },
      { startX: 536, startY: 464, endX: 536, endY: 546, isAlly: true },
      { startX: 954, startY: 480, endX: 1071, endY: 480, isAlly: true },
      { startX: 143, startY: 338, endX: 254, endY: 338, isAlly: false },
      { startX: 311, startY: 185, endX: 311, endY: 244, isAlly: false },
      { startX: 588, startY: 280, endX: 666, endY: 280, isAlly: false },
      { startX: 710, startY: 125, endX: 834, endY: 125, isAlly: false },
    ],
  },
  lotus: {
    barriers: [
      { startX: 289, startY: 290, endX: 328, endY: 290, isAlly: false },
      { startX: 455, startY: 226, endX: 521, endY: 226, isAlly: false },
      { startX: 633, startY: 67, endX: 633, endY: 234, isAlly: false },
      { startX: 303, startY: 545, endX: 303, endY: 572, isAlly: true },
      { startX: 157, startY: 573, endX: 238, endY: 573, isAlly: true },
      { startX: 554, startY: 486, endX: 604, endY: 486, isAlly: true },
      { startX: 855, startY: 418, endX: 855, endY: 479, isAlly: true },
      { startX: 27, startY: 486, endX: 27, endY: 589, isAlly: true },
    ],
  },
  sunset: {
    barriers: [
      { startX: 224, startY: 560, endX: 288, endY: 560, isAlly: true },
      { startX: -50, startY: 622, endX: -5, endY: 622, isAlly: true },
      { startX: 467, startY: 690, endX: 532, endY: 690, isAlly: true },
      { startX: 670, startY: 536, endX: 670, endY: 581, isAlly: true },
      { startX: 956, startY: 405, endX: 1020, endY: 405, isAlly: true },
      { startX: 187, startY: 302, endX: 187, endY: 386, isAlly: false },
      { startX: 311, startY: 380, endX: 311, endY: 425, isAlly: false },
      { startX: 598, startY: 302, endX: 598, endY: 386, isAlly: false },
      { startX: 714, startY: 261, endX: 749, endY: 226, isAlly: false },
    ],
  },
  icebox: {
    barriers: [
      { startX: -5, startY: 704, endX: 232, endY: 704, isAlly: true },
      { startX: 417, startY: 718, endX: 483, endY: 718, isAlly: true },
      { startX: 317, startY: 704, endX: 380, endY: 704, isAlly: true },
      { startX: 515, startY: 713, endX: 552, endY: 713, isAlly: true },
      { startX: 584, startY: 713, endX: 605, endY: 713, isAlly: true },
      { startX: 686, startY: 574, endX: 686, endY: 628, isAlly: true },
      { startX: 815, startY: 372, endX: 815, endY: 485, isAlly: true },
      { startX: 591, startY: 254, endX: 591, endY: 283, isAlly: false },
      { startX: 548, startY: 313, endX: 588, endY: 313, isAlly: false },
      { startX: 25, startY: 338, endX: 85, endY: 338, isAlly: false },
      { startX: 186, startY: 338, endX: 252, endY: 338, isAlly: false },
      { startX: 319, startY: 371, endX: 428, endY: 371, isAlly: false },
    ],
  },
  abyss: {
    barriers: [
      { startX: 918, startY: 487, endX: 1107, endY: 487, isAlly: true },
      { startX: 495, startY: 740, endX: 543, endY: 740, isAlly: true },
      { startX: 381, startY: 679, endX: 462, endY: 679, isAlly: true },
      { startX: 242, startY: 558, endX: 242, endY: 584, isAlly: true },
      { startX: -16, startY: 400, endX: 59, endY: 400, isAlly: true },
      { startX: 638, startY: 704, endX: 638, endY: 659, isAlly: true },
      { startX: 791, startY: 258, endX: 853, endY: 258, isAlly: false },
      { startX: 860, startY: 200, endX: 900, endY: 200, isAlly: false },
      { startX: 366, startY: 199, endX: 431, endY: 199, isAlly: false },
      { startX: 96, startY: 186, endX: 239, endY: 186, isAlly: false },
    ],
  },
};

export const getMapSpawnBarriers = (
  mapId: string
): MapSpawnBarrierData | undefined => {
  return MAP_SPAWN_BARRIERS[mapId];
};
