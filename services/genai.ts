
import { GoogleGenAI } from "@google/genai";
import { DesignViews, ApparelType, LogoConfig, TextEffect } from "../types";

const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from the environment.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-build' });

const MODEL_NAME = 'gemini-2.5-flash-image';

export const STYLES: Record<string, { label: string; prompt: string }> = {
  'NEURAL_GRAFFITI': {
    label: 'Neural Graffiti',
    prompt: 'dense partial differential equations (Navier-Stokes) overlaid with neon wildstyle graffiti drips and spray paint textures'
  },
  'PURE_MATH': {
    label: 'Pure Equations',
    prompt: 'dense, glowing mathematical formulas, integrals, tensor calculus and physics equations on a dark technical grid background, resembling a chalkboard from the year 3000'
  },
  'ALGORITHMIC': {
    label: 'Algorithmic Flow',
    prompt: 'complex Python code snippets, transformer attention mechanisms, logic gates, decision trees and syntax highlighting in a cyberpunk aesthetic'
  },
  'GPU_HARDWARE': {
    label: 'GPU Hardware',
    prompt: 'detailed GPU memory heatmaps, silicon die photography, circuit traces, gold pins, and metallic hardware textures'
  },
  'ABSTRACT_DATA': {
    label: 'Data Topology',
    prompt: 'complex Voronoi diagrams, neural network topology maps, nodes, edges, and 3D graph visualizations'
  },
  'BIO_DIGITAL': {
    label: 'Bio-Digital Fusion',
    prompt: 'organic neural dendrites transforming into fiber optic cables, DNA helixes composed of binary code, bioluminescent cellular structures merging with silicon logic gates'
  },
  'RETRO_SYNTH': {
    label: 'Retro Synthwave',
    prompt: '80s synthwave aesthetic, neon laser grids, chrome text effects, wireframe geometric shapes, glowing CRT monitor scanlines, and vaporwave glitches'
  }
};

const getApparelDescription = (type: ApparelType): string => {
  switch (type) {
    case 'POLO':
      return 'a premium, textured pique polo shirt with a crisp collar and button placket';
    case 'HOODIE':
      return 'a heavyweight, premium streetwear hoodie with thick drawstrings and a kangaroo pocket';
    case 'TSHIRT':
    default:
      return 'a high-quality round-neck cotton jersey t-shirt';
  }
};

const getDesignPlacementDefaults = (type: ApparelType): string => {
  switch (type) {
    case 'POLO':
      return 'The main graphical design should be applied artistically across the torso, avoiding the collar.';
    case 'HOODIE':
      return 'The main graphical design should be bold on the chest and kangaroo pocket area.';
    case 'TSHIRT':
    default:
      return 'The main graphical design is centered on the chest.';
  }
};

const getTextEffectPrompt = (effect: TextEffect): string => {
  switch (effect) {
    case 'NEON_GLOW':
      return 'CRITICAL EFFECT: Apply a intense, radiant neon glow (bloom) to all text elements, equations, and lines. The text should appear to be emitting light.';
    case 'HEAVY_OUTLINE':
      return 'CRITICAL EFFECT: Apply thick, bold, high-contrast outlines (stroke) to all text characters and mathematical symbols. Make them look like die-cut stickers or comic book art.';
    case 'DROP_SHADOW':
      return 'CRITICAL EFFECT: Apply deep, hard-edged drop shadows to all text and design elements to create significant depth and 3D separation from the background.';
    case 'GLITCH':
      return 'CRITICAL EFFECT: Apply digital artifacting, chromatic aberration, signal noise, and horizontal tearing specifically to the text and equations. Cyberpunk glitch aesthetic.';
    case 'NONE':
    default:
      return '';
  }
};

