// Test fixture content for IGCSE Biology (Cambridge 0610).
// 20 questions = 8 MCQ + 12 short/structured response.

export default {
  subjectName: "IGCSE Biology",
  syllabusCode: "0610",
  level: "IGCSE",
  papers: [
    {
      title: "Paper 1",
      questions: [
        {
          type: "mcq",
          topic: "Cell biology",
          difficulty: "easy",
          marks: 1,
          text: "Which organelle is the site of protein synthesis in a cell?",
          options: [
            { label: "A", text: "Mitochondrion" },
            { label: "B", text: "Ribosome" },
            { label: "C", text: "Lysosome" },
            { label: "D", text: "Golgi apparatus" },
          ],
          answer: "B",
          scheme: "B — ribosomes are the site where amino acids are joined to form proteins.",
        },
        {
          type: "mcq",
          topic: "Cell biology",
          difficulty: "easy",
          marks: 1,
          text: "Which structure is found in plant cells but not animal cells?",
          options: [
            { label: "A", text: "Cell membrane" },
            { label: "B", text: "Nucleus" },
            { label: "C", text: "Chloroplast" },
            { label: "D", text: "Cytoplasm" },
          ],
          answer: "C",
          scheme: "C — chloroplasts contain chlorophyll and are exclusive to photosynthesising plant cells.",
        },
        {
          type: "mcq",
          topic: "Diffusion and osmosis",
          difficulty: "medium",
          marks: 1,
          text: "A plant cell is placed in a concentrated sugar solution. What will most likely happen?",
          options: [
            { label: "A", text: "The cell will burst" },
            { label: "B", text: "The cell will become turgid" },
            { label: "C", text: "The cell will become plasmolysed" },
            { label: "D", text: "No change will occur" },
          ],
          answer: "C",
          scheme: "C — water leaves the cell by osmosis, causing the cytoplasm to shrink away from the cell wall (plasmolysis).",
        },
        {
          type: "mcq",
          topic: "Genetics",
          difficulty: "medium",
          marks: 1,
          text: "Two heterozygous tall pea plants (Tt) are crossed. What is the expected ratio of tall to short offspring?",
          options: [
            { label: "A", text: "1 : 1" },
            { label: "B", text: "3 : 1" },
            { label: "C", text: "1 : 2 : 1" },
            { label: "D", text: "All tall" },
          ],
          answer: "B",
          scheme: "B — Tt × Tt gives genotypes 1 TT : 2 Tt : 1 tt, phenotype ratio 3 tall : 1 short.",
        },
        {
          type: "mcq",
          topic: "Ecology",
          difficulty: "easy",
          marks: 1,
          text: "In a food chain, the organisms at the second trophic level are called:",
          options: [
            { label: "A", text: "Producers" },
            { label: "B", text: "Primary consumers" },
            { label: "C", text: "Secondary consumers" },
            { label: "D", text: "Decomposers" },
          ],
          answer: "B",
          scheme: "B — primary consumers are herbivores that feed on producers (plants).",
        },
        {
          type: "mcq",
          topic: "Human physiology",
          difficulty: "medium",
          marks: 1,
          text: "Which blood vessel carries oxygenated blood from the lungs to the heart?",
          options: [
            { label: "A", text: "Pulmonary artery" },
            { label: "B", text: "Pulmonary vein" },
            { label: "C", text: "Aorta" },
            { label: "D", text: "Vena cava" },
          ],
          answer: "B",
          scheme: "B — pulmonary veins are the only veins that carry oxygenated blood (from lungs to left atrium).",
        },
        {
          type: "mcq",
          topic: "Plants",
          difficulty: "medium",
          marks: 1,
          text: "Which factor would increase the rate of photosynthesis in a healthy plant on a sunny day?",
          options: [
            { label: "A", text: "Decreasing temperature to 0 °C" },
            { label: "B", text: "Increasing carbon dioxide concentration" },
            { label: "C", text: "Reducing light intensity" },
            { label: "D", text: "Removing water from the soil" },
          ],
          answer: "B",
          scheme: "B — CO2 is a reactant in photosynthesis; raising it increases the rate until another factor becomes limiting.",
        },
        {
          type: "mcq",
          topic: "Reproduction",
          difficulty: "easy",
          marks: 1,
          text: "Which of the following is a feature of meiosis but NOT mitosis?",
          options: [
            { label: "A", text: "DNA replication occurs" },
            { label: "B", text: "Two daughter cells are produced" },
            { label: "C", text: "Chromosome number is halved" },
            { label: "D", text: "Cells are genetically identical to the parent" },
          ],
          answer: "C",
          scheme: "C — meiosis halves chromosome number to produce haploid gametes; mitosis maintains it.",
        },
        {
          type: "text",
          topic: "Cell biology",
          difficulty: "medium",
          marks: 4,
          text:
            "Compare the structure of a typical plant cell with a typical animal cell. Give two similarities and two differences.",
          scheme:
            "Similarities (1 mark each, max 2): both have nucleus / cell membrane / cytoplasm / mitochondria / ribosomes. Differences (1 mark each, max 2): plant cell has cell wall (animal does not); plant cell has chloroplasts; plant cell has a large permanent vacuole; animal cell has more variable shape.",
        },
        {
          type: "text",
          topic: "Diffusion and osmosis",
          difficulty: "medium",
          marks: 5,
          text:
            "Define osmosis and explain how it differs from diffusion. Give one example of osmosis in a living organism.",
          scheme:
            "Osmosis: net movement of water (1) from a region of higher water potential to lower water potential (1) through a partially permeable membrane (1). Difference from diffusion: osmosis is specific to water and requires a partially permeable membrane; diffusion is the net movement of any particle from high to low concentration (1). Example: water uptake by plant root hair cells / water reabsorption in the kidney collecting duct (1).",
        },
        {
          type: "text",
          topic: "Plants",
          difficulty: "medium",
          marks: 5,
          text:
            "Write the balanced word and chemical equations for photosynthesis. State two factors that may limit the rate of photosynthesis.",
          scheme:
            "Word equation: carbon dioxide + water → glucose + oxygen (in the presence of light and chlorophyll) (1). Chemical equation: 6CO2 + 6H2O → C6H12O6 + 6O2 (1, balanced; 1 mark for arrows/reactants/products correct). Limiting factors (1 mark each, max 2): light intensity, carbon dioxide concentration, temperature, chlorophyll concentration, water availability.",
        },
        {
          type: "text",
          topic: "Respiration",
          difficulty: "hard",
          marks: 6,
          text:
            "Compare aerobic and anaerobic respiration in human muscle cells. Include the reactants, products, energy yield, and one situation in which each occurs.",
          scheme:
            "Aerobic: glucose + oxygen → carbon dioxide + water (1); high energy yield, ~2900 kJ per mole of glucose (1); occurs during normal activity / rest (1). Anaerobic in muscle: glucose → lactic acid (1); low energy yield, ~150 kJ per mole (1); occurs during intense exercise when oxygen supply is insufficient (1).",
        },
        {
          type: "text",
          topic: "Genetics",
          difficulty: "medium",
          marks: 4,
          text:
            "Describe the structure of DNA. Your answer should mention nucleotides, the double helix, and base pairing.",
          scheme:
            "DNA is a double-stranded helix (1). Each strand is made of nucleotides containing a phosphate, sugar (deoxyribose), and a base (1). The two strands are held together by hydrogen bonds between complementary bases (1). Adenine pairs with thymine and cytosine pairs with guanine (1).",
        },
        {
          type: "text",
          topic: "Genetics",
          difficulty: "hard",
          marks: 5,
          text:
            "Explain how genetic variation arises during sexual reproduction in humans. Refer to meiosis and fertilisation.",
          scheme:
            "Meiosis: independent assortment of chromosomes during metaphase I produces gametes with different chromosome combinations (1); crossing over between homologous chromosomes shuffles alleles (1). Fertilisation: random fusion of male and female gametes (1) combines genes from two parents (1). Mutation may also introduce new alleles (1).",
        },
        {
          type: "text",
          topic: "Ecology",
          difficulty: "medium",
          marks: 5,
          text:
            "Describe the carbon cycle. Include the roles of photosynthesis, respiration, decomposition, and combustion.",
          scheme:
            "Photosynthesis fixes atmospheric CO2 into organic compounds in plants (1). Respiration in plants, animals, and microbes releases CO2 back to the atmosphere (1). Decomposition of dead organisms by bacteria and fungi releases CO2 (1). Combustion of fossil fuels and biomass releases stored carbon as CO2 (1). Overall: balance between absorption (photosynthesis) and release (respiration, decomposition, combustion) (1).",
        },
        {
          type: "text",
          topic: "Ecology",
          difficulty: "medium",
          marks: 4,
          text:
            "A predator-prey graph shows oscillating populations of foxes and rabbits. Explain the cause of the oscillations.",
          scheme:
            "When rabbits are abundant, food is plentiful, fox population grows (1). Increased foxes eat more rabbits, reducing rabbit numbers (1). With fewer rabbits, foxes lack food and decline due to starvation/competition (1). Reduced foxes allow rabbits to recover, restarting the cycle (1).",
        },
        {
          type: "text",
          topic: "Human physiology",
          difficulty: "hard",
          marks: 6,
          text:
            "Describe how the human kidney maintains the water balance of the blood. Refer to the role of ADH and the collecting duct.",
          scheme:
            "Hypothalamus detects fall in blood water potential / increase in blood solute concentration (1). Pituitary gland releases anti-diuretic hormone (ADH) (1). ADH travels in the blood to the kidneys (1). ADH increases the permeability of the collecting duct walls to water (1). More water is reabsorbed back into the blood (1). A smaller volume of more concentrated urine is produced (1).",
        },
        {
          type: "text",
          topic: "Plants",
          difficulty: "easy",
          marks: 3,
          text:
            "Describe the function of stomata in a leaf and explain how their opening and closing is controlled.",
          scheme:
            "Stomata allow gas exchange — CO2 in for photosynthesis, O2 out, and transpiration (1). They are surrounded by guard cells (1). Guard cells take up water and become turgid → stomata open; lose water → stomata close (1).",
        },
        {
          type: "text",
          topic: "Human physiology",
          difficulty: "medium",
          marks: 4,
          text:
            "Explain how the immune system responds to a pathogen entering the body for the first time. Mention antibodies and memory cells.",
          scheme:
            "Pathogen with specific antigens detected by lymphocytes (1). Lymphocytes produce antibodies complementary to the antigen, marking pathogens for destruction (1). Some lymphocytes become memory cells (1). On second exposure, memory cells respond faster, giving immunity (1).",
        },
        {
          type: "text",
          topic: "Cell biology",
          difficulty: "hard",
          marks: 5,
          text:
            "Compare mitosis and meiosis. Include differences in the number of daughter cells, chromosome number, and genetic similarity to the parent cell.",
          scheme:
            "Mitosis: one division, produces 2 daughter cells (1); chromosome number maintained (diploid → diploid) (1); daughter cells genetically identical to parent (1). Meiosis: two divisions, produces 4 daughter cells (1); chromosome number halved (diploid → haploid) (1); daughter cells genetically different due to crossing over and independent assortment.",
        },
      ],
    },
  ],
};
