import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';

function shouldServeInline(contentType: string): boolean {
  const ct = contentType ?? '';
  return (ct.startsWith('image/') && ct !== 'image/svg+xml') || ct.startsWith('video/') || ct.startsWith('audio/');
}

export async function generatePresignedUploadUrl(fileName: string, contentType: string, isPublic = false) {
  const { bucketName, folderPrefix } = getBucketConfig();
  const safeName = String(fileName ?? 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${safeName}`
    : `${folderPrefix}uploads/${Date.now()}-${safeName}`;
  const client = createS3Client();
  const cmd = new PutObjectCommand({ Bucket: bucketName, Key: cloud_storage_path, ContentType: contentType });
  const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 3600 });
  return { uploadUrl, cloud_storage_path };
}

export async function uploadBuffer(fileName: string, contentType: string, body: Buffer | string, isPublic = false) {
  const { bucketName, folderPrefix } = getBucketConfig();
  const safeName = String(fileName ?? 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${safeName}`
    : `${folderPrefix}uploads/${Date.now()}-${safeName}`;
  const client = createS3Client();
  await client.send(new PutObjectCommand({ Bucket: bucketName, Key: cloud_storage_path, Body: body, ContentType: contentType }));
  return { cloud_storage_path };
}

export async function getFileUrl(cloud_storage_path: string, contentType: string, isPublic: boolean) {
  const { bucketName } = getBucketConfig();
  const region = process.env.AWS_REGION ?? 'us-east-1';
  if (isPublic) {
    return `https://${bucketName}.s3.${region}.amazonaws.com/${(cloud_storage_path ?? '').split('/').map(encodeURIComponent).join('/')}`;
  }
  const client = createS3Client();
  const cmd = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: shouldServeInline(contentType) ? 'inline' : 'attachment',
  });
  return getSignedUrl(client, cmd, { expiresIn: 3600 });
}

export async function deleteFile(cloud_storage_path: string) {
  const { bucketName } = getBucketConfig();
  const client = createS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: cloud_storage_path }));
}