const getPromptForView = (
  concept: string, 
  styleKey: string, 
  view: keyof DesignViews,
  apparel: ApparelType,
  logo: LogoConfig | null,
  effect: TextEffect = 'NONE',
  modelGender: 'MALE' | 'FEMALE' = 'MALE',
  hasReferenceImage: boolean = false,
  backDesignConcept?: string
) => {
  const stylePrompt = STYLES[styleKey]?.prompt || STYLES['NEURAL_GRAFFITI'].prompt;
  const apparelDesc = getApparelDescription(apparel);
  const effectInstruction = getTextEffectPrompt(effect);
  
  const textAccuracyInstruction = `
    MANDATORY TEXT ELEMENT:
    - The design MUST prominently feature the text: "${concept}".
    - SPELLING MUST BE EXACT: "${concept}". Do not misspell it.
    - The text should be integrated artistically into the design but remain LEGIBLE.
  `;
  
  const baseDescription = `Design Concept: "${concept}" visualized as ${stylePrompt}. ${effectInstruction} ${textAccuracyInstruction}`;

  // Handle Flat Views (High Res Print Files)
  if (view === 'flatFront') {
    return `
      Generate a high-resolution raw vector-style graphic design file for the FRONT of the shirt.
      ${baseDescription}
      
      Requirements:
      - FORMAT: Digital artwork isolated on a SOLID WHITE BACKGROUND (or TRANSPARENT).
      - NO MODEL, NO CLOTHING WRINKLES, NO PERSPECTIVE. Just the graphic art.
      - STYLE: Precision technical drawing meets chaotic artistic expression.
      - DETAILS: Readable mathematical symbols, algorithm logic gates, and data streams.
      - COLORS: Neon Cyan, Magenta, Electric Purple, Toxic Green.
      - COMPOSITION: Centered, balanced, high contrast.
      ${logo ? ` - INCORPORATE LOGO: Integrate the provided company logo into the design, blending it with the style.` : ''}
    `;
  }

  if (view === 'flatBack') {
    // Only include logo on the back print file if placement is strictly relevant (e.g. back neck/center back)
    // otherwise it's just the art.
    const includeBackLogo = logo && (logo.placement === 'BACK_NECK' || logo.placement === 'CENTER_BACK');
    
    const backDescription = backDesignConcept 
      ? `Specific Back Design Concept: "${backDesignConcept}".`
      : `Concept: A continuation of "${concept}" designed for the back area.`;

    return `
      Generate a high-resolution raw vector-style graphic design file for the BACK of the shirt.
      
      ${backDescription}
      Style: ${stylePrompt}
      
      Requirements:
      - FORMAT: Digital artwork isolated on a SOLID WHITE BACKGROUND (or TRANSPARENT).
      - NO MODEL, NO CLOTHING WRINKLES, NO PERSPECTIVE. Just the graphic art.
      - CONTENT: Larger diagrammatic representation of the math concept. More whitespace than the front.
      - COLORS: Matching the front design palette.
      ${includeBackLogo ? `- INCORPORATE LOGO: Place the logo small at the top (neck area) or center back as requested.` : ''}
    `;
  }

  // Determine Model Characteristics based on Gender
  const genderTerm = modelGender === 'MALE' ? 'male' : 'female';
  const genderAdj = modelGender === 'MALE' ? 'cool' : 'stylish';
  
  let anglePrompt = '';
  let designPlacementOverride = '';

  // If we have a reference image, we emphasize maintaining the design identity
  const consistencyInstruction = hasReferenceImage 
    ? `
      *** CRITICAL: STRICT VISUAL CONTINUITY REQUIRED ***
      
      INPUT: You have been provided with a reference image of a t-shirt design.
      TASK: Generate the EXACT SAME t-shirt design from a new angle (Rotated ${view}).
      
      EXECUTION RULES:
      1. NO REDESIGNING: Do not create a "new version" or "variation". You are a 3D renderer. You must preserve the existing pixels as if they are painted on the fabric.
      2. PRESERVE GEOMETRY: The shape of the graffiti/math art on the chest must maintain its topology. If there is a jagged line on the left in the reference, it must be on the left in the new view (account for perspective).
      3. PRESERVE COLOR: Use the exact same hex codes/neon hues seen in the reference. Do not shift from Cyan to Blue or Magenta to Red.
      4. PRESERVE LOGO: The logo location is fixed relative to the fabric seams. Calculate its new position based on the rotation (e.g., if on Left Chest, and rotating to Right Profile, the logo disappears).
      
      MENTAL STEP - FEATURE EXTRACTION:
      Before generating, internally identify:
      - The specific text font and spelling: "${concept}".
      - The dominant graphic element (e.g., a glowing grid, a specific fractal shape).
      - The exact logo placement.
      
      Apply these extracted features rigidly to the new view.
      
      IF MODEL SWAP IS ACTIVE:
      - Keep the t-shirt texture 100% identical.
      - Only change the human wearing it.
    `
    : "";

  switch (view) {
    case 'front':
      anglePrompt = `Front facing portrait/medium-shot of a ${genderAdj} ${genderTerm} streetwear model wearing the ${apparelDesc}. CENTERED. The FULL HEAD, FACE, and TORSO must be visible. Do not crop the head.`;
      designPlacementOverride = getDesignPlacementDefaults(apparel);
      break;
    case 'right':
      anglePrompt = `Right side profile view (90 degrees rotation) medium-shot of a ${genderAdj} ${genderTerm} model wearing the ${apparelDesc}. CENTERED. The FULL HEAD and TORSO must be visible.`;
      designPlacementOverride = "The design wraps around from the chest to the side of the ribs. Sleeve detail is visible. Maintain continuity from the front.";
      break;
    case 'back':
      anglePrompt = `Direct Back view (180 degrees rotation) medium-shot of a ${genderAdj} ${genderTerm} model wearing the ${apparelDesc}. CENTERED. The FULL HEAD and TORSO must be visible.`;
      
      designPlacementOverride = backDesignConcept 
        ? `BACKSIDE DESIGN: Feature the specific concept "${backDesignConcept}" on the back.` 
        : "BACKSIDE DESIGN: Show the design on the back of the garment. It should be a related but distinct continuation of the front concept (e.g. a large schematic or data grid).";
      break;
    case 'left':
      anglePrompt = `Left side profile view (270 degrees rotation) medium-shot of a ${genderAdj} ${genderTerm} model wearing the ${apparelDesc}. CENTERED. The FULL HEAD and TORSO must be visible.`;
      designPlacementOverride = "The design wraps around from the chest to the side. A unique identifier code or patch is visible on the sleeve. Maintain continuity from the front.";
      break;
  }

  // Logo Instructions - Branching Logic
  let logoInstruction = '';
  if (logo) {
    if (hasReferenceImage) {
      // SCENARIO: Rotating an existing design (Reference Image Provided).
      // The model sees the shirt with the logo already on it.
      // We must tell it to PRESERVE it, not add a new one.
      logoInstruction = `
        BRANDING INTEGRITY:
        - The provided reference image ALREADY CONTAINS the brand logo.
        - You MUST MAINTAIN the logo's appearance and placement as seen in the reference.
        - DO NOT generate a new logo or double the logo.
        - Ensure the logo transforms correctly with the body's perspective rotation.
        - If the angle (e.g. Back View) would naturally hide the logo (if it's on the chest), do not show it.
      `;
    } else {
      // SCENARIO: Generating from scratch (No Reference) OR Flat View.
      // We provide the logo image input and explicit instructions to place it.
      const placementMap: Record<string, string> = {
        'LEFT_CHEST': 'on the left chest area (heart)',
        'RIGHT_CHEST': 'on the right chest area',
        'CENTER_CHEST': 'prominently in the center of the chest',
        'RIGHT_SLEEVE': 'on the right sleeve',
        'LEFT_SLEEVE': 'on the left sleeve',
        'BACK_NECK': 'on the back of the neck (yoke area)',
        'CENTER_BACK': 'prominently in the center of the back'
      };
      const sizeMap: Record<string, string> = {
        'SMALL': 'small, subtle, and tasteful',
        'MEDIUM': 'standard commercial branding size',
        'LARGE': 'oversized, bold, and streetwear-style'
      };
      
      logoInstruction = `
        CRITICAL BRANDING INSTRUCTION:
        - A reference logo image has been provided as input.
        - PLACEMENT: You MUST place the provided logo ${placementMap[logo.placement]} of the ${apparelDesc}.
        - SIZE: ${sizeMap[logo.size]}.
        - INTEGRATION: The logo should look like it is screen-printed or embroidered onto the fabric.
        - COMPOSITION: The main graffiti/math design should NOT cover the logo. Instead, the art should FRAME the logo or originate from it. The logo must remain legible.
      `;
    }
  }

  return `
    Generate a photorealistic fashion studio photography shot.
    ${anglePrompt}
    
    ${consistencyInstruction}
    
    The Garment: ${apparelDesc}
    
    The Graphic Design:
    ${baseDescription}
    ${designPlacementOverride}
    
    ${logoInstruction}
    
    Key Visual Requirements:
    1. CONSISTENCY: The model, lighting, and background must match the reference style exactly.
    2. FRAMING: Medium Shot (Waist-up). The subject must be vertically centered. HEAD AND FACE MUST BE VISIBLE (No cropping).
    3. LIGHTING: Dramatic cyberpunk studio lighting with rim lights (cyan and magenta).
    4. MATERIAL: Realistic fabric textures, folds, and draping appropriate for ${apparelDesc}.
    5. CONTEXT: Minimalist dark studio background to make the neon colors pop.
  `;
};

