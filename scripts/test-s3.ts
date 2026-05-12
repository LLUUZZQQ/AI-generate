import "dotenv/config";
import { S3Client, ListBucketsCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

async function main() {
  try {
    // Upload a test file
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: "test/hello.txt",
      Body: "Hello from AI爆款!",
      ContentType: "text/plain",
    });
    await s3.send(cmd);
    console.log("S3 upload OK!");
    console.log(`Endpoint: ${process.env.S3_ENDPOINT}`);
    console.log(`Bucket: ${process.env.S3_BUCKET}`);
  } catch (e: any) {
    console.log("S3 ERROR:", e.message);
  }
}

main();
