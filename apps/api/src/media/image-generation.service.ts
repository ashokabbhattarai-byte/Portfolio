import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fail } from '../publishing/common';

export const IMAGE_PURPOSES = [
  'FEATURED_IMAGE',
  'INLINE_IMAGE',
  'OG_IMAGE',
  'DIAGRAM',
  'SOCIAL_CARD',
] as const;
export type ImagePurpose = (typeof IMAGE_PURPOSES)[number];

export interface GenerationRequest {
  prompt: string;
  purpose: ImagePurpose;
  width?: number;
  height?: number;
}

export interface GeneratedImage {
  bytes: Buffer;
  provider: string;
  model: string;
}

/** One adapter per upstream. Adapters return raw bytes; storing, optimising
 *  and registering them in the media library is MediaService's job, so a
 *  generated image is indistinguishable from an uploaded one afterwards. */
export interface ImageProvider {
  readonly name: string;
  readonly model: string;
  generate(request: GenerationRequest): Promise<GeneratedImage>;
}

/** OpenAI's images endpoint. Kept behind the registry so the feature is a
 *  configuration change rather than a code change once a key exists. */
class OpenAiImageProvider implements ImageProvider {
  readonly name = 'openai';
  constructor(
    readonly model: string,
    private readonly apiKey: string,
  ) {}

  async generate(request: GenerationRequest): Promise<GeneratedImage> {
    const size = `${request.width ?? 1024}x${request.height ?? 1024}`;
    const response = await fetch(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          prompt: request.prompt,
          size,
          n: 1,
          response_format: 'b64_json',
        }),
        signal: AbortSignal.timeout(120_000),
      },
    ).catch(() =>
      fail(
        'IMAGE_GENERATION_FAILED',
        'The image provider is unreachable.',
        502,
      ),
    );

    if (!response.ok) {
      /* The upstream body can echo the prompt and internal identifiers, so the
         status is all that crosses back to the caller. */
      fail(
        'IMAGE_GENERATION_FAILED',
        `The image provider returned ${response.status}.`,
        502,
      );
    }
    const payload = (await response.json()) as {
      data?: { b64_json?: string }[];
    };
    const encoded = payload.data?.[0]?.b64_json;
    if (!encoded) {
      fail(
        'IMAGE_GENERATION_FAILED',
        'The image provider returned no image.',
        502,
      );
    }
    return {
      bytes: Buffer.from(encoded, 'base64'),
      provider: this.name,
      model: this.model,
    };
  }
}

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);
  private readonly provider?: ImageProvider;

  constructor(private readonly config: ConfigService) {
    const configured = (
      config.get<string>('IMAGE_PROVIDER') ?? 'none'
    ).toLowerCase();
    const key = config.get<string>('OPENAI_API_KEY');
    if (configured === 'openai' && key) {
      this.provider = new OpenAiImageProvider(
        config.get<string>('IMAGE_PROVIDER_MODEL') ?? 'gpt-image-1',
        key,
      );
      this.logger.log(`Image generation enabled via ${this.provider.name}.`);
    } else {
      /* The null case is the default and is not an error: agents are expected
         to upload or import images by URL instead. */
      this.logger.log(
        'Image generation is not configured; upload or URL import only.',
      );
    }
  }

  get enabled(): boolean {
    return this.provider !== undefined;
  }

  describe(): { enabled: boolean; provider?: string; model?: string } {
    return this.provider
      ? {
          enabled: true,
          provider: this.provider.name,
          model: this.provider.model,
        }
      : { enabled: false };
  }

  async generate(request: GenerationRequest): Promise<GeneratedImage> {
    if (!this.provider) {
      fail(
        'IMAGE_GENERATION_UNAVAILABLE',
        'No image generation provider is configured. Upload the image or supply a source URL instead.',
        501,
      );
    }
    return this.provider.generate(request);
  }
}
