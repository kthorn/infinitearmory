import { db } from '@/lib/db'
import { getTextProvider, getImageProvider, buildImagePrompt } from '@/lib/providers'
import { safeResolveImageProvider } from '@/lib/models'
import { uploadImage } from '@/lib/storage'
import { generationOptionsSchema, weaponSpecSchema, styleSchema } from '@/lib/schemas'
import { WEAPON_STATUS } from '@/types'
import { withRetry, isTransientError } from './retry'
import type { GenerationOptions } from '@/lib/schemas'

const PROMPT_VERSION = 'v1'

export interface GenerateWeaponParams {
  weaponId: string
  userPrompt: string
  options: GenerationOptions
}

/**
 * Run the full weapon generation pipeline
 * Updates database status at each step
 */
export async function generateWeapon({ weaponId, userPrompt, options }: GenerateWeaponParams): Promise<void> {
  try {
    // Step 1: Generate text (description + stats)
    await updateStatus(weaponId, WEAPON_STATUS.GENERATING_TEXT)

    const textProvider = getTextProvider(options.textModel)
    const textResult = await withRetry(
      () => textProvider.generateWeapon(userPrompt, options),
      {
        maxAttempts: 2,
        delayMs: 2000,
        shouldRetry: isTransientError,
      }
    )

    // Save text results
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        weaponSpec: JSON.stringify(textResult.weaponSpec),
        descriptionMd: textResult.descriptionMd,
        textModel: textResult.model,
        promptVersion: PROMPT_VERSION,
      },
    })

    // Step 2: Generate image
    await updateStatus(weaponId, WEAPON_STATUS.GENERATING_IMAGE)

    const imageProvider = getImageProvider(options.imageModel)
    const imagePrompt = buildImagePrompt(textResult.weaponSpec, options.style)

    const imageResult = await withRetry(
      () => imageProvider.generateImage(imagePrompt),
      {
        maxAttempts: 2,
        delayMs: 3000,
        shouldRetry: isTransientError,
      }
    )

    // Upload image to storage (propagate mimeType from provider)
    const { url: imageUrl } = await uploadImage({
      weaponId,
      imageData: imageResult.imageData,
      mimeType: imageResult.mimeType,
    })

    // Save image results and mark done
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        imageUrl,
        imagePrompt,
        imageModel: imageResult.model,
        status: WEAPON_STATUS.DONE,
      },
    })
  } catch (error) {
    // Mark as error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        status: WEAPON_STATUS.ERROR,
        errorMessage,
      },
    })

    // Re-throw for logging
    throw error
  }
}

/**
 * Regenerate just the image for an existing weapon
 */
export async function regenerateImage(weaponId: string, style?: string): Promise<void> {
  const weapon = await db.weapon.findUnique({ where: { id: weaponId } })
  if (!weapon) {
    throw new Error(`Weapon not found: ${weaponId}`)
  }
  if (!weapon.weaponSpec) {
    throw new Error(`Weapon has no spec: ${weaponId}`)
  }

  // Validate inputs before mutating status (prevents marking weapon as error on bad input)
  const weaponSpec = weaponSpecSchema.parse(JSON.parse(weapon.weaponSpec))
  const options = generationOptionsSchema.parse(JSON.parse(weapon.options))
  const imageStyle = style ? styleSchema.parse(style) : options.style ?? 'fantasy_art'

  try {
    await updateStatus(weaponId, WEAPON_STATUS.GENERATING_IMAGE)

    const { model: imageModelId } = safeResolveImageProvider(options.imageModel)
    const imageProvider = getImageProvider(imageModelId)
    const imagePrompt = buildImagePrompt(weaponSpec, imageStyle)

    const imageResult = await withRetry(
      () => imageProvider.generateImage(imagePrompt),
      {
        maxAttempts: 2,
        delayMs: 3000,
        shouldRetry: isTransientError,
      }
    )

    const { url: imageUrl } = await uploadImage({
      weaponId,
      imageData: imageResult.imageData,
      mimeType: imageResult.mimeType,
    })

    await db.weapon.update({
      where: { id: weaponId },
      data: {
        imageUrl,
        imagePrompt,
        imageModel: imageResult.model,
        status: WEAPON_STATUS.DONE,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        status: WEAPON_STATUS.ERROR,
        errorMessage,
      },
    })
    throw error
  }
}

/**
 * Reroll stats and regenerate everything
 */
export async function rerollWeapon(weaponId: string): Promise<void> {
  const weapon = await db.weapon.findUnique({ where: { id: weaponId } })
  if (!weapon) {
    throw new Error(`Weapon not found: ${weaponId}`)
  }

  try {
    const options = generationOptionsSchema.parse(JSON.parse(weapon.options))

    // Clear existing results (including model metadata to prevent stale data)
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        weaponSpec: null,
        descriptionMd: null,
        imageUrl: null,
        imagePrompt: null,
        textModel: null,
        imageModel: null,
        errorMessage: null,
        status: WEAPON_STATUS.QUEUED,
      },
    })

    // Run full pipeline
    await generateWeapon({
      weaponId,
      userPrompt: weapon.userPrompt,
      options,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        status: WEAPON_STATUS.ERROR,
        errorMessage,
      },
    })
    throw error
  }
}

async function updateStatus(weaponId: string, status: (typeof WEAPON_STATUS)[keyof typeof WEAPON_STATUS]): Promise<void> {
  await db.weapon.update({
    where: { id: weaponId },
    data: { status, errorMessage: null },
  })
}
