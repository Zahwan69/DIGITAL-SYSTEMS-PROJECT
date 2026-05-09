// Test fixture content for IGCSE Physics (Cambridge 0625).
// 20 questions = 8 MCQ + 12 short/structured response.

export default {
  subjectName: "IGCSE Physics",
  syllabusCode: "0625",
  level: "IGCSE",
  papers: [
    {
      title: "Paper 1",
      questions: [
        {
          type: "mcq",
          topic: "Mechanics",
          difficulty: "easy",
          marks: 1,
          text: "Which quantity is a vector?",
          options: [
            { label: "A", text: "Mass" },
            { label: "B", text: "Speed" },
            { label: "C", text: "Velocity" },
            { label: "D", text: "Energy" },
          ],
          answer: "C",
          scheme: "C — velocity has both magnitude and direction; speed has magnitude only.",
        },
        {
          type: "mcq",
          topic: "Mechanics",
          difficulty: "medium",
          marks: 1,
          text: "A car accelerates uniformly from rest to 20 m/s in 5 s. What is its acceleration?",
          options: [
            { label: "A", text: "2 m/s²" },
            { label: "B", text: "4 m/s²" },
            { label: "C", text: "5 m/s²" },
            { label: "D", text: "100 m/s²" },
          ],
          answer: "B",
          scheme: "B — a = (v − u) / t = (20 − 0) / 5 = 4 m/s².",
        },
        {
          type: "mcq",
          topic: "Energy",
          difficulty: "easy",
          marks: 1,
          text: "What energy transformation occurs in an electric kettle?",
          options: [
            { label: "A", text: "Chemical → kinetic" },
            { label: "B", text: "Electrical → thermal" },
            { label: "C", text: "Light → electrical" },
            { label: "D", text: "Nuclear → chemical" },
          ],
          answer: "B",
          scheme: "B — electrical energy supplied to the heating element is transferred as thermal (heat) energy to the water.",
        },
        {
          type: "mcq",
          topic: "Waves",
          difficulty: "medium",
          marks: 1,
          text: "A wave has a frequency of 50 Hz and wavelength of 4 m. What is its speed?",
          options: [
            { label: "A", text: "12.5 m/s" },
            { label: "B", text: "54 m/s" },
            { label: "C", text: "200 m/s" },
            { label: "D", text: "250 m/s" },
          ],
          answer: "C",
          scheme: "C — v = f × λ = 50 × 4 = 200 m/s.",
        },
        {
          type: "mcq",
          topic: "Electricity",
          difficulty: "medium",
          marks: 1,
          text: "Two 6 Ω resistors are connected in parallel. What is the combined resistance?",
          options: [
            { label: "A", text: "0.5 Ω" },
            { label: "B", text: "3 Ω" },
            { label: "C", text: "6 Ω" },
            { label: "D", text: "12 Ω" },
          ],
          answer: "B",
          scheme: "B — 1/R = 1/6 + 1/6 = 2/6, so R = 3 Ω.",
        },
        {
          type: "mcq",
          topic: "Thermal physics",
          difficulty: "medium",
          marks: 1,
          text: "Which best describes how a metal block conducts heat?",
          options: [
            { label: "A", text: "Movement of free electrons and lattice vibrations" },
            { label: "B", text: "Bulk movement of fluid carrying energy" },
            { label: "C", text: "Emission of electromagnetic waves" },
            { label: "D", text: "Random rearrangement of metal atoms" },
          ],
          answer: "A",
          scheme: "A — conduction in metals is dominated by free (delocalised) electrons transferring kinetic energy, supported by atomic lattice vibrations.",
        },
        {
          type: "mcq",
          topic: "Magnetism",
          difficulty: "easy",
          marks: 1,
          text: "Which material is NOT magnetic?",
          options: [
            { label: "A", text: "Iron" },
            { label: "B", text: "Copper" },
            { label: "C", text: "Cobalt" },
            { label: "D", text: "Nickel" },
          ],
          answer: "B",
          scheme: "B — copper is not ferromagnetic. Iron, cobalt, and nickel are.",
        },
        {
          type: "mcq",
          topic: "Atomic physics",
          difficulty: "hard",
          marks: 1,
          text: "An alpha particle has the same charge and mass as which of the following?",
          options: [
            { label: "A", text: "An electron" },
            { label: "B", text: "A proton" },
            { label: "C", text: "A helium-4 nucleus" },
            { label: "D", text: "A neutron" },
          ],
          answer: "C",
          scheme: "C — an alpha particle is a helium-4 nucleus (2 protons + 2 neutrons), charge +2, mass ~4 u.",
        },
        {
          type: "text",
          topic: "Mechanics",
          difficulty: "medium",
          marks: 5,
          text:
            "A 5 kg trolley is pushed horizontally with a force of 30 N. Friction between the trolley and the floor is 5 N. Calculate the acceleration of the trolley and state any assumption you have made.",
          scheme:
            "Net force = applied force − friction = 30 − 5 = 25 N (1). Use F = ma (1). a = F / m = 25 / 5 = 5 m/s² (1). Assumption (1 each, max 2): horizontal motion only / mass is constant / friction is constant / no air resistance / trolley moves in a straight line.",
        },
        {
          type: "text",
          topic: "Mechanics",
          difficulty: "hard",
          marks: 6,
          text:
            "A ball is dropped from rest from a height of 20 m. Ignoring air resistance and taking g = 10 m/s², calculate (i) the time taken to reach the ground, and (ii) its speed just before impact.",
          scheme:
            "(i) Use s = ut + ½at² with u = 0; 20 = ½ × 10 × t² (1); t² = 4 (1); t = 2 s (1). (ii) Use v = u + at = 0 + 10 × 2 (1); v = 20 m/s (1). Marks for working/clear method and final answer with units (1).",
        },
        {
          type: "text",
          topic: "Energy",
          difficulty: "medium",
          marks: 4,
          text:
            "Define the law of conservation of energy. Use it to explain the energy changes when a child slides down a slide and comes to rest at the bottom.",
          scheme:
            "Energy cannot be created or destroyed, only transferred or transformed (1). At the top: gravitational potential energy is at its maximum (1). As the child slides, GPE is transferred to kinetic energy (1) and to thermal energy (heat) due to friction. Eventually the child stops; remaining kinetic energy has been transferred entirely to thermal energy in the slide and the surroundings (1).",
        },
        {
          type: "text",
          topic: "Thermal physics",
          difficulty: "hard",
          marks: 5,
          text:
            "Calculate the energy required to heat 2.0 kg of water from 20 °C to 80 °C. Specific heat capacity of water = 4200 J/kg/°C. Show your working.",
          scheme:
            "Q = m × c × ΔT (1). ΔT = 80 − 20 = 60 °C (1). Q = 2.0 × 4200 × 60 (1). Q = 504 000 J or 504 kJ (1). Marks for correct units and final answer (1).",
        },
        {
          type: "text",
          topic: "Waves",
          difficulty: "medium",
          marks: 5,
          text:
            "Describe the differences between transverse and longitudinal waves. Give an example of each and state how the particles vibrate relative to the direction of energy transfer.",
          scheme:
            "Transverse: particles vibrate perpendicular to direction of energy transfer (1); example: light / electromagnetic / water surface waves / waves on a string (1). Longitudinal: particles vibrate parallel to direction of energy transfer (1); example: sound waves / pressure waves in a slinky (1). Both transfer energy but not matter (1).",
        },
        {
          type: "text",
          topic: "Waves",
          difficulty: "medium",
          marks: 4,
          text:
            "Explain refraction of light when a ray passes from air into glass at an angle. State what happens to the speed, wavelength, and frequency of the light.",
          scheme:
            "Light slows down when entering the denser medium (glass) (1). Wavelength decreases (1). Frequency stays the same (1). Because of the speed change, the ray bends towards the normal at the air-glass boundary (1).",
        },
        {
          type: "text",
          topic: "Electricity",
          difficulty: "hard",
          marks: 6,
          text:
            "Two 4 Ω resistors in parallel are connected in series with a 6 Ω resistor across a 12 V battery. Calculate (i) the total circuit resistance, (ii) the total current, and (iii) the voltage across the parallel combination.",
          scheme:
            "(i) Parallel resistance = (4 × 4) / (4 + 4) = 2 Ω (1); total resistance = 2 + 6 = 8 Ω (1). (ii) I = V / R = 12 / 8 = 1.5 A (1). (iii) V across parallel = I × R_parallel = 1.5 × 2 = 3.0 V (1). Marks for clear working (1) and units throughout (1).",
        },
        {
          type: "text",
          topic: "Electricity",
          difficulty: "easy",
          marks: 3,
          text:
            "State Ohm's law and describe the conditions under which it applies. Give the formula linking voltage, current, and resistance.",
          scheme:
            "Ohm's law: the current through a metallic conductor is directly proportional to the voltage applied across it, provided temperature (and other physical conditions) remain constant (1). Conditions: temperature constant; conductor is ohmic / metallic (1). Formula: V = IR (1).",
        },
        {
          type: "text",
          topic: "Magnetism",
          difficulty: "medium",
          marks: 4,
          text:
            "Describe how to use the right-hand grip rule to find the direction of the magnetic field around a long straight current-carrying wire.",
          scheme:
            "Grip the wire with the right hand (1). Point the thumb in the direction of conventional current (positive to negative) (1). The fingers curl around the wire in the direction of the magnetic field (1). The field forms concentric circles around the wire (1).",
        },
        {
          type: "text",
          topic: "Atomic physics",
          difficulty: "medium",
          marks: 5,
          text:
            "Describe the three main types of nuclear radiation: alpha, beta, and gamma. Compare their nature, charge, and penetrating power.",
          scheme:
            "Alpha: helium-4 nucleus (2p + 2n), charge +2, stopped by paper / a few cm of air (1). Beta: high-energy electron emitted from nucleus, charge −1, stopped by a few mm of aluminium (1). Gamma: high-frequency electromagnetic wave, no charge, reduced by thick lead / concrete (1). Order of penetrating power: gamma > beta > alpha (1). Order of ionising power: alpha > beta > gamma (1).",
        },
        {
          type: "text",
          topic: "Pressure",
          difficulty: "medium",
          marks: 4,
          text:
            "Define pressure and give its SI unit. A force of 200 N is applied to a surface of area 0.5 m². Calculate the pressure exerted.",
          scheme:
            "Pressure = force per unit area (1). SI unit: pascal (Pa) or N/m² (1). P = F / A = 200 / 0.5 = 400 Pa (1). Mark for working / units throughout (1).",
        },
        {
          type: "text",
          topic: "Energy",
          difficulty: "medium",
          marks: 5,
          text:
            "An electric motor lifts a 50 kg crate vertically through 4 m in 8 s. Take g = 10 m/s². Calculate (i) the work done against gravity, and (ii) the average power output of the motor.",
          scheme:
            "(i) Work done = force × distance = (m × g) × h = 50 × 10 × 4 (1); W = 2000 J (1). (ii) Power = work / time = 2000 / 8 (1); P = 250 W (1). Mark for clear method / units (1).",
        },
      ],
    },
  ],
};
