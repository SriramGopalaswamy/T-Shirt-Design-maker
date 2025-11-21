
export interface DesignViews {
  front: string | null;
  right: string | null;
  back: string | null;
  left: string | null;
  flatFront: string | null;
  flatBack: string | null;
}

export type ViewAngle = keyof DesignViews;

export type ApparelType = 'TSHIRT' | 'POLO' | 'HOODIE';
export type LogoPlacement = 'LEFT_CHEST' | 'CENTER_CHEST' | 'RIGHT_SLEEVE' | 'BACK_NECK' | 'LEFT_SLEEVE' | 'RIGHT_CHEST' | 'CENTER_BACK';
export type LogoSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type TextEffect = 'NONE' | 'NEON_GLOW' | 'HEAVY_OUTLINE' | 'DROP_SHADOW' | 'GLITCH';

export interface LogoConfig {
  data: string; // base64
  placement: LogoPlacement;
  size: LogoSize;
}

export interface GeneratedDesign {
  id: string;
  concept: string;
  style: string;
  apparel: ApparelType;
  logo: LogoConfig | null;
  views: DesignViews;
  timestamp: number;
  modelGender: 'MALE' | 'FEMALE';
}

export enum GeneratorStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  LOADING_VIEW = 'LOADING_VIEW',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}
