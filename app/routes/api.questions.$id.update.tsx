import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { validateQuestionOptions, validateOptionProducts, validateQuestionText, validateQuestionDescription, mapPrismaValidationErrors } from "../utils/validation";
import { GENERIC_SAVE_ERROR, jsonActionError } from "../utils/userFacingErrors";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    return Response.json({ success: false, error: "Question ID is required" }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const text = formData.get("text") as string;
    const description = formData.get("description") as string;
    const productSelectionType = formData.get("productSelectionType") as string || "single";
    const type = formData.get("type") as string;
    const optionType = formData.get("optionType") as string;
    const optionsJson = formData.get("options") as string;
    const categoryId = formData.get("categoryId") as string;

    // Security: verify question belongs to this shop
    const question = await db.question.findUnique({ where: { id } });
    if (!question) {
      return Response.json({ success: false, error: "Question not found" }, { status: 404 });
    }
    if (question.shopId !== session.shop) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const errors: Record<string, string> = {};

    const textResult = validateQuestionText(text ?? "");
    if (!textResult.isValid) {
      errors.text = textResult.error || "Question text is required";
    } else {
      // Validate uniqueness of question text within the same quiz (case-insensitive, excluding current question)
      const existingQuestions = await db.question.findMany({
        where: {
          shopId: session.shop,
          categoryId: categoryId || question.categoryId || null,
          id: { not: id },
        },
        select: { text: true },
      });
      const isDuplicateText = existingQuestions.some(
        (q) => q.text.trim().toLowerCase() === text.trim().toLowerCase()
      );
      if (isDuplicateText) {
        errors.text = "This question already exists in this quiz.";
      }
    }

    const descriptionResult = validateQuestionDescription(description ?? "");
    if (!descriptionResult.isValid) {
      errors.description = descriptionResult.error || "Invalid description";
    }

    if (!type || !["RADIO", "CHECKBOX", "DROPDOWN", "DROPDOWN_MULTI"].includes(type))
      errors.type = "Invalid question type";

    if (!optionType || !["text", "image"].includes(optionType))
      errors.optionType = "Invalid option type";

    let options: any[] = [];
    if (!optionsJson) {
      errors.options = "Options are required";
    } else {
      try {
        const parsed = JSON.parse(optionsJson);
        if (!Array.isArray(parsed)) {
          errors.options = "Options must be an array";
        } else {
          // Run shared option validation (Empty and Duplicate Checks)
          const validationResult = validateQuestionOptions(
            parsed,
            optionType === "image" ? "image" : "text"
          );
          if (!validationResult.isValid) {
            errors.options = validationResult.error || "Invalid options";
          } else if (optionType === "image") {
            // Additional image options validation (Base64 data URIs)
            const isObjectFormat = parsed.length > 0 && typeof parsed[0] === "object";
            const invalid = parsed.filter((opt: any) => {
              const img = isObjectFormat ? opt.imageSrc : opt;
              if (typeof img !== "string" || img.trim() === "") return true;
              const isBase64 = img.startsWith("data:image/");
              const isUrl = img.startsWith("http://") || img.startsWith("https://");
              return !isBase64 && !isUrl;
            });
            if (invalid.length > 0) {
              errors.options = "Image options must have a valid image (upload required).";
            }
          }

          if (!errors.options) {
            const productResult = validateOptionProducts(parsed);
            if (!productResult.isValid) {
              errors.options = productResult.error || "Invalid options";
            }
          }

          if (!errors.options) {
            options = parsed.map((opt: any) => {
              if (typeof opt === "string") return opt;
              if (typeof opt !== "object" || opt === null) return opt;
              const cleaned: any = {};
              if ("label" in opt) cleaned.label = opt.label;
              if ("imageSrc" in opt) cleaned.imageSrc = opt.imageSrc;
              if ("productId" in opt && typeof opt.productId === "string" && opt.productId.trim() !== "") {
                cleaned.productId = opt.productId.trim();
              }
              if (Array.isArray(opt.products)) {
                cleaned.products = opt.products
                  .map((p: any) => {
                    if (p && typeof p === "object" && typeof p.productId === "string" && p.productId.trim() !== "") {
                      return { productId: p.productId.trim() };
                    }
                    return null;
                  })
                  .filter(Boolean);
              }
              return cleaned;
            });
          }
        }
      } catch {
        errors.options = "Invalid options format";
      }
    }

    if (Object.keys(errors).length > 0) {
      return Response.json({ success: false, errors }, { status: 400 });
    }

    const updatedQuestion = await db.question.update({
      where: { id },
      data: {
        categoryId: categoryId || undefined,
        text: text.trim(),
        description: description ? description.trim() : null,
        productSelectionType: productSelectionType as "single" | "multiple",
        type: type as "RADIO" | "CHECKBOX" | "DROPDOWN" | "DROPDOWN_MULTI",
        optionType: optionType as "text" | "image",
        options,
      },
    });

    return Response.json({ success: true, question: updatedQuestion });
  } catch (error) {
    console.error("Error updating question:", error);
    const prismaErrors = mapPrismaValidationErrors(error);
    if (prismaErrors) {
      return Response.json({ success: false, errors: prismaErrors }, { status: 400 });
    }
    return jsonActionError(error, GENERIC_SAVE_ERROR);
  }
};
