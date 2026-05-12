import "dotenv/config";
import { downloadFromS3 } from "../src/lib/s3";

async function main() {
  console.log("S3_BUCKET:", process.env.S3_BUCKET);
  console.log("S3_ENDPOINT:", process.env.S3_ENDPOINT?.substring(0, 50));

  try {
    const buf = await downloadFromS3("uploads/cmp1xpjj700001ovdsgmwmsrn_1778561319300.jpg");
    console.log("SUCCESS:", buf.length, "bytes");
  } catch (e: any) {
    console.log("ERROR:", e.message);
  }
}
main();
