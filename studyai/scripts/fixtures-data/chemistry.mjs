// Test fixture content for IGCSE Chemistry (Cambridge 0620).
// 20 questions = 8 MCQ + 12 short/structured response.

export default {
  subjectName: "IGCSE Chemistry",
  syllabusCode: "0620",
  level: "IGCSE",
  papers: [
    {
      title: "Paper 1",
      questions: [
        {
          type: "mcq",
          topic: "Atomic structure",
          difficulty: "easy",
          marks: 1,
          text: "Which subatomic particle has approximately no mass and a negative charge?",
          options: [
            { label: "A", text: "Proton" },
            { label: "B", text: "Neutron" },
            { label: "C", text: "Electron" },
            { label: "D", text: "Nucleon" },
          ],
          answer: "C",
          scheme: "C — electrons have negligible mass (1/1836 of a proton) and a relative charge of −1.",
        },
        {
          type: "mcq",
          topic: "Atomic structure",
          difficulty: "medium",
          marks: 1,
          text: "Carbon-14 and Carbon-12 differ in the number of:",
          options: [
            { label: "A", text: "Protons only" },
            { label: "B", text: "Neutrons only" },
            { label: "C", text: "Electrons only" },
            { label: "D", text: "Protons and electrons" },
          ],
          answer: "B",
          scheme: "B — isotopes have the same atomic number (protons) but different mass numbers (different neutrons).",
        },
        {
          type: "mcq",
          topic: "Bonding",
          difficulty: "medium",
          marks: 1,
          text: "Which compound contains a covalent bond?",
          options: [
            { label: "A", text: "Sodium chloride (NaCl)" },
            { label: "B", text: "Magnesium oxide (MgO)" },
            { label: "C", text: "Water (H2O)" },
            { label: "D", text: "Calcium fluoride (CaF2)" },
          ],
          answer: "C",
          scheme: "C — water is formed by sharing electrons between H and O. The others are ionic compounds (metal + non-metal).",
        },
        {
          type: "mcq",
          topic: "Acids and bases",
          difficulty: "easy",
          marks: 1,
          text: "What colour does universal indicator turn in a strong acid?",
          options: [
            { label: "A", text: "Green" },
            { label: "B", text: "Purple" },
            { label: "C", text: "Red" },
            { label: "D", text: "Yellow" },
          ],
          answer: "C",
          scheme: "C — strong acids (pH 0–2) turn universal indicator red.",
        },
        {
          type: "mcq",
          topic: "The periodic table",
          difficulty: "medium",
          marks: 1,
          text: "Which group of elements is most reactive with water at room temperature?",
          options: [
            { label: "A", text: "Group I (alkali metals)" },
            { label: "B", text: "Group VII (halogens)" },
            { label: "C", text: "Group 0 (noble gases)" },
            { label: "D", text: "Transition metals" },
          ],
          answer: "A",
          scheme: "A — Group I metals (Li, Na, K, ...) react vigorously with water to produce hydrogen and an alkaline hydroxide.",
        },
        {
          type: "mcq",
          topic: "Electrolysis",
          difficulty: "medium",
          marks: 1,
          text: "During the electrolysis of molten lead bromide, what is produced at the cathode?",
          options: [
            { label: "A", text: "Bromine gas" },
            { label: "B", text: "Hydrogen gas" },
            { label: "C", text: "Lead metal" },
            { label: "D", text: "Oxygen gas" },
          ],
          answer: "C",
          scheme: "C — positive metal ions (Pb2+) are attracted to the cathode and gain electrons to form lead atoms.",
        },
        {
          type: "mcq",
          topic: "Organic chemistry",
          difficulty: "medium",
          marks: 1,
          text: "Bromine water is added to ethene gas. What is observed?",
          options: [
            { label: "A", text: "No change" },
            { label: "B", text: "Orange to colourless" },
            { label: "C", text: "Colourless to red" },
            { label: "D", text: "Effervescence is produced" },
          ],
          answer: "B",
          scheme: "B — alkenes decolourise bromine water by addition across the C=C double bond.",
        },
        {
          type: "mcq",
          topic: "Stoichiometry",
          difficulty: "hard",
          marks: 1,
          text: "What is the relative formula mass (Mr) of calcium carbonate, CaCO3? (Ar: Ca=40, C=12, O=16)",
          options: [
            { label: "A", text: "68" },
            { label: "B", text: "84" },
            { label: "C", text: "100" },
            { label: "D", text: "116" },
          ],
          answer: "C",
          scheme: "C — Mr(CaCO3) = 40 + 12 + (3 × 16) = 100.",
        },
        {
          type: "text",
          topic: "Atomic structure",
          difficulty: "easy",
          marks: 4,
          text:
            "An atom of magnesium has the symbol 24/12 Mg. State the number of protons, neutrons, and electrons in this atom, and explain how you arrived at the number of neutrons.",
          scheme:
            "Protons = 12 (atomic number) (1). Electrons = 12 (neutral atom, equal to protons) (1). Neutrons = 12 (1). Method: neutrons = mass number − atomic number = 24 − 12 = 12 (1).",
        },
        {
          type: "text",
          topic: "Bonding",
          difficulty: "medium",
          marks: 4,
          text:
            "Explain why sodium chloride has a high melting point but methane (CH4) has a low melting point.",
          scheme:
            "Sodium chloride is an ionic compound with a giant ionic lattice (1). Strong electrostatic forces hold oppositely charged ions together (1). A lot of energy is required to break these strong forces, so the melting point is high (1). Methane is a simple molecular compound with weak intermolecular forces between molecules; only a little energy is needed to overcome them, giving a low melting point (1).",
        },
        {
          type: "text",
          topic: "Stoichiometry",
          difficulty: "hard",
          marks: 6,
          text:
            "Calcium carbonate (CaCO3) is heated and decomposes to calcium oxide (CaO) and carbon dioxide (CO2). Calculate the mass of CO2 produced when 25.0 g of CaCO3 fully decomposes. (Mr: CaCO3 = 100, CaO = 56, CO2 = 44)",
          scheme:
            "Equation: CaCO3 → CaO + CO2 (1). Moles of CaCO3 = 25.0 / 100 = 0.25 mol (1). 1 : 1 mole ratio means moles of CO2 produced = 0.25 mol (1). Mass of CO2 = 0.25 × 44 = 11.0 g (1). Marks for working (1) and final answer with units (1).",
        },
        {
          type: "text",
          topic: "Acids and bases",
          difficulty: "medium",
          marks: 4,
          text:
            "Hydrochloric acid reacts with magnesium ribbon. Write the balanced symbol equation for this reaction and describe two observations.",
          scheme:
            "Mg + 2HCl → MgCl2 + H2 (1 for correct formulae; 1 for balanced). Observations (1 each, max 2): bubbles / effervescence; magnesium ribbon disappears / dissolves; mixture becomes warm; colourless solution remains.",
        },
        {
          type: "text",
          topic: "The periodic table",
          difficulty: "medium",
          marks: 5,
          text:
            "Describe how reactivity changes down Group I (alkali metals) and explain why this trend occurs.",
          scheme:
            "Reactivity increases down the group (1). Atoms become larger as more electron shells are added (1). The outer electron is further from the nucleus and more shielded by inner electrons (1). The outer electron is therefore less strongly attracted and more easily lost during reactions (1). The metals form ions (M+) more easily, making them more reactive (1).",
        },
        {
          type: "text",
          topic: "Electrolysis",
          difficulty: "hard",
          marks: 5,
          text:
            "Describe what happens at each electrode during the electrolysis of dilute aqueous sodium chloride. Include the products formed and the half-equation at the cathode.",
          scheme:
            "Cathode (negative): hydrogen gas is produced (water preferred over Na+) (1); 2H+ + 2e− → H2 (or 2H2O + 2e− → H2 + 2OH−) (1). Anode (positive): chlorine gas if concentrated, or oxygen gas if dilute (1). Solution near anode becomes more alkaline (1). Overall: H2 at cathode, O2 (or Cl2) at anode (1).",
        },
        {
          type: "text",
          topic: "Rates of reaction",
          difficulty: "medium",
          marks: 5,
          text:
            "Explain how increasing the temperature affects the rate of a chemical reaction. Refer to particles and activation energy.",
          scheme:
            "Particles move faster at higher temperatures (1). They collide more frequently (1). A larger proportion of collisions has energy ≥ the activation energy (1). Therefore, the rate of successful collisions per unit time increases (1). Overall, the rate of reaction increases (1).",
        },
        {
          type: "text",
          topic: "Organic chemistry",
          difficulty: "medium",
          marks: 4,
          text:
            "Define a homologous series. Give two general features that members of a homologous series share, and give an example of one such series.",
          scheme:
            "A homologous series is a family of organic compounds with the same general formula and similar chemical properties, where members differ by a CH2 unit (1). Features (1 each, max 2): same general formula; same functional group; gradual change in physical properties (e.g. boiling point) down the series; can be prepared by similar methods. Example: alkanes (CnH2n+2) / alkenes (CnH2n) / alcohols (CnH2n+1OH) (1).",
        },
        {
          type: "text",
          topic: "Acids and bases",
          difficulty: "medium",
          marks: 4,
          text:
            "Describe how you would carry out a titration to find the concentration of a sodium hydroxide solution using hydrochloric acid of known concentration.",
          scheme:
            "Use a pipette to measure a fixed volume of NaOH into a conical flask (1); add a few drops of indicator (e.g. methyl orange or phenolphthalein) (1); fill a burette with the HCl of known concentration; add HCl slowly while swirling until indicator changes colour (end point) (1); record titre and repeat for concordant results, then calculate concentration using moles and stoichiometry (1).",
        },
        {
          type: "text",
          topic: "Metals and extraction",
          difficulty: "medium",
          marks: 5,
          text:
            "Iron is extracted from iron(III) oxide in a blast furnace. State the main raw materials and give a balanced equation for the reduction of iron(III) oxide by carbon monoxide.",
          scheme:
            "Raw materials (1 each, max 3): iron ore (haematite, Fe2O3); coke (carbon); limestone (CaCO3); hot air. Equation: Fe2O3 + 3CO → 2Fe + 3CO2 (1 for formulae; 1 for balancing).",
        },
        {
          type: "text",
          topic: "Air and environment",
          difficulty: "easy",
          marks: 3,
          text:
            "State two greenhouse gases and explain how they contribute to climate change.",
          scheme:
            "Two of: CO2, methane (CH4), water vapour, nitrous oxide (1 each, max 2). They absorb infrared radiation re-emitted from Earth's surface, trapping heat in the atmosphere and raising global temperatures (1).",
        },
        {
          type: "text",
          topic: "Stoichiometry",
          difficulty: "hard",
          marks: 6,
          text:
            "Zinc reacts with dilute sulfuric acid: Zn + H2SO4 → ZnSO4 + H2. Calculate the volume of hydrogen gas produced at room temperature when 6.5 g of zinc reacts completely. (Ar: Zn=65; molar volume of gas at room T&P = 24 dm3)",
          scheme:
            "Moles of Zn = 6.5 / 65 = 0.10 mol (1). Mole ratio Zn : H2 is 1 : 1 (1). Moles of H2 = 0.10 mol (1). Volume of H2 = 0.10 × 24 = 2.4 dm3 (or 2400 cm3) (1). Marks for working (1) and answer with correct units (1).",
        },
      ],
    },
  ],
};
