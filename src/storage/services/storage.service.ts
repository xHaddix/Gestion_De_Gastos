import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly publicClient: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET', 'documentos');

    const region = this.configService.get<string>('S3_REGION', 'us-east-1');
    const credentials = {
      accessKeyId: this.configService.get<string>('S3_ACCESS_KEY', ''),
      secretAccessKey: this.configService.get<string>('S3_SECRET_KEY', ''),
    };
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const publicEndpoint =
      this.configService.get<string>('S3_PUBLIC_ENDPOINT') || endpoint;

    this.client = new S3Client({
      endpoint,
      region,
      credentials,
      forcePathStyle: true,
    });
    this.publicClient =
      publicEndpoint === endpoint
        ? this.client
        : new S3Client({
            endpoint: publicEndpoint,
            region,
            credentials,
            forcePathStyle: true,
          });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBucket();
      this.logger.log(`Bucket de almacenamiento "${this.bucket}" listo`);
    } catch {
      this.logger.warn(
        `No se pudo verificar/crear el bucket "${this.bucket}". ` +
          'Se reintentará al procesar documentos.',
      );
    }
  }

  async ensureBucket(): Promise<void> {
    const maxAttempts = 3;

    for (let attempt = 1; ; attempt++) {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        return;
      } catch {
        try {
          await this.client.send(
            new CreateBucketCommand({ Bucket: this.bucket }),
          );
          return;
        } catch (error) {
          if (attempt >= maxAttempts) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
    }
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async getDownloadUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.publicClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 3600 },
    );
  }

  async remove(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
