export interface GenParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  duration?: number;
  style?: string;
}

export interface GenResult {
  fileUrl: string;
  thumbnailUrl?: string;
  metadata: Record<string, any>;
}

export interface ModelAdapter {
  generateImage(params: GenParams): Promise<GenResult>;
  generateVideo(params: GenParams): Promise<GenResult>;
}
