// Test fixture syllabus for IGCSE Biology (Cambridge 0610).
// Small but realistic — covers 8 topics with concise learning objectives plus
// assessment overview and command words. Used to test the per-chat syllabus
// upload in teacher chat write-questions mode.

export default {
  subjectName: "IGCSE Biology",
  syllabusCode: "0610",
  level: "IGCSE",
  yearRange: "2024-2026",
  aims: [
    "Develop scientific knowledge and understanding of biology and its applications in everyday life.",
    "Develop the ability to handle, analyse and interpret biological data and information.",
    "Develop experimental skills and the ability to design and carry out investigations.",
    "Apply biological knowledge to evaluate evidence and make informed scientific judgements.",
    "Develop awareness of the importance of safe working practices in laboratory contexts.",
  ],
  topics: [
    {
      number: "1",
      title: "Characteristics and classification of living organisms",
      objectives: [
        "Describe the seven characteristics shared by living organisms (movement, respiration, sensitivity, growth, reproduction, excretion, nutrition).",
        "Define the term species and use the binomial system of naming organisms.",
        "Construct and use simple dichotomous keys based on observable features.",
        "Classify organisms into the five kingdoms with examples (animals, plants, fungi, protoctists, prokaryotes).",
      ],
    },
    {
      number: "2",
      title: "Organisation of the organism",
      objectives: [
        "State that all living organisms are made of cells, and identify the structures of typical animal and plant cells.",
        "Identify mitochondria, ribosomes, nucleus, cell membrane, cytoplasm, chloroplasts, cell wall, vacuole on diagrams.",
        "Describe the differences between animal and plant cells.",
        "Describe the levels of organisation: organelle → cell → tissue → organ → organ system → organism, with examples.",
      ],
    },
    {
      number: "3",
      title: "Movement into and out of cells",
      objectives: [
        "Define diffusion, osmosis, and active transport, and identify the movement of particles in each.",
        "Describe and explain how the rate of diffusion is affected by surface area, temperature, and concentration gradient.",
        "Describe osmosis as the net movement of water from higher to lower water potential through a partially permeable membrane.",
        "Describe and explain the effects of immersing animal and plant cells in solutions of different concentrations.",
      ],
    },
    {
      number: "4",
      title: "Biological molecules and enzymes",
      objectives: [
        "List the chemical elements that make up carbohydrates, fats, and proteins.",
        "State the food tests for starch (iodine), reducing sugars (Benedict's), proteins (biuret), and fats (ethanol emulsion).",
        "Define enzymes as biological catalysts and describe their lock-and-key model of action.",
        "Investigate and explain the effects of temperature and pH on enzyme activity, including denaturation.",
      ],
    },
    {
      number: "5",
      title: "Plant nutrition and transport",
      objectives: [
        "Define photosynthesis and write balanced word and chemical equations.",
        "Investigate and describe the effects of light intensity, temperature, and carbon dioxide concentration on the rate of photosynthesis.",
        "Identify and describe the structure and function of xylem and phloem in plant transport.",
        "Define and describe transpiration; explain how environmental factors (temperature, humidity, wind, light) affect its rate.",
      ],
    },
    {
      number: "6",
      title: "Human nutrition, transport, and gas exchange",
      objectives: [
        "Identify the main components of a balanced diet and the consequences of deficiencies (vitamin C, iron, calcium, protein).",
        "Describe the structure and function of the human alimentary canal and the role of digestive enzymes.",
        "Describe the structure of the heart and the double circulatory system.",
        "Describe the structure of the lungs and the mechanism of breathing including the role of intercostal muscles and the diaphragm.",
      ],
    },
    {
      number: "7",
      title: "Coordination, response, and homeostasis",
      objectives: [
        "Describe the structure and function of a typical neurone and the components of a reflex arc.",
        "Define homeostasis and explain how the body controls blood glucose concentration via insulin and glucagon.",
        "Describe the role of the kidneys in osmoregulation, including the action of ADH on the collecting ducts.",
        "Compare the nervous and endocrine systems in terms of speed, duration, and method of communication.",
      ],
    },
    {
      number: "8",
      title: "Reproduction, inheritance, and variation",
      objectives: [
        "Describe sexual and asexual reproduction with examples; compare them in terms of variation and survival.",
        "Define the terms gene, allele, genotype, phenotype, dominant, recessive, homozygous, and heterozygous.",
        "Use Punnett squares to predict and interpret monohybrid inheritance, including ratios.",
        "Distinguish between continuous and discontinuous variation; describe how natural selection drives evolution.",
      ],
    },
  ],
  assessment: [
    { paper: "Paper 1", description: "Multiple choice (Core)", duration: "45 min", marks: 40, weight: "30%" },
    { paper: "Paper 2", description: "Multiple choice (Extended)", duration: "45 min", marks: 40, weight: "30%" },
    { paper: "Paper 3", description: "Theory (Core)", duration: "1 h 15 min", marks: 80, weight: "50%" },
    { paper: "Paper 4", description: "Theory (Extended)", duration: "1 h 15 min", marks: 80, weight: "50%" },
    { paper: "Paper 5", description: "Practical Test", duration: "1 h 15 min", marks: 40, weight: "20%" },
    { paper: "Paper 6", description: "Alternative to Practical", duration: "1 h", marks: 40, weight: "20%" },
  ],
  commandWords: [
    { word: "calculate", meaning: "Work out from given facts, figures, or information." },
    { word: "compare", meaning: "Identify and comment on similarities and differences." },
    { word: "define", meaning: "Give the precise meaning of a term." },
    { word: "describe", meaning: "State the main points or features of something." },
    { word: "explain", meaning: "Give reasons; show how or why something happens." },
    { word: "identify", meaning: "Name, recognise, or select from given options." },
    { word: "predict", meaning: "Suggest what may happen based on available information." },
    { word: "state", meaning: "Express in clear terms; recall information." },
  ],
};
