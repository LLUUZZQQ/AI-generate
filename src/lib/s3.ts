import "dotenv/config";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

function getS3Client(): S3Client {
  const bucket = process.env.S3_BUCKET;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;
  if (!bucket || !endpoint || !accessKey || !secretKey) {
    throw new Error("S3 env vars not configured");
  }
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  });
}

export async function uploadToS3(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET!;
  const endpoint = process.env.S3_ENDPOINT!;
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    },
  });
  await upload.done();
  return `${endpoint}/${bucket}/${key}`;
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  const s3 = getS3Client();
  const bucket = process.env.S3_BUCKET!;
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
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
  const endpoint = process.env.S3_ENDPOINT!;
  const bucket = process.env.S3_BUCKET!;
  return `${endpoint}/${bucket}/${key}`;
}
