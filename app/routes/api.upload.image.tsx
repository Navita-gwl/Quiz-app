import type { ActionFunctionArgs } from "react-router";
import { GraphqlQueryError } from "@shopify/shopify-api";
import { authenticate } from "../shopify.server";
import { toUserFacingError } from "../utils/userFacingErrors";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function inferMimeType(file: File): string {
  if (file.type && ALLOWED_TYPES.includes(file.type)) {
    return file.type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return MIME_BY_EXTENSION[ext] || "";
}

function sanitizeFilename(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "quiz-option.png";
  const safe = trimmed.replace(/[^\w.\-]+/g, "_");
  return safe || "quiz-option.png";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollForFileUrl(admin: Awaited<ReturnType<typeof authenticate.admin>>["admin"], fileId: string) {
  const query = `#graphql
    query QuizOptionFileStatus($id: ID!) {
      node(id: $id) {
        ... on File {
          fileStatus
          preview {
            image {
              url
            }
          }
        }
        ... on MediaImage {
          fileStatus
          image {
            url
          }
        }
        ... on GenericFile {
          url
        }
      }
    }
  `;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await admin.graphql(query, { variables: { id: fileId } });
    const json = await response.json();
    const node = json?.data?.node;

    if (!node) {
      throw new Error("Shopify did not return file details after upload");
    }

    const status = node.fileStatus;
    const url = node.image?.url || node.preview?.image?.url || node.url;

    if (status === "FAILED") {
      throw new Error("Shopify failed to process the uploaded image");
    }

    if (url && (status === "READY" || status === "UPLOADED" || !status)) {
      return url as string;
    }

    await sleep(500);
  }

  throw new Error("Image upload timed out while Shopify processed the file");
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  try {
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return Response.json(
        { success: false, error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile || !(imageFile instanceof File)) {
      return Response.json(
        { success: false, error: "No image file provided" },
        { status: 400 }
      );
    }

    const mimeType = inferMimeType(imageFile);
    if (!mimeType) {
      return Response.json(
        { success: false, error: "Invalid file type. Allowed: jpg, png, gif, webp" },
        { status: 400 }
      );
    }

    if (imageFile.size > MAX_FILE_SIZE) {
      return Response.json(
        { success: false, error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    const filename = sanitizeFilename(imageFile.name);

    const stagedResponse = await admin.graphql(
      `#graphql
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: [
            {
              filename,
              mimeType,
              resource: "FILE",
              fileSize: String(imageFile.size),
              httpMethod: "POST",
            },
          ],
        },
      }
    );

    const stagedJson = await stagedResponse.json();
    const userErrors = stagedJson?.data?.stagedUploadsCreate?.userErrors || [];

    if (userErrors.length > 0) {
      console.error("[Upload] Shopify stagedUploadsCreate errors:", userErrors);
      return Response.json(
        { success: false, error: userErrors[0]?.message || "Shopify upload setup failed" },
        { status: 500 }
      );
    }

    const stagedTarget = stagedJson?.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!stagedTarget?.url || !stagedTarget?.resourceUrl) {
      return Response.json(
        { success: false, error: "Failed to get upload destination from Shopify" },
        { status: 500 }
      );
    }

    const uploadForm = new FormData();
    for (const param of stagedTarget.parameters) {
      uploadForm.append(param.name, param.value);
    }
    const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
    const blob = new Blob([fileBuffer], { type: mimeType });
    uploadForm.append("file", blob, filename);

    const uploadRes = await fetch(stagedTarget.url, {
      method: "POST",
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => "");
      console.error("[Upload] CDN upload failed:", uploadRes.status, errText.slice(0, 300));
      return Response.json(
        { success: false, error: "Failed to upload image to Shopify CDN" },
        { status: 500 }
      );
    }

    const createResponse = await admin.graphql(
      `#graphql
      mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            id
            fileStatus
            ... on MediaImage {
              image {
                url
              }
            }
            ... on GenericFile {
              url
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          files: [
            {
              alt: filename,
              contentType: "IMAGE",
              originalSource: stagedTarget.resourceUrl,
            },
          ],
        },
      }
    );

    const createJson = await createResponse.json();
    const createErrors = createJson?.data?.fileCreate?.userErrors || [];

    if (createErrors.length > 0) {
      console.error("[Upload] Shopify fileCreate errors:", createErrors);
      return Response.json(
        { success: false, error: createErrors[0]?.message || "Failed to register image with Shopify" },
        { status: 500 }
      );
    }

    const createdFile = createJson?.data?.fileCreate?.files?.[0];
    if (!createdFile?.id) {
      return Response.json(
        { success: false, error: "Failed to register image with Shopify" },
        { status: 500 }
      );
    }

    const immediateUrl = createdFile.image?.url || createdFile.url;
    const url = immediateUrl || (await pollForFileUrl(admin, createdFile.id));

    return Response.json({ success: true, url });
  } catch (error) {
    console.error("[Upload] Error processing image:", error);

    if (error instanceof GraphqlQueryError) {
      const message = error.message || "";
      if (message.toLowerCase().includes("access denied")) {
        return Response.json(
          {
            success: false,
            error: "Image upload is not permitted for this app install. Reinstall the app to grant file upload access.",
          },
          { status: 403 }
        );
      }
      return Response.json(
        {
          success: false,
          error: toUserFacingError(message, "We couldn't upload this image. Please try again."),
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: false,
        error: toUserFacingError(error, "We couldn't upload this image. Please try again."),
      },
      { status: 500 }
    );
  }
};
