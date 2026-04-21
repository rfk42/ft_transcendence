const fs = require("fs");
const path = require("path");

const BLOB_ENABLED = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const LOCAL_UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");

function requireBlobSdk() {
  try {
    return require("@vercel/blob");
  } catch (error) {
    throw new Error(
      "Vercel Blob is not installed. Add @vercel/blob before enabling blob storage.",
    );
  }
}

function toSafeFilename(name) {
  return String(name || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

function toBlobAvatarPath(userId, originalName) {
  return `avatars/${userId}/${Date.now()}-${toSafeFilename(originalName)}`;
}

function toBlobFilePath(userId, originalName) {
  return `files/${userId}/${Date.now()}-${toSafeFilename(originalName)}`;
}

function avatarBlobUrl(pathname) {
  return `/api/auth/avatar?pathname=${encodeURIComponent(pathname)}`;
}

function fileBlobUrl(pathname) {
  return `/api/upload/file?pathname=${encodeURIComponent(pathname)}`;
}

function blobPathFromUrl(url) {
  try {
    const parsed = new URL(url, "http://local.test");
    return parsed.searchParams.get("pathname");
  } catch {
    return null;
  }
}

async function putPrivateBlob(pathname, body, contentType) {
  const {put} = requireBlobSdk();
  return put(pathname, body, {
    access: "private",
    contentType,
    addRandomSuffix: true,
  });
}

async function getPrivateBlob(pathname, ifNoneMatch) {
  const {get} = requireBlobSdk();
  return get(pathname, {
    access: "private",
    ifNoneMatch: ifNoneMatch || undefined,
  });
}

async function listPrivateBlobs(prefix) {
  const {list} = requireBlobSdk();
  return list({prefix, limit: 1000});
}

async function deleteBlob(pathname) {
  const {del} = requireBlobSdk();
  await del(pathname);
}

function ensureLocalDir(dir) {
  fs.mkdirSync(dir, {recursive: true});
}

module.exports = {
  BLOB_ENABLED,
  LOCAL_UPLOAD_DIR,
  avatarBlobUrl,
  blobPathFromUrl,
  deleteBlob,
  ensureLocalDir,
  fileBlobUrl,
  getPrivateBlob,
  listPrivateBlobs,
  putPrivateBlob,
  toBlobAvatarPath,
  toBlobFilePath,
  toSafeFilename,
};
