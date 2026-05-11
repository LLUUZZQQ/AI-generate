import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const BUCKET = process.env.S3_BUCKET!;
const REGION = process.env.S3_REGION || "auto";
const ENDPOINT = process.env.S3_ENDPOINT!;
const ACCESS_KEY = process.env.S3_ACCESS_KEY!;
const SECRET_KEY = process.env.S3_SECRET_KEY!;

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
});

export async function uploadToS3(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    },
  });
  await upload.done();
  return `${ENDPOINT}/${BUCKET}/${key}`;
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3.send(command);
  const chunks: Uint8Array[] = [];
  if (response.Body) {
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
  }
  return Buffer.concat(chunks);
}

export function getS3Url(key: string): string {
  return `${ENDPOINT}/${BUCKET}/${key}`;
}
