import type { GenerationOptions, WeaponSpec } from '@/lib/schemas'

export interface TextGenerationResult {
  weaponSpec: WeaponSpec
  descriptionMd: string
  model: string
}

export interface TextProvider {
  generateWeapon(prompt: string, options: GenerationOptions): Promise<TextGenerationResult>
  generateRaw(prompt: string, options: GenerationOptions): Promise<TextGenerationResult>
}

export interface ImageGenerationResult {
  imageData: Buffer
  mimeType: string
  model: string
  revisedPrompt?: string
}

export interface ImageProvider {
  generateImage(prompt: string): Promise<ImageGenerationResult>
}

export type TextProviderType = 'openai' | 'anthropic' | 'gemini'
export type ImageProviderType = 'openai' | 'gemini'