const generateImage = async (prompt: string, imagePart?: string): Promise<string | null> => {
  try {
    const parts: any[] = [{ text: prompt }];
    
    if (imagePart) {
      const [mimeSection, dataSection] = imagePart.split(',');
      const mimeType = mimeSection.split(':')[1].split(';')[0];
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: dataSection
        }
      });
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
    });

    if (response.candidates && response.candidates.length > 0) {
      const outputParts = response.candidates[0].content.parts;
      for (const part of outputParts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("GenAI Error:", error);
    return null;
  }
};

export const generateInitialDesigns = async (
  concept: string,
  count: number,
  styleKey: string,
  apparel: ApparelType,
  logo: LogoConfig | null
): Promise<Array<{ concept: string; style: string; frontUrl: string; modelGender: 'MALE' | 'FEMALE' }>> => {
  
  const promises = Array.from({ length: count }).map(async (_, index) => {
    const gender: 'MALE' | 'FEMALE' = index % 2 === 0 ? 'FEMALE' : 'MALE';
    
    // Initial generation: hasReferenceImage = false. We pass logo data.
    const prompt = getPromptForView(concept, styleKey, 'front', apparel, logo, 'NONE', gender, false);
    const url = await generateImage(prompt, logo?.data);
    return url ? { concept, style: styleKey, frontUrl: url, modelGender: gender } : null;
  });

  const results = await Promise.all(promises);
  return results.filter((res): res is { concept: string; style: string; frontUrl: string; modelGender: 'MALE' | 'FEMALE' } => res !== null);
};

export const generateSpecificView = async (
  concept: string,
  style: string,
  view: keyof DesignViews,
  apparel: ApparelType,
  logo: LogoConfig | null,
  textEffect: TextEffect = 'NONE',
  modelGender: 'MALE' | 'FEMALE' = 'MALE',
  referenceImageUrl: string | null = null,
  backDesignConcept?: string
): Promise<string | null> => {
  const hasReference = !!referenceImageUrl;
  const prompt = getPromptForView(concept, style, view, apparel, logo, textEffect, modelGender, hasReference, backDesignConcept);
  
  // If we have a reference image (e.g. Front View for rotation), we use THAT as the image input.
  // The logo is already inside that image.
  // If we DON'T have a reference (e.g. Flat View), we use the logo data as image input.
  const imageInput = referenceImageUrl || logo?.data;
  
  return generateImage(prompt, imageInput);
};
